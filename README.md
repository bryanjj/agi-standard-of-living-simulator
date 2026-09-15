# Economic Scenarios for Transformative AI

An independent open-source reconstruction of the economic framework in Anton Korinek, Charles I. Jones, Szymon Sacher, Tess Cotter, and Peter McCrory, “Economic Scenarios for Transformative AI,” Anthropic Institute Working Paper 2026-02.

[Open the live site](https://common-wealth-agi-simulator.bryan0.chatgpt.site/)

## Current milestone

The interface adapts the monthly equation system through a fixed 2040 endpoint. A single affected-task expansion rate grows technology capability logistically from a 14% mid-2026 anchor toward 100%. The primary chart lets users switch among unemployment, GDP, wages, factor-income shares, and technology exposure, then inspect monthly values by hovering or tapping. GDP and wages are shown in constant 2026 dollars, while unemployment remains a percentage. Each includes a comparison path that freezes further technology growth after the mid-2026 anchor while ordinary economic growth continues.

The modest, substantial, and extreme inputs remain available as starting points. Their task-mass settings map to logistic rates that reach 20%, 30%, and 50% in 2030. Calibrated job-loss pass-through values reproduce the paper's 2030 aggregate unemployment rates while keeping GDP, wages, and factor shares close to the published results.

Numeric scenario values and provenance metadata live in `model/anthropic.ts`. The monthly production, capital, wage, employment-target, matching, and ideas equations live in `model/anthropicSimulation.ts`.

## Post-2030 extension

The extension uses one economy-wide labor pool instead of preserving a permanently unexposed occupation group. Affected task mass, diffusion, automation, and reinstatement determine residual task displacement. Job-loss pass-through determines how much of that displacement reduces the total job pool after demand and jobs created elsewhere are counted. Remaining openings enter the paper's bounded matching process. Diffusion continues logistically, and after 2030 each scenario's linear log-productivity trend continues through 2040. These are documented extension assumptions, not results from the original authors.

See [MODEL.md](MODEL.md), [SOURCES.md](SOURCES.md), and [LIMITATIONS.md](LIMITATIONS.md).

## Development

```bash
npm install
npm test
npm run dev
```

## Status

This is an independent implementation. It is not affiliated with or endorsed by Anthropic or the paper’s authors.

## License

An OSI-approved license has not yet been selected. Add the repository owner’s preferred license before describing the source as licensed for reuse.
