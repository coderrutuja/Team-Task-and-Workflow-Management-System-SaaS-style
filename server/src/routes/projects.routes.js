import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import Project from '../models/Project.js'
import Task from '../models/Task.js'

const router = Router()

// List projects (basic)
router.get('/', requireAuth, async (req, res) => {
  const { q, status, page = 1, limit = 20 } = req.query
  const match = {}
  if (q) match.title = new RegExp(q, 'i')
  if (status && status !== 'all') match.status = status
  const p = Math.max(1, parseInt(page))
  const l = Math.min(100, Math.max(1, parseInt(limit)))
  const [items, total] = await Promise.all([
    Project.find(match).sort({ createdAt: -1 }).skip((p-1)*l).limit(l),
    Project.countDocuments(match)
  ])
  res.json({ items, total, page: p, limit: l })
})

// Create project (any auth for demo; extend with role guard)
router.post('/', requireAuth, requireRole('admin','manager'), async (req, res) => {
  const { title, description, startDate, endDate, status, manager, members, group } = req.body
  const mgr = manager || req.user.id
  const mem = Array.isArray(members) ? members : []
  const membersWithMgr = mem.includes(mgr) ? mem : [mgr, ...mem]
  const p = await Project.create({ title, description, startDate, endDate, status, manager: mgr, members: membersWithMgr, group: group || undefined })
  res.status(201).json(p)
})

// Get single project
router.get('/:id', requireAuth, async (req, res) => {
  const p = await Project.findById(req.params.id)
  if (!p) return res.status(404).json({ error: 'Not found' })
  res.json(p)
})

// Update project
router.patch('/:id', requireAuth, requireRole('admin','manager'), async (req, res) => {
  const { title, description, startDate, endDate, status, manager, members, group } = req.body
  const p = await Project.findByIdAndUpdate(
    req.params.id,
    { $set: { title, description, startDate, endDate, status, manager, members, group } },
    { new: true }
  )
  if (!p) return res.status(404).json({ error: 'Not found' })
  res.json(p)
})

// Delete project
router.delete('/:id', requireAuth, requireRole('admin','manager'), async (req, res) => {
  const p = await Project.findByIdAndDelete(req.params.id)
  if (!p) return res.status(404).json({ error: 'Not found' })
  res.json({ ok: true })
})

export default router

// Exports
router.get('/:id/tasks.csv', requireAuth, requireRole('admin','manager'), async (req, res) => {
  const { q, status } = req.query
  const match = { project: req.params.id }
  if (q) match.title = new RegExp(q, 'i')
  if (status && status !== 'all') match.status = status
  const items = await Task.find(match).sort({ status: 1, order: 1, createdAt: -1 })
  const header = ['Title','Status','Priority','DueDate','Labels']
  const rows = items.map(t => [
    escapeCsv(t.title||''),
    t.status||'',
    t.priority||'',
    t.dueDate ? new Date(t.dueDate).toISOString() : '',
    (t.labels||[]).join('; ')
  ].join(','))
  const csv = [header.join(','), ...rows].join('\n')
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="project_${req.params.id}_tasks.csv"`)
  res.send(csv)
  function escapeCsv(v){
    const s = String(v)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"'+s.replace(/"/g,'""')+'"'
    return s
  }
})

router.get('/:id/tasks.xlsx', requireAuth, requireRole('admin','manager'), async (req, res) => {
  const { q, status } = req.query
  const match = { project: req.params.id }
  if (q) match.title = new RegExp(q, 'i')
  if (status && status !== 'all') match.status = status
  const items = await Task.find(match).sort({ status: 1, order: 1, createdAt: -1 })
  // Minimal SpreadsheetML (Excel 2003 XML) for compatibility without deps
  const rowsXml = items.map(t => (
    `<Row>
      <Cell><Data ss:Type="String">${xml(t.title||'')}</Data></Cell>
      <Cell><Data ss:Type="String">${xml(t.status||'')}</Data></Cell>
      <Cell><Data ss:Type="String">${xml(t.priority||'')}</Data></Cell>
      <Cell><Data ss:Type="String">${t.dueDate ? new Date(t.dueDate).toISOString() : ''}</Data></Cell>
      <Cell><Data ss:Type="String">${xml((t.labels||[]).join('; '))}</Data></Cell>
    </Row>`
  )).join('')
  const xmlDoc = `<?xml version="1.0"?>
  <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
            xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:x="urn:schemas-microsoft-com:office:excel"
            xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
    <Worksheet ss:Name="Tasks">
      <Table>
        <Row>
          <Cell><Data ss:Type="String">Title</Data></Cell>
          <Cell><Data ss:Type="String">Status</Data></Cell>
          <Cell><Data ss:Type="String">Priority</Data></Cell>
          <Cell><Data ss:Type="String">DueDate</Data></Cell>
          <Cell><Data ss:Type="String">Labels</Data></Cell>
        </Row>
        ${rowsXml}
      </Table>
    </Worksheet>
  </Workbook>`
  res.setHeader('Content-Type', 'application/vnd.ms-excel')
  res.setHeader('Content-Disposition', `attachment; filename="project_${req.params.id}_tasks.xlsx"`)
  res.send(xmlDoc)
  function xml(s){
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;')
  }
})

// PDF export (admin/manager). Uses lazy import of pdfkit to avoid hard dependency.
router.get('/:id/tasks.pdf', requireAuth, requireRole('admin','manager'), async (req, res) => {
  let PDFDocument
  try {
    ;({ default: PDFDocument } = await import('pdfkit'))
  } catch {
    return res.status(501).json({ error: 'PDF export not available. Please install pdfkit on the server.' })
  }
  const { q, status } = req.query
  const match = { project: req.params.id }
  if (q) match.title = new RegExp(q, 'i')
  if (status && status !== 'all') match.status = status
  const items = await Task.find(match).sort({ status: 1, order: 1, createdAt: -1 })

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="project_${req.params.id}_tasks.pdf"`)
  const doc = new PDFDocument({ size: 'A4', margin: 36 })
  doc.pipe(res)
  doc.fontSize(16).text('Project Tasks', { underline: true })
  doc.moveDown(0.5)
  doc.fontSize(10)
  const headers = ['Title','Status','Priority','DueDate','Labels']
  doc.text(headers.join('  |  '))
  doc.moveDown(0.25)
  doc.moveTo(36, doc.y).lineTo(559, doc.y).stroke()
  doc.moveDown(0.25)
  items.forEach(t => {
    const row = [
      t.title || '',
      t.status || '',
      t.priority || '',
      t.dueDate ? new Date(t.dueDate).toISOString().slice(0,10) : '',
      (t.labels||[]).join('; ')
    ].join('  |  ')
    doc.text(row)
  })
  doc.end()
})
