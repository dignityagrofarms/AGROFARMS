// Browser-only fixtures. No real login, allocation, or business request reaches the server.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { toCrossJSON } from "seroval";
const base = process.env.AGRO_TEST_URL || "http://127.0.0.1:5183";
assert(["127.0.0.1", "localhost"].includes(new URL(base).hostname));
const b = await chromium.launch({ headless: true });
let saved = false;
const batchId = "33333333-3333-4333-8333-333333333333";
const pid = "11111111-1111-4111-8111-111111111111",
  qid = "22222222-2222-4222-8222-222222222222";
const settlement = {
  totalIncome: 25000,
  totalExpenses: 10000,
  net: 15000,
  result: "profit",
  partnerShareAmount: 10500,
  farmShareAmount: 4500,
  partnerSignedResult: 10500,
  roiPercent: 3,
  appliedSharePercent: 70,
  lossWasCapped: false,
  capitalDeployed: 10000,
  capitalRemaining: 340000,
  payoutDue: 360500,
  paidOut: 0,
  balanceOwed: 360500,
  payoutProgressPercent: 0,
};
const partners = [pid, qid].map((id, i) => ({
  id,
  fullName: "TEST Investor " + (i + 1),
  username: "test_investor_" + i,
  phone: "08000000000",
  initialInvestment: 350000,
  investmentDate: "2026-11-13",
  batchId: i ? null : batchId,
  batchName: "TEST 200 birds",
  batchAllocationPercentage: 100,
  allocatedBirds: null,
  autoSyncBatch: false,
  profitSharePercentage: 70,
  lossSharePercentage: 100,
  cycleStatus: "open",
  cycleName: "TEST cycle",
  active: true,
  status: "active",
  createdAt: "2026-11-13",
  updatedAt: "2026-11-13",
  archivedCycles: [],
  auditLog: [],
  settlement,
  pendingApprovalsCount: 0,
}));
let summary = {
  batchId,
  batchName: "TEST 200 birds",
  batchType: "Broiler",
  batchStatus: "active",
  startDate: "2026-10-02",
  totalIncome: 100000,
  totalExpense: 40000,
  netProfit: 60000,
  totalCommittedCapital: 350000,
  totalAllocatedProfitPct: 70,
  farmRetainedProfitPct: 30,
  initialBirds: 200,
  fundingPerBird: null,
  allocationRevision: 0,
  reservedBirds: 0,
  unresolvedHistoricalAllocation: false,
  investors: [
    {
      partnerId: pid,
      fullName: partners[0].fullName,
      username: partners[0].username,
      initialInvestment: 350000,
      profitSharePercentage: 70,
      lossSharePercentage: 100,
      batchAllocationPercentage: 100,
      allocatedBirds: null,
      autoSyncBatch: false,
      cycleStatus: "open",
      settlement,
    },
  ],
};
try {
  const page = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/_serverFn/**", async (route) => {
    let name;
    try {
      name = JSON.parse(
        Buffer.from(new URL(route.request().url()).pathname.split("/").pop(), "base64").toString(),
      ).export;
    } catch {
      return route.continue();
    }
    let result;
    if (name.startsWith("adminVerifyLogin_"))
      result = { ok: true, role: "owner", username: "fixture_owner" };
    else if (name.startsWith("adminListTasks_"))
      result = { tasks: [], role: "owner", username: "fixture_owner" };
    else if (name.startsWith("adminListUserAccounts_")) result = [];
    else if (name.startsWith("getPreorderSettings_"))
      result = { enabled: true, isActive: true, endDateTime: null };
    else if (name.startsWith("getFinancialAccess_"))
      result = { role: "owner", canViewFinancials: true, staff: false, manager: false };
    else if (name.startsWith("adminListOrders_")) result = { orders: [], role: "owner" };
    else if (name.startsWith("adminGetPartnerSettings_"))
      result = { hideFromManager: false, role: "owner" };
    else if (name.startsWith("adminGetPendingApprovalsCount_"))
      result = {
        count: 0,
        managerCount: 0,
        staffCount: 0,
        partnerPendingCount: 0,
        submitters: [],
        recentItems: [],
      };
    else if (name.startsWith("adminReceiptReport_")) result = { rows: [], outstandingSales: 0 };
    else if (name.startsWith("adminListDebtorsCreditorsReport_"))
      result = { summary: { debtorCount: 0, creditorCount: 0 }, rows: [] };
    else if (
      name.startsWith("adminListFinancials_") ||
      name.startsWith("adminListActivities_") ||
      name.startsWith("adminListPreorders_") ||
      name.startsWith("adminListMySubmissions_")
    )
      result = [];
    else if (name.startsWith("adminListBatches_"))
      result = [
        {
          id: batchId,
          batchName: "TEST 200 birds",
          batchType: "Broiler",
          initialHeadcount: 200,
          currentHeadcount: 200,
          totalMortality: 0,
          totalBirdsSold: 0,
          status: "active",
          startDate: "2026-10-02",
          targetHarvestDate: "2026-11-13",
          showFinancialsToStaff: false,
        },
      ];
    else if (name.startsWith("adminListPartners_")) result = partners;
    else if (name.startsWith("adminGetBatchInvestors_")) result = summary;
    else if (name.startsWith("adminAllocateBatchInvestors_")) {
      const body = route.request().postData();
      assert(!body.includes("batchAllocationPercentage"));
      assert(body.includes("7000"));
      assert(body.includes("150"));
      saved = true;
      summary = { ...summary, allocationRevision: 1, fundingPerBird: 7000 };
      result = { ok: true, count: 2 };
    } else throw new Error("Unexpected server call in allocation fixture: " + name);
    await route.fulfill({
      status: 200,
      headers: { "content-type": "application/json", "x-tss-serialized": "true" },
      body: JSON.stringify(toCrossJSON({ result, error: undefined, context: {} })),
    });
  });
  await page.goto(`${base}/admin/admin-orders`, { waitUntil: "networkidle" });
  await page.getByPlaceholder("Username", { exact: true }).fill("fixture_owner");
  await page.getByPlaceholder("Password", { exact: true }).fill("fixture-password-only");
  await page.locator('button[type="submit"]').click();
  await page.getByRole("button", { name: "Open navigation", exact: true }).click();
  await page.getByRole("button", { name: "Batches & Finances", exact: true }).first().click();
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await page
      .getByRole("heading", { name: "Batches & Financial Management", exact: true })
      .waitFor();
    const panel = page
      .locator("div.overflow-y-auto")
      .filter({
        has: page.getByRole("heading", { name: "Batches & Financial Management", exact: true }),
      })
      .first();
    assert(
      await panel.evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
      `Dashboard overflow at ${width}px`,
    );
    const select = await page.getByLabel("Select financial batch").boundingBox();
    assert(
      select.x >= 0 && select.x + select.width <= width + 1,
      `Batch selector clipped at ${width}px`,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Allocate Partners", exact: true }).first().click();
  const dialog = page.getByRole("dialog", { name: "Allocate partners to a batch" });
  await dialog.waitFor();
  await dialog.getByLabel("Funding per bird (NGN)").fill("7000");
  await dialog.getByText("Ownership: 25.0000%", { exact: false }).waitFor();
  await dialog.getByLabel("Add partner").selectOption(qid);
  await dialog.getByLabel("Investment for TEST Investor 2").fill("350001");
  await dialog.getByRole("alert").filter({ hasText: "whole birds" }).waitFor();
  await dialog.getByLabel("Birds allocated to TEST Investor 2").fill("151");
  await dialog.getByRole("alert").filter({ hasText: "exceed batch capacity" }).waitFor();
  await dialog.getByLabel("Birds allocated to TEST Investor 2").fill("150");
  await dialog.getByText("Active investor entitlement: 70.00%", { exact: false }).waitFor();
  await dialog.locator('input[type="checkbox"]').check();
  const button = dialog.getByRole("button", { name: "Save allocations & sync records" });
  assert(await button.isEnabled());
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await button.click();
  await dialog.getByRole("status").waitFor();
  assert(saved);
  assert.deepEqual(errors, []);
  console.log(
    "Mobile allocation: investment/birds conversion, whole-bird validation, capacity checks, weighted profit, preview and save payload passed with isolated fixtures",
  );
} finally {
  await b.close();
}
