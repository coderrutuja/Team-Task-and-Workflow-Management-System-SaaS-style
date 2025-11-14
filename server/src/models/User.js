import mongoose from 'mongoose'

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin','manager','member','client'], default: 'member', index: true },
  status: { type: String, enum: ['active','inactive'], default: 'active' },
  avatarUrl: String,
  lastLoginAt: Date,
}, { timestamps: true })

export default mongoose.model('User', UserSchema)
