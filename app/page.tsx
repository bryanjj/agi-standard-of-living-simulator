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
  MODEL_TERMINAL_YEAR,
  parametersFromScenario,
  REAL_ANNUAL_WAGE_2026,
  REAL_GDP_2026_TRILLIONS,
  scenarioParameterRanges,
  simulateFrozen2026Baseline,
  simulateScenarioPath,
  type EditableScenarioParameters,
  type ScenarioPathPoint,
} from '../model/anthropicSimulation';

type ScenarioMode = AnthropicScenarioId | 'custom';
type MetricId = 'unemployment' | 'gdp' | 'wages' | 'shares' | 'exposure';
type ChartPoint = ScenarioPathPoint & {
  baselineTotalUnemployment: number;
  baselineRealGdpTrillions: number;
  baselineRealAnnualWage: number;
};

type MetricSeries = {
  key: keyof ChartPoint;
  label: string;
  color: string;
};

const metricSeries: Record<MetricId, MetricSeries[]> = {
  unemployment: [
    { key: 'totalUnemployment', label: 'Selected scenario', color: '#c85b2f' },
    { key: 'baselineTotalUnemployment', label: '2026 technology baseline', color: '#9b9d97' },
  ],
  gdp: [
    { key: 'realGdpTrillions', label: 'Selected scenario', color: '#397765' },
    { key: 'baselineRealGdpTrillions', label: '2026 technology baseline', color: '#9b9d97' },
  ],
  wages: [
    { key: 'realAnnualWage', label: 'Selected scenario', color: '#1d211e' },
    { key: 'baselineRealAnnualWage', label: '2026 technology baseline', color: '#9b9d97' },
  ],
  shares: [
    { key: 'laborShare', label: 'Labor share', color: '#397765' },
    { key: 'capitalShare', label: 'Capital share', color: '#c85b2f' },
  ],
  exposure: [
    { key: 'affectedTaskMass', label: 'All affected tasks', color: '#1d211e' },
    { key: 'aiTaskShare', label: 'Task instances using technology', color: '#397765' },
    { key: 'eliminatedJobShare', label: 'Human job capacity eliminated', color: '#c85b2f' },
  ],
};

const metricYAxisLabels: Record<MetricId, string> = {
  unemployment: 'Unemployment rate (%)',
  gdp: 'Real GDP ($T, 2026 dollars)',
  wages: 'Average annual wage ($, 2026 dollars)',
  shares: 'Share of national income (%)',
  exposure: 'Task or job-capacity share (%)',
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
    key: 'reemploymentEffectiveness',
    label: 'How easily do displaced workers find new work?',
    term: 'Displaced-worker search effectiveness',
    description: 'How effective job search is for workers displaced by technology, relative to workers changing jobs in normal times.',
    format: (value) => value.toFixed(2),
    example: (value) => `At ${value.toFixed(2)}, a displaced worker’s search is modeled as ${Math.round(value * 100)}% as effective as a normal job search.`,
  },
  {
    key: 'postingSpeed',
    label: 'How quickly does employment adjust?',
    term: 'Monthly employment adjustment speed',
    description: 'After technology lowers the number of human jobs supported by the task mix, this is the share of the remaining employment gap that closes each month.',
    format: (value) => `${(value * 100).toFixed(0)}%`,
    example: (value) => `At ${Math.round(value * 100)}%, employers close ${Math.round(value * 100)} of every 100 excess positions each month after ordinary quits are counted.`,
  },
];

