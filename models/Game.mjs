import mongoose from 'mongoose';

const gameSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    genres: [],
    platforms: [],
    image: { data: Buffer, contentType: String }
});

const Game = mongoose.model('Games', gameSchema, 'Games');
export default Game;