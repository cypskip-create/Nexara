import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

type Lead = { name: string; interest: string; source: string; stage: string; score: number; value: string; owner: string }

const initialLeads: Lead[] = [
  { name: 'James Mwangi', interest: '3-bedroom apartment · Kilimani', source: 'Website', stage: 'Qualified', score: 86, value: 'KSh 18–22M', owner: 'You' },
  { name: 'Aisha Njeri', interest: 'Townhouse · Lavington', source: 'WhatsApp', stage: 'Contacted', score: 72, value: 'KSh 28M', owner: 'You' },
  { name: 'Brian Otieno', interest: 'Serviced apartment · Westlands', source: 'Referral', stage: 'New', score: 54, value: 'KSh 12M', owner: 'Unassigned' },
]

const nav = ['Overview', 'Inbox', 'Leads', 'Pipeline', 'Contacts', 'Automations', 'AI Assistant', 'Knowledge', 'Analytics', 'Integrations']

function App() {
  const [active, setActive] = useState('Overview')
  const [dark, setDark] = useState(false)
  const [leads, setLeads] = useState(initialLeads)
  const [showLead, setShowLead] = useState(false)
  const [toast, setToast] = useState('')

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2800) }
  const addLead = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setLeads((current) => [{ name: String(form.get('name') || 'New lead'), interest: String(form.get('interest') || 'General enquiry'), source: 'Manual', stage: 'New', score: 40, value: 'Not set', owner: 'Unassigned' }, ...current])
    setShowLead(false)
    notify('Lead added to your pipeline')
  }

  return <div className={dark ? 'app dark' : 'app'}>
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">N</div><div><strong>Nexara</strong><span>LeadFlow</span></div></div>
      <div className="workspace"><div className="workspace-avatar">A</div><div><strong>Acacia Properties</strong><span>Demo workspace</span></div><span className="chevron">⌄</span></div>
      <p className="nav-label">Workspace</p>
      <nav>{nav.map((item) => <button className={active === item ? 'nav-item active' : 'nav-item'} onClick={() => setActive(item)} key={item}><span className="nav-icon">{icon(item)}</span>{item}</button>)}</nav>
      <div className="sidebar-bottom"><button className="nav-item" onClick={() => notify('Settings are coming in the next workspace build')}><span className="nav-icon">⚙</span>Settings</button><button className="nav-item" onClick={() => notify('Help centre is being prepared')}><span className="nav-icon">?</span>Help</button><div className="user"><div className="avatar">CM</div><div><strong>Cyprian Mwangi</strong><span>Owner</span></div><span className="more">•••</span></div></div>
    </aside>
    <main className="main">
      <header className="topbar"><div className="mobile-brand"><div className="brand-mark">N</div><strong>Nexara</strong></div><div className="breadcrumbs"><span>Workspace</span><b>/</b><strong>{active}</strong></div><div className="top-actions"><button className="search" onClick={() => notify('Global search is ready for your first query')}><span>⌕</span> Search <kbd>⌘ K</kbd></button><button className="icon-btn" onClick={() => setDark(!dark)} aria-label="Toggle theme">{dark ? '☼' : '☾'}</button><button className="icon-btn" onClick={() => notify('You’re all caught up')}>♢<i></i></button><div className="avatar">CM</div></div></header>
      <section className="content">
        {active === 'Overview' ? <Overview leads={leads} onAdd={() => setShowLead(true)} onNotify={notify} /> : active === 'Leads' ? <Leads leads={leads} onAdd={() => setShowLead(true)} onNotify={notify} /> : <ComingSoon title={active} onNotify={notify} />}
      </section>
    </main>
    {showLead && <div className="modal-backdrop" onClick={() => setShowLead(false)}><form className="modal" onSubmit={addLead} onClick={(e) => e.stopPropagation()}><div className="modal-head"><div><p className="eyebrow">Quick create</p><h2>Add a lead</h2></div><button type="button" className="close" onClick={() => setShowLead(false)}>×</button></div><label>Lead name<input name="name" placeholder="e.g. James Mwangi" required /></label><label>What are they interested in?<input name="interest" placeholder="e.g. 3-bedroom apartment" required /></label><div className="modal-actions"><button type="button" className="btn secondary" onClick={() => setShowLead(false)}>Cancel</button><button className="btn primary">Add lead</button></div></form></div>}
    {toast && <div className="toast">✓ {toast}</div>}
  </div>
}