const pct = (value: number, digits = 1) => `${value.toFixed(digits)}%`;
const gdpValue = (value: number) => `$${value.toFixed(1)}T`;
const wageValue = (value: number) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
}).format(value);

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
  metric,
}: {
  active?: boolean;
  label?: number;
  payload?: Array<{ name: string; value: number; color: string }>;
  metric: MetricId;
}) {
  if (!active || !payload?.length || typeof label !== 'number') return null;
  return (
    <div className="chart-tooltip time-tooltip">
      <b>{formatChartDate(label)}</b>
      {payload.map((item) => (
        <span key={item.name}>
          <i style={{ background: item.color }} />
          {item.name}
          <strong>{metric === 'gdp' ? gdpValue(item.value) : metric === 'wages' ? wageValue(item.value) : pct(item.value)}</strong>
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
  const terminalYear = MODEL_TERMINAL_YEAR.value;

  const scenarioPath = useMemo(
    () => simulateScenarioPath(parameters, { terminalYear }),
    [parameters, terminalYear],
  );
  const baselinePath = useMemo(
    () => simulateFrozen2026Baseline(parameters, { terminalYear }),
    [parameters, terminalYear],
  );
  const path = useMemo<ChartPoint[]>(() => scenarioPath.map((point, index) => ({
    ...point,
    baselineTotalUnemployment: baselinePath[index].totalUnemployment,
    baselineRealGdpTrillions: baselinePath[index].realGdpTrillions,
    baselineRealAnnualWage: baselinePath[index].realAnnualWage,
  })), [baselinePath, scenarioPath]);
  const chartTicks = useMemo(() => {
    const ticks = [MODEL_START_YEAR];
    for (let year = MODEL_START_YEAR + 2; year < terminalYear; year += 2) ticks.push(year);
    if (ticks.at(-1) !== terminalYear) ticks.push(terminalYear);
    return ticks;
  }, [terminalYear]);
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
        <nav><span className="status-dot" /> Open model <a href="#boundary">Beyond 2030</a><a href="#method">Inputs</a></nav>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">ECONOMIC SCENARIOS FOR TRANSFORMATIVE AI</p>
          <h1>How could AI reshape<br /><em>growth, wages, and jobs?</em></h1>
          <p className="lede">Build a scenario from the published assumptions, then follow a smooth technology and economic path through {terminalYear}.</p>
          <aside className="source-note">
            <p>
              Based on Anthropic Institute&apos;s <a href="https://www.anthropic.com/institute/econ-scenarios" target="_blank" rel="noreferrer">Economic Scenarios for Transformative AI</a>, which models 2026 through 2030. This independent simulator extends the framework through 2040.
            </p>
            <a href="#boundary">See the post-2030 assumptions ↓</a>
          </aside>
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
              <LineChart data={path} margin={{ top: 14, right: 18, bottom: 8, left: 12 }}>
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
                  tickFormatter={(value) => metric === 'gdp' || metric === 'wages'
                    ? metric === 'gdp' ? `$${Number(value).toFixed(0)}T` : `$${Math.round(Number(value) / 1000)}k`
                    : `${Number(value).toFixed(0)}%`}
                  axisLine={false}
                  tickLine={false}
                  width={76}
                  label={{
                    value: metricYAxisLabels[metric],
                    angle: -90,
                    position: 'insideLeft',
                    offset: 4,
                    style: { fill: '#626660', fontSize: 9, textAnchor: 'middle' },
                  }}
                />
                {metric === 'unemployment' && (
                  <ReferenceLine y={NORMAL_UNEMPLOYMENT_RATE} stroke="#9b9d97" strokeDasharray="5 5" />
                )}
                {terminalYear > MODEL_END_YEAR && (
                  <ReferenceLine x={MODEL_END_YEAR} stroke="#9b9d97" strokeDasharray="4 5" />
                )}
                <Tooltip content={<TimeTooltip metric={metric} />} />
                {metricSeries[metric].map((series) => (
                  <Line
                    key={series.key}
                    type="monotone"
                    dataKey={series.key}
                    name={series.label}
                    stroke={series.color}
                    strokeWidth={series.key.toString().startsWith('baseline') ? 2 : 2.5}
                    strokeDasharray={series.key.toString().startsWith('baseline') ? '6 5' : undefined}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-foot">
            <span>2030 published horizon</span>
            <span>{terminalYear} scenario endpoint</span>
          </div>
        </article>
      </section>

      <section className="boundary-section" id="boundary">
        <div><p className="eyebrow">2040 EXTENSION</p><h2>How the model continues after 2030.</h2></div>
        <div className="boundary-copy">
          <p className="extension-intro">Anthropic&apos;s scenarios end in 2030. From 2030 to 2040, this simulator continues the same framework with four explicit choices.</p>
          <ol className="extension-list">
            <li><b>Affected task mass keeps growing.</b><span>The selected annual expansion rate carries task capability toward a maximum of 100%.</span></li>
            <li><b>Diffusion and task productivity continue smoothly.</b><span>Diffusion stays on its existing path. Productivity keeps its 2030 direction, then gradually approaches an assumed 30x task-output ceiling.</span></li>
            <li><b>Workers share one labor market.</b><span>Job capacity falls only when affected tasks are used, automated, and not offset by reinstatement. Automating a role does not automatically create a replacement opening.</span></li>
            <li><b>The comparison freezes technology in mid-2026.</b><span>The dashed line holds task capability, diffusion, and AI task productivity fixed while ordinary economic growth continues.</span></li>
          </ol>
          <p className="measurement-note">Dollar values use 2026 reference levels: {gdpValue(REAL_GDP_2026_TRILLIONS)} of annualized U.S. GDP and {wageValue(REAL_ANNUAL_WAGE_2026)} of annual earnings for the average private-sector payroll worker.</p>
          <strong>Values after 2030 are results of this extension, not values reported by Anthropic.</strong>
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
