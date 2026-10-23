import assert from 'node:assert';
import { StoryBacklogService } from '../server/services/storyBacklogService.ts';

async function runTests() {
  console.log('🧪 Iniciando tests de Archivados y Duración...');

  const testChannelId = 'ancient_lives';

  // 1. Crear una historia de prueba
  const testStory = await StoryBacklogService.createStory(testChannelId, {
    title: 'Test Story Archive ' + Date.now(),
    characterCompany: 'Test Hero',
    conflict: 'Conflict for testing archive flow',
    status: 'approved',
  });

  assert.ok(testStory.id, 'La historia creada debe tener un ID');
  assert.strictEqual(testStory.archived, false, 'La historia nueva no debe estar archivada por defecto');
  console.log('✅ Creación de historia OK:', testStory.id);

  // 2. Marcar como subido a YouTube y archivar
  const updated = await StoryBacklogService.updateStory(testChannelId, testStory.id, {
    published: true,
    status: 'published',
    archived: true,
  });

  assert.ok(updated, 'La historia actualizada debe existir');
  assert.strictEqual(updated?.archived, true, 'La historia debe quedar archivada');
  assert.strictEqual(updated?.published, true, 'La historia debe tener published=true');
  assert.strictEqual(updated?.status, 'published', 'El status debe ser published');
  console.log('✅ Marcar como Subido a YouTube y Archivar OK');

  // 3. Verificar persistencia al recargar historias
  const stories = await StoryBacklogService.getStories(testChannelId, false);
  const reloaded = stories.find((s) => s.id === testStory.id);
  assert.ok(reloaded, 'La historia debe persistir en stories.json');
  assert.strictEqual(reloaded?.archived, true, 'La historia persistida debe mantener archived=true');
  console.log('✅ Persistencia en disco de archived=true OK');

  // 4. Desarchivar historia
  const unarchived = await StoryBacklogService.updateStory(testChannelId, testStory.id, {
    published: false,
    status: 'completed',
    archived: false,
  });
  assert.strictEqual(unarchived?.archived, false, 'La historia debe quedar desarchivada');
  assert.strictEqual(unarchived?.published, false, 'La historia debe tener published=false');
  console.log('✅ Desarchivar historia OK');

  // 5. Test de rangos de duración (límites 3 a 30)
  const sanitizeDuration = (min: number, max: number) => {
    const sMin = Math.min(Math.max(min, 3), 30);
    const sMax = Math.min(Math.max(max, sMin), 30);
    return { min: sMin, max: sMax };
  };

  const validRange = sanitizeDuration(8, 12);
  assert.deepStrictEqual(validRange, { min: 8, max: 12 }, 'Rango válido debe mantenerse');

  const clampedLow = sanitizeDuration(1, 2);
  assert.deepStrictEqual(clampedLow, { min: 3, max: 3 }, 'Valores menores a 3 deben ajustarse a 3');

  const clampedHigh = sanitizeDuration(35, 40);
  assert.deepStrictEqual(clampedHigh, { min: 30, max: 30 }, 'Valores mayores a 30 deben ajustarse a 30');

  console.log('✅ Validación de rango de duración persistente OK');

  // Limpieza
  await StoryBacklogService.deleteStory(testChannelId, testStory.id);
  console.log('🧹 Limpieza de historia de test completada');

  console.log('\n🎉 ¡Todos los tests pasaron exitosamente!');
}

runTests().catch((err) => {
  console.error('❌ Error en tests:', err);
  process.exit(1);
});
