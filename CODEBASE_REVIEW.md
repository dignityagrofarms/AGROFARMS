# Dignity Agro Farms — codebase review

> Baseline review before implementation. Remediation and production validation are documented in [RELEASE_NOTES.md](RELEASE_NOTES.md).

Reviewed 13 November 2026 against the working tree at commit `06ebedd`.

## Scope and confidence

This is a repository architecture and static code review, including the nine modified tracked files, three new components, three new migrations, and recent commit history. Build, TypeScript, and lint checks were executed. No application code was changed, no migrations were applied, and no live database operations or customer submissions were performed. Environment values were not displayed.

Findings describe the checked-in schema and current source. Production policies, deployed migrations, provider settings, and real user journeys remain unverified. This is not a claim that every runtime path has been exercised.

## What the software does

This is a poultry business operations application with a public storefront and several internal workspaces.

| Area | Main behavior | Main implementation |
| --- | --- | --- |
| Storefront | Products, business information, contact, policies and ordering | `src/routes/index.tsx`, `products.tsx`, `order.tsx`, `src/lib/products.ts` |
| Regular orders | Checkout, vouchers, tracking, receipts, cancellation, manual payment claims and staff decisions | `src/lib/orders.functions.ts`, `track-order.tsx`, `receipt.$orderCode.tsx` |
| December preorders | Reservations, installments, payment confirmation, delivery and batch assignment | `src/lib/preorders.functions.ts`, `DecemberPreorderForm.tsx` |
| Farm operations | Batch lifecycle, headcount, mortality, feeding, health and daily reports | `src/lib/farm.functions.ts`, `FarmManagementPanels.tsx`, `DailyLogModal.tsx` |
| Finance | Income, expenses, partial payments, receivables/payables, aging and exports | `farm.functions.ts`, `DebtorsCreditorsPanel.tsx`, report/export utilities |
| Approvals | Owner approves, rejects or returns submissions for correction; submitters track and revise entries | `PendingApprovalsPanel.tsx`, `SubmissionEditModals.tsx` |
| Special contacts | Bulk buyers, suppliers, logistics contacts and transaction ledgers | `contacts.functions.ts`, `SpecialContactsPanel.tsx` |
| CRM and support | Leads, communication history, customer records, complaints and newsletter subscriptions | Farm, orders, complaints and newsletter server functions |
| Staff administration | Accounts, roles, attendance, tasks, leave, suspensions, documents and signed payment receipts | `orders.functions.ts`, `tasks.functions.ts`, HR/account components |
| Investors | Partner accounts, agreements, cycles, allocations, financial/activity ledgers, settlement, payouts and elections | `partners.functions.ts`, `partner-settlement.ts`, partner components and `for-partners.tsx` |
| Marketing and exports | Social proof flyers, receipts, PDF/CSV/XLSX reports and WhatsApp sharing | Flyer, receipt and export utilities |
| PWA | Installation, GET response caching and browser notification handlers | `public/sw.js`, site/admin components |

## Architecture and data flow

- React 19, TypeScript, TanStack Start and file-based TanStack Router provide the full-stack application. TanStack Query handles client caching, polling and invalidation.
- Tailwind 4, Radix/shadcn-style components, Lucide and Recharts provide the interface.
- Vite uses Lovable's TanStack configuration; Nitro builds a Cloudflare worker deployment artifact. `src/server.ts` wraps the server entry and normalizes catastrophic SSR errors. `src/start.ts` registers error handling and client Supabase token attachment.
- Supabase Postgres is the actual data backend. The old `MIGRATION_STATE.md` description of D1/SQLite is stale.
- UI components call `createServerFn` functions through `useServerFn`. Server functions generally validate inputs with Zod, check custom credentials, then dynamically import the service-role Supabase client.
- The service-role client bypasses RLS. Server-side authorization therefore matters for every handler; hiding a tab is insufficient.
- Admin login is a custom username/passcode system backed by `admin_access`, environment recovery credentials and legacy `app_settings`. Credentials are stored in browser local storage and passed with server calls. Supabase auth middleware exists, but these custom admin handlers primarily use `checkPasscode`/`checkOwner`.
- Partners use separate hashed passcodes and signed HMAC sessions with a 12-hour lifetime. Partner-scoped handlers derive the partner ID from the verified session.
- Core data relationships: batches link activities, financials, orders, preorders, contacts' transactions and partners. Financial payments link to financial entries. Partner financial/activity records are separate copies that may be synchronized from farm records.
- Settlement math is shared between admin and partner interfaces. It computes income less expenses, applies profit/loss percentages, caps partner loss at capital, and subtracts payouts from the amount due.
- Many server functions support old schemas by retrying writes after removing unsupported columns. This helps compatibility but can silently discard business fields and conceal missing migrations.

