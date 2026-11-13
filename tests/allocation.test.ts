import test from "node:test";
import assert from "node:assert/strict";
import {
  allocationFromBirds,
  allocationFromInvestment,
  weightedProfitShare,
} from "../src/lib/batch-allocation.ts";
import {
  partnerFinancialView,
  partnerActivityView,
  partnerProfileView,
} from "../src/lib/partner-privacy.ts";
import { mayUseRestrictedEndpoint, operationalProjection } from "../src/lib/financial-access.ts";
import type {
  PartnerFinancial,
  PartnerActivity,
  FarmPartner,
} from "../src/lib/partners.functions.ts";
test("ownership derives from original birds and funding; investment requires whole birds", () => {
  assert.deepEqual(allocationFromBirds(50, 200, 7000), {
    birds: 50,
    investment: 350000,
    ownership: 25,
  });
  assert.deepEqual(allocationFromInvestment(350000, 200, 7000), {
    birds: 50,
    investment: 350000,
    ownership: 25,
  });
  assert.throws(() => allocationFromInvestment(350001, 200, 7000), /whole birds/);
  assert.throws(() => allocationFromBirds(201, 200, 7000));
  assert.throws(() => allocationFromBirds(2.5, 200, 7000));
  assert.throws(() => allocationFromBirds(1, 200, 0));
  assert.equal(
    weightedProfitShare([
      { ownership: 50, profitShare: 70 },
      { ownership: 50, profitShare: 70 },
    ]),
    70,
  );
  assert.equal(allocationFromBirds(1, 10000, 100).ownership, 0.01);
});
const privateFinancial = {
  id: "own-ledger-id",
  partnerId: "own-partner",
  batchId: "own-batch",
  type: "income",
  category: "Bird Sales",
  amount: 25000,
  description: "PRIVATE CUSTOMER 08012345678",
  paymentMethod: "Cash",
  transactionDate: "2026-11-13",
  referenceNo: "CUSTOMER-ORDER-123",
  recordedBy: "private-staff",
  createdAt: "2026-11-13",
  removedAt: null,
  removedBy: null,
  removalReason: null,
  approvalStatus: "approved",
  approvedBy: "private-owner",
  approvedAt: "2026-11-13",
  receiptUrl: "https://private.invalid/receipt.pdf",
  attachmentName: "PRIVATE CUSTOMER.pdf",
  customerAddress: "PRIVATE CUSTOMER ADDRESS",
} as PartnerFinancial;
const privateActivity = {
  id: "activity",
  partnerId: "own-partner",
  batchId: "own-batch",
  activityDate: "2026-11-13",
  activityType: "Feeding",
  stockHeadcount: 0,
  mortalityCount: 1,
  causeOfMortality: "PRIVATE CUSTOMER",
  feedConsumedKg: 25,
  averageWeightKg: 2,
  notes: "PRIVATE CUSTOMER",
  recordedBy: "private-staff",
  createdAt: "2026-11-13",
  removedAt: null,
  removedBy: null,
  removalReason: null,
  approvalStatus: "approved",
  approvedBy: "private-owner",
  approvedAt: "2026-11-13",
  photoUrl: "https://private.invalid/client.jpg",
} as PartnerActivity;
test("partner projection excludes free text, source references, files and unexpected fields", () => {
  const f = partnerFinancialView(privateFinancial),
    a = partnerActivityView(privateActivity);
  const serialized = JSON.stringify({ f, a });
  assert(!serialized.includes("PRIVATE CUSTOMER"));
  assert(!serialized.includes("private.invalid"));
  assert(!serialized.includes("CUSTOMER-ORDER"));
  assert.equal(f.amount, 25000);
  assert.equal(f.description, "Bird Sales");
  assert.equal(a.mortalityCount, 1);
  const p = {
    archivedCycles: [
      {
        financials: [privateFinancial],
        activities: [privateActivity],
        summary: {},
        settlement: {},
      },
    ],
    auditLog: [
      { kind: "terms_amended", reason: "PRIVATE CUSTOMER", meta: { customer: "PRIVATE CUSTOMER" } },
    ],
  } as unknown as FarmPartner;
  assert(!JSON.stringify(partnerProfileView(p)).includes("PRIVATE CUSTOMER"));
});
test("restricted financial access uses an operational allowlist and strips file/free-text fields", () => {
  for (const name of [
    "adminReceiptReport",
    "adminGetBatchReport",
    "adminGetContactDetail",
    "adminListPreorders",
    "adminGetPartnerDashboard",
    "downloadOfficialAgreement",
    "adminListPaymentReceipts",
    "unknownFutureFinancialEndpoint",
  ])
    assert(!mayUseRestrictedEndpoint(name), name);
  for (const name of [
    "adminCreateFinancial",
    "adminListMySubmissions",
    "adminOperationalOrders",
    "adminCreateDailyLog",
    "adminListTasks",
  ])
    assert(mayUseRestrictedEndpoint(name), name);
  assert.deepEqual(
    operationalProjection([
      {
        initialHeadcount: 200,
        totalMortality: 3,
        fundingPerBird: 7000,
        notes: "NGN 1,400,000",
        receiptUrl: "invoice",
      },
    ]),
    [
      {
        initialHeadcount: 200,
        totalMortality: 3,
        fundingPerBird: null,
        notes: null,
        receiptUrl: null,
      },
    ],
  );
});
