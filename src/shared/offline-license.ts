export interface OfflineLicensePayload {
  version: number;
  tenant_id: string;
  user_id: string;
  branch_id: string | null;
  role_code: string;
  plan_code: string;
  tenant_status: string;
  subscription_status: string;
  subscription_expires_at: string | null;
  issued_at_ms: number;
  server_now_ms: number;
  max_offline_ms: number;
  nonce: string;
}

export interface SignedOfflineLicense {
  algorithm: "ECDSA_P256_SHA256";
  payload: OfflineLicensePayload;
  signature_b64: string;
  public_key_jwk: JsonWebKey;
}

export type LicenseBlockReason =
  | "NO_LICENSE"
  | "DATA_TAMPERED"
  | "CLOCK_TAMPERED"
  | "EXPIRED"
  | "SUSPENDED"
  | "LEASE_EXPIRED";

export interface LicenseValidationResult {
  valid: boolean;
  reason?: LicenseBlockReason;
  message?: string;
  payload?: OfflineLicensePayload;
}

export interface ClockWatermarkState {
  last_server_ms: number;
  highest_observed_wall_ms: number;
  issued_at_ms: number;
  revoked_reason?: string | null;
}

const CLOCK_DRIFT_TOLERANCE_MS = 60_000;

export function canonicalLicenseMessage(payload: OfflineLicensePayload): string {
  return JSON.stringify([
    payload.version,
    payload.tenant_id,
    payload.user_id,
    payload.branch_id ?? null,
    payload.role_code,
    payload.plan_code,
    payload.tenant_status,
    payload.subscription_status,
    payload.subscription_expires_at ?? null,
    payload.issued_at_ms,
    payload.server_now_ms,
    payload.max_offline_ms,
    payload.nonce,
  ]);
}

function base64ToBytes(b64: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(b64, "base64"));
  }
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function getSubtleCrypto(): SubtleCrypto | null {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.subtle) {
    return globalThis.crypto.subtle;
  }
  return null;
}

