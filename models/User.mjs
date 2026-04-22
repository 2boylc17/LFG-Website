import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const saltRounds = 10;

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    bio: { type: String, default: '' },
    platforms: { type: [String], default: [] },
    playStyle: { type: String, enum: ['Casual', 'Competitive', 'Mixed', ''], default: '' },
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Users' }],
    friendRequestsIncoming: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Users' }],
    friendRequestsOutgoing: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Users' }]
});

userSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, saltRounds);
    }
    next();
});

const User = mongoose.model('Users', userSchema, 'Users');
export default User;
