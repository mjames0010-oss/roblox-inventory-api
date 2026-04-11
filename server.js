const express = require("express");
const app = express();

app.use(express.json());

let logs = [];

app.post("/player-join", (req, res) => {
    logs.unshift(req.body);

    if (logs.length > 20) logs.pop();

    res.json({ ok: true });
});

app.get("/", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
<title>Inventory API Dashboard</title>
<style>
body {
    font-family: Arial;
    background: #0f0f0f;
    color: white;
    margin: 0;
    padding: 20px;
}

h1 {
    text-align: center;
    color: #00ffcc;
}

.card {
    background: #1c1c1c;
    padding: 15px;
    margin: 10px 0;
    border-radius: 12px;
    border: 1px solid #333;
}

.user {
    color: #00ffcc;
    font-weight: bold;
}

.item {
    margin-left: 10px;
    color: #ccc;
}

.badge {
    display: inline-block;
    padding: 3px 8px;
    border-radius: 8px;
    background: #333;
    margin-left: 5px;
    font-size: 12px;
}
</style>
</head>
<body>

<h1>🎮 Roblox Inventory Dashboard</h1>

${logs.map(l => `
<div class="card">
    <div class="user">👤 ${l.username} <span class="badge">ID: ${l.userId}</span></div>
    <div>🎒 Equipped: ${l.equippedSkin}</div>
    <div>📦 Items:</div>
    <pre class="item">${JSON.stringify(l.ownedSkins, null, 2)}</pre>
</div>
`).join("")}

</body>
</html>
    `);
});

app.listen(3000, () => console.log("API running"));
