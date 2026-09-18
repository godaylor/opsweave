import { lazy, Suspense, useEffect, useId, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import {
	api,
	ApiError,
	date,
	errorText,
	label,
	type Locale,
	type Playbook,
	type Run,
} from "./api";
const Editor = lazy(() => import("./editor"));
type User = { id: string; email: string | null };
const nav = [
	["incidents", "◉", "Инциденты", "Incidents"],
	["playbooks", "⌘", "Сценарии", "Playbooks"],
	["analytics", "▥", "Аналитика", "Analytics"],
	["integrations", "↗", "Интеграции", "Integrations"],
	["account", "◎", "Аккаунт", "Account"],
];

export default function Product() {
	const mainId = useId();
	const [locale, setLocale] = useState<Locale>(() =>
		localStorage.getItem("opsweave.locale.v1") === "en" ? "en" : "ru",
	);
	const [route, setRoute] = useState(
		() => new URLSearchParams(location.search),
	);
	const query = useQueryClient();
	const t = (ru: string, en: string) => (locale === "ru" ? ru : en);
	useEffect(() => {
		document.documentElement.lang = locale;
		localStorage.setItem("opsweave.locale.v1", locale);
	}, [locale]);
	useEffect(() => {
		const update = () => setRoute(new URLSearchParams(location.search));
		window.addEventListener("popstate", update);
		return () => window.removeEventListener("popstate", update);
	}, []);
	const navigate = (page: string, id?: string) => {
		const next = new URLSearchParams({ page });
		if (id) next.set("id", id);
		history.pushState(null, "", `?${next}`);
		setRoute(next);
		document.getElementById(mainId)?.focus();
	};
	const me = useQuery({
		queryKey: ["me"],
		queryFn: () => api<User>("/auth/me"),
		staleTime: 60000,
	});
	const playbooks = useQuery({
		queryKey: ["playbooks"],
		queryFn: () => api<Playbook[]>("/playbooks"),
		enabled: !!me.data,
	});
	const runs = useQuery({
		queryKey: ["runs"],
		queryFn: () => api<Run[]>("/runs"),
		enabled: !!me.data,
		refetchInterval: 2000,
	});
	const logout = useMutation({
		mutationFn: () => api("/auth/logout", "POST", {}),
		onSuccess: () => {
			query.clear();
			navigate("incidents");
			location.reload();
		},
	});
	const page = route.get("page") || "incidents";
	const id = route.get("id");
	const changeLocale = (
		<button
			className="locale"
			onClick={() => setLocale(locale === "ru" ? "en" : "ru")}
			aria-label={t("Switch to English", "Переключить на русский")}
		>
			{locale === "ru" ? "EN" : "RU"}
		</button>
	);
	if (me.isPending)
		return (
			<div className="initial-loading" aria-busy="true">
				OpsWeave
				<span>{t("Открываем пространство…", "Opening workspace…")}</span>
			</div>
		);
	if (!me.data)
		return (
			<Auth
				locale={locale}
				localeButton={changeLocale}
				onSuccess={() => {
					query.clear();
					me.refetch();
				}}
				error={
					me.error instanceof ApiError && me.error.status === 401
						? undefined
						: me.error
				}
			/>
		);
	const dataError = playbooks.error || runs.error;
	return (
		<div className="app-shell">
			<a className="skip-link" href={`#${mainId}`}>
				{t("Перейти к содержимому", "Skip to content")}
			</a>
			<aside className="sidebar">
				<a
					className="brand"
					href="?page=incidents"
					onClick={(e) => {
						e.preventDefault();
						navigate("incidents");
					}}
				>
					<span className="brand-mark">W</span>OpsWeave
					<span className="brand-dot" />
				</a>
				<div className="workspace">
					<span className="workspace-avatar">
						{me.data.email?.[0]?.toUpperCase() || "O"}
					</span>
					<div>
						<b>{t("Моё пространство", "My workspace")}</b>
						<small>
							{me.data.email ||
								t("Гостевой доступ · 7 дней", "Guest session · 7 days")}
						</small>
					</div>
				</div>
				<p className="nav-label">{t("РЕАГИРОВАНИЕ", "RESPONSE")}</p>
				<nav>
					{nav.map(([key, icon, ru, en]) => (
						<a
							key={key}
							href={`?page=${key}`}
							aria-current={
								page === key || (page === "editor" && key === "playbooks")
									? "page"
									: undefined
							}
							onClick={(e) => {
								e.preventDefault();
								navigate(key);
							}}
						>
							<span aria-hidden="true">{icon}</span>
							{t(ru, en)}
							{key === "incidents" && (
								<em>
									{runs.data?.filter((r) => r.incidentStatus !== "resolved")
										.length || 0}
								</em>
							)}
						</a>
					))}
				</nav>
				<div className="sidebar-bottom">
					<div className="engine-status">
						<i className={runs.error ? "disconnected" : ""} />
						<span>
							{runs.error
								? t("Связь прервана", "Connection interrupted")
								: t("Обновление каждые 2 с", "Updates every 2s")}
						</span>
					</div>
					<p>
						{t(
							"Чёткий план. Видимый результат.",
							"A clear plan. A visible outcome.",
						)}
					</p>
					<div className="sidebar-controls">
						{changeLocale}
						<button disabled={logout.isPending} onClick={() => logout.mutate()}>
							{t("Выйти", "Sign out")}
						</button>
					</div>
					{logout.error && (
						<p role="alert">{errorText(logout.error, locale)}</p>
					)}
				</div>
			</aside>
			<div className="workspace-main">
				<header className="topbar">
					<span>
						OpsWeave <span className="separator">/</span>{" "}
						{t(
							nav.find((n) => n[0] === page)?.[2] || "Редактор",
							nav.find((n) => n[0] === page)?.[3] || "Editor",
						)}
					</span>
					<span className="topbar-note">
						{t("Ваше изолированное пространство", "Your private workspace")}
					</span>
					<div className="mobile-controls">
						{changeLocale}
						<button disabled={logout.isPending} onClick={() => logout.mutate()}>
							{t("Выйти", "Sign out")}
						</button>
					</div>
				</header>
				<main id={mainId} tabIndex={-1}>
					{!me.data.email && (
						<div className="guest-banner">
							<span>
								{t(
									"Сохраните доступ к своим сценариям: создайте аккаунт до завершения гостевой сессии.",
									"Keep access to your playbooks: create an account before your guest session expires.",
								)}
							</span>
							<button onClick={() => navigate("account")}>
								{t("Сохранить доступ", "Keep access")} →
							</button>
						</div>
					)}
					{dataError && (
						<div className="error" role="alert">
							{errorText(dataError, locale)}{" "}
							<button
								onClick={() => {
									playbooks.refetch();
									runs.refetch();
								}}
							>
								{t("Повторить", "Retry")}
							</button>
							{dataError instanceof ApiError && dataError.status === 401 && (
								<button onClick={() => location.reload()}>
									{t("Войти", "Sign in")}
								</button>
							)}
						</div>
					)}
					{playbooks.isPending || runs.isPending ? (
						<section
							className="loading-grid"
							aria-label={t("Загрузка", "Loading")}
							aria-busy="true"
						>
							<div />
							<div />
							<div />
						</section>
					) : (
						<>
							{page === "playbooks" && (
								<>
									<div className="section-heading">
										<div>
											<p className="eyebrow">
												{t(
													"ПОДГОТОВЬТЕСЬ ЗАРАНЕЕ",
													"PREPARE BEFORE THE INCIDENT",
												)}
											</p>
											<h1>
												{t("Сценарии реагирования", "Response playbooks")}
											</h1>
											<p className="muted">
												{t(
													"Превратите опыт команды в понятную последовательность действий.",
													"Turn team knowledge into a clear sequence of actions.",
												)}
											</p>
										</div>
										<button
											className="primary"
											onClick={() => navigate("editor")}
										>
											+ {t("Создать сценарий", "Create playbook")}
										</button>
									</div>
									{!playbooks.data?.length ? (
										<div className="empty panel">
											<span className="empty-symbol">⌘</span>
											<h2>
												{t(
													"Первый сценарий — ваш план на случай сбоя",
													"Your first playbook is a plan for the next incident",
												)}
											</h2>
											<p>
												{t(
													"Добавьте задачи, согласование и проверку результата. Или начните с редактируемого шаблона восстановления.",
													"Add tasks, an approval and outcome verification. Or start with an editable recovery template.",
												)}
											</p>
											<button
												className="primary"
												onClick={() => navigate("editor")}
											>
												{t(
													"Создать первый сценарий",
													"Create your first playbook",
												)}{" "}
												→
											</button>
										</div>
									) : (
										<div className="playbook-grid">
											{playbooks.data.map((p) => (
												<article className="panel playbook-card" key={p.id}>
													<div className="card-top">
														<span className="card-symbol">⌘</span>
														<span
															className={`badge ${p.published ? "completed" : "pending"}`}
														>
															{p.published
																? `${t("Версия", "Version")} ${p.published.version}`
																: t("Черновик", "Draft")}
														</span>
													</div>
													<h2>{p.name}</h2>
													<p className="muted">
														{p.description ||
															t("Описание не добавлено", "No description yet")}
													</p>
													<div className="mini-track" aria-hidden="true">
														{p.steps.slice(0, 8).map((s, i) => (
															<span key={s.id}>{i + 1}</span>
														))}
													</div>
													<footer>
														<span>
															{p.steps.length} {t("шагов", "steps")}
														</span>
														<button onClick={() => navigate("editor", p.id)}>
															{t("Редактировать", "Edit")} ↗
														</button>
													</footer>
												</article>
											))}
										</div>
									)}
								</>
							)}
							{page === "editor" && (
								<Suspense
									fallback={
										<div className="loading-grid" aria-busy="true">
											<div />
										</div>
									}
								>
									<Editor
										key={id || "new"}
										locale={locale}
										playbook={playbooks.data?.find((p) => p.id === id)}
										close={() => navigate("playbooks")}
									/>
								</Suspense>
							)}
							{page === "incidents" && (
								<Incidents
									locale={locale}
									runs={runs.data || []}
									playbooks={playbooks.data || []}
									id={id}
									navigate={navigate}
									filter={route.get("filter") || "all"}
								/>
							)}
							{page === "analytics" && (
								<Analytics locale={locale} runs={runs.data || []} />
							)}
							{page === "integrations" && (
								<Integrations
									locale={locale}
									playbooks={playbooks.data || []}
								/>
							)}
							{page === "account" && (
								<section className="account">
									<p className="eyebrow">
										{t("ДОСТУП К ПРОСТРАНСТВУ", "WORKSPACE ACCESS")}
									</p>
									<h1>{t("Ваш аккаунт", "Your account")}</h1>
									{me.data.email ? (
										<div className="panel">
											<h2>{me.data.email}</h2>
											<p>
												{t(
													"Данные сохранены на сервере и доступны после входа с другого устройства.",
													"Your data is saved on the server and available when you sign in on another device.",
												)}
											</p>
										</div>
									) : (
										<AuthForm
											locale={locale}
											mode="register"
											onSuccess={() => me.refetch()}
										/>
									)}
									<div className="panel account-note">
										<h2>
											{t("Личное рабочее пространство", "A personal workspace")}
										</h2>
										<p>
											{t(
												"Сценарии, запуски и ключ интеграции доступны только в вашем аккаунте. Общих гостевых данных нет.",
												"Your account owns its playbooks, runs and integration key. Guest data is never shared.",
											)}
										</p>
										<p>
											{t(
												"Почта используется для входа. Восстановление пароля через email пока недоступно — сохраните пароль в менеджере.",
												"Email is used to sign in. Email password recovery is not available yet — save your password in a password manager.",
											)}
										</p>
									</div>
								</section>
							)}
						</>
					)}
				</main>
			</div>
		</div>
	);
}

function Auth({
	locale,
	localeButton,
	onSuccess,
	error,
}: {
	locale: Locale;
	localeButton: React.ReactNode;
	onSuccess: () => void;
	error: unknown;
}) {
	const t = (ru: string, en: string) => (locale === "ru" ? ru : en);
	const [mode, setMode] = useState<"login" | "register">("login");
	const guest = useMutation({
		mutationFn: () => api("/auth/guest", "POST", {}),
		onSuccess,
	});
	return (
		<div className="auth-page">
			<header>
				<a className="brand" href="/">
					<span className="brand-mark">W</span>OpsWeave
				</a>
				{localeButton}
			</header>
			<main className="auth-layout">
				<section className="auth-story">
					<p className="eyebrow">
						{t(
							"INCIDENT RESPONSE · ПОД КОНТРОЛЕМ",
							"INCIDENT RESPONSE · UNDER CONTROL",
						)}
					</p>
					<h1>
						{t("Когда сервис падает,", "When a service fails,")}
						<br />
						<span>{t("план уже есть.", "the plan is ready.")}</span>
					</h1>
					<p className="auth-lead">
						{t(
							"Соберите сценарий. Запустите реагирование. Выполните задачи и согласуйте действия — с историей каждого шага.",
							"Build a playbook. Start the response. Complete tasks and approve actions — with a history of every step.",
						)}
					</p>
					<div className="auth-process">
						<div>
							<b>01</b>
							<span>
								{t("Сценарий", "Playbook")}
								<small>
									{t("Ваш порядок действий", "Your sequence of actions")}
								</small>
							</span>
						</div>
						<div>
							<b>02</b>
							<span>
								{t("Реагирование", "Response")}
								<small>
									{t("Реальные задачи и решения", "Real tasks and decisions")}
								</small>
							</span>
						</div>
						<div>
							<b>03</b>
							<span>
								{t("Результат", "Outcome")}
								<small>{t("Сохранённая история", "A durable history")}</small>
							</span>
						</div>
					</div>
					<p className="privacy-note">
						{t(
							"Отдельное пространство для каждого пользователя. Без общих демо-данных.",
							"A separate workspace for every user. No shared demo data.",
						)}
					</p>
				</section>
				<section className="auth-panel panel">
					<h2>{t("Начните с одного сценария", "Start with one playbook")}</h2>
					<p className="muted">
						{t(
							"Создайте личное пространство без регистрации. Позже можно привязать почту и сохранить доступ.",
							"Create a personal workspace without signing up. Add your email later to keep access.",
						)}
					</p>
					<button
						className="primary wide"
						disabled={guest.isPending}
						onClick={() => guest.mutate()}
					>
						{guest.isPending
							? t("Создаём пространство…", "Creating workspace…")
							: t(
									"Начать в личном пространстве",
									"Start in a private workspace",
								)}{" "}
						→
					</button>
					<p className="small muted">
						{t(
							"Гостевая сессия действует 7 дней.",
							"Guest sessions last 7 days.",
						)}
					</p>
					{Boolean(guest.error || error) && (
						<div className="error" role="alert">
							{errorText(guest.error || error, locale)}
							<button onClick={() => location.reload()}>
								{t("Повторить", "Retry")}
							</button>
						</div>
					)}
					<div className="auth-divider">
						{t("или с аккаунтом", "or with an account")}
					</div>
					<div className="tabs">
						<button
							aria-pressed={mode === "login"}
							onClick={() => setMode("login")}
						>
							{t("Войти", "Sign in")}
						</button>
						<button
							aria-pressed={mode === "register"}
							onClick={() => setMode("register")}
						>
							{t("Регистрация", "Sign up")}
						</button>
					</div>
					<AuthForm
						key={mode}
						locale={locale}
						mode={mode}
						onSuccess={onSuccess}
					/>
				</section>
			</main>
			<footer className="auth-footer">
				OpsWeave ·{" "}
				{t(
					"Сценарии реагирования на инциденты",
					"Incident response orchestration",
				)}
			</footer>
		</div>
	);
}
function AuthForm({
	locale,
	mode,
	onSuccess,
}: {
	locale: Locale;
	mode: "login" | "register";
	onSuccess: () => void;
}) {
	const t = (ru: string, en: string) => (locale === "ru" ? ru : en);
	const { register, handleSubmit } = useForm<{
		email: string;
		password: string;
	}>();
	const submit = useMutation({
		mutationFn: (data: { email: string; password: string }) =>
			api(`/auth/${mode}`, "POST", data),
		onSuccess,
	});
	return (
		<form
			className="form-grid"
			onSubmit={handleSubmit((data) => submit.mutate(data))}
		>
			<label>
				{t("Почта", "Email")}
				<input
					type="email"
					autoComplete="email"
					required
					maxLength={254}
					{...register("email")}
				/>
			</label>
			<label>
				{t("Пароль", "Password")}
				<input
					type="password"
					minLength={12}
					maxLength={256}
					autoComplete={mode === "login" ? "current-password" : "new-password"}
					required
					{...register("password")}
				/>
				<small className="muted">
					{t("Не менее 12 символов", "At least 12 characters")}
				</small>
			</label>
			{submit.error && (
				<div role="alert" className="error">
					{errorText(submit.error, locale)}
				</div>
			)}
			<button disabled={submit.isPending} type="submit" className="wide">
				{submit.isPending
					? t("Подождите…", "Please wait…")
					: mode === "login"
						? t("Войти", "Sign in")
						: t("Создать аккаунт", "Create account")}
			</button>
		</form>
	);
}
function Incidents({
	locale,
	runs,
	playbooks,
	id,
	navigate,
	filter,
}: {
	locale: Locale;
	runs: Run[];
	playbooks: Playbook[];
	id: string | null;
	navigate: (page: string, id?: string) => void;
	filter: string;
}) {
	const t = (ru: string, en: string) => (locale === "ru" ? ru : en);
	const [creating, setCreating] = useState(false);
	const query = useQueryClient();
	const [search, setSearch] = useState("");
	const visible = runs.filter(
		(r) =>
			(filter === "all" ||
				(filter === "active"
					? r.incidentStatus !== "resolved"
					: filter === "waiting"
						? r.status === "waiting"
						: r.incidentStatus === "resolved")) &&
			`${r.title} ${r.service}`.toLowerCase().includes(search.toLowerCase()),
	);
	const setFilter = (value: string) => {
		const url = new URL(location.href);
		url.searchParams.set("filter", value);
		history.pushState(null, "", url);
		window.dispatchEvent(new PopStateEvent("popstate"));
	};
	if (id)
		return (
			<RunDetail
				key={id}
				locale={locale}
				id={id}
				back={() => navigate("incidents")}
				navigate={navigate}
			/>
		);
	return (
		<section>
			<div className="section-heading">
				<div>
					<p className="eyebrow">
						{t("ЦЕНТР РЕАГИРОВАНИЯ", "RESPONSE CENTER")}
					</p>
					<h1>
						{t(
							"Каждому инциденту — следующий шаг",
							"Every incident has a next step",
						)}
					</h1>
					<p className="muted">
						{t(
							"Запускайте сценарии, принимайте решения и следите за восстановлением.",
							"Run playbooks, make decisions and track recovery.",
						)}
					</p>
				</div>
				<button
					className="primary"
					onClick={() => setCreating(!creating)}
					disabled={!playbooks.some((p) => p.published)}
				>
					+ {t("Создать инцидент", "Create incident")}
				</button>
			</div>
			{creating && (
				<CreateIncident
					locale={locale}
					playbooks={playbooks}
					close={() => setCreating(false)}
					done={(run) => {
						query.invalidateQueries({ queryKey: ["runs"] });
						navigate("incidents", run.id);
						setCreating(false);
					}}
				/>
			)}
			<div className="metrics">
				<div>
					<span>{t("Открытые инциденты", "Open incidents")}</span>
					<strong>
						{runs.filter((r) => r.incidentStatus !== "resolved").length}
					</strong>
					<small>{t("Нуждаются в реагировании", "Need a response")}</small>
				</div>
				<div>
					<span>{t("Ожидают действия", "Waiting for action")}</span>
					<strong className="amber-text">
						{
							runs.filter(
								(r) =>
									r.status === "waiting" && r.steps[r.cursor]?.type !== "wait",
							).length
						}
					</strong>
					<small>{t("Задачи и согласования", "Tasks and approvals")}</small>
				</div>
				<div>
					<span>{t("Устранены", "Resolved")}</span>
					<strong className="green-text">
						{runs.filter((r) => r.incidentStatus === "resolved").length}
					</strong>
					<small>{t("С сохранённой историей", "With a saved history")}</small>
				</div>
			</div>
			{!runs.length ? (
				<div className="empty panel">
					<span className="empty-symbol">↗</span>
					<h2>
						{t("Готовность начинается с плана", "Readiness starts with a plan")}
					</h2>
					<p>
						{playbooks.some((p) => p.published)
							? t(
									"Ваш сценарий готов. Создайте инцидент — сервер начнёт выполнение и покажет, где нужно ваше действие.",
									"Your playbook is ready. Create an incident — the server will execute it and show where your action is needed.",
								)
							: t(
									"Создайте и опубликуйте первый сценарий. После этого вы сможете запустить реальное реагирование.",
									"Create and publish your first playbook. Then start a real incident response.",
								)}
					</p>
					<button
						className="primary"
						onClick={() =>
							playbooks.some((p) => p.published)
								? setCreating(true)
								: navigate("playbooks")
						}
					>
						{playbooks.some((p) => p.published)
							? t("Запустить первый инцидент", "Start your first incident")
							: t("Перейти к сценариям", "Go to playbooks")}{" "}
						→
					</button>
				</div>
			) : (
				<div className="panel incident-list">
					<div className="list-toolbar">
						<div className="tabs">
							{[
								["all", "Все", "All"],
								["active", "Открытые", "Open"],
								["waiting", "Ожидают", "Waiting"],
								["resolved", "Устранены", "Resolved"],
							].map(([key, ru, en]) => (
								<button
									key={key}
									aria-pressed={filter === key}
									onClick={() => setFilter(key)}
								>
									{t(ru, en)}
								</button>
							))}
						</div>
						<input
							aria-label={t("Поиск инцидентов", "Search incidents")}
							placeholder={t(
								"Поиск по названию или сервису",
								"Search title or service",
							)}
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
					</div>
					{!visible.length ? (
						<div className="empty">
							<h2>{t("Ничего не найдено", "No results")}</h2>
							<p>
								{t(
									"Измените запрос или фильтр.",
									"Change the search or filter.",
								)}
							</p>
							<button
								onClick={() => {
									setSearch("");
									setFilter("all");
								}}
							>
								{t("Сбросить фильтры", "Clear filters")}
							</button>
						</div>
					) : (
						visible.map((run) => (
							<a
								className="incident-row"
								key={run.id}
								href={`?page=incidents&id=${run.id}`}
								onClick={(e) => {
									e.preventDefault();
									navigate("incidents", run.id);
								}}
							>
								<span className={`severity-dot ${run.severity}`} />
								<div className="incident-name">
									<span className="small muted">
										{run.service}{" "}
										<span className="mono">· {run.id.slice(0, 8)}</span>
									</span>
									<h2>{run.title}</h2>
									<span className="small muted">
										{run.playbookName} · v{run.version}
									</span>
								</div>
								<div className="row-state">
									<span className={`badge ${run.status}`}>
										{label(run.status, locale)}
									</span>
									<small>
										{run.steps[run.cursor]?.title ||
											label(run.incidentStatus, locale)}
									</small>
								</div>
								<span className="row-time">{date(run.created, locale)}</span>
								<span aria-hidden="true">↗</span>
							</a>
						))
					)}
				</div>
			)}
		</section>
	);
}
function CreateIncident({
	locale,
	playbooks,
	close,
	done,
}: {
	locale: Locale;
	playbooks: Playbook[];
	close: () => void;
	done: (run: Run) => void;
}) {
	const t = (ru: string, en: string) => (locale === "ru" ? ru : en);
	const { register, handleSubmit } = useForm({
		defaultValues: {
			title: "",
			service: "",
			severity: "high",
			playbookId: playbooks.find((p) => p.published)?.id,
		},
	});
	const key = useRef(crypto.randomUUID());
	const submit = useMutation({
		mutationFn: (input: unknown) =>
			api<{ run: Run }>("/runs", "POST", input, key.current),
		onSuccess: (result) => done(result.run),
	});
	return (
		<form
			className="panel create-incident form-grid"
			onSubmit={handleSubmit((data) => submit.mutate(data))}
		>
			<div className="section-heading">
				<h2>{t("Что произошло?", "What happened?")}</h2>
				<button type="button" onClick={close}>
					{t("Отмена", "Cancel")}
				</button>
			</div>
			<div className="form-columns">
				<label>
					{t("Название инцидента", "Incident title")}
					<input
						autoFocus
						required
						maxLength={160}
						placeholder={t(
							"API возвращает ошибки 500",
							"API returns 500 errors",
						)}
						{...register("title")}
					/>
				</label>
				<label>
					{t("Сервис", "Service")}
					<input
						required
						maxLength={100}
						placeholder="payments-api"
						{...register("service")}
					/>
				</label>
				<label>
					{t("Приоритет", "Severity")}
					<select {...register("severity")}>
						{["critical", "high", "medium", "low"].map((s) => (
							<option key={s} value={s}>
								{label(s, locale)}
							</option>
						))}
					</select>
				</label>
				<label>
					{t("Сценарий реагирования", "Response playbook")}
					<select {...register("playbookId")}>
						{playbooks
							.filter((p) => p.published)
							.map((p) => (
								<option value={p.id} key={p.id}>
									{p.published?.name} · v{p.published?.version}
								</option>
							))}
					</select>
				</label>
			</div>
			{submit.error && (
				<div className="error" role="alert">
					{errorText(submit.error, locale)}
				</div>
			)}
			<div className="actions">
				<button className="primary" disabled={submit.isPending} type="submit">
					{submit.isPending
						? t("Запускаем…", "Starting…")
						: t("Создать и запустить", "Create and run")}
				</button>
				<span className="muted small">
					{t(
						"Шаги выполняются на сервере, даже если закрыть страницу.",
						"Steps run on the server, even when this page is closed.",
					)}
				</span>
			</div>
		</form>
	);
}
function RunDetail({
	locale,
	id,
	back,
	navigate,
}: {
	locale: Locale;
	id: string;
	back: () => void;
	navigate: (page: string, id?: string) => void;
}) {
	const t = (ru: string, en: string) => (locale === "ru" ? ru : en);
	const query = useQueryClient();
	const detail = useQuery({
		queryKey: ["run", id],
		queryFn: () => api<Run>(`/runs/${id}`),
		refetchInterval: 1500,
	});
	const [reason, setReason] = useState("");
	const action = useMutation({
		mutationFn: (data: unknown) => api(`/runs/${id}/actions`, "POST", data),
		onSuccess: () => {
			setReason("");
			query.invalidateQueries({ queryKey: ["run", id] });
			query.invalidateQueries({ queryKey: ["runs"] });
		},
	});
	const replayKey = useRef(crypto.randomUUID());
	const replay = useMutation({
		mutationFn: () =>
			api<{ run: Run }>(`/runs/${id}/replay`, "POST", {}, replayKey.current),
		onSuccess: (result) => {
			query.invalidateQueries({ queryKey: ["runs"] });
			navigate("incidents", result.run.id);
		},
	});
	const run = detail.data;
	if (!run)
		return (
			<section>
				<button onClick={back}>← {t("Все инциденты", "All incidents")}</button>
				{detail.error ? (
					<div className="error" role="alert">
						{errorText(detail.error, locale)}
						<button onClick={() => detail.refetch()}>
							{t("Повторить", "Retry")}
						</button>
					</div>
				) : (
					<div className="loading-grid" aria-busy="true">
						<div />
						<div />
					</div>
				)}
			</section>
		);
	const current = run.steps[run.cursor];
	const waiting =
		run.status === "waiting" && ["task", "approval"].includes(current?.type);
	const completed = run.steps.filter((s) =>
		["completed", "condition_skipped"].includes(s.status || ""),
	).length;
	return (
		<section>
			<button className="back-link" onClick={back}>
				← {t("Все инциденты", "All incidents")}
			</button>
			<div className="section-heading">
				<div>
					<p className="eyebrow">
						{run.service} <span className="mono">/ {id.slice(0, 8)}</span>
					</p>
					<h1>{run.title}</h1>
					<div className="actions">
						<span className={`badge ${run.severity}`}>
							{label(run.severity, locale)}
						</span>
						<span className={`badge ${run.incidentStatus}`}>
							{label(run.incidentStatus, locale)}
						</span>
						<span className="small muted">{date(run.created, locale)}</span>
					</div>
				</div>
				<div className="actions">
					{run.incidentStatus === "open" && (
						<button
							disabled={action.isPending}
							onClick={() => action.mutate({ action: "acknowledge" })}
						>
							{t("Принять в работу", "Acknowledge")}
						</button>
					)}
					<a className="button" href={`/api/runs/${id}/export`}>
						{t("Экспорт", "Export")} ↗
					</a>
				</div>
			</div>
			{(action.error || replay.error || detail.error) && (
				<div className="error" role="alert">
					{errorText(action.error || replay.error || detail.error, locale)}
					<button onClick={() => detail.refetch()}>
						{t("Обновить", "Refresh")}
					</button>
				</div>
			)}
			<div className="run-layout">
				<div>
					<div className="panel execution-panel">
						<div className="section-heading">
							<div>
								<p className="eyebrow">
									{t("ВЫПОЛНЕНИЕ СЦЕНАРИЯ", "PLAYBOOK EXECUTION")}
								</p>
								<h2>
									{run.playbookName}{" "}
									<span className="muted small">v{run.version}</span>
								</h2>
							</div>
							<output className={`badge ${run.status}`}>
								{label(run.status, locale)}
							</output>
						</div>
						<div className="progress-summary">
							<span>
								{completed} / {run.steps.length}{" "}
								{t("шагов пройдено", "steps processed")}
							</span>
							<progress
								max={run.steps.length}
								value={completed}
								aria-label={t("Выполнение сценария", "Playbook progress")}
							/>
						</div>
						<ol className="execution-track">
							{run.steps.map((step, i) => (
								<li key={step.id} className={step.status}>
									<span className="execution-marker">
										{step.status === "completed"
											? "✓"
											: step.status === "condition_skipped"
												? "−"
												: i + 1}
									</span>
									<div>
										<p className="small muted">
											{label(step.type, locale)}
											{step.condition !== "always" &&
												` · ${label(step.condition, locale)}`}
										</p>
										<h3>{step.title}</h3>
										<p className={`step-status ${step.status}`}>
											{label(step.status || "pending", locale)}
											{step.status === "waiting" &&
											step.type === "wait" &&
											step.due
												? ` · ${t("до", "until")} ${date(step.due, locale)}`
												: ""}
										</p>
										{step.result && (
											<p className="step-result">{step.result}</p>
										)}
									</div>
								</li>
							))}
						</ol>
					</div>
					<div className="panel timeline">
						<h2>{t("История реагирования", "Response history")}</h2>
						<p className="muted small">
							{t(
								"Реальные события этого запуска, сохранённые на сервере.",
								"Actual events from this run, saved on the server.",
							)}
						</p>
						<ol>
							{run.events?.map((event) => (
								<li key={event.id}>
									<time>{date(event.at, locale)}</time>
									<div>
										<b>{label(event.type, locale)}</b>
										{event.detail && <p>{event.detail}</p>}
									</div>
								</li>
							))}
						</ol>
					</div>
				</div>
				<aside className="run-aside">
					{waiting ? (
						<form
							className="decision-panel panel"
							onSubmit={(e) => {
								e.preventDefault();
								action.mutate({
									action: current.type === "task" ? "complete" : "approve",
									stepId: current.id,
									reason,
								});
							}}
						>
							<span className="decision-icon">
								{current.type === "approval" ? "◇" : "↗"}
							</span>
							<p className="eyebrow">
								{t("ВАШ СЛЕДУЮЩИЙ ШАГ", "YOUR NEXT STEP")}
							</p>
							<h2>
								{current.type === "approval"
									? t("Нужно ваше решение", "Your decision is needed")
									: t("Выполните задачу", "Complete the task")}
							</h2>
							<p>{current.title}</p>
							<label>
								{t("Результат или обоснование", "Outcome or reason")}
								<textarea
									required
									maxLength={500}
									value={reason}
									onChange={(e) => setReason(e.target.value)}
									placeholder={t(
										"Что проверили и какое решение приняли?",
										"What did you verify and decide?",
									)}
								/>
							</label>
							<button
								className="primary wide"
								type="submit"
								disabled={action.isPending || !reason.trim()}
							>
								{current.type === "approval"
									? t("Согласовать и продолжить", "Approve and continue")
									: t("Подтвердить выполнение", "Confirm completion")}
							</button>
							{current.type === "approval" && (
								<button
									className="danger wide"
									type="button"
									disabled={action.isPending || !reason.trim()}
									onClick={() =>
										action.mutate({
											action: "reject",
											stepId: current.id,
											reason,
										})
									}
								>
									{t("Отклонить и остановить", "Reject and stop")}
								</button>
							)}
							<p className="small muted">
								{t(
									"Решение и комментарий попадут в историю инцидента.",
									"Your decision and comment will be recorded in the incident history.",
								)}
							</p>
						</form>
					) : (
						<div className="panel result-panel">
							<span className="decision-icon">
								{run.status === "completed"
									? "✓"
									: run.status === "failed"
										? "×"
										: "◷"}
							</span>
							<h2>
								{run.status === "completed"
									? t("Сценарий выполнен", "Playbook completed")
									: run.status === "waiting"
										? t("Идёт наблюдение", "Observation in progress")
										: label(run.status, locale)}
							</h2>
							<p>
								{run.status === "completed"
									? t(
											"Все подходящие шаги пройдены. История доступна для разбора и экспорта.",
											"All matching steps have finished. The history is available for review and export.",
										)
									: t(
											"Страница обновляется автоматически. Состояние сохранится после закрытия браузера.",
											"This page refreshes automatically. State persists when you close your browser.",
										)}
							</p>
							{run.status === "completed" &&
								run.incidentStatus !== "resolved" && (
									<button
										className="primary wide"
										disabled={action.isPending}
										onClick={() => action.mutate({ action: "resolve" })}
									>
										{t("Отметить устранённым", "Mark resolved")}
									</button>
								)}
						</div>
					)}
					<div className="panel run-context">
						<h2>{t("О запуске", "Run context")}</h2>
						<dl>
							<dt>{t("Сервис", "Service")}</dt>
							<dd>{run.service}</dd>
							<dt>{t("Последнее событие", "Last update")}</dt>
							<dd>{date(run.updated, locale)}</dd>
							<dt>{t("Корреляция", "Correlation")}</dt>
							<dd className="mono">{run.id}</dd>
						</dl>
						{run.parentId && (
							<button onClick={() => navigate("incidents", run.parentId)}>
								{t("Исходный запуск", "Original run")} ↗
							</button>
						)}
						{["running", "waiting"].includes(run.status) ? (
							<button
								className="danger wide"
								disabled={action.isPending}
								onClick={() => {
									if (
										window.confirm(
											t(
												"Остановить выполнение? История сохранится.",
												"Stop execution? History will be preserved.",
											),
										)
									)
										action.mutate({ action: "cancel" });
								}}
							>
								{t("Остановить запуск", "Cancel run")}
							</button>
						) : (
							<button
								className="wide"
								disabled={replay.isPending}
								onClick={() => replay.mutate()}
							>
								{t("Создать повторный запуск", "Create replay attempt")}
							</button>
						)}
						<p className="small muted">
							{t(
								"Повторный запуск создаёт отдельную попытку по актуальной опубликованной версии.",
								"Replay creates a separate attempt using the latest published version.",
							)}
						</p>
					</div>
				</aside>
			</div>
		</section>
	);
}
function Analytics({ locale, runs }: { locale: Locale; runs: Run[] }) {
	const t = (ru: string, en: string) => (locale === "ru" ? ru : en);
	const resolved = runs.filter((r) => r.resolved);
	const acknowledged = runs.filter((r) => r.acknowledged);
	const duration = (data: Run[], key: "resolved" | "acknowledged") =>
		data.length
			? `${Math.round(data.reduce((n, r) => n + ((r[key] ?? r.created) - r.created), 0) / data.length / 1000)} ${t("с", "s")}`
			: "—";
	return (
		<section>
			<div className="section-heading">
				<div>
					<p className="eyebrow">
						{t("УЧИТЕСЬ НА РЕАЛЬНЫХ ЗАПУСКАХ", "LEARN FROM REAL RUNS")}
					</p>
					<h1>{t("Аналитика реагирования", "Response analytics")}</h1>
					<p className="muted">
						{t(
							"Метрики вашего пространства за всё время. Только сохранённые инциденты.",
							"All-time metrics for your workspace. Only persisted incidents.",
						)}
					</p>
				</div>
			</div>
			<div className="metrics">
				<div>
					<span>{t("Всего инцидентов", "Total incidents")}</span>
					<strong>{runs.length}</strong>
					<small>
						{t("Включая повторные попытки", "Including replay attempts")}
					</small>
				</div>
				<div>
					<span>{t("Среднее время принятия", "Mean time to acknowledge")}</span>
					<strong>{duration(acknowledged, "acknowledged")}</strong>
					<small>
						{acknowledged.length} {t("измерений", "measurements")}
					</small>
				</div>
				<div>
					<span>{t("Среднее время устранения", "Mean time to resolve")}</span>
					<strong>{duration(resolved, "resolved")}</strong>
					<small>
						{resolved.length} {t("измерений", "measurements")}
					</small>
				</div>
			</div>
			{!runs.length ? (
				<div className="empty panel">
					<h2>
						{t(
							"Метрики появятся после первого запуска",
							"Metrics appear after your first run",
						)}
					</h2>
					<p>
						{t(
							"Создайте инцидент и пройдите сценарий. Здесь появятся фактические времена реагирования.",
							"Create an incident and complete its playbook to see actual response times.",
						)}
					</p>
				</div>
			) : (
				<div className="analytics-grid">
					<div className="panel">
						<h2>{t("По приоритету", "By severity")}</h2>
						{["critical", "high", "medium", "low"].map((s) => (
							<div className="chart-row" key={s}>
								<span>{label(s, locale)}</span>
								<meter
									min={0}
									max={runs.length}
									value={runs.filter((r) => r.severity === s).length}
									aria-label={label(s, locale)}
								/>
								<b>{runs.filter((r) => r.severity === s).length}</b>
							</div>
						))}
					</div>
					<div className="panel">
						<h2>{t("Результаты сценариев", "Playbook outcomes")}</h2>
						{["completed", "waiting", "running", "failed", "cancelled"].map(
							(s) => (
								<div className="outcome-row" key={s}>
									<span className={`badge ${s}`}>{label(s, locale)}</span>
									<b>{runs.filter((r) => r.status === s).length}</b>
								</div>
							),
						)}
					</div>
				</div>
			)}
		</section>
	);
}
function Integrations({
	locale,
	playbooks,
}: {
	locale: Locale;
	playbooks: Playbook[];
}) {
	const t = (ru: string, en: string) => (locale === "ru" ? ru : en);
	const keys = useQuery({
		queryKey: ["keys"],
		queryFn: () => api<{ lastFour: string; expires: number }[]>("/keys"),
	});
	const [secret, setSecret] = useState<string>();
	const mutate = useMutation({
		mutationFn: (revoke: boolean) =>
			api<{ key?: string }>("/keys", "POST", { revoke }),
		onSuccess: (result) => {
			setSecret(result.key);
			keys.refetch();
		},
	});
	const example = JSON.stringify(
		{
			title: "API error rate above threshold",
			service: "payments-api",
			severity: "high",
			playbookId:
				playbooks.find((p) => p.published)?.id || "<published-playbook-id>",
		},
		null,
		2,
	);
	return (
		<section className="integrations">
			<p className="eyebrow">
				{t("ИЗ МОНИТОРИНГА В РЕАГИРОВАНИЕ", "FROM MONITORING TO RESPONSE")}
			</p>
			<h1>{t("Входящий сигнал", "Incoming signal")}</h1>
			<p className="muted">
				{t(
					"Создавайте инциденты из своей системы мониторинга через HTTP API.",
					"Create incidents from your monitoring system using the HTTP API.",
				)}
			</p>
			<div className="panel">
				<div className="section-heading">
					<div>
						<h2>{t("Ключ интеграции", "Integration key")}</h2>
						<p>
							{t(
								"Только создание инцидентов. Срок действия — 30 дней. Новый ключ отзывает старый.",
								"Incident creation only. Expires in 30 days. A new key revokes the previous one.",
							)}
						</p>
					</div>
					<button
						className="primary"
						disabled={mutate.isPending}
						onClick={() => mutate.mutate(false)}
					>
						{keys.data?.length
							? t("Заменить ключ", "Rotate key")
							: t("Создать ключ", "Create key")}
					</button>
				</div>
				{keys.data?.map((k) => (
					<p key={k.lastFour} className="small">
						••••{k.lastFour} · {t("до", "expires")} {date(k.expires, locale)}{" "}
						<button
							disabled={mutate.isPending}
							onClick={() => mutate.mutate(true)}
						>
							{t("Отозвать", "Revoke")}
						</button>
					</p>
				))}
				{(mutate.error || keys.error) && (
					<div className="error" role="alert">
						{errorText(mutate.error || keys.error, locale)}
						<button onClick={() => keys.refetch()}>
							{t("Повторить", "Retry")}
						</button>
					</div>
				)}
				{secret && (
					<div className="success">
						<p>
							{t(
								"Скопируйте ключ сейчас: повторно он не показывается.",
								"Copy this key now: it will not be shown again.",
							)}
						</p>
						<input
							aria-label={t("Новый ключ интеграции", "New integration key")}
							readOnly
							value={secret}
							onFocus={(e) => e.target.select()}
						/>
						<button onClick={() => setSecret(undefined)}>
							{t("Скрыть", "Hide")}
						</button>
					</div>
				)}
			</div>
			<div className="panel">
				<h2>{t("Отправить инцидент", "Send an incident")}</h2>
				<p>
					{t(
						"Передавайте уникальный Idempotency-Key для каждого сигнала. Повторная отправка с тем же ключом не создаст дубль.",
						"Send a unique Idempotency-Key for each signal. Repeating the same key will not create a duplicate.",
					)}
				</p>
				<pre>
					<code>{`POST ${location.origin}/api/ingest\nAuthorization: Bearer <YOUR_KEY>\nContent-Type: application/json\nIdempotency-Key: <unique-signal-id>\n\n${example}`}</code>
				</pre>
				<p className="small muted">
					{t(
						"HTTP 202 означает: инцидент сохранён и принят к выполнению. Результат проверяйте в центре реагирования.",
						"HTTP 202 means the incident was persisted and accepted. Check execution results in the response center.",
					)}
				</p>
			</div>
		</section>
	);
}
