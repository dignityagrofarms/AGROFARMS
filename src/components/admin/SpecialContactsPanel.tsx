import React, { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Contact,
  Plus,
  Search,
  Phone,
  MessageCircle,
  Building2,
  MapPin,
  TrendingUp,
  Receipt,
  ArrowLeft,
  Calendar,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Clock,
  Trash2,
  Pencil,
  FileDown,
  Download,
  Share2,
  ExternalLink,
  ChevronRight,
  Filter,
  DollarSign,
  Tag,
  Loader2,
  Send,
  X,
  Truck,
  Package,
} from "lucide-react";
import {
  adminListSpecialContacts,
  adminGetContactDetail,
  adminCreateSpecialContact,
  adminUpdateSpecialContact,
  adminDeleteSpecialContact,
  adminRecordContactTransaction,
  adminDeleteContactTransaction,
  type SpecialContact,
  type ContactTransaction,
  type SpecialContactType,
  type SpecialContactStatus,
  type TransactionType,
} from "@/lib/contacts.functions";
import type { FarmBatch } from "@/lib/farm.functions";
import type { AdminRole } from "@/lib/orders.functions";
import { NumberField } from "@/components/ui/number-field";

const naira = (n: number) => "\u20a6" + Math.round(n || 0).toLocaleString("en-NG");

