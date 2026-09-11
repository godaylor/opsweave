// Original OpsWeave implementation. MIT; see LICENSE in the standalone distribution.
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export class Store {
	constructor(path) {
		if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
		this.db = new DatabaseSync(path);
		this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE,password TEXT,created INTEGER NOT NULL,disabled INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS records(id TEXT PRIMARY KEY,owner TEXT NOT NULL REFERENCES users(id),kind TEXT NOT NULL,body TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS records_owner_kind ON records(owner,kind);
      CREATE TABLE IF NOT EXISTS events(seq INTEGER PRIMARY KEY AUTOINCREMENT,owner TEXT NOT NULL,run_id TEXT NOT NULL,body TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS events_owner_run ON events(owner,run_id,seq);
      CREATE TABLE IF NOT EXISTS acceptance(owner TEXT NOT NULL,key TEXT NOT NULL,digest TEXT NOT NULL,run_id TEXT NOT NULL,PRIMARY KEY(owner,key));
      CREATE TABLE IF NOT EXISTS api_keys(hash TEXT PRIMARY KEY,owner TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL,last_four TEXT NOT NULL);
    `);
	}
	transaction(fn) {
		this.db.exec("BEGIN IMMEDIATE");
		try {
			const result = fn();
			this.db.exec("COMMIT");
			return result;
		} catch (error) {
			this.db.exec("ROLLBACK");
			throw error;
		}
	}
	list(owner, kind) {
		return this.db
			.prepare(
				"SELECT body FROM records WHERE owner=? AND kind=? ORDER BY rowid DESC",
			)
			.all(owner, kind)
			.map((r) => JSON.parse(r.body));
	}
	get(owner, kind, id) {
		const row = this.db
			.prepare("SELECT body FROM records WHERE owner=? AND kind=? AND id=?")
			.get(owner, kind, id);
		return row ? JSON.parse(row.body) : null;
	}
	put(owner, kind, record) {
		this.db
			.prepare(
				"INSERT INTO records(id,owner,kind,body) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body WHERE records.owner=excluded.owner AND records.kind=excluded.kind",
			)
			.run(record.id, owner, kind, JSON.stringify(record));
		return record;
	}
	event(owner, run, type, detail = "") {
		const event = {
			id: randomUUID(),
			at: Date.now(),
			type,
			detail,
			correlationId: run.id,
		};
		this.db
			.prepare("INSERT INTO events(owner,run_id,body) VALUES(?,?,?)")
			.run(owner, run.id, JSON.stringify(event));
	}
	events(owner, id) {
		return this.db
			.prepare(
				"SELECT seq,body FROM events WHERE owner=? AND run_id=? ORDER BY seq LIMIT 1000",
			)
			.all(owner, id)
			.map((r) => ({ ...JSON.parse(r.body), seq: r.seq }));
	}
	close() {
		this.db.close();
	}
}
