import { Pool } from "pg";
import { AsyncLocalStorage } from "node:async_hooks";
import { logger } from "../logging/logger.js";
import { sanitizeSqlPreview } from "../logging/redactor.js";

/** Small compatibility layer for the query API used by the database service. */
export class PostgresPool {
  private pool: Pool;
  private transactionContext = new AsyncLocalStorage<import("pg").PoolClient>();
  private savepointId = 0;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      max: Number(process.env.PG_POOL_MAX || 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      application_name: "amlak-os",
      ...(process.env.PGSSL === "true" ? { ssl: { rejectUnauthorized: true } } : {}),
    });

    this.pool.on("error", (err) => {
      logger.error("Unexpected PostgreSQL pool client error", {
        module: "postgres",
        operation: "pool_error",
        details: { code: (err as any)?.code || null },
        stack: err?.stack || null,
      });
    });
  }

  get waitReady() {
    return this.pool.query("SELECT 1");
  }

  async query(text: string, values?: unknown[]) {
    const client = this.transactionContext.getStore();
    try {
      if (client) return await client.query(text, values as any[]);
      return await this.pool.query(text, values as any[]);
    } catch (err: any) {
      if (!String(text).includes("system_logs")) {
        logger.error(err?.message || "PostgreSQL query failed", {
          module: "postgres",
          operation: "query_failed",
          details: {
            pgCode: err?.code || null,
            sqlPreview: sanitizeSqlPreview(text),
            paramCount: Array.isArray(values) ? values.length : 0,
          },
          stack: err?.stack || null,
        });
      }
      throw err;
    }
  }

  async exec(text: string) {
    const client = this.transactionContext.getStore();
    try {
      if (client) return await client.query(text);
      return await this.pool.query(text);
    } catch (err: any) {
      logger.error(err?.message || "PostgreSQL exec failed", {
        module: "postgres",
        operation: "exec_failed",
        details: {
          pgCode: err?.code || null,
          sqlPreview: sanitizeSqlPreview(text),
        },
        stack: err?.stack || null,
      });
      throw err;
    }
  }

  async transaction<T>(callback: (client: Pick<import("pg").PoolClient, "query">) => Promise<T>): Promise<T> {
    const existing = this.transactionContext.getStore();
    if (existing) {
      const savepoint = `amlak_sp_${++this.savepointId}`;
      await existing.query(`SAVEPOINT ${savepoint}`);
      try {
        const result = await callback(existing);
        await existing.query(`RELEASE SAVEPOINT ${savepoint}`);
        return result;
      } catch (error: any) {
        await existing.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
        logger.warn(error?.message || "Nested PostgreSQL savepoint rolled back", {
          module: "postgres",
          operation: "savepoint_rollback",
          details: { pgCode: error?.code || null },
          stack: error?.stack || null,
        });
        throw error;
      }
    }
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await this.transactionContext.run(client, () => callback(client));
      await client.query("COMMIT");
      return result;
    } catch (error: any) {
      await client.query("ROLLBACK").catch(() => {});
      logger.error(error?.message || "PostgreSQL transaction failed and rolled back", {
        module: "postgres",
        operation: "transaction_failed",
        details: { pgCode: error?.code || null },
        stack: error?.stack || null,
      });
      throw error;
    } finally {
      client.release();
    }
  }

  close() {
    return this.pool.end();
  }
}
