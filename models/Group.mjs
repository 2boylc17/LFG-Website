import mongoose from "mongoose";

const groupSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    game: { type: mongoose.Schema.Types.ObjectId, ref: 'Games', required: true },
    platform: { type: String },
    experience: { type: String, trim: true },
    microphone: { type: String, trim: true },
    region: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Users' }],
    createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 }
});

const Group = mongoose.model('Groups', groupSchema, 'Groups');
export default Group;
