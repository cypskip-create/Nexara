import { useState } from 'react'

type Lead = { name: string; interest: string; source: string; stage: string; score: number; value: string; owner: string }
export function Analytics({ leads, isDemo=true }: { leads: Lead[]; isDemo?:boolean }) {
  const [source, setSource] = useState('All')
  const [owner, setOwner] = useState('All')
  const [minimum, setMinimum] = useState(0)
  const [group, setGroup] = useState<'source' | 'stage' | 'owner'>('source')
  const [selected, setSelected] = useState<string | null>(null)
  const [sort, setSort] = useState('score')
  const filtered = leads.filter(l => (source === 'All' || l.source === source) && (owner === 'All' || l.owner === owner) && l.score >= minimum)
  const groups = [...new Set(filtered.map(l => l[group]))].map(name => ({ name, count: filtered.filter(l => l[group] === name).length }))
  const rows = filtered.filter(l => selected === null || l[group] === selected).sort((a,b) => sort === 'name' ? a.name.localeCompare(b.name) : b.score - a.score)
  const won = filtered.filter(l => l.stage === 'Won').length
  const lost = filtered.filter(l => l.stage === 'Lost').length
  const qualified = filtered.filter(l => ['Qualified','Contacted','Meeting','Negotiation','Won'].includes(l.stage)).length
  const reset = () => { setSource('All'); setOwner('All'); setMinimum(0); setSelected(null) }
  const exportCsv = () => {
    const quote = (value: string | number) => '"' + String(value).replace(/^[=+@-]/, "'$&").replaceAll('"','""') + '"'
    const data = [['Name','Source','Owner','Stage','Score','Budget (as entered)'], ...rows.map(l => [l.name,l.source,l.owner,l.stage,l.score,l.value])]
    const url = URL.createObjectURL(new Blob(['\uFEFF' + data.map(row => row.map(quote).join(',')).join('\r\n')], { type:'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = isDemo?'leadflow-demo-analytics.csv':'nexara-analytics.csv'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url),1000)
  }
  const percent = (n: number, total: number) => total ? (n / total * 100).toFixed(1) + '%' : '—'
  return <div className="analytics-workbench">
    <div className="page-heading"><div><p className="eyebrow">Pipeline intelligence · {isDemo?'Demo workspace':'Live workspace'}</p><h1>Understand your opportunities.</h1><p className="subheading">Explore the leads currently in this workspace. Every filter updates the report.</p></div><button className="btn primary" disabled={!rows.length} onClick={exportCsv}>Export filtered CSV ↓</button></div>
    <div className="insight-controls card">
      <label>Source<select value={source} onChange={e => {setSource(e.target.value);setSelected(null)}}>{['All',...new Set(leads.map(l => l.source))].map(v => <option key={v}>{v}</option>)}</select></label>
      <label>Owner<select value={owner} onChange={e => {setOwner(e.target.value);setSelected(null)}}>{['All',...new Set(leads.map(l => l.owner))].map(v => <option key={v}>{v}</option>)}</select></label>
      <label>Minimum score: {minimum}<input aria-label="Minimum score" type="range" min="0" max="100" value={minimum} onChange={e => {setMinimum(Number(e.target.value));setSelected(null)}} /></label>
      <button className="btn secondary" onClick={reset}>Reset filters</button>
    </div>
    <div className="metric-grid">{[['Matching leads',filtered.length],['Qualified or later',qualified],['Lead-to-win rate',percent(won,filtered.length)],['Win rate of closed leads',percent(won,won+lost)]].map(([label,value]) => <div className="card metric" key={label}><div className="metric-top">{label}</div><strong>{value}</strong></div>)}</div>
    <div className="insights-layout"><section className="card insight-panel"><div className="card-head"><div><h2>Explore your pipeline</h2><p>Select a bar to inspect its leads below.</p></div><select aria-label="Group leads by" value={group} onChange={e => {setGroup(e.target.value as typeof group);setSelected(null)}}><option value="source">By source</option><option value="stage">By stage</option><option value="owner">By owner</option></select></div>
      <div className="breakdown">{groups.map(g => <button key={g.name} aria-pressed={selected === g.name} onClick={() => setSelected(selected === g.name ? null : g.name)}><span>{g.name}</span><strong>{g.count} · {percent(g.count,filtered.length)}</strong><i style={{width:percent(g.count,filtered.length)}} /></button>)}{!groups.length && <p>No leads match these filters. Lower the score threshold or reset filters.</p>}</div>
    </section><section className="card insight-panel"><div className="card-head"><div><h2>Qualification health</h2><p>Descriptive scores, not predictions.</p></div></div><div className="health-summary"><strong>{filtered.length ? Math.round(filtered.reduce((s,l) => s+l.score,0)/filtered.length) : '—'}</strong><span>average lead score</span><p>{filtered.filter(l => l.owner === 'Unassigned').length} unassigned leads need an owner.</p><p>{filtered.filter(l => l.stage === 'New').length} leads are awaiting initial qualification.</p></div></section></div>
    <section className="card insight-panel"><div className="card-head"><div><h2>Report details {selected && '· ' + selected}</h2><p>{rows.length} matching records · budgets shown exactly as entered</p></div><label>Sort <select value={sort} onChange={e => setSort(e.target.value)}><option value="score">Highest score</option><option value="name">Name A–Z</option></select></label></div><div className="table-wrap"><table className="report-table"><thead><tr>{['Lead','Source','Owner','Stage','Score','Budget'].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((l,i) => <tr key={l.name+i}><td>{l.name}</td><td>{l.source}</td><td>{l.owner}</td><td>{l.stage}</td><td>{l.score}</td><td>{l.value}</td></tr>)}</tbody></table>{!rows.length && <p className="table-empty">No matching leads.</p>}</div></section>
    <p className="report-footnote">Date comparisons and response-time reports require timestamped lead and message history. {isDemo?'This report contains demo data.':'This report uses your live workspace leads.'}</p>
  </div>
}
