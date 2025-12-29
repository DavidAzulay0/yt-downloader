import express from "express";
import { exec } from "child_process";
import fs from "fs";

const app = express();
app.use(express.json());

const TMP_DIR = "/tmp";
const YT_DLP_BIN = "/usr/local/bin/yt-dlp";

/**
 * Health check
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
 * Retorna: arquivo binário (video/mp4) no response
 */
app.post("/download", (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "url is required" });
  }

  const outputTemplate = `${TMP_DIR}/video-%(id)s.%(ext)s`;

  const command =
    `${YT_DLP_BIN} ` +
    `-f "bestvideo[height<=360]+bestaudio/best[height<=360]" ` +
    `--merge-output-format mp4 ` +
    `-o "${outputTemplate}" ` +
    `"${url}"`;

  exec(
    command,
    { maxBuffer: 1024 * 1024 * 50 },
    (error) => {
      if (error) {
        return res.status(500).json({ error: "download failed" });
      }

      const files = fs
        .readdirSync(TMP_DIR)
        .filter(
          (f) => f.startsWith("video-") && f.endsWith(".mp4")
        );

      if (!files.length) {
        return res.status(500).json({ error: "file not found" });
      }

      const fileName = files[0];
      const filePath = `${TMP_DIR}/${fileName}`;

      res.setHeader("Content-Type", "video/mp4");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileName}"`
      );

      const stream = fs.createReadStream(filePath);
      stream.pipe(res);

      stream.on("close", () => {
        fs.unlink(filePath, () => {});
      });
    }
  );
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Downloader running on port ${PORT}`);
});
