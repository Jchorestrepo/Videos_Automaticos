import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ProjectService } from '../server/services/projectService.ts';
import type { ProjectScript } from '../src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_DIR = path.resolve(__dirname, '../storage/projects');

async function runBilingualRenderTest() {
  console.log('--- Probando preservación bilingüe de videos renderizados (ES + EN) ---');

  const testProjectId = `test_proj_bilingual_${Date.now()}`;
  const testProjectDir = path.join(STORAGE_DIR, testProjectId);
  fs.mkdirSync(testProjectDir, { recursive: true });

  try {
    const dummyProject: ProjectScript = {
      project_id: testProjectId,
      channel_id: 'tech_scandals',
      title: 'Test Bilingual Project',
      hook: 'Hook',
      scenes: [
        {
          scene_id: 1,
          chapter: 'Chapter 1',
          voiceover: 'Locución 1',
          durationInSeconds: 3,
        },
      ],
      scenes_es: [
        {
          scene_id: 1,
          chapter_es: 'Capítulo 1',
          voiceover_es: 'Locución en Español',
          audioDurationSeconds: 3,
        },
      ],
      scenes_en: [
        {
          scene_id: 1,
          chapter_en: 'Chapter 1',
          voiceover_en: 'Voiceover in English',
          audioDurationSeconds: 3,
        },
      ],
      status: 'audio_ready',
      language: 'es',
      createdAt: new Date().toISOString(),
    };

    ProjectService.saveProject(dummyProject);

    // 1. Simular renderizado en español: se crea final_video_es.mp4
    const esVideoPath = path.join(testProjectDir, 'final_video_es.mp4');
    fs.writeFileSync(esVideoPath, 'dummy mp4 content es');

    const loaded1 = ProjectService.getProject(testProjectId);
    assert.ok(loaded1, 'El proyecto debe existir');
    assert.strictEqual(loaded1.outputVideoUrlEs, `/storage/${testProjectId}/final_video_es.mp4`);

    // 2. Simular renderizado en inglés: se crea final_video_en.mp4
    const enVideoPath = path.join(testProjectDir, 'final_video_en.mp4');
    fs.writeFileSync(enVideoPath, 'dummy mp4 content en');

    const loaded2 = ProjectService.getProject(testProjectId);
    assert.ok(loaded2, 'El proyecto debe existir');
    assert.strictEqual(loaded2.outputVideoUrlEs, `/storage/${testProjectId}/final_video_es.mp4`);
    assert.strictEqual(loaded2.outputVideoUrlEn, `/storage/${testProjectId}/final_video_en.mp4`);

    // 3. Comprobar que en disco NINGUNO de los dos videos fue eliminado o sobreescrito
    assert.ok(fs.existsSync(esVideoPath), 'El video en español final_video_es.mp4 debe permanecer');
    assert.ok(fs.existsSync(enVideoPath), 'El video en inglés final_video_en.mp4 debe permanecer');
    assert.strictEqual(fs.readFileSync(esVideoPath, 'utf8'), 'dummy mp4 content es');
    assert.strictEqual(fs.readFileSync(enVideoPath, 'utf8'), 'dummy mp4 content en');

    console.log('✅ Ambos videos (final_video_es.mp4 y final_video_en.mp4) coexisten intactos');
    console.log('✅ Rutas y estado bilingüe verificados correctamente');
  } finally {
    // Limpieza
    if (fs.existsSync(testProjectDir)) {
      fs.rmSync(testProjectDir, { recursive: true, force: true });
    }
    const testCharFile = path.resolve(__dirname, '../channels/tech_scandals/characters/test_bilingual_project.json');
    if (fs.existsSync(testCharFile)) {
      try { fs.unlinkSync(testCharFile); } catch {}
    }
  }
}

runBilingualRenderTest()
  .then(() => {
    console.log('--- Test completado con éxito ---');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error en test:', err);
    process.exit(1);
  });