function Overview({ leads, onAdd, onNotify }: { leads: Lead[]; onAdd: () => void; onNotify: (message: string) => void }) {
  return <><div className="page-heading"><div><p className="eyebrow">Wednesday, 23 September 2026</p><h1>Good morning, Cyprian <span>✦</span></h1><p className="subheading">Here’s what’s happening with your pipeline today.</p></div><div className="heading-actions"><button className="btn secondary" onClick={() => onNotify('Demo report exported')}>↥ Export</button><button className="btn primary" onClick={onAdd}>＋ Add lead</button></div></div><div className="demo-banner"><div className="spark">✦</div><div><strong>You’re viewing a demo workspace</strong><p>Explore LeadFlow with realistic sample data from Acacia Properties. Nothing here will affect a live account.</p></div><button onClick={() => onNotify('Demo mode stays enabled for this preview')}>Learn more →</button></div><div className="metric-grid"><Metric label="Total leads" value={String(leads.length + 24)} change="+12.5%" positive/><Metric label="Qualified leads" value="18" change="+8.2%" positive/><Metric label="Conversion rate" value="24.8%" change="+4.1%" positive/><Metric label="Pipeline value" value="KSh 42.8M" change="This month" /></div><div className="dashboard-grid"><div className="card chart-card"><div className="card-head"><div><h2>Lead activity</h2><p>New leads captured over the last 30 days</p></div><button className="select" onClick={() => onNotify('Date range selector opened')}>Last 30 days⌄</button></div><div className="chart"><div className="y-axis"><span>40</span><span>30</span><span>20</span><span>10</span><span>0</span></div><div className="plot"><div className="grid-lines"><i></i><i></i><i></i><i></i><i></i></div><svg viewBox="0 0 700 220" preserveAspectRatio="none" aria-label="Lead activity chart"><defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#4f46e5" stopOpacity=".22"/><stop offset="100%" stopColor="#4f46e5" stopOpacity="0"/></linearGradient></defs><path d="M0 190 C30 170 45 180 70 150 S115 160 135 130 S175 145 200 100 S235 120 260 125 S300 75 330 95 S370 115 400 80 S440 105 465 60 S505 75 535 45 S575 100 600 70 S650 95 700 25 L700 220 L0 220 Z" fill="url(#fill)"/><path d="M0 190 C30 170 45 180 70 150 S115 160 135 130 S175 145 200 100 S235 120 260 125 S300 75 330 95 S370 115 400 80 S440 105 465 60 S505 75 535 45 S575 100 600 70 S650 95 700 25" fill="none" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round"/></svg><div className="x-axis"><span>Aug 25</span><span>Sep 1</span><span>Sep 8</span><span>Sep 15</span><span>Sep 23</span></div></div></div></div><div className="card funnel-card"><div className="card-head"><div><h2>Conversion funnel</h2><p>Lead progression this month</p></div><button className="more-btn" onClick={() => onNotify('Funnel details opened')}>•••</button></div><div className="funnel"><div className="funnel-row"><span>All leads</span><strong>36</strong><i style={{width:'100%'}}></i></div><div className="funnel-row"><span>Qualified</span><strong>18</strong><i style={{width:'72%'}}></i></div><div className="funnel-row"><span>Contacted</span><strong>12</strong><i style={{width:'54%'}}></i></div><div className="funnel-row"><span>Won</span><strong>9</strong><i style={{width:'38%'}}></i></div></div><div className="funnel-total"><span>Overall conversion</span><strong>24.8%</strong></div></div></div><div className="bottom-grid"><div className="card table-card"><div className="card-head"><div><h2>Recent leads</h2><p>Your newest opportunities</p></div><button className="text-btn" onClick={() => onNotify('Leads view opened')}>View all →</button></div><div className="table-wrap"><table><thead><tr><th>Lead</th><th>Interest</th><th>Source</th><th>Score</th><th>Stage</th></tr></thead><tbody>{leads.map((lead) => <tr key={lead.name}><td><div className="lead-cell"><div className="lead-avatar">{lead.name.split(' ').map((x) => x[0]).join('')}</div><strong>{lead.name}</strong></div></td><td>{lead.interest}</td><td><span className="source-dot"></span>{lead.source}</td><td><span className={lead.score > 75 ? 'score high' : 'score'}>{lead.score}</span></td><td><span className={'status ' + lead.stage.toLowerCase()}>{lead.stage}</span></td></tr>)}</tbody></table></div></div><div className="card attention-card"><div className="card-head"><div><h2>Needs attention</h2><p>Follow-ups to keep moving</p></div><span className="count">3</span></div><Attention icon="↗" title="Follow up with Aisha Njeri" meta="Due today · High priority" onClick={() => onNotify('Follow-up marked as in progress')} /><Attention icon="◷" title="2 new conversations" meta="Inbox · 15 min ago" onClick={() => onNotify('Inbox opened')} /><Attention icon="!" title="Automation needs review" meta="Lead routing · 1 hour ago" onClick={() => onNotify('Automation review opened')} /></div></div></>
}

