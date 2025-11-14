import mongoose from 'mongoose'

const NotificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  type: { type: String, default: 'info' },
  title: { type: String, required: true },
  body: { type: String, default: '' },
  data: { type: Object, default: {} },
  readAt: { type: Date, default: null }
}, { timestamps: true })

export default mongoose.model('Notification', NotificationSchema)
