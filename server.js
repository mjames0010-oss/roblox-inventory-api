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

// VIEW ALL DATA (API)
app.get("/players", (req, res) => {
    res.json(players);
});

// VIEW SINGLE PLAYER (API)
app.get("/players/:id", (req, res) => {
    const player = players.find(p => p.userId == req.params.id);

    if (!player) {
        return res.status(404).json({ error: "Not found" });
    }

    res.json(player);
});


// ===============================
// 🟣 NEW: BIG-GAMES STYLE DASHBOARD
// ===============================
app.get("/dashboard", (req, res) => {
    const rows = players.map(p => `
        <div class="row">
            <div><b>${p.username}</b></div>
            <div>${p.userId}</div>
            <div>${p.equippedSkin}</div>
            <div>${p.inventorySize}</div>
            <div>${p.ownedSkins.length}</div>
            <div>${new Date(p.time).toLocaleString()}</div>
        </div>
    `).join("");

    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Player Database</title>
    <style>
        body {
            margin: 0;
            font-family: Arial;
            background: #0f1115;
            color: white;
        }

        .topbar {
            padding: 20px;
            background: #151925;
            font-size: 20px;
            font-weight: bold;
            border-bottom: 1px solid #2a2f3a;
        }

        .container {
            padding: 20px;
        }

        .header, .row {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr;
            padding: 10px;
        }

        .header {
            background: #1c2230;
            font-weight: bold;
            border-radius: 8px;
        }

        .row {
            border-bottom: 1px solid #222838;
        }

        .row:hover {
            background: #1a2030;
        }

        .card {
            margin-top: 20px;
            background: #151925;
            padding: 10px;
            border-radius: 10px;
        }

        .title {
            margin-bottom: 10px;
            font-size: 18px;
        }
    </style>
</head>
<body>

    <div class="topbar">
        🎮 Player Database Dashboard
    </div>

    <div class="container">

        <div class="card">
            <div class="title">Live Players</div>

            <div class="header">
                <div>Username</div>
                <div>User ID</div>
                <div>Equipped</div>
                <div>Inv Size</div>
                <div>Total Skins</div>
                <div>Last Seen</div>
            </div>

            ${rows || "<p>No players yet</p>"}
        </div>

    </div>

</body>
</html>
    `);
});

// START
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("🚀 API running on port", PORT);
});
