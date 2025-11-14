import mongoose from 'mongoose'

const FileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
  size: { type: Number, default: 0 },
  mime: { type: String, default: 'application/octet-stream' },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true })

export default mongoose.model('File', FileSchema)
