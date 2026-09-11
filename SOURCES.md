# Sources and provenance

## Primary source

Anton Korinek, Charles I. Jones, Szymon Sacher, Tess Cotter, and Peter McCrory, [“Economic Scenarios for Transformative AI”](https://www-cdn.anthropic.com/files/4zrzovbb/website/cf58f84d46a4a76bf5a5b039ac695fba6b80041c.pdf), Anthropic Institute Working Paper 2026-02, September 2026.

Scenario inputs come from Table 1, monthly equations and the simulation order come from Appendix A, and comparison outputs come from Table 3. The post-2030 extension responds to the caveats on pages 4–6, where the authors explain that the framework omits rapid robotics progress, physical-task automation, detailed saving decisions, and several longer-run capital channels.

The occupation shares, normal unemployment pool, separation-rate relatives, and transition-matrix calibration used by the monthly implementation are the values published in Anthropic’s [scenario explorer](https://www.anthropic.com/institute/econ-scenarios). Their underlying sources are the 2025 Current Population Survey and the 2010–2019 IPUMS-CPS sample described in Tables 1 and A.2.

## Provenance convention

Every value exposed by `model/anthropic.ts` has a provenance label:

- `PAPER`: transcribed from the primary source.
- `DATA`: measured from an external dataset.
- `ASSUMPTION`: introduced by this independent implementation.
- `CALCULATED`: derived from other documented values.

The 14% capability anchor, preset 2030 endpoints, and labor-market calibration use `PAPER` or `DATA` values. The 100% capability ceiling, post-2030 exposure allocation, 30x productivity ceiling, smooth labor-flow threshold, and 2040 horizon are `ASSUMPTION` values or rules. Monthly chart values are `CALCULATED` outputs.
