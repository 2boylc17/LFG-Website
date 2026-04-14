import express from 'express';
import db from '../db/connection.mjs';

const router = express.Router();

// Route to add a new game
router.post('/add', async (req, res) => {
	const { name, genre, platform } = req.body;
	if (!name || !genre || !platform) {
		return res.status(400).json({ error: 'Missing required fields' });
	}
	try {
		const result = await db.collection('games').insertOne({ name, genre, platform });
		res.status(201).json({ message: 'Game added', gameId: result.insertedId });
	} catch (err) {
		res.status(500).json({ error: 'Failed to add game' });
	}
});

// Route to get all games
router.get('/all', async (req, res) => {
	try {
		const games = await db.collection('games').find({}).toArray();
		res.json(games);
	} catch (err) {
		res.status(500).json({ error: 'Failed to retrieve games' });
	}
});

export default router;
