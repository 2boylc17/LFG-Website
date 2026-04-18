import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function GameDetails() {
	const { gameSlug } = useParams();
	const [groups, setGroups] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const gameName = decodeURIComponent(gameSlug || "").replace(/-/g, " ");

	const fetchGroups = async () => {
		try {
			setLoading(true);
			const response = await fetch(`/api/groups/list/${encodeURIComponent(gameName)}`);
			if (!response.ok) {
				let message = "Failed to load groups";
				try {
					const errData = await response.json();
					message = errData.error || errData.message || message;
				} catch {
					// Keep default message when body is not JSON.
				}
				throw new Error(message);
			}

			const data = await response.json();
			setGroups(Array.isArray(data) ? data : []);
			setError(null);
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		window.scrollTo({ top: 0, behavior: "auto" });
	}, [gameSlug]);

	useEffect(() => {
		if (!gameName) {
			setGroups([]);
			setLoading(false);
			setError("Invalid game name");
			return;
		}

		fetchGroups();
	}, [gameName]);

	return (
		<div className="page">
			<div className="games-header">
				<h1>{gameName} Groups</h1>
			</div>

			{loading && <p>Loading groups...</p>}
			{error && <p className="error">{error}</p>}

			<div className="games-list">
				{!loading && !error && groups.length === 0 && <p>No groups found.</p>}
				{!loading && !error && groups.map((group) => (
					<div key={group._id} className="game-card">
						<div className="game-body">
							<h2>{group.name}</h2>
							<p>{group.description || "No description provided"}</p>
							<p>Platform: {group.platform || "Not specified"}</p>
							<p>
								Members: {Array.isArray(group.members) ? group.members.length : 0}
							</p>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
