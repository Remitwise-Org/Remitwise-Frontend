# Bills Page i18n Scaffolding

Route mapping:
- `/bills` -> `app/bills/page.tsx`
- Client locale lookup -> `lib/i18n/client.ts`
- Locale copy -> `lib/i18n/locales/en.json` and `lib/i18n/locales/es.json`

What changed:
- Added client-side locale reads for `en` and `es` so the route can consume `lib/i18n/locales/` on the frontend using `useClientTranslator()`.
- Expanded copy for the bills page including headers, form labels, form inputs, dynamic summaries, async statuses, and toast notifications.
- Moved fixed strings from the JSX structure and state handlers into external locale files to ensure multi-language scalability.

Component states:
- All static headers and button labels are translatable.
- Async operation states (idle, pending, success, error) and queue summaries are dynamically translated.
- Toast notifications (such as "Bill overdue") are now translated, ensuring users see critical alerts in their configured language.

Architecture Integration:
- We retain the existing `runWidgetFetchWithRetry` pattern while injecting the `t` translator function safely into React dependencies (`useMemo`, `useEffect`, etc.).
- Unit tests continue to validate loading skeleton lifecycles and fallback states seamlessly.
