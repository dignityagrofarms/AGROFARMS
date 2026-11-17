import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getFinancialAccess, setFinancialAccess } from "@/lib/financial-access.functions";
import { ShieldAlert, ShieldCheck, CheckCircle2, Lock, Eye, EyeOff } from "lucide-react";

export function FinancialVisibilityControls({ passcode }: { passcode: string }) {
  const get = useServerFn(getFinancialAccess);
  const save = useServerFn(setFinancialAccess);
  const cache = useQueryClient();

  const query = useQuery({
    queryKey: ["financial-access", passcode],
    queryFn: () => get({ data: { passcode } }),
  });

  const [message, setMessage] = useState("");

  const mutation = useMutation({
    mutationFn: (values: { staff: boolean; manager: boolean }) =>
      save({ data: { passcode, ...values } }),
    onSuccess: () => {
      cache.invalidateQueries({ queryKey: ["financial-access"] });
      cache.invalidateQueries({ queryKey: ["admin-orders"] });
      setMessage("Financial visibility settings saved successfully.");
      setTimeout(() => setMessage(""), 5000);
    },
  });

  if (query.data?.role !== "owner") return null;

  const staffEnabled = Boolean(query.data?.staff);
  const managerEnabled = Boolean(query.data?.manager);

  return (
    <section className="space-y-5 rounded-3xl border border-[#0F3D24]/10 bg-white p-6 sm:p-7 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#0F3D24]/10 pb-4">
        <div>
          <div className="flex items-center gap-2 text-[#0F3D24]">
            <Lock className="text-[#3F8F3F]" size={20} />
            <h2 className="text-lg font-bold">Financial Figures &amp; Dashboard Visibility</h2>
          </div>
          <p className="mt-1 text-xs text-[#0F3D24]/70 max-w-2xl">
            Control whether non-owner employee accounts (Managers and Staff) can view farm-wide financial
            totals, profit/loss figures, and revenue charts. When hidden, users can only submit vouchers and
            track operational flock headcounts.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-900 border border-emerald-200">
          <ShieldCheck size={14} className="text-emerald-600" /> Owner Access Controls
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Manager Visibility Control */}
        <div
          className={`rounded-2xl border p-4.5 transition ${
            managerEnabled
              ? "border-emerald-300 bg-emerald-50/40"
              : "border-slate-200 bg-slate-50/60"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#0F3D24]">Manager Financial Visibility</span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                    managerEnabled
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {managerEnabled ? (
                    <>
                      <Eye size={11} /> Visible
                    </>
                  ) : (
                    <>
                      <EyeOff size={11} /> Hidden (Default)
                    </>
                  )}
                </span>
              </div>
              <p className="mt-1 text-xs text-[#0F3D24]/70">
                Allow Manager accounts to view the Farm Financials Dashboard, farm-wide grand totals, net
                profit/loss, and revenue charts.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                checked={managerEnabled}
                disabled={mutation.isPending}
                onChange={(e) =>
                  mutation.mutate({
                    staff: staffEnabled,
                    manager: e.target.checked,
                  })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0F3D24]"></div>
            </label>
          </div>
        </div>

        {/* Staff Visibility Control */}
        <div
          className={`rounded-2xl border p-4.5 transition ${
            staffEnabled
              ? "border-emerald-300 bg-emerald-50/40"
              : "border-slate-200 bg-slate-50/60"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#0F3D24]">Staff Financial Visibility</span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                    staffEnabled
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {staffEnabled ? (
                    <>
                      <Eye size={11} /> Visible
                    </>
                  ) : (
                    <>
                      <EyeOff size={11} /> Hidden (Default)
                    </>
                  )}
                </span>
              </div>
              <p className="mt-1 text-xs text-[#0F3D24]/70">
                Allow Staff accounts to view unlocked batch financial ledgers shared by the owner.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                checked={staffEnabled}
                disabled={mutation.isPending}
                onChange={(e) =>
                  mutation.mutate({
                    staff: e.target.checked,
                    manager: managerEnabled,
                  })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0F3D24]"></div>
            </label>
          </div>
        </div>
      </div>

      {message && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-900 animate-in fade-in duration-200">
          <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {mutation.error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-900 animate-in fade-in duration-200">
          <ShieldAlert size={15} className="text-rose-600 shrink-0" />
          <span>{mutation.error.message}</span>
        </div>
      )}
    </section>
  );
}
