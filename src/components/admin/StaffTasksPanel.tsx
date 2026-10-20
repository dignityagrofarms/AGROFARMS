import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckSquare,
  ListTodo,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Clock,
  Users,
  User,
  Loader2,
  Calendar,
  UserCheck,
  Check,
  DollarSign,
  FileCheck,
  Send,
  AlertCircle,
  FileSignature,
  CalendarDays,
  Sparkles,
} from "lucide-react";
import { adminListTasks, adminCreateTask, adminCompleteTask, adminDeleteTask } from "@/lib/tasks.functions";
import {
  adminListUserAccounts,
  staffClockIn,
  adminListPaymentReceipts,
  staffSignPaymentReceipt,
  adminListLeaveRequests,
  staffSubmitLeaveRequest,
  adminListAttendance,
} from "@/lib/orders.functions";

interface StaffTasksPanelProps {
  passcode: string;
  role: "owner" | "manager" | "staff";
  username: string;
}

export function StaffTasksPanel({ passcode, role, username }: StaffTasksPanelProps) {
  const qc = useQueryClient();
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<"tasks" | "payroll" | "leave" | "attendance">("tasks");

  // Task form state
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("everyone");
  const [msg, setMsg] = useState<string | null>(null);
  const [clockInMsg, setClockInMsg] = useState<string | null>(null);

  // Leave form state
  const [leaveType, setLeaveType] = useState<"annual" | "sick" | "emergency" | "casual">("casual");
  const [leaveStartDate, setLeaveStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [leaveEndDate, setLeaveEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [leaveReason, setLeaveReason] = useState("");
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  // Server functions
  const listTasksFn = useServerFn(adminListTasks);
  const createTaskFn = useServerFn(adminCreateTask);
  const completeTaskFn = useServerFn(adminCompleteTask);
  const deleteTaskFn = useServerFn(adminDeleteTask);
  const listUsersFn = useServerFn(adminListUserAccounts);
  const clockInFn = useServerFn(staffClockIn);
  const listPayrollFn = useServerFn(adminListPaymentReceipts);
  const signPayrollFn = useServerFn(staffSignPaymentReceipt);
  const listLeaveFn = useServerFn(adminListLeaveRequests);
  const submitLeaveFn = useServerFn(staffSubmitLeaveRequest);
  const listAttendanceFn = useServerFn(adminListAttendance);

  // Clock-in mutation
  const clockInMut = useMutation({
    mutationFn: () => clockInFn({ data: { passcode, username: username || "staff" } }),
    onSuccess: (res: any) => {
      setClockInMsg(res.message || "Attendance clocked in successfully!");
      qc.invalidateQueries({ queryKey: ["staff-my-attendance"] });
      qc.invalidateQueries({ queryKey: ["hr-attendance-list"] });
    },
    onError: (e: Error) => setClockInMsg(`Error: ${e.message}`),
  });

  // Queries
  const tasksQuery = useQuery({
    queryKey: ["staff_tasks", passcode],
    queryFn: () => listTasksFn({ data: { passcode } }),
    refetchInterval: 30000,
  });

  const usersQuery = useQuery({
    queryKey: ["admin-user-accounts", passcode],
    queryFn: () => listUsersFn({ data: { passcode } }),
    enabled: role === "owner" || role === "manager",
  });

  const payrollQuery = useQuery({
    queryKey: ["staff-my-payroll", passcode, username],
    queryFn: () => listPayrollFn({ data: { passcode, username: username || undefined } }),
    enabled: activeWorkspaceTab === "payroll",
  });

  const leaveQuery = useQuery({
    queryKey: ["staff-my-leave", passcode, username],
    queryFn: () => listLeaveFn({ data: { passcode, username: username || undefined } }),
    enabled: activeWorkspaceTab === "leave",
  });

  const attendanceQuery = useQuery({
    queryKey: ["staff-my-attendance", passcode, username],
    queryFn: () => listAttendanceFn({ data: { passcode, username: username || undefined } }),
    enabled: activeWorkspaceTab === "attendance",
  });

  // Task Mutations
  const createMut = useMutation({
    mutationFn: () => createTaskFn({ data: { passcode, description: description.trim(), assigned_to: assignedTo } }),
    onSuccess: () => {
      setDescription("");
      setMsg("Task created and assigned successfully!");
      tasksQuery.refetch();
      setTimeout(() => setMsg(null), 3000);
    },
    onError: (e: Error) => setMsg(`Error: ${e.message}`),
  });

  const completeMut = useMutation({
    mutationFn: (taskId: string) => completeTaskFn({ data: { passcode, taskId } }),
    onSuccess: () => tasksQuery.refetch(),
  });

  const deleteMut = useMutation({
    mutationFn: (taskId: string) => deleteTaskFn({ data: { passcode, taskId } }),
    onSuccess: () => tasksQuery.refetch(),
  });

  // Sign Payroll Receipt Mutation
  const signPayrollMut = useMutation({
    mutationFn: (receiptId: string) => signPayrollFn({ data: { passcode, receiptId, username: username || "staff" } }),
    onSuccess: () => {
      setMsg("You have successfully signed and acknowledged your salary payment receipt!");
      qc.invalidateQueries({ queryKey: ["staff-my-payroll"] });
      qc.invalidateQueries({ queryKey: ["hr-payroll-list"] });
      setTimeout(() => setMsg(null), 4000);
    },
    onError: (e: Error) => setMsg(`Error signing receipt: ${e.message}`),
  });

  // Submit Leave Request Mutation
  const submitLeaveMut = useMutation({
    mutationFn: () =>
      submitLeaveFn({
        data: {
          passcode,
          username: username || "staff",
          leaveType,
          startDate: leaveStartDate,
          endDate: leaveEndDate,
          reason: leaveReason.trim(),
        },
      }),
    onSuccess: () => {
      setShowLeaveModal(false);
      setLeaveReason("");
      setMsg("Leave request submitted! Farm Administrator has been notified.");
      qc.invalidateQueries({ queryKey: ["staff-my-leave"] });
      qc.invalidateQueries({ queryKey: ["hr-leave-list"] });
      setTimeout(() => setMsg(null), 4000);
    },
    onError: (e: Error) => setMsg(`Error: ${e.message}`),
  });

  const tasks = tasksQuery.data?.tasks || [];
  const pendingTasks = tasks.filter((t) => t.status === "pending");
  const completedTasks = tasks.filter((t) => t.status === "completed");
  const myPayrollList = payrollQuery.data || [];
  const pendingSignPayrollCount = myPayrollList.filter((p: any) => p.status === "pending_signature").length;
  const myLeaveList = leaveQuery.data || [];

  return (
    <div className="mb-8 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/10 space-y-6">
      {/* Daily Attendance Clock-In Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0F3D24] via-[#134a2c] to-[#1c633c] p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#3F8F3F]">Daily Attendance Register</span>
          <h3 className="text-base font-bold flex items-center gap-2 mt-1">
            <Calendar size={18} className="text-[#3F8F3F]" /> Welcome, {username}!
          </h3>
          <p className="text-xs text-white/70 mt-0.5">
            Mark your attendance for today ({new Date().toLocaleDateString()}) to record your clock-in status in the HR register.
          </p>
          {clockInMsg && (
            <p className="mt-2 text-xs font-extrabold text-emerald-300 bg-white/10 px-3 py-1.5 rounded-lg inline-block">
              {clockInMsg}
            </p>
          )}
        </div>
        <button
          onClick={() => clockInMut.mutate()}
          disabled={clockInMut.isPending}
          className="rounded-full bg-[#3F8F3F] px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-600 transition shadow-md whitespace-nowrap flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
        >
          {clockInMut.isPending ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />} Clock-In Attendance Today
        </button>
      </div>

      {/* Global Message Banner */}
      {msg && (
        <div className={`rounded-xl p-3 text-xs font-bold flex items-center justify-between ring-1 ${msg.startsWith("Error") ? "bg-rose-50 text-rose-800 ring-rose-200" : "bg-emerald-50 text-emerald-900 ring-emerald-200"}`}>
          <span>{msg}</span>
          <button onClick={() => setMsg(null)} className="opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Workspace Sub-Tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#0F3D24]/10 pb-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-[#0F3D24]">
            <CheckSquare size={20} className="text-[#3F8F3F]" />
            {role === "staff" ? "Staff Portal & Operations" : "Staff Tasks & Management"}
          </h2>
          <p className="mt-0.5 text-xs text-[#0F3D24]/70">
            {role === "staff"
              ? "View assigned farm tasks, sign your monthly salary vouchers, and manage leave requests."
              : "Assign and track farm team tasks and inspect personnel operations."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveWorkspaceTab("tasks")}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition ${
              activeWorkspaceTab === "tasks"
                ? "bg-[#0F3D24] text-white shadow-sm"
                : "bg-[#F7F5F0] text-[#0F3D24]/70 hover:bg-[#0F3D24]/10"
            }`}
          >
            <CheckSquare size={13} /> Tasks ({pendingTasks.length})
          </button>

          <button
            onClick={() => setActiveWorkspaceTab("payroll")}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition ${
              activeWorkspaceTab === "payroll"
                ? "bg-[#0F3D24] text-white shadow-sm"
                : "bg-[#F7F5F0] text-[#0F3D24]/70 hover:bg-[#0F3D24]/10"
            }`}
          >
            <DollarSign size={13} /> Salary Receipts
            {pendingSignPayrollCount > 0 && (
              <span className="rounded-full bg-amber-500 text-white px-1.5 py-0.2 text-[9px] font-extrabold animate-pulse">
                {pendingSignPayrollCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveWorkspaceTab("leave")}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition ${
              activeWorkspaceTab === "leave"
                ? "bg-[#0F3D24] text-white shadow-sm"
                : "bg-[#F7F5F0] text-[#0F3D24]/70 hover:bg-[#0F3D24]/10"
            }`}
          >
            <CalendarDays size={13} /> Leave Requests
          </button>

          <button
            onClick={() => setActiveWorkspaceTab("attendance")}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition ${
              activeWorkspaceTab === "attendance"
                ? "bg-[#0F3D24] text-white shadow-sm"
                : "bg-[#F7F5F0] text-[#0F3D24]/70 hover:bg-[#0F3D24]/10"
            }`}
          >
            <UserCheck size={13} /> Attendance Log
          </button>
        </div>
      </div>

      {/* ────────────────── SUB-TAB 1: TASKS ────────────────── */}
      {activeWorkspaceTab === "tasks" && (
        <div className="space-y-6">
          {/* Owner / Manager: Create Task Form */}
          {(role === "owner" || role === "manager") && (
            <div className="rounded-2xl border border-[#0F3D24]/15 bg-[#F7F5F0] p-5 space-y-4">
              <h3 className="text-sm font-bold text-[#0F3D24] flex items-center gap-2">
                <Plus size={16} className="text-[#3F8F3F]" /> Assign a New Task
              </h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Check drinker lines in Broiler Pen 2..."
                  className="flex-1 rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && description.trim()) createMut.mutate();
                  }}
                />
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm font-semibold outline-none focus:border-[#3F8F3F] bg-white min-w-[220px]"
                >
                  <option value="everyone">Everyone (Broadcast)</option>
                  {role === "owner" && (
                    <optgroup label="Managers">
                      {(usersQuery.data || [])
                        .filter((u) => u.role === "manager")
                        .map((u) => (
                          <option key={u.id} value={u.username}>
                            {u.fullName ? `${u.fullName} (@${u.username})` : u.username} (Manager)
                          </option>
                        ))}
                    </optgroup>
                  )}
                  <optgroup label="Farm Staff">
                    {(usersQuery.data || [])
                      .filter((u) => u.role === "staff" || (role === "owner" && u.role !== "owner" && u.role !== "manager"))
                      .map((u) => (
                        <option key={u.id} value={u.username}>
                          {u.fullName ? `${u.fullName} (@${u.username})` : u.username} ({u.role})
                        </option>
                      ))}
                  </optgroup>
                </select>
                <button
                  disabled={!description.trim() || createMut.isPending}
                  onClick={() => createMut.mutate()}
                  className="rounded-xl bg-[#0F3D24] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#155432] transition disabled:opacity-50 whitespace-nowrap flex items-center justify-center gap-2"
                >
                  {createMut.isPending ? <Loader2 size={16} className="animate-spin" /> : "Assign Task"}
                </button>
              </div>
            </div>
          )}

          {/* Tasks List */}
          <div className="space-y-6 pt-2">
            {tasksQuery.isLoading ? (
              <div className="py-12 text-center text-sm text-[#0F3D24]/50">
                <Loader2 size={24} className="animate-spin mx-auto mb-2" /> Loading tasks...
              </div>
            ) : tasks.length === 0 ? (
              <div className="py-12 text-center text-sm text-[#0F3D24]/50 flex flex-col items-center">
                <CheckCircle2 size={40} className="text-[#0F3D24]/20 mb-3" />
                No tasks found. Everything is up to date!
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 items-start">
                {/* Pending Tasks */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F3D24]/70 flex items-center gap-2 border-b border-[#0F3D24]/10 pb-2">
                    <Clock size={15} /> Pending Tasks ({pendingTasks.length})
                  </h3>
                  <div className="space-y-2">
                    {pendingTasks.length === 0 && (
                      <div className="py-4 text-center text-xs text-[#0F3D24]/50 bg-slate-50 rounded-xl border border-slate-100">
                        No pending tasks!
                      </div>
                    )}
                    {pendingTasks.map((task) => (
                      <div key={task.id} className="flex gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-50 transition relative group">
                        <button
                          onClick={() => completeMut.mutate(task.id)}
                          disabled={completeMut.isPending}
                          className="mt-0.5 flex-shrink-0 text-amber-600 hover:text-emerald-600 transition"
                          title="Mark as Completed"
                        >
                          {completeMut.isPending ? <Loader2 size={20} className="animate-spin" /> : <Circle size={20} />}
                        </button>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-[#0F3D24] leading-snug">{task.description}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-[#0F3D24]/60 font-semibold">
                            <span className="flex items-center gap-1">
                              <Users size={12} /> For: <span className="uppercase text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">{task.assigned_to}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <User size={12} /> By: {task.assigned_by}
                            </span>
                            <span>{new Date(task.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        {role === "owner" && (
                          <button
                            onClick={() => { if (window.confirm("Delete this task?")) deleteMut.mutate(task.id); }}
                            className="absolute top-3 right-3 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition"
                            title="Delete task"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Completed Tasks */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F3D24]/70 flex items-center gap-2 border-b border-[#0F3D24]/10 pb-2">
                    <CheckSquare size={15} /> Completed ({completedTasks.length})
                  </h3>
                  <div className="space-y-2 opacity-75 hover:opacity-100 transition-opacity">
                    {completedTasks.length === 0 && (
                      <div className="py-4 text-center text-xs text-[#0F3D24]/50 bg-slate-50 rounded-xl border border-slate-100">
                        No completed tasks yet.
                      </div>
                    )}
                    {completedTasks.map((task) => (
                      <div key={task.id} className="flex gap-3 p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/30 relative group">
                        <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0 text-emerald-500" />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-[#0F3D24] line-through decoration-[#0F3D24]/30">{task.description}</p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[9px] text-[#0F3D24]/60 font-semibold">
                            <span className="text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">
                              Done by: {task.completed_by}
                            </span>
                            <span>Assigned to: {task.assigned_to}</span>
                            {task.completed_at && <span>{new Date(task.completed_at).toLocaleDateString()}</span>}
                          </div>
                        </div>
                        {role === "owner" && (
                          <button
                            onClick={() => { if (window.confirm("Delete this task record?")) deleteMut.mutate(task.id); }}
                            className="absolute top-2 right-2 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition"
                            title="Delete task"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────── SUB-TAB 2: SALARY RECEIPTS ────────────────── */}
      {activeWorkspaceTab === "payroll" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#0F3D24] flex items-center gap-2">
                <DollarSign size={18} className="text-[#3F8F3F]" /> My Monthly Salary Receipts & Vouchers
              </h3>
              <p className="text-xs text-[#0F3D24]/65">
                Review payment receipts issued by farm administration and digitally sign your acknowledgment.
              </p>
            </div>
            <button
              onClick={() => payrollQuery.refetch()}
              className="rounded-full bg-[#F7F5F0] px-3.5 py-1.5 text-xs font-bold text-[#0F3D24] hover:bg-[#0F3D24]/10 transition"
            >
              Refresh
            </button>
          </div>

          {payrollQuery.isLoading ? (
            <div className="py-8 text-center text-xs text-[#0F3D24]/60">
              <Loader2 size={18} className="animate-spin mx-auto mb-1" /> Loading salary receipts...
            </div>
          ) : myPayrollList.length === 0 ? (
            <div className="rounded-2xl bg-[#F7F5F0] p-8 text-center text-xs text-[#0F3D24]/60">
              No salary payment receipts have been issued to your account (@{username}) yet. Once created by HR, they will appear here for your digital signature.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {myPayrollList.map((receipt: any) => (
                <div key={receipt.id} className="rounded-2xl border border-[#0F3D24]/15 bg-white p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#0F3D24]">{receipt.monthYear}</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                        receipt.status === "signed" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {receipt.status === "signed" ? "Signed & Verified" : "Pending Signature"}
                    </span>
                  </div>

                  <div className="rounded-xl bg-[#F7F5F0] p-3 text-xs flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#0F3D24]/60 block">Disbursed Amount</span>
                      <span className="font-mono text-lg font-black text-[#3F8F3F]">₦{receipt.amount.toLocaleString()}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-[#0F3D24]/60 block">Payment Date</span>
                      <span className="font-mono text-xs font-semibold text-[#0F3D24]">{receipt.paymentDate}</span>
                    </div>
                  </div>

                  {receipt.notes && (
                    <p className="text-xs text-[#0F3D24]/70 italic">"{receipt.notes}"</p>
                  )}

                  {receipt.status === "pending_signature" ? (
                    <button
                      onClick={() => signPayrollMut.mutate(receipt.id)}
                      disabled={signPayrollMut.isPending}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition disabled:opacity-50"
                    >
                      {signPayrollMut.isPending ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <FileSignature size={14} />
                      )}
                      Sign & Acknowledge Payment Receipt
                    </button>
                  ) : (
                    <div className="flex items-center justify-between text-[11px] text-emerald-800 font-bold bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100">
                      <span className="flex items-center gap-1.5"><Check size={14} /> Digitally Signed</span>
                      {receipt.signedAt && <span className="font-mono text-[10px]">{new Date(receipt.signedAt).toLocaleDateString()}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ────────────────── SUB-TAB 3: LEAVE REQUESTS ────────────────── */}
      {activeWorkspaceTab === "leave" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#0F3D24] flex items-center gap-2">
                <CalendarDays size={18} className="text-[#3F8F3F]" /> My Leave Requests
              </h3>
              <p className="text-xs text-[#0F3D24]/65">
                Apply for leave, track review approvals, and plan your time away from farm duties.
              </p>
            </div>
            <button
              onClick={() => setShowLeaveModal(true)}
              className="flex items-center gap-1.5 rounded-full bg-[#0F3D24] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#134a2c] transition"
            >
              <Plus size={14} /> Request Leave
            </button>
          </div>

          {leaveQuery.isLoading ? (
            <div className="py-8 text-center text-xs text-[#0F3D24]/60">
              <Loader2 size={18} className="animate-spin mx-auto mb-1" /> Loading leave requests...
            </div>
          ) : myLeaveList.length === 0 ? (
            <div className="rounded-2xl bg-[#F7F5F0] p-8 text-center text-xs text-[#0F3D24]/60">
              You have not submitted any leave requests yet. Click "Request Leave" above to apply.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[#0F3D24]/10 shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F5F0] text-[10px] font-extrabold uppercase tracking-wider text-[#0F3D24]/60">
                  <tr>
                    <th className="p-3">Type</th>
                    <th className="p-3">Start Date</th>
                    <th className="p-3">End Date</th>
                    <th className="p-3">Reason</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0F3D24]/5 font-medium">
                  {myLeaveList.map((req: any) => (
                    <tr key={req.id} className="hover:bg-[#F7F5F0]/50 transition">
                      <td className="p-3">
                        <span className="capitalize font-bold text-[#0F3D24]">{req.leaveType} Leave</span>
                      </td>
                      <td className="p-3 font-mono">{req.startDate}</td>
                      <td className="p-3 font-mono">{req.endDate}</td>
                      <td className="p-3 text-[#0F3D24]/80 max-w-[200px] truncate">{req.reason}</td>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Request Leave Modal */}
          {showLeaveModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
              <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-[#0F3D24]/10 pb-3">
                  <h3 className="text-base font-extrabold text-[#0F3D24] flex items-center gap-2">
                    <CalendarDays size={18} className="text-[#3F8F3F]" /> Apply for Leave
                  </h3>
                  <button onClick={() => setShowLeaveModal(false)} className="text-[#0F3D24]/60 hover:text-[#0F3D24]">✕</button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-[#0F3D24] mb-1">Leave Category</label>
                    <select
                      value={leaveType}
                      onChange={(e) => setLeaveType(e.target.value as any)}
                      className="w-full rounded-xl bg-[#F7F5F0] p-2.5 font-semibold text-[#0F3D24] outline-none"
                    >
                      <option value="casual">Casual Leave</option>
                      <option value="annual">Annual Leave</option>
                      <option value="sick">Sick Leave</option>
                      <option value="emergency">Emergency Leave</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-[#0F3D24] mb-1">Start Date</label>
                      <input
                        type="date"
                        value={leaveStartDate}
                        onChange={(e) => setLeaveStartDate(e.target.value)}
                        className="w-full rounded-xl bg-[#F7F5F0] p-2.5 font-semibold text-[#0F3D24] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-[#0F3D24] mb-1">End Date</label>
                      <input
                        type="date"
                        value={leaveEndDate}
                        onChange={(e) => setLeaveEndDate(e.target.value)}
                        className="w-full rounded-xl bg-[#F7F5F0] p-2.5 font-semibold text-[#0F3D24] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-[#0F3D24] mb-1">Reason / Details</label>
                    <textarea
                      rows={3}
                      value={leaveReason}
                      onChange={(e) => setLeaveReason(e.target.value)}
                      placeholder="State reason for absence..."
                      className="w-full rounded-xl bg-[#F7F5F0] p-2.5 font-medium text-[#0F3D24] outline-none resize-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#0F3D24]/10">
                  <button
                    onClick={() => setShowLeaveModal(false)}
                    className="rounded-full bg-[#F7F5F0] px-4 py-2 text-xs font-bold text-[#0F3D24]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => submitLeaveMut.mutate()}
                    disabled={!leaveReason.trim() || submitLeaveMut.isPending}
                    className="rounded-full bg-[#0F3D24] px-5 py-2 text-xs font-bold text-white hover:bg-[#134a2c] disabled:opacity-50 transition"
                  >
                    {submitLeaveMut.isPending ? "Submitting..." : "Submit Application"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ────────────────── SUB-TAB 4: ATTENDANCE LOG ────────────────── */}
      {activeWorkspaceTab === "attendance" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#0F3D24] flex items-center gap-2">
                <UserCheck size={18} className="text-[#3F8F3F]" /> My Daily Clock-In History
              </h3>
              <p className="text-xs text-[#0F3D24]/65">
                Past daily clock-in records and verified attendance logs.
              </p>
            </div>
            <button
              onClick={() => attendanceQuery.refetch()}
              className="rounded-full bg-[#F7F5F0] px-3.5 py-1.5 text-xs font-bold text-[#0F3D24] hover:bg-[#0F3D24]/10 transition"
            >
              Refresh
            </button>
          </div>

          {attendanceQuery.isLoading ? (
            <div className="py-8 text-center text-xs text-[#0F3D24]/60">
              <Loader2 size={18} className="animate-spin mx-auto mb-1" /> Loading attendance log...
            </div>
          ) : (attendanceQuery.data || []).length === 0 ? (
            <div className="rounded-2xl bg-[#F7F5F0] p-8 text-center text-xs text-[#0F3D24]/60">
              No clock-in records found for your account yet. Click the "Clock-In Attendance Today" button at the top to record today's attendance.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[#0F3D24]/10 shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F5F0] text-[10px] font-extrabold uppercase tracking-wider text-[#0F3D24]/60">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Clock-In Timestamp</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0F3D24]/5 font-medium">
                  {(attendanceQuery.data || []).map((att: any) => (
                    <tr key={att.id} className="hover:bg-[#F7F5F0]/50 transition">
                      <td className="p-3 font-bold text-[#0F3D24]">{att.attendanceDate}</td>
                      <td className="p-3 font-mono text-[#0F3D24]/70">
                        {att.clockInTime ? new Date(att.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
                      </td>
                      <td className="p-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${
                            att.status === "present"
                              ? "bg-emerald-100 text-emerald-800"
                              : att.status === "late"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {att.status}
                        </span>
                      </td>
                      <td className="p-3 text-[#0F3D24]/60">{att.notes || "Clocked in"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
