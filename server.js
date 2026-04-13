does this work?
const express = require("express");
const app = express();
app.use(express.json());

// ======================
// MEMORY DB
// ======================
let memoryPlayers = [];

// Built-in knife registry — add/remove knives here
// existCount is auto-calculated from player inventories
const KNIFE_REGISTRY = [
    { id: "knife_default",    name: "Knife",         rarity: "Common",    color: "#94a3b8" },
    { id: "knife_bone",       name: "Bone Knife",    rarity: "Common",    color: "#94a3b8" },
    { id: "knife_iron",       name: "Iron Blade",    rarity: "Uncommon",  color: "#4ade80" },
    { id: "knife_shadow",     name: "Shadow Edge",   rarity: "Uncommon",  color: "#4ade80" },
    { id: "knife_frost",      name: "Frost Fang",    rarity: "Rare",      color: "#60a5fa" },
    { id: "knife_ember",      name: "Ember Blade",   rarity: "Rare",      color: "#60a5fa" },
    { id: "knife_dragon",     name: "Dragon",        rarity: "Epic",      color: "#a78bfa" },
    { id: "knife_aurora",     name: "Aurora",        rarity: "Epic",      color: "#a78bfa" },
    { id: "knife_neon",       name: "Neon Slice",    rarity: "Epic",      color: "#a78bfa" },
    { id: "knife_void",       name: "Void Reaper",   rarity: "Legendary", color: "#f59e0b" },
    { id: "knife_cosmic",     name: "Cosmic Fang",   rarity: "Legendary", color: "#f59e0b" },
    { id: "knife_eternal",    name: "Eternal Edge",  rarity: "Mythic",    color: "#f43f5e" },
];

const RARITY_ORDER = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythic"];

// simple anti-spam
const lastRequest = new Map();
function isSpam(userId) {
    const now = Date.now();
    const last = lastRequest.get(userId) || 0;
    if (now - last < 1500) return true;
    lastRequest.set(userId, now);
    return false;
}

function timeAgo(iso) {
    if (!iso) return "—";
    const s = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (s < 60) return s + "s ago";
    if (s < 3600) return Math.floor(s / 60) + "m ago";
    if (s < 86400) return Math.floor(s / 3600) + "h ago";
    return Math.floor(s / 86400) + "d ago";
}

function getKnifeExistCounts() {
    const counts = {};
    for (const p of memoryPlayers) {
        const skins = Array.isArray(p.ownedSkins) ? p.ownedSkins : [];
        for (const skin of skins) {
            counts[skin] = (counts[skin] || 0) + 1;
        }
    }
    return counts;
}

