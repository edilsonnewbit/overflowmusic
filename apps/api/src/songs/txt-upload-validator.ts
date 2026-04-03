import { BadRequestException } from "@nestjs/common";

export type UploadedTxtFile = {
  originalname?: string;
  mimetype?: string;
  size?: number;
  buffer?: Buffer;
};

export function validateTxtUpload(file: UploadedTxtFile): void {
  if (!file) {
    throw new BadRequestException("file is required");
  }

  const originalName = String(file.originalname || "").toLowerCase();
  const mimeType = String(file.mimetype || "").toLowerCase();
  const size = Number(file.size || 0);
  const hasBuffer = Buffer.isBuffer(file.buffer);

  if (!originalName.endsWith(".txt")) {
    throw new BadRequestException("only .txt files are allowed");
  }

  const allowedMimeTypes = ["text/plain", "application/octet-stream"];
  if (mimeType && !allowedMimeTypes.includes(mimeType)) {
    throw new BadRequestException("invalid file type");
  }

  if (!size || size > 1_000_000) {
    throw new BadRequestException("file size must be up to 1MB");
  }

  if (!hasBuffer) {
    throw new BadRequestException("file buffer is required");
  }
}

