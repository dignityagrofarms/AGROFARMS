import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import {
  X,
  Send,
  CheckCircle2,
  MessageSquare,
  ShieldAlert,
  Phone,
  Mail,
  AlertTriangle,
  Search,
  Clock,
  FileText,
  RefreshCw,
} from "lucide-react";
import {
  submitCustomerComplaint,
  trackComplaint,
  COMPLAINT_CATEGORIES,
  type CustomerComplaint,
} from "@/lib/complaints.functions";

interface ComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultOrderCode?: string;
  initialMode?: "submit" | "track";
}

export function ComplaintModal({
  isOpen,
  onClose,
  defaultOrderCode = "",
  initialMode = "submit",
}: ComplaintModalProps) {
  const [activeTab, setActiveTab] = useState<"submit" | "track">(initialMode);

  // Submit Form state
  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    email: "",
    orderCode: defaultOrderCode,
    category: COMPLAINT_CATEGORIES[0],
    message: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    ticketCode: string;
    whatsappUrl: string;
  } | null>(null);

  // Track state
  const [trackQuery, setTrackQuery] = useState("");
  const trackFn = useServerFn(trackComplaint);
  const trackMutation = useMutation({
    mutationFn: (q: string) => trackFn({ data: { query: q } }),
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName || !form.phone || !form.message) {
      setErrorMsg("Please fill in your name, phone number, and complaint message.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await submitCustomerComplaint({
        data: {
          customerName: form.customerName,
          phone: form.phone,
          email: form.email || "",
          orderCode: form.orderCode || "",
          category: form.category,
          message: form.message,
        },
      });

      if (res.success) {
        setSuccessResult({
          ticketCode: res.ticketCode,
          whatsappUrl: res.whatsappUrl,
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit complaint. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTrackSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackQuery.trim()) return;
    trackMutation.mutate(trackQuery.trim());
  };

  const handleReset = () => {
    setSuccessResult(null);
    setForm({
      customerName: "",
      phone: "",
      email: "",
      orderCode: "",
      category: COMPLAINT_CATEGORIES[0],
      message: "",
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-amber-500/20 p-2 text-amber-900">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-[#0F3D24]">Customer Support & Complaints</h3>
              <p className="text-xs text-[#0F3D24]/70">Report an issue or check status of your ticket.</p>
            </div>
          </div>
          <button onClick={handleReset} className="rounded-full p-1 text-stone-400 hover:bg-stone-100">
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        {!successResult && (
          <div className="flex items-center rounded-xl bg-stone-100 p-1 text-xs font-bold">
            <button
              onClick={() => setActiveTab("submit")}
              className={`flex-1 py-2 rounded-lg transition text-center ${
                activeTab === "submit" ? "bg-white text-[#0F3D24] shadow-sm" : "text-stone-500 hover:text-stone-800"
              }`}
            >
              Log New Complaint
            </button>
            <button
              onClick={() => setActiveTab("track")}
              className={`flex-1 py-2 rounded-lg transition text-center ${
                activeTab === "track" ? "bg-white text-[#0F3D24] shadow-sm" : "text-stone-500 hover:text-stone-800"
              }`}
            >
              Track Ticket Status
            </button>
          </div>
        )}

        {/* Success Screen */}
        {successResult ? (
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 size={36} />
            </div>

            <div>
              <h4 className="text-xl font-bold text-[#0F3D24]">Complaint Received!</h4>
              <p className="text-xs text-[#0F3D24]/70 mt-1">
                Your ticket reference is:{" "}
                <span className="font-mono font-black text-sm bg-stone-100 px-2 py-1 rounded text-[#0F3D24] border">
                  {successResult.ticketCode}
                </span>
              </p>
            </div>

            <p className="text-xs text-[#0F3D24]/80 max-w-sm mx-auto bg-amber-50 p-3 rounded-2xl border border-amber-200">
              📧 Email notification sent to management. You can also send your complaint directly to our official WhatsApp line below:
            </p>

            <div className="flex flex-col gap-2 pt-2">
              <a
                href={successResult.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3 text-sm font-bold text-white hover:bg-[#1ebd59] transition shadow-md"
              >
                <MessageSquare size={18} />
                <span>Send to WhatsApp Now</span>
              </a>

              <button
                onClick={() => {
                  setSuccessResult(null);
                  setActiveTab("track");
                  setTrackQuery(successResult.ticketCode);
                  trackMutation.mutate(successResult.ticketCode);
                }}
                className="rounded-full border border-stone-300 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
              >
                Track Ticket Status
              </button>
            </div>
          </div>
        ) : activeTab === "submit" ? (
          /* Submit Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 border border-red-200 flex items-center gap-2">
                <AlertTriangle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-[#0F3D24]">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amaka Johnson"
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  className="w-full mt-1 rounded-xl border border-[#0F3D24]/20 p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#3F8F3F]/30"
                />
              </div>

              <div>
                <label className="font-bold text-[#0F3D24]">Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 08167099492"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full mt-1 rounded-xl border border-[#0F3D24]/20 p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#3F8F3F]/30"
                />
              </div>

              <div>
                <label className="font-bold text-[#0F3D24]">Email Address (Optional)</label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full mt-1 rounded-xl border border-[#0F3D24]/20 p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#3F8F3F]/30"
                />
              </div>

              <div>
                <label className="font-bold text-[#0F3D24]">Order Code (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. DAF-99928"
                  value={form.orderCode}
                  onChange={(e) => setForm({ ...form, orderCode: e.target.value })}
                  className="w-full mt-1 rounded-xl border border-[#0F3D24]/20 p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#3F8F3F]/30"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-[#0F3D24]">What is your complaint about?</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as any })}
                  className="w-full mt-1 rounded-xl border border-[#0F3D24]/20 p-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#3F8F3F]/30"
                >
                  {COMPLAINT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-[#0F3D24]">Details of the Complaint *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Please describe what happened in detail so we can resolve it quickly..."
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full mt-1 rounded-xl border border-[#0F3D24]/20 p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#3F8F3F]/30"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-stone-300 px-4 py-2.5 text-xs font-semibold text-stone-600 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0F3D24] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#134a2c] disabled:opacity-50 transition"
              >
                <Send size={14} />
                <span>{isSubmitting ? "Submitting..." : "Submit Complaint"}</span>
              </button>
            </div>
          </form>
        ) : (
          /* Track Complaint Screen */
          <div className="space-y-4">
            <form onSubmit={handleTrackSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Enter Ticket Code (CMP-xxxxx) or Phone Number..."
                  value={trackQuery}
                  onChange={(e) => setTrackQuery(e.target.value)}
                  className="w-full rounded-xl border border-[#0F3D24]/20 pl-9 pr-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-[#3F8F3F]/30"
                />
              </div>
              <button
                type="submit"
                disabled={trackMutation.isPending}
                className="rounded-xl bg-[#0F3D24] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#134a2c] disabled:opacity-50 flex items-center gap-1.5"
              >
                {trackMutation.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                <span>Lookup</span>
              </button>
            </form>

            {/* Results */}
            {trackMutation.isPending ? (
              <p className="text-center text-xs text-stone-500 py-6 animate-pulse">Searching ticket status...</p>
            ) : trackMutation.data ? (
              trackMutation.data.complaints.length === 0 ? (
                <div className="text-center py-6 bg-stone-50 rounded-2xl border border-stone-200 text-stone-600 text-xs">
                  No complaint found for "<strong>{trackQuery}</strong>". Please check your ticket code or phone number.
                </div>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {trackMutation.data.complaints.map((c) => (
                    <div
                      key={c.id}
                      className={`p-4 rounded-2xl border text-xs space-y-2 ${
                        c.status === "pending"
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-950"
                          : "bg-emerald-500/10 border-emerald-500/30 text-emerald-950"
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="font-mono bg-white px-2 py-0.5 rounded border text-[#0F3D24]">
                          {c.ticketCode}
                        </span>
                        {c.status === "pending" ? (
                          <span className="inline-flex items-center gap-1 bg-amber-500 text-white px-2 py-0.5 rounded-full text-[10px] animate-pulse">
                            <Clock size={11} /> Pending Review
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-emerald-700 text-white px-2 py-0.5 rounded-full text-[10px]">
                            <CheckCircle2 size={11} /> Resolved
                          </span>
                        )}
                      </div>

                      <div className="text-[#0F3D24]/80">
                        <p>
                          <strong>Category:</strong> {c.category}
                        </p>
                        <p className="mt-1 bg-white/80 p-2 rounded-lg border text-stone-800">"{c.message}"</p>
                      </div>

                      {c.status === "resolved" && (
                        <div className="bg-emerald-100 border border-emerald-300 p-2.5 rounded-xl text-emerald-950">
                          <p className="font-bold text-emerald-900 flex items-center gap-1">
                            <CheckCircle2 size={13} className="text-emerald-700" /> Resolution Note:
                          </p>
                          <p className="mt-0.5">{c.resolutionNote || "Issue resolved satisfactorily."}</p>
                          {c.resolvedAt && (
                            <p className="text-[10px] text-emerald-800/70 mt-1">
                              Resolved on {new Date(c.resolvedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            ) : (
              <p className="text-center text-xs text-stone-400 py-6">
                Enter your <strong>CMP-xxxxx</strong> ticket code or phone number to see the resolution status.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
