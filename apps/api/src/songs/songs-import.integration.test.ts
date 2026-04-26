import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { UnauthorizedException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AuthService } from "../auth/auth.service";
import { SongsController } from "./songs.controller";
import { SongsService } from "./songs.service";

type SongsServiceMock = {
  importTxt: (input: { content: string; songId?: string }) => Promise<unknown>;
  previewTxt: (content: string) => Promise<unknown> | unknown;
  importFromCifraClub: (input: { title: string; artist?: string; songId?: string }) => Promise<unknown>;
  previewCifraClub: (input: { title: string; artist?: string }) => Promise<unknown> | unknown;
  list: () => Promise<unknown>;
  getById: (id: string) => Promise<unknown>;
  listCharts: (id: string) => Promise<unknown>;
  create: (body: unknown) => Promise<unknown>;
  update: (id: string, body: unknown) => Promise<unknown>;
  remove: (id: string) => Promise<unknown>;
};

async function createTestApp(
  adminKey: string,
  options?: {
    allowUserToken?: boolean;
  },
) {
  process.env.ADMIN_API_KEY = adminKey;
  Reflect.defineMetadata("design:paramtypes", [SongsService, AuthService], SongsController);

  let lastImportInput: { content: string; songId?: string } | null = null;
  let lastPreviewContent: string | null = null;
  let lastCifraClubImportInput: { title: string; artist?: string; songId?: string } | null = null;
  let lastCifraClubPreviewInput: { title: string; artist?: string } | null = null;
  let lastManagedToken: string | null = null;

  const songsServiceMock: SongsServiceMock = {
    importTxt: async (input) => {
      lastImportInput = input;
      return { ok: true, received: input };
    },
    previewTxt: (content: string) => {
      lastPreviewContent = content;
      return { ok: true, parsed: { title: "Preview", sections: [] } };
    },
    importFromCifraClub: async (input) => {
      lastCifraClubImportInput = input;
      return { ok: true, received: input, sourceUrl: "https://www.cifraclub.com.br/artista/musica/" };
    },
    previewCifraClub: (input) => {
      lastCifraClubPreviewInput = input;
      return { ok: true, parsed: { title: "Preview", sections: [] }, sourceUrl: "https://www.cifraclub.com.br/artista/musica/" };
    },
    list: async () => ({ ok: true, songs: [] }),
    getById: async (id: string) => ({ ok: true, song: { id } }),
    listCharts: async () => ({ ok: true, charts: [] }),
    create: async (body: unknown) => ({ ok: true, song: body }),
    update: async (_id: string, body: unknown) => ({ ok: true, song: body }),
    remove: async () => ({ ok: true }),
  };

  const authServiceMock = {
    assertAdminKeyOrContentManager: async (accessToken: string) => {
      lastManagedToken = accessToken;
      if (accessToken === `Bearer ${adminKey}`) {
        return;
      }
      if (options?.allowUserToken) {
        return;
      }
      throw new UnauthorizedException("unauthorized");
    },
  };

  const moduleRef = await Test.createTestingModule({
    controllers: [SongsController],
    providers: [
      { provide: SongsService, useValue: songsServiceMock },
      { provide: AuthService, useValue: authServiceMock },
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();

  return {
    app,
    getLastImportInput: () => lastImportInput,
    getLastPreviewContent: () => lastPreviewContent,
    getLastCifraClubImportInput: () => lastCifraClubImportInput,
    getLastCifraClubPreviewInput: () => lastCifraClubPreviewInput,
    getLastManagedToken: () => lastManagedToken,
  };
}

test("POST /api/songs/import/txt -> 401 sem admin key", async () => {
  const { app } = await createTestApp("secret_key");

  await request(app.getHttpServer())
    .post("/api/songs/import/txt")
    .send({ content: "[Intro]\nC G" })
    .expect(401);

  await app.close();
});

test("POST /api/songs/import/txt -> 201 com admin key e payload", async () => {
  const { app, getLastImportInput } = await createTestApp("secret_key");

  const response = await request(app.getHttpServer())
    .post("/api/songs/import/txt")
    .set("Authorization", "Bearer secret_key")
    .send({ content: "[Intro]\nC G", songId: "song_1" })
    .expect(201);

  assert.equal(response.body.ok, true);
  assert.deepEqual(getLastImportInput(), { content: "[Intro]\nC G", songId: "song_1" });

  await app.close();
});

test("POST /api/songs/import/txt -> 201 com token de usuário autorizado", async () => {
  const { app, getLastImportInput, getLastManagedToken } = await createTestApp("secret_key", {
    allowUserToken: true,
  });

  const response = await request(app.getHttpServer())
    .post("/api/songs/import/txt")
    .set("Authorization", "Bearer user_access_token")
    .send({ content: "[Intro]\nC G", songId: "song_2" })
    .expect(201);

  assert.equal(response.body.ok, true);
  assert.equal(getLastManagedToken(), "Bearer user_access_token");
  assert.deepEqual(getLastImportInput(), { content: "[Intro]\nC G", songId: "song_2" });

  await app.close();
});

test("POST /api/songs/import/txt -> 401 com token de usuário sem permissão", async () => {
  const { app, getLastManagedToken } = await createTestApp("secret_key", {
    allowUserToken: false,
  });

  await request(app.getHttpServer())
    .post("/api/songs/import/txt")
    .set("Authorization", "Bearer member_access_token")
    .send({ content: "[Intro]\nC G", songId: "song_2" })
    .expect(401);

  assert.equal(getLastManagedToken(), "Bearer member_access_token");

  await app.close();
});

test("POST /api/songs/import/txt/file -> 400 quando arquivo não enviado", async () => {
  const { app } = await createTestApp("secret_key");

  const response = await request(app.getHttpServer())
    .post("/api/songs/import/txt/file")
    .set("Authorization", "Bearer secret_key")
    .field("songId", "song_2")
    .expect(400);

  const message = response.body?.message;
  const hasExpectedMessage =
    message === "file is required" || (Array.isArray(message) && message.includes("file is required"));
  assert.equal(hasExpectedMessage, true);

  await app.close();
});

test("POST /api/songs/import/txt/file -> 201 com arquivo válido", async () => {
  const { app, getLastImportInput } = await createTestApp("secret_key");

  const response = await request(app.getHttpServer())
    .post("/api/songs/import/txt/file")
    .set("Authorization", "Bearer secret_key")
    .field("songId", "song_3")
    .attach("file", Buffer.from("[Intro]\nC G", "utf-8"), {
      filename: "musica.txt",
      contentType: "text/plain",
    })
    .expect(201);

  assert.equal(response.body.ok, true);
  assert.deepEqual(getLastImportInput(), { content: "[Intro]\nC G", songId: "song_3" });

  await app.close();
});

test("POST /api/songs/import/txt/preview -> 201 e envia conteúdo ao serviço", async () => {
  const { app, getLastPreviewContent } = await createTestApp("secret_key");

  const response = await request(app.getHttpServer())
    .post("/api/songs/import/txt/preview")
    .set("Authorization", "Bearer secret_key")
    .send({ content: "[Intro]\\nF7M Em7" })
    .expect(201);

  assert.equal(response.body.ok, true);
  assert.equal(getLastPreviewContent(), "[Intro]\\nF7M Em7");

  await app.close();
});

test("POST /api/songs/import/txt/file/preview -> 201 com arquivo válido", async () => {
  const { app, getLastPreviewContent } = await createTestApp("secret_key");

  const response = await request(app.getHttpServer())
    .post("/api/songs/import/txt/file/preview")
    .set("Authorization", "Bearer secret_key")
    .attach("file", Buffer.from("[Intro]\\nF7M Em7", "utf-8"), {
      filename: "preview.txt",
      contentType: "text/plain",
    })
    .expect(201);

  assert.equal(response.body.ok, true);
  assert.equal(getLastPreviewContent(), "[Intro]\\nF7M Em7");

  await app.close();
});

test("POST /api/songs/import/cifra-club/preview -> 201 e envia payload ao serviço", async () => {
  const { app, getLastCifraClubPreviewInput } = await createTestApp("secret_key");

  const response = await request(app.getHttpServer())
    .post("/api/songs/import/cifra-club/preview")
    .set("Authorization", "Bearer secret_key")
    .send({ title: "Te Seguir", artist: "Hamilton Gomes" })
    .expect(201);

  assert.equal(response.body.ok, true);
  assert.deepEqual(getLastCifraClubPreviewInput(), { title: "Te Seguir", artist: "Hamilton Gomes" });

  await app.close();
});

test("POST /api/songs/import/cifra-club -> 201 com token autorizado", async () => {
  const { app, getLastCifraClubImportInput } = await createTestApp("secret_key");

  const response = await request(app.getHttpServer())
    .post("/api/songs/import/cifra-club")
    .set("Authorization", "Bearer secret_key")
    .send({ title: "Te Seguir", artist: "Hamilton Gomes", songId: "song_7" })
    .expect(201);

  assert.equal(response.body.ok, true);
  assert.deepEqual(getLastCifraClubImportInput(), {
    title: "Te Seguir",
    artist: "Hamilton Gomes",
    songId: "song_7",
  });

  await app.close();
});
