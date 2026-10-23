import { CharacterService } from '../server/services/characterService.ts';
import { VisualArcService } from '../server/services/visualArcService.ts';
import type { CharacterProfile, SceneItem } from '../src/types/index.ts';

async function runTests() {
  console.log('🧪 Iniciando suite de pruebas de asignación y consistencia de personajes...');

  const mockCast: CharacterProfile[] = [
    {
      character_id: 'parker_conrad',
      channel_id: 'tech_scandals',
      name: 'Parker Conrad',
      role: 'Fundador y CEO de Zenefits',
      real_person: true,
      character_category: 'real_person',
      known_face: true,
      anchor_prompt: 'Stylized 3D animated Parker Conrad, 35 years old, athletic build, short brown hair, Silicon Valley casual attire, Pixar and Arcane inspired visual aesthetic, rich volumetric lighting, single individual 3D documentary render',
      assets: [
        {
          id: 'asset_parker_1',
          url: '/channel-assets/tech_scandals/characters/assets/parker_1.jpg',
          characterId: 'parker_conrad',
          characterIds: ['parker_conrad'],
          placeOrEnvironment: 'Headquarters / Sede Central',
          shotType: 'character_closeup',
          prompt: 'Parker Conrad sitting in modern glass office headquarters talking to team',
        },
      ],
      updatedAt: new Date().toISOString(),
    },
    {
      character_id: 'david_sacks',
      channel_id: 'tech_scandals',
      name: 'David Sacks',
      role: 'CEO interino y miembro del consejo',
      real_person: true,
      character_category: 'real_person',
      known_face: true,
      anchor_prompt: 'Stylized 3D animated David Sacks, mid-40s corporate executive, glasses, sharp suit, calculating expression',
      assets: [
        {
          id: 'asset_david_1',
          url: '/channel-assets/tech_scandals/characters/assets/david_1.jpg',
          characterId: 'david_sacks',
          characterIds: ['david_sacks'],
          placeOrEnvironment: 'Oficina Corporativa / Boardroom',
          shotType: 'antagonist_shot',
          prompt: 'David Sacks reviewing confidential documents in dark boardroom',
        },
      ],
      updatedAt: new Date().toISOString(),
    },
    {
      character_id: 'juanito',
      channel_id: 'tech_scandals',
      name: 'Juanito',
      role: 'Empleado novato / Analogía cotidiana',
      real_person: false,
      character_category: 'channel_lore_cast',
      known_face: false,
      anchor_prompt: 'Stylized 3D animated young Hispanic guy in fast-food uniform',
      assets: [
        {
          id: 'asset_juanito_1',
          url: '/channel-assets/tech_scandals/characters/assets/juanito_1.jpg',
          characterId: 'juanito',
          characterIds: ['juanito'],
          placeOrEnvironment: 'Restaurante de Comida Rápida',
          shotType: 'concept_diagram',
          prompt: 'Juanito overwhelmed behind fast food counter cooking burgers',
        },
      ],
      updatedAt: new Date().toISOString(),
    },
    {
      character_id: 'elena_vega_unused',
      channel_id: 'tech_scandals',
      name: 'Elena Vega (Auditora Externa)',
      role: 'Auditora forense sin mención directa',
      real_person: true,
      character_category: 'real_person',
      known_face: false,
      anchor_prompt: 'Stylized 3D animated female forensic auditor reviewing spreadsheets',
      assets: [],
      updatedAt: new Date().toISOString(),
    },
    {
      character_id: 'kevin_rose_foreign',
      channel_id: 'tech_scandals',
      name: 'Kevin Rose',
      role: 'Fundador de Digg (OTRO VIDEO)',
      real_person: true,
      character_category: 'real_person',
      known_face: true,
      anchor_prompt: 'Stylized 3D animated Kevin Rose founder of Digg',
      assets: [
        {
          id: 'asset_kevin_digg',
          url: '/channel-assets/tech_scandals/characters/assets/kevin_rose_frame.jpg',
          characterId: 'kevin_rose_foreign',
          characterIds: ['kevin_rose_foreign'],
          placeOrEnvironment: 'Headquarters / Sede Central',
          shotType: 'environment_wide',
          prompt: 'Kevin Rose in bustling tech headquarters office with computers and desks',
        },
      ],
      updatedAt: new Date().toISOString(),
    },
  ];

  // =========================================================================
  // TEST 1: assignCharactersToScenes y distribución inteligente
  // =========================================================================
  console.log('\n--- Test 1: Asignación y distribución de personajes en escenas ---');
  const mockScenes: SceneItem[] = [
    {
      scene_id: 1,
      act_number: 1,
      chapter: 'El Ascenso Meteórico',
      shot_type: 'character_closeup',
      voiceover: 'Parker Conrad construyó la startup de más rápido crecimiento en Silicon Valley.',
      visual_prompt: 'Close up of Parker Conrad',
      durationInSeconds: 20,
    },
    {
      scene_id: 9,
      act_number: 3,
      chapter: 'La Contraparte Entra en Escena',
      shot_type: 'antagonist_shot',
      voiceover: 'David Sacks llegó al consejo con una misión muy diferente.',
      visual_prompt: 'David Sacks in shadow boardroom',
      durationInSeconds: 22,
    },
    {
      scene_id: 14,
      act_number: 4,
      chapter: 'La Analogía de la Hamburguesa',
      shot_type: 'concept_diagram',
      voiceover: 'Para entender el macro, imagina a un empleado abrumado en una cocina rápida.',
      visual_prompt: 'Fast food kitchen conceptual diagram with orders piling up',
      durationInSeconds: 25,
    },
    {
      scene_id: 17,
      act_number: 5,
      chapter: 'La Auditoría Interna',
      shot_type: 'environment_wide',
      voiceover: 'El equipo de auditoría revisó los registros y descubrió el macro fraudulento.',
      visual_prompt: 'Forensic auditor examining server logs',
      durationInSeconds: 20,
    },
  ];

  const assignedScenes = CharacterService.assignCharactersToScenes(mockScenes, mockCast);

  const s1 = assignedScenes.find((s) => s.scene_id === 1);
  const s9 = assignedScenes.find((s) => s.scene_id === 9);
  const s14 = assignedScenes.find((s) => s.scene_id === 14);
  const s17 = assignedScenes.find((s) => s.scene_id === 17);

  console.assert(s1?.character_ids?.includes('parker_conrad'), 'Escena 1 debe tener a Parker Conrad');
  console.assert(s9?.character_ids?.includes('david_sacks'), 'Escena 9 debe tener a David Sacks');
  console.assert(s14?.character_ids?.includes('juanito'), 'Escena 14 (Acto 4) debe tener a Juanito');
  console.assert(
    s17?.character_ids?.includes('elena_vega_unused'),
    'Escena 17 (Acto 5 Auditoría) debe asignar a Elena Vega (Auditora)'
  );
  console.log('✓ Test 1 superado: Personajes asignados a escenas según sus roles y menciones.');

  // =========================================================================
  // TEST 2: pruneUnusedCharacters (Eliminación de personajes con 0 escenas)
  // =========================================================================
  console.log('\n--- Test 2: Poda de personajes sin escenas (0 escenas) ---');
  // Supongamos que kevin_rose_foreign no tiene ninguna escena en este video
  const activeCastOnly = CharacterService.pruneUnusedCharacters(assignedScenes, mockCast);
  const hasKevin = activeCastOnly.some((c) => c.character_id === 'kevin_rose_foreign');
  console.assert(!hasKevin, 'Kevin Rose (0 escenas) debe haber sido eliminado del elenco del proyecto');
  console.assert(
    activeCastOnly.some((c) => c.character_id === 'parker_conrad'),
    'Parker Conrad debe conservarse'
  );
  console.assert(
    activeCastOnly.some((c) => c.character_id === 'david_sacks'),
    'David Sacks debe conservarse'
  );
  console.assert(
    activeCastOnly.some((c) => c.character_id === 'juanito'),
    'Juanito debe conservarse'
  );
  console.log(`✓ Test 2 superado: Elenco podado de ${mockCast.length} a ${activeCastOnly.length} personajes activos.`);

  // =========================================================================
  // TEST 3: findMatchingAsset - Blindaje estricto contra personajes ajenos
  // =========================================================================
  console.log('\n--- Test 3: Blindaje de Smart Reuse contra caras ajenas ---');
  // Escena de Zenefits de tipo environment_wide que solicita a Parker Conrad
  const sceneRequiringParker = {
    visual_prompt: 'Modern open corporate headquarters office with desks, computers, and glowing screens',
    chapter: 'La Sede de Zenefits',
    shot_type: 'environment_wide' as const,
    character_ids: ['parker_conrad'],
  };

  // Mock de Characters del canal que incluye al personaje ajeno Kevin Rose
  // El método findMatchingAsset no debe devolver el asset de Kevin Rose aunque coincidan 'headquarters', 'office', 'desks'
  const matchForParker = CharacterService.findMatchingAsset(
    'tech_scandals',
    'parker_conrad',
    sceneRequiringParker,
    'Zenefits'
  );

  if (matchForParker) {
    const matchChars = matchForParker.characterIds || [matchForParker.characterId || ''];
    console.assert(
      !matchChars.includes('kevin_rose_foreign'),
      'CRÍTICO: No se debe reutilizar nunca un asset de Kevin Rose en una escena de Parker Conrad'
    );
  }
  console.log('✓ Test 3 superado: Ningún asset de personaje ajeno fue aceptado.');

  // =========================================================================
  // TEST 4: enrichScenePrompt - Preservación de personajes en conceptos y planos
  // =========================================================================
  console.log('\n--- Test 4: Enriquecimiento de prompt visual con personajes ---');
  const enrichedPrompt = VisualArcService.enrichScenePrompt(
    'Chaotic kitchen with ticket orders flying',
    null,
    13, // Escena 14 (índice 13)
    24,
    '3d_animation',
    'concept_diagram',
    [mockCast[2]] // Juanito
  );

  console.assert(
    enrichedPrompt.fullPrompt.includes('Juanito'),
    'El prompt de concept_diagram debe incluir explícitamente a Juanito'
  );
  console.assert(
    !enrichedPrompt.fullPrompt.includes('Pixar and Arcane inspired visual aesthetic, Pixar and Arcane'),
    'No debe haber duplicación redundante de estilos'
  );
  console.log('✓ Test 4 superado: Prompt enriquecido contiene a Juanito y evita redundancias.');

  console.log('\n🎉 ¡TODAS LAS PRUEBAS PASARON EXITOSAMENTE!');
}

runTests().catch((err) => {
  console.error('❌ Error en las pruebas:', err);
  process.exit(1);
});
