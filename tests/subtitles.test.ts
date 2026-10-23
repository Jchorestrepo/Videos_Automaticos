import { SubtitleService } from '../server/services/subtitleService.ts';
import type { WordTiming, SceneItem } from '../src/types/index.ts';

console.log('--- Probando SubtitleService ---');

// 1. Probar formateo de timestamps
const ts1 = SubtitleService.formatSrtTimestamp(1500);
console.log('Timestamp 1500ms SRT:', ts1, ts1 === '00:00:01,500' ? '✅' : '❌');

const tsVtt = SubtitleService.formatVttTimestamp(3665123);
console.log('Timestamp 3665123ms VTT:', tsVtt, tsVtt === '01:01:05.123' ? '✅' : '❌');

// 2. Probar agrupación de palabras en cues
const sampleWords: WordTiming[] = [
  { word: 'Silicon', startMs: 200, endMs: 600 },
  { word: 'Valley', startMs: 650, endMs: 1100 },
  { word: 'hid', startMs: 1150, endMs: 1400 },
  { word: 'a', startMs: 1420, endMs: 1500 },
  { word: 'massive', startMs: 1520, endMs: 1950 },
  { word: 'secret.', startMs: 2000, endMs: 2450 },
  { word: 'Nobody', startMs: 2800, endMs: 3200 },
  { word: 'checked', startMs: 3250, endMs: 3600 },
  { word: 'the', startMs: 3650, endMs: 3750 },
  { word: 'books.', startMs: 3800, endMs: 4200 },
];

const cues = SubtitleService.groupWordsIntoCues(sampleWords, 0, 1);
console.log('Cues agrupados:', cues.length);
console.log(JSON.stringify(cues, null, 2));

if (cues.length === 2 && cues[0].text === 'Silicon Valley hid a massive secret.' && cues[1].text === 'Nobody checked the books.') {
  console.log('✅ Agrupación por puntuación y tamaño exitosa');
} else {
  console.log('❌ Error en agrupación de cues');
}

const srt = SubtitleService.cuesToSrt(cues);
console.log('--- Salida SRT de muestra: ---');
console.log(srt);
if (srt.includes('00:00:00,200 --> 00:00:02,450') && srt.includes('Silicon Valley hid a massive secret.')) {
  console.log('✅ Formato SRT verificado correctamente');
} else {
  console.log('❌ Error en formato SRT');
}
