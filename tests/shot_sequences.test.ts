import assert from 'node:assert/strict';
import { computeWordsPerShot, segmentVoiceover, tokenizeWords } from '../server/services/shotSegmenter.ts';
import { resolveShotFrames } from '../src/remotion/shotTiming.ts';
import { buildPromptExport, matchFileToShot } from '../server/services/shotExchange.ts';
import type { ProjectScript, SceneItem, ShotItem } from '../src/types/index.ts';

console.log('--- Probando ShotSegmenter, ShotTiming y ShotExchange ---');

// 1. Test segmentVoiceover: cubre todas las palabras sin huecos ni solapamientos
const sampleVoiceover =
  'At three in the morning on the fourteenth floor of the San Francisco tower, the founder stared at a balance sheet bleeding forty million dollars while phones rang nonstop in the dark hallway.';
const words = tokenizeWords(sampleVoiceover);
const wordsPerShot3s = computeWordsPerShot(3, words.length, 13.2);
const segments = segmentVoiceover(sampleVoiceover, wordsPerShot3s);

assert.ok(segments.length >= 3, `Se esperaban al menos 3 segmentos, se obtuvieron ${segments.length}`);
assert.equal(segments[0].wordStart, 0, 'El primer segmento debe iniciar en wordStart = 0');
assert.equal(
  segments[segments.length - 1].wordEnd,
  words.length,
  'El último segmento debe terminar en el total de palabras'
);

for (let i = 0; i < segments.length; i++) {
  if (i > 0) {
    assert.equal(segments[i].wordStart, segments[i - 1].wordEnd, `Segmento ${i} debe ser contiguo al anterior`);
  }
  const reconstructed = words.slice(segments[i].wordStart, segments[i].wordEnd).join(' ');
  assert.equal(segments[i].text, reconstructed, `El texto del segmento ${i} debe coincidir exactamente`);
}
console.log(`✅ Segmentación 3s OK: ${words.length} palabras -> ${segments.length} planos:`, segments.map((s) => `[${s.wordStart}-${s.wordEnd}] "${s.text}"`));

// 2. Test resolveShotFrames con y sin wordTimings
const mockShots: ShotItem[] = segments.map((seg, idx) => ({
  shot_id: `S01-P0${idx + 1}`,
  global_index: idx + 1,
  wordStart: seg.wordStart,
  wordEnd: seg.wordEnd,
  voiceText: seg.text,
  visual_prompt: `Shot ${idx + 1} prompt`,
}));

const mockSceneNoTimings: SceneItem = {
  scene_id: 1,
  chapter: 'The Collapse',
  voiceover: sampleVoiceover,
  visual_prompt: 'Base scene prompt',
  camera_motion: 'zoom_in',
  durationInSeconds: 12,
  shots: mockShots,
  shotsPlannedWordCount: words.length,
};

const fps = 30;
const totalFrames = 12 * fps; // 360 frames
const rangesNoTimings = resolveShotFrames(mockSceneNoTimings, fps, totalFrames);

assert.equal(rangesNoTimings[0].from, 0, 'El primer plano debe iniciar en el frame 0');
const sumFrames = rangesNoTimings.reduce((acc, r) => acc + r.durationInFrames, 0);
assert.equal(sumFrames, totalFrames, `La suma de frames (${sumFrames}) debe ser igual a ${totalFrames}`);
for (const r of rangesNoTimings) {
  assert.ok(r.durationInFrames >= 36, `Cada plano debe durar al menos 1.2s (36 frames), actual: ${r.durationInFrames}`);
}
console.log('✅ resolveShotFrames (proporcional sin timings) OK:', rangesNoTimings.map((r) => `${r.shot.shot_id}: ${r.from}+${r.durationInFrames}f`));

// Con wordTimings simulados (ej. al cambiar de idioma EN -> ES con distinta cantidad de palabras)
const spanishWords = Array.from({ length: 40 }, (_, i) => ({
  word: `palabra_${i}`,
  startMs: i * 300,
  endMs: (i + 1) * 300 - 20,
}));
const mockSceneWithTimings: SceneItem = {
  ...mockSceneNoTimings,
  wordTimings: spanishWords,
};
const rangesWithTimings = resolveShotFrames(mockSceneWithTimings, fps, totalFrames);
assert.equal(
  rangesWithTimings.reduce((acc, r) => acc + r.durationInFrames, 0),
  totalFrames,
  'Con wordTimings la suma de frames también debe cubrir toda la escena'
);
console.log('✅ resolveShotFrames (con wordTimings bilingües) OK');

// 3. Test Export e Import matching por nombre de archivo (001.png y S01-P02.jpg)
const mockProject: ProjectScript = {
  project_id: 'proj_test',
  channel_id: 'archivo_confidencial',
  title: 'Test Documentary',
  hook: 'Hook',
  scenes: [mockSceneNoTimings],
  status: 'draft',
  createdAt: new Date().toISOString(),
};

const exportedTxt = buildPromptExport(mockProject, {
  resolvePrompt: (_sc, sh) => `[FULL STYLE] ${sh.visual_prompt}`,
  resolveShotSeconds: () => 3.0,
});
assert.ok(exportedTxt.includes('IMAGEN 001  [S01-P01'), 'El export debe incluir cabecera IMAGEN 001  [S01-P01');
assert.ok(exportedTxt.includes('Indicación: [001] [FULL STYLE] Shot 1 prompt'), 'El export debe incluir Indicación: [001] con el prompt enriquecido');

const m1 = matchFileToShot('001.png', mockProject);
assert.ok('shotId' in m1 && m1.shotId === 'S01-P01', '001.png debe emparejar con S01-P01');

const mBracket = matchFileToShot('[002] High-end 3D in 2008.png', mockProject);
assert.ok('shotId' in mBracket && mBracket.shotId === 'S01-P02', '[002] ... debe emparejar con S01-P02');

const m2 = matchFileToShot('S01-P02.jpg', mockProject);
assert.ok('shotId' in m2 && m2.shotId === 'S01-P02', 'S01-P02.jpg debe emparejar con S01-P02');

const m3 = matchFileToShot('random_name.png', mockProject);
assert.ok('error' in m3, 'Archivo sin número ni código debe devolver error explícito');

console.log('✅ Exportación de prompts e importación por nombre de archivo OK');
