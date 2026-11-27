import assert from "node:assert/strict";
import { test, before, after } from "node:test";
import { mkdtemp, rm, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import vm from "node:vm";
import express from "express";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PGlite } from "@electric-sql/pglite";
import { postgresDb as db } from "../src/server/db/postgres.js";
import { authRouter } from "../src/server/modules/auth/auth.routes.js";
import { platformRouter } from "../src/server/modules/platform/platform.routes.js";
import { documentsRouter } from "../src/server/modules/documents/documents.routes.js";
import { platformUiRouter } from "../src/server/modules/platform/platform.ui.js";
import { requestLoggerMiddleware } from "../src/server/middleware/request-logger.middleware.js";
import { errorMiddleware } from "../src/server/middleware/error.middleware.js";
import { PostgresPool } from "../src/server/db/postgres-pool.js";
import { logger } from "../src/server/logging/logger.js";
import { redactString, redactValue, redactHeaders, REDACTED_VALUE } from "../src/server/logging/redactor.js";
import { api } from "../src/services/apiClient.js";
import { AuthContext } from "../src/context/AuthContext.js";
import { LoginPage, formatLoginErrorMessage } from "../src/pages/LoginPage.js";

let tempDataDir: string;
let oldDataDir: string | undefined;
let server: any;
let base: string;
let platformToken: string;
let tenantId: string;
let userId: string;
let userToken: string;

const platformPassword = crypto.randomBytes(18).toString("hex");
const userPassword = "StrongUserPass!2026";
const secretSentinel = "SuperSecretToken_9988776655";

before(async () => {
  oldDataDir = process.env.DATA_DIR;
  tempDataDir = await mkdtemp(path.join(tmpdir(), "melktak-logtest-"));
  process.env.DATA_DIR = tempDataDir;

  db.pg = new PGlite();
  db.isInitialized = true;
  await db.applyMigrations();

  process.env.PLATFORM_ADMIN_USERNAME = "logtest_admin";
  process.env.PLATFORM_ADMIN_PASSWORD = platformPassword;
  await db.bootstrapPlatformAdminIfConfigured();
  const admin = await db.getPlatformAdminByUsername("logtest_admin");
  platformToken = await db.createPlatformSession(admin.id, "127.0.0.1", "test-suite");

  tenantId = crypto.randomUUID();
  userId = crypto.randomUUID();
  await db.pg.query(
    `INSERT INTO tenants (id, agency_code, name, slug, status, subscription_status, subscription_expires_at)
     VALUES ($1, 'LOGTEST', 'آژانس تست لاگ', 'logtest', 'ACTIVE', 'ACTIVE', $2)`,
    [tenantId, new Date(Date.now() + 86400_000 * 30).toISOString()],
  );
  await db.pg.query(
    `INSERT INTO users (id, tenant_id, username, password_hash, first_name, last_name, display_name, role_code, is_active)
     VALUES ($1, $2, 'agent1', $3, 'علی', 'رضایی', 'علی رضایی', 'ADMIN', true)`,
    [userId, tenantId, bcrypt.hashSync(userPassword, 10)],
  );
  userToken = await db.createSession(userId, tenantId, "127.0.0.1", "test-suite");

  const app = express();
  app.use(express.json(), cookieParser());
  app.use("/api", requestLoggerMiddleware);
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/platform", platformRouter);
  app.use("/api/v1/documents", documentsRouter);
  app.use("/platform-ui", platformUiRouter);

  app.get("/api/v1/test/boom", (_req, _res, next) => {
    const err: any = new Error(`Unhandled crash with secret ${secretSentinel} and token=abc123xyz`);
    err.stack = `Error: Unhandled crash\n    at boomHandler (/srv/secret/server.ts:42:11)`;
    next(err);
  });

  app.get("/api/v1/test/pg-fail", async (_req, _res, next) => {
    try {
      await db.pg.query("SELECT * FROM non_existent_table_xyz WHERE secret_col = $1", [secretSentinel]);
    } catch (e) {
      next(e);
    }
  });

  app.use(errorMiddleware);

  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await logger.flush();
  if (server) {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(resolve));
  }
  await db.pg.close();
  if (oldDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = oldDataDir;
  await rm(tempDataDir, { recursive: true, force: true });
});

