'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  anthropicScenarioById,
  anthropicScenarios,
  MODEL_END_YEAR,
  MODEL_START_YEAR,
  NORMAL_UNEMPLOYMENT_RATE,
  type AnthropicScenarioId,
} from '../model/anthropic';
import {
  parametersFromScenario,
  scenarioParameterRanges,
  simulateScenarioPath,
  type EditableScenarioParameters,
  type ScenarioPathPoint,
} from '../model/anthropicSimulation';

type ScenarioMode = AnthropicScenarioId | 'custom';
type MetricId = 'unemployment' | 'gdp' | 'wages' | 'shares';

type MetricSeries = {
  key: keyof ScenarioPathPoint;
  label: string;
  color: string;
};

const metricSeries: Record<MetricId, MetricSeries[]> = {
  unemployment: [
    { key: 'totalUnemployment', label: 'All workers', color: '#c85b2f' },
    { key: 'cognitiveUnemployment', label: 'Cognitive workers', color: '#793f31' },
    { key: 'otherUnemployment', label: 'All other workers', color: '#397765' },
  ],
  gdp: [
    { key: 'gdpGap', label: 'GDP above no-AI path', color: '#397765' },
    { key: 'gdpGrowth', label: 'Annual GDP growth', color: '#c09532' },
  ],
  wages: [
    { key: 'averageWageGap', label: 'Average wage', color: '#1d211e' },
    { key: 'cognitiveWageGap', label: 'Cognitive wage', color: '#c85b2f' },
    { key: 'otherWageGap', label: 'All other wage', color: '#397765' },
  ],
  shares: [
    { key: 'laborShare', label: 'Labor share', color: '#397765' },
    { key: 'capitalShare', label: 'Capital share', color: '#c85b2f' },
  ],
};

const parameterControls: Array<{
  key: keyof EditableScenarioParameters;
  label: string;
  description: string;
  format: (value: number) => string;
}> = [
  {
    key: 'affectedTaskMass',
    label: 'Affected task mass in 2030',
    description: 'Share of the economy’s tasks within AI capability.',
    format: (value) => `${(value * 100).toFixed(0)}%`,
  },
  {
    key: 'diffusion',
    label: 'Diffusion share in 2030',
    description: 'Share of affected task instances actually performed with AI.',
    format: (value) => `${(value * 100).toFixed(0)}%`,
  },
  {
    key: 'productivityAnchor2026',
    label: 'Log gain in mid-2026',
    description: 'Starting productivity gain on an AI-performed task instance.',
    format: (value) => value.toFixed(2),
  },
  {
    key: 'productivityGain',
    label: 'Log gain in 2030',
    description: 'Ending productivity gain on an AI-performed task instance.',
    format: (value) => value.toFixed(2),
  },
  {
    key: 'automationShare',
    label: 'Automation share',
    description: 'Share of AI-performed instances completed by capital.',
    format: (value) => `${(value * 100).toFixed(0)}%`,
  },
  {
    key: 'reinstatementRatio',
    label: 'Reinstatement ratio',
    description: 'New labor-task mass created per unit of automated task mass.',
    format: (value) => value.toFixed(2),
  },
  {
    key: 'searchDiscount',
    label: 'Cross-occupation search',
    description: 'Relative search effectiveness outside a worker’s occupation group.',
    format: (value) => value.toFixed(2),
  },
  {
    key: 'postingSpeed',
    label: 'Monthly posting speed',
    description: 'Share of expanding occupations’ shortfall posted each month.',
    format: (value) => `${(value * 100).toFixed(0)}%`,
  },
];

const pct = (value: number, digits = 1) => `${value.toFixed(digits)}%`;
const signedPct = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;

const formatChartDate = (value: number) => {
  const year = Math.floor(value + 1e-8);
  const month = Math.round((value - year) * 12);
  if (month === 0) return String(year);
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' })
    .format(new Date(year, month, 1));
};

function TimeTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: number;
  payload?: Array<{ name: string; value: number; color: string }>;
}) {
  if (!active || !payload?.length || typeof label !== 'number') return null;
  return (
    <div className="chart-tooltip time-tooltip">
      <b>{formatChartDate(label)}</b>
      {payload.map((item) => (
        <span key={item.name}>
          <i style={{ background: item.color }} />
          {item.name}
          <strong>{pct(item.value)}</strong>
        </span>
      ))}
    </div>
  );
}

