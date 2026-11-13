import test from "node:test";
import { SIGNER_CONSENT, WITNESS_CONSENT } from "../src/lib/agreements/types.ts";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { renderAgreement, moneyWords, dealSchema } from "../src/lib/agreements/template.ts";
import { agreementPdf } from "../src/lib/agreements/pdf.server.ts";
import { base64Logo } from "../src/lib/receipt-logo.ts";
import type { OfficialAgreement, AgreementSignature } from "../src/lib/agreements/types.ts";
const deal = {
  agreementDate: "2026-11-13",
  startDate: "2026-11-14",
  remittanceDate: "2027-01-10",
  salesWindow: "December 2026 and New Year 2027",
  durationWeeks: 6,
  capital: 1400000,
  birds: 200,
  unitFunding: 7000,
  partnerProfit: 70,
  representative: "Company Test Representative",
  companyAddress: "No. 9 Oduobi Crescent, Ikenegbu, Owerri, Imo State, Nigeria",
  companyPhone: "07083476366",
  witnessName: "Witness Test Person",
};
const person = {
  id: "11111111-1111-4111-8111-111111111111",
  fullName: "Chịka Test Investor",
  phone: "08000000000",
  address: "Test address, Owerri",
  cycleName: "Test cycle",
};
test("official template preserves all 11 clauses and replaces the sample identity and deal values", () => {
  const a = renderAgreement(person, deal);
  assert.equal((a.terms.match(/^\d+\. /gm) || []).length, 11);
  assert(a.terms.includes(person.fullName));
  assert(!a.terms.includes("Chikadibia Goodness Val-Martins"));
  assert(!a.terms.includes("{{"));
  assert(a.terms.includes("One Million Four Hundred Thousand Naira Only"));
  const b = renderAgreement(
    { ...person, fullName: "Another Investor" },
    {
      ...deal,
      capital: 600000,
      birds: 100,
      unitFunding: 6000,
      partnerProfit: 60,
      salesWindow: "Another sales window",
      remittanceDate: "2027-02-01",
    },
  );
  assert(b.terms.includes("60% to the Investor and 40%"));
  assert(!b.terms.includes("1,400,000"));
  assert(!b.terms.includes(person.fullName));
  assert(b.terms.includes("1 February 2027"));
  assert(b.terms.includes("additional, genuine, documented batch-specific costs"));
  assert(
    renderAgreement(person, { ...deal, partnerProfit: 66.67 }).terms.includes(
      "66.67% to the Investor and 33.33%",
    ),
  );
});
test("contract fields reject invalid dates, funding arithmetic, missing contacts and duplicate signers", () => {
  assert.throws(() => dealSchema.parse({ ...deal, capital: 100 }));
  assert.throws(() => dealSchema.parse({ ...deal, remittanceDate: "2026-02-30" }));
  assert.throws(() => dealSchema.parse({ ...deal, remittanceDate: "2026-01-01" }));
  assert.throws(() => renderAgreement({ ...person, address: "" }, deal));
  assert.throws(() => renderAgreement(person, { ...deal, witnessName: person.fullName }));
  assert.equal(moneyWords(123.45), "One Hundred Twenty Three Naira and Forty Five Kobo");
});
test("official PDF generation is deterministic, branded, multipage and differs from its unsigned preview", () => {
  const snapshot = renderAgreement(person, deal);
  snapshot.terms = "TEST FIXTURE — NOT AN EXECUTED AGREEMENT\n" + snapshot.terms;
  const content_hash = createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
  const agreement: OfficialAgreement = {
    id: "22222222-2222-4222-8222-222222222222",
    partner_id: person.id,
    cycle_name: person.cycleName,
    template_version: snapshot.templateVersion,
    snapshot,
    content_hash,
    status: "witness_signed",
    created_at: "2026-11-13T12:00:00Z",
    completed_at: null,
    pdf_hash: null,
  };
  const signatures: AgreementSignature[] = (["company", "partner", "witness"] as const).map(
    (signer_role, i) => ({
      signer_role,
      legal_name: [deal.representative, person.fullName, deal.witnessName][i],
      signature_png: base64Logo,
      content_hash,
      consent: signer_role === "witness" ? WITNESS_CONSENT : SIGNER_CONSENT,
      signed_at: `2026-11-13T12:0${i}:00Z`,
    }),
  );
  const first = agreementPdf(agreement, signatures);
  const second = agreementPdf(agreement, signatures);
  assert.deepEqual(first, second);
  assert.equal(new TextDecoder().decode(first.slice(0, 4)), "%PDF");
  assert.notDeepEqual(first, agreementPdf(agreement, signatures, true));
  assert(first.length > 10000);
  if (process.env.AGRO_PDF_PREVIEW_PATH) writeFileSync(process.env.AGRO_PDF_PREVIEW_PATH, first);
});
