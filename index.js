import express from "express";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

const app = express();
app.use(express.json());

const TMP_DIR = "/tmp";

app.post("/download", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "url is required" });
  }

  const output = `${TMP_DIR}/video-%(id)s.%(ext)s`;

  const command = `
    yt-dlp \
    -f "bestvideo[height<=360]+bestaudio/best[height<=360]" \
    --merge-output-format mp4 \
    -o "${output}" \
    "${url}"
  `;

  exec(command, async (error) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ error: "download failed" });
    }

    // pega o arquivo baixado
    const files = fs.readdirSync(TMP_DIR).filter(f => f.startsWith("video-"));

    if (!files.length) {
      return res.status(500).json({ error: "file not found" });
    }

    const filePath = path.join(TMP_DIR, files[0]);

    // 👉 Aqui você pode:
    // 1. subir pro Google Drive
    // 2. subir pro S3
    // 3. OU devolver o arquivo (não recomendado p/ grandes)

    res.json({
      status: "ok",
      filePath,
      fileName: files[0]
    });
  });
});

app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

app.listen(3000, () => {
  console.log("Downloader running on port 3000");
});
