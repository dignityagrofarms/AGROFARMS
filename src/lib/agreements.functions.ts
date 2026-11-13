import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkOwner, parseAdminCredential } from "./orders.functions";
import { dealSchema, renderAgreement } from "./agreements/template";
import { SIGNER_CONSENT, WITNESS_CONSENT } from "./agreements/types";
const auth = {
  passcode: z.string().min(1).max(500).optional(),
  token: z.string().min(10).max(2000).optional(),
};
const version = z.object({ ...auth, id: z.string().uuid() });
const signing = z.object({
  id: z.string().uuid(),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  legalName: z.string().trim().min(3).max(150),
  signature: z.string().min(150).max(220000),
  consent: z.literal(true),
});
const witnessToken = z.string().regex(/^[a-f0-9]{64}$/);
export const listOfficialAgreements = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ ...auth, partnerId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { agreementAccess, agreementDb } = await import("./agreements/service.server");
    const access = await agreementAccess(data, data.partnerId);
    let query = agreementDb
      .from("official_agreements")
      .select(
        "id,partner_id,cycle_name,template_version,snapshot,content_hash,status,created_at,completed_at,pdf_hash",
      )
      .eq("partner_id", data.partnerId)
      .order("created_at", { ascending: false });
    if (access.role === "partner") query = query.neq("status", "draft");
    const { data: rows, error } = await query;
    if (error)
      throw new Error("Official agreements are unavailable. Please retry or contact the farm.");
    return rows as import("./agreements/types").OfficialAgreement[];
  });
export const createOfficialAgreement = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        passcode: z.string(),
        partnerId: z.string().uuid(),
        deal: dealSchema,
        reviewedModelDifference: z.literal(true),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    await checkOwner(data.passcode);
    const { agreementDb, sha256 } = await import("./agreements/service.server");
    const { data: p, error } = await agreementDb
      .from("farm_partners")
      .select("id,full_name,phone,address,cycle_name,cycle_status")
      .eq("id", data.partnerId)
      .single();
    if (error || !p) throw new Error("Partner not found");
    if (p.cycle_status === "closed")
      throw new Error("Open a new cycle before preparing a new agreement");
    const snapshot = renderAgreement(
      {
        id: p.id,
        fullName: p.full_name,
        phone: p.phone || "",
        address: p.address || "",
        cycleName: p.cycle_name,
      },
      data.deal,
    );
    const contentHash = await sha256(JSON.stringify(snapshot));
    const result = await agreementDb
      .from("official_agreements")
      .insert({
        partner_id: p.id,
        cycle_name: p.cycle_name,
        template_version: snapshot.templateVersion,
        snapshot,
        content_hash: contentHash,
        created_by: parseAdminCredential(data.passcode).username,
      })
      .select("id")
      .single();
    if (result.error) throw new Error("Could not save the agreement draft");
    return { id: result.data.id as string };
  });
export const signOfficialAgreement = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => signing.extend(auth).parse(input))
  .handler(async ({ data }) => {
    const { agreementAccess, agreementRow, agreementDb, validateSignature } =
      await import("./agreements/service.server");
    const a = await agreementRow(data.id);
    const access = await agreementAccess(data, a.partner_id);
    if (access.role !== "owner" && access.role !== "partner")
      throw new Error("Only the owner or named partner can sign");
    if (access.role === "partner" && a.status !== "issued")
      throw new Error("This agreement is not awaiting your signature");
    if (access.role === "owner" && a.status !== "draft")
      throw new Error("Only an unsigned draft can be issued");
    validateSignature(data.signature);
    const { error } = await agreementDb.rpc("sign_official_agreement", {
      agreement_input: a.id,
      role_input: access.role === "owner" ? "company" : "partner",
      name_input: data.legalName,
      png_input: data.signature,
      hash_input: data.contentHash,
      consent_input: SIGNER_CONSENT,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
export const createWitnessLink = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ passcode: z.string(), id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    await checkOwner(data.passcode);
    const { agreementDb, agreementRow, sha256 } = await import("./agreements/service.server");
    const a = await agreementRow(data.id);
    if (a.status !== "partner_signed")
      throw new Error("The company and partner must sign before inviting the witness");
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) =>
      n.toString(16).padStart(2, "0"),
    ).join("");
    const expiresAt = new Date(Date.now() + 72 * 3600000).toISOString();
    const { data: updated, error } = await agreementDb
      .from("official_agreements")
      .update({ witness_token_hash: await sha256(token), witness_expires_at: expiresAt })
      .eq("id", a.id)
      .eq("status", "partner_signed")
      .select("id")
      .single();
    if (error || !updated) throw new Error("Could not issue a witness link");
    return { token, expiresAt };
  });
