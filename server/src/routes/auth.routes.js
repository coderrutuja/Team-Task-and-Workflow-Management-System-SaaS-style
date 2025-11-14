import { Router } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import User from '../models/User.js'

const router = Router()

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body || {}
  if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' })
  const existing = await User.findOne({ email })
  if (existing) return res.status(409).json({ error: 'Email already registered' })
  const passwordHash = await bcrypt.hash(password, 10)
  const user = await User.create({ name, email, passwordHash, role: 'member' })
  const token = jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '2h' })
  res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } })
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  const user = await User.findOne({ email })
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' })
  const token = jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '2h' })
  res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } })
})

export default router
