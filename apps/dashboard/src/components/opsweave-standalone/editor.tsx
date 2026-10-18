import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	api,
	errorText,
	label,
	type Locale,
	type Playbook,
	type Step,
} from "./api";

type Draft = { name: string; description: string; steps: Step[] };
function recoveryDraft(locale: Locale): Draft {
	const t = (ru: string, en: string) => (locale === "ru" ? ru : en);
	return {
		name: t("Восстановление сервиса", "Service recovery"),
		description: t(
			"Проверка, подтверждение, контроль и устранение.",
			"Investigate, confirm, verify and resolve.",
		),
		steps: [
			{
				id: crypto.randomUUID(),
				type: "note",
				title: t("Начато восстановление сервиса", "Service recovery started"),
				condition: "always",
				seconds: 0,
			},
			{
				id: crypto.randomUUID(),
				type: "task",
				title: t(
					"Проверить метрики и определить причину сбоя",
					"Check metrics and identify the cause",
				),
				condition: "always",
				seconds: 0,
			},
			{
				id: crypto.randomUUID(),
				type: "approval",
				title: t(
					"Подтвердить восстановительные действия",
					"Confirm recovery actions",
				),
				condition: "always",
				seconds: 0,
			},
			{
				id: crypto.randomUUID(),
				type: "wait",
				title: t("Наблюдать за стабильностью", "Observe stability"),
				condition: "always",
				seconds: 5,
			},
			{
				id: crypto.randomUUID(),
				type: "resolve",
				title: t("Зафиксировать восстановление", "Record recovery"),
				condition: "always",
				seconds: 0,
			},
		],
	};
}