test("Logging #1 & #2: API 500 error logs structured record with requestId + stack and masks stack from client", async () => {
  const res = await fetch(`${base}/api/v1/test/boom`);
  assert.equal(res.status, 500);
  const reqId = res.headers.get("x-request-id");
  assert.ok(reqId, "Response must include X-Request-Id header");

  const body = await res.json();
  assert.equal(body.success, false);
  assert.equal(body.error.code, "INTERNAL_SERVER_ERROR");
  assert.equal(body.error.requestId, reqId);
  assert.doesNotMatch(JSON.stringify(body), /Unhandled crash|\/srv\/secret|SuperSecretToken/);

  await logger.flush();
  const logsRes = await db.getSystemLogs({ search: reqId!, pageSize: 20 });
  const entry = logsRes.items.find((r: any) => r.level === "ERROR" && r.requestId === reqId);
  assert.ok(entry, "500 API error must be persisted in system_logs");
  assert.match(entry.stack || "", /boomHandler/);
  assert.doesNotMatch(entry.message || "", /abc123xyz/);
});

test("Logging #3: PostgreSQL query failure is logged safely without parameter values", async () => {
  const poolWrapper = new PostgresPool("postgres://user:pass@127.0.0.1:5432/db");
  (poolWrapper as any).pool = {
    query: async () => {
      throw Object.assign(new Error('relation "non_existent_table_xyz" does not exist'), { code: "42P01" });
    },
    end: async () => {},
  };

  await assert.rejects(
    () => poolWrapper.query("SELECT * FROM non_existent_table_xyz WHERE secret_col = $1", [secretSentinel]),
    /does not exist/,
  );
  await logger.flush();

  const logsRes = await db.getSystemLogs({ level: "ERROR", module: "postgres", pageSize: 20 });
  const pgErr = logsRes.items.find((r: any) => r.operation === "query_failed");
  assert.ok(pgErr, "PostgreSQL query error should be logged under postgres module");
  assert.doesNotMatch(JSON.stringify(pgErr), new RegExp(secretSentinel));
});

test("Logging #4 & Login API: invalid credentials log WARN without leaking password or tokens", async () => {
  const attemptedPass = "WrongPassword_999111!";
  const res = await fetch(`${base}/api/v1/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secretSentinel}`,
      Cookie: `amlak_session=${secretSentinel}`,
    },
    body: JSON.stringify({
      agency_code: "LOGTEST",
      username: "agent1",
      password: attemptedPass,
    }),
  });
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.error.code, "INVALID_CREDENTIALS");

  await logger.flush();
  const logsRes = await db.getSystemLogs({ module: "auth", pageSize: 20 });
  const warnEntry = logsRes.items.find((r: any) => r.operation === "login_failed");
  assert.ok(warnEntry, "Failed login must create WARN entry");
  assert.equal(warnEntry.level, "WARN");
  const serialized = JSON.stringify(logsRes.items);
  assert.doesNotMatch(serialized, new RegExp(attemptedPass));
  assert.doesNotMatch(serialized, new RegExp(secretSentinel));
});

test("Logging #5: document upload error (oversize / invalid type) is logged without leaking file buffers", async () => {
  const form = new FormData();
  form.append("file", new Blob(["not a valid pdf"], { type: "text/plain" }), "bad.txt");

  const res = await fetch(`${base}/api/v1/documents/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${userToken}` },
    body: form,
  });
  assert.equal(res.status, 400);
  await logger.flush();

  const logsRes = await db.getSystemLogs({ module: "documents", pageSize: 20 });
  assert.ok(logsRes.items.length > 0, "Invalid upload must produce a structured warning log");
  assert.doesNotMatch(JSON.stringify(logsRes.items), /not a valid pdf/);
});

