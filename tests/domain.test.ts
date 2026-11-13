import test from "node:test";
import assert from "node:assert/strict";
import { resolveAdminRole } from "../src/lib/admin-auth.ts";
import { receivedAmount, orderReceipts, preorderReceipts } from "../src/lib/financial-report.ts";
import { computeSettlement } from "../src/lib/partner-settlement.ts";
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
