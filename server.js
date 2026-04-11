const express = require("express");
const app = express();

app.use(express.json());

const SECRET = "mySuperSecret123";

// store joins
let joins = [];

app.get("/", (req, res) => {
    res.send("Join Tracker API running!");
});

// ROBLOX sends join data here
app.post("/player-join", (req, res) => {
    const { userId, username, secret } = req.body;

    if (secret !== SECRET) {
        return res.status(403).send("Bad secret");
    }

    if (!userId) return res.sendStatus(400);

    joins.push({
        userId,
        username,
        time: Date.now()
    });

    console.log("Player joined:", username, userId);

    res.sendStatus(200);
});

// view joins (browser test)
app.get("/joins", (req, res) => {
    res.json(joins);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Join Tracker running on port", PORT);
});