export default function Editor({
	locale,
	playbook,
	close,
	fromTemplate = false,
	start,
}: {
	locale: Locale;
	playbook?: Playbook;
	close: () => void;
	fromTemplate?: boolean;
	start: (id: string) => void;
}) {
	const t = (ru: string, en: string) => (locale === "ru" ? ru : en);
	const query = useQueryClient();
	const [saved, setSaved] = useState(playbook);
	const [notice, setNotice] = useState("");
	const [outlineOpen, setOutlineOpen] = useState(() => innerWidth > 850);
	const {
		register,
		control,
		handleSubmit,
		reset,
		formState: { isDirty },
	} = useForm<Draft>({
		defaultValues:
			playbook ||
			(fromTemplate
				? recoveryDraft(locale)
				: {
						name: "",
						description: "",
						steps: [
							{
								id: crypto.randomUUID(),
								type: "task",
								title: "",
								condition: "always",
								seconds: 0,
							},
						],
					}),
	});
	const { fields, append, remove, move } = useFieldArray({
		control,
		name: "steps",
	});
	const draftSteps = useWatch({ control, name: "steps" }) || [];
	const save = useMutation({
		mutationFn: async (draft: Draft) =>
			saved
				? api<Playbook>(`/playbooks/${saved.id}`, "PUT", {
						...draft,
						revision: saved.revision,
					})
				: api<Playbook>("/playbooks", "POST", draft),
		onSuccess: (p) => {
			setSaved(p);
			if (new URLSearchParams(location.search).get("page") === "editor") {
				history.replaceState(null, "", `?page=editor&id=${p.id}`);
			}
			reset(p);
			setNotice(t("Черновик сохранён", "Draft saved"));
			query.invalidateQueries({ queryKey: ["playbooks"] });
		},
	});
	const publish = useMutation({
		mutationFn: () => {
			if (!saved) throw new Error("published_playbook_required");
			return api<Playbook>(`/playbooks/${saved.id}/publish`, "POST", {
				revision: saved.revision,
			});
		},
		onSuccess: (p) => {
			setSaved(p);
			reset(p);
			setNotice(t("Инструкция готова к запуску.", "Instruction ready to run."));
			// The acknowledged version must be available before the launch form opens.
			query.setQueryData<Playbook[]>(["playbooks"], (items) =>
				items ? items.map((item) => (item.id === p.id ? p : item)) : [p],
			);
			query.invalidateQueries({ queryKey: ["playbooks"] });
		},
	});
	const template = () =>
		reset(recoveryDraft(locale), { keepDefaultValues: true });
	return (
		<section className="editor">
			<div className="section-heading">
				<div>
					<p className="eyebrow">{t("ИНСТРУКЦИЯ", "INSTRUCTION")}</p>
					<h1>
						{saved ? saved.name : t("Новая инструкция", "New instruction")}
					</h1>
					<p className="muted">
						{t(
							"Задайте порядок действий. Сохраните и опубликуйте для запуска.",
							"Steps run in order. Tasks and confirmations wait for your decision.",
						)}
					</p>
				</div>
				<button
					onClick={(event) => {
						if (
							!isDirty ||
							window.confirm(
								t(
									"Выйти без сохранения изменений?",
									"Leave without saving changes?",
								),
							)
						)
							close();
						else event.currentTarget.focus();
					}}
				>
					{t("Закрыть", "Close")}
				</button>
			</div>
			<form
				onSubmit={handleSubmit((data) => save.mutate(data))}
				onChange={() => setNotice("")}
				aria-busy={save.isPending || publish.isPending}
			>
				<fieldset
					className="editor-fields"
					disabled={save.isPending || publish.isPending}
				>
					<div className="editor-toolbar">
						<output
							className="save-state"
							data-save={
								save.error
									? "error"
									: save.isPending
										? "saving"
										: isDirty
											? "dirty"
											: saved
												? "saved"
												: "new"
							}
							aria-live="polite"
						>
							{save.isPending
								? t("Сохраняем…", "Saving…")
								: isDirty
									? t("Есть несохранённые изменения", "Unsaved changes")
									: saved
										? t("Сохранено на сервере", "Saved to server")
										: t("Новый черновик", "New draft")}
						</output>
						<div className="actions">
							{!saved && !fromTemplate && (
								<button type="button" onClick={template}>
									{t(
										"Взять за основу: восстановление",
										"Use recovery template",
									)}
								</button>
							)}
							<button
								className="primary"
								type="submit"
								disabled={save.isPending || publish.isPending}
							>
								{t("Сохранить", "Save")}
							</button>
							<button
								type="button"
								disabled={
									!saved || isDirty || save.isPending || publish.isPending
								}
								onClick={() => publish.mutate()}
							>
								{publish.isPending
									? t("Публикуем…", "Publishing…")
									: t("Опубликовать", "Publish")}
							</button>
						</div>
					</div>
					{(save.error || publish.error) && (
						<div role="alert" className="error">
							{errorText(save.error || publish.error, locale)}
						</div>
					)}
					{notice && !(saved?.published && !isDirty) && (
						<output className="success" aria-live="polite">
							{notice}
						</output>
					)}
					{saved?.published && !isDirty && (
						<div className="published-action">
							<span>
								{notice ||
									t("Опубликованная версия готова", "Published version ready")}
							</span>
							<button
								type="button"
								className="primary"
								onClick={() => start(saved.id)}
							>
								{t("Запустить инструкцию", "Run instruction")} →
							</button>
						</div>
					)}
					<div className="editor-layout">
						<div className="steps-editor">
							<div className="panel form-grid">
								<label>
									{t("Название инструкции", "Instruction name")}
									<input
										required
										maxLength={100}
										placeholder={t(
											"Например, восстановление API",
											"For example, API recovery",
										)}
										aria-label={t("Название инструкции", "Instruction name")}
										{...register("name", { required: true })}
									/>
									<small className="muted">
										{t(
											"Название для списка и запуска.",
											"Use this name to choose the plan when creating an incident.",
										)}
									</small>
								</label>
								<label>
									{t("Когда использовать", "When to use")}
									<textarea
										maxLength={1000}
										placeholder={t(
											"Что произошло и какой результат нужен",
											"What happened and the expected outcome",
										)}
										aria-label={t("Когда использовать", "When to use")}
										{...register("description")}
									/>
									<small className="muted">
										{t(
											"Ситуация и ожидаемый результат.",
											"The description helps you choose a plan; it does not change the step order.",
										)}
									</small>
								</label>
							</div>
							<details className="panel step-help">
								<summary>
									{t("Справка по типам шагов", "Step type reference")}
								</summary>
								<h2>{t("Что делает тип шага", "What each step type does")}</h2>
								<p>
									{t(
										"Задача ждёт отметки о выполненном человеком действии. Подтверждение требует решения: продолжить или остановить план. Запись добавляет текст в историю автоматически. Ожидание ставит таймер, не проверяя сайт. Устранение только отмечает инцидент решённым — ремонт выполняется вне приложения.",
										"A task waits for a person to mark an action done. Confirmation requires a decision to continue or stop. A log entry automatically records text. Wait starts a timer without checking the website. Resolve only marks the incident resolved — repairs happen outside the app.",
									)}
								</p>
							</details>
							<ol className="step-list">
								{fields.map((field, index) => (
									<li
										key={field.id}
										className="step-card"
										id={`editor-step-${field.id}`}
									>
										<div className="step-number">{index + 1}</div>
										<div className="step-fields">
											<div className="step-top">
												<label>
													{t("Тип шага", "Step type")}
													<select {...register(`steps.${index}.type`)}>
														{[
															"note",
															"task",
															"approval",
															"wait",
															"resolve",
														].map((type) => (
															<option key={type} value={type}>
																{label(type, locale)}
															</option>
														))}
													</select>
												</label>
												<div className="actions">
													<button
														type="button"
														aria-label={t(
															`Переместить шаг ${index + 1} вверх`,
															`Move step ${index + 1} up`,
														)}
														disabled={index === 0}
														onClick={() => move(index, index - 1)}
													>
														↑
													</button>
													<button
														type="button"
														aria-label={t(
															`Переместить шаг ${index + 1} вниз`,
															`Move step ${index + 1} down`,
														)}
														disabled={index === fields.length - 1}
														onClick={() => move(index, index + 1)}
													>
														↓
													</button>
													<button
														type="button"
														disabled={fields.length === 1}
														onClick={() => remove(index)}
														aria-label={t(
															`Удалить шаг ${index + 1}`,
															`Remove step ${index + 1}`,
														)}
													>
														×
													</button>
												</div>
											</div>
											<label>
												{t("Действие или сообщение", "Action or message")}
												<input
													required
													maxLength={240}
													placeholder={t(
														"Что нужно сделать?",
														"What needs to happen?",
													)}
													{...register(`steps.${index}.title`, {
														required: true,
													})}
												/>
											</label>
											<details className="step-options">
												<summary>
													{t("Условия и параметры", "Conditions and options")}
												</summary>
												<div className="form-columns">
													<label>
														{t("Выполнить при приоритете", "Run for severity")}
														<small className="muted">
															{t(
																"Другой приоритет пропустит этот шаг.",
																"A different severity skips this step.",
															)}
														</small>
														<select {...register(`steps.${index}.condition`)}>
															{[
																"always",
																"critical",
																"high",
																"medium",
																"low",
															].map((c) => (
																<option key={c} value={c}>
																	{label(c, locale)}
																</option>
															))}
														</select>
													</label>
													<label>
														{t("Для таймера: секунды", "For timers: seconds")}
														<small className="muted">
															{t(
																"Только для ожидания: 1–86400. У других типов поле не используется.",
																"Only for Wait: 1–86400. Other step types ignore this field.",
															)}
														</small>
														<input
															type="number"
															min={0}
															max={86400}
															{...register(`steps.${index}.seconds`, {
																valueAsNumber: true,
															})}
														/>
													</label>
												</div>
											</details>
										</div>
									</li>
								))}
							</ol>
							<button
								type="button"
								className="add-step"
								disabled={fields.length >= 50}
								onClick={() =>
									append({
										id: crypto.randomUUID(),
										type: "task",
										title: "",
										condition: "always",
										seconds: 0,
									})
								}
							>
								+ {t("Добавить шаг", "Add step")}
							</button>
						</div>
						<aside className="guide panel">
							<details
								className="outline-overview"
								open={outlineOpen}
								onToggle={(event) => setOutlineOpen(event.currentTarget.open)}
							>
								<summary>
									{t("Маршрут", "Outline")}{" "}
									<span>
										{fields.length} {t("шагов", "steps")}
									</span>
								</summary>
								<ol
									className="editor-outline"
									aria-label={t("Порядок шагов", "Step order")}
								>
									{fields.map((field, index) => (
										<li key={field.id}>
											<button
												type="button"
												onClick={() => {
													const row = document.getElementById(
														`editor-step-${field.id}`,
													);
													row?.scrollIntoView({
														behavior:
															matchMedia("(prefers-reduced-motion: reduce)")
																.matches ||
															document.documentElement.dataset.motion ===
																"paused"
																? "instant"
																: "smooth",
														block: "center",
													});
													row
														?.querySelector<HTMLInputElement>(
															'input[name$=".title"]',
														)
														?.focus({ preventScroll: true });
												}}
											>
												<span className="outline-index">
													{String(index + 1).padStart(2, "0")}
												</span>
												<span>
													<b>
														{draftSteps[index]?.title ||
															label(draftSteps[index]?.type || "task", locale)}
													</b>
													<small>
														{label(draftSteps[index]?.type || "task", locale)}
													</small>
												</span>
											</button>
										</li>
									))}
								</ol>
							</details>
							<details>
								<summary>
									{t("Как работает выполнение", "How execution works")}
								</summary>
								<p className="eyebrow">
									{t("ЛОГИКА ВЫПОЛНЕНИЯ", "EXECUTION LOGIC")}
								</p>
								<h2>
									{t("От сигнала к результату", "From signal to outcome")}
								</h2>
								<p>
									{t(
										"Выполнение плана использует опубликованную версию. Изменение черновика не затронет текущие инциденты.",
										"Plan executions use the published version. Draft changes do not affect current incidents.",
									)}
								</p>
								<div className="guide-line">
									<b>1</b>
									<span>
										{t(
											"Сохраните и опубликуйте план",
											"Save and publish the action plan",
										)}
									</span>
								</div>
								<div className="guide-line">
									<b>2</b>
									<span>
										{t(
											"Создайте инцидент и выберите план",
											"Create an incident and choose the action plan",
										)}
									</span>
								</div>
								<div className="guide-line">
									<b>3</b>
									<span>
										{t(
											"Выполняйте задачи в центре реагирования",
											"Complete tasks in the response center",
										)}
									</span>
								</div>
								<hr />
								<p>
									{t(
										"Условие проверяет приоритет инцидента. Неподходящий шаг пропускается. Параллельного выполнения нет.",
										"Conditions check incident severity. Non-matching steps are skipped. Execution is sequential.",
									)}
								</p>
								<p>
									{t(
										"Таймер: от 1 секунды до 24 часов. Шаг устранения размещайте последним.",
										"Timers: 1 second to 24 hours. Put the resolve step last.",
									)}
								</p>
							</details>
						</aside>
					</div>
				</fieldset>
			</form>
		</section>
	);
}
