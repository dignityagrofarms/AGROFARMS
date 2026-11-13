import { adminReceiptReport } from "@/lib/report.functions";
import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  TrendingUp,
  TrendingDown,
  PlusCircle,
  Calendar,
  Layers,
  DollarSign,
  PieChart,
  UserPlus,
  Phone,
  Mail,
  MapPin,
  Tag,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trash2,
  Pencil,
  FileText,
  Search,
  Filter,
  Activity,
  Award,
  ChevronRight,
  MessageSquare,
  Sparkles,
  Loader2,
  X,
  PhoneCall,
  UserCheck,
  ShieldAlert,
  Download,
  Gift,
  LayoutGrid,
  List,
  FileSpreadsheet,
  Lock,
  Unlock,
  CreditCard,
  Eye,
  EyeOff,
  Info,
  Flag,
} from "lucide-react";
import { FinanceSalesChart } from "./FinanceSalesChart";
import { ExportReportModal } from "./ExportReportModal";
import { LeadImportModal } from "./LeadImportModal";
import { FinancialImportModal } from "./FinancialImportModal";
import { ActivityImportModal } from "./ActivityImportModal";
import { DailyLogModal } from "./DailyLogModal";
import { TypoReviewModal } from "./TypoReviewModal";
import { ActivityEditModal, FinancialEditModal } from "./SubmissionEditModals";
import { ReminderModal } from "./ReminderModal";
import { DebtorsCreditorsPanel, RecordFinancialPaymentModal } from "./DebtorsCreditorsPanel";
import { NumberField } from "@/components/ui/number-field";
import {
  adminListOrders,
  adminAssignOrderBatch,
  type AdminOrder,
  type AdminRole,
} from "@/lib/orders.functions";
import {
  adminListPreorders,
  adminAssignPreorderBatch,
  type Preorder,
} from "@/lib/preorders.functions";
import {
  adminListBatches,
  adminCreateBatch,
  adminUpdateBatch,
  adminDeleteBatch,
  adminCloseBatch,
  adminReopenBatch,
  adminToggleBatchStaffFinancials,
  adminListFinancials,
  adminCreateFinancial,
  adminUpdateFinancial,
  adminDeleteFinancial,
  adminGetBatchReport,
  adminGetBatchFeedLedger,
  adminListDebtorsCreditorsReport,
  adminListLeads,
  adminCreateLead,
  adminUpdateLead,
  adminDeleteLead,
  adminLogLeadCommunication,
  type LeadCommunication,
  adminListActivities,
  adminCreateActivity,
  adminDeleteActivity,
  adminListMySubmissions,
  adminDismissMySubmission,
  type FarmBatch,
  type FarmFinancial,
  type CrmLead,
  type FarmActivity,
  type BatchReport,
} from "@/lib/farm.functions";

const formatNaira = (val: number) =>
  "₦" + val.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

// ─── 1. BATCHES & FINANCIALS PANEL ───────────────────────────────────────────

