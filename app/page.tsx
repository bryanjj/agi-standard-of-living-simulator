'use client';

import { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { simulate } from '../model/simulation';
import type { HousingStatus } from '../model/types';
import { transformative20Year } from '../scenarios/transformative20yr';
import { calibration } from '../calibration/usBaseline';
import { Affordability, MacroDetails, ResourceComposition, WhyChart } from '../ui/Explanations';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const round = (value: number) => Math.round(value);

export default function Home() {
  const [income, setIncome] = useState(85_000);
  const [size, setSize] = useState(2);
  const [investments, setInvestments] = useState(120_000);
  const [housing, setHousing] = useState<HousingStatus>('mortgage');
  const [focusYear, setFocusYear] = useState(20);
  const result = useMemo(() => simulate(transformative20Year, {
    annualIncome: income, householdSize: size, investments, housing,
  }), [income, size, investments, housing]);
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
          <p className="eyebrow">AGI STANDARD OF LIVING SIMULATOR <span>• EXPLORATORY, NOT A FORECAST</span></p>
          <h1>How would AGI change<br />your <em>standard of living?</em></h1>
          <p className="lede">Wages may fall while abundance rises. See how those forces could combine for a household like yours—without needing an economics degree.</p>
          <div className="scenario-pill"><span>SCENARIO</span><strong>20-Year Transformative AGI</strong><small>No new policy</small></div>
        </div>

        <div className="workspace">
          <aside className="inputs-card">
            <div className="section-label"><span>01</span> YOUR HOUSEHOLD</div>
            <label>Annual household income<div className="money-input"><span>$</span><input aria-label="Annual household income" type="number" min="1" value={income} onChange={(e) => setIncome(Number(e.target.value))} /></div></label>
            <div className="paired">
              <label>Household size<input aria-label="Household size" type="number" min="1" max="12" value={size} onChange={(e) => setSize(Number(e.target.value))} /></label>
              <label>Investments<div className="money-input"><span>$</span><input aria-label="Investments" type="number" min="0" value={investments} onChange={(e) => setInvestments(Number(e.target.value))} /></div></label>
            </div>
            <fieldset><legend>Housing</legend><div className="segmented">
              {([['rent','Rent'],['mortgage','Mortgage'],['own','Own outright']] as const).map(([value, label]) => <button type="button" className={housing === value ? 'active' : ''} key={value} onClick={() => setHousing(value)}>{label}</button>)}
            </div></fieldset>
            <p className="privacy">Calculated in your browser. Nothing is saved.</p>
          </aside>

          <section className="result-card">
            <div className="result-head">
              <div><p className="section-label"><span>02</span> YOUR RESULT</p><h2>Your material standard of living</h2></div>
              <div className={`outcome ${y20.standardOfLiving >= 100 ? 'positive' : ''}`}><strong>{round(y20.standardOfLiving)}</strong><span>YEAR 20<br />TODAY = 100</span></div>
            </div>
            <div className="chart-wrap" aria-label="Material standard of living over 20 years">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={result.years} margin={{ top: 12, right: 12, bottom: 0, left: -18 }}>
                  <defs><linearGradient id="livingFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d36a3c" stopOpacity={0.22}/><stop offset="100%" stopColor="#d36a3c" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid vertical={false} stroke="#dedbd3" strokeDasharray="3 5" />
                  <XAxis dataKey="year" ticks={[0,5,10,15,20]} tickFormatter={(v) => v === 0 ? 'Today' : `Yr ${v}`} axisLine={false} tickLine={false} />
                  <YAxis domain={['auto','auto']} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => [round(Number(v)), 'Index']} labelFormatter={(v) => v === 0 ? 'Today' : `Year ${v}`} />
                  <Area type="monotone" dataKey="standardOfLiving" stroke="#c95a2d" strokeWidth={3} fill="url(#livingFill)" />
                  <Line type="monotone" dataKey="noAgiBaseline" stroke="#8b8d88" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="milestones">
              <div><span>TODAY</span><strong>100</strong></div><i />
              <div><span>YEAR 5</span><strong>{round(y5.standardOfLiving)}</strong></div><i />
              <div><span>YEAR 10</span><strong>{round(y10.standardOfLiving)}</strong></div><i />
              <div><span>YEAR 20</span><strong>{round(y20.standardOfLiving)}</strong></div>
            </div>
            <p className="chart-note"><span className="legend solid" /> Your modeled purchasing power <span className="legend dashed" /> No-AGI baseline</p>
          </section>
        </div>
      </section>

      <section className="first-explain" id="method">
        <p className="eyebrow">WHAT THIS NUMBER MEANS</p>
        <h2>One index, two very different forces.</h2>
        <div className="explain-grid">
          <article><span>+</span><h3>Abundance</h3><p>AI and robots can produce more reproducible goods and services, lowering their real cost.</p></article>
          <article><span>−</span><h3>Access</h3><p>Your claim on that output shifts from wages toward capital and today&apos;s limited safety net.</p></article>
          <article className="assumption-card"><small>TRANSPARENT BY DESIGN</small><strong>{money.format(income)} household</strong><p>Adjust any input above and the full 20-year path recalculates instantly.</p></article>
        </div>
      </section>

      <section className="analysis-section dark-section">
        <div className="section-intro">
          <div><p className="eyebrow">WHY DID MY LIFE CHANGE?</p><h2>The forces behind your result.</h2></div>
          <div className="year-tabs" aria-label="Explanation year">{[5,10,20].map((year) => <button className={focusYear === year ? 'active' : ''} key={year} onClick={() => setFocusYear(year)}>Year {year}</button>)}</div>
        </div>
        <div className="two-col">
          <div><p className="panel-kicker">CONTRIBUTION TO YOUR INDEX</p><WhyChart year={focused} /></div>
          <div className="narrative-card"><small>THE SHORT VERSION</small><h3>{focused.standardOfLiving >= 100 ? 'Abundance outweighs lost labor income.' : 'Lost labor income outweighs abundance.'}</h3><p>By year {focusYear}, {Math.round(focused.automation * 100)}% of original work is automatable. Your investments claim part of a much larger capital-income pool, while reproducible consumption gets cheaper. Housing remains the counterweight.</p><strong>{Math.round(focused.standardOfLiving - 100) >= 0 ? '+' : ''}{Math.round(focused.standardOfLiving - 100)} points</strong><span>net change from today</span></div>
        </div>
      </section>

      <section className="analysis-section">
        <div className="section-intro"><div><p className="eyebrow">WHERE YOUR RESOURCES COME FROM</p><h2>From paychecks to ownership.</h2></div><p className="side-copy">New AI capital income follows today&apos;s holdings. It is not divided equally.</p></div>
        <ResourceComposition result={result} />
        <div className="ownership-note"><strong>{Math.round(calibration.topTenEquityShare.value * 100)}%</strong><p>of U.S. corporate equities and mutual fund shares are held by the top 10% of the wealth distribution in the Federal Reserve&apos;s 2026 Q1 data.</p><a href="https://www.federalreserve.gov/releases/z1/dataviz/dfa/compare/chart/" target="_blank" rel="noreferrer">View the data ↗</a></div>
      </section>

      <section className="analysis-section affordability-section">
        <div className="section-intro"><div><p className="eyebrow">WHAT BECOMES EASIER TO AFFORD?</p><h2>Abundance is uneven.</h2></div><p className="side-copy">Modeled affordability in year {focusYear}; your total purchasing power also depends on income.</p></div>
        <Affordability year={focused} />
      </section>

      <section className="analysis-section macro-section">
        <details>
          <summary><span><small>FOR THE CURIOUS</small>What&apos;s happening behind the scenes?</span><b>+</b></summary>
          <p className="macro-copy">These national outputs are model mechanics, not predictions. They make the household result auditable.</p>
          <MacroDetails year={focused} />
        </details>
      </section>

      <section className="method-section">
        <div><p className="eyebrow">MODEL & SOURCES</p><h2>Every number has a label.</h2><p>This first milestone is deliberately simple. Published research determines the scenario&apos;s shape; assumptions connect it to a household budget. Nothing here estimates whether your particular job disappears.</p></div>
        <div className="source-list">
          <a href="https://www.nber.org/papers/w32255" target="_blank" rel="noreferrer"><span>PAPER · 2024</span><strong>Korinek & Suh</strong><small>Automation, wages and the transition to AGI ↗</small></a>
          <a href="https://www.nber.org/papers/w31815" target="_blank" rel="noreferrer"><span>PAPER · 2023/2026</span><strong>Trammell & Korinek</strong><small>Growth, labor share and scarce resources ↗</small></a>
          <a href="https://www.nber.org/papers/w35046" target="_blank" rel="noreferrer"><span>PAPER · 2026</span><strong>Karger et al.</strong><small>Expert forecasts as a validation target ↗</small></a>
          <details><summary><span>ASSUMPTIONS</span><strong>Milestone-one calibration</strong><small>Inspect the values used here +</small></summary><ul>{Object.entries(calibration).filter(([, item]) => item.provenance === 'ASSUMPTION').map(([key, item]) => <li key={key}><b>{key.replace(/([A-Z])/g, ' $1')}</b><code>{item.value}</code><p>{item.note}</p></li>)}</ul></details>
        </div>
      </section>

      <footer><div className="brand"><span>CW</span> Common Wealth</div><p>An open-source exploratory simulator. Not financial advice and not a forecast.</p><a href="#top">Back to top ↑</a></footer>
    </main>
  );
}
