import React, { useState } from "react";
import { useParams } from "react-router-dom";

export default function CreateGroup() {
	const { gameSlug } = useParams();
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [platform, setPlatform] = useState("");
	const [message, setMessage] = useState("");

	const selectedGameName = decodeURIComponent(gameSlug || "").replace(/-/g, " ").trim();

	const handleSubmit = async (e) => {
		e.preventDefault();
		setMessage("");

		const body = {
			name: name.trim(),
			description: description.trim(),
			gameName: selectedGameName,
			platform: platform.trim()
		};

		try {
			if (!selectedGameName) {
				throw new Error('Missing game context. Open this page from a game details page.');
			}

			const response = await fetch(`/api/groups/add/${encodeURIComponent(selectedGameName)}`, {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});

			const data = await response.json();
			if (!response.ok) {
				throw new Error(data.error || data.message || 'Add group failed');
			}

			setName("");
			setDescription("");
			setPlatform("");
			setMessage('Group added successfully');
		} catch (error) {
			setMessage(`Error: ${error.message}`);
		}
	};

	return (
		<div className="page create-group-page">
			<div className="create-group-shell">
				<h2>Create a New Group</h2>
				<p className="create-group-game">Game: {selectedGameName || 'No game selected'}</p>
				<form className="create-group-form" onSubmit={handleSubmit}>
				<div className="create-group-field">
					<label>Name:</label>
					<input
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
						required
					/>
				</div>
				<div className="create-group-field">
					<label>Description:</label>
					<input
						type="text"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
					/>
				</div>
				<div className="create-group-field">
					<label>Platform:</label>
					<input
						type="text"
						value={platform}
						onChange={(e) => setPlatform(e.target.value)}
					/>
				</div>
				<button className="create-group-submit" type="submit">Add Group</button>
			</form>
			{message && <p className="create-group-message">{message}</p>}
			</div>
		</div>
	);
}
