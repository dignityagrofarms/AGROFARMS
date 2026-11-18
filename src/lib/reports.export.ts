import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import { toPng } from "html-to-image";
import { base64LogoWhiteBg, defaultAuthorizedSignaturePng } from "@/lib/receipt-logo";

export interface ReportTransaction {
  id: string;
  batchId?: string | null;
  transactionDate: string;
  type: "income" | "expense";
  category: string;
  batchName?: string;
  description: string;
  paymentMethod?: string;
  amount: number;
  referenceNo?: string;
}

export interface ReportActivity {
  id: string;
  batchId?: string | null;
  activityDate: string;
  activityType: string;
  batchName?: string;
  description: string;
  notes?: string;
  cost?: number;
  loggedBy?: string;
  sickCount?: number;
  mortalityCount?: number;
  causeOfMortality?: string | null;
  feedConsumedKg?: number;
  feedGiven?: boolean | null;
  feedBrand?: string | null;
  feedBagNo?: number | null;
  feedBagStatus?: "opened" | "finished" | string | null;
  feedBagsUsed?: number | null;
  waterGiven?: boolean | null;
  temperature?: string | null;
  medicationGiven?: string | null;
  eggsCollected?: number;
}

export interface ExportReportOptions {
  format: "pdf" | "excel" | "csv";
  reportTitle?: string;
  batchName: string;
  batchType: string;
  headcount: number;
  mortality: number;
  mortalityRate: number;
  dateRangeText: string;
  includeFinancials: boolean;
  includeActivities: boolean;
  includeKpis: boolean;
  financials: ReportTransaction[];
  activities: ReportActivity[];
  kpis: {
    totalIncome: number;
    totalExpense: number;
    netProfit: number;
    roi: string;
  };
}

const formatNaira = (val: number) =>
  "₦" + val.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

/**
 * Helper to calculate dynamic auto column widths for SheetJS Worksheets
 */
function autoFitColumns(ws: XLSX.WorkSheet, dataRows: (string | number | null | undefined)[][]) {
  if (!dataRows || dataRows.length === 0) return;
  const colWidths: number[] = [];
  dataRows.forEach((row) => {
    row.forEach((val, colIdx) => {
      const strVal = val != null ? String(val) : "";
      const len = strVal.length;
      colWidths[colIdx] = Math.max(colWidths[colIdx] || 12, len + 4);
    });
  });
  ws["!cols"] = colWidths.map((wch) => ({ wch: Math.min(wch, 60) }));
}

/**
 * Generate Structured CSV Report with clean headers and calculated totals
 */
