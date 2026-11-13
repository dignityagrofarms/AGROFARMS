# Farm records and access release — 13 November 2026

## Behavior

- Revenue now means confirmed receipts: approved regular-order payments, confirmed preorder installments and paid amounts on approved manual income. Unpaid balances are separate. Summary rows, transaction drilldowns and exports share a server report, with paginated database reads.
- The unassigned summary is clickable and its entries can be assigned using the existing permission model. Assignment changes grouping, not grand totals.
- Physical stock uses initial stock minus approved mortality and completed sales, plus explicit stock adjustments. Unfulfilled orders and reservations do not reduce physical stock. Reopening a reconciled batch does not resurrect birds.
- Feed purchases require structured bag quantity and brand. Daily bag logs validate stock and chronological sequencing. Historical purchases without confirmed quantities display incomplete inventory; unknown purchase costs are excluded from unit valuations. Complete their details using the existing transaction Edit action.
- Original submitter identity is preserved on new operational records. Approval status views and paginated permanent history retain creation, correction, approval, rejection and deletion evidence. Personal dismissal hides a rejected record without deleting its history. Historical reviewer identity is marked unknown.
- Contact financial mirrors and partner source copies are reconciled in database transactions. Mirror entries cannot be edited independently. Source deletion retires partner copies while retaining historical evidence. Current partner agreements and settlement percentages are preserved.
- Follow-up payments and preorder installments update their parents atomically, support reversals and reject overpayment. Repeated approval cannot add the amount twice. Older clients' redundant follow-up balance writes are guarded during rollout.
- Private business tables deny direct anonymous/authenticated access. Existing server functions use the service-role client. The staff passcode no longer authenticates reserved owner names; named roles and environment owner recovery remain supported.
- Staff financial visibility applies to report, feed valuation, payment detail and debt endpoints. Own submission history remains accessible.
- Customer tracking requires a full reference and the matching phone; a signed, HTTP-only, one-hour cookie allows subsequent receipt access. Phone-only recovery is replaced with contact-the-farm guidance. Static assets alone are cached by the service worker.

## Production reconciliation

The reported **₦187,500** consists of:

| Source | Received |
| --- | ---: |
| Storefront DAF-41471 | ₦13,000 |
| DEC-44683 | ₦4,000 |
| DEC-44851 | ₦80,000 |
| DEC-18189 | ₦10,000 |
| DEC-44840 | ₦12,250 |
| DEC-27830 | ₦12,250 |
| DEC-94363 | ₦49,000 |
| DEC-93952 | ₦7,000 |

These entries remain unassigned; no batch was guessed. DEC-44851 has ₦80,000 confirmed receipts against a ₦61,250 order value. The excess was preserved for owner review.

Nine approved income descriptions explicitly documented 71 bird sales. Their structured sale counts were backfilled without changing amounts or original attribution. The active second batch calculates **121 physical birds**: 204 initial minus 12 deaths minus 71 sales.

The closed first batch had a previously stored count of 5. Source records calculate 2 residual birds: 51 initial minus 4 deaths minus 45 fulfilled sales. An explicit owner-authorized adjustment of -2 records the client-confirmed zero physical stock. No sale or mortality was fabricated.

Historical feed quantities and brands were not inferred from spending or silently backfilled.

## Validation and rollout

- Additive SQL was validated in a fresh isolated PostgreSQL 18 database. A test-only fixture supplies preorder tables that predate this repository's migration history.
- `npm run typecheck`, `npm test`, and `npm run build` are release gates. Build now includes typechecking.
- `tests/integrity.sql` is a rollback-only integration suite covering stock, contact mirrors, partner copies, receipt sources, payment retries/reversals, feed limits, stock reconciliation, audit retention, and public access grants.
- `tests/concurrency.py` targets only the fixed local test cluster/database. Competing payments and competing bird sales were tested: exactly one request in each pair succeeded, with the correct resulting balance and physical stock.
- Browser smoke tests exercised public pages, owner finance/history screens, temporary staff/manager/partner logins, staff financial denial and private history, customer phone verification and receipt-cookie access. Temporary accounts were removed afterward. No sales, payments or activities were created by the production smoke tests.
- Direct public-key requests to private production tables return PostgreSQL permission-denied code `42501`.
- Lint remains a failing repository baseline (1,861 errors and 18 warnings at the final check); it must not be represented as clean. New source modules were checked separately. Formatting was limited to release files.
- Private pre-release data/schema snapshots and the historical correction SQL are in `.private-backups/2026-11-13/`, excluded from Git and readable only by the local owner. They contain private data and must not be published.

The production schema historically contains manually applied changes absent from `supabase_migrations.schema_migrations`. This release records its own forward migrations. Do not blindly replay older migrations or run a destructive database reset to align history; reconcile that old baseline separately.

Git pushes synchronize the connected Lovable branch. A push is not evidence that a separately published production web deployment has been updated; verify the published site's release through the normal Lovable publishing flow.

## Development

The current application is React 19 / TanStack Start with Vite, Nitro and Supabase Postgres. The older `MIGRATION_STATE.md` D1/SQLite description is historical.

Use the existing npm lockfile and install with `npm ci`. Required environment names are `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `ADMIN_USERNAME` and `ADMIN_PASSCODE`. Keep values in ignored environment files; never commit credentials. Then run `npm run dev`.
