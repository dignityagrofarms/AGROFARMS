import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type ComplaintCategory =
  | "Late Delivery / Delay"
  | "Item Quality / Weight Issue"
  | "Wrong / Missing Item"
  | "Payment & Verification Issue"
  | "Staff / Rider Service"
  | "Other / General Feedback";

export const COMPLAINT_CATEGORIES: ComplaintCategory[] = [
  "Late Delivery / Delay",
  "Item Quality / Weight Issue",
  "Wrong / Missing Item",
  "Payment & Verification Issue",
  "Staff / Rider Service",
  "Other / General Feedback",
];

export interface CustomerComplaint {
  id: string;
  ticketCode: string;
  customerName: string;
  phone: string;
  email: string | null;
  orderCode: string | null;
  category: string;
  message: string;
  status: "pending" | "resolved";
  resolutionNote: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

function makeTicketCode(): string {
  const n = Math.floor(10000 + Math.random() * 90000);
  return `CMP-${n}`;
}

export function generateCustomerWhatsAppLink(data: {
  ticketCode: string;
  customerName: string;
  phone: string;
  orderCode?: string | null;
  category: string;
  message: string;
}): string {
  const digits = "2348167099492"; // Official Farm WhatsApp
  const text =
    `🔴 NEW CUSTOMER COMPLAINT [Ticket: ${data.ticketCode}]\n\n` +
    `Name: ${data.customerName}\n` +
    `Phone: ${data.phone}\n` +
    (data.orderCode ? `Order Code: ${data.orderCode}\n` : "") +
    `Category: ${data.category}\n\n` +
    `Issue Details:\n${data.message}\n\n` +
    `Please assist me with resolving this issue. Thank you!`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function generateResolutionWhatsAppLink(complaint: CustomerComplaint): string {
  const digits = complaint.phone.replace(/\D+/g, "");
  const formattedDigits = digits.startsWith("0") ? "234" + digits.slice(1) : digits;
  const first = complaint.customerName.split(" ")[0];
  const noteText = complaint.resolutionNote ? `\nResolution Details: ${complaint.resolutionNote}` : "";

  const text =
    `Hi ${first}, this is Dignity Agro Farms regarding your complaint [Ticket ${complaint.ticketCode}].\n\n` +
    `✅ Your issue has been marked as RESOLVED by our customer care team.${noteText}\n\n` +
    `If you have any further questions, please reply to this message or call 08167099492. Thank you for your patience!`;

  return `https://wa.me/${formattedDigits}?text=${encodeURIComponent(text)}`;
}

// In-memory fallback if Supabase DB table is unavailable during initial deployment
const memoryComplaints: CustomerComplaint[] = [];

// Helper to notify official email (dignityagrofarms@gmail.com)
async function sendOfficialEmailNotification(complaint: CustomerComplaint) {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    const officialEmail = process.env.OFFICIAL_FARM_EMAIL || "dignityagrofarms@gmail.com";

    if (resendApiKey) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Dignity Agro Farms Complaints <complaints@dignityagrofarms.com>",
          to: [officialEmail],
          subject: `🚨 New Customer Complaint: Ticket #${complaint.ticketCode} (${complaint.customerName})`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded-lg: 12px;">
              <h2 style="color: #991b1b;">⚠️ New Customer Complaint Logged</h2>
              <p><strong>Ticket Code:</strong> ${complaint.ticketCode}</p>
              <p><strong>Customer Name:</strong> ${complaint.customerName}</p>
              <p><strong>Phone:</strong> ${complaint.phone}</p>
              <p><strong>Email:</strong> ${complaint.email || "N/A"}</p>
              <p><strong>Order Code:</strong> ${complaint.orderCode || "N/A"}</p>
              <p><strong>Category:</strong> ${complaint.category}</p>
              <hr style="border: 0; border-top: 1px solid #cbd5e1;" />
              <h3>Message / Issue:</h3>
              <blockquote style="background: #f8fafc; padding: 12px; border-left: 4px solid #ef4444; margin: 0;">
                ${complaint.message}
              </blockquote>
              <p style="margin-top: 20px; font-size: 12px; color: #64748b;">Log into your Admin Dashboard to investigate and mark as resolved.</p>
            </div>
          `,
        }),
      });
    } else {
      console.log(`[COMPLAINT EMAIL NOTIFICATION LOG] To: ${officialEmail} | Ticket: ${complaint.ticketCode}`);
    }
  } catch (err) {
    console.error("Failed to send complaint email notification:", err);
  }
}

// 1. Submit Public Complaint
export const submitCustomerComplaint = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        customerName: z.string().trim().min(2).max(120),
        phone: z.string().trim().min(7).max(30),
        email: z.string().trim().email().optional().or(z.literal("")),
        orderCode: z.string().trim().max(40).optional().or(z.literal("")),
        category: z.string().min(1),
        message: z.string().trim().min(5).max(3000),
      })
      .parse(d)
  )
  .handler(async ({ data }) => {
    const ticketCode = makeTicketCode();
    const now = new Date().toISOString();

    const newComplaint: CustomerComplaint = {
      id: "cmp_" + Math.random().toString(36).substring(2, 9),
      ticketCode,
      customerName: data.customerName,
      phone: data.phone,
      email: data.email || null,
      orderCode: data.orderCode ? data.orderCode.trim().toUpperCase() : null,
      category: data.category,
      message: data.message,
      status: "pending",
      resolutionNote: null,
      resolvedAt: null,
      resolvedBy: null,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: inserted, error } = await supabaseAdmin
        .from("customer_complaints")
        .insert({
          ticket_code: ticketCode,
          customer_name: data.customerName,
          phone: data.phone,
          email: data.email || null,
          order_code: data.orderCode ? data.orderCode.trim().toUpperCase() : null,
          category: data.category,
          message: data.message,
          status: "pending",
        })
        .select()
        .single();

      if (!error && inserted) {
        newComplaint.id = inserted.id;
      } else {
        memoryComplaints.unshift(newComplaint);
      }
    } catch {
      memoryComplaints.unshift(newComplaint);
    }

    // Trigger official email notification asynchronously
    void sendOfficialEmailNotification(newComplaint);

    const whatsappUrl = generateCustomerWhatsAppLink({
      ticketCode: newComplaint.ticketCode,
      customerName: newComplaint.customerName,
      phone: newComplaint.phone,
      orderCode: newComplaint.orderCode,
      category: newComplaint.category,
      message: newComplaint.message,
    });

    return {
      success: true,
      ticketCode: newComplaint.ticketCode,
      whatsappUrl,
      complaint: newComplaint,
    };
  });

// 2. Admin List Complaints
export const adminListComplaints = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        passcode: z.string(),
      })
      .parse(d)
  )
  .handler(async () => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: rows, error } = await supabaseAdmin
        .from("customer_complaints")
        .select("*")
        .order("created_at", { ascending: false });

      if (error || !rows) {
        return { complaints: memoryComplaints };
      }

      const complaints: CustomerComplaint[] = rows.map((r: any) => ({
        id: r.id,
        ticketCode: r.ticket_code,
        customerName: r.customer_name,
        phone: r.phone,
        email: r.email,
        orderCode: r.order_code,
        category: r.category,
        message: r.message,
        status: r.status === "resolved" ? "resolved" : "pending",
        resolutionNote: r.resolution_note,
        resolvedAt: r.resolved_at,
        resolvedBy: r.resolved_by,
        createdAt: r.created_at,
        updatedAt: r.updated_at || r.created_at,
      }));

      // Combine DB with memory fallback if any exist
      const existingIds = new Set(complaints.map((c) => c.id));
      for (const mc of memoryComplaints) {
        if (!existingIds.has(mc.id)) {
          complaints.unshift(mc);
        }
      }

      return { complaints };
    } catch {
      return { complaints: memoryComplaints };
    }
  });

// 3. Admin Resolve Complaint
export const adminResolveComplaint = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        passcode: z.string(),
        id: z.string(),
        resolutionNote: z.string().trim().optional(),
        resolvedBy: z.string().trim().optional(),
      })
      .parse(d)
  )
  .handler(async ({ data }) => {
    const now = new Date().toISOString();
    const resolutionNote = data.resolutionNote || "Resolved by admin";

    // Update in memory fallback
    const memIndex = memoryComplaints.findIndex((c) => c.id === data.id);
    if (memIndex !== -1) {
      memoryComplaints[memIndex].status = "resolved";
      memoryComplaints[memIndex].resolutionNote = resolutionNote;
      memoryComplaints[memIndex].resolvedAt = now;
      memoryComplaints[memIndex].resolvedBy = data.resolvedBy || "Admin";
    }

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("customer_complaints")
        .update({
          status: "resolved",
          resolution_note: resolutionNote,
          resolved_at: now,
          resolved_by: data.resolvedBy || "Admin",
          updated_at: now,
        })
        .eq("id", data.id);
    } catch {
      // Handled in memory
    }

    return { success: true };
  });

// 4. Admin Log Offline Complaint
export const adminCreateComplaint = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        passcode: z.string(),
        customerName: z.string().trim().min(2).max(120),
        phone: z.string().trim().min(7).max(30),
        email: z.string().trim().optional().or(z.literal("")),
        orderCode: z.string().trim().optional().or(z.literal("")),
        category: z.string().min(1),
        message: z.string().trim().min(5).max(3000),
        status: z.enum(["pending", "resolved"]).default("pending"),
        resolutionNote: z.string().trim().optional(),
      })
      .parse(d)
  )
  .handler(async ({ data }) => {
    const ticketCode = makeTicketCode();
    const now = new Date().toISOString();

    const newComplaint: CustomerComplaint = {
      id: "cmp_" + Math.random().toString(36).substring(2, 9),
      ticketCode,
      customerName: data.customerName,
      phone: data.phone,
      email: data.email || null,
      orderCode: data.orderCode ? data.orderCode.trim().toUpperCase() : null,
      category: data.category,
      message: data.message,
      status: data.status,
      resolutionNote: data.resolutionNote || null,
      resolvedAt: data.status === "resolved" ? now : null,
      resolvedBy: data.status === "resolved" ? "Admin" : null,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("customer_complaints").insert({
        ticket_code: ticketCode,
        customer_name: data.customerName,
        phone: data.phone,
        email: data.email || null,
        order_code: data.orderCode ? data.orderCode.trim().toUpperCase() : null,
        category: data.category,
        message: data.message,
        status: data.status,
        resolution_note: data.resolutionNote || null,
        resolved_at: data.status === "resolved" ? now : null,
        resolved_by: data.status === "resolved" ? "Admin" : null,
      });
    } catch {
      memoryComplaints.unshift(newComplaint);
    }

    return { success: true, ticketCode };
  });

// 5. Admin Delete Complaint
export const adminDeleteComplaint = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        passcode: z.string(),
        id: z.string(),
      })
      .parse(d)
  )
  .handler(async ({ data }) => {
    const memIdx = memoryComplaints.findIndex((c) => c.id === data.id);
    if (memIdx !== -1) {
      memoryComplaints.splice(memIdx, 1);
    }

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("customer_complaints").delete().eq("id", data.id);
    } catch {
      // Fallback
    }

    return { success: true };
  });

// 6. Public Track Complaint (by Ticket Code or Phone)
export const trackComplaint = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        query: z.string().trim().min(2),
      })
      .parse(d)
  )
  .handler(async ({ data }) => {
    const raw = data.query.trim();
    const upper = raw.toUpperCase();
    const digits = raw.replace(/\D+/g, "");

    let results: CustomerComplaint[] = [];

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      let req = supabaseAdmin.from("customer_complaints").select("*");

      if (upper.startsWith("CMP-")) {
        req = req.eq("ticket_code", upper);
      } else if (upper.startsWith("DAF-")) {
        req = req.eq("order_code", upper);
      } else if (digits.length >= 7) {
        req = req.ilike("phone", `%${digits.slice(-7)}%`);
      } else {
        req = req.or(`ticket_code.eq.${upper},customer_name.ilike.%${raw}%`);
      }

      const { data: rows, error } = await req.order("created_at", { ascending: false });

      if (!error && rows) {
        results = rows.map((r: any) => ({
          id: r.id,
          ticketCode: r.ticket_code,
          customerName: r.customer_name,
          phone: r.phone,
          email: r.email,
          orderCode: r.order_code,
          category: r.category,
          message: r.message,
          status: r.status === "resolved" ? "resolved" : "pending",
          resolutionNote: r.resolution_note,
          resolvedAt: r.resolved_at,
          resolvedBy: r.resolved_by,
          createdAt: r.created_at,
          updatedAt: r.updated_at || r.created_at,
        }));
      }
    } catch {
      // Ignore DB error
    }

    // Combine with matching memory complaints
    for (const mc of memoryComplaints) {
      if (
        mc.ticketCode.toUpperCase() === upper ||
        (mc.orderCode && mc.orderCode.toUpperCase() === upper) ||
        (digits.length >= 7 && mc.phone.includes(digits.slice(-7)))
      ) {
        if (!results.some((r) => r.id === mc.id)) {
          results.unshift(mc);
        }
      }
    }

    return { complaints: results };
  });

