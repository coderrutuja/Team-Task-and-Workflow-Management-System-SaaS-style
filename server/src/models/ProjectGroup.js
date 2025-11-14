import mongoose from 'mongoose'

const ProjectGroupSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['active','on_hold','completed'], default: 'active', index: true },
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true })

export default mongoose.model('ProjectGroup', ProjectGroupSchema)