## Validation results

| Check | Result |
| --- | --- |
| `npm run build` | Passed; client and server artifacts generated. Dependency `use client` directive warnings appeared. |
| `npm exec tsc -- --noEmit` | Failed with eight diagnostics. |
| `npm run lint` | Failed: 6,169 errors and 27 warnings; 5,762 errors reported automatically fixable. Much of the output is formatting. |
| Automated workflow tests | No test script or maintained workflow test suite is declared in `package.json`. Root scripts are ad hoc diagnostics. |
| Live database / browser workflows | Not exercised in this review. |

TypeScript failures:

- `src/lib/partners.functions.ts:316`: `Uint8Array<ArrayBufferLike>` does not match the required Web Crypto `BufferSource` type.
- `partners.functions.ts:558`, `559`, `2252`, `2253`, `2263`, `2269`: implicit `any` callback parameters.
- `src/routes/for-partners.tsx:555`: reads `archivedAt`, absent from `PartnerCycleArchive`.

The build does not enforce TypeScript correctness, so a successful production bundle does not resolve these failures.

## Findings, ordered by priority

### Critical: database migrations permit anonymous modification of business data

`supabase/migrations/20261006180000_farm_management_and_leads.sql:82` creates unrestricted `FOR ALL USING (true) WITH CHECK (true)` policies on farm batches, financials, activities and CRM leads, and grants all privileges to `anon` and `authenticated`.

`20261109150000_create_special_contacts_and_transactions.sql:57` does the same for special contacts and transactions. No subsequent migration in this repository removes those policies. If deployed as written, a public Supabase key permits direct reads and writes without the application's custom login or approvals.

Recommendation: add a forward migration removing public access and restricting these tables to trusted server operations, then verify effective policies and grants in the deployed database. Partner tables also lack explicit RLS enabling in their creation migration; inspect their effective grants/default privileges rather than assuming service-role grants imply exclusivity.

### Critical: legacy staff passcode is accepted as owner credentials

`src/lib/orders.functions.ts:548` accepts the `app_settings.admin_passcode` value for reserved owner usernames, while the same value authenticates the `staff` username. A holder of the legacy staff passcode can therefore authenticate as owner when that setting exists. `adminGetPasscode` also returns this value to any authenticated admin role.

Recommendation: remove the cross-role fallback, retain an explicitly separate owner recovery path, and restrict or remove credential disclosure. Verify with role boundary tests. The reserved-account auto-heal also updates role/activation before checking the supplied password; this mutation should not happen during an unverified login attempt.

### High: public preorder phone lookup can become an unfiltered lookup

`src/lib/preorders.functions.ts:356` validates the original phone string by length, strips all non-digits, then uses the result in `phone.ilike.%...%`. An input such as seven letters becomes an empty string and produces `%%`, matching all phones. Returned rows include customer details. Even legitimate phone-only lookups do not verify control of that number.

Recommendation: validate the normalized phone, use exact canonical matching, and require proof of customer access before returning private data. Regular order tracking also returns addresses and phone numbers using a five-digit reference; introduce stronger access tokens and request limits.

### High: new bird-count queries reference columns absent from repository migrations

`src/lib/farm.functions.ts:501` selects and filters `contact_transactions.synced_financial_id`, which no migration defines. Its preorder query selects/filters `status`, while the preorder model uses payment and delivery status. Errors from those queries are ignored and their data becomes an empty list, silently omitting sales/reservations from headcount calculations.

Recommendation: align queries with the actual migrated schema, add an explicit source-to-mirror ID where needed, and surface query errors. Define whether a reservation reduces available stock or physical live headcount: current regular-order counting includes every non-cancelled order, including unfulfilled orders.

### High: debtor/creditor report does not match special-contact schema

`src/lib/farm.functions.ts:1401` joins `special_contacts(..., category)`, but the schema defines `contact_type`. The report later accepts only transaction types `offload`/`supply` at approximately line 1456; actual stored types are `sale_to_contact` and `purchase_from_supplier`. Contact-query errors are suppressed. Contact debts therefore cannot reliably appear in the combined report even after correcting the join.

