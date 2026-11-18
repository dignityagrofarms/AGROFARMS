import { jsPDF } from "jspdf";
import type {
  FarmPartner,
  PartnerFinancial,
  PartnerActivity,
  PartnerReceivablesSummary,
  PartnerDashboardSummary,
} from "@/lib/partners.functions";
import { getPublicAuthorizedSignature } from "@/lib/partners.functions";
import { scrubBuyerPII } from "@/lib/partner-privacy";
import { base64LogoDarkBg, defaultAuthorizedSignaturePng } from "@/lib/receipt-logo";

const naira = (n: number) => "NGN " + Math.round(n || 0).toLocaleString("en-NG");
const nairaSymbol = (n: number) => "₦" + Math.round(n || 0).toLocaleString("en-NG");

/**
 * Generate and download an official PDF Statement for a Partner
 */
export async function exportPartnerReportPDF(
  partner: FarmPartner,
  financials: PartnerFinancial[],
  activities: PartnerActivity[],
  receivables?: PartnerReceivablesSummary | null,
  summary?: PartnerDashboardSummary | null,
  customSignature?: {
    signaturePng?: string | null;
    signatoryName?: string | null;
    signatoryTitle?: string | null;
  } | null,
) {
  let activeSig = customSignature;
  if (!activeSig) {
    try {
      activeSig = await getPublicAuthorizedSignature();
    } catch {
      activeSig = {
        signaturePng: defaultAuthorizedSignaturePng,
        signatoryName: "Managing Director / Chief Executive",
        signatoryTitle: "Dignity Agro Farms Limited · Authorized Signatory",
      };
    }
  }

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const s = partner.settlement;
  const isProfit = s.result === "profit";
  const isLoss = s.result === "loss";
  const nowStr = new Date().toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  let y = 14;

  // Header Banner with Official Dignity Agro Farms Logo
  doc.setFillColor(15, 61, 36); // #0F3D24
  doc.rect(0, 0, 210, 32, "F");

  try {
    doc.addImage(base64LogoDarkBg, "PNG", 14, 3, 26, 26);
  } catch {
    // Fallback if image rendering fails
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("DIGNITY AGRO FARMS LIMITED", 44, 12);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(230, 240, 230);
  doc.text("RC / Agribusiness · Owerri, Imo State · Tel: +234 816 709 9492 · dignityagrofarms.com", 44, 18);

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(168, 230, 168);
  doc.text("OFFICIAL PARTNER STATEMENT & SETTLEMENT REPORT", 44, 25);

  y = 38;

  // Helper for continuation headers on pages 2+
  const renderContinuationHeader = (subtitle: string) => {
    doc.setFillColor(15, 61, 36);
    doc.rect(0, 0, 210, 13, "F");
    try {
      doc.addImage(base64LogoDarkBg, "PNG", 14, 1.5, 10, 10);
    } catch {}
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(`DIGNITY AGRO FARMS — ${partner.fullName} (@${partner.username})`, 28, 8.5);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(168, 230, 168);
    doc.text(subtitle, 196, 8.5, { align: "right" });
    y = 20;
  };

  // Document meta box
  doc.setDrawColor(220, 225, 220);
  doc.setFillColor(247, 245, 240);
  doc.roundedRect(14, y, 182, 30, 2, 2, "FD");

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 61, 36);
  doc.text(partner.fullName, 18, y + 7);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 90, 80);
  doc.text(`Username: @${partner.username}  |  Phone: ${partner.phone}  |  Email: ${partner.email || "N/A"}`, 18, y + 13);
  doc.text(
    `Project: ${partner.projectName}  |  Cycle: ${partner.cycleName}  |  Status: ${partner.cycleStatus === "closed" ? "SETTLED & CLOSED" : "LIVE & ACTIVE"}`,
    18,
    y + 19,
  );
  doc.text(
    `Investment Date: ${partner.investmentDate}  |  Report Generated: ${nowStr}`,
    18,
    y + 25,
  );

  y += 36;

  // Agreed Terms & Sharing Split Box
  doc.setFillColor(235, 245, 235);
  doc.setDrawColor(63, 143, 63);
  doc.roundedRect(14, y, 182, 20, 2, 2, "FD");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 61, 36);
  doc.text("AGREED PARTNERSHIP TERMS & SHARING RATIO", 18, y + 6);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 50, 40);
  doc.text(
    `Capital Invested: ${naira(partner.initialInvestment)}   •   Profit Share: ${partner.profitSharePercentage}% of Net Profit   •   Downside Risk: Governed by Agreement (Capped at capital)`,
    18,
    y + 12,
  );
  doc.text(
    `Digital Agreement: ${partner.agreementSigned ? `Signed by ${partner.agreementSignedBy || partner.fullName} on ${partner.agreementSignedAt?.slice(0, 10)}` : "Pending Signature"}`,
    18,
    y + 17,
  );

  y += 26;

  // Financial Summary KPI Grid (4 Cards)
  const cardW = 43;
  const cardH = 18;
  const cards = [
    { label: "Total Cycle Sales", val: naira(s.totalIncome), c: [15, 61, 36] },
    { label: "Cycle Expenses", val: naira(s.totalExpenses), c: [180, 40, 40] },
    {
      label: s.net >= 0 ? "Net Cycle Profit" : "Net Cycle Loss",
      val: naira(Math.abs(s.net)),
      c: s.net >= 0 ? [15, 61, 36] : [180, 40, 40],
    },
    {
      label: isLoss ? "Your Share of Loss" : "Your Share of Profit",
      val: naira(Math.abs(s.partnerSignedResult)),
      c: isLoss ? [180, 40, 40] : [15, 61, 36],
    },
  ];

  cards.forEach((c, i) => {
    const cx = 14 + i * (cardW + 3.3);
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(220, 220, 220);
    doc.roundedRect(cx, y, cardW, cardH, 1.5, 1.5, "FD");

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 100, 100);
    doc.text(c.label.toUpperCase(), cx + 3, y + 5.5);

    doc.setFontSize(9);
    doc.setTextColor(c.c[0], c.c[1], c.c[2]);
    doc.text(c.val, cx + 3, y + 13);
  });

  y += cardH + 5;

  // Payout Position Box
  const hasReceivables = Boolean(receivables && receivables.batchReceivablesTotal > 0);
  const payoutBoxH = hasReceivables ? 22 : 16;
  doc.setFillColor(240, 245, 255);
  doc.setDrawColor(180, 200, 240);
  doc.roundedRect(14, y, 182, payoutBoxH, 2, 2, "FD");

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 50, 120);
  doc.text(
    `Total Capital Position: ${naira(s.payoutDue)}   |   Payouts Disbursed: ${naira(s.paidOut)}   |   Remaining Balance Due: ${naira(Math.max(0, s.balanceOwed))}`,
    18,
    y + 8,
  );

  if (hasReceivables && receivables) {
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(160, 80, 0);
    doc.text(
      `Pending Receivables (Money Owed): +${naira(receivables.partnerReceivablesShare)} (${receivables.partnerProfitSharePercentage}% share of ${naira(receivables.batchReceivablesTotal)} batch total)  |  Projected Net: ${naira(receivables.projectedNet)}`,
      18,
      y + 16,
    );
  }

  y += payoutBoxH + 6;

  // Section: Itemized Financial Ledger
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 61, 36);
  doc.text(`ITEMIZED FINANCIAL TRANSACTIONS (${financials.length} Entries)`, 14, y);
  y += 4;

  const renderFinHeader = (isCont?: boolean) => {
    doc.setFillColor(15, 61, 36);
    doc.rect(14, y, 182, 6, "F");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("Date", 16, y + 4.2);
    doc.text("Type", 38, y + 4.2);
    doc.text("Category", 60, y + 4.2);
    doc.text(isCont ? "Description (Cont.)" : "Description", 95, y + 4.2);
    doc.text("Method", 150, y + 4.2);
    doc.text("Amount (NGN)", 175, y + 4.2);
    y += 6;
  };

  renderFinHeader();

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);

  financials.forEach((f, idx) => {
    if (y > 272) {
      doc.addPage();
      renderContinuationHeader("Itemized Ledger (Cont.)");
      renderFinHeader(true);
    }
    const bg = idx % 2 === 0 ? 255 : 248;
    doc.setFillColor(bg, bg, bg);
    doc.rect(14, y, 182, 5.5, "F");

    doc.setTextColor(f.removedAt ? 160 : 40, f.removedAt ? 160 : 40, f.removedAt ? 160 : 40);
    doc.text(f.transactionDate, 16, y + 3.8);

    // Type with color
    if (f.type === "expense") {
      doc.setTextColor(180, 40, 40);
      doc.text("EXPENSE", 38, y + 3.8);
    } else if (f.type === "income") {
      doc.setTextColor(15, 61, 36);
      doc.text("INCOME", 38, y + 3.8);
    } else {
      doc.setTextColor(30, 80, 180);
      doc.text("PAYOUT", 38, y + 3.8);
    }

    doc.setTextColor(60, 60, 60);
    doc.text((f.category || "").slice(0, 20), 60, y + 3.8);

    const cleanD = scrubBuyerPII(f.description, f.category, f.type, f.birdsSold);
    const desc = f.removedAt ? `[REMOVED: ${f.removalReason || "Correction"}] ${cleanD}` : cleanD;
    doc.text((desc || "").slice(0, 32), 95, y + 3.8);
    doc.text((f.paymentMethod || "Bank Transfer").slice(0, 14), 150, y + 3.8);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(f.type === "expense" ? 180 : 15, f.type === "expense" ? 40 : 61, f.type === "expense" ? 40 : 36);
    doc.text(naira(f.amount), 175, y + 3.8);
    doc.setFont("helvetica", "normal");

    y += 5.5;
  });

  // Section: Daily Activities & Flock Health Logs
  if (activities.length > 0) {
    if (y > 210) {
      doc.addPage();
      renderContinuationHeader("Daily Farm Operations Log");
    } else {
      y += 8;
    }

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 61, 36);
    doc.text(`DAILY FARM ACTIVITIES & FLOCK MONITORING LOGS (${activities.length} Entries)`, 14, y);
    y += 4.5;

    // Flock KPI Summary Strip
    const liveStock = summary?.currentStockCount ?? "—";
    const totalMort = summary?.totalMortalityCount ?? activities.reduce((sum, a) => sum + (a.mortalityCount || 0), 0);
    const mortRate = summary?.mortalityRatePercent ?? (summary?.initialStockCount ? ((totalMort / summary.initialStockCount) * 100).toFixed(1) : "—");
    const totalFeed = summary?.totalFeedConsumedKg ?? activities.reduce((sum, a) => sum + (a.feedConsumedKg || 0), 0);
    const avgWeight = summary?.latestAverageWeightKg
      ? `${summary.latestAverageWeightKg.toFixed(2)} kg`
      : (activities.find((a) => a.averageWeightKg > 0)?.averageWeightKg
          ? `${activities.find((a) => a.averageWeightKg > 0)!.averageWeightKg.toFixed(2)} kg`
          : "—");

    doc.setFillColor(245, 249, 246);
    doc.setDrawColor(210, 230, 215);
    doc.roundedRect(14, y, 182, 11, 1.5, 1.5, "FD");

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 61, 36);
    doc.text(
      `Flock Metrics:  Live Birds: ${liveStock}  |  Total Mortality: ${totalMort} (${mortRate}%)  |  Total Feed: ${typeof totalFeed === "number" ? totalFeed.toLocaleString() : totalFeed} kg  |  Latest Avg Weight: ${avgWeight}`,
      18,
      y + 7,
    );
    y += 14;

    const renderActHeader = (isCont?: boolean) => {
      doc.setFillColor(15, 61, 36);
      doc.rect(14, y, 182, 6, "F");
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("Date", 16, y + 4.2);
      doc.text("Activity Type", 36, y + 4.2);
      doc.text("Mortality", 68, y + 4.2);
      doc.text("Feed Intake", 86, y + 4.2);
      doc.text("Avg Weight", 106, y + 4.2);
      doc.text(isCont ? "Notes & Observations (Cont.)" : "Notes & Observations", 126, y + 4.2);
      y += 6;
    };

    renderActHeader();

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);

    activities.forEach((a, idx) => {
      if (y > 272) {
        doc.addPage();
        renderContinuationHeader("Daily Farm Operations (Cont.)");
        renderActHeader(true);
      }
      const bg = idx % 2 === 0 ? 255 : 248;
      doc.setFillColor(bg, bg, bg);
      doc.rect(14, y, 182, 5.5, "F");

      doc.setTextColor(a.removedAt ? 160 : 60, a.removedAt ? 160 : 60, a.removedAt ? 160 : 60);
      doc.text(a.activityDate, 16, y + 3.8);

      // Activity Type
      doc.text((a.activityType || "").slice(0, 22), 36, y + 3.8);

      // Mortality (highlighted if > 0)
      if (a.mortalityCount && a.mortalityCount > 0) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(180, 40, 40);
        doc.text(`${a.mortalityCount} birds`, 68, y + 3.8);
        doc.setFont("helvetica", "normal");
      } else {
        doc.setTextColor(160, 160, 160);
        doc.text("—", 68, y + 3.8);
      }

      // Feed Intake
      if (a.feedConsumedKg && a.feedConsumedKg > 0) {
        doc.setTextColor(160, 80, 0);
        doc.text(`${a.feedConsumedKg} kg`, 86, y + 3.8);
      } else {
        doc.setTextColor(160, 160, 160);
        doc.text("—", 86, y + 3.8);
      }

      // Average Weight
      if (a.averageWeightKg && a.averageWeightKg > 0) {
        doc.setTextColor(100, 30, 140);
        doc.text(`${a.averageWeightKg} kg`, 106, y + 3.8);
      } else {
        doc.setTextColor(160, 160, 160);
        doc.text("—", 106, y + 3.8);
      }

      // Clean Notes (strip [SYNC:...], append cause of mortality if present)
      let cleanNotes = (a.notes || "").replace(/\s*\[SYNC:[^\]]+\]/gi, "").trim();
      if (a.causeOfMortality) {
        cleanNotes = cleanNotes
          ? `${cleanNotes} (Cause: ${a.causeOfMortality})`
          : `Cause: ${a.causeOfMortality}`;
      }
      if (!cleanNotes) cleanNotes = "—";
      if (a.removedAt) {
        cleanNotes = `[REMOVED] ${cleanNotes}`;
      }
      doc.setTextColor(60, 60, 60);
      doc.text(cleanNotes.slice(0, 44), 126, y + 3.8);

      y += 5.5;
    });
  }

  // 5. Official Corporate Certification & Settlement Sign-off Block
  if (y > 218) {
    doc.addPage();
    renderContinuationHeader("Official Corporate Certification & Sign-off");
    y = 20;
  } else {
    y += 10;
  }

  const boxY = y;
  doc.setDrawColor(15, 61, 36);
  doc.setFillColor(247, 245, 240);
  doc.roundedRect(14, boxY, 182, 50, 2, 2, "FD");

  // Title inside box
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 61, 36);
  doc.text("OFFICIAL CORPORATE CERTIFICATION & SETTLEMENT SIGN-OFF", 20, boxY + 6.5);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 70, 60);
  doc.text(
    "I hereby certify that this official statement represents the verified financial ledger, flock inventory, and operational",
    20,
    boxY + 11.5,
  );
  doc.text(
    "records of Dignity Agro Farms Limited. All calculations, splits, and payouts follow the ratified Co-Financing Agreement.",
    20,
    boxY + 15.5,
  );

  // Divider line
  doc.setDrawColor(210, 215, 210);
  doc.line(20, boxY + 18, 190, boxY + 18);

  // Left side: Managing Director Signature & Seal
  const sigImg = activeSig?.signaturePng || defaultAuthorizedSignaturePng;
  try {
    doc.addImage(sigImg, "PNG", 22, boxY + 19, 42, 16);
  } catch {
    // Fallback if image render error
  }

  // Circular Seal Stamp
  const sealCenterX = 76;
  const sealCenterY = boxY + 28;
  doc.setDrawColor(15, 61, 36);
  doc.setLineWidth(0.4);
  doc.circle(sealCenterX, sealCenterY, 8.5);
  doc.setLineWidth(0.15);
  doc.circle(sealCenterX, sealCenterY, 7.2);
  doc.setFontSize(4.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 61, 36);
  doc.text("DIGNITY AGRO FARMS", sealCenterX, sealCenterY - 3, { align: "center" });
  doc.setTextColor(63, 143, 63);
  doc.text("★ SEAL ★", sealCenterX, sealCenterY, { align: "center" });
  doc.setTextColor(15, 61, 36);
  doc.text("AUDITED & SEALED", sealCenterX, sealCenterY + 3.2, { align: "center" });
  doc.setLineWidth(0.2);

  // Signature line (Managing Director)
  doc.setDrawColor(120, 130, 120);
  doc.line(20, boxY + 38, 92, boxY + 38);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 61, 36);
  doc.text(activeSig?.signatoryName || "Managing Director / Chief Executive", 20, boxY + 42);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(90, 100, 90);
  doc.text(activeSig?.signatoryTitle || "Dignity Agro Farms Limited · Authorized Signatory", 20, boxY + 45.5);
  doc.text(`Certified Date: ${nowStr.slice(0, 11)}`, 20, boxY + 48.5);

  // Right side: Partner Digital Acceptance / Verification
  doc.setFillColor(235, 245, 235);
  doc.setDrawColor(63, 143, 63);
  doc.roundedRect(114, boxY + 20, 72, 14, 1.5, 1.5, "FD");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 61, 36);
  doc.text("INVESTOR DIGITAL VERIFICATION", 118, boxY + 25);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 70, 60);
  doc.text("Verified Acceptance & Co-Financing Rights", 118, boxY + 29.5);

  doc.setDrawColor(120, 130, 120);
  doc.line(114, boxY + 38, 186, boxY + 38);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 61, 36);
  doc.text(`${partner.fullName} (Partner / Investor)`, 114, boxY + 42);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  if (partner.agreementSigned) {
    doc.setTextColor(15, 110, 45);
    doc.text(`Digital Agreement: Signed (${partner.agreementSignedAt?.slice(0, 10) || "Recorded"})`, 114, boxY + 45.5);
  } else {
    doc.setTextColor(160, 100, 20);
    doc.text("Digital Agreement: Record on file · Verified Acceptance", 114, boxY + 45.5);
  }
  doc.setTextColor(90, 100, 90);
  doc.text(`Co-Financier: @${partner.username} · Profit Split: ${partner.profitSharePercentage}%`, 114, boxY + 48.5);

  // Footer Certificate
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(140, 140, 140);
    doc.text(
      `Dignity Agro Farms Limited • Official Partner Statement • Page ${i} of ${pageCount} • Generated on ${nowStr}`,
      14,
      290,
    );
  }

  // Save PDF
  const filename = `DignityAgroFarms_PartnerReport_${partner.username}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

/**
 * Generate and download a structured CSV Statement
 */
export function exportPartnerReportCSV(
  partner: FarmPartner,
  financials: PartnerFinancial[],
  activities: PartnerActivity[],
  receivables?: PartnerReceivablesSummary | null,
) {
  const lines: string[] = [];
  const s = partner.settlement;
  const isLoss = s.result === "loss";

  lines.push(`"DIGNITY AGRO FARMS LIMITED - PARTNERSHIP SETTLEMENT REPORT"`);
  lines.push(`"Generated: ${new Date().toISOString().replace("T", " ").slice(0, 19)}"`);
  lines.push(`"Partner Name: ${partner.fullName}"`);
  lines.push(`"Username: @${partner.username}"`);
  lines.push(`"Project: ${partner.projectName}"`);
  lines.push(`"Cycle: ${partner.cycleName}"`);
  lines.push(`"Cycle Status: ${partner.cycleStatus.toUpperCase()}"`);
  lines.push(`"Initial Investment: NGN ${partner.initialInvestment.toLocaleString()}"`);
  lines.push(`"Agreed Profit Share: ${partner.profitSharePercentage}%"`);
  lines.push(`"Agreed Downside Protection: Loss capped at capital per Agreement Section 4"`);
  lines.push(
    `"Agreement Status: ${partner.agreementSigned ? `Signed by ${partner.agreementSignedBy || partner.fullName} on ${partner.agreementSignedAt?.slice(0, 10)}` : "Pending Signature"}"`,
  );
  lines.push("");

  lines.push(`"=== FINANCIAL SUMMARY ==="`);
  lines.push(`"Gross Cycle Income (Sales)","NGN ${s.totalIncome.toLocaleString()}"`);
  lines.push(`"Cycle Operating Expenses","NGN ${s.totalExpenses.toLocaleString()}"`);
  lines.push(`"Net Cycle Result","NGN ${s.net.toLocaleString()}"`);
  lines.push(
    `"Partner Shared Result (${isLoss ? `${partner.lossSharePercentage}% loss` : `${partner.profitSharePercentage}% profit`})","NGN ${s.partnerSignedResult.toLocaleString()}"`,
  );
  lines.push(`"Total Capital Due to Partner","NGN ${s.payoutDue.toLocaleString()}"`);
  lines.push(`"Payouts Disbursed to Date","NGN ${s.paidOut.toLocaleString()}"`);
  lines.push(`"Net Balance Owed","NGN ${Math.max(0, s.balanceOwed).toLocaleString()}"`);
  if (receivables && receivables.batchReceivablesTotal > 0) {
    lines.push(`"Pending Batch Receivables (Money Owed)","NGN ${receivables.batchReceivablesTotal.toLocaleString()}"`);
    lines.push(`"Partner Share of Receivables (${receivables.partnerProfitSharePercentage}%)","NGN ${receivables.partnerReceivablesShare.toLocaleString()}"`);
    lines.push(`"Projected Final Net Position (Once Remitted)","NGN ${receivables.projectedNet.toLocaleString()}"`);
  }
  lines.push("");

  lines.push(`"=== ITEMIZED FINANCIAL LEDGER ==="`);
  lines.push("Date,Type,Category,Description,Payment Method,Amount (NGN),Status,Removal Reason");

  financials.forEach((f) => {
    const cleanD = scrubBuyerPII(f.description, f.category, f.type, f.birdsSold);
    const desc = `"${(cleanD || "").replace(/"/g, '""')}"`;
    const reason = f.removedAt ? `"${(f.removalReason || "").replace(/"/g, '""')}"` : "";
    lines.push(
      [
        f.transactionDate,
        f.type.toUpperCase(),
        `"${f.category}"`,
        desc,
        `"${f.paymentMethod}"`,
        f.amount,
        f.removedAt ? "REMOVED / CORRECTED" : "ACTIVE",
        reason,
      ].join(","),
    );
  });
  lines.push("");

  lines.push(`"=== DAILY FARM ACTIVITIES & FLOCK LOGS ==="`);
  lines.push("Date,Activity Type,Mortality,Cause of Mortality,Feed Consumed (KG),Average Weight (KG),Notes,Status");

  activities.forEach((a) => {
    let cleanNotes = (a.notes || "").replace(/\s*\[SYNC:[^\]]+\]/gi, "").trim();
    const notes = `"${cleanNotes.replace(/"/g, '""')}"`;
    const cause = `"${(a.causeOfMortality || "").replace(/"/g, '""')}"`;
    lines.push(
      [
        a.activityDate,
        `"${a.activityType}"`,
        a.mortalityCount || 0,
        cause,
        a.feedConsumedKg || 0,
        a.averageWeightKg || 0,
        notes,
        a.removedAt ? "REMOVED" : "ACTIVE",
      ].join(","),
    );
  });

  const csvContent = "\uFEFF" + lines.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `DignityAgroFarms_PartnerReport_${partner.username}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