export const revokeWitnessLink = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ passcode: z.string(), id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    await checkOwner(data.passcode);
    const { agreementDb } = await import("./agreements/service.server");
    const { error } = await agreementDb
      .from("official_agreements")
      .update({ witness_token_hash: null, witness_expires_at: null })
      .eq("id", data.id)
      .eq("status", "partner_signed");
    if (error) throw new Error("Could not revoke link");
    return { ok: true };
  });
export const getWitnessAgreement = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ witnessToken }).parse(input))
  .handler(async ({ data }) => {
    const { witnessAccess, agreementRow, signatures } = await import("./agreements/service.server");
    const access = await witnessAccess(data.witnessToken);
    return { agreement: await agreementRow(access.id), signatures: await signatures(access.id) };
  });
export const signWitnessAgreement = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => signing.extend({ witnessToken }).parse(input))
  .handler(async ({ data }) => {
    const { witnessAccess, agreementDb, validateSignature, savedOfficialPdf } =
      await import("./agreements/service.server");
    const access = await witnessAccess(data.witnessToken);
    if (access.id !== data.id) throw new Error("Witness access denied");
    validateSignature(data.signature);
    const { setRequestActor } = await import("./request-actor.server");
    await setRequestActor(`witness:${access.id}`, "witness");
    const { error } = await agreementDb.rpc("sign_official_agreement", {
      agreement_input: access.id,
      role_input: "witness",
      name_input: data.legalName,
      png_input: data.signature,
      hash_input: data.contentHash,
      consent_input: WITNESS_CONSENT,
      witness_hash_input: access.tokenHash,
    });
    if (error) throw new Error(error.message);
    try {
      await savedOfficialPdf(access.id);
      return { ok: true, pdfReady: true };
    } catch {
      return { ok: true, pdfReady: false };
    }
  });
export const getOfficialSignatures = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => version.parse(input))
  .handler(async ({ data }) => {
    const { agreementRow, agreementAccess, signatures } =
      await import("./agreements/service.server");
    const a = await agreementRow(data.id);
    const access = await agreementAccess(data, a.partner_id);
    if (access.role === "partner" && a.status === "draft") throw new Error("Draft not issued");
    return signatures(a.id);
  });
export const downloadOfficialAgreement = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    version.extend({ draft: z.boolean().default(false) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { agreementRow, agreementAccess, signatures, savedOfficialPdf, sha256 } =
      await import("./agreements/service.server");
    const a = await agreementRow(data.id);
    const access = await agreementAccess(data, a.partner_id);
    if (access.role === "partner" && a.status === "draft") throw new Error("Draft not issued");
    let bytes: Uint8Array;
    let hash: string;
    if (data.draft) {
      const { agreementPdf } = await import("./agreements/pdf.server");
      bytes = agreementPdf(a, await signatures(a.id), true);
      hash = await sha256(bytes);
    } else {
      ({ bytes, hash } = await savedOfficialPdf(a.id));
    }
    let base64 = "";
    for (const n of bytes) base64 += String.fromCharCode(n);
    return {
      base64: btoa(base64),
      sha256: hash,
      filename: `Dignity_Agreement_${a.id}${data.draft ? "_UNSIGNED" : "_SIGNED"}.pdf`,
    };
  });
export const verifyOfficialAgreementFile = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), fileHash: z.string().regex(/^[a-f0-9]{64}$/) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { agreementDb } = await import("./agreements/service.server");
    const { data: row, error } = await agreementDb
      .from("official_agreements")
      .select("status,pdf_hash")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error("Verification is temporarily unavailable");
    return { authentic: !!row && row.status === "completed" && row.pdf_hash === data.fileHash };
  });
