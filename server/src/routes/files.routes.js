import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { requireAuth } from '../middleware/auth.js'
import FileModel from '../models/File.js'

const router = Router()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadsDir = path.join(__dirname, '..', '..', 'uploads')

function ensureUploads() {
  try { fs.mkdirSync(uploadsDir, { recursive: true }) } catch {}
}

router.post('/', requireAuth, async (req, res) => {
  const { name, contentBase64, mime } = req.body || {}
  if (!name || !contentBase64) return res.status(400).json({ error: 'name and contentBase64 required' })
  ensureUploads()
  const safeName = `${Date.now()}_${name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const filePath = path.join(uploadsDir, safeName)
  try {
    const buf = Buffer.from(contentBase64, 'base64')
    fs.writeFileSync(filePath, buf)
    const size = buf.length
    const url = `/uploads/${safeName}`
    const doc = await FileModel.create({ name, url, size, mime: mime || 'application/octet-stream', uploadedBy: req.user.id })
    res.status(201).json(doc)
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Upload failed' })
  }
})

router.get('/:id', requireAuth, async (req, res) => {
  const f = await FileModel.findById(req.params.id)
  if (!f) return res.status(404).json({ error: 'Not found' })
  res.json(f)
})

export default router
