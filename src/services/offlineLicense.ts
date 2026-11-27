import { normalizeDigits } from "../shared/normalization.ts";
import {
  verifySignedOfflineLicense,
  type ClockWatermarkState,
  type LicenseValidationResult,
  type SignedOfflineLicense,
} from "../shared/offline-license.ts";
import type { Tenant, User } from "../types/index.ts";
import { offlineStore, scopeKeyOf, type OfflineScope } from "./offlineStore.ts";

export interface OfflineAuthRecord {
  scopeKey: string;
  tenant_id: string;
  user_id: string;
  agency_code: string;
  username: string;
  user: User;
  tenant: Tenant;
  signed_license: SignedOfflineLicense | null;
  password_salt_b64?: string;
  password_hash_b64?: string;
  updated_at: number;
}

const ACTIVE_SCOPE_META_KEY = "active_offline_scope";
const TRUSTED_PUBKEY_META_KEY = "trusted_license_public_key_jwk";
const CLOCK_MIRROR_PREFIX = "melktak_clock_mirror_";

function bytesToBase64(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (typeof Buffer !== "undefined") {
    return Buffer.from(arr).toString("base64");
  }
  let bin = "";
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(b64, "base64"));
  }
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

async function derivePasswordVerifier(password: string, salt: Uint8Array): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("WebCrypto unavailable");
  const keyMat = await subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await subtle.deriveBits(
    { name: "PBKDF2", salt: salt as unknown as BufferSource, iterations: 60000, hash: "SHA-256" },
    keyMat,
    256,
  );
  return bytesToBase64(bits);
}

