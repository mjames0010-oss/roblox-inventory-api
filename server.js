const express = require("express");
const app = express();
app.use(express.json());

// ======================
// MEMORY DB
// ======================
let memoryPlayers = [];

// ======================
// KNIVES
// ======================
const KNIFE_REGISTRY = [
    { id: "knife_default", name: "Knife", rarity: "Common", color: "#94a3b8" },
    { id: "knife_bone", name: "Bone Knife", rarity: "Common", color: "#94a3b8" },
    { id: "knife_iron", name: "Iron Blade", rarity: "Uncommon", color: "#4ade80" },
    { id: "knife_shadow", name: "Shadow Edge", rarity: "Uncommon", color: "#4ade80" },
    { id: "knife_frost", name: "Frost Fang", rarity: "Rare", color: "#60a5fa" },
    { id: "knife_ember", name: "Ember Blade", rarity: "Rare", color: "#60a5fa" },
    { id: "knife_dragon", name: "Dragon", rarity: "Epic", color: "#a78bfa" },
    { id: "knife_aurora", name: "Aurora", rarity: "Epic", color: "#a78bfa" },
    { id: "knife_neon", name: "Neon Slice", rarity: "Epic", color: "#a78bfa" },
    { id: "knife_void", name: "Void Reaper", rarity: "Legendary", color: "#f59e0b" },
    { id: "knife_cosmic", name: "Cosmic Fang", rarity: "Legendary", color: "#f59e0b" },
    { id: "knife_eternal", name: "Eternal Edge", rarity: "Mythic", color: "#f43f5e" }
];

// ======================
// CASES
// ======================
const CASE_REGISTRY = [
    { id: "case_basic", name: "Basic Case" },
    { id: "case_rare", name: "Rare Case" },
    { id: "case_epic", name: "Epic Case" }
];

// ======================
// RARITY ORDER
// ======================
const RARITY_ORDER = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythic"];

// ======================
// ANTI SPAM
// ======================
const lastRequest = new Map();
function isSpam(userId) {
    const now = Date.now();
    const last = lastRequest.get(userId) || 0;
    if (now - last < 1500) return true;
    lastRequest.set(userId, now);
    return false;
}

// ======================
// HELPERS
// ======================
function timeAgo(iso) {
    if (!iso) return "—";
    const s = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (s < 60) return s + "s ago";
    if (s < 3600) return Math.floor(s / 60) + "m ago";
    if (s < 86400) return Math.floor(s / 3600) + "h ago";
    return Math.floor(s / 86400) + "d ago";
}

// ======================
// COUNT SYSTEM (DERIVED ONLY)
// ======================
function getKnifeCounts() {
    const counts = {};
    for (const p of memoryPlayers) {
        for (const id of (p.ownedSkins || [])) {
            counts[id] = (counts[id] || 0) + 1;
        }
    }
    return counts;
}

function getCaseCounts() {
    const counts = {};
    for (const p of memoryPlayers) {
        for (const id in (p.cases || {})) {
            counts[id] = (counts[id] || 0) + Number(p.cases[id] || 0);
        }
    }
    return counts;
}

// ======================
// PLAYER JOIN
// ======================
app.post("/player-join", (req, res) => {
    const { userId, username, ownedSkins, equippedSkin, cases } = req.body;

    if (!userId || !username) return res.status(400).send("Missing data");
    if (isSpam(userId)) return res.status(429).send("Too many requests");

    const data = {
        userId: String(userId),
        username: String(username),
        ownedSkins: Array.isArray(ownedSkins) ? ownedSkins : [],
        equippedSkin: equippedSkin || "knife_default",
        cases: cases || {},
        time: new Date().toISOString()
    };

    const i = memoryPlayers.findIndex(p => p.userId === data.userId);
    if (i !== -1) memoryPlayers[i] = data;
    else memoryPlayers.push(data);

    res.json({ ok: true });
});

// ======================
// SIMPLE PAGES (FIXED DATA USAGE)
// ======================

// DASHBOARD
app.get("/dashboard", (req, res) => {
    const knifeCounts = getKnifeCounts();
    const caseCounts = getCaseCounts();

    const totalSkins = memoryPlayers.reduce((a, p) => a + (p.ownedSkins?.length || 0), 0);
    const totalCases = Object.values(caseCounts).reduce((a, b) => a + b, 0);

    const body = `
    <h1>Dashboard</h1>
    <p>Players: ${memoryPlayers.length}</p>
    <p>Total Skins: ${totalSkins}</p>
    <p>Total Cases: ${totalCases}</p>
    <p>Knife Types: ${KNIFE_REGISTRY.length}</p>
    `;

    res.send(body);
});

// KNIVES PAGE
app.get("/knives", (req, res) => {
    const counts = getKnifeCounts();

    const html = KNIFE_REGISTRY.map(k => `
        <div>
            ${k.name} (${k.rarity}) - ${counts[k.id] || 0}
        </div>
    `).join("");

    res.send(`<h1>Knives</h1>${html}`);
});

// PLAYERS PAGE
app.get("/players", (req, res) => {
    const rows = memoryPlayers.map(p => `
        <div>
            ${p.username} | Skins: ${p.ownedSkins.length} | Equipped: ${p.equippedSkin}
        </div>
    `).join("");

    res.send(`<h1>Players</h1>${rows}`);
});

// ======================
// DATA API
// ======================
app.get("/players-data", (req, res) => res.json(memoryPlayers));

app.get("/knives-data", (req, res) => {
    const counts = getKnifeCounts();
    res.json(KNIFE_REGISTRY.map(k => ({
        ...k,
        existCount: counts[k.id] || 0
    })));
});

app.get("/cases-data", (req, res) => {
    const counts = getCaseCounts();
    res.json(CASE_REGISTRY.map(c => ({
        ...c,
        existCount: counts[c.id] || 0
    })));
});

// ======================
// START
// ======================
app.listen(3000, () => {
    console.log("🚀 Server running on port 3000");
});
