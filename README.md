# Common Wealth

**Common Wealth** is an open-source simulator for one question: how might a household's material standard of living change during a transition to transformative AI?

The first milestone implements one named scenario, **20-Year Transformative AGI / No New Policy**, with a two-category consumption model and a deterministic TypeScript simulation.

## Local development

```bash
npm install
npm run dev
```

Run the accounting tests with `npm test` and the production build with `npm run build`.

## What is included

- One source-backed Q3 middle-income reference household
- Status quo policy path
- Purchasing power and after-tax income normalized to Q3 today = 100
- Probability-density charts for 100 matched weekly employment, income, and purchasing-power paths
- A 52-week purchasing-power transition buffer after job loss
- No-AGI comparison path
- Exact contribution decomposition
- Labor / capital / government resource composition
- Reproducible goods versus irreproducible scarce factors
- Secondary macroeconomic outputs
- Provenance labels for every calibration value
- Superscript definitions and citations for research, data, and simulator terms

See [MODEL.md](MODEL.md), [SOURCES.md](SOURCES.md), and [LIMITATIONS.md](LIMITATIONS.md) before interpreting results.

## License

Intended for open-source release. Add the repository owner's preferred OSI-approved license before external distribution.
