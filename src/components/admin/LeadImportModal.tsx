import React, { useState } from "react";
import * as XLSX from "xlsx";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Sparkles,
  Users,
  Download,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { adminBatchImportLeads } from "@/lib/farm.functions";

interface LeadImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  passcode: string;
  onSuccess: () => void;
}

interface ParsedLeadRow {
  fullName: string;
  phone: string;
  email?: string;
  location?: string;
  leadSource?: string;
  interestedIn?: string;
  status: "New Lead" | "Contacted" | "Interested / Negotiating" | "Converted to Customer" | "Lost / Inactive";
  notes?: string;
  isValid: boolean;
  validationError?: string;
}

export function LeadImportModal({
  isOpen,
  onClose,
  passcode,
  onSuccess,
}: LeadImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedLeadRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const batchImportFn = useServerFn(adminBatchImportLeads);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      parseFile(selectedFile);
    }
  };

  const parseFile = (fileObj: File) => {
    setFile(fileObj);
    setIsParsing(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

        if (!data || data.length === 0) {
          setError("The uploaded spreadsheet is empty.");
          setParsedRows([]);
          return;
        }

        const rows: ParsedLeadRow[] = data.map((r, idx) => {
          // Normalize header keys case-insensitively
          const getVal = (...keys: string[]) => {
            for (const key of Object.keys(r)) {
              const cleanKey = key.trim().toLowerCase();
              if (keys.some((k) => cleanKey.includes(k.toLowerCase()))) {
                return String(r[key]).trim();
              }
            }
            return "";
          };

          const name = getVal("name", "full name", "client", "customer", "lead");
          const phone = getVal("phone", "mobile", "contact", "tel", "whatsapp");
          const email = getVal("email", "mail");
          const location = getVal("location", "address", "city", "state");
          const source = getVal("source", "channel") || "Batch Import";
          const interestedIn = getVal("interested", "product", "interest");
          const notes = getVal("notes", "remark", "comment");
          const rawStatus = getVal("status", "stage");

          let status: ParsedLeadRow["status"] = "New Lead";
          if (rawStatus.toLowerCase().includes("contact")) status = "Contacted";
          else if (rawStatus.toLowerCase().includes("interest") || rawStatus.toLowerCase().includes("negotiat"))
            status = "Interested / Negotiating";
          else if (rawStatus.toLowerCase().includes("convert") || rawStatus.toLowerCase().includes("customer"))
            status = "Converted to Customer";
          else if (rawStatus.toLowerCase().includes("lost") || rawStatus.toLowerCase().includes("inactive"))
            status = "Lost / Inactive";

          const isValid = Boolean(name && phone && phone.length >= 3);
          const validationError = !name
            ? "Missing full name"
            : !phone
            ? "Missing phone number"
            : undefined;

          return {
            fullName: name || `Lead #${idx + 1}`,
            phone: phone || "N/A",
            email: email || undefined,
            location: location || undefined,
            leadSource: source,
            interestedIn: interestedIn || undefined,
            status,
            notes: notes || undefined,
            isValid,
            validationError,
          };
        });

        setParsedRows(rows);
      } catch (err: any) {
        setError("Failed to parse file. Please ensure it is a valid CSV or Excel (.xlsx) document.");
        setParsedRows([]);
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsBinaryString(fileObj);
  };

  const validRows = parsedRows.filter((r) => r.isValid);

  const handleExecuteImport = async () => {
    if (validRows.length === 0) return;
    setIsImporting(true);
    setError(null);

    try {
      const payload = validRows.map((r) => ({
        fullName: r.fullName,
        phone: r.phone,
        email: r.email || null,
        location: r.location || null,
        leadSource: r.leadSource || "Batch Import",
        interestedIn: r.interestedIn || null,
        status: r.status,
        estimatedValue: 0,
        notes: r.notes || null,
        followUpDate: null,
      }));

      const res = await batchImportFn({ data: { passcode, leads: payload } });
      alert(`Successfully imported ${res.importedCount} customer leads!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Import failed. Please try again.");
    } finally {
      setIsImporting(false);
    }
  };

  const downloadSampleTemplate = () => {
    const headers = [["Full Name", "Phone", "Email", "Location", "Lead Source", "Product Interest", "Status", "Notes"]];
    const sampleRows = [
      ["Chinedu Ekeh", "08031234567", "chinedu@gmail.com", "Owerri, Imo State", "Instagram", "Live Broiler Chickens", "New Lead", "Inquired about bulk Christmas purchase"],
      ["Blessing Nkem", "07089876543", "blessing@yahoo.com", "Orlu", "Farm Visit", "Table Eggs", "Interested / Negotiating", "Wants 20 crates weekly"],
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...sampleRows]);
    XLSX.utils.book_append_sheet(wb, ws, "Leads Template");
    XLSX.writeFile(wb, "AgroFarms_Leads_Import_Template.xlsx");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-[#0F3D24]/10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#0F3D24]/10 bg-[#0F3D24] px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#3F8F3F]/30 p-2.5 text-[#A2E0A2]">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold">Import Batch Customer Leads</h3>
              <p className="text-xs text-white/70">
                Upload CSV or Excel spreadsheet to import multiple leads automatically
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

        <div className="max-h-[75vh] overflow-y-auto p-6 space-y-5">
          {/* Top Info & Sample Template Button */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#F7F5F0] p-4 border border-[#0F3D24]/10">
            <div className="text-xs text-[#0F3D24]">
              <p className="font-bold">Required Columns:</p>
              <p className="text-[#0F3D24]/70">Full Name, Phone Number (Email, Location, Notes are optional)</p>
            </div>
            <button
              type="button"
              onClick={downloadSampleTemplate}
              className="flex items-center gap-1.5 rounded-full border border-[#3F8F3F] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#0F3D24] hover:bg-[#3F8F3F]/10 transition"
            >
              <Download size={14} className="text-[#3F8F3F]" />
              Download Sample Template
            </button>
          </div>

          {/* Upload Area */}
          <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#0F3D24]/20 bg-[#F7F5F0]/50 p-8 text-center hover:bg-[#F7F5F0] transition">
            <input
              type="file"
              accept=".csv, .xlsx, .xls"
              onChange={handleFileChange}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
            <div className="rounded-full bg-[#0F3D24]/5 p-4 text-[#0F3D24]">
              <Upload size={28} />
            </div>
            <p className="mt-3 text-sm font-bold text-[#0F3D24]">
              {file ? file.name : "Click or drag & drop CSV / Excel file here"}
            </p>
            <p className="mt-1 text-xs text-[#0F3D24]/60">Supports .CSV, .XLSX, and .XLS files</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-4 text-xs font-semibold text-rose-700 border border-rose-200">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Parsed Preview Table */}
          {isParsing ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-[#0F3D24]/70">
              <Loader2 size={18} className="animate-spin text-[#3F8F3F]" />
              Parsing spreadsheet rows...
            </div>
          ) : parsedRows.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-[#0F3D24]">
                <span>Parsed Leads Preview ({parsedRows.length} total)</span>
                <span className="text-[#3F8F3F]">{validRows.length} Ready for Import</span>
              </div>

              <div className="max-h-60 overflow-y-auto rounded-2xl border border-[#0F3D24]/10 bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-[#0F3D24] text-white">
                    <tr>
                      <th className="px-3 py-2.5 font-semibold">Name</th>
                      <th className="px-3 py-2.5 font-semibold">Phone</th>
                      <th className="px-3 py-2.5 font-semibold">Location</th>
                      <th className="px-3 py-2.5 font-semibold">Status</th>
                      <th className="px-3 py-2.5 font-semibold">Valid?</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0F3D24]/10">
                    {parsedRows.map((r, i) => (
                      <tr key={i} className={r.isValid ? "hover:bg-emerald-50/50" : "bg-rose-50/60"}>
                        <td className="px-3 py-2 font-medium text-[#0F3D24]">{r.fullName}</td>
                        <td className="px-3 py-2 font-mono text-[#0F3D24]/80">{r.phone}</td>
                        <td className="px-3 py-2 text-[#0F3D24]/70">{r.location || "-"}</td>
                        <td className="px-3 py-2 text-[#0F3D24]/70">{r.status}</td>
                        <td className="px-3 py-2">
                          {r.isValid ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                              <CheckCircle2 size={13} /> Ready
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-600 font-semibold" title={r.validationError}>
                              <AlertCircle size={13} /> {r.validationError}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
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
            disabled={validRows.length === 0 || isImporting}
            onClick={handleExecuteImport}
            className="flex items-center gap-2 rounded-full bg-[#0F3D24] px-6 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-[#134a2c] disabled:opacity-50 transition"
          >
            {isImporting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Importing {validRows.length} Leads...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Import {validRows.length} Leads Now
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
