import React, { useState } from "react";
import {
  FileText,
  FileSpreadsheet,
  FileCode,
  Calendar,
  Layers,
  CheckSquare,
  Square,
  Download,
  X,
  Sparkles,
  Loader2,
} from "lucide-react";
import {
  generatePDFReport,
  generateExcelReport,
  generateCSVReport,
  type ReportTransaction,
  type ReportActivity,
} from "@/lib/reports.export";

interface FarmBatchOption {
  id: string;
  batchName: string;
  batchType: string;
  currentHeadcount: number;
  initialHeadcount: number;
  status: string;
}

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  batches: FarmBatchOption[];
  selectedBatchId: string;
  financials: ReportTransaction[];
  activities: ReportActivity[];
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  roiText: string;
}

type ExportFormat = "pdf" | "excel" | "csv";
type DateFilter = "all" | "today" | "7d" | "month" | "custom";

export function ExportReportModal({
  isOpen,
  onClose,
  batches,
  selectedBatchId,
  financials,
  activities,
  totalIncome,
  totalExpense,
  netProfit,
  roiText,
}: ExportReportModalProps) {
  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [batchId, setBatchId] = useState<string>(selectedBatchId || "all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [includeFinancials, setIncludeFinancials] = useState<boolean>(true);
  const [includeActivities, setIncludeActivities] = useState<boolean>(true);
  const [includeKpis, setIncludeKpis] = useState<boolean>(true);

  const [isExporting, setIsExporting] = useState<boolean>(false);

  if (!isOpen) return null;

  // Selected batch info
  const selectedBatchObj = batches.find((b) => b.id === batchId);
  const batchName = batchId === "all" ? "All Batches (Farm Overview)" : (selectedBatchObj?.batchName || "Batch Report");
  const batchType = batchId === "all" ? "Broiler & Layer" : (selectedBatchObj?.batchType || "Broiler");
  const headcount = batchId === "all" ? batches.reduce((sum, b) => sum + b.currentHeadcount, 0) : (selectedBatchObj?.currentHeadcount || 0);

  // Filter transactions by date range and batch
  const filteredFinancials = financials.filter((t) => {
    if (batchId !== "all" && t.batchName && selectedBatchObj && !t.batchName.includes(selectedBatchObj.batchName)) {
      if (t.id && !t.id.includes(batchId)) return false;
    }

    if (!t.transactionDate) return true;
    const tDate = t.transactionDate.split("T")[0];
    const now = new Date();

    if (dateFilter === "today") {
      const todayStr = now.toISOString().split("T")[0];
      return tDate === todayStr;
    }
    if (dateFilter === "7d") {
      const past7 = new Date(now.setDate(now.getDate() - 7)).toISOString().split("T")[0];
      return tDate >= past7;
    }
    if (dateFilter === "month") {
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      return tDate.startsWith(currentMonth);
    }
    if (dateFilter === "custom") {
      if (startDate && tDate < startDate) return false;
      if (endDate && tDate > endDate) return false;
    }
    return true;
  });

  // Filter activities by date range and batch
  const filteredActivities = activities.filter((a) => {
    if (batchId !== "all" && a.batchName && selectedBatchObj && !a.batchName.includes(selectedBatchObj.batchName)) {
      if (a.id && !a.id.includes(batchId)) return false;
    }

    if (!a.activityDate) return true;
    const aDate = a.activityDate.split("T")[0];
    const now = new Date();

    if (dateFilter === "today") {
      const todayStr = now.toISOString().split("T")[0];
      return aDate === todayStr;
    }
    if (dateFilter === "7d") {
      const past7 = new Date(now.setDate(now.getDate() - 7)).toISOString().split("T")[0];
      return aDate >= past7;
    }
    if (dateFilter === "month") {
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      return aDate.startsWith(currentMonth);
    }
    if (dateFilter === "custom") {
      if (startDate && aDate < startDate) return false;
      if (endDate && aDate > endDate) return false;
    }
    return true;
  });

  // Compute metrics for filtered set
  const filteredIncome = filteredFinancials
    .filter((f) => f.type === "income")
    .reduce((sum, f) => sum + f.amount, 0);

  const filteredExpense = filteredFinancials
    .filter((f) => f.type === "expense")
    .reduce((sum, f) => sum + f.amount, 0);

  const filteredNetProfit = filteredIncome - filteredExpense;

  const filteredRoiText =
    filteredExpense > 0
      ? `ROI: ${((filteredNetProfit / filteredExpense) * 100).toFixed(1)}%`
      : filteredNetProfit > 0
      ? "100% Margin (No Expenses)"
      : "0% ROI";

  const dateRangeText =
    dateFilter === "all"
      ? "All Time"
      : dateFilter === "today"
      ? "Today Only"
      : dateFilter === "7d"
      ? "Past 7 Days"
      : dateFilter === "month"
      ? "This Month"
      : `${startDate || "Start"} to ${endDate || "End"}`;

  const handleExecuteExport = async () => {
    setIsExporting(true);
    try {
      const options = {
        format,
        batchName,
        batchType,
        headcount,
        mortality: 0,
        mortalityRate: 0,
        dateRangeText,
        includeFinancials,
        includeActivities,
        includeKpis,
        financials: filteredFinancials,
        activities: filteredActivities,
        kpis: {
          totalIncome: filteredIncome,
          totalExpense: filteredExpense,
          netProfit: filteredNetProfit,
          roi: filteredRoiText,
        },
      };

      if (format === "csv") {
        generateCSVReport(options);
      } else if (format === "excel") {
        generateExcelReport(options);
      } else if (format === "pdf") {
        await generatePDFReport(options);
      }
      onClose();
    } catch (err: any) {
      alert("Failed to generate report: " + (err?.message || err));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-[#0F3D24]/10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#0F3D24]/10 bg-[#0F3D24] px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#3F8F3F]/30 p-2.5 text-[#A2E0A2]">
              <Sparkles size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold">Export Custom Farm Report</h3>
              <p className="text-xs text-white/70">
                Customize format, filters, financial ledgers & farm activities
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[78vh] overflow-y-auto p-6 space-y-6">
          {/* Format Selection */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#0F3D24]">
              1. Choose Export Format:
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setFormat("pdf")}
                className={`flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-center transition ${
                  format === "pdf"
                    ? "border-[#3F8F3F] bg-[#3F8F3F]/10 text-[#0F3D24] ring-2 ring-[#3F8F3F]"
                    : "border-[#0F3D24]/15 bg-white text-[#0F3D24]/70 hover:border-[#0F3D24]/30 hover:bg-[#F7F5F0]"
                }`}
              >
                <FileText size={28} className={format === "pdf" ? "text-[#3F8F3F]" : "text-[#0F3D24]/50"} />
                <span className="text-xs font-bold">PDF Document</span>
                <span className="text-[10px] text-[#0F3D24]/60">Printable & Branded</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat("excel")}
                className={`flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-center transition ${
                  format === "excel"
                    ? "border-[#3F8F3F] bg-[#3F8F3F]/10 text-[#0F3D24] ring-2 ring-[#3F8F3F]"
                    : "border-[#0F3D24]/15 bg-white text-[#0F3D24]/70 hover:border-[#0F3D24]/30 hover:bg-[#F7F5F0]"
                }`}
              >
                <FileSpreadsheet size={28} className={format === "excel" ? "text-[#3F8F3F]" : "text-[#0F3D24]/50"} />
                <span className="text-xs font-bold">Excel (.xlsx)</span>
                <span className="text-[10px] text-[#0F3D24]/60">Multi-tab Spreadsheet</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat("csv")}
                className={`flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-center transition ${
                  format === "csv"
                    ? "border-[#3F8F3F] bg-[#3F8F3F]/10 text-[#0F3D24] ring-2 ring-[#3F8F3F]"
                    : "border-[#0F3D24]/15 bg-white text-[#0F3D24]/70 hover:border-[#0F3D24]/30 hover:bg-[#F7F5F0]"
                }`}
              >
                <FileCode size={28} className={format === "csv" ? "text-[#3F8F3F]" : "text-[#0F3D24]/50"} />
                <span className="text-xs font-bold">CSV File</span>
                <span className="text-[10px] text-[#0F3D24]/60">Raw Data Export</span>
              </button>
            </div>
          </div>

          {/* Report Content Checkboxes */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#0F3D24]">
              2. Include Sections:
            </label>
            <div className="grid gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setIncludeFinancials(!includeFinancials)}
                className={`flex items-center gap-3 rounded-xl border p-3 text-left text-xs font-semibold transition ${
                  includeFinancials
                    ? "border-[#0F3D24] bg-[#0F3D24]/5 text-[#0F3D24]"
                    : "border-[#0F3D24]/15 bg-white text-[#0F3D24]/50"
                }`}
              >
                {includeFinancials ? (
                  <CheckSquare size={18} className="text-[#3F8F3F]" />
                ) : (
                  <Square size={18} className="text-[#0F3D24]/30" />
                )}
                Financial Ledger
              </button>

              <button
                type="button"
                onClick={() => setIncludeActivities(!includeActivities)}
                className={`flex items-center gap-3 rounded-xl border p-3 text-left text-xs font-semibold transition ${
                  includeActivities
                    ? "border-[#0F3D24] bg-[#0F3D24]/5 text-[#0F3D24]"
                    : "border-[#0F3D24]/15 bg-white text-[#0F3D24]/50"
                }`}
              >
                {includeActivities ? (
                  <CheckSquare size={18} className="text-[#3F8F3F]" />
                ) : (
                  <Square size={18} className="text-[#0F3D24]/30" />
                )}
                Farm Activities Log
              </button>

              <button
                type="button"
                onClick={() => setIncludeKpis(!includeKpis)}
                className={`flex items-center gap-3 rounded-xl border p-3 text-left text-xs font-semibold transition ${
                  includeKpis
                    ? "border-[#0F3D24] bg-[#0F3D24]/5 text-[#0F3D24]"
                    : "border-[#0F3D24]/15 bg-white text-[#0F3D24]/50"
                }`}
              >
                {includeKpis ? (
                  <CheckSquare size={18} className="text-[#3F8F3F]" />
                ) : (
                  <Square size={18} className="text-[#0F3D24]/30" />
                )}
                KPI Summary Cards
              </button>
            </div>
          </div>

          {/* Batch & Date Filters */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#0F3D24]">
                <Layers size={14} className="text-[#3F8F3F]" /> Select Batch:
              </label>
              <select
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                className="w-full rounded-xl border border-[#0F3D24]/20 bg-white px-3 py-2.5 text-xs font-semibold text-[#0F3D24] outline-none focus:border-[#3F8F3F]"
              >
                <option value="all">All Batches (Farm Overview)</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.batchName} ({b.batchType})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#0F3D24]">
                <Calendar size={14} className="text-[#3F8F3F]" /> Date Range:
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                className="w-full rounded-xl border border-[#0F3D24]/20 bg-white px-3 py-2.5 text-xs font-semibold text-[#0F3D24] outline-none focus:border-[#3F8F3F]"
              >
                <option value="all">All Time</option>
                <option value="today">Today Only</option>
                <option value="7d">Past 7 Days</option>
                <option value="month">This Month</option>
                <option value="custom">Custom Date Range</option>
              </select>
            </div>
          </div>

          {dateFilter === "custom" && (
            <div className="grid gap-3 sm:grid-cols-2 rounded-2xl bg-[#F7F5F0] p-4">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#0F3D24]">Start Date:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-[#0F3D24]/20 bg-white px-3 py-2 text-xs font-semibold text-[#0F3D24]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[#0F3D24]">End Date:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl border border-[#0F3D24]/20 bg-white px-3 py-2 text-xs font-semibold text-[#0F3D24]"
                />
              </div>
            </div>
          )}

          {/* Export Summary Box */}
          <div className="rounded-2xl border border-[#3F8F3F]/30 bg-[#3F8F3F]/5 p-4 text-xs text-[#0F3D24] space-y-1">
            <p className="font-bold">Report Export Summary:</p>
            <p>
              • Format: <strong className="uppercase">{format}</strong> ({dateRangeText})
            </p>
            <p>
              • Batch: <strong>{batchName}</strong>
            </p>
            <p>
              • Included Items: <strong>{filteredFinancials.length}</strong> financial records,{" "}
              <strong>{filteredActivities.length}</strong> farm activities
            </p>
            <p>
              • Filtered Revenue: <strong>₦{filteredIncome.toLocaleString()}</strong> | Net Profit:{" "}
              <strong>₦{filteredNetProfit.toLocaleString()}</strong>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[#0F3D24]/10 bg-[#F7F5F0] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#0F3D24]/20 px-5 py-2.5 text-xs font-semibold text-[#0F3D24] hover:bg-white transition"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isExporting}
            onClick={handleExecuteExport}
            className="flex items-center gap-2 rounded-full bg-[#0F3D24] px-6 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-[#134a2c] disabled:opacity-50 transition"
          >
            {isExporting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generating Report...
              </>
            ) : (
              <>
                <Download size={16} />
                Download {format.toUpperCase()} Report
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
