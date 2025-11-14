import dotenv from 'dotenv'
import { createServer } from 'http'
import app from './app.js'
import { connectDB } from './config/db.js'

dotenv.config()

const PORT = process.env.PORT || 4000

async function start() {
  await connectDB()
  const httpServer = createServer(app)
  httpServer.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`))
}

start().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
