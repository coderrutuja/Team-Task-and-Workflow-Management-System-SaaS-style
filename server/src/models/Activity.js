import mongoose from 'mongoose'

const ActivitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', index: true },
  action: { type: String, enum: ['status_changed','deleted'], required: true },
  fromStatus: { type: String },
  toStatus: { type: String },
}, { timestamps: true })

export default mongoose.model('Activity', ActivitySchema)
