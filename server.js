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
    const player = players.find(p => p.userId == req.params.id);

    if (!player) {
        return res.status(404).json({ error: "Not found" });
    }

    res.json(player);
});


// ======================
// BIG-GAMES STYLE DASHBOARD
// ======================
app.get("/dashboard", (req, res) => {

    const rows = players.map(p => `
        <div class="row">
            <div class="cell">${p.username}</div>
            <div class="cell">${p.userId}</div>
            <div class="cell">${p.equippedSkin}</div>
            <div class="cell">${p.inventorySize}</div>
            <div class="cell knives">
                ${(p.ownedSkins || []).map(k => `<span class="tag">${k}</span>`).join("")}
            </div>
            <div class="cell">${new Date(p.time).toLocaleString()}</div>
        </div>
    `).join("");

    res.send(`
<!DOCTYPE html>
<html>
<head>
<title>Database</title>
<style>
body {
    margin: 0;
    font-family: Arial;
    background: #0b0f17;
    color: white;
}

/* TOP BAR */
.topbar {
    height: 60px;
    display: flex;
    align-items: center;
    padding: 0 20px;
    background: #0f1623;
    border-bottom: 1px solid #1f2a3a;
    font-weight: bold;
    letter-spacing: 1px;
}

/* LAYOUT */
.layout {
    display: flex;
}

/* SIDEBAR */
.sidebar {
    width: 220px;
    background: #0f1623;
    height: calc(100vh - 60px);
    border-right: 1px solid #1f2a3a;
    padding: 15px;
}

.sidebar h3 {
    font-size: 12px;
    color: #6b7c93;
    margin-top: 20px;
}

.sidebar div {
    padding: 10px;
    margin: 5px 0;
    background: #121b2b;
    border-radius: 6px;
    font-size: 13px;
}

/* MAIN */
.main {
    flex: 1;
    padding: 20px;
}

/* SEARCH */
.search {
    margin-bottom: 15px;
}

.search input {
    width: 100%;
    padding: 10px;
    background: #0f1623;
    border: 1px solid #1f2a3a;
    color: white;
    border-radius: 6px;
    outline: none;
}

/* TABLE */
.table {
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid #1f2a3a;
}

.header, .row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr 2fr 1fr;
}

.header {
    background: #141d2e;
    padding: 12px;
    font-weight: bold;
    font-size: 13px;
    color: #9fb0c3;
}

.row {
    padding: 12px;
    border-top: 1px solid #1b263a;
    background: #0f1623;
}

.row:hover {
    background: #141f33;
}

.cell {
    font-size: 13px;
}

/* KNIVES */
.knives {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
}

.tag {
    background: #1b2a44;
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 11px;
    color: #9ecbff;
}
</style>
</head>

<body>

<div class="topbar">
    ⚔ PLAYER DATABASE
</div>

<div class="layout">

    <div class="sidebar">
        <h3>DATABASE</h3>
        <div>Players (${players.length})</div>
        <div>Inventory Logs</div>
        <div>Live Sessions</div>

        <h3>TOOLS</h3>
        <div>Search</div>
        <div>Analytics</div>
    </div>

    <div class="main">

        <div class="search">
            <input placeholder="Search players..." />
        </div>

        <div class="table">
            <div class="header">
                <div>Username</div>
                <div>User ID</div>
                <div>Equipped</div>
                <div>Inv</div>
                <div>Knives</div>
                <div>Last Seen</div>
            </div>

            ${rows || `<div class="row">No players yet</div>`}
        </div>

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