test("Logging #6: backup export and restore failure are logged under backup module", async () => {
  const okExport = await fetch(`${base}/api/v1/platform/tenants/${tenantId}/export`, {
    headers: { Authorization: `Bearer ${platformToken}` },
  });
  assert.equal(okExport.status, 200);

  const badImport = await fetch(`${base}/api/v1/platform/tenants/import`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${platformToken}`,
    },
    body: JSON.stringify({ backup_data: { invalid: true } }),
  });
  assert.equal(badImport.status, 500);
  await logger.flush();

  const logsRes = await db.getSystemLogs({ module: "backup", pageSize: 20 });
  assert.ok(logsRes.items.some((r: any) => r.operation === "backup_export_tenant"));
  assert.ok(logsRes.items.some((r: any) => r.operation === "backup_import_failed"));
});

test("Logging #7: central redactor masks passwords, tokens, cookies, auth headers, DB URLs, buffers, and circular refs", () => {
  const circular: any = { password: "secret-pass", nested: { access_token: "tok-123" } };
  circular.self = circular;
  circular.buf = Buffer.from("binary-secret");

  const redacted: any = redactValue(circular);
  assert.equal(redacted.password, REDACTED_VALUE);
  assert.equal(redacted.nested.access_token, REDACTED_VALUE);
  assert.equal(redacted.self, "[CIRCULAR]");
  assert.match(redacted.buf, /^\[BINARY_BUFFER_REDACTED/);

  const maskedStr = redactString(
    "postgresql://amlak:UltraSecret@db:5432/app Bearer eyJhbGciOiJIUzI1NiJ9.abcdef123456.sig1234567890 amlak_session=sess123",
  );
  assert.doesNotMatch(maskedStr, /UltraSecret|eyJhbGci|sess123/);

  const headers = redactHeaders({
    authorization: "Bearer secret999",
    cookie: "amlak_platform_session=plat_abcdef1234567890",
    "x-request-id": "req-1",
  });
  assert.equal(headers.authorization, REDACTED_VALUE);
  assert.equal(headers.cookie, REDACTED_VALUE);
  assert.equal(headers["x-request-id"], "req-1");
});

test("Logging #8, #9, #10 & #11: Platform Admin logs API supports auth guard, filters, pagination, detail endpoint, and escaped UI", async () => {
  // #10 Unauthorized user & unauthenticated access blocked with 401
  const unauthRes = await fetch(`${base}/api/v1/platform/logs`);
  assert.equal(unauthRes.status, 401);
  const tenantUserRes = await fetch(`${base}/api/v1/platform/logs`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  assert.equal(tenantUserRes.status, 401);

  await logger.flush();

  // #8 Filter by level & module & search
  const filteredRes = await fetch(
    `${base}/api/v1/platform/logs?level=WARN&module=platform&search=unauthorized`,
    { headers: { Authorization: `Bearer ${platformToken}` } },
  );
  assert.equal(filteredRes.status, 200);
  const filteredJson = await filteredRes.json();
  assert.equal(filteredJson.success, true);
  assert.ok(filteredJson.data.items.length >= 1);
  assert.ok(filteredJson.data.items.every((i: any) => i.level === "WARN" && i.module === "platform"));

  // #9 Server-side pagination
  const page1Res = await fetch(`${base}/api/v1/platform/logs?page=1&pageSize=2`, {
    headers: { Authorization: `Bearer ${platformToken}` },
  });
  const page2Res = await fetch(`${base}/api/v1/platform/logs?page=2&pageSize=2`, {
    headers: { Authorization: `Bearer ${platformToken}` },
  });
  const p1 = await page1Res.json();
  const p2 = await page2Res.json();
  assert.equal(p1.data.items.length, 2);
  assert.ok(p1.data.pagination.total >= 4);
  assert.ok(p1.data.pagination.totalPages >= 2);
  assert.notEqual(p1.data.items[0].id, p2.data.items[0].id);

  // Detail endpoint returns single masked record
  const detailRes = await fetch(`${base}/api/v1/platform/logs/${p1.data.items[0].id}`, {
    headers: { Authorization: `Bearer ${platformToken}` },
  });
  assert.equal(detailRes.status, 200);
  const detailJson = await detailRes.json();
  assert.equal(detailJson.data.id, p1.data.items[0].id);

  // #11 Platform UI includes System Logs controls and HTML escaping (and enforces cookie auth)
  const unauthUiRes = await fetch(`${base}/platform-ui/`, { redirect: "manual" });
  assert.equal(unauthUiRes.status, 302);

  const uiRes = await fetch(`${base}/platform-ui/`, {
    headers: { Cookie: `amlak_platform_session=${platformToken}` },
  });
  assert.equal(uiRes.status, 200);
  const html = await uiRes.text();
  assert.match(html, /system-logs-section/);
  assert.match(html, /system-log-detail-modal/);
  assert.match(html, /function escapeHtml/);
});

test("Logging #12 & #13: file log rotation caps size/count and DB retention pruning preserves security audit logs", async () => {
  const prevBytes = process.env.LOG_MAX_FILE_BYTES;
  const prevFiles = process.env.LOG_MAX_FILES;
  process.env.LOG_MAX_FILE_BYTES = "1024";
  process.env.LOG_MAX_FILES = "2";

  try {
    for (let i = 0; i < 20; i++) {
      logger.info(`Rotation fill event #${i} ${"x".repeat(120)}`, {
        module: "test",
        operation: "rotation_fill",
        persistToDb: false,
      });
    }
    const logDir = path.join(tempDataDir, "logs");
    const files = await readdir(logDir);
    assert.ok(files.includes("app.log"));
    assert.ok(files.includes("app.log.1"));
    assert.ok(!files.includes("app.log.3"), "Rotated archive count must respect LOG_MAX_FILES");
  } finally {
    if (prevBytes === undefined) delete process.env.LOG_MAX_FILE_BYTES;
    else process.env.LOG_MAX_FILE_BYTES = prevBytes;
    if (prevFiles === undefined) delete process.env.LOG_MAX_FILES;
    else process.env.LOG_MAX_FILES = prevFiles;
  }

  // Insert an audit log and an old system log, then prune
  await db.addAuditLog(tenantId, userId, "SECURITY_EVENT_KEEP", "TENANT", tenantId, { ok: true });
  const oldId = crypto.randomUUID();
  await db.pg.query(
    `INSERT INTO system_logs (id, level, message, module, operation, created_at)
     VALUES ($1, 'INFO', 'Old operational log', 'test', 'old_op', $2)`,
    [oldId, new Date(Date.now() - 45 * 86400_000).toISOString()],
  );
  const deleted = await db.pruneSystemLogs(30, 50000);
  assert.ok(deleted >= 1);
  assert.equal(await db.getSystemLogById(oldId), null);
  const auditCount = (await db.pg.query(`SELECT COUNT(*)::int AS cnt FROM audit_logs WHERE action = 'SECURITY_EVENT_KEEP'`)).rows[0].cnt;
  assert.equal(auditCount, 1, "Security audit_logs must NEVER be pruned by system_logs retention");
});

