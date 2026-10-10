import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckSquare, ListTodo, Plus, Trash2, CheckCircle2, Circle, Clock, Users, User, Loader2, Calendar, UserCheck, Check } from "lucide-react";
import { adminListTasks, adminCreateTask, adminCompleteTask, adminDeleteTask } from "@/lib/tasks.functions";
import { adminListUserAccounts, staffClockIn } from "@/lib/orders.functions";

interface StaffTasksPanelProps {
  passcode: string;
  role: "owner" | "manager" | "staff";
  username: string;
}

export function StaffTasksPanel({ passcode, role, username }: StaffTasksPanelProps) {
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("everyone");
  const [msg, setMsg] = useState<string | null>(null);
  const [clockInMsg, setClockInMsg] = useState<string | null>(null);

  const listTasksFn = useServerFn(adminListTasks);
  const createTaskFn = useServerFn(adminCreateTask);
  const completeTaskFn = useServerFn(adminCompleteTask);
  const deleteTaskFn = useServerFn(adminDeleteTask);
  const listUsersFn = useServerFn(adminListUserAccounts);
  const clockInFn = useServerFn(staffClockIn);

  const clockInMut = useMutation({
    mutationFn: () => clockInFn({ data: { username: username || "staff" } }),
    onSuccess: (res: any) => {
      setClockInMsg(res.message || "Attendance clocked in successfully!");
    },
    onError: (e: Error) => setClockInMsg(`Error: ${e.message}`),
  });

  const tasksQuery = useQuery({
    queryKey: ["staff_tasks", passcode],
    queryFn: () => listTasksFn({ data: { passcode } }),
    refetchInterval: 30000,
  });

  const usersQuery = useQuery({
    queryKey: ["admin-user-accounts", passcode],
    queryFn: () => listUsersFn({ data: { passcode } }),
    enabled: role === "owner", // Only owner needs to see user list
  });

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

  const tasks = tasksQuery.data?.tasks || [];
  const pendingTasks = tasks.filter((t) => t.status === "pending");
  const completedTasks = tasks.filter((t) => t.status === "completed");

  return (
    <div className="mb-8 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/10 space-y-6">
      {/* Daily Attendance Clock-In Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0F3D24] to-[#134a2c] p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#3F8F3F]">Daily Attendance Register</span>
          <h3 className="text-base font-bold flex items-center gap-2 mt-1">
            <Calendar size={18} className="text-[#3F8F3F]" /> Welcome back, {username}!
          </h3>
          <p className="text-xs text-white/70 mt-0.5">
            Mark your attendance for today ({new Date().toLocaleDateString()}) to record your clock-in status in the HR register.
          </p>
          {clockInMsg && (
            <p className="mt-2 text-xs font-extrabold text-[#3F8F3F] bg-white/10 px-3 py-1.5 rounded-lg inline-block">
              {clockInMsg}
            </p>
          )}
        </div>
        <button
          onClick={() => clockInMut.mutate()}
          disabled={clockInMut.isPending}
          className="rounded-full bg-[#3F8F3F] px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-600 transition shadow-md whitespace-nowrap flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {clockInMut.isPending ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />} Clock-In Attendance Today
        </button>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#0F3D24]/10 pb-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-[#0F3D24]">
            <CheckSquare size={20} className="text-[#3F8F3F]" /> Staff Task Management
          </h2>
          <p className="mt-0.5 text-xs text-[#0F3D24]/70">
            {role === "owner"
              ? "Assign tasks to your team and monitor their completion."
              : "View tasks assigned to you by the Administrator and mark them as completed."}
          </p>
        </div>
        <span className="rounded-full bg-[#0F3D24]/10 px-3 py-1 text-xs font-bold text-[#0F3D24] uppercase">
          {pendingTasks.length} Pending
        </span>
      </div>

      {/* Owner: Create Task Form */}
      {role === "owner" && (
        <div className="rounded-2xl border border-[#0F3D24]/15 bg-[#F7F5F0] p-5 space-y-4">
          <h3 className="text-sm font-bold text-[#0F3D24] flex items-center gap-2">
            <Plus size={16} className="text-[#3F8F3F]" /> Assign a New Task
          </h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Please review yesterday's financial records..."
              className="flex-1 rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && description.trim()) createMut.mutate();
              }}
            />
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm font-semibold outline-none focus:border-[#3F8F3F] bg-white min-w-[200px]"
            >
              <option value="everyone">Everyone (Broadcast)</option>
              {(usersQuery.data || [])
                .filter((u) => u.username !== "owner")
                .map((u) => (
                  <option key={u.id} value={u.username}>
                    {u.username} ({u.role})
                  </option>
                ))}
            </select>
            <button
              disabled={!description.trim() || createMut.isPending}
              onClick={() => createMut.mutate()}
              className="rounded-xl bg-[#0F3D24] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#155432] transition disabled:opacity-50 whitespace-nowrap flex items-center justify-center gap-2"
            >
              {createMut.isPending ? <Loader2 size={16} className="animate-spin" /> : "Assign Task"}
            </button>
          </div>
          {msg && (
            <p className={`text-xs font-bold ${msg.startsWith("Error") ? "text-red-600" : "text-[#3F8F3F]"}`}>
              {msg}
            </p>
          )}
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
                        onClick={() => { if(window.confirm("Delete this task?")) deleteMut.mutate(task.id); }}
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
                        onClick={() => { if(window.confirm("Delete this task record?")) deleteMut.mutate(task.id); }}
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
  );
}
