import { useMemo, useState } from 'react'
import type { WorkspaceTask } from '../crm/types'
import './tasks.css'

type Props={tasks:WorkspaceTask[];onComplete:(taskId:string)=>void|Promise<unknown>;onOpenLead:(leadId:string)=>void;notify:(message:string)=>void}

export function TasksPage({tasks,onComplete,onOpenLead,notify}:Props){
  const [filter,setFilter]=useState<'Open'|'Completed'|'All'>('Open')
  const visible=useMemo(()=>tasks.filter(task=>filter==='All'||task.status===filter).sort((a,b)=>(a.dueAt??'9999').localeCompare(b.dueAt??'9999')),[filter,tasks])
  const open=tasks.filter(task=>task.status==='Open')
  const overdue=open.filter(task=>task.dueAt&&new Date(task.dueAt)<new Date())
  const dueToday=open.filter(task=>task.dueAt&&new Date(task.dueAt).toDateString()===new Date().toDateString())
  const complete=async(task:WorkspaceTask)=>{await onComplete(task.id);notify(`${task.title} completed`)}
  return <><div className="page-heading"><div><p className="eyebrow">Follow-up workspace</p><h1>Tasks</h1><p className="subheading">Keep every promised next step visible and accountable.</p></div></div>
    <div className="task-metrics"><div className="card"><strong>{open.length}</strong><span>Open</span></div><div className="card"><strong>{dueToday.length}</strong><span>Due today</span></div><div className="card overdue"><strong>{overdue.length}</strong><span>Overdue</span></div><div className="card"><strong>{tasks.filter(task=>task.status==='Completed').length}</strong><span>Completed</span></div></div>
    <div className="task-toolbar">{(['Open','Completed','All'] as const).map(value=><button className={filter===value?'active':''} key={value} onClick={()=>setFilter(value)}>{value}</button>)}</div>
    <div className="card task-list">{visible.map(task=>{const isOverdue=task.status==='Open'&&Boolean(task.dueAt)&&new Date(task.dueAt!)<new Date();return <article className={task.status==='Completed'?'task-row complete':'task-row'} key={task.id}><button className="task-check" disabled={task.status!=='Open'} onClick={()=>void complete(task)} aria-label={`Complete ${task.title}`}>{task.status==='Completed'?'✓':''}</button><div className="task-copy"><strong>{task.title}</strong><span>{task.description||`Follow up with ${task.leadName}`}</span><small className={isOverdue?'overdue':''}>{task.dueAt?`${isOverdue?'Overdue · ':'Due '}${new Date(task.dueAt).toLocaleString()}`:'No due date'} · {task.assignee}</small></div>{task.leadId&&<button className="text-btn" onClick={()=>onOpenLead(task.leadId!)}>Open {task.leadName} →</button>}</article>})}{!visible.length&&<div className="task-empty"><span>✓</span><h2>{filter==='Open'?'You’re all caught up':'No tasks here yet'}</h2><p>Follow-ups scheduled from a lead profile will appear here.</p></div>}</div>
  </>
}
