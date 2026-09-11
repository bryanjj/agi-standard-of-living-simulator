# Economic Scenarios for Transformative AI

An independent open-source reconstruction of the economic framework in Anton Korinek, Charles I. Jones, Szymon Sacher, Tess Cotter, and Peter McCrory, “Economic Scenarios for Transformative AI,” Anthropic Institute Working Paper 2026-02.

[Open the live site](https://common-wealth-agi-simulator.bryan0.chatgpt.site/)

## Current milestone

The interface reproduces the paper’s published modest, substantial, and extreme scenario inputs and 2030 headline outcomes. Numeric values are isolated in `model/anthropic.ts`, carry provenance metadata, and are checked against the paper’s tables.

The next milestone is the independent TypeScript implementation of the paper’s monthly equation system. Published 2030 results will serve as regression targets.

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
