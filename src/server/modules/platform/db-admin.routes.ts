// @ts-nocheck
import { Router, Request, Response, NextFunction } from "express";
import { postgresDb } from "../../db/postgres.js";
import { logger } from "../../logging/logger.js";

const dbAdminRouter = Router();

function quoteIdent(ident: string): string {
  return `"${String(ident).replace(/"/g, '""')}"`;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let idx = 0;
  let val = bytes;
  while (val >= 1024 && idx < units.length - 1) {
    val /= 1024;
    idx++;
  }
  return `${val >= 10 || idx === 0 ? val.toFixed(0) : val.toFixed(1)} ${units[idx]}`;
}

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let str =
    typeof value === "object"
      ? value instanceof Date
        ? value.toISOString()
        : JSON.stringify(value)
      : String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function resolvePublicTable(requestedName: string): Promise<{
  table_name: string;
  table_type: string;
} | null> {
  await postgresDb.init();
  const clean = String(requestedName || "").trim();
  if (!clean || clean.length > 128) return null;

  const res = await postgresDb.pg.query(
    `SELECT table_name, table_type
     FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1
     LIMIT 1`,
    [clean],
  );
  return res.rows[0] || null;
}

async function getTableMetadata(tableName: string) {
  const colsRes = await postgresDb.pg.query(
    `SELECT
       c.column_name,
       c.data_type,
       c.udt_name,
       c.is_nullable,
       c.column_default,
       c.character_maximum_length,
       c.numeric_precision,
       c.ordinal_position
     FROM information_schema.columns c
     WHERE c.table_schema = 'public' AND c.table_name = $1
     ORDER BY c.ordinal_position ASC`,
    [tableName],
  );

  const pkRes = await postgresDb.pg.query(
    `SELECT kcu.column_name
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
     WHERE tc.constraint_type = 'PRIMARY KEY'
       AND tc.table_schema = 'public'
       AND tc.table_name = $1
     ORDER BY kcu.ordinal_position ASC`,
    [tableName],
  );

  const primaryKeys = pkRes.rows.map((r: any) => r.column_name);
  const pkSet = new Set(primaryKeys);
  const columns = colsRes.rows.map((c: any) => ({
    ...c,
    is_primary_key: pkSet.has(c.column_name),
  }));

  return { columns, primaryKeys };
}

function coerceColumnValue(rawValue: unknown, col: any): unknown {
  if (rawValue === null || rawValue === undefined) return null;
  const dataType = String(col.data_type || "").toLowerCase();
  const udtName = String(col.udt_name || "").toLowerCase();

  if (typeof rawValue === "string") {
    const trimmed = rawValue.trim();
    if (trimmed === "" && col.is_nullable === "YES" && !dataType.includes("char") && dataType !== "text") {
      return null;
    }
    if (dataType === "boolean" || udtName === "bool") {
      if (trimmed.toLowerCase() === "true" || trimmed === "1") return true;
      if (trimmed.toLowerCase() === "false" || trimmed === "0") return false;
    }
    if (
      ["integer", "bigint", "smallint", "numeric", "decimal", "real", "double precision"].includes(dataType) ||
      ["int2", "int4", "int8", "float4", "float8", "numeric"].includes(udtName)
    ) {
      if (trimmed === "") return col.is_nullable === "YES" ? null : 0;
    }
    if (dataType === "jsonb" || dataType === "json" || udtName === "jsonb" || udtName === "json") {
      if (trimmed === "") return col.is_nullable === "YES" ? null : {};
      // Validate JSON before passing to Postgres
      JSON.parse(trimmed);
      return trimmed;
    }
  } else if (typeof rawValue === "object" && (dataType === "jsonb" || dataType === "json")) {
    return JSON.stringify(rawValue);
  }

  return rawValue;
}

