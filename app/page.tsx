'use client';

import { useMemo, useState } from 'react';
import { CartesianGrid, Label, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { calibration } from '../calibration/usBaseline';
import { quintileById } from '../calibration/quintiles';
import { purchasingPowerOutcomes, purchasingPowerScale, simulateHouseholdPaths, weeklyHouseholdOutcomes } from '../model/comparison';
import { simulate } from '../model/simulation';
import { interventions } from '../scenarios/interventions';
import { transformative20Year } from '../scenarios/transformative20yr';
import { Affordability, MacroDetails, ResourceComposition, WhyChart } from '../ui/Explanations';
import { Term, TermNotes } from '../ui/Terms';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const compactMoney = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 });
const round = (value: number) => Math.round(value);

function OutcomeTooltip({ active, label, payload, metric }: { active?: boolean; label?: number; payload?: Array<{ payload: Record<string, number> }>; metric: 'income' | 'purchasing power' }) {
  if (!active || !payload?.length) return null;
  const datum = payload[0].payload;
  const employed = metric === 'income' ? datum.employedIncome : datum.employedPurchasingPower;
  const displaced = metric === 'income' ? datum.displacedIncome : datum.displacedPurchasingPower;
  return <div className="income-tooltip"><small>{label === 0 ? 'TODAY' : `YEAR ${Number(label).toFixed(1)}`}</small><strong>{round(datum.employedChance)}%</strong><span>chance employed</span><b>{round(employed)} if employed · {round(displaced)} if not employed</b></div>;
}

