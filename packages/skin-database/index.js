const express = require("express");
const app = express();
const config = require("./config");
const db = require("./db");
const iaItems = db.get("internetArchiveItems");
// const info = require("/Volumes/Mobile Backup/skins/cache/info.json");
const Skins = require("./data/skins");
const port = 3001;
const fileUpload = require("express-fileupload");
const { addSkinFromBuffer } = require("./addSkin");
const Discord = require("discord.js");
const Utils = require("./discord-bot/utils");
const cors = require("cors");

const whitelist = ["https://skins.webamp.org", "http://localhost:3000"];
const corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
};

app.use(cors(corsOptions));

app.options("*", cors(corsOptions));

// TODO: Look into 766c4fad9088037ab4839b18292be8b1
// Has huge number of filenames in info.json

app.set("json spaces", 2);
app.use(
  fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 },
  })
);

app.get("/", async (req, res) => {
  res.send("Hello World!");
});

app.get("/skins/", async (req, res) => {
  const { offset = 0, first = 100 } = req.query;
  const [skins, skinCount] = await Promise.all([
    Skins.getMuseumPage({
      offset: Number(offset),
      first: Number(first),
    }),
    Skins.getClassicSkinCount(),
  ]);
  res.json({ skinCount, skins });
});

app.post("/skins/", async (req, res) => {
  const files = req.files;
  if (files == null) {
    res.status(500).send({ error: "No file supplied" });
    return;
  }
  const upload = req.files.skin;
  if (upload == null) {
    res.status(500).send({ error: "No file supplied" });
    return;
  }
  const result = await addSkinFromBuffer(upload.data, upload.name, "Web API");
  res.json({ ...result, filename: upload.name });
});

app.get("/skins/:md5", async (req, res) => {
  const { md5 } = req.params;
  const skin = await Skins.getSkinByMd5(md5);
  if (skin == null) {
    res.status(404).json();
    return;
  }
  res.json(skin);
});

// TODO: Make this POST
app.post("/skins/:md5/report", async (req, res) => {
  const { md5 } = req.params;
  const client = new Discord.Client();
  await client.login(config.discordToken);
  const dest = client.channels.get(config.NSFW_SKIN_CHANNEL_ID);

  // Don't await
  Utils.postSkin({
    md5,
    title: (filename) => `Review: ${filename}`,
    dest,
  });
  res.send("The skin has been reported and will be reviewed shortly.");
});

app.get("/skins/:md5/screenshot.png", async (req, res) => {
  const { md5 } = req.params;
  const { screenshotUrl } = await Skins.getSkinByMd5(md5);
  if (screenshotUrl == null) {
    res.status(404).send();
    return;
  }
  res.redirect(301, screenshotUrl);
});

app.get("/skins/:md5/download", async (req, res) => {
  const { md5 } = req.params;
  const { skinUrl } = await Skins.getSkinByMd5(md5);
  if (skinUrl == null) {
    res.status(404).send();
    return;
  }
  res.redirect(301, skinUrl);
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
