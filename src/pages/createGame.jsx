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
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Name:</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div>
                    <label>Genres (comma separated):</label>
                    <input type="text" value={genresInput} onChange={(e) => setGenresInput(e.target.value)} required />
                </div>
                <div>
                    <label>Platforms (comma separated):</label>
                    <input type="text" value={platformsInput} onChange={(e) => setPlatformsInput(e.target.value)} required />
                </div>
                <div>
                    <label>Image:</label>
                    <input type="file" accept="image/*" onChange={handleImageUpload} />
                </div>
                <button type="submit">Add Game</button>
            </form>
            {message && <p>{message}</p>}
        </div>
    );
}