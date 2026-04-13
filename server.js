const express = require("express");
const app = express();

app.use(express.json());

// MEMORY CACHE ONLY (display)
let players = new Map();

// ======================
// RECEIVE SERVER SNAPSHOT ONLY
// ======================
app.post("/player-update", (req, res) => {

    const { userId, username, data } = req.body;

    if (!userId || !data) {
        return res.status(400).send("Invalid");
    }

    // TRUST ONLY ROBLOX SERVER SNAPSHOTS
    players.set(userId, {
        userId,
        username,
        data,
        time: Date.now()
    });

    res.json({ ok: true });
});

// ======================
// GET PLAYERS (FOR UI ONLY)
// ======================
app.get("/players", (req, res) => {
    res.json([...players.values()]);
});

// ======================
// DASHBOARD
// ======================
app.get("/dashboard", (req, res) => {

    const list = [...players.values()];

    const html = list.map(p => {

        const data = p.data || {};
        const skins = data.OwnedSkins || {};
        const cases = data.Cases || {};

        let caseCount = 0;
        for (let k in cases) caseCount += cases[k];

        return `
        <div style="padding:10px;margin:10px;background:#222;color:white;">
            <b>${p.username}</b><br>
            Skins: ${Array.isArray(skins) ? skins.length : 0}<br>
            Cases: ${caseCount}
        </div>
        `;
    }).join("");

    res.send(`
        <html>
        <body style="background:#111;color:white;font-family:Arial;">
        <h2>SERVER AUTHORITATIVE DASHBOARD</h2>
        ${html}
        </body>
        </html>
    `);
});

// ======================
app.listen(3000, () => console.log("API running"));
