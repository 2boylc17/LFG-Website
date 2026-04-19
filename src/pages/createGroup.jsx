import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

export default function CreateGroup() {
	const { gameSlug } = useParams();
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [platform, setPlatform] = useState("");
	const [tags, setTags] = useState({ experience: "", microphone: "", region: "" });
	const [extraTags, setExtraTags] = useState([]);
	const [extraTagInput, setExtraTagInput] = useState("");
	const [message, setMessage] = useState("");
	const [selectedGame, setSelectedGame] = useState(null);
	const [loadingGame, setLoadingGame] = useState(true);
	const [gameError, setGameError] = useState("");

	const selectedGameName = decodeURIComponent(gameSlug || "").replace(/-/g, " ").trim();

	const availablePlatforms = useMemo(() => {
		if (!selectedGame || !Array.isArray(selectedGame.platforms)) return [];

		return selectedGame.platforms
			.map((platformValue) => {
				if (typeof platformValue === "string") return platformValue.trim();
				if (platformValue && typeof platformValue === "object") {
					return String(platformValue.name || "").trim();
				}
				return "";
			})
			.filter((platformName) => platformName.length > 0);
	}, [selectedGame]);

	const gameImageSrc = useMemo(() => {
		if (!selectedGame?.image?.data || !selectedGame?.image?.contentType) {
			return null;
		}

		if (
			selectedGame.image.data.type === "Buffer" &&
			Array.isArray(selectedGame.image.data.data)
		) {
			const uint8Array = new Uint8Array(selectedGame.image.data.data);
			let binary = "";
			const chunkSize = 8192;

			for (let i = 0; i < uint8Array.length; i += chunkSize) {
				binary += String.fromCharCode(...uint8Array.slice(i, i + chunkSize));
			}

			return `data:${selectedGame.image.contentType};base64,${btoa(binary)}`;
		}

		if (typeof selectedGame.image.data === "string") {
			return `data:${selectedGame.image.contentType};base64,${selectedGame.image.data}`;
		}

		return null;
	}, [selectedGame]);

	useEffect(() => {
		const fetchGameDetails = async () => {
			if (!selectedGameName) {
				setLoadingGame(false);
				setGameError("Missing game context. Open this page from a game details page.");
				return;
			}

			try {
				setLoadingGame(true);
				const response = await fetch('/api/games/list');
				if (!response.ok) {
					throw new Error('Failed to load games');
				}

				const games = await response.json();
				const matchedGame = Array.isArray(games)
					? games.find((game) => String(game?.name || "").trim().toLowerCase() === selectedGameName.toLowerCase())
					: null;

				if (!matchedGame) {
					throw new Error('Game not found');
				}

				setSelectedGame(matchedGame);
				setGameError("");
			} catch (error) {
				setSelectedGame(null);
				setGameError(error.message || 'Failed to load game details');
			} finally {
				setLoadingGame(false);
			}
		};

		fetchGameDetails();
	}, [selectedGameName]);

	useEffect(() => {
		if (!platform && availablePlatforms.length > 0) {
			setPlatform(availablePlatforms[0]);
		}
	}, [availablePlatforms, platform]);

	const tagSections = [
	{
		key: "experience",
		label: "Experience",
		options: ["No Experience Required", "Some Experience Required", "Experienced Players Only"]
	},
	{
		key: "microphone",
		label: "Microphone",
		options: ["No Mic", "Mic Optional", "Mic Required"]
	},
	{
		key: "region",
		label: "Region",
		options: ["North America", "South America", "Europe", "Asia", "Oceania", "Africa", "Middle East"]
	}
	];

	const setTag = (sectionKey, value) => {
		setTags((prev) => ({ ...prev, [sectionKey]: value }));
	};

	const addExtraTag = () => {
		const value = extraTagInput.trim();
		if (!value || extraTags.includes(value)) return;
		setExtraTags((prev) => [...prev, value]);
		setExtraTagInput("");
	};

	const removeExtraTag = (value) => {
		setExtraTags((prev) => prev.filter((t) => t !== value));
	};

	const handleExtraTagKeyDown = (e) => {
		if (e.key === "Enter") {
			e.preventDefault();
			addExtraTag();
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setMessage("");

		const body = {
			name: name.trim(),
			description: description.trim(),
			gameName: selectedGameName,
			platform: platform.trim(),
			experience: tags.experience.trim(),
			microphone: tags.microphone.trim(),
			region: tags.region.trim(),
			tags: extraTags
		};

		try {
			if (!selectedGameName) {
				throw new Error('Missing game context. Open this page from a game details page.');
			}

			if (!platform.trim()) {
				throw new Error('Select a platform before creating a group.');
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
			setTags({ experience: "", microphone: "", region: "" });
			setExtraTags([]);
			setExtraTagInput("");
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
				{loadingGame ? <p>Loading game details...</p> : null}
				{gameError ? <p className="error">{gameError}</p> : null}
				{!loadingGame && !gameError ? (
					<div className="create-group-game-media">
						{gameImageSrc ? (
							<img
								src={gameImageSrc}
								alt={`${selectedGameName} cover`}
								className="create-group-game-image"
							/>
						) : (
							<div className="create-group-game-image-fallback">No image available</div>
						)}
					</div>
				) : null}
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
					<select
						value={platform}
						onChange={(e) => setPlatform(e.target.value)}
						required
						disabled={availablePlatforms.length === 0}
					>
						{availablePlatforms.length === 0 ? (
							<option value="">No platforms available</option>
						) : null}
						{availablePlatforms.map((platformName) => (
							<option key={platformName} value={platformName}>{platformName}</option>
						))}
					</select>
				</div>
				{tagSections.map((section) => (
					<div className="create-group-field" key={section.key}>
						<label>{section.label}:</label>
						<div className="create-group-tag-input-row">
							<select
								value={tags[section.key]}
								onChange={(e) => setTag(section.key, e.target.value)}
							>
								<option value="">Select {section.label.toLowerCase()}...</option>
								{section.options.map((opt) => (
									<option key={opt} value={opt}>{opt}</option>
								))}
							</select>
						</div>
					</div>
				))}
				<div className="create-group-field">
					<label>Tags:</label>
					<div className="create-group-tag-input-row">
						<input
							type="text"
							value={extraTagInput}
							onChange={(e) => setExtraTagInput(e.target.value)}
							onKeyDown={handleExtraTagKeyDown}
							placeholder="Add a tag"
						/>
						<button
							type="button"
							className="create-group-tag-add"
							onClick={addExtraTag}
						>
							Add
						</button>
					</div>
					{extraTags.length > 0 ? (
						<div className="create-group-tag-list">
							{extraTags.map((tagValue) => (
								<button
									key={tagValue}
									type="button"
									className="create-group-tag-chip"
									onClick={() => removeExtraTag(tagValue)}
								>
									{tagValue} x
								</button>
							))}
						</div>
					) : (
						<p className="create-group-tag-empty">No tags added.</p>
					)}
				</div>
				<button className="create-group-submit" type="submit">Add Group</button>
			</form>
			{message && <p className="create-group-message">{message}</p>}
			</div>
		</div>
	);
}
