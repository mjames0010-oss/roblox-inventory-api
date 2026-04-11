const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());

let players = {};

//--------------------------------------------------
// ROBLOX API ENDPOINT
//--------------------------------------------------
app.post("/player-join", (req, res) => {
    const data = req.body;

    players[data.userId] = {
        ...data,
        lastSeen: Date.now()
    };

    // 🔥 LIVE UPDATE TO DASHBOARD
    io.emit("playerUpdate", players[data.userId]);

    res.json({ ok: true });
});

//--------------------------------------------------
// DASHBOARD (INLINE HTML)
//--------------------------------------------------
app.get("/", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
<title>Admin Panel</title>

<style>
body {
    margin: 0;
    font-family: Arial;
    background: #0f0f0f;
    color: white;
    display: flex;
}

#sidebar {
    width: 300px;
    background: #161616;
    height: 100vh;
    overflow-y: auto;
    border-right: 1px solid #333;
}

.player {
    padding: 12px;
    border-bottom: 1px solid #222;
    cursor: pointer;
}

.player:hover {
    background: #222;
}

#main {
    flex: 1;
    padding: 20px;
}

.badge {
    font-size: 12px;
    background: #333;
    padding: 3px 6px;
    border-radius: 6px;
}

.item {
    margin: 5px 0;
    color: #ccc;
}

h2 {
    color: #00ffcc;
}
</style>

</head>
<body>

<div id="sidebar"></div>

<div id="main">
    <h2>👈 Select a player</h2>
</div>

<script src="/socket.io/socket.io.js"></script>
<script>
const socket = io();

let players = {};
let selected = null;

const sidebar = document.getElementById("sidebar");
const main = document.getElementById("main");

//----------------------------
// RENDER LIST
//----------------------------
function render() {
    sidebar.innerHTML = "";

    Object.values(players).forEach(p => {
        const div = document.createElement("div");
        div.className = "player";

        div.innerHTML = "<b>" + p.username + "</b><br><span class='badge'>" + p.userId + "</span>";

        div.onclick = () => show(p);

        sidebar.appendChild(div);
    });
}

//----------------------------
// SHOW PLAYER
//----------------------------
function show(p) {
    selected = p;

    let inv = "";

    for (const item of (p.ownedSkins || [])) {
        if (item.owned) {
            inv += "<div class='item'>📦 " + item.name + " x" + item.owned + "</div>";
        } else if (item.serialItems) {
            inv += "<div class='item'>💎 " + item.name + " (Serials: " + item.serialItems.length + ")</div>";
        } else {
            inv += "<div class='item'>📦 " + item.name + "</div>";
        }
    }

    main.innerHTML = `
        <h2>👤 ${p.username}</h2>
        <p>Equipped: <b>${p.equippedSkin}</b></p>
        <p>Inventory Size: ${p.inventorySize}</p>

        <h3>Inventory</h3>
        ${inv}
    `;
}

//----------------------------
// SOCKET
//----------------------------
socket.on("init", (data) => {
    players = data;
    render();
});

socket.on("playerUpdate", (p) => {
    players[p.userId] = p;
    render();

    if (selected && selected.userId === p.userId) {
        show(p);
    }
});
</script>

</body>
</html>
    `);
});

//--------------------------------------------------
// SOCKET INIT
//--------------------------------------------------
io.on("connection", (socket) => {
    socket.emit("init", players);
});

//--------------------------------------------------
server.listen(3000, () => {
    console.log("🚀 Admin Panel running on http://localhost:3000");
});
