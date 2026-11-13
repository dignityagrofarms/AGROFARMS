import { regularFont, boldFont } from "./pdf-fonts.ts";
import { jsPDF } from "jspdf";
import { base64Logo } from "../receipt-logo.ts";
import type { OfficialAgreement, AgreementSignature } from "./types";
export function agreementPdf(
  agreement: OfficialAgreement,
  signatures: AgreementSignature[],
  draft = false,
): Uint8Array {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  doc.addFileToVFS("DejaVuSans.ttf", regularFont);
  doc.addFont("DejaVuSans.ttf", "DejaVuSans", "normal");
  doc.addFileToVFS("DejaVuSans-Bold.ttf", boldFont);
  doc.addFont("DejaVuSans-Bold.ttf", "DejaVuSans", "bold");
  doc.setFont("DejaVuSans", "normal");
  const last = signatures.reduce(
    (latest, s) => (s.signed_at > latest ? s.signed_at : latest),
    agreement.created_at,
  );
  doc.setCreationDate(new Date(last));
  doc.setFileId(agreement.content_hash.slice(0, 32));
  doc.setProperties({
    title: "Dignity Agro Farms — Official Partner Agreement",
    subject: agreement.id,
    author: "Dignity Agro Farms Limited",
    creator: "Dignity Agro Farms Partner Agreements",
  });
  let y = 42;
  const addPage = () => {
    doc.addPage();
    y = 28;
  };
  const text = (line: string, size = 9.5, bold = false, width = 170) => {
    doc.setFont("DejaVuSans", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(20, 42, 30);
    const safe = line
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/[–—]/g, "-")
      .replace(/×/g, "x")
      .replace(/₦/g, "NGN ");
    const lines = doc.splitTextToSize(safe, width) as string[];
    for (const row of lines) {
      if (y > 258) addPage();
      doc.text(row, 20, y);
      y += 4.5;
    }
    y += 1.5;
  };
  doc.addImage(base64Logo, "PNG", 20, 13, 42, 17);
  doc.setFontSize(9);
  doc.setTextColor(15, 61, 36);
  doc.text("OFFICIAL PARTNER AGREEMENT", 190, 23, { align: "right" });
  for (const paragraph of agreement.snapshot.terms.split("\n")) {
    if (!paragraph.trim()) {
      y += 2;
      continue;
    }
    text(
      paragraph,
      /^\d+\.|^SIGNATORIES|^PARTIES/.test(paragraph) ? 10.5 : 9.5,
      /^\d+\.|^SIGNATORIES|^DIGNITY|^POULTRY/.test(paragraph),
    );
  }
  addPage();
  text("EXECUTION & CONSENT", 12, true);
  if (!draft) {
    const sy = 61;
    doc.setDrawColor(15, 61, 36);
    doc.setLineWidth(0.8);
    doc.circle(151, sy, 24);
    doc.circle(151, sy, 21);
    doc.addImage(base64Logo, "PNG", 133, sy - 12, 36, 14);
    doc.setFontSize(7);
    doc.text("DIGNITY AGRO FARMS LIMITED", 151, sy + 5, { align: "center" });
    doc.text("DIGITAL COMPANY SEAL", 151, sy + 10, { align: "center" });
    doc.setFontSize(6);
    doc.text(agreement.id.slice(0, 18), 151, sy + 15, { align: "center" });
  }

  for (const role of ["company", "partner", "witness"] as const) {
    const signature = signatures.find((s) => s.signer_role === role);
    if (y > 209) addPage();
    text(
      role === "company"
        ? "For Dignity Agro Farms Limited"
        : role === "partner"
          ? "Investor"
          : "Witness",
      10,
      true,
    );
    text(
      signature
        ? `${signature.legal_name} | Signed ${new Date(signature.signed_at).toLocaleString("en-GB", { timeZone: "Africa/Lagos" })} (Africa/Lagos)`
        : "Signature pending — unsigned draft",
      9,
      false,
      role === "company" ? 103 : 170,
    );
    if (signature) {
      doc.addImage(signature.signature_png, "PNG", 20, y, 62, 18);
      y += 21;
      text(signature.consent, 8, false, role === "company" ? 103 : 170);
    }
  }
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.saveGraphicsState();
    doc.setGState(doc.GState({ opacity: 0.08 }));
    doc.setTextColor(15, 61, 36);
    doc.setFontSize(33);
    doc.text(draft ? "UNSIGNED DRAFT" : "DIGNITY AGRO FARMS", 32, 175, { angle: 38 });
    doc.restoreGraphicsState();
    doc.setFont("DejaVuSans", "normal");
    doc.setFontSize(7);
    doc.setTextColor(65, 75, 67);
    doc.text(
      `Agreement ${agreement.id} | ${draft ? "UNSIGNED PREVIEW" : "SIGNED OFFICIAL COPY"} | Page ${i} of ${pages}`,
      20,
      274,
    );
    doc.text(`Verify: https://dignityagrofarms.com/agreement-verify?ref=${agreement.id}`, 20, 280);
    doc.setFontSize(6);
    doc.text(`Terms fingerprint: ${agreement.content_hash}`, 20, 285);
  }
  return new Uint8Array(doc.output("arraybuffer"));
}
