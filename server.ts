import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import { kv } from "@vercel/kv";
import { createClient } from "redis";

const app = express();
const PORT = 3000;
const LEADERBOARD_FILE = path.join(process.cwd(), "leaderboard.json");
const LEADERBOARD_KEY = "game_leaderboard";

let redisClient: ReturnType<typeof createClient> | null = null;
if (process.env.REDIS_URL) {
  redisClient = createClient({ url: process.env.REDIS_URL });
  redisClient.connect().catch(console.error);
}

app.use(express.json());

// Initialize leaderboard file if it doesn't exist (local fallback)
if (!fs.existsSync(LEADERBOARD_FILE)) {
  fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify([]));
}

app.get("/api/leaderboard", async (req, res) => {
  try {
    let data;
    if (redisClient && redisClient.isReady) {
      const raw = await redisClient.get(LEADERBOARD_KEY);
      data = raw ? JSON.parse(raw as string) : [];
    } else if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      data = (await kv.get(LEADERBOARD_KEY)) || [];
    } else {
      data = JSON.parse(fs.readFileSync(LEADERBOARD_FILE, "utf-8"));
    }
    const sorted = data.sort((a: any, b: any) => a.time - b.time).slice(0, 10);
    res.json(sorted);
  } catch (err) {
    console.error("GET leaderboard error:", err);
    res.status(500).json({ error: "Failed to read leaderboard" });
  }
});

app.post("/api/leaderboard", async (req, res) => {
  try {
    const { name, time } = req.body;
    if (!name || !time) {
       return res.status(400).json({ error: "Name and time are required" });
    }
    
    let data;
    const isKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
    const isRedis = redisClient && redisClient.isReady;
    
    if (isRedis) {
      const raw = await redisClient!.get(LEADERBOARD_KEY);
      data = raw ? JSON.parse(raw as string) : [];
    } else if (isKV) {
      data = (await kv.get(LEADERBOARD_KEY)) || [];
    } else {
      data = JSON.parse(fs.readFileSync(LEADERBOARD_FILE, "utf-8"));
    }
    
    data.push({
      id: Date.now(),
      name,
      time,
      date: new Date().toISOString()
    });
    
    const sorted = data.sort((a: any, b: any) => a.time - b.time).slice(0, 100); // keep top 100
    
    if (isRedis) {
      await redisClient!.set(LEADERBOARD_KEY, JSON.stringify(sorted));
    } else if (isKV) {
      await kv.set(LEADERBOARD_KEY, sorted);
    } else {
      fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(sorted, null, 2));
    }
    
    res.json({ success: true, leaderboard: sorted.slice(0, 10) });
  } catch (err) {
    console.error("POST leaderboard error:", err);
    res.status(500).json({ error: "Failed to write leaderboard" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
