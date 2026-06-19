"use client";

import { useEffect, useMemo, useState } from "react";
import en from "./locales/en.json";
import es from "./locales/es.json";

type SupportedLocale = "en" | "es";
type TranslationValue = string | { [key: string]: TranslationValue };
type TranslationTree = Record<string, TranslationValue>;

const resources: Record<SupportedLocale, TranslationTree> = {
	en: en as TranslationTree,
	es: es as TranslationTree,
};

function resolveLocale(language: string | null | undefined): SupportedLocale {
	const parsed = language?.split(",")[0]?.split("-")[0]?.trim().toLowerCase();
	return parsed === "es" ? "es" : "en";
}

function readPath(tree: TranslationTree, path: string): string | undefined {
	return path.split(".").reduce<any>((acc, key) => {
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
			t: (path: string, options?: string | Record<string, any>) => {
				let text = readPath(currentTree, path) ??
					readPath(fallbackTree, path) ??
					(typeof options === 'string' ? options : path);

				if (typeof options === 'object' && typeof text === 'string') {
					Object.entries(options).forEach(([key, value]) => {
						text = text.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
					});
				}
				return text;
			}
		};
	}, [locale]);
}