function readClockMirror(scope: OfflineScope): ClockWatermarkState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${CLOCK_MIRROR_PREFIX}${scopeKeyOf(scope)}`);
    return raw ? (JSON.parse(raw) as ClockWatermarkState) : null;
  } catch {
    return null;
  }
}

function writeClockMirror(scope: OfflineScope, state: ClockWatermarkState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      `${CLOCK_MIRROR_PREFIX}${scopeKeyOf(scope)}`,
      JSON.stringify(state),
    );
  } catch {
    // Ignore storage errors
  }
}

export async function getClockState(scope: OfflineScope): Promise<ClockWatermarkState | null> {
  const idbState = await offlineStore.getScopedValue<ClockWatermarkState>(
    "clock_state",
    scope,
    "watermark",
  );
  const mirror = readClockMirror(scope);
  if (!idbState && !mirror) return null;
  if (!idbState) return mirror;
  if (!mirror) return idbState;
  return {
    last_server_ms: Math.max(idbState.last_server_ms, mirror.last_server_ms),
    highest_observed_wall_ms: Math.max(
      idbState.highest_observed_wall_ms,
      mirror.highest_observed_wall_ms,
    ),
    issued_at_ms: Math.max(idbState.issued_at_ms, mirror.issued_at_ms),
    revoked_reason: idbState.revoked_reason || mirror.revoked_reason || null,
  };
}

export async function saveSignedLicense(
  scope: OfflineScope,
  signedLicense: SignedOfflineLicense,
  nowMs: number = Date.now(),
): Promise<void> {
  const prevClock = await getClockState(scope);
  const p = signedLicense.payload;
  const nextClock: ClockWatermarkState = {
    last_server_ms: Math.max(prevClock?.last_server_ms || 0, p.server_now_ms),
    highest_observed_wall_ms: Math.max(
      prevClock?.highest_observed_wall_ms || 0,
      p.server_now_ms,
      nowMs,
    ),
    issued_at_ms: p.issued_at_ms,
    revoked_reason: null,
  };
  await offlineStore.setScopedValue("clock_state", scope, "watermark", nextClock);
  writeClockMirror(scope, nextClock);

  if (signedLicense.public_key_jwk) {
    await offlineStore.setMeta(TRUSTED_PUBKEY_META_KEY, signedLicense.public_key_jwk);
  }
}

export async function tickClockWatermark(
  scope: OfflineScope,
  nowMs: number = Date.now(),
): Promise<ClockWatermarkState | null> {
  const current = await getClockState(scope);
  if (!current) return null;
  // Only advance forward; never let rollback overwrite highest_observed_wall_ms
  if (nowMs > current.highest_observed_wall_ms) {
    const updated: ClockWatermarkState = {
      ...current,
      highest_observed_wall_ms: nowMs,
    };
    await offlineStore.setScopedValue("clock_state", scope, "watermark", updated);
    writeClockMirror(scope, updated);
    return updated;
  }
  return current;
}

export async function revokeLocalLicense(
  scope: OfflineScope,
  reason: "EXPIRED" | "SUSPENDED",
): Promise<void> {
  const current = (await getClockState(scope)) || {
    last_server_ms: Date.now(),
    highest_observed_wall_ms: Date.now(),
    issued_at_ms: Date.now(),
  };
  const revoked: ClockWatermarkState = {
    ...current,
    revoked_reason: reason,
  };
  await offlineStore.setScopedValue("clock_state", scope, "watermark", revoked);
  writeClockMirror(scope, revoked);

  const authRec = await offlineStore.getRaw<OfflineAuthRecord>(
    "offline_auth",
    scopeKeyOf(scope),
  );
  if (authRec?.signed_license?.payload) {
    authRec.tenant = {
      ...authRec.tenant,
      subscription_status: reason === "SUSPENDED" ? "SUSPENDED" : "EXPIRED",
    };
    await offlineStore.putRaw("offline_auth", scopeKeyOf(scope), authRec);
  }
}

export async function validateLocalLicenseState(
  scope: OfflineScope,
  signedLicense?: SignedOfflineLicense | null,
  nowMs: number = Date.now(),
): Promise<LicenseValidationResult> {
  let licenseToCheck = signedLicense;
  if (!licenseToCheck) {
    const authRec = await offlineStore.getRaw<OfflineAuthRecord>(
      "offline_auth",
      scopeKeyOf(scope),
    );
    licenseToCheck = authRec?.signed_license || null;
  }
  const clockState = await getClockState(scope);
  const trustedPub = await offlineStore.getMeta<JsonWebKey>(TRUSTED_PUBKEY_META_KEY);

  const result = await verifySignedOfflineLicense(licenseToCheck, {
    expectedTenantId: scope.tenantId,
    expectedUserId: scope.userId,
    nowMs,
    clockState,
    trustedPublicKeyJwk: trustedPub,
  });

  if (result.valid) {
    await tickClockWatermark(scope, nowMs);
  }
  return result;
}

export async function enrollOfflineSession(params: {
  user: User;
  tenant: Tenant;
  offlineLicense?: SignedOfflineLicense | null;
  password?: string;
}): Promise<void> {
  const scope: OfflineScope = {
    tenantId: params.tenant.id,
    userId: params.user.id,
  };
  const key = scopeKeyOf(scope);
  const existing = await offlineStore.getRaw<OfflineAuthRecord>("offline_auth", key);

  let password_salt_b64 = existing?.password_salt_b64;
  let password_hash_b64 = existing?.password_hash_b64;

  if (params.password && globalThis.crypto?.subtle) {
    const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
    password_salt_b64 = bytesToBase64(salt);
    password_hash_b64 = await derivePasswordVerifier(
      normalizeDigits(params.password),
      salt,
    );
  }

  const signedLicense = params.offlineLicense || existing?.signed_license || null;
  if (signedLicense) {
    await saveSignedLicense(scope, signedLicense);
  }

  const record: OfflineAuthRecord = {
    scopeKey: key,
    tenant_id: params.tenant.id,
    user_id: params.user.id,
    agency_code: normalizeDigits(params.tenant.agency_code || "").trim().toUpperCase(),
    username: normalizeDigits(params.user.username || "").trim().toLowerCase(),
    user: params.user,
    tenant: params.tenant,
    signed_license: signedLicense,
    password_salt_b64,
    password_hash_b64,
    updated_at: Date.now(),
  };

  await offlineStore.putRaw("offline_auth", key, record);
  await offlineStore.setMeta(ACTIVE_SCOPE_META_KEY, scope);
}

export async function getActiveOfflineScope(): Promise<OfflineScope | null> {
  return offlineStore.getMeta<OfflineScope>(ACTIVE_SCOPE_META_KEY);
}

export async function clearActiveOfflinePointer(): Promise<void> {
  await offlineStore.deleteMeta(ACTIVE_SCOPE_META_KEY);
}

export async function restoreActiveOfflineSession(nowMs: number = Date.now()): Promise<{
  ok: boolean;
  user?: User;
  tenant?: Tenant;
  validation: LicenseValidationResult;
}> {
  const activeScope = await getActiveOfflineScope();
  if (!activeScope) {
    return {
      ok: false,
      validation: {
        valid: false,
        reason: "NO_LICENSE",
        message: "نشست آفلاین فعالی روی این دستگاه ذخیره نشده است.",
      },
    };
  }

  const record = await offlineStore.getRaw<OfflineAuthRecord>(
    "offline_auth",
    scopeKeyOf(activeScope),
  );
  if (!record) {
    return {
      ok: false,
      validation: {
        valid: false,
        reason: "NO_LICENSE",
        message: "اطلاعات کاربری آفلاین یافت نشد.",
      },
    };
  }

  const validation = await validateLocalLicenseState(
    activeScope,
    record.signed_license,
    nowMs,
  );
  if (!validation.valid) {
    return {
      ok: false,
      user: record.user,
      tenant: record.tenant,
      validation,
    };
  }

  return {
    ok: true,
    user: record.user,
    tenant: record.tenant,
    validation,
  };
}

export async function attemptOfflineLogin(
  agencyCode: string,
  username: string,
  password: string,
  nowMs: number = Date.now(),
): Promise<{
  success: boolean;
  user?: User;
  tenant?: Tenant;
  code?: string;
  message?: string;
}> {
  const cleanAgency = normalizeDigits(agencyCode || "").trim().toUpperCase();
  const cleanUser = normalizeDigits(username || "").trim().toLowerCase();
  const allAuth = await offlineStore.getAllFromStore<OfflineAuthRecord>("offline_auth");
  const matched = allAuth.find(
    (entry) =>
      entry.value.agency_code === cleanAgency &&
      (entry.value.username === cleanUser ||
        entry.value.user?.email?.toLowerCase() === cleanUser ||
        entry.value.user?.phone === cleanUser),
  )?.value;

  if (!matched || !matched.password_salt_b64 || !matched.password_hash_b64) {
    return {
      success: false,
      code: "OFFLINE_NO_CACHED_CREDENTIALS",
      message:
        "برای ورود آفلاین، ابتدا باید یک‌بار با اینترنت به این حساب وارد شده باشید.",
    };
  }

  const salt = base64ToBytes(matched.password_salt_b64);
  const candidateHashNorm = await derivePasswordVerifier(
    normalizeDigits(password),
    salt,
  );
  const candidateHashRaw = await derivePasswordVerifier(password, salt);
  if (
    candidateHashNorm !== matched.password_hash_b64 &&
    candidateHashRaw !== matched.password_hash_b64
  ) {
    return {
      success: false,
      code: "INVALID_CREDENTIALS",
      message: "کد آژانس، نام کاربری یا رمز عبور اشتباه است.",
    };
  }

  const scope: OfflineScope = {
    tenantId: matched.tenant_id,
    userId: matched.user_id,
  };
  const validation = await validateLocalLicenseState(
    scope,
    matched.signed_license,
    nowMs,
  );
  if (!validation.valid) {
    return {
      success: false,
      code:
        validation.reason === "SUSPENDED"
          ? "AGENCY_SUSPENDED"
          : validation.reason === "CLOCK_TAMPERED" || validation.reason === "DATA_TAMPERED"
          ? "OFFLINE_SECURITY_BLOCK"
          : "SUBSCRIPTION_EXPIRED",
      message: validation.message,
    };
  }

  await offlineStore.setMeta(ACTIVE_SCOPE_META_KEY, scope);
  return {
    success: true,
    user: matched.user,
    tenant: matched.tenant,
  };
}
