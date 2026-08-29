'use client';

import { useMemo, useState } from 'react';
import { CartesianGrid, Label, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { calibration } from '../calibration/usBaseline';
import { quintileById, quintilePresets, type QuintileId } from '../calibration/quintiles';
import { simulate } from '../model/simulation';
import type { HousingStatus } from '../model/types';
import { interventionList, interventions, type InterventionId } from '../scenarios/interventions';
import { transformative20Year } from '../scenarios/transformative20yr';
import { Affordability, MacroDetails, ResourceComposition, WhyChart } from '../ui/Explanations';
import { Term, TermNotes } from '../ui/Terms';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const compactMoney = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 });
const round = (value: number) => Math.round(value);

export default function Home() {
  const [selectedId, setSelectedId] = useState<QuintileId>('q3');
  const [interventionId, setInterventionId] = useState<InterventionId>('status-quo');
  const [income, setIncome] = useState(quintileById.q3.household.annualIncome);
  const [size, setSize] = useState(quintileById.q3.household.householdSize);
  const [equityHoldings, setEquityHoldings] = useState(quintileById.q3.household.equityHoldings);
  const [housing, setHousing] = useState<HousingStatus>(quintileById.q3.household.housing);
  const [isCustom, setIsCustom] = useState(false);
  const [focusYear, setFocusYear] = useState(20);
  const intervention = interventions[interventionId];
  const selectedPreset = quintileById[selectedId];

  const selectQuintile = (id: QuintileId) => {
    const household = quintileById[id].household;
    setSelectedId(id);
    setIncome(household.annualIncome);
    setSize(household.householdSize);
    setEquityHoldings(household.equityHoldings);
    setHousing(household.housing);
    setIsCustom(false);
  };

  const customize = (change: () => void) => {
    setIsCustom(true);
    change();
  };

  const simulations = useMemo(() => Object.fromEntries(quintilePresets.map((preset) => {
    const household = preset.id === selectedId && isCustom
      ? { annualIncome: income, householdSize: size, equityHoldings, housing }
      : preset.household;
    return [preset.id, simulate(transformative20Year, household, intervention)];
  })) as Record<QuintileId, ReturnType<typeof simulate>>, [selectedId, isCustom, income, size, equityHoldings, housing, intervention]);

  const chartData = useMemo(() => simulations.q1.years.map((year, index) => ({
    year: year.year,
    baseline: year.noAgiBaseline,
    ...Object.fromEntries(quintilePresets.map((preset) => [preset.id, simulations[preset.id].years[index].standardOfLiving])),
  })), [simulations]);

  const result = simulations[selectedId];
  const y5 = result.years[5];
  const y10 = result.years[10];
  const y20 = result.years[20];
  const focused = result.years[focusYear];

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Common Wealth home"><span>CW</span> Common Wealth</a>
        <div className="top-actions"><span className="status-dot" /> Open model <a href="#method">Methodology</a></div>
      </header>

      <section className="hero" id="top">
        <div className="intro">
          <p className="eyebrow"><Term note="agi">AGI</Term> STANDARD OF LIVING SIMULATOR <span>• EXPLORATORY, NOT A FORECAST</span></p>
          <h1>How would <Term note="agi">AGI</Term> change<br />your <em>standard of living?</em></h1>
          <p className="lede">Compare how the same AGI transition could affect households across the U.S. income distribution—and test what policy changes.</p>
          <div className="scenario-pill"><span>SCENARIO</span><strong><Term note="agi">20-Year Transformative AGI</Term></strong><small>{intervention.name} · {intervention.shortDescription}</small></div>
        </div>

        <section className="intervention-panel" aria-labelledby="intervention-heading">
          <div className="section-label"><span>01</span> <b id="intervention-heading">CHOOSE AN <Term note="intervention">INTERVENTION</Term></b></div>
          <div className="intervention-grid">{interventionList.map((item) => (
            <button type="button" key={item.id} className={interventionId === item.id ? 'active' : ''} onClick={() => setInterventionId(item.id as InterventionId)}>
              <i>{item.id === 'status-quo' ? 'DEFAULT' : 'ILLUSTRATIVE'}</i><strong>{item.name}</strong><small>{item.shortDescription}</small>
            </button>
          ))}</div>
          <p>{intervention.description}</p>
        </section>

        <div className="workspace quintile-workspace">
          <aside className="inputs-card quintile-card">
            <div className="section-label"><span>02</span> SELECT A HOUSEHOLD</div>
            <p className="input-help">Choose an <Term note="quintile">income quintile</Term>. The model loads U.S. income and typical <Term note="equity">stock-equity</Term> benchmarks for that group.</p>
            <div className="quintile-selector" role="group" aria-label="Household income quintile">
              {quintilePresets.map((preset) => (
                <button type="button" key={preset.id} className={selectedId === preset.id ? 'active' : ''} onClick={() => selectQuintile(preset.id)} style={{ borderLeftColor: preset.color }}>
                  <i style={{ background: preset.color }} /><span><b>{preset.shortLabel} · {preset.label}</b><small>{money.format(preset.household.annualIncome)} avg. income</small></span>
                </button>
              ))}
            </div>

            <details className="advanced-inputs">
              <summary><span>Advanced</span><b>{isCustom ? 'Customized' : 'Set values manually'}</b><i>+</i></summary>
              <div className="advanced-body">
                <label>Annual household income<div className="money-input"><span>$</span><input aria-label="Annual household income" type="number" min="1" value={income} onChange={(e) => customize(() => setIncome(Number(e.target.value)))} /></div></label>
                <div className="paired">
                  <label>Household size<input aria-label="Household size" type="number" min="1" max="12" value={size} onChange={(e) => customize(() => setSize(Number(e.target.value)))} /></label>
                  <label><Term note="equity">Stock &amp; fund equity</Term><div className="money-input"><span>$</span><input aria-label="Stock and fund equity" type="number" min="0" value={equityHoldings} onChange={(e) => customize(() => setEquityHoldings(Number(e.target.value)))} /></div></label>
                </div>
                <p className="input-help">Stocks and stock funds held directly or through retirement accounts. Cash, deposits, bonds, and home equity do not receive modeled AI-capital returns.</p>
                <fieldset><legend>Housing</legend><div className="segmented">
                  {([['rent','Rent'],['mortgage','Mortgage'],['own','Own outright']] as const).map(([value, label]) => <button type="button" className={housing === value ? 'active' : ''} key={value} onClick={() => customize(() => setHousing(value))}>{label}</button>)}
                </div></fieldset>
              </div>
            </details>
            <p className="privacy">Presets: Census 2024 mean income + Fed SCF 2022 median equity. Calculated locally.</p>
          </aside>

          <section className="result-card comparison-card">
            <div className="result-head">
              <div><p className="section-label"><span>03</span> FIVE HOUSEHOLD PATHS</p><h2><Term note="purchasingPower">Material purchasing power</Term></h2><p className="axis-definition">Y-axis: <Term note="purchasingPower">equivalent consumption bundle</Term> you can afford · Today = 100</p></div>
              <div className="outcome" style={{ color: selectedPreset.color }}><strong>{round(y20.standardOfLiving)}</strong><span>{selectedPreset.shortLabel} · YEAR 20<br />TODAY = 100</span></div>
            </div>
            <div className="chart-wrap comparison-chart" aria-label="Material purchasing power for five U.S. household-income quintiles over 20 years">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 12, right: 16, bottom: 3, left: 54 }}>
                  <CartesianGrid vertical={false} stroke="#dedbd3" strokeDasharray="3 5" />
                  <XAxis dataKey="year" ticks={[0,5,10,15,20]} tickFormatter={(v) => v === 0 ? 'Today' : `Yr ${v}`} axisLine={false} tickLine={false} />
                  <YAxis domain={['auto','auto']} axisLine={false} tickLine={false} width={42}>
                    <Label value="Purchasing power index · Today = 100" angle={-90} position="insideLeft" offset={-38} style={{ fontSize: 9, fill: '#6f746e', letterSpacing: 0.5 }} />
                  </YAxis>
                  <Tooltip formatter={(value, name) => [round(Number(value)), name]} labelFormatter={(v) => v === 0 ? 'Today' : `Year ${v}`} />
                  {quintilePresets.map((preset) => <Line key={preset.id} type="monotone" dataKey={preset.id} name={`${preset.shortLabel} · ${preset.label}`} stroke={preset.color} strokeWidth={selectedId === preset.id ? 4 : 2.2} strokeOpacity={selectedId === preset.id ? 1 : .72} dot={false} activeDot={{ r: selectedId === preset.id ? 5 : 3 }} />)}
                  <Line type="monotone" dataKey="baseline" name="No-AGI baseline" stroke="#8b8d88" strokeWidth={1.25} strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="quintile-legend">
              {quintilePresets.map((preset) => <button type="button" className={selectedId === preset.id ? 'active' : ''} key={preset.id} onClick={() => selectQuintile(preset.id)}><i style={{ background: preset.color }} />{preset.shortLabel}</button>)}
              <span><i /> <Term note="noAgi">No-AGI baseline</Term></span>
            </div>
            <div className="milestones selected-milestones">
              <div><span>{selectedPreset.shortLabel} TODAY</span><strong>100</strong></div><i />
              <div><span>YEAR 5</span><strong>{round(y5.standardOfLiving)}</strong></div><i />
              <div><span>YEAR 10</span><strong>{round(y10.standardOfLiving)}</strong></div><i />
              <div><span>YEAR 20</span><strong>{round(y20.standardOfLiving)}</strong></div>
            </div>
          </section>
        </div>
      </section>

      <section className="first-explain" id="method">
        <p className="eyebrow">WHAT THE Y-AXIS MEANS</p>
        <h2><Term note="purchasingPower">Purchasing power</Term>, not salary.</h2>
        <div className="explain-grid">
          <article><span>100</span><h3>Today&apos;s bundle</h3><p>Every line begins at 100: what that <Term note="quintile">quintile&apos;s</Term> household can materially afford today.</p></article>
          <article><span>↑</span><h3>Above 100</h3><p>The household can command a larger <Term note="purchasingPower">equivalent bundle</Term>—even if its nominal wage falls.</p></article>
          <article className="assumption-card"><small>SELECTED HOUSEHOLD</small><strong>{selectedPreset.label}{isCustom ? ' · customized' : ''}</strong><p>{money.format(income)} income · {compactMoney.format(equityHoldings)} stock equity · {size} people.</p></article>
        </div>
      </section>

      <section className="analysis-section dark-section">
        <div className="section-intro">
          <div><p className="eyebrow">WHY DOES {selectedPreset.shortLabel} CHANGE?</p><h2>The forces behind this line.</h2></div>
          <div className="year-tabs" aria-label="Explanation year">{[5,10,20].map((year) => <button className={focusYear === year ? 'active' : ''} key={year} onClick={() => setFocusYear(year)}>Year {year}</button>)}</div>
        </div>
        <div className="two-col">
          <div><p className="panel-kicker">CONTRIBUTION TO THE INDEX</p><WhyChart year={focused} /></div>
          <div className="narrative-card"><small>{intervention.name.toUpperCase()}</small><h3>{focused.standardOfLiving >= 100 ? 'Abundance outweighs lost labor income.' : 'Lost labor income outweighs abundance.'}</h3><p>By year {focusYear}, <Term note="automation">{Math.round(focused.automation * 100)}% of original work is automatable</Term>. {intervention.description} <Term note="scarceFactors">Irreproducible scarce factors</Term> remain constrained while <Term note="reproducible">reproducible goods</Term> get cheaper.</p><strong>{Math.round(focused.standardOfLiving - 100) >= 0 ? '+' : ''}{Math.round(focused.standardOfLiving - 100)} points</strong><span>net change from today</span></div>
        </div>
      </section>

      <section className="analysis-section">
        <div className="section-intro"><div><p className="eyebrow">WHERE {selectedPreset.shortLabel}&apos;S RESOURCES COME FROM</p><h2>From paychecks to ownership.</h2></div><p className="side-copy">The selected <Term note="intervention">intervention</Term> changes transfers or broad ownership; existing <Term note="resources">capital income</Term> still follows today&apos;s holdings.</p></div>
        <ResourceComposition result={result} />
        <div className="ownership-note"><strong>{Math.round(calibration.topTenEquityShare.value * 100)}%</strong><p>of U.S. corporate equities and mutual fund shares are held by the top 10% of the wealth distribution in the Federal Reserve&apos;s 2026 Q1 data.</p><a href="https://www.federalreserve.gov/releases/z1/dataviz/dfa/compare/chart/" target="_blank" rel="noreferrer">View the data ↗</a></div>
      </section>

      <section className="analysis-section affordability-section">
        <div className="section-intro"><div><p className="eyebrow">WHAT BECOMES EASIER TO AFFORD?</p><h2>Abundance is uneven.</h2></div><p className="side-copy">Modeled affordability in year {focusYear}; total purchasing power also depends on household resources.</p></div>
        <Affordability year={focused} />
      </section>

      <section className="analysis-section macro-section">
        <details>
          <summary><span><small>FOR THE CURIOUS</small>What&apos;s happening behind the scenes?</span><b>+</b></summary>
          <p className="macro-copy">These national outputs are model mechanics, not predictions. They make the household result auditable.</p>
          <MacroDetails year={focused} />
        </details>
      </section>

      <TermNotes />

      <section className="method-section">
        <div><p className="eyebrow">MODEL & SOURCES</p><h2>Every number has a label.</h2><p>Income presets use Census household <Term note="quintile">quintile</Term> means. <Term note="equity">Stock equity</Term> and inferred household traits use the latest Survey of Consumer Finances. Cash and other non-equity assets do not receive AI-capital returns. Policy <Term note="intervention">interventions</Term> are transparent stress tests, not enacted proposals or forecasts.</p></div>
        <div className="source-list">
          <a href="https://www.census.gov/data/tables/time-series/demo/income-poverty/historical-income-households.html" target="_blank" rel="noreferrer"><span>DATA · 2024</span><strong>U.S. Census H-3</strong><small>Mean household income by quintile ↗</small></a>
          <a href="https://www.federalreserve.gov/econres/scfindex.htm" target="_blank" rel="noreferrer"><span>DATA · 2022</span><strong>Survey of Consumer Finances</strong><small>Median stock equity by income group ↗</small></a>
          <a href="https://www.nber.org/papers/w32255" target="_blank" rel="noreferrer"><span>PAPER · 2024</span><strong>Korinek & Suh</strong><small>Automation, wages and the transition to AGI ↗</small></a>
          <a href="https://www.nber.org/papers/w31815" target="_blank" rel="noreferrer"><span>PAPER · 2023/2026</span><strong>Trammell & Korinek</strong><small>Growth, labor share and scarce resources ↗</small></a>
          <details><summary><span>ASSUMPTIONS</span><strong>Model & intervention calibration</strong><small>Inspect the values used here +</small></summary><ul>{Object.entries(calibration).filter(([, item]) => item.provenance === 'ASSUMPTION').map(([key, item]) => <li key={key}><b>{key.replace(/([A-Z])/g, ' $1')}</b><code>{item.value}</code><p>{item.note}</p></li>)}</ul></details>
        </div>
      </section>

      <footer><div className="brand"><span>CW</span> Common Wealth</div><p>An open-source exploratory simulator. Not financial advice and not a forecast.</p><a href="#top">Back to top ↑</a></footer>
    </main>
  );
}
