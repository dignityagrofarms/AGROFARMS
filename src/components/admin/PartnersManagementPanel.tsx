import React, { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Handshake,
  Plus,
  Users,
  Wallet,
  TrendingUp,
  Receipt,
  Activity,
  ArrowLeft,
  KeyRound,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Calendar,
  Layers,
  Phone,
  Mail,
  Copy,
  ExternalLink,
  DollarSign,
  FileText,
  Lock,
  ChevronRight,
  ShieldCheck,
  Building,
} from "lucide-react";
import {
  adminListPartners,
  adminGetPartnerDetail,
  adminCreatePartner,
  adminUpdatePartner,
  adminResetPartnerPasscode,
  adminTogglePartnerActive,
  adminDeletePartner,
  adminRecordPartnerFinancial,
  adminDeletePartnerFinancial,
  adminRecordPartnerActivity,
  adminDeletePartnerActivity,
  type FarmPartner,
  type PartnerFinancial,
  type PartnerActivity,
} from "@/lib/partners.functions";
import { adminListBatches } from "@/lib/farm.functions";
import type { AdminRole } from "@/lib/orders.functions";

const naira = (n: number) => "\u20a6" + (n || 0).toLocaleString("en-NG");

export function PartnersManagementPanel({
  passcode,
  role = "owner",
}: {
  passcode: string;
  role?: AdminRole;
}) {
  const qc = useQueryClient();
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const listPartnersFn = useServerFn(adminListPartners);
  const getPartnerDetailFn = useServerFn(adminGetPartnerDetail);
  const listBatchesFn = useServerFn(adminListBatches);

  // Queries
  const partnersQuery = useQuery({
    queryKey: ["admin-partners", passcode],
    queryFn: () => listPartnersFn({ data: { passcode } }),
    staleTime: 10_000,
  });

  const batchesQuery = useQuery({
    queryKey: ["admin-batches", passcode],
    queryFn: () => listBatchesFn({ data: { passcode } }),
    staleTime: 60_000,
  });

  const partnerDetailQuery = useQuery({
    queryKey: ["admin-partner-detail", passcode, selectedPartnerId],
    queryFn: () => getPartnerDetailFn({ data: { passcode, partnerId: selectedPartnerId! } }),
    enabled: !!selectedPartnerId,
    staleTime: 5_000,
  });

  const partners = partnersQuery.data || [];
  const batches = batchesQuery.data || [];

  // Summary Metrics
  const totalCapitalInvested = partners.reduce((sum, p) => sum + p.initialInvestment, 0);
  const totalExpenses = partners.reduce((sum, p) => sum + p.totalExpenses, 0);
  const totalIncome = partners.reduce((sum, p) => sum + p.totalIncome, 0);
  const activePartnersCount = partners.filter((p) => p.status === "active" && p.active).length;

  const filteredPartners = partners.filter(
    (p) =>
      p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.phone && p.phone.includes(searchTerm)),
  );

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl bg-gradient-to-r from-[#0F3D24] via-[#165232] to-[#0F3D24] p-6 text-white shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-[#a8e6a8]">
              <Handshake size={18} />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#a8e6a8]">
              Investor Relations & Transparency
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">For Partners</h2>
          <p className="max-w-2xl text-xs text-white/80">
            Manage your partners and investors, track their capital, key in dedicated expenses & sales, and log live farm activities so they have complete visibility in their Partners Account.
          </p>
        </div>

        {role === "owner" && (
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 self-start rounded-full bg-[#3F8F3F] px-5 py-3 text-xs font-bold text-white shadow-lg transition hover:bg-[#4ea94e] hover:shadow-xl"
          >
            <Plus size={16} /> Register New Partner
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#0F3D24]/10">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F3D24]/60">
              Total Partner Capital
            </span>
            <div className="rounded-xl bg-[#0F3D24]/10 p-2 text-[#0F3D24]">
              <Wallet size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-[#0F3D24]">{naira(totalCapitalInvested)}</div>
          <span className="text-[10px] text-slate-500 font-medium">Cumulative investment received</span>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#0F3D24]/10">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F3D24]/60">
              Active Partners
            </span>
            <div className="rounded-xl bg-blue-50 p-2 text-blue-700">
              <Users size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-blue-900">{activePartnersCount} / {partners.length}</div>
          <span className="text-[10px] text-slate-500 font-medium">Active investor cycles</span>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#0F3D24]/10">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F3D24]/60">
              Partner Expenses Keyed
            </span>
            <div className="rounded-xl bg-rose-50 p-2 text-rose-700">
              <Receipt size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-rose-900">{naira(totalExpenses)}</div>
          <span className="text-[10px] text-slate-500 font-medium">Feed, DOC, vaccines, care</span>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#0F3D24]/10">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F3D24]/60">
              Partner Revenue Keyed
            </span>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-900">{naira(totalIncome)}</div>
          <span className="text-[10px] text-slate-500 font-medium">Recorded bird offload sales</span>
        </div>
      </div>

      {/* Main Workspace: Either Partner Detail OR Partners Directory */}
      {selectedPartnerId ? (
        <PartnerDetailView
          passcode={passcode}
          partnerId={selectedPartnerId}
          batches={batches}
          onBack={() => {
            setSelectedPartnerId(null);
            qc.invalidateQueries({ queryKey: ["admin-partners"] });
          }}
        />
      ) : (
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/10 space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-[#0F3D24]">All Partners Over Time</h3>
              <p className="text-xs text-[#0F3D24]/65">
                Click any partner to open their dedicated ledger, key in expenses/income, or log daily activities.
              </p>
            </div>
            <div className="w-full sm:w-72">
              <input
                type="text"
                placeholder="Search by name, username, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-full border border-slate-200 bg-[#F7F5F0]/60 px-4 py-2 text-xs font-medium text-[#0F3D24] outline-none focus:border-[#3F8F3F] focus:bg-white"
              />
            </div>
          </div>

          {partnersQuery.isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin text-[#3F8F3F]" size={32} />
            </div>
          ) : filteredPartners.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
              <Handshake className="mx-auto text-slate-400" size={40} />
              <h4 className="mt-3 text-base font-bold text-slate-700">No Partners Found</h4>
              <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                {searchTerm
                  ? "No partners match your search criteria. Try a different query."
                  : "You have not registered any partners yet. Click 'Register New Partner' above to add your first investor."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPartners.map((partner) => (
                <div
                  key={partner.id}
                  onClick={() => setSelectedPartnerId(partner.id)}
                  className="group relative cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-[#3F8F3F]/50 hover:shadow-md flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#3F8F3F]">
                          {partner.projectName}
                        </span>
                        <h4 className="text-base font-black text-[#0F3D24] group-hover:text-[#3F8F3F] transition-colors">
                          {partner.fullName}
                        </h4>
                        <div className="text-[11px] font-medium text-slate-500">
                          @{partner.username} · {partner.phone}
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                          partner.status === "active"
                            ? "bg-emerald-100 text-emerald-800"
                            : partner.status === "matured"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {partner.status}
                      </span>
                    </div>

                    <div className="rounded-xl bg-[#F7F5F0] p-3 text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Invested Capital:</span>
                        <strong className="text-[#0F3D24] font-bold">{naira(partner.initialInvestment)}</strong>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Investment Date:</span>
                        <span className="font-semibold text-slate-800">{partner.investmentDate}</span>
                      </div>
                      {partner.targetRoiPercentage > 0 && (
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Target ROI:</span>
                          <span className="font-bold text-emerald-700">+{partner.targetRoiPercentage}%</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center text-xs pt-1">
                      <div className="rounded-xl bg-rose-50/70 p-2 border border-rose-100">
                        <span className="text-[10px] font-bold uppercase text-rose-800 block">Expenses</span>
                        <strong className="text-rose-950 font-black">{naira(partner.totalExpenses)}</strong>
                      </div>
                      <div className="rounded-xl bg-emerald-50/70 p-2 border border-emerald-100">
                        <span className="text-[10px] font-bold uppercase text-emerald-800 block">Revenue</span>
                        <strong className="text-emerald-950 font-black">{naira(partner.totalIncome)}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#3F8F3F]">
                    <span>Open Partner Workspace</span>
                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Register New Partner Modal */}
      {isAddModalOpen && (
        <AddPartnerModal
          passcode={passcode}
          batches={batches}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            setIsAddModalOpen(false);
            qc.invalidateQueries({ queryKey: ["admin-partners"] });
          }}
        />
      )}
    </div>
  );
}

// ─── PARTNER DETAIL WORKSPACE COMPONENT ────────────────────────────────────────

function PartnerDetailView({
  passcode,
  partnerId,
  batches,
  onBack,
}: {
  passcode: string;
  partnerId: string;
  batches: any[];
  onBack: () => void;
}) {
  const qc = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState<"financials" | "activities" | "credentials">("financials");

  const getPartnerDetailFn = useServerFn(adminGetPartnerDetail);
  const detailQuery = useQuery({
    queryKey: ["admin-partner-detail", passcode, partnerId],
    queryFn: () => getPartnerDetailFn({ data: { passcode, partnerId } }),
    staleTime: 5_000,
  });

  const partner = detailQuery.data?.partner;
  const financials = detailQuery.data?.financials || [];
  const activities = detailQuery.data?.activities || [];

  if (detailQuery.isLoading) {
    return (
      <div className="rounded-3xl bg-white p-12 text-center shadow-sm">
        <Loader2 className="mx-auto animate-spin text-[#3F8F3F]" size={36} />
        <p className="mt-3 text-xs text-slate-500 font-semibold">Loading partner workspace...</p>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="rounded-3xl bg-white p-12 text-center shadow-sm">
        <AlertTriangle className="mx-auto text-amber-500" size={36} />
        <p className="mt-2 text-sm font-bold text-slate-800">Partner not found.</p>
        <button
          onClick={onBack}
          className="mt-4 rounded-full bg-[#0F3D24] px-5 py-2 text-xs font-bold text-white"
        >
          Return to Partners List
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation & Profile Card */}
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/10 space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-[#3F8F3F] hover:underline"
        >
          <ArrowLeft size={15} /> Back to All Partners
        </button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#3F8F3F] bg-[#3F8F3F]/10 px-2.5 py-0.5 rounded-full">
                {partner.projectName}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                  partner.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-800"
                }`}
              >
                {partner.status}
              </span>
            </div>
            <h2 className="text-2xl font-black text-[#0F3D24]">{partner.fullName}</h2>
            <p className="text-xs text-slate-600">
              Username: <strong className="font-mono text-[#0F3D24]">@{partner.username}</strong> · Phone: {partner.phone}
              {partner.email && ` · Email: ${partner.email}`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl bg-[#0F3D24]/5 px-4 py-2.5 border border-[#0F3D24]/10 text-right">
              <div className="text-[10px] font-bold uppercase text-slate-500">Capital Invested</div>
              <div className="text-lg font-black text-[#0F3D24]">{naira(partner.initialInvestment)}</div>
            </div>
            <div className="rounded-2xl bg-emerald-50 px-4 py-2.5 border border-emerald-200 text-right">
              <div className="text-[10px] font-bold uppercase text-emerald-700">Net Profit to Date</div>
              <div className="text-lg font-black text-emerald-950">{naira(partner.netProfit)}</div>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-2">
          <button
            type="button"
            onClick={() => setActiveSubTab("financials")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeSubTab === "financials"
                ? "bg-[#0F3D24] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Receipt size={14} /> Key In Expenses & Income ({financials.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("activities")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeSubTab === "activities"
                ? "bg-[#0F3D24] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Activity size={14} /> Key In Daily Activities & Stock ({activities.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("credentials")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeSubTab === "credentials"
                ? "bg-[#0F3D24] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <KeyRound size={14} /> Partner Account & Portal Access
          </button>
        </div>
      </div>

      {/* Tab 1: Financials (Expenses & Income) */}
      {activeSubTab === "financials" && (
        <PartnerFinancialsSubPanel
          passcode={passcode}
          partner={partner}
          financials={financials}
          batches={batches}
          onRefresh={() => qc.invalidateQueries({ queryKey: ["admin-partner-detail", passcode, partnerId] })}
        />
      )}

      {/* Tab 2: Activities & Stock Logs */}
      {activeSubTab === "activities" && (
        <PartnerActivitiesSubPanel
          passcode={passcode}
          partner={partner}
          activities={activities}
          batches={batches}
          onRefresh={() => qc.invalidateQueries({ queryKey: ["admin-partner-detail", passcode, partnerId] })}
        />
      )}

      {/* Tab 3: Credentials & Settings */}
      {activeSubTab === "credentials" && (
        <PartnerCredentialsSubPanel
          passcode={passcode}
          partner={partner}
          onRefresh={() => qc.invalidateQueries({ queryKey: ["admin-partner-detail", passcode, partnerId] })}
          onDeleted={onBack}
        />
      )}
    </div>
  );
}

// ─── SUBPANEL: FINANCIALS KEYING ──────────────────────────────────────────────

function PartnerFinancialsSubPanel({
  passcode,
  partner,
  financials,
  batches,
  onRefresh,
}: {
  passcode: string;
  partner: FarmPartner;
  financials: PartnerFinancial[];
  batches: any[];
  onRefresh: () => void;
}) {
  const recordFinancialFn = useServerFn(adminRecordPartnerFinancial);
  const deleteFinancialFn = useServerFn(adminDeletePartnerFinancial);

  const [type, setType] = useState<"expense" | "income">("expense");
  const [category, setCategory] = useState("Feed & Nutrition");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [referenceNo, setReferenceNo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = Number(amount);
    if (!numAmt || numAmt <= 0) {
      setMsg("Please enter a valid amount.");
      return;
    }
    if (!description.trim()) {
      setMsg("Please enter a description.");
      return;
    }

    setSubmitting(true);
    setMsg(null);
    try {
      await recordFinancialFn({
        data: {
          passcode,
          partnerId: partner.id,
          batchId: partner.batchId,
          type,
          category,
          amount: numAmt,
          description: description.trim(),
          paymentMethod,
          transactionDate,
          referenceNo: referenceNo.trim() || null,
        },
      });
      setAmount("");
      setDescription("");
      setReferenceNo("");
      setMsg("Financial entry saved successfully.");
      setTimeout(() => setMsg(null), 3000);
      onRefresh();
    } catch (err: any) {
      setMsg(err instanceof Error ? err.message : "Could not record financial entry.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this financial record?")) return;
    try {
      await deleteFinancialFn({ data: { passcode, financialId: id } });
      onRefresh();
    } catch (err: any) {
      alert(err instanceof Error ? err.message : "Could not delete entry.");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Key In Form */}
      <div className="lg:col-span-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/10 space-y-4">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#3F8F3F]">
            Direct Key-In
          </span>
          <h3 className="text-base font-black text-[#0F3D24]">Record Financial Entry</h3>
          <p className="text-xs text-slate-500">
            Transactions keyed here immediately reflect in {partner.fullName}'s transparent portal.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          {/* Expense / Income Toggle */}
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#F7F5F0] p-1">
            <button
              type="button"
              onClick={() => {
                setType("expense");
                setCategory("Feed & Nutrition");
              }}
              className={`rounded-lg py-2 font-bold transition ${
                type === "expense" ? "bg-rose-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Expense (Cost)
            </button>
            <button
              type="button"
              onClick={() => {
                setType("income");
                setCategory("Bird Offload / Sales");
              }}
              className={`rounded-lg py-2 font-bold transition ${
                type === "income" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Income (Revenue)
            </button>
          </div>

          <div>
            <label className="block font-bold text-[#0F3D24] mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-[#0F3D24]"
            >
              {type === "expense" ? (
                <>
                  <option value="Day-Old Chicks (DOC)">Day-Old Chicks (DOC)</option>
                  <option value="Feed & Nutrition">Feed & Nutrition</option>
                  <option value="Medication & Vaccines">Medication & Vaccines</option>
                  <option value="Energy & Gas Heating">Energy & Gas Heating</option>
                  <option value="Bedding / Wood Shavings">Bedding / Wood Shavings</option>
                  <option value="Farm Labor">Farm Labor</option>
                  <option value="Processing & Packaging">Processing & Packaging</option>
                  <option value="Logistics & Delivery">Logistics & Delivery</option>
                  <option value="Other Expense">Other Expense</option>
                </>
              ) : (
                <>
                  <option value="Bird Offload / Sales">Bird Offload / Sales</option>
                  <option value="Eggs / Produce Sales">Eggs / Produce Sales</option>
                  <option value="Manure / By-Product Sales">Manure / By-Product Sales</option>
                  <option value="Capital Repayment / Payout">Capital Repayment / Payout</option>
                  <option value="Other Revenue">Other Revenue</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="block font-bold text-[#0F3D24] mb-1">Amount (₦) *</label>
            <input
              type="number"
              required
              min={1}
              placeholder="e.g. 150000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold text-[#0F3D24] outline-none focus:border-[#3F8F3F]"
            />
          </div>

          <div>
            <label className="block font-bold text-[#0F3D24] mb-1">Description *</label>
            <input
              type="text"
              required
              placeholder="e.g. 50 bags Broiler Finisher feed purchased"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[#0F3D24] outline-none focus:border-[#3F8F3F]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-[#0F3D24] mb-1">Date</label>
              <input
                type="date"
                required
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-medium text-[#0F3D24]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#0F3D24] mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-2 py-2 font-medium text-[#0F3D24]"
              >
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
                <option value="POS">POS</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#0F3D24] mb-1">Reference / Receipt No. (Optional)</label>
            <input
              type="text"
              placeholder="e.g. TRF-9823412"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[#0F3D24] outline-none"
            />
          </div>

          {msg && (
            <div
              className={`rounded-xl p-2.5 text-xs font-semibold ${
                msg.includes("successfully") ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
              }`}
            >
              {msg}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-[#0F3D24] py-2.5 font-bold text-white hover:bg-[#165232] disabled:opacity-50 transition"
          >
            {submitting ? "Recording..." : "Record Transaction"}
          </button>
        </form>
      </div>

      {/* Financial Ledger Table */}
      <div className="lg:col-span-8 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/10 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-[#0F3D24]">Itemized Investment Ledger</h3>
            <p className="text-xs text-slate-500">Every naira recorded for this investment.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-800">
              Total Costs: {naira(partner.totalExpenses)}
            </span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
              Total Inflows: {naira(partner.totalIncome)}
            </span>
          </div>
        </div>

        {financials.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
            No financial entries have been recorded yet for this partner. Use the form on the left to key in expenses or revenue.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5">Date</th>
                  <th className="py-2.5">Type</th>
                  <th className="py-2.5">Category</th>
                  <th className="py-2.5">Description</th>
                  <th className="py-2.5 text-right">Amount</th>
                  <th className="py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {financials.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 font-medium text-slate-600 whitespace-nowrap">{row.transactionDate}</td>
                    <td className="py-2.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                          row.type === "expense" ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {row.type}
                      </span>
                    </td>
                    <td className="py-2.5 font-bold text-[#0F3D24]">{row.category}</td>
                    <td className="py-2.5 text-slate-700 max-w-xs truncate">{row.description}</td>
                    <td
                      className={`py-2.5 text-right font-black ${
                        row.type === "expense" ? "text-rose-700" : "text-emerald-700"
                      }`}
                    >
                      {row.type === "expense" ? "-" : "+"}
                      {naira(row.amount)}
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(row.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        title="Delete entry"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SUBPANEL: ACTIVITIES KEYING ──────────────────────────────────────────────

function PartnerActivitiesSubPanel({
  passcode,
  partner,
  activities,
  batches,
  onRefresh,
}: {
  passcode: string;
  partner: FarmPartner;
  activities: PartnerActivity[];
  batches: any[];
  onRefresh: () => void;
}) {
  const recordActivityFn = useServerFn(adminRecordPartnerActivity);
  const deleteActivityFn = useServerFn(adminDeletePartnerActivity);

  const [activityDate, setActivityDate] = useState(new Date().toISOString().slice(0, 10));
  const [activityType, setActivityType] = useState<PartnerActivity["activityType"]>("Feeding");
  const [stockHeadcount, setStockHeadcount] = useState("0");
  const [mortalityCount, setMortalityCount] = useState("0");
  const [causeOfMortality, setCauseOfMortality] = useState("");
  const [feedConsumedKg, setFeedConsumedKg] = useState("0");
  const [averageWeightKg, setAverageWeightKg] = useState("0");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    try {
      await recordActivityFn({
        data: {
          passcode,
          partnerId: partner.id,
          batchId: partner.batchId,
          activityDate,
          activityType,
          stockHeadcount: Number(stockHeadcount) || 0,
          mortalityCount: Number(mortalityCount) || 0,
          causeOfMortality: causeOfMortality.trim() || null,
          feedConsumedKg: Number(feedConsumedKg) || 0,
          averageWeightKg: Number(averageWeightKg) || 0,
          notes: notes.trim() || null,
        },
      });
      setStockHeadcount("0");
      setMortalityCount("0");
      setCauseOfMortality("");
      setFeedConsumedKg("0");
      setAverageWeightKg("0");
      setNotes("");
      setMsg("Activity log recorded successfully.");
      setTimeout(() => setMsg(null), 3000);
      onRefresh();
    } catch (err: any) {
      setMsg(err instanceof Error ? err.message : "Could not record activity.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this activity log?")) return;
    try {
      await deleteActivityFn({ data: { passcode, activityId: id } });
      onRefresh();
    } catch (err: any) {
      alert(err instanceof Error ? err.message : "Could not delete activity.");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Form */}
      <div className="lg:col-span-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/10 space-y-4">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#3F8F3F]">
            Farm Transparency
          </span>
          <h3 className="text-base font-black text-[#0F3D24]">Log Farm Activity / Stock</h3>
          <p className="text-xs text-slate-500">
            Log birds stocked, feeding, mortality, and health updates for {partner.fullName}.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-[#0F3D24] mb-1">Activity Date *</label>
            <input
              type="date"
              required
              value={activityDate}
              onChange={(e) => setActivityDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-medium text-[#0F3D24]"
            />
          </div>

          <div>
            <label className="block font-bold text-[#0F3D24] mb-1">Activity Type *</label>
            <select
              value={activityType}
              onChange={(e) => setActivityType(e.target.value as any)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-[#0F3D24]"
            >
              <option value="Stock / Birds Received">Stock / Birds Received (DOCs)</option>
              <option value="Feeding">Feeding Log</option>
              <option value="Mortality Record">Mortality Record</option>
              <option value="Weight Check">Weight Check / Sampling</option>
              <option value="Medication / Vaccination">Medication / Vaccination</option>
              <option value="Cleaning & Sanitation">Cleaning & Sanitation</option>
              <option value="Harvest & Sales Offload">Harvest & Sales Offload</option>
              <option value="General Note">General Farm Note</option>
            </select>
          </div>

          {activityType === "Stock / Birds Received" && (
            <div>
              <label className="block font-bold text-[#0F3D24] mb-1">Birds Received / Stocked (Headcount)</label>
              <input
                type="number"
                min={1}
                value={stockHeadcount}
                onChange={(e) => setStockHeadcount(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold text-[#0F3D24]"
              />
            </div>
          )}

          {activityType === "Feeding" && (
            <div>
              <label className="block font-bold text-[#0F3D24] mb-1">Feed Consumed Today (Kg)</label>
              <input
                type="number"
                step="0.1"
                min={0}
                value={feedConsumedKg}
                onChange={(e) => setFeedConsumedKg(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold text-[#0F3D24]"
              />
            </div>
          )}

          {activityType === "Mortality Record" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-rose-800 mb-1">Mortality Count</label>
                <input
                  type="number"
                  min={1}
                  value={mortalityCount}
                  onChange={(e) => setMortalityCount(e.target.value)}
                  className="w-full rounded-xl border border-rose-300 bg-rose-50/50 px-3 py-2 font-bold text-rose-900"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Suspected Cause</label>
                <input
                  type="text"
                  placeholder="e.g. Weak chick"
                  value={causeOfMortality}
                  onChange={(e) => setCauseOfMortality(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800"
                />
              </div>
            </div>
          )}

          {activityType === "Weight Check" && (
            <div>
              <label className="block font-bold text-[#0F3D24] mb-1">Average Weight (Kg)</label>
              <input
                type="number"
                step="0.01"
                min={0}
                placeholder="e.g. 2.45"
                value={averageWeightKg}
                onChange={(e) => setAverageWeightKg(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold text-[#0F3D24]"
              />
            </div>
          )}

          <div>
            <label className="block font-bold text-[#0F3D24] mb-1">Notes / Observation Details</label>
            <textarea
              rows={3}
              placeholder="e.g. Birds are active, pen temperature at 31C, healthy feeding behavior..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[#0F3D24] outline-none"
            />
          </div>

          {msg && (
            <div
              className={`rounded-xl p-2.5 text-xs font-semibold ${
                msg.includes("successfully") ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
              }`}
            >
              {msg}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-[#0F3D24] py-2.5 font-bold text-white hover:bg-[#165232] disabled:opacity-50 transition"
          >
            {submitting ? "Logging..." : "Log Activity"}
          </button>
        </form>
      </div>

      {/* Activities Timeline */}
      <div className="lg:col-span-8 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/10 space-y-4">
        <div>
          <h3 className="text-base font-black text-[#0F3D24]">Live Activity Timeline</h3>
          <p className="text-xs text-slate-500">Chronological farm logs shared with the partner.</p>
        </div>

        {activities.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
            No activity logs have been recorded for this partner yet. Use the form on the left to log feeding, mortality, or stock arrivals.
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((act) => (
              <div
                key={act.id}
                className="flex items-start justify-between rounded-2xl border border-slate-200 bg-[#F7F5F0]/50 p-4 transition-all hover:bg-[#F7F5F0]"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500">{act.activityDate}</span>
                    <span className="inline-flex items-center rounded-full bg-[#3F8F3F]/15 px-2.5 py-0.5 text-[10px] font-extrabold text-[#0F3D24]">
                      {act.activityType}
                    </span>
                    {act.mortalityCount > 0 && (
                      <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-extrabold text-rose-800">
                        {act.mortalityCount} Mortality
                      </span>
                    )}
                    {act.stockHeadcount > 0 && (
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-extrabold text-blue-800">
                        +{act.stockHeadcount} Birds Stocked
                      </span>
                    )}
                  </div>
                  {act.notes && <p className="text-xs font-medium text-slate-800">{act.notes}</p>}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                    {act.feedConsumedKg > 0 && <span>Feed: <strong>{act.feedConsumedKg} kg</strong></span>}
                    {act.averageWeightKg > 0 && <span>Avg Weight: <strong>{act.averageWeightKg} kg</strong></span>}
                    {act.causeOfMortality && <span>Cause: {act.causeOfMortality}</span>}
                    <span>Recorded by: @{act.recordedBy || "owner"}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(act.id)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                  title="Delete log"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SUBPANEL: CREDENTIALS & SETTINGS ─────────────────────────────────────────

function PartnerCredentialsSubPanel({
  passcode,
  partner,
  onRefresh,
  onDeleted,
}: {
  passcode: string;
  partner: FarmPartner;
  onRefresh: () => void;
  onDeleted: () => void;
}) {
  const resetPasscodeFn = useServerFn(adminResetPartnerPasscode);
  const toggleActiveFn = useServerFn(adminTogglePartnerActive);
  const deletePartnerFn = useServerFn(adminDeletePartner);

  const [newPassword, setNewPassword] = useState("");
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [copied, setCopied] = useState(false);

  const portalUrl = typeof window !== "undefined" ? `${window.location.origin}/for-partners` : "/for-partners";

  const handleResetPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.trim().length < 6) {
      setResetMsg("Password must be at least 6 characters.");
      return;
    }
    setResetting(true);
    setResetMsg(null);
    try {
      await resetPasscodeFn({
        data: {
          passcode,
          partnerId: partner.id,
          newPassword: newPassword.trim(),
        },
      });
      setNewPassword("");
      setResetMsg("Partner password reset successfully!");
      setTimeout(() => setResetMsg(null), 3500);
      onRefresh();
    } catch (err: any) {
      setResetMsg(err instanceof Error ? err.message : "Could not reset password.");
    } finally {
      setResetting(false);
    }
  };

  const handleToggleActive = async () => {
    try {
      await toggleActiveFn({
        data: {
          passcode,
          partnerId: partner.id,
          active: !partner.active,
        },
      });
      onRefresh();
    } catch (err: any) {
      alert(err instanceof Error ? err.message : "Could not update status.");
    }
  };

  const handleDeletePartner = async () => {
    if (
      !confirm(
        `Are you completely sure you want to delete ${partner.fullName}? All associated financial entries and activity logs will also be permanently removed.`,
      )
    )
      return;

    try {
      await deletePartnerFn({ data: { passcode, partnerId: partner.id } });
      onDeleted();
    } catch (err: any) {
      alert(err instanceof Error ? err.message : "Could not delete partner.");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Portal Credentials Card */}
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/10 space-y-4">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#3F8F3F]">
            Partner Login Credentials
          </span>
          <h3 className="text-base font-black text-[#0F3D24]">Portal Access Info</h3>
          <p className="text-xs text-slate-500">
            Share these login credentials with {partner.fullName} so they can access their Partners Account.
          </p>
        </div>

        <div className="rounded-2xl bg-[#F7F5F0] p-4 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Portal Login URL:</span>
            <span className="font-mono font-bold text-[#0F3D24]">{portalUrl}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Username:</span>
            <span className="font-mono font-extrabold text-[#0F3D24]">@{partner.username}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Account Status:</span>
            <span className={`font-bold ${partner.active ? "text-emerald-700" : "text-rose-700"}`}>
              {partner.active ? "Active & Authorized" : "Deactivated / Locked"}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(
                `Dignity Agro Farms Partner Portal\nURL: ${portalUrl}\nUsername: ${partner.username}\n(Please use your assigned password to login)`,
              );
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-[#0F3D24] hover:bg-slate-50 transition shadow-sm"
          >
            <Copy size={13} /> {copied ? "Copied Access Info!" : "Copy Portal Access Info"}
          </button>
          <button
            type="button"
            onClick={handleToggleActive}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition shadow-sm ${
              partner.active
                ? "bg-amber-100 text-amber-900 hover:bg-amber-200"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            }`}
          >
            {partner.active ? "Deactivate Account" : "Activate Account"}
          </button>
        </div>

        {/* Reset Password Form */}
        <form onSubmit={handleResetPasscode} className="space-y-3 pt-3 border-t border-slate-100 text-xs">
          <label className="block font-bold text-[#0F3D24]">Reset Partner Password</label>
          <div className="flex gap-2">
            <input
              type="password"
              placeholder="Enter new 6+ char password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[#0F3D24] outline-none focus:border-[#3F8F3F]"
            />
            <button
              type="submit"
              disabled={resetting}
              className="rounded-xl bg-[#0F3D24] px-4 py-2 font-bold text-white hover:bg-[#165232] disabled:opacity-50 transition shadow-sm"
            >
              {resetting ? "Saving..." : "Update Password"}
            </button>
          </div>
          {resetMsg && (
            <div
              className={`rounded-xl p-2.5 text-xs font-semibold ${
                resetMsg.includes("successfully") ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
              }`}
            >
              {resetMsg}
            </div>
          )}
        </form>
      </div>

      {/* Contract & Agreement Card */}
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/10 space-y-4 flex flex-col justify-between">
        <div className="space-y-3">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#3F8F3F]">
              Investment Terms
            </span>
            <h3 className="text-base font-black text-[#0F3D24]">Agreement & Notes</h3>
          </div>

          <div className="rounded-2xl bg-[#F7F5F0] p-4 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold">Investment Date:</span>
              <span className="font-bold text-[#0F3D24]">{partner.investmentDate}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold">Target ROI:</span>
              <span className="font-bold text-emerald-700">{partner.targetRoiPercentage}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold">Associated Batch:</span>
              <span className="font-bold text-[#0F3D24]">{partner.batchName || "Unlinked / Dedicated Project"}</span>
            </div>
            <div className="pt-2 border-t border-slate-200">
              <span className="text-slate-500 font-semibold block mb-1">Agreed Terms & Notes:</span>
              <p className="text-slate-800 whitespace-pre-wrap">{partner.agreedTerms || "No specific terms written."}</p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleDeletePartner}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-800 hover:underline"
          >
            <Trash2 size={14} /> Permanently Delete Partner & Records
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL: REGISTER NEW PARTNER ──────────────────────────────────────────────

function AddPartnerModal({
  passcode,
  batches,
  onClose,
  onSuccess,
}: {
  passcode: string;
  batches: any[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const createPartnerFn = useServerFn(adminCreatePartner);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [projectName, setProjectName] = useState("Broiler Cycle Partnership");
  const [initialInvestment, setInitialInvestment] = useState("");
  const [investmentDate, setInvestmentDate] = useState(new Date().toISOString().slice(0, 10));
  const [targetRoiPercentage, setTargetRoiPercentage] = useState("25");
  const [agreedTerms, setAgreedTerms] = useState("");
  const [batchId, setBatchId] = useState<string>("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numCapital = Number(initialInvestment);
    if (!fullName.trim()) return setErrorMsg("Please enter the partner's full name.");
    if (!phone.trim()) return setErrorMsg("Please enter a phone number.");
    if (isNaN(numCapital) || numCapital < 0) return setErrorMsg("Please enter a valid investment amount.");
    if (!username.trim() || username.trim().length < 3) return setErrorMsg("Username must be at least 3 characters.");
    if (!password.trim() || password.trim().length < 6) return setErrorMsg("Password must be at least 6 characters.");

    setSubmitting(true);
    setErrorMsg(null);
    try {
      await createPartnerFn({
        data: {
          passcode,
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          address: address.trim() || null,
          projectName: projectName.trim(),
          initialInvestment: numCapital,
          investmentDate,
          targetRoiPercentage: Number(targetRoiPercentage) || 0,
          agreedTerms: agreedTerms.trim() || null,
          batchId: batchId || null,
          username: username.trim().toLowerCase(),
          password: password.trim(),
        },
      });
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err instanceof Error ? err.message : "Could not register partner.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl ring-1 ring-[#0F3D24]/10 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#0F3D24] px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#3F8F3F]">
              <Handshake size={18} />
            </div>
            <div>
              <h3 className="text-base font-extrabold">Register New Partner</h3>
              <p className="text-[11px] text-white/70">Create an investor profile and portal login.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/10 p-2 text-white/80 hover:bg-white/20"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form id="add-partner-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block font-bold text-[#0F3D24] mb-1">Partner Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Chief Emeka Okafor"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-[#F7F5F0]/50 px-3.5 py-2 font-medium text-[#0F3D24] outline-none focus:border-[#3F8F3F]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#0F3D24] mb-1">Phone Number *</label>
              <input
                type="tel"
                required
                placeholder="e.g. 0803 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-[#F7F5F0]/50 px-3.5 py-2 font-medium text-[#0F3D24] outline-none focus:border-[#3F8F3F]"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block font-bold text-[#0F3D24] mb-1">Email Address (Optional)</label>
              <input
                type="email"
                placeholder="e.g. emeka@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-[#F7F5F0]/50 px-3.5 py-2 text-[#0F3D24] outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-[#0F3D24] mb-1">Location / City</label>
              <input
                type="text"
                placeholder="e.g. Owerri / Lagos"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-[#F7F5F0]/50 px-3.5 py-2 text-[#0F3D24] outline-none"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="block font-bold text-[#0F3D24] mb-1">Capital Invested (₦) *</label>
              <input
                type="number"
                required
                min={0}
                placeholder="e.g. 2500000"
                value={initialInvestment}
                onChange={(e) => setInitialInvestment(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-[#F7F5F0]/50 px-3.5 py-2 font-bold text-[#0F3D24] outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-[#0F3D24] mb-1">Investment Date *</label>
              <input
                type="date"
                required
                value={investmentDate}
                onChange={(e) => setInvestmentDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-[#F7F5F0]/50 px-3.5 py-2 font-medium text-[#0F3D24]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#0F3D24] mb-1">Target ROI (%)</label>
              <input
                type="number"
                min={0}
                max={500}
                placeholder="e.g. 25"
                value={targetRoiPercentage}
                onChange={(e) => setTargetRoiPercentage(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-[#F7F5F0]/50 px-3.5 py-2 font-bold text-emerald-700 outline-none"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block font-bold text-[#0F3D24] mb-1">Investment Project Name</label>
              <input
                type="text"
                required
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-[#F7F5F0]/50 px-3.5 py-2 font-semibold text-[#0F3D24]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#0F3D24] mb-1">Link to Farm Batch (Optional)</label>
              <select
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-[#F7F5F0]/50 px-3.5 py-2 font-medium text-[#0F3D24]"
              >
                <option value="">No linked batch (independent slot)</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.batchName} ({b.batchType} · {b.currentHeadcount} birds)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#0F3D24] mb-1">Contract / Agreed Terms & Notes</label>
            <textarea
              rows={2}
              placeholder="e.g. 6-week broiler cycle, 25% profit share on harvest offload, capital returning at maturity..."
              value={agreedTerms}
              onChange={(e) => setAgreedTerms(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-[#F7F5F0]/50 px-3.5 py-2 text-[#0F3D24] outline-none"
            />
          </div>

          {/* Portal Login Credentials Section */}
          <div className="rounded-2xl border border-[#3F8F3F]/30 bg-[#3F8F3F]/5 p-3.5 space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#3F8F3F] block">
              Partner Portal Login Account
            </span>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block font-bold text-[#0F3D24] mb-1">Portal Username *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. emeka_okafor"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ""))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono font-bold text-[#0F3D24]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#0F3D24] mb-1">Initial Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[#0F3D24]"
                />
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">
              {errorMsg}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-partner-form"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-full bg-[#0F3D24] px-6 py-2 text-xs font-extrabold text-white shadow-md hover:bg-[#165232] disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Registering...
              </>
            ) : (
              <>
                <Plus size={14} /> Complete Registration
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
