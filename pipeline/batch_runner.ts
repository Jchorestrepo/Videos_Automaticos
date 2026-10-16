import dotenv from 'dotenv';
import { SheetsService } from '../server/services/sheetsService.ts';
import { PersonaService } from '../server/services/personaService.ts';
import { ScriptService } from '../server/services/scriptService.ts';
import { ImageService } from '../server/services/imageService.ts';
import { ProjectService } from '../server/services/projectService.ts';

dotenv.config();

async function runAutonomousPipeline() {
  console.log('=====================================================');
  console.log('⚡ INICIANDO PIPELINE AUTÓNOMO DE PRODUCCIÓN DE VIDEO');
  console.log('=====================================================');

  // 1. Obtener Persona del canal de tecnología
  const persona = PersonaService.getPersona('tech_scandals');
  if (!persona) {
    console.error('No se encontró la personalidad tech_scandals');
    return;
  }
  console.log(`[Canal Activo] ${persona.name} (${persona.niche})`);

  // 2. Leer casos pendientes de Google Sheets
  console.log('[Google Sheets] Consultando hoja de cálculo...');
  const items = await SheetsService.fetchSheetItems();
  const pendingItems = items.filter((item) => item.approved && !item.finished);

  console.log(`[Google Sheets] Total de casos encontrados: ${items.length}`);
  console.log(`[Google Sheets] Casos aprobados pendientes de producción: ${pendingItems.length}`);

  if (pendingItems.length === 0) {
    console.log('No hay casos pendientes marcados con "Aprobado? = TRUE". Finalizando.');
    return;
  }

  // Procesar el primer caso pendiente
  const targetCase = pendingItems[0];
  console.log(`\n▶ Procesando caso: "${targetCase.title}"`);
  console.log(`  Protagonistas: ${targetCase.characterCompany}`);

  // 3. Generar Guion con la personalidad inyectada
  console.log('\n[1/3] Generando guion cinematográfico con personalidad de canal...');
  const script = await ScriptService.generateScript(
    targetCase.title,
    persona,
    targetCase.conflict,
    targetCase.characterCompany,
    targetCase.sources
  );
  console.log(`  ✓ Guion generado con ${script.scenes.length} escenas.`);

  // 3.1 Identificar o redactar personaje ancla en biblioteca
  const { CharacterService } = await import('../server/services/characterService.ts');
  const character = CharacterService.findOrDraftCharacter(
    persona.channel_id,
    targetCase.characterCompany,
    targetCase.title,
    targetCase.conflict
  );
  script.characters = [character];
  script.artStyle = '3d_animation';
  console.log(`  🎭 Personaje ancla asignado: "${character.name}" (${character.character_id})`);

  // 4. Generar Activos Visuales (Multi-Proveedor con Arco Emocional y Consistencia)
  console.log('\n[2/3] Generando imágenes 16:9 con arco emocional por actos...');
  const totalScenes = script.scenes.length;
  for (const scene of script.scenes) {
    console.log(`  - Generando escena ${scene.scene_id}/${totalScenes}: ${scene.chapter}`);
    const imageUrl = await ImageService.generateSceneImage(
      script.project_id,
      scene.scene_id,
      scene.visual_prompt,
      scene.chapter,
      persona.channel_id,
      character,
      totalScenes,
      script.artStyle
    );
    scene.imageUrl = imageUrl;
  }
  script.status = 'images_ready';
  ProjectService.saveProject(script);
  console.log('  ✓ Todas las imágenes generadas y guardadas.');

  // 5. Generar Audio y Timestamps por Palabra (ElevenLabs)
  console.log('\n[3/4] Generando locución sincronizada con ElevenLabs...');
  const { AudioService } = await import('../server/services/audioService.ts');
  for (const scene of script.scenes) {
    console.log(`  - Sintetizando voz de escena ${scene.scene_id}: ${scene.chapter}`);
    const audioRes = await AudioService.generateSceneAudio(
      script.project_id,
      scene.scene_id,
      scene.voiceover,
      persona.channel_id
    );
    scene.audioUrl = audioRes.audioUrl;
    scene.durationInSeconds = audioRes.durationInSeconds;
    scene.wordTimings = audioRes.wordTimings;
  }
  script.status = 'audio_ready';
  ProjectService.saveProject(script);
  console.log('  ✓ Locución sintetizada y sincronizada al milisegundo.');

  // 6. Proyecto listo para renderizar
  console.log('\n[3/3] Proyecto empaquetado con éxito.');
  console.log(`  ID del Proyecto: ${script.project_id}`);
  console.log(`  Ubicación: storage/projects/${script.project_id}/`);
  console.log('\nPara renderizar el video final a MP4, ejecuta:');
  console.log('  npx remotion render src/remotion/index.ts output.mp4');
  console.log('=====================================================');
}

runAutonomousPipeline().catch(console.error);
