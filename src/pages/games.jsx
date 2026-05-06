import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api.js";
import useSearchPagination from "../lib/useSearchPagination.js";
import { gameMatchesQuery } from "../lib/queryMatchers.js";

const getImageSrc = (image) => {
	// Convert image data to base64 data URI
	if (!image?.data) return null;
	if (image.data.type === "Buffer" && image.data.data) {
		const bytes = new Uint8Array(image.data.data);
		let binary = "";
		for (let i = 0; i < bytes.length; i += 8192)
			binary += String.fromCharCode(...bytes.slice(i, i + 8192));
		return `data:${image.contentType};base64,${btoa(binary)}`;
	}
	if (typeof image.data === "string")
		return `data:${image.contentType};base64,${image.data}`;
	return null;
};

export default function Games() {
	// Games list & filters
	const [games, setGames] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [pageSize, setPageSize] = useState(6);
	const [tagSearch, setTagSearch] = useState("");
	const [selectedTag, setSelectedTag] = useState("");
	const [sortOrder, setSortOrder] = useState("name-asc");
	// Search & pagination hook
	const {
		searchTerm,
		setSearchTerm,
		debouncedSearch,
		setCurrentPage,
		paginate
	} = useSearchPagination(games, pageSize);

	useEffect(() => {
		setCurrentPage(1);
	}, [selectedTag, sortOrder, setCurrentPage]);

	// Fetch all games
	useEffect(() => {
		const fetchGames = async () => {
			try {
				setLoading(true);
				const res = await apiFetch('/api/games/list');
				if (!res.ok) {
					let message = "Failed to load games";
					try { const d = await res.json(); message = d.error || d.message || message; } catch {}
					throw new Error(message);
				}
				setGames(await res.json());
				setError(null);
			} catch (err) {
				setError(err.message);
			} finally {
				setLoading(false);
			}
		};
		fetchGames();
	}, []);

	const searchQuery = debouncedSearch.trim().toLowerCase();
	// Extract unique tags from games
	const availableTags = Array.from(new Set(games.flatMap((game) => [
		...(game.genres || []).map((genre) => String(genre?.name || "").trim()),
		...(game.platforms || []).map((platform) => String(platform?.name || "").trim())
	]).filter(Boolean))).sort((a, b) => a.localeCompare(b));

	// Filter tags based on search input
	const tagQuery = tagSearch.trim().toLowerCase();
	const visibleTags = availableTags.filter((tag) => {
		if (!tagQuery) return true;
		return tag === selectedTag || tag.toLowerCase().includes(tagQuery);
	});

	// Apply search and tag filters
	const filteredGames = games.filter((game) => {
		if (!gameMatchesQuery(game, searchQuery)) return false;
		if (!selectedTag) return true;
		const genreTags = (game.genres || []).map((genre) => String(genre?.name || "").trim());
		const platformTags = (game.platforms || []).map((platform) => String(platform?.name || "").trim());
		return [...genreTags, ...platformTags].includes(selectedTag);
	});

	// Sort games by name order
	const sortedGames = [...filteredGames].sort((a, b) => {
		const nameCompare = String(a.name || "").localeCompare(String(b.name || ""));
		return sortOrder === "name-desc" ? -nameCompare : nameCompare;
	});

	const { totalPages, safePage, pagedItems: pagedGames } = paginate(sortedGames);

	return (
		<div className="page">
			<div className="games-header">
				<h1>Games</h1>
				<div className="games-search-wrap">
					<input
						type="search"
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						placeholder="Search games, genres, or platforms"
						className="games-search-input"
						aria-label="Search games"
					/>
					{searchTerm && (
						<button className="games-search-clear" onClick={() => setSearchTerm("")} aria-label="Clear search" type="button">
							&times;
						</button>
					)}
				</div>
				<div className="games-page-size">
					<label htmlFor="page-size">Games per page</label>
					<select id="page-size" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }} className="games-select">
						<option value={6}>6</option>
						<option value={9}>9</option>
						<option value={12}>12</option>
					</select>
				</div>
				<div className="games-filters">
					<div className="games-page-size games-filter-block">
						<label htmlFor="games-tag-filter">Filter tag</label>
						<input
							type="search"
							id="games-tag-search"
							className="tag-search"
							value={tagSearch}
							onChange={(e) => setTagSearch(e.target.value)}
							placeholder="Search tags"
							/* WCAG 3.3.2 Labels or Instructions: give the tag-search field a programmatic name beyond placeholder text. */
							aria-label="Search available tags"
						/>
						<select
							id="games-tag-filter"
							value={selectedTag}
							onChange={(e) => setSelectedTag(e.target.value)}
							className="games-select"
						>
							<option value="">All tags</option>
							{visibleTags.map((tag) => (
								<option key={tag} value={tag}>{tag}</option>
							))}
						</select>
					</div>
					<div className="games-page-size games-filter-block">
						<label htmlFor="games-sort-order">Order</label>
						<select
							id="games-sort-order"
							value={sortOrder}
							onChange={(e) => setSortOrder(e.target.value)}
							className="games-select"
						>
							<option value="name-asc">Name A-Z</option>
							<option value="name-desc">Name Z-A</option>
						</select>
					</div>
				</div>
			</div>

			{/* WCAG 4.1.3 Status Messages: announce loading progress without changing focus. */}
			{loading && <p role="status" aria-live="polite">Loading games...</p>}
			{/* WCAG 3.3.1 Error Identification: expose fetch failures as alert content so errors are announced immediately. */}
			{error && <p className="error" role="alert">{error}</p>}

			<div className="games-list">
				{/* WCAG 4.1.3 Status Messages: announce empty-result states so filtered content changes are conveyed to assistive tech. */}
				{!loading && !error && games.length === 0 && <p role="status" aria-live="polite">No games found.</p>}
				{!loading && !error && games.length > 0 && filteredGames.length === 0 && <p role="status" aria-live="polite">No games match your search.</p>}
				{!loading && !error && pagedGames.map((game) => {
					const imageSrc = getImageSrc(game.image);
					return (
						<div key={game._id} className="game-card">
							{/* WCAG 2.4.4 Link Purpose and 4.1.2 Name, Role, Value: make the whole game card a semantic link with an explicit destination name. */}
							<Link className="game-body" to={`/games/${game.name.trim().replace(/\s+/g, '-')}`} aria-label={`View groups for ${game.name}`}>
								<h2>{game.name}</h2>
								{imageSrc
									? <img src={imageSrc} alt={`${game.name} cover`} className="game-image" />
									/* WCAG 1.1.1 Non-text Content: provide a spoken replacement when a game card has no image. */
									: <span aria-label="No game image available">No image available</span>
								}
								<p>Genres: {game.genres.map((genre) => genre.name).join(", ")}</p>
								<p>Platforms: {game.platforms.map((platform) => platform.name).join(", ")}</p>
							</Link>
						</div>
					);
				})}
			</div>

			{!loading && !error && filteredGames.length > 0 && (
				<div className="games-pagination">
					<button
						className="pg-prev"
						onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
						disabled={safePage === 1}
					>
						&#8592; Prev
					</button>
					<span className="games-pagination-info">Page {safePage} of {totalPages}</span>
					<button
						className="pg-next"
						onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
						disabled={safePage === totalPages}
					>
						Next &#8594;
					</button>
				</div>
			)}
		</div>
	);
}