function buildRowWhereClause(
  primaryKeys: string[],
  keyObj: Record<string, unknown> | undefined,
  ctid: unknown,
  startIdx = 1,
): { whereSql: string; params: unknown[] } {
  if (primaryKeys.length > 0 && keyObj && typeof keyObj === "object") {
    const clauses: string[] = [];
    const params: unknown[] = [];
    let idx = startIdx;
    for (const pk of primaryKeys) {
      if (!(pk in keyObj) || keyObj[pk] === undefined || keyObj[pk] === null) {
        throw Object.assign(new Error(`مقدار کلید اصلی (${pk}) ارسال نشده است.`), {
          status: 400,
          code: "MISSING_PRIMARY_KEY",
        });
      }
      clauses.push(`${quoteIdent(pk)} = $${idx++}`);
      params.push(keyObj[pk]);
    }
    return { whereSql: clauses.join(" AND "), params };
  }

  if (typeof ctid === "string" && /^\(\d+,\d+\)$/.test(ctid.trim())) {
    return { whereSql: `ctid = $${startIdx}::tid`, params: [ctid.trim()] };
  }

  throw Object.assign(new Error("شناسه ردیف (کلید اصلی یا ctid) نامعتبر است."), {
    status: 400,
    code: "INVALID_ROW_KEY",
  });
}

dbAdminRouter.get("/overview", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await postgresDb.init();
    const versionRes = await postgresDb.pg.query(`SELECT version() AS version, current_database() AS db_name`);
    const versionStr = versionRes.rows[0]?.version || "PostgreSQL";
    const dbName = versionRes.rows[0]?.db_name || "postgres";

    let dbSizeBytes = 0;
    try {
      const sizeRes = await postgresDb.pg.query(`SELECT pg_database_size(current_database())::bigint AS bytes`);
      dbSizeBytes = Number(sizeRes.rows[0]?.bytes || 0);
    } catch {
      dbSizeBytes = 0;
    }

    const tablesRes = await postgresDb.pg.query(
      `SELECT
         t.table_name,
         t.table_type,
         (SELECT COUNT(*)::int FROM information_schema.columns c WHERE c.table_schema = 'public' AND c.table_name = t.table_name) AS column_count,
         EXISTS (
           SELECT 1 FROM information_schema.table_constraints tc
           WHERE tc.table_schema = 'public' AND tc.table_name = t.table_name AND tc.constraint_type = 'PRIMARY KEY'
         ) AS has_primary_key
       FROM information_schema.tables t
       WHERE t.table_schema = 'public'
       ORDER BY t.table_name ASC`,
    );

    const tables = await Promise.all(
      tablesRes.rows.map(async (row: any) => {
        const quoted = quoteIdent(row.table_name);
        let rowCount = 0;
        let totalBytes = 0;
        try {
          const cntRes = await postgresDb.pg.query(`SELECT COUNT(*)::int AS cnt FROM "public".${quoted}`);
          rowCount = Number(cntRes.rows[0]?.cnt || 0);
        } catch {
          rowCount = 0;
        }
        try {
          const szRes = await postgresDb.pg.query(
            `SELECT pg_total_relation_size($1::regclass)::bigint AS bytes`,
            [`"public".${quoted}`],
          );
          totalBytes = Number(szRes.rows[0]?.bytes || 0);
        } catch {
          totalBytes = 0;
        }
        return {
          table_name: row.table_name,
          table_type: row.table_type,
          column_count: Number(row.column_count || 0),
          has_primary_key: Boolean(row.has_primary_key),
          row_count: rowCount,
          total_bytes: totalBytes,
          size_formatted: formatBytes(totalBytes),
        };
      }),
    );

    const totalRows = tables.reduce((acc, t) => acc + t.row_count, 0);
    const isExternalPg = Boolean(process.env.DATABASE_URL) && postgresDb.pg?.constructor?.name === "PostgresPool";

    return res.json({
      success: true,
      data: {
        engine: isExternalPg ? "PostgreSQL (External)" : "PGlite (PostgreSQL 16 Embedded)",
        version: versionStr,
        database_name: dbName,
        database_size_bytes: dbSizeBytes,
        database_size_formatted: formatBytes(dbSizeBytes),
        total_tables: tables.length,
        total_rows: totalRows,
        tables,
      },
    });
  } catch (err) {
    next(err);
  }
});

