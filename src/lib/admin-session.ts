/** Activity timestamps are session metadata, never authentication/query identity. */
export function stableAdminCredential(value: string): string {
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed.username === "string" && typeof parsed.passcode === "string")
      return JSON.stringify({
        username: parsed.username.trim().toLowerCase(),
        passcode: parsed.passcode,
      });
  } catch {
    /* Preserve legacy credentials for the existing verifier. */
  }
  return value;
}
export function isSessionDenied(error: unknown): boolean {
  const message = error instanceof Error ? error.message : "";
  return /invalid (?:username or passcode|login details)|account is deactivated|your session (?:is invalid|has expired)|partner account is inactive|partner access is no longer active/i.test(
    message,
  );
}
