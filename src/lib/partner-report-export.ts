import { jsPDF } from "jspdf";
import type { FarmPartner, PartnerFinancial, PartnerActivity } from "@/lib/partners.functions";

const naira = (n: number) => "NGN " + Math.round(n || 0).toLocaleString("en-NG");
const nairaSymbol = (n: number) => "₦" + Math.round(n || 0).toLocaleString("en-NG");

/**
 * Generate and download an official PDF Statement for a Partner
 */
export function exportPartnerReportPDF(
  partner: FarmPartner,
  financials: PartnerFinancial[],
  activities: PartnerActivity[],
) {
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

  // Header Banner
  doc.setFillColor(15, 61, 36); // #0F3D24
  doc.rect(0, 0, 210, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("DIGNITY AGRO FARMS LIMITED", 14, 12);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("RC / Agribusiness · Owerri, Imo State · Tel: +234 816 709 9492 · dignityagrofarms.com", 14, 18);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(168, 230, 168);
  doc.text("OFFICIAL PARTNER STATEMENT & SETTLEMENT REPORT", 14, 24);

  y = 35;

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
    `Capital Invested: ${naira(partner.initialInvestment)}   •   Profit Share: ${partner.profitSharePercentage}% of Net Profit   •   Loss Share: ${partner.lossSharePercentage}% of Net Loss (Capped at capital)`,
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
  doc.setFillColor(240, 245, 255);
  doc.setDrawColor(180, 200, 240);
  doc.roundedRect(14, y, 182, 16, 2, 2, "FD");

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 50, 120);
  doc.text(
    `Total Capital Position: ${naira(s.payoutDue)}   |   Payouts Disbursed: ${naira(s.paidOut)}   |   Remaining Balance Due: ${naira(Math.max(0, s.balanceOwed))}`,
    18,
    y + 10,
  );

  y += 22;

  // Section: Itemized Financial Ledger
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 61, 36);
  doc.text(`ITEMIZED FINANCIAL TRANSACTIONS (${financials.length} Entries)`, 14, y);
  y += 4;

  // Table Header
  doc.setFillColor(15, 61, 36);
  doc.rect(14, y, 182, 6, "F");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Date", 16, y + 4.2);
  doc.text("Type", 38, y + 4.2);
  doc.text("Category", 60, y + 4.2);
  doc.text("Description", 95, y + 4.2);
  doc.text("Method", 150, y + 4.2);
  doc.text("Amount (NGN)", 175, y + 4.2);

  y += 6;

  const validFins = financials.slice(0, 35); // Keep concise or paginated
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);

  validFins.forEach((f, idx) => {
    if (y > 275) {
      doc.addPage();
      y = 15;
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

    const desc = f.removedAt ? `[REMOVED: ${f.removalReason || "Correction"}] ${f.description}` : f.description;
    doc.text((desc || "").slice(0, 32), 95, y + 3.8);
    doc.text((f.paymentMethod || "Bank Transfer").slice(0, 14), 150, y + 3.8);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(f.type === "expense" ? 180 : 15, f.type === "expense" ? 40 : 61, f.type === "expense" ? 40 : 36);
    doc.text(naira(f.amount), 175, y + 3.8);
    doc.setFont("helvetica", "normal");

    y += 5.5;
  });

  if (financials.length > 35) {
    y += 3;
    doc.setFontSize(7.5);
    doc.setTextColor(120, 120, 120);
    doc.text(`... and ${financials.length - 35} more transactions available in the digital portal.`, 16, y);
    y += 5;
  }

  // Section: Daily Activities Summary (if space permits or on new page)
  if (activities.length > 0) {
    if (y > 220) {
      doc.addPage();
      y = 15;
    } else {
      y += 8;
    }

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 61, 36);
    doc.text(`RECENT DAILY FARM ACTIVITIES & STOCK LOGS (${activities.length} Entries)`, 14, y);
    y += 4;

    doc.setFillColor(15, 61, 36);
    doc.rect(14, y, 182, 6, "F");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("Date", 16, y + 4.2);
    doc.text("Activity Type", 40, y + 4.2);
    doc.text("Stock", 88, y + 4.2);
    doc.text("Mortality", 108, y + 4.2);
    doc.text("Feed (kg)", 130, y + 4.2);
    doc.text("Notes", 152, y + 4.2);

    y += 6;

    activities.slice(0, 20).forEach((a, idx) => {
      if (y > 275) {
        doc.addPage();
        y = 15;
      }
      const bg = idx % 2 === 0 ? 255 : 248;
      doc.setFillColor(bg, bg, bg);
      doc.rect(14, y, 182, 5.5, "F");

      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      doc.text(a.activityDate, 16, y + 3.8);
      doc.text((a.activityType || "").slice(0, 25), 40, y + 3.8);
      doc.text(String(a.stockHeadcount || 0), 88, y + 3.8);
      doc.setTextColor(a.mortalityCount > 0 ? 180 : 60, a.mortalityCount > 0 ? 30 : 60, 30);
      doc.text(String(a.mortalityCount || 0), 108, y + 3.8);
      doc.setTextColor(60, 60, 60);
      doc.text(String(a.feedConsumedKg || 0), 130, y + 3.8);
      doc.text((a.notes || "—").slice(0, 28), 152, y + 3.8);

      y += 5.5;
    });
  }

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
  lines.push(`"Agreed Loss Share: ${partner.lossSharePercentage}% (Capped at capital)"`);
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
  lines.push("");

  lines.push(`"=== ITEMIZED FINANCIAL LEDGER ==="`);
  lines.push("Date,Type,Category,Description,Payment Method,Amount (NGN),Status,Removal Reason");

  financials.forEach((f) => {
    const desc = `"${(f.description || "").replace(/"/g, '""')}"`;
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
  lines.push("Date,Activity Type,Headcount,Mortality,Feed Consumed (KG),Average Weight (KG),Notes,Status");

  activities.forEach((a) => {
    const notes = `"${(a.notes || "").replace(/"/g, '""')}"`;
    lines.push(
      [
        a.activityDate,
        `"${a.activityType}"`,
        a.stockHeadcount,
        a.mortalityCount,
        a.feedConsumedKg,
        a.averageWeightKg,
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
