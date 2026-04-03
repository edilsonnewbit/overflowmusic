import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import { validateTxtUpload } from "./txt-upload-validator";

test("validateTxtUpload: aceita txt válido", () => {
  assert.doesNotThrow(() =>
    validateTxtUpload({
      originalname: "musica.txt",
      mimetype: "text/plain",
      size: 120,
      buffer: Buffer.from("[Intro] C G", "utf-8"),
    }),
  );
});

test("validateTxtUpload: rejeita extensão inválida", () => {
  assert.throws(
    () =>
      validateTxtUpload({
        originalname: "musica.pdf",
        mimetype: "application/pdf",
        size: 120,
        buffer: Buffer.from("x", "utf-8"),
      }),
    (error: unknown) => {
      assert.ok(error instanceof BadRequestException);
      assert.equal(error.message, "only .txt files are allowed");
      return true;
    },
  );
});

test("validateTxtUpload: rejeita arquivo maior que 1MB", () => {
  assert.throws(
    () =>
      validateTxtUpload({
        originalname: "musica.txt",
        mimetype: "text/plain",
        size: 1_000_001,
        buffer: Buffer.from("x", "utf-8"),
      }),
    /file size must be up to 1MB/,
  );
});