export function BatchFinancialsPanel({
  passcode,
  role = "owner",
  username,
  onNavigateToContacts,
  pendingApprovalsCount = 0,
  onNavigateToApprovals,
}: {
  passcode: string;
  role?: AdminRole;
  username?: string;
  onNavigateToContacts?: () => void;
  pendingApprovalsCount?: number;
  onNavigateToApprovals?: () => void;
}) {
  const queryClient = useQueryClient();
  const [finSubView, setFinSubView] = useState<"overview" | "debtors_creditors">("overview");
  const [selectedBatchId, setSelectedBatchId] = useState<string>("all");
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showFinancialModal, setShowFinancialModal] = useState(false);
  const [showFinancialImportModal, setShowFinancialImportModal] = useState(false);
  const [pendingFinTypoConfirm, setPendingFinTypoConfirm] = useState(false);
  const [editingBatch, setEditingBatch] = useState<FarmBatch | null>(null);
  const [editingFinancial, setEditingFinancial] = useState<FarmFinancial | null>(null);
  const [payingFinancial, setPayingFinancial] = useState<FarmFinancial | null>(null);
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selectedStaffReportBatchId, setSelectedStaffReportBatchId] = useState<string>("");
  const [showCostFormulaInfo, setShowCostFormulaInfo] = useState(false);

  const listMySubmissionsFn = useServerFn(adminListMySubmissions);
  const dismissMySubFn = useServerFn(adminDismissMySubmission);
  const mySubmissionsQuery = useQuery({
    queryKey: ["my-submissions", passcode],
    queryFn: () => listMySubmissionsFn({ data: { passcode } }),
    enabled: Boolean(passcode) && role !== "owner",
    refetchInterval: 25000,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });
  const myFinancialSubmissions = useMemo(
    () =>
      (mySubmissionsQuery.data || []).filter(
        (s) => s.targetType === "financial" || s.targetType === "fin_payment",
      ),
    [mySubmissionsQuery.data],
  );
  const dismissMySubMut = useMutation({
    mutationFn: (vars: {
      id: string;
      targetType: "financial" | "activity" | "contact_tx" | "fin_payment";
    }) => dismissMySubFn({ data: { passcode, id: vars.id, targetType: vars.targetType } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-submissions"] });
    },
    onError: (e: Error) => setFeedback("Could not dismiss record: " + e.message),
  });

  const listOrdersFn = useServerFn(adminListOrders);
  const listPreordersFn = useServerFn(adminListPreorders);
  const listBatchesFn = useServerFn(adminListBatches);
  const createBatchFn = useServerFn(adminCreateBatch);
  const updateBatchFn = useServerFn(adminUpdateBatch);
  const deleteBatchFn = useServerFn(adminDeleteBatch);
  const closeBatchFn = useServerFn(adminCloseBatch);
  const reopenBatchFn = useServerFn(adminReopenBatch);
  const toggleStaffVisFn = useServerFn(adminToggleBatchStaffFinancials);
  const listFinancialsFn = useServerFn(adminListFinancials);
  const createFinancialFn = useServerFn(adminCreateFinancial);
  const deleteFinancialFn = useServerFn(adminDeleteFinancial);
  const getBatchReportFn = useServerFn(adminGetBatchReport);
  const listActivitiesFn = useServerFn(adminListActivities);

  // Queries
  const ordersQuery = useQuery({
    queryKey: ["admin-orders-financials", passcode],
    queryFn: () => listOrdersFn({ data: { passcode } }),
    enabled: Boolean(passcode) && role !== "staff",
    staleTime: 30000,
    placeholderData: (previousData) => previousData,
  });

  const preordersQuery = useQuery({
    queryKey: ["admin-preorders-financials", passcode],
    queryFn: () => listPreordersFn({ data: { passcode } }),
    enabled: Boolean(passcode) && role !== "staff",
    staleTime: 30000,
    placeholderData: (previousData) => previousData,
  });

  const batchesQuery = useQuery({
    queryKey: ["farm-batches", passcode],
    queryFn: () => listBatchesFn({ data: { passcode } }),
    enabled: Boolean(passcode),
    placeholderData: (previousData) => previousData,
  });

  const financialsQuery = useQuery({
    queryKey: ["farm-financials", passcode],
    queryFn: () =>
      listFinancialsFn({
        data: {
          passcode,
          batchId: null,
        },
      }),
    enabled: Boolean(passcode) && role !== "staff",
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });

  const activitiesQuery = useQuery({
    queryKey: ["farm-activities-report", passcode, selectedBatchId],
    queryFn: () =>
      listActivitiesFn({
        data: {
          passcode,
          batchId:
            selectedBatchId === "all" || selectedBatchId === "__general__" ? null : selectedBatchId,
        },
      }),
    enabled: Boolean(passcode) && role !== "staff",
    placeholderData: (previousData) => previousData,
  });

  const reportQuery = useQuery({
    queryKey: ["batch-report", passcode, selectedBatchId],
    queryFn: () =>
      selectedBatchId === "all" || selectedBatchId === "__general__"
        ? null
        : getBatchReportFn({ data: { passcode, batchId: selectedBatchId } }),
    enabled:
      Boolean(passcode) &&
      selectedBatchId !== "all" &&
      selectedBatchId !== "__general__" &&
      role !== "staff",
    placeholderData: (previousData) => previousData,
  });

  const [showExportModal, setShowExportModal] = useState<boolean>(false);

  const debtorsSummaryQuery = useQuery({
    queryKey: ["debtors-creditors", "all-count"],
    queryFn: () => adminListDebtorsCreditorsReport({ data: { passcode, batchId: null } }),
    enabled: Boolean(passcode) && role !== "staff",
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });

  const feedLedgerQuery = useQuery({
    queryKey: ["batch-feed-ledger", passcode, selectedBatchId],
    queryFn: () => adminGetBatchFeedLedger({ data: { passcode, batchId: selectedBatchId } }),
    enabled:
      Boolean(passcode) &&
      role !== "staff" &&
      selectedBatchId !== "all" &&
      selectedBatchId !== "__general__",
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });

  // Batch Form State
  const [batchForm, setBatchForm] = useState({
    batchName: "",
    batchType: "Broiler",
    initialHeadcount: 500,
    startDate: new Date().toISOString().split("T")[0],
    targetHarvestDate: "",
    notes: "",
    showFinancialsToStaff: false,
  });

  // Financial Form State
  const [finForm, setFinForm] = useState({
    batchId: "",
    type: "expense" as "expense" | "income",
    category: "Feed",
    amount: "",
    amountPaid: "",
    partyName: "",
    dueDate: "",
    description: "",
    paymentMethod: "Bank Transfer",
    transactionDate: new Date().toISOString().split("T")[0],
    referenceNo: "",
    feedBags: "",
    feedKgPerBag: "25",
    feedBrand: "",
    birdsSold: "",
  });

  const createBatchMut = useMutation({
    mutationFn: () =>
      createBatchFn({
        data: {
          passcode,
          batchName: batchForm.batchName,
          batchType: batchForm.batchType,
          initialHeadcount: Number(batchForm.initialHeadcount),
          startDate: batchForm.startDate,
          targetHarvestDate: batchForm.targetHarvestDate || null,
          notes: batchForm.notes || null,
          showFinancialsToStaff: Boolean(batchForm.showFinancialsToStaff),
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farm-batches"] });
      setShowBatchModal(false);
      setBatchForm({
        batchName: "",
        batchType: "Broiler",
        initialHeadcount: 500,
        startDate: new Date().toISOString().split("T")[0],
        targetHarvestDate: "",
        notes: "",
        showFinancialsToStaff: false,
      });
      setFeedback("New farm batch registered successfully.");
    },
    onError: (e: Error) => setFeedback("Error: " + e.message),
  });

  const updateBatchMut = useMutation({
    mutationFn: (b: FarmBatch) =>
      updateBatchFn({
        data: {
          passcode,
          id: b.id,
          batchName: b.batchName,
          batchType: b.batchType,
          initialHeadcount: b.initialHeadcount,
          currentHeadcount: b.currentHeadcount,
          status: b.status,
          startDate: b.startDate,
          targetHarvestDate: b.targetHarvestDate || null,
          notes: b.notes || null,
          showFinancialsToStaff: Boolean(b.showFinancialsToStaff),
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farm-batches"] });
      queryClient.invalidateQueries({ queryKey: ["batch-report"] });
      setEditingBatch(null);
      setFeedback("Batch updated successfully.");
    },
    onError: (e: Error) => setFeedback("Error updating batch: " + e.message),
  });

  const closeBatchMut = useMutation({
    mutationFn: (id: string) => {
      const reason = window.prompt(
        "Confirm physical birds remaining are zero. Enter a reconciliation reason; any residual count will be recorded as a stock adjustment, not a sale or mortality.",
      );
      if (!reason?.trim())
        throw new Error("Closing cancelled: a reconciliation reason is required.");
      return closeBatchFn({ data: { passcode, id, reason } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farm-batches"] });
      queryClient.invalidateQueries({ queryKey: ["batch-report"] });
      setFeedback("Batch closed. New entries can no longer target this batch until reopened.");
    },
    onError: (e: Error) => setFeedback("Error closing batch: " + e.message),
  });

  const reopenBatchMut = useMutation({
    mutationFn: (id: string) => reopenBatchFn({ data: { passcode, id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farm-batches"] });
      queryClient.invalidateQueries({ queryKey: ["batch-report"] });
      setFeedback("Batch reopened and active for new records.");
    },
    onError: (e: Error) => setFeedback("Error reopening batch: " + e.message),
  });

  const toggleStaffVisMut = useMutation({
    mutationFn: (vars: { id: string; show: boolean }) =>
      toggleStaffVisFn({ data: { passcode, id: vars.id, show: vars.show } }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["farm-batches"] });
      queryClient.invalidateQueries({ queryKey: ["batch-report"] });
      setFeedback(
        res.showFinancialsToStaff
          ? "Financial visibility enabled for staff on this batch."
          : "Batch financials hidden from staff accounts.",
      );
    },
    onError: (e: Error) => setFeedback("Error updating staff visibility: " + e.message),
  });

  const staffUnlockedBatches = useMemo(
    () => (batchesQuery.data || []).filter((b) => Boolean(b.showFinancialsToStaff)),
    [batchesQuery.data],
  );
  const effectiveStaffBatchId =
    staffUnlockedBatches.find((b) => b.id === selectedStaffReportBatchId)?.id ||
    staffUnlockedBatches[0]?.id ||
    "";

  const staffReportQuery = useQuery({
    queryKey: ["batch-report", passcode, "staff", effectiveStaffBatchId],
    queryFn: () => getBatchReportFn({ data: { passcode, batchId: effectiveStaffBatchId } }),
    enabled: role === "staff" && Boolean(passcode) && Boolean(effectiveStaffBatchId),
    placeholderData: (previousData) => previousData,
  });

  const createFinancialMut = useMutation({
    mutationFn: () => {
      const totalAmt = Number(finForm.amount);
      const parsedPaid =
        finForm.amountPaid.trim() === "" ? totalAmt : Math.max(0, Number(finForm.amountPaid));
      const isFeedExp =
        (role === "staff" || finForm.type === "expense") && finForm.category === "Feed";
      const parsedBags =
        isFeedExp && finForm.feedBags.trim() !== "" ? Number(finForm.feedBags) : null;
      const parsedKgPerBag =
        isFeedExp && parsedBags && parsedBags > 0 && finForm.feedKgPerBag.trim() !== ""
          ? Number(finForm.feedKgPerBag)
          : isFeedExp && parsedBags && parsedBags > 0
            ? 25
            : null;
      const isBirdIncome =
        role !== "staff" &&
        finForm.type === "income" &&
        /bird|offload|broiler|chicken|pre-?order/i.test(finForm.category);
      const parsedBirdsSold =
        isBirdIncome && finForm.birdsSold.trim() !== ""
          ? Math.max(0, Math.round(Number(finForm.birdsSold)))
          : null;
      return createFinancialFn({
        data: {
          passcode,
          batchId: finForm.batchId,
          type: role === "staff" ? "expense" : finForm.type,
          category: finForm.category,
          amount: totalAmt,
          amountPaid: parsedPaid,
          partyName: finForm.partyName.trim() || null,
          dueDate: finForm.dueDate.trim() || null,
          description: finForm.description,
          paymentMethod: finForm.paymentMethod,
          transactionDate: finForm.transactionDate,
          referenceNo: finForm.referenceNo || null,
          feedBags: parsedBags,
          feedKgPerBag: parsedKgPerBag,
          feedBrand: isFeedExp ? finForm.feedBrand.trim() || null : null,
          birdsSold: parsedBirdsSold,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["pending-approvals-count"] });
      if (role !== "staff") {
        queryClient.invalidateQueries({ queryKey: ["farm-batches"] });
        queryClient.invalidateQueries({ queryKey: ["farm-financials"] });
        queryClient.invalidateQueries({ queryKey: ["farm-financials-all"] });
        queryClient.invalidateQueries({ queryKey: ["debtors-creditors"] });
        queryClient.invalidateQueries({ queryKey: ["batch-report"] });
        queryClient.invalidateQueries({ queryKey: ["batch-feed-ledger"] });
      }
      setPendingFinTypoConfirm(false);
      setShowFinancialModal(false);
      setFinForm({
        batchId: "",
        type: "expense",
        category: "Feed",
        amount: "",
        amountPaid: "",
        partyName: "",
        dueDate: "",
        description: "",
        paymentMethod: "Bank Transfer",
        transactionDate: new Date().toISOString().split("T")[0],
        referenceNo: "",
        feedBags: "",
        feedKgPerBag: "25",
        feedBrand: "",
        birdsSold: "",
      });
      setFeedback(
        role === "owner"
          ? "Transaction registered successfully."
          : "Submitted for Owner approval! It stays visible under Your Submissions below until reviewed.",
      );
    },
    onError: (e: Error) => {
      setPendingFinTypoConfirm(false);
      setFeedback("Error: " + e.message);
    },
  });

  const deleteFinMut = useMutation({
    mutationFn: (id: string) => deleteFinancialFn({ data: { passcode, id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farm-financials"] });
      queryClient.invalidateQueries({ queryKey: ["batch-report"] });
      setFeedback("Transaction deleted.");
    },
    onError: (e: Error) => setFeedback("Delete error: " + e.message),
  });

  const assignOrderBatchFn = useServerFn(adminAssignOrderBatch);
  const assignPreorderBatchFn = useServerFn(adminAssignPreorderBatch);
  const updateFinancialFn = useServerFn(adminUpdateFinancial);

  const assignRowBatchMut = useMutation({
    mutationFn: async (vars: { row: any; batchId: string | null }) => {
      const { row, batchId } = vars;
      if (row.orderId) {
        await assignOrderBatchFn({ data: { passcode, orderId: row.orderId, batchId } });
        return;
      }
      if (row.preorderId) {
        await assignPreorderBatchFn({ data: { passcode, preorderId: row.preorderId, batchId } });
        return;
      }
      await updateFinancialFn({
        data: {
          passcode,
          id: row.id,
          batchId,
          type: row.type,
          category: row.category,
          amount: Number(row.originalAmount ?? row.amount),
          amountPaid:
            row.amountPaid !== null && row.amountPaid !== undefined
              ? Number(row.amountPaid)
              : Number(row.amount),
          partyName: row.partyName || null,
          dueDate: row.dueDate || null,
          description: row.description,
          paymentMethod: row.paymentMethod,
          transactionDate: row.transactionDate,
          referenceNo: row.referenceNo || null,
          feedBags: row.feedBags ?? null,
          feedKgPerBag: row.feedKgPerBag ?? null,
          feedBrand: row.feedBrand ?? null,
          birdsSold: row.birdsSold ?? null,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders-all"] });
      queryClient.invalidateQueries({ queryKey: ["admin-preorders-all"] });
      queryClient.invalidateQueries({ queryKey: ["farm-financials-all"] });
      queryClient.invalidateQueries({ queryKey: ["farm-financials"] });
      queryClient.invalidateQueries({ queryKey: ["farm-batches"] });
      queryClient.invalidateQueries({ queryKey: ["batch-report"] });
      queryClient.invalidateQueries({ queryKey: ["batch-feed-ledger"] });
      setFeedback("Transaction assigned to batch successfully.");
    },
    onError: (e: Error) => setFeedback("Failed to assign batch: " + e.message),
  });

  const batches = batchesQuery.data || [];
  const activeBatches = useMemo(() => batches.filter((b) => b.status === "active"), [batches]);
  const batchIdSet = useMemo(() => new Set(batches.map((b) => b.id)), [batches]);
  const allFarmFinancials = financialsQuery.data || [];
  const rawFinancials = useMemo(() => {
    if (selectedBatchId === "__general__") {
      return allFarmFinancials.filter((f) => !f.batchId || !batchIdSet.has(f.batchId));
    }
    return selectedBatchId === "all"
      ? allFarmFinancials
      : allFarmFinancials.filter((f) => f.batchId === selectedBatchId);
  }, [allFarmFinancials, selectedBatchId, batchIdSet]);
  const orders = ordersQuery.data?.orders || [];
  const preorders = preordersQuery.data?.preorders || [];

  const receiptReportFn = useServerFn(adminReceiptReport);
  const receiptReport = useQuery({
    queryKey: ["farm-financials", "receipts", passcode],
    queryFn: () => receiptReportFn({ data: { passcode } }),
    enabled: Boolean(passcode) && role !== "staff",
    refetchInterval: 20000,
  });
  const reportRows = receiptReport.data?.rows || [];
  const selectedRows = reportRows.filter(
    (r) =>
      selectedBatchId === "all" ||
      (selectedBatchId === "__general__"
        ? !r.batchId || !batchIdSet.has(r.batchId)
        : r.batchId === selectedBatchId),
  );
  const storeOrderTransactions = selectedRows.filter((r) => r.orderId);
  const decemberPreorderTransactions = selectedRows.filter((r) => r.preorderId);
  const manualReceiptRows = selectedRows.filter((r) => !r.isOrder);
  const allFinancials = selectedRows;
  const farmWideTotals = reportRows.reduce(
    (total, r) => {
      if (r.type === "income") total.totalIncome += r.amount;
      else total.totalExpense += r.amount;
      total.netProfit = total.totalIncome - total.totalExpense;
      return total;
    },
    { totalIncome: 0, totalExpense: 0, netProfit: 0 },
  );
  const perBatchBreakdown = [
    ...batches.map((b) => ({
      id: b.id,
      batchName: b.batchName,
      batchType: b.batchType,
      status: b.status,
      currentHeadcount: b.currentHeadcount,
    })),
    {
      id: "__general__",
      batchName: "Unassigned / Storefront",
      batchType: "General",
      status: "active" as const,
      currentHeadcount: 0,
    },
  ].map((b) => {
    const entries = reportRows.filter((r) =>
      b.id === "__general__" ? !r.batchId || !batchIdSet.has(r.batchId) : r.batchId === b.id,
    );
    return {
      ...b,
      income: entries.filter((r) => r.type === "income").reduce((sum, r) => sum + r.amount, 0),
      expense: entries.filter((r) => r.type === "expense").reduce((sum, r) => sum + r.amount, 0),
    };
  });

  // Metrics calculation
  const totalStoreIncome = useMemo(() => {
    return storeOrderTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [storeOrderTransactions]);

  const totalPreorderIncome = useMemo(() => {
    return decemberPreorderTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [decemberPreorderTransactions]);

  const totalManualIncome = useMemo(() => {
    return manualReceiptRows
      .filter((f) => f.type === "income")
      .reduce((sum, f) => sum + f.amount, 0);
  }, [manualReceiptRows]);

  const totalIncome = totalStoreIncome + totalPreorderIncome + totalManualIncome;

  const totalExpense = useMemo(() => {
    return manualReceiptRows
      .filter((f) => f.type === "expense")
      .reduce((sum, f) => sum + f.amount, 0);
  }, [manualReceiptRows]);

  const netProfit = totalIncome - totalExpense;

  const filteredFinancials = allFinancials.filter((f) => {
    if (typeFilter !== "all" && f.type !== typeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        f.description.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q) ||
        (f.batchName && f.batchName.toLowerCase().includes(q)) ||
        (f.recordedByName && f.recordedByName.toLowerCase().includes(q)) ||
        (f.recordedBy && f.recordedBy.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Export Batch Financial Report to CSV
  const handleExportCSV = () => {
    const batchName =
      selectedBatchId === "all"
        ? "All_Batches_Farm_Overview"
        : selectedBatchId === "__general__"
          ? "Unassigned_Storefront_General"
          : reportQuery.data?.batch.batchName || "Batch_Report";
    const batchType = reportQuery.data?.batch.batchType || "Broiler & Layer";
    const headcount =
      reportQuery.data?.batch.currentHeadcount ||
      batches.reduce((sum, b) => sum + b.currentHeadcount, 0);
    const mortality = reportQuery.data?.totalMortality || 0;
    const mortalityRate = reportQuery.data?.mortalityRatePercentage || 0;
    const roiVal = totalExpense > 0 ? ((netProfit / totalExpense) * 100).toFixed(1) : "0";

    const headers = [
      "Date",
      "Type",
      "Category",
      "Batch",
      "Logged By",
      "Description",
      "Payment Method",
      "Amount (NGN)",
    ];
    let calcIncome = 0;
    let calcExpense = 0;

    const rows = filteredFinancials.map((t) => {
      const amt = Number(t.amount || 0);
      if (t.type === "income") calcIncome += amt;
      if (t.type === "expense") calcExpense += amt;
      const loggedByLabel = t.recordedByName || t.recordedBy || "Unknown legacy submitter";

      return [
        t.transactionDate ? t.transactionDate.split("T")[0] : "",
        t.type ? t.type.toUpperCase() : "",
        t.category || "",
        t.batchName || "Unassigned / Storefront",
        `"${loggedByLabel.replace(/"/g, '""')}"`,
        `"${(t.description || "").replace(/"/g, '""')}"`,
        t.paymentMethod || "N/A",
        amt,
      ];
    });

    const csvLines = [
      `"DIGNITY AGRO FARMS - FINANCIAL & BATCH REPORT"`,
      `"Report Date: ${new Date().toISOString().replace("T", " ").slice(0, 19)}"`,
      `"View / Batch: ${batchName}"`,
      `"Batch Type: ${batchType}"`,
      `"Live Headcount: ${headcount} birds"`,
      `"Mortality Rate: ${mortality} birds (${mortalityRate}%)"`,
      `"Total Revenue (Income): NGN ${calcIncome.toLocaleString()}"`,
      `"Total Expenses: NGN ${calcExpense.toLocaleString()}"`,
      `"Net Profit/Loss: NGN ${(calcIncome - calcExpense).toLocaleString()}"`,
      `"ROI: ${roiVal}%"`,
      "",
      headers.join(","),
      ...rows.map((r) => r.join(",")),
      "",
      `"TOTAL REVENUE (INCOME)",,,,,,"${calcIncome}"`,
      `"TOTAL EXPENSES",,,,,,"${calcExpense}"`,
      `"NET PROFIT / LOSS",,,,,,"${calcIncome - calcExpense}"`,
      "",
      `"=== PER-BATCH BREAKDOWN & GRAND TOTAL (ALL BATCHES) ==="`,
      "Batch,Type,Status,Revenue (NGN),Expenses (NGN),Net Profit (NGN)",
      ...perBatchBreakdown.map(
        (b) =>
          `"${b.batchName.replace(/"/g, '""')}","${b.batchType}","${b.status}",${b.income},${b.expense},${b.income - b.expense}`,
      ),
      `"GRAND TOTAL (ALL BATCHES)",,,${farmWideTotals.totalIncome},${farmWideTotals.totalExpense},${farmWideTotals.netProfit}`,
    ];

    const csvContent = "\uFEFF" + csvLines.join("\n");
    const csvBlob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(csvBlob);
    link.setAttribute(
      "download",
      `AgroFarms_Report_${batchName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedFinBatchName =
    batches.find((b) => b.id === finForm.batchId)?.batchName || "Unassigned";

  const renderSharedFinDialogs = () => (
    <>
      {editingFinancial && (
        <FinancialEditModal
          passcode={passcode}
          role={role}
          record={editingFinancial}
          batches={batches}
          onClose={() => setEditingFinancial(null)}
          onSaved={(msg) => setFeedback(msg)}
        />
      )}
      <TypoReviewModal
        open={pendingFinTypoConfirm}
        title={
          role === "staff" || finForm.type === "expense"
            ? "Check Expense Entry for Typos"
            : "Check Financial Transaction for Typos"
        }
        subtitle="Confirm all figures, batch, category, and description before submitting to the Farm Owner."
        isSubmitting={createFinancialMut.isPending}
        confirmLabel="Confirm & Submit for Approval"
        onBack={() => setPendingFinTypoConfirm(false)}
        onConfirm={() => createFinancialMut.mutate()}
        fields={[
          {
            label: "Entry Type",
            value: role === "staff" ? "Expense" : finForm.type === "income" ? "Income" : "Expense",
          },
          { label: "Batch", value: selectedFinBatchName },
          { label: "Category", value: finForm.category },
          {
            label: "Total Amount",
            value: formatNaira(Number(finForm.amount || 0)),
            highlight: true,
          },
          {
            label: "Amount Paid Now",
            value: formatNaira(
              finForm.amountPaid.trim() === ""
                ? Number(finForm.amount || 0)
                : Number(finForm.amountPaid || 0),
            ),
          },
          { label: "Payment Method", value: finForm.paymentMethod },
          { label: "Date", value: finForm.transactionDate },
          { label: "Description", value: finForm.description || "—" },
          ...(finForm.partyName.trim()
            ? [{ label: "Buyer / Supplier", value: finForm.partyName.trim() }]
            : []),
          ...(finForm.category === "Feed" && finForm.feedBags.trim()
            ? [
                {
                  label: "Feed Stock",
                  value: `${finForm.feedBags} bag(s) × ${finForm.feedKgPerBag || 25} kg (${finForm.feedBrand || "Feed"})`,
                },
              ]
            : []),
        ]}
      />
    </>
  );

  if (role === "staff") {
    return (
      <div className="space-y-6">
        {/* Staff Header */}
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#0F3D24]">
              <TrendingDown className="text-rose-600" size={22} />
              <h2 className="text-xl font-bold">Record Farm Expense</h2>
            </div>
            <p className="mt-1 text-xs text-[#0F3D24]/70">
              Log operational farm expenses (feed, medication, logistics, utilities) for
              Administrator approval. Financial figures and farm totals are restricted.
            </p>
          </div>
          <span className="rounded-full bg-amber-100 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-amber-900">
            Staff Expense Entry Mode
          </span>
        </div>

        {receiptReport.error && (
          <p role="alert" className="text-red-700">
            Receipt report unavailable: {receiptReport.error.message}
          </p>
        )}
        {feedback && (
          <div className="flex items-center justify-between rounded-2xl bg-emerald-50 border border-emerald-200 px-5 py-3 text-xs font-bold text-emerald-900">
            <span className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              {feedback}
            </span>
            <button
              onClick={() => setFeedback(null)}
              className="text-emerald-800/60 hover:text-emerald-900"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Blind Expense Entry Form Card */}
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/10 space-y-4 max-w-2xl">
          <div className="border-b border-[#0F3D24]/10 pb-3">
            <h3 className="text-base font-bold text-[#0F3D24]">New Expense Voucher</h3>
            <p className="text-xs text-[#0F3D24]/60">
              All submitted expenses are routed to the Owner's Pending Approvals queue.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-[#0F3D24]">
                Assign to Active Batch *
              </label>
              <select
                value={finForm.batchId}
                onChange={(e) =>
                  setFinForm({ ...finForm, batchId: e.target.value, type: "expense" })
                }
                className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 bg-[#F7F5F0]/50 px-3.5 py-2.5 text-xs font-semibold text-[#0F3D24] outline-none focus:border-[#3F8F3F] focus:bg-white"
              >
                <option value="">Select active batch...</option>
                {activeBatches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.batchName} ({b.batchType})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F3D24]">Expense Category *</label>
              <select
                value={finForm.category}
                onChange={(e) =>
                  setFinForm({ ...finForm, category: e.target.value, type: "expense" })
                }
                className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 bg-[#F7F5F0]/50 px-3.5 py-2.5 text-xs font-semibold text-[#0F3D24] outline-none focus:border-[#3F8F3F] focus:bg-white"
              >
                <option value="Feed">Feed & Nutrition</option>
                <option value="Medication/Vaccine">Medication & Vaccines</option>
                <option value="Day-Old Chicks">Day-Old Chicks / Stock Purchase</option>
                <option value="Logistics/Transport">Logistics & Transportation</option>
                <option value="Labor/Salaries">Labor & Wages</option>
                <option value="Utilities">Utilities, Fuel & Electricity</option>
                <option value="Equipment">Farm Equipment & Repairs</option>
                <option value="Packaging">Packaging & Processing</option>
                <option value="Other Expense">Other Expense</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F3D24]">Amount Spent (₦) *</label>
              <NumberField
                allowDecimal
                min={1}
                placeholder="Enter amount spent"
                value={finForm.amount}
                onValueChange={(_, raw) => setFinForm({ ...finForm, amount: raw, type: "expense" })}
                className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 bg-[#F7F5F0]/50 px-3.5 py-2.5 text-xs font-bold text-[#0F3D24] outline-none focus:border-[#3F8F3F] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F3D24]">Payment Method</label>
              <select
                value={finForm.paymentMethod}
                onChange={(e) =>
                  setFinForm({ ...finForm, paymentMethod: e.target.value, type: "expense" })
                }
                className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 bg-[#F7F5F0]/50 px-3.5 py-2.5 text-xs font-semibold text-[#0F3D24] outline-none focus:border-[#3F8F3F] focus:bg-white"
              >
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
                <option value="POS">POS / Card</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F3D24]">Expense Date *</label>
              <input
                type="date"
                value={finForm.transactionDate}
                onChange={(e) =>
                  setFinForm({ ...finForm, transactionDate: e.target.value, type: "expense" })
                }
                className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 bg-[#F7F5F0]/50 px-3.5 py-2.5 text-xs font-semibold text-[#0F3D24] outline-none focus:border-[#3F8F3F] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F3D24]">
                Receipt / Reference No. (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. INV-0042 or vendor name"
                value={finForm.referenceNo}
                onChange={(e) =>
                  setFinForm({ ...finForm, referenceNo: e.target.value, type: "expense" })
                }
                className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 bg-[#F7F5F0]/50 px-3.5 py-2.5 text-xs font-medium text-[#0F3D24] outline-none focus:border-[#3F8F3F] focus:bg-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-[#0F3D24]">
                Expense Description & Purpose *
              </label>
              <input
                type="text"
                placeholder="e.g. Purchased 10 bags of broiler finisher feed & disinfectant"
                value={finForm.description}
                onChange={(e) =>
                  setFinForm({ ...finForm, description: e.target.value, type: "expense" })
                }
                className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 bg-[#F7F5F0]/50 px-3.5 py-2.5 text-xs font-medium text-[#0F3D24] outline-none focus:border-[#3F8F3F] focus:bg-white"
              />
            </div>

            {finForm.category === "Feed" && (
              <div className="sm:col-span-2 rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5 grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-[11px] font-bold text-amber-900">
                    Number of Bags *
                  </label>
                  <NumberField
                    allowDecimal
                    min={0}
                    placeholder="e.g. 10"
                    value={finForm.feedBags}
                    onValueChange={(_, raw) =>
                      setFinForm({ ...finForm, feedBags: raw, type: "expense" })
                    }
                    className="mt-1 w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-[#0F3D24] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-amber-900">
                    Bag Weight (kg)
                  </label>
                  <NumberField
                    allowDecimal
                    min={1}
                    placeholder="25"
                    value={finForm.feedKgPerBag}
                    onValueChange={(_, raw) =>
                      setFinForm({ ...finForm, feedKgPerBag: raw, type: "expense" })
                    }
                    className="mt-1 w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-[#0F3D24] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-amber-900">
                    Feed Brand (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. New Hope, Ultima"
                    value={finForm.feedBrand}
                    onChange={(e) =>
                      setFinForm({ ...finForm, feedBrand: e.target.value, type: "expense" })
                    }
                    className="mt-1 w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-medium text-[#0F3D24] outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#0F3D24]">
                Amount Paid Now (₦){" "}
                <span className="font-normal text-[#0F3D24]/60">(Leave blank if paid in full)</span>
              </label>
              <NumberField
                allowDecimal
                min={0}
                placeholder={finForm.amount ? `Full amount (₦${finForm.amount})` : "Full payment"}
                value={finForm.amountPaid}
                onValueChange={(_, raw) =>
                  setFinForm({ ...finForm, amountPaid: raw, type: "expense" })
                }
                className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 bg-[#F7F5F0]/50 px-3.5 py-2.5 text-xs font-semibold text-[#0F3D24] outline-none focus:border-[#3F8F3F] focus:bg-white"
              />
            </div>

            {finForm.amountPaid.trim() !== "" &&
              Number(finForm.amount || 0) > Number(finForm.amountPaid || 0) && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-rose-700">
                      Supplier Name (Credit / Unpaid Balance) *
                    </label>
                    <input
                      type="text"
                      placeholder="Who we owe"
                      value={finForm.partyName}
                      onChange={(e) =>
                        setFinForm({ ...finForm, partyName: e.target.value, type: "expense" })
                      }
                      className="mt-1 w-full rounded-xl border border-rose-300 bg-rose-50/40 px-3.5 py-2.5 text-xs font-medium text-[#0F3D24] outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-rose-700">
                      Due Date for Balance *
                    </label>
                    <input
                      type="date"
                      value={finForm.dueDate}
                      onChange={(e) =>
                        setFinForm({ ...finForm, dueDate: e.target.value, type: "expense" })
                      }
                      className="mt-1 w-full rounded-xl border border-rose-300 bg-rose-50/40 px-3.5 py-2.5 text-xs font-semibold text-[#0F3D24] outline-none focus:border-rose-500"
                    />
                  </div>
                </>
              )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              disabled={
                !finForm.batchId ||
                !finForm.amount ||
                Number(finForm.amount) <= 0 ||
                !finForm.description.trim() ||
                (finForm.amountPaid.trim() !== "" &&
                  Number(finForm.amount) > Number(finForm.amountPaid || 0) &&
                  (!finForm.partyName.trim() || !finForm.dueDate.trim())) ||
                createFinancialMut.isPending
              }
              onClick={() => setPendingFinTypoConfirm(true)}
              className="inline-flex items-center gap-2 rounded-full bg-rose-700 px-6 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-rose-800 disabled:opacity-50 transition"
            >
              {createFinancialMut.isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Submitting Expense...
                </>
              ) : (
                <>
                  <PlusCircle size={15} /> Submit Expense for Approval
                </>
              )}
            </button>
          </div>
        </div>

        {/* Persistent Staff Expense Submissions History (Survives Refresh / Tab Switch) */}
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/10 max-w-2xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#0F3D24]/80">
                Your Submitted Expenses &amp; Approval Status ({myFinancialSubmissions.length})
              </h4>
              <p className="text-[11px] text-[#0F3D24]/55">
                All expenses you log stay visible here. You can edit pending, flagged, or rejected
                entries to fix typos and resubmit.
              </p>
            </div>
            {mySubmissionsQuery.isFetching && (
              <Loader2 size={14} className="animate-spin text-[#0F3D24]/50" />
            )}
          </div>
          {mySubmissionsQuery.isLoading ? (
            <div className="py-4 text-xs text-slate-500">Loading your submitted expenses...</div>
          ) : myFinancialSubmissions.length === 0 ? (
            <div className="py-4 text-xs text-slate-500">
              No expense submissions recorded under your account yet.
            </div>
          ) : (
            <div className="divide-y divide-[#0F3D24]/10">
              {myFinancialSubmissions.slice(0, 15).map((exp) => {
                const isPending =
                  exp.approvalStatus === "pending_approval" || exp.approvalStatus === "pending";
                const isFlagged = exp.approvalStatus === "flagged";
                const isRejected = exp.approvalStatus === "rejected";
                const canEdit = exp.approvalStatus !== "approved" && Boolean(exp.financialRecord);
                return (
                  <div
                    key={`${exp.targetType}-${exp.id}`}
                    className="py-3 flex flex-wrap items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="font-bold text-[#0F3D24]">
                        {exp.title}
                        {exp.amount !== null && ` · ${formatNaira(exp.amount)}`}
                        {exp.batchName && (
                          <span className="font-normal text-[#0F3D24]/70"> · {exp.batchName}</span>
                        )}
                      </div>
                      <div className="text-[#0F3D24]/70">{exp.subtitle}</div>
                      <div className="text-[10px] text-[#0F3D24]/50">Date: {exp.date}</div>
                      {isFlagged && exp.rejectionReason && (
                        <div className="mt-1 inline-flex items-center gap-1 rounded-lg bg-orange-100 px-2 py-0.5 text-[11px] font-bold text-orange-900">
                          <Flag size={11} /> Owner Flag Note: {exp.rejectionReason}
                        </div>
                      )}
                      {isRejected && exp.rejectionReason && (
                        <div className="mt-1 inline-block rounded-lg bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                          Reason: {exp.rejectionReason}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() =>
                            exp.financialRecord && setEditingFinancial(exp.financialRecord)
                          }
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold transition ${
                            isFlagged || isRejected
                              ? "bg-orange-600 text-white hover:bg-orange-700"
                              : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                          }`}
                        >
                          <Pencil size={10} /> Edit &amp; Resubmit
                        </button>
                      )}
                      {isFlagged ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 text-[10px] font-bold text-orange-800">
                          <Flag size={11} /> Flagged
                        </span>
                      ) : isRejected ? (
                        <>
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-bold text-rose-800">
                            <XCircle size={11} /> Rejected
                          </span>
                          <button
                            type="button"
                            disabled={dismissMySubMut.isPending}
                            onClick={() =>
                              dismissMySubMut.mutate({ id: exp.id, targetType: exp.targetType })
                            }
                            className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-200"
                          >
                            Dismiss
                          </button>
                        </>
                      ) : isPending ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-800">
                          <Clock size={11} /> Pending Owner Approval
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-800">
                          <CheckCircle2 size={11} /> Approved
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Shared Batch Financials (Only rendered when Owner explicitly enabled showFinancialsToStaff on specific batches) */}
        {staffUnlockedBatches.length > 0 && (
          <div className="space-y-4">
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#0F3D24]/10 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-900">
                  <Eye size={12} /> Shared By Administrator
                </span>
                <h3 className="mt-1 text-base font-bold text-[#0F3D24]">
                  Unlocked Batch Financial Report
                </h3>
                <p className="text-xs text-[#0F3D24]/65">
                  Showing only batches where the Owner has enabled staff financial visibility.
                </p>
              </div>
              <select
                value={effectiveStaffBatchId}
                onChange={(e) => setSelectedStaffReportBatchId(e.target.value)}
                className="rounded-xl border border-[#0F3D24]/15 bg-[#F7F5F0]/60 px-4 py-2 text-xs font-semibold text-[#0F3D24] outline-none focus:border-[#3F8F3F]"
              >
                {staffUnlockedBatches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.batchName} ({b.batchType})
                  </option>
                ))}
              </select>
            </div>

            {staffReportQuery.data && !staffReportQuery.data.financialsRestricted && (
              <div className="space-y-4">
                <div className="rounded-3xl bg-[#0F3D24] p-6 text-white shadow-lg">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                    <div>
                      <span className="inline-block rounded-full bg-[#3F8F3F]/30 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#A2E0A2]">
                        Unlocked Batch Report
                      </span>
                      <h3 className="mt-2 text-xl font-bold">
                        {staffReportQuery.data.batch.batchName}
                      </h3>
                      <p className="mt-1 text-xs text-white/70">
                        {staffReportQuery.data.batch.batchType} • Started:{" "}
                        {staffReportQuery.data.batch.startDate}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-white/70">Batch Net Profit / Loss</div>
                      <div
                        className={`text-2xl font-extrabold ${staffReportQuery.data.netProfit >= 0 ? "text-[#A2E0A2]" : "text-rose-300"}`}
                      >
                        {formatNaira(staffReportQuery.data.netProfit)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                    <div className="rounded-2xl bg-white/10 p-4">
                      <span className="text-xs text-white/70">Total Revenue</span>
                      <div className="mt-1 text-lg font-bold text-[#A2E0A2]">
                        {formatNaira(staffReportQuery.data.totalIncome)}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white/10 p-4">
                      <span className="text-xs text-white/70">Total Expenses</span>
                      <div className="mt-1 text-lg font-bold text-rose-200">
                        {formatNaira(staffReportQuery.data.totalExpense)}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white/10 p-4">
                      <span className="text-xs text-white/70">Cost per Bird</span>
                      <div className="mt-1 text-lg font-bold">
                        {formatNaira(staffReportQuery.data.costPerBird)}
                      </div>
                      <div className="text-[10px] text-white/60">
                        {formatNaira(staffReportQuery.data.totalExpense)} ÷{" "}
                        {staffReportQuery.data.batch.initialHeadcount} stocked
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white/10 p-4">
                      <span className="text-xs text-white/70">Live / Mortality</span>
                      <div className="mt-1 text-lg font-bold">
                        {staffReportQuery.data.batch.currentHeadcount} /{" "}
                        {staffReportQuery.data.totalMortality} dead
                      </div>
                    </div>
                  </div>
                </div>

                {staffReportQuery.data.financials.length > 0 && (
                  <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#0F3D24]/10 overflow-x-auto">
                    <h4 className="text-sm font-bold text-[#0F3D24] mb-3">
                      Approved Ledger for {staffReportQuery.data.batch.batchName} (
                      {staffReportQuery.data.financials.length})
                    </h4>
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F7F5F0] text-[10px] font-bold uppercase text-[#0F3D24]/70">
                        <tr>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5">Type</th>
                          <th className="p-2.5">Category</th>
                          <th className="p-2.5">Description</th>
                          <th className="p-2.5 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {staffReportQuery.data.financials.map((f) => (
                          <tr key={f.id}>
                            <td className="p-2.5 whitespace-nowrap text-gray-600">
                              {f.transactionDate}
                            </td>
                            <td className="p-2.5">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                  f.type === "income"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-rose-100 text-rose-800"
                                }`}
                              >
                                {f.type}
                              </span>
                            </td>
                            <td className="p-2.5 font-semibold text-[#0F3D24]">{f.category}</td>
                            <td className="p-2.5 text-gray-700">{f.description}</td>
                            <td className="p-2.5 text-right font-bold tabular-nums">
                              {formatNaira(f.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {renderSharedFinDialogs()}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {receiptReport.isLoading && <p role="status">Loading confirmed receipts…</p>}
      {receiptReport.error && (
        <p role="alert" className="text-red-700">
          Receipt report unavailable: {receiptReport.error.message}
        </p>
      )}
      {/* Top Header & Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/5">
        <div>
          <div className="flex items-center gap-2 text-[#0F3D24]">
            <TrendingUp className="text-[#3F8F3F]" size={24} />
            <h2 className="text-xl font-bold">Batches & Financial Management</h2>
          </div>
          <p className="mt-1 text-sm text-[#0F3D24]/70">
            Register income, expenses, track production costs, and generate profit/loss reports per
            batch.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {role === "owner" && (
            <button
              onClick={() => setShowBatchModal(true)}
              className="flex items-center gap-2 rounded-full border border-[#0F3D24]/20 bg-white px-4 py-2.5 text-xs font-semibold text-[#0F3D24] shadow-sm hover:bg-[#0F3D24]/5 transition"
            >
              <Layers size={16} className="text-[#3F8F3F]" />
              New Batch
            </button>
          )}
          <button
            onClick={() => {
              const preferred =
                selectedBatchId !== "all" && activeBatches.some((b) => b.id === selectedBatchId)
                  ? selectedBatchId
                  : activeBatches[0]?.id || "";
              setFinForm((prev) => ({ ...prev, batchId: preferred }));
              setShowFinancialModal(true);
            }}
            className="flex items-center gap-2 rounded-full bg-[#0F3D24] px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#134a2c] transition"
          >
            <PlusCircle size={16} />
            Register Income / Expense
          </button>
          <button
            onClick={() => setShowFinancialImportModal(true)}
            className="flex items-center gap-2 rounded-full border border-[#0F3D24]/20 bg-white px-4 py-2.5 text-xs font-semibold text-[#0F3D24] shadow-sm hover:bg-[#0F3D24]/5 transition"
            title="Import expenses & sales from CSV / Excel sheet with automatic order matching"
          >
            <FileSpreadsheet size={16} className="text-[#0F3D24]" />
            Import Financials (CSV)
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 rounded-full border border-[#3F8F3F] bg-[#3F8F3F]/10 px-4 py-2.5 text-xs font-semibold text-[#0F3D24] shadow-sm hover:bg-[#3F8F3F]/20 transition"
            title="Export custom farm report in PDF, Excel, or CSV format"
          >
            <Download size={16} className="text-[#3F8F3F]" />
            Export Custom Report
          </button>
        </div>
      </div>

      {feedback && (
        <div className="flex items-center justify-between rounded-2xl bg-[#3F8F3F]/10 px-5 py-3 text-sm text-[#0F3D24]">
          <span>{feedback}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-[#0F3D24]/60 hover:text-[#0F3D24]"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {role === "owner" && pendingApprovalsCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-3 text-xs font-semibold text-amber-950 shadow-xs">
          <div className="flex items-center gap-2.5">
            <ShieldAlert size={17} className="text-amber-600 shrink-0" />
            <span>
              <strong>{pendingApprovalsCount}</strong> pending staff/manager record(s) are currently{" "}
              <strong>excluded from live revenue, expense &amp; batch totals</strong> awaiting your
              review.
            </span>
          </div>
          {onNavigateToApprovals && (
            <button
              type="button"
              onClick={onNavigateToApprovals}
              className="rounded-full bg-[#0F3D24] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#165232] transition cursor-pointer"
            >
              Review Approvals →
            </button>
          )}
        </div>
      )}

      {role === "manager" &&
        myFinancialSubmissions.some(
          (s) =>
            s.approvalStatus === "pending_approval" ||
            s.approvalStatus === "pending" ||
            s.approvalStatus === "flagged" ||
            s.approvalStatus === "rejected",
        ) && (
          <div className="rounded-3xl bg-amber-50/70 p-5 border border-amber-200/80 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-amber-950">
                <Clock size={15} className="text-amber-600" />
                Your Pending, Flagged &amp; Rejected Entries (Not in Live Totals Until Approved)
              </div>
              {mySubmissionsQuery.isFetching && (
                <Loader2 size={13} className="animate-spin text-amber-700" />
              )}
            </div>
            <div className="divide-y divide-amber-200/60 rounded-2xl bg-white px-4 border border-amber-200/50">
              {myFinancialSubmissions
                .filter(
                  (s) =>
                    s.approvalStatus === "pending_approval" ||
                    s.approvalStatus === "pending" ||
                    s.approvalStatus === "flagged" ||
                    s.approvalStatus === "rejected",
                )
                .slice(0, 10)
                .map((sub) => {
                  const isFlagged = sub.approvalStatus === "flagged";
                  const canEdit = sub.approvalStatus !== "approved" && Boolean(sub.financialRecord);
                  return (
                    <div
                      key={`${sub.targetType}-${sub.id}`}
                      className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <div className="font-bold text-[#0F3D24]">
                          {sub.title}
                          {sub.amount !== null && ` · ${formatNaira(sub.amount)}`}
                          {sub.batchName && (
                            <span className="font-normal text-[#0F3D24]/70">
                              {" "}
                              · {sub.batchName}
                            </span>
                          )}
                        </div>
                        <div className="text-[#0F3D24]/70">
                          {sub.subtitle} · {sub.date}
                        </div>
                        {isFlagged && sub.rejectionReason && (
                          <div className="mt-1 inline-flex items-center gap-1 rounded-lg bg-orange-100 px-2 py-0.5 text-[11px] font-bold text-orange-900">
                            <Flag size={11} /> Owner Flag Note: {sub.rejectionReason}
                          </div>
                        )}
                        {sub.approvalStatus === "rejected" && sub.rejectionReason && (
                          <div className="mt-0.5 text-[11px] font-semibold text-rose-700">
                            Reason: {sub.rejectionReason}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() =>
                              sub.financialRecord && setEditingFinancial(sub.financialRecord)
                            }
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold transition ${
                              isFlagged || sub.approvalStatus === "rejected"
                                ? "bg-orange-600 text-white hover:bg-orange-700"
                                : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                            }`}
                          >
                            <Pencil size={10} /> Edit &amp; Resubmit
                          </button>
                        )}
                        {isFlagged ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-[10px] font-bold text-orange-800">
                            <Flag size={10} /> Flagged
                          </span>
                        ) : sub.approvalStatus === "rejected" ? (
                          <>
                            <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-800">
                              Rejected
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                dismissMySubMut.mutate({ id: sub.id, targetType: sub.targetType })
                              }
                              className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-200"
                            >
                              Dismiss
                            </button>
                          </>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                            Pending Owner Approval
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

      {/* Sub-View Switch: Overview & Ledger vs Debtors & Creditors */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFinSubView("overview")}
          className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-bold transition ${
            finSubView === "overview"
              ? "bg-[#0F3D24] text-white shadow-sm"
              : "bg-white text-[#0F3D24] ring-1 ring-[#0F3D24]/15 hover:bg-[#0F3D24]/5"
          }`}
        >
          <TrendingUp size={14} /> Overview &amp; Ledger
        </button>
        <button
          type="button"
          onClick={() => setFinSubView("debtors_creditors")}
          className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-bold transition ${
            finSubView === "debtors_creditors"
              ? "bg-[#0F3D24] text-white shadow-sm"
              : "bg-white text-[#0F3D24] ring-1 ring-[#0F3D24]/15 hover:bg-[#0F3D24]/5"
          }`}
        >
          <CreditCard size={14} /> Debtors &amp; Creditors
          {debtorsSummaryQuery.data &&
            debtorsSummaryQuery.data.summary.debtorCount +
              debtorsSummaryQuery.data.summary.creditorCount >
              0 && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                  finSubView === "debtors_creditors"
                    ? "bg-amber-400 text-[#0F3D24]"
                    : "bg-rose-100 text-rose-700"
                }`}
              >
                {debtorsSummaryQuery.data.summary.debtorCount +
                  debtorsSummaryQuery.data.summary.creditorCount}
              </span>
            )}
        </button>
      </div>

      {finSubView === "debtors_creditors" ? (
        <DebtorsCreditorsPanel
          passcode={passcode}
          role={role}
          batches={batches}
          selectedBatchId={
            selectedBatchId === "all" || selectedBatchId === "__general__" ? "" : selectedBatchId
          }
          onSelectBatchId={(id) => setSelectedBatchId(id || "all")}
          onNavigateToContacts={onNavigateToContacts}
        />
      ) : (
        <>
          {/* Batch Selector Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#F7F5F0] p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Filter size={18} className="text-[#0F3D24]/70" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#0F3D24]/70">
                Select Batch:
              </span>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="rounded-xl border border-[#0F3D24]/15 bg-white px-4 py-2 text-sm font-semibold text-[#0F3D24] outline-none focus:border-[#3F8F3F]"
              >
                <option value="all">All Batches (Farm Overview)</option>
                <option value="__general__">Unassigned / Storefront (General)</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.batchName} ({b.batchType} • {b.currentHeadcount}/{b.initialHeadcount} live •{" "}
                    {b.status === "active"
                      ? "Active"
                      : b.status === "completed"
                        ? "Closed"
                        : "Archived"}
                    )
                  </option>
                ))}
              </select>
              {selectedBatchId !== "all" &&
                selectedBatchId !== "__general__" &&
                role === "owner" &&
                (() => {
                  const target = batches.find((b) => b.id === selectedBatchId);
                  if (!target) return null;
                  return (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setEditingBatch({ ...target })}
                        className="flex items-center gap-1.5 rounded-xl border border-[#0F3D24]/15 bg-white px-3 py-2 text-xs font-semibold text-[#0F3D24] hover:bg-[#0F3D24]/5 transition"
                        title="Edit Batch Name & Details"
                      >
                        <Pencil size={14} className="text-[#3F8F3F]" />
                        Edit Batch
                      </button>
                      {target.status === "active" ? (
                        <button
                          disabled={closeBatchMut.isPending}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Close batch "${target.batchName}"? Closed batches remain visible in reports, but staff and managers will not be able to log new entries into this batch.`,
                              )
                            ) {
                              closeBatchMut.mutate(target.id);
                            }
                          }}
                          className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50 transition"
                          title="Close completed batch"
                        >
                          <Lock size={14} className="text-amber-700" />
                          {closeBatchMut.isPending ? "Closing..." : "Close Batch"}
                        </button>
                      ) : (
                        <button
                          disabled={reopenBatchMut.isPending}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Reopen batch "${target.batchName}" so new records can be logged into it again?`,
                              )
                            ) {
                              reopenBatchMut.mutate(target.id);
                            }
                          }}
                          className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-50 transition"
                          title="Reopen closed batch"
                        >
                          <Unlock size={14} className="text-emerald-700" />
                          {reopenBatchMut.isPending ? "Reopening..." : "Reopen Batch"}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={toggleStaffVisMut.isPending}
                        onClick={() =>
                          toggleStaffVisMut.mutate({
                            id: target.id,
                            show: !target.showFinancialsToStaff,
                          })
                        }
                        className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                          target.showFinancialsToStaff
                            ? "border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                        title={
                          target.showFinancialsToStaff
                            ? "Staff can currently view this batch's financial report. Click to hide."
                            : "Hidden from staff by default. Click to allow staff to view this batch's financials."
                        }
                      >
                        {target.showFinancialsToStaff ? (
                          <Eye size={14} className="text-emerald-700" />
                        ) : (
                          <EyeOff size={14} className="text-slate-500" />
                        )}
                        <span>
                          {target.showFinancialsToStaff ? "Staff View: ON" : "Staff View: OFF"}
                        </span>
                      </button>
                    </div>
                  );
                })()}
            </div>

            {selectedBatchId !== "all" && reportQuery.data && (
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-[#0F3D24]">
                <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-[#0F3D24]/10">
                  Start: {reportQuery.data.batch.startDate}
                </span>
                <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-[#0F3D24]/10">
                  Harvest: {reportQuery.data.batch.targetHarvestDate || "Not set"}
                </span>
              </div>
            )}
          </div>

          {/* Batch Growth Circular Progress Ring (Inspo STAFF.jpeg) */}
          {selectedBatchId !== "all" &&
            reportQuery.data &&
            (() => {
              const b = reportQuery.data.batch;
              const targetW = (b as any).targetWeeks || 7;
              const startMs = new Date(b.startDate).getTime();
              const nowMs = new Date().getTime();
              const elapsedWeeks = Math.max(
                1,
                Math.ceil((nowMs - startMs) / (1000 * 60 * 60 * 24 * 7)),
              );
              const currentW = Math.min(targetW, elapsedWeeks);
              const pct = Math.round((currentW / targetW) * 100);

              return (
                <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#0F3D24]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="relative h-20 w-20 flex-shrink-0 flex items-center justify-center">
                      <svg className="h-full w-full transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-slate-100"
                          strokeWidth="3.5"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-[#3F8F3F]"
                          strokeDasharray={`${pct}, 100`}
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <div className="absolute text-center">
                        <span className="text-sm font-black text-[#0F3D24]">
                          {currentW}/{targetW}
                        </span>
                        <span className="block text-[8px] uppercase font-bold text-[#3F8F3F]">
                          Weeks
                        </span>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#0F3D24]">
                        Batch Broiler Growth Progress
                      </h4>
                      <p className="text-xs font-semibold text-[#0F3D24]/70 mt-0.5">
                        {b.batchName} · {b.currentHeadcount} Live Heads
                      </p>
                      <span className="inline-block mt-1.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5">
                        {currentW >= targetW
                          ? "✓ Healthy & Ready for Harvest"
                          : `${targetW - currentW} weeks until target harvest`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 border-t sm:border-t-0 sm:border-l border-[#0F3D24]/10 pt-3 sm:pt-0 sm:pl-5">
                    <div className="text-center sm:text-left">
                      <span className="text-[10px] uppercase font-extrabold text-[#0F3D24]/60">
                        Initial Headcount
                      </span>
                      <p className="text-base font-black text-[#0F3D24]">{b.initialHeadcount}</p>
                    </div>
                    <div className="text-center sm:text-left pl-4">
                      <span className="text-[10px] uppercase font-extrabold text-[#0F3D24]/60">
                        Mortality Count
                      </span>
                      <p className="text-base font-black text-rose-600">
                        {b.initialHeadcount - b.currentHeadcount}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

          {/* Permanent Farm-wide Grand Total Banner (Always reflects ALL batches combined) */}
          <div className="rounded-3xl bg-[#0F3D24] p-5 text-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                  Farm-wide Grand Total (All Batches Combined · Approved Records)
                </span>
                <div className="mt-1.5 flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
                  <span>
                    Total Revenue:{" "}
                    <strong className="text-lg font-extrabold text-white tabular-nums">
                      {formatNaira(farmWideTotals.totalIncome)}
                    </strong>
                  </span>
                  <span>
                    Total Expenses:{" "}
                    <strong className="text-lg font-extrabold text-rose-300 tabular-nums">
                      {formatNaira(farmWideTotals.totalExpense)}
                    </strong>
                  </span>
                  <span>
                    Net Position:{" "}
                    <strong
                      className={`text-lg font-extrabold tabular-nums ${
                        farmWideTotals.netProfit >= 0 ? "text-emerald-300" : "text-rose-300"
                      }`}
                    >
                      {formatNaira(farmWideTotals.netProfit)}
                    </strong>
                  </span>
                </div>
              </div>
              {selectedBatchId !== "all" && (
                <button
                  type="button"
                  onClick={() => setSelectedBatchId("all")}
                  className="rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-white/25 transition"
                >
                  View All Batches
                </button>
              )}
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#0F3D24]/5">
              <div className="flex items-center justify-between text-[#0F3D24]/70">
                <span className="text-xs font-semibold">Total Revenue (Income)</span>
                <div className="rounded-full bg-emerald-50 p-2 text-emerald-600">
                  <TrendingUp size={18} />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-[#0F3D24]">{formatNaira(totalIncome)}</p>
              <span className="mt-1 block text-xs text-[#0F3D24]/70">
                Store: <strong>{formatNaira(totalStoreIncome)}</strong> • Pre-Orders/Farm:{" "}
                <strong>{formatNaira(totalPreorderIncome + totalManualIncome)}</strong>
              </span>
            </div>

            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#0F3D24]/5">
              <div className="flex items-center justify-between text-[#0F3D24]/70">
                <span className="text-xs font-semibold">Total Expenses</span>
                <div className="rounded-full bg-rose-50 p-2 text-rose-600">
                  <TrendingDown size={18} />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-rose-600">{formatNaira(totalExpense)}</p>
              <span className="mt-1 block text-xs text-[#0F3D24]/60">
                Feed, Meds, Logistics & Ops
              </span>
            </div>

            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#0F3D24]/5">
              <div className="flex items-center justify-between text-[#0F3D24]/70">
                <span className="text-xs font-semibold">Net Profit / Loss</span>
                <div
                  className={`rounded-full p-2 ${netProfit >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}
                >
                  <DollarSign size={18} />
                </div>
              </div>
              <p
                className={`mt-3 text-2xl font-bold ${netProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`}
              >
                {formatNaira(netProfit)}
              </p>
              <span className="mt-1 block text-xs text-[#0F3D24]/60">
                {totalExpense > 0
                  ? `ROI: ${((netProfit / totalExpense) * 100).toFixed(1)}%`
                  : netProfit > 0
                    ? "100% Margin (No Expenses)"
                    : "0% ROI"}
              </span>
            </div>

            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#0F3D24]/5">
              <div className="flex items-center justify-between text-[#0F3D24]/70">
                <span className="text-xs font-semibold">Active Batches</span>
                <div className="rounded-full bg-blue-50 p-2 text-blue-600">
                  <Layers size={18} />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-[#0F3D24]">
                {batches.filter((b) => b.status === "active").length} Batches
              </p>
              <span className="mt-1 block text-xs text-[#0F3D24]/60">
                {batches.reduce((sum, b) => sum + b.currentHeadcount, 0)} Total Live Heads
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-600">
            Revenue includes confirmed receipts only. Outstanding sales:{" "}
            {formatNaira(receiptReport.data?.outstandingSales || 0)}. Click any summary row to see
            its contributing entries.
          </p>
          {/* Sequential Feed Bag Inventory & Usage Ledger (when inspecting a single batch) */}
          {selectedBatchId !== "all" && feedLedgerQuery.data && (
            <div className="rounded-3xl bg-amber-50/70 border border-amber-200/80 p-5 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                    Feed Bag Inventory &amp; Consumption Ledger
                  </h3>
                  <p className="text-[11px] text-amber-900/70">
                    Links Feed purchases from Expenses with sequential Bag # logs from Daily Farm
                    Reports.
                  </p>
                </div>
                {feedLedgerQuery.data.lastEntry && (
                  <span className="rounded-full bg-white border border-amber-300 px-3 py-1 text-[11px] font-bold text-amber-900">
                    Last Logged: Bag #{feedLedgerQuery.data.lastEntry.feedBagNo}{" "}
                    {feedLedgerQuery.data.lastEntry.feedBagStatus === "finished"
                      ? "Finished"
                      : "Opened"}{" "}
                    ({feedLedgerQuery.data.lastEntry.activityDate})
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="rounded-2xl bg-white p-3 ring-1 ring-amber-200/60">
                  <div className="text-[10px] font-bold uppercase text-amber-900/60">
                    Bags Bought
                  </div>
                  <div className="text-lg font-extrabold text-[#0F3D24]">
                    {feedLedgerQuery.data.bagsBought === 0 &&
                    feedLedgerQuery.data.unspecifiedFeedCount
                      ? "Unconfirmed"
                      : feedLedgerQuery.data.bagsBought}{" "}
                    <span className="text-xs font-medium">bags</span>
                  </div>
                  <div className="text-[10px] text-[#718096]">
                    {feedLedgerQuery.data.totalKgBought} kg recorded
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-3 ring-1 ring-amber-200/60">
                  <div className="text-[10px] font-bold uppercase text-amber-900/60">
                    Bags Finished
                  </div>
                  <div className="text-lg font-extrabold text-amber-800">
                    {feedLedgerQuery.data.bagsFinished}{" "}
                    <span className="text-xs font-medium">bags</span>
                  </div>
                  <div className="text-[10px] text-[#718096]">
                    {feedLedgerQuery.data.currentOpenBagNo
                      ? `Bag #${feedLedgerQuery.data.currentOpenBagNo} open now`
                      : "No bag logged"}
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-3 ring-1 ring-amber-200/60">
                  <div className="text-[10px] font-bold uppercase text-amber-900/60">
                    Bags Remaining
                  </div>
                  <div
                    className={`text-lg font-extrabold ${
                      feedLedgerQuery.data.bagsInStock <= 2 && feedLedgerQuery.data.bagsBought > 0
                        ? "text-rose-700"
                        : "text-emerald-700"
                    }`}
                  >
                    {feedLedgerQuery.data.unspecifiedFeedCount
                      ? "Unconfirmed"
                      : feedLedgerQuery.data.bagsInStock}{" "}
                    <span className="text-xs font-medium">bags</span>
                  </div>
                  <div className="text-[10px] text-[#718096]">
                    ~{feedLedgerQuery.data.defaultKgPerBag} kg/bag
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-3 ring-1 ring-amber-200/60">
                  <div className="text-[10px] font-bold uppercase text-amber-900/60">
                    Avg Cost / Bag
                  </div>
                  <div className="text-lg font-extrabold text-[#0F3D24]">
                    {feedLedgerQuery.data.bagsBought === 0 &&
                    feedLedgerQuery.data.unspecifiedFeedCount
                      ? "Incomplete"
                      : formatNaira(feedLedgerQuery.data.avgCostPerBag)}
                  </div>
                  <div className="text-[10px] text-[#718096]">
                    Spent: {formatNaira(feedLedgerQuery.data.totalFeedSpend)}
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-3 ring-1 ring-amber-200/60">
                  <div className="text-[10px] font-bold uppercase text-amber-900/60">
                    Used Feed Value
                  </div>
                  <div className="text-lg font-extrabold text-[#0F3D24]">
                    {feedLedgerQuery.data.bagsBought === 0 &&
                    feedLedgerQuery.data.unspecifiedFeedCount
                      ? "Incomplete"
                      : formatNaira(feedLedgerQuery.data.usedFeedValue)}
                  </div>
                  <div className="text-[10px] text-[#718096]">
                    {feedLedgerQuery.data.totalKgUsed} kg fed
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-3 ring-1 ring-amber-200/60">
                  <div className="text-[10px] font-bold uppercase text-amber-900/60">
                    Stock Value Left
                  </div>
                  <div className="text-lg font-extrabold text-emerald-700">
                    {feedLedgerQuery.data.bagsBought === 0 &&
                    feedLedgerQuery.data.unspecifiedFeedCount
                      ? "Incomplete"
                      : formatNaira(feedLedgerQuery.data.remainingStockValue)}
                  </div>
                  <div className="text-[10px] text-[#718096]">Unconsumed inventory</div>
                </div>
              </div>

              {Boolean(feedLedgerQuery.data.unspecifiedFeedCount) && (
                <p className="rounded border border-amber-300 bg-white p-3 text-sm">
                  Inventory incomplete: {feedLedgerQuery.data.unspecifiedFeedCount} older purchases
                  have no confirmed bag quantity. Their spend is excluded from unit valuations. Use
                  the transaction Edit action below to confirm quantities and brands; original
                  values remain in history.
                </p>
              )}
              {feedLedgerQuery.data.brandBreakdown.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[10px] font-bold uppercase text-amber-900/70">
                    Purchased Brands:
                  </span>
                  {feedLedgerQuery.data.brandBreakdown.map((br) => (
                    <span
                      key={br.brand}
                      className="rounded-full bg-white border border-amber-200 px-3 py-0.5 text-[11px] font-semibold text-[#0F3D24]"
                    >
                      {br.brand}: {br.bagsBought > 0 ? `${br.bagsBought} bags · ` : ""}
                      {formatNaira(br.spend)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Per-Batch Breakdown Table with Grand Total Footer */}
          {perBatchBreakdown.length > 0 && (
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#0F3D24]/10 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-[#0F3D24]">Per-Batch Financial Summary</h3>
                <span className="text-[11px] text-[#0F3D24]/60">Click any batch row to filter</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F5F0] text-[#0F3D24]/80 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3">Batch / receipt source</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Live Birds</th>
                      <th className="p-3 text-right">Revenue</th>
                      <th className="p-3 text-right">Expenses</th>
                      <th className="p-3 text-right">Net Profit / Loss</th>
                      <th className="p-3 text-right">ROI</th>
                      {role === "owner" && <th className="p-3 text-center">Staff Visibility</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0F3D24]/5">
                    {perBatchBreakdown.map((b) => {
                      const net = b.income - b.expense;
                      const roi =
                        b.expense > 0
                          ? `${((net / b.expense) * 100).toFixed(1)}%`
                          : b.income > 0
                            ? "100%"
                            : "0%";
                      const clickable = true;
                      const fullBatch = clickable ? batches.find((fb) => fb.id === b.id) : null;
                      return (
                        <tr
                          key={b.id}
                          onClick={() => clickable && setSelectedBatchId(b.id)}
                          className={`${clickable ? "cursor-pointer hover:bg-[#F7F5F0]/60" : ""} ${
                            selectedBatchId === b.id ? "bg-emerald-50/70 font-semibold" : ""
                          }`}
                        >
                          <td className="p-3 font-bold text-[#0F3D24]">
                            {b.batchName}{" "}
                            <span className="text-[10px] font-normal text-slate-500">
                              ({b.batchType})
                            </span>
                          </td>
                          <td className="p-3">
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                b.status === "active"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {b.status === "active"
                                ? "Active"
                                : b.status === "completed"
                                  ? "Closed"
                                  : "Archived"}
                            </span>
                          </td>
                          <td className="p-3 text-right tabular-nums">
                            {b.currentHeadcount.toLocaleString()}
                          </td>
                          <td className="p-3 text-right font-semibold text-emerald-700 tabular-nums">
                            {formatNaira(b.income)}
                          </td>
                          <td className="p-3 text-right font-semibold text-rose-700 tabular-nums">
                            {formatNaira(b.expense)}
                          </td>
                          <td
                            className={`p-3 text-right font-bold tabular-nums ${net >= 0 ? "text-emerald-700" : "text-rose-700"}`}
                          >
                            {formatNaira(net)}
                          </td>
                          <td className="p-3 text-right text-slate-600 tabular-nums">{roi}</td>
                          {role === "owner" && (
                            <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                              {fullBatch ? (
                                <button
                                  type="button"
                                  disabled={toggleStaffVisMut.isPending}
                                  onClick={() =>
                                    toggleStaffVisMut.mutate({
                                      id: fullBatch.id,
                                      show: !fullBatch.showFinancialsToStaff,
                                    })
                                  }
                                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold transition ${
                                    fullBatch.showFinancialsToStaff
                                      ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                  }`}
                                >
                                  {fullBatch.showFinancialsToStaff ? (
                                    <Eye size={11} />
                                  ) : (
                                    <EyeOff size={11} />
                                  )}
                                  {fullBatch.showFinancialsToStaff ? "Visible" : "Hidden"}
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400">—</span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#0F3D24] text-white font-extrabold">
                      <td className="p-3 rounded-bl-xl" colSpan={2}>
                        GRAND TOTAL (ALL BATCHES COMBINED)
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        {batches.reduce((s, b) => s + b.currentHeadcount, 0).toLocaleString()}
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        {formatNaira(farmWideTotals.totalIncome)}
                      </td>
                      <td className="p-3 text-right text-rose-200 tabular-nums">
                        {formatNaira(farmWideTotals.totalExpense)}
                      </td>
                      <td
                        className={`p-3 text-right tabular-nums ${farmWideTotals.netProfit >= 0 ? "text-emerald-300" : "text-rose-300"}`}
                      >
                        {formatNaira(farmWideTotals.netProfit)}
                      </td>
                      <td className="p-3 text-right rounded-br-xl tabular-nums">
                        {farmWideTotals.totalExpense > 0
                          ? `${((farmWideTotals.netProfit / farmWideTotals.totalExpense) * 100).toFixed(1)}%`
                          : "—"}
                      </td>
                      {role === "owner" && <td className="p-3" />}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Interactive Sales & Revenue Line Chart */}
          <FinanceSalesChart
            passcode={passcode}
            financials={allFinancials.map((f) => ({
              ...f,
              recordedBy: f.recordedBy || null,
            }))}
          />

          {/* Batch Detailed Financial Report (If a batch is selected) */}
          {selectedBatchId !== "all" && reportQuery.data && (
            <div className="rounded-3xl bg-[#0F3D24] p-6 text-white shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <span className="inline-block rounded-full bg-[#3F8F3F]/30 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#A2E0A2]">
                    Batch Performance Report
                  </span>
                  <h3 className="mt-2 text-2xl font-bold">{reportQuery.data.batch.batchName}</h3>
                  <p className="mt-1 text-xs text-white/70">
                    Type: {reportQuery.data.batch.batchType} • Started:{" "}
                    {reportQuery.data.batch.startDate}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-white/70">Batch ROI</div>
                  <div className="text-3xl font-extrabold text-[#A2E0A2]">
                    {reportQuery.data.roiPercentage.toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                <div className="rounded-2xl bg-white/10 p-4">
                  <span className="text-xs text-white/70">Initial Headcount</span>
                  <div className="mt-1 text-xl font-bold">
                    {reportQuery.data.batch.initialHeadcount} birds
                  </div>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <span className="text-xs text-white/70">Current Live Headcount</span>
                  <div className="mt-1 text-xl font-bold text-[#A2E0A2]">
                    {reportQuery.data.batch.currentHeadcount} birds
                  </div>
                </div>
                <div className="rounded-2xl bg-white/10 p-4 relative">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs text-white/70">Cost per Bird</span>
                    <button
                      type="button"
                      onClick={() => setShowCostFormulaInfo((v) => !v)}
                      className="text-white/60 hover:text-white transition"
                      title="How Cost per Bird is calculated"
                    >
                      <Info size={14} />
                    </button>
                  </div>
                  <div className="mt-1 text-xl font-bold">
                    {formatNaira(reportQuery.data.costPerBird)}
                  </div>
                  <div className="mt-1 text-[10px] text-white/65">
                    {formatNaira(reportQuery.data.totalExpense)} ÷{" "}
                    {reportQuery.data.batch.initialHeadcount} initial birds
                  </div>
                  {showCostFormulaInfo && (
                    <div className="mt-2 rounded-xl bg-[#0a2918] p-2.5 text-[10px] text-white/90 ring-1 ring-white/15 space-y-1">
                      <div className="font-bold text-[#A2E0A2]">Formula Breakdown:</div>
                      <div>
                        Total Approved Expenses ({formatNaira(reportQuery.data.totalExpense)}) ÷
                        Initial Headcount ({reportQuery.data.batch.initialHeadcount} stocked) ={" "}
                        {formatNaira(reportQuery.data.costPerBird)}/bird.
                      </div>
                      {reportQuery.data.batch.currentHeadcount > 0 && (
                        <div className="text-white/70">
                          On {reportQuery.data.batch.currentHeadcount} surviving live birds:{" "}
                          {formatNaira(
                            reportQuery.data.totalExpense / reportQuery.data.batch.currentHeadcount,
                          )}
                          /live bird.
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <span className="text-xs text-white/70">Mortality Rate</span>
                  <div className="mt-1 text-xl font-bold text-amber-300">
                    {reportQuery.data.totalMortality} birds (
                    {reportQuery.data.mortalityRatePercentage.toFixed(1)}%)
                  </div>
                </div>
              </div>

              {/* Expense Breakdown Categories */}
              <div className="mt-6 border-t border-white/10 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-white/90">
                    Expense Breakdown by Category:
                  </h4>
                  <span className="text-xs font-semibold text-white/75">
                    Total Batch Expenses:{" "}
                    <strong className="text-[#A2E0A2]">
                      {formatNaira(reportQuery.data.totalExpense)}
                    </strong>
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(reportQuery.data.expenseByCategory).map(([cat, amt]) => (
                    <div
                      key={cat}
                      className="flex items-center gap-2 rounded-xl bg-white/15 px-3 py-1.5 text-xs"
                    >
                      <span className="font-semibold text-white">{cat}:</span>
                      <span className="font-bold text-[#A2E0A2]">{formatNaira(amt)}</span>
                    </div>
                  ))}
                  {Object.keys(reportQuery.data.expenseByCategory).length === 0 && (
                    <p className="text-xs text-white/60">
                      No expenses recorded for this batch yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Transaction Records Table */}
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/5">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4">
              <h3 className="text-lg font-bold text-[#0F3D24]">Financial Transaction Ledger</h3>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-3 text-[#0F3D24]/40" />
                  <input
                    type="text"
                    placeholder="Search ledger..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="rounded-full border border-[#0F3D24]/15 pl-10 pr-4 py-2 text-xs outline-none focus:border-[#3F8F3F]"
                  />
                </div>

                <div className="flex rounded-full bg-[#0F3D24]/5 p-1 text-xs font-semibold">
                  <button
                    onClick={() => setTypeFilter("all")}
                    className={`rounded-full px-3 py-1 ${typeFilter === "all" ? "bg-white text-[#0F3D24] shadow-xs" : "text-[#0F3D24]/70"}`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setTypeFilter("income")}
                    className={`rounded-full px-3 py-1 ${typeFilter === "income" ? "bg-emerald-600 text-white shadow-xs" : "text-[#0F3D24]/70"}`}
                  >
                    Income
                  </button>
                  <button
                    onClick={() => setTypeFilter("expense")}
                    className={`rounded-full px-3 py-1 ${typeFilter === "expense" ? "bg-rose-600 text-white shadow-xs" : "text-[#0F3D24]/70"}`}
                  >
                    Expenses
                  </button>
                </div>
              </div>
            </div>

            {financialsQuery.isLoading ? (
              <div className="py-8 text-center text-sm text-[#0F3D24]/60">
                Loading financial records...
              </div>
            ) : filteredFinancials.length === 0 ? (
              <div className="py-8 text-center text-sm text-[#0F3D24]/60">
                No financial transactions found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-[#0F3D24]">
                  <thead className="border-b border-[#0F3D24]/10 bg-[#F7F5F0]/50 text-xs font-semibold text-[#0F3D24]/70 uppercase">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Batch</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Method</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0F3D24]/5">
                    {filteredFinancials.map((f) => (
                      <tr key={f.id} className="hover:bg-[#F7F5F0]/30 transition">
                        <td className="px-4 py-3.5 whitespace-nowrap text-xs text-[#0F3D24]/70">
                          {f.transactionDate}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {f.type === "income" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                              <TrendingUp size={12} /> Income
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                              <TrendingDown size={12} /> Expense
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 font-medium">{f.category}</td>
                        <td className="px-4 py-3.5 text-xs text-[#0F3D24]/70">
                          {f.batchName ? (
                            <span className="rounded-md bg-[#0F3D24]/5 px-2 py-1 font-semibold">
                              {f.batchName}
                            </span>
                          ) : (
                            <span className="text-gray-400">General Farm</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-xs max-w-xs truncate" title={f.description}>
                          <div>{f.description}</div>
                          {"feedBags" in f && Number((f as FarmFinancial).feedBags || 0) > 0 && (
                            <div className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900 mr-1">
                              {(f as FarmFinancial).feedBags} bags ×{" "}
                              {(f as FarmFinancial).feedKgPerBag || 25}kg
                              {(f as FarmFinancial).feedBrand
                                ? ` (${(f as FarmFinancial).feedBrand})`
                                : ""}
                            </div>
                          )}
                          {"balanceDue" in f &&
                            Number((f as FarmFinancial).balanceDue || 0) > 0.005 && (
                              <div className="mt-1 inline-flex flex-wrap items-center gap-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                                <span>{(f as FarmFinancial).partyName || "Credit"}:</span>
                                <span>
                                  Bal {formatNaira(Number((f as FarmFinancial).balanceDue || 0))}
                                </span>
                                {(f as FarmFinancial).dueDate && (
                                  <span>(Due {(f as FarmFinancial).dueDate})</span>
                                )}
                              </div>
                            )}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-[#0F3D24]/70">{f.paymentMethod}</td>
                        <td
                          className={`px-4 py-3.5 text-right font-bold whitespace-nowrap ${f.type === "income" ? "text-emerald-700" : "text-rose-700"}`}
                        >
                          <div>
                            {f.type === "income" ? "+" : "-"}
                            {formatNaira(f.amount)}
                          </div>
                          {"balanceDue" in f &&
                            Number((f as FarmFinancial).balanceDue || 0) > 0.005 && (
                              <div className="text-[10px] font-semibold text-[#718096]">
                                Paid: {formatNaira(Number((f as FarmFinancial).amountPaid || 0))}
                              </div>
                            )}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {"isDecemberPreorder" in f && f.isDecemberPreorder ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-900 ring-1 ring-amber-300">
                              <Gift size={11} className="text-amber-700" /> 🎄 December Pre-Order
                            </span>
                          ) : "isOrder" in f && f.isOrder ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#0F3D24]/10 px-2.5 py-1 text-[10px] font-bold text-[#0F3D24]">
                              🛒 Store Order
                            </span>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              {"balanceDue" in f &&
                                Number((f as FarmFinancial).balanceDue || 0) > 0.005 && (
                                  <button
                                    type="button"
                                    onClick={() => setPayingFinancial(f as FarmFinancial)}
                                    className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-900 hover:bg-amber-200 transition"
                                    title="Record partial or full follow-up payment"
                                  >
                                    <CreditCard size={11} /> Pay Bal
                                  </button>
                                )}
                              {role === "owner" && (
                                <>
                                  <button
                                    onClick={() =>
                                      setEditingFinancial({
                                        ...f,
                                        amount: f.originalAmount ?? f.amount,
                                      } as FarmFinancial)
                                    }
                                    className="text-[#3F8F3F] hover:text-[#0F3D24] transition p-1"
                                    title="Edit financial record"
                                  >
                                    <Pencil size={15} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm("Delete this financial record?"))
                                        deleteFinMut.mutate(f.id);
                                    }}
                                    className="text-rose-600 hover:text-rose-800 transition p-1"
                                    title="Delete record"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {payingFinancial && (
        <RecordFinancialPaymentModal
          passcode={passcode}
          role={role}
          item={{
            id: payingFinancial.id,
            partyName: payingFinancial.partyName || "Unnamed Party",
            description: payingFinancial.description,
            totalAmount: payingFinancial.amount,
            amountPaid: Number(payingFinancial.amountPaid ?? payingFinancial.amount),
            balanceDue: Number(payingFinancial.balanceDue || 0),
            dueDate: payingFinancial.dueDate || null,
            kind: payingFinancial.type === "income" ? "debtor" : "creditor",
          }}
          onClose={() => setPayingFinancial(null)}
          onSuccess={(msg) => setFeedback(msg)}
        />
      )}

      {/* Modal: New Batch */}
      {showBatchModal && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-md overflow-hidden animate-in fade-in duration-200">
          <div className="w-full h-[96dvh] sm:h-auto sm:max-h-[90vh] max-w-lg rounded-t-3xl sm:rounded-3xl bg-white p-5 sm:p-6 shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b pb-3 shrink-0">
              <h3 className="text-base sm:text-lg font-bold text-[#0F3D24]">
                Register New Farm Batch
              </h3>
              <button
                onClick={() => setShowBatchModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#0F3D24]">Batch Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Batch 15 - Oct Broilers"
                  value={batchForm.batchName}
                  onChange={(e) => setBatchForm({ ...batchForm, batchName: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-[#0F3D24]">Batch Type</label>
                  <select
                    value={batchForm.batchType}
                    onChange={(e) => setBatchForm({ ...batchForm, batchType: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                  >
                    <option value="Broiler">Broiler Chicken</option>
                    <option value="Layer">Layers (Eggs)</option>
                    <option value="Turkey">Turkeys</option>
                    <option value="Fish">Fish / Aquaculture</option>
                    <option value="Other">Other Livestock</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0F3D24]">
                    Initial Headcount
                  </label>
                  <NumberField
                    min={0}
                    value={batchForm.initialHeadcount}
                    onValueChange={(n) => setBatchForm({ ...batchForm, initialHeadcount: n ?? 0 })}
                    className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-[#0F3D24]">Start Date</label>
                  <input
                    type="date"
                    value={batchForm.startDate}
                    onChange={(e) => setBatchForm({ ...batchForm, startDate: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0F3D24]">
                    Target Harvest Date
                  </label>
                  <input
                    type="date"
                    value={batchForm.targetHarvestDate}
                    onChange={(e) =>
                      setBatchForm({ ...batchForm, targetHarvestDate: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F3D24]">Notes</label>
                <textarea
                  placeholder="Supplier details, vaccination schedule notes..."
                  value={batchForm.notes}
                  onChange={(e) => setBatchForm({ ...batchForm, notes: e.target.value })}
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2 text-sm outline-none focus:border-[#3F8F3F]"
                />
              </div>

              <label className="flex items-start gap-2.5 rounded-xl border border-[#0F3D24]/15 bg-[#F7F5F0]/70 p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(batchForm.showFinancialsToStaff)}
                  onChange={(e) =>
                    setBatchForm({ ...batchForm, showFinancialsToStaff: e.target.checked })
                  }
                  className="mt-0.5 h-4 w-4 accent-[#0F3D24]"
                />
                <div className="text-xs">
                  <span className="font-bold text-[#0F3D24] block">
                    Allow staff to view financials for this batch
                  </span>
                  <span className="text-[11px] text-[#0F3D24]/65">
                    Keep unchecked (default) to hide revenue, expenses, and profits from staff
                    accounts.
                  </span>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowBatchModal(false)}
                className="rounded-full bg-gray-100 px-5 py-2 text-xs font-semibold text-gray-600"
              >
                Cancel
              </button>
              <button
                disabled={!batchForm.batchName.trim() || createBatchMut.isPending}
                onClick={() => createBatchMut.mutate()}
                className="rounded-full bg-[#0F3D24] px-6 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {createBatchMut.isPending ? "Saving..." : "Create Batch"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Financial Record */}
      {showFinancialModal && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-md overflow-hidden animate-in fade-in duration-200">
          <div className="w-full h-[96dvh] sm:h-auto sm:max-h-[90vh] max-w-lg rounded-t-3xl sm:rounded-3xl bg-white p-5 sm:p-6 shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b pb-3 shrink-0">
              <h3 className="text-base sm:text-lg font-bold text-[#0F3D24]">
                Register Financial Transaction
              </h3>
              <button
                onClick={() => setShowFinancialModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-gray-100 p-1 text-center font-bold text-xs">
                <button
                  onClick={() => setFinForm({ ...finForm, type: "expense", category: "Feed" })}
                  className={`rounded-xl py-2 transition ${finForm.type === "expense" ? "bg-rose-600 text-white shadow-xs" : "text-gray-600"}`}
                >
                  Expense (Money Out)
                </button>
                <button
                  onClick={() => setFinForm({ ...finForm, type: "income", category: "Bird Sales" })}
                  className={`rounded-xl py-2 transition ${finForm.type === "income" ? "bg-emerald-600 text-white shadow-xs" : "text-gray-600"}`}
                >
                  Income (Money In)
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F3D24]">
                  Assign to Active Batch *
                </label>
                <select
                  value={finForm.batchId}
                  onChange={(e) => setFinForm({ ...finForm, batchId: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                >
                  <option value="">Select active batch...</option>
                  {activeBatches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batchName} ({b.batchType})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-[#0F3D24]">Category</label>
                  <select
                    value={finForm.category}
                    onChange={(e) => setFinForm({ ...finForm, category: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                  >
                    {finForm.type === "expense" ? (
                      <>
                        <option value="Feed">Feed & Nutrition</option>
                        <option value="Medication/Vaccine">Medication & Vaccines</option>
                        <option value="Day-Old Chicks">Day-Old Chicks / Stock Purchase</option>
                        <option value="Logistics/Transport">Logistics & Transportation</option>
                        <option value="Labor/Salaries">Labor & Staff Salaries</option>
                        <option value="Utilities">Utilities & Electricity</option>
                        <option value="Equipment">Farm Equipment & Repairs</option>
                        <option value="Packaging">Packaging & Processing</option>
                        <option value="Other Expense">Other Expense</option>
                      </>
                    ) : (
                      <>
                        <option value="Bird Sales">Live & Processed Bird Sales</option>
                        <option value="Egg Sales">Fresh Egg Sales</option>
                        <option value="Pre-orders">Pre-order Inflows</option>
                        <option value="Manure Sales">Poultry Manure Sales</option>
                        <option value="Other Income">Other Income</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F3D24]">Amount (₦) *</label>
                  <NumberField
                    allowDecimal
                    min={0}
                    placeholder="e.g. 150000"
                    value={finForm.amount}
                    onValueChange={(_, raw) => setFinForm({ ...finForm, amount: raw })}
                    className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F3D24]">Description *</label>
                <input
                  type="text"
                  placeholder="e.g. Purchased 50 bags of Ultima Broiler Finisher Feed"
                  value={finForm.description}
                  onChange={(e) => setFinForm({ ...finForm, description: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                />
              </div>

              {finForm.type === "expense" && finForm.category === "Feed" && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 space-y-2.5">
                  <div className="text-xs font-bold text-amber-950">
                    Feed Bag Inventory Details (Links with Daily Farm Logs)
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-[11px] font-bold text-amber-900">
                        Number of Bags
                      </label>
                      <NumberField
                        allowDecimal
                        min={0}
                        placeholder="e.g. 10"
                        value={finForm.feedBags}
                        onValueChange={(_, raw) => setFinForm({ ...finForm, feedBags: raw })}
                        className="mt-1 w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-bold text-[#0F3D24] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-amber-900">
                        Bag Weight (kg)
                      </label>
                      <NumberField
                        allowDecimal
                        min={1}
                        placeholder="25"
                        value={finForm.feedKgPerBag}
                        onValueChange={(_, raw) => setFinForm({ ...finForm, feedKgPerBag: raw })}
                        className="mt-1 w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-bold text-[#0F3D24] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-amber-900">
                        Feed Brand
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. New Hope"
                        value={finForm.feedBrand}
                        onChange={(e) => setFinForm({ ...finForm, feedBrand: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm text-[#0F3D24] outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {["New Hope", "Ultima", "TopFeed", "Vital Feed"].map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setFinForm({ ...finForm, feedBrand: b })}
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          finForm.feedBrand === b
                            ? "bg-amber-700 text-white"
                            : "bg-white text-amber-900 border border-amber-200 hover:bg-amber-100"
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {finForm.type === "income" &&
                /bird|offload|broiler|chicken|pre-?order/i.test(finForm.category) && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 space-y-1.5">
                    <label className="block text-[11px] font-bold text-emerald-950">
                      Number of Birds Sold (Auto-deducted from Live Birds count)
                    </label>
                    <NumberField
                      min={0}
                      placeholder="e.g. 7 (optional — auto-detected from description if blank)"
                      value={finForm.birdsSold}
                      onValueChange={(_, raw) => setFinForm({ ...finForm, birdsSold: raw })}
                      className="w-full rounded-xl border border-emerald-300 bg-white px-3 py-2 text-sm font-bold text-[#0F3D24] outline-none"
                    />
                    <p className="text-[11px] text-emerald-900/75">
                      Entering the exact count keeps the batch&apos;s remaining Live Birds balance
                      accurate.
                    </p>
                  </div>
                )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-[#0F3D24]">Payment Method</label>
                  <select
                    value={finForm.paymentMethod}
                    onChange={(e) => setFinForm({ ...finForm, paymentMethod: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="POS">POS / Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F3D24]">Transaction Date</label>
                  <input
                    type="date"
                    value={finForm.transactionDate}
                    onChange={(e) => setFinForm({ ...finForm, transactionDate: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                  />
                </div>
              </div>

              {/* Partial / Credit Payment Fields */}
              <div className="rounded-2xl bg-[#F7F5F0]/70 p-3.5 space-y-3 border border-[#0F3D24]/10">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-bold text-[#0F3D24]">
                    Amount Paid Now (₦){" "}
                    <span className="font-normal text-[#0F3D24]/60">
                      (Leave blank if fully settled)
                    </span>
                  </label>
                  {finForm.amountPaid.trim() !== "" &&
                    Number(finForm.amount || 0) > Number(finForm.amountPaid || 0) && (
                      <span className="text-[11px] font-extrabold text-rose-700">
                        Balance:{" "}
                        {formatNaira(
                          Math.max(
                            0,
                            Number(finForm.amount || 0) - Number(finForm.amountPaid || 0),
                          ),
                        )}
                      </span>
                    )}
                </div>
                <NumberField
                  allowDecimal
                  min={0}
                  max={Number(finForm.amount || 0) || undefined}
                  placeholder={
                    finForm.amount ? `Full payment (₦${finForm.amount})` : "Full payment"
                  }
                  value={finForm.amountPaid}
                  onValueChange={(_, raw) => setFinForm({ ...finForm, amountPaid: raw })}
                  className="w-full rounded-xl border border-[#0F3D24]/15 bg-white px-4 py-2 text-sm outline-none focus:border-[#3F8F3F]"
                />

                {finForm.amountPaid.trim() !== "" &&
                  Number(finForm.amount || 0) > Number(finForm.amountPaid || 0) && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-bold text-rose-700">
                          {finForm.type === "income" ? "Customer Name *" : "Supplier Name *"}
                        </label>
                        <input
                          type="text"
                          placeholder={
                            finForm.type === "income" ? "Who owes us?" : "Who do we owe?"
                          }
                          value={finForm.partyName}
                          onChange={(e) => setFinForm({ ...finForm, partyName: e.target.value })}
                          className="mt-1 w-full rounded-xl border border-rose-300 bg-white px-3 py-2 text-sm outline-none focus:border-rose-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-rose-700">Due Date *</label>
                        <input
                          type="date"
                          value={finForm.dueDate}
                          onChange={(e) => setFinForm({ ...finForm, dueDate: e.target.value })}
                          className="mt-1 w-full rounded-xl border border-rose-300 bg-white px-3 py-2 text-sm outline-none focus:border-rose-500"
                        />
                      </div>
                    </div>
                  )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowFinancialModal(false)}
                className="rounded-full bg-gray-100 px-5 py-2 text-xs font-semibold text-gray-600"
              >
                Cancel
              </button>
              <button
                disabled={
                  !finForm.batchId ||
                  !finForm.amount ||
                  Number(finForm.amount) <= 0 ||
                  !finForm.description.trim() ||
                  (finForm.amountPaid.trim() !== "" &&
                    Number(finForm.amount) > Number(finForm.amountPaid || 0) &&
                    (!finForm.partyName.trim() || !finForm.dueDate.trim())) ||
                  createFinancialMut.isPending
                }
                onClick={() => {
                  if (role === "owner") {
                    createFinancialMut.mutate();
                  } else {
                    setPendingFinTypoConfirm(true);
                  }
                }}
                className={`rounded-full px-6 py-2 text-xs font-semibold text-white disabled:opacity-50 ${finForm.type === "income" ? "bg-emerald-700 hover:bg-emerald-800" : "bg-rose-700 hover:bg-rose-800"}`}
              >
                {createFinancialMut.isPending
                  ? "Saving..."
                  : `Record ${finForm.type === "income" ? "Income" : "Expense"}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Batch */}
      {editingBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-[#0F3D24]">Edit Farm Batch</h3>
              <button
                onClick={() => setEditingBatch(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#0F3D24]">Batch Name *</label>
                <input
                  type="text"
                  value={editingBatch.batchName}
                  onChange={(e) => setEditingBatch({ ...editingBatch, batchName: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-[#0F3D24]">Batch Type</label>
                  <select
                    value={editingBatch.batchType}
                    onChange={(e) =>
                      setEditingBatch({ ...editingBatch, batchType: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                  >
                    <option value="Broiler">Broiler Chicken</option>
                    <option value="Layer">Layers (Eggs)</option>
                    <option value="Turkey">Turkeys</option>
                    <option value="Fish">Fish / Aquaculture</option>
                    <option value="Other">Other Livestock</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0F3D24]">Status</label>
                  <select
                    value={editingBatch.status}
                    onChange={(e) =>
                      setEditingBatch({ ...editingBatch, status: e.target.value as any })
                    }
                    className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                  >
                    <option value="active">Active</option>
                    <option value="completed">Closed / Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-[#0F3D24]">
                    Initial Headcount
                  </label>
                  <NumberField
                    min={0}
                    value={editingBatch.initialHeadcount}
                    onValueChange={(n) =>
                      setEditingBatch({ ...editingBatch, initialHeadcount: n ?? 0 })
                    }
                    className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0F3D24]">
                    Current Live Headcount
                  </label>
                  <NumberField
                    min={0}
                    value={editingBatch.currentHeadcount}
                    disabled
                    onValueChange={(n) =>
                      setEditingBatch({ ...editingBatch, currentHeadcount: n ?? 0 })
                    }
                    className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-[#0F3D24]">Start Date</label>
                  <input
                    type="date"
                    value={editingBatch.startDate}
                    onChange={(e) =>
                      setEditingBatch({ ...editingBatch, startDate: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0F3D24]">
                    Target Harvest Date
                  </label>
                  <input
                    type="date"
                    value={editingBatch.targetHarvestDate || ""}
                    onChange={(e) =>
                      setEditingBatch({ ...editingBatch, targetHarvestDate: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F3D24]">Notes</label>
                <textarea
                  value={editingBatch.notes || ""}
                  onChange={(e) => setEditingBatch({ ...editingBatch, notes: e.target.value })}
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2 text-sm outline-none focus:border-[#3F8F3F]"
                />
              </div>

              <label className="flex items-start gap-2.5 rounded-xl border border-[#0F3D24]/15 bg-[#F7F5F0]/70 p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(editingBatch.showFinancialsToStaff)}
                  onChange={(e) =>
                    setEditingBatch({ ...editingBatch, showFinancialsToStaff: e.target.checked })
                  }
                  className="mt-0.5 h-4 w-4 accent-[#0F3D24]"
                />
                <div className="text-xs">
                  <span className="font-bold text-[#0F3D24] block">
                    Allow staff to view financials for this batch
                  </span>
                  <span className="text-[11px] text-[#0F3D24]/65">
                    Unchecked (default) keeps financial reports and totals hidden from staff
                    accounts.
                  </span>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setEditingBatch(null)}
                className="rounded-full bg-gray-100 px-5 py-2 text-xs font-semibold text-gray-600"
              >
                Cancel
              </button>
              <button
                disabled={!editingBatch.batchName.trim() || updateBatchMut.isPending}
                onClick={() => updateBatchMut.mutate(editingBatch)}
                className="rounded-full bg-[#0F3D24] px-6 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {updateBatchMut.isPending ? "Updating..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {renderSharedFinDialogs()}

      {/* Modal: Export Custom Report */}
      <ExportReportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        batches={batches}
        selectedBatchId={selectedBatchId}
        financials={allFinancials.map((f) => ({
          id: f.id,
          transactionDate: f.transactionDate,
          type: f.type,
          category: f.category,
          batchName: f.batchName || undefined,
          description: f.description,
          paymentMethod: f.paymentMethod || undefined,
          amount: f.amount,
          referenceNo: f.referenceNo || undefined,
        }))}
        activities={(activitiesQuery.data || []).map((a) => ({
          id: a.id,
          activityDate: a.activityDate,
          activityType: a.activityType,
          batchName: a.batchName || undefined,
          description: a.notes || a.activityType,
          notes: a.notes || undefined,
          loggedBy: a.recordedBy || undefined,
        }))}
        totalIncome={totalIncome}
        totalExpense={totalExpense}
        netProfit={netProfit}
        roiText={
          totalExpense > 0
            ? `ROI: ${((netProfit / totalExpense) * 100).toFixed(1)}%`
            : netProfit > 0
              ? "100% Margin (No Expenses)"
              : "0% ROI"
        }
      />

      {showFinancialImportModal && (
        <FinancialImportModal
          isOpen={showFinancialImportModal}
          onClose={() => setShowFinancialImportModal(false)}
          passcode={passcode}
          batches={batches}
          defaultBatchId={selectedBatchId === "all" ? null : selectedBatchId}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["farm-financials"] });
            queryClient.invalidateQueries({ queryKey: ["farm-batches"] });
            queryClient.invalidateQueries({ queryKey: ["batch-report"] });
            queryClient.invalidateQueries({ queryKey: ["admin-orders-financials"] });
            queryClient.invalidateQueries({ queryKey: ["my-submissions"] });
            queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
            queryClient.invalidateQueries({ queryKey: ["pending-approvals-count"] });
          }}
        />
      )}
    </div>
  );
}

// ─── 2. CRM / CUSTOMER LEADS PANEL ───────────────────────────────────────────

export function LeadCrmPanel({ passcode, role = "owner" }: { passcode: string; role?: AdminRole }) {
  const queryClient = useQueryClient();
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [reminderTarget, setReminderTarget] = useState<{ name: string; phone: string } | null>(
    null,
  );
  const [editingLead, setEditingLead] = useState<CrmLead | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [feedback, setFeedback] = useState<string | null>(null);

  const [commTargetLead, setCommTargetLead] = useState<CrmLead | null>(null);
  const [historyTargetLead, setHistoryTargetLead] = useState<CrmLead | null>(null);
  const [commForm, setCommForm] = useState({
    activityType: "WhatsApp Message",
    templateKey: "december_preorder",
    messageSummary: "December Pre-Order Sales Promo",
    content: "",
  });

  const listLeadsFn = useServerFn(adminListLeads);
  const createLeadFn = useServerFn(adminCreateLead);
  const updateLeadFn = useServerFn(adminUpdateLead);
  const deleteLeadFn = useServerFn(adminDeleteLead);
  const logCommFn = useServerFn(adminLogLeadCommunication);

  const leadsQuery = useQuery({
    queryKey: ["crm-leads", passcode],
    queryFn: () => listLeadsFn({ data: { passcode } }),
    enabled: Boolean(passcode),
    placeholderData: (previousData) => previousData,
  });

  const [leadForm, setLeadForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    location: "",
    leadSource: "WhatsApp",
    interestedIn: "Live Broilers",
    status: "New Lead" as CrmLead["status"],
    estimatedValue: "",
    notes: "",
    followUpDate: "",
  });

  const saveLeadMut = useMutation({
    mutationFn: async () => {
      if (editingLead) {
        await updateLeadFn({
          data: {
            passcode,
            id: editingLead.id,
            fullName: leadForm.fullName,
            phone: leadForm.phone,
            email: leadForm.email || null,
            location: leadForm.location || null,
            leadSource: leadForm.leadSource,
            interestedIn: leadForm.interestedIn || null,
            status: leadForm.status,
            estimatedValue: Number(leadForm.estimatedValue || 0),
            notes: leadForm.notes || null,
            followUpDate: leadForm.followUpDate || null,
          },
        });
      } else {
        await createLeadFn({
          data: {
            passcode,
            fullName: leadForm.fullName,
            phone: leadForm.phone,
            email: leadForm.email || null,
            location: leadForm.location || null,
            leadSource: leadForm.leadSource,
            interestedIn: leadForm.interestedIn || null,
            status: leadForm.status,
            estimatedValue: Number(leadForm.estimatedValue || 0),
            notes: leadForm.notes || null,
            followUpDate: leadForm.followUpDate || null,
          },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      setShowLeadModal(false);
      setEditingLead(null);
      resetLeadForm();
      setFeedback("Customer lead saved successfully.");
    },
    onError: (e: Error) => setFeedback("Error: " + e.message),
  });

  const deleteLeadMut = useMutation({
    mutationFn: (id: string) => deleteLeadFn({ data: { passcode, id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      setFeedback("Lead record deleted.");
    },
    onError: (e: Error) => setFeedback("Delete error: " + e.message),
  });

  const logCommMut = useMutation({
    mutationFn: async (sendToWhatsapp: boolean) => {
      if (!commTargetLead) return;
      const contentText = commForm.content || commForm.messageSummary;

      await logCommFn({
        data: {
          passcode,
          leadId: commTargetLead.id,
          activityType: commForm.activityType,
          messageSummary: commForm.messageSummary,
          content: contentText,
          sentBy: "Admin",
          updateStatusToContacted: true,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      setFeedback(`Communication successfully logged for ${commTargetLead?.fullName}`);
      setCommTargetLead(null);
    },
    onError: (e: Error) => setFeedback("Log error: " + e.message),
  });

  const resetLeadForm = () => {
    setLeadForm({
      fullName: "",
      phone: "",
      email: "",
      location: "",
      leadSource: "WhatsApp",
      interestedIn: "Live Broilers",
      status: "New Lead",
      estimatedValue: "",
      notes: "",
      followUpDate: "",
    });
  };

  const openEdit = (lead: CrmLead) => {
    setEditingLead(lead);
    setLeadForm({
      fullName: lead.fullName,
      phone: lead.phone,
      email: lead.email || "",
      location: lead.location || "",
      leadSource: lead.leadSource,
      interestedIn: lead.interestedIn || "",
      status: lead.status,
      estimatedValue: lead.estimatedValue ? String(lead.estimatedValue) : "",
      notes: lead.notes || "",
      followUpDate: lead.followUpDate || "",
    });
    setShowLeadModal(true);
  };

  const leads = leadsQuery.data || [];

  const filteredLeads = leads.filter((l) => {
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (sourceFilter !== "all" && l.leadSource !== sourceFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        l.fullName.toLowerCase().includes(q) ||
        l.phone.toLowerCase().includes(q) ||
        (l.location && l.location.toLowerCase().includes(q)) ||
        (l.notes && l.notes.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Metrics
  const totalLeads = leads.length;
  const newLeads = leads.filter((l) => l.status === "New Lead").length;
  const convertedLeads = leads.filter((l) => l.status === "Converted to Customer").length;
  const pipelineValue = leads.reduce((sum, l) => sum + l.estimatedValue, 0);

  const getStatusBadge = (status: CrmLead["status"]) => {
    switch (status) {
      case "New Lead":
        return "bg-blue-50 text-blue-700 ring-blue-600/20";
      case "Contacted":
        return "bg-amber-50 text-amber-700 ring-amber-600/20";
      case "Interested / Negotiating":
        return "bg-[#3F8F3F]/10 text-[#0F3D24] ring-[#3F8F3F]/30";
      case "Converted to Customer":
        return "bg-emerald-100 text-emerald-800 font-bold ring-emerald-600/30";
      case "Lost / Inactive":
        return "bg-gray-100 text-gray-600 ring-gray-400/20";
      default:
        return "bg-gray-50 text-gray-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/5">
        <div>
          <div className="flex items-center gap-2 text-[#0F3D24]">
            <UserPlus className="text-[#3F8F3F]" size={24} />
            <h2 className="text-xl font-bold">Customer Leads & CRM Database</h2>
          </div>
          <p className="mt-1 text-sm text-[#0F3D24]/70">
            Record every customer inquiry from WhatsApp, phone calls, social media ads, or
            referrals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {role !== "staff" && (
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 rounded-full border border-[#3F8F3F] bg-[#3F8F3F]/10 px-4 py-2.5 text-xs font-semibold text-[#0F3D24] shadow-sm hover:bg-[#3F8F3F]/20 transition"
              title="Import multiple leads from a CSV or Excel spreadsheet"
            >
              <FileText size={16} className="text-[#3F8F3F]" />
              Import CSV / Excel Batch
            </button>
          )}
          <button
            onClick={() => {
              setEditingLead(null);
              resetLeadForm();
              setShowLeadModal(true);
            }}
            className="flex items-center gap-2 rounded-full bg-[#0F3D24] px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#134a2c] transition"
          >
            <UserPlus size={16} />
            Record New Customer Lead
          </button>
        </div>
      </div>

      {feedback && (
        <div className="flex items-center justify-between rounded-2xl bg-[#3F8F3F]/10 px-5 py-3 text-sm text-[#0F3D24]">
          <span>{feedback}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-[#0F3D24]/60 hover:text-[#0F3D24]"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Analytics KPI Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#0F3D24]/5">
          <span className="text-xs font-semibold text-[#0F3D24]/70">Total Recorded Leads</span>
          <p className="mt-2 text-2xl font-bold text-[#0F3D24]">{totalLeads} Leads</p>
        </div>
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#0F3D24]/5">
          <span className="text-xs font-semibold text-[#0F3D24]/70">New / Uncontacted</span>
          <p className="mt-2 text-2xl font-bold text-blue-600">{newLeads} Inquiries</p>
        </div>
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#0F3D24]/5">
          <span className="text-xs font-semibold text-[#0F3D24]/70">Converted Customers</span>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{convertedLeads} Buyers</p>
        </div>
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#0F3D24]/5">
          <span className="text-xs font-semibold text-[#0F3D24]/70">
            {role === "owner" ? "Est. Pipeline Value" : "Contacted / Active Follow-up"}
          </span>
          <p className="mt-2 text-2xl font-bold text-[#0F3D24]">
            {role === "owner"
              ? formatNaira(pipelineValue)
              : `${leads.filter((l) => l.status === "Contacted" || l.status === "Interested / Negotiating").length} Leads`}
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#F7F5F0] p-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3.5 top-3 text-[#0F3D24]/40" />
            <input
              type="text"
              placeholder="Search leads by name, phone, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full border border-[#0F3D24]/15 bg-white pl-10 pr-4 py-2 text-xs outline-none focus:border-[#3F8F3F]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto rounded-xl border border-[#0F3D24]/15 bg-white px-3 py-2 text-xs font-semibold text-[#0F3D24] outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="New Lead">New Lead</option>
            <option value="Contacted">Contacted</option>
            <option value="Interested / Negotiating">Interested / Negotiating</option>
            <option value="Converted to Customer">Converted to Customer</option>
            <option value="Lost / Inactive">Lost / Inactive</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="w-full sm:w-auto rounded-xl border border-[#0F3D24]/15 bg-white px-3 py-2 text-xs font-semibold text-[#0F3D24] outline-none"
          >
            <option value="all">All Lead Sources</option>
            <option value="WhatsApp">WhatsApp Inbound</option>
            <option value="Facebook Ads">Facebook Ads</option>
            <option value="Instagram">Instagram</option>
            <option value="Referral">Referral</option>
            <option value="Phone Call">Phone Call</option>
            <option value="Walk-in">Walk-in</option>
          </select>
        </div>

        {/* View Mode Toggle: Grid vs List */}
        <div className="flex items-center gap-1 rounded-2xl bg-white p-1 border border-[#0F3D24]/15 shadow-2xs">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              viewMode === "grid"
                ? "bg-[#0F3D24] text-white shadow-xs"
                : "text-[#0F3D24]/70 hover:bg-[#0F3D24]/5"
            }`}
            title="Grid View"
          >
            <LayoutGrid size={15} /> Grid
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              viewMode === "list"
                ? "bg-[#0F3D24] text-white shadow-xs"
                : "text-[#0F3D24]/70 hover:bg-[#0F3D24]/5"
            }`}
            title="List View"
          >
            <List size={15} /> List
          </button>
        </div>
      </div>

      {/* Leads Content: Grid vs List */}
      {leadsQuery.isLoading ? (
        <div className="py-12 text-center text-sm text-[#0F3D24]/60">Loading customer leads...</div>
      ) : filteredLeads.length === 0 ? (
        <div className="py-12 text-center text-sm text-[#0F3D24]/60">No customer leads found.</div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredLeads.map((lead) => (
            <div
              key={lead.id}
              className="flex flex-col justify-between rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#0F3D24]/5 hover:shadow-md transition"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-base text-[#0F3D24]">{lead.fullName}</h3>
                    <span className="text-xs font-mono text-[#0F3D24]/70">{lead.phone}</span>
                  </div>
                  <span
                    className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ${getStatusBadge(lead.status)}`}
                  >
                    {lead.status}
                  </span>
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-[#0F3D24]/80">
                  {lead.interestedIn && (
                    <div className="flex items-center gap-2">
                      <Tag size={14} className="text-[#3F8F3F]" />
                      <span>
                        Interested in: <strong>{lead.interestedIn}</strong>
                      </span>
                    </div>
                  )}
                  {lead.location && (
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-[#0F3D24]/60" />
                      <span>{lead.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-amber-500" />
                    <span>Source: {lead.leadSource}</span>
                  </div>
                  {role === "owner" && lead.estimatedValue > 0 && (
                    <div className="flex items-center gap-2 font-bold text-[#0F3D24]">
                      <DollarSign size={14} className="text-emerald-600" />
                      <span>Est. Order Value: {formatNaira(lead.estimatedValue)}</span>
                    </div>
                  )}
                  {lead.notes && (
                    <div className="mt-2 rounded-xl bg-[#F7F5F0] p-2.5 text-[11px] text-[#0F3D24]/70 italic">
                      "{lead.notes}"
                    </div>
                  )}

                  {/* Communication History Summary Badge */}
                  <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-stone-100 p-2 text-[11px] text-[#0F3D24]/80">
                    <span className="font-semibold flex items-center gap-1">
                      <MessageSquare size={12} className="text-[#3F8F3F]" />
                      <span>{lead.totalMessagesCount || 0} messages logged</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setHistoryTargetLead(lead)}
                      className="font-bold text-[#3F8F3F] hover:underline flex items-center gap-0.5"
                    >
                      History Timeline <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#0F3D24]/10 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setCommTargetLead(lead);
                    setCommForm({
                      activityType: "WhatsApp Message",
                      templateKey: "december_preorder",
                      messageSummary: "December Pre-Order Sales Promo",
                      content: `Hi ${lead.fullName.split(" ")[0]}, December pre-orders for live broilers & dressed chicken at Dignity Agro Farms are officially open! Reserve your batch early to lock in farm prices. Visit dignityagrofarms.com/december-preorder`,
                    });
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 transition shadow-xs"
                >
                  <MessageSquare size={13} /> Send & Log Message
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEdit(lead)}
                    className="p-1.5 text-[#0F3D24]/70 hover:text-[#0F3D24] transition"
                    title="Edit Lead"
                  >
                    <Pencil size={15} />
                  </button>
                  {role === "owner" && (
                    <button
                      onClick={() => {
                        if (confirm(`Delete lead record for ${lead.fullName}?`))
                          deleteLeadMut.mutate(lead.id);
                      }}
                      className="p-1.5 text-rose-600 hover:text-rose-800 transition"
                      title="Delete Lead"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View Table */
        <div className="overflow-x-auto rounded-3xl bg-white shadow-sm ring-1 ring-[#0F3D24]/5">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F5F0] text-[#0F3D24] font-bold uppercase tracking-wider text-[11px] border-b border-[#0F3D24]/10">
              <tr>
                <th className="p-4">Customer Name & Phone</th>
                <th className="p-4">Status</th>
                <th className="p-4">Source</th>
                <th className="p-4">Interested In</th>
                {role === "owner" && <th className="p-4">Est. Value</th>}
                <th className="p-4">Notes / Location</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-[#F7F5F0]/50 transition">
                  <td className="p-4">
                    <div className="font-bold text-sm text-[#0F3D24]">{lead.fullName}</div>
                    <div className="text-xs font-mono text-[#0F3D24]/70">{lead.phone}</div>
                    {lead.email && <div className="text-[11px] text-gray-500">{lead.email}</div>}
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ${getStatusBadge(lead.status)}`}
                    >
                      {lead.status}
                    </span>
                  </td>
                  <td className="p-4 font-medium text-gray-700">
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={13} className="text-amber-500" />
                      {lead.leadSource}
                    </div>
                  </td>
                  <td className="p-4 text-gray-800 font-medium">
                    {lead.interestedIn || (
                      <span className="text-gray-400 italic">General Inquiry</span>
                    )}
                  </td>
                  {role === "owner" && (
                    <td className="p-4 font-bold text-[#0F3D24]">
                      {lead.estimatedValue > 0 ? formatNaira(lead.estimatedValue) : "—"}
                    </td>
                  )}
                  <td className="p-4 text-gray-600 max-w-xs truncate">
                    {lead.location && (
                      <div className="font-medium text-gray-800">📍 {lead.location}</div>
                    )}
                    {lead.notes && (
                      <div className="text-[11px] italic text-gray-500">"{lead.notes}"</div>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setReminderTarget({ name: lead.fullName, phone: lead.phone })
                        }
                        className="rounded-full bg-emerald-50 p-2 text-emerald-800 hover:bg-emerald-100 transition"
                        title="Send SMS / Reminder"
                      >
                        <MessageSquare size={14} />
                      </button>
                      <button
                        onClick={() => openEdit(lead)}
                        className="p-2 text-[#0F3D24]/70 hover:text-[#0F3D24] transition"
                        title="Edit Lead"
                      >
                        <Pencil size={14} />
                      </button>
                      {role === "owner" && (
                        <button
                          onClick={() => {
                            if (confirm(`Delete lead record for ${lead.fullName}?`))
                              deleteLeadMut.mutate(lead.id);
                          }}
                          className="p-2 text-rose-600 hover:text-rose-800 transition"
                          title="Delete Lead"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Lead Modal */}
      {showLeadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-[#0F3D24]">
                {editingLead ? "Edit Customer Lead" : "Record New Customer Lead"}
              </h3>
              <button
                onClick={() => setShowLeadModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#0F3D24]">
                  Customer Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chief Emeka Nwachukwu"
                  value={leadForm.fullName}
                  onChange={(e) => setLeadForm({ ...leadForm, fullName: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-[#0F3D24]">Phone Number *</label>
                  <input
                    type="text"
                    placeholder="e.g. 08123456789"
                    value={leadForm.phone}
                    onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0F3D24]">Lead Source</label>
                  <select
                    value={leadForm.leadSource}
                    onChange={(e) => setLeadForm({ ...leadForm, leadSource: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                  >
                    <option value="WhatsApp">WhatsApp Inbound</option>
                    <option value="Facebook Ads">Facebook Ads</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Referral">Referral</option>
                    <option value="Phone Call">Phone Call Inbound</option>
                    <option value="Walk-in">Walk-in Visitor</option>
                    <option value="Website Form">Website Form</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-[#0F3D24]">
                    Interested Product
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 20 Live Broilers, Fresh Eggs"
                    value={leadForm.interestedIn}
                    onChange={(e) => setLeadForm({ ...leadForm, interestedIn: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0F3D24]">Status</label>
                  <select
                    value={leadForm.status}
                    onChange={(e) => setLeadForm({ ...leadForm, status: e.target.value as any })}
                    className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                  >
                    <option value="New Lead">New Lead</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Interested / Negotiating">Interested / Negotiating</option>
                    <option value="Converted to Customer">Converted to Customer</option>
                    <option value="Lost / Inactive">Lost / Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className={role === "owner" ? "" : "sm:col-span-2"}>
                  <label className="block text-xs font-bold text-[#0F3D24]">
                    Location / Address
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ikenegbu, Owerri"
                    value={leadForm.location}
                    onChange={(e) => setLeadForm({ ...leadForm, location: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                  />
                </div>
                {role === "owner" && (
                  <div>
                    <label className="block text-xs font-bold text-[#0F3D24]">
                      Estimated Value (₦)
                    </label>
                    <NumberField
                      allowDecimal
                      min={0}
                      placeholder="e.g. 150000"
                      value={leadForm.estimatedValue}
                      onValueChange={(_, raw) => setLeadForm({ ...leadForm, estimatedValue: raw })}
                      className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F3D24]">
                  Customer Notes & Inquiries
                </label>
                <textarea
                  placeholder="e.g. Customer asked for bulk pricing for December wedding..."
                  value={leadForm.notes}
                  onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })}
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2 text-sm outline-none focus:border-[#3F8F3F]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowLeadModal(false)}
                className="rounded-full bg-gray-100 px-5 py-2 text-xs font-semibold text-gray-600"
              >
                Cancel
              </button>
              <button
                disabled={
                  !leadForm.fullName.trim() || !leadForm.phone.trim() || saveLeadMut.isPending
                }
                onClick={() => saveLeadMut.mutate()}
                className="rounded-full bg-[#0F3D24] px-6 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {saveLeadMut.isPending ? "Saving..." : "Save Lead Record"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import CSV/Excel Modal */}
      <LeadImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        passcode={passcode}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["crm-leads"] })}
      />

      {/* SMS / WhatsApp Reminder Modal */}
      {reminderTarget && (
        <ReminderModal
          isOpen={Boolean(reminderTarget)}
          onClose={() => setReminderTarget(null)}
          targetType="lead"
          recipientName={reminderTarget.name}
          recipientPhone={reminderTarget.phone}
        />
      )}

      {/* Send & Log Communication Modal */}
      {commTargetLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-[#0F3D24]">Send & Log Communication</h3>
                <p className="text-xs text-[#0F3D24]/70">
                  Recipient:{" "}
                  <span className="font-bold text-[#3F8F3F]">{commTargetLead.fullName}</span> (
                  {commTargetLead.phone})
                </p>
              </div>
              <button
                onClick={() => setCommTargetLead(null)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#0F3D24] mb-1">
                  Communication Channel / Type
                </label>
                <select
                  value={commForm.activityType}
                  onChange={(e) => setCommForm({ ...commForm, activityType: e.target.value })}
                  className="w-full rounded-xl border border-[#0F3D24]/15 px-3.5 py-2 text-sm outline-none focus:border-[#3F8F3F]"
                >
                  <option value="WhatsApp Message">WhatsApp Message</option>
                  <option value="Phone Call">Phone Call</option>
                  <option value="SMS / Text">SMS / Text Message</option>
                  <option value="Email">Email</option>
                  <option value="In-Person Visit">In-Person Farm Visit</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#0F3D24] mb-1">
                  Quick Message Template
                </label>
                <select
                  value={commForm.templateKey}
                  onChange={(e) => {
                    const key = e.target.value;
                    let summary = "";
                    let content = "";
                    if (key === "december_preorder") {
                      summary = "December Pre-Order Sales Promo";
                      content = `Hi ${commTargetLead.fullName.split(" ")[0]}, December pre-orders for live broilers & dressed chicken at Dignity Agro Farms are officially open! Reserve your batch early to lock in farm prices. Visit dignityagrofarms.com/december-preorder`;
                    } else if (key === "followup") {
                      summary = "General Sales Follow-up";
                      content = `Hi ${commTargetLead.fullName.split(" ")[0]}, checking in from Dignity Agro Farms regarding your poultry inquiry. We have fresh healthy stock available for dispatch. Let us know how we can serve you today!`;
                    } else if (key === "order_inquiry") {
                      summary = "Poultry Availability & Pricing";
                      content = `Hi ${commTargetLead.fullName.split(" ")[0]}, thanks for reaching out to Dignity Agro Farms! Our live broilers (3kg+) and jumbo eggs are ready. Contact us directly on 08167099492 or order online at dignityagrofarms.com`;
                    }
                    setCommForm({
                      ...commForm,
                      templateKey: key,
                      messageSummary: summary || commForm.messageSummary,
                      content: content || commForm.content,
                    });
                  }}
                  className="w-full rounded-xl border border-[#0F3D24]/15 px-3.5 py-2 text-sm outline-none focus:border-[#3F8F3F]"
                >
                  <option value="december_preorder">December Pre-Order Sales Promo</option>
                  <option value="followup">General Sales Follow-up</option>
                  <option value="order_inquiry">Poultry Availability & Pricing</option>
                  <option value="custom">Custom Message</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#0F3D24] mb-1">Subject / Summary</label>
                <input
                  type="text"
                  value={commForm.messageSummary}
                  onChange={(e) => setCommForm({ ...commForm, messageSummary: e.target.value })}
                  placeholder="e.g. December Pre-Order Promo"
                  className="w-full rounded-xl border border-[#0F3D24]/15 px-3.5 py-2 text-sm outline-none focus:border-[#3F8F3F]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#0F3D24] mb-1">
                  Message Content / Notes
                </label>
                <textarea
                  rows={4}
                  value={commForm.content}
                  onChange={(e) => setCommForm({ ...commForm, content: e.target.value })}
                  placeholder="Type the message or call summary..."
                  className="w-full rounded-xl border border-[#0F3D24]/15 px-3.5 py-2 text-sm outline-none focus:border-[#3F8F3F]"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setCommTargetLead(null)}
                className="rounded-full bg-stone-100 px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={logCommMut.isPending}
                onClick={() => logCommMut.mutate(false)}
                className="rounded-full bg-stone-800 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-900 disabled:opacity-50"
              >
                {logCommMut.isPending ? "Logging..." : "Log Record Only"}
              </button>
              {(() => {
                const contentText = commForm.content || commForm.messageSummary;
                const text = encodeURIComponent(contentText);
                const digits = commTargetLead.phone.replace(/\D+/g, "");
                const formattedDigits = digits.startsWith("0") ? "234" + digits.slice(1) : digits;

                let CtaIcon = MessageSquare;
                let ctaText = "Send on WhatsApp & Log";
                let actionUrl = `https://wa.me/${formattedDigits}?text=${text}`;
                let target = "_blank";

                if (commForm.activityType === "Phone Call") {
                  CtaIcon = Phone;
                  ctaText = "Call & Log Record";
                  actionUrl = `tel:${commTargetLead.phone}`;
                  target = "_self";
                } else if (commForm.activityType === "SMS / Text") {
                  CtaIcon = MessageSquare;
                  ctaText = "Send SMS & Log Record";
                  actionUrl = `sms:${commTargetLead.phone}?body=${text}`;
                  target = "_self";
                } else if (commForm.activityType === "Email") {
                  CtaIcon = Mail;
                  ctaText = "Send Email & Log Record";
                  actionUrl = `mailto:${commTargetLead.email || ""}?subject=${encodeURIComponent(commForm.messageSummary)}&body=${text}`;
                  target = "_blank";
                } else if (commForm.activityType === "In-Person Visit") {
                  CtaIcon = MapPin;
                  ctaText = "Log Visit Record";
                  actionUrl = "";
                }

                return (
                  <button
                    type="button"
                    disabled={logCommMut.isPending}
                    onClick={() => {
                      if (actionUrl) {
                        window.open(actionUrl, target);
                      }
                      logCommMut.mutate(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#3F8F3F] px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-[#0F3D24] disabled:opacity-50 transition"
                  >
                    <CtaIcon size={14} /> {logCommMut.isPending ? "Processing..." : ctaText}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* History Timeline Modal */}
      {historyTargetLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-[#0F3D24]">Communication History Timeline</h3>
                <p className="text-xs text-[#0F3D24]/70">
                  Lead:{" "}
                  <span className="font-bold text-[#3F8F3F]">{historyTargetLead.fullName}</span> (
                  {historyTargetLead.phone})
                </p>
              </div>
              <button
                onClick={() => setHistoryTargetLead(null)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {!historyTargetLead.communications ||
              historyTargetLead.communications.length === 0 ? (
                <div className="rounded-2xl bg-stone-50 p-8 text-center text-xs text-stone-500">
                  <MessageSquare size={32} className="mx-auto mb-2 text-stone-300" />
                  <p className="font-semibold text-stone-700">No message activity logged yet</p>
                  <p className="mt-1">
                    Use "Send & Log Message" to send WhatsApp promos or record follow-ups.
                  </p>
                </div>
              ) : (
                historyTargetLead.communications.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4 space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#0F3D24] inline-flex items-center gap-1">
                        <MessageSquare size={13} className="text-[#3F8F3F]" />
                        {c.activityType}
                      </span>
                      <span className="text-[11px] text-stone-400 font-medium">
                        {new Date(c.createdAt).toLocaleDateString()}{" "}
                        {new Date(c.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-stone-800">{c.messageSummary}</p>
                    {c.content && (
                      <p className="text-xs text-stone-600 bg-white p-2.5 rounded-xl border border-stone-100 leading-relaxed mt-1">
                        {c.content}
                      </p>
                    )}
                    <div className="text-[10px] text-stone-400 pt-1">
                      Logged by: <span className="font-semibold">{c.sentBy || "Admin"}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t shrink-0">
              <button
                onClick={() => setHistoryTargetLead(null)}
                className="rounded-full bg-stone-800 px-5 py-2 text-xs font-semibold text-white hover:bg-stone-900"
              >
                Close Timeline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 3. FARM DAILY ACTIVITIES & MORTALITY LOG PANEL ─────────────────────────

export function DailyActivitiesPanel({
  passcode,
  role = "owner",
  username,
  pendingApprovalsCount = 0,
  onNavigateToApprovals,
}: {
  passcode: string;
  role?: AdminRole;
  username?: string;
  pendingApprovalsCount?: number;
  onNavigateToApprovals?: () => void;
}) {
  const queryClient = useQueryClient();
  const [selectedBatchId, setSelectedBatchId] = useState<string>("all");
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showDailyLogModal, setShowDailyLogModal] = useState(false);
  const [showActivityImportModal, setShowActivityImportModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<FarmActivity | null>(null);
  const [editingDailyLog, setEditingDailyLog] = useState<{
    batchId: string | null;
    date: string;
  } | null>(null);
  const [pendingActTypoConfirm, setPendingActTypoConfirm] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [feedback, setFeedback] = useState<string | null>(null);

  const listBatchesFn = useServerFn(adminListBatches);
  const listActivitiesFn = useServerFn(adminListActivities);
  const createActivityFn = useServerFn(adminCreateActivity);
  const deleteActivityFn = useServerFn(adminDeleteActivity);

  const batchesQuery = useQuery({
    queryKey: ["farm-batches", passcode],
    queryFn: () => listBatchesFn({ data: { passcode } }),
    enabled: Boolean(passcode),
    placeholderData: (previousData) => previousData,
  });

  const activitiesQuery = useQuery({
    queryKey: ["farm-activities", passcode, selectedBatchId, role],
    queryFn: () =>
      listActivitiesFn({
        data: {
          passcode,
          batchId: selectedBatchId === "all" ? null : selectedBatchId,
          includeOwnPending: role !== "owner",
        },
      }),
    enabled: Boolean(passcode),
    placeholderData: (previousData) => previousData,
  });

  const [actForm, setActForm] = useState({
    batchId: "",
    activityDate: new Date().toISOString().split("T")[0],
    activityType: "Feeding" as FarmActivity["activityType"],
    mortalityCount: 0,
    causeOfMortality: "",
    feedConsumedKg: 0,
    eggsCollected: 0,
    medicationGiven: "",
    notes: "",
  });

  const createActivityMut = useMutation({
    mutationFn: () =>
      createActivityFn({
        data: {
          passcode,
          batchId: actForm.batchId || null,
          activityDate: actForm.activityDate,
          activityType: actForm.activityType,
          mortalityCount: Number(actForm.mortalityCount),
          causeOfMortality: actForm.causeOfMortality || null,
          feedConsumedKg: Number(actForm.feedConsumedKg),
          eggsCollected: Number(actForm.eggsCollected),
          medicationGiven: actForm.medicationGiven || null,
          notes: actForm.notes || null,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farm-activities"] });
      queryClient.invalidateQueries({ queryKey: ["farm-batches"] });
      queryClient.invalidateQueries({ queryKey: ["batch-report"] });
      queryClient.invalidateQueries({ queryKey: ["daily-logs"] });
      queryClient.invalidateQueries({ queryKey: ["my-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["pending-approvals-count"] });
      setPendingActTypoConfirm(false);
      setShowActivityModal(false);
      setActForm({
        batchId: "",
        activityDate: new Date().toISOString().split("T")[0],
        activityType: "Feeding",
        mortalityCount: 0,
        causeOfMortality: "",
        feedConsumedKg: 0,
        eggsCollected: 0,
        medicationGiven: "",
        notes: "",
      });
      setFeedback(
        role === "owner"
          ? "Daily farm activity logged successfully."
          : "Activity submitted for Owner approval — shown below with Pending Approval status.",
      );
    },
    onError: (e: Error) => {
      setPendingActTypoConfirm(false);
      setFeedback("Error: " + e.message);
    },
  });

  const deleteActMut = useMutation({
    mutationFn: (id: string) => deleteActivityFn({ data: { passcode, id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farm-activities"] });
      setFeedback("Activity record removed.");
    },
    onError: (e: Error) => setFeedback("Delete error: " + e.message),
  });

  const batches = batchesQuery.data || [];
  const activeActBatches = useMemo(() => batches.filter((b) => b.status === "active"), [batches]);
  const activities = activitiesQuery.data || [];

  const filteredActivities = activities.filter((a) => {
    if (typeFilter !== "all" && a.activityType !== typeFilter) return false;
    return true;
  });

  // Calculate cumulative stats from APPROVED activities only (never count pending/rejected items)
  const approvedActivities = activities.filter(
    (a) => !a.approvalStatus || a.approvalStatus === "approved",
  );
  const totalMortality = approvedActivities.reduce((sum, a) => sum + a.mortalityCount, 0);
  const totalFeedKg = approvedActivities.reduce((sum, a) => sum + a.feedConsumedKg, 0);
  const totalEggs = approvedActivities.reduce((sum, a) => sum + a.eggsCollected, 0);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/5">
        <div>
          <div className="flex items-center gap-2 text-[#0F3D24]">
            <Activity className="text-[#3F8F3F]" size={24} />
            <h2 className="text-xl font-bold">Daily Farm Activities & Mortality Logging</h2>
          </div>
          <p className="mt-1 text-sm text-[#0F3D24]/70">
            Log one Daily Report per batch each day (sick, dead, feed, water, temperature,
            medication), or a quick single entry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowActivityImportModal(true)}
            className="flex items-center gap-2 rounded-full border border-[#0F3D24]/20 bg-white px-4 py-2.5 text-xs font-semibold text-[#0F3D24] shadow-sm hover:bg-[#0F3D24]/5 transition"
            title="Import daily activities from CSV / Excel sheet"
          >
            <FileSpreadsheet size={16} className="text-[#0F3D24]" />
            Import Activities (CSV/Excel)
          </button>
          <button
            onClick={() => {
              const preferred =
                selectedBatchId !== "all" && activeActBatches.some((b) => b.id === selectedBatchId)
                  ? selectedBatchId
                  : activeActBatches[0]?.id || "";
              setActForm((prev) => ({ ...prev, batchId: preferred }));
              setShowActivityModal(true);
            }}
            className="flex items-center gap-2 rounded-full border border-[#0F3D24]/20 bg-white px-4 py-2.5 text-xs font-semibold text-[#0F3D24] shadow-sm hover:bg-[#0F3D24]/5 transition"
            title="Log a single activity such as weight check, pen maintenance or egg collection"
          >
            <PlusCircle size={16} />
            Quick Single Entry
          </button>
          <button
            onClick={() => setShowDailyLogModal(true)}
            className="flex items-center gap-2 rounded-full bg-[#0F3D24] px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#134a2c] transition"
          >
            <PlusCircle size={16} />
            Log Daily Report
          </button>
        </div>
      </div>

      {feedback && (
        <div className="flex items-center justify-between rounded-2xl bg-[#3F8F3F]/10 px-5 py-3 text-sm text-[#0F3D24]">
          <span>{feedback}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-[#0F3D24]/60 hover:text-[#0F3D24]"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {role === "owner" && pendingApprovalsCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-3 text-xs font-semibold text-amber-950 shadow-xs">
          <div className="flex items-center gap-2.5">
            <ShieldAlert size={17} className="text-amber-600 shrink-0" />
            <span>
              <strong>{pendingApprovalsCount}</strong> staff/manager log(s) are pending approval and
              excluded from live mortality/feed totals until approved.
            </span>
          </div>
          {onNavigateToApprovals && (
            <button
              type="button"
              onClick={onNavigateToApprovals}
              className="rounded-full bg-[#0F3D24] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#165232] transition cursor-pointer"
            >
              Review Approvals →
            </button>
          )}
        </div>
      )}

      {/* KPI Overview */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#0F3D24]/5 border-l-4 border-rose-500">
          <span className="text-xs font-semibold text-[#0F3D24]/70">Total Mortality Logged</span>
          <p className="mt-2 text-2xl font-bold text-rose-600">{totalMortality} Birds</p>
          <span className="mt-1 block text-xs text-[#0F3D24]/50">
            Auto-deducted from batch headcount
          </span>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#0F3D24]/5 border-l-4 border-amber-500">
          <span className="text-xs font-semibold text-[#0F3D24]/70">Total Feed Consumed</span>
          <p className="mt-2 text-2xl font-bold text-amber-600">
            {totalFeedKg.toLocaleString()} kg
          </p>
          <span className="mt-1 block text-xs text-[#0F3D24]/50">
            ~{Math.round(totalFeedKg / 50)} bags of 50kg feed
          </span>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#0F3D24]/5 border-l-4 border-emerald-500">
          <span className="text-xs font-semibold text-[#0F3D24]/70">Total Eggs Collected</span>
          <p className="mt-2 text-2xl font-bold text-emerald-700">
            {totalEggs.toLocaleString()} Eggs
          </p>
          <span className="mt-1 block text-xs text-[#0F3D24]/50">
            ~{Math.round(totalEggs / 30)} crates of 30 eggs
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#F7F5F0] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Filter size={16} className="text-[#0F3D24]/70" />
          <span className="text-xs font-bold uppercase tracking-wider text-[#0F3D24]/70">
            Filter Batch:
          </span>
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="rounded-xl border border-[#0F3D24]/15 bg-white px-3 py-1.5 text-xs font-semibold text-[#0F3D24] outline-none"
          >
            <option value="all">All Batches</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.batchName} ({b.batchType}){b.status !== "active" ? " (Closed)" : ""}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-xl border border-[#0F3D24]/15 bg-white px-3 py-1.5 text-xs font-semibold text-[#0F3D24] outline-none"
          >
            <option value="all">All Activity Types</option>
            <option value="Daily Log">Daily Report</option>
            <option value="Mortality Record">Mortality Record</option>
            <option value="Feeding">Feeding</option>
            <option value="Medication / Vaccination">Medication / Vaccination</option>
            <option value="Egg Collection">Egg Collection</option>
            <option value="Cleaning & Sanitation">Cleaning & Sanitation</option>
            <option value="Weight Check">Weight Check</option>
            <option value="Pen Maintenance">Pen Maintenance</option>
          </select>
        </div>
      </div>

      {/* Activity Timeline List */}
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/5">
        <h3 className="text-lg font-bold text-[#0F3D24] pb-4">Activity Log Timeline</h3>

        {activitiesQuery.isLoading ? (
          <div className="py-8 text-center text-sm text-[#0F3D24]/60">Loading activity logs...</div>
        ) : filteredActivities.length === 0 ? (
          <div className="py-8 text-center text-sm text-[#0F3D24]/60">
            No farm activities recorded yet.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredActivities.map((act) => (
              <div
                key={act.id}
                className="flex items-start justify-between gap-4 rounded-2xl border border-[#0F3D24]/10 p-4 hover:bg-[#F7F5F0]/50 transition"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`rounded-xl p-2.5 ${
                      act.activityType === "Mortality Record"
                        ? "bg-rose-100 text-rose-700"
                        : act.activityType === "Feeding"
                          ? "bg-amber-100 text-amber-800"
                          : act.activityType === "Medication / Vaccination"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    <Activity size={20} />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-[#0F3D24]">{act.activityType}</span>
                      {act.batchName && (
                        <span className="rounded-md bg-[#0F3D24]/10 px-2 py-0.5 text-[10px] font-bold text-[#0F3D24]">
                          {act.batchName}
                        </span>
                      )}
                      {(act.approvalStatus === "pending_approval" ||
                        (act.approvalStatus as any) === "pending") && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-900">
                          <Clock size={10} /> Pending Owner Approval
                        </span>
                      )}
                      {act.approvalStatus === "flagged" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-[10px] font-bold text-orange-800">
                          <Flag size={10} /> Flagged · Edit Needed
                        </span>
                      )}
                      {act.approvalStatus === "rejected" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-800">
                          <XCircle size={10} /> Rejected
                        </span>
                      )}
                      <span className="text-xs text-[#0F3D24]/60">• {act.activityDate}</span>
                    </div>
                    {act.approvalStatus === "flagged" && act.rejectionReason && (
                      <div className="mt-1 inline-flex items-center gap-1 rounded-lg bg-orange-100 px-2 py-0.5 text-[11px] font-bold text-orange-900">
                        <Flag size={11} /> Owner Flag Note: {act.rejectionReason}
                      </div>
                    )}
                    {act.approvalStatus === "rejected" && act.rejectionReason && (
                      <div className="mt-1 inline-block rounded-lg bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                        Reason: {act.rejectionReason}
                      </div>
                    )}

                    <div className="mt-2 space-y-1 text-xs text-[#0F3D24]/80">
                      {act.activityType === "Daily Log" && (
                        <div className="flex flex-wrap gap-1.5 pb-1">
                          <span className="rounded-full bg-orange-100 px-2 py-0.5 font-semibold text-orange-800">
                            Sick: {act.sickCount ? act.sickCount : "Nil"}
                          </span>
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 font-semibold text-rose-800">
                            Dead: {act.mortalityCount ? act.mortalityCount : "Nil"}
                          </span>
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">
                            Feed: {act.feedGiven === false ? "Not given" : act.feedBrand || "Given"}
                            {act.feedBagNo && act.feedBagStatus
                              ? ` · Bag #${act.feedBagNo} (${act.feedBagStatus === "finished" ? "Finished" : "Opened"})`
                              : ""}
                            {act.feedConsumedKg > 0 ? ` · ${act.feedConsumedKg} kg` : ""}
                          </span>
                          <span className="rounded-full bg-sky-100 px-2 py-0.5 font-semibold text-sky-800">
                            Water: {act.waterGiven ? "✓" : "—"}
                          </span>
                          {act.temperature && (
                            <span className="rounded-full bg-cyan-100 px-2 py-0.5 font-semibold text-cyan-800">
                              Temp: {act.temperature}
                            </span>
                          )}
                        </div>
                      )}
                      {act.activityType !== "Daily Log" && act.mortalityCount > 0 && (
                        <p className="font-bold text-rose-700">
                          ⚠️ Mortality: {act.mortalityCount} bird(s) lost
                          {act.causeOfMortality ? ` (${act.causeOfMortality})` : ""}
                        </p>
                      )}
                      {act.activityType === "Daily Log" &&
                        act.mortalityCount > 0 &&
                        act.causeOfMortality && (
                          <p className="font-bold text-rose-700">Cause: {act.causeOfMortality}</p>
                        )}
                      {act.activityType !== "Daily Log" && act.feedConsumedKg > 0 && (
                        <p>🌾 Feed Consumed: {act.feedConsumedKg} kg</p>
                      )}
                      {act.eggsCollected > 0 && (
                        <p>🥚 Eggs Collected: {act.eggsCollected} pieces</p>
                      )}
                      {act.medicationGiven && <p>💉 Medication: {act.medicationGiven}</p>}
                      {act.notes && <p className="italic text-[#0F3D24]/70">"{act.notes}"</p>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {role !== "owner" && act.approvalStatus !== "approved" && (
                    <button
                      type="button"
                      onClick={() => {
                        if (act.activityType === "Daily Log") {
                          setEditingDailyLog({
                            batchId: act.batchId ?? null,
                            date: act.activityDate,
                          });
                        } else {
                          setEditingActivity(act);
                        }
                      }}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold transition ${
                        act.approvalStatus === "flagged" || act.approvalStatus === "rejected"
                          ? "bg-orange-600 text-white hover:bg-orange-700"
                          : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                      }`}
                    >
                      <Pencil size={11} /> Edit &amp; Resubmit
                    </button>
                  )}
                  {role === "owner" && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          if (act.activityType === "Daily Log") {
                            setEditingDailyLog({
                              batchId: act.batchId ?? null,
                              date: act.activityDate,
                            });
                          } else {
                            setEditingActivity(act);
                          }
                        }}
                        className="p-1 text-[#3F8F3F] hover:text-[#0F3D24] transition"
                        title="Edit activity"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Delete this activity log?")) deleteActMut.mutate(act.id);
                        }}
                        className="p-1 text-rose-600 hover:text-rose-800 transition"
                        title="Delete record"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity Log Modal */}
      {showActivityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-[#0F3D24]">Log Farm Activity</h3>
              <button
                onClick={() => setShowActivityModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-[#0F3D24]">
                    Select Active Batch *
                  </label>
                  <select
                    value={actForm.batchId}
                    onChange={(e) => setActForm({ ...actForm, batchId: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                  >
                    <option value="">Select active batch...</option>
                    {activeActBatches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.batchName} ({b.batchType})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0F3D24]">Date</label>
                  <input
                    type="date"
                    value={actForm.activityDate}
                    onChange={(e) => setActForm({ ...actForm, activityDate: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F3D24]">Activity Type *</label>
                <select
                  value={actForm.activityType}
                  onChange={(e) => setActForm({ ...actForm, activityType: e.target.value as any })}
                  className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                >
                  <option value="Mortality Record">Mortality Record (Deducts Headcount)</option>
                  <option value="Feeding">Feeding Log</option>
                  <option value="Medication / Vaccination">Medication / Vaccination</option>
                  <option value="Egg Collection">Egg Collection</option>
                  <option value="Cleaning & Sanitation">Cleaning & Sanitation</option>
                  <option value="Weight Check">Weight Check</option>
                  <option value="Pen Maintenance">Pen Maintenance</option>
                  <option value="General Activity">General Farm Activity</option>
                </select>
              </div>

              {actForm.activityType === "Mortality Record" && (
                <div className="rounded-2xl bg-rose-50 p-4 space-y-3 border border-rose-200">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-rose-900">
                        Mortality Count *
                      </label>
                      <NumberField
                        min={1}
                        placeholder="e.g. 2"
                        value={actForm.mortalityCount || ""}
                        onValueChange={(n) => setActForm({ ...actForm, mortalityCount: n ?? 0 })}
                        className="mt-1 w-full rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-rose-900">
                        Cause of Mortality
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Heat stress, Culling"
                        value={actForm.causeOfMortality}
                        onChange={(e) =>
                          setActForm({ ...actForm, causeOfMortality: e.target.value })
                        }
                        className="mt-1 w-full rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {actForm.activityType === "Feeding" && (
                <div>
                  <label className="block text-xs font-bold text-[#0F3D24]">
                    Feed Consumed (kg)
                  </label>
                  <NumberField
                    allowDecimal
                    min={0}
                    placeholder="e.g. 100"
                    value={actForm.feedConsumedKg || ""}
                    onValueChange={(n) => setActForm({ ...actForm, feedConsumedKg: n ?? 0 })}
                    className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                  />
                </div>
              )}

              {actForm.activityType === "Egg Collection" && (
                <div>
                  <label className="block text-xs font-bold text-[#0F3D24]">
                    Eggs Collected (Pieces)
                  </label>
                  <NumberField
                    min={0}
                    placeholder="e.g. 300"
                    value={actForm.eggsCollected || ""}
                    onValueChange={(n) => setActForm({ ...actForm, eggsCollected: n ?? 0 })}
                    className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                  />
                </div>
              )}

              {actForm.activityType === "Medication / Vaccination" && (
                <div>
                  <label className="block text-xs font-bold text-[#0F3D24]">
                    Medication / Vaccine Given
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Gumboro Vaccine via drinking water"
                    value={actForm.medicationGiven}
                    onChange={(e) => setActForm({ ...actForm, medicationGiven: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#0F3D24]">Notes & Remarks</label>
                <textarea
                  placeholder="General observations, pen condition..."
                  value={actForm.notes}
                  onChange={(e) => setActForm({ ...actForm, notes: e.target.value })}
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2 text-sm outline-none focus:border-[#3F8F3F]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowActivityModal(false)}
                className="rounded-full bg-gray-100 px-5 py-2 text-xs font-semibold text-gray-600"
              >
                Cancel
              </button>
              <button
                disabled={!actForm.batchId || createActivityMut.isPending}
                onClick={() => {
                  if (role === "owner") {
                    createActivityMut.mutate();
                  } else {
                    setPendingActTypoConfirm(true);
                  }
                }}
                className="rounded-full bg-[#0F3D24] px-6 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {createActivityMut.isPending ? "Logging..." : "Log Activity"}
              </button>
            </div>
          </div>
        </div>
      )}

      <TypoReviewModal
        open={pendingActTypoConfirm}
        title="Check Farm Activity Entry for Typos"
        subtitle="Please confirm the numbers and details below before sending to the Farm Owner."
        isSubmitting={createActivityMut.isPending}
        confirmLabel="Confirm & Submit for Approval"
        onBack={() => setPendingActTypoConfirm(false)}
        onConfirm={() => createActivityMut.mutate()}
        fields={[
          { label: "Activity Type", value: actForm.activityType },
          {
            label: "Batch",
            value: batches.find((b) => b.id === actForm.batchId)?.batchName || "Unassigned",
          },
          { label: "Date", value: actForm.activityDate },
          ...(Number(actForm.mortalityCount) > 0
            ? [
                {
                  label: "Mortality Count",
                  value: `${actForm.mortalityCount} bird(s)`,
                  highlight: true,
                },
              ]
            : []),
          ...(actForm.causeOfMortality.trim()
            ? [{ label: "Cause of Mortality", value: actForm.causeOfMortality }]
            : []),
          ...(Number(actForm.feedConsumedKg) > 0
            ? [{ label: "Feed Consumed", value: `${actForm.feedConsumedKg} kg` }]
            : []),
          ...(Number(actForm.eggsCollected) > 0
            ? [{ label: "Eggs Collected", value: `${actForm.eggsCollected}` }]
            : []),
          ...(actForm.medicationGiven.trim()
            ? [{ label: "Medication", value: actForm.medicationGiven }]
            : []),
          ...(actForm.notes.trim() ? [{ label: "Notes", value: actForm.notes }] : []),
        ]}
      />

      {editingActivity && (
        <ActivityEditModal
          passcode={passcode}
          role={role}
          activity={editingActivity}
          batches={batches}
          onClose={() => setEditingActivity(null)}
          onSaved={(msg) => setFeedback(msg)}
        />
      )}

      {(showDailyLogModal || editingDailyLog) && (
        <DailyLogModal
          passcode={passcode}
          role={role}
          username={username}
          batches={batches}
          defaultBatchId={
            editingDailyLog
              ? editingDailyLog.batchId
              : selectedBatchId === "all"
                ? null
                : selectedBatchId
          }
          initialDate={editingDailyLog?.date || null}
          onClose={() => {
            setShowDailyLogModal(false);
            setEditingDailyLog(null);
          }}
          onSaved={(message) => {
            setShowDailyLogModal(false);
            setEditingDailyLog(null);
            setFeedback(message);
          }}
        />
      )}

      {showActivityImportModal && (
        <ActivityImportModal
          isOpen={showActivityImportModal}
          onClose={() => setShowActivityImportModal(false)}
          passcode={passcode}
          batches={batches}
          defaultBatchId={selectedBatchId === "all" ? null : selectedBatchId}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["farm-activities"] });
            queryClient.invalidateQueries({ queryKey: ["farm-batches"] });
            queryClient.invalidateQueries({ queryKey: ["batch-report"] });
            queryClient.invalidateQueries({ queryKey: ["daily-logs"] });
            queryClient.invalidateQueries({ queryKey: ["my-submissions"] });
            queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
            queryClient.invalidateQueries({ queryKey: ["pending-approvals-count"] });
          }}
        />
      )}
    </div>
  );
}