export default function Home() {
  const [focusYear, setFocusYear] = useState(20);
  const intervention = interventions['status-quo'];
  const referencePreset = quintileById.q3;
  const result = useMemo(() => simulate(transformative20Year, referencePreset.household, intervention), [intervention, referencePreset]);

  const weeklyOutcomes = useMemo(() => weeklyHouseholdOutcomes(result, result), [result]);
  const simulatedHouseholdPaths = useMemo(() => simulateHouseholdPaths(result, result, 100, 8), [result]);
  const chartData = useMemo(() => weeklyOutcomes.map((outcome, index) => ({
    year: outcome.year,
    baseline: 100 * (1 + calibration.baselineRealGrowth.value) ** outcome.year,
    employedChance: outcome.employmentProbability * 100,
    employedPurchasingPower: outcome.employedPurchasingPower,
    displacedPurchasingPower: outcome.displacedPurchasingPower,
    ...Object.fromEntries(simulatedHouseholdPaths.map((path) => [`pp${path.id}`, path.purchasingPowerValues[index]])),
  })), [weeklyOutcomes, simulatedHouseholdPaths]);

  const incomeChartData = useMemo(() => weeklyOutcomes.map((outcome, index) => ({
    year: outcome.year,
    employedChance: outcome.employmentProbability * 100,
    employedIncome: outcome.employedIncome,
    displacedIncome: outcome.displacedIncome,
    ...Object.fromEntries(simulatedHouseholdPaths.map((path) => [path.id, path.incomeValues[index]])),
  })), [weeklyOutcomes, simulatedHouseholdPaths]);
  const chanceEmployedAt = (year: number) => 100 * calibration.currentLaborForceEmploymentRate.value * (1 - year / result.scenario.horizonYears);
  const displacedByYearTen = 100 - chanceEmployedAt(10);

  const focused = result.years[focusYear];
  const selectedScale = purchasingPowerScale(result, result);
  const selectedY20 = purchasingPowerOutcomes(result, result, 20).displaced;
  const focusedPurchasingPower = purchasingPowerOutcomes(result, result, focusYear).average;
  const focusedChange = focusedPurchasingPower - 100;

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
          <p className="lede">Follow a middle-income U.S. household through a 20-year AGI transition.</p>
          <div className="scenario-pill"><span>SCENARIO</span><strong><Term note="agi">20-Year Transformative AGI</Term></strong><small>{intervention.name} · {intervention.shortDescription}</small></div>
        </div>

        <section className="reference-household" aria-label="Q3 middle-income reference household">
          <div><p className="section-label"><span>01</span> REFERENCE HOUSEHOLD</p><strong>Q3 · Middle 20%</strong></div>
          <div><span>MEAN INCOME</span><strong>{money.format(referencePreset.household.annualIncome)}</strong></div>
          <div><span>MEDIAN STOCK EQUITY</span><strong>{compactMoney.format(referencePreset.household.equityHoldings)}</strong></div>
          <div><span>HOUSEHOLD</span><strong>{referencePreset.household.householdSize} people</strong></div>
          <div><span>HOUSING</span><strong>Mortgage</strong></div>
        </section>

        <div className="workspace single-workspace">
          <section className="result-card comparison-card">
            <div className="result-head">
              <div><p className="section-label"><span>02</span> 100 WEEKLY JOB PATHS</p><h2><Term note="purchasingPower">Likely purchasing power</Term></h2><p className="axis-definition">Q3 today = 100 · Darker paths are more likely</p></div>
              <div className="outcome" style={{ color: referencePreset.color }}><strong>{round(selectedY20)}</strong><span>Q3 · YEAR 20<br />Q3 TODAY = 100</span></div>
            </div>
            <div className="chart-wrap comparison-chart" aria-label="One hundred simulated purchasing-power paths for comparable Q3 workers over 20 years">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 12, right: 16, bottom: 3, left: 54 }}>
                  <CartesianGrid vertical={false} stroke="#dedbd3" strokeDasharray="3 5" />
                  <XAxis type="number" dataKey="year" domain={[0,20]} ticks={[0,5,10,15,20]} tickFormatter={(v) => v === 0 ? 'Today' : `Yr ${v}`} axisLine={false} tickLine={false} />
                  <YAxis domain={['auto','auto']} axisLine={false} tickLine={false} width={42}>
                    <Label value="Purchasing power · Q3 today = 100" angle={-90} position="insideLeft" offset={-38} style={{ fontSize: 9, fill: '#6f746e', letterSpacing: 0.5 }} />
                  </YAxis>
                  <Tooltip content={<OutcomeTooltip metric="purchasing power" />} />
                  {simulatedHouseholdPaths.map((path) => <Line key={`pp${path.id}`} type="linear" dataKey={`pp${path.id}`} name="Simulated worker" stroke={referencePreset.color} strokeWidth={1.2} strokeOpacity={0.028} dot={false} activeDot={false} isAnimationActive={false} />)}
                  <Line type="monotone" dataKey="baseline" name="No-AGI baseline" stroke="#8b8d88" strokeWidth={1.25} strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="quintile-legend single-legend probability-legend">
              <span className="density-key"><i /> Darker = more likely</span>
              <span><i /> <Term note="noAgi">No-AGI baseline</Term></span>
            </div>
            <div className="milestones selected-milestones">
              <div><span>EMPLOYED TODAY</span><strong>{chanceEmployedAt(0).toFixed(1)}%</strong></div><i />
              <div><span>YEAR 5</span><strong>{chanceEmployedAt(5).toFixed(1)}%</strong></div><i />
              <div><span>YEAR 10</span><strong>{chanceEmployedAt(10).toFixed(1)}%</strong></div><i />
              <div><span>YEAR 20</span><strong>0%</strong></div>
            </div>
            <p className="simulation-note chart-density-note">The 100 paths use the same worker displacement draws as the income chart. Overlapping paths accumulate color.</p>
          </section>
        </div>

        <section className="result-card income-chart-card">
          <div className="result-head">
            <div><p className="section-label">100 WEEKLY JOB PATHS</p><h2><Term note="incomeIndex">Likely after-tax household income</Term></h2><p className="axis-definition"><Term note="employmentProbability">95.9% employed today</Term> · 0% in year 20</p></div>
            <div className="displacement-callout"><strong>{round(displacedByYearTen)}%</strong><span>MODELED CHANCE<br />NOT EMPLOYED BY YEAR 10</span></div>
          </div>
          <div className="chart-wrap income-chart" aria-label="One hundred simulated after-tax income paths for comparable Q3 workers over 20 years">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={incomeChartData} margin={{ top: 12, right: 16, bottom: 3, left: 54 }}>
                <CartesianGrid vertical={false} stroke="#dedbd3" strokeDasharray="3 5" />
                <XAxis type="number" dataKey="year" domain={[0,20]} ticks={[0,5,10,15,20]} tickFormatter={(v) => v === 0 ? 'Today' : `Yr ${v}`} axisLine={false} tickLine={false} />
                <YAxis domain={['auto','auto']} axisLine={false} tickLine={false} width={42}>
                  <Label value="After-tax income · Q3 today = 100" angle={-90} position="insideLeft" offset={-38} style={{ fontSize: 9, fill: '#6f746e', letterSpacing: 0.5 }} />
                </YAxis>
                <Tooltip content={<OutcomeTooltip metric="income" />} />
                {simulatedHouseholdPaths.map((path) => <Line key={path.id} type="linear" dataKey={path.id} name="Simulated worker" stroke={referencePreset.color} strokeWidth={1.2} strokeOpacity={0.028} dot={false} activeDot={false} isAnimationActive={false} />)}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="quintile-legend single-legend probability-legend income-legend"><span className="density-key"><i /> Darker = more likely</span></div>
          <div className="displacement-probabilities" aria-label="Chance of having a job"><span><small>TODAY</small><strong>{round(chanceEmployedAt(0))}%</strong></span><span><small>YEAR 5</small><strong>{round(chanceEmployedAt(5))}%</strong></span><span><small>YEAR 10</small><strong>{round(chanceEmployedAt(10))}%</strong></span><span><small>YEAR 15</small><strong>{round(chanceEmployedAt(15))}%</strong></span><span><small>YEAR 20</small><strong>0%</strong></span></div>
          <p className="simulation-note">Each currently employed path faces a new displacement draw every week. The chance of employment declines smoothly from 95.9% today to 0% in year 20. Once displaced, a worker remains displaced. Labor income falls to $0; stock income and status-quo support keep total household income above $0.</p>
        </section>
      </section>

      <section className="first-explain" id="method">
        <p className="eyebrow">WHAT THE Y-AXIS MEANS</p>
        <h2>Q3 today is the benchmark.</h2>
        <div className="explain-grid">
          <article><span>100</span><h3>Q3 today</h3><p>The middle income <Term note="quintile">quintile</Term> is the common starting benchmark.</p></article>
          <article><span>×</span><h3>Relative values</h3><p>50 is half of Q3&apos;s current <Term note="purchasingPower">purchasing power</Term>. 200 is twice as much.</p></article>
          <article className="assumption-card"><small>REFERENCE HOUSEHOLD</small><strong>Q3 · Middle 20%</strong><p>{money.format(referencePreset.household.annualIncome)} mean income · {compactMoney.format(referencePreset.household.equityHoldings)} median stock equity · {referencePreset.household.householdSize} people.</p></article>
        </div>
      </section>

      <section className="analysis-section dark-section">
        <div className="section-intro">
          <div><p className="eyebrow">AGGREGATE Q3 AVERAGE</p><h2>Breakdown.</h2></div>
          <div className="year-tabs" aria-label="Explanation year">{[5,10,20].map((year) => <button className={focusYear === year ? 'active' : ''} key={year} onClick={() => setFocusYear(year)}>Year {year}</button>)}</div>
        </div>
        <div className="two-col">
          <div><p className="panel-kicker">CONTRIBUTION TO THE INDEX</p><WhyChart year={focused} scale={selectedScale} /></div>
          <div className="narrative-card"><small>{intervention.name.toUpperCase()}</small><h3>{focused.standardOfLiving >= 100 ? 'Abundance outweighs lost labor income.' : 'Lost labor income outweighs abundance.'}</h3><p>This section explains the average across all paths. By year {focusYear}, <Term note="automation">{Math.round(focused.automation * 100)}% of original work is automatable</Term>. {intervention.description} <Term note="scarceFactors">Irreproducible scarce factors</Term> remain constrained while <Term note="reproducible">reproducible goods</Term> get cheaper.</p><strong>{Math.round(focusedChange) >= 0 ? '+' : ''}{Math.round(focusedChange)} points</strong><span>average change from Q3 today</span></div>
        </div>
      </section>

      <section className="analysis-section">
        <div className="section-intro"><div><p className="eyebrow">WHERE Q3&apos;S RESOURCES COME FROM</p><h2>From paychecks to ownership.</h2></div><p className="side-copy">Under status quo, existing <Term note="resources">capital income</Term> follows today&apos;s stock-equity holdings.</p></div>
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
        <div><p className="eyebrow">MODEL & SOURCES</p><h2>Sources and assumptions.</h2><p>The reference household uses Census Q3 mean household income. <Term note="equity">Stock equity</Term> and inferred household traits use the 2022 Survey of Consumer Finances. The initial <Term note="employmentProbability">chance of employment</Term> uses the latest BLS unemployment rate. Cash and other non-equity assets do not receive AI-capital returns. The displayed paths use the simplified status quo assumptions.</p></div>
        <div className="source-list">
          <a href="https://www.census.gov/data/tables/time-series/demo/income-poverty/historical-income-households.html" target="_blank" rel="noreferrer"><span>DATA · 2024</span><strong>U.S. Census H-3</strong><small>Mean Q3 household income ↗</small></a>
          <a href="https://www.federalreserve.gov/econres/scfindex.htm" target="_blank" rel="noreferrer"><span>DATA · 2022</span><strong>Survey of Consumer Finances</strong><small>Median stock equity by income group ↗</small></a>
          <a href="https://www.bls.gov/cps/latest-numbers.htm" target="_blank" rel="noreferrer"><span>DATA · JUL 2026</span><strong>U.S. Bureau of Labor Statistics</strong><small>4.1% unemployment rate ↗</small></a>
          <a href="https://www.nber.org/papers/w32255" target="_blank" rel="noreferrer"><span>PAPER · 2024</span><strong>Korinek & Suh</strong><small>Automation, wages and the transition to AGI ↗</small></a>
          <a href="https://www.nber.org/papers/w31815" target="_blank" rel="noreferrer"><span>PAPER · 2023/2026</span><strong>Trammell & Korinek</strong><small>Growth, labor share and scarce resources ↗</small></a>
          <details><summary><span>ASSUMPTIONS</span><strong>Model calibration</strong><small>Inspect the values used here +</small></summary><ul>{Object.entries(calibration).filter(([key, item]) => item.provenance === 'ASSUMPTION' && !['expandedSafetyNetReplacement', 'citizenDividendShare', 'publicFundDividendShare'].includes(key)).map(([key, item]) => <li key={key}><b>{key.replace(/([A-Z])/g, ' $1')}</b><code>{item.value}</code><p>{item.note}</p></li>)}</ul></details>
        </div>
      </section>

      <footer><div className="brand"><span>CW</span> Common Wealth</div><p>An open-source household simulator.</p><a href="#top">Back to top ↑</a></footer>
    </main>
  );
}