export async function verifySignedOfflineLicense(
  signed: SignedOfflineLicense | null | undefined,
  options: {
    expectedTenantId?: string;
    expectedUserId?: string;
    nowMs?: number;
    clockState?: ClockWatermarkState | null;
    trustedPublicKeyJwk?: JsonWebKey | null;
  } = {},
): Promise<LicenseValidationResult> {
  if (!signed || !signed.payload || !signed.signature_b64 || !signed.public_key_jwk) {
    return {
      valid: false,
      reason: "NO_LICENSE",
      message: "اطلاعات اعتبار اشتراک برای استفاده آفلاین موجود نیست. لطفاً آنلاین شوید.",
    };
  }

  if (signed.algorithm !== "ECDSA_P256_SHA256") {
    return {
      valid: false,
      reason: "DATA_TAMPERED",
      message: "امضای مجوز آفلاین نامعتبر است.",
    };
  }

  const p = signed.payload;
  if (options.expectedTenantId && p.tenant_id !== options.expectedTenantId) {
    return {
      valid: false,
      reason: "DATA_TAMPERED",
      message: "اطلاعات مجوز با دفتر املاک فعلی مطابقت ندارد.",
    };
  }
  if (options.expectedUserId && p.user_id !== options.expectedUserId) {
    return {
      valid: false,
      reason: "DATA_TAMPERED",
      message: "اطلاعات مجوز با حساب کاربری فعلی مطابقت ندارد.",
    };
  }

  if (options.trustedPublicKeyJwk) {
    if (
      options.trustedPublicKeyJwk.x !== signed.public_key_jwk.x ||
      options.trustedPublicKeyJwk.y !== signed.public_key_jwk.y ||
      options.trustedPublicKeyJwk.crv !== signed.public_key_jwk.crv
    ) {
      return {
        valid: false,
        reason: "DATA_TAMPERED",
        message: "کلید عمومی مجوز آفلاین دستکاری شده است. لطفاً به اینترنت متصل شوید.",
      };
    }
  }

  const subtle = getSubtleCrypto();
  if (!subtle) {
    return {
      valid: false,
      reason: "DATA_TAMPERED",
      message: "محیط مرورگر از اعتبارسنجی رمزنگاری مجوز پشتیبانی نمی‌کند.",
    };
  }

  try {
    const publicKey = await subtle.importKey(
      "jwk",
      signed.public_key_jwk,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
    const encoded = new TextEncoder().encode(canonicalLicenseMessage(p));
    const sigBytes = base64ToBytes(signed.signature_b64);
    const verified = await subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      publicKey,
      sigBytes as unknown as BufferSource,
      encoded as unknown as BufferSource,
    );
    if (!verified) {
      return {
        valid: false,
        reason: "DATA_TAMPERED",
        message: "تغییر غیرمجاز در اطلاعات اشتراک محلی شناسایی شد. لطفاً مجدداً آنلاین شوید.",
      };
    }
  } catch {
    return {
      valid: false,
      reason: "DATA_TAMPERED",
      message: "خطا در راستی‌آزمایی امضای اشتراک آفلاین.",
    };
  }

  const nowMs = options.nowMs ?? Date.now();
  const clock = options.clockState;

  if (clock?.revoked_reason) {
    return {
      valid: false,
      reason: clock.revoked_reason === "SUSPENDED" ? "SUSPENDED" : "EXPIRED",
      message:
        clock.revoked_reason === "SUSPENDED"
          ? "دفتر املاک در حالت تعلیق قرار دارد و دسترسی آفلاین نیز مسدود است."
          : "اشتراک دفتر املاک به پایان رسیده است و امکان استفاده آفلاین وجود ندارد.",
      payload: p,
    };
  }

  if (
    clock &&
    (nowMs + CLOCK_DRIFT_TOLERANCE_MS < clock.highest_observed_wall_ms ||
      nowMs + CLOCK_DRIFT_TOLERANCE_MS < clock.last_server_ms)
  ) {
    return {
      valid: false,
      reason: "CLOCK_TAMPERED",
      message:
        "تغییر غیرمجاز ساعت دستگاه به عقب تشخیص داده شد. برای ادامه استفاده باید به اینترنت متصل شوید.",
      payload: p,
    };
  }

  if (
    nowMs + CLOCK_DRIFT_TOLERANCE_MS < p.server_now_ms ||
    nowMs + CLOCK_DRIFT_TOLERANCE_MS < p.issued_at_ms
  ) {
    return {
      valid: false,
      reason: "CLOCK_TAMPERED",
      message:
        "ساعت دستگاه با زمان ثبت‌شده سرور مغایرت دارد. برای ادامه به اینترنت متصل شوید.",
      payload: p,
    };
  }

  if (p.tenant_status !== "ACTIVE" || p.subscription_status === "SUSPENDED") {
    return {
      valid: false,
      reason: "SUSPENDED",
      message: "دفتر املاک معلق شده است و دسترسی آفلاین مسدود می‌باشد.",
      payload: p,
    };
  }

  if (["EXPIRED", "CANCELLED"].includes(p.subscription_status)) {
    return {
      valid: false,
      reason: "EXPIRED",
      message: "اشتراک دفتر املاک شما منقضی شده است.",
      payload: p,
    };
  }

  if (p.subscription_expires_at) {
    const expiryMs = new Date(p.subscription_expires_at).getTime();
    if (!Number.isFinite(expiryMs) || nowMs >= expiryMs) {
      return {
        valid: false,
        reason: "EXPIRED",
        message: "مهلت اشتراک دفتر املاک به پایان رسیده است. دسترسی در حالت آفلاین مسدود شد.",
        payload: p,
      };
    }
  }

  if (nowMs - p.issued_at_ms > p.max_offline_ms) {
    return {
      valid: false,
      reason: "LEASE_EXPIRED",
      message: "بازه مجاز استفاده آفلاین بدون اتصال به سرور به پایان رسیده است. لطفاً آنلاین شوید.",
      payload: p,
    };
  }

  return {
    valid: true,
    payload: p,
  };
}
