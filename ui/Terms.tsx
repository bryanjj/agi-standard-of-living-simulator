import type { ReactNode } from 'react';

const notes = {
  agi: {
    marker: 1,
    name: 'Transformative AGI',
    definition: 'A scenario in which AI can perform all tasks humans can perform. The 20-year path follows the bounded-task baseline scenario in Korinek and Suh.',
    sources: [{ label: 'Korinek & Suh', href: 'https://www.nber.org/papers/w32255' }],
  },
  quintile: {
    marker: 2,
    name: 'Income quintile',
    definition: 'One fifth of U.S. households ranked by household income. Preset incomes use Census mean income for each fifth.',
    sources: [{ label: 'U.S. Census H-3', href: 'https://www.census.gov/data/tables/time-series/demo/income-poverty/historical-income-households.html' }],
  },
  equity: {
    marker: 3,
    name: 'Stock equity',
    definition: 'Direct and indirect stock holdings, including stock funds and equity held through retirement accounts. Presets use the survey-weighted median; cash, deposits, bonds, and housing are excluded.',
    sources: [{ label: 'Federal Reserve SCF', href: 'https://www.federalreserve.gov/econres/scfindex.htm' }],
  },
  purchasingPower: {
    marker: 4,
    name: 'Material purchasing power',
    definition: 'The simulator’s after-tax household resources divided by its modeled basket price. Q3 today is set to 100. Each path applies the modeled prices to one simulated worker’s income path, and darker overlapping paths indicate more likely outcomes.',
    sources: [],
  },
  incomeIndex: {
    marker: 5,
    name: 'Modeled household income',
    definition: 'After-tax labor income, capital income, and government support before the modeled price adjustment. Each line is a fixed Monte Carlo draw of a worker’s displacement year. Labor income becomes zero after displacement; total household income can remain above zero because of stock income and government support. Darker overlapping paths indicate more likely outcomes.',
    sources: [],
  },
  noAgi: {
    marker: 6,
    name: 'No-AGI baseline',
    definition: 'A simulator comparison path with household purchasing power growing 1% per year. The 1% rate is an explicit assumption, not a government or paper forecast.',
    sources: [],
  },
  resources: {
    marker: 7,
    name: 'Household resources',
    definition: 'The simulator divides gross household resources into labor income, capital income, and government support. The split and its tax treatment are simplified model assumptions.',
    sources: [],
  },
  reproducible: {
    marker: 8,
    name: 'Reproducible goods and capital',
    definition: 'Things whose productive capacity can be accumulated or replicated, such as machines and computers. The simulator extends this idea to a scalable-goods price category.',
    sources: [{ label: 'Trammell & Korinek', href: 'https://www.nber.org/papers/w31815' }],
  },
  scarceFactors: {
    marker: 9,
    name: 'Irreproducible scarce factors',
    definition: 'Fixed inputs that do not automatically scale with AI productivity. Korinek and Suh discuss minerals, matter, and energy. Trammell and Korinek use land and natural resources. Housing exposure is the simulator’s household-level proxy.',
    sources: [
      { label: 'Korinek & Suh', href: 'https://www.nber.org/papers/w32255' },
      { label: 'Trammell & Korinek', href: 'https://www.nber.org/papers/w31815' },
    ],
  },
  automation: {
    marker: 10,
    name: 'Automation',
    definition: 'The share of the original task distribution that machines can perform. In this scenario it reaches 100% in year 20 and does not include newly created human tasks.',
    sources: [{ label: 'Korinek & Suh', href: 'https://www.nber.org/papers/w32255' }],
  },
  factorShares: {
    marker: 11,
    name: 'Labor and capital shares',
    definition: 'The portions of modeled factor income paid to labor and capital. They sum to 100%; the labor share approaches zero in the full-automation stress test.',
    sources: [
      { label: 'Korinek & Suh', href: 'https://www.nber.org/papers/w32255' },
      { label: 'Trammell & Korinek', href: 'https://www.nber.org/papers/w31815' },
    ],
  },
  macroIndexes: {
    marker: 12,
    name: 'Real output and average wage indexes',
    definition: 'Real output is modeled production relative to today. Average wage is modeled labor income per remaining unit of original employment. Both are calculated indexes, not dollar forecasts.',
    sources: [{ label: 'Korinek & Suh', href: 'https://www.nber.org/papers/w32255' }],
  },
} as const;

export type TermId = keyof typeof notes;

export function Term({ note, children }: { note: TermId; children: ReactNode }) {
  const item = notes[note];
  return (
    <span className="defined-term" title={`${item.name}: ${item.definition}`}>
      {children}<sup><a href={`#term-note-${note}`} aria-label={`Definition ${item.marker}: ${item.name}`}>{item.marker}</a></sup>
    </span>
  );
}

export function TermNotes() {
  return (
    <section className="term-notes" aria-labelledby="term-notes-heading">
      <div>
        <p className="eyebrow">DEFINITIONS &amp; CITATIONS</p>
        <h2 id="term-notes-heading">What the terms mean.</h2>
        <p>Superscripts identify sources and definitions created for this simulator.</p>
      </div>
      <ol>
        {Object.entries(notes).map(([id, item]) => (
          <li id={`term-note-${id}`} key={id}>
            <span>{item.marker}</span>
            <p><strong>{item.name}.</strong> {item.definition} {item.sources.length > 0 ? item.sources.map((source, index) => <span key={source.href}>{index > 0 ? ' · ' : ''}<a href={source.href} target="_blank" rel="noreferrer">{source.label} ↗</a></span>) : <em>Simulator definition / assumption.</em>}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
