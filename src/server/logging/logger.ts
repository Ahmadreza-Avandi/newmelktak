import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { redactString, redactValue } from "./redactor.js";

export type LogLevel = "ERROR" | "WARN" | "INFO" | "DEBUG";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

export interface LogContext {
  module: string;
  operation: string;
  requestId?: string | null;
  method?: string | null;
  route?: string | null;
  status?: number | null;
  durationMs?: number | null;
  userId?: string | null;
  tenantId?: string | null;
  details?: Record<string, unknown> | null;
  stack?: string | null;
  persistToDb?: boolean;
}

export interface SystemLogRecord {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  module: string;
  operation: string;
  requestId: string | null;
  method: string | null;
  route: string | null;
  status: number | null;
  durationMs: number | null;
  userId: string | null;
  tenantId: string | null;
  details: Record<string, unknown> | null;
  stack: string | null;
}

export type DbLogPersistFn = (entry: SystemLogRecord) => Promise<void>;
export type DbLogPruneFn = (retentionDays: number, maxRows: number) => Promise<number>;

function parseLevel(raw: string | undefined, fallback: LogLevel): LogLevel {
  const upper = (raw || "").trim().toUpperCase();
  if (upper === "ERROR" || upper === "WARN" || upper === "INFO" || upper === "DEBUG") {
    return upper;
  }
  return fallback;
}

export function getLogRetentionConfig() {
  const parsedDays = parseInt(process.env.LOG_RETENTION_DAYS || "30", 10);
  const retentionDays = Number.isFinite(parsedDays) ? Math.min(365, Math.max(1, parsedDays)) : 30;

  const parsedRows = parseInt(process.env.LOG_MAX_DB_ROWS || "50000", 10);
  const maxDbRows = Number.isFinite(parsedRows) ? Math.min(500000, Math.max(100, parsedRows)) : 50000;

  const parsedFileBytes = parseInt(process.env.LOG_MAX_FILE_BYTES || String(5 * 1024 * 1024), 10);
  const maxFileBytes = Number.isFinite(parsedFileBytes)
    ? Math.max(1024, parsedFileBytes)
    : 5 * 1024 * 1024;

  const parsedMaxFiles = parseInt(process.env.LOG_MAX_FILES || "5", 10);
  const maxFiles = Number.isFinite(parsedMaxFiles) ? Math.min(30, Math.max(1, parsedMaxFiles)) : 5;

  return {
    retentionDays,
    maxDbRows,
    maxFileBytes,
    maxFiles,
    level: parseLevel(process.env.LOG_LEVEL, "INFO"),
    dbLevel: parseLevel(process.env.LOG_DB_LEVEL, "INFO"),
  };
}

export class StructuredLogger {
  private dbPersistFn: DbLogPersistFn | null = null;
  private dbPruneFn: DbLogPruneFn | null = null;
  private pruneTimer: NodeJS.Timeout | null = null;
  private writeChain: Promise<void> = Promise.resolve();
  private fileSinkDisabled = false;

  setDbHandlers(persistFn: DbLogPersistFn, pruneFn?: DbLogPruneFn) {
    this.dbPersistFn = persistFn;
    this.dbPruneFn = pruneFn || null;
  }

  startRetentionScheduler() {
    if (this.pruneTimer) return;
    // Run every 6 hours without holding the event loop open
    this.pruneTimer = setInterval(() => {
      void this.runRetentionCleanup();
    }, 6 * 60 * 60 * 1000);
    this.pruneTimer.unref();
  }

  async runRetentionCleanup(): Promise<number> {
    if (!this.dbPruneFn) return 0;
    const { retentionDays, maxDbRows } = getLogRetentionConfig();
    try {
      return await this.dbPruneFn(retentionDays, maxDbRows);
    } catch {
      return 0;
    }
  }

