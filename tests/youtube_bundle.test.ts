import fs from 'node:fs';
import path from 'node:path';
import { SubtitleService } from '../server/services/subtitleService.ts';
import { YouTubeService } from '../server/services/youtubeService.ts';
import type { ProjectScript, ChannelPersona } from '../src/types/index.ts';

console.log('--- Iniciando Test de Integración: YouTube Master Pack & Subtitles ---');

const mockChannel: ChannelPersona = {
  channel_id: 'tech_scandals',
  name: 'Silicon Scandals',
  display_title: 'Silicon Scandals (Tech Thrillers)',
  niche: 'Tech Scandals & Startups',
  language: 'en',
  target_audience: 'Entrepreneurs and tech enthusiasts',
  cpm_tier: 'Ultra High ($25+ USD)',
  narrator: {
    name: 'The Forensic Analyst',
    archetype: 'Corporate Thriller Narrator',
    tone: 'Sharp, cynical, gripping',
    perspective: 'Insider observer',
    target_wpm: 135,
    signature_cues: { openings: [], transitions: [], closings: [] },
    key_vocabulary: [],
    forbidden_phrases: [],
  },
  visual_style: {
    engine: 'google_imagen_3',
    aspect_ratio: '16:9',
    prompt_prefix: '',
    prompt_suffix: '',
  },
};

const mockProject: ProjectScript = {
  project_id: 'test_multilang_proj',
  channel_id: 'tech_scandals',
  title: 'The Fast.co Collapse: How $120M Vanished',
  hook: 'Fast promised one-click checkout to kill Stripe, but burned 120 million before anyone looked at the books.',
  status: 'rendered',
  createdAt: new Date().toISOString(),
  scenes: [
    {
      scene_id: 1,
      chapter: 'The Illusion of Success',
      voiceover: 'In Silicon Valley, money hides a multitude of sins until someone checks the accounting.',
      visual_prompt: 'High tech boardroom',
      camera_motion: 'zoom_in',
      durationInSeconds: 6,
      wordTimings: [
        { word: 'In', startMs: 100, endMs: 300 },
        { word: 'Silicon', startMs: 350, endMs: 700 },
        { word: 'Valley,', startMs: 750, endMs: 1200 },
        { word: 'money', startMs: 1300, endMs: 1600 },
        { word: 'hides', startMs: 1650, endMs: 2000 },
        { word: 'sins.', startMs: 2100, endMs: 2500 },
      ],
    },
    {
      scene_id: 2,
      chapter: 'Burning Millions',
      voiceover: 'They spent thirty million a year on luxury while processing virtually no revenue.',
      visual_prompt: 'Burning cash and luxury office',
      camera_motion: 'pan_left',
      durationInSeconds: 8,
    },
  ],
  scenes_es: [
    {
      scene_id: 1,
      chapter_es: 'La Ilusión del Éxito',
      voiceover_es: 'En Silicon Valley, el dinero oculta una multitud de pecados hasta que alguien revisa la contabilidad.',
    },
    {
      scene_id: 2,
      chapter_es: 'Quemando Millones',
      voiceover_es: 'Gastaban treinta millones al año en lujos mientras procesaban prácticamente cero ingresos.',
    },
  ],
  youtubeMetadata: {
    selectedTitle: 'The $120M Scam Silicon Valley Ignored',
    suggestedTitles: [
      {
        title: 'How Fast.co Burned $120M in 24 Months',
        category: 'direct',
        score: 96,
        hookExplanation: 'Direct high curiosity.',
      },
    ],
    description: 'The complete inside story of Fast.co.\n\n⏱️ TIMESTAMPS:\n00:00 - The Illusion of Success\n00:06 - Burning Millions',
    tags: ['fast.co', 'silicon valley', 'startup scandal', 'documentary'],
    hashtags: ['#Documentary', '#TechScandal'],
    pinnedComment: 'Did Dom Holland cross the line or was he just playing the VC game? Let us know below!',
    localizedEs: {
      title: 'El Escándalo de Fast.co: Cómo Desaparecieron $120M',
      description: 'La historia forense completa de la caída de Fast.co.\n\n⏱️ MARCAS DE TIEMPO:\n00:00 - La Ilusión del Éxito\n00:06 - Quemando Millones',
      pinnedComment: '¿Crees que el fundador cruzó la línea o simplemente siguió las reglas de Silicon Valley? 👇',
    },
  },
};

// 1. Verificar marcas de tiempo bilingües
const tsEn = YouTubeService.computeChapterTimestamps(mockProject, 'en');
const tsEs = YouTubeService.computeChapterTimestamps(mockProject, 'es');

console.log('--- Marcas de Tiempo EN ---');
console.log(tsEn);
console.log('--- Marcas de Tiempo ES ---');
console.log(tsEs);

if (tsEn.includes('00:00 - The Illusion of Success') && tsEs.includes('00:00 - La Ilusión del Éxito')) {
  console.log('✅ Capítulos bilingües calculados con exactitud');
} else {
  console.error('❌ Error en cálculo de capítulos bilingües');
}

// 2. Generar subtítulos EN y ES
const cuesEn = SubtitleService.generateProjectCues(mockProject);
const subEn = SubtitleService.saveProjectSubtitles(mockProject.project_id, 'en', cuesEn);

const mergedScenesForEs = mockProject.scenes.map((s, idx) => ({
  ...s,
  voiceover: mockProject.scenes_es?.[idx]?.voiceover_es || s.voiceover,
}));
const cuesEs = SubtitleService.generateProjectCues(mockProject, mergedScenesForEs);
const subEs = SubtitleService.saveProjectSubtitles(mockProject.project_id, 'es', cuesEs);

console.log('Subtítulos EN guardados en:', subEn.srtPath);
console.log('Subtítulos ES guardados en:', subEs.srtPath);

if (fs.existsSync(subEn.srtPath) && fs.existsSync(subEs.srtPath)) {
  console.log('✅ Archivos .srt generados físicamente en disco');
} else {
  console.error('❌ Falló la escritura de archivos .srt');
}

// 3. Generar el YouTube Master Pack
const bundle = YouTubeService.generateYouTubeBundle(mockProject, mockChannel);
console.log('Bundle creado en:', bundle.bundleDir);
console.log('Archivos en el Bundle:', bundle.files.map((f) => f.name));

const expectedFiles = [
  '03_subtitles_english.srt',
  '04_subtitles_spanish.srt',
  '06_metadata_youtube_english.txt',
  '07_metadata_youtube_spanish.txt',
  '08_instrucciones_subida_youtube.txt',
];

const allFound = expectedFiles.every((name) => bundle.files.some((f) => f.name === name));
if (allFound) {
  console.log('✅ YouTube Master Pack verificado con todos los archivos requeridos');
} else {
  console.error('❌ Faltan archivos en el YouTube Master Pack');
}

// Limpiar archivos de prueba
try {
  fs.rmSync(path.resolve(__dirname, '../storage/projects/test_multilang_proj'), {
    recursive: true,
    force: true,
  });
  console.log('🧹 Limpieza de entorno de pruebas completada');
} catch {}
