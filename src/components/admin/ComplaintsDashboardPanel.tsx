import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  MessageSquare,
  Plus,
  Search,
  Send,
  Trash2,
  User,
  Phone,
  Mail,
  FileText,
  Filter,
  Check,
  X,
  ExternalLink,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import {
  adminListComplaints,
  adminResolveComplaint,
  adminCreateComplaint,
  adminDeleteComplaint,
  generateResolutionWhatsAppLink,
  COMPLAINT_CATEGORIES,
  type CustomerComplaint,
} from "@/lib/complaints.functions";

interface ComplaintsDashboardPanelProps {
  passcode: string;
}

export function ComplaintsDashboardPanel({ passcode }: ComplaintsDashboardPanelProps) {
  const queryClient = useQueryClient();
  const listFn = useServerFn(adminListComplaints);
  const resolveFn = useServerFn(adminResolveComplaint);
  const createFn = useServerFn(adminCreateComplaint);
  const deleteFn = useServerFn(adminDeleteComplaint);

  // Filter & Search states
  const [statusTab, setStatusTab] = useState<"all" | "pending" | "resolved">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [resolvingComplaint, setResolvingComplaint] = useState<CustomerComplaint | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  // New Offline Complaint form state
  const [offlineForm, setOfflineForm] = useState({
    customerName: "",
    phone: "",
    email: "",
    orderCode: "",
    category: COMPLAINT_CATEGORIES[0],
    message: "",
    status: "pending" as "pending" | "resolved",
    resolutionNote: "",
  });

  // Query Complaints
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-complaints", passcode],
    queryFn: () => listFn({ data: { passcode } }),
    refetchInterval: 10000, // Refresh every 10s
  });

  // Resolve Mutation
  const resolveMutation = useMutation({
    mutationFn: async (complaintId: string) => {
      return resolveFn({
        data: {
          passcode,
          id: complaintId,
          resolutionNote: resolutionNote.trim(),
        },
      });
    },
    onSuccess: (_, complaintId) => {
      queryClient.invalidateQueries({ queryKey: ["admin-complaints"] });
      if (resolvingComplaint) {
        // Offer WhatsApp link
        const waLink = generateResolutionWhatsAppLink({
          ...resolvingComplaint,
          status: "resolved",
          resolutionNote: resolutionNote.trim(),
        });
        window.open(waLink, "_blank");
      }
      setResolvingComplaint(null);
      setResolutionNote("");
    },
  });

  // Create Offline Complaint Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      return createFn({
        data: {
          passcode,
          ...offlineForm,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-complaints"] });
      setIsLogModalOpen(false);
      setOfflineForm({
        customerName: "",
        phone: "",
        email: "",
        orderCode: "",
        category: COMPLAINT_CATEGORIES[0],
        message: "",
        status: "pending",
        resolutionNote: "",
      });
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return deleteFn({ data: { passcode, id } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-complaints"] });
    },
  });

  const complaints = data?.complaints || [];

  // Filter complaints
  const filteredComplaints = complaints.filter((c) => {
    // Status filter
    if (statusTab === "pending" && c.status !== "pending") return false;
    if (statusTab === "resolved" && c.status !== "resolved") return false;

    // Category filter
    if (selectedCategory !== "all" && c.category !== selectedCategory) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTicket = c.ticketCode.toLowerCase().includes(q);
      const matchName = c.customerName.toLowerCase().includes(q);
      const matchPhone = c.phone.toLowerCase().includes(q);
      const matchOrder = c.orderCode ? c.orderCode.toLowerCase().includes(q) : false;
      const matchMsg = c.message.toLowerCase().includes(q);
      if (!matchTicket && !matchName && !matchPhone && !matchOrder && !matchMsg) return false;
    }

    return true;
  });

  // Metrics
  const totalCount = complaints.length;
  const pendingCount = complaints.filter((c) => c.status === "pending").length;
  const resolvedCount = complaints.filter((c) => c.status === "resolved").length;
  const resolutionRate = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Header & Metrics Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0F3D24] flex items-center gap-2">
            <ShieldAlert size={22} className="text-red-600" />
            <span>Customer Complaints Dashboard</span>
          </h2>
          <p className="text-xs text-[#0F3D24]/70 mt-0.5">
            Log, track, investigate, and resolve issues reported by customers in real-time.
          </p>
        </div>

        <button
          onClick={() => setIsLogModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0F3D24] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#134a2c] transition shadow-sm self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Log Phone/Offline Complaint</span>
        </button>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#0F3D24]/10">
          <span className="text-xs font-semibold text-[#0F3D24]/60 uppercase tracking-wider">Total Logged</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-[#0F3D24]">{totalCount}</span>
            <FileText size={18} className="text-[#0F3D24]/40" />
          </div>
        </div>

        <div className="rounded-2xl bg-amber-500/10 p-4 shadow-sm ring-1 ring-amber-500/20">
          <span className="text-xs font-semibold text-amber-900 uppercase tracking-wider">Pending Review</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-700">{pendingCount}</span>
            {pendingCount > 0 && (
              <span className="animate-pulse rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
                Needs Attention
              </span>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-emerald-500/10 p-4 shadow-sm ring-1 ring-emerald-500/20">
          <span className="text-xs font-semibold text-emerald-900 uppercase tracking-wider">Resolved</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-700">{resolvedCount}</span>
            <CheckCircle2 size={18} className="text-emerald-600" />
          </div>
        </div>

        <div className="rounded-2xl bg-blue-500/10 p-4 shadow-sm ring-1 ring-blue-500/20">
          <span className="text-xs font-semibold text-blue-900 uppercase tracking-wider">Resolution Rate</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-blue-800">{resolutionRate}%</span>
            <Sparkles size={18} className="text-blue-600" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-2xl ring-1 ring-[#0F3D24]/10 shadow-sm">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl">
          <button
            onClick={() => setStatusTab("all")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              statusTab === "all" ? "bg-white text-[#0F3D24] shadow-sm" : "text-[#0F3D24]/60 hover:text-[#0F3D24]"
            }`}
          >
            All ({totalCount})
          </button>
          <button
            onClick={() => setStatusTab("pending")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
              statusTab === "pending" ? "bg-amber-500 text-white shadow-sm" : "text-[#0F3D24]/60 hover:text-[#0F3D24]"
            }`}
          >
            <span>Pending</span>
            {pendingCount > 0 && (
              <span className="rounded-full bg-amber-700 px-1.5 py-0.2 text-[10px]">{pendingCount}</span>
            )}
          </button>
          <button
            onClick={() => setStatusTab("resolved")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              statusTab === "resolved" ? "bg-emerald-700 text-white shadow-sm" : "text-[#0F3D24]/60 hover:text-[#0F3D24]"
            }`}
          >
            Resolved ({resolvedCount})
          </button>
        </div>

        {/* Category Dropdown & Search */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-xl border border-[#0F3D24]/15 bg-white px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-[#3F8F3F]/30"
          >
            <option value="all">All Categories</option>
            {COMPLAINT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0F3D24]/40" />
            <input
              type="text"
              placeholder="Search by ticket, name, phone or order..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-[#0F3D24]/15 bg-white pl-8 pr-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#3F8F3F]/30"
            />
          </div>
        </div>
      </div>

      {/* Complaints List / Table */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-[#0F3D24]/60 animate-pulse">
          Loading complaints list...
        </div>
      ) : filteredComplaints.length === 0 ? (
        <div className="rounded-3xl bg-white p-12 text-center ring-1 ring-[#0F3D24]/10 shadow-sm">
          <CheckCircle2 size={48} className="mx-auto text-emerald-500/50 mb-3" />
          <h3 className="text-base font-bold text-[#0F3D24]">No complaints found</h3>
          <p className="text-xs text-[#0F3D24]/60 mt-1">
            {searchQuery || selectedCategory !== "all" || statusTab !== "all"
              ? "No complaints match your selected filters."
              : "Great job! All customer complaints have been resolved."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredComplaints.map((c) => (
            <div
              key={c.id}
              className={`rounded-2xl bg-white p-5 shadow-sm ring-1 transition ${
                c.status === "pending"
                  ? "ring-amber-500/40 bg-amber-500/5"
                  : "ring-[#0F3D24]/10 hover:ring-[#0F3D24]/20"
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#0F3D24]/10">
                {/* Left: Ticket & Category */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-black text-xs bg-[#0F3D24] text-white px-2.5 py-1 rounded-lg">
                    {c.ticketCode}
                  </span>

                  <span className="text-xs font-bold bg-amber-500/15 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                    {c.category}
                  </span>

                  {c.orderCode && (
                    <span className="text-xs font-semibold bg-stone-100 text-[#0F3D24] px-2 py-0.5 rounded-md border border-stone-200">
                      Order: <strong className="underline">{c.orderCode}</strong>
                    </span>
                  )}
                </div>

                {/* Right: Date & Status */}
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-[#0F3D24]/60 flex items-center gap-1">
                    <Clock size={12} /> {new Date(c.createdAt).toLocaleString()}
                  </span>

                  {c.status === "pending" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-bold text-white shadow-sm animate-pulse">
                      <AlertTriangle size={12} /> Pending
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-700 px-2.5 py-0.5 text-xs font-bold text-white shadow-sm">
                      <CheckCircle2 size={12} /> Resolved
                    </span>
                  )}
                </div>
              </div>

              {/* Middle: Customer Details & Complaint Body */}
              <div className="py-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Customer Info */}
                <div className="space-y-1 text-xs">
                  <p className="font-bold text-[#0F3D24] flex items-center gap-1.5">
                    <User size={13} className="text-[#0F3D24]/60" /> {c.customerName}
                  </p>
                  <p className="text-[#0F3D24]/80 flex items-center gap-1.5">
                    <Phone size={13} className="text-[#0F3D24]/60" /> {c.phone}
                  </p>
                  {c.email && (
                    <p className="text-[#0F3D24]/70 flex items-center gap-1.5">
                      <Mail size={13} className="text-[#0F3D24]/60" /> {c.email}
                    </p>
                  )}
                </div>

                {/* Issue Message */}
                <div className="md:col-span-2 bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs text-[#0F3D24]">
                  <p className="font-semibold text-[#0F3D24]/70 text-[11px] uppercase tracking-wider mb-1">
                    Complaint Message:
                  </p>
                  <p className="whitespace-pre-wrap leading-relaxed">{c.message}</p>
                </div>
              </div>

              {/* Resolution Details if Resolved */}
              {c.status === "resolved" && (
                <div className="mt-2 bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs text-emerald-900 flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-emerald-950">
                      Resolved {c.resolvedAt ? `on ${new Date(c.resolvedAt).toLocaleString()}` : ""} {c.resolvedBy ? `by ${c.resolvedBy}` : ""}
                    </p>
                    <p className="mt-0.5 text-emerald-900/90">{c.resolutionNote || "Issue handled satisfactorily."}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons Footer */}
              <div className="mt-3 pt-3 border-t border-[#0F3D24]/10 flex flex-wrap items-center justify-between gap-2">
                {/* Direct WhatsApp link to customer */}
                <a
                  href={`https://wa.me/${c.phone.replace(/\D+/g, "")}?text=${encodeURIComponent(
                    `Hi ${c.customerName.split(" ")[0]}, this is Dignity Agro Farms regarding your complaint ticket ${c.ticketCode}.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline"
                >
                  <MessageSquare size={13} /> Chat with Customer on WhatsApp
                </a>

                <div className="flex items-center gap-2">
                  {c.status === "pending" ? (
                    <button
                      onClick={() => {
                        setResolvingComplaint(c);
                        setResolutionNote("");
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 transition shadow-sm"
                    >
                      <Check size={14} /> Mark as Resolved
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        const waUrl = generateResolutionWhatsAppLink(c);
                        window.open(waUrl, "_blank");
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 px-3 py-1.5 text-xs font-bold hover:bg-emerald-200 transition"
                    >
                      <Send size={12} /> Resend WhatsApp Update
                    </button>
                  )}

                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete complaint ticket ${c.ticketCode}?`)) {
                        deleteMutation.mutate(c.id);
                      }
                    }}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Delete record"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* RESOLVE COMPLAINT MODAL */}
      {resolvingComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-lg text-[#0F3D24] flex items-center gap-2">
                <CheckCircle2 size={20} className="text-emerald-600" />
                <span>Resolve Complaint Ticket: {resolvingComplaint.ticketCode}</span>
              </h3>
              <button
                onClick={() => setResolvingComplaint(null)}
                className="rounded-full p-1 text-stone-400 hover:bg-stone-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p>
                <strong>Customer:</strong> {resolvingComplaint.customerName} ({resolvingComplaint.phone})
              </p>
              <p>
                <strong>Category:</strong> {resolvingComplaint.category}
              </p>
              <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200 text-stone-700 italic">
                "{resolvingComplaint.message}"
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#0F3D24]/80">
                Resolution Notes / Action Taken
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Refund of ₦2,000 processed to bank account / Re-delivered fresh tray of eggs."
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                className="w-full rounded-xl border border-[#0F3D24]/20 p-3 text-xs outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setResolvingComplaint(null)}
                className="rounded-full border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                onClick={() => resolveMutation.mutate(resolvingComplaint.id)}
                disabled={resolveMutation.isPending}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition"
              >
                <Send size={14} />
                <span>{resolveMutation.isPending ? "Saving..." : "Resolve & Notify on WhatsApp"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOG OFFLINE COMPLAINT MODAL */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-[#0F3D24]">Log Phone / Offline Complaint</h3>
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="rounded-full p-1 text-stone-400 hover:bg-stone-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-[#0F3D24]/80">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={offlineForm.customerName}
                  onChange={(e) => setOfflineForm({ ...offlineForm, customerName: e.target.value })}
                  className="w-full mt-1 rounded-xl border border-[#0F3D24]/20 p-2.5 outline-none focus:ring-2 focus:ring-[#3F8F3F]/30"
                  placeholder="e.g. Obinna Eze"
                />
              </div>

              <div>
                <label className="font-bold text-[#0F3D24]/80">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={offlineForm.phone}
                  onChange={(e) => setOfflineForm({ ...offlineForm, phone: e.target.value })}
                  className="w-full mt-1 rounded-xl border border-[#0F3D24]/20 p-2.5 outline-none focus:ring-2 focus:ring-[#3F8F3F]/30"
                  placeholder="08012345678"
                />
              </div>

              <div>
                <label className="font-bold text-[#0F3D24]/80">Email (Optional)</label>
                <input
                  type="email"
                  value={offlineForm.email}
                  onChange={(e) => setOfflineForm({ ...offlineForm, email: e.target.value })}
                  className="w-full mt-1 rounded-xl border border-[#0F3D24]/20 p-2.5 outline-none focus:ring-2 focus:ring-[#3F8F3F]/30"
                  placeholder="customer@gmail.com"
                />
              </div>

              <div>
                <label className="font-bold text-[#0F3D24]/80">Order Code (Optional)</label>
                <input
                  type="text"
                  value={offlineForm.orderCode}
                  onChange={(e) => setOfflineForm({ ...offlineForm, orderCode: e.target.value })}
                  className="w-full mt-1 rounded-xl border border-[#0F3D24]/20 p-2.5 outline-none focus:ring-2 focus:ring-[#3F8F3F]/30"
                  placeholder="DAF-12345"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-[#0F3D24]/80">Category</label>
                <select
                  value={offlineForm.category}
                  onChange={(e) => setOfflineForm({ ...offlineForm, category: e.target.value as any })}
                  className="w-full mt-1 rounded-xl border border-[#0F3D24]/20 p-2.5 outline-none focus:ring-2 focus:ring-[#3F8F3F]/30"
                >
                  {COMPLAINT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-[#0F3D24]/80">Complaint Message *</label>
                <textarea
                  rows={3}
                  required
                  value={offlineForm.message}
                  onChange={(e) => setOfflineForm({ ...offlineForm, message: e.target.value })}
                  className="w-full mt-1 rounded-xl border border-[#0F3D24]/20 p-2.5 outline-none focus:ring-2 focus:ring-[#3F8F3F]/30"
                  placeholder="Describe the problem reported by the customer..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="rounded-full border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!offlineForm.customerName || !offlineForm.phone || !offlineForm.message || createMutation.isPending}
                className="rounded-full bg-[#0F3D24] px-5 py-2 text-xs font-bold text-white hover:bg-[#134a2c] disabled:opacity-50 transition"
              >
                {createMutation.isPending ? "Logging..." : "Save Complaint"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
