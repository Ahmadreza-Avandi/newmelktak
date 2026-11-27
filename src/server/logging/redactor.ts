export const REDACTED_VALUE = "[REDACTED]";

const SENSITIVE_KEY_EXACT = new Set([
  "password",
  "passwd",
  "pass",
  "pwd",
  "current_password",
  "new_password",
  "confirm_password",
  "admin_password",
  "password_hash",
  "passwordhash",
  "token",
  "access_token",
  "accesstoken",
  "refresh_token",
  "refreshtoken",
  "session_token",
  "sessiontoken",
  "rawtoken",
  "raw_token",
  "token_hash",
  "tokenhash",
  "share_token",
  "amlak_session",
  "amlak_platform_session",
  "amlak_token",
  "cookie",
  "cookies",
  "set-cookie",
  "setcookie",
  "authorization",
  "x-platform-token",
  "x-support-session-id",
  "secret",
  "client_secret",
  "clientsecret",
  "private_key",
  "privatekey",
  "api_key",
  "apikey",
  "database_url",
  "databaseurl",
  "connectionstring",
  "connection_string",
  "credentials",
  "auth",
  "filebuffer",
  "file_buffer",
  "buffer",
  "base64",
  "rawbody",
  "raw_body",
  "backup_data",
  "filecontent",
  "file_content",
]);

const SENSITIVE_KEY_SUBSTRINGS = [
  "password",
  "passwd",
  "secret",
  "private_key",
  "privatekey",
  "access_token",
  "refresh_token",
  "session_token",
  "authorization",
  "cookie",
  "api_key",
  "apikey",
  "password_hash",
  "token_hash",
  "filebuffer",
  "rawbody",
];

function normalizeKey(key: string): string {
  return key.toLowerCase().trim();
}

export function isSensitiveKey(key: string): boolean {
  const norm = normalizeKey(key);
  if (SENSITIVE_KEY_EXACT.has(norm)) return true;
  // Explicitly allow harmless operational identifiers
  if (
    norm === "requestid" ||
    norm === "request_id" ||
    norm === "userid" ||
    norm === "user_id" ||
    norm === "tenantid" ||
    norm === "tenant_id" ||
    norm === "status" ||
    norm === "statuscode" ||
    norm === "durationms" ||
    norm === "duration_ms" ||
    norm === "errortype" ||
    norm === "error_type" ||
    norm === "mimetype" ||
    norm === "mime_type" ||
    norm === "filesize" ||
    norm === "file_size" ||
    norm === "filename" ||
    norm === "file_name"
  ) {
    return false;
  }
  return SENSITIVE_KEY_SUBSTRINGS.some((part) => norm.includes(part));
}

export function redactString(input: string, maxLength = 4000): string {
  if (!input) return input;
  let out = input;

  // Mask Bearer / Basic tokens
  out = out.replace(/(Bearer|Basic)\s+[A-Za-z0-9\-._~+/]+=*/gi, `$1 ${REDACTED_VALUE}`);

  // Mask PostgreSQL / URL credentials (e.g. postgresql://user:secret@host)
  out = out.replace(
    /((?:postgres(?:ql)?|mysql|redis|https?):\/\/[^:\s/@]+:)([^@\s/]+)(@)/gi,
    `$1${REDACTED_VALUE}$3`,
  );

  // Mask cookie/session values
  out = out.replace(
    /\b(amlak_session|amlak_platform_session|amlak_token|session_token|access_token|refresh_token|connect\.sid)\s*=\s*[^;\s,'"]+/gi,
    `$1=${REDACTED_VALUE}`,
  );

  // Mask platform / session tokens shaped like plat_<hex> or long JWTs
  out = out.replace(/\bplat_[a-f0-9]{16,}\b/gi, REDACTED_VALUE);
  out = out.replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, REDACTED_VALUE);

  // Mask key=value or "key":"value" secret fragments
  out = out.replace(
    /("(?:password|passwd|current_password|new_password|confirm_password|admin_password|password_hash|token|access_token|refresh_token|session_token|authorization|cookie|set-cookie|secret|private_key|api_key|base64)"\s*:\s*)"[^"]*"/gi,
    `$1"${REDACTED_VALUE}"`,
  );
  out = out.replace(
    /\b(password|passwd|token|secret|authorization|cookie|api_key)\s*[:=]\s*([^\s,;]+)/gi,
    `$1=${REDACTED_VALUE}`,
  );

  if (out.length > maxLength) {
    return `${out.slice(0, maxLength)}...[TRUNCATED length=${input.length}]`;
  }
  return out;
}

export function sanitizeSqlPreview(sql: string, maxLength = 400): string {
  if (!sql) return "";
  const collapsed = sql.replace(/\s+/g, " ").trim();
  const masked = redactString(collapsed, maxLength);
  return masked;
}

export function redactValue(
  value: unknown,
  depth = 0,
  seen: WeakSet<object> = new WeakSet(),
): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return redactString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString() : null;

  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    return `[BINARY_BUFFER_REDACTED length=${value.byteLength}]`;
  }

  if (depth > 6) {
    return "[MAX_DEPTH_REACHED]";
  }

  if (value instanceof Error) {
    const errAny = value as any;
    const redactedErr: Record<string, unknown> = {
      name: value.name || "Error",
      message: redactString(value.message || ""),
    };
    if (errAny.code !== undefined) redactedErr.code = errAny.code;
    if (errAny.status !== undefined) redactedErr.status = errAny.status;
    if (errAny.statusCode !== undefined) redactedErr.statusCode = errAny.statusCode;
    if (value.stack) {
      redactedErr.stack = redactString(value.stack, 6000);
    }
    return redactedErr;
  }

  if (typeof value === "object") {
    if (seen.has(value as object)) {
      return "[CIRCULAR]";
    }
    seen.add(value as object);

    if (Array.isArray(value)) {
      const limited = value.slice(0, 50).map((item) => redactValue(item, depth + 1, seen));
      if (value.length > 50) {
        limited.push(`[TRUNCATED_ITEMS remaining=${value.length - 50}]`);
      }
      return limited;
    }

    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (isSensitiveKey(k)) {
        out[k] = REDACTED_VALUE;
      } else if (k === "headers" && v && typeof v === "object") {
        out[k] = redactHeaders(v as Record<string, unknown>);
      } else {
        out[k] = redactValue(v, depth + 1, seen);
      }
    }
    return out;
  }

  return String(value);
}

export function redactHeaders(headers: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(headers || {})) {
    const lower = key.toLowerCase();
    if (
      lower === "authorization" ||
      lower === "cookie" ||
      lower === "set-cookie" ||
      lower === "x-platform-token" ||
      lower === "x-support-session-id" ||
      isSensitiveKey(lower)
    ) {
      safe[key] = REDACTED_VALUE;
    } else {
      safe[key] = redactValue(val, 1);
    }
  }
  return safe;
}
