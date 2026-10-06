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
