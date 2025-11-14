import { Router } from 'express'
import mongoose from 'mongoose'
import { requireAuth, requireRole } from '../middleware/auth.js'
import Project from '../models/Project.js'
import Task from '../models/Task.js'
import ProjectGroup from '../models/ProjectGroup.js'

const router = Router()

// Simple health scoring based on backlog and overdue
async function computeHealthForProject(projectId) {
  const pid = mongoose.Types.ObjectId.isValid(projectId) ? new mongoose.Types.ObjectId(projectId) : projectId
  const tasks = await Task.find({ project: pid })
  const total = tasks.length
  const todo = tasks.filter(t => t.status === 'todo').length
  const doing = tasks.filter(t => t.status === 'doing').length
  const done = tasks.filter(t => t.status === 'done').length
  const now = new Date()
  const overdueOpen = tasks.filter(t => (!t.dueDate ? false : t.dueDate < now) && t.status !== 'done').length
  const doneWithDue = tasks.filter(t => t.status === 'done' && t.dueDate)
  const onTime = doneWithDue.filter(t => (t.completedAt && t.completedAt <= t.dueDate)).length
  const onTimeRate = doneWithDue.length ? onTime / doneWithDue.length : 1
  // Score: start 100; penalties for overdue and backlog share; reward for on-time
  let score = 100
  score -= Math.min(40, Math.round((overdueOpen / Math.max(total,1)) * 40))
  score -= Math.min(30, Math.round(((todo + doing) / Math.max(total,1)) * 30))
  score += Math.round(onTimeRate * 10) // up to +10
  score = Math.max(0, Math.min(100, score))
  const status = score >= 70 ? 'green' : score >= 40 ? 'yellow' : 'red'
  return { score, status, updatedAt: new Date(), metrics: { total, todo, doing, done, overdueOpen, onTimeRate } }
}

// Recompute and persist project health (admin/manager)
router.post('/projects/:id/recompute-health', requireAuth, requireRole('admin','manager'), async (req, res) => {
  const h = await computeHealthForProject(req.params.id)
  const p = await Project.findByIdAndUpdate(req.params.id, { $set: { health: { score: h.score, status: h.status, updatedAt: h.updatedAt } } }, { new: true })
  if (!p) return res.status(404).json({ error: 'Not found' })
  res.json({ projectId: String(p._id), health: p.health, metrics: h.metrics })
})

// Global dashboard aggregations (auth)
router.get('/global', requireAuth, async (req, res) => {
  const projects = await Project.find({ status: { $in: ['active','on_hold'] } })
  const ids = projects.map(p => p._id)
  const tasks = await Task.find({ project: { $in: ids } })

  const byGroupMap = new Map()
  const byManagerMap = new Map()

  const tasksByProject = tasks.reduce((m, t) => { const k = String(t.project); (m[k] ||= []).push(t); return m }, {})

  for (const p of projects) {
    const ptasks = tasksByProject[String(p._id)] || []
    const total = ptasks.length
    const overdueOpen = ptasks.filter(t => t.dueDate && t.dueDate < new Date() && t.status !== 'done').length
    const todo = ptasks.filter(t => t.status === 'todo').length
    const doing = ptasks.filter(t => t.status === 'doing').length
    const done = ptasks.filter(t => t.status === 'done').length
    const h = await computeHealthForProject(p._id)

    // group
    const gkey = String(p.group || 'none')
    const g = byGroupMap.get(gkey) || { groupId: gkey, projectCount: 0, healthSum: 0, tasks: 0, done: 0, overdueOpen: 0 }
    g.projectCount += 1
    g.healthSum += h.score
    g.tasks += total
    g.done += done
    g.overdueOpen += overdueOpen
    byGroupMap.set(gkey, g)

    // manager
    const mkey = String(p.manager)
    const m = byManagerMap.get(mkey) || { managerId: mkey, projectCount: 0, healthSum: 0, tasks: 0, done: 0, overdueOpen: 0 }
    m.projectCount += 1
    m.healthSum += h.score
    m.tasks += total
    m.done += done
    m.overdueOpen += overdueOpen
    byManagerMap.set(mkey, m)
  }

  // attach group names
  const groupIds = Array.from(byGroupMap.keys()).filter(id => id !== 'none')
  const groups = await ProjectGroup.find({ _id: { $in: groupIds } }).select('name')
  const gNameMap = new Map(groups.map(g => [String(g._id), g.name]))

  const byGroup = Array.from(byGroupMap.values()).map(x => ({
    ...x,
    groupName: x.groupId === 'none' ? '—' : (gNameMap.get(String(x.groupId)) || String(x.groupId)),
    healthAvg: x.projectCount ? Math.round(x.healthSum / x.projectCount) : 0
  }))
  const byManager = Array.from(byManagerMap.values()).map(x => ({
    ...x,
    healthAvg: x.projectCount ? Math.round(x.healthSum / x.projectCount) : 0
  }))

  const totals = {
    projects: projects.length,
    tasks: tasks.length,
    overdueOpen: tasks.filter(t => t.dueDate && t.dueDate < new Date() && t.status !== 'done').length,
  }

  res.json({ totals, byGroup, byManager })
})

export default router
