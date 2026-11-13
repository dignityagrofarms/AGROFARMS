// Adapted from the owner-supplied official agreement. Personal and deal data are template fields.
export const OFFICIAL_CLAUSES = [
  {
    heading: "1. Nature and Purpose",
    body: "This is a reinvestment arrangement for a dedicated batch of {{birds}} broiler chickens to be raised, managed, marketed and sold by the Farm on the Investor’s behalf, targeting the {{salesWindow}} festive sales window. It replaces the commercial terms of any earlier arrangement only in respect of the investment described here; any unrelated prior obligations remain separate unless expressly settled in writing.",
  },
  {
    heading: "2. Investment Capital and Bird Allocation",
    body: "The Investor will contribute {{capitalWithWords}}, calculated at {{unitFunding}} per bird × {{birds}} birds. The parties acknowledge this amount as the agreed funding allocated to the batch. The Farm shall acknowledge receipt and keep a record of bird placement and material batch expenses.",
  },
  {
    heading: "3. Term and Remittance Date",
    body: "The intended production and sales cycle is {{duration}} weeks from the actual batch placement/start date recorded by the parties. The expected date for final sales accounting and remittance is {{remittanceDate}}. The Farm shall advise the Investor promptly if placement timing, market conditions, or circumstances outside its reasonable control materially affect this timetable. Any extension requires mutual written agreement; absent agreement, the Farm shall account for funds, birds and sales proceeds as at {{remittanceDate}}.",
  },
  {
    heading: "4. Farm Responsibilities",
    body: "The Farm shall procure and raise the allocated birds, provide reasonable feeding, husbandry, biosecurity and veterinary management, arrange marketing and sales, keep records of bird numbers, mortality, sale prices and expenses, and provide the Investor with a sales and profit statement at settlement. The Farm shall exercise reasonable care and commercial good faith, but no particular sale price or profit is guaranteed.",
  },
  {
    heading: "5. Sales Proceeds and Net Profit",
    body: "All sales income attributable to the {{birds}}-bird batch shall be recorded. Net Profit means the verified sales proceeds less the {{capital}} batch investment capital and less only additional, genuine, documented batch-specific costs not already covered by that capital that both parties approved in writing. Costs shall not be deducted twice. If the result is zero or negative, there is no distributable profit.",
  },
  {
    heading: "6. Profit Sharing and Settlement",
    body: "Where Net Profit is positive, it shall be divided as follows: {{partnerProfit}}% to the Investor and {{farmProfit}}% to Dignity Agro Farms Limited. On settlement, the Investor shall receive the recoverable investment capital from batch proceeds plus {{partnerProfit}}% of actual Net Profit; the Farm shall receive {{farmProfit}}% of actual Net Profit. The Farm shall remit the Investor’s amount by bank transfer to an account designated in writing and provide a clear breakdown. Capital repayment is subject to actual batch realizations and Clause 7, not a guaranteed fixed return.",
  },
  {
    heading: "7. Mortality, Commercial Losses and Risk",
    body: "The parties recognize the risks of poultry farming, including mortality, disease, feed-price increases and changing sales prices. Where an actual loss occurs despite reasonable management, the loss shall first be reflected in the batch account; the Investor’s recoverable capital may therefore be less than the amount invested, and neither party shall receive profit unless profit is actually realized. The Farm remains responsible for losses proven to result from fraud, willful misconduct, misappropriation, or gross negligence. The parties shall review material losses transparently and seek a fair resolution.",
  },
  {
    heading: "8. Updates and Verification",
    body: "The Farm shall give reasonable updates during the cycle and promptly notify the Investor of any significant mortality or operational issue. On reasonable notice, the Investor may review the batch summary, relevant receipts and supporting sales records, subject to reasonable commercial confidentiality.",
  },
  {
    heading: "9. Early Sales, Renewal and Changes",
    body: "Birds may be sold in batches when commercially appropriate during the festive sales window. Proceeds shall remain part of the batch account until final settlement, unless the parties agree to a partial remittance in writing. Renewal, reinvestment, or a change in profit-sharing terms requires a new written agreement signed by both parties.",
  },
  {
    heading: "10. Force Majeure and Dispute Resolution",
    body: "Neither party is liable for delay due solely to extraordinary events beyond reasonable control, provided prompt notice and reasonable mitigation. Disputes shall first be addressed through good-faith negotiation, then mediation, before legal proceedings under the laws of the Federal Republic of Nigeria.",
  },
  {
    heading: "11. Entire Agreement and Consent",
    body: "This document sets out the agreement for this specific {{birds}}-bird reinvestment. Any amendment must be written and signed by both parties. Both parties confirm that they understand the profit-sharing arrangement and its commercial risks, and sign voluntarily.",
  },
] as const;
