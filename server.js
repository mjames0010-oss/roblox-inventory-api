const express = require("express");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");

const app = express();
app.use(express.json({ limit: "50kb" }));

// ======================
// SECURITY CONFIG
// ======================
const SECRET = process.env.API_SECRET || "CHANGE_THIS_NOW";

// Rate limit (basic anti-spam)
app.use("/player-update", rateLimit({
    windowMs: 60 * 1000,
    max: 60
}));

// Memory cache
let players = new Map();

// ======================
// HELPER: VERIFY SIGNATURE
// ======================
function verifySignature(body, signature) {
    const expected = crypto
        .createHmac("sha256", SECRET)
        .update(JSON.stringify(body))
        .digest("hex");

    return signature === expected;
}

// ======================
// SANITIZE OUTPUT (XSS FIX)
// ======================
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// ======================
// RECEIVE SNAPSHOT (LOCKED DOWN)
// ======================
app.post("/player-update", (req, res) => {

    const signature = req.headers["x-signature"];

    if (!verifySignature(req.body, signature)) {
        return res.status(403).send("Forbidden");
    }

    const { userId, username, data } = req.body;

    if (
        typeof userId !== "number" ||
        typeof username !== "string" ||
        typeof data !== "object"
    ) {
        return res.status(400).send("Invalid");
    }

    players.set(userId, {
        userId,
        username,
        data,
        time: Date.now()
    });

    res.json({ ok: true });
});

// ======================
// GET PLAYERS
// ======================
app.get("/players", (req, res) => {
    res.json([...players.values()]);
});

// ======================
// DASHBOARD (SAFE)
// ======================
app.get("/dashboard", (req, res) => {

    const list = [...players.values()];

    const html = list.map(p => {

        const data = p.data || {};
        const skins = data.OwnedSkins || [];
        const cases = data.Cases || {};

        let caseCount = 0;
        for (let k in cases) caseCount += cases[k];

        return `
        <div style="padding:10px;margin:10px;background:#222;color:white;">
            <b>${escapeHtml(p.username)}</b><br>
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

app.listen(3000, () => console.log("API running"));
