/* eslint-disable @typescript-eslint/no-explicit-any -- Operational tables are newer than the generated Supabase schema. */
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { createHmac, timingSafeEqual } from "node:crypto";
export function normalizedPhone(input: string) {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "234" + digits.slice(1);
  if (digits.length === 10) digits = "234" + digits;
  if (!/^234\d{10}$/.test(digits))
    throw new Error("Enter the Nigerian phone number used on this order.");
  return digits;
}
function signature(value: string) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Customer access is unavailable.");
  return createHmac("sha256", secret).update(value).digest("hex");
}
export async function requireCustomerAccess(db: any, codeInput: string, phone?: string) {
  const code = codeInput.trim().toUpperCase();
  if (!/^(DAF|DEC)-\d{5}$/.test(code)) throw new Error("Enter your full order reference.");
  const cookieName = `daf_access_${code}`;
  const token = getCookie(cookieName);
  if (!phone && token) {
    const [expires, sig] = token.split(".");
    const expected = signature(`${code}:${expires}`);
    if (
      Number(expires) > Date.now() &&
      sig?.length === expected.length &&
      timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    )
      return;
  }
  if (!phone) throw new Error("Verify the phone number used on this order to continue.");
  const canonical = normalizedPhone(phone);
  const table = code.startsWith("DEC-") ? "preorders" : "orders";
  const field = table === "orders" ? "order_code" : "preorder_code";
  const { data, error } = await db.from(table).select("phone").eq(field, code).maybeSingle();
  if (error) throw new Error("Order verification is temporarily unavailable.");
  if (!data || normalizedPhone(data.phone) !== canonical)
    throw new Error("The reference and phone number do not match.");
  const expires = Date.now() + 60 * 60 * 1000;
  setCookie(cookieName, `${expires}.${signature(`${code}:${expires}`)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 3600,
  });
}
