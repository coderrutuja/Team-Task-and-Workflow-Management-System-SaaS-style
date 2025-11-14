import { Router } from 'express'
import mongoose from 'mongoose'
import { requireAuth, requireRole } from '../middleware/auth.js'
import Task from '../models/Task.js'
import Activity from '../models/Activity.js'
import PDFDocument from 'pdfkit'
import * as XLSX from 'xlsx'

const router = Router()

// List tasks by project
router.get('/project/:projectId', requireAuth, async (req, res) => {
  const { status, q, sort } = req.query
  const page = Math.max(parseInt(req.query.page || '1', 10), 1)
  const size = Math.min(Math.max(parseInt(req.query.size || '50', 10), 1), 200)
  const skip = (page - 1) * size
  const match = { project: req.params.projectId }
  if (status && status !== 'all') match.status = status
  if (q) match.title = new RegExp(q, 'i')
  const sortSpec = sort === 'dueAsc' ? { dueDate: 1 } : sort === 'dueDesc' ? { dueDate: -1 } : { order: 1, createdAt: -1 }
  const [total, items] = await Promise.all([
    Task.countDocuments(match),
    Task.find(match).sort(sortSpec).skip(skip).limit(size)
  ])
  res.json({ items, total, page, size })
})

// Export tasks (CSV)
router.get('/project/:projectId/export.csv', requireAuth, requireRole('admin','manager'), async (req, res) => {
  const { status, q, sort } = req.query
  const match = { project: req.params.projectId }
  if (status && status !== 'all') match.status = status
  if (q) match.title = new RegExp(q, 'i')
  const sortSpec = sort === 'dueAsc' ? { dueDate: 1 } : sort === 'dueDesc' ? { dueDate: -1 } : { createdAt: -1 }
  const rows = await Task.find(match).sort(sortSpec)
  const header = ['Title','Status','Due Date','Labels','Created At']
  const lines = [header.join(',')]
  function esc(v){
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s
  }
  for (const t of rows){
    lines.push([
      esc(t.title||''),
      esc(t.status||''),
      esc(t.dueDate ? new Date(t.dueDate).toISOString().slice(0,10) : ''),
      esc(Array.isArray(t.labels)?t.labels.join(' | '):''),
      esc(t.createdAt ? new Date(t.createdAt).toISOString() : '')
    ].join(','))
  }
  res.setHeader('Content-Type','text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="tasks-${req.params.projectId}.csv"`)
  res.send('\uFEFF' + lines.join('\n'))
  console.log('[audit] export CSV', { user: req.user.id, project: req.params.projectId, count: rows.length })
})

// Export tasks (PDF)
router.get('/project/:projectId/export.pdf', requireAuth, requireRole('admin','manager'), async (req, res) => {
  const { status, q, sort } = req.query
  const match = { project: req.params.projectId }
  if (status && status !== 'all') match.status = status
  if (q) match.title = new RegExp(q, 'i')
  const sortSpec = sort === 'dueAsc' ? { dueDate: 1 } : sort === 'dueDesc' ? { dueDate: -1 } : { createdAt: -1 }
  const rows = await Task.find(match).sort(sortSpec)
  res.setHeader('Content-Type','application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="tasks-${req.params.projectId}.pdf"`)
  const doc = new PDFDocument({ size: 'A4', margin: 36 })
  doc.pipe(res)
  doc.fontSize(16).text('Tasks Export', { align: 'left' })
  doc.moveDown(0.5)
  doc.fontSize(10).text(`Project: ${req.params.projectId}  |  Exported: ${new Date().toLocaleString()}`)
  doc.moveDown(0.75)
  const colX = [36, 200, 270, 340, 430]
  const yStart = doc.y
  doc.fontSize(11).fillColor('#111')
  doc.text('Title', colX[0], yStart)
  doc.text('Status', colX[1], yStart)
  doc.text('Due', colX[2], yStart)
  doc.text('Labels', colX[3], yStart)
  doc.moveDown(0.5)
  doc.moveTo(36, doc.y).lineTo(559, doc.y).strokeColor('#e5e7eb').stroke()
  doc.moveDown(0.2)
  doc.fontSize(10).fillColor('#222')
  for (const t of rows){
    const y = doc.y
    doc.text(t.title || '', colX[0], y, { width: colX[1]-colX[0]-6 })
    doc.text(t.status || '', colX[1], y, { width: colX[2]-colX[1]-6 })
    doc.text(t.dueDate ? new Date(t.dueDate).toISOString().slice(0,10) : '', colX[2], y, { width: colX[3]-colX[2]-6 })
    doc.text(Array.isArray(t.labels)?t.labels.join(' | '):'', colX[3], y, { width: 559-colX[3] })
    doc.moveDown(0.6)
    if (doc.y > 780) doc.addPage()
  }
  doc.end()
  console.log('[audit] export PDF', { user: req.user.id, project: req.params.projectId, count: rows.length })
})

// Export tasks (XLSX)
router.get('/project/:projectId/export.xlsx', requireAuth, requireRole('admin','manager'), async (req, res) => {
  const { status, q, sort } = req.query
  const match = { project: req.params.projectId }
  if (status && status !== 'all') match.status = status
  if (q) match.title = new RegExp(q, 'i')
  const sortSpec = sort === 'dueAsc' ? { dueDate: 1 } : sort === 'dueDesc' ? { dueDate: -1 } : { createdAt: -1 }
  const rows = await Task.find(match).sort(sortSpec)
  const data = [['Title','Status','Due Date','Labels','Created At']]
  for (const t of rows){
    data.push([
      t.title || '',
      t.status || '',
      t.dueDate ? new Date(t.dueDate).toISOString().slice(0,10) : '',
      Array.isArray(t.labels)?t.labels.join(' | '):'',
      t.createdAt ? new Date(t.createdAt).toISOString() : ''
    ])
  }
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(data)
  XLSX.utils.book_append_sheet(wb, ws, 'Tasks')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="tasks-${req.params.projectId}.xlsx"`)
  res.send(buf)
  console.log('[audit] export XLSX', { user: req.user.id, project: req.params.projectId, count: rows.length })
})

// Project summary analytics
router.get('/project/:projectId/summary', requireAuth, async (req, res) => {
  const projectId = req.params.projectId
  const now = new Date()
  const in7 = new Date(now)
  in7.setDate(in7.getDate() + 7)

  const baseMatch = { project: projectId }
  // Optional assignee filter: assignee=me limits to tasks where current user is assignee or creator
  if (req.query.assignee === 'me') {
    baseMatch.$or = [
      { assignees: req.user.id },
      { createdBy: req.user.id }
    ]
  }

  const [all, recentRaw, labelsAgg] = await Promise.all([
    Task.find(baseMatch),
    Task.find(baseMatch).sort({ updatedAt: -1, dueDate: -1 }).limit(5),
    Task.aggregate([
      { $match: { project: (mongoose.Types.ObjectId.isValid(projectId) ? new mongoose.Types.ObjectId(projectId) : projectId) } },
      { $unwind: { path: '$labels', preserveNullAndEmptyArrays: false } },
      { $group: { _id: '$labels', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]).catch(() => [])
  ])

  const total = all.length
  const todo = all.filter(x => x.status === 'todo').length
  const doing = all.filter(x => x.status === 'doing').length
  const done = all.filter(x => x.status === 'done').length
  const upcoming = all.filter(x => x.dueDate && x.dueDate >= now && x.dueDate <= in7).length

  // sparkline: counts by due date last 7 days
  const spark = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(now)
    d.setDate(now.getDate() - (6 - i))
    const key = d.toISOString().slice(0, 10)
    return all.filter(x => (x.dueDate ? new Date(x.dueDate).toISOString().slice(0, 10) : '') === key).length
  })

  const topLabels = Array.isArray(labelsAgg) && labelsAgg.length
    ? labelsAgg.map(x => [x._id, x.count])
    : []

  // Per-member aggregation (counts by status over assignees)
  const perMemberMap = new Map()
  for (const t of all) {
    const assignees = Array.isArray(t.assignees) && t.assignees.length ? t.assignees : []
    for (const uid of assignees) {
      const k = String(uid)
      if (!perMemberMap.has(k)) perMemberMap.set(k, { userId: k, todo: 0, doing: 0, done: 0 })
      const row = perMemberMap.get(k)
      if (t.status === 'todo') row.todo++
      else if (t.status === 'doing') row.doing++
      else if (t.status === 'done') row.done++
    }
  }
  const perMember = Array.from(perMemberMap.values())

  // On-time rate (overall): done tasks with dueDate and completedAt <= dueDate
  const doneWithDue = all.filter(t => t.status === 'done' && t.dueDate)
  const onTime = doneWithDue.filter(t => t.completedAt && (new Date(t.completedAt) <= new Date(t.dueDate))).length
  const onTimeRate = doneWithDue.length ? Math.round((onTime / doneWithDue.length) * 100) : 0

  const recent = recentRaw.map(t => ({ id: String(t._id), title: t.title, status: t.status, due: t.dueDate || null }))

  res.json({
    total, todo, doing, done, upcoming,
    recent,
    topLabels,
    spark,
    perMember,
    onTimeRate,
    totalHours: all.reduce((sum, t) => sum + (t.timeTotalHours || 0), 0)
  })
})

// Task activity feed
router.get('/:id/activity', requireAuth, async (req, res) => {
  const items = await Activity.find({ task: req.params.id }).sort({ createdAt: -1 }).limit(50)
  res.json({ items })
})

// Create task
router.post('/project/:projectId', requireAuth, async (req, res) => {
  const { title, description, priority, status, dueDate, labels, assignees } = req.body
  const max = await Task.find({ project: req.params.projectId, status: status || 'todo' }).sort({ order: -1 }).limit(1)
  const order = max[0]?.order + 1 || 0
  const t = await Task.create({ project: req.params.projectId, title, description, priority, status: status || 'todo', dueDate, labels, assignees, order, createdBy: req.user.id })
  res.status(201).json(t)
})

// Update task (RBAC: admin/manager/creator/assignee)
router.patch('/:id', requireAuth, async (req, res) => {
  const existing = await Task.findById(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Not found' })
  const isAdminOrManager = ['admin','manager'].includes(req.user.role)
  const isCreator = String(existing.createdBy || '') === String(req.user.id)
  const isAssignee = (existing.assignees || []).some(u => String(u) === String(req.user.id))
  if (!(isAdminOrManager || isCreator || isAssignee)) return res.status(403).json({ error: 'Forbidden' })
  const patch = { ...req.body }
  // Validate predecessors: must be same project and not self
  if (Array.isArray(patch.predecessors)) {
    const unique = Array.from(new Set(patch.predecessors.map(String))).filter(id => String(id) !== String(existing._id))
    // ensure all predecessors are in same project
    const preds = await Task.find({ _id: { $in: unique } }).select('_id project status')
    const bad = preds.find(p => String(p.project) !== String(existing.project))
    if (bad) return res.status(400).json({ error: 'Predecessors must belong to the same project' })
    patch.predecessors = unique
  }
  if (typeof patch.status === 'string' && patch.status === 'done' && existing.status !== 'done' && !existing.completedAt) {
    patch.completedAt = new Date()
  }
  // Enforce simple dependency rule: cannot move to doing/done if any predecessor is not done
  if (typeof patch.status === 'string' && ['doing','done'].includes(patch.status)) {
    const predIds = Array.isArray(patch.predecessors) ? patch.predecessors : (existing.predecessors || [])
    if (predIds.length) {
      const preds = await Task.find({ _id: { $in: predIds } }).select('status')
      const hasOpen = preds.some(p => p.status !== 'done')
      if (hasOpen) return res.status(400).json({ error: 'Cannot start/complete task until predecessors are done' })
    }
  }
  const t = await Task.findByIdAndUpdate(req.params.id, patch, { new: true })
  if (patch.status && patch.status !== existing.status) {
    await Activity.create({ user: req.user.id, task: existing._id, action: 'status_changed', fromStatus: existing.status, toStatus: patch.status })
  }
  res.json(t)
})

// Add a comment to task
router.post('/:id/comments', requireAuth, async (req, res) => {
  const { text } = req.body || {}
  if (!text || !String(text).trim()) return res.status(400).json({ error: 'Comment text required' })
  const task = await Task.findById(req.params.id)
  if (!task) return res.status(404).json({ error: 'Not found' })
  task.comments = task.comments || []
  task.comments.push({ user: req.user.id, text: String(text).trim() })
  await task.save()
  // return latest comments (limit 50)
  const comments = (task.comments || []).slice(-50)
  res.status(201).json({ comments })
})

router.get('/:id/comments', requireAuth, async (req, res) => {
  const task = await Task.findById(req.params.id)
  if (!task) return res.status(404).json({ error: 'Not found' })
  const comments = (task.comments || []).slice(-50)
  res.json({ comments })
})

// Delete a comment
router.delete('/:id/comments/:commentId', requireAuth, async (req, res) => {
  const task = await Task.findById(req.params.id)
  if (!task) return res.status(404).json({ error: 'Not found' })
  const c = (task.comments || []).find(x => String(x._id) === String(req.params.commentId))
  if (!c) return res.status(404).json({ error: 'Comment not found' })
  const isAdminOrManager = ['admin','manager'].includes(req.user.role)
  const isAuthor = String(c.user || '') === String(req.user.id)
  if (!(isAdminOrManager || isAuthor)) return res.status(403).json({ error: 'Forbidden' })
  task.comments = (task.comments || []).filter(x => String(x._id) !== String(req.params.commentId))
  await task.save()
  res.json({ ok: true })
})

// Reorder/move within project board
router.patch('/:id/reorder', requireAuth, async (req, res) => {
  const { status, order } = req.body // status target column, order new index (0-based)
  const task = await Task.findById(req.params.id)
  if (!task) return res.status(404).json({ error: 'Not found' })
  const projectId = task.project
  const targetStatus = status || task.status

  // shift orders to make room
  await Task.updateMany({ project: projectId, status: targetStatus, order: { $gte: order } }, { $inc: { order: 1 } })

  // if moving across columns, compact source column
  if (task.status !== targetStatus) {
    await Task.updateMany({ project: projectId, status: task.status, order: { $gt: task.order } }, { $inc: { order: -1 } })
  } else {
    // moving within same column: remove old position before insert
    if (order > task.order) {
      await Task.updateMany({ project: projectId, status: targetStatus, order: { $gt: task.order, $lte: order } }, { $inc: { order: -1 } })
    } else if (order < task.order) {
      await Task.updateMany({ project: projectId, status: targetStatus, order: { $gte: order, $lt: task.order } }, { $inc: { order: 1 } })
    }
  }

  task.status = targetStatus
  task.order = order
  await task.save()

  const items = await Task.find({ project: projectId }).sort({ status: 1, order: 1 })
  res.json({ ok: true, items })
})

// Delete task (RBAC: admin/manager/creator)
router.delete('/:id', requireAuth, async (req, res) => {
  const existing = await Task.findById(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Not found' })
  const isAdminOrManager = ['admin','manager'].includes(req.user.role)
  const isCreator = String(existing.createdBy || '') === String(req.user.id)
  if (!(isAdminOrManager || isCreator)) return res.status(403).json({ error: 'Forbidden' })
  await Task.findByIdAndDelete(req.params.id)
  await Activity.create({ user: req.user.id, task: existing._id, action: 'deleted', fromStatus: existing.status, toStatus: null })
  res.json({ ok: true })
})

// Attach a file to task
router.post('/:id/attachments', requireAuth, async (req, res) => {
  const { fileId } = req.body || {}
  if (!fileId) return res.status(400).json({ error: 'fileId required' })
  const t = await Task.findByIdAndUpdate(
    req.params.id,
    { $addToSet: { attachments: fileId } },
    { new: true }
  )
  if (!t) return res.status(404).json({ error: 'Not found' })
  res.json({ attachments: t.attachments || [] })
})

// Remove a file from task
router.delete('/:id/attachments/:fileId', requireAuth, async (req, res) => {
  const t = await Task.findByIdAndUpdate(
    req.params.id,
    { $pull: { attachments: req.params.fileId } },
    { new: true }
  )
  if (!t) return res.status(404).json({ error: 'Not found' })
  res.json({ attachments: t.attachments || [] })
})

export default router

// Add a predecessor (dependency)
router.post('/:id/dependencies', requireAuth, async (req, res) => {
  const { predecessorId } = req.body || {}
  if (!predecessorId) return res.status(400).json({ error: 'predecessorId required' })
  const task = await Task.findById(req.params.id)
  if (!task) return res.status(404).json({ error: 'Not found' })
  if (String(predecessorId) === String(task._id)) return res.status(400).json({ error: 'Task cannot depend on itself' })
  const pred = await Task.findById(predecessorId)
  if (!pred) return res.status(404).json({ error: 'Predecessor not found' })
  if (String(pred.project) !== String(task.project)) return res.status(400).json({ error: 'Predecessor must be in same project' })
  await Task.findByIdAndUpdate(task._id, { $addToSet: { predecessors: predecessorId } }, { new: true })
  const updated = await Task.findById(task._id)
  res.status(201).json({ predecessors: (updated.predecessors || []).map(String) })
})

// Remove a predecessor
router.delete('/:id/dependencies/:predecessorId', requireAuth, async (req, res) => {
  const t = await Task.findByIdAndUpdate(
    req.params.id,
    { $pull: { predecessors: req.params.predecessorId } },
    { new: true }
  )
  if (!t) return res.status(404).json({ error: 'Not found' })
  res.json({ predecessors: (t.predecessors || []).map(String) })
})

// List time entries
router.get('/:id/time-entries', requireAuth, async (req, res) => {
  const t = await Task.findById(req.params.id).select('timeEntries timeTotalHours')
  if (!t) return res.status(404).json({ error: 'Not found' })
  res.json({ items: t.timeEntries || [], totalHours: t.timeTotalHours || 0 })
})

// Add time entry
router.post('/:id/time-entries', requireAuth, async (req, res) => {
  const { hours, note, at } = req.body || {}
  const h = Number(hours)
  if (!(h >= 0)) return res.status(400).json({ error: 'hours must be >= 0' })
  const t = await Task.findById(req.params.id)
  if (!t) return res.status(404).json({ error: 'Not found' })
  t.timeEntries = t.timeEntries || []
  t.timeEntries.push({ user: req.user.id, hours: h, note: note || '', at: at ? new Date(at) : new Date() })
  t.timeTotalHours = (t.timeTotalHours || 0) + h
  await t.save()
  res.status(201).json({ items: t.timeEntries, totalHours: t.timeTotalHours })
})

// Delete time entry
router.delete('/:id/time-entries/:entryId', requireAuth, async (req, res) => {
  const t = await Task.findById(req.params.id)
  if (!t) return res.status(404).json({ error: 'Not found' })
  const entry = (t.timeEntries || []).find(e => String(e._id) === String(req.params.entryId))
  if (!entry) return res.status(404).json({ error: 'Time entry not found' })
  // Allow admin/manager or author to delete
  const isAdminOrManager = ['admin','manager'].includes(req.user.role)
  const isAuthor = String(entry.user || '') === String(req.user.id)
  if (!(isAdminOrManager || isAuthor)) return res.status(403).json({ error: 'Forbidden' })
  t.timeEntries = (t.timeEntries || []).filter(e => String(e._id) !== String(req.params.entryId))
  t.timeTotalHours = Math.max(0, (t.timeTotalHours || 0) - (Number(entry.hours) || 0))
  await t.save()
  res.json({ items: t.timeEntries, totalHours: t.timeTotalHours })
})
