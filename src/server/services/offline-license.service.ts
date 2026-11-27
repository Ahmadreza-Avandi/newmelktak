// @ts-nocheck
import crypto from "crypto";
import { postgresDb } from "../db/postgres.js";
import {
  canonicalLicenseMessage,
  type OfflineLicensePayload,
  type SignedOfflineLicense,
} from "../../shared/offline-license.js";

const SYSTEM_KEY_NAME = "offline_license_ecdsa_jwk_v1";
const DEFAULT_MAX_OFFLINE_MS = 7 * 24 * 60 * 60 * 1000;

let cachedKeyPair: { privateKey: CryptoKey; publicJwk: JsonWebKey } | null = null;
let keyInitPromise: Promise<{ privateKey: CryptoKey; publicJwk: JsonWebKey }> | null = null;

function bytesToBase64(bytes: ArrayBuffer | Uint8Array): string {
  const buf = bytes instanceof Uint8Array ? Buffer.from(bytes) : Buffer.from(new Uint8Array(bytes));
  return buf.toString("base64");
}

async function loadOrCreateKeyPair(): Promise<{ privateKey: CryptoKey; publicJwk: JsonWebKey }> {
  if (cachedKeyPair) return cachedKeyPair;
  if (keyInitPromise) return keyInitPromise;

  keyInitPromise = (async () => {
    const subtle = crypto.webcrypto.subtle;

    // Optional env override (JSON stringified JWK pair)
    if (process.env.OFFLINE_LICENSE_PRIVATE_JWK && process.env.OFFLINE_LICENSE_PUBLIC_JWK) {
      const privJwk = JSON.parse(process.env.OFFLINE_LICENSE_PRIVATE_JWK);
      const pubJwk = JSON.parse(process.env.OFFLINE_LICENSE_PUBLIC_JWK);
      const privateKey = await subtle.importKey(
        "jwk",
        privJwk,
        { name: "ECDSA", namedCurve: "P-256" },
        false,
        ["sign"],
      );
      cachedKeyPair = { privateKey, publicJwk: pubJwk };
      return cachedKeyPair;
    }

    const saved = await postgresDb.getSystemSetting<{
      privateJwk: JsonWebKey;
      publicJwk: JsonWebKey;
    }>(SYSTEM_KEY_NAME);

    if (saved?.privateJwk && saved?.publicJwk) {
      const privateKey = await subtle.importKey(
        "jwk",
        saved.privateJwk,
        { name: "ECDSA", namedCurve: "P-256" },
        false,
        ["sign"],
      );
      cachedKeyPair = { privateKey, publicJwk: saved.publicJwk };
      return cachedKeyPair;
    }

    const generated = await subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"],
    );
    const privateJwk = await subtle.exportKey("jwk", generated.privateKey);
    const publicJwk = await subtle.exportKey("jwk", generated.publicKey);
    await postgresDb.setSystemSetting(SYSTEM_KEY_NAME, { privateJwk, publicJwk });

    cachedKeyPair = { privateKey: generated.privateKey, publicJwk };
    return cachedKeyPair;
  })();

  try {
    return await keyInitPromise;
  } finally {
    keyInitPromise = null;
  }
}

export async function issueOfflineLicense(user: any, tenant: any): Promise<SignedOfflineLicense> {
  const { privateKey, publicJwk } = await loadOrCreateKeyPair();
  const nowMs = Date.now();
  const maxOfflineMs = Number(process.env.OFFLINE_MAX_LEASE_MS || DEFAULT_MAX_OFFLINE_MS);

  const payload: OfflineLicensePayload = {
    version: 1,
    tenant_id: String(tenant.id),
    user_id: String(user.id),
    branch_id: user.branch_id ? String(user.branch_id) : null,
    role_code: String(user.role_code || "AGENT"),
    plan_code: String(tenant.plan_code || "STARTER"),
    tenant_status: String(tenant.status || "ACTIVE"),
    subscription_status: String(tenant.subscription_status || "ACTIVE"),
    subscription_expires_at: tenant.subscription_expires_at
      ? new Date(tenant.subscription_expires_at).toISOString()
      : null,
    issued_at_ms: nowMs,
    server_now_ms: nowMs,
    max_offline_ms: Number.isFinite(maxOfflineMs) && maxOfflineMs > 0 ? maxOfflineMs : DEFAULT_MAX_OFFLINE_MS,
    nonce: crypto.randomBytes(12).toString("hex"),
  };

  const encoded = new TextEncoder().encode(canonicalLicenseMessage(payload));
  const sig = await crypto.webcrypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    encoded,
  );

  return {
    algorithm: "ECDSA_P256_SHA256",
    payload,
    signature_b64: bytesToBase64(sig),
    public_key_jwk: publicJwk,
  };
}
