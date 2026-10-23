import { PersonaService } from '../server/services/personaService.ts';
import { CharacterService } from '../server/services/characterService.ts';
import { VisualArcService } from '../server/services/visualArcService.ts';

async function runTests() {
  console.log('========================================================');
  console.log('🧪 VERIFICACIÓN DEL MOTOR DE PERSONAJES Y ARCO VISUAL');
  console.log('========================================================\n');

  // 1. Canales y Personalidad
  console.log('[Test 1] Verificando Canales y Personalidades...');
  const channels = PersonaService.getChannels();
  if (channels.length < 2) throw new Error('Faltan canales configurados');
  console.log(`  ✓ Canales encontrados: ${channels.map((c) => c.display_title).join(' | ')}`);

  // 2. Biblioteca de Personajes
  console.log('\n[Test 2] Verificando Biblioteca de Personajes por Canal...');
  const techChars = CharacterService.getCharacters('tech_scandals');
  const ancientChars = CharacterService.getCharacters('ancient_lives');
  console.log(`  ✓ Personajes tech_scandals: ${techChars.map((c) => c.name).join(', ')}`);
  console.log(`  ✓ Personajes ancient_lives: ${ancientChars.map((c) => c.name).join(', ')}`);

  if (!techChars.some((c) => c.character_id === 'domm_holland')) {
    throw new Error('Falta Domm Holland en tech_scandals');
  }
  if (!techChars.some((c) => c.character_id === 'bill_gates')) {
    throw new Error('Falta Bill Gates en tech_scandals');
  }

  // 3. Fuzzy Matching y Reutilización de Personaje
  console.log('\n[Test 3] Verificando Reutilización de Personaje Existente...');
  const matchedChar = CharacterService.findOrDraftCharacter(
    'tech_scandals',
    'Bill Gates',
    'La guerra secreta de Microsoft en los 90'
  );
  if (matchedChar.character_id !== 'bill_gates') {
    throw new Error(`Se esperaba bill_gates pero se obtuvo ${matchedChar.character_id}`);
  }
  console.log(`  ✓ Personaje re-utilizado con éxito: "${matchedChar.name}" (${matchedChar.character_id})`);

  // 4. Reglas del Arco Visual (6 Actos)
  console.log('\n[Test 4] Verificando Fotometría e Iluminación en 6 Actos...');
  const rules = VisualArcService.getAllActRules();
  if (rules.length !== 6) throw new Error(`Se esperaban 6 actos pero se encontraron ${rules.length}`);
  
  rules.forEach((rule) => {
    console.log(`  - Acto ${rule.act_number}: [${rule.act_name}] -> ${rule.emotional_tone}`);
  });

  // 5. Enriquecimiento de Prompts por Escena
  console.log('\n[Test 5] Verificando Enriquecimiento de Prompts por Escena...');
  const scene1 = VisualArcService.enrichScenePrompt(
    'Celebration on the corporate trading floor',
    matchedChar.anchor_prompt,
    0,
    5
  );
  if (!scene1.fullPrompt.includes('Acto') && !scene1.actRule.lighting_prompt) {
    throw new Error('El prompt enriquecido no tiene la fotometría del acto');
  }
  console.log(`  ✓ Escena 1 (Acto 1): Iluminación="${scene1.actRule.lighting_prompt.slice(0, 50)}..."`);

  const scene4 = VisualArcService.enrichScenePrompt(
    'Standing in empty abandoned corporate office',
    matchedChar.anchor_prompt,
    3,
    5
  );
  console.log(`  ✓ Escena 4 (Acto 4): Iluminación="${scene4.actRule.lighting_prompt.slice(0, 50)}..."`);
  console.log(`  ✓ Escena 4 Expresión: "${scene4.actRule.expression_prompt}"`);

  // 6. Separación de Múltiples Personajes Independientes
  console.log('\n[Test 6] Verificando Separación de Personajes Múltiples Independientes...');
  const expectedSeparated = ['david_karp', 'marissa_mayer', 'dom_hofmann', 'rus_yusupov', 'colin_kroll', 'kevin_rose'];
  for (const id of expectedSeparated) {
    const found = techChars.find((c) => c.character_id === id);
    if (!found) {
      throw new Error(`Falta personaje individual migrado: ${id}`);
    }
    console.log(`  ✓ Entidad individual verificada: ${found.name} (${found.character_id}) — Fotos en biblioteca: ${found.assets?.length || 0}`);
  }

  const splitEntities = CharacterService.splitCharacterEntities('David Karp (Tumblr) y Marissa Mayer (Yahoo)');
  if (splitEntities.length !== 2) {
    throw new Error(`splitCharacterEntities esperaba 2 entidades pero obtuvo ${splitEntities.length}`);
  }

  const resolvedCast = CharacterService.resolveCastForStory(
    'tech_scandals',
    'David Karp (Tumblr) y Marissa Mayer (Yahoo)',
    'La compra multimillonaria de Tumblr por Yahoo'
  );
  const realMembers = resolvedCast.filter((c) => c.character_category === 'real_person');
  const loreMembers = resolvedCast.filter((c) => c.character_category === 'channel_lore_cast');
  if (realMembers.length !== 2 || loreMembers.length < 1) {
    throw new Error(`Se esperaban 2 personajes reales + 1 secundario de Lore, pero se obtuvieron ${realMembers.length} reales y ${loreMembers.length} lore`);
  }
  console.log(`  ✓ resolveCastForStory armó elenco de ${resolvedCast.length} perfiles: Reales [${realMembers.map((c) => c.name).join(' + ')}] + Lore [${loreMembers.map((c) => c.name).join(', ')}]`);

  // 7. Elenco Lore del Canal (Juanito y personajes de relleno consistentes)
  console.log('\n[Test 7] Verificando Elenco Lore del Canal (Juanito)...');
  const juanito = techChars.find((c) => c.character_id === 'juanito');
  if (!juanito || juanito.character_category !== 'channel_lore_cast') {
    throw new Error('Falta Juanito como personaje de Lore del Canal en tech_scandals');
  }
  if (!juanito.channel_lore?.peculiarities?.length) {
    throw new Error('Juanito no tiene peculiaridades recurrentes configuradas');
  }
  console.log(`  ✓ Lore Cast encontrado: ${juanito.name} (${juanito.channel_lore.age}) — Peculiaridades: ${juanito.channel_lore.peculiarities.length}`);

  const unknownFaceCast = CharacterService.resolveCastForStory(
    'tech_scandals',
    'Usuario adolescente anónimo (rostro desconocido)',
    'El joven que descubrió el fallo en la app'
  );
  if (unknownFaceCast[0]?.character_category !== 'channel_lore_cast') {
    throw new Error('Un personaje sin rostro conocido debería asignarse al Elenco Lore del Canal');
  }
  console.log(`  ✓ Personaje sin rostro conocido asignado a Lore Cast: ${unknownFaceCast[0].name} (${unknownFaceCast[0].character_id})`);

  // 8. Regla Anti-Contaminación en Reutilización de Fotos (Solo vs Grupal)
  console.log('\n[Test 8] Verificando Filtro Solo vs Grupal en Reutilización de Biblioteca...');
  const david = CharacterService.getCharacter('tech_scandals', 'david_karp')!;
  const groupAssets = (david.assets || []).filter((a) => a.isGroupShot);
  console.log(`  ✓ Fotos grupales en biblioteca de David Karp: ${groupAssets.length}`);

  // Si buscamos una foto para David Karp SOLO (scene.character_ids = ['david_karp']), nunca debe devolver una foto grupal con Marissa Mayer
  const soloMatch = CharacterService.findMatchingAsset(
    'tech_scandals',
    'david_karp',
    {
      visual_prompt: 'David Karp working at Tumblr office',
      shot_type: 'character_closeup',
      character_ids: ['david_karp'],
    },
    'Tumblr'
  );
  if (soloMatch && soloMatch.isGroupShot) {
    throw new Error('ERROR: findMatchingAsset devolvió una foto grupal para una escena individual');
  }
  console.log('  ✓ Filtro anti-contaminación verificado: las escenas individuales nunca reutilizan fotos grupales con otros personajes.');

  // 9. Prohibición de Repetir Imágenes dentro del Mismo Video
  console.log('\n[Test 9] Verificando Prohibición de Repetir Imágenes en el Mismo Video...');
  if (soloMatch) {
    const secondMatchSameUrlExcluded = CharacterService.findMatchingAsset(
      'tech_scandals',
      'david_karp',
      {
        visual_prompt: 'David Karp working at Tumblr office',
        shot_type: 'character_closeup',
        character_ids: ['david_karp'],
      },
      'Tumblr',
      {
        currentProjectId: 'proj_test_no_repeat',
        excludeUrls: [soloMatch.url],
      }
    );
    if (secondMatchSameUrlExcluded && secondMatchSameUrlExcluded.url === soloMatch.url) {
      throw new Error('ERROR: findMatchingAsset repitió una URL que ya estaba en excludeUrls del mismo video');
    }
    console.log('  ✓ Regla anti-repetición verificada: una imagen ya usada en una escena jamás se repite en otra escena del mismo video.');
  }

  // 10. Verificación de Voces de VoiceStudio
  console.log('\n[Test 10] Verificando Listado de Voces de VoiceStudio...');
  const { AudioService } = await import('../server/services/audioService.ts');
  const vsVoices = await AudioService.getVoiceStudioVoices();
  if (!vsVoices || vsVoices.length === 0) {
    throw new Error('ERROR: AudioService.getVoiceStudioVoices() devolvió una lista vacía');
  }
  console.log(`  ✓ Voces de VoiceStudio cargadas (${vsVoices.length}): ${vsVoices.map((v) => `${v.name} [${v.id}]`).join(', ')}`);

  console.log('\n========================================================');
  console.log('✅ TODAS LAS PRUEBAS UNITARIAS Y DE INTEGRACIÓN PASARON');
  console.log('========================================================');
}

runTests().catch((err) => {
  console.error('❌ Error en pruebas:', err);
  process.exit(1);
});
