import express from 'express';
import mongoose from 'mongoose';
import Group from '../models/Group.mjs';
import Game from '../models/Game.mjs';

const router = express.Router();

// Route to add a new group
router.post('/add/:gameName?', async (req, res) => {
	try {
		const { name, description, game, gameName, platform, members } = req.body;
		const gameNameFromPath = req.params.gameName ? decodeURIComponent(req.params.gameName).trim() : '';
		const resolvedGameName = gameNameFromPath || (gameName ? String(gameName).trim() : '');

		if (!name || !String(name).trim()) {
			return res.status(400).json({ message: 'Group name is required' });
		}

		let gameId = null;
		if (game && mongoose.Types.ObjectId.isValid(game)) {
			gameId = game;
		} else if (resolvedGameName) {
			const matchedGame = await Game.findOne({ name: resolvedGameName }, { _id: 1 });
			if (!matchedGame) {
				return res.status(404).json({ message: 'Game not found' });
			}
			gameId = matchedGame._id;
		} else {
			return res.status(400).json({ message: 'A valid game id or game name is required' });
		}

		const normalizedMembers = Array.isArray(members) ? members : [];
		const invalidMemberId = normalizedMembers.find((memberId) => !mongoose.Types.ObjectId.isValid(memberId));
		if (invalidMemberId) {
			return res.status(400).json({ message: 'All member ids must be valid ObjectIds' });
		}

		const newGroup = await Group.create({
			name: String(name).trim(),
			description: description ? String(description).trim() : '',
			game: gameId,
			platform: platform ? String(platform).trim() : '',
			members: normalizedMembers
		});

		return res.status(201).json({ message: 'Group added successfully', groupId: newGroup._id });
	} catch (err) {
		console.error('Add group error:', err);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

// Route to fetch all groups by game name
router.get('/list/:gameName', async (req, res) => {
	try {
		const gameName = req.params.gameName?.trim();

		if (!gameName) {
			return res.status(400).json({ message: 'Game name is required' });
		}

		const game = await Game.findOne({ name: gameName }, { _id: 1, name: 1 });
		if (!game) {
			return res.status(404).json({ message: 'Game not found' });
		}

		const groups = await Group.find({ game: game._id })
			.populate('game', 'name')
			.populate('members', 'username')
			.sort({ createdAt: -1 });

		return res.status(200).json(groups);
	} catch (err) {
		console.error('List groups by game name error:', err);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

export default router