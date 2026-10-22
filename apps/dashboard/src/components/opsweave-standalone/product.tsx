import {
	lazy,
	Suspense,
	useCallback,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
import { flushSync } from "react-dom";
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
const Learn = lazy(() => import("./learn"));
import { Guide } from "./guide";

const brandSymbol = (
	<svg aria-hidden="true" viewBox="0 0 32 32" fill="none">
		<path
			fill="currentColor"
			fillRule="evenodd"
			clipRule="evenodd"
			d="M10 4H24V21H28V28H23V25H8V28H3V21H6C8.8 16.4 10 11.4 10 6V4ZM14 8H20V21H11C12.9 16.8 13.9 12.3 14 8Z"
		/>
	</svg>
);
const navPaths: Record<string, string> = {
	incidents: "M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z",
	playbooks:
		"M6 3h12a2 2 0 0 1 2 2v16H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm1 14h13M8 7h8M8 11h6",
	history: "M3 12a9 9 0 1 0 2.5-6.2L3 8m0-5v5h5m4-1v6l4 2",
	analytics: "M4 20V10m8 10V4m8 16v-7M2 21h20",
	integrations:
		"m8 8 8 8m-9-5-3 3a4 4 0 0 0 6 6l3-3m-2-10 3-3a4 4 0 0 1 6 6l-3 3",
	learn:
		"M9 8a3 3 0 1 1 5 2c-1 1-2 1-2 4m0 3h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
	account: "M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm-12 13v-2a8 8 0 0 1 16 0v2",
};
const routeArt = (
	<div className="focus-landscape" aria-hidden="true">
		<img
			src="/visuals/response-core-v4-small.png"
			alt=""
			width="768"
			height="512"
			loading="lazy"
		/>
		<div className="focus-scan" />
	</div>
);

type User = { id: string; email: string | null };
const nav = [
	["incidents", "◉", "Главная", "Workspace"],
	["playbooks", "▤", "Инструкции", "Instructions"],
	["history", "◷", "История", "History"],
	["analytics", "▥", "Аналитика", "Analytics"],
	["integrations", "↗", "Интеграции", "Integrations"],
	["learn", "?", "Справка", "Help"],
	["account", "◎", "Аккаунт", "Account"],
];

export default function Product() {
	const mainId = useId();
	const [locale, setLocale] = useState<Locale>(() => {
		try {
			return localStorage.getItem("opsweave.locale.v1") === "en" ? "en" : "ru";
		} catch {
			return "ru";
		}
	});
	const [theme, setTheme] = useState<"dark" | "light">(() => {
		try {
			return localStorage.getItem("opsweave.theme.v2") === "light"
				? "light"
				: "dark";
		} catch {
			return "dark";
		}
	});
	const [motionPaused, setMotionPaused] = useState(() => {
		try {
			return localStorage.getItem("opsweave.motion.v1") === "paused";
		} catch {
			return false;
		}
	});
	const [systemMotionReduced, setSystemMotionReduced] = useState(
		() => matchMedia("(prefers-reduced-motion: reduce)").matches,
	);
	useEffect(() => {
		const preference = matchMedia("(prefers-reduced-motion: reduce)");
		const update = () => setSystemMotionReduced(preference.matches);
		preference.addEventListener("change", update);
		return () => preference.removeEventListener("change", update);
	}, []);
	const visualTransition = useRef<{ skipTransition: () => void } | null>(null);
	const withTransition = useCallback(
		(update: () => void, kind: "page" | "theme" = "page") => {
			visualTransition.current?.skipTransition();
			const visualDocument = document as unknown as {
				startViewTransition?: (update: () => void) => {
					skipTransition: () => void;
					finished: Promise<void>;
				};
			};
			if (
				!visualDocument.startViewTransition ||
				motionPaused ||
				matchMedia("(prefers-reduced-motion: reduce)").matches
			) {
				flushSync(update);
				return;
			}
			document.documentElement.dataset.transition = kind;
			const next = visualDocument.startViewTransition(() => flushSync(update));
			visualTransition.current = next;
			void next.finished
				.catch(() => {})
				.then(() => {
					if (visualTransition.current === next) {
						visualTransition.current = null;
						delete document.documentElement.dataset.transition;
					}
				});
		},
		[motionPaused],
	);
	useEffect(() => {
		document.documentElement.dataset.motion = motionPaused
			? "paused"
			: "running";
		if (motionPaused) visualTransition.current?.skipTransition();
		try {
			localStorage.setItem(
				"opsweave.motion.v1",
				motionPaused ? "paused" : "running",
			);
		} catch {}
	}, [motionPaused]);
	useEffect(() => {
		document.documentElement.dataset.theme = theme;
		document.documentElement.style.colorScheme = theme;
		document
			.querySelector('meta[name="theme-color"]')
			?.setAttribute("content", theme === "light" ? "#f2f5fb" : "#0a101d");
		try {
			localStorage.setItem("opsweave.theme.v2", theme);
		} catch {}
	}, [theme]);
	const themeLabel =
		theme === "dark"
			? locale === "ru"
				? "Светлая тема"
				: "Light theme"
			: locale === "ru"
				? "Тёмная тема"
				: "Dark theme";
	const themeButton = (
		<button
			className="theme-toggle"
			onClick={() =>
				withTransition(
					() => setTheme(theme === "dark" ? "light" : "dark"),
					"theme",
				)
			}
			aria-label={themeLabel}
			title={themeLabel}
		>
			<svg
				aria-hidden="true"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.7"
			>
				{theme === "dark" ? (
					<>
						<circle cx="12" cy="12" r="4" />
						<path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
					</>
				) : (
					<path d="M20 15.5A9 9 0 0 1 8.5 4 9 9 0 1 0 20 15.5Z" />
				)}
			</svg>
		</button>
	);
	const [route, setRoute] = useState(
		() => new URLSearchParams(location.search),
	);
	const navigationSequence = useRef(0);
	const updateRoute = useCallback(
		(next: URLSearchParams) => {
			const sequence = ++navigationSequence.current;
			withTransition(() => {
				if (sequence === navigationSequence.current) setRoute(next);
			});
		},
		[withTransition],
	);
	const query = useQueryClient();
	const t = (ru: string, en: string) => (locale === "ru" ? ru : en);
	const motionButton = (
		<button
			className="motion-toggle"
			disabled={systemMotionReduced}
			onClick={() => setMotionPaused(!motionPaused)}
			aria-pressed={!motionPaused && !systemMotionReduced}
			aria-label={
				systemMotionReduced
					? t("Движение уменьшено в системе", "System reduces motion")
					: motionPaused
						? t("Включить анимацию", "Enable animation")
						: t("Остановить анимацию", "Pause animation")
			}
			title={
				systemMotionReduced
					? t("Движение уменьшено в системе", "System reduces motion")
					: motionPaused
						? t("Включить анимацию", "Enable animation")
						: t("Остановить анимацию", "Pause animation")
			}
		>
			<svg
				aria-hidden="true"
				viewBox="0 0 20 20"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
			>
				{motionPaused || systemMotionReduced ? (
					<path d="m7 5 7 5-7 5Z" />
				) : (
					<path d="M7 5v10m6-10v10" />
				)}
			</svg>
			<span>
				{systemMotionReduced
					? t("Уменьшено в системе", "System setting")
					: motionPaused
						? t("Движение выкл.", "Motion off")
						: t("Движение вкл.", "Motion on")}
			</span>
		</button>
	);
	useEffect(() => {
		document.documentElement.lang = locale;
		try {
			localStorage.setItem("opsweave.locale.v1", locale);
		} catch {}
	}, [locale]);
	useEffect(() => {
		const update = () => updateRoute(new URLSearchParams(location.search));
		window.addEventListener("popstate", update);
		return () => window.removeEventListener("popstate", update);
	}, [updateRoute]);
	const navigate = (page: string, id?: string) => {
		const next = new URLSearchParams({ page });
		if (id) next.set("id", id);
		// Commit browser history immediately; a visual snapshot must not delay Back/refresh.
		history.pushState(null, "", `?${next}`);
		updateRoute(next);
		document.getElementById(mainId)?.focus({ preventScroll: true });
		window.scrollTo({ top: 0, behavior: "instant" });
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
				Дежурно
				<span>{t("Открываем пространство…", "Opening workspace…")}</span>
			</div>
		);
	if (!me.data)
		return (
			<Auth
				locale={locale}
				localeButton={changeLocale}
				themeButton={themeButton}
				motionButton={motionButton}
				onLearn={() => navigate("incidents")}
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
		<div className={`app-shell page-${page}`}>
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
					<span className="brand-mark" aria-hidden="true">
						{brandSymbol}
					</span>
					Дежурно
					<span className="brand-dot" />
				</a>
				<div className="workspace">
					<span className="workspace-avatar">
						{me.data.email?.[0]?.toUpperCase() || brandSymbol}
					</span>
					<div>
						<b>{t("Личное пространство", "Personal workspace")}</b>
						<small>
							{me.data.email || t("Посетитель · 7 дней", "Visitor · 7 days")}
						</small>
					</div>
				</div>
				<p className="nav-label">{t("РЕАГИРОВАНИЕ", "RESPONSE")}</p>
				<nav>
					{nav.map(([key, , ru, en]) => (
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
							<span aria-hidden="true">
								<svg
									aria-hidden="true"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="1.65"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<path d={navPaths[key]} />
								</svg>
							</span>
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
					{motionButton}
					<div className="engine-status">
						<i className={runs.error ? "disconnected" : ""} />
						<span>
							{runs.error
								? t("Связь прервана", "Connection interrupted")
								: t("На связи", "Connected")}
						</span>
					</div>

					<div className="sidebar-controls">
						{themeButton}
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
					<span className="workspace-identity">
						<span className="mobile-brand-mark" aria-hidden="true">
							{brandSymbol}
						</span>
						Дежурно <span className="separator">/</span>{" "}
						{t(
							nav.find((n) => n[0] === page)?.[2] || "Редактор",
							nav.find((n) => n[0] === page)?.[3] || "Editor",
						)}
					</span>
					<span className="topbar-note">
						{new Date().toLocaleDateString(
							locale === "ru" ? "ru-RU" : "en-GB",
							{ day: "numeric", month: "long" },
						)}
					</span>
					<div className="mobile-controls">
						{themeButton}
						<details className="mobile-more">
							<summary>{t("Ещё", "More")}</summary>
							<nav aria-label={t("Дополнительно", "More pages")}>
								{motionButton}
								{nav
									.filter((n) =>
										["analytics", "integrations", "account"].includes(n[0]),
									)
									.map(([key, , ru, en]) => (
										<a
											key={key}
											href={`?page=${key}`}
											onClick={(e) => {
												e.preventDefault();
												e.currentTarget
													.closest("details")
													?.removeAttribute("open");
												navigate(key);
											}}
										>
											{t(ru, en)}
										</a>
									))}
								<button
									disabled={logout.isPending}
									onClick={() => logout.mutate()}
								>
									{t("Выйти", "Sign out")}
								</button>
							</nav>
						</details>
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
									"Личное пространство · 7 дней",
									"Guest workspace · access for 7 days",
								)}
							</span>
							<button onClick={() => navigate("account")}>
								{t("Создать аккаунт", "Keep access")} →
							</button>
						</div>
					)}
					<div className="content">
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
												<p className="eyebrow">{t("БИБЛИОТЕКА", "LIBRARY")}</p>
												<h1>{t("Инструкции", "Instructions")}</h1>
												<p className="muted">
													{t(
														"Создавайте, редактируйте и запускайте.",
														"Your next steps, always within reach.",
													)}
												</p>
											</div>
											<button
												className="primary"
												onClick={() => navigate("editor")}
											>
												+ {t("Создать инструкцию", "Create instruction")}
											</button>
										</div>
										{!playbooks.data?.length ? (
											<div className="empty panel">
												<span className="empty-symbol">{brandSymbol}</span>
												<h2>
													{t(
														"Подготовьте первый план на случай сбоя",
														"Prepare your first plan for an IT failure",
													)}
												</h2>
												<p>
													{t(
														"Добавьте задачи, подтверждение и проверку результата. Или начните с редактируемого шаблона восстановления.",
														"Add tasks, an confirmation and outcome verification. Or start with an editable recovery template.",
													)}
												</p>
												<button
													className="primary"
													onClick={() => navigate("editor")}
												>
													{t(
														"Создать первую инструкцию",
														"Create your first action plan",
													)}{" "}
													→
												</button>
											</div>
										) : (
											<div className="playbook-grid">
												{playbooks.data.map((p) => (
													<article className="panel playbook-card" key={p.id}>
														<div className="card-top">
															<span className="card-symbol">{brandSymbol}</span>
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
																t(
																	"Описание не добавлено",
																	"No description yet",
																)}
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
															{p.published && (
																<button
																	className="primary"
																	onClick={() => {
																		history.pushState(
																			null,
																			"",
																			`?page=incidents&start=${p.id}`,
																		);
																		window.dispatchEvent(
																			new PopStateEvent("popstate"),
																		);
																	}}
																>
																	{t("Запустить", "Run")} →
																</button>
															)}
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
											fromTemplate={route.get("template") === "recovery"}
											start={(planId) => {
												history.pushState(
													null,
													"",
													`?page=incidents&start=${planId}`,
												);
												window.dispatchEvent(new PopStateEvent("popstate"));
											}}
											playbook={playbooks.data?.find((p) => p.id === id)}
											close={() => navigate("playbooks")}
										/>
									</Suspense>
								)}
								{page === "learn" && (
									<Suspense
										fallback={
											<p aria-busy="true">
												{t("Загружаем пример…", "Loading example…")}
											</p>
										}
									>
										<Learn
											key={me.data.id}
											locale={locale}
											userId={me.data.id}
											renderRun={(runId) => (
												<RunDetail
													key={runId}
													locale={locale}
													id={runId}
													back={() => navigate("incidents")}
													navigate={navigate}
												/>
											)}
										/>
									</Suspense>
								)}
								{(page === "incidents" || page === "history") && (
									<Incidents
										key={`${page}:${route.get("start") || ""}`}
										historyOnly={page === "history"}
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
												{t(
													"Личное рабочее пространство",
													"A personal workspace",
												)}
											</h2>
											<p>
												{t(
													"Инструкции, выполнения и ключ интеграции доступны только в вашем аккаунте. Общих гостевых данных, приглашений и командных ролей нет.",
													"Your account owns its action plans, executions and integration key. Guest data is never shared. Invitations and team roles are not available.",
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
					</div>
				</main>
			</div>
		</div>
	);
}

function Auth({
	motionButton,
	themeButton,
	locale,
	localeButton,
	onSuccess,
	error,
	onLearn,
}: {
	locale: Locale;
	localeButton: React.ReactNode;
	themeButton: React.ReactNode;
	motionButton: React.ReactNode;
	onSuccess: () => void;
	error: unknown;
	onLearn: () => void;
}) {
	const t = (ru: string, en: string) => (locale === "ru" ? ru : en);
	const [mode, setMode] = useState<"login" | "register">("login");
	const [showLogin, setShowLogin] = useState(false);
	const [intro, setIntro] = useState(false);
	const help = useRef<HTMLButtonElement>(null);
	const guest = useMutation({
		mutationFn: () => api("/auth/guest", "POST", {}),
		onSuccess: () => {
			onLearn();
			onSuccess();
		},
	});
	return (
		<div className="auth-page">
			<header>
				<a className="brand" href="/">
					<span className="brand-mark" aria-hidden="true">
						{brandSymbol}
					</span>
					Дежурно
				</a>
				<div className="actions">
					{themeButton}
					<button
						className="public-help"
						aria-label={t("Справка", "Help")}
						ref={help}
						onClick={() => setIntro(!intro)}
					>
						{t("Справка", "Help")}
					</button>
					{localeButton}
					<button
						onClick={() => setShowLogin(!showLogin)}
						aria-expanded={showLogin}
					>
						{showLogin ? t("Назад", "Back") : t("Войти", "Sign in")} ↗
					</button>
				</div>
			</header>
			<div className="welcome-guide">
				{intro && (
					<Guide
						locale={locale}
						onClose={() => {
							setIntro(false);
							help.current?.focus();
						}}
						steps={[
							{
								title: t("Откройте пространство", "Open your workspace"),
								text: t(
									"Попробовать без регистрации создаёт отдельное пространство. Инструкции и история сохраняются на сервере.",
									"Try without signing up creates a private workspace. Instructions and history are saved on the server.",
								),
								target: "[data-learn='guest']",
							},
							{
								title: t(
									"Создайте и запустите инструкцию",
									"Create and run an instruction",
								),
								text: t(
									"Начните с готовой инструкции или создайте свою. Сохраните, опубликуйте и запустите её. Задачи выполняете вы, приложение хранит результаты.",
									"Start with a ready instruction or create your own. Save, publish and run it. You perform tasks; the app keeps the results.",
								),
								target: "[data-learn='guest']",
							},
							{
								title: t("Сохраните доступ", "Keep access"),
								text: t(
									"Гостевой доступ привязан к cookie этого браузера и действует 7 дней. Регистрация закрепит уже созданные записи за вами. После выхода или потери cookie без регистрации вернуться нельзя.",
									"Guest access uses this browser's cookie for 7 days. Register to keep your existing records. Signing out or losing the cookie removes access unless you registered.",
								),
								target: "[data-learn='guest']",
							},
						]}
					/>
				)}
			</div>
			<main
				className="auth-layout"
				onPointerMove={(event) => {
					if (
						matchMedia("(prefers-reduced-motion: reduce)").matches ||
						event.pointerType !== "mouse"
					)
						return;
					const rect = event.currentTarget.getBoundingClientRect();
					event.currentTarget.style.setProperty(
						"--pointer-x",
						String(((event.clientX - rect.left) / rect.width - 0.5) * 12),
					);
					event.currentTarget.style.setProperty(
						"--pointer-y",
						String(((event.clientY - rect.top) / rect.height - 0.5) * 8),
					);
				}}
				onPointerLeave={(event) => {
					event.currentTarget.style.setProperty("--pointer-x", "0");
					event.currentTarget.style.setProperty("--pointer-y", "0");
				}}
			>
				<section className="auth-story">
					<p className="eyebrow">
						{t("РЕАГИРОВАНИЕ ПО ИНСТРУКЦИИ", "INCIDENT RESPONSE WORKSPACE")}
					</p>
					<h1>
						{t("Сбой — не время", "An incident is no time")}
						<br />
						<span>{t("вспоминать порядок.", "to improvise.")}</span>
					</h1>
					<p className="auth-lead">
						{t(
							"Инструкция ведёт по шагам. Вы принимаете решения — Дежурно сохраняет результат.",
							"Run your instructions. Work through the steps. Keep decisions and outcomes together.",
						)}
					</p>
					<button
						className="primary guest-cta"
						data-learn="guest"
						disabled={guest.isPending}
						onClick={() => guest.mutate()}
					>
						{guest.isPending
							? t("Открываем пространство…", "Opening workspace…")
							: t("Попробовать без регистрации", "Try without signing up")}{" "}
						<span aria-hidden="true">↗</span>
					</button>
					<p className="access-note">
						{t(
							"Без почты и пароля. Отдельное пространство на 7 дней.",
							"No email or password. Your own workspace for 7 days.",
						)}
					</p>
					{Boolean(guest.error || error) && (
						<div className="error" role="alert">
							{errorText(guest.error || error, locale)}
							<button onClick={() => guest.mutate()} disabled={guest.isPending}>
								{t("Повторить", "Retry")}
							</button>
						</div>
					)}
					<div className="entry-proof">
						<span className="proof-check" aria-hidden="true">
							✓
						</span>
						{t(
							"Ваши инструкции и история сохраняются на сервере.",
							"Your instructions and history are saved to the server.",
						)}
					</div>
				</section>
				{showLogin ? (
					<section
						className="auth-panel panel"
						aria-label={t("Вход в аккаунт", "Account sign in")}
					>
						<h2>
							{mode === "login"
								? t("С возвращением", "Welcome back")
								: t("Ваше пространство", "Your workspace")}
						</h2>
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
						<p className="muted small">
							{t(
								"Восстановление пароля по почте пока недоступно.",
								"Email password recovery is not available yet.",
							)}
						</p>
					</section>
				) : (
					<section
						className="instruction-preview infrastructure-scene"
						aria-label={t("Маршрут выполнения", "Execution route")}
					>
						<div
							className="infrastructure-coordinate coordinate-top"
							aria-hidden="true"
						>
							{t("СИГНАЛ → ДЕЙСТВИЕ", "SIGNAL → RESPONSE")}
						</div>
						<div className="infrastructure-ground" aria-hidden="true" />
						<picture>
							<source
								media="(max-width: 600px)"
								srcSet="/visuals/response-core-v4-small.png"
							/>
							<img
								className="hero-infrastructure"
								src="/visuals/response-core-v4.png"
								alt=""
								width="1536"
								height="1024"
								fetchPriority="high"
							/>
						</picture>
						<svg
							className="infrastructure-trace"
							viewBox="0 0 900 560"
							fill="none"
							aria-hidden="true"
						>
							<path
								className="trace-base"
								d="M30 430 265 515 512 414 795 505 874 458"
							/>
							<path
								className="trace-signal"
								d="M30 430 265 515 512 414 795 505 874 458"
							/>
							<circle cx="512" cy="414" r="5" />
							<circle cx="795" cy="505" r="5" />
						</svg>
						<div className="infrastructure-callout">
							<span className="scene-beacon-dot" />
							<div>
								<small>
									{t("ВАЖЕН ПОРЯДОК ДЕЙСТВИЙ", "THE NEXT STEP MATTERS")}
								</small>
								<b>
									{t("От сигнала — к решению.", "From signal to a decision.")}
								</b>
							</div>
						</div>
						<div className="scene-controls">
							<span>
								{t("Задача · Решение · История", "Task · Decision · History")}
							</span>
							{motionButton}
						</div>
					</section>
				)}
			</main>
			{!showLogin && (
				<section
					className="entry-sequence"
					aria-label={t("Как проходит выполнение", "How execution works")}
				>
					<div>
						<span className="sequence-number">01</span>
						<h2>{t("Подготовьте", "Prepare")}</h2>
						<p>
							{t(
								"Соберите действия в инструкцию.",
								"Turn your actions into an instruction.",
							)}
						</p>
					</div>
					<i aria-hidden="true" />
					<div>
						<span className="sequence-number">02</span>
						<h2>{t("Действуйте", "Act")}</h2>
						<p>
							{t(
								"Пройдите шаги и подтвердите решения.",
								"Work through steps and confirm decisions.",
							)}
						</p>
					</div>
					<i aria-hidden="true" />
					<div>
						<span className="sequence-number">03</span>
						<h2>{t("Сохраните", "Keep")}</h2>
						<p>
							{t(
								"Вернитесь к результату в истории.",
								"Return to the outcome in your history.",
							)}
						</p>
					</div>
				</section>
			)}
			<footer className="auth-footer">
				<span>
					Дежурно / {t("Инструкции и выполнение", "Instructions and execution")}
				</span>
				<span>
					{t(
						"Данные сохраняются в вашем пространстве.",
						"Records stay in your workspace.",
					)}
				</span>
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
	historyOnly = false,
}: {
	locale: Locale;
	runs: Run[];
	playbooks: Playbook[];
	id: string | null;
	navigate: (page: string, id?: string) => void;
	filter: string;
	historyOnly?: boolean;
}) {
	const t = (ru: string, en: string) => (locale === "ru" ? ru : en);
	const [creating, setCreating] = useState(
		!!new URLSearchParams(location.search).get("start"),
	);
	const query = useQueryClient();
	const active = runs.find((r) => ["running", "waiting"].includes(r.status));
	const current = active?.steps[active.cursor];
	const ready = playbooks.find((p) => p.published);
	const openTemplate = () => {
		history.pushState(null, "", "?page=editor&template=recovery");
		window.dispatchEvent(new PopStateEvent("popstate"));
	};
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
		<section className={historyOnly ? "history-page" : "overview-page"}>
			<div className="section-heading">
				<div>
					<p className="eyebrow">
						{historyOnly
							? t("ВЫПОЛНЕНИЕ", "EXECUTION")
							: t("ОБЗОР", "OVERVIEW")}
					</p>
					<h1>
						{historyOnly
							? t("История запусков", "Run history")
							: t("В работе", "In progress")}
					</h1>
					<p className="muted">
						{historyOnly
							? t(
									"Сохранённые шаги и принятые решения.",
									"Saved steps and decisions.",
								)
							: active
								? t(
										"Запуски, которым нужно ваше действие.",
										"Runs that need your action.",
									)
								: t(
										"От инструкции к сохранённому результату.",
										"From instruction to a saved result.",
									)}
					</p>
				</div>
				<button
					className="primary"
					onClick={() =>
						playbooks.some((p) => p.published)
							? setCreating(!creating)
							: navigate("editor")
					}
					aria-expanded={creating}
				>
					↗ {t("Запустить инструкцию", "Run an instruction")}
				</button>
			</div>
			{creating && (
				<CreateIncident
					initialPlaybookId={
						new URLSearchParams(location.search).get("start") || undefined
					}
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
			{!creating && (
				<>
					{!historyOnly && (
						<div className={`overview-grid${runs.length ? "" : " is-quiet"}`}>
							<div className="overview-body">
								<article
									className="focus-surface"
									data-state={active ? "active" : ready ? "ready" : "new"}
								>
									{routeArt}
									<div className="focus-content">
										<div className="focus-meta">
											<span className="live-dot" />
											{active
												? t("СЕЙЧАС В РАБОТЕ", "IN PROGRESS")
												: t("БЫСТРЫЙ СТАРТ", "QUICK START")}
											{active && (
												<span className="focus-code">{active.service}</span>
											)}
										</div>
										<h2>
											{active
												? active.title
												: ready?.published?.name ||
													t(
														"Первая инструкция — уже здесь",
														"Your first instruction is ready",
													)}
										</h2>
										{active ? (
											<>
												<p>{active.playbookName}</p>
												<fieldset
													className="focus-progress"
													aria-label={t(
														"Прогресс выполнения",
														"Execution progress",
													)}
												>
													{active.steps.map((step, i) => (
														<span
															key={step.id}
															className={
																i === active.cursor
																	? "current"
																	: step.status === "completed"
																		? "done"
																		: ""
															}
														>
															{step.status === "completed" ? "✓" : i + 1}
														</span>
													))}
												</fieldset>
												<div className="focus-action">
													<div>
														<small>{t("СЛЕДУЮЩИЙ ШАГ", "NEXT STEP")}</small>
														<h3>
															{current?.title || label(active.status, locale)}
														</h3>
													</div>
													<button
														className="primary"
														onClick={() => navigate("incidents", active.id)}
													>
														{t("Продолжить", "Continue")} →
													</button>
												</div>
											</>
										) : (
											<>
												<p>
													{ready
														? t(
																"Запустите инструкцию, чтобы начать выполнение.",
																"Your instruction is ready. Run it and work through the steps at your pace.",
															)
														: t(
																"Проверка, решение, контроль результата. Измените готовый маршрут под свой сервис.",
																"Start with a service recovery instruction, or create your own.",
															)}
												</p>
												<div className="focus-route" aria-hidden="true">
													<span>
														01 <small>{t("Проверить", "Investigate")}</small>
													</span>
													<i>→</i>
													<span>
														02 <small>{t("Подтвердить", "Confirm")}</small>
													</span>
													<i>→</i>
													<span>
														03 <small>{t("Завершить", "Resolve")}</small>
													</span>
												</div>
												<button
													className="primary"
													onClick={() =>
														ready ? setCreating(true) : openTemplate()
													}
												>
													{ready
														? t("Начать выполнение", "Start execution")
														: t(
																"Открыть готовую инструкцию",
																"Open a ready instruction",
															)}{" "}
													→
												</button>
											</>
										)}
									</div>{" "}
								</article>
								{playbooks.length > 0 && (
									<div className="library-heading">
										<h2>{t("Инструкции", "Instructions")}</h2>
										<button
											className="text-button"
											onClick={() => navigate("playbooks")}
										>
											{t("Все инструкции", "All instructions")} ↗
										</button>
									</div>
								)}
								{playbooks.length ? (
									<div className="quick-library">
										{playbooks.slice(0, 4).map((p, i) => (
											<button
												key={p.id}
												onClick={() => navigate("editor", p.id)}
											>
												<span className="library-number">
													{String(i + 1).padStart(2, "0")}
												</span>
												<span>
													<b>{p.name}</b>
													<small>
														{p.steps.length} {t("шагов", "steps")} ·{" "}
														{p.published
															? t("Готова к запуску", "Ready to run")
															: t("Черновик", "Draft")}
													</small>
												</span>
												<span aria-hidden="true">↗</span>
											</button>
										))}
									</div>
								) : (
									<div className="quiet-history">
										<p>
											{t(
												"Начните с готовой инструкции или соберите свою. Результат останется в истории.",
												"Start with a ready instruction or build your own. Results stay in your history.",
											)}
										</p>
										<button
											className="text-button"
											onClick={() => navigate("editor")}
										>
											+ {t("Создать с нуля", "Create from scratch")}
										</button>
									</div>
								)}
							</div>
							<aside className="activity-rail">
								<p className="eyebrow">{t("АКТИВНОСТЬ", "ACTIVITY")}</p>
								<div className="pulse-stat">
									<strong>
										{
											runs.filter((r) =>
												["running", "waiting"].includes(r.status),
											).length
										}
									</strong>
									<span>{t("в работе", "in progress")}</span>
								</div>
								<div className="pulse-stat">
									<strong>
										{runs.filter((r) => r.status === "completed").length}
									</strong>
									<span>{t("завершено", "completed")}</span>
								</div>
								<h2>{t("Последние запуски", "Recent runs")}</h2>
								{runs.length ? (
									runs.slice(0, 4).map((r) => (
										<a
											key={r.id}
											href={`?page=incidents&id=${r.id}`}
											onClick={(e) => {
												e.preventDefault();
												navigate("incidents", r.id);
											}}
										>
											<span className={`activity-dot ${r.status}`} />
											<div>
												<time>{date(r.updated, locale)}</time>
												<b>{r.title}</b>
												<small>{label(r.status, locale)}</small>
											</div>
										</a>
									))
								) : (
									<p className="activity-empty">
										{t(
											"Запустите инструкцию — здесь появится история действий.",
											"All quiet. Your results will appear here after the first run.",
										)}
									</p>
								)}
								<button
									className="text-button"
									onClick={() => navigate("history")}
								>
									{t("Открыть историю", "Open history")} →
								</button>
							</aside>
						</div>
					)}
					{(historyOnly || runs.length > 0) && (
						<>
							<h2 className="history-heading">
								{historyOnly
									? t("Все выполнения", "All executions")
									: t("Запуски инструкций", "Instruction runs")}
							</h2>
							{!runs.length ? (
								<div className="empty panel history-empty">
									<span className="empty-symbol">↗</span>
									<h2>{t("Ещё нет запусков", "No runs yet")}</h2>
									<p>
										{playbooks.some((p) => p.published)
											? t(
													"Запустите инструкцию — здесь сохранится каждый шаг.",
													"Your action plan is ready. Create an incident — the server will execute it and show where your action is needed.",
												)
											: t(
													"Сохраните и опубликуйте инструкцию, чтобы начать выполнение.",
													"Create and publish your first action plan. Then start a real incident response.",
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
											? t(
													"Запустить первую инструкцию",
													"Start your first incident",
												)
											: t("Перейти к инструкциям", "Go to action plans")}{" "}
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
												<span className="row-time">
													{date(run.created, locale)}
												</span>
												<span aria-hidden="true">↗</span>
											</a>
										))
									)}
								</div>
							)}
						</>
					)}
				</>
			)}
		</section>
	);
}
function CreateIncident({
	initialPlaybookId,
	locale,
	playbooks,
	close,
	done,
}: {
	locale: Locale;
	playbooks: Playbook[];
	close: () => void;
	done: (run: Run) => void;
	initialPlaybookId?: string;
}) {
	const t = (ru: string, en: string) => (locale === "ru" ? ru : en);
	const { register, handleSubmit, getValues, setValue } = useForm({
		defaultValues: {
			title: "",
			service: "",
			severity: "high",
			playbookId:
				playbooks.find((p) => p.id === initialPlaybookId && p.published)?.id ||
				playbooks.find((p) => p.published)?.id ||
				"",
		},
	});
	useEffect(() => {
		const selected = getValues("playbookId");
		if (playbooks.some((p) => p.id === selected && p.published)) return;
		const ready =
			playbooks.find((p) => p.id === initialPlaybookId && p.published) ||
			playbooks.find((p) => p.published);
		if (ready) setValue("playbookId", ready.id);
	}, [playbooks, initialPlaybookId, getValues, setValue]);
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
						aria-label={t("Название инцидента", "Incident title")}
						{...register("title")}
					/>
					<small className="muted">
						{t(
							"Для поиска в истории.",
							"A short failure description helps you find it in history.",
						)}
					</small>
				</label>
				<label>
					{t("Сервис", "Service")}
					<input
						required
						maxLength={100}
						placeholder="payments-api"
						aria-label={t("Сервис", "Service")}
						{...register("service")}
					/>
					<small className="muted">
						{t(
							"Для группировки запусков.",
							"A site or service name for grouping; no connection is created.",
						)}
					</small>
				</label>
				<label>
					{t("Приоритет", "Severity")}
					<small className="muted">
						{t(
							"Используется в условиях шагов.",
							"Affects conditional steps, not repair speed.",
						)}
					</small>
					<select {...register("severity")}>
						{["critical", "high", "medium", "low"].map((s) => (
							<option key={s} value={s}>
								{label(s, locale)}
							</option>
						))}
					</select>
				</label>
				<label>
					{t("Инструкция", "Instruction")}
					<small className="muted">
						{t(
							"Запуск закрепится за опубликованной версией.",
							"Uses the published version. Draft edits do not change it.",
						)}
					</small>
					<select required {...register("playbookId", { required: true })}>
						<option value="" disabled>
							{t("Выберите инструкцию", "Choose an instruction")}
						</option>
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
						: t("Создать и запустить", "Create and start")}
				</button>
				<span className="muted small">
					{t(
						"Каждый шаг и его результат останутся в истории.",
						"Sequence and history are saved on the server. People perform tasks. A sleeping free server can delay timers.",
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
				<button onClick={back}>← {t("К запускам", "Back to runs")}</button>
				{detail.error ? (
					<div className="error" role="alert">
						{detail.error instanceof ApiError && detail.error.status === 404
							? t(
									"Этот запуск недоступен в текущем браузере. Откройте историю своего пространства.",
									"This run is unavailable in this browser. Open your workspace history.",
								)
							: errorText(detail.error, locale)}
						<button
							onClick={() =>
								detail.error instanceof ApiError && detail.error.status === 404
									? navigate("history")
									: detail.refetch()
							}
						>
							{detail.error instanceof ApiError && detail.error.status === 404
								? t("Моя история", "My history")
								: t("Повторить", "Retry")}
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
					<a
						data-learn="export"
						className="button"
						href={`/api/runs/${id}/export`}
					>
						{t("Выгрузить JSON", "Export JSON")} ↗
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
									{t("ВЫПОЛНЕНИЕ ПЛАНА", "PLAN EXECUTION")}
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
								aria-label={t("Выполнение плана", "Action plan progress")}
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
					<div className="panel timeline" data-learn="history" tabIndex={-1}>
						<h2>{t("История", "Response history")}</h2>
						<p className="muted small">
							{t(
								"События этого выполнения плана, сохранённые на сервере.",
								"Events from this plan execution, saved on the server.",
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
							data-learn={current.type}
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
									? t("Подтвердите решение", "Confirm the decision")
									: t("Текущий шаг", "Current step")}
							</h2>
							<p>{current.title}</p>
							<p>
								{current.type === "approval"
									? t(
											"Проверьте результат и подтвердите или отклоните решение.",
											"The next step is blocked until you decide. Confirm the outcome or reject execution with a reason.",
										)
									: t(
											"Выполните действие вне приложения и запишите результат.",
											"Perform the action outside the app first, then record the result. For a practice example, a fictional note is enough.",
										)}
							</p>
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
									? t("Подтвердить решение", "Confirm decision")
									: t("Шаг выполнен", "Step complete")}
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
									"Результат сохранится в истории.",
									"Your decision and comment will be recorded in the incident history.",
								)}
							</p>
						</form>
					) : (
						<div
							className="panel result-panel"
							data-learn="result"
							tabIndex={-1}
						>
							<span className="decision-icon">
								{run.status === "completed"
									? "✓"
									: run.status === "failed"
										? "×"
										: "◷"}
							</span>
							<h2>
								{run.status === "completed"
									? t("Инструкция выполнена", "Instruction complete")
									: run.status === "waiting"
										? t("Ожидание по таймеру", "Observation in progress")
										: label(run.status, locale)}
							</h2>
							<p>
								{run.status === "completed"
									? t(
											"Все шаги пройдены. Результаты и история сохранены.",
											"All matching steps have finished. History and notes are saved below. Completing a plan alone does not prove the website is working.",
										)
									: t(
											"Ожидаем следующий шаг. Можно закрыть страницу и вернуться позже.",
											"This page updates automatically. The timer waits for the configured time but does not check the website. Server sleep can delay continuation; history is retained.",
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
					<details className="panel run-context">
						<summary>
							{t("Детали и управление запуском", "Run details and controls")}
						</summary>
						<h2>{t("О выполнении плана", "Plan execution")}</h2>
						<dl>
							<dt>{t("Сервис", "Service")}</dt>
							<dd>{run.service}</dd>
							<dt>{t("Последнее событие", "Last update")}</dt>
							<dd>{date(run.updated, locale)}</dd>
							<dt>{t("Номер выполнения", "Correlation")}</dt>
							<dd className="mono">{run.id}</dd>
						</dl>
						{run.parentId && (
							<button onClick={() => navigate("incidents", run.parentId)}>
								{t("Исходное выполнение", "Original execution")} ↗
							</button>
						)}
						{["running", "waiting"].includes(run.status) ? (
							<button
								className="danger wide"
								disabled={action.isPending}
								onClick={(event) => {
									if (
										window.confirm(
											t(
												"Остановить выполнение? История сохранится.",
												"Stop execution? History will be preserved.",
											),
										)
									)
										action.mutate({ action: "cancel" });
									else event.currentTarget.focus();
								}}
							>
								{t("Остановить выполнение", "Stop execution")}
							</button>
						) : (
							<button
								className="wide"
								disabled={replay.isPending}
								onClick={() => replay.mutate()}
							>
								{t("Выполнить план повторно", "Start the plan again")}
							</button>
						)}
						<p className="small muted">
							{t(
								"Повторное выполнение создаёт отдельную попытку по актуальной опубликованной версии.",
								"Starting again creates a separate execution using the latest published version.",
							)}
						</p>
					</details>
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
						{t("ИТОГИ ВЫПОЛНЕНИЯ ПЛАНОВ", "PLAN EXECUTION RESULTS")}
					</p>
					<h1>{t("Аналитика реагирования", "Response analytics")}</h1>
					<p className="muted">
						{t(
							"Итоги записей вашего пространства за всё время, включая учебные примеры. Это не автоматическая оценка работоспособности сайта.",
							"All-time results for records in your workspace, including practice examples. These do not automatically assess website health.",
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
							"Итоги появятся после первого выполнения плана",
							"Metrics appear after your first plan execution",
						)}
					</h2>
					<p>
						{t(
							"Создайте инцидент и пройдите план. Здесь появятся фактические времена реагирования.",
							"Create an incident and complete its action plan to see actual response times.",
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
						<h2>{t("Результаты планов действий", "Action plan outcomes")}</h2>
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
				playbooks.find((p) => p.published)?.id || "<published-plan-id>",
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
						"HTTP 202 означает: запись о сбое сохранена. Откройте «Инциденты», чтобы пройти план действий.",
						"HTTP 202 means the incident record is saved. Open Incidents to follow its action plan.",
					)}
				</p>
			</div>
		</section>
	);
}
