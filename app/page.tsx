'use client';

import { useMemo, useState } from 'react';
import { CartesianGrid, Label, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { calibration } from '../calibration/usBaseline';
import { quintilePresets } from '../calibration/quintiles';
import { aggregateSimulationResults, meanHouseholdPath, sampleHouseholdPaths, simulatePopulationPaths, weeklyHouseholdOutcomes } from '../model/comparison';
import { employmentProbabilityAtYear } from '../model/employment';
import { simulate } from '../model/simulation';
import { interventions } from '../scenarios/interventions';
import { transformative20Year } from '../scenarios/transformative20yr';
import { Affordability, MacroDetails, ResourceComposition, WhyChart } from '../ui/Explanations';
import { Term, TermNotes } from '../ui/Terms';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const compactMoney = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 });
const round = (value: number) => Math.round(value);
const pathOpacity = (workerCount: number) => 1 - (1 - 0.003) ** workerCount;
const profileColorById = Object.fromEntries(quintilePresets.map((preset) => [preset.id, preset.color]));

function OutcomeTooltip({ active, label, payload, metric }: { active?: boolean; label?: number; payload?: Array<{ payload: Record<string, number> }>; metric: 'income' | 'purchasing power' }) {
  if (!active || !payload?.length) return null;
  const datum = payload[0].payload;
  const mean = metric === 'income' ? datum.meanIncome : datum.meanPurchasingPower;
  return <div className="income-tooltip"><small>{label === 0 ? 'TODAY' : `YEAR ${Number(label).toFixed(1)}`}</small><strong>{round(mean)}</strong><span>sample mean</span><b>{round(datum.employedChance)}% modeled chance employed</b></div>;
}

