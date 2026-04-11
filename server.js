const express = require("express");
const app = express();

app.use(express.json());

const SECRET = "mySuperSecret123";

// memory storage
let players = [];

// ======================
// HOME TEST
// ======================
app.get("/", (req, res) => {
    res.send("✅ Roblox Inventory API Online");
});

// ======================
// RECEIVE ROBLOX DATA
// ======================
app.post("/player-join", (req, res) => {
    const {
        userId,
        username,
        ownedSkins,
        equippedSkin,
        inventorySize,
        secret
    } = req.body;

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
        ownedSkins: Array.isArray(ownedSkins) ? ownedSkins : [],
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

// ======================
// API: ALL PLAYERS
// ======================
app.get("/players", (req, res) => {
    res.json(players);
});

// ======================
// API: SINGLE PLAYER
// ======================
app.get("/players/:id", (req, res) => {
    const player = players.find(p => String(p.userId) === String(req.params.id));

    if (!player) {
        return res.status(404).json({ error: "Not found" });
    }

    res.json(player);
});


// ======================
// DASHBOARD (ROBLOX HEADSHOTS + SAFE UI)
// ======================
app.get("/dashboard", (req, res) => {

    const cards = players.map(p => {

        const safeUsername = (p.username || "Unknown").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const safeUserId = p.userId || "0";

        const headshot = `https://www.roblox.com/headshot-thumbnail/image?userId=${safeUserId}&width=420&height=420&format=png`;

        const skins = Array.isArray(p.ownedSkins) ? p.ownedSkins : [];

        return `
        <div class="card">

            <div class="top">
                <img class="avatar" src="${headshot}" />
                <div>
                    <div class="name">${safeUsername}</div>
                    <div class="id">ID: ${safeUserId}</div>
                </div>
            </div>

            <div class="stats">
                <div><span>Equipped</span><b>${p.equippedSkin || "None"}</b></div>
                <div><span>Inventory</span><b>${p.inventorySize || 0}</b></div>
                <div><span>Skins</span><b>${skins.length}</b></div>
            </div>

            <div class="knives">
                ${skins.map(k => `<div class="tag">${k}</div>`).join("")}
            </div>

            <div class="time">
                ${new Date(p.time).toLocaleString()}
            </div>

        </div>
        `;
    }).join("");

    res.send(`
<!DOCTYPE html>
<html>
<head>
<title>Player Dashboard</title>

<style>
body {
    margin: 0;
    font-family: Arial;
    background: #0a0c10;
    color: white;
}

.header {
    padding: 18px 25px;
    background: #111522;
    border-bottom: 1px solid #1f2633;
    font-size: 18px;
    font-weight: bold;
}

.wrap {
    padding: 25px;
}

.grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 15px;
}

/* CARD */
.card {
    background: #121826;
    border: 1px solid #1e2635;
    border-radius: 12px;
    padding: 15px;
    transition: 0.2s;
}

.card:hover {
    transform: translateY(-3px);
    border-color: #2a3a55;
}

/* TOP */
.top {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
}

/* AVATAR */
.avatar {
    width: 45px;
    height: 45px;
    border-radius: 10px;
    border: 1px solid #2a3550;
}

/* TEXT */
.name {
    font-weight: bold;
    font-size: 15px;
}

.id {
    font-size: 11px;
    color: #7d8aa5;
}

/* STATS */
.stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin: 10px 0;
}

.stats div {
    background: #0e1422;
    padding: 8px;
    border-radius: 8px;
    text-align: center;
}

.stats span {
    display: block;
    font-size: 10px;
    color: #7d8aa5;
}

.stats b {
    font-size: 13px;
}

/* KNIVES */
.knives {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
}

.tag {
    font-size: 11px;
    padding: 4px 8px;
    background: #1a2440;
    border-radius: 6px;
    color: #9ecbff;
}

/* TIME */
.time {
    margin-top: 10px;
    font-size: 10px;
    color: #6d7b95;
}
</style>

</head>

<body>

<div class="header">
    ⚔ Player Dashboard
</div>

<div class="wrap">
    <div class="grid">
        ${cards || "<p>No players yet</p>"}
    </div>
</div>

</body>
</html>
    `);
});

// ======================
// START SERVER
// ======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("🚀 API running on port", PORT);
});