Recommendation: use the canonical column/type names and test an unpaid buyer sale and unpaid supplier purchase end to end.

### High: contact edits and approval decisions leave mirrored farm records inconsistent

`src/lib/contacts.functions.ts:632` creates a separate farm income/expense when requested. The new `adminUpdateContactTransaction` updates only the contact transaction; deletion also removes only that row. There is no persisted mirror ID in the repository schema. Contact approval decisions in `farm.functions.ts` update the contact row independently of its farm mirror.

Example: a manager submits a contact sale and its farm mirror, then corrects the sale quantity/amount after it is flagged. The contact and farm records can now contain different values and be approved independently. Investor figures and bird counts can diverge further downstream.

Recommendation: establish one canonical transaction or a persisted relationship, and reconcile changes/approval/deletion transactionally. Check every Supabase write result; returned `error` objects do not trigger the surrounding `catch` automatically.

### High: partner activity synchronization copies once and never reconciles

`src/lib/partners.functions.ts:1871` skips activity IDs already represented by a `[SYNC:...]` tag. Later edits to feed or mortality, source deletion, and approval reversal do not update/remove the partner copy. Allocation changes update financial copies but leave existing activity quantities unchanged.

Additionally, owner-created and owner-edited daily logs do not call `notifyLinkedBatchPartners`; sync hooks are concentrated around financial mutations and approval actions. Immediate automatic activity propagation is incomplete.

Recommendation: use full source IDs with unique constraints, upsert current values, reconcile removals and approval state, and call synchronization from every relevant mutation. Prefer a durable reconciliation job/event over best-effort chained writes.

### High: financial sync can preserve stale money or remove valid copies on a read failure

In `syncBatchTransactionsForPartner`, a source reference is added to `activeSourceRefs` before a zero scaled amount is skipped. If a previously positive income becomes zero paid, its old partner amount remains. Conversely, the source query's `error` is ignored; a failed read can leave an empty source set and cause existing copies to be marked removed. Multiple updates/fallback inserts ignore write errors while incrementing success counters.

Recommendation: abort reconciliation on source-read errors; explicitly reconcile zero values; check every mutation result and report partial failure. Eight-character UUID prefixes are also insufficient as durable unique source identifiers.

### High: staff financial visibility is enforced inconsistently

`adminListFinancials` and `adminGetBatchReport` honor `show_financials_to_staff`. `adminGetBatchFeedLedger` exposes feed spending/valuation to any valid passcode, and `adminListDebtorsCreditorsReport` and `adminListFinancialPayments` likewise lack the batch visibility check. A staff member can call these functions directly even when UI navigation hides them.

Recommendation: centralize financial read authorization and apply it to every report/detail/export endpoint.

### High: payment approval uses separate, non-atomic writes

`approvePendingFinancialPayment` marks a payment approved before updating the parent's paid amount; the second update's error is ignored. A failed second write leaves an approved payment whose retry returns early. Concurrent payments can also read the same prior total and overwrite one another. Owner payment recording has a similar insert-then-update boundary.

Recommendation: move payment insertion/approval and total calculation into a database transaction with row locking or derive totals from approved payment rows. Enforce idempotency and test concurrent approvals and failure recovery.

### Medium: multi-investor allocation validation is incomplete

`adminAllocateBatchInvestors` validates only the submitted rows' combined profit percentage, updates sequentially and suppresses synchronization failures. It does not validate the final batch membership including omitted existing investors, duplicate submitted partner IDs, or aggregate loss exposure. Individual partner create/update paths can also bypass this batch-level total check. Partial updates can survive an error.

Recommendation: validate the final persisted membership and share model atomically. Clarify that ledger allocation percentage and settlement profit percentage multiply: a 50% ledger allocation with a 30% settlement share yields 15% of full batch profit, not 30%.

### Medium: schema fallback paths hide incomplete deployment

New allocation fields can be pruned from writes if their migration is missing; functions can still report success. Similar retries discard financial/feed metadata. `birds_sold` has no nonnegative database check, while the new migration zeros physical stock for all completed/archived batches without an audit of the adjustment.

Recommendation: deploy and verify required migrations before enabling dependent features. Fail visibly when correctness requires a missing column. Treat closing/reopening inventory semantics as an explicit business rule.

### Medium: service worker caches every successful GET

`public/sw.js:23` stores all successful HTTP GET responses and returns cached responses when offline. It has no route/content allowlist, user partition, or logout purge. Private GET data and old authenticated page content may persist on shared devices.

