import express from "express";
import multer from "multer";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";

const app = express();
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
      const { start_sec, end_sec } = req.body;
      const audio = req.files.audio[0];

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

      // ВРЕМЕННО: просто возвращаем файл
      res.download(clippedAudio, "result.mp4");
    } catch (e) {
      console.error(e);
      res.status(500).send("Generation failed");
    }
  }
);

app.listen(3000, () => {
  console.log("Backend running on port 3000");
});
