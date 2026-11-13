import test from "node:test";
import assert from "node:assert/strict";
import { resolveAdminRole } from "../src/lib/admin-auth.ts";
import { receivedAmount, orderReceipts, preorderReceipts } from "../src/lib/financial-report.ts";
import { computeSettlement } from "../src/lib/partner-settlement.ts";
import { completedBatchWeeks } from "../src/lib/batch-age.ts";

test("batch age counts completed weeks at weekly boundaries", () => {
  for (const [day, expected] of [
    [0, 0],
    [6, 0],
    [7, 1],
    [41, 5],
    [42, 6],
    [43, 6],
    [48, 6],
    [49, 7],
  ]) {
    const now = new Date(Date.parse("2026-10-02T12:00:00+01:00") + day * 86_400_000);
    assert.equal(completedBatchWeeks("2026-10-02", now), expected, `day ${day}`);
  }
});

test("November 13 stays at six weeks throughout the Lagos calendar day", () => {
  for (const time of ["00:00:00", "12:00:00", "23:59:59"]) {
    assert.equal(completedBatchWeeks("2026-10-02", new Date(`2026-11-13T${time}+01:00`)), 6);
  }
  assert.equal(completedBatchWeeks("2026-10-02", new Date("2026-11-19T22:59:59Z")), 6);
  assert.equal(completedBatchWeeks("2026-10-02", new Date("2026-11-19T23:00:00Z")), 7);
});

test("Lagos midnight advances age independently of the execution timezone", () => {
  assert.equal(completedBatchWeeks("2026-10-02", new Date("2026-10-08T22:59:59Z")), 0);
  assert.equal(completedBatchWeeks("2026-10-02", new Date("2026-10-08T23:00:00Z")), 1);
});

test("batch age handles future and invalid dates without inventing an age", () => {
  assert.equal(completedBatchWeeks("2026-12-01", new Date("2026-11-13T12:00:00Z")), 0);
  for (const value of ["", "invalid", "2026-02-30", "2026-13-01", "2026-10-02T00:00:00Z"]) {
    assert.equal(completedBatchWeeks(value, new Date("2026-11-13T12:00:00Z")), null);
  }
  assert.equal(completedBatchWeeks("2026-10-02", new Date("invalid")), null);
});
const base = {
  username: "staff",
  suppliedPasscode: "staff-only",
  suppliedHash: "staff-hash",
  account: null,
  masterUsername: "primary",
  masterPasscode: "recovery-only",
  legacyStaffPasscode: "staff-only",
};
test("legacy staff credential never grants a reserved owner role", () => {
  assert.equal(resolveAdminRole(base), "staff");
  for (const username of ["owner", "admin", "primary"])
    assert.throws(() => resolveAdminRole({ ...base, username }));
});
test("named roles, deactivation and independent owner recovery are preserved", () => {
  assert.equal(
    resolveAdminRole({
      ...base,
      username: "manager1",
      account: { role: "manager", active: true, passcode_hash: "staff-hash" },
    }),
    "manager",
  );
  assert.equal(
    resolveAdminRole({
      ...base,
      username: "admin",
      account: { role: "staff", active: true, passcode_hash: "staff-hash" },
    }),
    "staff",
  );
  assert.throws(() =>
    resolveAdminRole({
      ...base,
      account: { role: "staff", active: false, passcode_hash: "staff-hash" },
    }),
  );
  assert.equal(
    resolveAdminRole({
      ...base,
      username: "primary",
      suppliedPasscode: "recovery-only",
      account: { role: "owner", active: false, passcode_hash: "different" },
    }),
    "owner",
  );
});
test("receipt basis excludes unpaid and cancelled orders, includes legacy paid entries", () => {
  assert.equal(orderReceipts({ status: "received", paymentStatus: "pending", total: 13000 }), 0);
  assert.equal(orderReceipts({ status: "cancelled", paymentStatus: "approved", total: 13000 }), 0);
  assert.equal(
    orderReceipts({ status: "preparing", paymentStatus: "approved", total: 13000 }),
    13000,
  );
  assert.equal(preorderReceipts({ amountPaid: 0 }), 0);
  assert.equal(receivedAmount({ amount: 63000, amountPaid: 10000 }), 10000);
  assert.equal(receivedAmount({ amount: 63000, amountPaid: null }), 63000);
});
test("settlement preserves commercial terms and ignores removed copies", () => {
  const terms = { initialInvestment: 1000, profitSharePercentage: 30, lossSharePercentage: 100 };
  const result = computeSettlement(terms, [
    { type: "income", amount: 2000 },
    { type: "expense", amount: 1000 },
    { type: "income", amount: 99999, removedAt: "now" },
  ]);
  assert.equal(result.partnerSignedResult, 300);
  assert.equal(result.payoutDue, 1300);
  const loss = computeSettlement(terms, [{ type: "expense", amount: 5000 }]);
  assert.equal(loss.payoutDue, 0);
  assert.equal(loss.lossWasCapped, true);
});