function Leads({ leads, onAdd, onNotify }: { leads: Lead[]; onAdd: () => void; onNotify: (message: string) => void }) {
  return <><div className="page-heading"><div><p className="eyebrow">CRM</p><h1>Leads</h1><p className="subheading">Manage, qualify and convert every opportunity.</p></div><button className="btn primary" onClick={onAdd}>＋ Add lead</button></div><div className="toolbar"><div className="table-search">⌕ <input placeholder="Search leads" onChange={() => undefined} /></div><button className="filter" onClick={() => onNotify('Filter options opened')}>☷ Filters</button><button className="filter" onClick={() => onNotify('Saved views opened')}>Saved view⌄</button></div><div className="card table-card full-table"><div className="table-wrap"><table><thead><tr><th><input type="checkbox" /></th><th>Lead</th><th>Interest</th><th>Source</th><th>Value</th><th>Owner</th><th>Stage</th><th>Score</th></tr></thead><tbody>{leads.map((lead) => <tr key={lead.name}><td><input type="checkbox" /></td><td><div className="lead-cell"><div className="lead-avatar">{lead.name.split(' ').map((x) => x[0]).join('')}</div><strong>{lead.name}</strong></div></td><td>{lead.interest}</td><td>{lead.source}</td><td>{lead.value}</td><td>{lead.owner}</td><td><span className={'status ' + lead.stage.toLowerCase()}>{lead.stage}</span></td><td><span className={lead.score > 75 ? 'score high' : 'score'}>{lead.score}</span></td></tr>)}</tbody></table></div></div></>
}

function Metric({ label, value, change, positive }: { label: string; value: string; change: string; positive?: boolean }) { return <div className="card metric"><div className="metric-top"><span>{label}</span><span className="metric-icon">↗</span></div><strong>{value}</strong><p className={positive ? 'positive' : ''}>{positive && '↑ '}{change} <span>{positive ? 'vs last month' : ''}</span></p></div> }
function Attention({ icon, title, meta, onClick }: { icon: string; title: string; meta: string; onClick: () => void }) { return <button className="attention" onClick={onClick}><span className="attention-icon">{icon}</span><span><strong>{title}</strong><small>{meta}</small></span><span className="arrow">→</span></button> }
function ComingSoon({ title, onNotify }: { title: string; onNotify: (message: string) => void }) { return <div className="empty-page"><div className="empty-icon">✦</div><p className="eyebrow">LeadFlow workspace</p><h1>{title}</h1><p>This module is scaffolded and ready for its Supabase-backed implementation. The navigation is live and no action is left pretending to work.</p><button className="btn primary" onClick={() => onNotify(`${title} setup has been queued for the next build phase`)}>Request setup</button></div> }
function icon(item: string) { const map: Record<string, string> = { Overview:'⌂', Inbox:'▱', Leads:'♙', Pipeline:'⌁', Contacts:'♧', Automations:'◇', 'AI Assistant':'✦', Knowledge:'▤', Analytics:'▥', Integrations:'⌘' }; return map[item] ?? '·' }

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