  private getLogFilePath(): string {
    const baseDataDir = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), "data"));
    const logsDir = path.resolve(baseDataDir, "logs");
    // Path confinement check
    if (!logsDir.startsWith(baseDataDir + path.sep) && logsDir !== baseDataDir) {
      throw new Error("Invalid log directory path");
    }
    return path.resolve(logsDir, "app.log");
  }

  private rotateLogFileIfNeeded(filePath: string, maxFileBytes: number, maxFiles: number) {
    if (!fs.existsSync(filePath)) return;
    const stats = fs.statSync(filePath);
    if (stats.size < maxFileBytes) return;

    // Remove oldest archive if at limit
    const oldest = `${filePath}.${maxFiles}`;
    if (fs.existsSync(oldest)) {
      fs.unlinkSync(oldest);
    }

    for (let i = maxFiles - 1; i >= 1; i--) {
      const src = `${filePath}.${i}`;
      const dst = `${filePath}.${i + 1}`;
      if (fs.existsSync(src)) {
        fs.renameSync(src, dst);
      }
    }

    fs.renameSync(filePath, `${filePath}.1`);
  }

  private writeToRotatingFile(line: string) {
    if (this.fileSinkDisabled || process.env.LOG_FILE_ENABLED === "false") return;
    const { maxFileBytes, maxFiles } = getLogRetentionConfig();
    try {
      const filePath = this.getLogFilePath();
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      this.rotateLogFileIfNeeded(filePath, maxFileBytes, maxFiles);
      fs.appendFileSync(filePath, `${line}\n`, "utf8");
    } catch {
      // Never crash the server if disk logging fails (e.g. read-only test mount)
    }
  }

  private emit(level: LogLevel, message: string, context: LogContext): SystemLogRecord {
    const cfg = getLogRetentionConfig();
    const redactedMessage = redactString(String(message || ""), 2000);
    const redactedDetails = context.details
      ? (redactValue(context.details) as Record<string, unknown>)
      : null;
    const redactedStack = context.stack ? redactString(String(context.stack), 6000) : null;

    const record: SystemLogRecord = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      level,
      message: redactedMessage,
      module: String(context.module || "server").slice(0, 80),
      operation: String(context.operation || "event").slice(0, 100),
      requestId: context.requestId ? String(context.requestId).slice(0, 80) : null,
      method: context.method ? String(context.method).toUpperCase().slice(0, 16) : null,
      route: context.route ? redactString(String(context.route), 255) : null,
      status:
        typeof context.status === "number" && Number.isFinite(context.status)
          ? context.status
          : null,
      durationMs:
        typeof context.durationMs === "number" && Number.isFinite(context.durationMs)
          ? Math.max(0, Math.round(context.durationMs))
          : null,
      userId: context.userId ? String(context.userId).slice(0, 100) : null,
      tenantId: context.tenantId ? String(context.tenantId).slice(0, 100) : null,
      details: redactedDetails,
      stack: redactedStack,
    };

    if (LEVEL_PRIORITY[level] <= LEVEL_PRIORITY[cfg.level]) {
      const consolePayload: Record<string, unknown> = {
        timestamp: record.timestamp,
        level: record.level,
        message: record.message,
        module: record.module,
        operation: record.operation,
      };
      if (record.requestId) consolePayload.requestId = record.requestId;
      if (record.method) consolePayload.method = record.method;
      if (record.route) consolePayload.route = record.route;
      if (record.status !== null) consolePayload.status = record.status;
      if (record.durationMs !== null) consolePayload.durationMs = record.durationMs;
      if (record.userId) consolePayload.userId = record.userId;
      if (record.tenantId) consolePayload.tenantId = record.tenantId;
      if (record.details && Object.keys(record.details).length > 0) {
        consolePayload.details = record.details;
      }
      if (record.stack && process.env.NODE_ENV !== "production") {
        consolePayload.stack = record.stack;
      }

      const jsonLine = JSON.stringify(consolePayload);
      if (level === "ERROR" || level === "WARN") {
        process.stderr.write(`${jsonLine}\n`);
      } else {
        process.stdout.write(`${jsonLine}\n`);
      }

      // Persist full structured entry (including stack in rotating server log file)
      const fileLine = JSON.stringify(record);
      this.writeToRotatingFile(fileLine);
    }

    const shouldPersistDb =
      context.persistToDb !== false &&
      LEVEL_PRIORITY[level] <= LEVEL_PRIORITY[cfg.dbLevel] &&
      Boolean(this.dbPersistFn);

    if (shouldPersistDb && this.dbPersistFn) {
      const persist = this.dbPersistFn;
      this.writeChain = this.writeChain
        .then(() => persist(record))
        .catch(() => {
          // Swallow DB log insert failure silently to prevent infinite recursion
        });
    }

    return record;
  }

  async flush(): Promise<void> {
    await this.writeChain;
  }

  error(message: string, context: LogContext): SystemLogRecord {
    return this.emit("ERROR", message, context);
  }

  warn(message: string, context: LogContext): SystemLogRecord {
    return this.emit("WARN", message, context);
  }

  info(message: string, context: LogContext): SystemLogRecord {
    return this.emit("INFO", message, context);
  }

  debug(message: string, context: LogContext): SystemLogRecord {
    return this.emit("DEBUG", message, context);
  }
}

export const logger = new StructuredLogger();
