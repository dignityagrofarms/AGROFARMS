export const cents = (value: number) => Math.round(value * 100);
export function allocationFromBirds(birds: number, initialBirds: number, fundingPerBird: number) {
  if (
    !Number.isInteger(initialBirds) ||
    initialBirds < 1 ||
    !Number.isInteger(birds) ||
    birds < 1 ||
    birds > initialBirds
  )
    throw new Error("Allocate whole birds within the batch's initial headcount");
  if (
    !Number.isFinite(fundingPerBird) ||
    fundingPerBird <= 0 ||
    Math.abs(fundingPerBird * 100 - cents(fundingPerBird)) > 0.001
  )
    throw new Error("Set positive funding per bird with at most two decimal places");
  return {
    birds,
    investment: (birds * cents(fundingPerBird)) / 100,
    ownership: (birds / initialBirds) * 100,
  };
}
export function allocationFromInvestment(
  investment: number,
  initialBirds: number,
  fundingPerBird: number,
) {
  if (!Number.isFinite(investment) || investment <= 0)
    throw new Error("Enter a positive investment");
  allocationFromBirds(1, initialBirds, fundingPerBird);
  const birds = Math.round(cents(investment) / cents(fundingPerBird));
  if (birds < 1 || Math.abs(investment * 100 - birds * cents(fundingPerBird)) > 0.001) {
    const lower = Math.max(1, Math.floor(investment / fundingPerBird));
    const upper = Math.max(1, Math.ceil(investment / fundingPerBird));
    throw new Error(
      `Investment must fund whole birds. Use NGN ${(lower * fundingPerBird).toFixed(2)} or NGN ${(upper * fundingPerBird).toFixed(2)}.`,
    );
  }
  return allocationFromBirds(birds, initialBirds, fundingPerBird);
}
export function weightedProfitShare(rows: { ownership: number; profitShare: number }[]) {
  return rows.reduce((sum, row) => sum + (row.ownership * row.profitShare) / 100, 0);
}
