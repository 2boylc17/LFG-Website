import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";

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

const normalizePlatformName = (platformValue) => {
	if (typeof platformValue === "string") return platformValue.trim();
	if (platformValue && typeof platformValue === "object") return String(platformValue.name || "").trim();
	return "";
};

const getImageSrc = (image) => {
	if (!image?.data || !image?.contentType) return null;

	if (image.data.type === "Buffer" && Array.isArray(image.data.data)) {
		const uint8Array = new Uint8Array(image.data.data);
		let binary = "";
		for (let i = 0; i < uint8Array.length; i += 8192) {
			binary += String.fromCharCode(...uint8Array.slice(i, i + 8192));
		}
		return `data:${image.contentType};base64,${btoa(binary)}`;
	}

	if (typeof image.data === "string") {
		return `data:${image.contentType};base64,${image.data}`;
	}

	return null;
};

export default function CreateGroup() {
	const { gameSlug } = useParams();
	const navigate = useNavigate();
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [platform, setPlatform] = useState("");
	const [joinRequirement, setJoinRequirement] = useState("auto");
	const [joinPassword, setJoinPassword] = useState("");
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
		return selectedGame.platforms.map(normalizePlatformName).filter(Boolean);
	}, [selectedGame]);

	const gameImageSrc = useMemo(() => getImageSrc(selectedGame?.image), [selectedGame]);

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
			joinRequirement,
			joinPassword: joinRequirement === "password" ? joinPassword.trim() : "",
			tags: extraTags
		};

		try {
			if (!selectedGameName) {
				throw new Error('Missing game context. Open this page from a game details page.');
			}

			if (!body.name || !body.description || !body.platform || !body.experience || !body.microphone || !body.region) {
				throw new Error('Name, description, platform, experience, microphone, and region are required.');
			}

			if (joinRequirement === "password" && !body.joinPassword) {
				throw new Error('Set a group password for Password Protected join.');
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

			if (!data?.groupId) {
				throw new Error('Group created but no group id was returned');
			}

			setName("");
			setDescription("");
			setPlatform("");
			setJoinRequirement("auto");
			setJoinPassword("");
			setTags({ experience: "", microphone: "", region: "" });
			setExtraTags([]);
			setExtraTagInput("");
			navigate(`/group/${data.groupId}`);
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
				<form className="create-group-form" onSubmit={handleSubmit} autoComplete="off">
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
						required
					/>
				</div>
				<div className="create-group-field">
					<label>Join Requirements:</label>
					<select
						value={joinRequirement}
						onChange={(e) => setJoinRequirement(e.target.value)}
					>
						<option value="auto">Auto Join</option>
						<option value="password">Password Protected</option>
						<option value="request">Request to Join</option>
					</select>
				</div>
				{joinRequirement === "password" ? (
					<div className="create-group-field">
						<label>Group Password:</label>
						<input
							type="password"
							name="group-create-password"
							autoComplete="new-password"
							value={joinPassword}
							onChange={(e) => setJoinPassword(e.target.value)}
							required
							placeholder="Set join password"
						/>
					</div>
				) : null}
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
						) : (
							<option value="">Select platform</option>
						)}
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
								required
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
