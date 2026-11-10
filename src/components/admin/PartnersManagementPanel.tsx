import React, { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  Handshake,
  Plus,
  Users,
  Wallet,
  TrendingUp,
  TrendingDown,
  Receipt,
  Activity,
  ArrowLeft,
  KeyRound,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Copy,
  ChevronRight,
  Lock,
  Unlock,
  BarChart3,
  Banknote,
  Pencil,
  FileDown,
  Download,
  ChevronDown,
  ChevronLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Sparkles,
  Eye,
  EyeOff,
  Check,
  Share2,
  ExternalLink,
  ShieldCheck,
  FileCheck2,
  Layers,
  RefreshCw,
  MessageCircle,
  Upload,
  Award,
  Clock,
  X,
} from "lucide-react";
import {
  adminListPartners,
  adminGetPartnerDetail,
  adminCreatePartner,
  adminUpdatePartner,
  adminClosePartnerCycle,
  adminReopenPartnerCycle,
  adminResetPartnerPasscode,
  adminTogglePartnerActive,
  adminDeletePartner,
  adminRecordPartnerFinancial,
  adminDeletePartnerFinancial,
  adminRecordPartnerActivity,
  adminDeletePartnerActivity,
  adminGetPartnerSettings,
  adminSetPartnerManagerVisibility,
  type FarmPartner,
  type PartnerFinancial,
  type PartnerActivity,
  type PartnerDashboardSummary,
} from "@/lib/partners.functions";
import { buildChartData } from "@/lib/partner-settlement";
import { adminListBatches } from "@/lib/farm.functions";
import type { AdminRole } from "@/lib/orders.functions";
import { PartnerCharts } from "@/components/partners/PartnerCharts";
import {
  TermsBanner,
  ResultHero,
  SettlementBreakdown,
  PayoutTracker,
  HowCalculated,
  AuditTimeline,
  AgreementCard,
  SignAgreementModal,
  UploadWrittenAgreementModal,
  UnitEconomicsStrip,
  CycleElectionCard,
  CycleSwitcherBar,
  PartnershipCertificateModal,
  EvidenceLightboxModal,
} from "@/components/partners/PartnerSettlementCards";
import {
  ExecutivePortfolioStrip,
  PendingPartnerApprovalsBanner,
  RolloverCycleModal,
  BatchSyncModal,
  WeeklyWhatsAppDigestModal,
} from "@/components/admin/PartnerOperationsModals";
import { exportPartnerReportPDF, exportPartnerReportCSV } from "@/lib/partner-report-export";

