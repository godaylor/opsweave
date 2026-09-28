import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Guide, type GuideStep } from "./guide";
import {
	api,
	errorText,
	type Locale,
	type Playbook,
	type Run,
	type Step,
} from "./api";

export function trainingPlan(locale: Locale) {
	const t = (ru: string, en: string) => (locale === "ru" ? ru : en);
	const steps: Step[] = [
		{
			id: crypto.randomUUID(),
			type: "note",
			title: t(
				"Учебная история: в магазине не работает оплата",
				"Practice story: checkout is unavailable",
			),
			condition: "always",
			seconds: 0,
		},
		{
			id: crypto.randomUUID(),
			type: "task",
			title: t(
				"Учебный шаг: описать ошибку и сообщение ответственному специалисту",
				"Practice task: describe the error and your message to the responsible specialist",
			),
			condition: "always",
			seconds: 0,
		},
		{
			id: crypto.randomUUID(),
			type: "approval",
			title: t(
				"Подтвердить учебное решение: специалист проверил результат",
				"Confirm the practice decision: the specialist checked the outcome",
			),
			condition: "always",
			seconds: 0,
		},
		{
			id: crypto.randomUUID(),
			type: "wait",
			title: t(
				"Учебное ожидание — 5 секунд, без проверки сайта",
				"Practice wait — 5 seconds, no website checks",
			),
			condition: "always",
			seconds: 5,
		},
		{
			id: crypto.randomUUID(),
			type: "resolve",
			title: t(
				"Записать завершение учебного примера",
				"Record completion of the practice example",
			),
			condition: "always",
			seconds: 0,
		},
	];
	return {
		name: t(
			"Учебный план: не работает оплата",
			"Practice plan: checkout failure",
		),
		description: t(
			"Вымышленный магазин. Вы проходите инструкцию; приложение не проверяет платежи, не отправляет сообщения и не ремонтирует сервер.",
			"A fictional store. You follow instructions; the app does not check payments, send messages or repair a server.",
		),
		steps,
	};
}

type Training = {
	planId?: string;
	runId?: string;
	guideClosed?: boolean;
	key: string;
};
function readTraining(key: string): Training {
	try {
		const value = JSON.parse(localStorage.getItem(key) || "null");
		if (
			value &&
			typeof value.key === "string" &&
			(!value.planId || typeof value.planId === "string") &&
			(!value.runId || typeof value.runId === "string")
		)
			return value;
	} catch {}
	return { key: crypto.randomUUID() };
}

