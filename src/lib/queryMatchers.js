// Convert value to searchable lowercase string
const toText = (value) => String(value || "").toLowerCase();

// Match game by name, genres, or platforms
export const gameMatchesQuery = (game, query) => {
	if (!query) return true;
	const name = toText(game.name);
	const genres = (game.genres || []).map((g) => g?.name || "").join(" ").toLowerCase();
	const platforms = (game.platforms || []).map((p) => p?.name || "").join(" ").toLowerCase();
	return name.includes(query) || genres.includes(query) || platforms.includes(query);
};

// Match group by name, description, platform, or tags
export const groupMatchesQuery = (group, query) => {
	if (!query) return true;
	const name = toText(group.name);
	const description = toText(group.description);
	const platform = toText(group.platform);
	const tags = (group.tags || []).join(" ").toLowerCase();
	return name.includes(query) || description.includes(query) || platform.includes(query) || tags.includes(query);
};