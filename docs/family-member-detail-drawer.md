# Family Member Detail Drawer

Feature area:
- Family Wallets per-member drill-down, spending-limit review, and limit editing.

Route mapping:
- Page: `app/family/page.tsx`
- Member list: `app/family/components/FamilyMemberSection.tsx`
- Member card presentation: `app/family/components/FamilyMemberStatCard.tsx`
- Drawer: `app/family/components/FamilyMemberDetailDrawer.tsx`
- Data hook: `lib/hooks/useFamilyMemberDetail.ts`

API mapping:
- `GET /api/family/members/[id]` loads member role/address/limit detail.
- `GET /api/family/members/[id]/limit` is requested as the dedicated limit snapshot surface.
- `GET /api/family/members/[id]/check?amount=0` loads current utilization and remaining limit when available.
- `PATCH /api/family/members/[id]/limit` persists spending-limit edits.

Interaction:
- Each member card exposes `View Details` and `Edit Limits`; both open the same accessible drawer so there is one persisted edit path.
- The drawer uses `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, focus trapping, Escape close, backdrop close, and body-scroll locking.
- Mobile uses a full-screen drawer; `sm` and larger screens use a right-side panel.

States:
- Loading uses an in-drawer skeleton.
- Empty and activity-empty states use `WidgetEmptyState`.
- Hard load failures use `WidgetErrorState`.
- Current backend `501 Not Implemented` contract stubs are treated as live-data unavailable, not a hard drawer failure, so seeded card data remains visible during contract rollout.

Limit editing:
- The drawer validates limits with `validateSpendingLimit`.
- Save dispatches an optimistic pending limit, PATCHes the limit route through `apiClient`, and rolls back on failure.
- Success/failure outcomes use the global toast pattern.

i18n:
- Drawer copy lives under `familyDrawer` in `lib/i18n/locales/en.json` and `lib/i18n/locales/es.json`.

Testing:
- `tests/unit/useFamilyMemberDetail.test.ts` covers reducer state transitions, endpoint reads, 501 fallback handling, limit PATCH behavior, optimistic dispatch runners, and rollback paths.
- Focused coverage for `lib/hooks/useFamilyMemberDetail.ts` is above the target: 91.66% lines and 89% branches.