export default function Home() {
  const [scenarioMode, setScenarioMode] = useState<ScenarioMode>('substantial');
  const [parameters, setParameters] = useState<EditableScenarioParameters>(() => (
    parametersFromScenario(anthropicScenarioById.substantial)
  ));
  const [metric, setMetric] = useState<MetricId>('unemployment');

  const path = useMemo(() => simulateScenarioPath(parameters), [parameters]);
  const final = path[path.length - 1];
  const activeScenario = scenarioMode === 'custom' ? null : anthropicScenarioById[scenarioMode];
  const scenarioName = activeScenario?.name ?? 'Custom scenario';
  const scenarioColor = activeScenario?.color ?? '#b14e30';

  const choosePreset = (id: AnthropicScenarioId) => {
    setScenarioMode(id);
    setParameters(parametersFromScenario(anthropicScenarioById[id]));
  };

  const editParameter = (key: keyof EditableScenarioParameters, value: number) => {
    setScenarioMode('custom');
    setParameters((current) => ({ ...current, [key]: value }));
  };

  return (
    <main id="top">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Common Wealth home"><span>CW</span> Common Wealth</a>
        <nav><span className="status-dot" /> Open model <a href="#boundary">Why 2030?</a><a href="#method">Inputs</a></nav>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">ECONOMIC SCENARIOS FOR TRANSFORMATIVE AI</p>
          <h1>How could AI reshape<br /><em>growth, wages, and jobs?</em></h1>
          <p className="lede">Build a scenario from the paper’s assumptions and trace its monthly economic path through 2030.</p>
        </div>

        <div className="horizon" aria-label={`Model horizon ${MODEL_START_YEAR} to ${MODEL_END_YEAR}`}>
          <span>{MODEL_START_YEAR}</span><i /><strong>49 MONTHLY DATA POINTS</strong><i /><span>{MODEL_END_YEAR}</span>
        </div>

        <section className="scenario-panel" aria-label="Scenario selection and inputs">
          <div className="panel-title-row">
            <p className="section-label"><span>01</span> START WITH A PUBLISHED PRESET</p>
            <strong className={scenarioMode === 'custom' ? 'custom-badge active' : 'custom-badge'}>
              {scenarioMode === 'custom' ? 'CUSTOM SCENARIO' : 'EDIT ANY INPUT TO CUSTOMIZE'}
            </strong>
          </div>
          <div className="scenario-grid">
            {anthropicScenarios.map((item) => (
              <button
                key={item.id}
                className={item.id === scenarioMode ? 'active' : ''}
                onClick={() => choosePreset(item.id)}
                style={{ '--scenario-color': item.color } as CSSProperties}
              >
                <small>{item.id.toUpperCase()} PRESET</small>
                <strong>{item.name}</strong>
                <span>{item.description}</span>
              </button>
            ))}
          </div>

          <div className="parameter-editor" id="method">
            <div className="parameter-heading">
              <p className="section-label"><span>02</span> EDIT THE MODEL INPUTS</p>
              <p>The 2026 anchors, 2030 endpoints, and labor-market frictions feed the paper’s monthly equations.</p>
            </div>
            <div className="control-grid">
              {parameterControls.map((control) => {
                const range = scenarioParameterRanges[control.key];
                const value = parameters[control.key];
                return (
                  <label key={control.key} className="parameter-control">
                    <span><b>{control.label}</b><strong>{control.format(value)}</strong></span>
                    <input
                      type="range"
                      min={range.min}
                      max={range.max}
                      step={range.step}
                      value={value}
                      onChange={(event) => editParameter(control.key, Number(event.target.value))}
                      style={{ accentColor: scenarioColor }}
                      aria-label={control.label}
                    />
                    <small>{control.description}</small>
                  </label>
                );
              })}
            </div>
          </div>
        </section>

        <section className="outcome-grid" aria-live="polite">
          <article className="headline-outcome">
            <p className="section-label"><span>03</span> ECONOMY-WIDE UNEMPLOYMENT</p>
            <strong>{pct(final.totalUnemployment)}</strong>
            <p>in 2030</p>
            <small>Normal-times calibration: {pct(NORMAL_UNEMPLOYMENT_RATE)}</small>
          </article>
          <article><span>GDP VS. NO-AI PATH</span><strong>{signedPct(final.gdpGap)}</strong><small>{pct(final.gdpGrowth)} annual growth in 2030</small></article>
          <article><span>COGNITIVE UNEMPLOYMENT</span><strong>{pct(final.cognitiveUnemployment)}</strong><small>{pct(final.otherUnemployment)} among all other workers</small></article>
          <article><span>LABOR SHARE OF INCOME</span><strong>{pct(final.laborShare)}</strong><small>Capital receives {pct(final.capitalShare)}</small></article>
        </section>
      </section>

      <section className="analysis-section path-section">
        <div className="section-intro">
          <div><p className="eyebrow">MONTHLY MODEL PATH</p><h2>The path, not just the endpoint.</h2></div>
          <p>Each line contains all 49 monthly values from January 2026 through January 2030. Hover or tap to inspect a month.</p>
        </div>

        <article className="time-chart-card">
          <div className="time-chart-head">
            <div>
              <span>SELECT AN OUTCOME</span>
              <strong>{scenarioName}</strong>
            </div>
            <div className="metric-tabs" aria-label="Chart outcome">
              {(['unemployment', 'gdp', 'wages', 'shares'] as MetricId[]).map((item) => (
                <button key={item} className={metric === item ? 'active' : ''} onClick={() => setMetric(item)}>
                  {item === 'gdp' ? 'GDP' : item[0].toUpperCase() + item.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="chart-key">
            {metricSeries[metric].map((series) => (
              <span key={series.key}><i style={{ background: series.color }} />{series.label}</span>
            ))}
          </div>

          <div className="time-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={path} margin={{ top: 14, right: 18, bottom: 8, left: 2 }}>
                <CartesianGrid vertical={false} stroke="#dedbd3" strokeDasharray="3 5" />
                <XAxis
                  dataKey="date"
                  type="number"
                  domain={[2026, 2030]}
                  ticks={[2026, 2027, 2028, 2029, 2030]}
                  tickFormatter={(value) => String(Math.round(value))}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={metric === 'shares' ? [0, 100] : ['auto', 'auto']}
                  tickFormatter={(value) => `${Number(value).toFixed(0)}%`}
                  axisLine={false}
                  tickLine={false}
                  width={42}
                />
                {metric === 'unemployment' && (
                  <ReferenceLine y={NORMAL_UNEMPLOYMENT_RATE} stroke="#9b9d97" strokeDasharray="5 5" />
                )}
                <Tooltip content={<TimeTooltip />} />
                {metricSeries[metric].map((series) => (
                  <Line
                    key={series.key}
                    type="monotone"
                    dataKey={series.key}
                    name={series.label}
                    stroke={series.color}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-foot">
            <span>2026 empirical anchors</span>
            <span>Monthly solution of the model’s equations</span>
            <span>2030 scenario values</span>
          </div>
        </article>
      </section>

      <section className="analysis-section distribution-section">
        <div className="section-intro">
          <div><p className="eyebrow">2030 DISTRIBUTION</p><h2>Who receives national income?</h2></div>
          <p>Productivity gains can increase the size of the economy while changing how much goes to workers and owners of capital.</p>
        </div>
        <article className="distribution-card wide">
          <div className="card-heading"><span>LABOR AND CAPITAL SHARES</span><strong>{scenarioName}</strong></div>
          <div className="share-bar" aria-label={`${final.laborShare}% labor and ${final.capitalShare}% capital`}>
            <span style={{ width: `${final.laborShare}%` }}><b>{pct(final.laborShare)}</b> Labor</span>
            <span style={{ width: `${final.capitalShare}%` }}><b>{pct(final.capitalShare)}</b> Capital</span>
          </div>
          <div className="wage-list">
            <span><small>AVERAGE WAGE VS. NO-AI</small><strong>{signedPct(final.averageWageGap)}</strong></span>
            <span><small>COGNITIVE WAGE VS. NO-AI</small><strong>{signedPct(final.cognitiveWageGap)}</strong></span>
            <span><small>OTHER-OCCUPATION WAGE VS. NO-AI</small><strong>{signedPct(final.otherWageGap)}</strong></span>
          </div>
        </article>
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
        <p className="section-label"><span>04</span> PRIMARY SOURCE</p>
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
