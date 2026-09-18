// Copy-only migration. Source is read-only; target must be empty. No secrets are printed.
import { DatabaseSync } from "node:sqlite";
import { Store } from "./store.mjs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export async function importSqlite(source, store) {
	const sqlite = new DatabaseSync(source, { readOnly: true });
	const tables = [
		"users",
		"sessions",
		"records",
		"events",
		"acceptance",
		"api_keys",
	];
	try {
		sqlite.exec("BEGIN");
		const counts = await store.transaction(async () => {
			for (const table of tables) {
				if (
					Number(
						(await store.query(`SELECT count(*) AS n FROM ${table}`)).rows[0].n,
					)
				)
					throw new Error("Migration target must be empty");
			}
			const result = {};
			for (const table of tables) {
				const rows = sqlite
					.prepare(
						`SELECT * FROM ${table}${table === "records" ? " ORDER BY rowid" : table === "events" ? " ORDER BY seq" : ""}`,
					)
					.all();
				for (const row of rows) {
					const keys = Object.keys(row);
					await store.query(
						`INSERT INTO ${table}(${keys.map((k) => `"${k}"`).join(",")}) VALUES(${keys.map((_, i) => `$${i + 1}`).join(",")})`,
						Object.values(row),
					);
				}
				result[table] = rows.length;
			}
			await store.query(
				"SELECT setval(pg_get_serial_sequence('events','seq'), COALESCE((SELECT max(seq) FROM events),1), EXISTS(SELECT 1 FROM events))",
			);
			return result;
		});
		sqlite.exec("COMMIT");
		return counts;
	} finally {
		sqlite.close();
	}
}
if (
	process.argv[1] &&
	resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	if (!process.argv[2])
		throw new Error(
			"Usage: DATABASE_URL=... node import-sqlite.mjs /private/source.sqlite",
		);
	const store = new Store(
		process.env.DATABASE_URL,
		process.env.DATABASE_SCHEMA,
	);
	try {
		await store.initialize();
		console.log(
			JSON.stringify(await importSqlite(resolve(process.argv[2]), store)),
		);
	} catch {
		console.error(
			"SQLite import failed; target transaction rolled back. Source unchanged.",
		);
		process.exitCode = 1;
	} finally {
		await store.close();
	}
}
