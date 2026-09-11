# Economic Scenarios for Transformative AI

An independent open-source reconstruction of the economic framework in Anton Korinek, Charles I. Jones, Szymon Sacher, Tess Cotter, and Peter McCrory, “Economic Scenarios for Transformative AI,” Anthropic Institute Working Paper 2026-02.

[Open the live site](https://common-wealth-agi-simulator.bryan0.chatgpt.site/)

## Current milestone

The interface solves the paper’s monthly equation system from 2024 through the January 2030 checkpoint. A terminal-year slider can continue the system through 2050 without changing any result through 2030. One capability-path control shows the economy-wide share of tasks technology can perform at the 2030 and 2040 checkpoints. Raising the 2040 endpoint expands technological exposure into work that begins outside the source model’s directly exposed occupation group. Users can view unemployment, GDP, wages, factor-income shares, and technology adoption over time.

The modest, substantial, and extreme scenarios remain available as published presets. Every scenario parameter can also be edited to create a custom path. The three published 2030 results are regression targets for the independent TypeScript implementation.

Numeric scenario values and provenance metadata live in `model/anthropic.ts`. The monthly production, capital, wage, job-flow, matching, and ideas equations live in `model/anthropicSimulation.ts`.

## Model boundary and extension

The paper ends in 2030. Later years are a visibly labeled extension that continues its logistic AI-capability and diffusion curves and its monthly economic equations. Task productivity transitions smoothly from its 2030 slope toward an assumed 30x ceiling. The two occupation groups remain fixed as worker cohorts. An optional, smooth post-2030 path lets tasks in the initially unexposed cohort become feasible for AI or robotics, using the same adoption and productivity settings as other affected work.

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
