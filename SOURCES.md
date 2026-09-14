# Sources and provenance

## Primary source

Anton Korinek, Charles I. Jones, Szymon Sacher, Tess Cotter, and Peter McCrory, [“Economic Scenarios for Transformative AI”](https://www-cdn.anthropic.com/files/4zrzovbb/website/cf58f84d46a4a76bf5a5b039ac695fba6b80041c.pdf), Anthropic Institute Working Paper 2026-02, September 2026.

Scenario inputs come from Table 1, monthly equations and the simulation order come from Appendix A, and comparison outputs come from Table 3. The post-2030 extension responds to the caveats on pages 4–6, where the authors explain that the framework omits rapid robotics progress, physical-task automation, detailed saving decisions, and several longer-run capital channels. Equation 34 provides the bounded matching function retained in the one-pool labor market.

The 2025 all-other employment share, normal unemployment pool, aggregate quit rate, job-finding rate, and vacancy-filling calibration used by the monthly implementation are the values published in Anthropic’s [scenario explorer](https://www.anthropic.com/institute/econ-scenarios). Their underlying sources are the 2025 Current Population Survey, the 2010–2019 IPUMS-CPS sample, and JOLTS as described in Tables 1 and A.2.

## Provenance convention

Every value exposed by `model/anthropic.ts` has a provenance label:

- `PAPER`: transcribed from the primary source.
- `DATA`: measured from an external dataset.
- `ASSUMPTION`: introduced by this independent implementation.
- `CALCULATED`: derived from other documented values.

The 14% capability anchor, preset 2030 endpoints, and labor-market calibration use `PAPER` or `DATA` values. The 100% capability ceiling, one-for-one mapping from net eliminated labor-weighted task mass to job capacity, reinterpretation of search effectiveness and posting speed, 30x productivity ceiling, smooth labor-flow threshold, and 2040 horizon are `ASSUMPTION` values or rules. Monthly chart values are `CALCULATED` outputs.

The frozen-2026 comparison is an `ASSUMPTION`: it holds the technology state fixed after the paper's mid-2026 anchor rather than attempting to remove AI already present in the calibration. The GDP and real-wage levels use the paper's baseline TFP, labor-share, and labor-force-growth values to carry forward the economic trend common to both paths.

Real GDP is anchored to the U.S. Bureau of Economic Analysis, [Gross Domestic Product, 2026 Q2](https://fred.stlouisfed.org/series/GDP), NIPA account A191RC: $32,486.066 billion, seasonally adjusted annual rate. The Federal Reserve Bank of St. Louis republishes this BEA series and identifies its source and account code.

Real annual wages are anchored to the U.S. Bureau of Labor Statistics, [Average Weekly Earnings of All Employees, Total Private](https://fred.stlouisfed.org/series/CES0500000011), CES series CES0500000011: $1,289.34 per week in June 2026, seasonally adjusted. The annual figure is the calculated weekly observation multiplied by 52.

The one-pool interpretation is also consistent with the task framework summarized by Daron Acemoglu and Pascual Restrepo, [“Automation and New Tasks: How Technology Displaces and Reinstates Labor”](https://www.nber.org/papers/w25684), NBER Working Paper 25684, March 2019. Their framework distinguishes the displacement effect of automation from the reinstatement effect of new human tasks. The simulator retains those two channels through the automation-share and reinstatement-ratio inputs.
