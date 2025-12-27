import { Router, Request, Response } from "express";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";

export const uploadRouter = Router();

uploadRouter.post("/upload-photo", async (req: Request, res: Response) => {
  try {
    const { fileName, fileType, fileData } = req.body;

    if (!fileName || !fileType || !fileData) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Extract base64 data
    const base64Data = fileData.split(",")[1] || fileData;
    const buffer = Buffer.from(base64Data, "base64");

    // Generate unique file key
    const extension = fileName.split(".").pop() || "jpg";
    const uniqueId = nanoid(10);
    const fileKey = `pets/photos/${uniqueId}.${extension}`;

    // Upload to S3
    const { url } = await storagePut(fileKey, buffer, fileType);

    res.json({ url, key: fileKey });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Failed to upload photo" });
  }
});
