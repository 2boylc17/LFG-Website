import mongoose from "mongoose";

const groupSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    game: { type: mongoose.Schema.Types.ObjectId, ref: 'Games', required: true },
    platform: { type: String },
    experience: { type: String, trim: true },
    microphone: { type: String, trim: true },
    region: { type: String, trim: true },
    joinRequirement: { type: String, enum: ['auto', 'password', 'request'], default: 'auto' },
    joinPasswordHash: { type: String, default: '' },
    tags: [{ type: String, trim: true }],
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Users' }],
    pendingMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Users' }],
    createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 }
});

const GroupModel = mongoose.model('Groups', groupSchema, 'Groups');
export default GroupModel;
