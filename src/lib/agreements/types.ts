import type { AgreementSnapshot } from "./template";
export type AgreementStatus =
  "draft" | "issued" | "partner_signed" | "witness_signed" | "completed" | "superseded";
export type OfficialAgreement = {
  id: string;
  partner_id: string;
  cycle_name: string;
  template_version: string;
  snapshot: AgreementSnapshot;
  content_hash: string;
  status: AgreementStatus;
  created_at: string;
  completed_at: string | null;
  pdf_hash: string | null;
};
export type AgreementSignature = {
  signer_role: "company" | "partner" | "witness";
  legal_name: string;
  signature_png: string;
  consent: string;
  content_hash: string;
  signed_at: string;
};
export const SIGNER_CONSENT =
  "I have read the full agreement, understand its commercial risks and consent to sign this version voluntarily.";
export const WITNESS_CONSENT =
  "I confirm that I witnessed both parties signing this agreement, have reviewed this version, and sign voluntarily as the named witness.";
