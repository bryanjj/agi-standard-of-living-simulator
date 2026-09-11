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
  affectedTaskMassAt,
  parametersFromScenario,
  scenarioParameterRanges,
  simulateScenarioPath,
  TERMINAL_YEAR_RANGE,
  type EditableScenarioParameters,
  type ScenarioPathPoint,
} from '../model/anthropicSimulation';

type ScenarioMode = AnthropicScenarioId | 'custom';
type MetricId = 'unemployment' | 'gdp' | 'wages' | 'shares' | 'exposure';

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
  exposure: [
    { key: 'affectedTaskMass', label: 'All affected tasks', color: '#1d211e' },
    { key: 'cognitiveAffectedTaskMass', label: 'Cognitive tasks', color: '#793f31' },
    { key: 'otherAffectedTaskMass', label: 'Other tasks', color: '#c85b2f' },
    { key: 'aiTaskShare', label: 'Task instances using technology', color: '#397765' },
  ],
};

const parameterControls: Array<{
  key: keyof EditableScenarioParameters;
  label: string;
  term: string;
  description: string;
  format: (value: number) => string;
  example: (value: number) => string;
  inputRange?: { min: number; max: number; step: number };
  toInputValue?: (value: number) => number;
  fromInputValue?: (value: number) => number;
}> = [
  {
    key: 'affectedTaskGrowth',
    label: 'How quickly does technology’s task capability expand?',
    term: 'Annual affected-task expansion rate',
    description: 'The logistic growth rate of the share of all tasks that AI or robotics can perform. Growth slows automatically as the share approaches 100%.',
    format: (value) => `${(value * 100).toFixed(1)}%/yr`,
    example: (value) => `At ${(value * 100).toFixed(1)}%, affected task mass rises from 14% in mid-2026 to ${Math.round(affectedTaskMassAt(2030, value) * 100)}% in 2030 and ${Math.round(affectedTaskMassAt(2040, value) * 100)}% in 2040.`,
  },
  {
    key: 'diffusion',
    label: 'How widely is capable AI used?',
    term: 'Diffusion share in 2030',
    description: 'Of the tasks AI can do, this is the share of real task instances where a worker or company actually uses it.',
    format: (value) => `${(value * 100).toFixed(0)}%`,
    example: (value) => `At ${Math.round(value * 100)}%, AI is used for about ${Math.round(value * 10)} of every 10 tasks it could perform.`,
  },
  {
    key: 'productivityAnchor2026',
    label: 'How much more useful does AI make tasks in 2026?',
    term: 'Productivity gain in mid-2026',
    description: 'The percentage increase in output on a task when AI is used. This anchors the model before it moves toward the 2030 setting.',
    format: (value) => `${Math.round(value)}%`,
    example: (value) => `${Math.round(value)}% means ${Number((1 + value / 100).toFixed(2))}x as much output from the same task inputs.`,
    inputRange: { min: 11, max: 348, step: 1 },
    toInputValue: (value) => Math.round((Math.exp(value) - 1) * 100),
    fromInputValue: (value) => Math.log1p(value / 100),
  },
  {
    key: 'productivityGain',
    label: 'How much more useful will AI make tasks in 2030?',
    term: 'Productivity gain in 2030',
    description: 'The percentage increase in output on each task instance performed with AI in 2030.',
    format: (value) => `${Math.round(value)}%`,
    example: (value) => `${Math.round(value)}% means ${Number((1 + value / 100).toFixed(2))}x as much output from the same task inputs.`,
    inputRange: { min: 11, max: 348, step: 1 },
    toInputValue: (value) => Math.round((Math.exp(value) - 1) * 100),
    fromInputValue: (value) => Math.log1p(value / 100),
  },
  {
    key: 'automationShare',
    label: 'Does AI assist people or replace their work?',
    term: 'Automation share',
    description: 'Of the task instances performed with AI, this is the share completed without labor by software, computers, or other capital.',
    format: (value) => `${(value * 100).toFixed(0)}%`,
    example: (value) => `At ${Math.round(value * 100)}%, ${Math.round(value * 100)} of every 100 AI-performed task instances are automated; the rest assist workers.`,
  },
  {
    key: 'reinstatementRatio',
    label: 'How much new human work is created?',
    term: 'Reinstatement ratio',
    description: 'The amount of new labor tasks created for people as existing tasks move from workers to capital.',
    format: (value) => value.toFixed(2),
    example: (value) => `At ${value.toFixed(2)}, automating 100 task units creates ${Math.round(value * 100)} new task units for people.`,
  },
  {
    key: 'searchDiscount',
    label: 'How hard is it to switch careers?',
    term: 'Cross-occupation search discount',
    description: 'How effective a displaced worker’s job search is outside their previous occupation group, compared with searching within it.',
    format: (value) => value.toFixed(2),
    example: (value) => `At ${value.toFixed(2)}, an outside-field search is modeled as ${Math.round(value * 100)}% as effective as an in-field search.`,
  },
  {
    key: 'postingSpeed',
    label: 'How quickly does employment adjust?',
    term: 'Monthly job adjustment speed',
    description: 'The share of the gap between employment and modeled labor demand that is added or removed each month.',
    format: (value) => `${(value * 100).toFixed(0)}%`,
    example: (value) => `At ${Math.round(value * 100)}%, employment closes ${Math.round(value * 100)} of every 100 missing or excess jobs each month.`,
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
  const [terminalYear, setTerminalYear] = useState(TERMINAL_YEAR_RANGE.default);

  const path = useMemo(
    () => simulateScenarioPath(parameters, { terminalYear }),
    [parameters, terminalYear],
  );
  const chartTicks = useMemo(() => {
    const ticks = [MODEL_START_YEAR];
    for (let year = MODEL_START_YEAR + 2; year < terminalYear; year += 2) ticks.push(year);
    if (ticks.at(-1) !== terminalYear) ticks.push(terminalYear);
    return ticks;
  }, [terminalYear]);
  const final = path[path.length - 1];
  const activeScenario = scenarioMode === 'custom' ? null : anthropicScenarioById[scenarioMode];
  const scenarioName = activeScenario?.name ?? 'Custom scenario';
  const scenarioColor = activeScenario?.color ?? '#b14e30';
  const laborShareWidth = final.laborShare.toFixed(4);
  const capitalShareWidth = final.capitalShare.toFixed(4);

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
        <nav><span className="status-dot" /> Open model <a href="#boundary">Beyond 2030</a><a href="#method">Inputs</a></nav>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">ECONOMIC SCENARIOS FOR TRANSFORMATIVE AI</p>
          <h1>How could AI reshape<br /><em>growth, wages, and jobs?</em></h1>
          <p className="lede">Build a scenario from the published assumptions, then follow a smooth technology and economic path through {terminalYear}.</p>
        </div>

        <div className="horizon" aria-label={`Model horizon ${MODEL_START_YEAR} to ${terminalYear}`}>
          <span>{MODEL_START_YEAR}</span><i /><strong>{path.length} MONTHLY DATA POINTS</strong><i /><span>{terminalYear}</span>
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
              <p>The 2026 anchors, technology growth paths, and labor-market frictions feed the monthly equations.</p>
            </div>
            <label className="terminal-control">
              <span>
                <b>How far should this scenario run?</b>
                <em>Terminal year</em>
                <small>2030 stays close to the published horizon. Later years apply the documented extension through 2040.</small>
              </span>
              <strong>{terminalYear}</strong>
              <input
                type="range"
                min={TERMINAL_YEAR_RANGE.min}
                max={TERMINAL_YEAR_RANGE.max}
                step={TERMINAL_YEAR_RANGE.step}
                value={terminalYear}
                onChange={(event) => setTerminalYear(Number(event.target.value))}
                style={{ accentColor: scenarioColor }}
                aria-label="Terminal year"
              />
            </label>
            <div className="control-grid">
              {parameterControls.map((control) => {
                const range = control.inputRange ?? scenarioParameterRanges[control.key];
                const value = parameters[control.key];
                const inputValue = control.toInputValue?.(value) ?? value;
                return (
                  <label key={control.key} className="parameter-control">
                    <span>
                      <b>{control.label}<em>{control.term}</em></b>
                      <strong>{control.format(inputValue)}</strong>
                    </span>
                    <input
                      type="range"
                      min={range.min}
                      max={range.max}
                      step={range.step}
                      value={inputValue}
                      onChange={(event) => {
                        const nextValue = Number(event.target.value);
                        editParameter(control.key, control.fromInputValue?.(nextValue) ?? nextValue);
                      }}
                      style={{ accentColor: scenarioColor }}
                      aria-label={control.label}
                    />
                    <small>{control.description}</small>
                    <p>{control.example(inputValue)}</p>
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
            <p>in {terminalYear}</p>
            <small>Normal-times calibration: {pct(NORMAL_UNEMPLOYMENT_RATE)}</small>
          </article>
          <article><span>GDP VS. NO-AI PATH</span><strong>{signedPct(final.gdpGap)}</strong><small>{pct(final.gdpGrowth)} annual growth in {terminalYear}</small></article>
          <article><span>COGNITIVE UNEMPLOYMENT</span><strong>{pct(final.cognitiveUnemployment)}</strong><small>{pct(final.otherUnemployment)} among all other workers</small></article>
          <article><span>LABOR SHARE OF INCOME</span><strong>{pct(final.laborShare)}</strong><small>Capital receives {pct(final.capitalShare)}</small></article>
        </section>
      </section>

      <section className="analysis-section path-section">
        <div className="section-intro">
          <div><p className="eyebrow">MONTHLY MODEL PATH</p><h2>How the economy changes through {terminalYear}.</h2></div>
          <p>Each line contains all {path.length} monthly values from January 2026 through January {terminalYear}. Hover or tap to inspect a month.</p>
        </div>

        <article className="time-chart-card">
          <div className="time-chart-head">
            <div>
              <span>SELECT AN OUTCOME</span>
              <strong>{scenarioName}</strong>
            </div>
            <div className="metric-tabs" aria-label="Chart outcome">
              {(['unemployment', 'gdp', 'wages', 'shares', 'exposure'] as MetricId[]).map((item) => (
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
                  domain={[MODEL_START_YEAR, terminalYear]}
                  ticks={chartTicks}
                  tickFormatter={(value) => String(Math.round(value))}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={metric === 'shares' || metric === 'exposure' ? [0, 100] : ['auto', 'auto']}
                  tickFormatter={(value) => `${Number(value).toFixed(0)}%`}
                  axisLine={false}
                  tickLine={false}
                  width={42}
                />
                {metric === 'unemployment' && (
                  <ReferenceLine y={NORMAL_UNEMPLOYMENT_RATE} stroke="#9b9d97" strokeDasharray="5 5" />
                )}
                {terminalYear > MODEL_END_YEAR && (
                  <ReferenceLine x={MODEL_END_YEAR} stroke="#9b9d97" strokeDasharray="4 5" />
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
            <span>2030 published horizon</span>
            <span>{terminalYear} scenario endpoint</span>
          </div>
        </article>
      </section>

      <section className="analysis-section distribution-section">
        <div className="section-intro">
          <div><p className="eyebrow">{terminalYear} DISTRIBUTION</p><h2>Who receives national income?</h2></div>
          <p>Productivity gains can increase the size of the economy while changing how much goes to workers and owners of capital.</p>
        </div>
        <article className="distribution-card wide">
          <div className="card-heading"><span>LABOR AND CAPITAL SHARES</span><strong>{scenarioName}</strong></div>
          <div className="share-bar" aria-label={`${laborShareWidth}% labor and ${capitalShareWidth}% capital`}>
            <span style={{ width: `${laborShareWidth}%` }}><b>{pct(final.laborShare)}</b> Labor</span>
            <span style={{ width: `${capitalShareWidth}%` }}><b>{pct(final.capitalShare)}</b> Capital</span>
          </div>
          <div className="wage-list">
            <span><small>AVERAGE WAGE VS. NO-AI</small><strong>{signedPct(final.averageWageGap)}</strong></span>
            <span><small>COGNITIVE WAGE VS. NO-AI</small><strong>{signedPct(final.cognitiveWageGap)}</strong></span>
            <span><small>OTHER-OCCUPATION WAGE VS. NO-AI</small><strong>{signedPct(final.otherWageGap)}</strong></span>
          </div>
        </article>
      </section>

      <section className="boundary-section" id="boundary">
        <div><p className="eyebrow">POST-2030 EXTENSION</p><h2>What changes after 2030.</h2></div>
        <div className="boundary-copy">
          <p>Affected task mass follows one logistic path from its 14% mid-2026 anchor toward a 100% ceiling. The growth-rate control replaces the old hard 2030 task-mass endpoint. The published presets map to rates that still reach 20%, 30%, and 50% in 2030.</p>
          <p>Through 2030, affected tasks remain within cognitive occupations. After 2030, each additional affected task is allocated smoothly across the work that remains, including tasks outside cognitive occupations. Neither group loses affected tasks as the frontier expands.</p>
          <p>Diffusion continues on its existing logistic path. Task productivity preserves its 2030 level and growth rate, then gradually approaches an assumed 30x task-output ceiling. Employment moves partway toward labor demand each month through the selected adjustment speed.</p>
          <strong>Results after 2030 extend the framework under these assumptions and are not values reported by the original authors.</strong>
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
