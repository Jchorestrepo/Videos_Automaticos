import { VoiceStudioService } from '../services/voiceStudioService.ts';

async function main() {
  console.log('🛑 [VoiceStudio CLI] Deteniendo servidor de audio para liberar GPU...');
  try {
    const res = await VoiceStudioService.stop();
    console.log(`✓ ${res.message}`);
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Error deteniendo VoiceStudio:', err.message);
    process.exit(1);
  }
}

main();
