/* eslint-disable @typescript-eslint/no-explicit-any -- Versioned agreement tables are newer than generated database types. */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { checkOwnerOrManager, verifySession } from "../partners.functions";
import type { OfficialAgreement, AgreementSignature } from "./types";
export const agreementDb = supabaseAdmin as any;
export async function sha256(input: string | Uint8Array) {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (n) => n.toString(16).padStart(2, "0")).join("");
}
export async function agreementAccess(
  auth: { passcode?: string; token?: string },
  partnerId: string,
) {
  if (auth.passcode) {
    const access = await checkOwnerOrManager(auth.passcode);
    return { role: access.role, username: access.username };
  }
  if (!auth.token) throw new Error("Sign in to access this agreement");
  const session = await verifySession(auth.token);
  if (session.pid !== partnerId) throw new Error("Agreement access denied");
  const { data, error } = await agreementDb
    .from("farm_partners")
    .select("id,active,username")
    .eq("id", session.pid)
    .single();
  if (error || !data?.active || data.username !== session.u)
    throw new Error("Partner access is no longer active");
  const { setRequestActor } = await import("../request-actor.server");
  await setRequestActor(session.u, "partner");
  return { role: "partner" as const, username: session.u };
}
export async function agreementRow(id: string): Promise<OfficialAgreement> {
  const { data, error } = await agreementDb
    .from("official_agreements")
    .select(
      "id,partner_id,cycle_name,template_version,snapshot,content_hash,status,created_at,completed_at,pdf_hash",
    )
    .eq("id", id)
    .single();
  if (error || !data) throw new Error("Agreement unavailable");
  return data;
}
export async function signatures(id: string): Promise<AgreementSignature[]> {
  const { data, error } = await agreementDb
    .from("official_agreement_signatures")
    .select("signer_role,legal_name,signature_png,consent,content_hash,signed_at")
    .eq("agreement_id", id)
    .order("signed_at");
  if (error) throw new Error("Could not load signatures");
  return data;
}
export async function witnessAccess(token: string) {
  const tokenHash = await sha256(token);
  const { data, error } = await agreementDb
    .from("official_agreements")
    .select("id,witness_expires_at,status")
    .eq("witness_token_hash", tokenHash)
    .single();
  if (
    error ||
    !data ||
    data.status !== "partner_signed" ||
    !(Date.parse(data.witness_expires_at) > Date.now())
  )
    throw new Error(
      "This witness link is expired, revoked, already used, or not ready. Ask the farm for a new link.",
    );
  return { id: data.id, tokenHash };
}
export function validateSignature(png: string) {
  if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(png) || png.length > 220000)
    throw new Error("Draw a valid signature in the signature box");
  const bytes = Uint8Array.from(atob(png.split(",")[1]), (c) => c.charCodeAt(0));
  if (bytes.length < 100 || [137, 80, 78, 71, 13, 10, 26, 10].some((n, i) => bytes[i] !== n))
    throw new Error("Invalid PNG signature");
  const view = new DataView(bytes.buffer);
  const w = view.getUint32(16),
    h = view.getUint32(20);
  if (w < 1 || h < 1 || w > 1200 || h > 600 || w * h > 720000)
    throw new Error("Signature image dimensions are invalid");
}
export async function savedOfficialPdf(id: string) {
  const a = await agreementRow(id);
  if (!["witness_signed", "completed"].includes(a.status))
    throw new Error("All three parties must sign before the final PDF is issued");
  const signed = await signatures(id);
  if (signed.length !== 3 || signed.some((s) => s.content_hash !== a.content_hash))
    throw new Error("Signature verification failed");
  const path = `${a.partner_id}/${a.id}/signed.pdf`;
  const bucket = supabaseAdmin.storage.from("official-agreements");
  const existing = await bucket.download(path);
  let bytes: Uint8Array;
  if (existing.data) bytes = new Uint8Array(await existing.data.arrayBuffer());
  else {
    if (a.status === "completed")
      throw new Error(
        "The official file is unavailable; contact the farm. It will not be regenerated.",
      );
    const { agreementPdf } = await import("./pdf.server");
    bytes = agreementPdf(a, signed);
    const upload = await bucket.upload(path, bytes, {
      contentType: "application/pdf",
      upsert: false,
    });
    if (upload.error) {
      const retry = await bucket.download(path);
      if (!retry.data)
        throw new Error(
          "Signatures saved. PDF storage is temporarily unavailable; retry the download shortly.",
        );
      bytes = new Uint8Array(await retry.data.arrayBuffer());
    }
  }
  const hash = await sha256(bytes);
  if (a.pdf_hash && a.pdf_hash !== hash) throw new Error("Stored document integrity check failed");
  if (a.status !== "completed") {
    const { error } = await agreementDb
      .from("official_agreements")
      .update({
        status: "completed",
        pdf_path: path,
        pdf_hash: hash,
        completed_at: signed.find((s) => s.signer_role === "witness")!.signed_at,
      })
      .eq("id", id)
      .eq("status", "witness_signed");
    if (error)
      throw new Error("Signatures and file are saved; retry to finish document registration");
  }
  return { bytes, hash };
}
