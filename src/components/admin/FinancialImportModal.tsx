import React, { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { X, Upload, FileSpreadsheet, Download, CheckCircle2, AlertCircle, Copy, Check } from "lucide-react";
import { adminImportFinancialsWithAutoMatch, type FarmBatch } from "@/lib/farm.functions";

interface FinancialImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  passcode: string;
  batches: FarmBatch[];
  defaultBatchId?: string | null;
  onSuccess: () => void;
}

export type ParsedFinancialRow = {
  type: "income" | "expense";
  category: string;
  amount: number;
  description: string;
  paymentMethod: string;
  transactionDate: string;
  referenceNo?: string;
  customerName?: string;
  customerPhone?: string;
};

const SAMPLE_CSV = `Type,Category,Amount,Description,PaymentMethod,TransactionDate,CustomerName,CustomerPhone
income,Broiler Sales,45000,10 Broilers sold offline,Cash,2026-10-07,Emeka Okonkwo,07012345678
expense,Feed,120000,10 Bags Starter Feed,Bank Transfer,2026-10-06,,
income,Fresh Eggs,28000,5 crates extra large eggs,Bank Transfer,2026-10-07,Nkechi Nwosu,08033445566
expense,Medication,15000,Multivitamins & Vaccines,Cash,2026-10-05,,`;

