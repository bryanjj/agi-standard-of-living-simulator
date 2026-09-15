# Economic Scenarios for Transformative AI

An independent open-source reconstruction of the economic framework in Anton Korinek, Charles I. Jones, Szymon Sacher, Tess Cotter, and Peter McCrory, “Economic Scenarios for Transformative AI,” Anthropic Institute Working Paper 2026-02.

[Open the live site](https://common-wealth-agi-simulator.bryan0.chatgpt.site/)

## Current milestone

The interface adapts the monthly equation system through a fixed 2040 endpoint. A single affected-task expansion rate grows technology capability logistically from a 14% mid-2026 anchor toward 100%. The primary chart lets users switch among unemployment, GDP, wages, factor-income shares, and technology exposure, then inspect monthly values by hovering or tapping. GDP and wages are shown in constant 2026 dollars, while unemployment remains a percentage. Each includes a comparison path that freezes further technology growth after the mid-2026 anchor while ordinary economic growth continues.

The modest, substantial, and extreme inputs remain available as starting points. Their task-mass settings map to logistic rates that reach 20%, 30%, and 50% in 2030. Because the task-capability path and job-adjustment rule have changed, economic results remain comparable to the published scenarios but are not exact replications.

Numeric scenario values and provenance metadata live in `model/anthropic.ts`. The monthly production, capital, wage, employment-target, matching, and ideas equations live in `model/anthropicSimulation.ts`.

## Post-2030 extension

The extension uses one economy-wide labor pool instead of preserving a permanently unexposed occupation group. Affected task mass, diffusion, automation, and reinstatement directly determine net eliminated human task mass and the human-employment target. Technology-eliminated jobs do not generate replacement vacancies automatically. Remaining openings enter the paper's bounded matching process, so unemployment reflects both the shrinking human-job target and the difficulty displaced workers have finding available work. Productivity affects output, wages, and factor shares rather than independently manufacturing jobs. Diffusion continues logistically. After 2030, each scenario's linear log-productivity trend continues through 2040. These are documented extension assumptions, not results from the original authors.

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
