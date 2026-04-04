import assert from "node:assert/strict";
import test from "node:test";
import { SongsService } from "./songs.service";

test("SongsService.importTxt: usa metadata.suggestedKey ao criar nova música", async () => {
  let createdSongData: { title: string; artist: string | null; defaultKey: string | null } | null = null;

  const prismaMock = {
    song: {
      findFirst: async () => null,
      create: async ({ data }: { data: { title: string; artist: string | null; defaultKey: string | null } }) => {
        createdSongData = data;
        return { id: "song_1", ...data };
      },
      findUnique: async () => ({ id: "song_1", title: "Musica", artist: "Artista", defaultKey: "A" }),
    },
    chordChart: {
      findFirst: async () => null,
      create: async ({ data }: { data: Record<string, unknown> }) => ({ id: "chart_1", ...data }),
    },
  };

  const service = new SongsService(prismaMock as any);

  const content = `Artista - Musica
Tom: A
[Verso]
A E F#m D`;

  const result = await service.importTxt({ content });

  assert.equal(result.ok, true);
  assert.deepEqual(createdSongData, {
    title: "Musica",
    artist: "Artista",
    defaultKey: "A",
  });
});
