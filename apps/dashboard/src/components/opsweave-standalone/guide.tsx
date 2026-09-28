import { useEffect, useRef, useState } from "react";
import type { Locale } from "./api";
export type GuideStep = { title: string; text: string; target: string };
export function Guide({
	locale,
	steps,
	onClose,
}: {
	locale: Locale;
	steps: GuideStep[];
	onClose: () => void;
}) {
	const [index, setIndex] = useState(0);
	const [missing, setMissing] = useState(false);
	const heading = useRef<HTMLHeadingElement>(null);
	const t = (ru: string, en: string) => (locale === "ru" ? ru : en);
	const close = useRef(onClose);
	close.current = onClose;
	useEffect(() => {
		const onEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.preventDefault();
				close.current();
			}
		};
		window.addEventListener("keydown", onEscape);
		return () => window.removeEventListener("keydown", onEscape);
	}, []);
	const change = (next: number) => {
		setIndex(next);
		setMissing(false);
		heading.current?.focus();
	};
	const point = () => {
		const target = document.querySelector<HTMLElement>(steps[index].target);
		if (!target || target.matches(":disabled")) {
			setMissing(true);
			return;
		}
		setMissing(false);
		target.scrollIntoView({ block: "center", behavior: "instant" });
		target.focus({ preventScroll: true });
	};
	return (
		<section
			className="panel walkthrough"
			aria-label={t("Пошаговое знакомство", "Step-by-step guide")}
		>
			<p className="eyebrow">
				{t("КАК ПОЛЬЗОВАТЬСЯ", "HOW TO USE")} · {index + 1} / {steps.length}
			</p>
			<h2 ref={heading} tabIndex={-1}>
				{steps[index].title}
			</h2>
			<p aria-live="polite">{steps[index].text}</p>
			<button onClick={point}>
				{t("Перейти к элементу", "Go to the control")}
			</button>
			{missing && (
				<output>
					{t(
						"Этот элемент пока недоступен или шаг уже пройден. Посмотрите текущее состояние ниже; можно вернуться назад или пропустить подсказки.",
						"This control is not available yet, or its step is already done. Check the current state below; you can go back or skip the guide.",
					)}
				</output>
			)}
			<div className="actions">
				<button disabled={index === 0} onClick={() => change(index - 1)}>
					{t("Назад", "Back")}
				</button>
				{index < steps.length - 1 ? (
					<button onClick={() => change(index + 1)}>
						{t("Далее", "Next")}
					</button>
				) : (
					<button onClick={onClose}>{t("Завершить", "Finish")}</button>
				)}
				<button onClick={onClose}>{t("Пропустить", "Skip")}</button>
			</div>
		</section>
	);
}
