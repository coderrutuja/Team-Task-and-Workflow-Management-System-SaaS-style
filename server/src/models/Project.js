import mongoose from 'mongoose'

const ProjectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  startDate: Date,
  endDate: Date,
  status: { type: String, enum: ['active','on_hold','completed'], default: 'active', index: true },
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'ProjectGroup', index: true },
  health: {
    score: { type: Number, default: 100 }, // 0-100
    status: { type: String, enum: ['green','yellow','red'], default: 'green' },
    updatedAt: { type: Date }
  }
}, { timestamps: true })

export default mongoose.model('Project', ProjectSchema)
