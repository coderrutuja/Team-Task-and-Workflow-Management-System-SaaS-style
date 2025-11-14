import mongoose from 'mongoose'

const ChecklistItem = new mongoose.Schema({ text: String, done: { type: Boolean, default: false } }, { _id: false })
const CommentItem = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, { _id: true })

const TimeEntry = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  hours: { type: Number, required: true, min: 0 },
  note: { type: String, default: '' },
  at: { type: Date, default: Date.now }
}, { _id: true })

const TaskSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  title: { type: String, required: true },
  description: String,
  status: { type: String, enum: ['todo','doing','done'], default: 'todo', index: true },
  priority: { type: String, enum: ['high','medium','low'], default: 'medium' },
  assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  labels: [String],
  checklist: [ChecklistItem],
  dueDate: Date,
  comments: [CommentItem],
  completedAt: Date,
  attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'File' }],
  order: { type: Number, default: 0, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  predecessors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task', index: true }],
  timeEntries: [TimeEntry],
  timeTotalHours: { type: Number, default: 0 }
}, { timestamps: true })

TaskSchema.index({ project: 1, status: 1, order: 1 })

export default mongoose.model('Task', TaskSchema)

