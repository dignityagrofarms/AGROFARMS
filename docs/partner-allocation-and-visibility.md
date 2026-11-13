# Partner allocations and financial visibility

## Allocate a partner once

Open **Batches & Finances → Allocate Partners** or **For Partners → Allocate Partners**. Choose the batch and set **Funding per bird**. Total funding uses the original batch headcount; sales and mortality never change ownership.

Add an active partner and enter either whole birds or investment. The other value and ownership are calculated. For 200 birds at NGN 7,000 each, NGN 350,000 funds 50 birds and 25% ownership. An investor receiving 70% of their own profit receives 17.5% of the batch profit in this example. Profit/loss percentages apply after ownership, and losses remain capped at invested capital under the existing settlement rules.

Review each recalculation preview and confirm before saving. The server validates whole birds, capacity, the entire active roster and the allocation revision under a batch lock. It updates partner records and reconciles approved farm transactions and commerce receipts atomically. Changes and reversals update existing source-linked records instead of duplicating them. Existing manual percentage controls cannot override saved ownership.

Earlier allocations are not inferred or overwritten during migration. Confirm their funding rate and actual birds in the form. Closed or inactive legacy records have a separate historical-bird confirmation; this reserves their original birds without changing settled money or ledgers. Closing or rolling over a confirmed cycle retains its bird reservation. Closed allocations prevent later changes to the batch funding rate. Use a new physical batch for new capacity.

New profiles and rollover cycles await allocation confirmation before automatic syncing is enabled. Existing confirmed capital and profit/loss terms are edited through the allocation form. New official-agreement drafts prefill birds and funding from the confirmed allocation; signed agreements remain frozen and require a new version if commercial terms change. Existing settlement calculations still use received sales minus logged expenses; this change does not replace that basis with the agreement's capital-based definition.

## Financial controls

The owner opens **Settings & Roles → Financial figures — staff & managers**. Both role switches default to Hidden. Staff also need the existing explicit batch-sharing permission for batch reports. These controls do not grant other administrative permissions or override the owner-only partner visibility setting.

Restricted users use Operations: stock counts, sales/expense submission, their own dated history, daily farm reports, task/attendance/leave tools and order fulfilment. They may enter and review money for their own submissions, including partial payment information. Other records' amounts, financial reports, payroll receipts, contacts' financial ledgers, partner records, receipt downloads and exports are denied. Fulfilment data includes delivery contacts and product quantities, with prices and receipts excluded.

A global server-function middleware authenticates the credential and checks visibility on every request. Restricted roles can use only a reviewed operational allowlist; new endpoints are denied by default until reviewed. Operational responses remove funding values, sensitive notes and attachments. Role capability checks refresh every 15 seconds and on window focus; the client removes financial query caches when access is revoked. The server rejects subsequent restricted requests immediately. Previously downloaded information cannot be recalled.

Partner login is separate. Its current and archived ledger responses use an explicit allowlist: generic categories, allocated amounts, dates and safe farm quantities. Customer names, contact/address fields, source references, free descriptions, receipt links, staff identities and photos are excluded. Whole-batch sales quantities are grouped by record date without identifying customers. Partner exports consume the same sanitized data.

## Verification and rollout

- `npm test`: ownership conversion, whole-bird validation, weighted profit, partner privacy and restricted-endpoint policy, plus existing agreement/domain tests.
- `npm run build`: types and production bundle.
- `tests/allocations.sql`: isolated PostgreSQL rollback tests for ownership, revisions, capacity, synchronization, reversals and historical preservation.
- `tests/allocation-concurrency.py`: disposable local-cluster competing-save test.
- Mobile browser checks cover allocation validation, previews and restricted workspaces. Real role tests use temporary QA accounts, which are removed afterward, and do not submit business transactions or change real allocations.

Apply `20261114003000_automatic_bird_allocations.sql` transactionally after a private backup. It adds funding/allocated-bird fields and a retained allocation register without rewriting existing ownership or financial records. An old-client compatibility RPC rejects manual percentage submissions with a refresh instruction. Never replay unrelated historical migrations or rewrite published git history.
