const express = require("express");
const app = express();

app.use(express.json());

// ======================
// CONFIG
// ======================
const API_VERSION = "1.0";

// ======================
// MONGO (optional)
// ======================
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
        cases: Object,
        time: String
    });

    PlayerModel = mongoose.model("Player", PlayerSchema);

} catch (e) {
    console.log("⚠️ MongoDB disabled");
}

// ======================
// MEMORY DB
// ======================
let memoryPlayers = [];

// ======================
// VALIDATION
// ======================
function isValidPayload(body) {
    return (
        body &&
        typeof body.userId !== "undefined" &&
        typeof body.username === "string"
    );
}

// ======================
// HOME
// ======================
app.get("/", (req, res) => {
    res.send("✅ Big Games Style API Online (SECURE VERSION)");
});

// ======================
// PLAYER JOIN (SECURE)
// ======================
app.post("/player-join", async (req, res) => {

    const body = req.body;

    if (!isValidPayload(body)) {
        return res.status(400).send("Invalid payload");
    }

    const {
        userId,
        username,
        ownedSkins,
        equippedSkin,
        inventorySize,
        cases
    } = body;

    const playerData = {
        userId: String(userId),
        username: String(username),

        ownedSkins: Array.isArray(ownedSkins) ? ownedSkins : [],
        equippedSkin: typeof equippedSkin === "string" ? equippedSkin : "None",
        inventorySize: typeof inventorySize === "number" ? inventorySize : 0,

        cases: cases && typeof cases === "object" ? cases : {},

        time: new Date().toISOString()
    };

    // SAVE
    if (dbEnabled && PlayerModel) {
        await PlayerModel.findOneAndUpdate(
            { userId: playerData.userId },
            playerData,
            { upsert: true }
        );
    } else {
        const index = memoryPlayers.findIndex(p => p.userId === playerData.userId);

        if (index !== -1) memoryPlayers[index] = playerData;
        else memoryPlayers.push(playerData);
    }

    console.log("📥 PLAYER:", username);

    res.json({ ok: true, version: API_VERSION });
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
        player = memoryPlayers.find(p => p.userId === req.params.id);
    }

    if (!player) return res.status(404).json({ error: "Not found" });

    res.json(player);
});

// ======================
// DASHBOARD
// ======================
app.get("/dashboard", async (req, res) => {

    let players = dbEnabled && PlayerModel
        ? await PlayerModel.find()
        : memoryPlayers;

    const cards = players.map(p => {

        const headshot = `https://www.roblox.com/headshot-thumbnail/image?userId=${p.userId}&width=420&height=420&format=png`;

        const skins = Array.isArray(p.ownedSkins) ? p.ownedSkins : [];
        const cases = p.cases || {};

        let caseCount = 0;
        for (let k in cases) {
            caseCount += Number(cases[k]) || 0;
        }

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
                <div><span>Skins</span><b>${skins.length}</b></div>
                <div><span>Cases</span><b>${caseCount}</b></div>
            </div>

            <div class="knives">
                ${skins.map(k => `<div class="tag">${k}</div>`).join("")}
            </div>

            <div class="cases">
                ${Object.keys(cases).map(c =>
            `<div class="tag">🎁 ${c}: ${cases[c]}</div>`
        ).join("")}
            </div>

        </div>
        `;
    }).join("");

    res.send(`
<!DOCTYPE html>
<html>
<head>
<title>Dashboard</title>
<style>
body { margin:0; font-family:Arial; background:#0a0c10; color:white; }
.header { padding:15px; background:#111; }
.wrap { padding:20px; }
.grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:10px; }
.card { background:#121826; padding:15px; border-radius:10px; }
.top { display:flex; gap:10px; align-items:center; }
.avatar { width:45px; border-radius:8px; }
.stats { display:grid; grid-template-columns:repeat(3,1fr); gap:5px; margin:10px 0; }
.stats div { background:#0e1422; padding:5px; border-radius:6px; text-align:center; }
.tag { font-size:11px; padding:4px 6px; background:#1a2440; border-radius:6px; display:inline-block; margin:2px; }
</style>
</head>
<body>
<div class="header">PRO DASHBOARD</div>
<div class="wrap">
<div class="grid">${cards}</div>
</div>
</body>
</html>
    `);
});

// ======================
// START
// ======================
app.listen(process.env.PORT || 3000, () => {
    console.log("🚀 SERVER RUNNING");
});
