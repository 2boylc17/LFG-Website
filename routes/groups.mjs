import express from 'express';
import mongoose from 'mongoose';
import Group from '../models/Group.mjs';
import Game from '../models/Game.mjs';
import { validateToken } from '../utils/validateToken.mjs';

const router = express.Router();
const GROUP_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const isValidId = (value) => mongoose.Types.ObjectId.isValid(value);
const getAuthUserId = (req) => validateToken(req.cookies?.jwt)?.userId;

const ensureOwnerAssigned = async (groupId) => {
	const group = await Group.findById(groupId);
	if (!group) return null;
	if (group.owner || !Array.isArray(group.members) || group.members.length === 0) return group;

	group.owner = group.members[0];
	await group.save();
	return group;
};

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

const getActiveGroupFilter = (gameId) => {
	const filter = {
		createdAt: { $gt: new Date(Date.now() - GROUP_MAX_AGE_MS) },
		'members.0': { $exists: true }
	};

	if (gameId) {
		filter.game = gameId;
	}

	return filter;
};

const deleteInactiveGroups = async (gameId) => {
	const staleFilter = {
		$or: [
			{ createdAt: { $lte: new Date(Date.now() - GROUP_MAX_AGE_MS) } },
			{ members: { $size: 0 } }
		]
	};

	if (gameId) {
		staleFilter.game = gameId;
	}

	await Group.deleteMany(staleFilter);
};

