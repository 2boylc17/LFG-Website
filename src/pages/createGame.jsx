import React, { useState } from "react";
import { apiFetch } from "../lib/api.js";

export default function CreateGame() {
    const [name, setName] = useState("");
    const [genresInput, setGenresInput] = useState("");
    const [platformsInput, setPlatformsInput] = useState("");
    const [message, setMessage] = useState("");
    const [selectedImage, setSelectedImage] = useState(null);

    const fileToImageUrl = (file) => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
    });

    const parseNameList = (csvValue) => csvValue
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
        .map((name) => ({ name }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage("");
        try {
            const trimmedName = name.trim();
            if (!trimmedName) {
                throw new Error("Game name cannot be empty");
            }

            let imageData = null;
            if (selectedImage) {
                imageData = await fileToImageUrl(selectedImage);
            }

            const formattedGenres = parseNameList(genresInput);
            const formattedPlatforms = parseNameList(platformsInput);

            if (!formattedGenres.length || !formattedPlatforms.length) {
                throw new Error("Genre and platform cannot be empty");
            }

            const body = {
                name: trimmedName,
                genres: formattedGenres,
                platforms: formattedPlatforms,
                image: imageData
            };

            const response = await apiFetch('/api/games/add', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || data.message || "Add game failed");
            }

            setSelectedImage(null);
            setName("");
            setGenresInput("");
            setPlatformsInput("");
            setMessage("Game added successfully");
        } catch (error) {
            setMessage(`Error: ${error.message}`);
        }
    };

    const handleImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setMessage("Please upload a valid image file.");
            e.target.value = "";
            setSelectedImage(null);
            return;
        }

        setSelectedImage(file);
    };

    return (
        <div className="page">
            <h2>Create a New Game</h2>
            {/* WCAG 3.3.1 Error Identification: associate any submit feedback with the form so assistive tech can announce it in context. */}
            <form onSubmit={handleSubmit} aria-describedby={message ? "create-game-message" : undefined}>
                <div>
                    {/* WCAG 1.3.1 Info and Relationships and 3.3.2 Labels or Instructions: explicitly bind the game-name label to its input. */}
                    <label htmlFor="create-game-name">Name:</label>
                    <input id="create-game-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div>
                    {/* WCAG 1.3.1 Info and Relationships and 3.3.2 Labels or Instructions: explicitly bind the genres label to its input. */}
                    <label htmlFor="create-game-genres">Genres (comma separated):</label>
                    <input id="create-game-genres" type="text" value={genresInput} onChange={(e) => setGenresInput(e.target.value)} required />
                </div>
                <div>
                    {/* WCAG 1.3.1 Info and Relationships and 3.3.2 Labels or Instructions: explicitly bind the platforms label to its input. */}
                    <label htmlFor="create-game-platforms">Platforms (comma separated):</label>
                    <input id="create-game-platforms" type="text" value={platformsInput} onChange={(e) => setPlatformsInput(e.target.value)} required />
                </div>
                <div>
                    {/* WCAG 3.3.2 Labels or Instructions: give the file picker a persistent label so its purpose is not conveyed by placement alone. */}
                    <label htmlFor="create-game-image">Image:</label>
                    <input id="create-game-image" type="file" accept="image/*" onChange={handleImageUpload} />
                </div>
                <button type="submit">Add Game</button>
            </form>
            {/* WCAG 4.1.3 Status Messages: announce upload and submit feedback without moving focus away from the form. */}
            {message && <p id="create-game-message" aria-live="polite">{message}</p>}
        </div>
    );
}