export default function Learn({
	locale,
	userId,
	renderRun,
}: {
	locale: Locale;
	userId: string;
	renderRun: (id: string) => React.ReactNode;
}) {
	const storageKey = `opsweave.training.v1.${userId}`;
	const [training, setTraining] = useState(() => readTraining(storageKey));
	const [showGuide, setShowGuide] = useState(() => !training.guideClosed);
	const [storageWarning, setStorageWarning] = useState(false);
	const trigger = useRef<HTMLButtonElement>(null);
	const query = useQueryClient();
	const t = (ru: string, en: string) => (locale === "ru" ? ru : en);
	const remember = (next: Training) => {
		setTraining(next);
		try {
			localStorage.setItem(storageKey, JSON.stringify(next));
		} catch {
			setStorageWarning(true);
		}
	};
	const closeGuide = () => {
		setShowGuide(false);
		remember({ ...training, guideClosed: true });
		requestAnimationFrame(() => trigger.current?.focus());
	};
	const prepare = useMutation({
		mutationFn: async () => {
			let plan: Playbook;
			if (training.planId) {
				const plans = await api<Playbook[]>("/playbooks");
				const found = plans.find((p) => p.id === training.planId);
				if (!found) throw new Error("training_unavailable");
				plan = found;
			} else {
				plan = await api<Playbook>("/playbooks", "POST", trainingPlan(locale));
				remember({ ...training, planId: plan.id });
			}
			if (!plan.published)
				plan = await api<Playbook>(`/playbooks/${plan.id}/publish`, "POST", {
					revision: plan.revision,
				});
			return plan;
		},
		onSuccess: () => query.invalidateQueries({ queryKey: ["playbooks"] }),
	});
	const start = useMutation({
		mutationFn: () =>
			api<{ run: Run }>(
				"/runs",
				"POST",
				{
					playbookId: training.planId,
					title: t(
						"Учебный инцидент: оплата недоступна",
						"Practice incident: checkout unavailable",
					),
					service: "training-store",
					severity: "high",
				},
				training.key,
			),
		onSuccess: ({ run }) => {
			remember({ ...training, runId: run.id });
			query.invalidateQueries({ queryKey: ["runs"] });
		},
	});
	const steps: GuideStep[] = [
		{
			title: t("1. Откройте учебный план", "1. Open the practice plan"),
			text: t(
				"Нажмите «Открыть учебный план». Создастся отдельная учебная копия в вашем пространстве; рабочие планы останутся прежними.",
				"Choose Open practice plan. This creates a separate practice copy in your workspace and leaves work plans unchanged.",
			),
			target: "[data-learn='prepare']",
		},
		{
			title: t("2. Начните выполнение", "2. Start the plan"),
			text: t(
				"Нажмите «Начать учебное выполнение». Появится запись об учебном сбое, а сервер сохранит порядок шагов.",
				"Choose Start practice execution. A practice incident is recorded and the server saves its step sequence.",
			),
			target: "[data-learn='start']",
		},
		{
			title: t("3. Запишите результат задачи", "3. Record the task result"),
			text: t(
				"Введите учебную заметку в «Результат или обоснование», затем отметьте задачу выполненной. В реальной работе сначала действуете вы или специалист; приложение только фиксирует результат.",
				"Enter a practice note in Outcome or reason, then mark the task complete. In real work you or a specialist act first; the app only records the result.",
			),
			target: "[data-learn='task'] textarea",
		},
		{
			title: t("4. Дайте подтверждение", "4. Give confirmation"),
			text: t(
				"Запишите основание решения и нажмите «Подтвердить и продолжить». Без этого следующий шаг заблокирован. «Отклонить» останавливает выполнение.",
				"Record your reason and choose Confirm and continue. The next step stays blocked until then. Reject stops execution.",
			),
			target: "[data-learn='approval'] textarea",
		},
		{
			title: t("5. Дождитесь таймера", "5. Wait for the timer"),
			text: t(
				"Посмотрите состояние выполнения. В примере пауза 5 секунд: это не автоматическая проверка оплаты. После сна бесплатного сервера продолжение может задержаться.",
				"Check the execution state. This example pauses for 5 seconds; it does not automatically test checkout. A sleeping free server can delay continuation.",
			),
			target: "[data-learn='result']",
		},
		{
			title: t("6. Откройте историю", "6. Open history"),
			text: t(
				"Посмотрите «Историю»: там время, решения и ваши заметки. Обновление страницы не удаляет сохранённые шаги.",
				"Read History for times, decisions and your notes. Refreshing the page does not remove saved steps.",
			),
			target: "[data-learn='history']",
		},
		{
			title: t("7. Выгрузите результат", "7. Export the result"),
			text: t(
				"Нажмите «Выгрузить JSON». Файл содержит результат и историю только этого выполнения. Учебная запись останется в вашем пространстве.",
				"Choose Export JSON. The file contains the result and history of this execution only. The practice record stays in your workspace.",
			),
			target: "[data-learn='export']",
		},
	];
	return (
		<section className="training-page">
			<div className="section-heading">
				<div>
					<p className="eyebrow">{t("УЧЕБНЫЙ ПРИМЕР", "PRACTICE EXAMPLE")}</p>
					<h1>
						{t(
							"В магазине не работает оплата",
							"Checkout is unavailable in a store",
						)}
					</h1>
				</div>
				<button
					ref={trigger}
					onClick={() => {
						remember({ ...training, guideClosed: false });
						setShowGuide(true);
					}}
				>
					{t("Повторить подсказки", "Restart guide")}
				</button>
			</div>
			<p className="training-explanation">
				{t(
					"Вымышленная история. Никаких реальных платежей, проверок сайта или сообщений. Вы проходите инструкцию и записываете учебные решения. Кнопки подсказок не выполняют шаги за вас.",
					"A fictional story. No real payments, website checks or messages. You follow instructions and record practice decisions. Guide buttons do not perform the steps for you.",
				)}
			</p>
			<p className="small muted">
				{t(
					"Копия и история сохраняются на сервере только в вашем пространстве, не сбрасываются при обновлении и не видны другим посетителям. Доступ гостя — по cookie этого браузера на 7 дней; регистрация сохраняет доступ. При потере ссылки на пример найдите его в «Инцидентах».",
					"The copy and history are saved on the server in your workspace only, survive refresh and are not shared with other visitors. Guest access uses this browser’s cookie for 7 days; registration keeps access. If you lose the example shortcut, find it in Incidents.",
				)}
			</p>
			{showGuide && (
				<Guide locale={locale} steps={steps} onClose={closeGuide} />
			)}
			{storageWarning && (
				<output>
					{t(
						"Браузер не сохранил ссылку на пример. Сами записи сохранены на сервере: откройте «Инциденты».",
						"The browser could not save the example shortcut. Records are saved on the server: open Incidents.",
					)}
				</output>
			)}
			{!training.runId && (
				<div className="panel training-preview">
					<h2>{trainingPlan(locale).name}</h2>
					<ol>
						{trainingPlan(locale).steps.map((step) => (
							<li key={step.type}>{step.title}</li>
						))}
					</ol>
					<div className="actions">
						<button
							data-learn="prepare"
							disabled={prepare.isPending || !!prepare.data}
							onClick={() => prepare.mutate()}
						>
							{prepare.isPending
								? t("Открываем…", "Opening…")
								: prepare.data
									? t("Учебный план открыт", "Practice plan open")
									: t("Открыть учебный план", "Open practice plan")}
						</button>
						<button
							data-learn="start"
							className="primary"
							disabled={!prepare.data || start.isPending}
							onClick={() => start.mutate()}
						>
							{start.isPending
								? t("Начинаем…", "Starting…")
								: t("Начать учебное выполнение", "Start practice execution")}
						</button>
					</div>
					{(prepare.error || start.error) && (
						<p role="alert" className="error">
							{errorText(prepare.error || start.error, locale)}
						</p>
					)}
				</div>
			)}
			{training.runId && renderRun(training.runId)}
		</section>
	);
}
