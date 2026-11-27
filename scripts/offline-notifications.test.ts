import { seedDemoData } from './fixtures/demo-data.js';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import express from 'express';
import cookieParser from 'cookie-parser';
import { PGlite } from '@electric-sql/pglite';
import { postgresDb as db } from '../src/server/db/postgres.js';
import { authRouter } from '../src/server/modules/auth/auth.routes.js';
import { agentRouter } from '../src/server/modules/agent/agent.routes.js';
import { tasksRouter } from '../src/server/modules/tasks/tasks.routes.js';
import { propertiesRouter } from '../src/server/modules/properties/properties.routes.js';
import { customersRouter } from '../src/server/modules/customers/customers.routes.js';
import { notificationsRouter } from '../src/server/modules/notifications/notifications.routes.js';
import { notificationScheduler } from '../src/server/modules/notifications/notification-scheduler.service.js';
import { errorMiddleware } from '../src/server/middleware/error.middleware.js';
import { evaluateTaskReminderCandidates } from '../src/shared/notification-rules.js';
import { MemoryOfflineBackend, offlineStore } from '../src/services/offlineStore.js';
import { offlineSync } from '../src/services/offlineSync.js';
import {
  attemptOfflineLogin,
  clearActiveOfflinePointer,
  enrollOfflineSession,
  restoreActiveOfflineSession,
  revokeLocalLicense,
  tickClockWatermark,
  validateLocalLicenseState,
} from '../src/services/offlineLicense.js';

let server: ReturnType<express.Express['listen']>;
let base: string;
let admin: any;
let agent: any;
let property: any;
let customer: any;

async function apiRequest(
  path: string,
  method = 'GET',
  body?: any,
  token = admin?.token,
  extraHeaders: Record<string, string> = {},
) {
  const response = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extraHeaders,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await response.json();
  return { status: response.status, ...json };
}

