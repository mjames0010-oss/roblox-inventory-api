const express = require("express");
const app = express();

app.use(express.json());

/*
  HOME ROUTE
  This fixes "Not Found" when you open the link
*/
app.get("/", (req, res) => {
    res.send("Inventory API is running!");
});

/*
  MEMORY STORAGE (temporary)
  This stores inventories while server is running
*/
let inventories = {};

/*
  ROBLOX → SEND INVENTORY HERE
*/
app.post("/update-inventory", (req, res) => {
    const { userId, data } = req.body;

    if (!userId) return res.sendStatus(400);

    inventories[userId] = data;

    console.log("Updated inventory for:", userId);

    res.sendStatus(200);
});

/*
  DISCORD BOT → READ INVENTORY HERE
*/
app.get("/inventory/:userId", (req, res) => {
    const userId = req.params.userId;

    res.json(inventories[userId] || {
        OwnedSkins: []
    });
});

/*
  START SERVER (IMPORTANT FOR RENDER)
*/
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Inventory API running on port", PORT);
});