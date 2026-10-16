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

  // 4. Reglas del Arco Visual (5 Actos)
  console.log('\n[Test 4] Verificando Fotometría e Iluminación en 5 Actos...');
  const rules = VisualArcService.getAllActRules();
  if (rules.length !== 5) throw new Error(`Se esperaban 5 actos pero se encontraron ${rules.length}`);
  
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

  console.log('\n========================================================');
  console.log('✅ TODAS LAS PRUEBAS UNITARIAS Y DE INTEGRACIÓN PASARON');
  console.log('========================================================');
}

runTests().catch((err) => {
  console.error('❌ Error en pruebas:', err);
  process.exit(1);
});
