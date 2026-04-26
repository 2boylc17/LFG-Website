import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../lib/api.js";
import useSearchPagination from "../lib/useSearchPagination.js";
import { groupMatchesQuery } from "../lib/queryMatchers.js";

export default function ViewGroups() {
	const { gameSlug } = useParams();
	const gameName = decodeURIComponent(gameSlug || "").replace(/-/g, " ");
	const [groups, setGroups] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const pageSize = 6;
	const [selectedTag, setSelectedTag] = useState("");
	const [tagSearch, setTagSearch] = useState("");
	const [sortOrder, setSortOrder] = useState("newest");
	const {
		searchTerm,
		setSearchTerm,
		debouncedSearch,
		setCurrentPage,
		paginate
	} = useSearchPagination(groups, pageSize);

	useEffect(() => {
		setCurrentPage(1);
	}, [selectedTag, sortOrder, setCurrentPage]);

	const getGroupTags = (group) => [
		...(group.tags || []).map((tag) => String(tag || "").trim()),
		String(group.platform || "").trim(),
		String(group.experience || "").trim(),
		String(group.microphone || "").trim(),
		String(group.region || "").trim()
	].filter(Boolean);

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
				const res = await apiFetch(`/api/groups/list/${encodeURIComponent(gameName)}`);
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

	const searchQuery = debouncedSearch.trim().toLowerCase();

	// Premade tags come from structured fields; user tags come from free-form group.tags.
	const premadeTags = Array.from(new Set(groups.flatMap((group) => [
		String(group.platform || "").trim(),
		String(group.experience || "").trim(),
		String(group.microphone || "").trim(),
		String(group.region || "").trim(),
	]).filter(Boolean))).sort((a, b) => a.localeCompare(b));

	const userTags = Array.from(new Set(groups.flatMap((group) =>
		(group.tags || []).map((tag) => String(tag || "").trim())
	).filter(Boolean))).filter((tag) => !premadeTags.includes(tag)).sort((a, b) => a.localeCompare(b));

	const tagQuery = tagSearch.trim().toLowerCase();
	const visiblePremadeTags = premadeTags.filter((tag) => !tagQuery || tag === selectedTag || tag.toLowerCase().includes(tagQuery));
	const visibleUserTags = userTags.filter((tag) => !tagQuery || tag === selectedTag || tag.toLowerCase().includes(tagQuery));

	const filteredGroups = groups.filter((group) => {
		if (!groupMatchesQuery(group, searchQuery)) return false;
		if (!selectedTag) return true;
		return getGroupTags(group).includes(selectedTag);
	});

	const sortedGroups = [...filteredGroups].sort((a, b) => {
		if (sortOrder === "name-asc") return String(a.name || "").localeCompare(String(b.name || ""));
		if (sortOrder === "name-desc") return String(b.name || "").localeCompare(String(a.name || ""));
		const aTime = new Date(a.createdAt || 0).getTime();
		const bTime = new Date(b.createdAt || 0).getTime();
		return sortOrder === "oldest" ? aTime - bTime : bTime - aTime;
	});

	const { totalPages, safePage, pagedItems: pagedGroups } = paginate(sortedGroups);

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
				<div className="games-filters">
					<div className="games-page-size games-filter-block">
						<label htmlFor="groups-tag-filter">Filter tag</label>
						<input
							type="search"
							id="groups-tag-search"
							className="tag-search"
							value={tagSearch}
							onChange={(e) => setTagSearch(e.target.value)}
							placeholder="Search tags"
						/>
						<select
							id="groups-tag-filter"
							value={selectedTag}
							onChange={(e) => setSelectedTag(e.target.value)}
							className="games-select"
						>
							<option value="">All tags</option>
							{visiblePremadeTags.length > 0 && (
								<optgroup label="Filters">
									{visiblePremadeTags.map((tag) => (
										<option key={tag} value={tag}>{tag}</option>
									))}
								</optgroup>
							)}
							{visibleUserTags.length > 0 && (
								<optgroup label="Tags">
									{visibleUserTags.map((tag) => (
										<option key={tag} value={tag}>{tag}</option>
									))}
								</optgroup>
							)}
						</select>
					</div>
					<div className="games-page-size games-filter-block">
						<label htmlFor="groups-sort-order">Order</label>
						<select
							id="groups-sort-order"
							value={sortOrder}
							onChange={(e) => setSortOrder(e.target.value)}
							className="games-select"
						>
							<option value="newest">Newest first</option>
							<option value="oldest">Oldest first</option>
							<option value="name-asc">Name A-Z</option>
							<option value="name-desc">Name Z-A</option>
						</select>
					</div>
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
								Join Group
							</Link>
						</div>
					</div>
				))}
			</div>

			{!loading && !error && filteredGroups.length > 0 && (
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
