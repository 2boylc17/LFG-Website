import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

export default function GameDetails() {
	const { gameSlug } = useParams();
	const gameName = decodeURIComponent(gameSlug || "").replace(/-/g, " ");
	const [groups, setGroups] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [pageSize] = useState(6);
	const [currentPage, setCurrentPage] = useState(1);

	useEffect(() => {
		const timer = setTimeout(() => { setDebouncedSearch(searchTerm); setCurrentPage(1); }, 300);
		return () => clearTimeout(timer);
	}, [searchTerm]);

	useEffect(() => {
		window.scrollTo({ top: 0, behavior: "auto" });
		if (!gameName) {
			setError("Invalid game name");
			setLoading(false);
			return;
		}
		const fetchGroups = async () => {
			try {
				setLoading(true);
				const res = await fetch(`/api/groups/list/${encodeURIComponent(gameName)}`);
				if (!res.ok) {
					let message = "Failed to load groups";
					try { const d = await res.json(); message = d.error || d.message || message; } catch {}
					throw new Error(message);
				}
				const data = await res.json();
				setGroups(Array.isArray(data) ? data : []);
				setError(null);
			} catch (err) {
				setError(err.message);
			} finally {
				setLoading(false);
			}
		};
		fetchGroups();
	}, [gameSlug]);

	const q = debouncedSearch.trim().toLowerCase();
	const filteredGroups = !q ? groups : groups.filter((group) => {
		const name = (group.name || "").toLowerCase();
		const desc = (group.description || "").toLowerCase();
		const platform = (group.platform || "").toLowerCase();
		const tags = (group.tags || []).join(" ").toLowerCase();
		return name.includes(q) || desc.includes(q) || platform.includes(q) || tags.includes(q);
	});

	const totalPages = Math.max(1, Math.ceil(filteredGroups.length / pageSize));
	const safePage = Math.min(currentPage, totalPages);
	const pagedGroups = filteredGroups.slice((safePage - 1) * pageSize, safePage * pageSize);

	return (
		<div className="page">
			<div className="games-header">
				<h1>{gameName} Groups</h1>
				<div className="games-search-wrap">
					<input
						type="search"
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						placeholder="Search groups, tags, or platform"
						className="games-search-input"
						aria-label="Search groups"
					/>
					{searchTerm && (
						<button
							className="games-search-clear"
							onClick={() => setSearchTerm("")}
							aria-label="Clear search"
							type="button"
						>
							&times;
						</button>
					)}
				</div>
				<Link className="create-group-link" to={`/createGroup/${encodeURIComponent(gameSlug || "")}`}>
					Create Group For This Game
				</Link>
			</div>

			{loading && <p>Loading groups...</p>}
			{error && <p className="error">{error}</p>}

			<div className="games-list">
				{!loading && !error && groups.length === 0 && <p>No groups found.</p>}
				{!loading && !error && groups.length > 0 && filteredGroups.length === 0 && <p>No groups match your search.</p>}
				{!loading && !error && pagedGroups.map((group) => (
					<div key={group._id} className="game-card">
						<div className="game-body">
							<h2>{group.name}</h2>
							<p>{group.description || "No description provided"}</p>
							<p>Platform: {group.platform || "Not specified"}</p>
							<p>Members: {Array.isArray(group.members) ? group.members.length : 0}</p>
							<Link className="view-group-link" to={`/group/${group._id}`}>
								Open Group
							</Link>
						</div>
					</div>
				))}
			</div>

			{!loading && !error && filteredGroups.length > 0 && (
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