dbAdminRouter.get("/tables/:table/structure", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tableInfo = await resolvePublicTable(req.params.table);
    if (!tableInfo) {
      return res.status(404).json({
        success: false,
        error: { code: "TABLE_NOT_FOUND", message: "جدول مورد نظر یافت نشد." },
      });
    }

    const { columns, primaryKeys } = await getTableMetadata(tableInfo.table_name);

    const idxRes = await postgresDb.pg.query(
      `SELECT indexname, indexdef
       FROM pg_indexes
       WHERE schemaname = 'public' AND tablename = $1
       ORDER BY indexname ASC`,
      [tableInfo.table_name],
    );

    const fkRes = await postgresDb.pg.query(
      `SELECT
         tc.constraint_name,
         kcu.column_name,
         ccu.table_name AS foreign_table_name,
         ccu.column_name AS foreign_column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
       JOIN information_schema.constraint_column_usage ccu
         ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
       WHERE tc.constraint_type = 'FOREIGN KEY'
         AND tc.table_schema = 'public'
         AND tc.table_name = $1
       ORDER BY tc.constraint_name ASC`,
      [tableInfo.table_name],
    );

    const countRes = await postgresDb.pg.query(
      `SELECT COUNT(*)::int AS cnt FROM "public".${quoteIdent(tableInfo.table_name)}`,
    );

    return res.json({
      success: true,
      data: {
        table: tableInfo.table_name,
        table_type: tableInfo.table_type,
        row_count: Number(countRes.rows[0]?.cnt || 0),
        primaryKeys,
        columns,
        indexes: idxRes.rows,
        foreignKeys: fkRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
});

dbAdminRouter.get("/tables/:table/rows", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tableInfo = await resolvePublicTable(req.params.table);
    if (!tableInfo) {
      return res.status(404).json({
        success: false,
        error: { code: "TABLE_NOT_FOUND", message: "جدول مورد نظر یافت نشد." },
      });
    }

    const { columns, primaryKeys } = await getTableMetadata(tableInfo.table_name);
    const validCols = new Set(columns.map((c: any) => c.column_name));

    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || "25"), 10) || 25));
    const offset = (page - 1) * pageSize;

    const requestedSort = typeof req.query.sortBy === "string" ? req.query.sortBy.trim() : "";
    const sortBy = validCols.has(requestedSort)
      ? requestedSort
      : primaryKeys[0] || (validCols.has("created_at") ? "created_at" : columns[0]?.column_name || "");
    const sortDir = String(req.query.sortDir || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC";

    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const params: unknown[] = [];
    let whereSql = "";
    if (search && columns.length > 0) {
      params.push(`%${search}%`);
      const searchClauses = columns.map((c: any) => `COALESCE(${quoteIdent(c.column_name)}::text, '') ILIKE $1`);
      whereSql = `WHERE (${searchClauses.join(" OR ")})`;
    }

    const quotedTable = quoteIdent(tableInfo.table_name);
    const countRes = await postgresDb.pg.query(
      `SELECT COUNT(*)::int AS total FROM "public".${quotedTable} ${whereSql}`,
      params,
    );
    const total = Number(countRes.rows[0]?.total || 0);

    const orderSql = sortBy ? `ORDER BY ${quoteIdent(sortBy)} ${sortDir} NULLS LAST` : "";
    const selectCtid = tableInfo.table_type === "BASE TABLE" ? `ctid::text AS __ctid, ` : "";
    const listParams = [...params, pageSize, offset];
    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;

    const rowsRes = await postgresDb.pg.query(
      `SELECT ${selectCtid}* FROM "public".${quotedTable} ${whereSql} ${orderSql} LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      listParams,
    );

    return res.json({
      success: true,
      data: {
        table: tableInfo.table_name,
        table_type: tableInfo.table_type,
        columns,
        primaryKeys,
        rows: rowsRes.rows,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

dbAdminRouter.post("/tables/:table/rows", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tableInfo = await resolvePublicTable(req.params.table);
    if (!tableInfo || tableInfo.table_type !== "BASE TABLE") {
      return res.status(404).json({
        success: false,
        error: { code: "TABLE_NOT_FOUND", message: "جدول قابل ویرایش مورد نظر یافت نشد." },
      });
    }

    const valuesObj = req.body?.values;
    if (!valuesObj || typeof valuesObj !== "object" || Array.isArray(valuesObj)) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "ساختار داده‌های ارسالی نامعتبر است." },
      });
    }

    const { columns } = await getTableMetadata(tableInfo.table_name);
    const colMap = new Map(columns.map((c: any) => [c.column_name, c]));

    const insertCols: string[] = [];
    const insertVals: unknown[] = [];
    for (const [key, rawVal] of Object.entries(valuesObj)) {
      const col = colMap.get(key);
      if (!col) continue;
      if (rawVal === undefined) continue;
      insertCols.push(key);
      insertVals.push(coerceColumnValue(rawVal, col));
    }

    if (insertCols.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "حداقل یک ستون معتبر برای ثبت مقدار انتخاب کنید." },
      });
    }

    const placeholders = insertCols.map((_, idx) => `$${idx + 1}`).join(", ");
    const colsSql = insertCols.map(quoteIdent).join(", ");
    const quotedTable = quoteIdent(tableInfo.table_name);

    const inserted = await postgresDb.pg.query(
      `INSERT INTO "public".${quotedTable} (${colsSql}) VALUES (${placeholders}) RETURNING *`,
      insertVals,
    );

    logger.info("DB admin inserted row", {
      module: "db_admin",
      operation: "row_insert",
      requestId: req.requestId,
      userId: req.platformAdmin?.id,
      details: { table: tableInfo.table_name },
    });

    return res.status(201).json({
      success: true,
      data: inserted.rows[0] || null,
      message: "ردیف جدید با موفقیت در جدول ثبت شد.",
    });
  } catch (err: any) {
    if (err?.code) {
      return res.status(400).json({
        success: false,
        error: { code: err.code, message: err.message || "خطا در ثبت ردیف جدید." },
      });
    }
    next(err);
  }
});

dbAdminRouter.patch("/tables/:table/rows", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tableInfo = await resolvePublicTable(req.params.table);
    if (!tableInfo || tableInfo.table_type !== "BASE TABLE") {
      return res.status(404).json({
        success: false,
        error: { code: "TABLE_NOT_FOUND", message: "جدول قابل ویرایش مورد نظر یافت نشد." },
      });
    }

    const { key, ctid, values } = req.body || {};
    if (!values || typeof values !== "object" || Array.isArray(values)) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "مقادیر بروزرسانی نامعتبر هستند." },
      });
    }

    const { columns, primaryKeys } = await getTableMetadata(tableInfo.table_name);
    const colMap = new Map(columns.map((c: any) => [c.column_name, c]));

    const setClauses: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    for (const [colName, rawVal] of Object.entries(values)) {
      const col = colMap.get(colName);
      if (!col) continue;
      setClauses.push(`${quoteIdent(colName)} = $${idx++}`);
      params.push(coerceColumnValue(rawVal, col));
    }

    if (setClauses.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "هیچ ستون معتبری برای ویرایش ارسال نشده است." },
      });
    }

    const { whereSql, params: whereParams } = buildRowWhereClause(primaryKeys, key, ctid, idx);
    const quotedTable = quoteIdent(tableInfo.table_name);

    const updated = await postgresDb.pg.query(
      `UPDATE "public".${quotedTable} SET ${setClauses.join(", ")} WHERE ${whereSql} RETURNING *`,
      [...params, ...whereParams],
    );

    if (updated.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: "ROW_NOT_FOUND", message: "ردیف مورد نظر برای ویرایش یافت نشد." },
      });
    }

    logger.info("DB admin updated row", {
      module: "db_admin",
      operation: "row_update",
      requestId: req.requestId,
      userId: req.platformAdmin?.id,
      details: { table: tableInfo.table_name, updatedColumns: setClauses.length },
    });

    return res.json({
      success: true,
      data: updated.rows[0],
      message: "ردیف با موفقیت ویرایش شد.",
    });
  } catch (err: any) {
    if (err?.status === 400 || err?.code) {
      return res.status(err.status || 400).json({
        success: false,
        error: { code: err.code || "DB_ERROR", message: err.message || "خطا در ویرایش ردیف." },
      });
    }
    next(err);
  }
});

dbAdminRouter.delete("/tables/:table/rows", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tableInfo = await resolvePublicTable(req.params.table);
    if (!tableInfo || tableInfo.table_type !== "BASE TABLE") {
      return res.status(404).json({
        success: false,
        error: { code: "TABLE_NOT_FOUND", message: "جدول قابل ویرایش مورد نظر یافت نشد." },
      });
    }

    const { key, ctid } = req.body || {};
    const { primaryKeys } = await getTableMetadata(tableInfo.table_name);
    const { whereSql, params } = buildRowWhereClause(primaryKeys, key, ctid, 1);
    const quotedTable = quoteIdent(tableInfo.table_name);

    const deleted = await postgresDb.pg.query(
      `DELETE FROM "public".${quotedTable} WHERE ${whereSql} RETURNING *`,
      params,
    );

    if (deleted.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: "ROW_NOT_FOUND", message: "ردیف مورد نظر برای حذف یافت نشد." },
      });
    }

    logger.info("DB admin deleted row", {
      module: "db_admin",
      operation: "row_delete",
      requestId: req.requestId,
      userId: req.platformAdmin?.id,
      details: { table: tableInfo.table_name },
    });

    return res.json({
      success: true,
      data: { deleted: deleted.rows.length },
      message: "ردیف با موفقیت حذف شد.",
    });
  } catch (err: any) {
    if (err?.status === 400 || err?.code) {
      return res.status(err.status || 400).json({
        success: false,
        error: { code: err.code || "DB_ERROR", message: err.message || "خطا در حذف ردیف." },
      });
    }
    next(err);
  }
});

dbAdminRouter.get("/tables/:table/export", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tableInfo = await resolvePublicTable(req.params.table);
    if (!tableInfo) {
      return res.status(404).json({
        success: false,
        error: { code: "TABLE_NOT_FOUND", message: "جدول مورد نظر یافت نشد." },
      });
    }

    const format = String(req.query.format || "json").toLowerCase() === "csv" ? "csv" : "json";
    const quotedTable = quoteIdent(tableInfo.table_name);
    const { columns } = await getTableMetadata(tableInfo.table_name);
    const dataRes = await postgresDb.pg.query(`SELECT * FROM "public".${quotedTable} LIMIT 10000`);
    const dateStr = new Date().toISOString().split("T")[0];
    const safeName = tableInfo.table_name.replace(/[^a-zA-Z0-9_-]/g, "_");

    if (format === "csv") {
      const headers = columns.map((c: any) => c.column_name);
      const lines = [
        headers.map(escapeCsvCell).join(","),
        ...dataRes.rows.map((row: any) => headers.map((h: string) => escapeCsvCell(row[h])).join(",")),
      ];
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${safeName}-${dateStr}.csv"`);
      return res.send("\uFEFF" + lines.join("\n"));
    }

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}-${dateStr}.json"`);
    return res.send(JSON.stringify(dataRes.rows, null, 2));
  } catch (err) {
    next(err);
  }
});

