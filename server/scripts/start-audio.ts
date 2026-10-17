import { VoiceStudioService } from '../services/voiceStudioService.ts';

async function main() {
  console.log('🎙️ [VoiceStudio CLI] Comprobando estado del servidor de audio...');
  try {
    const status = await VoiceStudioService.start();
    console.log(`✓ VoiceStudio está ONLINE en el puerto ${status.port}`);
    console.log(`  Dispositivo: ${status.device} (${status.gpu || 'RTX 3080'})`);
    console.log(`  VRAM Total: ${status.vramTotalGb || '~10'} GB`);
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Error iniciando VoiceStudio:', err.message);
    process.exit(1);
  }
}

main();
