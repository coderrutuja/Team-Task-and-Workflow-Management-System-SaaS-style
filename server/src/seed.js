import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { connectDB } from './config/db.js'
import User from './models/User.js'
import Project from './models/Project.js'
import Task from './models/Task.js'

dotenv.config()

async function run() {
  await connectDB()

  // Clear only if SEED_RESET=true
  if (process.env.SEED_RESET === 'true') {
    await Promise.all([
      User.deleteMany({}), Project.deleteMany({}), Task.deleteMany({})
    ])
    console.log('Cleared collections')
  }

  const existingAdmin = await User.findOne({ email: 'admin@example.com' })
  const admin = existingAdmin || await User.create({
    name: 'Admin',
    email: 'admin@example.com',
    passwordHash: await bcrypt.hash('admin123', 10),
    role: 'admin'
  })

  const manager = await User.findOneAndUpdate(
    { email: 'manager@example.com' },
    { name: 'Manager', email: 'manager@example.com', passwordHash: await bcrypt.hash('manager123', 10), role: 'manager' },
    { upsert: true, new: true }
  )
  const member = await User.findOneAndUpdate(
    { email: 'member@example.com' },
    { name: 'Member', email: 'member@example.com', passwordHash: await bcrypt.hash('member123', 10), role: 'member' },
    { upsert: true, new: true }
  )

  let project = await Project.findOne({ title: 'Demo Project' })
  if (!project) {
    project = await Project.create({
      title: 'Demo Project',
      description: 'Seeded project',
      manager: manager._id,
      members: [manager._id, member._id],
      status: 'active'
    })
  }

  const existingTasks = await Task.find({ project: project._id })
  if (existingTasks.length === 0) {
    const tasks = [
      { title: 'Q3 Evaluation', status: 'todo', order: 0, labels: ['urgent','internal'], dueDate: new Date('2025-01-11'), assignees: [member._id] },
      { title: 'Monthly report', status: 'todo', order: 1, labels: ['review'], dueDate: new Date('2025-01-14'), assignees: [member._id] },
      { title: 'Digital Marketing', status: 'done', order: 0, labels: ['marketing'], dueDate: new Date('2025-01-10'), assignees: [manager._id] }
    ]
    await Task.insertMany(tasks.map(t => ({ ...t, project: project._id, createdBy: admin._id })))
  }

  console.log('Seed complete')
  console.log('Admin login:', 'admin@example.com / admin123')
  console.log('Manager login:', 'manager@example.com / manager123')
  console.log('Member login:', 'member@example.com / member123')
  console.log('Project ID:', project._id.toString())

  await mongoose.disconnect()
}

run().catch(e => { console.error(e); process.exit(1) })
