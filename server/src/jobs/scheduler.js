import Project from '../models/Project.js'
import Task from '../models/Task.js'
import User from '../models/User.js'
import Notification from '../models/Notification.js'
import { sendEmail } from '../services/email.service.js'

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)) }

function isRed(status){ return String(status) === 'red' }

async function computeHealth(projectId){
  const tasks = await Task.find({ project: projectId })
  const total = tasks.length
  const todo = tasks.filter(t => t.status === 'todo').length
  const doing = tasks.filter(t => t.status === 'doing').length
  const done = tasks.filter(t => t.status === 'done').length
  const now = new Date()
  const overdueOpen = tasks.filter(t => t.dueDate && t.dueDate < now && t.status !== 'done').length
  const doneWithDue = tasks.filter(t => t.status === 'done' && t.dueDate)
  const onTime = doneWithDue.filter(t => t.completedAt && t.completedAt <= t.dueDate).length
  const onTimeRate = doneWithDue.length ? onTime / doneWithDue.length : 1
  let score = 100
  score -= Math.min(40, Math.round((overdueOpen / Math.max(total,1)) * 40))
  score -= Math.min(30, Math.round(((todo + doing) / Math.max(total,1)) * 30))
  score += Math.round(onTimeRate * 10)
  score = Math.max(0, Math.min(100, score))
  const status = score >= 70 ? 'green' : score >= 40 ? 'yellow' : 'red'
  return { score, status }
}

function looksValidEmail(email){
  if (!email) return false
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return false
  if (/@example\.com$/i.test(email)) return false
  return true
}

async function sendOncePerDay({ userId, type, title, body, data }){
  const since = new Date(Date.now() - 24*60*60*1000)
  const already = await Notification.findOne({ user: userId, type, createdAt: { $gte: since }, ...(data?.taskId ? { 'data.taskId': data.taskId } : {}), ...(data?.projectId ? { 'data.projectId': data.projectId } : {}) })
  if (already) return false
  const user = await User.findById(userId).select('email name status')
  if (!user || String(user.status) !== 'active' || !looksValidEmail(user.email)) return false
  await Notification.create({ user: userId, type, title, body, data })
  const to = user?.email
  if (to) {
    await sendEmail({ to, subject: title, text: body, html: `<p>${body}</p>` }).catch(()=>{})
  }
  return true
}

async function jobDueReminders(){
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tasks = await Task.find({ status: { $ne: 'done' }, dueDate: { $lte: now } })
  for (const t of tasks){
    const assignees = (t.assignees||[])
    const proj = await Project.findById(t.project).select('manager members title')
    // Notify assignees if present; otherwise, notify all project members
    const base = assignees.length ? assignees : (proj?.members || [])
    const users = new Set(base.map(String))
    if (proj?.manager) users.add(String(proj.manager))
    for (const uid of users){
      await sendOncePerDay({
        userId: uid,
        type: 'due_reminder',
        title: `Task due: ${t.title}`,
        body: `Task "${t.title}" is due${t.dueDate < startOfDay ? ' (overdue)' : ' today'}.`,
        data: { taskId: String(t._id), projectId: String(t.project) }
      })
    }
    await sleep(5) // minor backoff
  }
}

async function jobInactivity(){
  const cutoff = new Date(Date.now() - 3*24*60*60*1000)
  const tasks = await Task.find({ status: 'doing', updatedAt: { $lt: cutoff } })
  for (const t of tasks){
    const proj = await Project.findById(t.project).select('manager title')
    const users = new Set([...(t.assignees||[]).map(String)])
    if (proj?.manager) users.add(String(proj.manager))
    for (const uid of users){
      await sendOncePerDay({
        userId: uid,
        type: 'inactivity',
        title: `Inactivity: ${t.title}`,
        body: `Task "${t.title}" has had no updates for 3+ days.`,
        data: { taskId: String(t._id), projectId: String(t.project) }
      })
    }
    await sleep(5)
  }
}

async function jobHealthAlerts(){
  const projects = await Project.find({ status: { $in: ['active','on_hold'] } }).select('title manager health')
  for (const p of projects){
    const { score, status } = await computeHealth(p._id)
    const prev = p.health?.score ?? 100
    const prevUpdated = p.health?.updatedAt ? new Date(p.health.updatedAt) : null
    // Update project stored health
    p.health = { score, status, updatedAt: new Date() }
    await p.save().catch(()=>{})
    const drop = prev - score
    const shouldAlert = drop >= 15 || isRed(status)
    if (!shouldAlert || !p.manager) continue
    await sendOncePerDay({
      userId: String(p.manager),
      type: 'health_alert',
      title: `Project health alert: ${p.title}`,
      body: `Health ${prev} -> ${score} (${status}). Trigger: ${drop >= 15 ? 'drop ≥15' : 'red zone'}.`,
      data: { projectId: String(p._id), drop, prev, score, status }
    })
    await sleep(5)
  }
}

async function runAll(){
  await jobDueReminders().catch(e=>console.error('[scheduler] due', e))
  await jobInactivity().catch(e=>console.error('[scheduler] inactivity', e))
  await jobHealthAlerts().catch(e=>console.error('[scheduler] health', e))
}

export async function startScheduler(){
  const useCron = await import('node-cron').then(m=>m.default || m).catch(()=>null)
  if (useCron && useCron.schedule){
    useCron.schedule('*/15 * * * *', () => runAll())
    console.log('[scheduler] node-cron scheduled every 15 minutes')
  } else {
    setInterval(runAll, 15*60*1000)
    console.log('[scheduler] using setInterval every 15 minutes (node-cron not installed)')
  }
  // kick once after startup delay
  setTimeout(runAll, 5000)
}
