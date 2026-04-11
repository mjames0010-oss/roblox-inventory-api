const express = require("express");
const app = express();

app.use(express.json());

const SECRET = "mySuperSecret123";
let inventories = {};

app.get("/", (req, res) => {
    res.send("Inventory API is running!");
});

app.post("/update-inventory", (req, res) => {
    const { userId, data, secret } = req.body;

    if (secret !== SECRET) {
        return res.status(403).send("Invalid secret");
    }

    if (!userId) return res.sendStatus(400);

    inventories[userId] = data;

    console.log("Updated inventory for:", userId);

    res.sendStatus(200);
});

app.get("/inventory/:userId", (req, res) => {
    const userId = req.params.userId;

    res.json(inventories[userId] || {
        OwnedSkins: [],
        EquippedSkin: null
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Inventory API running on port", PORT);
});
