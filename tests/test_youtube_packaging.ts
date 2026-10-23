import { YouTubeService } from '../server/services/youtubeService.ts';
import type { ProjectScript, ChannelPersona } from '../src/types/index.ts';

async function testYouTubeService() {
  console.log('--- Iniciando prueba de YouTubeService ---');

  const mockChannel: ChannelPersona = {
    channel_id: 'tech_scandals',
    name: 'Tech Scandals',
    display_title: 'Tech Scandals & Downfalls',
    niche: 'Quiebras y dramas empresariales',
    language: 'es',
    target_audience: 'Emprendedores y curiosos de tecnología',
    cpm_tier: 'high',
    narrator: {
      name: 'Narrador Forense',
      archetype: 'Investigador',
      tone: 'Dramático y reflexivo',
      perspective: 'Tercera persona',
      target_wpm: 140,
      signature_cues: { openings: [], transitions: [], closings: [] },
      key_vocabulary: [],
      forbidden_phrases: [],
    },
    visual_style: {
      engine: 'gemini',
      aspect_ratio: '16:9',
      prompt_prefix: '',
      prompt_suffix: '',
    },
  };

  const mockProject: ProjectScript = {
    project_id: 'test_proj_youtube',
    channel_id: 'tech_scandals',
    title: 'La Caída de Theranos y Elizabeth Holmes',
    hook: 'Prometió revolucionar la medicina con una sola gota de sangre, pero construyó una mentira de 9.000 millones.',
    characterCompany: 'Elizabeth Holmes (Theranos)',
    characters: [
      {
        character_id: 'elizabeth_holmes',
        channel_id: 'tech_scandals',
        name: 'Elizabeth Holmes',
        role: 'Fundadora de Theranos',
        real_person: true,
        anchor_prompt: 'Elizabeth Holmes in black turtleneck',
        signature_props: ['Black turtleneck', 'Deep voice'],
      },
    ],
    scenes: [
      {
        scene_id: 1,
        chapter: 'El Milagro de Silicon Valley',
        voiceover: 'Una joven de 19 años convence al mundo de tener una tecnología milagrosa.',
        visual_prompt: 'Elizabeth Holmes holding small vial',
        camera_motion: 'zoom_in',
        durationInSeconds: 15,
      },
      {
        scene_id: 2,
        chapter: 'Las Primeras Grietas',
        voiceover: 'Los ingenieros descubren que las máquinas Edison nunca funcionaron.',
        visual_prompt: 'Broken lab machines with error lights',
        camera_motion: 'pan_left',
        durationInSeconds: 20,
      },
      {
        scene_id: 3,
        chapter: 'El Colapso y el Juicio',
        voiceover: 'El Departamento de Justicia interviene y el imperio se desmorona.',
        visual_prompt: 'Courtroom drama with intense lighting',
        camera_motion: 'zoom_out',
        durationInSeconds: 25,
      },
    ],
    status: 'rendered',
    createdAt: new Date().toISOString(),
  };

  // 1. Probar cálculo de marcas de tiempo
  const timestamps = YouTubeService.computeChapterTimestamps(mockProject);
  console.log('✓ Marcas de tiempo calculadas correctamente:\n' + timestamps);
  if (!timestamps.includes('00:00 - El Milagro') || !timestamps.includes('00:15 - Las Primeras Grietas') || !timestamps.includes('00:35 - El Colapso')) {
    throw new Error('Error en el cálculo de marcas de tiempo!');
  }

  // 2. Probar guardado de miniatura base64
  // Generar un pequeño base64 PNG válido (1x1 transparent pixel)
  const tinyPngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const saved = YouTubeService.saveThumbnail(mockProject.project_id, tinyPngBase64);
  console.log('✓ Miniatura guardada en disco:', saved.publicUrl);

  // 3. Probar generación de metadatos (utiliza IA si hay clave o fallback inteligente)
  const metadata = await YouTubeService.generateYouTubeMetadata(mockProject, mockChannel);
  console.log('✓ Título seleccionado:', metadata.selectedTitle);
  console.log('✓ Variantes de títulos generadas:', metadata.suggestedTitles?.length);
  console.log('✓ Frases para miniatura:', metadata.suggestedThumbnailTexts?.join(', '));
  console.log('✓ Tags para YouTube Studio (longitud):', metadata.tags?.join(', ').length, 'caracteres');
  console.log('✓ Comentario fijado:', metadata.pinnedComment?.slice(0, 70) + '...');

  console.log('--- ¡Todas las pruebas de YouTubeService pasaron con éxito! ---');
}

testYouTubeService().catch((err) => {
  console.error('Fallo en testYouTubeService:', err);
  process.exit(1);
});
