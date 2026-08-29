# Common Wealth

**Common Wealth** is an open-source simulator for one question: how might a household's material standard of living change during a transition to transformative AI?

[View the live simulator](https://common-wealth-agi-simulator.bryan0.chatgpt.site/)

The first milestone implements one named scenario, **Logistic Transformative AGI / No New Policy**, with a two-category consumption model and a deterministic TypeScript simulation.

## Local development

```bash
npm install
npm run dev
```

Run the accounting tests with `npm test` and the production build with `npm run build`.

## What is included

- A fixed random sample of 1,000 U.S. workers drawn across five equally sized household-income quintile profiles
- Status quo policy path
- A 30-year display horizon with employment at 50% in year 10 and approaching, but never reaching, zero
- Purchasing power and after-tax income normalized so the sample mean today = 100
- Probability-density charts for 1,000 matched weekly employment, income, and purchasing-power paths, shown through 250 weighted representative paths with a mean across all 1,000 samples
- Weekly job loss and reemployment, with the chance of finding work declining asymptotically
- Unemployment insurance replacing 42.2% of worker wages for 16 weeks after each job loss
- Purchasing power derived from each worker's after-tax income and the modeled basket price, with no separate savings buffer
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
