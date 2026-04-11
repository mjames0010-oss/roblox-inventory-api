const express = require("express");
const app = express();

app.use(express.json());

// ======================
// CONFIG
// ======================
const SECRET = "mySuperSecret123";

// optional DB (safe fallback)
let dbEnabled = false;
let PlayerModel = null;

try {
    const mongoose = require("mongoose");

    mongoose.connect(process.env.MONGO_URL || "")
        .then(() => {
            console.log("✅ MongoDB connected");
            dbEnabled = true;
        })
        .catch(() => {
            console.log("⚠️ MongoDB not connected, using memory mode");
        });

    const PlayerSchema = new mongoose.Schema({
        userId: String,
        username: String,
        ownedSkins: Array,
        equippedSkin: String,
        inventorySize: Number,
        time: String
    });

    PlayerModel = mongoose.model("Player", PlayerSchema);

} catch (e) {
    console.log("⚠️ MongoDB disabled");
}

// ======================
// MEMORY FALLBACK DB
// ======================
let memoryPlayers = [];

// ======================
// RARITY SYSTEM
// ======================
function getRarityColor(item) {
    const mythic = ["Dragon Blade", "Void Knife"];
    const legendary = ["Ice Blade", "Fire Katana"];
    const rare = ["Shadow Knife"];

    if (mythic.includes(item)) return "#ff4df0";
    if (legendary.includes(item)) return "#ffb84d";
    if (rare.includes(item)) return "#4da6ff";
    return "#9ecbff";
}

// ======================
// HOME
// ======================
app.get("/", (req, res) => {
    res.send("✅ Big Games Style API Online (PRO VERSION)");
});

// ======================
// PLAYER JOIN
// ======================
app.post("/player-join", async (req, res) => {

    const {
        userId,
        username,
        ownedSkins,
        equippedSkin,
        inventorySize,
        secret
    } = req.body;

    if (secret !== SECRET) return res.status(403).send("Bad secret");
    if (!userId || !username) return res.status(400).send("Missing data");

    const playerData = {
        userId,
        username,
        ownedSkins: Array.isArray(ownedSkins) ? ownedSkins : [],
        equippedSkin: equippedSkin || "None",
        inventorySize: inventorySize || 0,
        time: new Date().toISOString()
    };

    // DB MODE
    if (dbEnabled && PlayerModel) {
        await PlayerModel.findOneAndUpdate(
            { userId },
            playerData,
            { upsert: true }
        );
    } 
    // MEMORY MODE
    else {
        const index = memoryPlayers.findIndex(p => p.userId === userId);
        if (index !== -1) memoryPlayers[index] = playerData;
        else memoryPlayers.push(playerData);
    }

    console.log("PLAYER:", username);

    res.sendStatus(200);
});

// ======================
// GET PLAYERS
// ======================
app.get("/players", async (req, res) => {
    if (dbEnabled && PlayerModel) {
        return res.json(await PlayerModel.find());
    }
    res.json(memoryPlayers);
});

// ======================
// SINGLE PLAYER
// ======================
app.get("/players/:id", async (req, res) => {

    let player;

    if (dbEnabled && PlayerModel) {
        player = await PlayerModel.findOne({ userId: req.params.id });
    } else {
        player = memoryPlayers.find(p => p.userId == req.params.id);
    }

    if (!player) return res.status(404).json({ error: "Not found" });

    res.json(player);
});

// ======================
// BIG GAMES STYLE DASHBOARD
// ======================
app.get("/dashboard", async (req, res) => {

    let players = [];

    if (dbEnabled && PlayerModel) {
        players = await PlayerModel.find();
    } else {
        players = memoryPlayers;
    }

    const cards = players.map(p => {

        const headshot = `https://www.roblox.com/headshot-thumbnail/image?userId=${p.userId}&width=420&height=420&format=png`;

        const skins = Array.isArray(p.ownedSkins) ? p.ownedSkins : [];

        return `
        <div class="card">

            <div class="top">
                <img class="avatar" src="${headshot}" />
                <div>
                    <div class="name">${p.username}</div>
                    <div class="id">ID: ${p.userId}</div>
                </div>
            </div>

            <div class="stats">
                <div><span>Equipped</span><b>${p.equippedSkin}</b></div>
                <div><span>Inventory</span><b>${p.inventorySize}</b></div>
                <div><span>Skins</span><b>${skins.length}</b></div>
            </div>

            <div class="knives">
                ${skins.map(k => `<div class="tag" style="color:${getRarityColor(k)}">${k}</div>`).join("")}
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
<title>Big Games Dashboard PRO</title>

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

.card {
    background: #121826;
    border: 1px solid #1e2635;
    border-radius: 12px;
    padding: 15px;
    transition: 0.2s;
}

.card:hover {
    transform: translateY(-4px);
    border-color: #2a3a55;
}

.top {
    display: flex;
    gap: 10px;
    align-items: center;
}

.avatar {
    width: 45px;
    height: 45px;
    border-radius: 10px;
    border: 1px solid #2a3550;
}

.name {
    font-weight: bold;
}

.id {
    font-size: 11px;
    color: #7d8aa5;
}

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
    font-size: 10px;
    color: #7d8aa5;
}

.stats b {
    font-size: 13px;
}

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
}

.time {
    margin-top: 10px;
    font-size: 10px;
    color: #6d7b95;
}
</style>

</head>

<body>

<div class="header">
⚔ Big Games Style Inventory System (PRO)
</div>

<div class="wrap">
    <div class="grid">
        ${cards || "<p>No players online</p>"}
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
    console.log("🚀 PRO SERVER RUNNING ON PORT", PORT);
});
