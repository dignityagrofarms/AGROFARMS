import { createMiddleware } from "@tanstack/react-start";
import {
  mayUseRestrictedEndpoint,
  operationalFunctionName,
  operationalProjection,
} from "./financial-access";
export const enforceFinancialVisibility = createMiddleware({ type: "function" }).server(
  async ({ data, next, serverFnMeta }) => {
    const { financialAccess } = await import("./financial-access.server");
    const name = operationalFunctionName(serverFnMeta.name);
    // Login uses a separate username/password pair, and is verified by its handler.
    if (name === "adminVerifyLogin" || name === "adminRecoverPasscode") return next();
    const passcode =
      data && typeof data === "object" && "passcode" in data
        ? (data as { passcode?: unknown }).passcode
        : undefined;
    if (typeof passcode !== "string" || !passcode) return next();
    const access = await financialAccess(passcode);
    if (access.canViewFinancials) return next();
    if (!mayUseRestrictedEndpoint(name))
      throw new Error(
        "Financial figures are restricted by the Farm Owner. Use your operational workspace.",
      );
    const result = await next();
    if (name === "adminListOrders") {
      const inner = (result as { result?: { orders?: any[]; role?: string } })?.result;
      const sanitizedOrders = (inner?.orders || []).map((o) => ({
        ...o,
        subtotal: 0,
        deliveryFee: 0,
        total: 0,
        discountAmount: 0,
        items: Array.isArray(o.items)
          ? o.items.map((item: any) => ({ ...item, unitPrice: 0 }))
          : [],
      }));
      return {
        ...result,
        result: {
          ...inner,
          orders: sanitizedOrders,
          role: access.role,
          financialsRestricted: true,
        },
      };
    }
    if (
      [
        "adminListBatches",
        "adminListActivities",
        "adminListTasks",
        "adminListLeads",
      ].includes(name)
    )
      return {
        ...result,
        result: operationalProjection((result as typeof result & { result: unknown }).result),
      };
    return result;
  },
);