export function SpecialContactsPanel({
  passcode,
  role = "owner",
  batches = [],
}: {
  passcode: string;
  role?: AdminRole;
  batches?: FarmBatch[];
}) {
  const qc = useQueryClient();
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | SpecialContactType>("all");
  const [balanceFilter, setBalanceFilter] = useState<"all" | "owing" | "settled" | "payable">("all");

  const listFn = useServerFn(adminListSpecialContacts);
  const contactsQuery = useQuery({
    queryKey: ["admin-special-contacts", passcode],
    queryFn: () => listFn({ data: { passcode } }),
    staleTime: 10_000,
  });

  const contacts = contactsQuery.data?.contacts || [];
  const summary = contactsQuery.data?.summary || {
    totalContacts: 0,
    totalBuyers: 0,
    totalSuppliers: 0,
    totalSalesToBuyers: 0,
    totalDebtOwedToFarm: 0,
    debtorsCount: 0,
    totalPurchasesFromSuppliers: 0,
    totalPayableToSuppliers: 0,
  };

  const filteredContacts = contacts.filter((c) => {
    // Type filter
    if (typeFilter !== "all" && c.contactType !== typeFilter) return false;

    // Balance filter
    if (balanceFilter === "owing") {
      const isBuyer = c.contactType === "bulk_buyer" || c.contactType === "offloader";
      if (!isBuyer || c.balanceDue <= 0) return false;
    } else if (balanceFilter === "settled") {
      if (c.balanceDue > 0) return false;
    } else if (balanceFilter === "payable") {
      if (c.contactType !== "supplier" || c.balanceDue <= 0) return false;
    }

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        c.contactName.toLowerCase().includes(q) ||
        (c.businessName && c.businessName.toLowerCase().includes(q)) ||
        c.phone.includes(q) ||
        (c.locationAddress && c.locationAddress.toLowerCase().includes(q)) ||
        (c.notes && c.notes.toLowerCase().includes(q))
      );
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Executive Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl bg-gradient-to-r from-[#0F3D24] via-[#165232] to-[#0F3D24] p-6 sm:p-8 text-white shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-[#a8e6a8]">
              <Contact size={18} />
            </span>
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#a8e6a8]">
              Special Contacts & Accounts · Wholesale & Vendors
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Bulk Buyers & Suppliers</h2>
          <p className="max-w-2xl text-xs text-white/80 leading-relaxed">
            Record numbers of special bulk offloaders, cold rooms, market buyers, and hatchery/feed vendors. Track offload volumes, sales history, debt collections, and supplier balances.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 self-start rounded-full bg-white px-5 py-2.5 text-xs font-black text-[#0F3D24] shadow-md hover:bg-[#FAF9F6] transition"
        >
          <Plus size={16} /> Input New Contact
        </button>
      </div>

      {/* Metric Cards Portfolio Strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Bulk Sales */}
        <div className="rounded-2xl border border-[#0F3D24]/10 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Bulk Sales (Offloads)</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
              <TrendingUp size={15} />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-[#0F3D24] tabular-nums">
            {naira(summary.totalSalesToBuyers)}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-slate-500">
            Across {summary.totalBuyers} registered bulk buyers & offloaders
          </div>
        </div>

        {/* Card 2: Debt Owed to Farm (Receivables) */}
        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-rose-800">
            <span>Debt Owed to Farm</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-200 text-rose-800">
              <AlertCircle size={15} />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-rose-700 tabular-nums">
            {naira(summary.totalDebtOwedToFarm)}
          </div>
          <div className="mt-1 text-[11px] font-bold text-rose-800">
            {summary.debtorsCount > 0
              ? `${summary.debtorsCount} buyer(s) have unpaid offload balances`
              : "All buyer accounts are fully settled"}
          </div>
        </div>

        {/* Card 3: Total Supplier Purchases */}
        <div className="rounded-2xl border border-[#0F3D24]/10 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Supplier Supplies</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-800">
              <Truck size={15} />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-[#0F3D24] tabular-nums">
            {naira(summary.totalPurchasesFromSuppliers)}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-slate-500">
            DOCs, Feed, Vaccines from {summary.totalSuppliers} vendors
          </div>
        </div>

        {/* Card 4: Payables Owed to Suppliers */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-amber-800">
            <span>Payables to Suppliers</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-200 text-amber-800">
              <Clock size={15} />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-900 tabular-nums">
            {naira(summary.totalPayableToSuppliers)}
          </div>
          <div className="mt-1 text-[11px] font-bold text-amber-800">
            Farm credit balance awaiting payment to vendors
          </div>
        </div>
      </div>

      {/* Main Content: Directory or Detail View */}
      {selectedContactId ? (
        <ContactDetailView
          passcode={passcode}
          contactId={selectedContactId}
          batches={batches}
          role={role}
          onBack={() => {
            setSelectedContactId(null);
            qc.invalidateQueries({ queryKey: ["admin-special-contacts"] });
          }}
        />
      ) : (
        <div className="rounded-3xl border border-[#0F3D24]/10 bg-white p-6 shadow-sm space-y-6">
          {/* Search Bar + Filters */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-md">
              <Search size={15} className="absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search contact name, cold room, phone, market..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-[#FAF9F6] pl-10 pr-4 py-2.5 text-xs font-semibold text-[#0F3D24] outline-none focus:border-[#3F8F3F] focus:bg-white"
              />
            </div>

            {/* Type Filters */}
            <div className="flex flex-wrap gap-1.5 text-xs">
              {[
                { key: "all", label: `All Contacts (${contacts.length})` },
                { key: "bulk_buyer", label: `Bulk Buyers (${summary.totalBuyers})` },
                { key: "supplier", label: `Suppliers (${summary.totalSuppliers})` },
                { key: "offloader", label: "Offloaders" },
              ].map((btn) => (
                <button
                  key={btn.key}
                  type="button"
                  onClick={() => setTypeFilter(btn.key as any)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                    typeFilter === btn.key
                      ? "bg-[#0F3D24] text-white shadow-sm"
                      : "bg-[#FAF9F6] text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Secondary Balance Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">
              Filter by Balance:
            </span>
            <button
              type="button"
              onClick={() => setBalanceFilter("all")}
              className={`rounded-xl px-3 py-1 text-xs font-bold transition ${
                balanceFilter === "all"
                  ? "bg-slate-800 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Balances
            </button>
            <button
              type="button"
              onClick={() => setBalanceFilter("owing")}
              className={`rounded-xl px-3 py-1 text-xs font-bold transition ${
                balanceFilter === "owing"
                  ? "bg-rose-700 text-white shadow-sm"
                  : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
              }`}
            >
              Has Outstanding Debt ({summary.debtorsCount})
            </button>
            <button
              type="button"
              onClick={() => setBalanceFilter("settled")}
              className={`rounded-xl px-3 py-1 text-xs font-bold transition ${
                balanceFilter === "settled"
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
              }`}
            >
              Fully Settled
            </button>
            <button
              type="button"
              onClick={() => setBalanceFilter("payable")}
              className={`rounded-xl px-3 py-1 text-xs font-bold transition ${
                balanceFilter === "payable"
                  ? "bg-amber-800 text-white shadow-sm"
                  : "bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100"
              }`}
            >
              Payable Owed to Vendor
            </button>
          </div>

          {/* Directory Grid */}
          {contactsQuery.isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <Loader2 className="animate-spin text-[#3F8F3F]" size={36} />
              <p className="mt-3 text-xs font-bold">Loading special contacts directory...</p>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-[#FAF9F6] p-12 text-center space-y-3">
              <Contact className="mx-auto text-slate-400" size={40} />
              <h4 className="text-base font-bold text-[#0F3D24]">No Special Contacts Found</h4>
              <p className="mx-auto max-w-md text-xs text-slate-500">
                {searchTerm || typeFilter !== "all" || balanceFilter !== "all"
                  ? "No contacts match your current search or filters."
                  : "You have not added any bulk buyers or suppliers yet. Click below to input your first special contact."}
              </p>
              {!searchTerm && (
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#0F3D24] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#165232]"
                >
                  <Plus size={14} /> Input New Contact
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredContacts.map((c) => {
                const isBuyer = c.contactType === "bulk_buyer" || c.contactType === "offloader";
                const isSupplier = c.contactType === "supplier";
                const hasDebt = isBuyer && c.balanceDue > 0;
                const hasPayable = isSupplier && c.balanceDue > 0;

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedContactId(c.id)}
                    className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-[#3F8F3F]/40 hover:shadow-md cursor-pointer"
                  >
                    <div className="space-y-3">
                      {/* Top Badges */}
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                            isBuyer
                              ? "bg-emerald-100 text-emerald-800"
                              : isSupplier
                                ? "bg-blue-100 text-blue-800"
                                : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          {isBuyer ? "Bulk Offloader" : isSupplier ? "Farm Supplier" : c.contactType}
                        </span>

                        {/* Balance Badge */}
                        {hasDebt ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 border border-rose-200 px-2.5 py-0.5 text-[10px] font-black text-rose-800">
                            Owes: {naira(c.balanceDue)}
                          </span>
                        ) : hasPayable ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-200 px-2.5 py-0.5 text-[10px] font-black text-amber-900">
                            Payable: {naira(c.balanceDue)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            ✓ Settled
                          </span>
                        )}
                      </div>

                      {/* Contact Identity */}
                      <div>
                        <h3 className="text-base font-black text-[#0F3D24] group-hover:text-[#3F8F3F] transition-colors">
                          {c.contactName}
                        </h3>
                        {c.businessName && (
                          <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 mt-0.5">
                            <Building2 size={12} className="text-slate-400" />
                            <span>{c.businessName}</span>
                          </div>
                        )}
                      </div>

                      {/* Phone Numbers & Quick Communication Buttons */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                          <span className="flex items-center gap-1.5 font-mono">
                            <Phone size={13} className="text-slate-400" /> {c.phone}
                          </span>
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <a
                              href={`tel:${c.phone}`}
                              className="rounded-lg bg-slate-100 p-1.5 text-slate-600 hover:bg-[#0F3D24] hover:text-white transition"
                              title="Call phone"
                            >
                              <Phone size={12} />
                            </a>
                            <a
                              href={`https://wa.me/${(c.whatsapp || c.phone).replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg bg-[#25D366]/15 p-1.5 text-[#1ebf59] hover:bg-[#25D366] hover:text-white transition"
                              title="Chat on WhatsApp"
                            >
                              <MessageCircle size={12} />
                            </a>
                          </div>
                        </div>

                        {c.locationAddress && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                            <MapPin size={12} className="shrink-0 text-slate-400" />
                            <span className="truncate">{c.locationAddress}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Stats Footer */}
                    <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="text-[10px] font-bold uppercase text-slate-400">
                          {isBuyer ? "Total Bought" : "Total Supplied"}
                        </div>
                        <div className="font-black text-[#0F3D24] tabular-nums">
                          {naira(c.totalAmount)}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] font-bold uppercase text-slate-400">Ledger</div>
                        <div className="font-bold text-slate-700">
                          {c.transactionCount} record{c.transactionCount === 1 ? "" : "s"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add New Special Contact Modal */}
      {isAddModalOpen && (
        <AddSpecialContactModal
          passcode={passcode}
          batches={batches}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            setIsAddModalOpen(false);
            qc.invalidateQueries({ queryKey: ["admin-special-contacts"] });
          }}
        />
      )}
    </div>
  );
}

// ─── Contact Detail View (Full Ledger & Transactions) ─────────────────────────

function ContactDetailView({
  passcode,
  contactId,
  batches,
  role,
  onBack,
}: {
  passcode: string;
  contactId: string;
  batches: FarmBatch[];
  role?: AdminRole;
  onBack: () => void;
}) {
  const qc = useQueryClient();
  const [isRecordTxOpen, setIsRecordTxOpen] = useState(false);
  const [isEditContactOpen, setIsEditContactOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

  const getDetailFn = useServerFn(adminGetContactDetail);
  const detailQuery = useQuery({
    queryKey: ["admin-contact-detail", passcode, contactId],
    queryFn: () => getDetailFn({ data: { passcode, contactId } }),
  });

  const deleteTxFn = useServerFn(adminDeleteContactTransaction);
  const deleteContactFn = useServerFn(adminDeleteSpecialContact);

  if (detailQuery.isLoading) {
    return (
      <div className="rounded-3xl border border-[#0F3D24]/10 bg-white p-16 text-center shadow-sm">
        <Loader2 className="mx-auto animate-spin text-[#3F8F3F]" size={36} />
        <h3 className="mt-3 text-base font-bold text-[#0F3D24]">Loading Contact Record...</h3>
        <p className="text-xs text-slate-500">Retrieving wholesale offload statement and balances.</p>
      </div>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-white p-12 text-center shadow-sm space-y-3">
        <AlertCircle className="mx-auto text-rose-600" size={36} />
        <h3 className="text-base font-bold text-slate-800">Could not load contact details</h3>
        <p className="text-xs text-slate-500">
          {detailQuery.error instanceof Error ? detailQuery.error.message : "Contact not found"}
        </p>
        <button
          type="button"
          onClick={onBack}
          className="rounded-full bg-[#0F3D24] px-5 py-2 text-xs font-bold text-white"
        >
          Return to Contacts
        </button>
      </div>
    );
  }

  const { contact, transactions } = detailQuery.data;
  const isBuyer = contact.contactType === "bulk_buyer" || contact.contactType === "offloader";
  const isSupplier = contact.contactType === "supplier";
  const hasDebt = isBuyer && contact.balanceDue > 0;
  const hasPayable = isSupplier && contact.balanceDue > 0;

  const handleDeleteContact = async () => {
    if (!confirm(`Are you sure you want to delete ${contact.contactName}? All associated transactions will also be removed.`)) {
      return;
    }
    try {
      await deleteContactFn({ data: { passcode, contactId: contact.id } });
      onBack();
    } catch (e: any) {
      alert(e.message || "Could not delete contact");
    }
  };

  const handleDeleteTx = async (txId: string) => {
    if (!confirm("Are you sure you want to void/delete this transaction?")) return;
    try {
      await deleteTxFn({ data: { passcode, transactionId: txId } });
      detailQuery.refetch();
      qc.invalidateQueries({ queryKey: ["admin-special-contacts"] });
    } catch (e: any) {
      alert(e.message || "Could not delete transaction");
    }
  };

  return (
    <div className="space-y-6">
      {/* Back Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white border border-[#0F3D24]/10 p-4 shadow-sm">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl bg-[#FAF9F6] px-4 py-2 text-xs font-bold text-[#0F3D24] hover:bg-slate-200 transition"
        >
          <ArrowLeft size={14} /> Back to Contacts Directory
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsWhatsAppModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#25D366] px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#1ebf59] transition"
          >
            <MessageCircle size={14} /> Send WhatsApp Statement
          </button>

          <button
            type="button"
            onClick={() => setIsEditContactOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            <Pencil size={13} /> Edit Contact
          </button>

          {role === "owner" && (
            <button
              type="button"
              onClick={handleDeleteContact}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
            >
              <Trash2 size={13} /> Delete
            </button>
          )}
        </div>
      </div>

      {/* Contact Profile Overview Header */}
      <div className="rounded-3xl bg-white border border-[#0F3D24]/10 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                  isBuyer
                    ? "bg-emerald-100 text-emerald-800"
                    : isSupplier
                      ? "bg-blue-100 text-blue-800"
                      : "bg-purple-100 text-purple-800"
                }`}
              >
                {isBuyer ? "Bulk Offloader" : isSupplier ? "Farm Supplier" : contact.contactType}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                Terms: {contact.preferredPaymentTerms || "Standard"}
              </span>
            </div>
            <h2 className="text-2xl font-black text-[#0F3D24]">{contact.contactName}</h2>
            {contact.businessName && (
              <p className="text-sm font-semibold text-slate-600 flex items-center gap-1.5">
                <Building2 size={15} className="text-slate-400" />
                {contact.businessName}
              </p>
            )}
          </div>

          {/* Quick Communication Box */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            <a
              href={`tel:${contact.phone}`}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-[#0F3D24] hover:bg-[#0F3D24] hover:text-white transition"
            >
              <Phone size={14} /> Call {contact.phone}
            </a>
            <a
              href={`https://wa.me/${(contact.whatsapp || contact.phone).replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-[#25D366]/15 px-4 py-2 text-xs font-bold text-[#1ebf59] hover:bg-[#25D366] hover:text-white transition"
            >
              <MessageCircle size={14} /> Chat WhatsApp
            </a>
          </div>
        </div>

        {/* Location & Notes */}
        <div className="grid gap-3 sm:grid-cols-2 border-t border-slate-100 pt-3 text-xs">
          {contact.locationAddress && (
            <div className="flex items-center gap-2 text-slate-600">
              <MapPin size={14} className="text-[#3F8F3F] shrink-0" />
              <span>Location: <strong>{contact.locationAddress}</strong></span>
            </div>
          )}
          {contact.notes && (
            <div className="text-slate-600 italic">
              Notes: "{contact.notes}"
            </div>
          )}
        </div>
      </div>

      {/* Financial Statement Scorecard */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {isBuyer ? "Lifetime Purchases" : "Lifetime Supplies"}
          </div>
          <div className="mt-1 text-2xl font-black text-[#0F3D24] tabular-nums">
            {naira(contact.totalAmount)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Total gross volume across {transactions.length} record(s)
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Total Payments Settled
          </div>
          <div className="mt-1 text-2xl font-black text-emerald-700 tabular-nums">
            {naira(contact.totalPaid)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Confirmed remittances to date
          </div>
        </div>

        <div
          className={`rounded-2xl border p-5 shadow-xs ${
            hasDebt
              ? "border-rose-200 bg-rose-50"
              : hasPayable
                ? "border-amber-200 bg-amber-50"
                : "border-emerald-200 bg-emerald-50"
          }`}
        >
          <div
            className={`text-xs font-bold uppercase tracking-wider ${
              hasDebt ? "text-rose-800" : hasPayable ? "text-amber-800" : "text-emerald-800"
            }`}
          >
            {hasDebt ? "Outstanding Debt Owed" : hasPayable ? "Payable Balance Due" : "Current Balance"}
          </div>
          <div
            className={`mt-1 text-2xl font-black tabular-nums ${
              hasDebt ? "text-rose-700" : hasPayable ? "text-amber-900" : "text-emerald-700"
            }`}
          >
            {naira(contact.balanceDue)}
          </div>
          <div
            className={`mt-1 text-[11px] font-bold ${
              hasDebt ? "text-rose-800" : hasPayable ? "text-amber-800" : "text-emerald-800"
            }`}
          >
            {hasDebt
              ? "Buyer owes this amount to Dignity Agro Farms"
              : hasPayable
                ? "Farm credit awaiting remittance to vendor"
                : "Account fully settled with zero balance"}
          </div>
        </div>
      </div>

      {/* Transaction & Offload Ledger Panel */}
      <div className="rounded-3xl border border-[#0F3D24]/10 bg-white p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-[#0F3D24]">Itemized Account Ledger</h3>
            <p className="text-xs text-slate-500">
              Record offloads, bulk bird sales, payments, or feed/DOC supply receipts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsRecordTxOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#0F3D24] px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-[#165232] transition"
            >
              <Plus size={15} />
              {isBuyer ? "Record Offload / Sale" : "Record Supply / Purchase"}
            </button>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-[#FAF9F6] p-12 text-center text-xs text-slate-500 space-y-2">
            <Receipt className="mx-auto text-slate-400" size={36} />
            <p className="font-bold text-slate-700">No transactions recorded for this contact yet.</p>
            <p>Click "Record Offload / Sale" to key in their first transaction or bulk purchase.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-[#FAF9F6] text-[10px] font-black uppercase tracking-wider text-[#0F3D24]/70">
                  <th className="py-3 px-3.5">Date</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Description</th>
                  <th className="py-3 px-3">Batch</th>
                  <th className="py-3 px-3 text-right">Quantity</th>
                  <th className="py-3 px-3 text-right">Unit Price</th>
                  <th className="py-3 px-3 text-right">Total (₦)</th>
                  <th className="py-3 px-3 text-right">Paid (₦)</th>
                  <th className="py-3 px-3 text-right">Balance Due (₦)</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-2 text-center w-8">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((t) => {
                  const isSale = t.transactionType === "sale_to_contact";
                  const isPayment = t.transactionType === "payment_from_contact";
                  const isSupply = t.transactionType === "purchase_from_supplier";

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3.5 font-medium text-slate-600 whitespace-nowrap">
                        {t.transactionDate}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                            isSale
                              ? "bg-emerald-100 text-emerald-800"
                              : isPayment
                                ? "bg-blue-100 text-blue-800"
                                : isSupply
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {isSale ? "Sale / Offload" : isPayment ? "Payment" : isSupply ? "Supply" : t.transactionType}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-[#0F3D24]">
                        <div>{t.itemDescription}</div>
                        {t.referenceNo && (
                          <div className="text-[10px] font-mono text-slate-400">Ref: {t.referenceNo}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        {t.batchName ? (
                          <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            {t.batchName}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">General</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-700 tabular-nums">
                        {t.quantity > 0 ? `${t.quantity} ${t.unit}` : "-"}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-600 tabular-nums">
                        {t.unitPrice > 0 ? naira(t.unitPrice) : "-"}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-[#0F3D24] tabular-nums">
                        {naira(t.totalAmount)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-700 tabular-nums">
                        {naira(t.amountPaid)}
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-black tabular-nums ${
                          t.balanceDue > 0 ? "text-rose-700" : "text-slate-400"
                        }`}
                      >
                        {naira(t.balanceDue)}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                            t.paymentStatus === "paid"
                              ? "bg-emerald-100 text-emerald-800"
                              : t.paymentStatus === "partial"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {t.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteTx(t.id)}
                          className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                          title="Void / Delete entry"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Transaction Modal */}
      {isRecordTxOpen && (
        <RecordTransactionModal
          passcode={passcode}
          contact={contact}
          batches={batches}
          onClose={() => setIsRecordTxOpen(false)}
          onSuccess={() => {
            setIsRecordTxOpen(false);
            detailQuery.refetch();
            qc.invalidateQueries({ queryKey: ["admin-special-contacts"] });
          }}
        />
      )}

      {/* Edit Contact Modal */}
      {isEditContactOpen && (
        <EditSpecialContactModal
          passcode={passcode}
          contact={contact}
          onClose={() => setIsEditContactOpen(false)}
          onSuccess={() => {
            setIsEditContactOpen(false);
            detailQuery.refetch();
            qc.invalidateQueries({ queryKey: ["admin-special-contacts"] });
          }}
        />
      )}

      {/* WhatsApp Statement Modal */}
      {isWhatsAppModalOpen && (
        <WhatsAppStatementModal
          contact={contact}
          transactions={transactions}
          onClose={() => setIsWhatsAppModalOpen(false)}
        />
      )}
    </div>
  );
}

// ─── Modal 1: Input New Special Contact ───────────────────────────────────────

function AddSpecialContactModal({
  passcode,
  batches,
  onClose,
  onSuccess,
}: {
  passcode: string;
  batches: FarmBatch[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const createContactFn = useServerFn(adminCreateSpecialContact);

  const [contactName, setContactName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [contactType, setContactType] = useState<SpecialContactType>("bulk_buyer");
  const [phone, setPhone] = useState("");
  const [altPhone, setAltPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [preferredPaymentTerms, setPreferredPaymentTerms] = useState("Bank Transfer");
  const [notes, setNotes] = useState("");

  // Optional initial transaction
  const activeBatches = batches.filter((b) => b.status === "active");
  const [hasInitialTx, setHasInitialTx] = useState(false);
  const [batchId, setBatchId] = useState(activeBatches[0]?.id || "");
  const [itemDescription, setItemDescription] = useState("");
  const [quantity, setQuantity] = useState(100);
  const [unit, setUnit] = useState("birds");
  const [unitPrice, setUnitPrice] = useState(3800);
  const [amountPaid, setAmountPaid] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const totalAmount = quantity * unitPrice;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim()) {
      setErrorMsg("Please provide a contact name.");
      return;
    }
    if (!phone.trim()) {
      setErrorMsg("Please provide a primary phone number.");
      return;
    }
    if (hasInitialTx && !batchId) {
      setErrorMsg("Please select an active batch for the opening transaction.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      await createContactFn({
        data: {
          passcode,
          contactName: contactName.trim(),
          businessName: businessName.trim() || null,
          contactType,
          phone: phone.trim(),
          altPhone: altPhone.trim() || null,
          whatsapp: whatsapp.trim() || phone.trim(),
          email: email.trim() || null,
          locationAddress: locationAddress.trim() || null,
          preferredPaymentTerms: preferredPaymentTerms.trim() || "Bank Transfer",
          status: "active",
          notes: notes.trim() || null,
          initialOffload: hasInitialTx
            ? {
                batchId: batchId || null,
                itemDescription: itemDescription.trim() || `${quantity} ${unit} @ ${naira(unitPrice)}`,
                quantity,
                unit,
                unitPrice,
                totalAmount,
                amountPaid,
                paymentMethod: preferredPaymentTerms,
              }
            : null,
        },
      });

      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create contact");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative my-8 w-full max-w-xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2 text-base font-black text-[#0F3D24]">
            <Contact size={20} className="text-[#3F8F3F]" /> Input New Special Contact
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {errorMsg && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">
              {errorMsg}
            </div>
          )}

          {/* Contact Type Selector */}
          <div>
            <label className="block font-bold text-[#0F3D24] mb-1">Contact Category</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: "bulk_buyer", label: "Bulk Buyer", icon: TrendingUp },
                { key: "offloader", label: "Offloader", icon: Package },
                { key: "supplier", label: "Feed / Hatchery Supplier", icon: Truck },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setContactType(t.key as any)}
                  className={`flex flex-col items-center gap-1 rounded-xl border p-2.5 font-bold transition ${
                    contactType === t.key
                      ? "border-[#0F3D24] bg-[#0F3D24] text-white shadow-sm"
                      : "border-slate-200 bg-[#FAF9F6] text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <t.icon size={16} />
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Names */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block font-bold text-[#0F3D24] mb-1">Contact Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Mama Nkechi, Alhaji Sani"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-[#FAF9F6] px-3.5 py-2.5 font-semibold text-[#0F3D24] outline-none focus:border-[#3F8F3F] focus:bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-[#0F3D24] mb-1">Business / Shop Name</label>
              <input
                type="text"
                placeholder="e.g. Nkechi Cold Room, Sani Feed Depot"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-[#FAF9F6] px-3.5 py-2.5 text-[#0F3D24] outline-none focus:border-[#3F8F3F] focus:bg-white"
              />
            </div>
          </div>

          {/* Phones */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block font-bold text-[#0F3D24] mb-1">Primary Phone Number *</label>
              <input
                type="tel"
                required
                placeholder="e.g. 0803 123 4567"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (!whatsapp) setWhatsapp(e.target.value);
                }}
                className="w-full rounded-xl border border-slate-200 bg-[#FAF9F6] px-3.5 py-2.5 font-mono text-[#0F3D24] outline-none focus:border-[#3F8F3F] focus:bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-[#0F3D24] mb-1">WhatsApp Number</label>
              <input
                type="tel"
                placeholder="e.g. 0803 123 4567"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-[#FAF9F6] px-3.5 py-2.5 font-mono text-[#0F3D24] outline-none focus:border-[#3F8F3F] focus:bg-white"
              />
            </div>
          </div>

          {/* Location & Payment Terms */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block font-bold text-[#0F3D24] mb-1">Market / Shop Location</label>
              <input
                type="text"
                placeholder="e.g. Relief Market, Owerri, Shop 14"
                value={locationAddress}
                onChange={(e) => setLocationAddress(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-[#FAF9F6] px-3.5 py-2.5 text-[#0F3D24] outline-none focus:border-[#3F8F3F] focus:bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-[#0F3D24] mb-1">Payment Terms</label>
              <select
                value={preferredPaymentTerms}
                onChange={(e) => setPreferredPaymentTerms(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-[#FAF9F6] px-3.5 py-2.5 text-[#0F3D24] outline-none focus:border-[#3F8F3F] focus:bg-white"
              >
                <option value="Bank Transfer">Bank Transfer (Instant)</option>
                <option value="Cash on Delivery">Cash on Delivery</option>
                <option value="Deposit + Balance (3 Days)">Deposit + Balance (3 Days)</option>
                <option value="Deposit + Balance (7 Days)">Deposit + Balance (7 Days)</option>
                <option value="Credit (14 Days)">Credit (14 Days)</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-bold text-[#0F3D24] mb-1">Notes / Preferences</label>
            <input
              type="text"
              placeholder="e.g. Preferred bird weight: 2.2kg+, buys 100 crates every Friday"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-[#FAF9F6] px-3.5 py-2 text-[#0F3D24] outline-none focus:border-[#3F8F3F] focus:bg-white"
            />
          </div>

          {/* Initial Offload / Transaction Toggle */}
          <div className="rounded-2xl border border-slate-200 bg-[#FAF9F6] p-4 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-[#0F3D24]">
              <input
                type="checkbox"
                checked={hasInitialTx}
                onChange={(e) => setHasInitialTx(e.target.checked)}
                className="rounded accent-[#0F3D24]"
              />
              <span>Record an opening offload / transaction immediately?</span>
            </label>

            {hasInitialTx && (
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Active Farm Batch *</label>
                    <select
                      value={batchId}
                      onChange={(e) => setBatchId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[#0F3D24]"
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
                    <label className="block font-bold text-slate-700 mb-1">Item Description</label>
                    <input
                      type="text"
                      placeholder="e.g. 150 Live Broiler Birds"
                      value={itemDescription}
                      onChange={(e) => setItemDescription(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[#0F3D24]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Quantity</label>
                    <NumberField
                      min={1}
                      value={quantity}
                      onValueChange={(n) => setQuantity(n ?? 0)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[#0F3D24]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Unit Price (₦)</label>
                    <NumberField
                      allowDecimal
                      min={0}
                      value={unitPrice}
                      onValueChange={(n) => setUnitPrice(n ?? 0)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[#0F3D24]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Total Bill</label>
                    <div className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 font-black text-[#0F3D24] tabular-nums">
                      {naira(totalAmount)}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Amount Paid Now (₦)</label>
                    <NumberField
                      allowDecimal
                      min={0}
                      value={amountPaid}
                      onValueChange={(n) => setAmountPaid(n ?? 0)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[#0F3D24]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Remaining Debt (₦)</label>
                    <div
                      className={`w-full rounded-xl border px-3 py-2 font-black tabular-nums ${
                        totalAmount - amountPaid > 0
                          ? "border-rose-200 bg-rose-50 text-rose-700"
                          : "border-emerald-200 bg-emerald-50 text-emerald-800"
                      }`}
                    >
                      {naira(Math.max(0, totalAmount - amountPaid))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-5 py-2.5 font-bold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-[#0F3D24] px-6 py-2.5 font-black text-white shadow-md hover:bg-[#165232] disabled:opacity-50"
            >
              {submitting ? "Saving Contact..." : "Save Special Contact →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal 2: Record Transaction (Offload, Bulk Sale, Supply) ─────────────────

function RecordTransactionModal({
  passcode,
  contact,
  batches,
  onClose,
  onSuccess,
}: {
  passcode: string;
  contact: SpecialContact;
  batches: FarmBatch[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const recordTxFn = useServerFn(adminRecordContactTransaction);

  const isBuyer = contact.contactType === "bulk_buyer" || contact.contactType === "offloader";
  const defaultTxType: TransactionType = isBuyer ? "sale_to_contact" : "purchase_from_supplier";

  const activeBatches = batches.filter((b) => b.status === "active");
  const [transactionType, setTransactionType] = useState<TransactionType>(defaultTxType);
  const [batchId, setBatchId] = useState(activeBatches[0]?.id || "");
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().slice(0, 10));
  const [itemDescription, setItemDescription] = useState(
    isBuyer ? "Live Broiler Chickens (Offload)" : "Starter / Finisher Feed Supply"
  );
  const [quantity, setQuantity] = useState(100);
  const [unit, setUnit] = useState(isBuyer ? "birds" : "bags");
  const [unitPrice, setUnitPrice] = useState(isBuyer ? 3800 : 17500);
  const [totalAmount, setTotalAmount] = useState(quantity * unitPrice);
  const [amountPaid, setAmountPaid] = useState(quantity * unitPrice);
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [referenceNo, setReferenceNo] = useState("");
  const [notes, setNotes] = useState("");
  const [syncToFarmBatch, setSyncToFarmBatch] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto calculate total
  const handleQtyPriceChange = (qty: number, price: number) => {
    setQuantity(qty);
    setUnitPrice(price);
    const tot = qty * price;
    setTotalAmount(tot);
    setAmountPaid(tot);
  };

  const balanceDue = Math.max(0, totalAmount - amountPaid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchId) {
      setErrorMsg("Please select an active farm batch.");
      return;
    }
    if (!itemDescription.trim()) {
      setErrorMsg("Please provide an item description.");
      return;
    }
    if (totalAmount <= 0) {
      setErrorMsg("Total amount must be greater than zero.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      await recordTxFn({
        data: {
          passcode,
          contactId: contact.id,
          transactionType,
          batchId,
          transactionDate,
          itemDescription: itemDescription.trim(),
          quantity,
          unit,
          unitPrice,
          totalAmount,
          amountPaid,
          paymentMethod,
          referenceNo: referenceNo.trim() || null,
          notes: notes.trim() || null,
          syncToFarmBatch,
        },
      });

      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to record transaction");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative my-8 w-full max-w-xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="text-base font-black text-[#0F3D24]">
              {isBuyer ? "Record Offload / Bulk Sale" : "Record Supplier Supply"}
            </div>
            <div className="text-xs text-slate-500">
              For: <strong className="text-[#0F3D24]">{contact.contactName}</strong> ({contact.businessName || contact.contactType})
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {errorMsg && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">
              {errorMsg}
            </div>
          )}

          {/* Transaction Type */}
          <div>
            <label className="block font-bold text-[#0F3D24] mb-1">Transaction Nature</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTransactionType(isBuyer ? "sale_to_contact" : "purchase_from_supplier")}
                className={`rounded-xl border p-2.5 font-bold transition ${
                  transactionType === "sale_to_contact" || transactionType === "purchase_from_supplier"
                    ? "border-[#0F3D24] bg-[#0F3D24] text-white shadow-sm"
                    : "border-slate-200 bg-[#FAF9F6] text-slate-700"
                }`}
              >
                {isBuyer ? "Offload / Bird Sale" : "Stock Supply / Delivery"}
              </button>
              <button
                type="button"
                onClick={() => setTransactionType(isBuyer ? "payment_from_contact" : "payment_to_supplier")}
                className={`rounded-xl border p-2.5 font-bold transition ${
                  transactionType === "payment_from_contact" || transactionType === "payment_to_supplier"
                    ? "border-[#0F3D24] bg-[#0F3D24] text-white shadow-sm"
                    : "border-slate-200 bg-[#FAF9F6] text-slate-700"
                }`}
              >
                {isBuyer ? "Debt Payment Remittance" : "Payment Sent to Vendor"}
              </button>
            </div>
          </div>

          {/* Date & Batch */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block font-bold text-[#0F3D24] mb-1">Transaction Date</label>
              <input
                type="date"
                required
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-[#FAF9F6] px-3.5 py-2.5 text-[#0F3D24] outline-none focus:border-[#3F8F3F] focus:bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-[#0F3D24] mb-1">Active Farm Batch *</label>
              <select
                required
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-[#FAF9F6] px-3.5 py-2.5 text-[#0F3D24] outline-none focus:border-[#3F8F3F] focus:bg-white"
              >
                <option value="">Select active batch...</option>
                {activeBatches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.batchName} ({b.batchType} - {b.currentHeadcount} live)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Item Description */}
          <div>
            <label className="block font-bold text-[#0F3D24] mb-1">Item Description *</label>
            <input
              type="text"
              required
              placeholder="e.g. 150 Live Broilers @ ₦3,800/bird (Offload to Relief Market)"
              value={itemDescription}
              onChange={(e) => setItemDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-[#FAF9F6] px-3.5 py-2.5 font-semibold text-[#0F3D24] outline-none focus:border-[#3F8F3F] focus:bg-white"
            />
          </div>

          {/* Quantity, Unit & Price */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block font-bold text-[#0F3D24] mb-1">Quantity</label>
              <NumberField
                min={1}
                value={quantity}
                onValueChange={(n) => handleQtyPriceChange(n ?? 0, unitPrice)}
                className="w-full rounded-xl border border-slate-200 bg-[#FAF9F6] px-3 py-2 text-[#0F3D24]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#0F3D24] mb-1">Unit</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-[#FAF9F6] px-3 py-2 text-[#0F3D24]"
              >
                <option value="birds">birds</option>
                <option value="bags">bags</option>
                <option value="crates">crates</option>
                <option value="kg">kg</option>
                <option value="units">units</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-[#0F3D24] mb-1">Unit Price (₦)</label>
              <NumberField
                allowDecimal
                min={0}
                value={unitPrice}
                onValueChange={(n) => handleQtyPriceChange(quantity, n ?? 0)}
                className="w-full rounded-xl border border-slate-200 bg-[#FAF9F6] px-3 py-2 text-[#0F3D24]"
              />
            </div>
          </div>

          {/* Financial Calculation Bar */}
          <div className="rounded-2xl border border-slate-200 bg-[#FAF9F6] p-4 space-y-3">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-500">Gross Total</div>
                <div className="text-base font-black text-[#0F3D24] tabular-nums">{naira(totalAmount)}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-500">Amount Paid</div>
                <NumberField
                  allowDecimal
                  min={0}
                  value={amountPaid}
                  onValueChange={(n) => setAmountPaid(n ?? 0)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-center font-bold text-emerald-700"
                />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-500">Balance Debt</div>
                <div
                  className={`text-base font-black tabular-nums ${
                    balanceDue > 0 ? "text-rose-700" : "text-emerald-700"
                  }`}
                >
                  {naira(balanceDue)}
                </div>
              </div>
            </div>

            {balanceDue > 0 && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-2 text-center text-[11px] font-bold text-rose-800">
                ⚠ {naira(balanceDue)} will be logged as outstanding debt owed by {contact.contactName}.
              </div>
            )}
          </div>

          {/* Payment Method & Reference */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block font-bold text-[#0F3D24] mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-[#FAF9F6] px-3.5 py-2 text-[#0F3D24]"
              >
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash Handover</option>
                <option value="POS / Card">POS Terminal</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-[#0F3D24] mb-1">Payment Reference / Receipt No</label>
              <input
                type="text"
                placeholder="e.g. TRF-839218, OFFLOAD-14"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-[#FAF9F6] px-3.5 py-2 font-mono text-[#0F3D24]"
              />
            </div>
          </div>

          {/* Batch Sync Checkbox */}
          {batchId && (
            <label className="flex items-center gap-2 text-xs font-semibold text-[#0F3D24] bg-emerald-50/60 border border-emerald-200/60 p-3 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={syncToFarmBatch}
                onChange={(e) => setSyncToFarmBatch(e.target.checked)}
                className="rounded accent-[#0F3D24]"
              />
              <span>
                Auto-sync this {isBuyer ? "sale" : "supply"} to <strong>Farm Batch Finances</strong> (
                {batches.find((b) => b.id === batchId)?.batchName})
              </span>
            </label>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-5 py-2.5 font-bold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-[#0F3D24] px-6 py-2.5 font-black text-white shadow-md hover:bg-[#165232] disabled:opacity-50"
            >
              {submitting ? "Saving Transaction..." : "Save Transaction to Ledger →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal 3: Edit Special Contact ────────────────────────────────────────────

function EditSpecialContactModal({
  passcode,
  contact,
  onClose,
  onSuccess,
}: {
  passcode: string;
  contact: SpecialContact;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const updateFn = useServerFn(adminUpdateSpecialContact);

  const [contactName, setContactName] = useState(contact.contactName);
  const [businessName, setBusinessName] = useState(contact.businessName || "");
  const [contactType, setContactType] = useState<SpecialContactType>(contact.contactType);
  const [phone, setPhone] = useState(contact.phone);
  const [altPhone, setAltPhone] = useState(contact.altPhone || "");
  const [whatsapp, setWhatsapp] = useState(contact.whatsapp || contact.phone);
  const [email, setEmail] = useState(contact.email || "");
  const [locationAddress, setLocationAddress] = useState(contact.locationAddress || "");
  const [preferredPaymentTerms, setPreferredPaymentTerms] = useState(
    contact.preferredPaymentTerms || "Bank Transfer"
  );
  const [status, setStatus] = useState<SpecialContactStatus>(contact.status);
  const [notes, setNotes] = useState(contact.notes || "");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      await updateFn({
        data: {
          passcode,
          contactId: contact.id,
          contactName: contactName.trim(),
          businessName: businessName.trim() || null,
          contactType,
          phone: phone.trim(),
          altPhone: altPhone.trim() || null,
          whatsapp: whatsapp.trim() || phone.trim(),
          email: email.trim() || null,
          locationAddress: locationAddress.trim() || null,
          preferredPaymentTerms: preferredPaymentTerms.trim() || "Bank Transfer",
          status,
          notes: notes.trim() || null,
        },
      });

      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update contact");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative my-8 w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2 text-base font-black text-[#0F3D24]">
            <Pencil size={18} className="text-[#3F8F3F]" /> Edit Special Contact
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {errorMsg && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">
              {errorMsg}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block font-bold text-[#0F3D24] mb-1">Contact Name *</label>
              <input
                type="text"
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-[#FAF9F6] px-3.5 py-2 font-semibold text-[#0F3D24]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#0F3D24] mb-1">Business Name</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-[#FAF9F6] px-3.5 py-2 text-[#0F3D24]"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block font-bold text-[#0F3D24] mb-1">Phone Number *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-[#FAF9F6] px-3.5 py-2 font-mono text-[#0F3D24]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#0F3D24] mb-1">WhatsApp</label>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-[#FAF9F6] px-3.5 py-2 font-mono text-[#0F3D24]"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block font-bold text-[#0F3D24] mb-1">Category</label>
              <select
                value={contactType}
                onChange={(e) => setContactType(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 bg-[#FAF9F6] px-3.5 py-2 text-[#0F3D24]"
              >
                <option value="bulk_buyer">Bulk Buyer</option>
                <option value="offloader">Offloader</option>
                <option value="supplier">Feed / Hatchery Supplier</option>
                <option value="logistics">Logistics / Haulage</option>
                <option value="other">Other Account</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-[#0F3D24] mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 bg-[#FAF9F6] px-3.5 py-2 text-[#0F3D24]"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="blacklisted">Blacklisted / Hold</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#0F3D24] mb-1">Location Address</label>
            <input
              type="text"
              value={locationAddress}
              onChange={(e) => setLocationAddress(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-[#FAF9F6] px-3.5 py-2 text-[#0F3D24]"
            />
          </div>

          <div>
            <label className="block font-bold text-[#0F3D24] mb-1">Payment Terms</label>
            <input
              type="text"
              value={preferredPaymentTerms}
              onChange={(e) => setPreferredPaymentTerms(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-[#FAF9F6] px-3.5 py-2 text-[#0F3D24]"
            />
          </div>

          <div>
            <label className="block font-bold text-[#0F3D24] mb-1">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-[#FAF9F6] px-3.5 py-2 text-[#0F3D24]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-5 py-2.5 font-bold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-[#0F3D24] px-6 py-2.5 font-black text-white shadow-md hover:bg-[#165232] disabled:opacity-50"
            >
              {submitting ? "Saving Changes..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal 4: 1-Click WhatsApp Statement & Reminder ───────────────────────────

function WhatsAppStatementModal({
  contact,
  transactions,
  onClose,
}: {
  contact: SpecialContact;
  transactions: ContactTransaction[];
  onClose: () => void;
}) {
  const isBuyer = contact.contactType === "bulk_buyer" || contact.contactType === "offloader";
  const hasDebt = isBuyer && contact.balanceDue > 0;

  const recentTx = transactions.slice(0, 4);

  const message = [
    `*DIGNITY AGRO FARMS LIMITED · ACCOUNT STATEMENT*`,
    `----------------------------------------`,
    `Hello ${contact.contactName}${contact.businessName ? ` (${contact.businessName})` : ""},`,
    ``,
    isBuyer
      ? `Here is your transaction statement for your wholesale poultry purchases with Dignity Agro Farms:`
      : `Here is your account statement for supplies delivered to Dignity Agro Farms:`,
    ``,
    `*Gross Transactions:* ${naira(contact.totalAmount)}`,
    `*Total Paid / Settled:* ${naira(contact.totalPaid)}`,
    hasDebt
      ? `*OUTSTANDING BALANCE DUE:* ${naira(contact.balanceDue)} ⚠️`
      : `*ACCOUNT STATUS:* Fully Settled (${naira(0)}) ✅`,
    ``,
    recentTx.length > 0 ? `*Recent Transactions:*` : ``,
    ...recentTx.map(
      (t) =>
        `• ${t.transactionDate}: ${t.itemDescription} — ${naira(t.totalAmount)} (Paid: ${naira(
          t.amountPaid
        )})`
    ),
    ``,
    hasDebt
      ? `Kindly arrange payment of the outstanding balance (*${naira(
          contact.balanceDue
        )}*) to our official account:`
      : `Thank you for your ongoing partnership with Dignity Agro Farms!`,
    hasDebt ? `🏦 *Bank:* Moniepoint / Zenith Bank` : ``,
    hasDebt ? `🔢 *Account:* Dignity Agro Farms Ltd` : ``,
    ``,
    `For inquiries, contact management: 081 6709 9492`,
    `_Dignity Agro Farms · Quality, Freshness, Transparency_`,
  ]
    .filter(Boolean)
    .join("\n");

  const whatsappPhone = (contact.whatsapp || contact.phone).replace(/\D/g, "");
  const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`;

  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative my-8 w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-base font-black text-[#0F3D24]">
            <MessageCircle size={18} className="text-[#25D366]" /> WhatsApp Account Statement
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="rounded-2xl bg-[#FAF9F6] border border-slate-200 p-4 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
          {message}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleCopy}
            className="w-full sm:w-auto rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            {copied ? "✓ Copied to Clipboard!" : "Copy Text"}
          </button>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#1ebf59] transition"
          >
            <Send size={14} /> Open in WhatsApp & Send
          </a>
        </div>
      </div>
    </div>
  );
}
