import { DatabaseSync, backup } from "node:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
const source = resolve(process.env.DATABASE_PATH || "data/opsweave.sqlite");
if (!process.argv[2])
	throw new Error(
		"Usage: node apps/api/standalone/backup.mjs /private/path/new-backup.sqlite",
	);
const target = resolve(process.argv[2]);
if (!existsSync(source) || existsSync(target))
	throw new Error("Source must exist and target must be new");
mkdirSync(dirname(target), { recursive: true });
const database = new DatabaseSync(source, { readOnly: true });
try {
	await backup(database, target);
	console.log("Consistent SQLite backup created. Keep it private.");
} finally {
	database.close();
}
