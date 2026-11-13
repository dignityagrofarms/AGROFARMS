import { z } from "zod";
import { OFFICIAL_CLAUSES } from "./clauses.ts";
export const TEMPLATE_VERSION = "DAF-REINVESTMENT-2026-v1";
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (value) =>
      Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value,
    "Enter a valid date",
  );
export const dealSchema = z
  .object({
    agreementDate: date,
    startDate: date,
    remittanceDate: date,
    salesWindow: z.string().trim().min(3).max(160),
    durationWeeks: z.number().int().min(1).max(104),
    capital: z
      .number()
      .positive()
      .max(1e12)
      .refine(
        (n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.001,
        "Use at most two decimal places",
      ),
    birds: z.number().int().min(1).max(1000000),
    unitFunding: z
      .number()
      .positive()
      .max(1e10)
      .refine(
        (n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.001,
        "Use at most two decimal places",
      ),
    partnerProfit: z
      .number()
      .min(0)
      .max(100)
      .refine(
        (n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.001,
        "Use at most two decimal places for the profit share",
      ),
    representative: z.string().trim().min(3).max(150),
    companyAddress: z.string().trim().min(5).max(300),
    companyPhone: z.string().trim().min(7).max(30),
    witnessName: z.string().trim().min(3).max(150),
  })
  .superRefine((d, ctx) => {
    if (Math.abs(d.unitFunding * d.birds - d.capital) > 0.011)
      ctx.addIssue({
        code: "custom",
        path: ["unitFunding"],
        message: "Per-bird funding × birds must equal capital",
      });
    if (d.remittanceDate < d.startDate || d.remittanceDate < d.agreementDate)
      ctx.addIssue({
        code: "custom",
        path: ["remittanceDate"],
        message: "Remittance cannot precede the agreement or cycle start",
      });
  });
export type AgreementDeal = z.infer<typeof dealSchema>;
export type AgreementSnapshot = {
  templateVersion: string;
  partnerId: string;
  partnerName: string;
  partnerPhone: string;
  partnerAddress: string;
  cycleName: string;
  deal: AgreementDeal;
  terms: string;
};
function words(n: number): string {
  const small = [
    "Zero",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  if (n < 20) return small[n];
  if (n < 100)
    return (
      ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"][
        Math.floor(n / 10)
      ] + (n % 10 ? " " + words(n % 10) : "")
    );
  for (const [value, name] of [
    [1e12, "Trillion"],
    [1e9, "Billion"],
    [1e6, "Million"],
    [1000, "Thousand"],
    [100, "Hundred"],
  ] as const)
    if (n >= value)
      return words(Math.floor(n / value)) + " " + name + (n % value ? " " + words(n % value) : "");
  return "";
}
export function moneyWords(amount: number) {
  const kobo = Math.round(amount * 100);
  return (
    words(Math.floor(kobo / 100)) +
    " Naira" +
    (kobo % 100 ? " and " + words(kobo % 100) + " Kobo" : " Only")
  );
}
export const money = (amount: number) =>
  "NGN " + amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const longDate = (date: string) =>
  new Date(date + "T00:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
export function renderAgreement(
  partner: { id: string; fullName: string; phone: string; address: string; cycleName: string },
  input: AgreementDeal,
): AgreementSnapshot {
  const d = dealSchema.parse(input);
  if (
    new Set([partner.fullName, d.representative, d.witnessName].map((n) => n.trim().toLowerCase()))
      .size !== 3
  )
    throw new Error("Company representative, investor and witness must be different people");
  if (!partner.fullName.trim() || !partner.phone.trim() || !partner.address.trim())
    throw new Error(
      "Complete the partner's legal name, phone and address before preparing an agreement",
    );
  const values: Record<string, string> = {
    birds: String(d.birds),
    capitalWithWords: money(d.capital) + " (" + moneyWords(d.capital) + ")",
    capital: money(d.capital),
    unitFunding: money(d.unitFunding),
    duration: String(d.durationWeeks),
    salesWindow: d.salesWindow,
    remittanceDate: longDate(d.remittanceDate),
    partnerProfit: String(d.partnerProfit),
    farmProfit: (100 - d.partnerProfit).toFixed(2).replace(/\.?0+$/, ""),
  };
  const clauses = OFFICIAL_CLAUSES.map(
    (c) => c.heading + "\n" + c.body.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key]),
  );
  const terms = `DIGNITY AGRO FARMS LIMITED\nPOULTRY REINVESTMENT & PROFIT-SHARING AGREEMENT\n${d.salesWindow} | Agreement date: ${longDate(d.agreementDate)}\nCycle: ${partner.cycleName} | Actual placement/start: ${longDate(d.startDate)}\n\nPARTIES. This Agreement is entered into between ${partner.fullName} (the “Investor”), whose contact details appear in the signature section, and Dignity Agro Farms Limited (the “Farm”), represented by ${d.representative}, of ${d.companyAddress}; telephone ${d.companyPhone}.\n\n${clauses.join("\n\n")}\n\nSIGNATORIES\nFor Dignity Agro Farms Limited: ${d.representative}\nInvestor: ${partner.fullName}\nInvestor phone: ${partner.phone}\nInvestor address: ${partner.address}\nWitness: ${d.witnessName}`;
  if (/\{\{/.test(terms)) throw new Error("Unresolved agreement field");
  return {
    templateVersion: TEMPLATE_VERSION,
    partnerId: partner.id,
    partnerName: partner.fullName,
    partnerPhone: partner.phone,
    partnerAddress: partner.address,
    cycleName: partner.cycleName,
    deal: d,
    terms,
  };
}
