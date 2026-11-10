import { Pool } from "pg";
import { AsyncLocalStorage } from "node:async_hooks";

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
  }

  get waitReady() {
    return this.pool.query("SELECT 1");
  }

  query(text: string, values?: unknown[]) {
    const client = this.transactionContext.getStore();
    if (client) return client.query(text, values as any[]);
    return this.pool.query(text, values as any[]);
  }

  exec(text: string) {
    const client = this.transactionContext.getStore();
    if (client) return client.query(text);
    return this.pool.query(text);
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
      } catch (error) {
        await existing.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
        throw error;
      }
    }
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await this.transactionContext.run(client, () => callback(client));
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  close() {
    return this.pool.end();
  }
}
