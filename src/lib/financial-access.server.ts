import { checkPasscode } from "./orders.functions";
export async function financialAccess(passcode: string) {
  const role = await checkPasscode(passcode);
  if (role === "owner") return { role, canViewFinancials: true, staff: false, manager: false };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("app_settings")
    .select("key,value")
    .in("key", ["financial_visibility_staff", "financial_visibility_manager"]);
  if (error) throw new Error("Financial access settings are unavailable. Please retry.");
  const staff = data?.find((r) => r.key === "financial_visibility_staff")?.value === "true";
  const manager = data?.find((r) => r.key === "financial_visibility_manager")?.value === "true";
  return { role, canViewFinancials: role === "staff" ? staff : manager, staff, manager };
}
export async function requireFinancialAccess(passcode: string) {
  const access = await financialAccess(passcode);
  if (!access.canViewFinancials)
    throw new Error(
      "Financial figures are restricted by the Farm Owner. You can submit your own sales and expenses in Operations.",
    );
  return access;
}
