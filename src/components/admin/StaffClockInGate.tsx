import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Calendar, Clock, Loader2, LogOut, ShieldCheck, UserCheck } from "lucide-react";
import { staffClockIn } from "@/lib/orders.functions";

export function StaffClockInGate({
  passcode,
  username,
  onClockedIn,
  onSignOut,
}: {
  passcode: string;
  username: string;
  onClockedIn: () => void;
  onSignOut: () => void;
}) {
  const qc = useQueryClient();
  const clockInFn = useServerFn(staffClockIn);
  const [notes, setNotes] = useState("");
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const clockInMut = useMutation({
    mutationFn: () =>
      clockInFn({
        data: {
          passcode,
          username: (username || "staff").trim().toLowerCase(),
          notes: notes.trim() || "Clocked in via Mandatory Shift Gate",
        },
      }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["financial-access"] }),
        qc.invalidateQueries({ queryKey: ["staff-my-attendance"] }),
        qc.invalidateQueries({ queryKey: ["hr-attendance-list"] }),
      ]);
      onClockedIn();
    },
  });

  const lagosDateLabel = now.toLocaleDateString("en-NG", {
    timeZone: "Africa/Lagos",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const lagosTimeLabel = now.toLocaleTimeString("en-NG", {
    timeZone: "Africa/Lagos",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="min-h-dvh w-full bg-gradient-to-br from-[#0F3D24] via-[#134a2c] to-[#1a5c38] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-7 sm:p-8 shadow-2xl space-y-6 text-[#0F3D24]">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-emerald-900">
            <ShieldCheck size={14} className="text-[#3F8F3F]" /> Staff Attendance Gate
          </div>
          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>

        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0F3D24] text-white shadow-md">
            <UserCheck size={28} />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#0F3D24]">
            Clock In to Start Your Shift
          </h1>
          <p className="text-xs text-[#0F3D24]/70 leading-relaxed">
            Welcome, <strong className="font-mono text-[#0F3D24]">@{username || "staff"}</strong>. Daily attendance clock-in is required before accessing farm tasks, records, or operations.
          </p>
        </div>

        <div className="rounded-2xl bg-[#F7F5F0] border border-[#0F3D24]/10 p-4 space-y-2 text-center">
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#0F3D24]/80">
            <Calendar size={14} className="text-[#3F8F3F]" />
            <span>{lagosDateLabel}</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-2xl font-black font-mono text-[#0F3D24] tabular-nums">
            <Clock size={18} className="text-[#3F8F3F]" />
            <span>{lagosTimeLabel}</span>
          </div>
          <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-slate-500">
            West Africa Time (WAT)
          </span>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-[#0F3D24]">
            Shift Note (Optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Morning shift — Broiler Pen 2 inspection"
            maxLength={160}
            className="w-full rounded-xl border border-[#0F3D24]/15 bg-[#F7F5F0]/50 px-4 py-2.5 text-xs font-medium text-[#0F3D24] outline-none focus:border-[#3F8F3F] focus:bg-white"
          />
        </div>

        {clockInMut.error && (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-800"
          >
            {clockInMut.error instanceof Error
              ? clockInMut.error.message
              : "Could not record clock-in. Please retry."}
          </div>
        )}

        <button
          type="button"
          disabled={clockInMut.isPending}
          onClick={() => clockInMut.mutate()}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#0F3D24] py-3.5 px-6 text-sm font-black text-white shadow-lg hover:bg-[#165232] disabled:opacity-50 transition cursor-pointer"
        >
          {clockInMut.isPending ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Recording Clock-In...
            </>
          ) : (
            <>
              <UserCheck size={18} /> Clock In Now &amp; Open Dashboard
            </>
          )}
        </button>
      </div>
    </div>
  );
}

