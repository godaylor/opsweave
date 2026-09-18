import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
export function notices() {
	return {
		name: "opsweave-runtime-notices",
		generateBundle(_options, bundle) {
			const packages = new Map();
			for (const output of Object.values(bundle)) {
				if (output.type !== "chunk") continue;
				if (
					/@novu\/|@taskforcesh\/bullmq-pro|maily-core|maily-render/.test(
						output.code,
					)
				)
					throw new Error("Forbidden runtime package in bundle");
				for (const modulePath of Object.keys(output.modules)) {
					// Rollup's virtual CommonJS wrappers also contain real package paths;
					// their physical modules are enumerated separately below.
					if (modulePath.startsWith("\0")) continue;
					const path = modulePath.replaceAll("\\", "/");
					const marker = path.lastIndexOf("/node_modules/");
					if (marker < 0) continue;
					const parts = path.slice(marker + 14).split("/");
					const name = parts[0].startsWith("@")
						? parts.slice(0, 2).join("/")
						: parts[0];
					if (
						![
							"react",
							"react-dom",
							"scheduler",
							"@tanstack/react-query",
							"@tanstack/query-core",
							"react-hook-form",
						].includes(name)
					)
						throw new Error(`Unreviewed browser dependency: ${name}`);
					if (packages.has(name)) continue;
					const directory = resolve(path.slice(0, marker + 14), name);
					const pkg = JSON.parse(
						readFileSync(resolve(directory, "package.json"), "utf8"),
					);
					const licenses = readdirSync(directory).filter((n) =>
						/^(license|copying)(\.|$)/i.test(n),
					);
					if (pkg.license !== "MIT" || !licenses.length)
						throw new Error(`Missing reviewed license: ${name}`);
					packages.set(name, {
						name,
						version: pkg.version,
						license: pkg.license,
						notice: licenses
							.map((file) => readFileSync(resolve(directory, file), "utf8"))
							.join("\n"),
					});
				}
			}
			const list = [...packages.values()].sort((a, b) =>
				a.name.localeCompare(b.name),
			);
			this.emitFile({
				type: "asset",
				fileName: "THIRD-PARTY-NOTICES.txt",
				source: list
					.map((p) => `${p.name}@${p.version}\n${"=".repeat(60)}\n${p.notice}`)
					.join("\n\n"),
			});
			const ids = list.map((p, index) => ({
				SPDXID: `SPDXRef-Package-${index}`,
				name: p.name,
				versionInfo: p.version,
				filesAnalyzed: false,
				downloadLocation: `https://www.npmjs.com/package/${p.name}/v/${p.version}`,
				licenseDeclared: p.license,
				licenseConcluded: "NOASSERTION",
				copyrightText: "NOASSERTION",
			}));
			this.emitFile({
				type: "asset",
				fileName: "SBOM.spdx.json",
				source: JSON.stringify(
					{
						spdxVersion: "SPDX-2.3",
						dataLicense: "CC0-1.0",
						SPDXID: "SPDXRef-DOCUMENT",
						name: "OpsWeave browser runtime",
						documentNamespace: `https://github.com/godaylor/opsweave/sbom/${randomUUID()}`,
						creationInfo: {
							created: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
							creators: ["Tool: OpsWeave-notice-generator"],
						},
						packages: ids,
						relationships: ids.map((p) => ({
							spdxElementId: "SPDXRef-DOCUMENT",
							relationshipType: "DESCRIBES",
							relatedSpdxElement: p.SPDXID,
						})),
					},
					null,
					2,
				),
			});
		},
	};
}
