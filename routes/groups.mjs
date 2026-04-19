import express from 'express';
import mongoose from 'mongoose';
import Group from '../models/Group.mjs';
import Game from '../models/Game.mjs';
import { validateToken } from '../utils/validateToken.mjs';

const router = express.Router();

const normalizeTagArray = (value) => {
	if (!Array.isArray(value)) {
		return [];
	}

	return [...new Set(
		value
			.map((entry) => String(entry || '').trim())
			.filter((entry) => entry.length > 0)
	)];
};

// Route to add a new group
router.post('/add/:gameName', async (req, res) => {
	try {
		const {
			name,
			description,
			game,
			gameName,
			platform,
			experience,
			microphone,
			region,
			tags
		} = req.body;
		const gameNameFromPath = req.params.gameName ? decodeURIComponent(req.params.gameName).trim() : '';
		const resolvedGameName = gameNameFromPath || (gameName ? String(gameName).trim() : '');
		const decoded = validateToken(req.cookies?.jwt);
		const creatorId = decoded?.userId;

		if (!creatorId || !mongoose.Types.ObjectId.isValid(creatorId)) {
			return res.status(401).json({ message: 'Authentication required' });
		}

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

		const newGroup = await Group.create({
			name: String(name).trim(),
			description: description ? String(description).trim() : '',
			game: gameId,
			platform: platform ? String(platform).trim() : '',
			experience: experience ? String(experience).trim() : '',
			microphone: microphone ? String(microphone).trim() : '',
			region: region ? String(region).trim() : '',
			tags: normalizeTagArray(tags),
			members: [creatorId]
		});

		return res.status(201).json({ message: 'Group added successfully', groupId: newGroup._id });
	} catch (err) {
		console.error('Add group error:', err);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

// Route to join a group
router.post('/join/:groupId', async (req, res) => {
	try {
		const { groupId } = req.params;
		const decoded = validateToken(req.cookies?.jwt);
		const userId = decoded?.userId;

		if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
			return res.status(401).json({ message: 'Authentication required' });
		}

		if (!groupId || !mongoose.Types.ObjectId.isValid(groupId)) {
			return res.status(400).json({ message: 'Valid group id is required' });
		}

		const updatedGroup = await Group.findByIdAndUpdate(
			groupId,
			{ $addToSet: { members: userId } },
			{ new: true }
		)
			.populate('game', 'name')
			.populate('members', 'username');

		if (!updatedGroup) {
			return res.status(404).json({ message: 'Group not found' });
		}

		return res.status(200).json({ message: 'Joined group successfully', group: updatedGroup });
	} catch (err) {
		console.error('Join group error:', err);
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

// Route to fetch a single group by id
router.get('/id/:groupId', async (req, res) => {
	try {
		const { groupId } = req.params;

		if (!groupId || !mongoose.Types.ObjectId.isValid(groupId)) {
			return res.status(400).json({ message: 'Valid group id is required' });
		}

		const group = await Group.findById(groupId)
			.populate('game', 'name')
			.populate('members', 'username');

		if (!group) {
			return res.status(404).json({ message: 'Group not found' });
		}

		return res.status(200).json(group);
	} catch (err) {
		console.error('Fetch group by id error:', err);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

export default router