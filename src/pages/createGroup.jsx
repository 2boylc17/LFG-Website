import React, { useState } from "react";

export default function CreateGroup() {
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [gameName, setGameName] = useState("");
	const [platform, setPlatform] = useState("");
	const [members, setMembers] = useState("");
	const [message, setMessage] = useState("");

	const handleSubmit = async (e) => {
		e.preventDefault();
		setMessage("");

		const body = {
			name: name.trim(),
			description: description.trim(),
			gameName: gameName.trim(),
			platform: platform.trim(),
			members: members
				.split(",")
				.map((id) => id.trim())
				.filter((id) => id.length > 0)
		};

		try {
			const response = await fetch('/api/groups/add', {
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
			setGameName("");
			setPlatform("");
			setMembers("");
			setMessage('Group added successfully');
		} catch (error) {
			setMessage(`Error: ${error.message}`);
		}
	};

	return (
		<div className="page">
			<h2>Create a New Group</h2>
			<form onSubmit={handleSubmit}>
				<div>
					<label>Name:</label>
					<input
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
						required
					/>
				</div>
				<div>
					<label>Description:</label>
					<input
						type="text"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
					/>
				</div>
				<div>
					<label>Game name:</label>
					<input
						type="text"
						value={gameName}
						onChange={(e) => setGameName(e.target.value)}
						required
					/>
				</div>
				<div>
					<label>Platform:</label>
					<input
						type="text"
						value={platform}
						onChange={(e) => setPlatform(e.target.value)}
					/>
				</div>
				<div>
					<label>Member ids (comma separated):</label>
					<input
						type="text"
						value={members}
						onChange={(e) => setMembers(e.target.value)}
					/>
				</div>
				<button type="submit">Add Group</button>
			</form>
			{message && <p>{message}</p>}
		</div>
	);
}