const isInactiveGroup = (group) => {
	if (!group) return true;
	const createdAt = group.createdAt ? new Date(group.createdAt).getTime() : 0;
	const isExpired = !createdAt || (Date.now() - createdAt) >= GROUP_MAX_AGE_MS;
	const hasNoMembers = !Array.isArray(group.members) || group.members.length === 0;
	return isExpired || hasNoMembers;
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
		const creatorId = getAuthUserId(req);
		const normalizedName = String(name || '').trim();
		const normalizedDescription = String(description || '').trim();
		const normalizedPlatform = String(platform || '').trim();
		const normalizedExperience = String(experience || '').trim();
		const normalizedMicrophone = String(microphone || '').trim();
		const normalizedRegion = String(region || '').trim();

		if (!creatorId || !isValidId(creatorId)) {
			return res.status(401).json({ message: 'Authentication required' });
		}

		if (!normalizedName) {
			return res.status(400).json({ message: 'Group name is required' });
		}

		if (!normalizedDescription || !normalizedPlatform || !normalizedExperience || !normalizedMicrophone || !normalizedRegion) {
			return res.status(400).json({ message: 'Description, platform, experience, microphone, and region are required' });
		}

		let gameId = null;
		if (game && isValidId(game)) {
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
			name: normalizedName,
			description: normalizedDescription,
			game: gameId,
			platform: normalizedPlatform,
			experience: normalizedExperience,
			microphone: normalizedMicrophone,
			region: normalizedRegion,
			tags: normalizeTagArray(tags),
			owner: creatorId,
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
		const userId = getAuthUserId(req);

		if (!userId || !isValidId(userId)) {
			return res.status(401).json({ message: 'Authentication required' });
		}

		if (!groupId || !isValidId(groupId)) {
			return res.status(400).json({ message: 'Valid group id is required' });
		}

		const existingGroup = await Group.findById(groupId);
		if (!existingGroup) {
			return res.status(404).json({ message: 'Group not found' });
		}

		if (isInactiveGroup(existingGroup)) {
			await Group.deleteOne({ _id: groupId });
			return res.status(404).json({ message: 'Group is no longer available' });
		}

		const updatedGroup = await Group.findByIdAndUpdate(
			groupId,
			{ $addToSet: { members: userId } },
			{ new: true }
		)
			.populate('owner', 'username')
			.populate('game', 'name')
			.populate('members', 'username');

		if (!updatedGroup) {
			return res.status(404).json({ message: 'Group not found' });
		}

		if (!updatedGroup.owner && Array.isArray(updatedGroup.members) && updatedGroup.members.length > 0) {
			updatedGroup.owner = updatedGroup.members[0]._id;
			await updatedGroup.save();
			await updatedGroup.populate('owner', 'username');
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

		await deleteInactiveGroups(game._id);

		const ownerlessGroups = await Group.find({ ...getActiveGroupFilter(game._id), owner: { $exists: false } }, { _id: 1 });
		for (const ownerlessGroup of ownerlessGroups) {
			await ensureOwnerAssigned(ownerlessGroup._id);
		}

		const groups = await Group.find(getActiveGroupFilter(game._id))
			.populate('owner', 'username')
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

		if (!groupId || !isValidId(groupId)) {
			return res.status(400).json({ message: 'Valid group id is required' });
		}

		await ensureOwnerAssigned(groupId);

		const group = await Group.findById(groupId)
			.populate('owner', 'username')
			.populate('game', 'name')
			.populate('members', 'username');

		if (!group) {
			return res.status(404).json({ message: 'Group not found' });
		}

		if (isInactiveGroup(group)) {
			await Group.deleteOne({ _id: groupId });
			return res.status(404).json({ message: 'Group is no longer available' });
		}

		return res.status(200).json(group);
	} catch (err) {
		console.error('Fetch group by id error:', err);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

router.post('/remove-member/:groupId/:memberId', async (req, res) => {
	try {
		const { groupId, memberId } = req.params;
		const requesterId = getAuthUserId(req);

		if (!requesterId || !isValidId(requesterId)) {
			return res.status(401).json({ message: 'Authentication required' });
		}

		if (!groupId || !isValidId(groupId) || !memberId || !isValidId(memberId)) {
			return res.status(400).json({ message: 'Valid group id and member id are required' });
		}

		const group = await Group.findById(groupId);
		if (!group) {
			return res.status(404).json({ message: 'Group not found' });
		}

		if (isInactiveGroup(group)) {
			await Group.deleteOne({ _id: groupId });
			return res.status(404).json({ message: 'Group is no longer available' });
		}

		if (!group.owner || String(group.owner) !== String(requesterId)) {
			return res.status(403).json({ message: 'Only the group owner can remove members' });
		}

		if (String(memberId) === String(group.owner)) {
			return res.status(400).json({ message: 'Owner cannot remove themselves from this action' });
		}

		const hasMember = Array.isArray(group.members) && group.members.some((id) => String(id) === String(memberId));
		if (!hasMember) {
			return res.status(404).json({ message: 'Member not found in group' });
		}

		const updatedGroup = await Group.findByIdAndUpdate(
			groupId,
			{ $pull: { members: memberId } },
			{ new: true }
		)
			.populate('owner', 'username')
			.populate('game', 'name')
			.populate('members', 'username');

		if (!updatedGroup) {
			return res.status(404).json({ message: 'Group not found' });
		}

		const io = req.app.get('io');
		io?.to(`group:${groupId}`).emit('group:members:updated', {
			groupId: String(groupId),
			group: updatedGroup
		});

		return res.status(200).json({ message: 'Member removed', group: updatedGroup });
	} catch (err) {
		console.error('Remove member error:', err);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

router.post('/leave/:groupId', async (req, res) => {
	try {
		const { groupId } = req.params;
		const userId = getAuthUserId(req);

		if (!userId || !isValidId(userId)) {
			return res.status(401).json({ message: 'Authentication required' });
		}

		if (!groupId || !isValidId(groupId)) {
			return res.status(400).json({ message: 'Valid group id is required' });
		}

		const group = await Group.findById(groupId);
		if (!group) {
			return res.status(404).json({ message: 'Group not found' });
		}

		const isMember = Array.isArray(group.members) && group.members.some((memberId) => String(memberId) === String(userId));
		if (!isMember) {
			return res.status(400).json({ message: 'You are not a member of this group' });
		}

		const updatedGroup = await Group.findByIdAndUpdate(
			groupId,
			{ $pull: { members: userId } },
			{ new: true }
		)
			.populate('owner', 'username')
			.populate('game', 'name')
			.populate('members', 'username');

		if (!updatedGroup || !Array.isArray(updatedGroup.members) || updatedGroup.members.length === 0) {
			await Group.deleteOne({ _id: groupId });
			const io = req.app.get('io');
			io?.to(`group:${groupId}`).emit('group:deleted', {
				groupId: String(groupId),
				message: 'Group is no longer available'
			});
			return res.status(200).json({ message: 'Left group successfully', group: null });
		}

		const ownerId = String(updatedGroup.owner?._id || updatedGroup.owner || '');
		if (!ownerId || ownerId === String(userId)) {
			updatedGroup.owner = updatedGroup.members[0]._id;
			await updatedGroup.save();
			await updatedGroup.populate('owner', 'username');
		}

		const io = req.app.get('io');
		io?.to(`group:${groupId}`).emit('group:members:updated', {
			groupId: String(groupId),
			group: updatedGroup
		});

		return res.status(200).json({ message: 'Left group successfully', group: updatedGroup });
	} catch (err) {
		console.error('Leave group error:', err);
		return res.status(500).json({ error: 'Internal server error' });
	}
});

export default router