before(async () => {
  db.pg = new PGlite();
  db.isInitialized = true;
  await db.applyMigrations();
  await seedDemoData.call(db);

  const app = express();
  app.use(express.json(), cookieParser());
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/agent', agentRouter);
  app.use('/api/v1/tasks', tasksRouter);
  app.use('/api/v1/properties', propertiesRouter);
  app.use('/api/v1/customers', customersRouter);
  app.use('/api/v1/notifications', notificationsRouter);
  app.use(errorMiddleware);

  server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${(server.address() as any).port}`;

  const login = async (username: string) => {
    const result = await apiRequest(
      '/api/v1/auth/login',
      'POST',
      { agency_code: 'DEMO01', username, password: 'DemoPassword123!' },
      '',
    );
    assert.equal(result.status, 200);
    return result.data;
  };

  admin = await login('admin');
  agent = await login('agent');
  property = (await apiRequest('/api/v1/properties?status=active&limit=1')).data[0];
  customer = (await db.getCustomers(admin.tenant.id))[0];
});

after(async () => {
  notificationScheduler.setPushDispatcherForTests(null);
  offlineSync.setTransportForTests(null);
  if (server) {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  await db.pg.close();
});

test('Notification rules evaluate 2h follow-up, visit, 30m near-due, overdue, category toggles, and deep-link URLs', () => {
  const now = new Date('2026-11-27T10:00:00Z');
  const tasks = [
    {
      id: 't-2h',
      title: 'تماس با خریدار',
      customer_id: 'cust-1',
      customer_name: 'رضا کریمی',
      due_at: new Date(now.getTime() + 90 * 60_000).toISOString(),
      type: 'FOLLOW_UP',
      status: 'PENDING',
    },
    {
      id: 't-visit',
      title: 'بازدید آپارتمان گوهردشت',
      customer_id: 'cust-2',
      customer_name: 'سارا محمدی',
      property_id: 'prop-9',
      property_code: 'MLK-109',
      due_at: new Date(now.getTime() + 20 * 60_000).toISOString(),
      type: 'VISIT',
      status: 'TODO',
    },
    {
      id: 't-overdue',
      title: 'پیگیری عقب‌افتاده',
      due_at: new Date(now.getTime() - 4 * 3600_000).toISOString(),
      type: 'FOLLOW_UP',
      status: 'PENDING',
    },
    {
      id: 't-done',
      title: 'انجام‌شده',
      due_at: new Date(now.getTime() + 30 * 60_000).toISOString(),
      type: 'FOLLOW_UP',
      status: 'COMPLETED',
    },
  ];

  const full = evaluateTaskReminderCandidates(tasks, now);
  const categories = full.map((c) => `${c.entity_id}:${c.category}`);
  assert(categories.includes('t-2h:two_hour_reminder'));
  assert(categories.includes('t-visit:visit_reminder'));
  assert(categories.includes('t-visit:near_due_reminder'));
  assert(categories.includes('t-overdue:overdue_reminder'));
  assert(!full.some((c) => c.entity_id === 't-done'));

  const visitCand = full.find((c) => c.entity_id === 't-visit' && c.category === 'visit_reminder')!;
  assert.equal(
    visitCand.target_url,
    '/?tab=tasks&taskId=t-visit&customerId=cust-2&propertyId=prop-9',
  );
  assert(visitCand.title.includes('سارا محمدی'));
  assert(visitCand.body.includes('MLK-109'));

  // Respect per-category preference disables
  const filtered = evaluateTaskReminderCandidates(tasks, now, {
    two_hour_reminder: false,
    overdue_reminder: false,
    visit_reminder: true,
    near_due_reminder: false,
  });
  assert.deepEqual(
    filtered.map((c) => `${c.entity_id}:${c.category}`),
    ['t-visit:visit_reminder'],
  );
});

test('Notification scheduler creates deduplicated notifications, dispatches Web Push, cleans 410 subscriptions, and supports center CRUD', async () => {
  const pushDeliveries: Array<{ endpoint: string; payload: any }> = [];
  notificationScheduler.setPushDispatcherForTests(async (sub, payload) => {
    if (sub.endpoint.includes('stale-endpoint')) {
      const err: any = new Error('Gone');
      err.statusCode = 410;
      throw err;
    }
    pushDeliveries.push({ endpoint: sub.endpoint, payload: JSON.parse(payload) });
  });

  // Subscribe one valid endpoint and one stale endpoint for agent
  const sub1 = await apiRequest(
    '/api/v1/notifications/push-subscribe',
    'POST',
    {
      endpoint: 'https://fcm.googleapis.com/fcm/send/valid-endpoint-1',
      keys: { p256dh: 'BOr7fakeKey1234567890', auth: 'authSecret1234' },
    },
    agent.token,
  );
  assert.equal(sub1.status, 201);

  const sub2 = await apiRequest(
    '/api/v1/notifications/push-subscribe',
    'POST',
    {
      endpoint: 'https://fcm.googleapis.com/fcm/send/stale-endpoint-410',
      keys: { p256dh: 'BOr7staleKey123456789', auth: 'authSecret5678' },
    },
    agent.token,
  );
  assert.equal(sub2.status, 201);

  // Create a task 45 minutes in the future directly in DB so explicit runSweep tests creation, push & dedup deterministically
  const createdTask = await db.createTask(agent.tenant.id, agent.user.id, {
    title: 'پیگیری تست نوتیفیکیشن ۲ ساعته',
    due_at: new Date(Date.now() + 45 * 60_000).toISOString(),
    type: 'FOLLOW_UP',
    assigned_user_id: agent.user.id,
    customer_id: customer.id,
  });
  assert(createdTask?.id);

  const firstSweep = await notificationScheduler.runSweep({
    tenantId: agent.tenant.id,
    userId: agent.user.id,
  });
  assert(firstSweep.created >= 1);
  assert(firstSweep.pushed >= 1);

  // Second sweep should deduplicate and create 0 duplicates
  const secondSweep = await notificationScheduler.runSweep({
    tenantId: agent.tenant.id,
    userId: agent.user.id,
  });
  assert.equal(secondSweep.created, 0);

  // Check Web Push payload delivered and 410 subscription removed
  const deliveredForTask = pushDeliveries.find(
    (d) => d.payload.entity_id === createdTask.id,
  );
  assert(deliveredForTask);
  assert(deliveredForTask.payload.target_url.includes(`taskId=${createdTask.id}`));
  const remainingSubs = await db.getPushSubscriptionsForUser(agent.tenant.id, agent.user.id);
  assert.equal(remainingSubs.length, 1);
  assert.equal(remainingSubs[0].endpoint, 'https://fcm.googleapis.com/fcm/send/valid-endpoint-1');

  // Notification center CRUD + preferences
  const feed = await apiRequest('/api/v1/notifications', 'GET', undefined, agent.token);
  assert.equal(feed.status, 200);
  const notif = feed.data.items.find((n: any) => n.entity_id === createdTask.id);
  assert(notif);
  assert.equal(notif.is_read, false);

  const marked = await apiRequest(
    `/api/v1/notifications/${notif.id}/read`,
    'PATCH',
    {},
    agent.token,
  );
  assert.equal(marked.status, 200);
  assert.equal(marked.data.is_read, true);

  const prefUpdate = await apiRequest(
    '/api/v1/notifications/preferences',
    'PATCH',
    { overdue_reminder: false },
    agent.token,
  );
  assert.equal(prefUpdate.status, 200);
  assert.equal(prefUpdate.data.overdue_reminder, false);

  const cleared = await apiRequest('/api/v1/notifications', 'DELETE', undefined, agent.token);
  assert.equal(cleared.status, 200);
  assert(cleared.data.deleted >= 1);

  const vapid = await apiRequest(
    '/api/v1/notifications/vapid-public-key',
    'GET',
    undefined,
    agent.token,
  );
  assert.equal(vapid.status, 200);
  assert(vapid.data.publicKey.length > 20);
});

test('Offline-first queue handles create/edit/delete, tempId chaining, reload overlay, idempotency, and 409 conflict overwrite', async () => {
  offlineStore.setBackend(new MemoryOfflineBackend());
  const scope = { tenantId: admin.tenant.id, userId: admin.user.id };

  await enrollOfflineSession({
    user: admin.user,
    tenant: admin.tenant,
    offlineLicense: admin.offline_license,
    password: 'DemoPassword123!',
  });

  // Wire offlineSync transport to live Express/PGlite server
  offlineSync.setTransportForTests({
    request: async (method, path, body, headers = {}) => {
      const res = await fetch(base + path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${admin.token}`,
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      return {
        success: res.ok && json.success !== false,
        status: res.status,
        data: json.data,
        error: json.error,
        message: json.message,
      };
    },
  });

  // Seed initial offline snapshots from live server
  const [homeRes, propsRes, custsRes, tasksRes] = await Promise.all([
    apiRequest('/api/v1/agent/home'),
    apiRequest('/api/v1/properties?status=all&limit=100'),
    apiRequest('/api/v1/customers?limit=100'),
    apiRequest('/api/v1/tasks'),
  ]);
  await offlineSync.saveSnapshot(scope, 'homeData', homeRes.data, 'ALL');
  await offlineSync.saveSnapshot(scope, 'properties', propsRes.data, 'ALL');
  await offlineSync.saveSnapshot(scope, 'customers', custsRes.data, 'ALL');
  await offlineSync.saveSnapshot(scope, 'tasks', tasksRes.data, 'ALL');

  // 1. Offline mutations: create customer + dependent task + edit property
  const createCustRes = await offlineSync.mutate(scope, {
    method: 'POST',
    path: '/api/v1/customers',
    body: {
      first_name: 'امیر',
      last_name: 'آفلاین‌پور',
      phone: '09128887766',
      customer_type: 'BUYER',
      visibility: 'AGENCY',
    },
    entityType: 'CUSTOMER',
    actionLabel: 'ثبت مشتری آفلاین',
    forceOffline: true,
    optimisticBuilder: (tempId) => ({
      id: tempId,
      first_name: 'امیر',
      last_name: 'آفلاین‌پور',
      display_name: 'امیر آفلاین‌پور',
      phone: '09128887766',
      customer_type: 'BUYER',
      visibility: 'AGENCY',
      status: 'ACTIVE',
    }),
  });
  assert.equal(createCustRes.queuedOffline, true);
  const tempCustomerId = createCustRes.data.id;
  assert(tempCustomerId.startsWith('offline-'));

  const dueTodayIso = new Date().toISOString();
  const createTaskRes = await offlineSync.mutate(scope, {
    method: 'POST',
    path: '/api/v1/tasks',
    body: {
      title: 'پیگیری مشتری آفلاین',
      due_at: dueTodayIso,
      type: 'FOLLOW_UP',
      customer_id: tempCustomerId,
    },
    entityType: 'TASK',
    actionLabel: 'ثبت وظیفه آفلاین',
    forceOffline: true,
    optimisticBuilder: (tempId) => ({
      id: tempId,
      title: 'پیگیری مشتری آفلاین',
      due_at: dueTodayIso,
      type: 'FOLLOW_UP',
      status: 'PENDING',
      customer_id: tempCustomerId,
      customer_name: 'امیر آفلاین‌پور',
    }),
  });
  assert.equal(createTaskRes.queuedOffline, true);

  const editPropRes = await offlineSync.mutate(scope, {
    method: 'PATCH',
    path: `/api/v1/properties/${property.id}`,
    body: { title: 'ملک ویرایش‌شده آفلاین' },
    entityType: 'PROPERTY',
    entityId: property.id,
    expectedUpdatedAt: property.updated_at,
    actionLabel: 'ویرایش ملک آفلاین',
    forceOffline: true,
  });
  assert.equal(editPropRes.queuedOffline, true);

  // Verify snapshots retain optimistic edits across offline reload
  const reloadedCusts = await offlineSync.loadSnapshot<any[]>(scope, 'customers', 'ALL');
  const reloadedProps = await offlineSync.loadSnapshot<any[]>(scope, 'properties', 'ALL');
  const reloadedHome = await offlineSync.loadSnapshot<any>(scope, 'homeData', 'ALL');
  assert(reloadedCusts!.some((c) => c.id === tempCustomerId));
  assert.equal(
    reloadedProps!.find((p) => p.id === property.id)?.title,
    'ملک ویرایش‌شده آفلاین',
  );
  assert(reloadedHome!.todayTasks.some((t: any) => t.title === 'پیگیری مشتری آفلاین'));
  assert.equal(reloadedHome!.metrics.today_count, reloadedHome!.todayTasks.length);

  // 2. Drain queue when internet reconnects -> verifies FIFO & tempId substitution
  const drainResult = await offlineSync.drainQueue(scope, { ignoreOnlineCheck: true });
  assert.equal(drainResult.synced, 3);
  assert.equal(drainResult.failed, 0);
  assert.equal(drainResult.conflicts, 0);
  assert.equal((await offlineSync.getQueueItems(scope)).length, 0);

  const serverCusts = (await apiRequest('/api/v1/customers?limit=100')).data;
  const syncedCust = serverCusts.find((c: any) => c.phone === '09128887766');
  assert(syncedCust);
  const serverTasks = (await apiRequest('/api/v1/tasks')).data;
  const syncedTask = serverTasks.find((t: any) => t.title === 'پیگیری مشتری آفلاین');
  assert(syncedTask);
  assert.equal(syncedTask.customer_id, syncedCust.id);

  // 3. Idempotency check: duplicate X-Idempotency-Key creates only 1 property
  const idemKey = `test-idem-${Date.now()}`;
  const p1 = await apiRequest(
    '/api/v1/properties',
    'POST',
    {
      title: 'ملک تست جلوگیری از تکرار',
      property_type: 'APARTMENT',
      listing_type: 'SALE',
      area_sqm: 110,
      neighborhood: 'جهانشهر',
    },
    admin.token,
    { 'X-Idempotency-Key': idemKey },
  );
  const p2 = await apiRequest(
    '/api/v1/properties',
    'POST',
    {
      title: 'ملک تست جلوگیری از تکرار',
      property_type: 'APARTMENT',
      listing_type: 'SALE',
      area_sqm: 110,
      neighborhood: 'جهانشهر',
    },
    admin.token,
    { 'X-Idempotency-Key': idemKey },
  );
  assert.equal(p1.status, 201);
  assert.equal(p2.status, 201);
  assert.equal(p1.data.id, p2.data.id);

  // 4. Conflict detection & force overwrite
  const staleUpdatedAt = p1.data.updated_at;
  // Server updates property first
  await new Promise((r) => setTimeout(r, 30));
  const serverUpdate = await apiRequest(`/api/v1/properties/${p1.data.id}`, 'PATCH', {
    title: 'تغییر سرور قبل از همگام‌سازی',
  });
  assert.equal(serverUpdate.status, 200);

  // Client queues offline edit with stale expectedUpdatedAt
  await offlineSync.mutate(scope, {
    method: 'PATCH',
    path: `/api/v1/properties/${p1.data.id}`,
    body: { title: 'تغییر آفلاین متعارض' },
    entityType: 'PROPERTY',
    entityId: p1.data.id,
    expectedUpdatedAt: staleUpdatedAt,
    actionLabel: 'ویرایش متعارض',
    forceOffline: true,
  });

  const conflictDrain = await offlineSync.drainQueue(scope, { ignoreOnlineCheck: true });
  assert.equal(conflictDrain.conflicts, 1);
  const queueAfterConflict = await offlineSync.getQueueItems(scope);
  assert.equal(queueAfterConflict.length, 1);
  assert.equal(queueAfterConflict[0].status, 'CONFLICT');
  assert.equal(queueAfterConflict[0].serverRecord?.title, 'تغییر سرور قبل از همگام‌سازی');

  // Resolve conflict with forceOverwrite = true
  await offlineSync.retryItem(scope, queueAfterConflict[0].id, true);
  // In case navigator.onLine isn't active, force drain with ignoreOnlineCheck
  if ((await offlineSync.getQueueItems(scope)).length > 0) {
    await offlineSync.drainQueue(scope, { ignoreOnlineCheck: true });
  }
  assert.equal((await offlineSync.getQueueItems(scope)).length, 0);
  const afterResolve = await apiRequest(`/api/v1/properties/${p1.data.id}`);
  assert.equal(afterResolve.data.title, 'تغییر آفلاین متعارض');

  // 5. Offline delete task
  const delOffline = await offlineSync.mutate(scope, {
    method: 'DELETE',
    path: `/api/v1/tasks/${syncedTask.id}`,
    entityType: 'TASK',
    entityId: syncedTask.id,
    actionLabel: 'حذف وظیفه آفلاین',
    forceOffline: true,
  });
  assert.equal(delOffline.queuedOffline, true);
  const drainDel = await offlineSync.drainQueue(scope, { ignoreOnlineCheck: true });
  assert.equal(drainDel.synced, 1);
  const tasksAfterDel = (await apiRequest('/api/v1/tasks')).data;
  assert(!tasksAfterDel.some((t: any) => t.id === syncedTask.id));
});

