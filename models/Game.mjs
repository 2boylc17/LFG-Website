import mongoose from 'mongoose';

// Game schema with genres, platforms, cover image
const gameSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    genres: [],
    platforms: [],
    image: { data: Buffer, contentType: String }
});

const GameModel = mongoose.model('Games', gameSchema, 'Games');
export default GameModel;