import type {
  PartnerFinancial,
  PartnerActivity,
  FarmPartner,
  PartnerCycleArchive,
} from "./partners.functions";
const categories = new Set([
  "Bird Sales",
  "Store Order",
  "December Pre-Order",
  "Feed",
  "Medication",
  "Medication / Vaccination",
  "Logistics/Transport",
  "Utilities",
  "Labour",
  "Equipment",
  "Payout",
]);
export function partnerFinancialView(f: PartnerFinancial): PartnerFinancial {
  const category = categories.has(f.category)
    ? f.category
    : f.type === "expense"
      ? "Farm expense"
      : f.type === "income"
        ? "Farm income"
        : "Partner payout";
  return {
    id: f.id,
    partnerId: f.partnerId,
    batchId: f.batchId,
    type: f.type,
    category,
    amount: f.amount,
    description: category,
    paymentMethod: [
      "Cash",
      "Bank Transfer",
      "POS",
      "POS / Card",
      "Bank transfer",
      "Transfer",
    ].includes(f.paymentMethod)
      ? f.paymentMethod
      : "Recorded payment",
    transactionDate: f.transactionDate,
    referenceNo: null,
    recordedBy: "Farm Management",
    createdAt: f.createdAt,
    removedAt: f.removedAt,
    removedBy: null,
    removalReason: null,
    approvalStatus: f.approvalStatus || "approved",
    approvedBy: "Farm Management",
    approvedAt: f.approvedAt,
    receiptUrl: null,
    attachmentName: null,
    cycleName: f.cycleName,
  };
}
export function partnerActivityView(a: PartnerActivity): PartnerActivity {
  return {
    id: a.id,
    partnerId: a.partnerId,
    batchId: a.batchId,
    activityDate: a.activityDate,
    activityType: a.activityType,
    stockHeadcount: a.stockHeadcount,
    mortalityCount: a.mortalityCount,
    causeOfMortality: null,
    feedConsumedKg: a.feedConsumedKg,
    averageWeightKg: a.averageWeightKg,
    notes: null,
    recordedBy: "Farm Management",
    createdAt: a.createdAt,
    removedAt: a.removedAt,
    removedBy: null,
    removalReason: null,
    approvalStatus: a.approvalStatus || "approved",
    approvedBy: "Farm Management",
    approvedAt: a.approvedAt,
    photoUrl: null,
    cycleName: a.cycleName,
  };
}
export function partnerArchiveView(a: PartnerCycleArchive): PartnerCycleArchive {
  return {
    cycleId: a.cycleId,
    cycleName: a.cycleName,
    projectName: a.projectName,
    batchId: a.batchId,
    batchName: a.batchName,
    initialInvestment: a.initialInvestment,
    profitSharePercentage: a.profitSharePercentage,
    lossSharePercentage: a.lossSharePercentage,
    cycleStartDate: a.cycleStartDate,
    cycleEndDate: a.cycleEndDate,
    settledAt: a.settledAt,
    settledBy: "Farm Management",
    settlement: a.settlement,
    summary: a.summary,
    financials: (a.financials || [])
      .filter((f) => !f.approvalStatus || f.approvalStatus === "approved")
      .map(partnerFinancialView),
    activities: (a.activities || [])
      .filter((f) => !f.approvalStatus || f.approvalStatus === "approved")
      .map(partnerActivityView),
    agreementSigned: a.agreementSigned,
    agreementSignedAt: a.agreementSignedAt,
    agreementSignedBy: a.agreementSignedBy,
  };
}
export function partnerProfileView(p: FarmPartner): FarmPartner {
  return {
    id: p.id,
    fullName: p.fullName,
    phone: p.phone,
    email: p.email,
    address: p.address,
    username: p.username,
    initialInvestment: p.initialInvestment,
    investmentDate: p.investmentDate,
    agreedTerms: p.agreedTerms,
    projectName: p.projectName,
    batchId: p.batchId,
    batchName: p.batchName,
    batchAllocationPercentage: p.batchAllocationPercentage,
    allocatedBirds: p.allocatedBirds,
    autoSyncBatch: p.autoSyncBatch,
    status: p.status,
    active: p.active,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    profitSharePercentage: p.profitSharePercentage,
    lossSharePercentage: p.lossSharePercentage,
    cycleName: p.cycleName,
    cycleStartDate: p.cycleStartDate,
    cycleEndDate: p.cycleEndDate,
    cycleStatus: p.cycleStatus,
    settledAt: p.settledAt,
    auditLog: p.auditLog.map((e) => ({
      at: e.at,
      by: "Farm Management",
      kind: e.kind,
      reason: null,
    })),
    agreementTerms: p.agreementTerms,
    agreementSigned: p.agreementSigned,
    agreementSignedAt: p.agreementSignedAt,
    agreementSignedBy: p.agreementSignedBy,
    agreementSignatureData: p.agreementSignatureData,
    agreementDocumentUrl: p.agreementDocumentUrl,
    agreementDocumentName: p.agreementDocumentName,
    agreementDocumentSize: p.agreementDocumentSize,
    agreementDocumentUploadedAt: p.agreementDocumentUploadedAt,
    agreementDocumentUploadedBy: null,
    archivedCycles: p.archivedCycles.map(partnerArchiveView),
    payoutElection: p.payoutElection,
    settlement: p.settlement,
  };
}
