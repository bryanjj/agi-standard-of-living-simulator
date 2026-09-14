# Economic Scenarios for Transformative AI

An independent open-source reconstruction of the economic framework in Anton Korinek, Charles I. Jones, Szymon Sacher, Tess Cotter, and Peter McCrory, “Economic Scenarios for Transformative AI,” Anthropic Institute Working Paper 2026-02.

[Open the live site](https://common-wealth-agi-simulator.bryan0.chatgpt.site/)

## Current milestone

The interface adapts the monthly equation system through a user-selected terminal year from 2030 to 2040. A single affected-task expansion rate grows technology capability logistically from a 14% mid-2026 anchor toward 100%. Users can view unemployment, GDP, wages, factor-income shares, and technology exposure over time.

The modest, substantial, and extreme inputs remain available as starting points. Their task-mass settings map to logistic rates that reach 20%, 30%, and 50% in 2030. Because the task-capability path and job-adjustment rule have changed, economic results remain comparable to the published scenarios but are not exact replications.

Numeric scenario values and provenance metadata live in `model/anthropic.ts`. The monthly production, capital, wage, job-transition, matching, and ideas equations live in `model/anthropicSimulation.ts`.

## Post-2030 extension

The extension uses one economy-wide labor pool instead of preserving a permanently unexposed occupation group. As technology reaches more tasks, a smooth and bounded rule derived locally from the paper's reallocation equation determines how many existing jobs must transition. Replacement roles enter the paper's bounded matching process, so unemployment reflects the speed of transition and the difficulty displaced workers have finding new work. Diffusion continues logistically and task productivity approaches an assumed 30x ceiling. These are documented extension assumptions, not results from the original authors.

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
