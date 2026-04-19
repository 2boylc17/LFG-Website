import { set } from "mongoose";
import React, { useState } from "react";

export default function CreateGame() {
    const [name, setName] = useState("");
    const [genres, setGenres] = useState([]);
    const [platforms, setPlatforms] = useState([]);
    const [message, setMessage] = useState("");
    const [selectedImage, setSelectedImage] = useState(null);

    let test = {}

    const handleSubmitPre = async (e) => {
        e.preventDefault();
        try {
            let imageData = null;
            if (selectedImage) {
                const reader = new FileReader();
                imageData = await new Promise((resolve) => {
                    reader.onload = () => resolve(reader.result);
                    reader.readAsDataURL(selectedImage);
                });
            }
            
            const body = {
                name: name.trim(),
                genres: genres,
                platforms: platforms,
                image: imageData
            }
            test = body;
            console.log(body, JSON.stringify(body));

            const response = await fetch('/api/games/add', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await response.json();
            if (response.ok) {
                await response.json();
                setSelectedImage(null);
                setName("");
                setGenres([{ name: "" }]);
                setPlatforms([{ name: "" }]);
            } else {
                setMessage(`Error 1: ${data.error}`);
            }
        } catch (error) {
            setMessage(`Error 2: ${error.message} -- ${JSON.stringify(test)}`);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
            let imageData = null;
            if (selectedImage) {
                const reader = new FileReader();
                imageData = await new Promise((resolve) => {
                    reader.onload = () => resolve(reader.result);
                    reader.readAsDataURL(selectedImage);
                });
            }

            const formattedGenres = genres.map((g) => ({
                name: g.name
            }))

            const formattedPlatforms = platforms.map((p) => ({
                name: p.name
            }))

            const body = {
                name: name.trim(),
                genres: formattedGenres,
                platforms: formattedPlatforms,
                image: imageData
            }
            test = body;
            console.log(body, JSON.stringify(body));

            fetch('/api/games/add', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })
            .then(response => {
                if (!response.ok) throw new Error(`Add game failed`);
                return response.json();
            })
            .then(data => {
                setSelectedImage(null);
                setName("");
                setGenres([{ name: "" }]);
                setPlatforms([{ name: "" }]);
            })
            .catch(error => {
                setMessage(`Error: ${error.message}`);
            });
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setMessage("Please upload a valid image file.");
            e.target.value = "";
            setSelectedImage(null);
            return;
        }

        setSelectedImage(file);
        const reader = new FileReader();
        reader.readAsDataURL(file);
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
                    <input type="text" value={genres.map(g => g.name).join(",")} onChange={(e) => setGenres(e.target.value.split(",").map(g => ({ name: g })))} required />
                </div>
                <div>
                    <label>Platforms (comma separated):</label>
                    <input type="text" value={platforms.map(p => p.name).join(",")} onChange={(e) => setPlatforms(e.target.value.split(",").map(p => ({ name: p })))} required />
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