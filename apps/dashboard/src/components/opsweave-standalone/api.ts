export type Locale = "ru" | "en";
export type Step = {
	id: string;
	type: "note" | "task" | "approval" | "wait" | "resolve";
	title: string;
	condition: string;
	seconds: number;
	status?: string;
	due?: number;
	result?: string;
};
export type Playbook = {
	id: string;
	name: string;
	description: string;
	steps: Step[];
	revision: number;
	published: null | { name: string; version: number; steps: Step[] };
	updated: number;
};
export type Run = {
	id: string;
	title: string;
	service: string;
	severity: string;
	playbookId: string;
	playbookName: string;
	version: number;
	status: string;
	incidentStatus: string;
	created: number;
	updated: number;
	acknowledged?: number;
	resolved?: number;
	cursor: number;
	steps: Step[];
	parentId?: string;
	events?: {
		id: string;
		at: number;
		type: string;
		detail: string;
		seq: number;
	}[];
};
export class ApiError extends Error {
	constructor(
		public status: number,
		code: string,
	) {
		super(code);
	}
}
export async function api<T>(
	path: string,
	method = "GET",
	data?: unknown,
	key?: string,
): Promise<T> {
	let response: Response;
	try {
		response = await fetch(`/api${path}`, {
			method,
			headers: {
				...(data === undefined ? {} : { "Content-Type": "application/json" }),
				...(key ? { "Idempotency-Key": key } : {}),
			},
			body: data === undefined ? undefined : JSON.stringify(data),
		});
	} catch {
		throw new ApiError(0, "network_error");
	}
	const result = await response.json();
	if (!response.ok) throw new ApiError(response.status, result.error);
	return result;
}
const errors: Record<string, [string, string]> = {
	resolve_must_be_last: [
		"Переместите устранение инцидента в конец сценария.",
		"Move the resolve step to the end of the playbook.",
	],
	invalid_wait: [
		"Для таймера укажите от 1 до 86400 секунд.",
		"Timers must be between 1 and 86400 seconds.",
	],
	network_error: [
		"Нет соединения. Изменения не отправлены. Проверьте сеть и повторите.",
		"No connection. Changes were not sent. Check your network and retry.",
	],
	invalid_credentials: [
		"Неверная почта или пароль.",
		"Incorrect email or password.",
	],
	account_unavailable: [
		"Этот адрес уже используется. Войдите в аккаунт.",
		"This email is already used. Sign in instead.",
	],
	password_too_short: [
		"Нужно не менее 12 символов в пароле.",
		"Use at least 12 characters for your password.",
	],
	revision_conflict: [
		"Сценарий изменён в другом окне. Скопируйте свой текст и загрузите актуальную версию.",
		"This playbook changed in another window. Copy your edits and reload the latest version.",
	],
	published_playbook_required: [
		"Сначала опубликуйте сценарий.",
		"Publish the playbook first.",
	],
	invalid_transition: [
		"Состояние уже изменилось. Обновите данные и повторите.",
		"The state has changed. Refresh and try again.",
	],
	sign_in_required: [
		"Сессия завершена. Войдите снова.",
		"Your session expired. Sign in again.",
	],
	rate_limited: [
		"Слишком много запросов. Повторите через минуту.",
		"Too many requests. Try again in a minute.",
	],
	active_run_limit: [
		"Достигнут лимит 30 активных запусков. Завершите один из них.",
		"The limit of 30 active runs has been reached. Complete one first.",
	],
	invalid_input: [
		"Проверьте заполнение и длину полей.",
		"Check the required fields and their length.",
	],
};
export function errorText(error: unknown, locale: Locale) {
	return (
		errors[error instanceof Error ? error.message : ""]?.[
			locale === "ru" ? 0 : 1
		] ||
		(locale === "ru"
			? "Не удалось выполнить действие. Проверьте поля и повторите."
			: "The action failed. Check the fields and try again.")
	);
}
export const labels: Record<string, [string, string]> = {
	running: ["Выполняется", "Running"],
	waiting: ["Ожидает действия", "Waiting"],
	completed: ["Завершён", "Completed"],
	failed: ["Отклонён", "Rejected"],
	cancelled: ["Остановлен", "Cancelled"],
	pending: ["В очереди", "Pending"],
	condition_skipped: ["Пропущен по условию", "Condition skipped"],
	rejected: ["Отклонён", "Rejected"],
	open: ["Открыт", "Open"],
	acknowledged: ["Принят в работу", "Acknowledged"],
	resolved: ["Устранён", "Resolved"],
	critical: ["Критический", "Critical"],
	high: ["Высокий", "High"],
	medium: ["Средний", "Medium"],
	low: ["Низкий", "Low"],
	always: ["Всегда", "Always"],
	note: ["Запись в журнал", "Log entry"],
	task: ["Задача исполнителю", "Responder task"],
	approval: ["Согласование", "Approval"],
	wait: ["Ожидание", "Wait"],
	resolve: ["Устранение инцидента", "Resolve incident"],
	"incident.created": ["Инцидент создан", "Incident created"],
	"run.completed": ["Сценарий выполнен", "Run completed"],
	"run.replayed": ["Повторный запуск", "New replay attempt"],
	"step.skipped": ["Шаг пропущен по условию", "Step skipped by condition"],
	"step.task_requested": ["Требуется действие", "Action requested"],
	"step.approval_requested": ["Запрошено согласование", "Approval requested"],
	"step.timer_started": ["Таймер запущен", "Timer started"],
	"note.recorded": ["Запись добавлена", "Note recorded"],
	"incident.resolved": ["Инцидент устранён", "Incident resolved"],
	"step.completed": ["Шаг завершён", "Step completed"],
	"action.approve": ["Согласовано", "Approved"],
	"action.reject": ["Отказ в согласовании", "Approval rejected"],
	"action.complete": ["Задача выполнена", "Task completed"],
	"action.cancel": ["Запуск остановлен", "Run cancelled"],
	"action.acknowledge": ["Принят в работу", "Acknowledged"],
	"action.resolve": ["Инцидент устранён", "Incident resolved"],
};
export const label = (value: string, locale: Locale) =>
	labels[value]?.[locale === "ru" ? 0 : 1] || value;
export const date = (value: number, locale: Locale) =>
	new Date(value).toLocaleString(locale === "ru" ? "ru-RU" : "en-GB", {
		day: "numeric",
		month: "short",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});
