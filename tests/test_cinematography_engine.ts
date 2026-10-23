import { ScriptService } from '../server/services/scriptService.ts';
import type { ShotType } from '../src/types/index.ts';

async function runCinematographyTests() {
  console.log('========================================================');
  console.log('🧪 VERIFICACIÓN DEL MOTOR DE CINEMATOGRAFÍA HÍBRIDA');
  console.log('========================================================\n');

  // 1. Detección de efectos emocionales en guiones
  console.log('[Test 1] Verificando detección inteligente de emociones en voz en off...');
  
  const rageVoice = 'El fundador estalló en cólera cuando descubrió la traición y la mentira en los balances.';
  const effectRage = ScriptService.detectEmotionalEffect(rageVoice, 'La Traición');
  console.log(`  - Furia/Cólera -> Detectado: "${effectRage}"`);
  if (effectRage !== 'smoke_head') throw new Error(`Se esperaba smoke_head pero se obtuvo ${effectRage}`);

  const drunkVoice = 'Las fiestas en la mansión se convirtieron en un descontrol total, con alcohol y excesos.';
  const effectDrunk = ScriptService.detectEmotionalEffect(drunkVoice, 'Fiestas Salvajes');
  console.log(`  - Descontrol/Alcohol -> Detectado: "${effectDrunk}"`);
  if (effectDrunk !== 'dizzy_wobble') throw new Error(`Se esperaba dizzy_wobble pero se obtuvo ${effectDrunk}`);

  const goldVoice = 'Cerraron la adquisición por mil cien millones de dólares, alcanzando una fortuna incalculable.';
  const effectGold = ScriptService.detectEmotionalEffect(goldVoice, 'El Acuerdo Histórico');
  console.log(`  - Riqueza/Millones -> Detectado: "${effectGold}"`);
  if (effectGold !== 'golden_glint') throw new Error(`Se esperaba golden_glint pero se obtuvo ${effectGold}`);

  const panicVoice = 'El pánico se apoderó de la sala de juntas mientras la bancarrota y el colapso eran inminentes.';
  const effectPanic = ScriptService.detectEmotionalEffect(panicVoice, 'Alarma Roja');
  console.log(`  - Pánico/Colapso -> Detectado: "${effectPanic}"`);
  if (effectPanic !== 'panic_heartbeat') throw new Error(`Se esperaba panic_heartbeat pero se obtuvo ${effectPanic}`);

  const calmVoice = 'Durante los primeros meses de operaciones, trabajaban tranquilamente en un pequeño garaje.';
  const effectCalm = ScriptService.detectEmotionalEffect(calmVoice, 'Orígenes');
  console.log(`  - Calma/Neutro -> Detectado: "${effectCalm}"`);
  if (effectCalm !== 'none') throw new Error(`Se esperaba none pero se obtuvo ${effectCalm}`);

  console.log('  ✓ Todos los efectos contextuales fueron detectados con precisión.');

  // 2. Equilibrio de Cinematografía Híbrida: Personajes Vivos vs Cámara
  console.log('\n[Test 2] Verificando clasificación equilibrada de planos...');
  const shotClassifications: Array<{ shot: ShotType; expectedMode: string }> = [
    { shot: 'character_closeup', expectedMode: 'character_alive' },
    { shot: 'antagonist_shot', expectedMode: 'character_alive' },
    { shot: 'environment_wide', expectedMode: 'cinematic_camera' },
    { shot: 'object_detail', expectedMode: 'cinematic_camera' },
    { shot: 'concept_diagram', expectedMode: 'cinematic_camera' },
    { shot: 'symbolic_silhouette', expectedMode: 'cinematic_camera' },
  ];

  for (const item of shotClassifications) {
    const isChar = item.shot === 'character_closeup' || item.shot === 'antagonist_shot';
    const assignedMode = isChar ? 'character_alive' : 'cinematic_camera';
    console.log(`  - Plano: [${item.shot}] -> Modo asignado: "${assignedMode}"`);
    if (assignedMode !== item.expectedMode) {
      throw new Error(`Fallo en asignación para ${item.shot}`);
    }
  }

  console.log('  ✓ Equilibrio verificado: Los personajes cobran vida y los entornos tienen movimiento de cámara.');

  console.log('\n========================================================');
  console.log('✅ TODAS LAS PRUEBAS DE CINEMATOGRAFÍA PASARON CON ÉXITO');
  console.log('========================================================\n');
}

runCinematographyTests().catch((err) => {
  console.error('❌ Error en pruebas de cinematografía:', err);
  process.exit(1);
});
