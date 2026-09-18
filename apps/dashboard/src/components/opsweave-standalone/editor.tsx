import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
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
export default function Editor({
	locale,
	playbook,
	close,
}: {
	locale: Locale;
	playbook?: Playbook;
	close: () => void;
}) {
	const t = (ru: string, en: string) => (locale === "ru" ? ru : en);
	const query = useQueryClient();
	const [saved, setSaved] = useState(playbook);
	const [notice, setNotice] = useState("");
	const {
		register,
		control,
		handleSubmit,
		reset,
		formState: { isDirty },
	} = useForm<Draft>({
		defaultValues: playbook || {
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
		},
	});
	const { fields, append, remove, move } = useFieldArray({
		control,
		name: "steps",
	});
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
			setNotice(
				t(
					"Сценарий опубликован. Теперь можно запустить инцидент.",
					"Playbook published. You can now start an incident.",
				),
			);
			query.invalidateQueries({ queryKey: ["playbooks"] });
		},
	});
	const template = () =>
		reset(
			{
				name: t("Восстановление сервиса", "Service recovery"),
				description: t(
					"Проверка, согласование, контроль и устранение.",
					"Investigate, approve, verify and resolve.",
				),
				steps: [
					{
						id: crypto.randomUUID(),
						type: "note",
						title: t(
							"Начато восстановление сервиса",
							"Service recovery started",
						),
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
							"Согласовать восстановительные действия",
							"Approve recovery actions",
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
			},
			{ keepDefaultValues: true },
		);
	return (
		<section className="editor">
			<div className="section-heading">
				<div>
					<p className="eyebrow">{t("РЕДАКТОР СЦЕНАРИЯ", "PLAYBOOK EDITOR")}</p>
					<h1>
						{saved
							? saved.name
							: t("Как реагировать на сбой?", "How should the team respond?")}
					</h1>
					<p className="muted">
						{t(
							"Шаги выполняются по порядку. Задачи и согласования ждут вашего решения.",
							"Steps run in order. Tasks and approvals wait for your decision.",
						)}
					</p>
				</div>
				<button
					onClick={() => {
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
					}}
				>
					{t("Закрыть", "Close")}
				</button>
			</div>
			<form onSubmit={handleSubmit((data) => save.mutate(data))}>
				<div className="editor-toolbar">
					<output className="save-state">
						{save.isPending
							? t("Сохраняем…", "Saving…")
							: isDirty
								? t("Есть несохранённые изменения", "Unsaved changes")
								: saved
									? t("Сохранено на сервере", "Saved to server")
									: t("Новый черновик", "New draft")}
					</output>
					<div className="actions">
						{!saved && (
							<button type="button" onClick={template}>
								{t("Взять за основу: восстановление", "Use recovery template")}
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
				{notice && <output className="success">{notice}</output>}
				<div className="editor-layout">
					<div className="steps-editor">
						<div className="panel form-grid">
							<label>
								{t("Название сценария", "Playbook name")}
								<input
									required
									maxLength={100}
									placeholder={t(
										"Например, восстановление API",
										"For example, API recovery",
									)}
									{...register("name", { required: true })}
								/>
							</label>
							<label>
								{t("Когда использовать", "When to use")}
								<textarea
									maxLength={1000}
									placeholder={t(
										"Что произошло и какой результат нужен",
										"What happened and the expected outcome",
									)}
									{...register("description")}
								/>
							</label>
						</div>
						<ol className="step-list">
							{fields.map((field, index) => (
								<li key={field.id} className="step-card">
									<div className="step-number">{index + 1}</div>
									<div className="step-fields">
										<div className="step-top">
											<label>
												{t("Тип шага", "Step type")}
												<select {...register(`steps.${index}.type`)}>
													{["note", "task", "approval", "wait", "resolve"].map(
														(type) => (
															<option key={type} value={type}>
																{label(type, locale)}
															</option>
														),
													)}
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
										<div className="form-columns">
											<label>
												{t("Выполнить при приоритете", "Run for severity")}
												<select {...register(`steps.${index}.condition`)}>
													{["always", "critical", "high", "medium", "low"].map(
														(c) => (
															<option key={c} value={c}>
																{label(c, locale)}
															</option>
														),
													)}
												</select>
											</label>
											<label>
												{t("Для таймера: секунды", "For timers: seconds")}
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
						<p className="eyebrow">
							{t("ЛОГИКА ВЫПОЛНЕНИЯ", "EXECUTION LOGIC")}
						</p>
						<h2>{t("От сигнала к результату", "From signal to outcome")}</h2>
						<p>
							{t(
								"Запуск использует опубликованную версию. Изменение черновика не затронет текущие инциденты.",
								"Runs use the published version. Draft changes do not affect current incidents.",
							)}
						</p>
						<div className="guide-line">
							<b>1</b>
							<span>
								{t(
									"Сохраните и опубликуйте сценарий",
									"Save and publish the playbook",
								)}
							</span>
						</div>
						<div className="guide-line">
							<b>2</b>
							<span>
								{t(
									"Создайте инцидент и выберите сценарий",
									"Create an incident and choose the playbook",
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
					</aside>
				</div>
			</form>
		</section>
	);
}