export function generateCSVReport(options: ExportReportOptions) {
  const lines: string[] = [];

  lines.push(`"DIGNITY AGRO FARMS - CUSTOM FARM REPORT"`);
  lines.push(`"Generated Date: ${new Date().toISOString().replace("T", " ").slice(0, 19)}"`);
  lines.push(`"View / Batch: ${options.batchName}"`);
  lines.push(`"Batch Type: ${options.batchType}"`);
  lines.push(`"Date Range: ${options.dateRangeText}"`);
  lines.push(`"Live Headcount: ${options.headcount} birds"`);
  lines.push(`"Mortality: ${options.mortality} birds (${options.mortalityRate}%)"`);

  if (options.includeKpis) {
    lines.push("");
    lines.push(`"=== FINANCIAL KPI SUMMARY ==="`);
    lines.push(`"Total Revenue (Income): NGN ${options.kpis.totalIncome.toLocaleString()}"`);
    lines.push(`"Total Expenses: NGN ${options.kpis.totalExpense.toLocaleString()}"`);
    lines.push(`"Net Profit / Loss: NGN ${options.kpis.netProfit.toLocaleString()}"`);
    lines.push(`"Profit Margin / ROI: ${options.kpis.roi}"`);
  }

  if (options.includeFinancials) {
    lines.push("");
    lines.push(`"=== FINANCIAL LEDGER ==="`);
    lines.push("Date,Type,Category,Batch,Description,Payment Method,Amount (NGN)");
    
    let totalInc = 0;
    let totalExp = 0;

    options.financials.forEach((t) => {
      const desc = `"${(t.description || "").replace(/"/g, '""')}"`;
      const amt = Number(t.amount || 0);
      if (t.type === "income") totalInc += amt;
      if (t.type === "expense") totalExp += amt;

      lines.push(
        [
          t.transactionDate ? t.transactionDate.split("T")[0] : "",
          t.type ? t.type.toUpperCase() : "",
          t.category || "",
          t.batchName || "",
          desc,
          t.paymentMethod || "N/A",
          amt,
        ].join(",")
      );
    });

    lines.push("");
    lines.push(`"TOTAL REVENUE (INCOME)",,,,,,"${totalInc}"`);
    lines.push(`"TOTAL EXPENSES",,,,,,"${totalExp}"`);
    lines.push(`"NET PROFIT / LOSS",,,,,,"${totalInc - totalExp}"`);
  }

  if (options.includeActivities) {
    lines.push("");
    lines.push(`"=== DAILY FARM ACTIVITIES LOG ==="`);
    lines.push(
      "Date,Batch,Activity Type,Sick Count,Mortality / Dead,Cause of Mortality,Feed Consumed (kg),Feed Brand & Bag #,Water,Temperature,Medication,Logged By,Notes"
    );
    options.activities.forEach((a) => {
      const feedBagInfo = [
        a.feedBrand,
        a.feedBagNo ? `Bag #${a.feedBagNo} (${a.feedBagStatus || "opened"})` : "",
      ]
        .filter(Boolean)
        .join(" · ");
      const notes = `"${(a.notes || a.description || "").replace(/"/g, '""')}"`;
      lines.push(
        [
          a.activityDate ? a.activityDate.split("T")[0] : "",
          `"${(a.batchName || "").replace(/"/g, '""')}"`,
          `"${(a.activityType || "General").replace(/"/g, '""')}"`,
          a.sickCount || 0,
          a.mortalityCount || 0,
          `"${(a.causeOfMortality || "").replace(/"/g, '""')}"`,
          a.feedConsumedKg || 0,
          `"${feedBagInfo.replace(/"/g, '""')}"`,
          a.waterGiven ? "Yes" : "—",
          `"${(a.temperature || "—").replace(/"/g, '""')}"`,
          `"${(a.medicationGiven || "—").replace(/"/g, '""')}"`,
          `"${(a.loggedBy || "—").replace(/"/g, '""')}"`,
          notes,
        ].join(",")
      );
    });
  }

  const csvString = "\uFEFF" + lines.join("\n"); // Add UTF-8 BOM for Excel compatibility
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const filename = `AgroFarms_Report_${options.batchName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`;
  saveBlob(blob, filename);
}

/**
 * Generate Excel (.xlsx) Report with multi-tabs, freeze panes, auto-fit columns & currency formatting
 */
