# Contributor guide

- Keep all economic logic in pure TypeScript outside React components.
- Every numeric model parameter must be a sourced calibration value with a `DATA`, `PAPER`, `ASSUMPTION`, or `CALCULATED` provenance label.
- Never hard-code illustrative output values in the production UI.
- Preserve accounting identities and add or update tests with every model change.
- Use plain language in the primary UI. Put technical controls and macro outputs behind progressive disclosure.
- Do not describe the simulator as a forecast or predict individual job loss.
- Update `MODEL.md`, `SOURCES.md`, and `LIMITATIONS.md` whenever equations, sources, or scope change.
