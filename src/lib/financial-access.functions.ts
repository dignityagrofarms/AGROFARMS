import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkOwner, checkPasscode } from "./orders.functions";
export const getFinancialAccess = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ passcode: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    const { financialAccess } = await import("./financial-access.server");
    const access = await financialAccess(data.passcode);
    if (access.role !== "owner")
      return {
        role: access.role,
        canViewFinancials: access.canViewFinancials,
        staff: false,
        manager: false,
      };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: settings, error } = await supabaseAdmin
      .from("app_settings")
      .select("key,value")
      .in("key", ["financial_visibility_staff", "financial_visibility_manager"]);
    if (error) throw new Error("Could not read visibility settings");
    return {
      ...access,
      staff: settings?.find((s) => s.key === "financial_visibility_staff")?.value === "true",
      manager: settings?.find((s) => s.key === "financial_visibility_manager")?.value === "true",
    };
  });
export const setFinancialAccess = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ passcode: z.string(), staff: z.boolean(), manager: z.boolean() }).parse(input),
  )
  .handler(async ({ data }) => {
    await checkOwner(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("app_settings").upsert(
      [
        { key: "financial_visibility_staff", value: String(data.staff) },
        { key: "financial_visibility_manager", value: String(data.manager) },
      ],
      { onConflict: "key" },
    );
    if (error) throw new Error("Could not save financial visibility");
    return { ok: true };
  });
export const adminOperationalOrders = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ passcode: z.string() }).parse(input))
  .handler(async ({ data }) => {
    await checkPasscode(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: orders, error } = await supabaseAdmin
      .from("orders")
      .select("id,order_code,customer_name,phone,address,status,items,created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error("Could not load operational orders");
    return (orders || []).map((o) => ({
      id: o.id,
      code: o.order_code,
      customerName: o.customer_name,
      phone: o.phone,
      address: o.address,
      status: o.status,
      createdAt: o.created_at,
      items: (Array.isArray(o.items) ? o.items : []).map((i) => {
        const item = i as Record<string, unknown>;
        return {
          product: String(item.product || ""),
          option: String(item.option || ""),
          quantity: Number(item.qty || 0),
        };
      }),
    }));
  });