Recommendation: restrict caching to explicitly public static assets and define offline/private-data behavior. Verify cache cleanup alongside logout.

### Medium: deployment configuration and documentation disagree

The active build emits a Cloudflare worker. `vercel.json` rewrites most paths to `/index.html`, a static SPA pattern that does not describe the Start server-function runtime. `MIGRATION_STATE.md` still documents D1/SQLite, and `roadmap.md` marks implemented features incomplete.

Recommendation: designate the production target, verify RPC and SSR behavior on that target, and update setup/runtime/schema documentation. Do not assume the Vercel rewrite supports this server output.

## Recent edit assessment

The recent edits add useful workflows: submitter correction/resubmission, explicit flag notes, approval history/filtering, typo review, financial/batch visibility controls, multiple investors, bird-sale fields and feed-ledger reporting. Owner-only approval checks and submitter ownership checks are present in key new mutation paths. The daily-log migration also provides a real database uniqueness constraint per batch/date.

The main risk is coordination across ledgers and states, rather than the visual forms themselves. The new UI depends on financial, activity, contact and partner representations agreeing on approved values, source identity, dates, quantities and permissions. Those invariants are not yet consistently enforced.

New files reviewed:

- `BatchMultiInvestorModal.tsx`: allocation editor/preview connected to new batch-investor endpoints.
- `SubmissionEditModals.tsx`: financial/activity correction forms, resubmission and cache invalidation.
- `TypoReviewModal.tsx`: a manual confirmation screen; it does not automatically detect typos. It uses a custom overlay without the focus/keyboard behavior provided by the existing dialog primitives.
- Three `2026111317...`, `18...`, `19...` migrations: staff visibility/allocation columns, revision statuses, and bird-sale storage/closed-batch stock adjustment.

The tracked diff alone contains 4,729 insertions and 1,117 deletions. Untracked files add further implementation. This should be treated as a coordinated feature release with database prerequisites, rather than a small UI patch.

## Maintainability and performance

- Several modules are very large: the admin route is 4,581 lines, farm panels 4,502, partner panels 4,320, farm server functions 3,675 and partner functions 2,577. Split by domain and workflow to make authorization and invariants reviewable.
- The generated admin client chunk is approximately 1,246.68 kB before gzip / 316.18 kB gzip. Lazy-load major admin workspaces and export libraries where practical.
- Lists frequently fetch all rows without pagination. Supabase response limits can truncate totals as the database grows. Reports should use explicit pagination or database aggregates.
- Polling occurs across orders, approvals, submissions and settings. Full-batch synchronization can fan out over every linked partner after a mutation; track request latency and move expensive reconciliation off the interactive write path.
- Widespread `any` and stale generated database types allow schema mistakes to bypass static checks. Regenerate types and avoid untyped queries for core data.
- Passcodes use unsalted SHA-256 and are retained in browser storage/query keys. Migrate toward server-managed sessions and a password-specific hash. No application-level login throttling was identified in the reviewed authentication handlers; provider/edge controls were not inspected.
- Root diagnostic scripts fetch and print full `admin_access` rows. They were not executed because they would query live account information. They are not a replacement for isolated tests.
- Both npm and Bun lockfiles exist; choose an authoritative dependency workflow. Dependency vulnerability scanning was not performed.
- `.env` is not tracked in the current Git index. Its contents were not needed for this review.

## Recommended sequence

1. Close public database access and remove the staff-to-owner login fallback; verify deployed policies with anonymous/owner/manager/staff cases.
2. Fix normalized-phone lookup, missing columns and contact report type mismatches.
3. Establish canonical transaction/source IDs and transactional payment/approval behavior.
4. Reconcile partner activity and financial copies for edits, deletion, zero payments, allocation changes and failed reads.
5. Apply one financial visibility policy to every endpoint and report.
6. Resolve the eight TypeScript errors, reduce lint noise, and make typechecking part of CI/build gates.
7. Add isolated tests for role boundaries, correction/resubmission, contact mirrors, headcount, feed stock, payments and settlement. Include concurrent/failure cases, not only happy paths.
8. Validate migrations on a disposable database, then exercise customer checkout/payment/receipt and owner/manager/staff/partner workflows in a browser. Verify the actual hosting target before release.

The application has broad domain coverage and reusable UI/settlement foundations. Its current weak points are access boundaries, duplicated financial truth, schema drift and incomplete reconciliation. Build success alone is insufficient evidence that the current edits are ready for production.
