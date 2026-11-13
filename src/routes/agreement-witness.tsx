import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getWitnessAgreement, signWitnessAgreement } from "@/lib/agreements.functions";
import { WITNESS_CONSENT } from "@/lib/agreements/types";
import { SignatureBox } from "@/components/agreements/SignatureBox";
import { agreementError } from "@/components/agreements/helpers";
export const Route = createFileRoute("/agreement-witness")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  head: () => ({
    meta: [
      { title: "Witness signing · Dignity Agro Farms" },
      { name: "robots", content: "noindex,nofollow" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: WitnessAgreement,
});
function WitnessAgreement() {
  const { token } = Route.useSearch();
  const get = useServerFn(getWitnessAgreement),
    sign = useServerFn(signWitnessAgreement);
  const [png, setPng] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [finished, setFinished] = useState(false);
  const query = useQuery({
    queryKey: ["witness-agreement", token],
    queryFn: () => get({ data: { witnessToken: token } }),
    enabled: !!token && !finished,
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: async () => {
      if (!query.data || !accepted || !png)
        throw new Error(
          "Review the agreement, draw your signature and confirm the witness statement",
        );
      return sign({
        data: {
          witnessToken: token,
          id: query.data.agreement.id,
          contentHash: query.data.agreement.content_hash,
          legalName: query.data.agreement.snapshot.deal.witnessName,
          signature: png,
          consent: true,
        },
      });
    },
    onSuccess: () => {
      setFinished(true);
      window.history.replaceState({}, "", "/agreement-witness");
    },
  });
  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-8 space-y-5">
      <h1 className="text-2xl font-bold text-emerald-950">Dignity Agro Farms · Witness signing</h1>
      {finished ? (
        <div role="status" className="rounded-xl bg-emerald-50 p-5">
          Your witness signature has been saved.{" "}
          {mutation.data?.pdfReady
            ? "The signed official PDF is now available to the company and investor."
            : "All signatures are saved. The company or investor can finish the PDF download from their agreement section."}{" "}
          This private link has been used and cannot be reused.
        </div>
      ) : (
        <>
          {!token && (
            <p>A private witness link is required. Ask the Farm Owner to issue one to you.</p>
          )}
          {query.isLoading && <p>Loading your agreement…</p>}
          {query.error && (
            <p role="alert" className="text-red-700">
              {agreementError(query.error)}
            </p>
          )}
          {query.data && (
            <>
              <p>
                You are signing as <strong>{query.data.agreement.snapshot.deal.witnessName}</strong>
                , the witness named in this agreement. If this is not you, do not sign; contact the
                farm.
              </p>
              <div
                className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap [overflow-wrap:anywhere] rounded-xl border p-4 text-sm leading-7"
                role="region"
                aria-label="Full witness agreement"
                tabIndex={0}
              >
                {query.data.agreement.snapshot.terms}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {query.data.signatures.map((s) => (
                  <div key={s.signer_role} className="rounded-xl border p-3">
                    <p className="font-semibold">
                      {s.signer_role === "company" ? "Company representative" : "Investor"}:{" "}
                      {s.legal_name}
                    </p>
                    <p className="text-xs">
                      Signed{" "}
                      {new Date(s.signed_at).toLocaleString("en-GB", { timeZone: "Africa/Lagos" })}{" "}
                      (Africa/Lagos)
                    </p>
                    <img
                      src={s.signature_png}
                      alt={`${s.legal_name}'s recorded signature`}
                      className="h-20 max-w-full object-contain"
                    />
                  </div>
                ))}
              </div>
              <p className="rounded-lg bg-amber-50 p-3 text-sm">
                Reviewing signature images alone is not witnessing the parties signing. Confirm the
                statement below only if you actually witnessed their signatures.
              </p>
              <SignatureBox onChange={setPng} disabled={mutation.isPending} />
              <label className="flex gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                />
                {WITNESS_CONSENT}
              </label>
              <button
                disabled={mutation.isPending || !accepted || !png}
                onClick={() => mutation.mutate()}
                className="min-h-11 rounded-lg bg-emerald-900 px-5 text-white disabled:opacity-40"
              >
                {mutation.isPending ? "Saving signature…" : "Sign as witness"}
              </button>
            </>
          )}
          {mutation.error && (
            <p role="alert" className="text-red-700">
              {agreementError(mutation.error)}
            </p>
          )}
        </>
      )}
    </main>
  );
}
