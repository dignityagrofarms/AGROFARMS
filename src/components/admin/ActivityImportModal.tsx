import React, { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { X, Upload, FileSpreadsheet, Download, CheckCircle2, AlertCircle, Copy, Check } from "lucide-react";
import * as XLSX from "xlsx";
import { adminImportActivities, type FarmBatch } from "@/lib/farm.functions";

interface ActivityImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  passcode: string;
  batches: FarmBatch[];
  defaultBatchId?: string | null;
  onSuccess: () => void;
}

export type ParsedActivityRow = {
  activityDate: string;
  activityType: string;
  batchName?: string;
  mortalityCount: number;
  causeOfMortality?: string;
  feedConsumedKg: number;
  eggsCollected: number;
  medicationGiven?: string;
  notes?: string;
};

const SAMPLE_CSV = `Date,Type,Batch,Mortality,Cause,Feed(kg),Eggs,Medication,Notes
2026-10-07,Feeding & Mortality,Batch 4 - Broilers,2,Extreme Heat,150,0,Multivitamins,Flock active and alert
2026-10-06,Egg Collection & Feeding,Batch 3 - Layers,0,,120,450,,Morning egg collection complete
2026-10-05,Vaccination & Feeding,Batch 4 - Broilers,1,Natural,140,0,Gumboro Vaccine,Vaccine administered in drinking water`;

