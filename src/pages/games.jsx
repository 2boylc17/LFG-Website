
import React from "react";

const games = [
       { id: 1, name: "The Legend of Zelda: Breath of the Wild" },
       { id: 2, name: "Super Mario Odyssey" },
       { id: 3, name: "Minecraft" },
       { id: 4, name: "Fortnite" },
       { id: 5, name: "Among Us" },
];

export default function GamesPage() {
       return (
	       <div className="page">
		       <h1 style={{ textAlign: "center", marginTop: 32 }}>Games</h1>
		       <div className="gameListStyle">
			       {games.map((game) => (
				       <div key={game.id} className="gameItem">
					       <div className="placeholderStyle"></div>
					       <span style={{ marginTop: 8, fontWeight: 500 }}>{game.name}</span>
				       </div>
			       ))}
		       </div>
	       </div>
       );
}
