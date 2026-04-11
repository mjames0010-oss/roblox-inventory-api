const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.json());

const SECRET = "mySuperSecret123";
const ADMIN_PASS = "admin123";
const JWT_SECRET = "superJWTsecret";

// ======================
// MONGODB
// ======================
mongoose.connect("mongodb://127.0.0.1:27017/robloxDB");

const PlayerSchema = new mongoose.Schema({
    userId: String,
    username: String,
    ownedSkins: [String],
    equippedSkin: String,
    inventorySize: Number,
    time: String
});

const Player = mongoose.model("Player", PlayerSchema);

// ======================
// RARITY SYSTEM
// ======================
function getRarity(item) {
    const mythic = ["Dragon Blade", "Void Knife"];
    const legendary = ["Ice Blade", "Fire Katana"];
    const rare = ["Shadow Knife"];

    if (mythic.includes(item)) return "#ff4dff";
    if (legendary.includes(item)) return "#ffb84d";
    if (rare.includes(item)) return "#4da6ff";
    return "#9ecbff";
}

// ======================
// SOCKET LIVE UPDATES
// ======================
io.on("connection", (socket) => {
    console.log("🔌 Client connected");
});

// ======================
// HOME
// ======================
app.get("/", (req, res) => {
    res.send("✅ Roblox Inventory API Online (BIG UPGRADE)");
});

// ======================
// RECEIVE DATA
// ======================
app.post("/player-join", async (req, res) => {
    const { userId, username, ownedSkins, equippedSkin, inventorySize, secret } = req.body;

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

    await Player.findOneAndUpdate(
        { userId },
        playerData,
        { upsert: true, new: true }
    );

    io.emit("update");

    res.sendStatus(200);
});

// ======================
// API PLAYERS
// ======================
app.get("/players", async (req, res) => {
    const players = await Player.find();
    res.json(players);
});

// ======================
// SINGLE PLAYER
// ======================
app.get("/players/:id", async (req, res) => {
    const player = await Player.findOne({ userId: req.params.id });
    if (!player) return res.status(404).json({ error: "Not found" });
    res.json(player);
});

// ======================
// ADMIN LOGIN
// ======================
app.post("/admin/login", (req, res) => {
    const { password } = req.body;

    if (password !== ADMIN_PASS) {
        return res.status(403).json({ error: "Wrong password" });
    }

    const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "2h" });
    res.json({ token });
});

function verifyAdmin(req, res, next) {
    const token = req.headers.authorization;

    try {
        jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        res.status(403).send("No access");
    }
}

// ======================
// PROFILE PAGE
// ======================
app.get("/player/:id", async (req, res) => {
    const p = await Player.findOne({ userId: req.params.id });
    if (!p) return res.send("Not found");

    const headshot = `https://www.roblox.com/headshot-thumbnail/image?userId=${p.userId}&width=420&height=420&format=png`;

    res.send(`
<!DOCTYPE html>
<html>
<head>
<title>${p.username}</title>
<style>
body { background:#0a0c10; color:white; font-family:Arial; text-align:center; }
.card { margin:50px auto; width:300px; background:#121826; padding:20px; border-radius:12px; }
img { width:100px; border-radius:10px; }
.tag { padding:4px 8px; background:#1a2440; display:inline-block; margin:3px; border-radius:6px; }
</style>
</head>
<body>

<div class="card">
    <img src="${headshot}" />
    <h2>${p.username}</h2>
    <p>ID: ${p.userId}</p>
    <p>Equipped: ${p.equippedSkin}</p>

    <h3>Knives</h3>
    ${p.ownedSkins.map(k => `<div class="tag" style="color:${getRarity(k)}">${k}</div>`).join("")}
</div>

</body>
</html>
    `);
});

// ======================
// DASHBOARD (LIVE + SEARCH)
// ======================
app.get("/dashboard", verifyAdmin, async (req, res) => {

    const players = await Player.find();

    const rows = players.map(p => {
        const headshot = `https://www.roblox.com/headshot-thumbnail/image?userId=${p.userId}&width=420&height=420&format=png`;

        return `
        <div class="card" data-name="${p.username.toLowerCase()}">
            <img src="${headshot}" />
            <div>
                <b>${p.username}</b><br>
                <small>ID: ${p.userId}</small>
                <p>${p.equippedSkin}</p>
            </div>
        </div>
        `;
    }).join("");

    res.send(`
<!DOCTYPE html>
<html>
<head>
<title>Admin Dashboard</title>

<style>
body { margin:0; font-family:Arial; background:#0a0c10; color:white; }
.header { padding:15px; background:#111522; }
.search { width:100%; padding:10px; margin:10px 0; }
.grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(250px,1fr)); gap:10px; padding:20px; }
.card { background:#121826; padding:10px; border-radius:10px; display:flex; gap:10px; }
img { width:50px; border-radius:8px; }
</style>
</head>

<body>

<div class="header">
⚔ Admin Live Dashboard
<input class="search" id="search" placeholder="Search players..." />
</div>

<div class="grid" id="grid">
${rows}
</div>

<script src="/socket.io/socket.io.js"></script>
<script>
const socket = io();

socket.on("update", () => location.reload());

document.getElementById("search").addEventListener("input", (e) => {
    const val = e.target.value.toLowerCase();
    document.querySelectorAll(".card").forEach(c => {
        c.style.display = c.dataset.name.includes(val) ? "flex" : "none";
    });
});
</script>

</body>
</html>
    `);
});

// ======================
// START
// ======================
server.listen(3000, () => {
    console.log("🚀 BIG UPGRADE SERVER RUNNING");
});
