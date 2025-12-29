import express from "express";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

const app = express();
app.use(express.json());

const TMP_DIR = "/tmp";

/**
 * Root (opcional, só para sanity check)
 */
app.get("/", (_, res) => {
  res.send("yt-downloader running");
});

/**
 * Health check (usado pelo n8n)
 */
app.get("/health", (_, res) => {
  res.json({
    status: "ok",
    service: "yt-downloader",
    timestamp: new Date().toISOString(),
  });
});

/**
 * Download endpoint
 * Recebe: { url: "https://youtube.com/..." }
 * Retorna: { status, fileName, filePath }
 */
app.post("/download", (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "url is required" });
  }

  // nome previsível para facilitar leitura posterior
  const outputTemplate = `${TMP_DIR}/video-%(id)s.%(ext)s`;

  // ⚠️ comando em UMA linha (evita bugs no Alpine)
  const YT_DLP_BIN = "/usr/local/bin/yt-dlp";

const command =
  `${YT_DLP_BIN} -f "bestvideo[height<=360]+bestaudio/best[height<=360]" ` +
  `--merge-output-format mp4 ` +
  `-o "${outputTemplate}" ` +
  `"${url}"`;


  console.log("▶ Running command:", command);

  exec(
    command,
    {
      maxBuffer: 1024 * 1024 * 50, // 50 MB de buffer (yt-dlp gera muito log)
    },
    (error, stdout, stderr) => {
      if (error) {
        console.error("❌ yt-dlp ERROR:", error);
        console.error("❌ STDERR:", stderr);

        return res.status(500).json({
          error: "download failed",
          details: stderr || error.message,
        });
      }

      console.log("✅ yt-dlp STDOUT:", stdout);

      // localizar o arquivo baixado
      let files;
      try {
        files = fs
          .readdirSync(TMP_DIR)
          .filter((f) => f.startsWith("video-") && f.endsWith(".mp4"));
      } catch (fsError) {
        console.error("❌ FS ERROR:", fsError);
        return res.status(500).json({ error: "failed to read tmp dir" });
      }

      if (!files.length) {
        return res.status(500).json({
          error: "file not found after download",
        });
      }

      const fileName = files[0];
      const filePath = path.join(TMP_DIR, fileName);

      console.log("📦 File ready:", filePath);

      return res.json({
        status: "ok",
        fileName,
        filePath,
      });
    }
  );
});

const PORT = 3000;

import { execSync } from "child_process";

try {
  const version = execSync("/usr/local/bin/yt-dlp --version").toString();
  console.log("✅ yt-dlp FOUND:", version);
} catch (err) {
  console.error("❌ yt-dlp NOT FOUND", err);
}

app.listen(PORT, () => {
  console.log(`🚀 Downloader running on port ${PORT}`);
});
