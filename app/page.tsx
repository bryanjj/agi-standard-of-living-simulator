'use client';

import { useMemo, useState } from 'react';
import { CartesianGrid, Label, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { calibration } from '../calibration/usBaseline';
import { quintileById, quintilePresets, type QuintileId } from '../calibration/quintiles';
import { afterTaxIncomeIndex, purchasingPowerIndex, purchasingPowerScale } from '../model/comparison';
import { simulate } from '../model/simulation';
import { interventions } from '../scenarios/interventions';
import { transformative20Year } from '../scenarios/transformative20yr';
import { Affordability, MacroDetails, ResourceComposition, WhyChart } from '../ui/Explanations';
import { Term, TermNotes } from '../ui/Terms';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const compactMoney = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 });
const round = (value: number) => Math.round(value);

export default function Home() {
  const [selectedId, setSelectedId] = useState<QuintileId>('q3');
  const [focusYear, setFocusYear] = useState(20);
  const intervention = interventions['status-quo'];
  const selectedPreset = quintileById[selectedId];

  const selectQuintile = (id: QuintileId) => setSelectedId(id);

  const simulations = useMemo(() => Object.fromEntries(quintilePresets.map((preset) => [
    preset.id, simulate(transformative20Year, preset.household, intervention),
  ])) as Record<QuintileId, ReturnType<typeof simulate>>, [intervention]);

  const chartData = useMemo(() => simulations.q1.years.map((year, index) => ({
    year: year.year,
    baseline: year.noAgiBaseline,
    ...Object.fromEntries(quintilePresets.map((preset) => [preset.id, purchasingPowerIndex(simulations[preset.id], simulations.q3, index)])),
  })), [simulations]);

  const incomeChartData = useMemo(() => simulations.q1.years.map((year, index) => ({
    year: year.year,
    ...Object.fromEntries(quintilePresets.map((preset) => [preset.id, afterTaxIncomeIndex(simulations[preset.id], simulations.q3, index)])),
  })), [simulations]);

  const result = simulations[selectedId];
  const focused = result.years[focusYear];
  const selectedScale = purchasingPowerScale(result, simulations.q3);
  const selectedToday = purchasingPowerIndex(result, simulations.q3, 0);
  const selectedY5 = purchasingPowerIndex(result, simulations.q3, 5);
  const selectedY10 = purchasingPowerIndex(result, simulations.q3, 10);
  const selectedY20 = purchasingPowerIndex(result, simulations.q3, 20);
  const focusedPurchasingPower = purchasingPowerIndex(result, simulations.q3, focusYear);
  const focusedChange = focusedPurchasingPower - selectedToday;

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Common Wealth home"><span>CW</span> Common Wealth</a>
        <div className="top-actions"><span className="status-dot" /> Open model <a href="#method">Methodology</a></div>
      </header>

      <section className="hero" id="top">
        <div className="intro">
          <p className="eyebrow"><Term note="agi">AGI</Term> STANDARD OF LIVING SIMULATOR</p>
          <h1>How would <Term note="agi">AGI</Term> change<br />your <em>standard of living?</em></h1>
          <p className="lede">Compare how the same AGI transition could affect households across the U.S. income distribution.</p>
          <div className="scenario-pill"><span>SCENARIO</span><strong><Term note="agi">20-Year Transformative AGI</Term></strong><small>{intervention.name} · {intervention.shortDescription}</small></div>
        </div>

        <div className="workspace quintile-workspace">
          <aside className="inputs-card quintile-card">
            <div className="section-label"><span>01</span> SELECT A HOUSEHOLD</div>
            <p className="input-help">Choose an <Term note="quintile">income quintile</Term>. The model loads U.S. income and typical <Term note="equity">stock-equity</Term> benchmarks for that group.</p>
            <div className="quintile-selector" role="group" aria-label="Household income quintile">
              {quintilePresets.map((preset) => (
                <button type="button" key={preset.id} className={selectedId === preset.id ? 'active' : ''} onClick={() => selectQuintile(preset.id)} style={{ borderLeftColor: preset.color }}>
                  <i style={{ background: preset.color }} /><span><b>{preset.shortLabel} · {preset.label}</b><small>{money.format(preset.household.annualIncome)} avg. income</small></span>
                </button>
              ))}
            </div>

            <p className="privacy">Presets: Census 2024 mean income + Fed SCF 2022 median equity. Calculated locally.</p>
          </aside>

          <section className="result-card comparison-card">
            <div className="result-head">
              <div><p className="section-label"><span>02</span> FIVE HOUSEHOLD PATHS</p><h2><Term note="purchasingPower">Purchasing power</Term></h2><p className="axis-definition">Q3 today = 100</p></div>
              <div className="outcome" style={{ color: selectedPreset.color }}><strong>{round(selectedY20)}</strong><span>{selectedPreset.shortLabel} · YEAR 20<br />Q3 TODAY = 100</span></div>
            </div>
            <div className="chart-wrap comparison-chart" aria-label="Material purchasing power for five U.S. household-income quintiles over 20 years">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 12, right: 16, bottom: 3, left: 54 }}>
                  <CartesianGrid vertical={false} stroke="#dedbd3" strokeDasharray="3 5" />
                  <XAxis dataKey="year" ticks={[0,5,10,15,20]} tickFormatter={(v) => v === 0 ? 'Today' : `Yr ${v}`} axisLine={false} tickLine={false} />
                  <YAxis domain={['auto','auto']} axisLine={false} tickLine={false} width={42}>
                    <Label value="Purchasing power · Q3 today = 100" angle={-90} position="insideLeft" offset={-38} style={{ fontSize: 9, fill: '#6f746e', letterSpacing: 0.5 }} />
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
              <div><span>{selectedPreset.shortLabel} TODAY</span><strong>{round(selectedToday)}</strong></div><i />
              <div><span>YEAR 5</span><strong>{round(selectedY5)}</strong></div><i />
              <div><span>YEAR 10</span><strong>{round(selectedY10)}</strong></div><i />
              <div><span>YEAR 20</span><strong>{round(selectedY20)}</strong></div>
            </div>
          </section>
        </div>

        <section className="result-card income-chart-card">
          <div className="result-head">
            <div><p className="section-label">MODELED INCOME PATHS</p><h2><Term note="incomeIndex">After-tax household income</Term></h2><p className="axis-definition">Q3 today = 100 · Before modeled price changes</p></div>
          </div>
          <div className="chart-wrap income-chart" aria-label="Modeled after-tax household income for five U.S. household-income quintiles over 20 years">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={incomeChartData} margin={{ top: 12, right: 16, bottom: 3, left: 54 }}>
                <CartesianGrid vertical={false} stroke="#dedbd3" strokeDasharray="3 5" />
                <XAxis dataKey="year" ticks={[0,5,10,15,20]} tickFormatter={(v) => v === 0 ? 'Today' : `Yr ${v}`} axisLine={false} tickLine={false} />
                <YAxis domain={['auto','auto']} axisLine={false} tickLine={false} width={42}>
                  <Label value="After-tax income · Q3 today = 100" angle={-90} position="insideLeft" offset={-38} style={{ fontSize: 9, fill: '#6f746e', letterSpacing: 0.5 }} />
                </YAxis>
                <Tooltip formatter={(value, name) => [round(Number(value)), name]} labelFormatter={(v) => v === 0 ? 'Today' : `Year ${v}`} />
                {quintilePresets.map((preset) => <Line key={preset.id} type="monotone" dataKey={preset.id} name={`${preset.shortLabel} · ${preset.label}`} stroke={preset.color} strokeWidth={selectedId === preset.id ? 4 : 2.2} strokeOpacity={selectedId === preset.id ? 1 : .72} dot={false} activeDot={{ r: selectedId === preset.id ? 5 : 3 }} />)}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="quintile-legend">
            {quintilePresets.map((preset) => <button type="button" className={selectedId === preset.id ? 'active' : ''} key={preset.id} onClick={() => selectQuintile(preset.id)}><i style={{ background: preset.color }} />{preset.shortLabel}</button>)}
          </div>
        </section>
      </section>

      <section className="first-explain" id="method">
        <p className="eyebrow">WHAT THE Y-AXIS MEANS</p>
        <h2>Q3 today is the benchmark.</h2>
        <div className="explain-grid">
          <article><span>100</span><h3>Q3 today</h3><p>The middle income <Term note="quintile">quintile</Term> is the common starting benchmark.</p></article>
          <article><span>×</span><h3>Relative values</h3><p>50 is half of Q3&apos;s current <Term note="purchasingPower">purchasing power</Term>. 200 is twice as much.</p></article>
          <article className="assumption-card"><small>SELECTED HOUSEHOLD</small><strong>{selectedPreset.label}</strong><p>{money.format(selectedPreset.household.annualIncome)} income · {compactMoney.format(selectedPreset.household.equityHoldings)} stock equity · {selectedPreset.household.householdSize} people.</p></article>
        </div>
      </section>

      <section className="analysis-section dark-section">
        <div className="section-intro">
          <div><p className="eyebrow">WHY DOES {selectedPreset.shortLabel} CHANGE?</p><h2>Breakdown.</h2></div>
          <div className="year-tabs" aria-label="Explanation year">{[5,10,20].map((year) => <button className={focusYear === year ? 'active' : ''} key={year} onClick={() => setFocusYear(year)}>Year {year}</button>)}</div>
        </div>
        <div className="two-col">
          <div><p className="panel-kicker">CONTRIBUTION TO THE INDEX</p><WhyChart year={focused} scale={selectedScale} /></div>
          <div className="narrative-card"><small>{intervention.name.toUpperCase()}</small><h3>{focused.standardOfLiving >= 100 ? 'Abundance outweighs lost labor income.' : 'Lost labor income outweighs abundance.'}</h3><p>By year {focusYear}, <Term note="automation">{Math.round(focused.automation * 100)}% of original work is automatable</Term>. {intervention.description} <Term note="scarceFactors">Irreproducible scarce factors</Term> remain constrained while <Term note="reproducible">reproducible goods</Term> get cheaper.</p><strong>{Math.round(focusedChange) >= 0 ? '+' : ''}{Math.round(focusedChange)} points</strong><span>change from {selectedPreset.shortLabel} today</span></div>
        </div>
      </section>

      <section className="analysis-section">
        <div className="section-intro"><div><p className="eyebrow">WHERE {selectedPreset.shortLabel}&apos;S RESOURCES COME FROM</p><h2>From paychecks to ownership.</h2></div><p className="side-copy">Under status quo, existing <Term note="resources">capital income</Term> follows today&apos;s stock-equity holdings.</p></div>
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
        <div><p className="eyebrow">MODEL & SOURCES</p><h2>Sources and assumptions.</h2><p>Income presets use Census household <Term note="quintile">quintile</Term> means. <Term note="equity">Stock equity</Term> and inferred household traits use the latest Survey of Consumer Finances. Cash and other non-equity assets do not receive AI-capital returns. The displayed path uses the simplified status quo assumptions.</p></div>
        <div className="source-list">
          <a href="https://www.census.gov/data/tables/time-series/demo/income-poverty/historical-income-households.html" target="_blank" rel="noreferrer"><span>DATA · 2024</span><strong>U.S. Census H-3</strong><small>Mean household income by quintile ↗</small></a>
          <a href="https://www.federalreserve.gov/econres/scfindex.htm" target="_blank" rel="noreferrer"><span>DATA · 2022</span><strong>Survey of Consumer Finances</strong><small>Median stock equity by income group ↗</small></a>
          <a href="https://www.nber.org/papers/w32255" target="_blank" rel="noreferrer"><span>PAPER · 2024</span><strong>Korinek & Suh</strong><small>Automation, wages and the transition to AGI ↗</small></a>
          <a href="https://www.nber.org/papers/w31815" target="_blank" rel="noreferrer"><span>PAPER · 2023/2026</span><strong>Trammell & Korinek</strong><small>Growth, labor share and scarce resources ↗</small></a>
          <details><summary><span>ASSUMPTIONS</span><strong>Model calibration</strong><small>Inspect the values used here +</small></summary><ul>{Object.entries(calibration).filter(([key, item]) => item.provenance === 'ASSUMPTION' && !['expandedSafetyNetReplacement', 'citizenDividendShare', 'publicFundDividendShare'].includes(key)).map(([key, item]) => <li key={key}><b>{key.replace(/([A-Z])/g, ' $1')}</b><code>{item.value}</code><p>{item.note}</p></li>)}</ul></details>
        </div>
      </section>

      <footer><div className="brand"><span>CW</span> Common Wealth</div><p>An open-source household simulator.</p><a href="#top">Back to top ↑</a></footer>
    </main>
  );
}
