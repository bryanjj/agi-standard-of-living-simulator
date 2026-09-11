'use client';

import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  aiTaskShare,
  anthropicScenarioById,
  anthropicScenarios,
  MODEL_END_YEAR,
  MODEL_START_YEAR,
  NORMAL_COGNITIVE_UNEMPLOYMENT_RATE,
  NORMAL_UNEMPLOYMENT_RATE,
  type AnthropicScenarioId,
} from '../model/anthropic';

const pct = (value: number, digits = 1) => `${value.toFixed(digits)}%`;
const signedPct = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }> }) {
  if (!active || !payload?.length) return null;
  return <div className="chart-tooltip">{payload.map((item) => <span key={item.name}><i style={{ background: item.color }} />{item.name}<strong>{pct(item.value)}</strong></span>)}</div>;
}

export default function Home() {
  const [scenarioId, setScenarioId] = useState<AnthropicScenarioId>('substantial');
  const selected = anthropicScenarioById[scenarioId];
  const laborMarketData = [
    { group: 'All workers', normal: NORMAL_UNEMPLOYMENT_RATE, scenario: selected.outcomes.totalUnemployment.value },
    { group: 'Cognitive workers', normal: NORMAL_COGNITIVE_UNEMPLOYMENT_RATE, scenario: selected.outcomes.cognitiveUnemployment.value },
  ];

  return (
    <main id="top">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Common Wealth home"><span>CW</span> Common Wealth</a>
        <nav><span className="status-dot" /> Open model <a href="#boundary">Why 2030?</a><a href="#method">Method</a></nav>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">ECONOMIC SCENARIOS FOR TRANSFORMATIVE AI</p>
          <h1>How could AI reshape<br /><em>growth, wages, and jobs?</em></h1>
          <p className="lede">An independent open-source implementation of the economic framework developed by Korinek, Jones, Sacher, Cotter, and McCrory.</p>
        </div>

        <div className="horizon" aria-label={`Model horizon ${MODEL_START_YEAR} to ${MODEL_END_YEAR}`}>
          <span>{MODEL_START_YEAR}</span><i /><strong>48 MONTHLY STEPS</strong><i /><span>{MODEL_END_YEAR}</span>
        </div>

        <section className="scenario-panel" aria-label="Scenario selection">
          <p className="section-label"><span>01</span> CHOOSE A PUBLISHED SCENARIO</p>
          <div className="scenario-grid">
            {anthropicScenarios.map((item) => (
              <button key={item.id} className={item.id === scenarioId ? 'active' : ''} onClick={() => setScenarioId(item.id)} style={{ '--scenario-color': item.color } as React.CSSProperties}>
                <small>{pct(aiTaskShare(item) * 100, 0)} OF TASK INSTANCES USE AI</small>
                <strong>{item.name}</strong>
                <span>{item.description}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="outcome-grid" aria-live="polite">
          <article className="headline-outcome">
            <p className="section-label"><span>02</span> ECONOMY-WIDE UNEMPLOYMENT</p>
            <strong>{pct(selected.outcomes.totalUnemployment.value)}</strong>
            <p>in 2030</p>
            <small>Normal-times calibration: {pct(NORMAL_UNEMPLOYMENT_RATE)}</small>
          </article>
          <article><span>GDP VS. NO-AI PATH</span><strong>{signedPct(selected.outcomes.gdpAboveNoAi.value)}</strong><small>{pct(selected.outcomes.gdpGrowth.value)} annual growth in 2030</small></article>
          <article><span>COGNITIVE UNEMPLOYMENT</span><strong>{pct(selected.outcomes.cognitiveUnemployment.value)}</strong><small>{signedPct(selected.outcomes.cognitiveEmploymentChange.value)} employment since 2026</small></article>
          <article><span>LABOR SHARE OF INCOME</span><strong>{pct(selected.outcomes.laborShare.value)}</strong><small>Capital receives {pct(selected.outcomes.capitalShare.value)}</small></article>
        </section>
      </section>

      <section className="analysis-section labor-section">
        <div className="section-intro">
          <div><p className="eyebrow">LABOR MARKET</p><h2>Displacement meets reemployment.</h2></div>
          <p>The paper’s unemployment rate emerges from layoffs, vacancy creation, job search, and matching. It is not imposed as an employment curve.</p>
        </div>
        <div className="two-panel">
          <article className="chart-card">
            <div className="card-heading"><span>UNEMPLOYMENT RATE</span><strong>{selected.name}</strong></div>
            <div className="bar-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={laborMarketData} margin={{ top: 18, right: 18, bottom: 2, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="#dedbd3" strokeDasharray="3 5" />
                  <XAxis dataKey="group" axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 20]} ticks={[0, 5, 10, 15, 20]} tickFormatter={(value) => `${value}%`} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: '#ece8dd' }} />
                  <Bar dataKey="normal" name="Normal times" fill="#a8aaa4" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="scenario" name="2030 scenario" fill={selected.color} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="distribution-card">
            <div className="card-heading"><span>WHO RECEIVES NATIONAL INCOME?</span><strong>2030</strong></div>
            <div className="share-bar" aria-label={`${selected.outcomes.laborShare.value}% labor and ${selected.outcomes.capitalShare.value}% capital`}>
              <span style={{ width: `${selected.outcomes.laborShare.value}%` }}><b>{pct(selected.outcomes.laborShare.value)}</b> Labor</span>
              <span style={{ width: `${selected.outcomes.capitalShare.value}%` }}><b>{pct(selected.outcomes.capitalShare.value)}</b> Capital</span>
            </div>
            <div className="wage-list">
              <span><small>COGNITIVE WAGE</small><strong>{signedPct(selected.outcomes.cognitiveWageAboveNoAi.value)}</strong></span>
              <span><small>OTHER-OCCUPATION WAGE</small><strong>{signedPct(selected.outcomes.otherWageAboveNoAi.value)}</strong></span>
              <span><small>CAPITAL INCOME</small><strong>{signedPct(selected.outcomes.capitalIncomeAboveNoAi.value)}</strong></span>
            </div>
            <p>Changes are measured against the economy the paper estimates would exist without AI.</p>
          </article>
        </div>
      </section>

      <section className="analysis-section inputs-section" id="method">
        <div className="section-intro">
          <div><p className="eyebrow">SCENARIO INPUTS</p><h2>What drives this result?</h2></div>
          <p>These are the paper’s assumptions for the selected scenario. The model converts them into economic outcomes rather than assigning unemployment directly.</p>
        </div>
        <div className="input-grid">
          <article><span>CAPABILITY</span><strong>{pct(selected.inputs.affectedTaskMass.value * 100, 0)}</strong><p>of economic tasks affected</p></article>
          <article><span>DIFFUSION</span><strong>{pct(selected.inputs.diffusion.value * 100, 0)}</strong><p>of affected instances use AI</p></article>
          <article><span>AUTOMATION</span><strong>{pct(selected.inputs.automationShare.value * 100, 0)}</strong><p>of AI use replaces labor</p></article>
          <article><span>NEW TASKS</span><strong>{selected.inputs.reinstatementRatio.value.toFixed(2)}</strong><p>created per automated task</p></article>
          <article><span>CROSS-OCCUPATION SEARCH</span><strong>{selected.inputs.searchDiscount.value.toFixed(2)}</strong><p>relative search effectiveness</p></article>
        </div>
      </section>

      <section className="boundary-section" id="boundary">
        <div><p className="eyebrow">MODEL BOUNDARY</p><h2>Why the model ends in 2030.</h2></div>
        <div className="boundary-copy">
          <p>The paper models AI’s direct effects on cognitive work but does not model rapid progress in robotics or the automation of physical tasks. Beyond 2030, the occupations absorbing displaced cognitive workers may themselves be transformed.</p>
          <p>Its capital assumptions are also designed for the short and medium run. Extending them mechanically would turn the paper’s model into an undocumented long-run scenario.</p>
          <strong>This implementation therefore stops at 2030. Any later extension will begin at this boundary and identify its additional assumptions separately.</strong>
        </div>
      </section>

      <section className="source-section">
        <p className="section-label"><span>03</span> PRIMARY SOURCE</p>
        <a href="https://www-cdn.anthropic.com/files/4zrzovbb/website/cf58f84d46a4a76bf5a5b039ac695fba6b80041c.pdf" target="_blank" rel="noreferrer">
          <span>ANTHROPIC INSTITUTE WORKING PAPER 2026-02</span>
          <strong>Economic Scenarios for Transformative AI</strong>
          <small>Anton Korinek, Charles I. Jones, Szymon Sacher, Tess Cotter, and Peter McCrory · September 2026 ↗</small>
        </a>
        <p>This is an independent implementation and is not affiliated with or endorsed by Anthropic.</p>
      </section>

      <footer><div className="brand"><span>CW</span> Common Wealth</div><p>An open-source economic scenario model.</p><a href="#top">Back to top ↑</a></footer>
    </main>
  );
}
