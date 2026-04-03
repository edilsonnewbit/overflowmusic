import assert from "node:assert/strict";
import test from "node:test";
import { parseChordTxt } from "./chord-txt-parser";

const sample = `Dunamis Music - Estações (Part. Victor Valente)

[Intro]
F7M  Em7

[Primeira Parte]

          F7M
Veio até mim com passos suaves
              Em7
Que eu nem ouvi

[Refrão]

   C
Jesus, as estações mudaram
 F7M                       Am
Mas Você Continua surpreendendo

----------------- Acordes -----------------
Am = X 0 2 2 1 0
C = X 3 2 0 1 0
F7M = X 8 7 5 5 X
`;

test("parseChordTxt: parseia titulo, seções e dicionário", () => {
  const parsed = parseChordTxt(sample);

  assert.equal(parsed.title, "Estações (Part. Victor Valente)");
  assert.equal(parsed.artist, "Dunamis Music");
  assert.ok(parsed.sections.length >= 2);
  assert.ok(parsed.sections.some((section) => section.name === "Intro"));

  assert.equal(parsed.chordDictionary.Am, "X 0 2 2 1 0");
  assert.equal(parsed.chordDictionary.C, "X 3 2 0 1 0");
  assert.equal(parsed.chordDictionary.F7M, "X 8 7 5 5 X");
});

test("parseChordTxt: rejeita conteúdo vazio", () => {
  assert.throws(() => parseChordTxt(""), /content is empty/);
});

test("parseChordTxt: suporta seção e cifra na mesma linha", () => {
  const content = `Artista X - Música Y
[Intro] F7M Em7
[Verso]
Am
Linha de letra`;

  const parsed = parseChordTxt(content);
  const intro = parsed.sections.find((section) => section.name === "Intro");

  assert.ok(intro);
  assert.equal(intro?.lines[0]?.type, "chords");
  assert.equal(intro?.lines[0]?.content, "F7M Em7");
});

test("parseChordTxt: extrai metadados de tom, bpm e capo", () => {
  const content = `Artista X - Música Y
Tom: G
BPM: 74
Capo: 2

[Verso]
G D Em C`;

  const parsed = parseChordTxt(content);

  assert.equal(parsed.metadata.suggestedKey, "G");
  assert.equal(parsed.metadata.bpm, 74);
  assert.equal(parsed.metadata.capo, 2);
});