export function generateExcelReport(options: ExportReportOptions) {
  const wb = XLSX.utils.book_new();

  // 1. Executive Summary Sheet
  const summaryRows = [
    ["DIGNITY AGRO FARMS - REPORT SUMMARY"],
    ["Generated On", new Date().toLocaleString("en-NG")],
    ["View / Batch", options.batchName],
    ["Batch Type", options.batchType],
    ["Date Filter", options.dateRangeText],
    ["Live Headcount", `${options.headcount} birds`],
    ["Mortality", `${options.mortality} birds (${options.mortalityRate}%)`],
    [],
    ["FINANCIAL OVERVIEW METRICS"],
    ["Total Revenue (Income)", options.kpis.totalIncome],
    ["Total Expenses", options.kpis.totalExpense],
    ["Net Profit / Loss", options.kpis.netProfit],
    ["ROI / Margin", options.kpis.roi],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet["!views"] = [{ state: "frozen", ySplit: 1, activeCell: "A2" }];
  autoFitColumns(summarySheet, summaryRows);

  // Format currency rows in summary sheet
  [9, 10, 11].forEach((rIdx) => {
    const cellAddr = XLSX.utils.encode_cell({ r: rIdx, c: 1 });
    if (summarySheet[cellAddr] && typeof summarySheet[cellAddr].v === "number") {
      summarySheet[cellAddr].z = '"₦"#,##0.00';
    }
  });

  XLSX.utils.book_append_sheet(wb, summarySheet, "Overview");

  // 2. Financial Ledger Sheet
  if (options.includeFinancials) {
    const finHeader = ["Date", "Type", "Category", "Batch", "Description", "Payment Method", "Amount (NGN)"];
    
    let totalInc = 0;
    let totalExp = 0;

    const finRows = options.financials.map((t) => {
      const amt = Number(t.amount || 0);
      if (t.type === "income") totalInc += amt;
      if (t.type === "expense") totalExp += amt;

      return [
        t.transactionDate ? t.transactionDate.split("T")[0] : "",
        t.type ? t.type.toUpperCase() : "",
        t.category || "",
        t.batchName || "",
        t.description || "",
        t.paymentMethod || "N/A",
        amt,
      ];
    });

    const totalRows: (string | number)[][] = [
      [],
      ["TOTAL REVENUE (INCOME)", "", "", "", "", "", totalInc],
      ["TOTAL EXPENSES", "", "", "", "", "", totalExp],
      ["NET PROFIT / LOSS", "", "", "", "", "", totalInc - totalExp],
    ];

    const allFinData = [finHeader, ...finRows, ...totalRows];
    const finSheet = XLSX.utils.aoa_to_sheet(allFinData);
    finSheet["!views"] = [{ state: "frozen", ySplit: 1, activeCell: "A2" }];
    autoFitColumns(finSheet, allFinData);

    // Apply currency format to Amount column (Column G / index 6)
    for (let r = 1; r < allFinData.length; r++) {
      const cellAddr = XLSX.utils.encode_cell({ r, c: 6 });
      if (finSheet[cellAddr] && typeof finSheet[cellAddr].v === "number") {
        finSheet[cellAddr].z = '"₦"#,##0.00';
      }
    }

    XLSX.utils.book_append_sheet(wb, finSheet, "Financial Ledger");
  }

  // 3. Farm Activities Log Sheet
  if (options.includeActivities) {
    const actHeader = [
      "Date",
      "Batch",
      "Activity Type",
      "Sick Count",
      "Mortality / Dead",
      "Cause of Mortality",
      "Feed Consumed (kg)",
      "Feed Brand & Bag #",
      "Water Given",
      "Temperature",
      "Medication Given",
      "Logged By",
      "Notes",
    ];
    const actRows = options.activities.map((a) => {
      const feedBagInfo = [
        a.feedBrand,
        a.feedBagNo ? `Bag #${a.feedBagNo} (${a.feedBagStatus || "opened"})` : "",
      ]
        .filter(Boolean)
        .join(" · ");
      return [
        a.activityDate ? a.activityDate.split("T")[0] : "",
        a.batchName || "N/A",
        a.activityType || "General",
        a.sickCount || 0,
        a.mortalityCount || 0,
        a.causeOfMortality || "—",
        a.feedConsumedKg || 0,
        feedBagInfo || "—",
        a.waterGiven ? "Yes" : "—",
        a.temperature || "—",
        a.medicationGiven || "—",
        a.loggedBy || "—",
        a.notes || a.description || "—",
      ];
    });
    const allActData = [actHeader, ...actRows];
    const actSheet = XLSX.utils.aoa_to_sheet(allActData);
    actSheet["!views"] = [{ state: "frozen", ySplit: 1, activeCell: "A2" }];
    autoFitColumns(actSheet, allActData);

    XLSX.utils.book_append_sheet(wb, actSheet, "Farm Activities");
  }

  const filename = `AgroFarms_Report_${options.batchName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export async function generatePDFReport(options: ExportReportOptions) {
  const PAGE_W = 794; // A4 @ 96dpi
  const PAGE_H = 1123;
  const PAD = 32;
  const FOOTER_H = 34;
  const CONTENT_W = PAGE_W - PAD * 2;
  const CONTENT_MAX_H = PAGE_H - PAD * 2 - FOOTER_H;

  const esc = (v: unknown) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const money = (val: number) => (val < 0 ? "-" : "") + formatNaira(Math.abs(val));
  const dateOnly = (d?: string) => (d ? d.split("T")[0] : "");

  interface Block {
    html: string;
    h: number;
    repeat?: { key: string; html: string; h: number };
    sets?: string;
  }
  interface RawBlock {
    html: string;
    repeat?: { key: string; html: string };
    sets?: string;
  }

  const th = (label: string, align = "left") =>
    `<th style="padding: 8px 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; text-align: ${align};">${label}</th>`;
  const td = (content: string, extra = "") =>
    `<td style="padding: 7px 10px; font-size: 11px; vertical-align: top; word-wrap: break-word; overflow-wrap: anywhere; ${extra}">${content}</td>`;
  const tableWrap = (cols: number[], inner: string) =>
    `<table style="width: 100%; table-layout: fixed; border-collapse: collapse; text-align: left;"><colgroup>${cols
      .map((c) => `<col style="width: ${c}%;">`)
      .join("")}</colgroup>${inner}</table>`;

  const finCols = [12, 9, 14, 14, 24, 13, 14];
  const actCols = [12, 13, 13, 13, 18, 11, 20];

  const finHead = tableWrap(
    finCols,
    `<thead><tr style="background-color: #0F3D24; color: #ffffff;">${th("Date")}${th("Type")}${th("Category")}${th(
      "Batch"
    )}${th("Description")}${th("Payment")}${th("Amount (NGN)", "right")}</tr></thead>`
  );
  const actHead = tableWrap(
    actCols,
    `<thead><tr style="background-color: #0F3D24; color: #ffffff;">${th("Date")}${th("Batch")}${th(
      "Activity"
    )}${th("Sick / Dead")}${th("Feed &amp; Bag #")}${th("Water / Temp")}${th("Medication &amp; Notes")}</tr></thead>`
  );
  const sectionTitle = (text: string, cont = false) =>
    `<h2 style="font-size: 14px; font-weight: 700; color: #0F3D24; margin: 0; padding: 0 0 6px 0; border-bottom: 2px solid #3F8F3F;">${text}${
      cont ? ' <span style="font-weight: 500; color: #6B7280; font-size: 11px;">(continued)</span>' : ""
    }</h2><div style="height: 8px;"></div>`;

  // Totals computed from the exported rows so they always match the table.
  let totalInc = 0;
  let totalExp = 0;
  options.financials.forEach((t) => {
    const amt = Number(t.amount || 0);
    if (t.type === "income") totalInc += amt;
    if (t.type === "expense") totalExp += amt;
  });
  const totalNet = totalInc - totalExp;
  const totalActivityCost = options.activities.reduce((s, a) => s + Number(a.cost || 0), 0);

  const raw: RawBlock[] = [];

  // Header
  raw.push({
    html: `
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #0F3D24; padding-bottom: 14px;">
      <div style="display: flex; align-items: center; gap: 14px;">
        <img src="${base64LogoWhiteBg}" alt="Dignity Agro Farms Logo" style="height: 48px; width: 48px; object-fit: contain;" />
        <div>
          <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #0F3D24; letter-spacing: -0.5px;">DIGNITY AGRO FARMS</h1>
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #3F8F3F; font-weight: 600;">Official Farm Financial &amp; Operations Report · RC / Agribusiness</p>
        </div>
      </div>
      <div style="text-align: right;">
        <p style="margin: 0; font-size: 10px; color: #6B7280; font-weight: 600;">Report Date</p>
        <p style="margin: 2px 0 0 0; font-size: 12px; font-weight: 700; color: #0F3D24;">${esc(
          new Date().toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" })
        )}</p>
      </div>
    </div>
    <div style="height: 16px;"></div>`,
  });

  // Metadata
  const metaCell = (label: string, value: string) => `
    <div>
      <span style="font-size: 10px; font-weight: 700; color: #6B7280; text-transform: uppercase;">${label}</span>
      <p style="margin: 2px 0 0 0; font-size: 13px; font-weight: 700; color: #0F3D24;">${value}</p>
    </div>`;
  raw.push({
    html: `
    <div style="background-color: #F7F5F0; border-radius: 12px; padding: 14px 16px; border: 1px solid rgba(15,61,36,0.12);">
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px 16px;">
        ${metaCell("Batch / View", esc(options.batchName))}
        ${metaCell("Batch Type", esc(options.batchType))}
        ${metaCell("Date Period", esc(options.dateRangeText))}
        ${metaCell("Live Headcount", `${esc(options.headcount)} birds`)}
        ${metaCell("Mortality", `${esc(options.mortality)} birds`)}
        ${metaCell("Mortality Rate", `${esc(options.mortalityRate)}%`)}
      </div>
    </div>
    <div style="height: 16px;"></div>`,
  });

  // KPI cards
  if (options.includeKpis) {
    const card = (bg: string, border: string, color: string, label: string, value: string) => `
      <div style="background-color: ${bg}; border: 1px solid ${border}; border-radius: 10px; padding: 10px;">
        <span style="font-size: 10px; font-weight: 700; color: ${color}; text-transform: uppercase;">${label}</span>
        <p style="margin: 4px 0 0 0; font-size: 15px; font-weight: 800; color: ${color};">${value}</p>
      </div>`;
    raw.push({
      html: `
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
        ${card("#ECFDF5", "#A7F3D0", "#065F46", "Total Revenue", money(options.kpis.totalIncome))}
        ${card("#FFF1F2", "#FECDD3", "#9F1239", "Total Expenses", money(options.kpis.totalExpense))}
        ${card(
          options.kpis.netProfit >= 0 ? "#F0FDF4" : "#FEF2F2",
          options.kpis.netProfit >= 0 ? "#BBF7D0" : "#FECACA",
          options.kpis.netProfit >= 0 ? "#166534" : "#991B1B",
          "Net Profit / Loss",
          money(options.kpis.netProfit)
        )}
        ${card("#F3F4F6", "#E5E7EB", "#111827", "Profit Margin / ROI", esc(options.kpis.roi))}
      </div>
      <div style="height: 20px;"></div>`,
    });
  }

  // Financial ledger
  if (options.includeFinancials) {
    const finRepeat = {
      key: "fin",
      html: sectionTitle("Financial Ledger Transactions", true) + finHead,
    };
    raw.push({
      html: sectionTitle("Financial Ledger Transactions") + finHead,
      sets: "fin",
    });
    if (options.financials.length === 0) {
      raw.push({
        html: `<p style="font-size: 11px; color: #6B7280; padding: 8px 10px; margin: 0;">No financial transactions found for this selection.</p>`,
        repeat: finRepeat,
      });
    }
    options.financials.forEach((t, idx) => {
      raw.push({
        html: tableWrap(
          finCols,
          `<tr style="background-color: ${idx % 2 === 0 ? "#ffffff" : "#F7F5F0"}; border-bottom: 1px solid #E5E7EB;">
            ${td(esc(dateOnly(t.transactionDate)))}
            ${td(esc(t.type ? t.type.toUpperCase() : ""), `font-weight: 600; color: ${t.type === "income" ? "#166534" : "#991B1B"};`)}
            ${td(esc(t.category || ""))}
            ${td(esc(t.batchName || "N/A"))}
            ${td(esc(t.description || ""))}
            ${td(esc(t.paymentMethod || "N/A"))}
            ${td(esc(formatNaira(Number(t.amount || 0))), "text-align: right; font-weight: 700;")}
          </tr>`
        ),
        repeat: finRepeat,
      });
    });

    const totalRow = (label: string, value: string, color: string, bg: string) =>
      `<tr style="background-color: ${bg};">
        <td colspan="6" style="padding: 8px 10px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: ${color};">${label}</td>
        <td style="padding: 8px 10px; font-size: 12px; font-weight: 800; text-align: right; color: ${color};">${value}</td>
      </tr>`;
    raw.push({
      html:
        tableWrap(
          finCols,
          `<tbody style="border-top: 2px solid #0F3D24;">
            ${totalRow("Total Revenue (Income)", money(totalInc), "#065F46", "#ECFDF5")}
            ${totalRow("Total Expenses", money(totalExp), "#9F1239", "#FFF1F2")}
            ${totalRow("Net Profit / Loss", money(totalNet), totalNet >= 0 ? "#166534" : "#991B1B", totalNet >= 0 ? "#F0FDF4" : "#FEF2F2")}
          </tbody>`
        ) + `<div style="height: 22px;"></div>`,
      repeat: finRepeat,
    });
  }

  // Farm activities
  if (options.includeActivities && options.activities.length > 0) {
    const actRepeat = {
      key: "act",
      html: sectionTitle("Daily Farm Operations &amp; Activities Log", true) + actHead,
    };
    raw.push({
      html: sectionTitle("Daily Farm Operations &amp; Activities Log") + actHead,
      sets: "act",
    });
    options.activities.forEach((a, idx) => {
      const sick = a.sickCount ? `Sick: ${a.sickCount}` : "";
      const dead = a.mortalityCount
        ? `<span style="color: #991B1B; font-weight: 700;">Dead: ${a.mortalityCount}</span>`
        : "";
      const cause = a.causeOfMortality
        ? `<div style="font-size: 9px; color: #991B1B;">(${esc(a.causeOfMortality)})</div>`
        : "";
      const sickDead = [sick, dead, cause].filter(Boolean).join("<br/>") || "Nil";

      const feedBags =
        a.feedBagNo && a.feedBagStatus
          ? `Bag #${a.feedBagNo} (${a.feedBagStatus === "finished" ? "Finished" : "Opened"})`
          : "";
      const feedBrand = a.feedGiven === false ? "Not given" : a.feedBrand || "";
      const feedKg = a.feedConsumedKg ? `${a.feedConsumedKg} kg` : "";
      const feedText = [feedBrand, feedBags, feedKg].filter(Boolean).join("<br/>") || "—";

      const water = a.waterGiven
        ? '<span style="color: #0369A1; font-weight: 700;">Water ✓</span>'
        : "";
      const temp = a.temperature ? `Temp: ${esc(a.temperature)}` : "";
      const waterTemp = [water, temp].filter(Boolean).join("<br/>") || "—";

      const med = a.medicationGiven
        ? `<div style="font-weight: 600; color: #581C87;">Med: ${esc(a.medicationGiven)}</div>`
        : "";
      const eggs = a.eggsCollected
        ? `<div style="font-weight: 600; color: #047857;">Eggs: ${a.eggsCollected}</div>`
        : "";
      const notes = a.notes || a.description || "";
      const cost = a.cost
        ? `<div style="font-size: 10px; color: #166534; font-weight: 700;">Cost: ${formatNaira(
            Number(a.cost)
          )}</div>`
        : "";
      const logged = a.loggedBy
        ? `<div style="font-size: 9px; color: #6B7280;">By: ${esc(a.loggedBy)}</div>`
        : "";
      const notesText =
        [med, eggs, notes ? `<div>${esc(notes)}</div>` : "", cost, logged]
          .filter(Boolean)
          .join("") || "—";

      raw.push({
        html: tableWrap(
          actCols,
          `<tr style="background-color: ${
            idx % 2 === 0 ? "#ffffff" : "#F7F5F0"
          }; border-bottom: 1px solid #E5E7EB;">
            ${td(esc(dateOnly(a.activityDate)))}
            ${td(esc(a.batchName || "N/A"))}
            ${td(esc(a.activityType || "General"), "font-weight: 600; color: #0F3D24;")}
            ${td(sickDead)}
            ${td(feedText)}
            ${td(waterTemp)}
            ${td(notesText)}
          </tr>`
        ),
        repeat: actRepeat,
      });
    });
    if (totalActivityCost > 0) {
      raw.push({
        html: `<div style="padding: 8px 10px; font-size: 11px; font-weight: 800; color: #0F3D24; text-align: right; border-top: 2px solid #0F3D24;">Total Logged Activity Cost: ${esc(
          formatNaira(totalActivityCost)
        )}</div><div style="height: 20px;"></div>`,
        repeat: actRepeat,
      });
    }
  }

  // Official Corporate Certification & Managing Director Signature Block
  raw.push({
    html: `
    <div style="height: 20px;"></div>
    <div style="border: 1.5px solid #0F3D24; border-radius: 12px; padding: 14px 18px; background-color: #F7F5F0;">
      <div style="font-size: 11px; font-weight: 800; color: #0F3D24; text-transform: uppercase; letter-spacing: 0.5px;">
        OFFICIAL CORPORATE CERTIFICATION &amp; AUDIT SIGN-OFF
      </div>
      <p style="margin: 4px 0 12px 0; font-size: 9.5px; color: #4B5563;">
        This document represents the verified and official operational &amp; financial records of Dignity Agro Farms Limited.
      </p>
      <div style="display: flex; justify-content: space-between; align-items: flex-end; padding-top: 10px; border-top: 1px solid #D1D5DB;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <img src="${defaultAuthorizedSignaturePng}" alt="Authorized Signature" style="height: 40px; max-width: 130px; object-fit: contain;" />
          <div style="border-left: 1px solid #9CA3AF; padding-left: 12px;">
            <div style="font-size: 12px; font-weight: 800; color: #0F3D24;">Managing Director / Chief Executive</div>
            <div style="font-size: 10px; color: #6B7280;">Dignity Agro Farms Limited · Authorized Signatory</div>
            <div style="font-size: 9px; color: #15803D; font-weight: 700; margin-top: 2px;">✓ Verified &amp; Certified · ${esc(new Date().toLocaleDateString("en-NG"))}</div>
          </div>
        </div>
        <div style="border: 2px solid #0F3D24; border-radius: 50%; width: 48px; height: 48px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: #0F3D24; font-size: 5.5px; font-weight: 900; line-height: 1;">
          <span>DIGNITY</span>
          <span style="color: #3F8F3F; font-size: 4.5px; margin: 1px 0;">★ SEAL ★</span>
          <span>AUDITED</span>
        </div>
      </div>
    </div>`,
  });

  // ---- Measure blocks ----
  const measurer = document.createElement("div");
  // CRITICAL MOBILE FIX: Force fixed minimum width and ignore global box-sizing/max-width limits
  measurer.style.cssText = `position: fixed; top: -99999px; left: -99999px; width: ${CONTENT_W}px; min-width: ${CONTENT_W}px !important; max-width: ${CONTENT_W}px !important; font-family: system-ui, sans-serif; color: #0F3D24; z-index: -9999; background: #fff; margin: 0 !important; padding: 0 !important; box-sizing: content-box !important;`;
  document.body.appendChild(measurer);

  const pageHost = document.createElement("div");
  pageHost.style.cssText = `position: fixed; top: -99999px; left: -99999px; width: ${PAGE_W}px; min-width: ${PAGE_W}px !important; max-width: ${PAGE_W}px !important; z-index: -9999; background: #fff; margin: 0 !important; padding: 0 !important; box-sizing: content-box !important;`;
  document.body.appendChild(pageHost);

  try {
    if ((document as any).fonts?.ready) {
      try {
        await (document as any).fonts.ready;
      } catch {
        /* ignore */
      }
    }

    const measureHtml = (html: string) => {
      const el = document.createElement("div");
      el.innerHTML = html;
      measurer.appendChild(el);
      const h = el.offsetHeight;
      measurer.removeChild(el);
      return h;
    };

    const blocks: Block[] = raw.map((b) => ({
      html: b.html,
      h: measureHtml(b.html),
      sets: b.sets,
      repeat: b.repeat ? { key: b.repeat.key, html: b.repeat.html, h: measureHtml(b.repeat.html) } : undefined,
    }));

    // ---- Paginate ----
    const pages: string[][] = [];
    let cur: string[] = [];
    let curH = 0;
    let activeKey: string | null = null;

    const newPage = () => {
      if (cur.length) pages.push(cur);
      cur = [];
      curH = 0;
      activeKey = null;
    };

    blocks.forEach((b, i) => {
      const needsRepeat = () => !!b.repeat && activeKey !== b.repeat.key;
      const lookahead = b.sets && blocks[i + 1] ? blocks[i + 1].h : 0;
      let need = b.h + lookahead + (needsRepeat() ? b.repeat!.h : 0);
      if (curH + need > CONTENT_MAX_H && cur.length > 0) {
        newPage();
        need = b.h + lookahead + (needsRepeat() ? b.repeat!.h : 0);
      }
      if (needsRepeat()) {
        cur.push(b.repeat!.html);
        curH += b.repeat!.h;
        activeKey = b.repeat!.key;
      }
      cur.push(b.html);
      curH += b.h;
      if (b.sets) activeKey = b.sets;
    });
    if (cur.length) pages.push(cur);

    // ---- Render each page ----
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();
    const total = pages.length;

    for (let p = 0; p < total; p++) {
      pageHost.innerHTML = `
        <div id="pdf-page-target" style="position: relative; width: ${PAGE_W}px; height: ${PAGE_H}px; min-width: ${PAGE_W}px; max-width: ${PAGE_W}px; box-sizing: border-box; padding: ${PAD}px; background: #ffffff; font-family: system-ui, sans-serif; color: #0F3D24; overflow: hidden; margin: 0; display: block;">
          ${
            p > 0
              ? `<div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0F3D24; padding-bottom: 6px; margin-bottom: 14px;">
                   <div style="display: flex; align-items: center; gap: 8px;">
                     <img src="${base64LogoWhiteBg}" alt="Logo" style="height: 20px; width: 20px; object-fit: contain;" />
                     <span style="font-size: 11px; font-weight: 800; color: #0F3D24;">DIGNITY AGRO FARMS — ${esc(options.batchName)} (continued)</span>
                   </div>
                   <span style="font-size: 10px; color: #6B7280;">${esc(options.dateRangeText)}</span>
                 </div>`
              : ""
          }
          <div style="width: ${CONTENT_W}px;">${pages[p].join("")}</div>
          <div style="position: absolute; left: ${PAD}px; right: ${PAD}px; bottom: 14px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #E5E7EB; padding-top: 8px; font-size: 10px; color: #6B7280;">
            <span style="font-weight: 600;">Dignity Agro Farms Management System • Owerri, Imo State, Nigeria</span>
            <span style="font-weight: 700; color: #0F3D24;">Page ${p + 1} of ${total}</span>
          </div>
        </div>`;
      const target = pageHost.querySelector("#pdf-page-target") as HTMLElement;
      if (!target) throw new Error("PDF page target not rendered");

      // Wait a tick for fonts/layout if needed on mobile
      await new Promise(r => setTimeout(r, 20));

      const dataUrl = await toPng(target, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });

      if (p > 0) pdf.addPage("a4", "portrait");
      pdf.addImage(dataUrl, "PNG", 0, 0, pdfW, pdfH);
    }

    const filename = `AgroFarms_Report_${options.batchName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
    pdf.save(filename);
  } finally {
    document.body.removeChild(measurer);
    document.body.removeChild(pageHost);
  }
}

function saveBlob(blob: Blob, filename: string) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
