import express from 'express';
import Game from '../models/Game.mjs';

const router = express.Router();
const DATA_URL_REGEX = /^data:([A-Za-z-+/]+);base64,(.+)$/;

const parseImageDataUrl = (imageDataUrl) => {
	if (!imageDataUrl) return null;
	const matches = imageDataUrl.match(DATA_URL_REGEX);
	if (!matches) return null;
	return { data: Buffer.from(matches[2], 'base64'), contentType: matches[1] };
};

// Route to add a new game
router.post('/add', async (req, res) => {
    try {
		const { name, genres, platforms, image } = req.body;
		const gameImageData = parseImageDataUrl(image);
		const existingGame = await Game.findOne({ name });
        if (existingGame) {
            return res.status(400).json({ message: 'Game already exists' });
		}

		if (!genres || !platforms) {
            return res.status(400).json({ message: 'Genre and platform cannot be empty' });
        }

		const newGame = await Game.create({ name, genres, platforms, image: gameImageData });
		return res.status(201).json({ message: 'Game added successfully', gameId: newGame._id });
    } catch (err) {
        console.error("Add game error:", err);
		return res.status(500).json({ error: 'Internal server error' });
    }
});

// Route to fetch all games
router.get('/list', async (req, res) => {
	try {
		const gamesFound = await Game.find({}, { _id: 1, name: 1, genres: 1, platforms: 1, image: 1 });
		return res.status(200).json(gamesFound);
	} catch (err) {
		console.error("List all games error:", err);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

export default router;
