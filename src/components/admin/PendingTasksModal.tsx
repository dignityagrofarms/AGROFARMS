import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, X, CheckCircle2, Circle, Loader2, ArrowRight } from "lucide-react";
import { adminListTasks, adminCompleteTask } from "@/lib/tasks.functions";

interface PendingTasksModalProps {
  passcode: string;
  username: string;
}

export function PendingTasksModal({ passcode, username }: PendingTasksModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasDismissed, setHasDismissed] = useState(false);

  const listTasksFn = useServerFn(adminListTasks);
  const completeTaskFn = useServerFn(adminCompleteTask);

  const tasksQuery = useQuery({
    queryKey: ["staff_tasks", passcode, "modal"],
    queryFn: () => listTasksFn({ data: { passcode } }),
    refetchInterval: 60000, // Check every minute
  });

  const completeMut = useMutation({
    mutationFn: (taskId: string) => completeTaskFn({ data: { passcode, taskId } }),
    onSuccess: () => tasksQuery.refetch(),
  });

  const pendingTasks = (tasksQuery.data?.tasks || []).filter(
    (t) => t.status === "pending" && (t.assigned_to === username || t.assigned_to === "everyone")
  );

  useEffect(() => {
    // If there are pending tasks and they haven't manually closed it in this session, show it
    if (pendingTasks.length > 0 && !hasDismissed) {
      setIsOpen(true);
    } else if (pendingTasks.length === 0) {
      setIsOpen(false);
    }
  }, [pendingTasks.length, hasDismissed]);

  if (!isOpen || pendingTasks.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] w-full max-w-sm animate-in slide-in-from-bottom-5">
      <div className="overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-[#0F3D24]/20 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="bg-[#0F3D24] p-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Bell size={18} className="animate-bounce" />
            <h3 className="font-bold text-sm">New Tasks Assigned</h3>
          </div>
          <button 
            onClick={() => { setIsOpen(false); setHasDismissed(true); }}
            className="rounded-full p-1 hover:bg-white/20 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 bg-slate-50 overflow-y-auto space-y-3">
          <p className="text-xs text-[#0F3D24]/70 mb-2">
            You have <strong>{pendingTasks.length}</strong> pending task(s) to complete.
          </p>
          
          <div className="space-y-2">
            {pendingTasks.map((task) => (
              <div key={task.id} className="flex gap-3 bg-white p-3 rounded-xl border border-amber-200 shadow-sm">
                <button 
                  onClick={() => completeMut.mutate(task.id)}
                  disabled={completeMut.isPending}
                  className="mt-0.5 flex-shrink-0 text-amber-500 hover:text-emerald-600 transition"
                  title="Mark as Completed"
                >
                  {completeMut.isPending ? <Loader2 size={18} className="animate-spin" /> : <Circle size={18} />}
                </button>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#0F3D24] leading-tight">{task.description}</p>
                  <p className="text-[10px] text-[#0F3D24]/50 mt-1 font-semibold uppercase">By: {task.assigned_by}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-white border-t border-slate-100 flex justify-center">
          <button 
            onClick={() => { setIsOpen(false); setHasDismissed(true); }}
            className="text-xs font-bold text-[#3F8F3F] flex items-center gap-1 hover:underline"
          >
            I'll do these later <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
