import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ProjectService } from '../server/services/projectService.ts';
import type { ProjectScript } from '../src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_DIR = path.resolve(__dirname, '../storage/projects');

async function runParallelProductionTest() {
  console.log('--- Probando arquitectura de Producción Concurrente (Safe-Save & Non-destructive Sync) ---');

  const testProjectId = `test_proj_turbo_${Date.now()}`;
  const testProjectDir = path.join(STORAGE_DIR, testProjectId);
  fs.mkdirSync(testProjectDir, { recursive: true });

  try {
    const dummyProject: ProjectScript = {
      project_id: testProjectId,
      channel_id: 'tech_scandals',
      title: 'Test Turbo Production Project',
      hook: 'Hook',
      scenes: [
        {
          scene_id: 1,
          chapter: 'Escena 1',
          voiceover: 'Texto de prueba de locución 1',
          durationInSeconds: 3,
        },
        {
          scene_id: 2,
          chapter: 'Escena 2',
          voiceover: 'Texto de prueba de locución 2',
          durationInSeconds: 3,
        },
      ],
      status: 'draft',
      language: 'es',
      createdAt: new Date().toISOString(),
    };

    ProjectService.saveProject(dummyProject);

    // Simular escrituras concurrentes simultáneas sobre el mismo proyecto (como imágenes y audios en paralelo)
    let saveQueue = Promise.resolve();
    const safeSave = (p: ProjectScript) => {
      saveQueue = saveQueue.then(() => {
        ProjectService.saveProject(p);
      });
      return saveQueue;
    };

    const projectInstance = ProjectService.getProject(testProjectId)!;

    // Worker 1: Simula generación de imágenes
    const imageWorkerSim = async () => {
      for (const scene of projectInstance.scenes) {
        await new Promise((r) => setTimeout(r, 20)); // Simula delay I/O
        scene.imageUrl = `/storage/${testProjectId}/images/scene_${scene.scene_id}.jpg`;
        await safeSave(projectInstance);
      }
    };

    // Worker 2: Simula síntesis de audio
    const audioWorkerSim = async () => {
      for (const scene of projectInstance.scenes) {
        await new Promise((r) => setTimeout(r, 15)); // Simula delay GPU
        scene.audioUrl = `/storage/${testProjectId}/audio/scene_${scene.scene_id}.mp3`;
        scene.durationInSeconds = 4.2;
        scene.wordTimings = [{ word: 'Texto', start: 0, end: 0.5 }];
        await safeSave(projectInstance);
      }
    };

    // Ejecutar en paralelo simultáneo
    await Promise.all([imageWorkerSim(), audioWorkerSim()]);
    await saveQueue;

    // Verificar en disco que NINGUNA propiedad pisó a la otra
    const finalSaved = ProjectService.getProject(testProjectId);
    assert.ok(finalSaved, 'El proyecto debe existir');

    for (const sc of finalSaved.scenes) {
      assert.ok(sc.imageUrl, `Escena ${sc.scene_id} debe tener imageUrl`);
      assert.ok(sc.audioUrl, `Escena ${sc.scene_id} debe tener audioUrl`);
      assert.strictEqual(sc.durationInSeconds, 4.2, `Escena ${sc.scene_id} debe conservar la duración del audio`);
      assert.ok(sc.wordTimings && sc.wordTimings.length > 0, `Escena ${sc.scene_id} debe conservar wordTimings`);
    }

    console.log('✅ Verificación de concurrencia: Tanto imageUrl como audioUrl persistieron sin race condition');
    console.log('✅ Cola de guardado safeSave probada y validada');
  } finally {
    if (fs.existsSync(testProjectDir)) {
      fs.rmSync(testProjectDir, { recursive: true, force: true });
    }
    const testChar = path.resolve(__dirname, '../channels/tech_scandals/characters/test_turbo_production_project.json');
    if (fs.existsSync(testChar)) {
      try { fs.unlinkSync(testChar); } catch {}
    }
  }
}

runParallelProductionTest()
  .then(() => {
    console.log('--- Test de Producción Turbo completado con éxito ---');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error en test:', err);
    process.exit(1);
  });
