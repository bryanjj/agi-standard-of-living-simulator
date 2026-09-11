# Sources and provenance

## Primary source

Anton Korinek, Charles I. Jones, Szymon Sacher, Tess Cotter, and Peter McCrory, [“Economic Scenarios for Transformative AI”](https://www-cdn.anthropic.com/files/4zrzovbb/website/cf58f84d46a4a76bf5a5b039ac695fba6b80041c.pdf), Anthropic Institute Working Paper 2026-02, September 2026.

The current scenario inputs come from Table 1. The 2030 outputs come from Table 3. The model boundary follows the caveats on pages 4–6, where the authors explain that the framework omits rapid robotics progress, physical-task automation, detailed saving decisions, and several longer-run capital channels.

## Provenance convention

Every value exposed by `model/anthropic.ts` has a provenance label:

- `PAPER`: transcribed from the primary source.
- `DATA`: measured from an external dataset.
- `ASSUMPTION`: introduced by this independent implementation.
- `CALCULATED`: derived from other documented values.

The current milestone uses `PAPER` values and one transparent calculation, affected task mass multiplied by diffusion.
