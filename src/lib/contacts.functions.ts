import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkPasscode, type AdminRole } from "./orders.functions";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SpecialContactType = "bulk_buyer" | "supplier" | "offloader" | "logistics" | "other";
export type SpecialContactStatus = "active" | "inactive" | "blacklisted";
export type TransactionType =
  | "sale_to_contact"
  | "payment_from_contact"
  | "purchase_from_supplier"
  | "payment_to_supplier";
export type PaymentStatus = "paid" | "partial" | "pending" | "overdue";

export interface SpecialContact {
  id: string;
  contactName: string;
  businessName: string | null;
  contactType: SpecialContactType;
  phone: string;
  altPhone: string | null;
  whatsapp: string | null;
  email: string | null;
  locationAddress: string | null;
  preferredPaymentTerms: string | null;
  status: SpecialContactStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  // Computed summary fields:
  totalAmount: number;
  totalPaid: number;
  balanceDue: number;
  transactionCount: number;
  lastTransactionDate: string | null;
}

export interface ContactTransaction {
  id: string;
  contactId: string;
  transactionType: TransactionType;
  batchId: string | null;
  batchName?: string | null;
  transactionDate: string;
  itemDescription: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  referenceNo: string | null;
  notes: string | null;
  recordedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SpecialContactsDashboardSummary {
  totalContacts: number;
  totalBuyers: number;
  totalSuppliers: number;
  totalSalesToBuyers: number;
  totalDebtOwedToFarm: number;
  debtorsCount: number;
  totalPurchasesFromSuppliers: number;
  totalPayableToSuppliers: number;
}

// ─── Guard Helper ─────────────────────────────────────────────────────────────

async function checkOwnerOrManager(passcode: string) {
  const auth = await checkPasscode(passcode);
  if (!auth.ok) {
    throw new Error("Invalid management passcode.");
  }
  if (auth.role === "staff") {
    throw new Error("Access denied: Staff members cannot access Special Contacts management.");
  }
  return auth;
}

// ─── 1. List Special Contacts with Computed Balance & Metrics ─────────────────

export const adminListSpecialContacts = createServerFn({ method: "POST" })
  .validator((d: { passcode: string }) => d)
  .handler(async ({ data }) => {
    await checkOwnerOrManager(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch contacts
    const { data: contactsData, error: contactsErr } = await supabaseAdmin
      .from("special_contacts")
      .select("*")
      .order("created_at", { ascending: false });

    if (contactsErr) {
      // Graceful fallback if migration not run yet
      console.warn("special_contacts table query failed (table may not exist yet):", contactsErr.message);
      return {
        contacts: [] as SpecialContact[],
        summary: {
          totalContacts: 0,
          totalBuyers: 0,
          totalSuppliers: 0,
          totalSalesToBuyers: 0,
          totalDebtOwedToFarm: 0,
          debtorsCount: 0,
          totalPurchasesFromSuppliers: 0,
          totalPayableToSuppliers: 0,
        } as SpecialContactsDashboardSummary,
      };
    }

    // Fetch all transactions to compute balances & metrics
    const { data: txData, error: txErr } = await supabaseAdmin
      .from("contact_transactions")
      .select("*")
      .order("transaction_date", { ascending: false });

    const transactions = (txData || []) as any[];

    // Map metrics per contact
    const txByContact: Record<string, any[]> = {};
    for (const tx of transactions) {
      if (!txByContact[tx.contact_id]) {
        txByContact[tx.contact_id] = [];
      }
      txByContact[tx.contact_id].push(tx);
    }

    let totalSalesToBuyers = 0;
    let totalDebtOwedToFarm = 0;
    let debtorsCount = 0;
    let totalPurchasesFromSuppliers = 0;
    let totalPayableToSuppliers = 0;
    let totalBuyers = 0;
    let totalSuppliers = 0;

    const contacts: SpecialContact[] = (contactsData || []).map((c: any) => {
      const cTx = txByContact[c.id] || [];
      const isBuyer = c.contact_type === "bulk_buyer" || c.contact_type === "offloader";
      const isSupplier = c.contact_type === "supplier";

      if (isBuyer) totalBuyers++;
      if (isSupplier) totalSuppliers++;

      let totalAmount = 0;
      let totalPaid = 0;
      let balanceDue = 0;
      let lastTransactionDate: string | null = null;

      if (cTx.length > 0) {
        lastTransactionDate = cTx[0].transaction_date;
      }

      for (const t of cTx) {
        const amt = Number(t.total_amount) || 0;
        const paid = Number(t.amount_paid) || 0;
        const bal = Number(t.balance_due) || (amt - paid);

        totalAmount += amt;
        totalPaid += paid;
        balanceDue += bal;
      }

      if (isBuyer) {
        totalSalesToBuyers += totalAmount;
        if (balanceDue > 0) {
          totalDebtOwedToFarm += balanceDue;
          debtorsCount++;
        }
      } else if (isSupplier) {
        totalPurchasesFromSuppliers += totalAmount;
        if (balanceDue > 0) {
          totalPayableToSuppliers += balanceDue;
        }
      }

      return {
        id: c.id,
        contactName: c.contact_name,
        businessName: c.business_name,
        contactType: c.contact_type,
        phone: c.phone,
        altPhone: c.alt_phone,
        whatsapp: c.whatsapp,
        email: c.email,
        locationAddress: c.location_address,
        preferredPaymentTerms: c.preferred_payment_terms,
        status: c.status,
        notes: c.notes,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        totalAmount,
        totalPaid,
        balanceDue,
        transactionCount: cTx.length,
        lastTransactionDate,
      };
    });

    const summary: SpecialContactsDashboardSummary = {
      totalContacts: contacts.length,
      totalBuyers,
      totalSuppliers,
      totalSalesToBuyers,
      totalDebtOwedToFarm,
      debtorsCount,
      totalPurchasesFromSuppliers,
      totalPayableToSuppliers,
    };

    return { contacts, summary };
  });

// ─── 2. Get Contact Detail with Full Ledger & Batch Names ─────────────────────

export const adminGetContactDetail = createServerFn({ method: "POST" })
  .validator(
    z.object({
      passcode: z.string(),
      contactId: z.string(),
    })
  )
  .handler(async ({ data }) => {
    await checkOwnerOrManager(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch contact
    const { data: contactRow, error: cErr } = await supabaseAdmin
      .from("special_contacts")
      .select("*")
      .eq("id", data.contactId)
      .single();

    if (cErr || !contactRow) {
      throw new Error("Contact not found.");
    }

    // Fetch transactions with farm_batches join
    const { data: txRows, error: txErr } = await supabaseAdmin
      .from("contact_transactions")
      .select("*, farm_batches(batch_name)")
      .eq("contact_id", data.contactId)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (txErr) {
      throw new Error(`Failed to load contact transactions: ${txErr.message}`);
    }

    let totalAmount = 0;
    let totalPaid = 0;
    let balanceDue = 0;

    const transactions: ContactTransaction[] = (txRows || []).map((t: any) => {
      const amt = Number(t.total_amount) || 0;
      const paid = Number(t.amount_paid) || 0;
      const bal = Number(t.balance_due) ?? (amt - paid);

      totalAmount += amt;
      totalPaid += paid;
      balanceDue += bal;

      return {
        id: t.id,
        contactId: t.contact_id,
        transactionType: t.transaction_type,
        batchId: t.batch_id,
        batchName: t.farm_batches?.batch_name || null,
        transactionDate: t.transaction_date,
        itemDescription: t.item_description,
        quantity: Number(t.quantity) || 1,
        unit: t.unit || "units",
        unitPrice: Number(t.unit_price) || 0,
        totalAmount: amt,
        amountPaid: paid,
        balanceDue: bal,
        paymentMethod: t.payment_method || "Bank Transfer",
        paymentStatus: t.payment_status || "paid",
        referenceNo: t.reference_no,
        notes: t.notes,
        recordedBy: t.recorded_by,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      };
    });

    const contact: SpecialContact = {
      id: contactRow.id,
      contactName: contactRow.contact_name,
      businessName: contactRow.business_name,
      contactType: contactRow.contact_type,
      phone: contactRow.phone,
      altPhone: contactRow.alt_phone,
      whatsapp: contactRow.whatsapp,
      email: contactRow.email,
      locationAddress: contactRow.location_address,
      preferredPaymentTerms: contactRow.preferred_payment_terms,
      status: contactRow.status,
      notes: contactRow.notes,
      createdAt: contactRow.created_at,
      updatedAt: contactRow.updated_at,
      totalAmount,
      totalPaid,
      balanceDue,
      transactionCount: transactions.length,
      lastTransactionDate: transactions.length > 0 ? transactions[0].transactionDate : null,
    };

    return { contact, transactions };
  });

// ─── 3. Create Special Contact ────────────────────────────────────────────────

export const adminCreateSpecialContact = createServerFn({ method: "POST" })
  .validator(
    z.object({
      passcode: z.string(),
      contactName: z.string().min(2, "Contact name is required"),
      businessName: z.string().optional().nullable(),
      contactType: z.enum(["bulk_buyer", "supplier", "offloader", "logistics", "other"]),
      phone: z.string().min(5, "Phone number is required"),
      altPhone: z.string().optional().nullable(),
      whatsapp: z.string().optional().nullable(),
      email: z.string().optional().nullable(),
      locationAddress: z.string().optional().nullable(),
      preferredPaymentTerms: z.string().optional().nullable(),
      status: z.enum(["active", "inactive", "blacklisted"]).default("active"),
      notes: z.string().optional().nullable(),
      // Optional initial opening balance/offload:
      initialOffload: z
        .object({
          batchId: z.string().optional().nullable(),
          itemDescription: z.string(),
          quantity: z.number().default(1),
          unit: z.string().default("birds"),
          unitPrice: z.number().default(0),
          totalAmount: z.number(),
          amountPaid: z.number().default(0),
          paymentMethod: z.string().default("Bank Transfer"),
        })
        .optional()
        .nullable(),
    })
  )
  .handler(async ({ data }) => {
    const auth = await checkOwnerOrManager(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: newContact, error: insertErr } = await supabaseAdmin
      .from("special_contacts")
      .insert({
        contact_name: data.contactName.trim(),
        business_name: data.businessName?.trim() || null,
        contact_type: data.contactType,
        phone: data.phone.trim(),
        alt_phone: data.altPhone?.trim() || null,
        whatsapp: data.whatsapp?.trim() || data.phone.trim(),
        email: data.email?.trim() || null,
        location_address: data.locationAddress?.trim() || null,
        preferred_payment_terms: data.preferredPaymentTerms?.trim() || "Bank Transfer",
        status: data.status,
        notes: data.notes?.trim() || null,
      })
      .select("*")
      .single();

    if (insertErr || !newContact) {
      throw new Error(`Failed to create contact: ${insertErr?.message || "Unknown error"}`);
    }

    // If an initial offload / transaction is keyed in at creation:
    if (data.initialOffload && data.initialOffload.totalAmount > 0) {
      const off = data.initialOffload;
      const amt = Number(off.totalAmount) || 0;
      const paid = Number(off.amountPaid) || 0;
      const bal = Math.max(0, amt - paid);
      const pStatus = paid >= amt ? "paid" : paid > 0 ? "partial" : "pending";
      const txType =
        data.contactType === "supplier" ? "purchase_from_supplier" : "sale_to_contact";

      await supabaseAdmin.from("contact_transactions").insert({
        contact_id: newContact.id,
        transaction_type: txType,
        batch_id: off.batchId || null,
        transaction_date: new Date().toISOString().slice(0, 10),
        item_description: off.itemDescription,
        quantity: off.quantity || 1,
        unit: off.unit || "birds",
        unit_price: off.unitPrice || 0,
        total_amount: amt,
        amount_paid: paid,
        balance_due: bal,
        payment_method: off.paymentMethod || "Bank Transfer",
        payment_status: pStatus,
        recorded_by: auth.username,
      });
    }

    return { success: true, contact: newContact };
  });

// ─── 4. Update Special Contact Details ────────────────────────────────────────

export const adminUpdateSpecialContact = createServerFn({ method: "POST" })
  .validator(
    z.object({
      passcode: z.string(),
      contactId: z.string(),
      contactName: z.string().min(2),
      businessName: z.string().optional().nullable(),
      contactType: z.enum(["bulk_buyer", "supplier", "offloader", "logistics", "other"]),
      phone: z.string().min(5),
      altPhone: z.string().optional().nullable(),
      whatsapp: z.string().optional().nullable(),
      email: z.string().optional().nullable(),
      locationAddress: z.string().optional().nullable(),
      preferredPaymentTerms: z.string().optional().nullable(),
      status: z.enum(["active", "inactive", "blacklisted"]),
      notes: z.string().optional().nullable(),
    })
  )
  .handler(async ({ data }) => {
    await checkOwnerOrManager(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error: updErr } = await supabaseAdmin
      .from("special_contacts")
      .update({
        contact_name: data.contactName.trim(),
        business_name: data.businessName?.trim() || null,
        contact_type: data.contactType,
        phone: data.phone.trim(),
        alt_phone: data.altPhone?.trim() || null,
        whatsapp: data.whatsapp?.trim() || data.phone.trim(),
        email: data.email?.trim() || null,
        location_address: data.locationAddress?.trim() || null,
        preferred_payment_terms: data.preferredPaymentTerms?.trim() || "Bank Transfer",
        status: data.status,
        notes: data.notes?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.contactId);

    if (updErr) {
      throw new Error(`Failed to update contact: ${updErr.message}`);
    }

    return { success: true };
  });

// ─── 5. Delete Special Contact ────────────────────────────────────────────────

export const adminDeleteSpecialContact = createServerFn({ method: "POST" })
  .validator(
    z.object({
      passcode: z.string(),
      contactId: z.string(),
    })
  )
  .handler(async ({ data }) => {
    await checkOwnerOrManager(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("special_contacts")
      .delete()
      .eq("id", data.contactId);

    if (error) {
      throw new Error(`Failed to delete contact: ${error.message}`);
    }

    return { success: true };
  });

// ─── 6. Record Contact Transaction (Sale, Supply, Payment) ────────────────────

export const adminRecordContactTransaction = createServerFn({ method: "POST" })
  .validator(
    z.object({
      passcode: z.string(),
      contactId: z.string(),
      transactionType: z.enum([
        "sale_to_contact",
        "payment_from_contact",
        "purchase_from_supplier",
        "payment_to_supplier",
      ]),
      batchId: z.string().optional().nullable(),
      transactionDate: z.string(),
      itemDescription: z.string().min(2, "Description is required"),
      quantity: z.number().default(1),
      unit: z.string().default("birds"),
      unitPrice: z.number().default(0),
      totalAmount: z.number().min(0, "Amount must be positive"),
      amountPaid: z.number().min(0, "Amount paid must be 0 or positive"),
      paymentMethod: z.string().default("Bank Transfer"),
      referenceNo: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
      syncToFarmBatch: z.boolean().default(true),
    })
  )
  .handler(async ({ data }) => {
    const auth = await checkOwnerOrManager(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const amt = Number(data.totalAmount) || 0;
    const paid = Number(data.amountPaid) || 0;
    const bal = Math.max(0, amt - paid);
    const pStatus: PaymentStatus =
      paid >= amt ? "paid" : paid > 0 ? "partial" : "pending";

    // Insert transaction
    const { data: newTx, error: txErr } = await supabaseAdmin
      .from("contact_transactions")
      .insert({
        contact_id: data.contactId,
        transaction_type: data.transactionType,
        batch_id: data.batchId || null,
        transaction_date: data.transactionDate,
        item_description: data.itemDescription.trim(),
        quantity: data.quantity || 1,
        unit: data.unit || "birds",
        unit_price: data.unitPrice || 0,
        total_amount: amt,
        amount_paid: paid,
        balance_due: bal,
        payment_method: data.paymentMethod || "Bank Transfer",
        payment_status: pStatus,
        reference_no: data.referenceNo?.trim() || null,
        notes: data.notes?.trim() || null,
        recorded_by: auth.username,
      })
      .select("*")
      .single();

    if (txErr) {
      throw new Error(`Failed to record transaction: ${txErr.message}`);
    }

    // If syncToFarmBatch is requested and linked to a farm batch:
    if (data.syncToFarmBatch && data.batchId) {
      try {
        const { data: cRow } = await supabaseAdmin
          .from("special_contacts")
          .select("contact_name")
          .eq("id", data.contactId)
          .single();

        const contactName = cRow?.contact_name || "Special Contact";

        if (data.transactionType === "sale_to_contact") {
          // Record income under farm_financials
          await supabaseAdmin.from("farm_financials").insert({
            batch_id: data.batchId,
            type: "income",
            category: "Offload Bird Sales / Bulk Sale",
            amount: paid > 0 ? paid : amt,
            description: `Bulk Sale to ${contactName}: ${data.itemDescription}`,
            payment_method: data.paymentMethod || "Bank Transfer",
            transaction_date: data.transactionDate,
            reference_no: data.referenceNo || `OFFLOAD-${data.contactId.slice(0, 5)}`,
            recorded_by: auth.username,
          });
        } else if (data.transactionType === "purchase_from_supplier") {
          // Record expense under farm_financials
          await supabaseAdmin.from("farm_financials").insert({
            batch_id: data.batchId,
            type: "expense",
            category: "Feed / DOCs / Medication",
            amount: paid > 0 ? paid : amt,
            description: `Supply from ${contactName}: ${data.itemDescription}`,
            payment_method: data.paymentMethod || "Bank Transfer",
            transaction_date: data.transactionDate,
            reference_no: data.referenceNo || `SUPPLY-${data.contactId.slice(0, 5)}`,
            recorded_by: auth.username,
          });
        }
      } catch (syncErr) {
        console.warn("Could not auto-sync transaction to farm_financials:", syncErr);
      }
    }

    return { success: true, transaction: newTx };
  });

// ─── 7. Delete Contact Transaction ────────────────────────────────────────────

export const adminDeleteContactTransaction = createServerFn({ method: "POST" })
  .validator(
    z.object({
      passcode: z.string(),
      transactionId: z.string(),
    })
  )
  .handler(async ({ data }) => {
    await checkOwnerOrManager(data.passcode);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("contact_transactions")
      .delete()
      .eq("id", data.transactionId);

    if (error) {
      throw new Error(`Failed to delete transaction: ${error.message}`);
    }

    return { success: true };
  });
