import React, { useState } from "react";
import {
  MessageSquare,
  Send,
  X,
  Phone,
  Gift,
  CreditCard,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

export type ReminderTargetType = "lead" | "preorder" | "order" | "general";

export interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: ReminderTargetType;
  recipientName: string;
  recipientPhone: string;
  // Optional order / pre-order details
  orderCode?: string;
  productName?: string;
  totalAmount?: number;
  amountPaid?: number;
  balance?: number;
  notes?: string;
}

export function ReminderModal({
  isOpen,
  onClose,
  targetType,
  recipientName,
  recipientPhone,
  orderCode,
  productName,
  totalAmount,
  amountPaid,
  balance,
  notes,
}: ReminderModalProps) {
  const cleanPhone = (recipientPhone || "").replace(/\D+/g, "");
  const firstName = recipientName ? recipientName.split(" ")[0] : "Customer";

  // Preset Template Generators
  const getTemplates = () => {
    if (targetType === "preorder") {
      return [
        {
          id: "preorder_balance",
          title: "💳 Payment Completion Reminder",
          text: `Hi ${firstName}, warm greetings from Dignity Agro Farms! This is a quick reminder regarding your December Pre-Order (${orderCode || "DEC-XXXX"}).\n\nTotal: ₦${(totalAmount || 0).toLocaleString()}\nAmount Paid: ₦${(amountPaid || 0).toLocaleString()}\nOutstanding Balance: ₦${(balance || 0).toLocaleString()}\n\nPayment Account: Moniepoint MFB · 4006179439 (Dignity Agro Farms Limited). Please complete your payment to secure your order delivery.`,
        },
        {
          id: "preorder_intact",
          title: "🎄 Order Intact & Reserved Notice",
          text: `Hi ${firstName}, your December Pre-Order (${orderCode || "DEC-XXXX"}) at Dignity Agro Farms is active and intact! We are preparing your fresh farm birds for December delivery. Thank you for choosing us!`,
        },
        {
          id: "preorder_custom",
          title: "💬 Custom Pre-Order Message",
          text: `Hi ${firstName}, this is Dignity Agro Farms regarding your December Pre-Order ${orderCode || ""}. `,
        },
      ];
    }

    if (targetType === "order") {
      return [
        {
          id: "order_status_update",
          title: "📦 Order Status & Delivery Alert",
          text: `Hi ${firstName}, greetings from Dignity Agro Farms! Your order (${orderCode || "DAF-XXXX"}) is being prepared for delivery. Total: ₦${(totalAmount || 0).toLocaleString()}. Tracking details available on our website.`,
        },
        {
          id: "order_thankyou",
          title: "🙌 Order Thank You & Feedback",
          text: `Hi ${firstName}, thank you for purchasing from Dignity Agro Farms! Your order ${orderCode || ""} has been completed. We hope you enjoy your farm-fresh produce!`,
        },
        {
          id: "order_custom",
          title: "💬 Custom Order Message",
          text: `Hi ${firstName}, this is Dignity Agro Farms regarding your order ${orderCode || ""}. `,
        },
      ];
    }

    // Default: Customer Leads
    return [
      {
        id: "lead_december_promo",
        title: "🎄 December Pre-Order Slots Open",
        text: `Hi ${firstName}, greetings from Dignity Agro Farms! December Pre-Orders for fresh broiler chickens and table eggs in Owerri are now open. Lock in your farm prices today at dignityagrofarms.com or reply to order directly!`,
      },
      {
        id: "lead_followup",
        title: "👋 Farm Product Follow-up",
        text: `Hi ${firstName}, following up on your inquiry with Dignity Agro Farms! We have fresh broiler chickens, dressed chickens, and layer eggs available. Would you like to place an order today?`,
      },
      {
        id: "lead_custom",
        title: "💬 Custom Message",
        text: `Hi ${firstName}, greetings from Dignity Agro Farms! `,
      },
    ];
  };

  const templates = getTemplates();
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0].id);
  const [messageText, setMessageText] = useState(templates[0].text);

  if (!isOpen) return null;

  const handleSelectTemplate = (t: { id: string; text: string }) => {
    setSelectedTemplateId(t.id);
    setMessageText(t.text);
  };

  // Launch WhatsApp intent
  const handleSendWhatsApp = () => {
    const waUrl = `https://wa.me/${cleanPhone.startsWith("0") ? "234" + cleanPhone.slice(1) : cleanPhone}?text=${encodeURIComponent(messageText)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
    onClose();
  };

  // Launch SMS intent
  const handleSendSMS = () => {
    const smsUrl = `sms:${cleanPhone}?body=${encodeURIComponent(messageText)}`;
    window.open(smsUrl, "_self");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-[#0F3D24]/10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#0F3D24]/10 bg-[#0F3D24] px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#3F8F3F]/30 p-2.5 text-[#A2E0A2]">
              <MessageSquare size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold">
                {targetType === "preorder" ? "Send Pre-Order Reminder" : "Send Customer Lead Reminder"}
              </h3>
              <p className="text-xs text-white/70">
                To: <span className="font-semibold text-white">{recipientName}</span> ({recipientPhone})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Preset Template Selector */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#0F3D24]">
              Select Reminder Template:
            </label>
            <div className="grid gap-2">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSelectTemplate(t)}
                  className={`flex items-center justify-between rounded-xl border p-3 text-left text-xs font-semibold transition ${
                    selectedTemplateId === t.id
                      ? "border-[#3F8F3F] bg-[#3F8F3F]/10 text-[#0F3D24] ring-1 ring-[#3F8F3F]"
                      : "border-[#0F3D24]/15 bg-white text-[#0F3D24]/70 hover:bg-[#F7F5F0]"
                  }`}
                >
                  <span>{t.title}</span>
                  {selectedTemplateId === t.id && <CheckCircle2 size={16} className="text-[#3F8F3F]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Editable Message Box */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#0F3D24]">
              Customize Message Text:
            </label>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              rows={6}
              className="w-full rounded-2xl border border-[#0F3D24]/20 p-4 text-xs leading-relaxed text-[#0F3D24] outline-none focus:border-[#3F8F3F] focus:ring-1 focus:ring-[#3F8F3F]"
            />
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-5 py-3 text-xs font-bold text-white shadow-md hover:bg-[#1ebd59] transition"
            >
              <Send size={16} />
              Send via WhatsApp
            </button>

            <button
              type="button"
              onClick={handleSendSMS}
              className="flex items-center justify-center gap-2 rounded-2xl bg-[#0F3D24] px-5 py-3 text-xs font-bold text-white shadow-md hover:bg-[#134a2c] transition"
            >
              <Phone size={16} className="text-[#A2E0A2]" />
              Send via SMS
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
