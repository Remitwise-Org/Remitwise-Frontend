# Color Contrast And Status Semantics Handoff

Feature area:
- Bills due states and insurance policy status

Route mapping:
- `/bills` -> `app/bills/page.tsx`
- `/insurance` -> `app/insurance/page.tsx`
- Shared status semantics -> `lib/ui/status-semantics.ts`

Primary user task:
- Understand whether a bill or policy needs action without depending on color perception alone.

Audit summary:
- Bills used multiple red shades for overdue, urgent, and even recurring labels, which blurred severity and relied too heavily on hue.
- Insurance policy status used a green `Active` pill without supporting copy for payment timing.
- Due-date panels displayed colored text but did not consistently provide a semantic label such as `Overdue`, `Due soon`, or `Scheduled`.

Implemented changes:
- Added semantic status tokens for `success`, `warning`, `error`, and `info` in `tailwind.config.js`
- Added shared status-mapping helper in `lib/ui/status-semantics.ts`
- Updated bill cards so badges include icon + text labels and due-date panels include action-oriented emphasis copy
- Updated insurance policy cards so payment state is derived from the next payment date and expressed with icon, label, and explanatory text

Breakpoints covered:
- Mobile:
  badges remain single-line chips
  due-state panels stack naturally inside cards
- Tablet:
  bill and policy cards continue to use two-column grids already defined by the pages
- Desktop:
  semantic badges remain compact while the supporting emphasis text sits beneath or inside the status panel

WCAG 2.1 AA notes:
- Status no longer relies on color alone; each state now includes iconography and text labels
- Panels preserve readable foreground/background contrast with darker tinted fills and lighter foreground text
- Existing focus treatments remain in place; this pass targets status semantics and contrast treatment rather than navigation changes

Semantic mapping:
- Success:
  paid bill
  active policy with payment safely scheduled
- Warning:
  bill due soon
  policy payment due within three days
- Error:
  overdue bill
  overdue policy payment
- Info:
  upcoming bill that is not urgent
  inactive policy

Spacing and type:
- Status chips use compact rounded-full or rounded-10px containers with `text-xs` labels
- Supporting emphasis lines use `text-[11px]` to `text-sm` and appear adjacent to the status icon so the meaning survives grayscale or low-vision scenarios
- Due-state panels preserve existing card spacing and height while swapping in semantic token classes

Tailwind / token notes:
- Added semantic token group:
  `status.success.*`
  `status.warning.*`
  `status.error.*`
  `status.info.*`
- This extends `tailwind.config.js`; engineering can now reuse semantic classes such as `text-status-warning-fg` and `border-status-error-border`

Component states:
- Bills:
  paid / success
  due soon / warning
  overdue / error
  scheduled / info
- Insurance:
  active on schedule / success
  due soon / warning
  overdue / error
  inactive / info

Interaction notes:
- No new click behavior was introduced
- Status updates for policies are computed from the next payment date, so semantics will shift automatically as dates move closer or pass
- Bills keep the existing `Pay Now` action, but the urgency is now reinforced by status label and emphasis text rather than color alone

Open questions:
- Should the warning threshold for policies also be used for bills, or should bills keep their existing product-defined `urgent` status from data?
- Do we want semantic tokens applied to form validation and async banners next, now that the shared status system exists?
- Should inactive insurance policies show a dedicated neutral style in a later pass instead of reusing `info`?

Closure note:
- design: handoff ready in repo docs; semantic tokens and status treatment implemented in code
