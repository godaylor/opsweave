import { createServer } from "node:http";
import {
	randomBytes,
	randomUUID,
	createHash,
	scrypt as derive,
	timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { Store } from "./store.mjs";
import {
	Problem,
	text,
	validatePlaybook,
	accept,
	tick,
	act,
} from "./engine.mjs";
const scrypt = promisify(derive);
const hash = (value) => createHash("sha256").update(value).digest("hex");
const day = 86400000;
async function password(value, encoded) {
	text(value, 256);
	if (value.length < 12) throw new Problem(400, "password_too_short");
	const salt = encoded?.split(":")[0] || randomBytes(16).toString("hex");
	const key = await scrypt(value, salt, 64);
	return encoded
		? timingSafeEqual(key, Buffer.from(encoded.split(":")[1], "hex"))
		: `${salt}:${key.toString("hex")}`;
}
async function body(req) {
	if (!req.headers["content-type"]?.startsWith("application/json"))
		throw new Problem(415, "json_required");
	let size = 0;
	const chunks = [];
	for await (const chunk of req) {
		size += chunk.length;
		if (size > 64000) throw new Problem(413, "body_too_large");
		chunks.push(chunk);
	}
	try {
		const data = JSON.parse(Buffer.concat(chunks).toString());
		if (!data || Array.isArray(data) || typeof data !== "object") throw 0;
		return data;
	} catch {
		throw new Problem(400, "invalid_json");
	}
}
export function createApp({
	database = ":memory:",
	publicDir,
	origin = "http://127.0.0.1:32320",
	secure = false,
	startWorker = true,
} = {}) {
	const store = new Store(database);
	const limits = new Map();
	let workerHealthy = true;
	const timer = startWorker
		? setInterval(() => {
				try {
					tick(store);
					workerHealthy = true;
				} catch {
					workerHealthy = false;
					console.error("execution_tick_failed");
				}
			}, 300)
		: null;
	timer?.unref();
	function session(res, user) {
		store.db.prepare("DELETE FROM sessions WHERE expires<=?").run(Date.now());
		const token = randomBytes(32).toString("base64url");
		store.db
			.prepare("INSERT INTO sessions VALUES(?,?,?)")
			.run(hash(token), user, Date.now() + 7 * day);
		res.setHeader(
			"Set-Cookie",
			`opsweave_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800${secure ? "; Secure" : ""}`,
		);
	}
	function identity(req) {
		const token = /(?:^|;\s*)opsweave_session=([^;]+)/.exec(
			req.headers.cookie || "",
		)?.[1];
		if (!token) throw new Problem(401, "sign_in_required");
		const row = store.db
			.prepare(
				"SELECT u.id,u.email FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.hash=? AND s.expires>? AND u.disabled=0",
			)
			.get(hash(token), Date.now());
		if (!row) throw new Problem(401, "sign_in_required");
		return row;
	}
	const server = createServer(async (req, res) => {
		const requestId = randomUUID();
		const send = (status, value) => {
			res.writeHead(status, {
				"Content-Type": "application/json; charset=utf-8",
				"Cache-Control": "no-store",
			});
			res.end(JSON.stringify(value));
		};
		res.setHeader("X-Request-Id", requestId);
		res.setHeader("X-Content-Type-Options", "nosniff");
		res.setHeader("Referrer-Policy", "no-referrer");
		res.setHeader(
			"Content-Security-Policy",
			"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
		);
		if (secure) res.setHeader("Strict-Transport-Security", "max-age=31536000");
		try {
			const url = new URL(req.url, origin);
			const path = url.pathname;
			if (path === "/api/health" && req.method === "GET") {
				store.db.prepare("SELECT 1").get();
				return send(workerHealthy ? 200 : 503, {
					status: workerHealthy ? "ready" : "degraded",
					persistence: "sqlite",
					execution: workerHealthy ? "ready" : "degraded",
				});
			}
			if (!path.startsWith("/api/")) {
				if (!["GET", "HEAD"].includes(req.method))
					throw new Problem(405, "method_not_allowed");
				if (!publicDir) throw new Problem(404, "not_found");
				const relative =
					path === "/" ? "index.html" : decodeURIComponent(path).slice(1);
				const file = resolve(publicDir, relative);
				if (
					!file.startsWith(`${resolve(publicDir)}/`) &&
					!file.startsWith(`${resolve(publicDir)}\\`)
				)
					throw new Problem(404, "not_found");
				const actual =
					existsSync(file) && statSync(file).isFile()
						? file
						: extname(path)
							? null
							: resolve(publicDir, "index.html");
				if (!actual) throw new Problem(404, "not_found");
				res.setHeader(
					"Content-Type",
					{
						".html": "text/html; charset=utf-8",
						".js": "text/javascript; charset=utf-8",
						".css": "text/css; charset=utf-8",
						".svg": "image/svg+xml",
						".png": "image/png",
					}[extname(actual)] || "application/octet-stream",
				);
				res.setHeader(
					"Cache-Control",
					path.startsWith("/assets/")
						? "public,max-age=31536000,immutable"
						: "no-cache",
				);
				return res.end(
					req.method === "HEAD" ? undefined : readFileSync(actual),
				);
			}
			if (!["GET", "POST", "PUT"].includes(req.method))
				throw new Problem(405, "method_not_allowed");
			if (req.method !== "GET") {
				if (req.headers.origin && req.headers.origin !== origin)
					throw new Problem(403, "origin_denied");
				if (req.headers["sec-fetch-site"] === "cross-site")
					throw new Problem(403, "origin_denied");
				const key = `${req.socket.remoteAddress}:${path.startsWith("/api/auth/") ? "auth" : "write"}`;
				const now = Date.now();
				const limit = limits.get(key) || { count: 0, until: now + 60000 };
				if (limit.until < now) {
					limit.count = 0;
					limit.until = now + 60000;
				}
				if (++limit.count > (path.startsWith("/api/auth/") ? 30 : 180))
					throw new Problem(429, "rate_limited");
				limits.set(key, limit);
				if (limits.size > 10000)
					for (const [k, v] of limits) if (v.until < now) limits.delete(k);
			}
			if (path === "/api/auth/guest" && req.method === "POST") {
				await body(req);
				const id = randomUUID();
				store.db
					.prepare(
						"INSERT INTO users(id,email,password,created) VALUES(?,?,?,?)",
					)
					.run(id, null, null, Date.now());
				session(res, id);
				return send(201, { id, email: null });
			}
			if (
				["/api/auth/register", "/api/auth/login"].includes(path) &&
				req.method === "POST"
			) {
				const input = await body(req);
				const email = text(input.email, 254).toLowerCase();
				if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
					throw new Problem(400, "invalid_email");
				const existing = store.db
					.prepare("SELECT * FROM users WHERE email=?")
					.get(email);
				if (path.endsWith("/login")) {
					const valid = await password(
						input.password,
						existing?.password ||
							`00000000000000000000000000000000:${"00".repeat(64)}`,
					);
					if (!existing || existing.disabled || !valid)
						throw new Problem(401, "invalid_credentials");
					session(res, existing.id);
					return send(200, { id: existing.id, email });
				}
				if (existing) throw new Problem(409, "account_unavailable");
				const encoded = await password(input.password);
				let guest;
				try {
					guest = identity(req);
				} catch {}
				const id = guest && !guest.email ? guest.id : randomUUID();
				store.transaction(() => {
					if (store.db.prepare("SELECT id FROM users WHERE email=?").get(email))
						throw new Problem(409, "account_unavailable");
					if (guest && !guest.email) {
						const result = store.db
							.prepare(
								"UPDATE users SET email=?,password=? WHERE id=? AND email IS NULL AND disabled=0",
							)
							.run(email, encoded, id);
						if (!result.changes) throw new Problem(409, "account_unavailable");
					} else
						store.db
							.prepare(
								"INSERT INTO users(id,email,password,created) VALUES(?,?,?,?)",
							)
							.run(id, email, encoded, Date.now());
				});
				session(res, id);
				return send(201, { id, email });
			}
			if (path === "/api/ingest" && req.method === "POST") {
				const key = req.headers.authorization?.replace(/^Bearer /, "");
				const credential =
					key &&
					store.db
						.prepare(
							"SELECT k.owner FROM api_keys k JOIN users u ON u.id=k.owner WHERE k.hash=? AND k.expires>? AND u.disabled=0",
						)
						.get(hash(key), Date.now());
				if (!credential) throw new Problem(401, "invalid_api_key");
				const result = accept(
					store,
					credential.owner,
					await body(req),
					req.headers["idempotency-key"],
				);
				return send(result.duplicate ? 200 : 202, result);
			}
			const user = identity(req);
			const owner = user.id;
			if (path === "/api/auth/me" && req.method === "GET")
				return send(200, user);
			if (path === "/api/auth/logout" && req.method === "POST") {
				const token = /(?:^|;\s*)opsweave_session=([^;]+)/.exec(
					req.headers.cookie || "",
				)?.[1];
				store.db.prepare("DELETE FROM sessions WHERE hash=?").run(hash(token));
				res.setHeader(
					"Set-Cookie",
					"opsweave_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0",
				);
				return send(200, { ok: true });
			}
			if (path === "/api/keys" && req.method === "GET")
				return send(
					200,
					store.db
						.prepare(
							"SELECT last_four AS lastFour,expires FROM api_keys WHERE owner=?",
						)
						.all(owner),
				);
			if (path === "/api/keys" && req.method === "POST") {
				const input = await body(req);
				const key = `ow_${randomBytes(32).toString("base64url")}`;
				const expires = Date.now() + 30 * day;
				store.transaction(() => {
					store.db.prepare("DELETE FROM api_keys WHERE owner=?").run(owner);
					if (!input.revoke)
						store.db
							.prepare("INSERT INTO api_keys VALUES(?,?,?,?)")
							.run(hash(key), owner, expires, key.slice(-4));
					store.event(
						owner,
						{ id: owner },
						input.revoke ? "key.revoked" : "key.rotated",
					);
				});
				if (input.revoke) return send(200, { revoked: true });
				return send(201, { key, expires });
			}
			if (path === "/api/playbooks" && req.method === "GET")
				return send(200, store.list(owner, "playbook"));
			if (path === "/api/playbooks" && req.method === "POST") {
				const draft = validatePlaybook(await body(req));
				if (store.list(owner, "playbook").length >= 100)
					throw new Problem(429, "workspace_limit");
				const playbook = {
					...draft,
					id: randomUUID(),
					revision: 1,
					created: Date.now(),
					updated: Date.now(),
					published: null,
				};
				store.transaction(() => {
					store.put(owner, "playbook", playbook);
					store.event(owner, playbook, "playbook.created");
				});
				return send(201, playbook);
			}
			const playbookRoute = /^\/api\/playbooks\/([\w-]+)(\/publish)?$/.exec(
				path,
			);
			if (playbookRoute && ["PUT", "POST"].includes(req.method)) {
				const input = await body(req);
				const saved = store.transaction(() => {
					const p = store.get(owner, "playbook", playbookRoute[1]);
					if (!p) throw new Problem(404, "not_found");
					if (p.revision !== input.revision)
						throw new Problem(409, "revision_conflict");
					if (playbookRoute[2] && req.method === "POST") {
						p.published = {
							name: p.name,
							steps: p.steps,
							version: (p.published?.version || 0) + 1,
						};
						p.publishedAt = Date.now();
					} else if (!playbookRoute[2] && req.method === "PUT")
						Object.assign(p, validatePlaybook(input));
					else throw new Problem(405, "method_not_allowed");
					p.revision++;
					p.updated = Date.now();
					store.event(
						owner,
						p,
						playbookRoute[2] ? "playbook.published" : "playbook.updated",
						String(p.revision),
					);
					return store.put(owner, "playbook", p);
				});
				return send(200, saved);
			}
			if (path === "/api/runs" && req.method === "GET")
				return send(200, store.list(owner, "run"));
			if (path === "/api/runs" && req.method === "POST") {
				const result = accept(
					store,
					owner,
					await body(req),
					req.headers["idempotency-key"],
				);
				return send(result.duplicate ? 200 : 202, result);
			}
			const runRoute =
				/^\/api\/runs\/([\w-]+)(\/(actions|replay|export))?$/.exec(path);
			if (runRoute) {
				const run = store.get(owner, "run", runRoute[1]);
				if (!run) throw new Problem(404, "not_found");
				if (
					req.method === "GET" &&
					(!runRoute[3] || runRoute[3] === "export")
				) {
					if (runRoute[3])
						res.setHeader(
							"Content-Disposition",
							`attachment; filename="opsweave-${run.id}.json"`,
						);
					return send(200, { ...run, events: store.events(owner, run.id) });
				}
				if (req.method === "POST" && runRoute[3] === "actions")
					return send(200, act(store, owner, run.id, await body(req)));
				if (req.method === "POST" && runRoute[3] === "replay") {
					await body(req);
					if (!["failed", "cancelled", "completed"].includes(run.status))
						throw new Problem(409, "invalid_transition");
					const result = accept(
						store,
						owner,
						run,
						req.headers["idempotency-key"],
						run.id,
					);
					return send(result.duplicate ? 200 : 202, result);
				}
			}
			throw new Problem(404, "not_found");
		} catch (error) {
			if (!(error instanceof Problem))
				console.error("request_failed", requestId);
			send(error instanceof Problem ? error.status : 500, {
				error: error instanceof Problem ? error.message : "internal_error",
				requestId,
			});
		}
	});
	server.requestTimeout = 15000;
	server.headersTimeout = 10000;
	return {
		server,
		store,
		close: () => {
			if (timer) clearInterval(timer);
			server.closeAllConnections();
			return new Promise((resolveClose) =>
				server.close(() => {
					store.close();
					resolveClose();
				}),
			);
		},
	};
}
if (
	process.argv[1] &&
	resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	process.umask(0o077);
	const configuredOrigin =
		process.env.PUBLIC_ORIGIN || "http://127.0.0.1:32320";
	const parsedOrigin = new URL(configuredOrigin);
	if (
		parsedOrigin.username ||
		parsedOrigin.password ||
		!["http:", "https:"].includes(parsedOrigin.protocol) ||
		parsedOrigin.pathname !== "/" ||
		parsedOrigin.search ||
		parsedOrigin.hash
	)
		throw new Error(
			"PUBLIC_ORIGIN must be an HTTP(S) origin without a path or credentials",
		);
	const origin = parsedOrigin.origin;
	if (
		process.env.NODE_ENV === "production" &&
		(!process.env.PUBLIC_ORIGIN || !origin.startsWith("https://"))
	)
		throw new Error("Production requires PUBLIC_ORIGIN=https://your-host");
	const app = createApp({
		database: process.env.DATABASE_PATH || resolve("data/opsweave.sqlite"),
		publicDir: resolve(process.env.PUBLIC_DIR || "dist/opsweave-public"),
		origin,
		secure: origin.startsWith("https://"),
	});
	const port = Number(process.env.PORT || 32320);
	app.server.listen(port, process.env.HOST || "127.0.0.1", () =>
		console.log(`OpsWeave listening on ${port}`),
	);
	for (const signal of ["SIGTERM", "SIGINT"])
		process.once(signal, async () => {
			await app.close();
			process.exit(0);
		});
}
