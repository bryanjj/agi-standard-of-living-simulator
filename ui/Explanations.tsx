import type { SimulationResult, SimulationYear } from '../model/types';
import { Term, type TermId } from './Terms';

const pct = (value: number) => `${Math.round(value * 100)}%`;
const idx = (value: number) => Math.round(value);

const contributionLabels: Record<string, { label: string; term?: TermId }> = {
  labor: { label: 'Labor income', term: 'resources' }, capital: { label: 'Capital / AI income', term: 'resources' }, transfers: { label: 'Government support', term: 'resources' },
  taxes: { label: 'Taxes', term: 'resources' }, productivity: { label: 'Cheaper reproducible goods', term: 'reproducible' }, scarcity: { label: 'Irreproducible scarce factors', term: 'scarceFactors' },
};

export function WhyChart({ year }: { year: SimulationYear }) {
  const values = Object.entries(year.decomposition) as [keyof typeof contributionLabels, number][];
  const extent = Math.max(10, ...values.map(([, value]) => Math.abs(value)));
  return (
    <div className="why-chart">
      {values.map(([key, value]) => (
        <div className="why-row" key={key}>
          <span>{contributionLabels[key].term ? <Term note={contributionLabels[key].term}>{contributionLabels[key].label}</Term> : contributionLabels[key].label}</span>
          <div className="why-track"><i className={value >= 0 ? 'gain' : 'loss'} style={{ width: `${Math.max(3, Math.abs(value) / extent * 50)}%`, left: value >= 0 ? '50%' : `${50 - Math.abs(value) / extent * 50}%` }} /></div>
          <strong className={value >= 0 ? 'gain-text' : 'loss-text'}>{value >= 0 ? '+' : ''}{idx(value)}</strong>
        </div>
      ))}
      <div className="reconcile"><span>Today</span><strong>100</strong><span>+ contributions</span><strong>= {idx(year.standardOfLiving)}</strong></div>
    </div>
  );
}

export function ResourceComposition({ result }: { result: SimulationResult }) {
  const points = [result.years[0], result.years[10], result.years[20]];
  return (
    <div className="composition">
      <div className="comp-legend"><span className="labor-key" /> <Term note="resources">Labor</Term> <span className="capital-key" /> <Term note="resources">Capital</Term> <span className="transfer-key" /> <Term note="resources">Support</Term></div>
      {points.map((point) => (
        <div className="comp-row" key={point.year}>
          <span>{point.year === 0 ? 'Today' : `Year ${point.year}`}</span>
          <div className="stack" aria-label={`Year ${point.year}: ${pct(point.resourceShares.labor)} labor, ${pct(point.resourceShares.capital)} capital, ${pct(point.resourceShares.transfers)} transfers`}>
            <i className="labor" style={{ width: pct(point.resourceShares.labor) }}><b>{point.resourceShares.labor > .12 ? pct(point.resourceShares.labor) : ''}</b></i>
            <i className="capital" style={{ width: pct(point.resourceShares.capital) }}><b>{point.resourceShares.capital > .12 ? pct(point.resourceShares.capital) : ''}</b></i>
            <i className="transfer" style={{ width: pct(point.resourceShares.transfers) }}><b>{point.resourceShares.transfers > .12 ? pct(point.resourceShares.transfers) : ''}</b></i>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Affordability({ year }: { year: SimulationYear }) {
  const goods = 100 / year.prices.reproducible;
  const housing = 100 / year.prices.scarce;
  return (
    <div className="afford-grid">
      <article><p><Term note="reproducible">REPRODUCIBLE GOODS &amp; SERVICES</Term></p><strong>{idx(goods)}</strong><span>Today = 100</span><div className="meter"><i style={{ width: `${Math.min(100, goods / 3)}%` }} /></div><small>Manufactured goods, software and many scalable services become easier to produce.</small></article>
      <article><p><Term note="scarceFactors">IRREPRODUCIBLE SCARCE FACTORS</Term></p><strong>{idx(housing)}</strong><span>Today = 100</span><div className="meter scarce"><i style={{ width: `${Math.min(100, housing)}%` }} /></div><small>The papers use land and natural resources as examples. Housing exposure is this simulator&apos;s household-level proxy.</small></article>
    </div>
  );
}

export function MacroDetails({ year }: { year: SimulationYear }) {
  const metrics: Array<[string, string, string, TermId]> = [
    ['Real output', `${year.output.toFixed(1)}×`, 'today', 'macroIndexes'],
    ['Original employment', pct(year.employment), 'remaining', 'automation'],
    ['Labor share', pct(year.laborShare), 'of factor income', 'factorShares'],
    ['Average wage', `${year.wageIndex.toFixed(1)}×`, 'for remaining work', 'macroIndexes'],
    ['Capital share', pct(1 - year.laborShare), 'of factor income', 'factorShares'],
    ['Automation', pct(year.automation), 'of original tasks', 'automation'],
  ];
  return <div className="macro-grid">{metrics.map(([label, value, suffix, term]) => <article key={label}><span><Term note={term}>{label}</Term></span><strong>{value}</strong><small>{suffix}</small></article>)}</div>;
}
