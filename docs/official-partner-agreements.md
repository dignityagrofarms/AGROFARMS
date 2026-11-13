# Official partner agreements

The owner's DOCX supplies the 11-clause reinvestment template in `src/lib/agreements/clauses.ts`. Deal amounts, allocation, dates, profit split and named parties come from the reviewed deal and partner profile. Template edits affect only new versions.

## Workflow

1. Open **For Partners → Open Partner Workspace → Official partner agreement**.
2. Complete the partner's legal name, address and phone in their profile. Prepare a draft with actual deal values; funding per bird multiplied by birds must equal the investment.
3. The authorised owner reviews, draws the company signature and consents to issue the version. The named investor reviews and signs through their partner login.
4. The owner creates a private witness link, valid for 72 hours, and manually shares it with the named witness. Replacing or revoking it invalidates the previous link. The witness must actually have witnessed both parties signing; viewing signature images alone is insufficient.
5. After the witness signs, the server saves the official PDF privately. Company and investor can download it from their agreement section. If storage fails temporarily, download retries finalisation without requesting new signatures.

Unsigned downloads are marked previews. The final copy includes three signatures, consent, Lagos timestamps, company logo, branded digital seal, watermark, reference, terms fingerprint and page numbers. The seal is company branding, not a government or certificate-authority seal. No software can guarantee a watermark cannot be removed from an edited copy. `/agreement-verify` compares a file's locally calculated SHA-256 hash with the saved original; file contents are never uploaded and public verification reveals no personal details.

## Retention and accounting

Terms, identities and deal fields are frozen per version. Issuing a replacement revokes incomplete versions and witness links. Completed originals remain downloadable. Profile and cycle changes do not rewrite contracts. Accounts with retained agreements must be deactivated rather than deleted. Earlier signed agreements and uploaded documents remain in the historical section.

Dashboard settlement calculations are unchanged. The document defines net profit as sales minus invested capital and approved additional costs; the dashboard uses logged expenses. The draft form and agreement panel disclose this difference. Final settlement must be reconciled under the signed contract.

## Security and deployment

Migration `20261114002000_official_partner_agreements.sql` adds version and signature tables, an ordered signing RPC, immutable-record triggers and a private PDF bucket. Public roles have no table or signing RPC access. A restrictive storage policy blocks public access even under a broader permissive policy. Server functions enforce owner, named-partner or expiring witness-link authority. Witness tokens are hashed and consumed atomically. Signing order, active cycle and version hash are checked while holding partner/version locks.

The first stored final PDF is reused for downloads. Its registered hash, path and completion time cannot change. A missing registered original produces an error rather than silent regeneration. Keep service credentials server-only. The migration requires existing audit functions and enabled Supabase storage row security. Apply transactionally after a private backup; do not replay unrelated historical migrations.

## Validation

- `npm test`: existing domain tests plus clauses, substitutions, field validation and deterministic PDF generation.
- `npm run build`: type checking and production bundle.
- `psql ... -f tests/agreements.sql`: rollback-only lifecycle, retention, expiry, privilege and storage tests in an isolated local database.
- `python3 tests/agreement-concurrency.py`: concurrent witness submissions against the disposable local cluster only.
- `AGRO_TEST_URL=http://127.0.0.1:5182 node --experimental-strip-types tests/agreement-browser.mjs`: mobile signing and verification UI with intercepted synthetic fixtures.

Real signers must review and sign themselves. Tests never execute contracts on their behalf.
