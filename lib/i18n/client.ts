"use client";

import { useEffect, useMemo, useState } from "react";
import en from "./locales/en.json";
import es from "./locales/es.json";

type SupportedLocale = "en" | "es";
type TranslationTree = Record<string, string | TranslationTree>;

const resources: Record<SupportedLocale, TranslationTree> = {
	en,
	es,
};

function resolveLocale(language: string | null | undefined): SupportedLocale {
	const parsed = language?.split(",")[0]?.split("-")[0]?.trim().toLowerCase();
	return parsed === "es" ? "es" : "en";
}

function readPath(tree: TranslationTree, path: string): string | undefined {
	return path.split(".").reduce<string | TranslationTree | undefined>((acc, key) => {
		if (!acc || typeof acc === "string") return undefined;
		return acc[key];
	}, tree) as string | undefined;
}

export function useClientLocale(defaultLocale: SupportedLocale = "en") {
	const [locale, setLocale] = useState<SupportedLocale>(defaultLocale);

	useEffect(() => {
		if (typeof navigator === "undefined") return;
		setLocale(resolveLocale(navigator.language));
	}, []);

	return locale;
}

export function useClientTranslator(defaultLocale: SupportedLocale = "en") {
	const locale = useClientLocale(defaultLocale);

	return useMemo(() => {
		const currentTree = resources[locale];
		const fallbackTree = resources.en;

		return {
			locale,
			t: (path: string, fallback?: string) =>
				readPath(currentTree, path) ??
				readPath(fallbackTree, path) ??
				fallback ??
				path,
		};
	}, [locale]);
}
