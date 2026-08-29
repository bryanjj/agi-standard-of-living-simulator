# Sources and provenance

Every external value or qualitative target is tagged as **DATA**, **PAPER**, **ASSUMPTION**, or **CALCULATED** in `calibration/usBaseline.ts`.

## Papers

1. Anton Korinek and Donghyun Suh, [“Scenarios for the Transition to AGI”](https://www.nber.org/papers/w32255), NBER Working Paper 32255 (2024). Used for the 20-year scenario framing and qualitative transition behavior: automation can first raise wages, while bounded tasks and full automation can collapse labor income.
2. Philip Trammell and Anton Korinek, [“Economic Growth under Transformative AI”](https://www.nber.org/papers/w31815), NBER Working Paper 31815 (2023; revised 2026). Used for qualitative limiting behavior: rapid output growth, falling labor share, rising capital importance, and irreproducible resource constraints.
3. Ezra Karger et al., [“Forecasting the Economic Effects of AI”](https://www.nber.org/papers/w35046), NBER Working Paper 35046 (2026). Recorded as a future validation target. Its rapid-AI conditional medians are not silently copied into this first scenario.

## Data

Federal Reserve Board, [Distributional Financial Accounts, 2026 Q1](https://www.federalreserve.gov/releases/z1/dataviz/dfa/compare/chart/). Corporate equities and mutual fund shares by wealth group total $55.14T; the top 10% groups hold $48.15T, or 87.3%. This supports the baseline principle that new capital income should follow current ownership rather than equal ownership.

U.S. Census Bureau, [Historical Income Table H-3](https://www.census.gov/data/tables/time-series/demo/income-poverty/historical-income-households.html), 2024. Mean current-dollar household incomes by fifth are $18,460, $49,380, $84,390, $136,800, and $316,100.

Federal Reserve Board, [2022 Survey of Consumer Finances public summary extract](https://www.federalreserve.gov/econres/scfindex.htm). The simulator calculates survey-weighted median direct and indirect stock equity from the extract's `EQUITY` measure by SCF income-percentile group: $0, $0, $3,300, $22,750, and $257,050. The fifth preset combines the top two SCF groups. Cash, deposits, bonds, housing, and other non-equity assets are excluded from the modeled AI-capital claim. The same extract supplies the rounded household-size proxy and modal tenure. Amounts remain in 2022 dollars.

## Assumptions

All remaining values, including tax bands, benefit replacement, dividend shares, household income-composition inference, price pass-through, housing shares and hedges, the output curve, and the no-AGI path, are marked **ASSUMPTION** in code and listed in the UI. They are not presented as measured estimates.

## Calculated values

Automation, employment, output, factor shares, income components, price indices, the headline index, and its decomposition are **CALCULATED** from the documented equations.
