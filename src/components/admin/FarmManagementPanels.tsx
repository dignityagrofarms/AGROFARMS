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
} from "lucide-react";
import { FinanceSalesChart } from "./FinanceSalesChart";
import { adminListOrders, type AdminOrder, type AdminRole } from "@/lib/orders.functions";
import {
  adminListBatches,
  adminCreateBatch,
  adminUpdateBatch,
  adminDeleteBatch,
  adminListFinancials,
  adminCreateFinancial,
  adminUpdateFinancial,
  adminDeleteFinancial,
  adminGetBatchReport,
  adminListLeads,
  adminCreateLead,
  adminUpdateLead,
  adminDeleteLead,
  adminListActivities,
  adminCreateActivity,
  adminDeleteActivity,
  type FarmBatch,
  type FarmFinancial,
  type CrmLead,
  type FarmActivity,
  type BatchReport,
} from "@/lib/farm.functions";

const formatNaira = (val: number) =>
  "₦" + val.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

// ─── 1. BATCHES & FINANCIALS PANEL ───────────────────────────────────────────

export function BatchFinancialsPanel({ passcode, role = "owner" }: { passcode: string; role?: AdminRole }) {
  const queryClient = useQueryClient();
  const [selectedBatchId, setSelectedBatchId] = useState<string>("all");
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showFinancialModal, setShowFinancialModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState<FarmBatch | null>(null);
  const [editingFinancial, setEditingFinancial] = useState<FarmFinancial | null>(null);
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const listOrdersFn = useServerFn(adminListOrders);
  const listBatchesFn = useServerFn(adminListBatches);
  const createBatchFn = useServerFn(adminCreateBatch);
  const updateBatchFn = useServerFn(adminUpdateBatch);
  const deleteBatchFn = useServerFn(adminDeleteBatch);
  const listFinancialsFn = useServerFn(adminListFinancials);
  const createFinancialFn = useServerFn(adminCreateFinancial);
  const updateFinancialFn = useServerFn(adminUpdateFinancial);
  const deleteFinancialFn = useServerFn(adminDeleteFinancial);
  const getBatchReportFn = useServerFn(adminGetBatchReport);

  // Queries
  const ordersQuery = useQuery({
    queryKey: ["admin-orders-financials", passcode],
    queryFn: () => listOrdersFn({ data: { passcode } }),
    enabled: Boolean(passcode),
    staleTime: 30000,
  });

  const batchesQuery = useQuery({
    queryKey: ["farm-batches", passcode],
    queryFn: () => listBatchesFn({ data: { passcode } }),
  });

  const financialsQuery = useQuery({
    queryKey: ["farm-financials", passcode, selectedBatchId],
    queryFn: () =>
      listFinancialsFn({
        data: {
          passcode,
          batchId: selectedBatchId === "all" ? null : selectedBatchId,
        },
      }),
  });

  const reportQuery = useQuery({
    queryKey: ["batch-report", passcode, selectedBatchId],
    queryFn: () =>
      selectedBatchId === "all"
        ? null
        : getBatchReportFn({ data: { passcode, batchId: selectedBatchId } }),
    enabled: selectedBatchId !== "all",
  });

  // Batch Form State
  const [batchForm, setBatchForm] = useState({
    batchName: "",
    batchType: "Broiler",
    initialHeadcount: 500,
    startDate: new Date().toISOString().split("T")[0],
    targetHarvestDate: "",
    notes: "",
  });

  // Financial Form State
  const [finForm, setFinForm] = useState({
    batchId: "",
    type: "expense" as "expense" | "income",
    category: "Feed",
    amount: "",
    description: "",
    paymentMethod: "Bank Transfer",
    transactionDate: new Date().toISOString().split("T")[0],
    referenceNo: "",
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

  const createFinancialMut = useMutation({
    mutationFn: () =>
      createFinancialFn({
        data: {
          passcode,
          batchId: finForm.batchId || null,
          type: finForm.type,
          category: finForm.category,
          amount: Number(finForm.amount),
          description: finForm.description,
          paymentMethod: finForm.paymentMethod,
          transactionDate: finForm.transactionDate,
          referenceNo: finForm.referenceNo || null,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farm-financials"] });
      queryClient.invalidateQueries({ queryKey: ["batch-report"] });
      setShowFinancialModal(false);
      setFinForm({
        batchId: "",
        type: "expense",
        category: "Feed",
        amount: "",
        description: "",
        paymentMethod: "Bank Transfer",
        transactionDate: new Date().toISOString().split("T")[0],
        referenceNo: "",
      });
      setFeedback("Transaction registered successfully.");
    },
    onError: (e: Error) => setFeedback("Error: " + e.message),
  });

  const updateFinancialMut = useMutation({
    mutationFn: (f: FarmFinancial) =>
      updateFinancialFn({
        data: {
          passcode,
          id: f.id,
          batchId: f.batchId || null,
          type: f.type,
          category: f.category,
          amount: Number(f.amount),
          description: f.description,
          paymentMethod: f.paymentMethod,
          transactionDate: f.transactionDate,
          referenceNo: f.referenceNo || null,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farm-financials"] });
      queryClient.invalidateQueries({ queryKey: ["batch-report"] });
      setEditingFinancial(null);
      setFeedback("Financial record updated successfully.");
    },
    onError: (e: Error) => setFeedback("Error updating financial record: " + e.message),
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

  const batches = batchesQuery.data || [];
  const rawFinancials = financialsQuery.data || [];
  const orders = ordersQuery.data?.orders || [];

  // Convert non-cancelled store orders to financial income records
  const storeOrderTransactions = useMemo(() => {
    // If a specific batch is selected, only show store orders if batch overview is selected or match
    if (selectedBatchId !== "all") return [];
    return orders
      .filter((o) => o.status !== "cancelled")
      .map((o) => ({
        id: `order_${o.id}`,
        batchId: null,
        batchName: "Store Sales",
        type: "income" as const,
        category: "Store Order",
        amount: o.total || 0,
        description: `Order #${o.orderCode} (${o.customerName})`,
        paymentMethod: o.paymentStatus === "approved" ? "Bank Transfer" : "Submitted/Pending",
        transactionDate: o.createdAt.split("T")[0],
        referenceNo: o.orderCode,
        createdAt: o.createdAt,
        isOrder: true,
      }));
  }, [orders, selectedBatchId]);

  // Combine store orders + manual farm financials
  const allFinancials = useMemo(() => {
    const combined = [...storeOrderTransactions, ...rawFinancials];
    return combined.sort(
      (a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
    );
  }, [storeOrderTransactions, rawFinancials]);

  // Metrics calculation
  const totalStoreIncome = useMemo(() => {
    if (selectedBatchId !== "all") return 0;
    return storeOrderTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [storeOrderTransactions, selectedBatchId]);

  const totalManualIncome = useMemo(() => {
    return rawFinancials
      .filter((f) => f.type === "income")
      .reduce((sum, f) => sum + f.amount, 0);
  }, [rawFinancials]);

  const totalIncome = totalStoreIncome + totalManualIncome;

  const totalExpense = useMemo(() => {
    return rawFinancials
      .filter((f) => f.type === "expense")
      .reduce((sum, f) => sum + f.amount, 0);
  }, [rawFinancials]);

  const netProfit = totalIncome - totalExpense;

  const filteredFinancials = allFinancials.filter((f) => {
    if (typeFilter !== "all" && f.type !== typeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        f.description.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q) ||
        (f.batchName && f.batchName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Export Batch Financial Report to CSV
  const handleExportCSV = () => {
    const batchName = selectedBatchId === "all" ? "All_Batches_Farm_Overview" : (reportQuery.data?.batch.batchName || "Batch_Report");
    const batchType = reportQuery.data?.batch.batchType || "Broiler & Layer";
    const headcount = reportQuery.data?.batch.currentHeadcount || batches.reduce((sum, b) => sum + b.currentHeadcount, 0);
    const mortality = reportQuery.data?.totalMortality || 0;
    const mortalityRate = reportQuery.data?.mortalityRatePercentage || 0;
    const roiVal = totalExpense > 0 ? ((netProfit / totalExpense) * 100).toFixed(1) : "0";

    const headers = ["Date", "Type", "Category", "Batch", "Description", "Payment Method", "Amount (NGN)"];
    const rows = filteredFinancials.map((t) => [
      t.transactionDate || "",
      t.type ? t.type.toUpperCase() : "",
      t.category || "",
      t.batchName || "",
      `"${(t.description || "").replace(/"/g, '""')}"`,
      t.paymentMethod || "",
      t.amount || 0,
    ]);

    const csvLines = [
      `"DIGNITY AGRO FARMS - FINANCIAL & BATCH REPORT"`,
      `"Report Date: ${new Date().toLocaleString()}"`,
      `"View / Batch: ${batchName}"`,
      `"Batch Type: ${batchType}"`,
      `"Live Headcount: ${headcount} birds"`,
      `"Mortality Rate: ${mortality} birds (${mortalityRate}%)"`,
      `"Total Revenue (Income): NGN ${totalIncome.toLocaleString()}"`,
      `"Total Expenses: NGN ${totalExpense.toLocaleString()}"`,
      `"Net Profit/Loss: NGN ${netProfit.toLocaleString()}"`,
      `"ROI: ${roiVal}%"`,
      "",
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ];

    const csvBlob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(csvBlob);
    link.setAttribute("download", `AgroFarms_Report_${batchName}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/5">
        <div>
          <div className="flex items-center gap-2 text-[#0F3D24]">
            <TrendingUp className="text-[#3F8F3F]" size={24} />
            <h2 className="text-xl font-bold">Batches & Financial Management</h2>
          </div>
          <p className="mt-1 text-sm text-[#0F3D24]/70">
            Register income, expenses, track production costs, and generate profit/loss reports per batch.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowBatchModal(true)}
            className="flex items-center gap-2 rounded-full border border-[#0F3D24]/20 bg-white px-4 py-2.5 text-xs font-semibold text-[#0F3D24] shadow-sm hover:bg-[#0F3D24]/5 transition"
          >
            <Layers size={16} className="text-[#3F8F3F]" />
            New Batch
          </button>
          <button
            onClick={() => setShowFinancialModal(true)}
            className="flex items-center gap-2 rounded-full bg-[#0F3D24] px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#134a2c] transition"
          >
            <PlusCircle size={16} />
            Register Income / Expense
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 rounded-full border border-[#3F8F3F] bg-[#3F8F3F]/10 px-4 py-2.5 text-xs font-semibold text-[#0F3D24] shadow-sm hover:bg-[#3F8F3F]/20 transition"
            title="Export full batch financial report as CSV"
          >
            <Download size={16} className="text-[#3F8F3F]" />
            Export Report
          </button>
        </div>
      </div>

      {feedback && (
        <div className="flex items-center justify-between rounded-2xl bg-[#3F8F3F]/10 px-5 py-3 text-sm text-[#0F3D24]">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-[#0F3D24]/60 hover:text-[#0F3D24]">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Batch Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#F7F5F0] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Filter size={18} className="text-[#0F3D24]/70" />
          <span className="text-xs font-bold uppercase tracking-wider text-[#0F3D24]/70">Select Batch:</span>
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="rounded-xl border border-[#0F3D24]/15 bg-white px-4 py-2 text-sm font-semibold text-[#0F3D24] outline-none focus:border-[#3F8F3F]"
          >
            <option value="all">All Batches (Farm Overview)</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.batchName} ({b.batchType} • {b.currentHeadcount}/{b.initialHeadcount} heads • {b.status})
              </option>
            ))}
          </select>
          {selectedBatchId !== "all" && role !== "staff" && (
            <button
              onClick={() => {
                const target = batches.find((b) => b.id === selectedBatchId);
                if (target) setEditingBatch({ ...target });
              }}
              className="flex items-center gap-1.5 rounded-xl border border-[#0F3D24]/15 bg-white px-3 py-2 text-xs font-semibold text-[#0F3D24] hover:bg-[#0F3D24]/5 transition"
              title="Edit Batch Name & Details"
            >
              <Pencil size={14} className="text-[#3F8F3F]" />
              Edit Batch
            </button>
          )}
        </div>

        {selectedBatchId !== "all" && reportQuery.data && (
          <div className="flex items-center gap-3 text-xs font-semibold text-[#0F3D24]">
            <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-[#0F3D24]/10">
              Start: {reportQuery.data.batch.startDate}
            </span>
            <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-[#0F3D24]/10">
              Harvest: {reportQuery.data.batch.targetHarvestDate || "Not set"}
            </span>
          </div>
        )}
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
          <span className="mt-1 block text-xs text-[#0F3D24]/60">Sales & Inflows</span>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#0F3D24]/5">
          <div className="flex items-center justify-between text-[#0F3D24]/70">
            <span className="text-xs font-semibold">Total Expenses</span>
            <div className="rounded-full bg-rose-50 p-2 text-rose-600">
              <TrendingDown size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-rose-600">{formatNaira(totalExpense)}</p>
          <span className="mt-1 block text-xs text-[#0F3D24]/60">Feed, Meds, Logistics & Ops</span>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#0F3D24]/5">
          <div className="flex items-center justify-between text-[#0F3D24]/70">
            <span className="text-xs font-semibold">Net Profit / Loss</span>
            <div className={`rounded-full p-2 ${netProfit >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
              <DollarSign size={18} />
            </div>
          </div>
          <p className={`mt-3 text-2xl font-bold ${netProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
            {formatNaira(netProfit)}
          </p>
          <span className="mt-1 block text-xs text-[#0F3D24]/60">
            {totalExpense > 0 ? `ROI: ${((netProfit / totalExpense) * 100).toFixed(1)}%` : "0% ROI"}
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

      {/* Interactive Sales & Revenue Line Chart */}
      <FinanceSalesChart passcode={passcode} financials={financials} />

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
                Type: {reportQuery.data.batch.batchType} • Started: {reportQuery.data.batch.startDate}
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
              <div className="mt-1 text-xl font-bold">{reportQuery.data.batch.initialHeadcount} birds</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <span className="text-xs text-white/70">Current Live Headcount</span>
              <div className="mt-1 text-xl font-bold text-[#A2E0A2]">
                {reportQuery.data.batch.currentHeadcount} birds
              </div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <span className="text-xs text-white/70">Cost per Bird</span>
              <div className="mt-1 text-xl font-bold">{formatNaira(reportQuery.data.costPerBird)}</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <span className="text-xs text-white/70">Mortality Rate</span>
              <div className="mt-1 text-xl font-bold text-amber-300">
                {reportQuery.data.totalMortality} birds ({reportQuery.data.mortalityRatePercentage.toFixed(1)}%)
              </div>
            </div>
          </div>

          {/* Expense Breakdown Categories */}
          <div className="mt-6 border-t border-white/10 pt-4">
            <h4 className="text-sm font-bold text-white/90">Expense Breakdown by Category:</h4>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(reportQuery.data.expenseByCategory).map(([cat, amt]) => (
                <div key={cat} className="flex items-center gap-2 rounded-xl bg-white/15 px-3 py-1.5 text-xs">
                  <span className="font-semibold text-white">{cat}:</span>
                  <span className="font-bold text-[#A2E0A2]">{formatNaira(amt)}</span>
                </div>
              ))}
              {Object.keys(reportQuery.data.expenseByCategory).length === 0 && (
                <p className="text-xs text-white/60">No expenses recorded for this batch yet.</p>
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
          <div className="py-8 text-center text-sm text-[#0F3D24]/60">Loading financial records...</div>
        ) : filteredFinancials.length === 0 ? (
          <div className="py-8 text-center text-sm text-[#0F3D24]/60">No financial transactions found.</div>
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
                      {f.description}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[#0F3D24]/70">{f.paymentMethod}</td>
                    <td className={`px-4 py-3.5 text-right font-bold whitespace-nowrap ${f.type === "income" ? "text-emerald-700" : "text-rose-700"}`}>
                      {f.type === "income" ? "+" : "-"}{formatNaira(f.amount)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {"isOrder" in f && f.isOrder ? (
                        <span className="rounded-full bg-[#3F8F3F]/10 px-2 py-0.5 text-[10px] font-semibold text-[#0F3D24]">
                          Store Order
                        </span>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          {role !== "staff" && (
                            <button
                              onClick={() => setEditingFinancial(f as FarmFinancial)}
                              className="text-[#3F8F3F] hover:text-[#0F3D24] transition p-1"
                              title="Edit financial record"
                            >
                              <Pencil size={15} />
                            </button>
                          )}
                          {role !== "staff" && (
                            <button
                              onClick={() => {
                                if (confirm("Delete this financial record?")) deleteFinMut.mutate(f.id);
                              }}
                              className="text-rose-600 hover:text-rose-800 transition p-1"
                              title="Delete record"
                            >
                              <Trash2 size={15} />
                            </button>
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

      {/* Modal: New Batch */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-[#0F3D24]">Register New Farm Batch</h3>
              <button onClick={() => setShowBatchModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
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
                  <label className="block text-xs font-bold text-[#0F3D24]">Initial Headcount</label>
                  <input
                    type="number"
                    value={batchForm.initialHeadcount}
                    onChange={(e) => setBatchForm({ ...batchForm, initialHeadcount: Number(e.target.value) })}
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
                  <label className="block text-xs font-bold text-[#0F3D24]">Target Harvest Date</label>
                  <input
                    type="date"
                    value={batchForm.targetHarvestDate}
                    onChange={(e) => setBatchForm({ ...batchForm, targetHarvestDate: e.target.value })}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-[#0F3D24]">Register Financial Transaction</h3>
              <button onClick={() => setShowFinancialModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
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
                <label className="block text-xs font-bold text-[#0F3D24]">Assign to Batch</label>
                <select
                  value={finForm.batchId}
                  onChange={(e) => setFinForm({ ...finForm, batchId: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                >
                  <option value="">General Farm Expense / Income</option>
                  {batches.map((b) => (
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
                  <input
                    type="number"
                    placeholder="e.g. 150000"
                    value={finForm.amount}
                    onChange={(e) => setFinForm({ ...finForm, amount: e.target.value })}
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
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowFinancialModal(false)}
                className="rounded-full bg-gray-100 px-5 py-2 text-xs font-semibold text-gray-600"
              >
                Cancel
              </button>
              <button
                disabled={!finForm.amount || !finForm.description.trim() || createFinancialMut.isPending}
                onClick={() => createFinancialMut.mutate()}
                className={`rounded-full px-6 py-2 text-xs font-semibold text-white disabled:opacity-50 ${finForm.type === "income" ? "bg-emerald-700 hover:bg-emerald-800" : "bg-rose-700 hover:bg-rose-800"}`}
              >
                {createFinancialMut.isPending ? "Saving..." : `Record ${finForm.type === "income" ? "Income" : "Expense"}`}
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
              <button onClick={() => setEditingBatch(null)} className="text-gray-400 hover:text-gray-600">
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
                    onChange={(e) => setEditingBatch({ ...editingBatch, batchType: e.target.value })}
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
                    onChange={(e) => setEditingBatch({ ...editingBatch, status: e.target.value as any })}
                    className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                  >
                    <option value="active">Active</option>
                    <option value="harvested">Harvested / Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-[#0F3D24]">Initial Headcount</label>
                  <input
                    type="number"
                    value={editingBatch.initialHeadcount}
                    onChange={(e) => setEditingBatch({ ...editingBatch, initialHeadcount: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0F3D24]">Current Live Headcount</label>
                  <input
                    type="number"
                    value={editingBatch.currentHeadcount}
                    onChange={(e) => setEditingBatch({ ...editingBatch, currentHeadcount: Number(e.target.value) })}
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
                    onChange={(e) => setEditingBatch({ ...editingBatch, startDate: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0F3D24]">Target Harvest Date</label>
                  <input
                    type="date"
                    value={editingBatch.targetHarvestDate || ""}
                    onChange={(e) => setEditingBatch({ ...editingBatch, targetHarvestDate: e.target.value })}
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

      {/* Modal: Edit Financial Record */}
      {editingFinancial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-[#0F3D24]">Edit Financial Record</h3>
              <button onClick={() => setEditingFinancial(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-gray-100 p-1 text-center font-bold text-xs">
                <button
                  onClick={() => setEditingFinancial({ ...editingFinancial, type: "expense" })}
                  className={`rounded-xl py-2 transition ${editingFinancial.type === "expense" ? "bg-rose-600 text-white shadow-xs" : "text-gray-600"}`}
                >
                  Expense (Money Out)
                </button>
                <button
                  onClick={() => setEditingFinancial({ ...editingFinancial, type: "income" })}
                  className={`rounded-xl py-2 transition ${editingFinancial.type === "income" ? "bg-emerald-600 text-white shadow-xs" : "text-gray-600"}`}
                >
                  Income (Money In)
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F3D24]">Assign to Batch</label>
                <select
                  value={editingFinancial.batchId || ""}
                  onChange={(e) => setEditingFinancial({ ...editingFinancial, batchId: e.target.value || undefined })}
                  className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                >
                  <option value="">General Farm Expense / Income</option>
                  {batches.map((b) => (
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
                    value={editingFinancial.category}
                    onChange={(e) => setEditingFinancial({ ...editingFinancial, category: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                  >
                    {editingFinancial.type === "expense" ? (
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
                  <input
                    type="number"
                    value={editingFinancial.amount}
                    onChange={(e) => setEditingFinancial({ ...editingFinancial, amount: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F3D24]">Description *</label>
                <input
                  type="text"
                  value={editingFinancial.description}
                  onChange={(e) => setEditingFinancial({ ...editingFinancial, description: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-[#0F3D24]">Payment Method</label>
                  <select
                    value={editingFinancial.paymentMethod}
                    onChange={(e) => setEditingFinancial({ ...editingFinancial, paymentMethod: e.target.value })}
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
                    value={editingFinancial.transactionDate}
                    onChange={(e) => setEditingFinancial({ ...editingFinancial, transactionDate: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setEditingFinancial(null)}
                className="rounded-full bg-gray-100 px-5 py-2 text-xs font-semibold text-gray-600"
              >
                Cancel
              </button>
              <button
                disabled={!editingFinancial.amount || !editingFinancial.description.trim() || updateFinancialMut.isPending}
                onClick={() => updateFinancialMut.mutate(editingFinancial)}
                className="rounded-full bg-[#0F3D24] px-6 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {updateFinancialMut.isPending ? "Updating..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 2. CRM / CUSTOMER LEADS PANEL ───────────────────────────────────────────

export function LeadCrmPanel({ passcode }: { passcode: string }) {
  const queryClient = useQueryClient();
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [editingLead, setEditingLead] = useState<CrmLead | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const listLeadsFn = useServerFn(adminListLeads);
  const createLeadFn = useServerFn(adminCreateLead);
  const updateLeadFn = useServerFn(adminUpdateLead);
  const deleteLeadFn = useServerFn(adminDeleteLead);

  const leadsQuery = useQuery({
    queryKey: ["crm-leads", passcode],
    queryFn: () => listLeadsFn({ data: { passcode } }),
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
            Record every customer inquiry from WhatsApp, phone calls, social media ads, or referrals.
          </p>
        </div>

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

      {feedback && (
        <div className="flex items-center justify-between rounded-2xl bg-[#3F8F3F]/10 px-5 py-3 text-sm text-[#0F3D24]">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-[#0F3D24]/60 hover:text-[#0F3D24]">
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
          <span className="text-xs font-semibold text-[#0F3D24]/70">Est. Pipeline Value</span>
          <p className="mt-2 text-2xl font-bold text-[#0F3D24]">{formatNaira(pipelineValue)}</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#F7F5F0] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-3 text-[#0F3D24]/40" />
            <input
              type="text"
              placeholder="Search leads by name, phone, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-full border border-[#0F3D24]/15 bg-white pl-10 pr-4 py-2 text-xs outline-none focus:border-[#3F8F3F] w-64"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-[#0F3D24]/15 bg-white px-3 py-2 text-xs font-semibold text-[#0F3D24] outline-none"
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
            className="rounded-xl border border-[#0F3D24]/15 bg-white px-3 py-2 text-xs font-semibold text-[#0F3D24] outline-none"
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
      </div>

      {/* Leads Grid Cards */}
      {leadsQuery.isLoading ? (
        <div className="py-12 text-center text-sm text-[#0F3D24]/60">Loading customer leads...</div>
      ) : filteredLeads.length === 0 ? (
        <div className="py-12 text-center text-sm text-[#0F3D24]/60">No customer leads found.</div>
      ) : (
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
                      <span>Interested in: <strong>{lead.interestedIn}</strong></span>
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
                  {lead.estimatedValue > 0 && (
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
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 flex items-center justify-between border-t border-[#0F3D24]/10 pt-3">
                <a
                  href={`https://wa.me/${lead.phone.replace(/\D+/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
                >
                  <MessageSquare size={14} /> WhatsApp
                </a>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEdit(lead)}
                    className="p-1.5 text-[#0F3D24]/70 hover:text-[#0F3D24] transition"
                    title="Edit Lead"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete lead record for ${lead.fullName}?`)) deleteLeadMut.mutate(lead.id);
                    }}
                    className="p-1.5 text-rose-600 hover:text-rose-800 transition"
                    title="Delete Lead"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
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
              <button onClick={() => setShowLeadModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#0F3D24]">Customer Full Name *</label>
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
                  <label className="block text-xs font-bold text-[#0F3D24]">Interested Product</label>
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
                <div>
                  <label className="block text-xs font-bold text-[#0F3D24]">Location / Address</label>
                  <input
                    type="text"
                    placeholder="e.g. Ikenegbu, Owerri"
                    value={leadForm.location}
                    onChange={(e) => setLeadForm({ ...leadForm, location: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0F3D24]">Estimated Value (₦)</label>
                  <input
                    type="number"
                    placeholder="e.g. 150000"
                    value={leadForm.estimatedValue}
                    onChange={(e) => setLeadForm({ ...leadForm, estimatedValue: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F3D24]">Customer Notes & Inquiries</label>
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
                disabled={!leadForm.fullName.trim() || !leadForm.phone.trim() || saveLeadMut.isPending}
                onClick={() => saveLeadMut.mutate()}
                className="rounded-full bg-[#0F3D24] px-6 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {saveLeadMut.isPending ? "Saving..." : "Save Lead Record"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 3. FARM DAILY ACTIVITIES & MORTALITY LOG PANEL ─────────────────────────

export function DailyActivitiesPanel({ passcode }: { passcode: string }) {
  const queryClient = useQueryClient();
  const [selectedBatchId, setSelectedBatchId] = useState<string>("all");
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [feedback, setFeedback] = useState<string | null>(null);

  const listBatchesFn = useServerFn(adminListBatches);
  const listActivitiesFn = useServerFn(adminListActivities);
  const createActivityFn = useServerFn(adminCreateActivity);
  const deleteActivityFn = useServerFn(adminDeleteActivity);

  const batchesQuery = useQuery({
    queryKey: ["farm-batches", passcode],
    queryFn: () => listBatchesFn({ data: { passcode } }),
  });

  const activitiesQuery = useQuery({
    queryKey: ["farm-activities", passcode, selectedBatchId],
    queryFn: () =>
      listActivitiesFn({
        data: {
          passcode,
          batchId: selectedBatchId === "all" ? null : selectedBatchId,
        },
      }),
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
      setFeedback("Daily farm activity logged successfully.");
    },
    onError: (e: Error) => setFeedback("Error: " + e.message),
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
  const activities = activitiesQuery.data || [];

  const filteredActivities = activities.filter((a) => {
    if (typeFilter !== "all" && a.activityType !== typeFilter) return false;
    return true;
  });

  // Calculate cumulative stats
  const totalMortality = activities.reduce((sum, a) => sum + a.mortalityCount, 0);
  const totalFeedKg = activities.reduce((sum, a) => sum + a.feedConsumedKg, 0);
  const totalEggs = activities.reduce((sum, a) => sum + a.eggsCollected, 0);

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
            Log mortality, daily feed consumption, vaccinations, egg collection, and pen maintenance.
          </p>
        </div>

        <button
          onClick={() => setShowActivityModal(true)}
          className="flex items-center gap-2 rounded-full bg-[#0F3D24] px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#134a2c] transition"
        >
          <PlusCircle size={16} />
          Log Daily Activity
        </button>
      </div>

      {feedback && (
        <div className="flex items-center justify-between rounded-2xl bg-[#3F8F3F]/10 px-5 py-3 text-sm text-[#0F3D24]">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-[#0F3D24]/60 hover:text-[#0F3D24]">
            <X size={16} />
          </button>
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
          <p className="mt-2 text-2xl font-bold text-amber-600">{totalFeedKg.toLocaleString()} kg</p>
          <span className="mt-1 block text-xs text-[#0F3D24]/50">
            ~{Math.round(totalFeedKg / 50)} bags of 50kg feed
          </span>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#0F3D24]/5 border-l-4 border-emerald-500">
          <span className="text-xs font-semibold text-[#0F3D24]/70">Total Eggs Collected</span>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{totalEggs.toLocaleString()} Eggs</p>
          <span className="mt-1 block text-xs text-[#0F3D24]/50">
            ~{Math.round(totalEggs / 30)} crates of 30 eggs
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#F7F5F0] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Filter size={16} className="text-[#0F3D24]/70" />
          <span className="text-xs font-bold uppercase tracking-wider text-[#0F3D24]/70">Filter Batch:</span>
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="rounded-xl border border-[#0F3D24]/15 bg-white px-3 py-1.5 text-xs font-semibold text-[#0F3D24] outline-none"
          >
            <option value="all">All Batches</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.batchName} ({b.batchType})
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-xl border border-[#0F3D24]/15 bg-white px-3 py-1.5 text-xs font-semibold text-[#0F3D24] outline-none"
          >
            <option value="all">All Activity Types</option>
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
          <div className="py-8 text-center text-sm text-[#0F3D24]/60">No farm activities recorded yet.</div>
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
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#0F3D24]">{act.activityType}</span>
                      {act.batchName && (
                        <span className="rounded-md bg-[#0F3D24]/10 px-2 py-0.5 text-[10px] font-bold text-[#0F3D24]">
                          {act.batchName}
                        </span>
                      )}
                      <span className="text-xs text-[#0F3D24]/60">• {act.activityDate}</span>
                    </div>

                    <div className="mt-2 space-y-1 text-xs text-[#0F3D24]/80">
                      {act.mortalityCount > 0 && (
                        <p className="font-bold text-rose-700">
                          ⚠️ Mortality: {act.mortalityCount} bird(s) lost
                          {act.causeOfMortality ? ` (${act.causeOfMortality})` : ""}
                        </p>
                      )}
                      {act.feedConsumedKg > 0 && <p>🌾 Feed Consumed: {act.feedConsumedKg} kg</p>}
                      {act.eggsCollected > 0 && <p>🥚 Eggs Collected: {act.eggsCollected} pieces</p>}
                      {act.medicationGiven && <p>💉 Medication: {act.medicationGiven}</p>}
                      {act.notes && <p className="italic text-[#0F3D24]/70">"{act.notes}"</p>}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (confirm("Delete this activity log?")) deleteActMut.mutate(act.id);
                  }}
                  className="p-1 text-rose-600 hover:text-rose-800 transition"
                  title="Delete record"
                >
                  <Trash2 size={16} />
                </button>
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
              <button onClick={() => setShowActivityModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-[#0F3D24]">Select Batch</label>
                  <select
                    value={actForm.batchId}
                    onChange={(e) => setActForm({ ...actForm, batchId: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                  >
                    <option value="">General Farm Activity</option>
                    {batches.map((b) => (
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
                      <label className="block text-xs font-bold text-rose-900">Mortality Count *</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="e.g. 2"
                        value={actForm.mortalityCount || ""}
                        onChange={(e) => setActForm({ ...actForm, mortalityCount: Number(e.target.value) })}
                        className="mt-1 w-full rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-rose-900">Cause of Mortality</label>
                      <input
                        type="text"
                        placeholder="e.g. Heat stress, Culling"
                        value={actForm.causeOfMortality}
                        onChange={(e) => setActForm({ ...actForm, causeOfMortality: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {actForm.activityType === "Feeding" && (
                <div>
                  <label className="block text-xs font-bold text-[#0F3D24]">Feed Consumed (kg)</label>
                  <input
                    type="number"
                    placeholder="e.g. 100"
                    value={actForm.feedConsumedKg || ""}
                    onChange={(e) => setActForm({ ...actForm, feedConsumedKg: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                  />
                </div>
              )}

              {actForm.activityType === "Egg Collection" && (
                <div>
                  <label className="block text-xs font-bold text-[#0F3D24]">Eggs Collected (Pieces)</label>
                  <input
                    type="number"
                    placeholder="e.g. 300"
                    value={actForm.eggsCollected || ""}
                    onChange={(e) => setActForm({ ...actForm, eggsCollected: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                  />
                </div>
              )}

              {actForm.activityType === "Medication / Vaccination" && (
                <div>
                  <label className="block text-xs font-bold text-[#0F3D24]">Medication / Vaccine Given</label>
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
                disabled={createActivityMut.isPending}
                onClick={() => createActivityMut.mutate()}
                className="rounded-full bg-[#0F3D24] px-6 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {createActivityMut.isPending ? "Logging..." : "Log Activity"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
