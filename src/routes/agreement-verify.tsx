import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { verifyOfficialAgreementFile } from "@/lib/agreements.functions";
export const Route = createFileRoute("/agreement-verify")({
  validateSearch: (search: Record<string, unknown>) => ({
    ref: typeof search.ref === "string" ? search.ref : "",
  }),
  head: () => ({
    meta: [
      { title: "Verify an agreement · Dignity Agro Farms" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: VerifyAgreement,
});
function VerifyAgreement() {
  const { ref } = Route.useSearch();
  const [reference, setReference] = useState(ref);
  const [file, setFile] = useState<File | null>(null);
  const verify = useServerFn(verifyOfficialAgreementFile);
  const mutation = useMutation({
    mutationFn: async () => {
      if (!file || file.size > 10 * 1024 * 1024)
        throw new Error("Choose a PDF no larger than 10 MB");
      if (!/^[a-f0-9-]{36}$/i.test(reference.trim()))
        throw new Error("Enter the agreement reference printed on the PDF");
      const hash = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
      const fileHash = Array.from(new Uint8Array(hash), (n) =>
        n.toString(16).padStart(2, "0"),
      ).join("");
      return verify({ data: { id: reference.trim(), fileHash } });
    },
  });
  return (
    <main className="mx-auto max-w-xl space-y-5 p-5 sm:p-10">
      <h1 className="text-2xl font-bold text-emerald-950">Verify an official agreement</h1>
      <p>
        Check whether your PDF is exactly the signed original saved by Dignity Agro Farms. The file
        is checked on your device; its contents are not uploaded.
      </p>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <label className="block">
          Agreement reference
          <input
            required
            value={reference}
            onChange={(e) => {
              setReference(e.target.value);
              mutation.reset();
            }}
            className="mt-1 block min-h-11 w-full rounded-lg border p-2"
          />
        </label>
        <label className="block">
          Signed PDF
          <input
            required
            type="file"
            accept="application/pdf,.pdf"
            className="mt-1 block min-h-11 w-full"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              mutation.reset();
            }}
          />
        </label>
        <button
          disabled={mutation.isPending}
          className="min-h-11 rounded-lg bg-emerald-900 px-5 text-white"
        >
          {mutation.isPending ? "Checking…" : "Verify this PDF"}
        </button>
      </form>
      {mutation.data && (
        <p
          role="status"
          className={`rounded-xl p-4 ${mutation.data.authentic ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}
        >
          {mutation.data.authentic
            ? "Verified: this file matches the completed official signed agreement."
            : "Not verified: this file does not match a completed official agreement. It may be unsigned, altered, or use an incorrect reference. Contact the farm for the saved original."}
        </p>
      )}
      {mutation.error && (
        <p role="alert" className="text-red-700">
          {mutation.error.message}
        </p>
      )}
    </main>
  );
}
