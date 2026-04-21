const toLower = (value) => String(value || "").toLowerCase();

export const gameMatchesQuery = (game, query) => {
	if (!query) return true;
	const name = toLower(game.name);
	const genres = (game.genres || []).map((g) => g?.name || "").join(" ").toLowerCase();
	const platforms = (game.platforms || []).map((p) => p?.name || "").join(" ").toLowerCase();
	return name.includes(query) || genres.includes(query) || platforms.includes(query);
};

export const groupMatchesQuery = (group, query) => {
	if (!query) return true;
	const name = toLower(group.name);
	const desc = toLower(group.description);
	const platform = toLower(group.platform);
	const tags = (group.tags || []).join(" ").toLowerCase();
	return name.includes(query) || desc.includes(query) || platform.includes(query) || tags.includes(query);
};