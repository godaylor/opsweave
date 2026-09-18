// Generate exact dependency attribution from the installed production closure.
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
const entries = [];
function packages(directory) {
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
		const path = join(directory, entry.name);
		if (entry.name.startsWith("@")) {
			packages(path);
			continue;
		}
		if (!existsSync(join(path, "package.json"))) continue;
		const pkg = JSON.parse(readFileSync(join(path, "package.json"), "utf8"));
		if (/@novu|bullmq-pro|@taskforcesh/.test(pkg.name))
			throw new Error("Forbidden runtime dependency");
		const notices = readdirSync(path).filter((name) =>
			/^(licen[cs]e|copying|notice)(\.|$)/i.test(name),
		);
		if (!notices.length && pkg.name === "pg-types" && pkg.version === "2.2.0") {
			const readme = readFileSync(join(path, "README.md"), "utf8");
			const license = readme.split("## license")[1];
			if (
				!license?.includes("Copyright (c) 2014 Brian M. Carlson") ||
				!license.includes("THE SOFTWARE.")
			)
				throw new Error("Missing pg-types license");
			entries.push(`${pkg.name}@${pkg.version}\n${license.trim()}\n`);
		} else if (
			!notices.length &&
			pkg.name === "pgpass" &&
			pkg.version === "1.0.5"
		) {
			const license = readFileSync(join(path, "README.md"), "utf8").split(
				"## License",
			)[1];
			if (
				!license?.includes("Copyright (c) 2013-2016 Hannes Hörl") ||
				!license.includes("THE SOFTWARE.")
			)
				throw new Error("Missing pgpass license");
			entries.push(`${pkg.name}@${pkg.version}\n${license.trim()}\n`);
		} else if (!notices.length)
			throw new Error(`Missing exact license: ${pkg.name}`);
		if (notices.length)
			entries.push(
				`${pkg.name}@${pkg.version}\n${notices.map((name) => readFileSync(join(path, name), "utf8")).join("\n")}\n`,
			);
		if (existsSync(join(path, "node_modules")))
			packages(join(path, "node_modules"));
	}
}
packages("node_modules");
writeFileSync(
	"THIRD-PARTY-RUNTIME.txt",
	entries.sort().join("\n----------------------------------------\n"),
);
console.log(
	`Preserved exact notices for ${entries.length} installed production packages`,
);
