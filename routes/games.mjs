import express from 'express';
import Game from '../models/Game.mjs';

const router = express.Router();
const dataUrlRegex = /^data:([A-Za-z-+/]+);base64,(.+)$/;

const parseImageUrl = (imageUrl) => {
	if (!imageUrl) return null;
	const match = imageUrl.match(dataUrlRegex);
	if (!match) return null;
	return { data: Buffer.from(match[2], 'base64'), contentType: match[1] };
};

router.post('/add', async (req, res) => {
    try {
		const { name, genres, platforms, image } = req.body;
		const gameImage = parseImageUrl(image);
		const existingGame = await Game.findOne({ name });
        if (existingGame) {
            return res.status(400).json({ message: 'Game already exists' });
		}

		if (!genres || !platforms) {
            return res.status(400).json({ message: 'Genre and platform cannot be empty' });
        }

		const newGame = await Game.create({ name, genres, platforms, image: gameImage });
		return res.status(201).json({ message: 'Game added successfully', gameId: newGame._id });
    } catch (error) {
	    console.error("Add game error:", error);
		return res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/list', async (req, res) => {
	try {
		const gamesFound = await Game.find({}, { _id: 1, name: 1, genres: 1, platforms: 1, image: 1 });
		return res.status(200).json(gamesFound);
	} catch (error) {
		console.error("List games error:", error);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

export default router;
