import { ChannelStrategyService } from '../server/services/channelStrategyService.ts';
import { PersonaService } from '../server/services/personaService.ts';
import { StoryBacklogService } from '../server/services/storyBacklogService.ts';

async function testChannelIncubator() {
  console.log('--- Iniciando prueba de ChannelStrategyService ---');

  // 1. Probar Incubación de propuesta de nuevo canal
  console.log('1. Incubando estrategia de nuevo canal...');
  const concept = await ChannelStrategyService.incubateChannelStrategy(
    'Misterios arqueológicos y civilizaciones perdidas de la antigüedad',
    'Épico y reflexivo',
    'es'
  );

  console.log('✓ Nombres sugeridos:', concept.suggestedNames.length);
  console.log('✓ Primer nombre:', concept.suggestedNames[0]?.name, `(${concept.suggestedNames[0]?.handle})`);
  console.log('✓ Lote de lanzamiento (videos):', concept.launchBatch?.length);
  if (concept.suggestedNames.length === 0 || concept.launchBatch.length === 0) {
    throw new Error('Fallo al generar nombres o lote de lanzamiento.');
  }

  // 2. Probar creación de canal oficial e inyección de historias
  console.log('2. Creando canal de prueba con historias de lanzamiento...');
  const testId = `test_arch_${Date.now()}`;
  const creationResult = await ChannelStrategyService.createChannelWithLaunchBatch(
    {
      name: 'Enigmas de la Antigüedad',
      channel_id: testId,
      display_title: 'Enigmas de la Antigüedad | Arqueología Oculta',
      niche: 'Historia y Arqueología Antigua',
      language: 'es',
      cpm_tier: 'Medio-Alto ($12 - $20 USD)',
      narrator: {
        name: 'El Arqueólogo Forense',
        archetype: 'El Cronista',
        tone: 'Solemne y analítico',
        perspective: 'Tercera persona',
        target_wpm: 140,
        signature_cues: { openings: [], transitions: [], closings: [] },
        key_vocabulary: [],
        forbidden_phrases: [],
      },
      visual_style: {
        engine: 'gemini',
        aspect_ratio: '16:9',
        prompt_prefix: '3D diorama ancient ruins',
        prompt_suffix: '8k cinematic lighting',
      },
    },
    concept.launchBatch.slice(0, 3)
  );

  console.log('✓ Canal creado con éxito:', creationResult.channel.channel_id);
  console.log('✓ Historias inyectadas al backlog:', creationResult.storyCount);
  if (creationResult.storyCount !== 3) {
    throw new Error('No se inyectaron las historias esperadas.');
  }

  // 3. Probar auditoría de canal existente (sobre tech_scandals o el nuevo canal)
  console.log('3. Ejecutando auditoría estratégica sobre tech_scandals...');
  const auditReport = await ChannelStrategyService.auditChannel('tech_scandals');
  console.log('✓ Score de salud del canal:', auditReport.healthScore, '/ 100');
  console.log('✓ Diagnóstico resumen:', auditReport.summaryDiagnosis.slice(0, 80) + '...');
  console.log('✓ Fugas de retención detectadas:', auditReport.retentionRisks?.length);
  console.log('✓ Recomendaciones de próximos videos (Next Hits):', auditReport.nextHitRecommendations?.length);
  if (auditReport.nextHitRecommendations.length === 0) {
    throw new Error('La auditoría no devolvió recomendaciones de videos.');
  }

  // 4. Probar inyección de un Next Hit al backlog
  console.log('4. Inyectando Next Hit al canal de prueba...');
  const injectedStory = await ChannelStrategyService.injectHitStory(testId, {
    title: auditReport.nextHitRecommendations[0].title,
    hook: auditReport.nextHitRecommendations[0].hook,
    characterCompany: auditReport.nextHitRecommendations[0].characterCompany,
    conflict: auditReport.nextHitRecommendations[0].conflict,
  });
  console.log('✓ Historia inyectada con ID:', injectedStory.id);

  // Verificar que el backlog tiene ahora 4 historias
  const currentStories = await StoryBacklogService.getStories(testId, false);
  console.log('✓ Total historias en backlog tras inyección:', currentStories.length);
  if (currentStories.length !== 4) {
    throw new Error('El conteo de historias no coincide tras la inyección.');
  }

  console.log('--- ¡Todas las pruebas de ChannelStrategyService pasaron exitosamente! ---');
}

testChannelIncubator().catch((err) => {
  console.error('Fallo en testChannelIncubator:', err);
  process.exit(1);
});
