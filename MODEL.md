# Model

This milestone is a transparent reduced-form household simulator, not a general-equilibrium model. All calculations are deterministic and occur in `model/simulation.ts`.

## 1. Automation

For year `t` from 0 to 40:

`automation(t) = min(1, 0.05 × t)`

`employment(t) = 1 − automation(t)`

This encodes the named scenario: five percentage points of the original workforce become automatable each year, no replacement jobs, and full automation in year 20. The simulation continues through year 40 to show the post-transition path; automation remains at 100% after year 20.

For the household Monte Carlo charts, the chance that a modeled worker has a job is separate from this normalized macro employment index:

`jobProbability(t) = 0.959 × max(0, 1 − t / 20)`

The 95.9% starting point is one minus the BLS July 2026 unemployment rate. It describes employment among the civilian labor force, not the employment-to-population ratio. The probability declines continuously to zero in year 20 and remains at zero through year 40.

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

Current capital income is inferred as `stockEquity × 4%`, capped at 35% of reported household income. Stock equity is the SCF's direct and indirect equity measure; cash, transaction accounts, deposits, bonds, housing, and other non-equity assets do not receive the modeled AI-capital return. Baseline transfer share is `min(10%, 2% + 1% × household size)`. Labor income is the residual, so today's labor, capital, and transfer resources sum to reported household income.

These are assumptions, not estimates from a tax microsimulation. They are deliberately visible in the UI.

## 4. Future household resources

`laborIncome(t) = laborIncome(0) × nationalLaborIncomeIndex(t)`

`capitalIncome(t) = capitalIncome(0) × nationalCapitalIncomeIndex(t)`

Because future capital income is proportional to current stock-equity holdings, a household with zero stock equity receives zero capital income. No equal AI dividend is assumed.

`transfers(t) = transfers(0) + longRunReplacementRate × max(0, laborIncome(0) − laborIncome(t)) + equalDividend(t)`

The status-quo long-run replacement rate is zero because regular unemployment insurance expires. The expanded-safety-net intervention uses 35%. Effective tax rates are illustrative bands: 12% through $75,000, 18% through $200,000, and 24% above $200,000. Taxes apply to modeled gross resources.

Temporary unemployment insurance is modeled in the weekly worker paths rather than as a permanent annual transfer. After each job loss, it replaces 42.2% of the worker's wage for 16 weeks. The replacement rate is the Department of Labor's claimant-level average for calendar year 2025. Sixteen weeks is the rounded 15.74-week average duration in the regular program for the 12 months ending July 2026. State eligibility rules, benefit caps, and waiting periods are omitted.

For dividend interventions:

`newNationalCapitalIncomePerHousehold(t) = $121,026 × 0.41 × max(0, nationalCapitalIncomeIndex(t) − 1)`

`equalDividend(t) = newNationalCapitalIncomePerHousehold(t) × dividendShare`

The citizen-dividend share is 10% and the public-fund share is 30%. The same dollar dividend is paid to every modeled household. These shares and the policy mechanisms are assumptions, not current law.

## 5. Reproducible goods and irreproducible scarce factors

The reproducible-good price index is:

`reproduciblePrice(t) = output(t)^−0.5`

The exponent assumes half of output growth passes through to reproducible-goods purchasing power.

Before a housing-ownership hedge:

`rawScarcePrice(t) = 1 + 0.6 × (output(t)^(1/3) − 1)`

“Irreproducible scarce factors” follows Korinek and Suh; Trammell and Korinek likewise analyze fixed factors such as land and natural resources. To connect that macroeconomic concept to households, the simulator uses housing exposure as a proxy: renters receive no hedge, mortgaged owners a 45% hedge, and outright owners an 80% hedge. Modeled budget shares are 32%, 30%, and 18%, respectively. The housing proxy, shares, and hedges are milestone-one assumptions, not values taken from the cited sources.

The household basket is a fixed-share Laspeyres-style index:

`basketPrice(t) = (1 − scarceShare) × reproduciblePrice(t) + scarceShare × scarcePrice(t)`

