export type AccessRole = "owner" | "manager" | "staff";
export function resolveAdminRole(input: {
  username: string;
  suppliedPasscode: string;
  suppliedHash: string;
  account: { role: string; active: boolean; passcode_hash: string } | null;
  masterUsername: string;
  masterPasscode?: string;
  legacyStaffPasscode?: string;
}): AccessRole {
  const reserved = ["owner", "admin", input.masterUsername.toLowerCase()].includes(input.username);
  if (reserved && input.masterPasscode && input.suppliedPasscode === input.masterPasscode)
    return "owner";
  if (input.account) {
    if (!input.account.active)
      throw new Error("This account is deactivated. Contact your Administrator.");
    if (
      input.account.passcode_hash === input.suppliedHash &&
      ["owner", "manager", "staff"].includes(input.account.role)
    )
      return input.account.role as AccessRole;
    throw new Error("Invalid username or passcode.");
  }
  if (
    input.username === "staff" &&
    input.legacyStaffPasscode &&
    input.suppliedPasscode === input.legacyStaffPasscode
  )
    return "staff";
  throw new Error("Invalid username or passcode.");
}
