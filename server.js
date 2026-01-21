import express from "express";
import cors from "cors";
import multer from "multer";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.options("*", cors());

app.get("/", (req, res) => res.send("OK"));
app.get("/health", (req, res) => res.json({ ok: true }));

const upload = multer({ dest: "uploads/" });

const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

app.post(
  "/api/generate",
  upload.fields([
    { name: "ref_images", maxCount: 4 },
    { name: "audio", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const start_sec = Number(req.body.start_sec ?? 0);
      const end_sec = Number(req.body.end_sec ?? 0);

      if (!req.files?.audio?.[0]) {
        return res.status(400).send("Missing audio");
      }
      if (!isFinite(start_sec) || !isFinite(end_sec) || end_sec <= start_sec) {
        return res.status(400).send("Invalid start_sec/end_sec");
      }

      const audio = req.files.audio[0];

      // гарантируем папку
      if (!fs.existsSync("uploads")) fs.mkdirSync("uploads", { recursive: true });

      // 1) Обрезаем аудио
      const clippedAudio = `uploads/clip_${Date.now()}.mp3`;

      await new Promise((resolve, reject) => {
        ffmpeg(audio.path)
          .setStartTime(start_sec)
          .setDuration(end_sec - start_sec)
          .output(clippedAudio)
          .on("end", resolve)
          .on("error", reject)
          .run();
      });

      // ВРЕМЕННО: отдаём файл как proof, что pipeline работает
      res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
      return res.download(clippedAudio, "result.mp4");
    } catch (e) {
      console.error(e);
      return res.status(500).send("Generation failed");
    }
  }
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Backend running on port", PORT);
});
