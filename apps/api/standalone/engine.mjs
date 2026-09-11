import { randomUUID, createHash } from "node:crypto";

export class Problem extends Error {
	constructor(status, code) {
		super(code);
		this.status = status;
	}
}
export function text(value, max = 160) {
	if (typeof value !== "string" || !value.trim() || value.length > max)
		throw new Problem(400, "invalid_input");
	return value.trim();
}
export function validatePlaybook(input) {
	const name = text(input.name, 100);
	if (
		!Array.isArray(input.steps) ||
		input.steps.length < 1 ||
		input.steps.length > 50
	)
		throw new Problem(400, "invalid_steps");
	const steps = input.steps.map((step) => {
		if (!step || typeof step !== "object")
			throw new Problem(400, "invalid_step");
		if (!["note", "task", "approval", "wait", "resolve"].includes(step.type))
			throw new Problem(400, "invalid_step_type");
		const condition = step.condition || "always";
		if (!["always", "critical", "high", "medium", "low"].includes(condition))
			throw new Problem(400, "invalid_condition");
		const seconds = step.type === "wait" ? Number(step.seconds) : 0;
		if (
			!Number.isInteger(seconds) ||
			seconds < 0 ||
			seconds > 86400 ||
			(step.type === "wait" && seconds < 1)
		)
			throw new Problem(400, "invalid_wait");
		return {
			id: randomUUID(),
			type: step.type,
			title: text(step.title, 240),
			condition,
			seconds,
		};
	});
	if (
		steps.some((step, i) => step.type === "resolve" && i !== steps.length - 1)
	)
		throw new Problem(400, "resolve_must_be_last");
	return {
		name,
		description:
			typeof input.description === "string"
				? input.description.slice(0, 1000)
				: "",
		steps,
	};
}
export function accept(store, owner, input, key, parentId = null) {
	const title = text(input.title);
	const service = text(input.service, 100);
	if (!["critical", "high", "medium", "low"].includes(input.severity))
		throw new Problem(400, "invalid_severity");
	text(key, 120);
	const digest = createHash("sha256")
		.update(
			JSON.stringify([
				title,
				service,
				input.severity,
				input.playbookId,
				parentId,
			]),
		)
		.digest("hex");
	return store.transaction(() => {
		const prior = store.db
			.prepare("SELECT digest,run_id FROM acceptance WHERE owner=? AND key=?")
			.get(owner, key);
		if (prior) {
			if (prior.digest !== digest)
				throw new Problem(409, "idempotency_conflict");
			return { run: store.get(owner, "run", prior.run_id), duplicate: true };
		}
		const playbook = store.get(owner, "playbook", input.playbookId);
		if (!playbook?.published)
			throw new Problem(404, "published_playbook_required");
		if (
			store
				.list(owner, "run")
				.filter((r) => ["running", "waiting"].includes(r.status)).length >= 30
		)
			throw new Problem(429, "active_run_limit");
		if (store.list(owner, "run").length >= 1000)
			throw new Problem(429, "workspace_limit");
		const run = {
			id: randomUUID(),
			title,
			service,
			severity: input.severity,
			playbookId: playbook.id,
			playbookName: playbook.published.name,
			version: playbook.published.version,
			status: "running",
			incidentStatus: "open",
			created: Date.now(),
			updated: Date.now(),
			cursor: 0,
			parentId,
			steps: playbook.published.steps.map((s) => ({ ...s, status: "pending" })),
		};
		store.put(owner, "run", run);
		store.db
			.prepare("INSERT INTO acceptance VALUES(?,?,?,?)")
			.run(owner, key, digest, run.id);
		store.event(owner, run, "incident.created", title);
		if (parentId) store.event(owner, run, "run.replayed", parentId);
		return { run, duplicate: false };
	});
}
export function tick(store) {
	store.transaction(() => {
		const rows = store.db
			.prepare(`SELECT owner,body FROM records WHERE kind='run' AND (
      json_extract(body,'$.status')='running' OR (
        json_extract(body,'$.status')='waiting' AND
        json_extract(body,'$.steps[' || json_extract(body,'$.cursor') || '].type')='wait' AND
        json_extract(body,'$.steps[' || json_extract(body,'$.cursor') || '].due')<=?
      )) ORDER BY json_extract(body,'$.updated') LIMIT 100`)
			.all(Date.now());
		for (const row of rows) {
			const run = JSON.parse(row.body);
			const step = run.steps[run.cursor];
			if (!step) {
				run.status = "completed";
				run.completed = Date.now();
				store.event(row.owner, run, "run.completed");
			} else if (step.status === "waiting" && step.type !== "wait") continue;
			else if (step.status === "waiting" && step.due > Date.now()) continue;
			else if (step.condition !== "always" && step.condition !== run.severity) {
				step.status = "condition_skipped";
				run.cursor++;
				store.event(row.owner, run, "step.skipped", step.title);
			} else if (["task", "approval"].includes(step.type)) {
				step.status = "waiting";
				step.started = Date.now();
				run.status = "waiting";
				store.event(row.owner, run, `step.${step.type}_requested`, step.title);
			} else if (step.type === "wait" && step.status === "pending") {
				step.status = "waiting";
				step.started = Date.now();
				step.due = Date.now() + step.seconds * 1000;
				run.status = "waiting";
				store.event(row.owner, run, "step.timer_started", step.title);
			} else {
				step.status = "completed";
				step.completed = Date.now();
				run.cursor++;
				run.status = "running";
				if (step.type === "resolve") {
					run.incidentStatus = "resolved";
					run.resolved = Date.now();
				}
				store.event(
					row.owner,
					run,
					step.type === "note"
						? "note.recorded"
						: step.type === "resolve"
							? "incident.resolved"
							: "step.completed",
					step.title,
				);
			}
			run.updated = Date.now();
			store.put(row.owner, "run", run);
		}
	});
}
export function act(store, owner, id, input) {
	return store.transaction(() => {
		const run = store.get(owner, "run", id);
		if (!run) throw new Problem(404, "not_found");
		const step = run.steps[run.cursor];
		if (input.action === "acknowledge") {
			if (run.incidentStatus !== "open")
				throw new Problem(409, "invalid_transition");
			run.incidentStatus = "acknowledged";
			run.acknowledged = Date.now();
		} else if (input.action === "resolve") {
			if (run.status !== "completed" || run.incidentStatus === "resolved")
				throw new Problem(409, "complete_run_first");
			run.incidentStatus = "resolved";
			run.resolved = Date.now();
		} else if (input.action === "cancel") {
			if (!["running", "waiting"].includes(run.status))
				throw new Problem(409, "invalid_transition");
			run.status = "cancelled";
			run.completed = Date.now();
		} else if (["approve", "reject", "complete"].includes(input.action)) {
			if (
				run.status !== "waiting" ||
				!step ||
				step.status !== "waiting" ||
				step.id !== input.stepId ||
				(step.type === "task"
					? input.action !== "complete"
					: step.type !== "approval" || input.action === "complete")
			)
				throw new Problem(409, "invalid_transition");
			step.result = text(input.reason, 500);
			step.completed = Date.now();
			step.status = input.action === "reject" ? "rejected" : "completed";
			if (input.action === "reject") {
				run.status = "failed";
				run.completed = Date.now();
			} else {
				run.cursor++;
				run.status = "running";
			}
		} else throw new Problem(400, "invalid_action");
		store.event(
			owner,
			run,
			`action.${input.action}`,
			input.reason ? text(input.reason, 500) : "",
		);
		run.updated = Date.now();
		return store.put(owner, "run", run);
	});
}
