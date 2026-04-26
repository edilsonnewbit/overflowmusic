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

test("SongsService.previewCifraClub: extrai cifra da pagina publica do artista", async () => {
  const prismaMock = {
    song: {},
    chordChart: {},
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);

    if (url === "https://www.cifraclub.com.br/flavinho/") {
      return new Response(`
        <html>
          <body>
            <a href="/flavinho/vem-oh-agua-viva/">Vem Oh Agua Viva</a>
          </body>
        </html>
      `, { status: 200 });
    }

    if (url === "https://www.cifraclub.com.br/flavinho/vem-oh-agua-viva/") {
      return new Response(`
        <html>
          <head><title>Vem Oh Agua Viva - Flavinho - Cifra Club</title></head>
          <body>
            <span>tom:</span><strong>D</strong>
            <pre>[Intro] <b>G</b>  <b>D</b>\nBatiza-me Senhor</pre>
          </body>
        </html>
      `, { status: 200 });
    }

    return new Response("not found", { status: 404 });
  }) as typeof fetch;

  try {
    const service = new SongsService(prismaMock as any);
    const result = await service.previewCifraClub({
      title: "Vem Óh! Água Viva",
      artist: "Flavinho",
    });

    assert.equal(result.ok, true);
    assert.equal(result.sourceUrl, "https://www.cifraclub.com.br/flavinho/vem-oh-agua-viva/");
    assert.equal(result.parsed.title, "Vem Oh Agua Viva");
    assert.equal(result.parsed.artist, "Flavinho");
    assert.equal(result.parsed.metadata.suggestedKey, "D");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
