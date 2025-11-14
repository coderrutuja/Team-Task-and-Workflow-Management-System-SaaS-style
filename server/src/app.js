import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import authRoutes from './routes/auth.routes.js'
import projectRoutes from './routes/projects.routes.js'
import taskRoutes from './routes/tasks.routes.js'
import userRoutes from './routes/users.routes.js'
import notifRoutes from './routes/notifications.routes.js'
import path from 'path'
import { fileURLToPath } from 'url'
import filesRoutes from './routes/files.routes.js'
import groupsRoutes from './routes/groups.routes.js'
import dashboardRoutes from './routes/dashboard.routes.js'
import { startScheduler } from './jobs/scheduler.js'

const app = express()
app.use(helmet())
app.use(cors({ origin: process.env.CLIENT_URL?.split(',') || true, credentials: true }))
app.use(express.json())
app.use(morgan('dev'))
// static uploads
const __dirname = path.dirname(fileURLToPath(import.meta.url))
app.use('/uploads', express.static(path.join(__dirname, '..', '..', 'uploads')))

app.get('/health', (req, res) => res.json({ ok: true }))

app.use('/auth', authRoutes)
app.use('/projects', projectRoutes)
app.use('/tasks', taskRoutes)
app.use('/users', userRoutes)
app.use('/notifications', notifRoutes)
app.use('/files', filesRoutes)
app.use('/groups', groupsRoutes)
app.use('/dashboard', dashboardRoutes)

app.use((err, req, res, next) => {
  console.error(err)
  res.status(err.status || 500).json({ error: err.message || 'Server error' })
})

export default app

// Start background scheduler (non-blocking)
startScheduler().catch(()=>{})
