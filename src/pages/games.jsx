import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useSearchPagination from "../lib/useSearchPagination.js";
import { gameMatchesQuery } from "../lib/queryMatchers.js";

const getImageSrc = (image) => {
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

export default function GamesPage() {
	const navigate = useNavigate();
	const [games, setGames] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [pageSize, setPageSize] = useState(6);
	const {
		searchTerm,
		setSearchTerm,
		debouncedSearch,
		setCurrentPage,
		paginate
	} = useSearchPagination(games, pageSize);

	useEffect(() => {
		const fetchGames = async () => {
			try {
				setLoading(true);
				const res = await fetch('/api/games/list');
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

	const q = debouncedSearch.trim().toLowerCase();
	const filteredGames = games.filter((game) => gameMatchesQuery(game, q));
	const { totalPages, safePage, pagedItems: pagedGames } = paginate(filteredGames);

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
			</div>

			{loading && <p>Loading games...</p>}
			{error && <p className="error">{error}</p>}

			<div className="games-list">
				{!loading && !error && games.length === 0 && <p>No games found.</p>}
				{!loading && !error && games.length > 0 && filteredGames.length === 0 && <p>No games match your search.</p>}
				{!loading && !error && pagedGames.map((game) => {
					const imageSrc = getImageSrc(game.image);
					return (
						<div key={game._id} className="game-card">
							<div className="game-body" onClick={() => navigate(`/games/${game.name.trim().replace(/\s+/g, '-')}`)}
							>
								<h2>{game.name}</h2>
								{imageSrc
									? <img src={imageSrc} alt={`${game.name} cover`} className="game-image" />
									: <span>No image available</span>
								}
								<p>Genres: {game.genres.map((g) => g.name).join(", ")}</p>
								<p>Platforms: {game.platforms.map((p) => p.name).join(", ")}</p>
							</div>
						</div>
					);
				})}
			</div>

			{!loading && !error && filteredGames.length > 0 && (
				<div className="games-pagination">
					<button
						className="games-pagination-btn"
						onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
						disabled={safePage === 1}
					>
						&#8592; Prev
					</button>
					<span className="games-pagination-info">Page {safePage} of {totalPages}</span>
					<button
						className="games-pagination-btn"
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
