const express = require("express");
const app = express();

app.use(express.json());

const SECRET = "mySuperSecret123";

// memory storage
let players = [];

// HOME TEST
app.get("/", (req, res) => {
    res.send("✅ Roblox Inventory API Online");
});

// RECEIVE ROBLOX DATA
app.post("/player-join", (req, res) => {
    const {
        userId,
        username,
        ownedSkins,
        equippedSkin,
        inventorySize,
        secret
    } = req.body;

    // security check
    if (secret !== SECRET) {
        console.log("❌ Bad secret attempt");
        return res.status(403).send("Bad secret");
    }

    if (!userId || !username) {
        return res.status(400).send("Missing data");
    }

    const playerData = {
        userId,
        username,
        ownedSkins: ownedSkins || [],
        equippedSkin: equippedSkin || "None",
        inventorySize: inventorySize || 0,
        time: new Date().toISOString()
    };

    players.push(playerData);

    console.log("================================");
    console.log("PLAYER:", username);
    console.log("ID:", userId);
    console.log("EQUIPPED:", equippedSkin);
    console.log("COUNT:", inventorySize);
    console.log("ITEMS:", ownedSkins);
    console.log("================================");

    res.sendStatus(200);
});

// VIEW ALL DATA
app.get("/players", (req, res) => {
    res.json(players);
});

// VIEW SINGLE PLAYER
app.get("/players/:id", (req, res) => {
    const player = players.find(p => p.userId == req.params.id);

    if (!player) {
        return res.status(404).json({ error: "Not found" });
    }

    res.json(player);
});

// START
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("🚀 API running on port", PORT);
});
