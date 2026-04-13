const express = require("express");
const app = express();

app.use(express.json());

// ======================
// MEMORY DB
// ======================
let memoryPlayers = [];

const lastRequest = new Map();

function isSpam(userId) {
    const now = Date.now();
    const last = lastRequest.get(userId) || 0;

    if (now - last < 1000) return true;
    lastRequest.set(userId, now);
    return false;
}

// ======================
// FORMAT DUPLICATES (IMPORTANT FIX)
// ======================
function formatItems(items) {
    const countMap = {};

    for (const item of items || []) {
        countMap[item] = (countMap[item] || 0) + 1;
    }

    return Object.entries(countMap).map(([name, count]) => {
        return count > 1 ? `${name} x${count}` : name;
    });
}

// ======================
// HOME
// ======================
app.get("/", (req, res) => {
    res.send("✅ Inventory API Online (FIXED + STACKED ITEMS)");
});

// ======================
// PLAYER JOIN
// ======================
app.post("/player-join", (req, res) => {
    const { userId, username, ownedSkins, equippedSkin, cases } = req.body;

    if (!userId || !username) return res.status(400).send("Missing data");
    if (isSpam(userId)) return res.status(429).send("Too many requests");

    const safeData = {
        userId: String(userId),
        username: String(username),

        ownedSkins: Array.isArray(ownedSkins) ? ownedSkins : [],
        equippedSkin: typeof equippedSkin === "string" ? equippedSkin : "Knife",

        cases: typeof cases === "object" ? cases : {},

        time: new Date().toISOString()
    };

    const index = memoryPlayers.findIndex(p => p.userId === safeData.userId);

    if (index !== -1) memoryPlayers[index] = safeData;
    else memoryPlayers.push(safeData);

    console.log("📥 JOIN:", username);

    res.json({ ok: true });
});

// ======================
// PLAYER UPDATE (FIXED)
// ======================
app.post("/player-update", (req, res) => {
    const { userId, username, ownedSkins, equippedSkin, cases } = req.body;

    if (!userId) return res.status(400).send("Missing userId");

    const safeData = {
        userId: String(userId),
        username: String(username || "Unknown"),

        ownedSkins: Array.isArray(ownedSkins) ? ownedSkins : [],
        equippedSkin: typeof equippedSkin === "string" ? equippedSkin : "Knife",

        cases: typeof cases === "object" ? cases : {},

        time: new Date().toISOString()
    };

    const index = memoryPlayers.findIndex(p => p.userId === safeData.userId);

    if (index !== -1) memoryPlayers[index] = safeData;
    else memoryPlayers.push(safeData);

    console.log("🔄 UPDATE:", safeData.username);

    res.json({ ok: true });
});

// ======================
// PLAYERS
// ======================
app.get("/players", (req, res) => {
    res.json(memoryPlayers);
});

// ======================
// SINGLE PLAYER
// ======================
app.get("/players/:id", (req, res) => {
    const player = memoryPlayers.find(p => p.userId === req.params.id);

    if (!player) return res.status(404).json({ error: "Not found" });

    res.json(player);
});

// ======================
// DASHBOARD (FIXED STACKING DISPLAY)
// ======================
app.get("/dashboard", (req, res) => {

    const cards = memoryPlayers.map(p => {

        const skins = Array.isArray(p.ownedSkins) ? p.ownedSkins : [];
        const cases = p.cases || {};

        let caseCount = 0;
        for (let k in cases) {
            caseCount += Number(cases[k]) || 0;
        }

        const formattedSkins = formatItems(skins);

        return `
        <div class="card">
            <div class="top">
                <img src="https://www.roblox.com/headshot-thumbnail/image?userId=${p.userId}&width=420&height=420&format=png" />
                <div>
                    <b>${p.username}</b><br>
                    <small>${p.userId}</small>
                </div>
            </div>

            <div class="stats">
                <div>Skins: ${formattedSkins.join(", ") || "None"}</div>
                <div>Cases: ${caseCount}</div>
                <div>Equipped: ${p.equippedSkin}</div>
            </div>
        </div>
        `;
    }).join("");

    res.send(`
<html>
<head>
<style>
body { margin:0; font-family:Arial; background:#0b0f1a; color:white; }
.card { background:#121a2a; margin:10px; padding:10px; border-radius:10px; }
.top { display:flex; gap:10px; align-items:center; }
img { width:50px; border-radius:8px; }
.stats { display:flex; flex-direction:column; gap:5px; margin-top:10px; }
</style>
</head>
<body>
<h2 style="padding:10px;">LIVE Dashboard</h2>
<div>${cards}</div>
</body>
</html>
    `);
});

// ======================
app.listen(3000, () => {
    console.log("🚀 API running on port 3000");
});
