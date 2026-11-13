import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getFinancialAccess, setFinancialAccess } from "@/lib/financial-access.functions";
export function FinancialVisibilityControls({ passcode }: { passcode: string }) {
  const get = useServerFn(getFinancialAccess),
    save = useServerFn(setFinancialAccess),
    cache = useQueryClient();
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
      setMessage("Financial visibility saved. Server permissions take effect immediately.");
    },
  });
  if (query.data?.role !== "owner") return null;
  return (
    <section className="space-y-4 rounded-2xl border bg-white p-5">
      <h2 className="text-lg font-bold text-emerald-950">Financial figures — staff & managers</h2>
      <p className="text-sm">
        When hidden, users can record their own sales and expenses and review their submissions.
        Financial totals, other records’ amounts, receipts and exports are restricted.
      </p>
      {(["staff", "manager"] as const).map((role) => (
        <label key={role} className="flex min-h-11 items-center gap-3 rounded-lg border p-3">
          <input
            type="checkbox"
            checked={query.data![role]}
            disabled={mutation.isPending}
            onChange={(e) =>
              mutation.mutate({
                staff: query.data!.staff,
                manager: query.data!.manager,
                [role]: e.target.checked,
              })
            }
          />
          <span>
            Allow {role === "staff" ? "staff" : "managers"} to view financial figures{" "}
            <strong>({query.data![role] ? "Visible" : "Hidden"})</strong>
          </span>
        </label>
      ))}
      <p className="text-xs">
        Staff also need the owner’s existing batch-sharing permission. These switches do not grant
        other administrative permissions.
      </p>
      {message && (
        <p role="status" className="text-sm text-emerald-800">
          {message}
        </p>
      )}
      {mutation.error && (
        <p role="alert" className="text-red-700">
          {mutation.error.message}
        </p>
      )}
    </section>
  );
}
