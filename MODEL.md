# Model

This milestone is a transparent reduced-form household simulator, not a general-equilibrium model. All calculations are deterministic and occur in `model/simulation.ts`.

## 1. Automation

For year `t` from 0 to 20:

`automation(t) = min(1, 0.05 × t)`

`employment(t) = 1 − automation(t)`

This encodes the named scenario: five percentage points of the original workforce become automatable each year, no replacement jobs, and full automation in year 20.

## 2. Output and factor shares

`output(t) = 1 + (10 − 1) × automation(t)²`

Output is normalized to 1 today and reaches 10 in year 20. Ten is an explicit calibration assumption, chosen to approximate the published Korinek–Suh transformative illustration rather than copied as a forecast.

`laborShare(t) = 0.59 × (1 − automation(t))^1.4`

`capitalShare(t) = 1 − laborShare(t)`

The 1.4 exponent is an assumption chosen to reproduce the qualitative pattern in Korinek and Suh: wages can initially be supported by higher output, while labor's share and eventually labor income collapse near full automation.

`nationalLaborIncomeIndex(t) = output(t) × laborShare(t) / 0.59`

`nationalCapitalIncomeIndex(t) = output(t) × capitalShare(t) / 0.41`

`remainingWorkerWageIndex(t) = nationalLaborIncomeIndex(t) / employment(t)` when employment is positive, otherwise zero.

Factor income reconciles exactly: `output × laborShare + output × capitalShare = output`.

## 3. Today's household resources

Current investment income is inferred as `investments × 4%`, capped at 35% of reported household income. Baseline transfer share is `min(10%, 2% + 1% × household size)`. Labor income is the residual, so today's labor, capital, and transfer resources sum to reported household income.

These are assumptions, not estimates from a tax microsimulation. They are deliberately visible in the UI.

## 4. Future household resources

`laborIncome(t) = laborIncome(0) × nationalLaborIncomeIndex(t)`

`capitalIncome(t) = capitalIncome(0) × nationalCapitalIncomeIndex(t)`

Because future capital income is proportional to current investment holdings, a household with zero investments receives zero capital income. No equal AI dividend is assumed.

`transfers(t) = transfers(0) + replacementRate × max(0, laborIncome(0) − laborIncome(t)) + equalDividend(t)`

The status-quo replacement rate is a 10% simplified current-law proxy; the expanded-safety-net intervention uses 35%. Effective tax rates are illustrative bands: 12% through $75,000, 18% through $200,000, and 24% above $200,000. Taxes apply to modeled gross resources.

For dividend interventions:

`newNationalCapitalIncomePerHousehold(t) = $121,026 × 0.41 × max(0, nationalCapitalIncomeIndex(t) − 1)`

`equalDividend(t) = newNationalCapitalIncomePerHousehold(t) × dividendShare`

The citizen-dividend share is 10% and the public-fund share is 30%. The same dollar dividend is paid to every modeled household. These shares and the policy mechanisms are assumptions, not current law.

## 5. Two-good prices

The reproducible-good price index is:

`reproduciblePrice(t) = output(t)^−0.5`

The exponent assumes half of output growth passes through to reproducible-goods purchasing power.

Before a housing-ownership hedge:

`rawScarcePrice(t) = 1 + 0.6 × (output(t)^(1/3) − 1)`

Renters receive no hedge, mortgaged owners a 45% hedge, and outright owners an 80% hedge. Modeled scarce-good budget shares are 32%, 30%, and 18%, respectively. These are milestone-one assumptions.

The household basket is a fixed-share Laspeyres-style index:

`basketPrice(t) = (1 − scarceShare) × reproduciblePrice(t) + scarceShare × scarcePrice(t)`

## 6. Standard of living

`standardOfLiving(t) = 100 × [afterTaxResources(t) / afterTaxResources(0)] / basketPrice(t)`

It measures command over an equivalent material consumption basket, not nominal salary and not utility. Household size affects inferred baseline transfers; the index does not value leisure or household composition changes.

## 7. Exact decomposition

Labor, capital, transfers, and tax contributions are their after-tax-resource changes, each divided by the future basket price. Price effects are split exactly between reproducible productivity and scarce-good pressure. Therefore:

`100 + labor + capital + transfers + taxes + productivity + scarcity = headline index`

The test suite fails if this identity or the factor/resource identities stop reconciling.

## 8. No-AGI comparison

The comparison path is `100 × 1.01^t`. The 1% rate is an assumption, not a government forecast.

## 9. Quintile presets

The five lines represent household-income fifths. Mean current-dollar incomes come from Census Historical Income Table H-3 for 2024: $18,460, $49,380, $84,390, $136,800, and $316,100.

Financial-asset means are calculated from the Federal Reserve's 2022 SCF public summary extract using survey weights and its income-percentile categories: $49,965, $63,277, $144,344, $262,069, and $1,995,509 in 2022 dollars. The fifth preset combines the SCF's 80–89.9 and 90–100 groups. Household-size proxies and modal housing tenure are calculated from the same records. Each value retains its provenance in `calibration/quintiles.ts`.

Manual Advanced edits replace the selected quintile's household inputs while keeping its colored comparison line; selecting a quintile again restores the published preset.
