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

/**
 * Strict privacy scrubber that strips all buyer personal data (name, phone,
 * email, delivery address) from sales descriptions and digital receipt particulars
 * when viewed by investment partners.
 */
export function scrubBuyerPII(
  rawDesc: string | null | undefined,
  category: string,
  type: string,
  birdsSold?: number | null,
): string {
  const desc = (rawDesc || "").trim();

  // 1. Bird Sales category or income with birdsSold
  if (category === "Bird Sales" || (type === "income" && birdsSold && birdsSold > 0)) {
    if (birdsSold && birdsSold > 0) {
      return `Bird Sales – ${birdsSold} Broiler${birdsSold === 1 ? "" : "s"}`;
    }
    const match =
      desc.match(/\b(?:sales|purchase)?\s*(?:of)?\s*(\d+)\s*(?:birds?|broilers?)\b/i) ||
      desc.match(/\b(\d+)\s*(?:birds?|broilers?)\b/i);
    if (match) {
      const qty = Number(match[1]);
      return `Bird Sales – ${qty} Broiler${qty === 1 ? "" : "s"}`;
    }
    if (/\bone\s*bird\b/i.test(desc) || /\bsales of one\b/i.test(desc)) {
      return "Bird Sales – 1 Broiler";
    }
    return "Bird Sales";
  }

  // 2. Store Order category
  if (category === "Store Order") {
    const codeMatch = desc.match(/\b((?:ORD|DAF)-[A-Za-z0-9-]+)\b/i);
    return codeMatch ? `Store Order #${codeMatch[1].toUpperCase()}` : "Store Order";
  }

  // 3. December Pre-Order category
  if (category === "December Pre-Order") {
    const codeMatch = desc.match(/\b(PRE-[A-Za-z0-9-]+)\b/i);
    return codeMatch ? `December Pre-Order #${codeMatch[1].toUpperCase()}` : "December Pre-Order";
  }

  // 4. For any other income transaction, rigorously scrub buyer PII
  if (type === "income") {
    let sanitized = desc
      // Strip phone numbers
      .replace(/(?:\+?234|0)[789][01]\d{8}\b/g, "")
      .replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4,5}\b/g, "")
      // Strip emails
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "")
      // Strip buyer prefix patterns (e.g. "Sold to John Doe", "Buyer: Alhaji ...")
      .replace(
        /(?:sold to|buyer|customer|purchased by|paid by|client|contact|phone|tel)\s*[:\-]?\s*[^,\n\r;]+/gi,
        "",
      )
      // Clean up punctuation and excess whitespace
      .replace(/\s*[-–—:,]\s*$/, "")
      .replace(/^\s*[-–—:,]\s*/, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    return sanitized || category || "Farm income";
  }

  // Expenses or Payouts keep operational particulars (e.g. "Feed purchase 20 bags starter")
  // but strip any stray buyer phone numbers or emails
  const sanitized = desc
    .replace(/(?:\+?234|0)[789][01]\d{8}\b/g, "")
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "")
    .trim();

  return sanitized || category;
}

export function partnerFinancialView(f: PartnerFinancial): PartnerFinancial {
  const category = categories.has(f.category)
    ? f.category
    : f.type === "expense"
      ? "Farm expense"
      : f.type === "income"
        ? "Farm income"
        : "Partner payout";

  const scrubbedDescription = scrubBuyerPII(
    f.description,
    category,
    f.type,
    f.birdsSold,
  );

  return {
    id: f.id,
    partnerId: f.partnerId,
    batchId: f.batchId,
    type: f.type,
    category,
    amount: f.amount,
    description: scrubbedDescription,
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
    referenceNo: f.referenceNo ?? null,
    recordedBy: f.recordedBy || "Farm Management",
    createdAt: f.createdAt,
    removedAt: f.removedAt,
    removedBy: null,
    removalReason: f.removalReason,
    approvalStatus: f.approvalStatus || "approved",
    approvedBy: f.approvedBy || "Farm Management",
    approvedAt: f.approvedAt,
    receiptUrl: f.receiptUrl ?? null,
    attachmentName: f.attachmentName ?? null,
    cycleName: f.cycleName,
    birdsSold: f.birdsSold ?? null,
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
    causeOfMortality: a.causeOfMortality,
    feedConsumedKg: a.feedConsumedKg,
    averageWeightKg: a.averageWeightKg,
    notes: a.notes ? a.notes.replace(/\s*\[SYNC:[^\]]+\]/gi, "").trim() : null,
    recordedBy: a.recordedBy || "Farm Management",
    createdAt: a.createdAt,
    removedAt: a.removedAt,
    removedBy: null,
    removalReason: a.removalReason,
    approvalStatus: a.approvalStatus || "approved",
    approvedBy: a.approvedBy || "Farm Management",
    approvedAt: a.approvedAt,
    photoUrl: a.photoUrl ?? null,
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
