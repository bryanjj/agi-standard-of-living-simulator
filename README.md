# Common Wealth

**Common Wealth** is an open-source, exploratory simulator for one question: how might a household's material standard of living change during a transition to transformative AI?

The first milestone implements one named scenario, **20-Year Transformative AGI / No New Policy**, with a two-good consumption model and a deterministic TypeScript simulation. It is not a forecast, financial advice, or a prediction about any individual occupation.

## Local development

```bash
npm install
npm run dev
```

Run the accounting tests with `npm test` and the production build with `npm run build`.

## What is included

- Household income, size, investments, and housing inputs
- Five source-backed U.S. income-quintile presets with a hidden manual editor
- Four transparent policy intervention stress tests, defaulting to status quo
- Material purchasing power normalized to Today = 100
- A five-line comparison chart with one color per quintile
- No-AGI comparison path
- Exact contribution decomposition
- Labor / capital / government resource composition
- Reproducible versus scarce-good affordability
- Secondary macroeconomic outputs
- Provenance labels for every calibration value

See [MODEL.md](MODEL.md), [SOURCES.md](SOURCES.md), and [LIMITATIONS.md](LIMITATIONS.md) before interpreting results.

## License

Intended for open-source release. Add the repository owner's preferred OSI-approved license before external distribution.