dbAdminRouter.post("/query", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await postgresDb.init();
    const sql = typeof req.body?.sql === "string" ? req.body.sql.trim() : "";
    if (!sql) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "دستور SQL نباید خالی باشد." },
      });
    }
    if (sql.length > 50000) {
      return res.status(400).json({
        success: false,
        error: { code: "QUERY_TOO_LARGE", message: "حجم دستور SQL بیش از حد مجاز (۵۰ کیلوبایت) است." },
      });
    }

    const startedAt = Date.now();
    let rawResults: any[] = [];

    if (typeof postgresDb.pg.exec === "function" && sql.includes(";")) {
      const execOut = await postgresDb.pg.exec(sql);
      rawResults = Array.isArray(execOut) ? execOut : [execOut];
    } else {
      const queryOut = await postgresDb.pg.query(sql);
      rawResults = Array.isArray(queryOut) ? queryOut : [queryOut];
    }

    const durationMs = Date.now() - startedAt;
    const results = rawResults.map((r: any) => {
      const rows = Array.isArray(r?.rows) ? r.rows : [];
      const fields = Array.isArray(r?.fields)
        ? r.fields.map((f: any) => f.name)
        : rows[0]
          ? Object.keys(rows[0])
          : [];
      const rowCount =
        typeof r?.rowCount === "number"
          ? r.rowCount
          : typeof r?.affectedRows === "number"
            ? r.affectedRows
            : rows.length;
      return {
        command: r?.command || (fields.length > 0 ? "SELECT" : "OK"),
        rowCount,
        fields,
        rows: rows.slice(0, 500),
        truncated: rows.length > 500,
      };
    });

    logger.info("DB admin executed SQL query", {
      module: "db_admin",
      operation: "sql_execute",
      requestId: req.requestId,
      userId: req.platformAdmin?.id,
      durationMs,
      details: { statementCount: results.length },
    });

    return res.json({
      success: true,
      data: {
        durationMs,
        results,
      },
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: {
        code: err?.code || "SQL_ERROR",
        message: err?.message || "خطا در اجرای دستور SQL.",
        detail: err?.detail || null,
        hint: err?.hint || null,
        position: err?.position || null,
      },
    });
  }
});

export { dbAdminRouter };
