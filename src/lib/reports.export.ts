import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import { toPng } from "html-to-image";

export interface ReportTransaction {
  id: string;
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
  activityDate: string;
  activityType: string;
  batchName?: string;
  description: string;
  notes?: string;
  cost?: number;
  loggedBy?: string;
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
    lines.push("Date,Activity Type,Batch,Description,Cost (NGN),Notes");
    options.activities.forEach((a) => {
      const desc = `"${(a.description || "").replace(/"/g, '""')}"`;
      const notes = `"${(a.notes || "").replace(/"/g, '""')}"`;
      lines.push(
        [
          a.activityDate ? a.activityDate.split("T")[0] : "",
          a.activityType || "General",
          a.batchName || "",
          desc,
          a.cost || 0,
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
    const actHeader = ["Date", "Activity Type", "Batch", "Description", "Cost (NGN)", "Notes"];
    const actRows = options.activities.map((a) => [
      a.activityDate ? a.activityDate.split("T")[0] : "",
      a.activityType || "General",
      a.batchName || "",
      a.description || "",
      a.cost || 0,
      a.notes || "",
    ]);
    const allActData = [actHeader, ...actRows];
    const actSheet = XLSX.utils.aoa_to_sheet(allActData);
    actSheet["!views"] = [{ state: "frozen", ySplit: 1, activeCell: "A2" }];
    autoFitColumns(actSheet, allActData);

    // Format Cost column (Column E / index 4)
    for (let r = 1; r < allActData.length; r++) {
      const cellAddr = XLSX.utils.encode_cell({ r, c: 4 });
      if (actSheet[cellAddr] && typeof actSheet[cellAddr].v === "number") {
        actSheet[cellAddr].z = '"₦"#,##0.00';
      }
    }

    XLSX.utils.book_append_sheet(wb, actSheet, "Farm Activities");
  }

  const filename = `AgroFarms_Report_${options.batchName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Generate Printable Branded PDF Report
 */
export async function generatePDFReport(options: ExportReportOptions) {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "-9999px";
  container.style.left = "0";
  container.style.width = "800px";
  container.style.backgroundColor = "#ffffff";
  container.style.padding = "32px";
  container.style.fontFamily = "'Inter', sans-serif";
  container.style.color = "#0F3D24";
  container.style.zIndex = "-9999";

  const finRowsHtml = options.includeFinancials
    ? options.financials
        .map(
          (t, idx) => `
        <tr style="background-color: ${idx % 2 === 0 ? "#ffffff" : "#F7F5F0"}; border-bottom: 1px solid #E5E7EB;">
          <td style="padding: 8px 12px; font-size: 11px;">${t.transactionDate}</td>
          <td style="padding: 8px 12px; font-size: 11px; font-weight: 600; color: ${t.type === "income" ? "#166534" : "#991B1B"};">
            ${t.type ? t.type.toUpperCase() : ""}
          </td>
          <td style="padding: 8px 12px; font-size: 11px;">${t.category || ""}</td>
          <td style="padding: 8px 12px; font-size: 11px;">${t.batchName || "N/A"}</td>
          <td style="padding: 8px 12px; font-size: 11px;">${t.description || ""}</td>
          <td style="padding: 8px 12px; font-size: 11px; text-align: right; font-weight: 700;">
            ${formatNaira(t.amount || 0)}
          </td>
        </tr>
      `
        )
        .join("")
    : "";

  const actRowsHtml = options.includeActivities
    ? options.activities
        .map(
          (a, idx) => `
        <tr style="background-color: ${idx % 2 === 0 ? "#ffffff" : "#F7F5F0"}; border-bottom: 1px solid #E5E7EB;">
          <td style="padding: 8px 12px; font-size: 11px;">${a.activityDate}</td>
          <td style="padding: 8px 12px; font-size: 11px; font-weight: 600; color: #0F3D24;">
            ${a.activityType || "General"}
          </td>
          <td style="padding: 8px 12px; font-size: 11px;">${a.batchName || "N/A"}</td>
          <td style="padding: 8px 12px; font-size: 11px;">${a.description || ""}</td>
          <td style="padding: 8px 12px; font-size: 11px;">${a.notes || "-"}</td>
        </tr>
      `
        )
        .join("")
    : "";

  container.innerHTML = `
    <div id="pdf-report-target" style="width: 100%; box-sizing: border-box; font-family: system-ui, sans-serif;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #0F3D24; pb-16px; margin-bottom: 24px; padding-bottom: 16px;">
        <div>
          <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #0F3D24; letter-spacing: -0.5px;">
            DIGNITY AGRO FARMS
          </h1>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #3F8F3F; font-weight: 600;">
            Official Farm Financial & Operations Report
          </p>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0; font-size: 11px; color: #6B7280; font-weight: 600;">Report Date</p>
          <p style="margin: 2px 0 0 0; font-size: 13px; font-weight: 700; color: #0F3D24;">
            ${new Date().toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
      </div>

      <!-- Report Metadata -->
      <div style="background-color: #F7F5F0; border-radius: 12px; padding: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; gap: 16px; border: 1px solid #0F3D24/10;">
        <div>
          <span style="font-size: 10px; font-weight: 700; color: #6B7280; text-transform: uppercase;">Batch / View</span>
          <p style="margin: 2px 0 0 0; font-size: 14px; font-weight: 700; color: #0F3D24;">${options.batchName}</p>
        </div>
        <div>
          <span style="font-size: 10px; font-weight: 700; color: #6B7280; text-transform: uppercase;">Batch Type</span>
          <p style="margin: 2px 0 0 0; font-size: 14px; font-weight: 700; color: #0F3D24;">${options.batchType}</p>
        </div>
        <div>
          <span style="font-size: 10px; font-weight: 700; color: #6B7280; text-transform: uppercase;">Date Period</span>
          <p style="margin: 2px 0 0 0; font-size: 14px; font-weight: 700; color: #0F3D24;">${options.dateRangeText}</p>
        </div>
        <div>
          <span style="font-size: 10px; font-weight: 700; color: #6B7280; text-transform: uppercase;">Live Headcount</span>
          <p style="margin: 2px 0 0 0; font-size: 14px; font-weight: 700; color: #0F3D24;">${options.headcount} birds</p>
        </div>
      </div>

      <!-- KPI Metric Cards -->
      ${
        options.includeKpis
          ? `
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px;">
          <div style="background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 10px; padding: 12px;">
            <span style="font-size: 10px; font-weight: 700; color: #065F46; text-transform: uppercase;">Total Revenue</span>
            <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 800; color: #065F46;">${formatNaira(options.kpis.totalIncome)}</p>
          </div>
          <div style="background-color: #FFF1F2; border: 1px solid #FECDD3; border-radius: 10px; padding: 12px;">
            <span style="font-size: 10px; font-weight: 700; color: #9F1239; text-transform: uppercase;">Total Expenses</span>
            <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 800; color: #9F1239;">${formatNaira(options.kpis.totalExpense)}</p>
          </div>
          <div style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 10px; padding: 12px;">
            <span style="font-size: 10px; font-weight: 700; color: #166534; text-transform: uppercase;">Net Profit / Loss</span>
            <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 800; color: #166534;">${formatNaira(options.kpis.netProfit)}</p>
          </div>
          <div style="background-color: #F3F4F6; border: 1px solid #E5E7EB; border-radius: 10px; padding: 12px;">
            <span style="font-size: 10px; font-weight: 700; color: #374151; text-transform: uppercase;">Profit Margin / ROI</span>
            <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 800; color: #111827;">${options.kpis.roi}</p>
          </div>
        </div>
      `
          : ""
      }

      <!-- Financial Ledger Table -->
      ${
        options.includeFinancials
          ? `
        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 14px; font-weight: 700; color: #0F3D24; margin: 0 0 10px 0; padding-bottom: 6px; border-bottom: 2px solid #3F8F3F;">
            Financial Ledger Transactions
          </h2>
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="background-color: #0F3D24; color: #ffffff;">
                <th style="padding: 8px 12px; font-size: 10px; font-weight: 700; text-transform: uppercase;">Date</th>
                <th style="padding: 8px 12px; font-size: 10px; font-weight: 700; text-transform: uppercase;">Type</th>
                <th style="padding: 8px 12px; font-size: 10px; font-weight: 700; text-transform: uppercase;">Category</th>
                <th style="padding: 8px 12px; font-size: 10px; font-weight: 700; text-transform: uppercase;">Batch</th>
                <th style="padding: 8px 12px; font-size: 10px; font-weight: 700; text-transform: uppercase;">Description</th>
                <th style="padding: 8px 12px; font-size: 10px; font-weight: 700; text-transform: uppercase; text-align: right;">Amount (NGN)</th>
              </tr>
            </thead>
            <tbody>
              ${finRowsHtml}
            </tbody>
          </table>
        </div>
      `
          : ""
      }

      <!-- Farm Activities Log Table -->
      ${
        options.includeActivities && options.activities.length > 0
          ? `
        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 14px; font-weight: 700; color: #0F3D24; margin: 0 0 10px 0; padding-bottom: 6px; border-bottom: 2px solid #3F8F3F;">
            Daily Farm Operations & Activities Log
          </h2>
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="background-color: #0F3D24; color: #ffffff;">
                <th style="padding: 8px 12px; font-size: 10px; font-weight: 700; text-transform: uppercase;">Date</th>
                <th style="padding: 8px 12px; font-size: 10px; font-weight: 700; text-transform: uppercase;">Activity</th>
                <th style="padding: 8px 12px; font-size: 10px; font-weight: 700; text-transform: uppercase;">Batch</th>
                <th style="padding: 8px 12px; font-size: 10px; font-weight: 700; text-transform: uppercase;">Description</th>
                <th style="padding: 8px 12px; font-size: 10px; font-weight: 700; text-transform: uppercase;">Notes</th>
              </tr>
            </thead>
            <tbody>
              ${actRowsHtml}
            </tbody>
          </table>
        </div>
      `
          : ""
      }

      <!-- Footer & Signature Block -->
      <div style="margin-top: 40px; pt-16px; border-top: 1px solid #E5E7EB; display: flex; justify-content: space-between; align-items: flex-end; padding-top: 16px;">
        <div>
          <p style="margin: 0; font-size: 10px; color: #6B7280; font-weight: 600;">Dignity Agro Farms Management System</p>
          <p style="margin: 2px 0 0 0; font-size: 10px; color: #9CA3AF;">Owerri, Imo State, Nigeria • Contact: support@dignityagrofarms.com</p>
        </div>
        <div style="text-align: right;">
          <div style="width: 140px; border-bottom: 1px solid #0F3D24; margin-bottom: 4px;"></div>
          <p style="margin: 0; font-size: 10px; font-weight: 700; color: #0F3D24;">Authorized Farm Manager</p>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const targetElement = container.querySelector("#pdf-report-target") as HTMLElement;
    if (!targetElement) throw new Error("PDF target container not rendered");

    const dataUrl = await toPng(targetElement, {
      quality: 1.0,
      pixelRatio: 2,
      backgroundColor: "#ffffff",
    });

    const imgProps = new jsPDF().getImageProperties(dataUrl);
    const pxToMm = 0.264583;
    const pdfWidth = imgProps.width * (pxToMm / 2);
    const pdfHeight = imgProps.height * (pxToMm / 2);

    const pdf = new jsPDF({
      orientation: pdfWidth > pdfHeight ? "landscape" : "portrait",
      unit: "mm",
      format: [pdfWidth, pdfHeight],
    });

    pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
    const filename = `AgroFarms_Report_${options.batchName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
    pdf.save(filename);
  } finally {
    document.body.removeChild(container);
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