export function ActivityImportModal({
  isOpen,
  onClose,
  passcode,
  batches,
  defaultBatchId,
  onSuccess,
}: ActivityImportModalProps) {
  const importFn = useServerFn(adminImportActivities);
  const [selectedBatchId, setSelectedBatchId] = useState<string>(defaultBatchId || "none");
  const [rawText, setRawText] = useState<string>("");
  const [parsedRows, setParsedRows] = useState<ParsedActivityRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [resultSummary, setResultSummary] = useState<{ importedCount: number } | null>(null);

  if (!isOpen) return null;

  const handleCopySample = () => {
    navigator.clipboard.writeText(SAMPLE_CSV);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCsvSample = () => {
    const link = document.createElement("a");
    link.href = "/agrofarms_activity_import_template.csv";
    link.setAttribute("download", "agrofarms_activity_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadXlsxSample = () => {
    const link = document.createElement("a");
    link.href = "/agrofarms_activity_import_template.xlsx";
    link.setAttribute("download", "agrofarms_activity_import_template.xlsx");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

function normalizeActivityType(rawType: string): string {
  const lower = (rawType || "").toLowerCase().trim();
  if (lower.includes("mortality") || lower.includes("death") || lower.includes("die")) return "Mortality Record";
  if (lower.includes("egg") || lower.includes("crate")) return "Egg Collection";
  if (lower.includes("feed") || lower.includes("mash") || lower.includes("pellet") || lower.includes("starter") || lower.includes("grower") || lower.includes("finisher")) return "Feeding";
  if (lower.includes("med") || lower.includes("vac") || lower.includes("health") || lower.includes("drug") || lower.includes("vit") || lower.includes("treat")) return "Medication / Vaccination";
  if (lower.includes("weight") || lower.includes("kg") || lower.includes("weigh")) return "Weight Check";
  if (lower.includes("clean") || lower.includes("sanitat") || lower.includes("wash") || lower.includes("disinfect")) return "Cleaning & Sanitation";
  if (lower.includes("pen") || lower.includes("maint") || lower.includes("repair") || lower.includes("house")) return "Pen Maintenance";
  return "General Activity";
}

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

    const rows: ParsedActivityRow[] = [];
    const firstLine = lines[0].toLowerCase();
    const hasHeader = firstLine.includes("date") || firstLine.includes("type") || firstLine.includes("mortality") || firstLine.includes("feed");
    const startIndex = hasHeader ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split(",").map((p) => p.trim());
      if (parts.length < 2) continue;

      const activityDate = parts[0] || new Date().toISOString().split("T")[0];
      const rawType = parts[1] || "General Activity";
      const activityType = normalizeActivityType(rawType);
      const batchName = parts[2] || "";
      const mortalityCount = parseInt(parts[3]?.replace(/[^0-9]/g, "") || "0", 10) || 0;
      const feedConsumedKg = parseFloat(parts[4]?.replace(/[^0-9.]/g, "") || "0") || 0;
      const eggsCollected = parseInt(parts[5]?.replace(/[^0-9]/g, "") || "0", 10) || 0;
      const medicationGiven = parts[6] || "";
      const causeOfMortality = parts[7] || "";
      const notes = parts[8] || "";

      rows.push({
        activityDate,
        activityType,
        batchName,
        mortalityCount,
        causeOfMortality,
        feedConsumedKg,
        eggsCollected,
        medicationGiven,
        notes,
      });
    }


    if (rows.length === 0) {
      setErrorMsg("Could not parse any valid rows. Please check format.");
      return;
    }

    setParsedRows(rows);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);

    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result;
        const wb = XLSX.read(buffer, { type: isExcel ? "array" : "binary" });
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];
        
        // Convert sheet to JSON objects with default empty strings
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

        if (!rawJson || rawJson.length === 0) {
          setErrorMsg("Uploaded spreadsheet is empty. Please check the file.");
          return;
        }

        const rows: ParsedActivityRow[] = rawJson.map((r) => {
          // Normalize header key lookup
          const getVal = (...keys: string[]) => {
            for (const key of Object.keys(r)) {
              const cleanKey = key.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
              if (keys.some((k) => cleanKey.includes(k.toLowerCase().replace(/[^a-z0-9]/g, "")))) {
                return String(r[key]).trim();
              }
            }
            return "";
          };

          const activityDate = getVal("date", "activitydate") || new Date().toISOString().split("T")[0];
          const rawType = getVal("type", "activitytype") || "General Activity";
          const activityType = normalizeActivityType(rawType);
          const batchName = getVal("batch", "batchname") || "";
          const mortalityCount = parseInt(getVal("mortality", "mortalitycount").replace(/[^0-9]/g, "") || "0", 10) || 0;
          const feedConsumedKg = parseFloat(getVal("feed", "feedconsumedkg").replace(/[^0-9.]/g, "") || "0") || 0;
          const eggsCollected = parseInt(getVal("eggs", "eggscollected").replace(/[^0-9]/g, "") || "0", 10) || 0;
          const medicationGiven = getVal("medication", "medicationgiven");
          const causeOfMortality = getVal("cause", "causeofmortality");
          const notes = getVal("notes", "remark", "comment");

          return {
            activityDate,
            activityType,
            batchName,
            mortalityCount,
            causeOfMortality,
            feedConsumedKg,
            eggsCollected,
            medicationGiven,
            notes,
          };
        });

        if (rows.length === 0) {
          setErrorMsg("Could not parse any valid rows. Please check file layout.");
          return;
        }

        setParsedRows(rows);
        setRawText(`File loaded: ${file.name} (${rows.length} valid rows found)`);
      } catch (err: any) {
        setErrorMsg("Failed to parse file. Please ensure it is a valid CSV or Excel (.xlsx) file.");
      }
    };

    if (isExcel) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  const handleImportSubmit = async () => {
    if (parsedRows.length === 0) return;
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const batchId = selectedBatchId === "none" ? null : selectedBatchId;
      const res = await importFn({
        data: {
          passcode,
          batchId,
          activities: parsedRows,
        },
      });

      setResultSummary(res);
      onSuccess();
    } catch (err: any) {
      console.error("Activity Import Failed:", err);
      setErrorMsg(err?.message || "Failed to import activity records. Please check file structure.");
    } finally {
      setIsProcessing(false);
    }
  };

  const totalMortality = parsedRows.reduce((acc, r) => acc + r.mortalityCount, 0);
  const totalFeed = parsedRows.reduce((acc, r) => acc + r.feedConsumedKg, 0);
  const totalEggs = parsedRows.reduce((acc, r) => acc + r.eggsCollected, 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 overflow-hidden animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl w-full h-[96dvh] sm:h-auto sm:max-h-[92vh] max-w-4xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
              <FileSpreadsheet className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white leading-tight">Import Farm Daily Activities</h3>
              <p className="text-[11px] sm:text-xs text-slate-400">Batch upload activity, mortality, feed, & egg collection logs</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          {resultSummary ? (
            <div className="space-y-6 text-center py-8">
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-2xl font-bold text-white mb-2">Import Successful!</h4>
                <p className="text-slate-300">
                  Successfully imported <span className="font-bold text-emerald-400">{resultSummary.importedCount}</span> activity logs into the database.
                </p>
              </div>

              <div className="flex justify-center pt-4">
                <button
                  onClick={() => {
                    setResultSummary(null);
                    setParsedRows([]);
                    setRawText("");
                    onClose();
                  }}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-900/30"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Step 1: Batch Selection & Download Template */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Target Farm Batch (Optional)
                  </label>
                  <select
                    value={selectedBatchId}
                    onChange={(e) => setSelectedBatchId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg p-2.5 text-sm focus:border-amber-500 focus:outline-none"
                  >
                    <option value="none">Auto-detect batch from CSV or Default</option>
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.batchName} ({b.batchType})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    If selected, activities will be assigned to this batch unless specified per row.
                  </p>
                </div>

                <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 flex flex-col justify-between">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                      Download Standard Import Templates
                    </label>
                    <p className="text-xs text-slate-400">Pre-formatted templates matching AgroFarms database structure.</p>
                  </div>
                  <div className="flex items-center space-x-2 mt-3">
                    <button
                      onClick={handleDownloadCsvSample}
                      className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-600/60 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>CSV Template</span>
                    </button>
                    <button
                      onClick={handleDownloadXlsxSample}
                      className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-600/60 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Excel (.xlsx)</span>
                    </button>
                    <button
                      onClick={handleCopySample}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600/60 text-xs font-semibold rounded-lg flex items-center space-x-1 transition-all"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Upload or Paste */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Upload File or Paste CSV Data
                  </label>
                  <label className="cursor-pointer px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload CSV / Excel</span>
                    <input type="file" accept=".csv, .txt, .xlsx" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>

                <textarea
                  rows={4}
                  value={rawText}
                  onChange={(e) => {
                    setRawText(e.target.value);
                    parseCsvText(e.target.value);
                  }}
                  placeholder="Paste CSV content here... (Date, Type, Batch, Mortality, Cause, Feed, Eggs, Medication, Notes)"
                  className="w-full bg-slate-950 font-mono text-xs text-slate-300 border border-slate-800 rounded-xl p-3.5 focus:border-amber-500 focus:outline-none placeholder:text-slate-600"
                />
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center space-x-3 text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Parsed Preview Table */}
              {parsedRows.length > 0 && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 text-xs">
                    <div>
                      <span className="text-slate-400">Parsed Rows: </span>
                      <strong className="text-amber-400">{parsedRows.length}</strong>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-red-400 font-semibold">Total Mortality: {totalMortality}</span>
                      <span className="text-amber-400 font-semibold">Feed: {totalFeed} kg</span>
                      <span className="text-emerald-400 font-semibold">Eggs: {totalEggs}</span>
                    </div>
                  </div>

                  <div className="border border-slate-800 rounded-xl overflow-x-auto max-h-56">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                        <tr>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5">Type</th>
                          <th className="p-2.5">Batch</th>
                          <th className="p-2.5">Mortality</th>
                          <th className="p-2.5">Feed (kg)</th>
                          <th className="p-2.5">Eggs</th>
                          <th className="p-2.5">Medication</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {parsedRows.map((r, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/40">
                            <td className="p-2.5 text-slate-400">{r.activityDate}</td>
                            <td className="p-2.5 font-medium text-white">{r.activityType}</td>
                            <td className="p-2.5 text-slate-400">{r.batchName || "—"}</td>
                            <td className="p-2.5">
                              {r.mortalityCount > 0 ? (
                                <span className="text-red-400 font-bold">{r.mortalityCount}</span>
                              ) : (
                                <span className="text-slate-600">0</span>
                              )}
                            </td>
                            <td className="p-2.5 text-slate-300">{r.feedConsumedKg}</td>
                            <td className="p-2.5 text-emerald-400 font-medium">{r.eggsCollected}</td>
                            <td className="p-2.5 text-slate-400">{r.medicationGiven || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        {!resultSummary && (
          <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImportSubmit}
              disabled={parsedRows.length === 0 || isProcessing}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import {parsedRows.length} Activities</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