## 6. Standard of living

`standardOfLiving(t) = 100 × [afterTaxResources(t) / afterTaxResources(0)] / basketPrice(t)`

It measures command over an equivalent material consumption basket, not nominal salary and not utility. Household size affects inferred baseline transfers; the index does not value leisure or household composition changes.

The visible chart uses Q3 itself as the reference, so Q3 today equals 100. The comparison utility retains the ability to place other quintiles on this common scale later:

`comparisonPurchasingPower(h,t) = standardOfLiving(h,t) × afterTaxResources(h,0) / afterTaxResources(Q3,0)`

The aggregate income index uses the same reference point before the modeled price adjustment:

`afterTaxIncomeIndex(h,t) = 100 × afterTaxResources(h,t) / afterTaxResources(Q3,0)`

That aggregate path is smooth because it averages employed and unemployed workers. The visible income and purchasing-power charts use a fixed Monte Carlo sample of 1,000 comparable Q3 workers. Each worker starts employed with 95.9% probability. Employment is a renewable weekly state: an employed worker can lose work, and an unemployed worker can be rehired.

The initial weekly reemployment probability is calibrated as `1 / 15.74`, or about 6.4%, using average compensated unemployment duration as a simple job-finding proxy. It declines with the target employment path:

`reemploymentProbability(w) = (1 / 15.74) × jobProbability(w + 1) / 0.959`

The weekly job-loss probability is solved so that expected employment continues to match the scenario curve:

`jobLossProbability(w) = [p(w) + (1 − p(w)) × reemploymentProbability(w) − p(w + 1)] / p(w)`

At year 20, both employment and reemployment reach zero. This is a reduced-form transition, not an occupation-level labor-market model. For rendering performance, the charts draw 250 representative paths; each path is weighted as four of the 1,000 simulated workers.

Purchasing power does not fall immediately to the long-run displaced level. For a worker displaced in week `d`, the simulator records purchasing power just before displacement and applies a one-year transition buffer:

`bufferRemaining(w) = max(0, 1 − (w − d) / 52)`

`purchasingPower(w) = displacedPurchasingPower(w) + bufferRemaining(w) × [preDisplacementPurchasingPower − displacedPurchasingPower(w)]`

This represents unemployment insurance and savings drawdown. Unemployment insurance is explicit in the income path; the additional consumption smoothing is a transparent simulator assumption, not an estimate of a Q3 household's liquid savings. Reemployment restores the employed purchasing-power path. A later job loss starts a new transition. The model does not treat this buffer as stock equity or give it AI-capital returns.

The charts render weekly points rather than annual steps. Representative paths are drawn with opacity based on the number of simulated workers they represent. Where likely paths overlap, their color accumulates and makes more probable outcomes darker. The random seed is fixed so the visualization does not change on reload. The simulation adds no uncertainty beyond initial employment, job loss, and reemployment timing.

## 7. Exact decomposition

Labor, capital, transfers, and tax contributions are their after-tax-resource changes, each divided by the future basket price. Price effects are split exactly between reproducible productivity and pressure from irreproducible scarce factors. Therefore:

`100 + labor + capital + transfers + taxes + productivity + scarcity = headline index`

The test suite fails if this identity or the factor/resource identities stop reconciling.

## 8. No-AGI comparison

The comparison path is `100 × 1.01^t`. The 1% rate is an assumption, not a government forecast.

## 9. Q3 reference household

The visible reference household is Q3, the middle 20% of households by income. Its mean current-dollar income of $84,390 comes from Census Historical Income Table H-3 for 2024.

Its typical stock-equity holding is the survey-weighted median of $3,300 from the Federal Reserve's 2022 SCF public summary extract using its `EQUITY` measure. `EQUITY` captures direct and indirect stock holdings, including stock funds and equity held through retirement accounts. The household-size proxy and modal housing tenure are calculated from the same records.

The other four quintile calibrations remain in `calibration/quintiles.ts` for later comparison views, but they are hidden in the current interface.