export default function Home() {
  const [focusYear, setFocusYear] = useState(20);
  const intervention = interventions['status-quo'];
  const quintileResults = useMemo(() => quintilePresets.map((preset) => simulate(transformative20Year, preset.household, intervention)), [intervention]);
  const populationSimulation = useMemo(() => simulatePopulationPaths(
    quintilePresets.map((preset, index) => ({ id: preset.id, result: quintileResults[index], weight: 0.2 })),
    1_000,
    8,
  ), [quintileResults]);
  const result = useMemo(() => aggregateSimulationResults(quintileResults.map((quintileResult, index) => ({
    result: quintileResult,
    count: populationSimulation.profileCounts[quintilePresets[index].id],
  }))), [populationSimulation.profileCounts, quintileResults]);
  const weeklyOutcomes = useMemo(() => weeklyHouseholdOutcomes(quintileResults[2], quintileResults[2]), [quintileResults]);
  const simulatedHouseholdPaths = populationSimulation.paths;
  const simulationMean = useMemo(() => meanHouseholdPath(simulatedHouseholdPaths), [simulatedHouseholdPaths]);
  const displayedHouseholdPaths = useMemo(() => sampleHouseholdPaths(simulatedHouseholdPaths, 250), [simulatedHouseholdPaths]);
  const chartData = useMemo(() => weeklyOutcomes.map((outcome, index) => ({
    year: outcome.year,
    baseline: 100 * (1 + calibration.baselineRealGrowth.value) ** outcome.year,
    employedChance: outcome.employmentProbability * 100,
    meanPurchasingPower: simulationMean.purchasingPowerValues[index],
    ...Object.fromEntries(displayedHouseholdPaths.map((path) => [`pp${path.id}`, path.purchasingPowerValues[index]])),
  })), [weeklyOutcomes, simulationMean, displayedHouseholdPaths]);

  const incomeChartData = useMemo(() => weeklyOutcomes.map((outcome, index) => ({
    year: outcome.year,
    employedChance: outcome.employmentProbability * 100,
    meanIncome: simulationMean.incomeValues[index],
    ...Object.fromEntries(displayedHouseholdPaths.map((path) => [path.id, path.incomeValues[index]])),
  })), [weeklyOutcomes, simulationMean, displayedHouseholdPaths]);
  const chanceEmployedAt = (year: number) => 100 * employmentProbabilityAtYear(year);
  const chanceLabel = (year: number) => {
    const chance = chanceEmployedAt(year);
    return chance < 0.1 ? '<0.1%' : `${chance.toFixed(1)}%`;
  };
  const displacedByYearTen = 100 - chanceEmployedAt(10);

  const focused = result.years[focusYear];
  const focusedChange = focused.standardOfLiving - 100;

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
          <p className="lede">Follow 1,000 sampled U.S. workers across a 30-year logistic employment transition.</p>
          <div className="scenario-pill"><span>SCENARIO</span><strong><Term note="agi">{result.scenario.name}</Term></strong><small>{intervention.name} · {intervention.shortDescription}</small></div>
        </div>

        <section className="reference-household" aria-label="Population sample of one thousand U.S. workers">
          <div><p className="section-label"><span>01</span> POPULATION SAMPLE</p><strong>1,000 U.S. workers</strong></div>
          <div><span>INCOME PROFILES</span><strong>Q1 through Q5</strong></div>
          <div><span>SAMPLE MEAN INCOME</span><strong>{money.format(result.household.annualIncome)}</strong></div>
          <div><span>SAMPLE MEAN STOCK EQUITY</span><strong>{compactMoney.format(result.household.equityHoldings)}</strong></div>
          <div><span>SAMPLING</span><strong>Fixed seed</strong></div>
        </section>

        <div className="workspace single-workspace">
          <section className="result-card comparison-card">
            <div className="result-head">
              <div><p className="section-label"><span>02</span> 1,000 SAMPLED U.S. WORKERS</p><h2><Term note="purchasingPower">Likely purchasing power</Term></h2><p className="axis-definition">Sample mean today = 100 · Dark line is the mean · No savings buffer</p></div>
              <div className="outcome"><strong>{calibration.unemploymentBenefitWeeks.value}</strong><span>WEEKS OF UI<br />AFTER JOB LOSS</span></div>
            </div>
            <div className="chart-wrap comparison-chart" aria-label="Purchasing-power outcomes for one thousand sampled U.S. workers over 30 years">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 12, right: 16, bottom: 3, left: 54 }}>
                  <CartesianGrid vertical={false} stroke="#dedbd3" strokeDasharray="3 5" />
                  <XAxis type="number" dataKey="year" domain={[0,30]} ticks={[0,10,20,30]} tickFormatter={(v) => v === 0 ? 'Today' : `Yr ${v}`} axisLine={false} tickLine={false} />
                  <YAxis domain={['auto','auto']} axisLine={false} tickLine={false} width={42}>
                    <Label value="Purchasing power · Sample mean today = 100" angle={-90} position="insideLeft" offset={-38} style={{ fontSize: 9, fill: '#6f746e', letterSpacing: 0.5 }} />
                  </YAxis>
                  <Tooltip content={<OutcomeTooltip metric="purchasing power" />} />
                  {displayedHouseholdPaths.map((path) => <Line key={`pp${path.id}`} type="linear" dataKey={`pp${path.id}`} name={`${path.workerCount} sampled workers`} stroke={profileColorById[path.profileId ?? ''] ?? '#8b8065'} strokeWidth={1.2} strokeOpacity={pathOpacity(path.workerCount)} dot={false} activeDot={false} isAnimationActive={false} />)}
                  <Line type="monotone" dataKey="baseline" name="No-AGI baseline" stroke="#8b8d88" strokeWidth={1.25} strokeDasharray="5 5" dot={false} />
                  <Line type="monotone" dataKey="meanPurchasingPower" name="Sample mean" stroke="#20251f" strokeWidth={2.75} dot={false} activeDot={{ r: 3 }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="quintile-legend single-legend probability-legend">
              <span className="density-key"><i /> Darker = more likely</span>
              <span className="mean-key"><i /> Sample mean</span>
              <span><i /> <Term note="noAgi">No-AGI baseline</Term></span>
              {quintilePresets.map((preset) => <span className="profile-key" key={preset.id}><i style={{ background: preset.color }} />{preset.shortLabel} · {populationSimulation.profileCounts[preset.id]}</span>)}
            </div>
            <div className="milestones selected-milestones">
              <div><span>EMPLOYED TODAY</span><strong>{chanceLabel(0)}</strong></div><i />
              <div><span>YEAR 10</span><strong>{chanceLabel(10)}</strong></div><i />
              <div><span>YEAR 20</span><strong>{chanceLabel(20)}</strong></div><i />
              <div><span>YEAR 30</span><strong>{chanceLabel(30)}</strong></div>
            </div>
            <p className="simulation-note chart-density-note">Each worker randomly draws one of five equally sized household-income <Term note="quintile">quintiles</Term>. The fixed sample includes the counts shown above. The dark line is the mean of all 1,000 samples at each week. Both charts use the same job histories and draw 250 weighted representative paths. Purchasing power follows after-tax income divided by the modeled basket price.</p>
          </section>
        </div>

        <section className="result-card income-chart-card">
          <div className="result-head">
            <div><p className="section-label">1,000 SAMPLED U.S. WORKERS</p><h2><Term note="incomeIndex">Likely after-tax household income</Term></h2><p className="axis-definition"><Term note="employmentProbability">50% employed in year 10</Term> · Dark line is the sample mean</p></div>
            <div className="displacement-callout"><strong>{round(displacedByYearTen)}%</strong><span>MODELED CHANCE<br />NOT EMPLOYED AT YEAR 10</span></div>
          </div>
          <div className="chart-wrap income-chart" aria-label="After-tax income outcomes for one thousand sampled U.S. workers over 30 years">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={incomeChartData} margin={{ top: 12, right: 16, bottom: 3, left: 54 }}>
                <CartesianGrid vertical={false} stroke="#dedbd3" strokeDasharray="3 5" />
                <XAxis type="number" dataKey="year" domain={[0,30]} ticks={[0,10,20,30]} tickFormatter={(v) => v === 0 ? 'Today' : `Yr ${v}`} axisLine={false} tickLine={false} />
                <YAxis domain={['auto','auto']} axisLine={false} tickLine={false} width={42}>
                  <Label value="After-tax income · Sample mean today = 100" angle={-90} position="insideLeft" offset={-38} style={{ fontSize: 9, fill: '#6f746e', letterSpacing: 0.5 }} />
                </YAxis>
                <Tooltip content={<OutcomeTooltip metric="income" />} />
                {displayedHouseholdPaths.map((path) => <Line key={path.id} type="linear" dataKey={path.id} name={`${path.workerCount} sampled workers`} stroke={profileColorById[path.profileId ?? ''] ?? '#8b8065'} strokeWidth={1.2} strokeOpacity={pathOpacity(path.workerCount)} dot={false} activeDot={false} isAnimationActive={false} />)}
                <Line type="monotone" dataKey="meanIncome" name="Sample mean" stroke="#20251f" strokeWidth={2.75} dot={false} activeDot={{ r: 3 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="quintile-legend single-legend probability-legend income-legend"><span className="density-key"><i /> Darker = more likely</span><span className="mean-key"><i /> Sample mean</span>{quintilePresets.map((preset) => <span className="profile-key" key={preset.id}><i style={{ background: preset.color }} />{preset.shortLabel}</span>)}</div>
          <div className="displacement-probabilities" aria-label="Chance of having a job"><span><small>TODAY</small><strong>{chanceLabel(0)}</strong></span><span><small>YEAR 10</small><strong>{chanceLabel(10)}</strong></span><span><small>YEAR 20</small><strong>{chanceLabel(20)}</strong></span><span><small>YEAR 30</small><strong>{chanceLabel(30)}</strong></span></div>
          <p className="simulation-note">The dark line is the mean of all 1,000 sampled workers at each week. Each employed worker faces a weekly job-loss draw. An unemployed worker can find another job, but the weekly chance declines from 6.4% today and approaches 0% without reaching it. After each job loss, <Term note="unemploymentInsurance">unemployment insurance replaces 42.2% of the worker&apos;s wage for 16 weeks</Term>.</p>
        </section>
      </section>

      <section className="first-explain" id="method">
        <p className="eyebrow">WHAT THE Y-AXIS MEANS</p>
        <h2>The sample mean today is the benchmark.</h2>
        <div className="explain-grid">
          <article><span>100</span><h3>Sample mean today</h3><p>The arithmetic mean across all 1,000 sampled workers is the common starting benchmark.</p></article>
          <article><span>×</span><h3>Relative values</h3><p>50 is half of the sample&apos;s current <Term note="purchasingPower">purchasing power</Term>. 200 is twice as much.</p></article>
          <article className="assumption-card"><small>SAMPLE COMPOSITION</small><strong>Five income quintiles</strong><p>Each worker independently draws Q1 through Q5 with equal 20% probability. The random seed is fixed.</p></article>
        </div>
      </section>

      <section className="analysis-section dark-section">
        <div className="section-intro">
          <div><p className="eyebrow">AGGREGATE SAMPLE MEAN</p><h2>Breakdown.</h2></div>
          <div className="year-tabs" aria-label="Explanation year">{[5,10,20,30].map((year) => <button className={focusYear === year ? 'active' : ''} key={year} onClick={() => setFocusYear(year)}>Year {year}</button>)}</div>
        </div>
        <div className="two-col">
          <div><p className="panel-kicker">CONTRIBUTION TO THE INDEX</p><WhyChart year={focused} /></div>
          <div className="narrative-card"><small>{intervention.name.toUpperCase()}</small><h3>{focused.standardOfLiving >= 100 ? 'Abundance outweighs lost labor income.' : 'Lost labor income outweighs abundance.'}</h3><p>This section explains the population sample average. By year {focusYear}, <Term note="automation">{Math.round(focused.automation * 100)}% of original work is automatable</Term>. {intervention.description} <Term note="scarceFactors">Irreproducible scarce factors</Term> remain constrained while <Term note="reproducible">reproducible goods</Term> get cheaper.</p><strong>{Math.round(focusedChange) >= 0 ? '+' : ''}{Math.round(focusedChange)} points</strong><span>average change from the sample mean today</span></div>
        </div>
      </section>

      <section className="analysis-section">
        <div className="section-intro"><div><p className="eyebrow">WHERE THE SAMPLE&apos;S RESOURCES COME FROM</p><h2>From paychecks to ownership.</h2></div><p className="side-copy">Under status quo, existing <Term note="resources">capital income</Term> follows each sampled profile&apos;s stock-equity holdings.</p></div>
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
        <div><p className="eyebrow">MODEL & SOURCES</p><h2>Sources and assumptions.</h2><p>Each sampled worker randomly draws one of five equally sized Census household-income quintiles. <Term note="equity">Stock equity</Term> and inferred household traits use the 2022 Survey of Consumer Finances. The initial <Term note="employmentProbability">chance of employment</Term> uses the latest BLS unemployment rate. <Term note="unemploymentInsurance">Unemployment insurance</Term> uses national Department of Labor averages.</p></div>
        <div className="source-list">
          <a href="https://www.census.gov/data/tables/time-series/demo/income-poverty/historical-income-households.html" target="_blank" rel="noreferrer"><span>DATA · 2024</span><strong>U.S. Census H-3</strong><small>Mean household income for each quintile ↗</small></a>
          <a href="https://www.federalreserve.gov/econres/scfindex.htm" target="_blank" rel="noreferrer"><span>DATA · 2022</span><strong>Survey of Consumer Finances</strong><small>Median stock equity by income group ↗</small></a>
          <a href="https://www.bls.gov/cps/latest-numbers.htm" target="_blank" rel="noreferrer"><span>DATA · JUL 2026</span><strong>U.S. Bureau of Labor Statistics</strong><small>4.1% unemployment rate ↗</small></a>
          <a href="https://oui.doleta.gov/unemploy/DataDashboard.asp" target="_blank" rel="noreferrer"><span>DATA · 2025/2026</span><strong>U.S. Department of Labor</strong><small>UI replacement and duration ↗</small></a>
          <a href="https://www.nber.org/papers/w32255" target="_blank" rel="noreferrer"><span>PAPER · 2024</span><strong>Korinek & Suh</strong><small>Automation, wages and the transition to AGI ↗</small></a>
          <a href="https://www.nber.org/papers/w31815" target="_blank" rel="noreferrer"><span>PAPER · 2023/2026</span><strong>Trammell & Korinek</strong><small>Growth, labor share and scarce resources ↗</small></a>
          <details><summary><span>ASSUMPTIONS</span><strong>Model calibration</strong><small>Inspect the values used here +</small></summary><ul>{Object.entries(calibration).filter(([key, item]) => item.provenance === 'ASSUMPTION' && !['expandedSafetyNetReplacement', 'citizenDividendShare', 'publicFundDividendShare'].includes(key)).map(([key, item]) => <li key={key}><b>{key.replace(/([A-Z])/g, ' $1')}</b><code>{item.value}</code><p>{item.note}</p></li>)}</ul></details>
        </div>
      </section>

      <footer><div className="brand"><span>CW</span> Common Wealth</div><p>An open-source household simulator.</p><a href="#top">Back to top ↑</a></footer>
    </main>
  );
}
