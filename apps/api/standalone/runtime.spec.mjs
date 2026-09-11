import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { createApp } from "./server.mjs";
import { tick } from "./engine.mjs";

const draft = (
	steps = [
		{ type: "note", title: "Record investigation", condition: "always" },
		{ type: "task", title: "Check recovery", condition: "always" },
		{ type: "approval", title: "Approve recovery", condition: "always" },
		{ type: "wait", title: "Observe", seconds: 1 },
		{ type: "resolve", title: "Resolve" },
	],
) => ({ name: "Recovery", description: "Real response", steps });
describe("Original standalone runtime (isolated SQLite, no CE services)", () => {
	let app;
	let base;
	let directory;
	async function start(database = join(directory, "test.sqlite")) {
		for (let port = 32340; port <= 32359; port++) {
			const candidate = createApp({
				database,
				origin: `http://127.0.0.1:${port}`,
				startWorker: false,
			});
			try {
				await new Promise((resolve, reject) => {
					candidate.server.once("error", reject);
					candidate.server.listen(port, "127.0.0.1", resolve);
				});
				app = candidate;
				base = `http://127.0.0.1:${port}`;
				return;
			} catch (e) {
				candidate.store.close();
				if (e.code !== "EADDRINUSE") throw e;
			}
		}
		throw new Error("No isolated OpsWeave test port available");
	}
	beforeEach(async () => {
		directory = mkdtempSync(join(tmpdir(), "opsweave-unit-"));
		await start();
	});
	afterEach(async () => {
		await app.close();
		rmSync(directory, { recursive: true, force: true });
	});
	async function request(path, method = "GET", data, cookie, key, extra = {}) {
		const result = await fetch(`${base}/api${path}`, {
			method,
			headers: {
				Origin: base,
				...(cookie ? { Cookie: cookie } : {}),
				...(data === undefined ? {} : { "Content-Type": "application/json" }),
				...(key ? { "Idempotency-Key": key } : {}),
				...extra,
			},
			body: data === undefined ? undefined : JSON.stringify(data),
		});
		return {
			status: result.status,
			data: await result.json(),
			cookie: result.headers.get("set-cookie")?.split(";")[0],
			headers: result.headers,
		};
	}
	async function guest() {
		const r = await request("/auth/guest", "POST", {});
		assert.equal(r.status, 201);
		return r;
	}
	async function publish(cookie, input = draft()) {
		const p = await request("/playbooks", "POST", input, cookie);
		assert.equal(p.status, 201);
		const result = await request(
			`/playbooks/${p.data.id}/publish`,
			"POST",
			{ revision: p.data.revision },
			cookie,
		);
		assert.equal(result.status, 200);
		return result.data;
	}
	async function run(cookie, p, key = randomUUID()) {
		return request(
			"/runs",
			"POST",
			{
				title: "Service unavailable",
				service: "api",
				severity: "high",
				playbookId: p.id,
			},
			cookie,
			key,
		);
	}
	it("runs a real task → approval → timer → resolution flow with durable events", async () => {
		const g = await guest();
		const p = await publish(g.cookie);
		const accepted = await run(g.cookie, p);
		assert.equal(accepted.status, 202);
		const id = accepted.data.run.id;
		tick(app.store);
		tick(app.store);
		let detail = await request(`/runs/${id}`, "GET", undefined, g.cookie);
		assert.equal(detail.data.status, "waiting");
		let r = await request(
			`/runs/${id}/actions`,
			"POST",
			{
				action: "complete",
				stepId: detail.data.steps[1].id,
				reason: "Metrics inspected",
			},
			g.cookie,
		);
		assert.equal(r.status, 200);
		tick(app.store);
		detail = await request(`/runs/${id}`, "GET", undefined, g.cookie);
		r = await request(
			`/runs/${id}/actions`,
			"POST",
			{
				action: "approve",
				stepId: detail.data.steps[2].id,
				reason: "Recovery verified",
			},
			g.cookie,
		);
		assert.equal(r.status, 200);
		tick(app.store);
		await new Promise((resolve) => setTimeout(resolve, 1050));
		tick(app.store);
		tick(app.store);
		tick(app.store);
		detail = await request(`/runs/${id}/export`, "GET", undefined, g.cookie);
		assert.equal(detail.data.status, "completed");
		assert.equal(detail.data.incidentStatus, "resolved");
		assert.ok(detail.data.events.some((e) => e.type === "action.approve"));
		assert.ok(detail.data.events.every((e) => e.correlationId === id));
	});
	it("recovers a waiting timer after process restart without duplicating effects", async () => {
		const g = await guest();
		const p = await publish(
			g.cookie,
			draft([
				{ type: "wait", title: "Wait", seconds: 1 },
				{ type: "resolve", title: "Resolve" },
			]),
		);
		const accepted = await run(g.cookie, p);
		tick(app.store);
		await app.close();
		await new Promise((resolve) => setTimeout(resolve, 1050));
		await start();
		tick(app.store);
		tick(app.store);
		tick(app.store);
		tick(app.store);
		const r = await request(
			`/runs/${accepted.data.run.id}`,
			"GET",
			undefined,
			g.cookie,
		);
		assert.equal(r.data.status, "completed");
		assert.equal(
			r.data.events.filter((e) => e.type === "incident.resolved").length,
			1,
		);
	});
	it("accepts concurrent duplicate requests atomically and rejects conflicting payloads", async () => {
		const g = await guest();
		const p = await publish(g.cookie);
		const key = randomUUID();
		const results = await Promise.all(
			Array.from({ length: 10 }, () => run(g.cookie, p, key)),
		);
		assert.equal(new Set(results.map((r) => r.data.run.id)).size, 1);
		assert.equal(results.filter((r) => r.status === 202).length, 1);
		assert.equal(
			(
				await request(
					"/runs",
					"POST",
					{
						title: "Different",
						service: "api",
						severity: "high",
						playbookId: p.id,
					},
					g.cookie,
					key,
				)
			).status,
			409,
		);
	});
	it("enforces tenant ownership on reads, writes, publish, actions, replay and export", async () => {
		const a = await guest();
		const b = await guest();
		const p = await publish(a.cookie);
		const r = await run(a.cookie, p);
		assert.deepEqual(
			(await request("/runs", "GET", undefined, b.cookie)).data,
			[],
		);
		assert.deepEqual(
			(await request("/playbooks", "GET", undefined, b.cookie)).data,
			[],
		);
		for (const suffix of ["", "/export"])
			assert.equal(
				(
					await request(
						`/runs/${r.data.run.id}${suffix}`,
						"GET",
						undefined,
						b.cookie,
					)
				).status,
				404,
			);
		for (const suffix of ["actions", "replay"])
			assert.equal(
				(
					await request(
						`/runs/${r.data.run.id}/${suffix}`,
						"POST",
						{ action: "cancel" },
						b.cookie,
						randomUUID(),
					)
				).status,
				404,
			);
		assert.equal(
			(
				await request(
					`/playbooks/${p.id}`,
					"PUT",
					{ ...draft(), revision: p.revision },
					b.cookie,
				)
			).status,
			404,
		);
		assert.equal(
			(
				await request(
					`/playbooks/${p.id}/publish`,
					"POST",
					{ revision: p.revision },
					b.cookie,
				)
			).status,
			404,
		);
		assert.equal((await run(b.cookie, p)).status, 404);
	});
	it("rejects stale revisions and keeps published execution snapshots immutable", async () => {
		const g = await guest();
		const p = await publish(g.cookie);
		const accepted = await run(g.cookie, p);
		const changed = await request(
			`/playbooks/${p.id}`,
			"PUT",
			{ ...draft([{ type: "note", title: "New step" }]), revision: p.revision },
			g.cookie,
		);
		assert.equal(changed.status, 200);
		assert.equal(
			(
				await request(
					`/playbooks/${p.id}`,
					"PUT",
					{ ...draft(), revision: p.revision },
					g.cookie,
				)
			).status,
			409,
		);
		const detail = await request(
			`/runs/${accepted.data.run.id}`,
			"GET",
			undefined,
			g.cookie,
		);
		assert.equal(detail.data.steps.length, 5);
	});
	it("blocks repeated decisions and preserves rejected runs when replaying", async () => {
		const g = await guest();
		const p = await publish(
			g.cookie,
			draft([{ type: "approval", title: "Approve" }]),
		);
		const r = await run(g.cookie, p);
		tick(app.store);
		const id = r.data.run.id;
		const input = {
			action: "reject",
			stepId: r.data.run.steps[0].id,
			reason: "Unsafe",
		};
		assert.equal(
			(await request(`/runs/${id}/actions`, "POST", input, g.cookie)).status,
			200,
		);
		assert.equal(
			(await request(`/runs/${id}/actions`, "POST", input, g.cookie)).status,
			409,
		);
		const replay = await request(
			`/runs/${id}/replay`,
			"POST",
			{},
			g.cookie,
			randomUUID(),
		);
		assert.equal(replay.status, 202);
		assert.equal(replay.data.run.parentId, id);
		assert.equal(
			(await request(`/runs/${id}`, "GET", undefined, g.cookie)).data.status,
			"failed",
		);
	});
	it("skips unmatched conditions and prevents a task decision from approving an approval", async () => {
		const g = await guest();
		const p = await publish(
			g.cookie,
			draft([
				{ type: "task", title: "Critical only", condition: "critical" },
				{ type: "approval", title: "Approve" },
			]),
		);
		const r = await run(g.cookie, p);
		tick(app.store);
		tick(app.store);
		const detail = await request(
			`/runs/${r.data.run.id}`,
			"GET",
			undefined,
			g.cookie,
		);
		assert.equal(detail.data.steps[0].status, "condition_skipped");
		assert.equal(
			(
				await request(
					`/runs/${r.data.run.id}/actions`,
					"POST",
					{
						action: "complete",
						stepId: detail.data.steps[1].id,
						reason: "Wrong action",
					},
					g.cookie,
				)
			).status,
			409,
		);
	});
	it("provides write-only scoped expiring API credentials and revocation", async () => {
		const g = await guest();
		const p = await publish(g.cookie);
		const key = await request("/keys", "POST", {}, g.cookie);
		const headers = { Authorization: `Bearer ${key.data.key}` };
		const payload = {
			title: "Alert",
			service: "api",
			severity: "high",
			playbookId: p.id,
		};
		assert.equal(
			(
				await request(
					"/ingest",
					"POST",
					payload,
					undefined,
					randomUUID(),
					headers,
				)
			).status,
			202,
		);
		assert.equal(
			(await request("/runs", "GET", undefined, undefined, undefined, headers))
				.status,
			401,
		);
		assert.ok(
			!JSON.stringify(
				(await request("/keys", "GET", undefined, g.cookie)).data,
			).includes(key.data.key),
		);
		await request("/keys", "POST", { revoke: true }, g.cookie);
		assert.equal(
			(
				await request(
					"/ingest",
					"POST",
					payload,
					undefined,
					randomUUID(),
					headers,
				)
			).status,
			401,
		);
	});
	it("claims guest data with an account, authenticates, expires and revokes sessions", async () => {
		const g = await guest();
		await publish(g.cookie);
		const credentials = {
			email: "user@example.test",
			password: "a-long-test-password-2026",
		};
		const account = await request(
			"/auth/register",
			"POST",
			credentials,
			g.cookie,
		);
		assert.equal(account.data.id, g.data.id);
		assert.equal(
			(
				await request("/auth/login", "POST", {
					...credentials,
					password: "wrong-long-password",
				})
			).status,
			401,
		);
		const login = await request("/auth/login", "POST", credentials);
		assert.equal(login.status, 200);
		assert.equal(
			(await request("/playbooks", "GET", undefined, login.cookie)).data.length,
			1,
		);
		assert.ok(
			!JSON.stringify(
				(await request("/auth/me", "GET", undefined, login.cookie)).data,
			).includes("password"),
		);
		await request("/auth/logout", "POST", {}, login.cookie);
		assert.equal(
			(await request("/auth/me", "GET", undefined, login.cookie)).status,
			401,
		);
		app.store.db.prepare("UPDATE sessions SET expires=0").run();
		assert.equal(
			(await request("/runs", "GET", undefined, account.cookie)).status,
			401,
		);
	});
	it("denies disabled accounts and cross-origin mutations without exposing secrets", async () => {
		const g = await guest();
		assert.equal(
			(
				await request("/playbooks", "POST", draft(), g.cookie, undefined, {
					Origin: "https://attacker.example",
				})
			).status,
			403,
		);
		app.store.db
			.prepare("UPDATE users SET disabled=1 WHERE id=?")
			.run(g.data.id);
		assert.equal(
			(await request("/playbooks", "POST", draft(), g.cookie)).status,
			401,
		);
		assert.equal((await request("/runs")).status, 401);
	});
	it("rejects malformed steps, invalid timers and early resolution", async () => {
		const g = await guest();
		for (const steps of [
			[null],
			[{ type: "wait", title: "Wait", seconds: -1 }],
			[
				{ type: "resolve", title: "Resolve" },
				{ type: "task", title: "Late task" },
			],
		])
			assert.equal(
				(await request("/playbooks", "POST", draft(steps), g.cookie)).status,
				400,
			);
	});
});
