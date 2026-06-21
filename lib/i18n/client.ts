"use client";

import { useEffect, useMemo, useState } from "react";
import en from "./locales/en.json";
import es from "./locales/es.json";
import { getLocaleCookieClient, type SupportedLocale } from "./cookie";
import { resolveLocale } from "./resolve-locale";

type TranslationValue = string | { [key: string]: TranslationValue };
type TranslationTree = Record<string, TranslationValue>;

const resources: Record<SupportedLocale, TranslationTree> = {
	en: en as TranslationTree,
	es: es as TranslationTree,
};

function readPath(tree: TranslationTree, path: string): string | undefined {
	return path.split(".").reduce<any>((acc, key) => {
		if (!acc || typeof acc === "string") return undefined;
		return acc[key];
	}, tree) as string | undefined;
}

export function useClientLocale(defaultLocale: SupportedLocale = "en") {
	const [locale, setLocale] = useState<SupportedLocale>(defaultLocale);

	useEffect(() => {
		const cookieLocale = getLocaleCookieClient();
		const navLang = typeof navigator !== "undefined" ? navigator.language : null;

		const { locale: resolved } = resolveLocale({
			cookieLocale,
			navigatorLocale: navLang,
		});

		setLocale(resolved);
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