// Shared HTML shell
function shell(title, activeTab, body) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} — Knife Vault</title>
<link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  :root{
    --bg:#0b0f1a;
    --surface:#0f1623;
    --surface2:#111827;
    --border:#1e2d42;
    --border2:#263548;
    --text:#e2e8f0;
    --muted:#7a8fa6;
    --faint:#3a5070;
    --accent:#38bdf8;
    --font-head:'Rajdhani',sans-serif;
    --font-body:'Inter',sans-serif;
  }
  body{font-family:var(--font-body);background:var(--bg);color:var(--text);min-height:100vh}

  .topbar{background:var(--surface);border-bottom:1px solid var(--border);padding:0 28px;height:58px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100}
  .topbar-brand{display:flex;align-items:center;gap:10px}
  .brand-icon{width:30px;height:30px;background:linear-gradient(135deg,#1e3a5f,#0e6ba8);border-radius:7px;display:flex;align-items:center;justify-content:center;font-family:var(--font-head);font-weight:700;font-size:13px;color:#60c8ff;letter-spacing:1px}
  .brand-name{font-family:var(--font-head);font-size:18px;font-weight:700;color:var(--text);letter-spacing:1px}
  .brand-status{background:#1a3a2e;color:#4ade80;font-size:10px;font-weight:600;padding:2px 8px;border-radius:4px;letter-spacing:0.8px;text-transform:uppercase}
  .nav{display:flex;gap:2px}
  .nav a{color:var(--muted);font-size:13px;font-weight:500;padding:7px 14px;border-radius:6px;cursor:pointer;text-decoration:none;transition:all 0.15s}
  .nav a:hover{background:#1a2436;color:var(--text)}
  .nav a.active{background:#1a2d3d;color:var(--accent);border:1px solid #1e3d55}

  .page{padding:28px;max-width:1280px;margin:0 auto}
  .page-header{margin-bottom:24px}
  .page-title{font-family:var(--font-head);font-size:26px;font-weight:700;color:var(--text);letter-spacing:1px;margin-bottom:4px}
  .page-sub{font-size:13px;color:var(--muted)}

  .stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:28px}
  .stat{background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:16px 18px}
  .stat-label{font-size:10px;color:var(--faint);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;font-weight:600}
  .stat-val{font-family:var(--font-head);font-size:26px;font-weight:700;color:var(--text)}

  .section{margin-bottom:36px}
  .section-bar{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
  .section-title{font-family:var(--font-head);font-size:16px;font-weight:700;color:var(--text);letter-spacing:1px;display:flex;align-items:center;gap:8px}
  .section-count{background:var(--surface2);border:1px solid var(--border);color:var(--muted);font-size:11px;font-weight:600;padding:2px 8px;border-radius:12px;font-family:var(--font-body)}
  .search-bar{background:var(--surface2);border:1px solid var(--border);border-radius:7px;padding:7px 12px;color:var(--text);font-size:13px;outline:none;width:220px;font-family:var(--font-body);transition:border 0.15s}
  .search-bar::placeholder{color:var(--faint)}
  .search-bar:focus{border-color:#2a4a6a}

  .knife-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px}
  .knife-card{background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:16px 14px;transition:border-color 0.15s,transform 0.1s;position:relative;overflow:hidden}
  .knife-card:hover{border-color:var(--border2);transform:translateY(-1px)}
  .knife-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--rarity-color,#94a3b8)}
  .knife-icon{font-size:28px;margin-bottom:10px;display:block;line-height:1}
  .knife-name{font-family:var(--font-head);font-size:14px;font-weight:700;color:var(--text);letter-spacing:0.5px;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .knife-rarity{font-size:11px;font-weight:600;margin-bottom:10px}
  .knife-exists-label{font-size:10px;color:var(--faint);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:3px}
  .knife-exists-val{font-family:var(--font-head);font-size:20px;font-weight:700;color:var(--text)}
  .knife-exists-zero{color:var(--faint)}

  .table-wrap{background:var(--surface2);border:1px solid var(--border);border-radius:10px;overflow:hidden}
  table{width:100%;border-collapse:collapse}
  thead th{background:var(--surface);color:var(--faint);font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px;padding:10px 16px;text-align:left;border-bottom:1px solid var(--border)}
  tbody tr{border-bottom:1px solid #141e2b;transition:background 0.1s}
  tbody tr:last-child{border-bottom:none}
  tbody tr:hover{background:#131d2e}
  td{padding:11px 16px;font-size:13px;color:#c4d0de;vertical-align:middle}
  .avatar{width:34px;height:34px;border-radius:8px;object-fit:cover;background:#1a2436;display:block}
  .player-cell{display:flex;align-items:center;gap:10px}
  .player-name{font-size:13px;font-weight:600;color:var(--text)}
  .player-id{font-size:11px;color:var(--faint)}
  .pill{display:inline-flex;align-items:center;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600}
  .pill-skin{background:#1a2e4a;color:#60a5fa}
  .pill-cases{background:#1e1a2e;color:#a78bfa}
  .pill-equipped{background:#1a2d22;color:#4ade80}
  .equipped-dot{width:6px;height:6px;border-radius:50%;background:#4ade80;display:inline-block;margin-right:5px}
  .empty-state{padding:48px;text-align:center;color:var(--faint);font-size:13px}
  .empty-icon{font-size:32px;display:block;margin-bottom:10px;opacity:0.4}

  .r-common{color:#94a3b8}
  .r-uncommon{color:#4ade80}
  .r-rare{color:#60a5fa}
  .r-epic{color:#a78bfa}
  .r-legendary{color:#f59e0b}
  .r-mythic{color:#f43f5e}

  @media(max-width:700px){
    .stats-row{grid-template-columns:repeat(2,1fr)}
    .knife-grid{grid-template-columns:repeat(auto-fill,minmax(140px,1fr))}
    .topbar .nav{display:none}
    .page{padding:16px}
  }
</style>
</head>
<body>
<div class="topbar">
  <div class="topbar-brand">
    <div class="brand-icon">KV</div>
    <span class="brand-name">KNIFE VAULT</span>
    <span class="brand-status">Live</span>
  </div>
  <nav class="nav">
    <a href="/dashboard" class="${activeTab === 'dashboard' ? 'active' : ''}">Dashboard</a>
    <a href="/knives" class="${activeTab === 'knives' ? 'active' : ''}">Knives</a>
    <a href="/players" class="${activeTab === 'players' ? 'active' : ''}">Players</a>
  </nav>
</div>
${body}
<script>setTimeout(() => location.reload(), 20000);</script>
</body>
</html>`;
}

// ======================
// HOME → redirect
// ======================
app.get("/", (req, res) => res.redirect("/dashboard"));

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
        cases: (cases && typeof cases === "object") ? cases : {},
        time: new Date().toISOString()
    };

    const index = memoryPlayers.findIndex(p => p.userId === safeData.userId);
    if (index !== -1) memoryPlayers[index] = safeData;
    else memoryPlayers.push(safeData);

    console.log("📥 PLAYER:", username);
    res.json({ ok: true });
});

// ======================
// JSON ENDPOINTS
// ======================
app.get("/players-data", (req, res) => res.json(memoryPlayers));
app.get("/players-data/:id", (req, res) => {
    const player = memoryPlayers.find(p => p.userId === req.params.id);
    if (!player) return res.status(404).json({ error: "Not found" });
    res.json(player);
});
app.get("/knives-data", (req, res) => {
    const existCounts = getKnifeExistCounts();
    res.json(KNIFE_REGISTRY.map(k => ({ ...k, existCount: existCounts[k.name] || 0 })));
});

// ======================
// KNIVES PAGE
// ======================
app.get("/knives", (req, res) => {
    const existCounts = getKnifeExistCounts();
    const totalExist = Object.values(existCounts).reduce((a, b) => a + b, 0);
    const icons = { Common: "🗡️", Uncommon: "⚔️", Rare: "🌀", Epic: "💜", Legendary: "✨", Mythic: "🔥" };

    const sorted = [...KNIFE_REGISTRY].sort(
        (a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity)
    );

    const knifeCards = sorted.map(k => {
        const count = existCounts[k.name] || 0;
        const rarityClass = "r-" + k.rarity.toLowerCase();
        return `
        <div class="knife-card" style="--rarity-color:${k.color}" data-search="${k.name.toLowerCase()} ${k.rarity.toLowerCase()}">
          <span class="knife-icon">${icons[k.rarity] || "🗡️"}</span>
          <div class="knife-name" title="${k.name}">${k.name}</div>
          <div class="knife-rarity ${rarityClass}">${k.rarity}</div>
          <div class="knife-exists-label">Exist Count</div>
          <div class="knife-exists-val ${count === 0 ? 'knife-exists-zero' : ''}">${count.toLocaleString()}</div>
        </div>`;
    }).join("");

    const rarestOwned = [...KNIFE_REGISTRY]
        .filter(k => existCounts[k.name] > 0)
        .sort((a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity));

    const body = `
<div class="page">
  <div class="page-header">
    <div class="page-title">Knife Database</div>
    <div class="page-sub">All knives in the game — exist counts calculated live from player inventories</div>
  </div>
  <div class="stats-row">
    <div class="stat"><div class="stat-label">Total Knives</div><div class="stat-val">${KNIFE_REGISTRY.length}</div></div>
    <div class="stat"><div class="stat-label">In Circulation</div><div class="stat-val">${totalExist.toLocaleString()}</div></div>
    <div class="stat">
      <div class="stat-label">Rarest Owned</div>
      <div class="stat-val" style="font-size:16px">${rarestOwned.length ? rarestOwned[0].name : "None"}</div>
    </div>
    <div class="stat"><div class="stat-label">Players Tracked</div><div class="stat-val">${memoryPlayers.length}</div></div>
  </div>
  <div class="section">
    <div class="section-bar">
      <div class="section-title">All Knives <span class="section-count">${KNIFE_REGISTRY.length}</span></div>
      <input class="search-bar" id="knife-search" placeholder="Search by name or rarity..." oninput="filterKnives()">
    </div>
    <div class="knife-grid" id="knife-grid">${knifeCards}</div>
  </div>
</div>
<script>
function filterKnives() {
  const q = document.getElementById('knife-search').value.toLowerCase();
  document.querySelectorAll('#knife-grid .knife-card').forEach(c => {
    c.style.display = c.dataset.search.includes(q) ? '' : 'none';
  });
}
</script>`;

    res.send(shell("Knife Database", "knives", body));
});

// ======================
// PLAYERS PAGE
// ======================
app.get("/players", (req, res) => {
    const totalSkins = memoryPlayers.reduce((a, p) => a + (Array.isArray(p.ownedSkins) ? p.ownedSkins.length : 0), 0);
    const totalCases = memoryPlayers.reduce((a, p) => {
        let c = 0; for (let k in (p.cases || {})) c += Number(p.cases[k]) || 0;
        return a + c;
    }, 0);

    const rows = memoryPlayers.map(p => {
        const skins = Array.isArray(p.ownedSkins) ? p.ownedSkins : [];
        let cc = 0; for (let k in (p.cases || {})) cc += Number(p.cases[k]) || 0;
        return `
        <tr class="player-row" data-search="${p.username.toLowerCase()} ${p.userId}">
          <td>
            <div class="player-cell">
              <img class="avatar" src="https://www.roblox.com/headshot-thumbnail/image?userId=${p.userId}&width=100&height=100&format=png"
                onerror="this.style.background='#1a2436';this.removeAttribute('src')">
              <div><div class="player-name">${p.username}</div><div class="player-id">${p.userId}</div></div>
            </div>
          </td>
          <td><span class="pill pill-skin">${skins.length} skin${skins.length !== 1 ? "s" : ""}</span></td>
          <td><span class="pill pill-cases">${cc} case${cc !== 1 ? "s" : ""}</span></td>
          <td><span class="pill pill-equipped"><span class="equipped-dot"></span>${p.equippedSkin || "Knife"}</span></td>
          <td style="color:var(--muted)">${timeAgo(p.time)}</td>
        </tr>`;
    }).join("");

    const body = `
<div class="page">
  <div class="page-header">
    <div class="page-title">Players</div>
    <div class="page-sub">All tracked players and their inventory snapshots</div>
  </div>
  <div class="stats-row">
    <div class="stat"><div class="stat-label">Total Players</div><div class="stat-val">${memoryPlayers.length}</div></div>
    <div class="stat"><div class="stat-label">Total Skins</div><div class="stat-val">${totalSkins}</div></div>
    <div class="stat"><div class="stat-label">Total Cases</div><div class="stat-val">${totalCases}</div></div>
    <div class="stat"><div class="stat-label">Avg Skins/Player</div><div class="stat-val">${memoryPlayers.length ? (totalSkins / memoryPlayers.length).toFixed(1) : "0"}</div></div>
  </div>
  <div class="section">
    <div class="section-bar">
      <div class="section-title">All Players <span class="section-count">${memoryPlayers.length}</span></div>
      <input class="search-bar" id="player-search" placeholder="Search username or ID..." oninput="filterPlayers()">
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Player</th><th>Skins</th><th>Cases</th><th>Equipped</th><th>Last Seen</th></tr></thead>
        <tbody id="ptbody">
          ${rows || `<tr><td colspan="5" class="empty-state"><span class="empty-icon">👤</span>No players have joined yet</td></tr>`}
        </tbody>
      </table>
    </div>
  </div>
</div>
<script>
function filterPlayers() {
  const q = document.getElementById('player-search').value.toLowerCase();
  document.querySelectorAll('.player-row').forEach(r => {
    r.style.display = r.dataset.search.includes(q) ? '' : 'none';
  });
}
</script>`;

    res.send(shell("Players", "players", body));
});

// ======================
// DASHBOARD
// ======================
app.get("/dashboard", (req, res) => {
    const existCounts = getKnifeExistCounts();
    const totalSkins = memoryPlayers.reduce((a, p) => a + (Array.isArray(p.ownedSkins) ? p.ownedSkins.length : 0), 0);
    const totalCases = memoryPlayers.reduce((a, p) => {
        let c = 0; for (let k in (p.cases || {})) c += Number(p.cases[k]) || 0;
        return a + c;
    }, 0);

    const icons = { Common: "🗡️", Uncommon: "⚔️", Rare: "🌀", Epic: "💜", Legendary: "✨", Mythic: "🔥" };

    const topKnives = [...KNIFE_REGISTRY]
        .filter(k => existCounts[k.name] > 0)
        .sort((a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity))
        .slice(0, 6);

    const topKnifeCards = topKnives.map(k => {
        const rarityClass = "r-" + k.rarity.toLowerCase();
        return `
        <div class="knife-card" style="--rarity-color:${k.color}">
          <span class="knife-icon">${icons[k.rarity] || "🗡️"}</span>
          <div class="knife-name">${k.name}</div>
          <div class="knife-rarity ${rarityClass}">${k.rarity}</div>
          <div class="knife-exists-label">Exist Count</div>
          <div class="knife-exists-val">${(existCounts[k.name] || 0).toLocaleString()}</div>
        </div>`;
    }).join("") || `<div style="color:var(--faint);font-size:13px;padding:20px 0">No knives in circulation yet — players need to join first.</div>`;

    const recentRows = [...memoryPlayers]
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .slice(0, 5)
        .map(p => {
            const skins = Array.isArray(p.ownedSkins) ? p.ownedSkins : [];
            return `
            <tr>
              <td>
                <div class="player-cell">
                  <img class="avatar" src="https://www.roblox.com/headshot-thumbnail/image?userId=${p.userId}&width=100&height=100&format=png"
                    onerror="this.style.background='#1a2436';this.removeAttribute('src')">
                  <div><div class="player-name">${p.username}</div><div class="player-id">${p.userId}</div></div>
                </div>
              </td>
              <td><span class="pill pill-equipped"><span class="equipped-dot"></span>${p.equippedSkin || "Knife"}</span></td>
              <td><span class="pill pill-skin">${skins.length}</span></td>
              <td style="color:var(--muted)">${timeAgo(p.time)}</td>
            </tr>`;
        }).join("") || `<tr><td colspan="4" class="empty-state"><span class="empty-icon">👤</span>No players yet</td></tr>`;

    const body = `
<div class="page">
  <div class="page-header">
    <div class="page-title">Overview</div>
    <div class="page-sub">Live snapshot — auto-refreshes every 20 seconds</div>
  </div>
  <div class="stats-row">
    <div class="stat"><div class="stat-label">Players</div><div class="stat-val">${memoryPlayers.length}</div></div>
    <div class="stat"><div class="stat-label">Total Skins</div><div class="stat-val">${totalSkins}</div></div>
    <div class="stat"><div class="stat-label">Total Cases</div><div class="stat-val">${totalCases}</div></div>
    <div class="stat"><div class="stat-label">Knife Types</div><div class="stat-val">${KNIFE_REGISTRY.length}</div></div>
  </div>
  <div class="section">
    <div class="section-bar">
      <div class="section-title">Rarest Knives in Circulation</div>
      <a href="/knives" style="font-size:12px;color:var(--accent);text-decoration:none;font-weight:500">View all →</a>
    </div>
    <div class="knife-grid" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">${topKnifeCards}</div>
  </div>
  <div class="section">
    <div class="section-bar">
      <div class="section-title">Recent Players</div>
      <a href="/players" style="font-size:12px;color:var(--accent);text-decoration:none;font-weight:500">View all →</a>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Player</th><th>Equipped</th><th>Skins</th><th>Last Seen</th></tr></thead>
        <tbody>${recentRows}</tbody>
      </table>
    </div>
  </div>
</div>`;

    res.send(shell("Dashboard", "dashboard", body));
});

// ======================
// START
// ======================
app.listen(3000, () => {
    console.log("🚀 Running on port 3000");
    console.log("   /dashboard  — Overview");
    console.log("   /knives     — Knife database with exist counts");
    console.log("   /players    — All players");
});
