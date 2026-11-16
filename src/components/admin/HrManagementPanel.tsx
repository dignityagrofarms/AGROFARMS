import React, { useState, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Clock,
  FileText,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  DollarSign,
  Search,
  Filter,
  Shield,
  Briefcase,
  FileCheck,
  PlusCircle,
  Loader2,
  Trash2,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Eye,
} from "lucide-react";
import {
  adminListUserAccounts,
  adminCreateUserAccount,
  adminUpdateStaffMember,
  adminDeleteUserAccount,
  adminRecordSuspension,
  adminListSuspensions,
  adminUploadStaffDocument,
  adminListStaffDocuments,
  adminDeleteStaffDocument,
  adminListAttendance,
  adminMarkAttendance,
  staffClockIn,
  parseAdminCredential,
  adminCreatePaymentReceipt,
  adminListPaymentReceipts,
  adminListLeaveRequests,
  adminDecideLeaveRequest,
  type AdminRole,
  type UserAccountItem,
} from "@/lib/orders.functions";
import { NumberField } from "@/components/ui/number-field";

interface HrManagementPanelProps {
  passcode: string;
  role: AdminRole;
}

export function HrManagementPanel({ passcode, role }: HrManagementPanelProps) {
  const qc = useQueryClient();
  const [subTab, setSubTab] = useState<"directory" | "documents" | "suspensions" | "attendance" | "payroll" | "leave">("directory");

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [todayShiftFilter, setTodayShiftFilter] = useState<"all" | "active" | "absent">("all");
  const [attDateFilter, setAttDateFilter] = useState("");
  const [attSearch, setAttSearch] = useState("");

  // Modals
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showSuspensionModal, setShowSuspensionModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [selectedStaffUser, setSelectedStaffUser] = useState<UserAccountItem | null>(null);

  // Form states
  const [newStaff, setNewStaff] = useState({
    username: "",
    passcode: "",
    role: "staff" as AdminRole,
    fullName: "",
    phone: "",
    email: "",
    address: "",
    department: "Farm Operations",
    emergencyContact: "",
    notes: "",
  });

  const [suspensionForm, setSuspensionForm] = useState({
    username: "",
    reason: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    notes: "",
  });

  const [documentForm, setDocumentForm] = useState({
    username: "",
    documentName: "",
    documentType: "contract" as "contract" | "nda" | "guarantor_form" | "id_card" | "other",
    fileUrl: "",
    fileSize: "1.5 MB",
  });

  const [payrollForm, setPayrollForm] = useState({
    username: "",
    monthYear: "October 2026",
    amount: 150000,
    notes: "",
  });

  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [addStaffError, setAddStaffError] = useState<string | null>(null);

  // Server Fn Hooks
  const listStaffFn = useServerFn(adminListUserAccounts);
  const createStaffFn = useServerFn(adminCreateUserAccount);
  const updateStaffFn = useServerFn(adminUpdateStaffMember);
  const deleteStaffFn = useServerFn(adminDeleteUserAccount);
  const recordSuspensionFn = useServerFn(adminRecordSuspension);
  const listSuspensionsFn = useServerFn(adminListSuspensions);
  const uploadDocFn = useServerFn(adminUploadStaffDocument);
  const listDocsFn = useServerFn(adminListStaffDocuments);
  const deleteDocFn = useServerFn(adminDeleteStaffDocument);
  const listAttendanceFn = useServerFn(adminListAttendance);
  const markAttendanceFn = useServerFn(adminMarkAttendance);
  const clockInFn = useServerFn(staffClockIn);
  const createPayrollFn = useServerFn(adminCreatePaymentReceipt);
  const listPayrollFn = useServerFn(adminListPaymentReceipts);
  const listLeaveFn = useServerFn(adminListLeaveRequests);
  const decideLeaveFn = useServerFn(adminDecideLeaveRequest);

  // Queries
  const staffQuery = useQuery({
    queryKey: ["hr-staff-list", passcode],
    queryFn: () => listStaffFn({ data: { passcode } }),
    refetchInterval: 15000,
  });

  const leaveQuery = useQuery({
    queryKey: ["hr-leave-list", passcode],
    queryFn: () => listLeaveFn({ data: { passcode } }),
    enabled: subTab === "leave" || subTab === "directory",
  });

  const decideLeaveMut = useMutation({
    mutationFn: (vars: { requestId: string; decision: "approved" | "rejected" }) =>
      decideLeaveFn({ data: { passcode, requestId: vars.requestId, decision: vars.decision } }),
    onSuccess: () => {
      setActionMsg("Leave request decision recorded and attendance updated!");
      qc.invalidateQueries({ queryKey: ["hr-leave-list"] });
      qc.invalidateQueries({ queryKey: ["hr-attendance-list"] });
      qc.invalidateQueries({ queryKey: ["hr-staff-list"] });
    },
    onError: (err: any) => setActionMsg("Error: " + err.message),
  });

  const suspensionsQuery = useQuery({
    queryKey: ["hr-suspensions-list", passcode],
    queryFn: () => listSuspensionsFn({ data: { passcode } }),
    enabled: subTab === "suspensions" || subTab === "directory",
  });

  const docsQuery = useQuery({
    queryKey: ["hr-docs-list", passcode],
    queryFn: () => listDocsFn({ data: { passcode } }),
    enabled: subTab === "documents" || Boolean(selectedStaffUser),
  });

  const attendanceQuery = useQuery({
    queryKey: ["hr-attendance-list", passcode],
    queryFn: () => listAttendanceFn({ data: { passcode } }),
    enabled: subTab === "attendance" || subTab === "directory",
  });

  const payrollQuery = useQuery({
    queryKey: ["hr-payroll-list", passcode],
    queryFn: () => listPayrollFn({ data: { passcode } }),
    enabled: subTab === "payroll",
  });

  const normalizedNewUsername = newStaff.username.trim().toLowerCase();
  const isDuplicateUsername =
    normalizedNewUsername.length > 0 &&
    (["owner", "admin", "everyone", "system"].includes(normalizedNewUsername) ||
      (staffQuery.data || []).some((s) => s.username.toLowerCase() === normalizedNewUsername));

  // Mutations
  const createStaffMut = useMutation({
    mutationFn: async () => {
      if (isDuplicateUsername) {
        throw new Error(`Username "${normalizedNewUsername}" already exists! Please choose a unique username.`);
      }
      return createStaffFn({
        data: {
          passcode,
          targetUsername: newStaff.username.trim(),
          targetPasscode: newStaff.passcode.trim(),
          targetRole: newStaff.role,
          fullName: newStaff.fullName.trim(),
          phone: newStaff.phone.trim(),
          email: newStaff.email.trim(),
          address: newStaff.address.trim(),
          department: newStaff.department,
          emergencyContact: newStaff.emergencyContact.trim(),
          notes: newStaff.notes.trim(),
        },
      });
    },
    onSuccess: () => {
      setActionMsg("Staff member added successfully!");
      setAddStaffError(null);
      setShowAddStaffModal(false);
      setNewStaff({
        username: "",
        passcode: "",
        role: "staff",
        fullName: "",
        phone: "",
        email: "",
        address: "",
        department: "Farm Operations",
        emergencyContact: "",
        notes: "",
      });
      qc.invalidateQueries({ queryKey: ["hr-staff-list"] });
    },
    onError: (err: any) => {
      setAddStaffError(err.message || "Failed to create account");
      setActionMsg("Error: " + err.message);
    },
  });

  const recordSuspensionMut = useMutation({
    mutationFn: async () => {
      return recordSuspensionFn({
        data: {
          passcode,
          staffUsername: suspensionForm.username,
          reason: suspensionForm.reason,
          startDate: suspensionForm.startDate,
          endDate: suspensionForm.endDate || null,
          notes: suspensionForm.notes,
        },
      });
    },
    onSuccess: () => {
      setActionMsg("Suspension recorded & staff account restricted!");
      setShowSuspensionModal(false);
      qc.invalidateQueries({ queryKey: ["hr-staff-list"] });
      qc.invalidateQueries({ queryKey: ["hr-suspensions-list"] });
    },
    onError: (err: any) => setActionMsg("Error: " + err.message),
  });

  const uploadDocMut = useMutation({
    mutationFn: async () => {
      return uploadDocFn({
        data: {
          passcode,
          targetUsername: documentForm.username,
          documentName: documentForm.documentName,
          documentType: documentForm.documentType,
          fileUrl: documentForm.fileUrl,
          fileSize: documentForm.fileSize,
        },
      });
    },
    onSuccess: () => {
      setActionMsg("Signed document uploaded successfully!");
      setShowDocumentModal(false);
      qc.invalidateQueries({ queryKey: ["hr-docs-list"] });
    },
    onError: (err: any) => setActionMsg("Error: " + err.message),
  });

  const createPayrollMut = useMutation({
    mutationFn: async () => {
      return createPayrollFn({
        data: {
          passcode,
          username: payrollForm.username,
          monthYear: payrollForm.monthYear,
          amount: Number(payrollForm.amount),
          notes: payrollForm.notes,
        },
      });
    },
    onSuccess: () => {
      setActionMsg("Monthly payment receipt created for staff sign-off!");
      setShowPayrollModal(false);
      qc.invalidateQueries({ queryKey: ["hr-payroll-list"] });
    },
    onError: (err: any) => setActionMsg("Error: " + err.message),
  });

  const deleteStaffMut = useMutation({
    mutationFn: (targetUsername: string) =>
      deleteStaffFn({ data: { passcode, targetUsername } }),
    onSuccess: (_res, targetUsername) => {
      setActionMsg(`Account "@${targetUsername}" and its HR records were permanently deleted.`);
      qc.invalidateQueries({ queryKey: ["hr-staff-list"] });
      qc.invalidateQueries({ queryKey: ["admin-user-accounts"] });
      qc.invalidateQueries({ queryKey: ["hr-attendance-list"] });
      if (selectedStaffUser?.username === targetUsername) {
        setSelectedStaffUser(null);
      }
    },
    onError: (err: any) => setActionMsg("Error: " + (err?.message || "Failed to delete staff account.")),
  });

  const staffList = staffQuery.data || [];
  const suspensionsList = suspensionsQuery.data || [];
  const attendanceList = attendanceQuery.data || [];
  const docsList = docsQuery.data || [];
  const payrollList = payrollQuery.data || [];
  const leaveList = leaveQuery.data || [];

  // Metrics & Today Attendance Mapping
  const staffEmployees = staffList.filter((s) => s.role !== "owner");
  const totalStaffCount = staffEmployees.length;
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });

  const todayAttMap = useMemo<Map<string, any>>(() => {
    return new Map(
      attendanceList
        .filter((a: any) => a.attendanceDate === todayStr && a.status === "present")
        .map((a: any) => [String(a.username || "").toLowerCase(), a]),
    );
  }, [attendanceList, todayStr]);

  const presentTodayCount = staffEmployees.filter((s: any) => todayAttMap.has(s.username.toLowerCase())).length;
  const absentTodayCount = Math.max(0, totalStaffCount - presentTodayCount);
  const suspendedCount = staffEmployees.filter((s: any) => s.status === "suspended").length;
  const pendingPayrollCount = payrollList.filter((p: any) => p.status === "pending_signature").length;
  const pendingLeaveCount = leaveList.filter((l: any) => l.status === "pending").length;
  const attendancePercentage = totalStaffCount > 0 ? Math.round((presentTodayCount / totalStaffCount) * 100) : 100;

  const currentUsername = useMemo(() => {
    try {
      const parsed = parseAdminCredential(passcode);
      return (parsed.username || "").toLowerCase();
    } catch {
      return "";
    }
  }, [passcode]);

  const myClockInMut = useMutation({
    mutationFn: () =>
      clockInFn({
        data: {
          passcode,
          username: currentUsername || (role === "manager" ? "manager" : "staff"),
          notes: "Clocked in via HR Management Workspace",
        },
      }),
    onSuccess: async () => {
      setActionMsg("Successfully clocked in for today's shift!");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["financial-access"] }),
        qc.invalidateQueries({ queryKey: ["hr-attendance-list"] }),
        qc.invalidateQueries({ queryKey: ["staff-my-attendance"] }),
      ]);
    },
    onError: (err: any) => {
      setActionMsg("Error clocking in: " + (err?.message || "Please retry."));
    },
  });

  const myTodayAtt = todayAttMap.get(currentUsername);

  // Filtered Directory
  const filteredStaff = staffList.filter((s) => {
    const matchesSearch =
      (s.fullName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.phone || "").includes(searchTerm);
    const matchesDept = selectedDept === "all" || s.department === selectedDept;
    const isClockedIn = todayAttMap.has(s.username.toLowerCase());
    const matchesShift =
      todayShiftFilter === "all"
        ? true
        : todayShiftFilter === "active"
          ? isClockedIn
          : !isClockedIn && s.role !== "owner";
    return matchesSearch && matchesDept && matchesShift;
  });

  const isOwner = role === "owner";

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero */}
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/10 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#3F8F3F]">
              <Users size={20} />
              <span className="text-xs font-semibold uppercase tracking-widest">HR Management Workspace</span>
            </div>
            <h2 className="mt-1 text-2xl font-extrabold text-[#0F3D24]">Staff & Human Resources</h2>
            <p className="mt-1 text-xs text-[#0F3D24]/70 max-w-xl">
              Manage team members, extended staff profiles, signed contracts, suspensions, daily attendance register, and monthly payment receipts.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isOwner ? (
              <button
                onClick={() => setShowAddStaffModal(true)}
                className="flex items-center gap-2 rounded-full bg-[#0F3D24] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#134a2c] transition"
              >
                <UserPlus size={16} /> Add Staff Member
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3.5 py-1.5 text-xs font-bold text-amber-900 ring-1 ring-amber-300">
                <Shield size={14} /> Manager (Read-Only)
              </span>
            )}
          </div>
        </div>

        {/* Manager View-Only Banner */}
        {!isOwner && (
          <div className="mt-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 p-4 text-xs text-amber-950 flex items-start gap-3 shadow-xs">
            <Shield size={18} className="text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold uppercase tracking-wider block text-amber-900">
                Manager View (View-Only Mode)
              </span>
              <p className="mt-0.5 text-amber-800 leading-relaxed">
                You have permission to inspect all staff profiles, signed contracts, attendance logs, disciplinary records, and monthly salary payment vouchers. Adding, updating, or deleting staff, uploading employment contracts, recording suspensions, and authorizing payroll remain restricted to the Farm Owner.
              </p>
            </div>
          </div>
        )}

        {/* Global Notifications Message */}
        {actionMsg && (
          <div className="mt-4 rounded-xl bg-[#3F8F3F]/10 p-3 text-xs font-semibold text-[#0F3D24] flex items-center justify-between ring-1 ring-[#3F8F3F]/20">
            <span>{actionMsg}</span>
            <button onClick={() => setActionMsg(null)} className="text-[#0F3D24]/60 hover:text-[#0F3D24]">Dismiss</button>
          </div>
        )}

        {/* HR Metric Cards */}
        <div className="mt-6 grid gap-4 grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-[#F7F5F0] p-4 ring-1 ring-[#0F3D24]/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#0F3D24]/70">Total Staff</span>
              <div className="h-8 w-8 rounded-full bg-[#3F8F3F]/15 flex items-center justify-center text-[#3F8F3F]">
                <Users size={18} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black text-[#0F3D24]">{totalStaffCount}</p>
            <span className="text-[10px] text-[#0F3D24]/60 font-medium">Active farm employees</span>
          </div>

          <button
            type="button"
            onClick={() => setSubTab("attendance")}
            className="rounded-2xl bg-[#F7F5F0] p-4 ring-1 ring-[#0F3D24]/5 text-left hover:bg-emerald-50/70 hover:ring-emerald-300 transition group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#0F3D24]/70 group-hover:text-emerald-900">
                Present Today
              </span>
              <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                <UserCheck size={18} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black text-[#0F3D24]">
              {presentTodayCount} <span className="text-sm font-semibold text-[#0F3D24]/60">/ {totalStaffCount}</span>
            </p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-emerald-700 font-bold">
                {attendancePercentage}% attendance rate
              </span>
              <span className="text-[10px] font-bold text-[#3F8F3F] group-hover:underline flex items-center gap-0.5">
                View Log <ChevronRight size={11} />
              </span>
            </div>
          </button>

          <div className="rounded-2xl bg-[#F7F5F0] p-4 ring-1 ring-[#0F3D24]/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#0F3D24]/70">Suspended / Inactive</span>
              <div className="h-8 w-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-700">
                <UserX size={18} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black text-[#0F3D24]">{suspendedCount}</p>
            <span className="text-[10px] text-rose-700 font-bold">Access restricted</span>
          </div>

          <div className="rounded-2xl bg-[#F7F5F0] p-4 ring-1 ring-[#0F3D24]/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#0F3D24]/70">Pending Payroll Sign</span>
              <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                <FileCheck size={18} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black text-[#0F3D24]">{pendingPayrollCount}</p>
            <span className="text-[10px] text-amber-700 font-bold">Awaiting receipt sign</span>
          </div>
        </div>

        {/* Sub Navigation Bar */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#0F3D24]/10 pb-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSubTab("directory")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                subTab === "directory" ? "bg-[#0F3D24] text-white shadow-sm" : "bg-[#F7F5F0] text-[#0F3D24]/70 hover:bg-[#0F3D24]/10"
              }`}
            >
              <Users size={14} /> Staff Directory ({totalStaffCount})
            </button>
            <button
              onClick={() => setSubTab("documents")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                subTab === "documents" ? "bg-[#0F3D24] text-white shadow-sm" : "bg-[#F7F5F0] text-[#0F3D24]/70 hover:bg-[#0F3D24]/10"
              }`}
            >
              <FileText size={14} /> Signed Documents ({docsList.length})
            </button>
            <button
              onClick={() => setSubTab("suspensions")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                subTab === "suspensions" ? "bg-[#0F3D24] text-white shadow-sm" : "bg-[#F7F5F0] text-[#0F3D24]/70 hover:bg-[#0F3D24]/10"
              }`}
            >
              <AlertTriangle size={14} /> Suspensions Register ({suspensionsList.length})
            </button>
            <button
              onClick={() => setSubTab("attendance")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                subTab === "attendance" ? "bg-[#0F3D24] text-white shadow-sm" : "bg-[#F7F5F0] text-[#0F3D24]/70 hover:bg-[#0F3D24]/10"
              }`}
            >
              <Calendar size={14} /> Attendance Register
            </button>
            <button
              onClick={() => setSubTab("payroll")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                subTab === "payroll" ? "bg-[#0F3D24] text-white shadow-sm" : "bg-[#F7F5F0] text-[#0F3D24]/70 hover:bg-[#0F3D24]/10"
              }`}
            >
              <DollarSign size={14} /> Monthly Payroll Receipts
            </button>
            <button
              onClick={() => setSubTab("leave")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                subTab === "leave" ? "bg-[#0F3D24] text-white shadow-sm" : "bg-[#F7F5F0] text-[#0F3D24]/70 hover:bg-[#0F3D24]/10"
              }`}
            >
              <Calendar size={14} /> Leave Requests ({leaveList.length}) {pendingLeaveCount > 0 && <span className="rounded-full bg-amber-500 text-white px-1.5 py-0.2 text-[9px] font-extrabold">{pendingLeaveCount}</span>}
            </button>
          </div>

          {/* Personal Shift Status & Quick Clock-In for Manager / Staff */}
          {role !== "owner" && (
            <div className="flex items-center gap-2">
              {myTodayAtt ? (
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-100 border border-emerald-300 px-3 py-1.5 text-xs font-black text-emerald-900 shadow-xs">
                  <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                  Your Shift: Active {myTodayAtt.clockInTime ? `· In at ${new Date(myTodayAtt.clockInTime).toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit" })}` : ""}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => myClockInMut.mutate()}
                  disabled={myClockInMut.isPending}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-1.5 text-xs font-black text-white hover:bg-emerald-800 transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {myClockInMut.isPending ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Clock size={13} />
                  )}
                  Clock In for Today
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SUB TAB CONTENT */}

      {/* 1. Staff Directory Sub-Tab */}
      {subTab === "directory" && (
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0F3D24]/50" />
              <input
                type="text"
                placeholder="Search staff by name, username or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-2xl bg-[#F7F5F0] pl-9 pr-4 py-2 text-xs font-medium text-[#0F3D24] placeholder-[#0F3D24]/40 focus:outline-none focus:ring-2 focus:ring-[#3F8F3F]"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#0F3D24]/70">Department:</span>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="rounded-2xl bg-[#F7F5F0] px-3 py-2 text-xs font-semibold text-[#0F3D24] border-none focus:ring-2 focus:ring-[#3F8F3F]"
              >
                <option value="all">All Departments</option>
                <option value="Farm Operations">Farm Operations</option>
                <option value="Stores">Stores</option>
                <option value="Logistics">Logistics</option>
                <option value="Security">Security</option>
                <option value="Management">Management</option>
              </select>
            </div>
          </div>

          {/* Quick Shift Attendance Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#0F3D24]/10">
            <span className="text-[11px] font-bold text-[#0F3D24]/70 mr-1">Today&apos;s Shift:</span>
            <button
              type="button"
              onClick={() => setTodayShiftFilter("all")}
              className={`rounded-full px-3 py-1 text-xs font-bold transition cursor-pointer ${
                todayShiftFilter === "all"
                  ? "bg-[#0F3D24] text-white shadow-xs"
                  : "bg-[#F7F5F0] text-[#0F3D24]/70 hover:bg-[#0F3D24]/10"
              }`}
            >
              All Team ({staffList.length})
            </button>
            <button
              type="button"
              onClick={() => setTodayShiftFilter("active")}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition cursor-pointer ${
                todayShiftFilter === "active"
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Active / Clocked In ({presentTodayCount})
            </button>
            <button
              type="button"
              onClick={() => setTodayShiftFilter("absent")}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition cursor-pointer ${
                todayShiftFilter === "absent"
                  ? "bg-amber-700 text-white shadow-xs"
                  : "bg-amber-50 text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              Not Clocked In ({absentTodayCount})
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#0F3D24]">
              <thead className="bg-[#F7F5F0] text-[10px] font-extrabold uppercase tracking-wider text-[#0F3D24]/60">
                <tr>
                  <th className="p-3">Staff Name / Username</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Phone &amp; Address</th>
                  <th className="p-3">Today&apos;s Shift</th>
                  <th className="p-3">Account Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0F3D24]/5 font-medium">
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-xs text-[#0F3D24]/60">
                      No staff members match the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((staff) => (
                  <tr key={staff.id} className="hover:bg-[#F7F5F0]/50 transition">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-[#0F3D24]/10 text-[#0F3D24] font-black flex items-center justify-center text-sm">
                          {(staff.fullName || staff.username)[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-[#0F3D24]">{staff.fullName || staff.username}</p>
                          <p className="text-[10px] font-mono text-[#0F3D24]/60">@{staff.username} {staff.email ? `· ${staff.email}` : ""}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="capitalize font-semibold rounded-full bg-[#0F3D24]/10 text-[#0F3D24] px-2.5 py-1 text-[10px]">
                        {staff.role}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-[#0F3D24]/80">{staff.department || "Farm Operations"}</td>
                    <td className="p-3">
                      <p className="font-mono text-xs">{staff.phone || "No Phone"}</p>
                      <p className="text-[10px] text-[#0F3D24]/60 truncate max-w-[150px]">{staff.address || "Owerri, Imo State"}</p>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {staff.role === "owner" ? (
                        <span className="text-[10px] font-bold text-[#0F3D24]/40 uppercase tracking-wider">
                          Owner (Exempt)
                        </span>
                      ) : todayAttMap.has(staff.username.toLowerCase()) ? (
                        (() => {
                          const att: any = todayAttMap.get(staff.username.toLowerCase());
                          const timeStr = att?.clockInTime
                            ? new Date(att.clockInTime).toLocaleTimeString("en-NG", {
                                timeZone: "Africa/Lagos",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : null;
                          return (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black text-emerald-900 ring-1 ring-emerald-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                              Active {timeStr ? `· In at ${timeStr}` : "· Clocked In"}
                            </span>
                          );
                        })()
                      ) : staff.status === "on_leave" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold text-blue-800 ring-1 ring-blue-300">
                          On Leave
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-900 ring-1 ring-amber-300">
                          Not Clocked In
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${
                          staff.status === "suspended"
                            ? "bg-rose-100 text-rose-700"
                            : staff.status === "on_leave"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {staff.status === "suspended" && <UserX size={12} />}
                        {staff.status === "active" && <UserCheck size={12} />}
                        {staff.status || "active"}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {isOwner ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedStaffUser(staff)}
                            title="View Staff Profile"
                            className="rounded-full bg-[#F7F5F0] p-1.5 text-[#0F3D24] hover:bg-[#0F3D24] hover:text-white transition"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => {
                              setDocumentForm((prev) => ({ ...prev, username: staff.username }));
                              setShowDocumentModal(true);
                            }}
                            title="Upload Signed Document"
                            className="rounded-full bg-[#F7F5F0] p-1.5 text-[#0F3D24] hover:bg-[#3F8F3F] hover:text-white transition"
                          >
                            <Upload size={14} />
                          </button>
                          <button
                            onClick={() => {
                              setSuspensionForm((prev) => ({ ...prev, username: staff.username }));
                              setShowSuspensionModal(true);
                            }}
                            title="Record Suspension"
                            className="rounded-full bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-600 hover:text-white transition"
                          >
                            <AlertTriangle size={14} />
                          </button>
                          <button
                            onClick={() => {
                              setPayrollForm((prev) => ({ ...prev, username: staff.username }));
                              setShowPayrollModal(true);
                            }}
                            title="Generate Monthly Salary Receipt"
                            className="rounded-full bg-amber-50 p-1.5 text-amber-700 hover:bg-amber-600 hover:text-white transition"
                          >
                            <DollarSign size={14} />
                          </button>
                          {staff.username !== "owner" && staff.username !== "admin" && (
                            <button
                              disabled={deleteStaffMut.isPending}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Permanently delete staff account "${staff.fullName || staff.username}" (@${staff.username})? This removes the account and its attendance/HR records from the database so it can be cleanly recreated. This cannot be undone.`,
                                  )
                                ) {
                                  deleteStaffMut.mutate(staff.username);
                                }
                              }}
                              title="Permanently Delete Staff Account"
                              className="rounded-full bg-red-50 p-1.5 text-red-600 hover:bg-red-600 hover:text-white disabled:opacity-50 transition"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => setSelectedStaffUser(staff)}
                          className="inline-flex items-center gap-1 rounded-full bg-[#F7F5F0] px-3 py-1 text-xs font-bold text-[#0F3D24] hover:bg-[#0F3D24] hover:text-white transition"
                        >
                          <Eye size={13} /> View Profile
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Signed Documents Sub-Tab */}
      {subTab === "documents" && (
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#0F3D24] flex items-center gap-2">
              <FileText size={18} className="text-[#3F8F3F]" /> Staff Signed Documents Vault
            </h3>
            {isOwner && (
              <button
                onClick={() => setShowDocumentModal(true)}
                className="flex items-center gap-1.5 rounded-full bg-[#0F3D24] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#134a2c] transition"
              >
                <Upload size={14} /> Upload Signed Document
              </button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {docsList.map((doc: any) => (
              <div key={doc.id} className="rounded-2xl bg-[#F7F5F0] p-4 ring-1 ring-[#0F3D24]/10 flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-[#0F3D24]/10 px-2 py-0.5 text-[10px] font-bold text-[#0F3D24] uppercase">
                      {doc.documentType}
                    </span>
                    <span className="text-[10px] text-[#0F3D24]/60">{new Date(doc.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h4 className="mt-2 text-sm font-bold text-[#0F3D24] truncate">{doc.documentName}</h4>
                  <p className="text-xs text-[#0F3D24]/70 font-mono mt-1">Staff: @{doc.username}</p>
                </div>
                <div className="flex items-center justify-between border-t border-[#0F3D24]/5 pt-3">
                  <span className="text-[10px] font-bold text-[#0F3D24]/60">{doc.fileSize || "1.2 MB"}</span>
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-[#0F3D24] ring-1 ring-[#0F3D24]/15 hover:bg-[#3F8F3F] hover:text-white transition"
                  >
                    <ExternalLink size={12} /> View Document
                  </a>
                </div>
              </div>
            ))}

            {docsList.length === 0 && (
              <div className="col-span-full rounded-2xl bg-[#F7F5F0] p-8 text-center text-xs text-[#0F3D24]/60">
                No signed employee documents uploaded yet. Click "Upload Signed Document" to add employment contracts, NDAs, or guarantor forms.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Suspensions Sub-Tab */}
      {subTab === "suspensions" && (
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#0F3D24] flex items-center gap-2">
              <AlertTriangle size={18} className="text-rose-600" /> Disciplinary & Suspension Register
            </h3>
            {isOwner && (
              <button
                onClick={() => setShowSuspensionModal(true)}
                className="flex items-center gap-1.5 rounded-full bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 transition"
              >
                <AlertTriangle size={14} /> Record New Suspension
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#0F3D24]">
              <thead className="bg-[#F7F5F0] text-[10px] font-extrabold uppercase tracking-wider text-[#0F3D24]/60">
                <tr>
                  <th className="p-3">Staff Username</th>
                  <th className="p-3">Reason for Suspension</th>
                  <th className="p-3">Start Date</th>
                  <th className="p-3">End Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0F3D24]/5 font-medium">
                {suspensionsList.map((sup: any) => (
                  <tr key={sup.id} className="hover:bg-rose-50/40 transition">
                    <td className="p-3 font-bold text-rose-900">@{sup.staffUsername}</td>
                    <td className="p-3">{sup.reason}</td>
                    <td className="p-3 font-mono">{sup.startDate}</td>
                    <td className="p-3 font-mono">{sup.endDate || "Indefinite"}</td>
                    <td className="p-3">
                      <span className="rounded-full bg-rose-100 text-rose-800 px-2.5 py-1 text-[10px] font-extrabold uppercase">
                        {sup.status}
                      </span>
                    </td>
                    <td className="p-3 text-[#0F3D24]/70">{sup.recordedBy}</td>
                  </tr>
                ))}
                {suspensionsList.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-xs text-[#0F3D24]/60">
                      No disciplinary suspensions recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Attendance Register Sub-Tab */}
      {subTab === "attendance" && (() => {
        const staffAccountsOnly = staffList.filter((s) => s.role !== "owner");
        const todayAttMap = new Map(
          attendanceList
            .filter((a: any) => a.attendanceDate === todayStr)
            .map((a: any) => [String(a.username || "").toLowerCase(), a]),
        );
        const filteredAttendance = attendanceList.filter((att: any) => {
          if (attDateFilter && att.attendanceDate !== attDateFilter) return false;
          if (attSearch.trim()) {
            const q = attSearch.toLowerCase();
            return (
              String(att.username || "").toLowerCase().includes(q) ||
              String(att.fullName || "").toLowerCase().includes(q) ||
              String(att.notes || "").toLowerCase().includes(q)
            );
          }
          return true;
        });

        return (
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/10 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-[#0F3D24] flex items-center gap-2">
                <Calendar size={18} className="text-[#3F8F3F]" /> Staff Daily Attendance &amp; Clock-In Log
              </h3>
              <p className="text-xs text-[#0F3D24]/65">
                Live clock-in register showing who clocked in, attendance date, and exact clock-in timestamp.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {role !== "owner" && !myTodayAtt && (
                <button
                  type="button"
                  onClick={() => myClockInMut.mutate()}
                  disabled={myClockInMut.isPending}
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {myClockInMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <Clock size={13} />}
                  Clock In to Your Shift
                </button>
              )}
              <span className="rounded-full bg-[#F7F5F0] px-3 py-1 text-xs font-bold text-[#0F3D24]">
                Today (Lagos): {todayStr}
              </span>
            </div>
          </div>

          {staffAccountsOnly.length > 0 && (
            <div className="rounded-2xl border border-[#0F3D24]/10 bg-[#F7F5F0]/60 p-4 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0F3D24]/70">
                  Today&apos;s Staff Shift Clock-Ins
                </span>
                <span className="text-xs font-bold text-emerald-800">
                  {staffAccountsOnly.filter((s) => todayAttMap.has(s.username.toLowerCase())).length} of{" "}
                  {staffAccountsOnly.length} clocked in today
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {staffAccountsOnly.map((s) => {
                  const rec: any = todayAttMap.get(s.username.toLowerCase());
                  return (
                    <div
                      key={s.id}
                      className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs ${
                        rec
                          ? "border-emerald-200 bg-emerald-50/70 text-emerald-950"
                          : "border-amber-200 bg-amber-50/70 text-amber-950"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="font-bold truncate">{s.fullName || s.username}</p>
                        <p className="text-[10px] font-mono opacity-75 truncate">@{s.username}</p>
                      </div>
                      {rec ? (
                        <span className="shrink-0 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-extrabold text-white">
                          {rec.clockInTime
                            ? new Date(rec.clockInTime).toLocaleTimeString("en-NG", {
                                timeZone: "Africa/Lagos",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Clocked In"}
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-amber-200 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-950">
                          Not Clocked In
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-2.5 text-[#0F3D24]/40" />
              <input
                type="text"
                value={attSearch}
                onChange={(e) => setAttSearch(e.target.value)}
                placeholder="Search by staff name, @username, or note..."
                className="w-full rounded-xl bg-[#F7F5F0] pl-8 pr-3 py-2 text-xs font-medium text-[#0F3D24] outline-none focus:ring-2 focus:ring-[#3F8F3F]"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setAttDateFilter("")}
                className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                  attDateFilter === ""
                    ? "bg-[#0F3D24] text-white"
                    : "bg-[#F7F5F0] text-[#0F3D24]/70 hover:bg-[#0F3D24]/10"
                }`}
              >
                All Dates
              </button>
              <button
                type="button"
                onClick={() => setAttDateFilter(todayStr)}
                className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                  attDateFilter === todayStr
                    ? "bg-[#0F3D24] text-white"
                    : "bg-[#F7F5F0] text-[#0F3D24]/70 hover:bg-[#0F3D24]/10"
                }`}
              >
                Today Only
              </button>
              <input
                type="date"
                value={attDateFilter}
                onChange={(e) => setAttDateFilter(e.target.value)}
                className="rounded-xl border border-[#0F3D24]/15 bg-white px-3 py-1.5 text-xs font-semibold text-[#0F3D24] outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#0F3D24]">
              <thead className="bg-[#F7F5F0] text-[10px] font-extrabold uppercase tracking-wider text-[#0F3D24]/60">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Staff Member</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Exact Clock-In Timestamp</th>
                  <th className="p-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0F3D24]/5 font-medium">
                {filteredAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-xs text-[#0F3D24]/60">
                      No attendance clock-ins found matching this filter.
                    </td>
                  </tr>
                ) : (
                  filteredAttendance.map((att: any) => (
                    <tr key={att.id} className="hover:bg-[#F7F5F0]/50 transition">
                      <td className="p-3 font-mono font-bold text-[#0F3D24] whitespace-nowrap">
                        {att.attendanceDate}
                      </td>
                      <td className="p-3">
                        <p className="font-bold text-[#0F3D24]">{att.fullName || att.username}</p>
                        <p className="text-[10px] font-mono text-[#0F3D24]/60">@{att.username}</p>
                      </td>
                      <td className="p-3">
                        <span className="capitalize rounded-full bg-[#0F3D24]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#0F3D24]">
                          {att.role || "staff"}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${
                            att.status === "present"
                              ? "bg-emerald-100 text-emerald-800"
                              : att.status === "late"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {att.status}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[#0F3D24] whitespace-nowrap">
                        {att.clockInTime
                          ? new Date(att.clockInTime).toLocaleString("en-NG", {
                              timeZone: "Africa/Lagos",
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })
                          : "N/A"}
                      </td>
                      <td className="p-3 text-[#0F3D24]/70">{att.notes || "Recorded"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        );
      })()}

      {/* 5. Payroll Receipts Sub-Tab */}
      {subTab === "payroll" && (
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#0F3D24] flex items-center gap-2">
              <DollarSign size={18} className="text-[#3F8F3F]" /> Monthly Payment Receipts Register
            </h3>
            {isOwner && (
              <button
                onClick={() => setShowPayrollModal(true)}
                className="flex items-center gap-1.5 rounded-full bg-[#0F3D24] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#134a2c] transition"
              >
                <PlusCircle size={14} /> Create Salary Payment Receipt
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#0F3D24]">
              <thead className="bg-[#F7F5F0] text-[10px] font-extrabold uppercase tracking-wider text-[#0F3D24]/60">
                <tr>
                  <th className="p-3">Staff</th>
                  <th className="p-3">Month / Period</th>
                  <th className="p-3">Amount (₦)</th>
                  <th className="p-3">Payment Date</th>
                  <th className="p-3">Staff Signature Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0F3D24]/5 font-medium">
                {payrollList.map((pay: any) => (
                  <tr key={pay.id} className="hover:bg-[#F7F5F0]/50 transition">
                    <td className="p-3 font-bold text-[#0F3D24]">@{pay.username}</td>
                    <td className="p-3 font-semibold">{pay.monthYear}</td>
                    <td className="p-3 font-mono font-bold text-[#3F8F3F]">₦{pay.amount.toLocaleString()}</td>
                    <td className="p-3 font-mono">{pay.paymentDate}</td>
                    <td className="p-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${
                          pay.status === "signed"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {pay.status === "signed" ? "Signed & Acknowledged" : "Pending Signature"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Leave Requests Sub-Tab */}
      {subTab === "leave" && (
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#0F3D24] flex items-center gap-2">
              <Calendar size={18} className="text-[#3F8F3F]" /> Employee Leave Requests & Approvals
            </h3>
            <span className="text-xs font-semibold text-[#0F3D24]/70">
              {pendingLeaveCount} pending approvals
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#0F3D24]">
              <thead className="bg-[#F7F5F0] text-[10px] font-extrabold uppercase tracking-wider text-[#0F3D24]/60">
                <tr>
                  <th className="p-3">Staff</th>
                  <th className="p-3">Leave Type</th>
                  <th className="p-3">Duration (Dates)</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0F3D24]/5 font-medium">
                {leaveList.map((req: any) => (
                  <tr key={req.id} className="hover:bg-[#F7F5F0]/50 transition">
                    <td className="p-3 font-bold text-[#0F3D24]">@{req.username}</td>
                    <td className="p-3">
                      <span className="rounded-full bg-[#0F3D24]/10 px-2.5 py-1 text-[10px] font-extrabold uppercase text-[#0F3D24]">
                        {req.leaveType} Leave
                      </span>
                    </td>
                    <td className="p-3 font-mono">
                      {req.startDate} → {req.endDate}
                    </td>
                    <td className="p-3 max-w-[200px] truncate">{req.reason}</td>
                    <td className="p-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${
                          req.status === "approved"
                            ? "bg-emerald-100 text-emerald-800"
                            : req.status === "rejected"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {req.status === "pending" ? (
                        isOwner ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => decideLeaveMut.mutate({ requestId: req.id, decision: "approved" })}
                              disabled={decideLeaveMut.isPending}
                              className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => decideLeaveMut.mutate({ requestId: req.id, decision: "rejected" })}
                              disabled={decideLeaveMut.isPending}
                              className="rounded-full bg-rose-50 px-3 py-1 text-[11px] font-bold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100 transition"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-800 ring-1 ring-amber-200">
                            Pending Owner Decision
                          </span>
                        )
                      ) : (
                        <span className="text-[10px] text-[#0F3D24]/50">Reviewed by {req.reviewedBy || "HR"}</span>
                      )}
                    </td>
                  </tr>
                ))}
                {leaveList.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-xs text-[#0F3D24]/60">
                      No leave requests submitted yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODALS */}

      {/* 0. Staff Profile View Modal */}
      {selectedStaffUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#0F3D24]/10 pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[#0F3D24] text-white font-black flex items-center justify-center text-base">
                  {(selectedStaffUser.fullName || selectedStaffUser.username)[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0F3D24]">{selectedStaffUser.fullName || selectedStaffUser.username}</h3>
                  <span className="text-xs text-[#0F3D24]/60 font-mono">@{selectedStaffUser.username} · {selectedStaffUser.role}</span>
                </div>
              </div>
              <button onClick={() => setSelectedStaffUser(null)} className="text-[#0F3D24]/60 hover:text-[#0F3D24] p-1 rounded-lg">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-[#F7F5F0] p-4 rounded-2xl">
              <div>
                <span className="font-extrabold uppercase text-[10px] text-[#0F3D24]/60 block">Department</span>
                <span className="font-bold text-[#0F3D24]">{selectedStaffUser.department || "Farm Operations"}</span>
              </div>
              <div>
                <span className="font-extrabold uppercase text-[10px] text-[#0F3D24]/60 block">Employment Status</span>
                <span className="font-bold capitalize text-emerald-800">{selectedStaffUser.status || "Active"}</span>
              </div>
              <div>
                <span className="font-extrabold uppercase text-[10px] text-[#0F3D24]/60 block">Phone Contact</span>
                <span className="font-mono text-[#0F3D24]">{selectedStaffUser.phone || "Not recorded"}</span>
              </div>
              <div>
                <span className="font-extrabold uppercase text-[10px] text-[#0F3D24]/60 block">Email Address</span>
                <span className="text-[#0F3D24] truncate block">{selectedStaffUser.email || "Not recorded"}</span>
              </div>
              <div className="col-span-2">
                <span className="font-extrabold uppercase text-[10px] text-[#0F3D24]/60 block">Residential Address</span>
                <span className="text-[#0F3D24]">{selectedStaffUser.address || "Owerri, Imo State"}</span>
              </div>
              <div className="col-span-2">
                <span className="font-extrabold uppercase text-[10px] text-[#0F3D24]/60 block">Emergency Next of Kin</span>
                <span className="text-[#0F3D24]">{selectedStaffUser.emergencyContact || "Not recorded"}</span>
              </div>
              {selectedStaffUser.notes && (
                <div className="col-span-2">
                  <span className="font-extrabold uppercase text-[10px] text-[#0F3D24]/60 block">HR Internal Notes</span>
                  <p className="text-[#0F3D24]/80 italic">{selectedStaffUser.notes}</p>
                </div>
              )}
            </div>

            {/* Attached signed contracts */}
            <div className="space-y-2 pt-2 border-t border-[#0F3D24]/10">
              <span className="text-xs font-bold text-[#0F3D24] block">Attached Contract Documents</span>
              {docsList.filter((d: any) => d.username === selectedStaffUser.username).length > 0 ? (
                <div className="space-y-1.5">
                  {docsList.filter((d: any) => d.username === selectedStaffUser.username).map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between bg-[#F7F5F0] p-2.5 rounded-xl text-xs">
                      <div>
                        <span className="font-bold text-[#0F3D24] block">{doc.documentName}</span>
                        <span className="text-[10px] text-[#0F3D24]/60">{doc.documentType} · {doc.fileSize}</span>
                      </div>
                      <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-[#3F8F3F] underline">View</a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#0F3D24]/50 italic">No documents attached for this employee.</p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedStaffUser(null)}
                className="rounded-full bg-[#0F3D24] px-5 py-2 text-xs font-bold text-white hover:bg-[#134a2c] transition"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Add Staff Modal */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#0F3D24]/10 pb-3">
              <h3 className="text-lg font-bold text-[#0F3D24] flex items-center gap-2">
                <UserPlus size={18} className="text-[#3F8F3F]" /> Create New Staff Profile
              </h3>
              <button onClick={() => setShowAddStaffModal(false)} className="text-[#0F3D24]/60 hover:text-[#0F3D24]">✕</button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div>
                <label className="block font-bold text-[#0F3D24] mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Chukwu Nwadi"
                  value={newStaff.fullName}
                  onChange={(e) => setNewStaff({ ...newStaff, fullName: e.target.value })}
                  className="w-full rounded-xl bg-[#F7F5F0] p-2.5 font-medium text-[#0F3D24] focus:outline-none focus:ring-2 focus:ring-[#3F8F3F]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#0F3D24] mb-1">Login Username</label>
                <input
                  type="text"
                  placeholder="e.g. cnwadi"
                  value={newStaff.username}
                  onChange={(e) => {
                    setNewStaff({ ...newStaff, username: e.target.value });
                    setAddStaffError(null);
                  }}
                  className={`w-full rounded-xl bg-[#F7F5F0] p-2.5 font-medium text-[#0F3D24] focus:outline-none focus:ring-2 ${
                    isDuplicateUsername ? "ring-2 ring-rose-500 bg-rose-50/50" : "focus:ring-[#3F8F3F]"
                  }`}
                />
                {isDuplicateUsername && (
                  <p className="mt-1 text-[11px] font-bold text-rose-600">
                    Username "{normalizedNewUsername}" already exists! Please choose another username.
                  </p>
                )}
              </div>

              <div>
                <label className="block font-bold text-[#0F3D24] mb-1">Passcode / Password</label>
                <input
                  type="password"
                  placeholder="At least 6 characters"
                  value={newStaff.passcode}
                  onChange={(e) => setNewStaff({ ...newStaff, passcode: e.target.value })}
                  className="w-full rounded-xl bg-[#F7F5F0] p-2.5 font-medium text-[#0F3D24] focus:outline-none focus:ring-2 focus:ring-[#3F8F3F]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#0F3D24] mb-1">Role & Access Level</label>
                <select
                  value={newStaff.role}
                  onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value as AdminRole })}
                  className="w-full rounded-xl bg-[#F7F5F0] p-2.5 font-semibold text-[#0F3D24] focus:outline-none focus:ring-2 focus:ring-[#3F8F3F]"
                >
                  <option value="staff">Staff (Operational Access Only)</option>
                  <option value="manager">Manager (Operational Overview, Financials Masked)</option>
                  <option value="owner">Owner (Full Access & Financial Controls)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#0F3D24] mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. 0803 123 4567"
                  value={newStaff.phone}
                  onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                  className="w-full rounded-xl bg-[#F7F5F0] p-2.5 font-medium text-[#0F3D24] focus:outline-none focus:ring-2 focus:ring-[#3F8F3F]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#0F3D24] mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="staff@dignityagrofarms.com"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                  className="w-full rounded-xl bg-[#F7F5F0] p-2.5 font-medium text-[#0F3D24] focus:outline-none focus:ring-2 focus:ring-[#3F8F3F]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-[#0F3D24] mb-1">Residential Address</label>
                <input
                  type="text"
                  placeholder="e.g. Owerri, Imo State"
                  value={newStaff.address}
                  onChange={(e) => setNewStaff({ ...newStaff, address: e.target.value })}
                  className="w-full rounded-xl bg-[#F7F5F0] p-2.5 font-medium text-[#0F3D24] focus:outline-none focus:ring-2 focus:ring-[#3F8F3F]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#0F3D24] mb-1">Department</label>
                <select
                  value={newStaff.department}
                  onChange={(e) => setNewStaff({ ...newStaff, department: e.target.value })}
                  className="w-full rounded-xl bg-[#F7F5F0] p-2.5 font-semibold text-[#0F3D24] focus:outline-none focus:ring-2 focus:ring-[#3F8F3F]"
                >
                  <option value="Farm Operations">Farm Operations</option>
                  <option value="Stores">Stores</option>
                  <option value="Logistics">Logistics</option>
                  <option value="Security">Security</option>
                  <option value="Management">Management</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#0F3D24] mb-1">Emergency Contact / Next of Kin</label>
                <input
                  type="text"
                  placeholder="Name & Phone Number"
                  value={newStaff.emergencyContact}
                  onChange={(e) => setNewStaff({ ...newStaff, emergencyContact: e.target.value })}
                  className="w-full rounded-xl bg-[#F7F5F0] p-2.5 font-medium text-[#0F3D24] focus:outline-none focus:ring-2 focus:ring-[#3F8F3F]"
                />
              </div>
            </div>

            {addStaffError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs font-bold text-rose-700">
                {addStaffError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#0F3D24]/10">
              <button
                type="button"
                onClick={() => {
                  setShowAddStaffModal(false);
                  setAddStaffError(null);
                }}
                className="rounded-full bg-[#F7F5F0] px-4 py-2 text-xs font-bold text-[#0F3D24]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => createStaffMut.mutate()}
                disabled={createStaffMut.isPending || !newStaff.username.trim() || !newStaff.passcode || isDuplicateUsername}
                className="rounded-full bg-[#0F3D24] px-5 py-2 text-xs font-bold text-white hover:bg-[#134a2c] disabled:opacity-50 transition flex items-center gap-1.5"
              >
                {createStaffMut.isPending && <Loader2 size={14} className="animate-spin" />} Save Staff Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Upload Document Modal */}
      {showDocumentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#0F3D24]/10 pb-3">
              <h3 className="text-lg font-bold text-[#0F3D24] flex items-center gap-2">
                <Upload size={18} className="text-[#3F8F3F]" /> Upload Signed Document
              </h3>
              <button onClick={() => setShowDocumentModal(false)} className="text-[#0F3D24]/60 hover:text-[#0F3D24]">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#0F3D24] mb-1">Select Staff Member</label>
                <select
                  value={documentForm.username}
                  onChange={(e) => setDocumentForm({ ...documentForm, username: e.target.value })}
                  className="w-full rounded-xl bg-[#F7F5F0] p-2.5 font-semibold text-[#0F3D24]"
                >
                  <option value="">-- Choose Staff --</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.username}>
                      {s.fullName || s.username} (@{s.username})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#0F3D24] mb-1">Document Title</label>
                <input
                  type="text"
                  placeholder="e.g. Employment Contract 2026"
                  value={documentForm.documentName}
                  onChange={(e) => setDocumentForm({ ...documentForm, documentName: e.target.value })}
                  className="w-full rounded-xl bg-[#F7F5F0] p-2.5 font-medium text-[#0F3D24]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#0F3D24] mb-1">Document Type</label>
                <select
                  value={documentForm.documentType}
                  onChange={(e) => setDocumentForm({ ...documentForm, documentType: e.target.value as any })}
                  className="w-full rounded-xl bg-[#F7F5F0] p-2.5 font-semibold text-[#0F3D24]"
                >
                  <option value="contract">Signed Employment Contract</option>
                  <option value="nda">NDA / Confidentiality Agreement</option>
                  <option value="guarantor_form">Guarantor Verification Form</option>
                  <option value="id_card">Government ID / Passport Copy</option>
                  <option value="other">Other Document</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#0F3D24] mb-1">File URL / Storage Link</label>
                <input
                  type="text"
                  placeholder="https://.../signed_contract.pdf"
                  value={documentForm.fileUrl}
                  onChange={(e) => setDocumentForm({ ...documentForm, fileUrl: e.target.value })}
                  className="w-full rounded-xl bg-[#F7F5F0] p-2.5 font-medium text-[#0F3D24]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#0F3D24]/10">
              <button
                type="button"
                onClick={() => setShowDocumentModal(false)}
                className="rounded-full bg-[#F7F5F0] px-4 py-2 text-xs font-bold text-[#0F3D24]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => uploadDocMut.mutate()}
                disabled={uploadDocMut.isPending || !documentForm.username || !documentForm.documentName || !documentForm.fileUrl}
                className="rounded-full bg-[#0F3D24] px-5 py-2 text-xs font-bold text-white hover:bg-[#134a2c] disabled:opacity-50 transition"
              >
                Upload Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Record Suspension Modal */}
      {showSuspensionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#0F3D24]/10 pb-3">
              <h3 className="text-lg font-bold text-rose-900 flex items-center gap-2">
                <AlertTriangle size={18} className="text-rose-600" /> Record Disciplinary Suspension
              </h3>
              <button onClick={() => setShowSuspensionModal(false)} className="text-[#0F3D24]/60 hover:text-[#0F3D24]">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#0F3D24] mb-1">Select Staff Member</label>
                <select
                  value={suspensionForm.username}
                  onChange={(e) => setSuspensionForm({ ...suspensionForm, username: e.target.value })}
                  className="w-full rounded-xl bg-[#F7F5F0] p-2.5 font-semibold text-[#0F3D24]"
                >
                  <option value="">-- Choose Staff --</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.username}>
                      {s.fullName || s.username} (@{s.username})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#0F3D24] mb-1">Reason for Suspension</label>
                <textarea
                  rows={2}
                  placeholder="Detail the breach of duty or disciplinary reason..."
                  value={suspensionForm.reason}
                  onChange={(e) => setSuspensionForm({ ...suspensionForm, reason: e.target.value })}
                  className="w-full rounded-xl bg-[#F7F5F0] p-2.5 font-medium text-[#0F3D24]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-[#0F3D24] mb-1">Start Date</label>
                  <input
                    type="date"
                    value={suspensionForm.startDate}
                    onChange={(e) => setSuspensionForm({ ...suspensionForm, startDate: e.target.value })}
                    className="w-full rounded-xl bg-[#F7F5F0] p-2.5 font-medium text-[#0F3D24]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#0F3D24] mb-1">End Date (Optional)</label>
                  <input
                    type="date"
                    value={suspensionForm.endDate}
                    onChange={(e) => setSuspensionForm({ ...suspensionForm, endDate: e.target.value })}
                    className="w-full rounded-xl bg-[#F7F5F0] p-2.5 font-medium text-[#0F3D24]"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#0F3D24]/10">
              <button
                type="button"
                onClick={() => setShowSuspensionModal(false)}
                className="rounded-full bg-[#F7F5F0] px-4 py-2 text-xs font-bold text-[#0F3D24]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => recordSuspensionMut.mutate()}
                disabled={recordSuspensionMut.isPending || !suspensionForm.username || !suspensionForm.reason}
                className="rounded-full bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50 transition"
              >
                Record & Restrict Access
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Create Payroll Receipt Modal */}
      {showPayrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#0F3D24]/10 pb-3">
              <h3 className="text-lg font-bold text-[#0F3D24] flex items-center gap-2">
                <DollarSign size={18} className="text-[#3F8F3F]" /> Create Monthly Payment Receipt
              </h3>
              <button onClick={() => setShowPayrollModal(false)} className="text-[#0F3D24]/60 hover:text-[#0F3D24]">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#0F3D24] mb-1">Select Staff</label>
                <select
                  value={payrollForm.username}
                  onChange={(e) => setPayrollForm({ ...payrollForm, username: e.target.value })}
                  className="w-full rounded-xl bg-[#F7F5F0] p-2.5 font-semibold text-[#0F3D24]"
                >
                  <option value="">-- Choose Staff --</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.username}>
                      {s.fullName || s.username} (@{s.username})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#0F3D24] mb-1">Payment Month / Period</label>
                <input
                  type="text"
                  placeholder="e.g. October 2026"
                  value={payrollForm.monthYear}
                  onChange={(e) => setPayrollForm({ ...payrollForm, monthYear: e.target.value })}
                  className="w-full rounded-xl bg-[#F7F5F0] p-2.5 font-medium text-[#0F3D24]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#0F3D24] mb-1">Salary Amount (₦)</label>
                <NumberField
                  allowDecimal
                  placeholder="150000"
                  value={payrollForm.amount}
                  onValueChange={(n) => setPayrollForm({ ...payrollForm, amount: n ?? 0 })}
                  className="w-full rounded-xl bg-[#F7F5F0] p-2.5 font-mono font-bold text-[#3F8F3F]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#0F3D24]/10">
              <button
                type="button"
                onClick={() => setShowPayrollModal(false)}
                className="rounded-full bg-[#F7F5F0] px-4 py-2 text-xs font-bold text-[#0F3D24]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => createPayrollMut.mutate()}
                disabled={createPayrollMut.isPending || !payrollForm.username}
                className="rounded-full bg-[#0F3D24] px-5 py-2 text-xs font-bold text-white hover:bg-[#134a2c] disabled:opacity-50 transition"
              >
                Issue Payment Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
