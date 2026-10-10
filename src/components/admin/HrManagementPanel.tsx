import React, { useState } from "react";
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
} from "lucide-react";
import {
  adminListUserAccounts,
  adminCreateUserAccount,
  adminUpdateStaffMember,
  adminRecordSuspension,
  adminListSuspensions,
  adminUploadStaffDocument,
  adminListStaffDocuments,
  adminDeleteStaffDocument,
  adminListAttendance,
  adminMarkAttendance,
  adminCreatePaymentReceipt,
  adminListPaymentReceipts,
  adminListLeaveRequests,
  adminDecideLeaveRequest,
  staffSubmitLeaveRequest,
  type AdminRole,
  type UserAccountItem,
} from "@/lib/orders.functions";

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

  // Server Fn Hooks
  const listStaffFn = useServerFn(adminListUserAccounts);
  const createStaffFn = useServerFn(adminCreateUserAccount);
  const updateStaffFn = useServerFn(adminUpdateStaffMember);
  const recordSuspensionFn = useServerFn(adminRecordSuspension);
  const listSuspensionsFn = useServerFn(adminListSuspensions);
  const uploadDocFn = useServerFn(adminUploadStaffDocument);
  const listDocsFn = useServerFn(adminListStaffDocuments);
  const deleteDocFn = useServerFn(adminDeleteStaffDocument);
  const listAttendanceFn = useServerFn(adminListAttendance);
  const markAttendanceFn = useServerFn(adminMarkAttendance);
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

  // Mutations
  const createStaffMut = useMutation({
    mutationFn: async () => {
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
    onError: (err: any) => setActionMsg("Error: " + err.message),
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

  const staffList = staffQuery.data || [];
  const suspensionsList = suspensionsQuery.data || [];
  const attendanceList = attendanceQuery.data || [];
  const docsList = docsQuery.data || [];
  const payrollList = payrollQuery.data || [];
  const leaveList = leaveQuery.data || [];

  // Metrics
  const totalStaffCount = staffList.length;
  const todayStr = new Date().toISOString().split("T")[0];
  const presentTodayCount = attendanceList.filter((a: any) => a.attendanceDate === todayStr && a.status === "present").length;
  const suspendedCount = staffList.filter((s: any) => s.status === "suspended").length;
  const pendingPayrollCount = payrollList.filter((p: any) => p.status === "pending_signature").length;
  const pendingLeaveCount = leaveList.filter((l: any) => l.status === "pending").length;
  const attendancePercentage = totalStaffCount > 0 ? Math.round((presentTodayCount / totalStaffCount) * 100) : 100;

  // Filtered Directory
  const filteredStaff = staffList.filter((s) => {
    const matchesSearch =
      (s.fullName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.phone || "").includes(searchTerm);
    const matchesDept = selectedDept === "all" || s.department === selectedDept;
    return matchesSearch && matchesDept;
  });

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
            <button
              onClick={() => setShowAddStaffModal(true)}
              className="flex items-center gap-2 rounded-full bg-[#0F3D24] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#134a2c] transition"
            >
              <UserPlus size={16} /> Add Staff Member
            </button>
          </div>
        </div>

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

          <div className="rounded-2xl bg-[#F7F5F0] p-4 ring-1 ring-[#0F3D24]/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#0F3D24]/70">Present Today</span>
              <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                <UserCheck size={18} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black text-[#0F3D24]">{presentTodayCount}</p>
            <span className="text-[10px] text-emerald-700 font-bold">{attendancePercentage}% attendance rate</span>
          </div>

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
        <div className="mt-6 flex flex-wrap gap-2 border-b border-[#0F3D24]/10 pb-3">
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

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#0F3D24]">
              <thead className="bg-[#F7F5F0] text-[10px] font-extrabold uppercase tracking-wider text-[#0F3D24]/60">
                <tr>
                  <th className="p-3">Staff Name / Username</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Phone & Address</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0F3D24]/5 font-medium">
                {filteredStaff.map((staff) => (
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
                      <div className="flex items-center justify-end gap-2">
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
                      </div>
                    </td>
                  </tr>
                ))}
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
            <button
              onClick={() => setShowDocumentModal(true)}
              className="flex items-center gap-1.5 rounded-full bg-[#0F3D24] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#134a2c] transition"
            >
              <Upload size={14} /> Upload Signed Document
            </button>
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
            <button
              onClick={() => setShowSuspensionModal(true)}
              className="flex items-center gap-1.5 rounded-full bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 transition"
            >
              <AlertTriangle size={14} /> Record New Suspension
            </button>
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
      {subTab === "attendance" && (
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#0F3D24] flex items-center gap-2">
              <Calendar size={18} className="text-[#3F8F3F]" /> Staff Daily Attendance Log
            </h3>
            <span className="text-xs font-semibold text-[#0F3D24]/70">Today: {todayStr}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#0F3D24]">
              <thead className="bg-[#F7F5F0] text-[10px] font-extrabold uppercase tracking-wider text-[#0F3D24]/60">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Staff Username</th>
                  <th className="p-3">Attendance Status</th>
                  <th className="p-3">Clock-In Time</th>
                  <th className="p-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0F3D24]/5 font-medium">
                {attendanceList.map((att: any) => (
                  <tr key={att.id} className="hover:bg-[#F7F5F0]/50 transition">
                    <td className="p-3 font-mono font-bold text-[#0F3D24]">{att.attendanceDate}</td>
                    <td className="p-3 font-semibold text-[#0F3D24]">@{att.username}</td>
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
                    <td className="p-3 font-mono text-[#0F3D24]/70">
                      {att.clockInTime ? new Date(att.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "N/A"}
                    </td>
                    <td className="p-3 text-[#0F3D24]/70">{att.notes || "Recorded"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Payroll Receipts Sub-Tab */}
      {subTab === "payroll" && (
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#0F3D24] flex items-center gap-2">
              <DollarSign size={18} className="text-[#3F8F3F]" /> Monthly Payment Receipts Register
            </h3>
            <button
              onClick={() => setShowPayrollModal(true)}
              className="flex items-center gap-1.5 rounded-full bg-[#0F3D24] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#134a2c] transition"
            >
              <PlusCircle size={14} /> Create Salary Payment Receipt
            </button>
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
                  onChange={(e) => setNewStaff({ ...newStaff, username: e.target.value })}
                  className="w-full rounded-xl bg-[#F7F5F0] p-2.5 font-medium text-[#0F3D24] focus:outline-none focus:ring-2 focus:ring-[#3F8F3F]"
                />
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

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#0F3D24]/10">
              <button
                type="button"
                onClick={() => setShowAddStaffModal(false)}
                className="rounded-full bg-[#F7F5F0] px-4 py-2 text-xs font-bold text-[#0F3D24]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => createStaffMut.mutate()}
                disabled={createStaffMut.isPending || !newStaff.username || !newStaff.passcode}
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
                <input
                  type="number"
                  placeholder="150000"
                  value={payrollForm.amount}
                  onChange={(e) => setPayrollForm({ ...payrollForm, amount: Number(e.target.value) })}
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