export function FinancialImportModal({
  isOpen,
  onClose,
  passcode,
  batches,
  defaultBatchId,
  onSuccess,
}: FinancialImportModalProps) {
  const importFn = useServerFn(adminImportFinancialsWithAutoMatch);
  const [selectedBatchId, setSelectedBatchId] = useState<string>(defaultBatchId || "none");
  const [rawText, setRawText] = useState<string>("");
  const [parsedRows, setParsedRows] = useState<ParsedFinancialRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [resultSummary, setResultSummary] = useState<{
    totalImported: number;
    matchedOrdersCount: number;
    unmatchedOfflineCount: number;
    matchedDetails: string[];
  } | null>(null);

  if (!isOpen) return null;

  const handleCopySample = () => {
    navigator.clipboard.writeText(SAMPLE_CSV);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "financial_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCsvText = (text: string) => {
    setErrorMsg(null);
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      setErrorMsg("Please paste or upload CSV rows to import.");
      return;
    }

    const rows: ParsedFinancialRow[] = [];
    const startIndex = lines[0].toLowerCase().includes("category") || lines[0].toLowerCase().includes("amount") ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split(",").map((p) => p.trim());
      if (parts.length < 3) continue;

      let typeVal: "income" | "expense" = "expense";
      let category = parts[0];
      let amount = 0;
      let description = "";
      let paymentMethod = "Bank Transfer";
      let transactionDate = new Date().toISOString().split("T")[0];
      let customerName = "";
      let customerPhone = "";

      if (parts[0].toLowerCase() === "income" || parts[0].toLowerCase() === "expense") {
        typeVal = parts[0].toLowerCase() as "income" | "expense";
        category = parts[1] || (typeVal === "income" ? "Broiler Sales" : "Feed");
        amount = parseFloat(parts[2]?.replace(/[^0-9.]/g, "") || "0");
        description = parts[3] || `${typeVal} record`;
        paymentMethod = parts[4] || "Bank Transfer";
        transactionDate = parts[5] || transactionDate;
        customerName = parts[6] || "";
        customerPhone = parts[7] || "";
      } else {
        // Fallback layout: Category, Amount, Description, CustomerName, CustomerPhone
        category = parts[0];
        amount = parseFloat(parts[1]?.replace(/[^0-9.]/g, "") || "0");
        description = parts[2] || "Imported item";
        customerName = parts[3] || "";
        customerPhone = parts[4] || "";
        typeVal = category.toLowerCase().includes("sale") || category.toLowerCase().includes("income") ? "income" : "expense";
      }

      if (amount > 0) {
        rows.push({
          type: typeVal,
          category,
          amount,
          description,
          paymentMethod,
          transactionDate,
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
        });
      }
    }

    if (rows.length === 0) {
      setErrorMsg("Could not parse valid transaction rows. Check your CSV layout.");
    } else {
      setParsedRows(rows);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setRawText(text);
      parseCsvText(text);
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) return;
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const res = await importFn({
        data: {
          passcode,
          batchId: selectedBatchId === "none" ? null : selectedBatchId,
          records: parsedRows.map((r) => ({
            type: r.type,
            category: r.category,
            amount: r.amount,
            description: r.description,
            paymentMethod: r.paymentMethod,
            transactionDate: r.transactionDate,
            customerName: r.customerName || null,
            customerPhone: r.customerPhone || null,
          })),
        },
      });

      setResultSummary(res);
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to process import.");
    } finally {
      setIsProcessing(false);
    }
  };

  const removeRow = (index: number) => {
    setParsedRows((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 overflow-hidden animate-in fade-in duration-200">
      <div className="w-full h-[96dvh] sm:h-auto sm:max-h-[92vh] max-w-3xl rounded-t-3xl sm:rounded-3xl bg-white p-4 sm:p-6 shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#0F3D24]/10 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0F3D24]/10 text-[#0F3D24] shrink-0">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#0F3D24] leading-tight">Bulk Financials & Sales Import</h3>
              <p className="text-[11px] sm:text-xs text-[#0F3D24]/70">Import income/expenses & auto-match paper sales to website orders</p>
            </div>
          </div>

          <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {resultSummary ? (
          <div className="space-y-4 py-2">
            <div className="rounded-2xl bg-emerald-50 p-5 ring-1 ring-emerald-200">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={24} className="text-emerald-700" />
                <h4 className="font-bold text-emerald-900 text-base">Import Completed Successfully!</h4>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-white p-3 text-center shadow-xs">
                  <span className="text-xs text-gray-500 font-medium">Total Rows Inserted</span>
                  <p className="text-xl font-bold text-[#0F3D24]">{resultSummary.totalImported}</p>
                </div>
                <div className="rounded-xl bg-white p-3 text-center shadow-xs">
                  <span className="text-xs text-gray-500 font-medium">Auto-Matched Orders</span>
                  <p className="text-xl font-bold text-emerald-600">{resultSummary.matchedOrdersCount}</p>
                </div>
                <div className="rounded-xl bg-white p-3 text-center shadow-xs">
                  <span className="text-xs text-gray-500 font-medium">Offline Direct Sales</span>
                  <p className="text-xl font-bold text-blue-600">{resultSummary.unmatchedOfflineCount}</p>
                </div>
              </div>

              {resultSummary.matchedDetails.length > 0 && (
                <div className="mt-4 border-t border-emerald-200/60 pt-3">
                  <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Matched Order Logs:</span>
                  <ul className="mt-2 max-h-36 overflow-y-auto space-y-1 text-xs text-emerald-800 font-mono">
                    {resultSummary.matchedDetails.map((det, idx) => (
                      <li key={idx} className="flex items-center gap-1.5">
                        <Check size={12} className="text-emerald-600" /> {det}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={onClose}
                className="rounded-full bg-[#0F3D24] px-6 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#134a2c]"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Target Batch Selector */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl bg-[#F7F5F0] p-4">
              <div>
                <label className="block text-xs font-bold text-[#0F3D24]">Assign Import to Farm Batch</label>
                <p className="text-[11px] text-[#0F3D24]/70">Sales matched to orders will link their website batch accordingly</p>
              </div>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="w-full sm:w-64 rounded-xl border border-[#0F3D24]/15 bg-white px-3 py-2 text-xs font-semibold text-[#0F3D24] outline-none"
              >
                <option value="none">General Farm (No Specific Batch)</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.batchName} ({b.batchType})
                  </option>
                ))}
              </select>
            </div>

            {/* Template actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
              <span className="text-xs font-bold text-[#0F3D24]">CSV Format & Excel Sheet Guide</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopySample}
                  className="flex items-center gap-1.5 rounded-full border border-[#0F3D24]/15 bg-white px-3 py-1.5 text-xs font-medium text-[#0F3D24] hover:bg-[#0F3D24]/5"
                >
                  {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  {copied ? "Copied!" : "Copy Template"}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadSample}
                  className="flex items-center gap-1.5 rounded-full border border-[#0F3D24]/15 bg-white px-3 py-1.5 text-xs font-medium text-[#0F3D24] hover:bg-[#0F3D24]/5"
                >
                  <Download size={14} /> Download Sample CSV
                </button>
              </div>
            </div>

            {/* Upload or Paste */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#0F3D24]">Option A: Upload .CSV File</label>
                <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#0F3D24]/20 p-4 text-center cursor-pointer hover:border-[#3F8F3F] transition">
                  <Upload size={24} className="text-[#0F3D24]/50" />
                  <span className="mt-1 text-xs font-semibold text-[#0F3D24]">Choose CSV File</span>
                  <input type="file" accept=".csv,text/csv" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#0F3D24]">Option B: Paste Data Rows</label>
                <textarea
                  rows={4}
                  placeholder={`Type,Category,Amount,Description,PaymentMethod,TransactionDate,CustomerName,CustomerPhone\nincome,Broiler Sales,45000,10 Broilers,Cash,2026-10-07,Emeka Okonkwo,07012345678`}
                  value={rawText}
                  onChange={(e) => {
                    setRawText(e.target.value);
                    parseCsvText(e.target.value);
                  }}
                  className="w-full rounded-2xl border border-[#0F3D24]/15 p-3 text-xs font-mono outline-none focus:border-[#3F8F3F]"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                <AlertCircle size={16} /> {errorMsg}
              </div>
            )}

            {/* Parsed Preview Table */}
            {parsedRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#0F3D24] uppercase tracking-wider">
                    Parsed Transactions Preview ({parsedRows.length} rows)
                  </h4>
                  <button
                    onClick={() => setParsedRows([])}
                    className="text-xs text-rose-600 font-semibold hover:underline"
                  >
                    Clear All
                  </button>
                </div>
                <div className="max-h-56 overflow-x-auto overflow-y-auto rounded-2xl border border-[#0F3D24]/10 bg-white shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-[#F7F5F0] text-[#0F3D24] font-bold">
                      <tr>
                        <th className="p-2.5">Type</th>
                        <th className="p-2.5">Category</th>
                        <th className="p-2.5">Amount (₦)</th>
                        <th className="p-2.5">Description</th>
                        <th className="p-2.5">Customer Name & Phone</th>
                        <th className="p-2.5 text-right font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {parsedRows.map((r, i) => (
                        <tr key={i} className="hover:bg-gray-50/80">
                          <td className="p-2.5 font-bold uppercase text-[10px]">
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 ${
                                r.type === "income" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {r.type}
                            </span>
                          </td>
                          <td className="p-2.5 font-medium">{r.category}</td>
                          <td className="p-2.5 font-bold text-[#0F3D24]">₦{r.amount.toLocaleString()}</td>
                          <td className="p-2.5 text-gray-600 max-w-xs truncate">{r.description}</td>
                          <td className="p-2.5 font-medium text-gray-700">
                            {r.customerName || r.customerPhone ? (
                              <span>
                                {r.customerName} {r.customerPhone ? `(${r.customerPhone})` : ""}
                              </span>
                            ) : (
                              <span className="text-gray-400 italic">Offline Farm Record</span>
                            )}
                          </td>
                          <td className="p-2.5 text-right">
                            <button onClick={() => removeRow(i)} className="text-rose-600 hover:text-rose-800">
                              <X size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-gray-100 px-5 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={parsedRows.length === 0 || isProcessing}
                onClick={handleExecuteImport}
                className="inline-flex items-center gap-2 rounded-full bg-[#0F3D24] px-6 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#134a2c] disabled:opacity-50 transition"
              >
                {isProcessing ? "Processing & Matching..." : `Import ${parsedRows.length} Transaction(s)`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
