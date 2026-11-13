import { useState } from "react";
import { agreementError, saveAgreementDownload } from "./helpers";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { FarmPartner } from "@/lib/partners.functions";
import {
  createOfficialAgreement,
  listOfficialAgreements,
  signOfficialAgreement,
  createWitnessLink,
  revokeWitnessLink,
  getOfficialSignatures,
  downloadOfficialAgreement,
} from "@/lib/agreements.functions";
import { dealSchema, type AgreementDeal } from "@/lib/agreements/template";
import { SIGNER_CONSENT, type OfficialAgreement } from "@/lib/agreements/types";
import { SignatureBox } from "./SignatureBox";
const names: Record<string, string> = {
  draft: "Unsigned draft",
  issued: "Company signed — awaiting partner",
  partner_signed: "Awaiting witness",
  witness_signed: "All signatures saved — PDF processing",
  completed: "Completed — signed PDF available",
  superseded: "Replaced by a newer agreement",
};
function DealForm({
  partner,
  onSave,
  busy,
}: {
  partner: FarmPartner;
  onSave: (deal: AgreementDeal) => void;
  busy: boolean;
}) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
  const [form, setForm] = useState<Record<keyof AgreementDeal, string>>({
    agreementDate: today,
    startDate: partner.cycleStartDate || today,
    remittanceDate: partner.cycleEndDate || "",
    salesWindow: "",
    durationWeeks: "6",
    capital: String(partner.initialInvestment || ""),
    birds: "",
    unitFunding: "",
    partnerProfit: String(partner.profitSharePercentage),
    representative: "Ihemegbulem Chukwuebuka Gerald",
    companyAddress: "No. 9 Oduobi Crescent, Ikenegbu, Owerri, Imo State, Nigeria",
    companyPhone: "07083476366",
    witnessName: "",
  });
  const [reviewed, setReviewed] = useState(false);
  const [error, setError] = useState("");
  const fields: Array<[keyof AgreementDeal, string, string]> = [
    ["agreementDate", "Agreement date", "date"],
    ["startDate", "Actual bird placement / start date", "date"],
    ["remittanceDate", "Final accounting and remittance deadline", "date"],
    ["salesWindow", "Sales window (for example December festive sales)", "text"],
    ["durationWeeks", "Intended cycle duration (weeks)", "number"],
    ["capital", "Investment capital (NGN)", "number"],
    ["birds", "Birds allocated to this partner", "number"],
    ["unitFunding", "Funding per bird (NGN)", "number"],
    ["partnerProfit", "Investor profit share (%) — company receives the remainder", "number"],
    ["representative", "Authorised company representative", "text"],
    ["companyAddress", "Company address", "text"],
    ["companyPhone", "Company telephone", "tel"],
    ["witnessName", "Witness full legal name", "text"],
  ];
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        try {
          const numeric = ["durationWeeks", "capital", "birds", "unitFunding", "partnerProfit"];
          const parsed = dealSchema.parse(
            Object.fromEntries(
              Object.entries(form).map(([key, value]) => [
                key,
                numeric.includes(key) ? Number(value) : value,
              ]),
            ),
          );
          if (!reviewed)
            throw new Error("Confirm you have reviewed the contract's accounting terms");
          setError("");
          onSave(parsed);
        } catch (err) {
          setError(agreementError(err));
        }
      }}
      className="space-y-4 rounded-xl border p-4"
    >
      <p className="text-sm">
        Partner: <strong>{partner.fullName}</strong> · Cycle: {partner.cycleName}. Legal name, phone
        and address come from the partner profile. Correct that profile before preparing the
        agreement.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map(([key, label, type]) => (
          <label key={key} className="text-sm">
            {label}
            <input
              required
              type={type}
              step={type === "number" ? "any" : undefined}
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              className="mt-1 block min-h-11 w-full min-w-0 rounded-lg border p-2"
            />
          </label>
        ))}
      </div>
      <p className="rounded-lg bg-amber-50 p-3 text-sm">
        Important: the official agreement defines profit using invested capital and approved
        additional costs. The existing dashboard uses logged expenses. Dashboard calculations are
        unchanged and are not the final settlement statement under this agreement.
      </p>
      <label className="flex gap-2 text-sm">
        <input
          type="checkbox"
          required
          checked={reviewed}
          onChange={(e) => setReviewed(e.target.checked)}
        />
        I have reviewed the partner details, dates, funding arithmetic, profit shares and accounting
        difference before preparing this draft.
      </label>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      <button
        disabled={busy}
        className="min-h-11 rounded-lg bg-emerald-900 px-4 text-white disabled:opacity-50"
      >
        {busy ? "Saving…" : "Prepare official draft"}
      </button>
    </form>
  );
}
export function OfficialAgreementPanel({
  partner,
  passcode,
  token,
  owner = false,
}: {
  partner: FarmPartner;
  passcode?: string;
  token?: string;
  owner?: boolean;
}) {
  const list = useServerFn(listOfficialAgreements),
    create = useServerFn(createOfficialAgreement),
    sign = useServerFn(signOfficialAgreement),
    invite = useServerFn(createWitnessLink),
    revoke = useServerFn(revokeWitnessLink),
    download = useServerFn(downloadOfficialAgreement),
    getSignatures = useServerFn(getOfficialSignatures);
  const cache = useQueryClient();
  const auth = { ...(passcode ? { passcode } : {}), ...(token ? { token } : {}) };
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState("");
  const [png, setPng] = useState("");
  const [consent, setConsent] = useState(false);
  const [drawnFor, setDrawnFor] = useState("");
  const [acceptedFor, setAcceptedFor] = useState("");
  const [linkFor, setLinkFor] = useState("");
  const [link, setLink] = useState("");
  const [notice, setNotice] = useState("");
  const query = useQuery({
    queryKey: ["official-agreements", partner.id, passcode, token],
    queryFn: () => list({ data: { ...auth, partnerId: partner.id } }),
    refetchInterval: 20000,
  });
  const rows = query.data || [];
  const current =
    rows.find((a) => a.id === selected) ||
    rows.find((a) => a.cycle_name === partner.cycleName) ||
    rows[0];
  const signingContext = `${partner.id}/${current?.id}/${current?.status}`;
  const acceptedCurrent = consent && acceptedFor === signingContext;
  const drawnCurrent = !!png && drawnFor === signingContext;
  const sigs = useQuery({
    queryKey: ["official-signatures", current?.id, passcode, token, current?.status],
    queryFn: () => getSignatures({ data: { ...auth, id: current!.id } }),
    enabled: !!current,
  });
  const action = useMutation({
    mutationFn: async (
      task:
        | { kind: "create"; deal: AgreementDeal }
        | { kind: "sign" | "invite" | "revoke" | "download" | "preview" },
    ) => {
      setNotice("");
      if (task.kind === "create") {
        const result = await create({
          data: {
            passcode: passcode!,
            partnerId: partner.id,
            deal: task.deal,
            reviewedModelDifference: true,
          },
        });
        setPng("");
        setConsent(false);
        setLink("");
        setSelected(result.id);
        setShowForm(false);
        return;
      }
      if (!current) throw new Error("Choose an agreement first");
      if (task.kind === "sign") {
        if (!drawnCurrent || !acceptedCurrent)
          throw new Error("Draw your signature and accept the full agreement first");
        await sign({
          data: {
            ...auth,
            id: current.id,
            contentHash: current.content_hash,
            legalName: owner ? current.snapshot.deal.representative : current.snapshot.partnerName,
            signature: png,
            consent: true,
          },
        });
        setPng("");
        setConsent(false);
      }
      if (task.kind === "invite") {
        const result = await invite({ data: { passcode: passcode!, id: current.id } });
        setLinkFor(current.id);
        setLink(`${window.location.origin}/agreement-witness?token=${result.token}`);
        setNotice(
          `Private link expires ${new Date(result.expiresAt).toLocaleString()}. Share it only with ${current.snapshot.deal.witnessName}. Creating another link revokes this one.`,
        );
      }
      if (task.kind === "revoke") {
        await revoke({ data: { passcode: passcode!, id: current.id } });
        setLink("");
        setNotice("Witness link revoked.");
      }
      if (task.kind === "download" || task.kind === "preview")
        await saveAgreementDownload(
          await download({ data: { ...auth, id: current.id, draft: task.kind === "preview" } }),
        );
    },
    onSuccess: () => {
      cache.invalidateQueries({ queryKey: ["official-agreements", partner.id] });
      cache.invalidateQueries({ queryKey: ["official-signatures"] });
    },
  });
  const canSign =
    !!current &&
    ((owner && current.status === "draft") ||
      (!passcode &&
        !!token &&
        current.status === "issued" &&
        current.cycle_name === partner.cycleName &&
        partner.cycleStatus !== "closed"));
  return (
    <section
      id="official-agreement"
      className="min-w-0 space-y-4 rounded-2xl border border-emerald-200 bg-white p-4 sm:p-6"
    >
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-emerald-950">Official partner agreement</h3>
          <p className="text-sm text-slate-600">
            Company, investor and witness signatures · Signed original PDF · File verification
          </p>
        </div>
        {owner && partner.cycleStatus !== "closed" && (
          <button
            className="min-h-11 rounded-lg border px-4"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? "Close draft form" : "Prepare new version"}
          </button>
        )}
      </div>
      {showForm && owner && (
        <DealForm
          partner={partner}
          onSave={(deal) => action.mutate({ kind: "create", deal })}
          busy={action.isPending}
        />
      )}
      {query.isLoading && <p>Loading agreements…</p>}
      {query.error && (
        <p role="alert" className="text-red-700">
          {agreementError(query.error)}
        </p>
      )}
      {!query.isLoading && !query.error && !rows.length && (
        <p className="text-sm">
          No official agreement has been issued yet.{" "}
          {owner
            ? "Prepare a draft, review every clause and sign for the company to issue it."
            : "The Farm Owner will prepare and issue your agreement for review."}
        </p>
      )}
      {rows.length > 0 && (
        <label className="block text-sm">
          Current and previous agreement versions
          <select
            value={current?.id || ""}
            onChange={(e) => {
              setSelected(e.target.value);
              setPng("");
              setConsent(false);
              setLink("");
            }}
            className="mt-1 block min-h-11 w-full rounded-lg border p-2"
          >
            {rows.map((a) => (
              <option key={a.id} value={a.id}>
                {a.cycle_name} · {a.snapshot.deal.agreementDate} · {names[a.status]} ·{" "}
                {a.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </label>
      )}
      {current && (
        <div className="space-y-4" key={current.id}>
          <p className="rounded-lg bg-emerald-50 p-3 font-semibold">{names[current.status]}</p>
          <p className="text-xs text-amber-900">
            Final settlement follows the signed agreement. Existing dashboard calculations have not
            been changed to the agreement's capital-based profit definition.
          </p>
          <div
            role="region"
            aria-label="Full official agreement"
            tabIndex={0}
            className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap [overflow-wrap:anywhere] rounded-xl border bg-slate-50 p-4 text-sm leading-7"
          >
            {current.snapshot.terms}
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {["company", "partner", "witness"].map((role) => {
              const signature = sigs.data?.find((s) => s.signer_role === role);
              return (
                <div key={role} className="rounded-lg border p-3 text-sm">
                  <strong>
                    {role === "company"
                      ? "Company representative"
                      : role === "partner"
                        ? "Investor"
                        : "Witness"}
                  </strong>
                  <p>
                    {signature
                      ? `${signature.legal_name} — signed ${new Date(signature.signed_at).toLocaleDateString()}`
                      : "Signature pending"}
                  </p>
                </div>
              );
            })}
          </div>
          {sigs.error && (
            <p role="alert">Could not load signature status. Refresh before signing.</p>
          )}
          {canSign && (
            <div className="space-y-3 rounded-xl border p-4">
              <p className="font-semibold">
                Signing as{" "}
                {owner ? current.snapshot.deal.representative : current.snapshot.partnerName}
                {owner ? " for Dignity Agro Farms Limited" : ""}
              </p>
              <SignatureBox
                key={current.id + current.status}
                onChange={(value) => {
                  setPng(value);
                  setDrawnFor(signingContext);
                }}
                disabled={action.isPending}
              />
              <label className="flex gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={acceptedCurrent}
                  onChange={(e) => {
                    setConsent(e.target.checked);
                    setAcceptedFor(signingContext);
                  }}
                />
                {SIGNER_CONSENT}
                {owner ? " I am authorised to sign for the company." : ""}
              </label>
              <button
                disabled={action.isPending || !acceptedCurrent || !drawnCurrent}
                className="min-h-11 rounded-lg bg-emerald-900 px-4 text-white disabled:opacity-40"
                onClick={() => action.mutate({ kind: "sign" })}
              >
                {action.isPending
                  ? "Saving…"
                  : owner
                    ? "Sign for company & issue to partner"
                    : "Sign this agreement"}
              </button>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {current.status !== "completed" && (
              <button
                disabled={action.isPending}
                className="min-h-11 rounded-lg border px-4"
                onClick={() => action.mutate({ kind: "preview" })}
              >
                Download unsigned preview
              </button>
            )}
            {["witness_signed", "completed"].includes(current.status) && (
              <button
                disabled={action.isPending}
                className="min-h-11 rounded-lg bg-emerald-900 px-4 text-white"
                onClick={() => action.mutate({ kind: "download" })}
              >
                {current.status === "witness_signed"
                  ? "Finish & download signed PDF"
                  : "Download signed official PDF"}
              </button>
            )}
            {owner && current.status === "partner_signed" && (
              <>
                <button
                  disabled={action.isPending}
                  className="min-h-11 rounded-lg border px-4"
                  onClick={() => action.mutate({ kind: "invite" })}
                >
                  Create / replace witness link
                </button>
                <button
                  disabled={action.isPending}
                  className="min-h-11 rounded-lg border px-4"
                  onClick={() => action.mutate({ kind: "revoke" })}
                >
                  Revoke witness link
                </button>
              </>
            )}
          </div>
          {link && linkFor === current.id && current.status === "partner_signed" && (
            <label className="block text-sm">
              Private witness signing link
              <input
                readOnly
                value={link}
                onFocus={(e) => e.target.select()}
                className="mt-1 block min-h-11 w-full rounded-lg border p-2"
              />
              <button
                type="button"
                className="min-h-11 rounded-lg border px-4 mt-2"
                onClick={() =>
                  navigator.clipboard
                    .writeText(link)
                    .then(() =>
                      setNotice("Link copied. Share it privately with the named witness."),
                    )
                    .catch(() => setNotice("Select and copy the link manually."))
                }
              >
                Copy witness link
              </button>
            </label>
          )}
          {current.status === "completed" && (
            <a
              href={`/agreement-verify?ref=${current.id}`}
              className="inline-block min-h-11 py-3 text-sm font-semibold text-emerald-900 underline"
            >
              Verify a downloaded copy
            </a>
          )}
        </div>
      )}
      {notice && (
        <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm">
          {notice}
        </p>
      )}
      {action.error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {agreementError(action.error)}
        </p>
      )}
    </section>
  );
}