const naira = (n: number) => "\u20a6" + Math.round(n || 0).toLocaleString("en-NG");
const signedNaira = (n: number) => (n > 0 ? "+" : n < 0 ? "-" : "") + naira(Math.abs(n));

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
  const [editingPartner, setEditingPartner] = useState<FarmPartner | null>(null);
  const [createdPartnerInfo, setCreatedPartnerInfo] = useState<{
    id: string;
    fullName: string;
    username: string;
    password: string;
    capital: number;
    profitPct: number;
    lossPct: number;
    cycleName: string;
  } | null>(null);

  const effectiveRole: "owner" | "manager" = role === "manager" ? "manager" : "owner";

  const listPartnersFn = useServerFn(adminListPartners);
  const listBatchesFn = useServerFn(adminListBatches);
  const deletePartnerFn = useServerFn(adminDeletePartner);
  const getPartnerSettingsFn = useServerFn(adminGetPartnerSettings);
  const setPartnerManagerVisibilityFn = useServerFn(adminSetPartnerManagerVisibility);

  const partnersQuery = useQuery({
    queryKey: ["admin-partners", passcode],
    queryFn: () => listPartnersFn({ data: { passcode } }),
    staleTime: 15_000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });

  const batchesQuery = useQuery({
    queryKey: ["admin-batches", passcode],
    queryFn: () => listBatchesFn({ data: { passcode } }),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });

  const partnerSettingsQuery = useQuery({
    queryKey: ["admin-partner-settings", passcode],
    queryFn: () => getPartnerSettingsFn({ data: { passcode } }),
    staleTime: 15_000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });

  const isHiddenFromManager = partnerSettingsQuery.data?.hideFromManager ?? false;
  const [isTogglingVisibility, setIsTogglingVisibility] = useState(false);

  const handleToggleManagerVisibility = async () => {
    if (effectiveRole !== "owner") return;
    const targetHide = !isHiddenFromManager;
    const confirmationPrompt = targetHide
      ? "Hide Partner Dashboard from Manager?\n\nThe Farm Manager will not see the 'For Partners' tab and will not be able to view any partner details, capital, or agreements."
      : "Allow Manager Access to Partners?\n\nThe Farm Manager will be able to see the 'For Partners' tab and submit operational logs (which will still require Farm Owner verification).";

    if (!confirm(confirmationPrompt)) {
      return;
    }

    try {
      setIsTogglingVisibility(true);
      await setPartnerManagerVisibilityFn({
        data: { passcode, hide: targetHide },
      });
      await qc.invalidateQueries({ queryKey: ["admin-partner-settings"] });
    } catch (err: any) {
      alert(err instanceof Error ? err.message : "Failed to update manager visibility setting.");
    } finally {
      setIsTogglingVisibility(false);
    }
  };

  const partners = partnersQuery.data || [];
  const batches = batchesQuery.data || [];
  const selectedPartner = partners.find((p) => p.id === selectedPartnerId);

  const handleDeletePartnerCard = async (pId: string, pName: string) => {
    if (
      !confirm(
        `Are you completely sure you want to permanently delete ${pName}? All associated financial entries, activity records, and login credentials will be removed. This cannot be undone.`,
      )
    ) {
      return;
    }
    try {
      await deletePartnerFn({ data: { passcode, partnerId: pId } });
      qc.invalidateQueries({ queryKey: ["admin-partners"] });
    } catch (err: any) {
      alert(err instanceof Error ? err.message : "Failed to delete partner.");
    }
  };

  const filteredPartners = partners.filter(
    (p) =>
      p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.cycleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.phone && p.phone.includes(searchTerm)),
  );

  return (
    <div className="space-y-6">
      {/* Top Executive Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-[#0F3D24] bg-[#0F3D24] p-6 text-white shadow-sm">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white">
              <Handshake size={16} />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-widest text-white/75">
              Investor Governance & Co-Financing Operations
            </span>
            {effectiveRole === "manager" && (
              <span className="rounded-md bg-amber-400/20 border border-amber-300/40 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-200">
                Manager Mode · Owner Approval Gate Active
              </span>
            )}
            {effectiveRole === "owner" && isHiddenFromManager && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-400/20 border border-amber-300/40 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-200">
                <EyeOff size={11} /> Hidden from Farm Manager
              </span>
            )}
          </div>
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl flex flex-wrap items-center gap-2">
            <span>For Partners</span>
            {selectedPartner && (
              <>
                <span className="text-white/40 font-light">/</span>
                <span className="text-white font-extrabold text-xl sm:text-2xl">{selectedPartner.fullName}</span>
              </>
            )}
          </h2>
          <p className="max-w-2xl text-xs text-white/80">
            {selectedPartner
              ? `Viewing active co-financing workspace, settlement ledgers, and flock logs for ${selectedPartner.fullName} (@${selectedPartner.username}).`
              : effectiveRole === "owner"
                ? "Manage partner cycles, profit splits, batch synchronization, manager entry approvals, and certified settlement statements."
                : "Record partner operational expenses, sales receipts, and daily flock logs. All manager entries are verified by the Farm Owner before publishing to the partner portal."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start">
          {selectedPartnerId && (
            <button
              type="button"
              onClick={() => setSelectedPartnerId(null)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/20 border border-white/30 px-4 py-2 text-xs font-black text-white hover:bg-white hover:text-[#0F3D24] transition shadow-xs cursor-pointer"
            >
              <ArrowLeft size={14} /> Back to Directory
            </button>
          )}
          {effectiveRole === "owner" && (
            <button
              type="button"
              onClick={handleToggleManagerVisibility}
              disabled={isTogglingVisibility}
              title={
                isHiddenFromManager
                  ? "Partner dashboard is currently hidden from the farm manager. Click to allow manager access."
                  : "Click to hide the partner dashboard and all investor information from the farm manager."
              }
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-black transition cursor-pointer border ${
                isHiddenFromManager
                  ? "bg-amber-400 text-[#0F3D24] border-amber-300 shadow-sm hover:bg-amber-300"
                  : "bg-white/10 text-white/90 border-white/20 hover:bg-white/20"
              }`}
            >
              {isTogglingVisibility ? (
                <Loader2 size={14} className="animate-spin text-current" />
              ) : isHiddenFromManager ? (
                <EyeOff size={14} className="text-[#0F3D24]" />
              ) : (
                <Eye size={14} className="text-white" />
              )}
              <span>{isHiddenFromManager ? "Hidden from Manager" : "Hide from Manager"}</span>
              <span
                className={`ml-1 rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${
                  isHiddenFromManager
                    ? "bg-[#0F3D24] text-amber-300"
                    : "bg-white/20 text-white"
                }`}
              >
                {isHiddenFromManager ? "Locked" : "Visible"}
              </span>
            </button>
          )}
          {effectiveRole === "owner" && (
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2 text-xs font-black text-[#0F3D24] shadow-sm transition hover:bg-[#FAF9F6]"
            >
              <Plus size={15} /> Onboard New Partner
            </button>
          )}
        </div>
      </div>

      {/* Executive Portfolio Health Strip */}
      <ExecutivePortfolioStrip partners={partners} role={effectiveRole} />

      {/* Main Workspace */}
      {selectedPartnerId ? (
        <PartnerDetailView
          passcode={passcode}
          partnerId={selectedPartnerId}
          batches={batches}
          viewerRole={effectiveRole}
          onBack={() => {
            setSelectedPartnerId(null);
            qc.invalidateQueries({ queryKey: ["admin-partners"] });
          }}
        />
      ) : (
        <div className="rounded-2xl border border-[#0F3D24]/10 bg-white p-6 shadow-sm space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-[#0F3D24]">Registered Partners Directory</h3>
                {partnersQuery.isFetching && partnersQuery.data && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    <RefreshCw size={9} className="animate-spin text-emerald-600" /> Updating...
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Select a partner to inspect unit economics, approve logs, sync batch records, or manage cycles.
              </p>
            </div>
            <div className="w-full sm:w-72">
              <input
                type="text"
                placeholder="Search partner name, @username, cycle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-[#FAF9F6] px-4 py-2 text-xs font-medium text-[#0F3D24] outline-none focus:border-[#0F3D24] focus:bg-white"
              />
            </div>
          </div>

          {effectiveRole === "owner" && isHiddenFromManager && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-50/80 p-4 text-xs text-amber-950 shadow-xs">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-700">
                  <ShieldCheck size={16} />
                </span>
                <div>
                  <span className="font-extrabold text-amber-900">Confidential Mode Active:</span>{" "}
                  <span className="text-amber-800">
                    The &ldquo;For Partners&rdquo; dashboard, navigation tab, and all investor information are completely hidden and blocked from the Farm Manager.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleManagerVisibility}
                disabled={isTogglingVisibility}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-white border border-amber-300 px-3 py-1.5 text-[11px] font-bold text-amber-900 hover:bg-amber-100/60 transition cursor-pointer shadow-xs"
              >
                <Eye size={13} className="text-amber-700" />
                <span>Allow Manager Access</span>
              </button>
            </div>
          )}

          {!partnersQuery.data && partnersQuery.isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin text-[#0F3D24]" size={28} />
            </div>
          ) : filteredPartners.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-[#FAF9F6] p-12 text-center">
              <Handshake className="mx-auto text-slate-400" size={36} />
              <h4 className="mt-3 text-sm font-bold text-slate-700">No Partners Found</h4>
              <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                {searchTerm
                  ? "No partners match your search criteria."
                  : "No partners have been onboarded yet."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPartners.map((partner) => {
                const s = partner.settlement;
                const isLoss = s.result === "loss";
                const isProfit = s.result === "profit";
                const pendingCount = partner.pendingApprovalsCount || 0;
                const totalCycles = (partner.archivedCycles?.length || 0) + 1;

                return (
                  <div
                    key={partner.id}
                    onClick={() => setSelectedPartnerId(partner.id)}
                    className="group relative cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-[#0F3D24]/40 hover:shadow-md flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#3F8F3F]">
                              {partner.projectName} · {partner.cycleName}
                            </span>
                            {totalCycles > 1 && (
                              <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[9px] font-bold text-slate-600">
                                {totalCycles} Cycles
                              </span>
                            )}
                          </div>
                          <h4 className="mt-0.5 text-base font-black text-[#0F3D24] group-hover:text-[#3F8F3F] transition-colors">
                            {partner.fullName}
                          </h4>
                          <div className="text-[11px] font-medium text-slate-500">
                            @{partner.username} · {partner.phone}
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                            partner.cycleStatus === "closed"
                              ? "bg-slate-800 text-white"
                              : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          }`}
                        >
                          {partner.cycleStatus === "closed" ? (
                            <>
                              <Lock size={10} /> Settled
                            </>
                          ) : (
                            "Active"
                          )}
                        </span>
                      </div>

                      {/* Governance Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                        <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-emerald-800 tabular-nums">
                          {partner.profitSharePercentage}% Profit Share
                        </span>
                        {pendingCount > 0 && (
                          <span className="rounded-md bg-amber-100 border border-amber-300 px-2 py-0.5 text-amber-900 font-extrabold">
                            {pendingCount} Awaiting Approval
                          </span>
                        )}
                        {partner.payoutElection && (
                          <span className="rounded-md bg-[#0F3D24]/10 px-2 py-0.5 text-[#0F3D24]">
                            {partner.payoutElection.choice === "bank_payout"
                              ? "Payout Requested"
                              : "Rollover Elected"}
                          </span>
                        )}
                      </div>

                      <div className="rounded-xl border border-slate-200/70 bg-[#FAF9F6] p-3 text-xs space-y-1.5 tabular-nums">
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Committed Capital:</span>
                          <strong className="text-[#0F3D24] font-bold">
                            {naira(partner.initialInvestment)}
                          </strong>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Partner Net Share:</span>
                          <strong
                            className={`font-black ${
                              isLoss
                                ? "text-rose-700"
                                : isProfit
                                  ? "text-emerald-700"
                                  : "text-slate-700"
                            }`}
                          >
                            {signedNaira(s.partnerSignedResult)}
                          </strong>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Entitlement / Balance:</span>
                          <span className="font-bold text-[#0F3D24]">
                            {naira(s.payoutDue)}{" "}
                            <span className="text-[10px] text-slate-500">
                              (Bal: {naira(Math.max(0, s.balanceOwed))})
                            </span>
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-center text-xs pt-0.5 tabular-nums">
                        <div className="rounded-xl bg-rose-50/50 p-2 border border-rose-100">
                          <span className="text-[10px] font-bold uppercase text-rose-800 block">
                            Verified Spend
                          </span>
                          <strong className="text-rose-950 font-black">
                            {naira(s.totalExpenses)}
                          </strong>
                        </div>
                        <div className="rounded-xl bg-emerald-50/50 p-2 border border-emerald-100">
                          <span className="text-[10px] font-bold uppercase text-emerald-800 block">
                            Verified Sales
                          </span>
                          <strong className="text-emerald-950 font-black">
                            {naira(s.totalIncome)}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#0F3D24]">
                      <div className="flex items-center gap-1.5">
                        <span>Open Partner Workspace</span>
                        <ChevronRight
                          size={15}
                          className="group-hover:translate-x-1 transition-transform"
                        />
                      </div>
                      {effectiveRole === "owner" && (
                        <div
                          className="flex items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => setEditingPartner(partner)}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-[#0F3D24] hover:text-white transition"
                            title="Edit Partner Details"
                          >
                            <Pencil size={11} /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePartnerCard(partner.id, partner.fullName)}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-600 hover:text-white transition"
                            title="Delete Partner Entirely"
                          >
                            <Trash2 size={11} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Edit Partner Modal (Owner Only) */}
      {editingPartner && effectiveRole === "owner" && (
        <EditPartnerModal
          passcode={passcode}
          partner={editingPartner}
          batches={batches}
          onClose={() => setEditingPartner(null)}
          onSuccess={() => {
            setEditingPartner(null);
            qc.invalidateQueries({ queryKey: ["admin-partners"] });
          }}
          onDeleted={() => {
            setEditingPartner(null);
            qc.invalidateQueries({ queryKey: ["admin-partners"] });
          }}
        />
      )}

      {/* Register New Partner Modal (Owner Only) */}
      {isAddModalOpen && effectiveRole === "owner" && (
        <AddPartnerModal
          passcode={passcode}
          batches={batches}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={(info) => {
            setIsAddModalOpen(false);
            qc.invalidateQueries({ queryKey: ["admin-partners"] });
            if (info) setCreatedPartnerInfo(info);
          }}
        />
      )}

      {/* Post-Registration Success Modal */}
      {createdPartnerInfo && (
        <CreatedPartnerSuccessModal
          info={createdPartnerInfo}
          onClose={() => setCreatedPartnerInfo(null)}
          onOpenWorkspace={(id) => {
            setCreatedPartnerInfo(null);
            setSelectedPartnerId(id);
          }}
        />
      )}
    </div>
  );
}

// ─── PARTNER DETAIL WORKSPACE COMPONENT ──────────────────────────────────────

function PartnerDetailView({
  passcode,
  partnerId,
  batches,
  viewerRole,
  onBack,
}: {
  passcode: string;
  partnerId: string;
  batches: any[];
  viewerRole: "owner" | "manager";
  onBack: () => void;
}) {
  const qc = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState<
    "overview" | "financials" | "activities" | "credentials"
  >("overview");
  const [selectedCycleId, setSelectedCycleId] = useState<string>("current");

  const getPartnerDetailFn = useServerFn(adminGetPartnerDetail);
  const closeCycleFn = useServerFn(adminClosePartnerCycle);
  const reopenCycleFn = useServerFn(adminReopenPartnerCycle);
  const deletePartnerFn = useServerFn(adminDeletePartner);

  const [settling, setSettling] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [showRolloverModal, setShowRolloverModal] = useState(false);
  const [showBatchSyncModal, setShowBatchSyncModal] = useState(false);
  const [showDigestModal, setShowDigestModal] = useState(false);
  const [showEditPartnerModal, setShowEditPartnerModal] = useState(false);
  const [lightboxData, setLightboxData] = useState<{
    url: string;
    title: string;
    subtitle?: string;
  } | null>(null);

  const detailQuery = useQuery({
    queryKey: ["admin-partner-detail", passcode, partnerId],
    queryFn: () => getPartnerDetailFn({ data: { passcode, partnerId } }),
    staleTime: 15_000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });

  const refreshDetail = () => {
    qc.invalidateQueries({ queryKey: ["admin-partner-detail", passcode, partnerId] });
    qc.invalidateQueries({ queryKey: ["admin-partners"] });
  };

  if (!detailQuery.data && detailQuery.isLoading) {
    return (
      <div className="rounded-2xl border border-[#0F3D24]/10 bg-white p-12 text-center shadow-sm">
        <Loader2 className="mx-auto animate-spin text-[#0F3D24]" size={32} />
        <p className="mt-3 text-xs text-slate-500 font-semibold">Loading partner workspace...</p>
      </div>
    );
  }

  if (!detailQuery.data?.partner) {
    return (
      <div className="rounded-2xl border border-[#0F3D24]/10 bg-white p-12 text-center shadow-sm">
        <AlertTriangle className="mx-auto text-amber-500" size={32} />
        <p className="mt-2 text-sm font-bold text-slate-800">Partner not found.</p>
        <button
          onClick={onBack}
          className="mt-4 rounded-xl bg-[#0F3D24] px-5 py-2 text-xs font-bold text-white"
        >
          Return to Partners List
        </button>
      </div>
    );
  }

  const {
    partner: livePartner,
    financials: liveFinancials,
    activities: liveActivities,
    charts: liveCharts,
    summary: liveSummary,
  } = detailQuery.data;

  // Resolve whether we are viewing the current active cycle or an archived historical cycle
  const selectedArchive =
    selectedCycleId === "current"
      ? null
      : (livePartner.archivedCycles || []).find((c) => c.cycleId === selectedCycleId) || null;

  const partner: FarmPartner = selectedArchive
    ? {
        ...livePartner,
        cycleName: selectedArchive.cycleName,
        projectName: selectedArchive.projectName,
        batchId: selectedArchive.batchId,
        batchName: selectedArchive.batchName ?? null,
        initialInvestment: selectedArchive.initialInvestment,
        profitSharePercentage: selectedArchive.profitSharePercentage,
        lossSharePercentage: selectedArchive.lossSharePercentage,
        cycleStartDate: selectedArchive.cycleStartDate,
        cycleEndDate: selectedArchive.cycleEndDate,
        cycleStatus: "closed",
        settledAt: selectedArchive.settledAt,
        settlement: selectedArchive.settlement,
        agreementSigned: selectedArchive.agreementSigned,
        agreementSignedAt: selectedArchive.agreementSignedAt,
        agreementSignedBy: selectedArchive.agreementSignedBy,
      }
    : livePartner;

  const financials = selectedArchive ? selectedArchive.financials : liveFinancials;
  const activities = selectedArchive ? selectedArchive.activities : liveActivities;
  const summary = selectedArchive ? selectedArchive.summary : liveSummary;
  const charts = selectedArchive
    ? buildChartData(
        selectedArchive.financials.map((f) => ({
          type: f.type,
          amount: f.amount,
          removedAt: f.removedAt,
          category: f.category,
          transactionDate: f.transactionDate,
        })),
        selectedArchive.activities.map((a) => ({
          activityDate: a.activityDate,
          stockHeadcount: a.stockHeadcount,
          mortalityCount: a.mortalityCount,
          feedConsumedKg: a.feedConsumedKg,
          removedAt: a.removedAt,
        })),
      )
    : liveCharts;

  const s = partner.settlement;
  const isViewingArchive = Boolean(selectedArchive);

  const handleCloseCycle = async () => {
    if (
      !confirm(
        `Close & Settle ${livePartner.cycleName} for ${livePartner.fullName}?\n\nThis will stamp the final settlement statement (Partner Result: ${signedNaira(livePartner.settlement.partnerSignedResult)}, Payout Due: ${naira(livePartner.settlement.payoutDue)}) and lock new expenses/income unless re-opened.`,
      )
    )
      return;
    setSettling(true);
    try {
      await closeCycleFn({ data: { passcode, partnerId: livePartner.id } });
      refreshDetail();
    } catch (err: any) {
      alert(err instanceof Error ? err.message : "Could not close cycle.");
    } finally {
      setSettling(false);
    }
  };

  const handleReopenCycle = async () => {
    const reason = prompt(
      "Enter a reason for re-opening this settled cycle (visible in the partner's governance audit log):",
    );
    if (!reason || reason.trim().length < 3) return;
    setSettling(true);
    try {
      await reopenCycleFn({ data: { passcode, partnerId: livePartner.id, reason: reason.trim() } });
      refreshDetail();
    } catch (err: any) {
      alert(err instanceof Error ? err.message : "Could not re-open cycle.");
    } finally {
      setSettling(false);
    }
  };

  const handleDeleteThisPartner = async () => {
    if (
      !confirm(
        `Are you completely sure you want to permanently delete ${livePartner.fullName}? All associated financial entries, activity records, and login credentials will be removed. This cannot be undone.`,
      )
    ) {
      return;
    }
    try {
      await deletePartnerFn({ data: { passcode, partnerId: livePartner.id } });
      qc.invalidateQueries({ queryKey: ["admin-partners"] });
      onBack();
    } catch (err: any) {
      alert(err instanceof Error ? err.message : "Failed to delete partner.");
    }
  };

  return (
    <div className="space-y-5">
      {/* Prominent Directory Return Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#0F3D24]/15 bg-white p-4 shadow-xs">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0F3D24] px-4 py-2.5 text-xs font-black text-white shadow-sm hover:bg-[#165232] transition cursor-pointer"
        >
          <ArrowLeft size={16} /> &larr; Back to Partners Directory
        </button>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          {detailQuery.isFetching && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 animate-pulse">
              <RefreshCw size={10} className="animate-spin text-emerald-600" /> Auto-syncing...
            </span>
          )}
          <span>Current Partner Workspace:</span>
          <strong className="rounded-lg bg-[#0F3D24]/10 px-2.5 py-1 font-black text-[#0F3D24]">
            {livePartner.fullName} (@{livePartner.username})
          </strong>
        </div>
      </div>

      {/* Multi-Cycle Switcher Bar */}
      <CycleSwitcherBar
        partner={livePartner}
        selectedCycleId={selectedCycleId}
        onSelectCycle={(id) => {
          setSelectedCycleId(id);
          if (id !== "current" && activeSubTab === "credentials") {
            setActiveSubTab("overview");
          }
        }}
        canRollover={viewerRole === "owner"}
        onOpenRolloverModal={() => setShowRolloverModal(true)}
      />

      {/* Pending Manager Approvals Queue */}
      {!isViewingArchive && (
        <PendingPartnerApprovalsBanner
          passcode={passcode}
          financials={liveFinancials}
          activities={liveActivities}
          viewerRole={viewerRole}
          onPreviewAttachment={(url, title, subtitle) => setLightboxData({ url, title, subtitle })}
          onUpdated={refreshDetail}
        />
      )}

      {/* Top Navigation & Profile Card */}
      <div className="rounded-2xl border border-[#0F3D24]/10 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-[#FAF9F6] px-4 py-2 text-xs font-bold text-[#0F3D24] hover:bg-[#0F3D24] hover:text-white transition shadow-xs cursor-pointer"
          >
            <ArrowLeft size={14} /> &larr; Back to All Partners
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {/* 1-Click Batch Sync Button */}
            {!isViewingArchive && livePartner.batchId && livePartner.cycleStatus === "open" && (
              <button
                type="button"
                onClick={() => setShowBatchSyncModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#0F3D24]/15 bg-[#FAF9F6] px-3.5 py-2 text-xs font-bold text-[#0F3D24] hover:bg-[#0F3D24] hover:text-white transition"
              >
                <Layers size={13} /> Sync Batch ({livePartner.batchName || "Linked"})
              </button>
            )}

            {/* Weekly WhatsApp Digest Button */}
            <button
              type="button"
              onClick={() => setShowDigestModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#0F3D24]/15 bg-[#FAF9F6] px-3.5 py-2 text-xs font-bold text-[#0F3D24] hover:bg-[#0F3D24] hover:text-white transition"
            >
              <MessageCircle size={13} /> WhatsApp Digest
            </button>

            {/* Export Statement Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowExportMenu((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#FAF9F6] border border-[#0F3D24]/15 px-3.5 py-2 text-xs font-bold text-[#0F3D24] hover:bg-slate-100 transition"
              >
                <FileDown size={13} />
                Export Statement
                <ChevronDown size={11} className={`transition-transform ${showExportMenu ? "rotate-180" : ""}`} />
              </button>

              {showExportMenu && (
                <div
                  className="absolute right-0 mt-2 w-52 rounded-xl bg-white p-1.5 text-xs font-semibold text-[#0F3D24] shadow-xl ring-1 ring-black/10 z-30 space-y-1"
                  onClick={() => setShowExportMenu(false)}
                >
                  <button
                    type="button"
                    onClick={() =>
                      exportPartnerReportPDF(
                        partner,
                        financials.filter((f) => f.approvalStatus === "approved"),
                        activities.filter((a) => a.approvalStatus === "approved"),
                      )
                    }
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-[#FAF9F6] transition"
                  >
                    <Download size={13} className="text-emerald-700" />
                    <div>
                      <span className="block font-bold">PDF Statement</span>
                      <span className="text-[10px] text-slate-500 font-normal">Official signed & stamped</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      exportPartnerReportCSV(
                        partner,
                        financials.filter((f) => f.approvalStatus === "approved"),
                        activities.filter((a) => a.approvalStatus === "approved"),
                      )
                    }
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-[#FAF9F6] transition"
                  >
                    <Download size={13} className="text-blue-700" />
                    <div>
                      <span className="block font-bold">CSV / Excel Ledger</span>
                      <span className="text-[10px] text-slate-500 font-normal">Itemized transactions</span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {viewerRole === "owner" && !isViewingArchive && (
              <>
                <button
                  type="button"
                  onClick={() => setShowEditPartnerModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:border-[#0F3D24] hover:text-[#0F3D24] transition shadow-xs"
                >
                  <Pencil size={13} /> Edit Details
                </button>

                <button
                  type="button"
                  onClick={() => setShowRolloverModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#0F3D24]/20 bg-white px-3.5 py-2 text-xs font-bold text-[#0F3D24] hover:bg-[#FAF9F6] transition shadow-xs"
                >
                  <RefreshCw size={13} /> New Cycle
                </button>

                {livePartner.cycleStatus === "open" ? (
                  <button
                    type="button"
                    disabled={settling}
                    onClick={handleCloseCycle}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F3D24] px-4 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-[#165232] disabled:opacity-50 transition"
                  >
                    <Lock size={13} /> {settling ? "Settling..." : "Close & Settle Cycle"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={settling}
                    onClick={handleReopenCycle}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-100 border border-amber-200 px-4 py-2 text-xs font-extrabold text-amber-900 hover:bg-amber-200 disabled:opacity-50 transition shadow-xs"
                  >
                    <Unlock size={13} /> Re-open Cycle
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleDeleteThisPartner}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-600 hover:text-white transition shadow-xs"
                  title="Permanently Delete Partner Entirely"
                >
                  <Trash2 size={13} /> Delete
                </button>
              </>
            )}
          </div>
        </div>

        {isViewingArchive && (
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-[#FAF9F6] px-4 py-2.5 text-xs">
            <span className="font-semibold text-slate-700">
              Viewing Historical Archive: <strong className="text-[#0F3D24]">{partner.cycleName}</strong> (Settled{" "}
              {partner.settledAt ? new Date(partner.settledAt).toLocaleDateString("en-GB") : ""})
            </span>
            <button
              type="button"
              onClick={() => setSelectedCycleId("current")}
              className="font-bold text-[#0F3D24] underline"
            >
              Return to Active Cycle &rarr;
            </button>
          </div>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0F3D24] bg-[#FAF9F6] border border-slate-200 px-2.5 py-0.5 rounded-md">
                {partner.projectName} · {partner.cycleName}
              </span>
              <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-800 tabular-nums">
                {partner.profitSharePercentage}% Profit Share
              </span>
              {summary.initialStockCount > 0 && partner.initialInvestment > 0 && (
                <span
                  className="rounded-md bg-[#0F3D24]/10 border border-[#0F3D24]/20 px-2.5 py-0.5 text-[10px] font-extrabold text-[#0F3D24] tabular-nums"
                  title="Agreed initial investment divided by initial stocked bird count"
                >
                  Agreed Placement: {naira(Math.round(partner.initialInvestment / summary.initialStockCount))} / bird ({summary.initialStockCount.toLocaleString()} birds)
                </span>
              )}
              {partner.batchName && (
                <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">
                  Batch: {partner.batchName}
                </span>
              )}
            </div>
            <h2 className="text-2xl font-black text-[#0F3D24]">{partner.fullName}</h2>
            <p className="text-xs text-slate-600">
              Username: <strong className="font-mono text-[#0F3D24]">@{partner.username}</strong> · Phone:{" "}
              {partner.phone}
              {partner.email && ` · Email: ${partner.email}`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 tabular-nums">
            <div className="rounded-xl bg-[#FAF9F6] px-4 py-2.5 border border-slate-200 text-right">
              <div className="text-[10px] font-bold uppercase text-slate-500">Committed Capital</div>
              <div className="text-lg font-black text-[#0F3D24]">{naira(partner.initialInvestment)}</div>
            </div>
            <div
              className={`rounded-xl px-4 py-2.5 border text-right ${
                s.result === "loss"
                  ? "bg-rose-50/70 border-rose-200"
                  : "bg-emerald-50/70 border-emerald-200"
              }`}
            >
              <div
                className={`text-[10px] font-bold uppercase ${
                  s.result === "loss" ? "text-rose-700" : "text-emerald-700"
                }`}
              >
                Partner Net Share (
                {s.result === "loss"
                  ? "Downside Capped"
                  : `${partner.profitSharePercentage}% profit`}
                )
              </div>
              <div
                className={`text-lg font-black ${
                  s.result === "loss" ? "text-rose-950" : "text-emerald-950"
                }`}
              >
                {signedNaira(s.partnerSignedResult)}
              </div>
            </div>
          </div>
        </div>

        {/* Sub-Tab Switcher */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab("overview")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeSubTab === "overview"
                ? "bg-[#0F3D24] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <BarChart3 size={14} /> Overview, Unit Economics & Settlement
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("financials")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeSubTab === "financials"
                ? "bg-[#0F3D24] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Receipt size={14} /> Financial Ledger & Receipts ({financials.length})
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
            <Activity size={14} /> Flock Logs & Pen Photos ({activities.length})
          </button>
          {viewerRole === "owner" && !isViewingArchive && (
            <button
              type="button"
              onClick={() => setActiveSubTab("credentials")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                activeSubTab === "credentials"
                  ? "bg-[#0F3D24] text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <KeyRound size={14} /> Edit Terms, Cycle & Portal Access
            </button>
          )}
        </div>
      </div>

      {/* Sub-Tab 1: Overview, Unit Economics, Charts & Settlement */}
      {activeSubTab === "overview" && (
        <div className="space-y-5">
          <ResultHero partner={partner} />
          <UnitEconomicsStrip partner={partner} summary={summary} />
          <TermsBanner
            partner={partner}
            onOpenAgreement={() => setShowSignModal(true)}
            onOpenCertificate={() => setShowCertificateModal(true)}
          />
          <div className="grid gap-5 lg:grid-cols-2">
            <SettlementBreakdown partner={partner} />
            <PayoutTracker partner={partner} financials={financials} />
          </div>
          <CycleElectionCard
            partner={partner}
            isAdminView={true}
            onTriggerAdminRollover={
              viewerRole === "owner" && !isViewingArchive
                ? () => setShowRolloverModal(true)
                : undefined
            }
          />
          <AgreementCard
            partner={partner}
            onOpenSignModal={() => setShowSignModal(true)}
            onOpenUploadModal={() => setShowUploadModal(true)}
            onOpenCertificate={() => setShowCertificateModal(true)}
          />
          <PartnerCharts charts={charts} settlement={s} partnerLabel={partner.fullName} />
          <HowCalculated partner={partner} />
          <AuditTimeline partner={partner} />
        </div>
      )}

      {/* Sub-Tab 2: Financials Keying (Expense, Income, Payout + Receipt Upload) */}
      {activeSubTab === "financials" && (
        <PartnerFinancialsSubPanel
          passcode={passcode}
          partner={partner}
          financials={financials}
          viewerRole={viewerRole}
          isArchiveView={isViewingArchive}
          onPreviewAttachment={(url, title, subtitle) => setLightboxData({ url, title, subtitle })}
          onRefresh={refreshDetail}
        />
      )}

      {/* Sub-Tab 3: Activities & Stock Logs (+ Pen Photo Upload) */}
      {activeSubTab === "activities" && (
        <PartnerActivitiesSubPanel
          passcode={passcode}
          partner={partner}
          activities={activities}
          summary={summary}
          viewerRole={viewerRole}
          isArchiveView={isViewingArchive}
          onPreviewAttachment={(url, title, subtitle) => setLightboxData({ url, title, subtitle })}
          onRefresh={refreshDetail}
        />
      )}

      {/* Sub-Tab 4: Edit Terms, Cycle & Portal Access (Owner Only) */}
      {activeSubTab === "credentials" && viewerRole === "owner" && !isViewingArchive && (
        <PartnerCredentialsSubPanel
          passcode={passcode}
          partner={livePartner}
          batches={batches}
          hasEntries={liveFinancials.some((f) => !f.removedAt)}
          onRefresh={refreshDetail}
          onDeleted={onBack}
        />
      )}

      {/* Modals */}
      {showEditPartnerModal && (
        <EditPartnerModal
          passcode={passcode}
          partner={livePartner}
          batches={batches}
          hasEntries={liveFinancials.some((f) => !f.removedAt)}
          onClose={() => setShowEditPartnerModal(false)}
          onSuccess={() => {
            setShowEditPartnerModal(false);
            refreshDetail();
          }}
          onDeleted={() => {
            setShowEditPartnerModal(false);
            qc.invalidateQueries({ queryKey: ["admin-partners"] });
            onBack();
          }}
        />
      )}

      {showSignModal && (
        <SignAgreementModal
          partner={partner}
          onClose={() => setShowSignModal(false)}
          onSigned={() => refreshDetail()}
        />
      )}

      {showUploadModal && (
        <UploadWrittenAgreementModal
          partner={livePartner}
          passcode={passcode}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => refreshDetail()}
        />
      )}

      {showCertificateModal && (
        <PartnershipCertificateModal
          partner={partner}
          onClose={() => setShowCertificateModal(false)}
        />
      )}

      {showRolloverModal && viewerRole === "owner" && (
        <RolloverCycleModal
          passcode={passcode}
          partner={livePartner}
          batches={batches}
          onClose={() => setShowRolloverModal(false)}
          onSuccess={() => {
            setSelectedCycleId("current");
            refreshDetail();
          }}
        />
      )}

      {showBatchSyncModal && (
        <BatchSyncModal
          passcode={passcode}
          partner={livePartner}
          viewerRole={viewerRole}
          onClose={() => setShowBatchSyncModal(false)}
          onSuccess={refreshDetail}
        />
      )}

      {showDigestModal && (
        <WeeklyWhatsAppDigestModal
          partner={partner}
          summary={summary}
          onClose={() => setShowDigestModal(false)}
        />
      )}

      {lightboxData && (
        <EvidenceLightboxModal
          url={lightboxData.url}
          title={lightboxData.title}
          subtitle={lightboxData.subtitle}
          onClose={() => setLightboxData(null)}
        />
      )}
    </div>
  );
}

// ─── SUBPANEL: FINANCIALS KEYING (EXPENSE / INCOME / PAYOUT + RECEIPT) ───────

function PartnerFinancialsSubPanel({
  passcode,
  partner,
  financials,
  viewerRole,
  isArchiveView,
  onPreviewAttachment,
  onRefresh,
}: {
  passcode: string;
  partner: FarmPartner;
  financials: PartnerFinancial[];
  viewerRole: "owner" | "manager";
  isArchiveView: boolean;
  onPreviewAttachment: (url: string, title: string, subtitle?: string) => void;
  onRefresh: () => void;
}) {
  const recordFinancialFn = useServerFn(adminRecordPartnerFinancial);
  const deleteFinancialFn = useServerFn(adminDeletePartnerFinancial);

  const [type, setType] = useState<"expense" | "income" | "payout">("expense");
  const [category, setCategory] = useState("Feed & Nutrition");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [referenceNo, setReferenceNo] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const s = partner.settlement;
  const isClosed = partner.cycleStatus === "closed" || isArchiveView;

  const handleReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setMsg("Receipt file exceeds 5MB. Please choose a smaller image or PDF.");
      return;
    }
    setAttachmentName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setReceiptUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

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
      const res = await recordFinancialFn({
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
          receiptUrl: receiptUrl.trim() || null,
          attachmentName: attachmentName.trim() || null,
        },
      });
      setAmount("");
      setDescription("");
      setReferenceNo("");
      setReceiptUrl("");
      setAttachmentName("");
      setMsg(
        res.approvalStatus === "pending_approval"
          ? "Entry submitted and queued for Farm Owner approval."
          : "Entry recorded and published to partner portal.",
      );
      setTimeout(() => setMsg(null), 4000);
      onRefresh();
    } catch (err: any) {
      setMsg(err instanceof Error ? err.message : "Could not record entry.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (id: string) => {
    const reason = prompt(
      "Enter a reason for removing this entry (for full transparency, the partner will see that this entry was removed along with your reason):",
    );
    if (!reason || reason.trim().length < 3) return;
    try {
      await deleteFinancialFn({ data: { passcode, financialId: id, reason: reason.trim() } });
      onRefresh();
    } catch (err: any) {
      alert(err instanceof Error ? err.message : "Could not remove entry.");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Key In Form */}
      <div className="lg:col-span-4 rounded-2xl border border-[#0F3D24]/10 bg-white p-6 shadow-sm space-y-4">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#3F8F3F]">
            {viewerRole === "manager" ? "Manager Entry (Owner Verified)" : "Direct Ledger Key-In"}
          </span>
          <h3 className="text-base font-black text-[#0F3D24]">Record Ledger Entry</h3>
          <p className="text-xs text-slate-500">
            {viewerRole === "manager"
              ? "Record expenses or sales with receipt proof. Entries publish after Owner approval."
              : `Expenses & sales update profit/loss; payouts reduce the balance owed to ${partner.fullName}.`}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          {/* Expense / Income / Payout Toggle */}
          <div className={`grid ${viewerRole === "owner" ? "grid-cols-3" : "grid-cols-2"} gap-1.5 rounded-xl bg-[#FAF9F6] border border-slate-200 p-1`}>
            <button
              type="button"
              disabled={isClosed}
              onClick={() => {
                setType("expense");
                setCategory("Feed & Nutrition");
              }}
              className={`rounded-lg py-2 font-bold transition ${
                type === "expense"
                  ? "bg-rose-700 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 disabled:opacity-40"
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              disabled={isClosed}
              onClick={() => {
                setType("income");
                setCategory("Bird Offload / Sales");
              }}
              className={`rounded-lg py-2 font-bold transition ${
                type === "income"
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 disabled:opacity-40"
              }`}
            >
              Sale / Income
            </button>
            {viewerRole === "owner" && (
              <button
                type="button"
                disabled={isArchiveView}
                onClick={() => {
                  setType("payout");
                  setCategory("Partner Payout / Remittance");
                }}
                className={`rounded-lg py-2 font-bold transition ${
                  type === "payout"
                    ? "bg-[#0F3D24] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Payout
              </button>
            )}
          </div>

          {type === "payout" && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] tabular-nums">
                <span className="font-semibold text-amber-900">Balance currently owed:</span>
                <strong className="font-black text-amber-950">{naira(Math.max(0, s.balanceOwed))}</strong>
              </div>
              {s.balanceOwed > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setAmount(String(Math.round(s.balanceOwed)));
                    if (!description) setDescription(`Settlement payout to ${partner.fullName}`);
                  }}
                  className="text-[11px] font-bold text-[#0F3D24] underline"
                >
                  Fill full remaining balance ({naira(s.balanceOwed)})
                </button>
              )}
            </div>
          )}

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
              ) : type === "income" ? (
                <>
                  <option value="Bird Offload / Sales">Bird Offload / Sales</option>
                  <option value="Eggs / Produce Sales">Eggs / Produce Sales</option>
                  <option value="Manure / By-Product Sales">Manure / By-Product Sales</option>
                  <option value="Other Revenue">Other Revenue</option>
                </>
              ) : (
                <>
                  <option value="Partner Payout / Remittance">Partner Payout / Remittance</option>
                  <option value="Capital Return">Capital Return</option>
                  <option value="Profit Share Disbursement">Profit Share Disbursement</option>
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
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold text-[#0F3D24] tabular-nums outline-none focus:border-[#0F3D24]"
            />
          </div>

          <div>
            <label className="block font-bold text-[#0F3D24] mb-1">Description *</label>
            <input
              type="text"
              required
              placeholder={
                type === "payout"
                  ? "e.g. First tranche payout via Moniepoint"
                  : "e.g. 50 bags Broiler Finisher feed purchased"
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[#0F3D24] outline-none focus:border-[#0F3D24]"
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
            <label className="block font-bold text-[#0F3D24] mb-1">Reference / Invoice No. (Optional)</label>
            <input
              type="text"
              placeholder="e.g. INV-9823412"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[#0F3D24] outline-none"
            />
          </div>

          {/* Receipt / Invoice Proof Attachment */}
          <div className="rounded-xl border border-dashed border-slate-300 bg-[#FAF9F6] p-3 space-y-2">
            <label className="block font-bold text-[#0F3D24]">
              Attach Receipt / Waybill Proof (Optional)
            </label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleReceiptFileChange}
              className="w-full text-[11px] text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-[#0F3D24] file:px-3 file:py-1.5 file:text-[11px] file:font-bold file:text-white cursor-pointer"
            />
            {attachmentName && (
              <div className="flex items-center justify-between text-[11px] text-emerald-800 font-semibold">
                <span className="truncate">Attached: {attachmentName}</span>
                <button
                  type="button"
                  onClick={() => {
                    setReceiptUrl("");
                    setAttachmentName("");
                  }}
                  className="text-rose-600 font-bold ml-2"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {msg && (
            <div
              className={`rounded-xl p-2.5 text-xs font-semibold ${
                msg.includes("published") || msg.includes("queued")
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}
            >
              {msg}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || isArchiveView}
            className="w-full rounded-xl bg-[#0F3D24] py-2.5 font-bold text-white hover:bg-[#165232] disabled:opacity-50 transition"
          >
            {isArchiveView
              ? "Archived Cycle (Read-Only)"
              : submitting
                ? "Recording..."
                : viewerRole === "manager"
                  ? "Submit for Owner Approval"
                  : `Record ${type === "payout" ? "Payout" : "Transaction"}`}
          </button>
        </form>
      </div>

      {/* Financial Ledger Table */}
      <div className="lg:col-span-8 rounded-2xl border border-[#0F3D24]/10 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-black text-[#0F3D24]">Itemized Investment Ledger</h3>
            <p className="text-xs text-slate-500">
              Line-by-line expenses, sales, receipts, and payouts. Removed entries retain audit reasons.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 tabular-nums">
            <span className="rounded-lg bg-rose-50 border border-rose-200 px-2.5 py-1 text-[11px] font-bold text-rose-800">
              Expenses: {naira(s.totalExpenses)}
            </span>
            <span className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
              Sales: {naira(s.totalIncome)}
            </span>
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-[#0F3D24]">
              Disbursed: {naira(s.paidOut)}
            </span>
          </div>
        </div>

        {financials.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
            No financial entries have been recorded for this cycle yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5">Date</th>
                  <th className="py-2.5">Type & Status</th>
                  <th className="py-2.5">Category</th>
                  <th className="py-2.5">Description & Proof</th>
                  <th className="py-2.5 text-right">Amount</th>
                  <th className="py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {financials.map((row) => {
                  const removed = Boolean(row.removedAt);
                  const pending = row.approvalStatus === "pending_approval" && !removed;
                  return (
                    <tr
                      key={row.id}
                      className={
                        removed
                          ? "bg-slate-50 opacity-60"
                          : pending
                            ? "bg-amber-50/40"
                            : "hover:bg-slate-50/60"
                      }
                    >
                      <td className="py-2.5 font-medium text-slate-600 whitespace-nowrap tabular-nums">
                        {row.transactionDate}
                      </td>
                      <td className="py-2.5">
                        <div className="flex flex-wrap items-center gap-1">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                              removed
                                ? "bg-slate-200 text-slate-600"
                                : row.type === "expense"
                                  ? "bg-rose-50 text-rose-800 border border-rose-200"
                                  : row.type === "income"
                                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                    : "bg-blue-50 text-blue-800 border border-blue-200"
                            }`}
                          >
                            {removed ? "removed" : row.type}
                          </span>
                          {pending && (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-900">
                              Pending Owner
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`py-2.5 font-bold text-[#0F3D24] ${removed ? "line-through" : ""}`}>
                        {row.category}
                      </td>
                      <td className="py-2.5 text-slate-700 max-w-xs space-y-1">
                        <span className={`block ${removed ? "line-through" : ""}`}>{row.description}</span>
                        {row.receiptUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              onPreviewAttachment(
                                row.receiptUrl!,
                                row.attachmentName || `${row.category} Receipt`,
                                `${naira(row.amount)} · ${row.transactionDate}`,
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-md border border-[#0F3D24]/20 bg-[#FAF9F6] px-2 py-0.5 text-[10px] font-bold text-[#0F3D24] hover:bg-[#0F3D24] hover:text-white transition"
                          >
                            <Eye size={11} /> View Receipt
                          </button>
                        )}
                        {removed && (
                          <span className="block text-[10px] font-semibold text-rose-700">
                            Removed ({row.removalReason || "no reason"})
                          </span>
                        )}
                      </td>
                      <td
                        className={`py-2.5 text-right font-black tabular-nums ${
                          removed
                            ? "line-through text-slate-400"
                            : row.type === "expense"
                              ? "text-rose-700"
                              : row.type === "income"
                                ? "text-emerald-700"
                                : "text-blue-700"
                        }`}
                      >
                        {row.type === "expense" ? "-" : row.type === "income" ? "+" : ""}
                        {naira(row.amount)}
                      </td>
                      <td className="py-2.5 text-right">
                        {!removed && !isClosed && viewerRole === "owner" && (
                          <button
                            type="button"
                            onClick={() => handleRemove(row.id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                            title="Remove entry (with reason)"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SUBPANEL: ACTIVITIES KEYING (+ PEN PHOTO ATTACHMENT) ────────────────────

function PartnerActivitiesSubPanel({
  passcode,
  partner,
  activities,
  summary,
  viewerRole,
  isArchiveView,
  onPreviewAttachment,
  onRefresh,
}: {
  passcode: string;
  partner: FarmPartner;
  activities: PartnerActivity[];
  summary: PartnerDashboardSummary;
  viewerRole: "owner" | "manager";
  isArchiveView: boolean;
  onPreviewAttachment: (url: string, title: string, subtitle?: string) => void;
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
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoLabel, setPhotoLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const isClosed = partner.cycleStatus === "closed" || isArchiveView;

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setMsg("Photo exceeds 5MB. Please choose a smaller image.");
      return;
    }
    setPhotoLabel(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await recordActivityFn({
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
          photoUrl: photoUrl.trim() || null,
        },
      });
      setStockHeadcount("0");
      setMortalityCount("0");
      setCauseOfMortality("");
      setFeedConsumedKg("0");
      setAverageWeightKg("0");
      setNotes("");
      setPhotoUrl("");
      setPhotoLabel("");
      setMsg(
        res.approvalStatus === "pending_approval"
          ? "Activity log submitted and queued for Farm Owner approval."
          : "Activity log recorded and published to partner portal.",
      );
      setTimeout(() => setMsg(null), 4000);
      onRefresh();
    } catch (err: any) {
      setMsg(err instanceof Error ? err.message : "Could not record activity.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (id: string) => {
    const reason = prompt("Enter a reason for removing this activity log:");
    if (!reason || reason.trim().length < 3) return;
    try {
      await deleteActivityFn({ data: { passcode, activityId: id, reason: reason.trim() } });
      onRefresh();
    } catch (err: any) {
      alert(err instanceof Error ? err.message : "Could not remove activity.");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Form */}
      <div className="lg:col-span-4 rounded-2xl border border-[#0F3D24]/10 bg-white p-6 shadow-sm space-y-4">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#3F8F3F]">
            {viewerRole === "manager" ? "Manager Flock Log" : "Farm Transparency"}
          </span>
          <h3 className="text-base font-black text-[#0F3D24]">Log Farm Activity / Stock</h3>
          <p className="text-xs text-slate-500 tabular-nums">
            Live birds: <strong>{summary.currentStockCount}</strong> · Mortality:{" "}
            <strong>
              {summary.totalMortalityCount} ({summary.mortalityRatePercent}%)
            </strong>
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
              <label className="block font-bold text-[#0F3D24] mb-1">
                Birds Received / Stocked (Headcount)
              </label>
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
                  placeholder="e.g. Heat stress"
                  value={causeOfMortality}
                  onChange={(e) => setCauseOfMortality(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800"
                />
              </div>
            </div>
          )}

          {activityType === "Weight Check" && (
            <div>
              <label className="block font-bold text-[#0F3D24] mb-1">Average Bird Weight (Kg)</label>
              <input
                type="number"
                step="0.01"
                min={0}
                placeholder="e.g. 2.15"
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
              placeholder="e.g. Birds are active, clean water administered, healthy feeding behavior..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[#0F3D24] outline-none"
            />
          </div>

          {/* Pen Photo Attachment */}
          <div className="rounded-xl border border-dashed border-slate-300 bg-[#FAF9F6] p-3 space-y-2">
            <label className="block font-bold text-[#0F3D24]">
              Attach Live Pen / Flock Photo (Optional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="w-full text-[11px] text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-[#0F3D24] file:px-3 file:py-1.5 file:text-[11px] file:font-bold file:text-white cursor-pointer"
            />
            {photoLabel && (
              <div className="flex items-center justify-between text-[11px] text-emerald-800 font-semibold">
                <span className="truncate">Attached: {photoLabel}</span>
                <button
                  type="button"
                  onClick={() => {
                    setPhotoUrl("");
                    setPhotoLabel("");
                  }}
                  className="text-rose-600 font-bold ml-2"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {msg && (
            <div
              className={`rounded-xl p-2.5 text-xs font-semibold ${
                msg.includes("published") || msg.includes("queued")
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}
            >
              {msg}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || isClosed}
            className="w-full rounded-xl bg-[#0F3D24] py-2.5 font-bold text-white hover:bg-[#165232] disabled:opacity-50 transition"
          >
            {isClosed
              ? "Cycle Settled (Locked)"
              : submitting
                ? "Logging..."
                : viewerRole === "manager"
                  ? "Submit Activity for Owner Approval"
                  : "Log Activity"}
          </button>
        </form>
      </div>

      {/* Activities Timeline */}
      <div className="lg:col-span-8 rounded-2xl border border-[#0F3D24]/10 bg-white p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-black text-[#0F3D24]">Live Flock Activity Timeline</h3>
          <p className="text-xs text-slate-500">
            Chronological pen logs and visual flock evidence shared with the partner.
          </p>
        </div>

        {activities.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
            No activity logs have been recorded for this cycle yet.
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((act) => {
              const removed = Boolean(act.removedAt);
              const pending = act.approvalStatus === "pending_approval" && !removed;
              return (
                <div
                  key={act.id}
                  className={`flex items-start justify-between rounded-xl border p-4 transition-all ${
                    removed
                      ? "border-slate-200 bg-slate-50 opacity-60"
                      : pending
                        ? "border-amber-200 bg-amber-50/40"
                        : "border-slate-200 bg-[#FAF9F6] hover:bg-slate-50"
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-500 tabular-nums">
                        {act.activityDate}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-[10px] font-extrabold ${
                          removed
                            ? "bg-slate-200 text-slate-600 line-through"
                            : "bg-[#0F3D24]/10 text-[#0F3D24]"
                        }`}
                      >
                        {act.activityType}
                      </span>
                      {pending && (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                          Pending Owner Approval
                        </span>
                      )}
                      {act.mortalityCount > 0 && (
                        <span className="inline-flex items-center rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-extrabold text-rose-800">
                          {act.mortalityCount} Mortality
                        </span>
                      )}
                      {act.stockHeadcount > 0 && (
                        <span className="inline-flex items-center rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                          +{act.stockHeadcount} Birds Stocked
                        </span>
                      )}
                    </div>
                    {act.notes && (
                      <p className={`text-xs font-medium text-slate-800 ${removed ? "line-through" : ""}`}>
                        {act.notes}
                      </p>
                    )}
                    {removed && (
                      <p className="text-[11px] font-semibold text-rose-700">
                        Removed ({act.removalReason || "no reason"})
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 tabular-nums">
                      {act.feedConsumedKg > 0 && (
                        <span>
                          Feed: <strong>{act.feedConsumedKg} kg</strong>
                        </span>
                      )}
                      {act.averageWeightKg > 0 && (
                        <span>
                          Avg Weight: <strong>{act.averageWeightKg} kg</strong>
                        </span>
                      )}
                      {act.causeOfMortality && <span>Cause: {act.causeOfMortality}</span>}
                      {act.photoUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            onPreviewAttachment(
                              act.photoUrl!,
                              `${act.activityType} Pen Photo`,
                              act.activityDate,
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-md border border-[#0F3D24]/20 bg-white px-2.5 py-0.5 text-[10px] font-bold text-[#0F3D24] hover:bg-[#0F3D24] hover:text-white transition"
                        >
                          <Eye size={11} /> View Pen Photo
                        </button>
                      )}
                    </div>
                  </div>

                  {!removed && !isClosed && viewerRole === "owner" && (
                    <button
                      type="button"
                      onClick={() => handleRemove(act.id)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                      title="Remove log"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SUBPANEL: EDIT TERMS, CYCLE & PORTAL ACCESS ─────────────────────────────

function PartnerCredentialsSubPanel({
  passcode,
  partner,
  batches,
  hasEntries,
  onRefresh,
  onDeleted,
}: {
  passcode: string;
  partner: FarmPartner;
  batches: any[];
  hasEntries: boolean;
  onRefresh: () => void;
  onDeleted: () => void;
}) {
  const updatePartnerFn = useServerFn(adminUpdatePartner);
  const resetPasscodeFn = useServerFn(adminResetPartnerPasscode);
  const toggleActiveFn = useServerFn(adminTogglePartnerActive);
  const deletePartnerFn = useServerFn(adminDeletePartner);

  // Edit Partner & Terms state
  const [fullName, setFullName] = useState(partner.fullName);
  const [phone, setPhone] = useState(partner.phone);
  const [email, setEmail] = useState(partner.email || "");
  const [address, setAddress] = useState(partner.address || "");
  const [projectName, setProjectName] = useState(partner.projectName);
  const [cycleName, setCycleName] = useState(partner.cycleName);
  const [cycleStartDate, setCycleStartDate] = useState(partner.cycleStartDate || partner.investmentDate);
  const [cycleEndDate, setCycleEndDate] = useState(partner.cycleEndDate || "");
  const [initialInvestment, setInitialInvestment] = useState(String(partner.initialInvestment));
  const [investmentDate, setInvestmentDate] = useState(partner.investmentDate);
  const [profitShare, setProfitShare] = useState(String(partner.profitSharePercentage));
  const [lossShare, setLossShare] = useState(String(partner.lossSharePercentage));
  const [agreedTerms, setAgreedTerms] = useState(partner.agreedTerms || "");
  const [batchId, setBatchId] = useState(partner.batchId || "");
  const [status, setStatus] = useState<FarmPartner["status"]>(partner.status);
  const [amendReason, setAmendReason] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editMsg, setEditMsg] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [copied, setCopied] = useState(false);

  const portalUrl = typeof window !== "undefined" ? `${window.location.origin}/for-partners` : "/for-partners";

  const termsChanged =
    Number(profitShare) !== partner.profitSharePercentage ||
    Number(initialInvestment) !== partner.initialInvestment;

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEdit(true);
    setEditMsg(null);
    try {
      await updatePartnerFn({
        data: {
          passcode,
          partnerId: partner.id,
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          address: address.trim() || null,
          initialInvestment: Number(initialInvestment) || 0,
          investmentDate,
          profitSharePercentage: Number(profitShare),
          lossSharePercentage: Number(lossShare) || partner.lossSharePercentage || 100,
          agreedTerms: agreedTerms.trim() || null,
          projectName: projectName.trim(),
          cycleName: cycleName.trim(),
          cycleStartDate,
          cycleEndDate: cycleEndDate || null,
          batchId: batchId || null,
          status,
          amendReason: amendReason.trim() || null,
        },
      });
      setAmendReason("");
      setEditMsg("Partner profile & sharing terms updated successfully!");
      setTimeout(() => setEditMsg(null), 3500);
      onRefresh();
    } catch (err: any) {
      setEditMsg(err instanceof Error ? err.message : "Could not update partner.");
    } finally {
      setSavingEdit(false);
    }
  };

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
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Left: Edit Partner, Cycle & Profit/Loss Sharing Split */}
      <form
        onSubmit={handleSaveEdit}
        className="lg:col-span-7 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/10 space-y-4 text-xs"
      >
        <div className="flex items-center gap-2">
          <Pencil size={15} className="text-[#3F8F3F]" />
          <h3 className="text-base font-black text-[#0F3D24]">
            Edit Partner Profile, Cycle & Profit/Loss Split
          </h3>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block font-bold text-[#0F3D24] mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 font-medium text-[#0F3D24]"
            />
          </div>
          <div>
            <label className="block font-bold text-[#0F3D24] mb-1">Phone *</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 font-medium text-[#0F3D24]"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block font-bold text-[#0F3D24] mb-1">Capital Invested (₦) *</label>
            <input
              type="number"
              required
              min={0}
              value={initialInvestment}
              onChange={(e) => setInitialInvestment(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 font-bold text-[#0F3D24]"
            />
          </div>
          <div>
            <label className="block font-bold text-emerald-800 mb-1">Partner Profit Share (%)</label>
            <input
              type="number"
              required
              min={0}
              max={100}
              step="0.5"
              value={profitShare}
              onChange={(e) => setProfitShare(e.target.value)}
              className="w-full rounded-xl border border-emerald-300 bg-emerald-50/40 px-3 py-2 font-black text-emerald-900"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="block font-bold text-[#0F3D24] mb-1">Cycle Name *</label>
            <input
              type="text"
              required
              value={cycleName}
              onChange={(e) => setCycleName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 font-semibold text-[#0F3D24]"
            />
          </div>
          <div>
            <label className="block font-bold text-[#0F3D24] mb-1">Cycle Start Date *</label>
            <input
              type="date"
              required
              value={cycleStartDate}
              onChange={(e) => setCycleStartDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 font-medium text-[#0F3D24]"
            />
          </div>
          <div>
            <label className="block font-bold text-[#0F3D24] mb-1">Cycle End / Maturity Date</label>
            <input
              type="date"
              value={cycleEndDate}
              onChange={(e) => setCycleEndDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 font-medium text-[#0F3D24]"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block font-bold text-[#0F3D24] mb-1">Project Name</label>
            <input
              type="text"
              required
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 font-semibold text-[#0F3D24]"
            />
          </div>
          <div>
            <label className="block font-bold text-[#0F3D24] mb-1">Linked Farm Batch</label>
            <select
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-medium text-[#0F3D24]"
            >
              <option value="">No linked batch (independent slot)</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batchName} ({b.batchType})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block font-bold text-[#0F3D24] mb-1">Agreed Terms & Notes</label>
          <textarea
            rows={2}
            value={agreedTerms}
            onChange={(e) => setAgreedTerms(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[#0F3D24]"
          />
        </div>

        {termsChanged && hasEntries && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3.5 space-y-1.5">
            <label className="block font-extrabold text-amber-950">
              Reason for Amending Capital / Profit-Loss Split (Required — visible to partner) *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Mutual agreement on 05 Nov to adjust profit split to 70%"
              value={amendReason}
              onChange={(e) => setAmendReason(e.target.value)}
              className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 font-semibold text-[#0F3D24]"
            />
          </div>
        )}

        {editMsg && (
          <div
            className={`rounded-xl p-2.5 text-xs font-semibold ${
              editMsg.includes("successfully") ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
            }`}
          >
            {editMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={savingEdit}
          className="rounded-xl bg-[#0F3D24] px-6 py-2.5 font-extrabold text-white hover:bg-[#165232] disabled:opacity-50 transition"
        >
          {savingEdit ? "Saving Changes..." : "Save Partner & Sharing Terms"}
        </button>
      </form>

      {/* Right: Portal Credentials & Delete */}
      <div className="lg:col-span-5 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/10 space-y-4 flex flex-col justify-between">
        <div className="space-y-4">
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
              {partner.active ? "Deactivate" : "Activate"}
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

// ─── MODAL: 4-STEP ONBOARDING WIZARD FOR NEW PARTNER ──────────────────────────

interface CreatedPartnerInfo {
  id: string;
  fullName: string;
  username: string;
  password: string;
  capital: number;
  profitPct: number;
  lossPct: number;
  cycleName: string;
}

function AddPartnerModal({
  passcode,
  batches,
  onClose,
  onSuccess,
}: {
  passcode: string;
  batches: any[];
  onClose: () => void;
  onSuccess: (info?: CreatedPartnerInfo) => void;
}) {
  const createPartnerFn = useServerFn(adminCreatePartner);

  const today = new Date().toISOString().slice(0, 10);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Partner Profile
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Step 2: Capital & Cycle
  const [initialInvestment, setInitialInvestment] = useState("");
  const [investmentDate, setInvestmentDate] = useState(today);
  const [projectName, setProjectName] = useState("Broiler Cycle Partnership");
  const [cycleName, setCycleName] = useState("Cycle 1 — 6-Week Broilers");
  const [cycleStartDate, setCycleStartDate] = useState(today);
  const [cycleEndDate, setCycleEndDate] = useState("");
  const [batchId, setBatchId] = useState<string>("");

  // Step 3: Sharing Matrix
  const [profitSharePercentage, setProfitSharePercentage] = useState("70");
  const [lossSharePercentage, setLossSharePercentage] = useState("100");
  const [simMode, setSimMode] = useState<"profit" | "loss">("profit");

  // Step 4: Terms & Review
  const [customClauses, setCustomClauses] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pPct = Math.min(100, Math.max(0, Number(profitSharePercentage) || 0));
  const lPct = Math.min(100, Math.max(0, Number(lossSharePercentage) || 0));
  const numCapital = Number(initialInvestment) || 0;

  // Helpers
  const handleAutoSuggestUsername = () => {
    if (!fullName.trim()) return;
    const clean = fullName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 25);
    setUsername(clean || "partner_investor");
  };

  const handleGeneratePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let rand = "";
    for (let i = 0; i < 4; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(`Daf-${rand}`);
    setShowPassword(true);
  };

  const validateStep1 = () => {
    if (!fullName.trim()) {
      setErrorMsg("Please enter the partner's full name.");
      return false;
    }
    if (!phone.trim()) {
      setErrorMsg("Please enter a contact phone number.");
      return false;
    }
    if (!username.trim() || username.trim().length < 3) {
      setErrorMsg("Username must be at least 3 characters.");
      return false;
    }
    if (!password.trim() || password.trim().length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  const validateStep2 = () => {
    if (numCapital <= 0) {
      setErrorMsg("Please enter a valid investment capital amount greater than zero.");
      return false;
    }
    if (!cycleName.trim()) {
      setErrorMsg("Please enter a cycle name.");
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setErrorMsg(null);
    setStep((s) => Math.min(4, s + 1) as any);
  };

  const handleBack = () => {
    setErrorMsg(null);
    setStep((s) => Math.max(1, s - 1) as any);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep1() || !validateStep2()) return;

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await createPartnerFn({
        data: {
          passcode,
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          address: address.trim() || null,
          projectName: projectName.trim(),
          cycleName: cycleName.trim(),
          cycleStartDate,
          cycleEndDate: cycleEndDate || null,
          initialInvestment: numCapital,
          investmentDate,
          profitSharePercentage: pPct,
          lossSharePercentage: lPct,
          agreedTerms: customClauses.trim() || null,
          batchId: batchId || null,
          username: username.trim().toLowerCase(),
          password: password.trim(),
        },
      });

      onSuccess({
        id: res.partnerId,
        fullName: fullName.trim(),
        username: username.trim().toLowerCase(),
        password: password.trim(),
        capital: numCapital,
        profitPct: pPct,
        lossPct: lPct,
        cycleName: cycleName.trim(),
      });
    } catch (err: any) {
      setErrorMsg(err instanceof Error ? err.message : "Could not complete partner onboarding.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl ring-1 ring-[#0F3D24]/10 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Wizard Header Bar */}
        <div className="bg-[#0F3D24] px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#3F8F3F]">
              <Handshake size={18} />
            </div>
            <div>
              <h3 className="text-base font-black">Partner Onboarding Wizard</h3>
              <p className="text-[11px] text-white/70">
                Setup partner profile, capital co-financing, sharing matrix, and portal access
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/10 p-2 text-white/80 hover:bg-white/20 transition"
          >
            ✕
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div className="border-b border-slate-100 bg-[#F7F5F0]/60 px-6 py-3 shrink-0">
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            {[
              { num: 1, label: "Identity & Login" },
              { num: 2, label: "Capital & Cycle" },
              { num: 3, label: "Profit Sharing" },
              { num: 4, label: "Terms & Review" },
            ].map((s) => {
              const active = step === s.num;
              const done = step > s.num;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => {
                    if (s.num < step) setStep(s.num as any);
                    else if (step === 1 && validateStep1()) setStep(s.num as any);
                    else if (step === 2 && validateStep2()) setStep(s.num as any);
                  }}
                  className={`flex items-center justify-center gap-2 rounded-xl py-1.5 px-2 transition ${
                    active
                      ? "bg-[#0F3D24] text-white font-black shadow-sm"
                      : done
                        ? "bg-emerald-100 text-emerald-900 font-bold"
                        : "text-slate-400 font-medium"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${
                      active
                        ? "bg-white text-[#0F3D24]"
                        : done
                          ? "bg-emerald-700 text-white"
                          : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {done ? "✓" : s.num}
                  </span>
                  <span className="hidden sm:inline text-[11px] truncate">{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Wizard Step Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
          {errorMsg && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700 flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ───────── STEP 1: IDENTITY & LOGIN ───────── */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-[#0F3D24]/5 border border-[#0F3D24]/10 p-3 flex items-center gap-2 text-slate-700">
                <User size={16} className="text-[#3F8F3F] shrink-0" />
                <span>Enter the partner's legal identity and set their login credentials for the portal.</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block font-bold text-[#0F3D24] mb-1">Full Legal Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chief Emeka N. Okafor"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    onBlur={handleAutoSuggestUsername}
                    className="w-full rounded-xl border border-slate-200 bg-[#F7F5F0]/50 px-3.5 py-2.5 font-semibold text-[#0F3D24] outline-none focus:border-[#3F8F3F] focus:bg-white"
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
                    className="w-full rounded-xl border border-slate-200 bg-[#F7F5F0]/50 px-3.5 py-2.5 font-medium text-[#0F3D24] outline-none focus:border-[#3F8F3F] focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block font-bold text-[#0F3D24] mb-1">Email Address (Optional)</label>
                  <input
                    type="email"
                    placeholder="partner@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-[#F7F5F0]/50 px-3.5 py-2.5 font-medium text-[#0F3D24] outline-none focus:border-[#3F8F3F]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#0F3D24] mb-1">Residential / Office Address</label>
                  <input
                    type="text"
                    placeholder="e.g. Plot 14 Ikenegbu Layout, Owerri"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-[#F7F5F0]/50 px-3.5 py-2.5 font-medium text-[#0F3D24] outline-none focus:border-[#3F8F3F]"
                  />
                </div>
              </div>

              {/* Portal Login Credentials Box */}
              <div className="rounded-2xl border border-[#3F8F3F]/30 bg-[#3F8F3F]/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0F3D24] flex items-center gap-1.5">
                    <KeyRound size={13} className="text-[#3F8F3F]" /> Portal Login Credentials
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAutoSuggestUsername}
                      className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-[#0F3D24] border border-slate-200 hover:bg-[#3F8F3F] hover:text-white transition"
                    >
                      Suggest Username
                    </button>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-[#0F3D24] border border-slate-200 hover:bg-[#3F8F3F] hover:text-white transition"
                    >
                      Generate Passcode
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block font-bold text-[#0F3D24] mb-1">Portal Username *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. emeka_okafor"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ""))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 font-mono font-bold text-[#0F3D24] outline-none focus:border-[#3F8F3F]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#0F3D24] mb-1">Account Password *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="Min 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white pl-3.5 pr-10 py-2 font-mono text-[#0F3D24] outline-none focus:border-[#3F8F3F]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700"
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ───────── STEP 2: CAPITAL & CYCLE ───────── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-300 bg-emerald-50/70 p-4 space-y-1">
                <label className="block font-black text-emerald-950 text-sm">Capital Invested by Partner (₦) *</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-lg font-black text-emerald-800">₦</span>
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="e.g. 2500000"
                    value={initialInvestment}
                    onChange={(e) => setInitialInvestment(e.target.value)}
                    className="w-full rounded-xl border border-emerald-300 bg-white pl-8 pr-4 py-2.5 text-lg font-black text-emerald-950 outline-none focus:ring-2 focus:ring-[#3F8F3F]"
                  />
                </div>
                {numCapital > 0 && (
                  <p className="text-[11px] font-bold text-emerald-800 pt-1">
                    Recorded Capital: {naira(numCapital)}
                  </p>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block font-bold text-[#0F3D24] mb-1">Investment / Payment Date *</label>
                  <input
                    type="date"
                    required
                    value={investmentDate}
                    onChange={(e) => {
                      setInvestmentDate(e.target.value);
                      setCycleStartDate(e.target.value);
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-[#F7F5F0]/50 px-3.5 py-2 font-medium text-[#0F3D24]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#0F3D24] mb-1">Link to Farm Pen Batch</label>
                  <select
                    value={batchId}
                    onChange={(e) => setBatchId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-[#F7F5F0]/50 px-3.5 py-2 font-medium text-[#0F3D24]"
                  >
                    <option value="">Independent slot (No batch linked)</option>
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.batchName} ({b.batchType} · {b.currentHeadcount} birds)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="block font-bold text-[#0F3D24] mb-1">Cycle Name *</label>
                  <input
                    type="text"
                    required
                    value={cycleName}
                    onChange={(e) => setCycleName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-[#F7F5F0]/50 px-3.5 py-2 font-bold text-[#0F3D24]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#0F3D24] mb-1">Cycle Start Date *</label>
                  <input
                    type="date"
                    required
                    value={cycleStartDate}
                    onChange={(e) => setCycleStartDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-[#F7F5F0]/50 px-3.5 py-2 font-medium text-[#0F3D24]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#0F3D24] mb-1">Target End / Harvest Date</label>
                  <input
                    type="date"
                    value={cycleEndDate}
                    onChange={(e) => setCycleEndDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-[#F7F5F0]/50 px-3.5 py-2 font-medium text-[#0F3D24]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#0F3D24] mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-[#F7F5F0]/50 px-3.5 py-2 font-semibold text-[#0F3D24]"
                />
              </div>
            </div>
          )}

          {/* ───────── STEP 3: PROFIT SHARING & TERMS ───────── */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#0F3D24]/15 bg-[#F7F5F0] p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0F3D24]">
                    Select Agreed Profit Split Preset
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: "70% Profit Share (Co-Financier)", p: "70" },
                      { label: "50% Profit Share (Equal Split)", p: "50" },
                      { label: "80% Profit Share", p: "80" },
                      { label: "60% Profit Share", p: "60" },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setProfitSharePercentage(preset.p)}
                        className={`rounded-full px-3 py-1 text-[10px] font-bold transition ${
                          profitSharePercentage === preset.p
                            ? "bg-[#0F3D24] text-white"
                            : "bg-white text-[#0F3D24] ring-1 ring-slate-200 hover:bg-[#3F8F3F] hover:text-white"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <div className="rounded-2xl bg-white p-4 border border-emerald-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="font-extrabold text-emerald-950 text-sm">
                        Partner Profit Share (%)
                      </label>
                      <span className="text-xl font-black text-emerald-800">{pPct}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={pPct}
                      onChange={(e) => setProfitSharePercentage(e.target.value)}
                      className="w-full accent-emerald-700"
                    />
                    <div className="flex justify-between text-[11px] text-slate-600 font-semibold">
                      <span>0%</span>
                      <span>Farm Retained Profit: {100 - pPct}%</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Downside Protection & Agreement Terms Notice */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-black text-[#0F3D24]">
                  <ShieldCheck size={16} className="text-[#3F8F3F] shrink-0" />
                  <span>Downside Risk & Capital Protection Terms</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  As requested by Dignity Agro Farms co-financing policy, downside operational risk and capital protection are governed strictly by Section 4 of the legal <strong>Partnership Agreement</strong>. Partner liability is strictly capped at their initial deposited capital (<strong>{naira(numCapital)}</strong>), with zero negative liability.
                </p>
              </div>

              {/* Live Profit Simulation */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
                <span className="font-extrabold text-[#0F3D24] text-xs block">
                  Projected Return on ₦1,000,000 Net Cycle Profit
                </span>
                <div className="rounded-xl bg-emerald-50/70 p-3.5 border border-emerald-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-950 font-bold">
                      Partner Receives ({pPct}% of Profit):
                    </span>
                    <strong className="text-base font-black text-emerald-900">
                      {naira(1_000_000 * (pPct / 100))}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-emerald-800">
                    <span>Farm Retained Share ({100 - pPct}%):</span>
                    <strong>{naira(1_000_000 * ((100 - pPct) / 100))}</strong>
                  </div>
                  <p className="text-[10px] text-emerald-900/80 pt-1 border-t border-emerald-200/60">
                    Total Estimated Return: Capital ({naira(numCapital)}) + Profit ({naira(1_000_000 * (pPct / 100))}) = <strong>{naira(numCapital + 1_000_000 * (pPct / 100))}</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ───────── STEP 4: TERMS & REVIEW ───────── */}
          {step === 4 && (
            <div className="space-y-4">
              {/* Executive Summary Card */}
              <div className="rounded-2xl bg-[#0F3D24] p-4 text-white space-y-3">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#a8e6a8] block">
                  Onboarding Summary Review
                </span>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-white/70 block text-[10px]">Partner:</span>
                    <strong className="text-white text-sm">{fullName}</strong>
                    <div className="font-mono text-white/80">@{username}</div>
                  </div>
                  <div>
                    <span className="text-white/70 block text-[10px]">Invested Capital:</span>
                    <strong className="text-[#a8e6a8] text-base">{naira(numCapital)}</strong>
                  </div>
                  <div>
                    <span className="text-white/70 block text-[10px]">Cycle & Project:</span>
                    <strong className="text-white">{cycleName}</strong>
                    <div className="text-white/70">{projectName}</div>
                  </div>
                  <div>
                    <span className="text-white/70 block text-[10px]">Agreed Sharing Ratio:</span>
                    <strong className="text-white">{pPct}% Profit Share</strong>
                    <div className="text-white/70 text-[10px]">Downside protection in Agreement</div>
                  </div>
                </div>
              </div>

              {/* Custom Clauses */}
              <div>
                <label className="block font-bold text-[#0F3D24] mb-1">
                  Custom Terms & Notes (Appended to Official Legal Terms)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Broiler cycle duration estimated at 6 weeks. Payouts upon final bird offload reconciliation. Capital disbursed to partner's Zenith Bank account."
                  value={customClauses}
                  onChange={(e) => setCustomClauses(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-[#F7F5F0]/50 p-3 text-[#0F3D24] outline-none focus:border-[#3F8F3F] text-xs font-medium"
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600 flex items-start gap-2">
                <ShieldCheck size={16} className="text-[#3F8F3F] shrink-0 mt-0.5" />
                <span>
                  The standard 7-clause Dignity Agro Farms Partnership Agreement will be automatically generated with these parameters. The partner will be prompted to read and digitally sign it upon logging in to the portal.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-1 rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100 transition"
              >
                <ChevronLeft size={14} /> Back
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
            )}
          </div>

          <div>
            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1 rounded-full bg-[#0F3D24] px-6 py-2 text-xs font-extrabold text-white shadow-md hover:bg-[#165232] transition"
              >
                Continue &rarr;
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-full bg-[#0F3D24] px-6 py-2 text-xs font-extrabold text-white shadow-lg hover:bg-[#165232] disabled:opacity-50 transition"
              >
                {submitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Finalizing Onboarding...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} className="text-[#a8e6a8]" /> Complete & Issue Portal Access
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── POST-REGISTRATION SUCCESS MODAL ──────────────────────────────────────────

function CreatedPartnerSuccessModal({
  info,
  onClose,
  onOpenWorkspace,
}: {
  info: CreatedPartnerInfo;
  onClose: () => void;
  onOpenWorkspace: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const portalUrl = typeof window !== "undefined" ? `${window.location.origin}/for-partners` : "https://dignityagrofarms.com/for-partners";

  const welcomeMessage = `🌱 *DIGNITY AGRO FARMS — PARTNERSHIP PORTAL ACCESS*
Dear ${info.fullName},
You have been successfully registered as an agribusiness partner for *${info.cycleName}*.

💰 *Investment Capital:* ₦${info.capital.toLocaleString()}
📈 *Agreed Profit Share:* ${info.profitPct}% of Net Profit
🛡️ *Loss Responsibility:* ${info.lossPct}% (Protected & capped at capital)

You can now track daily pen activities, feeding, mortality, bird weights, and itemized financial statements live at:
👉 ${portalUrl}

*Your Login Credentials:*
• Username: ${info.username}
• Password: ${info.password}

Please sign in to read and digitally sign your Partnership Terms & Conditions.`;

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(welcomeMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl ring-1 ring-[#0F3D24]/10 overflow-hidden space-y-4 p-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Sparkles size={28} />
          </div>
          <h3 className="text-xl font-black text-[#0F3D24]">Partner Successfully Onboarded!</h3>
          <p className="text-xs text-slate-600">
            <strong>{info.fullName}</strong> is now registered. Credentials have been issued.
          </p>
        </div>

        {/* Credentials Card */}
        <div className="rounded-2xl border border-emerald-200 bg-[#F7F5F0] p-4 text-xs space-y-2">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
            <span className="text-slate-500 font-medium">Portal Username:</span>
            <strong className="font-mono font-bold text-[#0F3D24] text-sm">@{info.username}</strong>
          </div>
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
            <span className="text-slate-500 font-medium">Initial Password:</span>
            <strong className="font-mono font-bold text-[#0F3D24] text-sm">{info.password}</strong>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-slate-500 font-medium">Portal URL:</span>
            <a href={portalUrl} target="_blank" rel="noreferrer" className="text-[#3F8F3F] font-bold underline truncate max-w-[200px]">
              {portalUrl}
            </a>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={handleCopyMessage}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] py-3 text-xs font-extrabold text-white shadow-md hover:bg-[#20ba5a] transition"
          >
            {copied ? (
              <>
                <Check size={16} /> WhatsApp Message Copied!
              </>
            ) : (
              <>
                <Share2 size={16} /> Copy WhatsApp Welcome & Login Message
              </>
            )}
          </button>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-slate-100 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => onOpenWorkspace(info.id)}
              className="rounded-full bg-[#0F3D24] py-2.5 text-xs font-bold text-white hover:bg-[#165232] transition"
            >
              Open Partner Workspace &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL: COMPREHENSIVE PARTNER EDIT & ACCOUNT DELETION ─────────────────────

export function EditPartnerModal({
  passcode,
  partner,
  batches,
  hasEntries,
  onClose,
  onSuccess,
  onDeleted,
}: {
  passcode: string;
  partner: FarmPartner;
  batches: any[];
  hasEntries?: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onDeleted?: () => void;
}) {
  const qc = useQueryClient();
  const updatePartnerFn = useServerFn(adminUpdatePartner);
  const deletePartnerFn = useServerFn(adminDeletePartner);
  const toggleActiveFn = useServerFn(adminTogglePartnerActive);

  const [activeTab, setActiveTab] = useState<
    "profile" | "cycle" | "sharing" | "credentials" | "danger"
  >("profile");

  // Profile fields
  const [fullName, setFullName] = useState(partner.fullName);
  const [phone, setPhone] = useState(partner.phone);
  const [email, setEmail] = useState(partner.email || "");
  const [address, setAddress] = useState(partner.address || "");
  const [status, setStatus] = useState<FarmPartner["status"]>(partner.status);
  const [isActive, setIsActive] = useState<boolean>(partner.active);

  // Capital & Cycle fields
  const [initialInvestment, setInitialInvestment] = useState(String(partner.initialInvestment || 0));
  const [investmentDate, setInvestmentDate] = useState(
    partner.investmentDate || new Date().toISOString().slice(0, 10),
  );
  const [projectName, setProjectName] = useState(partner.projectName);
  const [cycleName, setCycleName] = useState(partner.cycleName);
  const [cycleStartDate, setCycleStartDate] = useState(
    partner.cycleStartDate || partner.investmentDate || new Date().toISOString().slice(0, 10),
  );
  const [cycleEndDate, setCycleEndDate] = useState(partner.cycleEndDate || "");
  const [batchId, setBatchId] = useState(partner.batchId || "");

  // Sharing Matrix
  const [profitShare, setProfitShare] = useState(String(partner.profitSharePercentage ?? 70));
  const [lossShare, setLossShare] = useState(String(partner.lossSharePercentage ?? 100));
  const [agreedTerms, setAgreedTerms] = useState(partner.agreedTerms || "");
  const [amendReason, setAmendReason] = useState("");

  // Credentials
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const portalUrl =
    typeof window !== "undefined" ? `${window.location.origin}/for-partners` : "/for-partners";

  const termsChanged =
    Number(profitShare) !== partner.profitSharePercentage ||
    Number(initialInvestment) !== partner.initialInvestment;

  const handleGeneratePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let rand = "";
    for (let i = 0; i < 4; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(`Daf-${rand}`);
    setShowPassword(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg("Please provide the partner's full name.");
      setActiveTab("profile");
      return;
    }
    if (!phone.trim()) {
      setErrorMsg("Please provide a contact phone number.");
      setActiveTab("profile");
      return;
    }
    if (newPassword.trim() && newPassword.trim().length < 6) {
      setErrorMsg("New password must be at least 6 characters.");
      setActiveTab("credentials");
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      await updatePartnerFn({
        data: {
          passcode,
          partnerId: partner.id,
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          address: address.trim() || null,
          initialInvestment: Number(initialInvestment) || 0,
          investmentDate,
          profitSharePercentage: Number(profitShare) || 0,
          lossSharePercentage: Number(lossShare) || 0,
          agreedTerms: agreedTerms.trim() || null,
          projectName: projectName.trim() || "Broiler Cycle Partnership",
          cycleName: cycleName.trim() || "Cycle 1",
          cycleStartDate,
          cycleEndDate: cycleEndDate || null,
          batchId: batchId || null,
          status,
          amendReason: amendReason.trim() || (termsChanged ? "Amended details and terms by farm owner" : null),
          newPassword: newPassword.trim() || null,
        },
      });

      if (isActive !== partner.active) {
        await toggleActiveFn({
          data: {
            passcode,
            partnerId: partner.id,
            active: isActive,
          },
        });
      }

      qc.invalidateQueries({ queryKey: ["admin-partners"] });
      qc.invalidateQueries({ queryKey: ["admin-partner-detail", passcode, partner.id] });
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err instanceof Error ? err.message : "Could not update partner details.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePartner = async () => {
    if (
      !confirm(
        `Are you completely sure you want to permanently delete ${partner.fullName}? All associated financial entries, receipts, activity records, and login credentials will be completely erased. This cannot be undone.`,
      )
    ) {
      return;
    }

    setDeleting(true);
    setErrorMsg(null);
    try {
      await deletePartnerFn({ data: { passcode, partnerId: partner.id } });
      qc.invalidateQueries({ queryKey: ["admin-partners"] });
      if (onDeleted) {
        onDeleted();
      } else {
        onSuccess();
      }
    } catch (err: any) {
      setErrorMsg(err instanceof Error ? err.message : "Could not delete partner.");
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl ring-1 ring-[#0F3D24]/10 my-8 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-[#0F3D24] p-5 text-white">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white font-black text-sm">
              <Pencil size={18} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">Edit Partner Details</h3>
                <span className="rounded-md bg-white/15 px-2 py-0.5 text-[10px] font-mono font-bold text-white/90">
                  @{partner.username}
                </span>
              </div>
              <p className="text-xs text-white/75 mt-0.5">
                Update profile, sharing split, batch link, or portal login credentials
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-[#FAF9F6] px-4 pt-2 overflow-x-auto gap-1 text-xs font-bold scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 transition whitespace-nowrap ${
              activeTab === "profile"
                ? "border-[#0F3D24] text-[#0F3D24]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <User size={13} /> Profile & Contact
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("cycle")}
            className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 transition whitespace-nowrap ${
              activeTab === "cycle"
                ? "border-[#0F3D24] text-[#0F3D24]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Wallet size={13} /> Capital & Cycle
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("sharing")}
            className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 transition whitespace-nowrap ${
              activeTab === "sharing"
                ? "border-[#0F3D24] text-[#0F3D24]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <TrendingUp size={13} /> Profit Share & Terms
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("credentials")}
            className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 transition whitespace-nowrap ${
              activeTab === "credentials"
                ? "border-[#0F3D24] text-[#0F3D24]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <KeyRound size={13} /> Password & Access
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("danger")}
            className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 transition whitespace-nowrap ${
              activeTab === "danger"
                ? "border-rose-600 text-rose-700 bg-rose-50/50 rounded-t-lg"
                : "border-transparent text-rose-600/70 hover:text-rose-700"
            }`}
          >
            <Trash2 size={13} /> Delete Partner
          </button>
        </div>

        {/* Tab Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800">
              <AlertTriangle size={15} className="shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: PROFILE & CONTACT */}
          {activeTab === "profile" && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block font-bold text-[#0F3D24]">Full Legal / Business Name *</label>
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Chief John Okafor"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-[#0F3D24] font-medium outline-none focus:border-[#0F3D24]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold text-[#0F3D24]">Phone Number (WhatsApp) *</label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +234 803 123 4567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-[#0F3D24] font-medium outline-none focus:border-[#0F3D24]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block font-bold text-[#0F3D24]">Email Address (Optional)</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="email"
                      placeholder="e.g. partner@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-[#0F3D24] font-medium outline-none focus:border-[#0F3D24]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold text-[#0F3D24]">Contact / Residential Address</label>
                  <div className="relative">
                    <MapPin size={14} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. 14 Farm Road, Epe, Lagos"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-[#0F3D24] font-medium outline-none focus:border-[#0F3D24]"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="block font-bold text-[#0F3D24]">Partner Account Status</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      { id: "active", label: "Active", desc: "Open cycle" },
                      { id: "paused", label: "Paused", desc: "On hold" },
                      { id: "matured", label: "Matured", desc: "Ready to settle" },
                      { id: "completed", label: "Completed", desc: "Settled & closed" },
                    ] as const
                  ).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStatus(s.id)}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        status === s.id
                          ? "border-[#0F3D24] bg-[#0F3D24]/5 text-[#0F3D24] font-black"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div className="font-extrabold capitalize">{s.label}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CAPITAL & CYCLE */}
          {activeTab === "cycle" && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block font-bold text-[#0F3D24]">Committed Investment Capital (₦) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-500 font-bold">₦</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      placeholder="e.g. 500000"
                      value={initialInvestment}
                      onChange={(e) => setInitialInvestment(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-2 text-[#0F3D24] font-mono font-bold outline-none focus:border-[#0F3D24]"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Formally registered capital: {naira(Number(initialInvestment) || 0)}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold text-[#0F3D24]">Investment Capital Deposit Date *</label>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="date"
                      required
                      value={investmentDate}
                      onChange={(e) => setInvestmentDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-[#0F3D24] font-medium outline-none focus:border-[#0F3D24]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block font-bold text-[#0F3D24]">Project / Venture Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Broiler Cycle Partnership"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[#0F3D24] font-medium outline-none focus:border-[#0F3D24]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold text-[#0F3D24]">Cycle Name / Label *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cycle 1 — 6-Week Broilers"
                    value={cycleName}
                    onChange={(e) => setCycleName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[#0F3D24] font-medium outline-none focus:border-[#0F3D24]"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block font-bold text-[#0F3D24]">Cycle Start Date *</label>
                  <input
                    type="date"
                    required
                    value={cycleStartDate}
                    onChange={(e) => setCycleStartDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[#0F3D24] font-medium outline-none focus:border-[#0F3D24]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold text-[#0F3D24]">Cycle Target End Date (Optional)</label>
                  <input
                    type="date"
                    value={cycleEndDate}
                    onChange={(e) => setCycleEndDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[#0F3D24] font-medium outline-none focus:border-[#0F3D24]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-[#0F3D24]">Linked Farm Production Batch</label>
                <select
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[#0F3D24] font-medium outline-none focus:border-[#0F3D24]"
                >
                  <option value="">No Batch Linked (Standalone Flock)</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batch_name} ({b.breed || "Broilers"} · {b.initial_chicks_count ?? b.current_chicks_count ?? 0} birds · Status: {b.status})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500">
                  Linking a batch allows 1-click proportional syncing of farm operational expenses and bird sales receipts into this partner's ledger.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: PROFIT SHARING & TERMS */}
          {activeTab === "sharing" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-emerald-950">Partner Profit Share %</label>
                  <span className="font-mono text-base font-black text-emerald-800 tabular-nums">
                    {profitShare}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={profitShare}
                  onChange={(e) => setProfitShare(e.target.value)}
                  className="w-full accent-[#0F3D24]"
                />
                <div className="text-[10px] text-emerald-900/80">
                  Farm retains remaining <strong>{100 - (Number(profitShare) || 0)}%</strong> of net profits.
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-[#FAF9F6] p-3 text-slate-700 text-xs flex items-start gap-2">
                <ShieldCheck size={16} className="text-[#3F8F3F] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[#0F3D24] block">Downside Capital Protection Rule</strong>
                  Under Section 4 of the legal Partnership Agreement, partner loss is strictly capped at their initial committed capital ({naira(Number(initialInvestment) || 0)}). Partners never owe the farm out-of-pocket money.
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-[#0F3D24]">Agreed Partnership Terms / Specific Clauses</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Broiler cycle lasts 6 weeks. Mortality above 7% triggers mutual review."
                  value={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[#0F3D24] font-medium outline-none focus:border-[#0F3D24]"
                />
              </div>

              {termsChanged && hasEntries && (
                <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3.5 space-y-1.5">
                  <label className="block font-extrabold text-amber-950">
                    Reason for Amending Terms / Capital (Visible in partner audit timeline)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mutual agreement to increase profit share from 60% to 70%"
                    value={amendReason}
                    onChange={(e) => setAmendReason(e.target.value)}
                    className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-[#0F3D24] font-medium outline-none focus:border-[#0F3D24]"
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PASSWORD & PORTAL CREDENTIALS */}
          {activeTab === "credentials" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-[#FAF9F6] p-4 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-600">Portal Login URL:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-[#0F3D24] text-xs">{portalUrl}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(portalUrl);
                        setCopiedUrl(true);
                        setTimeout(() => setCopiedUrl(false), 2000);
                      }}
                      className="text-slate-400 hover:text-[#0F3D24] p-1"
                    >
                      {copiedUrl ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-600">Username:</span>
                  <span className="font-mono font-extrabold text-[#0F3D24] text-sm">@{partner.username}</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-600">Portal Access State:</span>
                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-extrabold transition ${
                      isActive
                        ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                        : "bg-rose-100 text-rose-800 hover:bg-rose-200"
                    }`}
                  >
                    {isActive ? "Active / Authorized" : "Deactivated / Locked"}
                  </button>
                </div>
              </div>

              {/* Reset Password Field */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-[#0F3D24]">Reset Partner Password</label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#3F8F3F] hover:underline"
                  >
                    <Sparkles size={12} /> Auto-Generate
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Leave blank to keep current, or enter 6+ chars"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-10 text-[#0F3D24] font-mono outline-none focus:border-[#0F3D24]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  If entered, saving will instantly hash and replace their login passcode.
                </p>
              </div>
            </div>
          )}

          {/* TAB 5: DANGER ZONE (PERMANENT DELETION) */}
          {activeTab === "danger" && (
            <div className="space-y-4">
              <div className="rounded-3xl border-2 border-rose-300 bg-rose-50/60 p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-rose-950">
                      Permanently Delete Partner Account & Records
                    </h4>
                    <p className="mt-1 text-xs text-rose-900/80 leading-relaxed">
                      You are about to permanently delete <strong>{partner.fullName}</strong> (@{partner.username}). This will completely erase:
                    </p>
                    <ul className="mt-2 list-disc list-inside text-xs text-rose-950 space-y-1 font-medium">
                      <li>Their partner profile, contact data, and portal credentials.</li>
                      <li>All recorded operational expenses, sales receipts, and payouts.</li>
                      <li>All bird stock records, feeding logs, and pen photo attachments.</li>
                      <li>Signed partnership agreements and settlement certificates.</li>
                    </ul>
                  </div>
                </div>

                <div className="pt-3 border-t border-rose-200/80 flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-rose-900">
                    This action is immediate and cannot be undone.
                  </span>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={handleDeletePartner}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-black text-white hover:bg-rose-700 disabled:opacity-50 transition shadow-sm"
                  >
                    {deleting ? (
                      <>
                        <Loader2 size={13} className="animate-spin" /> Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 size={13} /> Delete Partner Entirely
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Footer Controls */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0F3D24] px-6 py-2.5 text-xs font-black text-white hover:bg-[#165232] disabled:opacity-50 transition shadow-sm"
            >
              {saving ? (
                <>
                  <Loader2 size={13} className="animate-spin" /> Saving Changes...
                </>
              ) : (
                <>
                  <Check size={14} /> Save Partner Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
