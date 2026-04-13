const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());

// ======================
// MEMORY FALLBACK DB
// ======================
let memoryPlayers = [];

// ======================
// MONGO SAFE CONNECT
// ======================
const mongoURI = process.env.MONGO_URL;

let mongoEnabled = false;
let PlayerModel = null;

async function connectDB() {
    if (!mongoURI) {
        console.warn("⚠️ MONGO_URL missing — running in MEMORY MODE");
        return;
    }

    try {
        await mongoose.connect(mongoURI);
        mongoEnabled = true;

        const PlayerSchema = new mongoose.Schema({
            userId: String,
            username: String,
            ownedSkins: Array,
            equippedSkin: String,
            cases: Object
        });

        PlayerModel = mongoose.model("Player", PlayerSchema);

        const data = await PlayerModel.find({});
        memoryPlayers = data.map(d => d.toObject());

        console.log("📦 MongoDB connected + loaded players:", memoryPlayers.length);
    } catch (err) {
        console.error("❌ MongoDB failed:", err);
    }
}

connectDB();

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
// STACK ITEMS
// ======================
function formatItems(items = []) {
    const map = {};
    for (const i of items) {
        map[i] = (map[i] || 0) + 1;
    }
    return Object.entries(map).map(([k, v]) =>
        v > 1 ? `${k} x${v}` : k
    );
}

// ======================
// SAVE HELPER
// ======================
async function savePlayer(player) {
    if (!mongoEnabled || !PlayerModel) return;

    await PlayerModel.findOneAndUpdate(
        { userId: player.userId },
        player,
        { upsert: true }
    );
}

// ======================
// GET PLAYER
// ======================
function getPlayer(userId) {
    return memoryPlayers.find(p => p.userId === String(userId));
}

// ======================
// JOIN
// ======================
app.post("/player-join", async (req, res) => {
    const { userId, username } = req.body;

    if (!userId || !username) return res.status(400).send("Missing data");

    let player = getPlayer(userId);

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

    await savePlayer(player);
    broadcast();

    res.json({ ok: true });
});

// ======================
// ADD SKIN (SECURE)
// ======================
app.post("/add-skin", async (req, res) => {
    const { userId, skin } = req.body;

    const player = getPlayer(userId);
    if (!player) return res.status(404).send("Not found");

    player.ownedSkins.push(skin);

    await savePlayer(player);
    broadcast();

    res.json({ ok: true });
});

// ======================
// ADD CASE (SECURE)
// ======================
app.post("/add-case", async (req, res) => {
    const { userId, caseName, amount } = req.body;

    const player = getPlayer(userId);
    if (!player) return res.status(404).send("Not found");

    player.cases[caseName] =
        (player.cases[caseName] || 0) + (amount || 1);

    await savePlayer(player);
    broadcast();

    res.json({ ok: true });
});

// ======================
// PLAYERS
// ======================
app.get("/players", (req, res) => {
    res.json(memoryPlayers);
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
server.listen(process.env.PORT || 3000, () => {
    console.log("🚀 Server running");
});
