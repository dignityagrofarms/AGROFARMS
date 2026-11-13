// Local browser fixtures only. Never signs or creates a real contract.
// Run with: node --experimental-strip-types tests/agreement-browser.mjs
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chromium } from "playwright";
import { toCrossJSON } from "seroval";
import { renderAgreement } from "../src/lib/agreements/template.ts";
import { base64Logo } from "../src/lib/receipt-logo.ts";
const base = process.env.AGRO_TEST_URL || "http://127.0.0.1:5182";
assert(["127.0.0.1", "localhost"].includes(new URL(base).hostname), "Use a local test server");
const snapshot = renderAgreement(
  {
    id: "11111111-1111-4111-8111-111111111111",
    fullName: "TEST Investor",
    phone: "08000000000",
    address: "Test address only",
    cycleName: "TEST cycle",
  },
  {
    agreementDate: "2026-11-13",
    startDate: "2026-11-14",
    remittanceDate: "2027-01-10",
    salesWindow: "TEST sales window",
    durationWeeks: 6,
    capital: 10000,
    birds: 10,
    unitFunding: 1000,
    partnerProfit: 70,
    representative: "TEST Representative",
    companyAddress: "TEST Company address",
    companyPhone: "08000000000",
    witnessName: "TEST Witness",
  },
);
const id = "22222222-2222-4222-8222-222222222222";
const hash = createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
const agreement = {
  id,
  partner_id: snapshot.partnerId,
  cycle_name: snapshot.cycleName,
  template_version: snapshot.templateVersion,
  snapshot,
  content_hash: hash,
  status: "partner_signed",
  created_at: "2026-11-13T12:00:00Z",
  completed_at: null,
  pdf_hash: null,
};
const signatures = ["company", "partner"].map((signer_role, i) => ({
  signer_role,
  legal_name: i ? "TEST Investor" : "TEST Representative",
  signature_png: base64Logo,
  consent: "TEST fixture consent",
  content_hash: hash,
  signed_at: "2026-11-13T12:00:00Z",
}));
const original = Buffer.from("%PDF-1.4 TEST fixture bytes only");
const pdfHash = createHash("sha256").update(original).digest("hex");
let signed = 0;
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/_serverFn/**", async (route) => {
    const url = new URL(route.request().url());
    const fn = JSON.parse(Buffer.from(url.pathname.split("/").pop(), "base64").toString()).export;
    let result;
    if (fn.startsWith("getWitnessAgreement_")) result = { agreement, signatures };
    else if (fn.startsWith("signWitnessAgreement_")) {
      signed++;
      result = { ok: true, pdfReady: true };
    } else if (fn.startsWith("verifyOfficialAgreementFile_"))
      result = { authentic: route.request().postData().includes(pdfHash) };
    else throw new Error("Unexpected server call in fixture test");
    await route.fulfill({
      status: 200,
      headers: { "content-type": "application/json", "x-tss-serialized": "true" },
      body: JSON.stringify(toCrossJSON({ result, error: undefined, context: {} })),
    });
  });
  await page.goto(`${base}/agreement-witness?token=${"a".repeat(64)}`);
  const button = page.getByRole("button", { name: "Sign as witness", exact: true });
  await button.waitFor();
  assert(await button.isDisabled());
  assert.equal(await page.locator("img").count(), 2);
  await page.locator('input[type="checkbox"]').check();
  assert(await button.isDisabled());
  const canvas = await page.locator("canvas").boundingBox();
  await page.mouse.move(canvas.x + 20, canvas.y + 20);
  await page.mouse.down();
  await page.mouse.move(canvas.x + 80, canvas.y + 45, { steps: 10 });
  await page.mouse.move(canvas.x + 120, canvas.y + 20, { steps: 10 });
  await page.mouse.up();
  await page.getByText("Signature captured", { exact: true }).waitFor();
  assert(await button.isEnabled());
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await button.click();
  await page
    .getByRole("status")
    .filter({ hasText: "Your witness signature has been saved" })
    .waitFor();
  assert.equal(signed, 1);
  assert(!page.url().includes("token="));
  await page.goto(`${base}/agreement-verify?ref=${id}`, { waitUntil: "networkidle" });
  await page
    .getByLabel("Signed PDF", { exact: true })
    .setInputFiles({ name: "test.pdf", mimeType: "application/pdf", buffer: original });
  await page.getByRole("button", { name: "Verify this PDF" }).click();
  await page.getByRole("status").filter({ hasText: "Verified:" }).waitFor();
  await page.getByLabel("Signed PDF", { exact: true }).setInputFiles({
    name: "altered.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.concat([original, Buffer.from("ALTERED")]),
  });
  await page.getByRole("button", { name: "Verify this PDF" }).click();
  await page.getByRole("status").filter({ hasText: "Not verified:" }).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "Mobile witness consent/drawing, signing confirmation, token removal, original-file verification and altered-file rejection passed with isolated browser fixtures",
  );
} finally {
  await browser.close();
}
