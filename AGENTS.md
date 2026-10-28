<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Format all product quantities through the shared helpers in `src/lib/erp.ts`, because stock uses internal units while the UI must show each product's registered package unit and remainder.
- Product stock forms accept the registered principal unit and convert to internal units only on save, preventing package counts from being persisted as loose units.
- Treasury adjustments use identified `cash_movements`: cash as supplies/withdrawals and digital as signed receipts, so the existing real-time balance remains the single source of truth.
- Accounts payable share the page's date range; expand month-to-date to the full month only for due-date listings, preserving other financial calculations.
- Expense chart colors use semantic category tokens and a shared color resolver so slices and legends always match.
- The performance module derives read-only analytics from the existing ERP providers in a pure shared calculator, with URL-backed periods and tabs; this preserves realtime updates, tenant access and testable formulas without duplicating persisted financial data.
- Performance break-even is an explicitly estimated constant-operating-cost scenario, not a fixed/variable-cost accounting result; current records do not classify those costs or snapshot historical product costs.
- Arrival forms and stock persistence share the pure arrival calculator in `src/lib/vasilhames.ts` so receipt, damage and transit quantities cannot diverge.
- Sale creation and editing share voucher payment normalization and quantity calculation in `src/lib/vales.ts`; persist redemption counts for quantity-based cancellation and read the latest client balance before applying deltas.
- ABC client and product views classify the existing performance revenue rankings through the pure calculator in `src/lib/curva-abc.ts`; keep period and tab selection URL-backed and never persist derived classes.
- Receipt preview and printing share `TextoCupom` and the pure allowlisted parser in `src/lib/cupom-template.ts`; parse styling from templates only, render substituted data as escaped text, and preserve literal whitespace and tag-free/empty templates.
