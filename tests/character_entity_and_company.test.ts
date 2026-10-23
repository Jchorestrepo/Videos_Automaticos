import assert from 'node:assert';
import { CharacterService } from '../server/services/characterService.ts';
import { ReferencePhotoService } from '../server/services/referencePhotoService.ts';

async function runTests() {
  console.log('🧪 Iniciando tests de Entidades (Empresas vs Personas) y Edades...');

  const testChannelId = 'tech_scandals';

  // 1. Detección de Empresa / Marca
  assert.strictEqual(
    CharacterService.isCompanyOrBrandEntity('Google'),
    true,
    'Google debe ser detectado como empresa/marca'
  );
  assert.strictEqual(
    CharacterService.isCompanyOrBrandEntity('Theranos Inc'),
    true,
    'Theranos Inc debe ser detectada como empresa'
  );
  assert.strictEqual(
    CharacterService.isCompanyOrBrandEntity('Mark Zuckerberg'),
    false,
    'Mark Zuckerberg no debe ser detectado como empresa'
  );
  console.log('✅ Detección automática de empresas/marcas OK');

  // 2. Creación / Draft de Personaje Empresa (Google)
  const googleProfile = CharacterService.findOrDraftCharacter(
    testChannelId,
    'Google',
    'La Caída y Juicio Monopólico de Google',
    'Conflicto antimonopolio y dominio de búsquedas',
    {
      characterCategory: 'company_or_brand',
    }
  );

  assert.strictEqual(
    googleProfile.character_category,
    'company_or_brand',
    'Google debe tener categoría company_or_brand'
  );
  assert.strictEqual(
    googleProfile.real_person,
    false,
    'Una empresa no es una persona humana'
  );
  assert.ok(
    googleProfile.anchor_prompt.includes('headquarters') || googleProfile.anchor_prompt.includes('visual identity') || googleProfile.anchor_prompt.includes('branding'),
    'El prompt de una empresa debe describir sede, campus o identidad de marca'
  );
  assert.ok(
    !googleProfile.anchor_prompt.includes('30-42 years old'),
    'El prompt de una empresa NO debe contener edad humana fija'
  );
  assert.ok(
    !googleProfile.anchor_prompt.includes('human facial structure'),
    'El prompt de una empresa NO debe exigir facciones humanas'
  );
  console.log('✅ Creación de ficha corporativa para Google OK (sin descripciones humanas forzadas)');

  // 3. Creación de Persona con Edad Personalizada (ej: Fundador joven de 19 años)
  const youngFounder = CharacterService.findOrDraftCharacter(
    testChannelId,
    'Markus Testson Joven',
    'Los Inicios de una Startup en Harvard',
    'Creación de prototipo universitario',
    {
      age: '19-year-old college student in Harvard dorm room',
      characterCategory: 'real_person',
    }
  );

  assert.strictEqual(
    youngFounder.character_category,
    'real_person',
    'Debe ser persona real'
  );
  assert.ok(
    youngFounder.anchor_prompt.includes('19-year-old college student'),
    'El prompt debe respetar la edad y contexto específico del personaje'
  );
  assert.ok(
    !youngFounder.anchor_prompt.includes('30-42 years old'),
    'No debe sobreescribirse con la edad fija por defecto si se especificó una edad'
  );
  console.log('✅ Creación de personaje humano con edad contextual OK');

  // 4. Búsqueda de referencias fotográficas para Empresa (Google)
  const candidates = await ReferencePhotoService.searchCandidates('Google', undefined, true);
  assert.ok(candidates.length > 0, 'Debe encontrar candidatos para Google en Wikipedia/Commons');
  const hasHqOrLogo = candidates.some((c) =>
    /google|headquarters|logo|building|office/i.test(c.title)
  );
  assert.ok(hasHqOrLogo, 'Al menos un resultado debe ser un logo o sede de Google');
  console.log(`✅ Búsqueda de imágenes de referencia corporativas para Google OK (${candidates.length} candidatas encontradas)`);

  // Limpieza de personajes de prueba
  CharacterService.deleteCharacter(testChannelId, googleProfile.character_id);
  CharacterService.deleteCharacter(testChannelId, youngFounder.character_id);
  console.log('🧹 Limpieza de registros de prueba OK');

  console.log('\n🎉 ¡Todos los tests de Entidades y Edades pasaron exitosamente!');
}

runTests().catch((err) => {
  console.error('❌ Error en tests:', err);
  process.exit(1);
});
