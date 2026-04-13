const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());

// ======================
// DATABASE
// ======================
mongoose.connect(process.env.MONGO_URL);

const PlayerSchema = new mongoose.Schema({
    userId: String,
    username: String,
    ownedSkins: Array,
    equippedSkin: String,
    cases: Object
});

const PlayerModel = mongoose.model("Player", PlayerSchema);

// ======================
// MEMORY CACHE
// ======================
let memoryPlayers = [];

// ======================
// LOAD DB ON START
// ======================
async function loadPlayers() {
    const data = await PlayerModel.find({});
    memoryPlayers = data.map(p => p.toObject());
    console.log("📦 Loaded players:", memoryPlayers.length);
}
loadPlayers();

// ======================
// REAL-TIME SOCKETS
// ======================
io.on("connection", (socket) => {
    socket.emit("init", memoryPlayers);
});

function broadcast() {
    io.emit("update", memoryPlayers);
}

// ======================
// FORMAT STACKED ITEMS
// ======================
function formatItems(items = []) {
    const map = {};

    for (const item of items) {
        map[item] = (map[item] || 0) + 1;
    }

    return Object.entries(map).map(([name, count]) =>
        count > 1 ? `${name} x${count}` : name
    );
}

// ======================
// GET ALL PLAYERS
// ======================
app.get("/players", (req, res) => {
    res.json(memoryPlayers);
});

// ======================
// GET PLAYER
// ======================
app.get("/players/:id", (req, res) => {
    const player = memoryPlayers.find(p => p.userId === req.params.id);
    if (!player) return res.status(404).json({ error: "Not found" });
    res.json(player);
});

// ======================
// JOIN (INITIAL SAVE)
// ======================
app.post("/player-join", async (req, res) => {
    const { userId, username } = req.body;

    if (!userId || !username) return res.status(400).send("Missing data");

    let player = memoryPlayers.find(p => p.userId === String(userId));

    if (!player) {
        player = {
            userId: String(userId),
            username,
            ownedSkins: [],
            equippedSkin: "Knife",
            cases: {}
        };

        memoryPlayers.push(player);
    }

    await PlayerModel.findOneAndUpdate(
        { userId: player.userId },
        player,
        { upsert: true }
    );

    broadcast();

    res.json({ ok: true });
});

// ======================
// 🔐 SERVER-AUTHORIZED SKIN ADD
// ======================
app.post("/add-skin", async (req, res) => {
    const { userId, skin } = req.body;

    const player = memoryPlayers.find(p => p.userId === String(userId));
    if (!player) return res.status(404).send("Not found");

    player.ownedSkins.push(skin);

    await PlayerModel.findOneAndUpdate(
        { userId: player.userId },
        player,
        { upsert: true }
    );

    broadcast();

    res.json({ ok: true });
});

// ======================
// 🔐 SERVER-AUTHORIZED CASE UPDATE
// ======================
app.post("/add-case", async (req, res) => {
    const { userId, caseName, amount } = req.body;

    const player = memoryPlayers.find(p => p.userId === String(userId));
    if (!player) return res.status(404).send("Not found");

    player.cases[caseName] = (player.cases[caseName] || 0) + (amount || 1);

    await PlayerModel.findOneAndUpdate(
        { userId: player.userId },
        player,
        { upsert: true }
    );

    broadcast();

    res.json({ ok: true });
});

// ======================
// DASHBOARD (LIVE)
// ======================
app.get("/dashboard", (req, res) => {
    res.send(`
<html>
<head>
<script src="/socket.io/socket.io.js"></script>
<style>
body { background:#0b0f1a; color:white; font-family:Arial; }
.card { background:#121a2a; margin:10px; padding:10px; border-radius:10px; }
</style>
</head>
<body>
<h2>🔥 LIVE DASHBOARD</h2>
<div id="list"></div>

<script>
const socket = io();
const list = document.getElementById("list");

function render(players) {
    list.innerHTML = players.map(p => {
        const skins = (p.ownedSkins || []).join(", ");
        return \`
        <div class="card">
            <b>\${p.username}</b><br>
            Skins: \${skins || "None"}<br>
            Equipped: \${p.equippedSkin}
        </div>
        \`;
    }).join("");
}

socket.on("init", render);
socket.on("update", render);
</script>
</body>
</html>
    `);
});

// ======================
server.listen(3000, () => {
    console.log("🚀 Server running on port 3000");
});
