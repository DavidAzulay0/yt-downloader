import express from "express";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

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

  // Ignorar Shorts explicitamente (evita 90% dos erros)
  if (url.includes("/shorts/")) {
    return res.status(422).json({
      error: "shorts_not_supported",
      details: "YouTube Shorts are ignored to keep the pipeline stable",
      url,
    });
  }

  const outputTemplate = path.join(TMP_DIR, "video-%(id)s.%(ext)s");

  const command = `
${YT_DLP_BIN}
"${url}"
-o "${outputTemplate}"
-f "bv*[height<=240]/bv*/best"
--merge-output-format mp4
--no-playlist
--no-check-certificate
--no-warnings
`.replace(/\s+/g, " ").trim();

  exec(
    command,
    { maxBuffer: 1024 * 1024 * 100 },
    (error, stdout, stderr) => {
      if (error) {
        const details =
          stderr?.toString() ||
          stdout?.toString() ||
          error.message;

        console.error("yt-dlp error:", details);

        return res.status(500).json({
          error: "download failed",
          details,
          url,
        });
      }

      const files = fs
        .readdirSync(TMP_DIR)
        .filter(
          (f) => f.startsWith("video-") && f.endsWith(".mp4")
        );

      if (!files.length) {
        return res.status(500).json({
          error: "file not found after download",
          url,
        });
      }

      const fileName = files[0];
      const filePath = path.join(TMP_DIR, fileName);

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

      stream.on("error", (err) => {
        console.error("stream error:", err);
        fs.unlink(filePath, () => {});
      });
    }
  );
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Downloader running on port ${PORT}`);
});
