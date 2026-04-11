const express = require("express");
const app = express();

app.use(express.json());

// SECURITY KEY (must match Roblox)
const SECRET = "mySuperSecret123";

// storage (temporary memory)
let players = [];

/*
---------------------------------
HOME TEST ROUTE
---------------------------------
*/
app.get("/", (req, res) => {
    res.send("✅ Roblox Inventory API is running!");
});

/*
---------------------------------
ROBLOX SENDS DATA HERE
---------------------------------
*/
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

    const entry = {
        userId,
        username,
        ownedSkins: ownedSkins || [],
        equippedSkin: equippedSkin || "None",
        inventorySize: inventorySize || 0,
        time: new Date().toISOString()
    };

    players.push(entry);

    console.log("====================================");
    console.log("👤 PLAYER:", username);
    console.log("🆔 USERID:", userId);
    console.log("⭐ EQUIPPED:", equippedSkin);
    console.log("📦 COUNT:", inventorySize);
    console.log("🎒 ITEMS:", ownedSkins);
    console.log("====================================");

    res.sendStatus(200);
});

/*
---------------------------------
VIEW ALL DATA (TEST IN BROWSER)
---------------------------------
*/
app.get("/players", (req, res) => {
    res.json(players);
});

/*
---------------------------------
GET SINGLE PLAYER
---------------------------------
*/
app.get("/players/:id", (req, res) => {
    const id = req.params.id;

    const player = players.find(p => p.userId == id);

    if (!player) {
        return res.status(404).json({ error: "Player not found" });
    }

    res.json(player);
});

/*
---------------------------------
START SERVER
---------------------------------
*/
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("🚀 Inventory API running on port", PORT);
});
