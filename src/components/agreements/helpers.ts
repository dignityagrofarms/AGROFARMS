export function agreementError(error: unknown) {
  const message = error instanceof Error ? error.message : "Please retry this action";
  try {
    const issues = JSON.parse(message);
    if (Array.isArray(issues)) return issues.map((i) => i.message).join(". ");
  } catch {
    /* plain error message */
  }
  return message;
}
export async function saveAgreementDownload(result: { base64: string; filename: string }) {
  const bytes = Uint8Array.from(atob(result.base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = result.filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
