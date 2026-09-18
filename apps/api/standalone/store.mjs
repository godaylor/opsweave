// Original OpsWeave implementation. MIT; see LICENSE in the standalone distribution.
import pg from "pg";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

export class Store {
	constructor(url, schema = "opsweave") {
		if (!url || !/^postgres(ql)?:\/\//.test(url))
			throw new Error("DATABASE_URL must be a Postgres connection string");
		if (!/^opsweave(?:_[a-z0-9_]+)?$/.test(schema))
			throw new Error("Invalid OpsWeave schema");
		const parsed = new URL(url);
		const local = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
		for (const key of ["ssl", "sslmode", "sslcert", "sslkey", "sslrootcert"])
			parsed.searchParams.delete(key);
		this.schema = schema;
		this.context = new AsyncLocalStorage();
		this.pool = new pg.Pool({
			connectionString: parsed.toString(),
			max: 4,
			idleTimeoutMillis: 10000,
			connectionTimeoutMillis: 15000,
			types: {
				getTypeParser: (oid, format) =>
					oid === 20 ? Number : pg.types.getTypeParser(oid, format),
			},
			ssl: local
				? false
				: {
						rejectUnauthorized: true,
						...(process.env.DATABASE_CA_FILE
							? { ca: readFileSync(process.env.DATABASE_CA_FILE, "utf8") }
							: {}),
					},
		});
		this.pool.on("error", () => console.error("database_pool_error"));
		this.db = {
			prepare: (sql) => {
				let index = 0;
				const query = sql.replace(/\?/g, () => `$${++index}`);
				return {
					get: async (...args) => (await this.query(query, args)).rows[0],
					all: async (...args) => (await this.query(query, args)).rows,
					run: async (...args) => ({
						changes: (await this.query(query, args)).rowCount,
					}),
				};
			},
		};
	}
	async initialize() {
		const client = await this.pool.connect();
		try {
			await client.query("BEGIN");
			await client.query(
				"SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
				[`${this.schema}:schema`],
			);
			await client.query(`CREATE SCHEMA IF NOT EXISTS "${this.schema}"`);
			await client.query(`SET LOCAL search_path TO "${this.schema}"`);
			await client.query(
				readFileSync(new URL("./schema.sql", import.meta.url), "utf8"),
			);
			await client.query("COMMIT");
		} catch (e) {
			await client.query("ROLLBACK");
			throw e;
		} finally {
			client.release();
		}
	}
	async query(sql, values = []) {
		const current = this.context.getStore();
		if (current) return current.query(sql, values);
		const client = await this.pool.connect();
		try {
			// One setup round trip matters when app and managed DB are in different regions.
			// schema is restricted to the identifier allowlist in the constructor.
			await client.query(`BEGIN; SET LOCAL search_path TO "${this.schema}"; SET LOCAL statement_timeout = '10s'`);
			const result = await client.query(sql, values);
			await client.query("COMMIT");
			return result;
		} catch (error) {
			await client.query("ROLLBACK");
			throw error;
		} finally {
			client.release();
		}
	}
	async transaction(fn) {
		if (this.context.getStore()) return fn();
		const client = await this.pool.connect();
		try {
			await client.query(`BEGIN; SET LOCAL search_path TO "${this.schema}"; SET LOCAL statement_timeout = '10s'; SET LOCAL lock_timeout = '8s'`);
			// Serialize short state transitions across all instances, scoped to this app schema.
			// This preserves atomic acceptance, revisions and exactly-once timer transitions.
			await client.query(
				"SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
				[`${this.schema}:transitions`],
			);
			const result = await this.context.run(client, fn);
			await client.query("COMMIT");
			return result;
		} catch (error) {
			await client.query("ROLLBACK");
			throw error;
		} finally {
			client.release();
		}
	}
	async list(owner, kind) {
		return (
			await this.query(
				"SELECT body FROM records WHERE owner=$1 AND kind=$2 ORDER BY seq DESC",
				[owner, kind],
			)
		).rows.map((r) => r.body);
	}
	async get(owner, kind, id) {
		return (
			(
				await this.query(
					"SELECT body FROM records WHERE owner=$1 AND kind=$2 AND id=$3",
					[owner, kind, id],
				)
			).rows[0]?.body || null
		);
	}
	async put(owner, kind, record) {
		await this.query(
			"INSERT INTO records(id,owner,kind,body) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO UPDATE SET body=excluded.body WHERE records.owner=excluded.owner AND records.kind=excluded.kind",
			[record.id, owner, kind, JSON.stringify(record)],
		);
		return record;
	}
	async event(owner, run, type, detail = "") {
		const event = {
			id: randomUUID(),
			at: Date.now(),
			type,
			detail,
			correlationId: run.id,
		};
		await this.query("INSERT INTO events(owner,run_id,body) VALUES($1,$2,$3)", [
			owner,
			run.id,
			JSON.stringify(event),
		]);
	}
	async events(owner, id) {
		return (
			await this.query(
				"SELECT seq,body FROM events WHERE owner=$1 AND run_id=$2 ORDER BY seq LIMIT 1000",
				[owner, id],
			)
		).rows.map((r) => ({ ...r.body, seq: Number(r.seq) }));
	}
	async readyRuns() {
		return (
			await this.query(
				`SELECT owner,body FROM records WHERE kind='run' AND (
   body->>'status'='running' OR (body->>'status'='waiting'
    AND body->'steps'->((body->>'cursor')::int)->>'type'='wait'
    AND (body->'steps'->((body->>'cursor')::int)->>'due')::bigint <= $1))
   ORDER BY (body->>'updated')::bigint LIMIT 100`,
				[Date.now()],
			)
		).rows;
	}
	async health() {
		await this.query("SELECT 1");
	}
	async close() {
		await this.pool.end();
	}
}
