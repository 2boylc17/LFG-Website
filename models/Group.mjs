import mongoose from "mongoose";

const groupSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    game: { type: mongoose.Schema.Types.ObjectId, ref: 'Games', required: true },
    platform: { type: String },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Users' }],
    createdAt: { type: Date, default: Date.now }
});

const Group = mongoose.model('Groups', groupSchema, 'Groups');
export default Group;
