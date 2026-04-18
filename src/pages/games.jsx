import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
//import Link from "react-router-dom";

export default function GamesPage() {
	const navigate = useNavigate();
	const [games, setGames] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const [pageSize, setPageSize] = useState(6);
	const [currentPage, setCurrentPage] = useState(1);

	const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
	const [nextDisabled, setNextDisabled] = useState(false);

	const fetchGames = async (page, size) => {
		try {
			setLoading(true);
			const response = await fetch('/api/games/list');
			if (!response.ok) {
				let message = "Failed to load games";
				try {
					const errData = await response.json();
					message = errData.error || errData.message || message;
				} catch {
					// Keep default message when body is not JSON.
				}
				throw new Error(message);
			}
			console.log(response);
			const data = await response.json();
			setGames(data);
			setError(null);
		} catch (error) {
			setError(error.message);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchGames(currentPage, pageSize);
	}, [currentPage, pageSize]);

	const handlePageChange = async (nextPage, size) => {
		try {
			const response = await fetch('/api/games/list');
			if (!response.ok) return false;
			const data = await response.json();

			if (Array.isArray(data)) {
				const nextPageStartIndex = (nextPage - 1) * size;
				return data.length > nextPageStartIndex;
			}

			return (data.games || []).length > 0;
		} catch (error) {
			console.error("Error checking next page:", error);
			return false;
		}
	};

	useEffect(() => {
		setNextDisabled(false);
	}, [currentPage, pageSize]);

	const getGameSlug = (gameName) => {
		return gameName.trim().replace(/\s+/g, '-');
	};


       return (
	       <div className="page">
		       <div className="games-header">
					<h1>Games</h1>
					<div className="games-page-size">
						<label htmlFor="page-size">Games per page</label>
						<select
							id="page-size"
							value={pageSize}
							onChange={(e) => {
								setPageSize(Number(e.target.value));
							}}
							className="games-select">
							<option value={6}>6</option>
							<option value={9}>9</option>
							<option value={12}>12</option>
						</select>
					</div>
			   </div>
				{loading && (
					<p>Loading games...</p>
				)}

				{error && (
					<p className="error">{error}</p>
				)}

				<div className="games-list">
					{!loading && !error && games.length === 0 && (
						<p>No games found.</p>
					)}
					{!loading && !error && games.map((game) => {
						let imageSrc = null;
						if (game.image?.data) {
							if (
								game.image.data.type === "Buffer" &&
								game.image.data.data
							) {
								const uint8Array = new Uint8Array(game.image.data.data);
								let binary = "";
								const chunk = 8192;
								for (let i = 0; i < uint8Array.length; i += chunk) {
									binary += String.fromCharCode(
										...uint8Array.slice(i, i + chunk)
									);
								}
								imageSrc = `data:${game.image.contentType};base64,${btoa(binary)}`;
							} else if (typeof game.image.data === "string") {
								imageSrc = `data:${game.image.contentType};base64,${game.image.data}`;
							}
						}

						return (
						<div key={game._id} className="game-card">
							<div className="game-body" onClick={() => {
								navigate(`/games/${getGameSlug(game.name)}`);
							}}>
								<h2>{game.name}</h2>
								{imageSrc ? (
								<img
								src={imageSrc}
								alt={`${game.name} cover`}
								className="game-image"
								/>
							) : (
								<span>
								No image available
								</span>
							)}
								<p>Genres: {game.genres.map(genre => genre.name).join(", ")}</p>
								<p>Platforms: {game.platforms.map(platform => platform.name).join(", ")}</p>
							</div>
						</div>
					)}
				)}
				</div>
	       </div>
       );
}
