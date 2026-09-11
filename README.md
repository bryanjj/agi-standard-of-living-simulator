# Economic Scenarios for Transformative AI

An independent open-source reconstruction of the economic framework in Anton Korinek, Charles I. Jones, Szymon Sacher, Tess Cotter, and Peter McCrory, “Economic Scenarios for Transformative AI,” Anthropic Institute Working Paper 2026-02.

[Open the live site](https://common-wealth-agi-simulator.bryan0.chatgpt.site/)

## Current milestone

The interface solves the paper’s monthly equation system from 2024 through the January 2030 checkpoint and displays all 49 monthly observations from January 2026 onward. Users can view unemployment, GDP, wages, and factor-income shares over time.

The modest, substantial, and extreme scenarios remain available as published presets. Every scenario parameter can also be edited to create a custom path. The three published 2030 results are regression targets for the independent TypeScript implementation.

Numeric scenario values and provenance metadata live in `model/anthropic.ts`. The monthly production, capital, wage, job-flow, matching, and ideas equations live in `model/anthropicSimulation.ts`.

## Model boundary

The project currently stops in 2030, matching the paper. The paper models direct AI effects on cognitive work but omits rapid robotics progress and physical-task automation. It also uses capital assumptions intended for the short and medium run. Any post-2030 extension will be implemented as a separate, visibly labeled layer with its additional assumptions documented.

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
