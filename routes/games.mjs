import express from 'express';
import Game from '../models/Game.mjs';
//import db from '../db/connection.mjs';
//import { data } from 'autoprefixer';

const router = express.Router();

// Route to add a new game
router.post('/add', async (req, res) => {
    try {
		let gameImageData = null;
		if (req.body.image) {
			const matches = req.body.image.match(
				/^data:([A-Za-z-+/]+);base64,(.+)$/
			);
			if (matches) {
				gameImageData = {
					data: Buffer.from(matches[2], 'base64'),
					contentType: matches[1]
				};
			}
		}
        const existingGame = await Game.findOne({ name: req.body.name });
        if (existingGame) {
            return res.status(400).json({ message: 'Game already exists' });
        } else if (!req.body.genres || !req.body.platforms) {
            return res.status(400).json({ message: 'Genre and platform cannot be empty' });
        } else {
            const newGame = await Game.create({
			name: req.body.name,
			genres: req.body.genres,
			platforms: req.body.platforms,
			image: gameImageData
		});
            res.status(201).json({ message: 'Game added successfully', gameId: newGame._id });
        }
    } catch (err) {
        console.error("Add game error:", err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Old paginated list route (kept for reference).
// router.get('/list/:page/:range', async (req, res) => {
// 	try {
// 		const skipAmount = (req.params.page - 1) * req.params.range;
// 		const gamesFound = await Game.find(
// 			{ _id: 1, name: 1, genres: 1, platforms: 1, image: 1 },
// 			{ skip: skipAmount, limit: req.params.range }
// 		);
// 		res.status(200).json(gamesFound);
// 	} catch (err) {
// 		console.error("List games error:", err);
// 		res.status(500).json({ error: 'Internal server error' });
// 	}
// });

// Route to fetch all games
router.get('/list', async (req, res) => {
	try {
		const gamesFound = await Game.find({}, { _id: 1, name: 1, genres: 1, platforms: 1, image: 1 });
		res.status(200).json(gamesFound);
	} catch (err) {
		console.error("List all games error:", err);
		res.status(500).json({ error: 'Internal server error' });
	}
});

export default router;
