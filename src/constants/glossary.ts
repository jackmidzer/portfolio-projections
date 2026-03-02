/**
 * Plain-English definitions for Irish tax / FIRE jargon used throughout the UI.
 * Keys should match the exact term string passed to <GlossaryTooltip term={…} />.
 */
export const GLOSSARY: Record<string, string> = {
  BIK: 'Benefit in Kind — a taxable non-cash benefit provided by an employer (e.g. company car, health insurance). It is added to your gross income for USC and PRSI purposes.',
  USC: 'Universal Social Charge — a tax on gross income charged at banded rates (0.5 %–8 %), collected alongside PAYE income tax.',
  PRSI: 'Pay Related Social Insurance — compulsory contributions (4.2375 % for employees) that fund State benefits such as the State Pension. Exempt from age 66. You need 520 paid contributions (10 years) for any State Pension entitlement, and 2,080 (40 years) for the full rate.',
  DIRT: 'Deposit Interest Retention Tax — a 33 % tax deducted at source on interest earned in deposit/savings accounts.',
  FIRE: 'Financial Independence, Retire Early — reaching a portfolio large enough to live indefinitely off investment returns, ending reliance on a salary.',
  CGT: 'Capital Gains Tax — a 33 % Irish tax on profits realised from selling assets such as shares (non-EU ETFs) or property.',
  AMC: 'Annual Management Charge — the yearly fee charged by a pension or investment fund manager, expressed as a percentage of the fund value.',
  PAYE: 'Pay As You Earn — the Irish income tax system under which tax is deducted from your salary by the employer before it is paid to you.',
  'exit tax': 'Exit Tax — a 38 % Irish tax on gains from EU-domiciled ETFs, applied on disposal or every 8 years under the deemed disposal rule.',
  'deemed disposal': 'Deemed Disposal — an Irish rule requiring ETF holders to pay exit tax on unrealised gains every 8 years, even without selling any holdings.',
  LTV: 'Loan to Value — the mortgage amount as a percentage of the property value. Irish Central Bank rules cap most first-time buyers at 90 % LTV.',
};