test("Logging #14: Platform UI renders Persian Jalali date filter popover, delete buttons, and valid inline JS", async () => {
  const uiRes = await fetch(`${base}/platform-ui/`, {
    headers: { Cookie: `amlak_platform_session=${platformToken}` },
  });
  assert.equal(uiRes.status, 200);
  const html = await uiRes.text();
  assert.match(html, /id="logs-delete-all-btn"/);
  assert.match(html, /id="jalali-picker-popover"/);
  assert.match(html, /id="logs-from-btn"/);
  assert.match(html, /id="logs-to-btn"/);
  assert.match(html, /id="log-det-delete-btn"/);
  assert.match(html, /function confirmDeleteAllLogs/);
  assert.match(html, /function confirmDeleteSingleLog/);
  assert.match(html, /replace\(\/\\d\/g/);

  const scriptMatches = Array.from(html.matchAll(/<script>([\s\S]*?)<\/script>/g));
  assert.ok(scriptMatches.length >= 1, "Platform UI must include inline script");
  for (const m of scriptMatches) {
    new vm.Script(m[1]);
  }
});

test("Logging #15: Platform Admin can delete single or all system logs with auth checks and audit_logs preserved", async () => {
  await logger.flush();
  const idA = crypto.randomUUID();
  const idB = crypto.randomUUID();
  await db.pg.query(
    `INSERT INTO system_logs (id, level, message, module, operation, created_at)
     VALUES ($1, 'INFO', 'Single delete target', 'test', 'del_one', NOW()),
            ($2, 'WARN', 'Delete all target', 'test', 'del_all', NOW())`,
    [idA, idB],
  );

  // Unauthenticated and tenant users must be rejected with 401
  assert.equal((await fetch(`${base}/api/v1/platform/logs/${idA}`, { method: "DELETE" })).status, 401);
  assert.equal(
    (await fetch(`${base}/api/v1/platform/logs/${idA}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${userToken}` },
    })).status,
    401,
  );
  assert.equal((await fetch(`${base}/api/v1/platform/logs`, { method: "DELETE" })).status, 401);
  assert.equal(
    (await fetch(`${base}/api/v1/platform/logs`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${userToken}` },
    })).status,
    401,
  );

  // Invalid log ID returns 400
  const badIdRes = await fetch(`${base}/api/v1/platform/logs/not-a-uuid`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${platformToken}` },
  });
  assert.equal(badIdRes.status, 400);

  // Single log delete returns 200 and removes only target log
  const delOneRes = await fetch(`${base}/api/v1/platform/logs/${idA}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${platformToken}` },
  });
  assert.equal(delOneRes.status, 200);
  const delOneJson = await delOneRes.json();
  assert.equal(delOneJson.success, true);
  assert.equal(delOneJson.data.deleted, true);
  assert.equal(await db.getSystemLogById(idA), null);
  assert.ok(await db.getSystemLogById(idB));

  // Deleting already-deleted ID returns 404
  const delMissingRes = await fetch(`${base}/api/v1/platform/logs/${idA}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${platformToken}` },
  });
  assert.equal(delMissingRes.status, 404);

  // Delete all clears system_logs completely while preserving security audit_logs
  const delAllRes = await fetch(`${base}/api/v1/platform/logs`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${platformToken}` },
  });
  assert.equal(delAllRes.status, 200);
  const delAllJson = await delAllRes.json();
  assert.equal(delAllJson.success, true);
  assert.ok(delAllJson.data.deletedCount >= 1);

  await logger.flush();
  const afterRes = await fetch(`${base}/api/v1/platform/logs`, {
    headers: { Authorization: `Bearer ${platformToken}` },
  });
  assert.equal(afterRes.status, 200);
  const afterJson = await afterRes.json();
  assert.equal(afterJson.data.items.length, 0);
  assert.equal(afterJson.data.pagination.total, 0);

  const auditCount = (await db.pg.query(`SELECT COUNT(*)::int AS cnt FROM audit_logs WHERE action = 'SECURITY_EVENT_KEEP'`)).rows[0].cnt;
  assert.equal(auditCount, 1, "Security audit_logs must NEVER be deleted by Delete All system logs");
});

test("Login API & Client UX: covers 401/402/403/429/5xx/network mapping, button loading text, ARIA, and security", async () => {
  // Server status behavior: 403 suspended, 402 expired, 429 rate limit
  const suspTenantId = crypto.randomUUID();
  await db.pg.query(
    `INSERT INTO tenants (id, agency_code, name, slug, status, subscription_status)
     VALUES ($1, 'SUSP1', 'آژانس معلق', 'susp1', 'SUSPENDED', 'ACTIVE')`,
    [suspTenantId],
  );
  await db.pg.query(
    `INSERT INTO users (id, tenant_id, username, password_hash, first_name, last_name, display_name, role_code, is_active)
     VALUES ($1, $2, 'u1', $3, 'سارا', 'تست', 'سارا تست', 'ADMIN', true)`,
    [crypto.randomUUID(), suspTenantId, bcrypt.hashSync(userPassword, 10)],
  );
  const suspRes = await fetch(`${base}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agency_code: "SUSP1", username: "u1", password: userPassword }),
  });
  assert.equal(suspRes.status, 403);

  const expTenantId = crypto.randomUUID();
  await db.pg.query(
    `INSERT INTO tenants (id, agency_code, name, slug, status, subscription_status, subscription_expires_at)
     VALUES ($1, 'EXP1', 'آژانس منقضی', 'exp1', 'ACTIVE', 'EXPIRED', $2)`,
    [expTenantId, new Date(Date.now() - 86400_000).toISOString()],
  );
  await db.pg.query(
    `INSERT INTO users (id, tenant_id, username, password_hash, first_name, last_name, display_name, role_code, is_active)
     VALUES ($1, $2, 'u2', $3, 'رضا', 'تست', 'رضا تست', 'ADMIN', true)`,
    [crypto.randomUUID(), expTenantId, bcrypt.hashSync(userPassword, 10)],
  );
  const expRes = await fetch(`${base}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agency_code: "EXP1", username: "u2", password: userPassword }),
  });
  assert.equal(expRes.status, 402);

  // Rate limit 429 check on repeated login attempts
  let got429 = false;
  for (let i = 0; i < 6; i++) {
    const rlRes = await fetch(`${base}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agency_code: "LOGTEST", username: "ratelimit_probe", password: "wrong" }),
    });
    if (rlRes.status === 429) {
      got429 = true;
      break;
    }
  }
  assert.equal(got429, true, "Repeated auth login failures should trigger 429 RATE_LIMITED");

  // formatLoginErrorMessage mapping
  assert.match(formatLoginErrorMessage({ success: false, code: "NETWORK_ERROR", status: 0 }), /اتصال اینترنت/);
  assert.match(formatLoginErrorMessage({ success: false, code: "SERVER_UNAVAILABLE", status: 503 }), /سرور موقتاً در دسترس نیست/);
  assert.match(formatLoginErrorMessage({ success: false, status: 500 }), /سرور موقتاً در دسترس نیست/);
  assert.match(formatLoginErrorMessage({ success: false, code: "INVALID_CREDENTIALS", status: 401 }), /کد آژانس، نام کاربری یا رمز عبور اشتباه است/);
  assert.match(formatLoginErrorMessage({ success: false, code: "RATE_LIMITED", status: 429 }), /تعداد تلاش‌های ورود بیش از حد مجاز/);

  // ApiClient fetch categorization with stubbed fetch
  const origFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      new Response("<html>502 Bad Gateway</html>", { status: 502, headers: { "content-type": "text/html" } });
    const gwRes = await api.post("/api/v1/auth/login", {});
    assert.equal(gwRes.success, false);
    assert.equal(gwRes.status, 502);
    assert.equal(gwRes.error?.code, "SERVER_UNAVAILABLE");

    globalThis.fetch = async () => {
      throw new TypeError("Failed to fetch");
    };
    const netRes = await api.post("/api/v1/auth/login", {});
    assert.equal(netRes.success, false);
    assert.equal(netRes.status, 0);
    assert.equal(netRes.error?.code, "NETWORK_ERROR");
  } finally {
    globalThis.fetch = origFetch;
  }

  // SSR / static render verification of LoginPage + AuthContext separation
  const html = renderToStaticMarkup(
    React.createElement(
      AuthContext.Provider,
      {
        value: {
          user: null,
          tenant: null,
          isAuthenticated: false,
          isLoading: false,
          login: async () => ({ success: true }),
          logout: async () => ({ success: true }),
          refreshAuth: async () => {},
        },
      },
      React.createElement(LoginPage),
    ),
  );
  assert.match(html, /ورود به سامانه/);
  assert.match(html, /aria-busy="false"/);
  assert.match(html, /id="login-agency-code"/);
  assert.match(html, /id="login-username"/);
  assert.match(html, /id="login-password"/);

  const loginSrc = await readFile("src/pages/LoginPage.tsx", "utf8");
  assert.match(loginSrc, /در حال ورود\.\.\./);
  assert.match(loginSrc, /submittingRef\.current/);
  assert.match(loginSrc, /Loader2/);
  assert.match(loginSrc, /finally\s*\{/);

  const authCtxSrc = await readFile("src/context/AuthContext.tsx", "utf8");
  const loginFnMatch = authCtxSrc.match(/const login = async[\s\S]*?^\s{2}\};/m);
  assert.ok(loginFnMatch && !loginFnMatch[0].includes("setIsLoading("), "AuthContext.login must not toggle global isLoading");
});