test('Tamper-resistant offline subscription license rejects clock rollback, payload tampering, expiry, revocation, and isolates tenant/user scopes', async () => {
  offlineStore.setBackend(new MemoryOfflineBackend());
  const scopeAdmin = { tenantId: admin.tenant.id, userId: admin.user.id };
  const scopeAgent = { tenantId: agent.tenant.id, userId: agent.user.id };

  assert(admin.offline_license?.signature_b64);

  await enrollOfflineSession({
    user: admin.user,
    tenant: admin.tenant,
    offlineLicense: admin.offline_license,
    password: 'DemoPassword123!',
  });

  // 1. Valid cold restore & offline login
  const restored = await restoreActiveOfflineSession(Date.now());
  assert.equal(restored.ok, true);
  assert.equal(restored.user?.id, admin.user.id);

  await clearActiveOfflinePointer();
  const badPass = await attemptOfflineLogin('DEMO01', 'admin', 'WrongPass!', Date.now());
  assert.equal(badPass.success, false);
  assert.equal(badPass.code, 'INVALID_CREDENTIALS');

  const goodOfflineLogin = await attemptOfflineLogin(
    'DEMO01',
    'admin',
    'DemoPassword123!',
    Date.now(),
  );
  assert.equal(goodOfflineLogin.success, true);

  // 2. Clock rollback detection: advance watermark forward, then test earlier wall clock
  const futureTime = Date.now() + 3 * 3600_000;
  await tickClockWatermark(scopeAdmin, futureTime);
  const rollbackCheck = await validateLocalLicenseState(
    scopeAdmin,
    admin.offline_license,
    futureTime - 20 * 60_000,
  );
  assert.equal(rollbackCheck.valid, false);
  assert.equal(rollbackCheck.reason, 'CLOCK_TAMPERED');

  const rollbackLogin = await attemptOfflineLogin(
    'DEMO01',
    'admin',
    'DemoPassword123!',
    futureTime - 20 * 60_000,
  );
  assert.equal(rollbackLogin.success, false);
  assert.equal(rollbackLogin.code, 'OFFLINE_SECURITY_BLOCK');

  // 3. Payload tampering detection (extending expiry without server ECDSA private key)
  const tamperedLicense = structuredClone(admin.offline_license);
  tamperedLicense.payload.subscription_expires_at = new Date(
    Date.now() + 3650 * 86400_000,
  ).toISOString();
  const tamperCheck = await validateLocalLicenseState(
    scopeAdmin,
    tamperedLicense,
    Date.now(),
  );
  assert.equal(tamperCheck.valid, false);
  assert.equal(tamperCheck.reason, 'DATA_TAMPERED');

  // 4. Subscription expiry enforcement offline
  const pastExpiryMs =
    new Date(admin.offline_license.payload.subscription_expires_at).getTime() + 60_000;
  const expiredCheck = await validateLocalLicenseState(
    scopeAdmin,
    admin.offline_license,
    pastExpiryMs,
  );
  assert.equal(expiredCheck.valid, false);
  assert(
    expiredCheck.reason === 'EXPIRED' || expiredCheck.reason === 'LEASE_EXPIRED',
  );

  // 5. Revoked local license blocks offline login
  await revokeLocalLicense(scopeAdmin, 'EXPIRED');
  const loginAfterRevoke = await attemptOfflineLogin(
    'DEMO01',
    'admin',
    'DemoPassword123!',
    futureTime + 1000,
  );
  assert.equal(loginAfterRevoke.success, false);
  assert.equal(loginAfterRevoke.code, 'SUBSCRIPTION_EXPIRED');

  // 6. Strict local tenant/user isolation
  await offlineSync.saveSnapshot(scopeAdmin, 'properties', [{ id: 'secret-admin-prop' }], 'ALL');
  await offlineSync.saveSnapshot(scopeAgent, 'properties', [{ id: 'agent-prop' }], 'ALL');
  const adminProps = await offlineSync.loadSnapshot<any[]>(scopeAdmin, 'properties', 'ALL');
  const agentProps = await offlineSync.loadSnapshot<any[]>(scopeAgent, 'properties', 'ALL');
  assert.equal(adminProps?.[0]?.id, 'secret-admin-prop');
  assert.equal(agentProps?.[0]?.id, 'agent-prop');
  assert(!agentProps?.some((p) => p.id === 'secret-admin-prop'));
});
