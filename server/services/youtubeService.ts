import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import type {
  ChannelPersona,
  ProjectScript,
  YouTubePackagingData,
  SuggestedTitleItem,
} from '../../src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_DIR = path.resolve(__dirname, '../../storage/projects');

export class YouTubeService {
  /**
   * Calcula las marcas de tiempo exactas (Capítulos) basadas en la duración real de cada escena
   */
  static computeChapterTimestamps(
    project: ProjectScript,
    language: 'en' | 'es' = 'en'
  ): string {
    return project.scenes
      .map((scene, idx) => {
        const accumSeconds = project.scenes
          .slice(0, idx)
          .reduce((acc, prev) => acc + (prev.durationInSeconds || 5), 0);
        const min = Math.floor(accumSeconds / 60);
        const sec = Math.floor(accumSeconds % 60);
        const formatted = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
        const chapterName =
          language === 'es' && project.scenes_es?.[idx]?.chapter_es
            ? project.scenes_es[idx].chapter_es
            : scene.chapter || (language === 'es' ? `Capítulo ${idx + 1}` : `Chapter ${idx + 1}`);
        return `${formatted} - ${chapterName}`;
      })
      .join('\n');
  }

  /**
   * Genera todo el paquete de empaque y metadatos virales para YouTube usando IA
   */
  static async generateYouTubeMetadata(
    project: ProjectScript,
    channel: ChannelPersona
  ): Promise<YouTubePackagingData> {
    dotenv.config({ override: true });

    const timestampsEn = this.computeChapterTimestamps(project, 'en');
    const timestampsEs = this.computeChapterTimestamps(project, 'es');
    const totalSeconds = project.scenes.reduce(
      (acc, s) => acc + (s.durationInSeconds || 5),
      0
    );
    const durationMin = Math.round(totalSeconds / 60);

    const protagonist =
      project.researchDossier?.protagonist_profile?.name ||
      project.characters?.[0]?.name ||
      'Protagonist';
    const antagonist =
      project.researchDossier?.antagonist_profile?.name ||
      project.characters?.find((c) => c.role?.toLowerCase().includes('rival') || c.role?.toLowerCase().includes('antagonista'))?.name ||
      'the Rival / System';
    const smokingGuns = project.researchDossier?.smoking_guns?.join('; ') || '';
    const keyNumbers = project.researchDossier?.hard_numbers?.map((n) => `${n.label}: ${n.metric}`).join(', ') || '';

    const systemPrompt = `You are a Senior YouTube Growth and Algorithm Strategist specialized in high-retention documentaries (Veritasium, ColdFusion, Magnates Media, Fern, Lemmino).
Your mission is to craft a viral, high-CTR YouTube packaging bundle for an impactful documentary (${durationMin} min), tentatively titled: "${project.title}".

CHANNEL CONTEXT:
- Channel: "${channel.name}" (${channel.display_title})
- Niche: "${channel.niche}"
- Target Audience: "${channel.target_audience}"
- Narrative Tone: "${channel.narrator?.tone || 'Gripping, analytical, cinematic tension'}"

STORY FACTS:
- Protagonist: ${protagonist}
- Conflict / Antagonist: ${antagonist}
- Hook: "${project.hook}"
- Key Evidence / Smoking Guns: ${smokingGuns || 'N/A'}
- Hard Numbers: ${keyNumbers || 'N/A'}

TIMESTAMPS:
- English:
${timestampsEn}
- Spanish:
${timestampsEs}

You must return ONLY a valid JSON object with the following exact structure:
{
  "selectedTitle": "Main High-CTR Title in English (50-65 chars, compelling, curiosity gap)",
  "suggestedTitles": [
    {
      "title": "Curiosity Gap Title in English",
      "category": "curiosity",
      "score": 98,
      "hookExplanation": "Irresistible question for viewers."
    },
    {
      "title": "Conflict & Drama Title in English",
      "category": "drama",
      "score": 95,
      "hookExplanation": "Highlights the battle or betrayal."
    },
    {
      "title": "Rise & Fall Storytelling Title in English",
      "category": "story",
      "score": 94,
      "hookExplanation": "Promised character transformation."
    },
    {
      "title": "Negative / Loss Warning Title in English",
      "category": "negative",
      "score": 92,
      "hookExplanation": "Fear of missing out or fatal mistake."
    },
    {
      "title": "Provocative Question Title? in English",
      "category": "question",
      "score": 90,
      "hookExplanation": "Challenges audience assumptions."
    },
    {
      "title": "Direct Numbers & Data Title in English",
      "category": "direct",
      "score": 96,
      "hookExplanation": "Concrete figures for high credibility."
    }
  ],
  "suggestedThumbnailTexts": [
    "2-4 WORD UPPERCASE PHRASE 1",
    "THE TRUTH",
    "$1B MISTAKE",
    "HIDDEN SCANDAL",
    "LOST EVERYTHING"
  ],
  "description": "Full professional description in ENGLISH with hook, synopsis, timestamps, credits, and CTA:\\n\\n[Gripping 2-sentence hook before 'Show More']\\n\\n[Compelling 2-paragraph synopsis]\\n\\n⏱️ TIMESTAMPS / CHAPTERS:\\n${timestampsEn.replace(/\n/g, '\\n')}\\n\\n🔔 Subscribe to ${channel.name} for more deep-dive investigations!\\n\\n#Documentary #Investigation",
  "hashtags": ["#Documentary", "#Investigation", "#Story"],
  "tags": ["tag 1", "tag 2", "tag 3", "up to 15 relevant tags in English"],
  "pinnedComment": "Engaging pinned question in English to trigger hundreds of comments and discussions.",
  "communityPost": "Intriguing teaser post in English for the YouTube Community tab.",
  "localizedEs": {
    "title": "Título traducido de alto impacto en ESPAÑOL para la pestaña de traducción de YouTube",
    "description": "Descripción completa en ESPAÑOL con marcas de tiempo en español:\\n\\n[Gancho en 2 líneas]\\n\\n[Sinopsis en 2 párrafos]\\n\\n⏱️ CAPÍTULOS:\\n${timestampsEs.replace(/\n/g, '\\n')}\\n\\n🔔 ¡Suscríbete a ${channel.name} para más documentales!\\n\\n#Documental #Historia",
    "pinnedComment": "Pregunta de debate en ESPAÑOL para espectadores hispanohablantes."
  }
}
`;

    const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
    const openrouterKey = (process.env.OPENROUTER_API_KEY || '').trim();
    const openaiKey = (process.env.OPENAI_API_KEY || '').trim();

    let parsedResult: any = null;

    // 1. Google Gemini (2.5 Flash)
    if (geminiKey && geminiKey !== 'tu_clave_de_gemini_aqui') {
      try {
        console.log('[YouTube Service] Generando empaque SEO y títulos virales con Gemini...');
        const client = new GoogleGenAI({ apiKey: geminiKey });
        const res = await client.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
          config: {
            responseMimeType: 'application/json',
            temperature: 0.7,
          },
        });
        if (res.text) {
          parsedResult = JSON.parse(res.text);
        }
      } catch (err: any) {
        console.warn('[YouTube Service] Error con Gemini:', err.message);
      }
    }

    // 2. OpenRouter Fallback
    if (!parsedResult && openrouterKey) {
      try {
        console.log('[YouTube Service] Generando empaque SEO con OpenRouter...');
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openrouterKey}`,
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{ role: 'user', content: systemPrompt }],
            response_format: { type: 'json_object' },
            temperature: 0.7,
          }),
        });
        if (res.ok) {
          const data: any = await res.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) parsedResult = JSON.parse(content);
        }
      } catch (err: any) {
        console.warn('[YouTube Service] Error con OpenRouter:', err.message);
      }
    }

    // 3. OpenAI Fallback
    if (!parsedResult && openaiKey && openaiKey.startsWith('sk-')) {
      try {
        console.log('[YouTube Service] Generando empaque SEO con OpenAI...');
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: systemPrompt }],
            response_format: { type: 'json_object' },
            temperature: 0.7,
          }),
        });
        if (res.ok) {
          const data: any = await res.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) parsedResult = JSON.parse(content);
        }
      } catch (err: any) {
        console.warn('[YouTube Service] Error con OpenAI:', err.message);
      }
    }

    // Si fallan las APIs de IA, proveer un empaque inteligente de respaldo
    if (!parsedResult) {
      console.log('[YouTube Service] Creando empaque SEO inteligente por plantilla...');
      parsedResult = this.createFallbackPackaging(project, channel, timestampsEn, timestampsEs);
    }

    // Validar y limpiar longitud de etiquetas (YouTube permite máx 500 chars)
    let tagsList: string[] = Array.isArray(parsedResult.tags) ? parsedResult.tags : [];
    if (tagsList.length === 0) {
      tagsList = [
        project.title,
        channel.name,
        channel.niche,
        protagonist,
        'documental español',
        'historia real',
        'caso real',
        'explicación completa',
      ];
    }
    // Recortar si supera 480 caracteres sumados
    let totalChars = 0;
    const cleanTags: string[] = [];
    for (const tag of tagsList) {
      if (totalChars + tag.length + 1 < 480) {
        cleanTags.push(tag);
        totalChars += tag.length + 1;
      }
    }

    const packagingData: YouTubePackagingData = {
      selectedTitle: parsedResult.selectedTitle || project.title,
      suggestedTitles: Array.isArray(parsedResult.suggestedTitles)
        ? parsedResult.suggestedTitles
        : [],
      suggestedThumbnailTexts: Array.isArray(parsedResult.suggestedThumbnailTexts)
        ? parsedResult.suggestedThumbnailTexts
        : ['THE TRUTH', '$1B MISTAKE', 'LOST EVERYTHING', 'HIDDEN SCANDAL'],
      description:
        parsedResult.description ||
        `In this documentary investigation, we uncover the hidden truth behind ${project.title}.\n\n⏱️ TIMESTAMPS / CHAPTERS:\n${timestampsEn}\n\nChannel: ${channel.name}`,
      hashtags: Array.isArray(parsedResult.hashtags)
        ? parsedResult.hashtags
        : ['#Documentary', '#Investigation', '#Story'],
      tags: cleanTags,
      pinnedComment:
        parsedResult.pinnedComment ||
        `What do you think was the turning point for ${protagonist}? Drop your thoughts in the comments below! 👇`,
      communityPost:
        parsedResult.communityPost ||
        `🚨 NEW DOCUMENTARY OUT NOW! We investigated what really happened with "${project.title}". Watch it now and let us know your theories.`,
      localizedEs: parsedResult.localizedEs || {
        title: `${project.title}: La Verdad que Nadie Quería Contar`,
        description: `En este documental revelamos la verdad detrás de ${project.title}.\n\n⏱️ MARCAS DE TIEMPO:\n${timestampsEs}\n\nCanal: ${channel.name}`,
        pinnedComment: `¿Cuál crees que fue el momento exacto en el que ${protagonist} cometió su mayor equivocación? Déjamelo saber en los comentarios 👇`,
      },
    };

    return packagingData;
  }

  /**
   * Genera un fondo cinematográfico 16:9 con IA diseñado para ser base de miniatura
   */
  static async generateThumbnailBackground(
    project: ProjectScript,
    channel: ChannelPersona,
    customPrompt?: string
  ): Promise<{ backgroundUrl: string; promptUsed: string }> {
    dotenv.config({ override: true });

    const projectDir = path.join(STORAGE_DIR, project.project_id);
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    const timestamp = Date.now();
    const filename = `thumb_bg_${timestamp}.jpg`;
    const filePath = path.join(projectDir, filename);
    const publicUrl = `/storage/${project.project_id}/${filename}`;

    const protagonist =
      project.characters?.[0]?.name || project.characterCompany || project.title;

    const thumbnailPrompt = [
      `Cinematic YouTube thumbnail background artwork for a documentary titled "${project.title}".`,
      customPrompt ? `Key visual focal theme: ${customPrompt}.` : '',
      `Theme: ${project.hook.slice(0, 160)}.`,
      `Central subject or atmosphere involving ${protagonist}.`,
      `High-contrast dramatic lighting, volumetric rim lights, vibrant saturation, deep shadows, epic wide 16:9 cinematic shot, Pixar and Arcane 3D documentary aesthetic, clean negative space on the left and top for overlay text and badges, 8k render, NO typography, NO watermarks, NO split screen borders, NO logos.`,
    ]
      .filter(Boolean)
      .join(' ');

    const openrouterKey = (process.env.OPENROUTER_API_KEY || '').trim();
    const openaiKey = (process.env.OPENAI_API_KEY || '').trim();
    const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();

    let generated = false;

    // 1. OpenRouter (Gemini 3.1 Flash Image)
    if (openrouterKey && !generated) {
      try {
        console.log('[Thumbnail] Generando fondo 16:9 con OpenRouter...');
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openrouterKey}`,
            'HTTP-Referer': 'http://localhost:5173',
            'X-Title': 'Studio Multi-Canal',
          },
          body: JSON.stringify({
            model: 'google/gemini-3.1-flash-image',
            messages: [{ role: 'user', content: thumbnailPrompt }],
          }),
        });

        if (res.ok) {
          const data: any = await res.json();
          const msg = data.choices?.[0]?.message;
          let b64: string | null = null;
          if (msg?.images && msg.images.length > 0) {
            const imgUrl = msg.images[0].image_url?.url || '';
            if (imgUrl.startsWith('data:image/')) {
              b64 = imgUrl.split(',')[1];
            } else if (imgUrl.startsWith('http')) {
              const imgRes = await fetch(imgUrl);
              fs.writeFileSync(filePath, Buffer.from(await imgRes.arrayBuffer()));
              generated = true;
            }
          } else if (msg?.parts) {
            const part = msg.parts.find((p: any) => p.inlineData);
            if (part?.inlineData?.data) b64 = part.inlineData.data;
          }
          if (b64) {
            fs.writeFileSync(filePath, Buffer.from(b64, 'base64'));
            generated = true;
          }
        }
      } catch (err: any) {
        console.warn('[Thumbnail] Error OpenRouter:', err.message);
      }
    }

    // 2. OpenAI DALL-E 3
    if (openaiKey && openaiKey.startsWith('sk-') && !generated) {
      try {
        console.log('[Thumbnail] Generando fondo 16:9 con OpenAI...');
        const res = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-image-1-mini',
            prompt: thumbnailPrompt.slice(0, 950),
            n: 1,
            size: '1024x1024',
          }),
        });
        if (res.ok) {
          const data: any = await res.json();
          const imgUrl = data.data?.[0]?.url;
          const b64 = data.data?.[0]?.b64_json;
          if (b64) {
            fs.writeFileSync(filePath, Buffer.from(b64, 'base64'));
            generated = true;
          } else if (imgUrl) {
            const imgRes = await fetch(imgUrl);
            fs.writeFileSync(filePath, Buffer.from(await imgRes.arrayBuffer()));
            generated = true;
          }
        }
      } catch (err: any) {
        console.warn('[Thumbnail] Error OpenAI:', err.message);
      }
    }

    // 3. Fallback: Reutilizar la primera imagen disponible del proyecto o generar un SVG de arte conceptual 16:9
    if (!generated) {
      const firstSceneImg = project.scenes.find((s) => s.imageUrl)?.imageUrl;
      if (firstSceneImg) {
        return {
          backgroundUrl: firstSceneImg,
          promptUsed: 'Reutilización del fotograma clave del video',
        };
      }

      // Crear un fondo cinematográfico SVG de respaldo con gradientes volumétricos
      const svgGrad = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0f172a" />
            <stop offset="50%" stop-color="#1e1b4b" />
            <stop offset="100%" stop-color="#090d16" />
          </linearGradient>
          <radialGradient id="glow" cx="65%" cy="40%" r="55%">
            <stop offset="0%" stop-color="#ef4444" stop-opacity="0.4" />
            <stop offset="50%" stop-color="#3b82f6" stop-opacity="0.1" />
            <stop offset="100%" stop-color="#000000" stop-opacity="0.8" />
          </radialGradient>
        </defs>
        <rect width="1280" height="720" fill="url(#bg)" />
        <rect width="1280" height="720" fill="url(#glow)" />
      </svg>`;
      const svgPath = path.join(projectDir, `thumb_bg_${timestamp}.svg`);
      fs.writeFileSync(svgPath, svgGrad);
      return {
        backgroundUrl: `/storage/${project.project_id}/thumb_bg_${timestamp}.svg`,
        promptUsed: thumbnailPrompt,
      };
    }

    return {
      backgroundUrl: publicUrl,
      promptUsed: thumbnailPrompt,
    };
  }

  /**
   * Guarda el archivo final de miniatura renderizado en el cliente como PNG
   */
  static saveThumbnail(
    projectId: string,
    base64Data: string
  ): { publicUrl: string; filename: string } {
    const projectDir = path.join(STORAGE_DIR, projectId);
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    const timestamp = Date.now();
    const filename = `thumbnail_${timestamp}.png`;
    const filePath = path.join(projectDir, filename);

    fs.writeFileSync(filePath, buffer);

    // Guardar también una copia como thumbnail_final.png para referencia fija
    try {
      fs.writeFileSync(path.join(projectDir, 'thumbnail_final.png'), buffer);
    } catch {
      // Ignorar error secundario de copia
    }

    return {
      publicUrl: `/storage/${projectId}/${filename}`,
      filename,
    };
  }

  /**
   * Generador de empaque de respaldo sin conexión a IA
   */
  private static createFallbackPackaging(
    project: ProjectScript,
    channel: ChannelPersona,
    timestampsEn: string,
    timestampsEs: string = timestampsEn
  ) {
    const protagonist =
      project.characters?.[0]?.name || project.characterCompany || 'The Protagonist';
    const mainTitle = project.title;

    return {
      selectedTitle: `${mainTitle}: The Untold Story That Changed Everything`,
      suggestedTitles: [
        {
          title: `The Hidden Truth About ${protagonist} That Destroyed Everything`,
          category: 'curiosity',
          score: 96,
          hookExplanation: 'Direct curiosity gap.',
        },
        {
          title: `${mainTitle}: The Collapse They Tried to Hide`,
          category: 'drama',
          score: 94,
          hookExplanation: 'Focus on conspiracy and battle.',
        },
        {
          title: `From Riches to Ruin: The Rise & Fall of ${protagonist}`,
          category: 'story',
          score: 93,
          hookExplanation: 'Classic transformation arc.',
        },
        {
          title: `The Biggest Mistake of ${protagonist} (And Why Nobody Could Stop It)`,
          category: 'negative',
          score: 95,
          hookExplanation: 'Warning angle generates high CTR.',
        },
        {
          title: `How Did They Fool Everyone? The Truth Behind ${mainTitle}`,
          category: 'question',
          score: 91,
          hookExplanation: 'Challenges viewer perception.',
        },
        {
          title: `${mainTitle}: A Multi-Million Dollar Forensic Breakdown`,
          category: 'direct',
          score: 89,
          hookExplanation: 'Journalistic high-credibility angle.',
        },
      ],
      suggestedThumbnailTexts: [
        'THE TRUTH',
        'BIG MISTAKE',
        'LOST EVERYTHING',
        'HIDDEN SCANDAL',
        'TOO FAR',
      ],
      description: `In this documentary investigation, we uncover the shocking reality behind ${project.title}.\n\nAn in-depth analysis of ${project.hook}\n\n⏱️ TIMESTAMPS / CHAPTERS:\n${timestampsEn}\n\nChannel: ${channel.name}\nNiche: ${channel.niche}\n\n🔔 Subscribe for more high-impact documentary deep-dives.\n\n#Documentary #Investigation #${channel.name.replace(/\s+/g, '')}`,
      hashtags: [
        '#Documentary',
        '#Investigation',
        '#RealStory',
        `#${channel.name.replace(/\s+/g, '')}`,
        '#History',
      ],
      tags: [
        project.title,
        channel.name,
        protagonist,
        channel.niche,
        'full documentary',
        'true story',
        'forensic analysis',
        'video essay',
        'deep dive',
      ],
      pinnedComment: `What do you think was the turning point for ${protagonist}? Drop your thoughts in the comments below! 👇`,
      communityPost: `🚨 OUR NEW DOCUMENTARY IS OUT! We spent weeks digging into "${project.title}". Watch it now and let us know what you think.`,
      localizedEs: {
        title: `${mainTitle}: La Verdad que Nadie Quería Contar`,
        description: `En este documental desglosamos la verdad detrás de ${project.title}.\n\nUna investigación profunda sobre ${project.hook}\n\n⏱️ CAPÍTULOS:\n${timestampsEs}\n\nCanal: ${channel.name}\nNicho: ${channel.niche}\n\n🔔 Suscríbete para no perderte nuestras próximas investigaciones documentales.\n\n#Documental #Historia #${channel.name.replace(/\s+/g, '')}`,
        pinnedComment: `¿Cuál crees que fue el momento exacto en el que ${protagonist} cometió su mayor equivocación? Déjamelo saber en los comentarios 👇`,
      },
    };
  }

  /**
   * Genera el paquete maestro para YouTube con todos los activos organizados en youtube_pack/
   */
  static generateYouTubeBundle(
    project: ProjectScript,
    channel: ChannelPersona
  ): {
    bundleDir: string;
    files: Array<{ name: string; url: string; sizeBytes?: number }>;
  } {
    const projectDir = path.join(STORAGE_DIR, project.project_id);
    const bundleDir = path.join(projectDir, 'youtube_pack');
    if (!fs.existsSync(bundleDir)) {
      fs.mkdirSync(bundleDir, { recursive: true });
    }

    const exportedFiles: Array<{ name: string; url: string; sizeBytes?: number }> = [];

    // 1. Video Master 1080p
    const finalVideoPath = path.join(projectDir, 'final_video.mp4');
    const targetVideoPath = path.join(bundleDir, '01_video_master_1080p.mp4');
    if (fs.existsSync(finalVideoPath)) {
      if (!fs.existsSync(targetVideoPath)) {
        try {
          fs.copyFileSync(finalVideoPath, targetVideoPath);
        } catch {}
      }
      exportedFiles.push({
        name: '01_video_master_1080p.mp4',
        url: `/storage/${project.project_id}/youtube_pack/01_video_master_1080p.mp4`,
        sizeBytes: fs.existsSync(targetVideoPath) ? fs.statSync(targetVideoPath).size : undefined,
      });
    }

    // 2. Audio Spanish Dub (Pista secundaria de doblaje para YouTube)
    const spanishAudioPath = path.join(projectDir, 'audio_spanish_track.mp3');
    const targetSpanishAudio = path.join(bundleDir, '02_audio_spanish_dub.mp3');
    if (fs.existsSync(spanishAudioPath)) {
      try {
        fs.copyFileSync(spanishAudioPath, targetSpanishAudio);
      } catch {}
      exportedFiles.push({
        name: '02_audio_spanish_dub.mp3',
        url: `/storage/${project.project_id}/youtube_pack/02_audio_spanish_dub.mp3`,
        sizeBytes: fs.statSync(targetSpanishAudio).size,
      });
    }

    // 3. Subtítulos English (.srt)
    const srtEnPath = path.join(projectDir, 'subtitles_en.srt');
    const targetSrtEn = path.join(bundleDir, '03_subtitles_english.srt');
    if (fs.existsSync(srtEnPath)) {
      try {
        fs.copyFileSync(srtEnPath, targetSrtEn);
      } catch {}
      exportedFiles.push({
        name: '03_subtitles_english.srt',
        url: `/storage/${project.project_id}/youtube_pack/03_subtitles_english.srt`,
        sizeBytes: fs.statSync(targetSrtEn).size,
      });
    }

    // 4. Subtítulos Spanish (.srt)
    const srtEsPath = path.join(projectDir, 'subtitles_es.srt');
    const targetSrtEs = path.join(bundleDir, '04_subtitles_spanish.srt');
    if (fs.existsSync(srtEsPath)) {
      try {
        fs.copyFileSync(srtEsPath, targetSrtEs);
      } catch {}
      exportedFiles.push({
        name: '04_subtitles_spanish.srt',
        url: `/storage/${project.project_id}/youtube_pack/04_subtitles_spanish.srt`,
        sizeBytes: fs.statSync(targetSrtEs).size,
      });
    }

    // 5. Miniatura Final
    const thumbFinal = path.join(projectDir, 'thumbnail_final.png');
    const targetThumb = path.join(bundleDir, '05_thumbnail_1920x1080.png');
    if (fs.existsSync(thumbFinal)) {
      try {
        fs.copyFileSync(thumbFinal, targetThumb);
      } catch {}
      exportedFiles.push({
        name: '05_thumbnail_1920x1080.png',
        url: `/storage/${project.project_id}/youtube_pack/05_thumbnail_1920x1080.png`,
        sizeBytes: fs.statSync(targetThumb).size,
      });
    }

    // 6. Metadata English (.txt)
    const metaEnContent = `=====================================================
YOUTUBE MASTER METADATA (ENGLISH / DEFAULT)
Channel: ${channel.name} (${channel.display_title})
Project: ${project.title}
=====================================================

--- TITLE (Primary) ---
${project.youtubeMetadata?.selectedTitle || project.title}

--- ALTERNATIVE SUGGESTED TITLES ---
${(project.youtubeMetadata?.suggestedTitles || []).map((t) => `• [${t.category.toUpperCase()}] ${t.title} (CTR Score: ${t.score || 90}/100)`).join('\n')}

--- DESCRIPTION (Copy & paste into YouTube description box) ---
${project.youtubeMetadata?.description || ''}

--- TAGS (Copy & paste into YouTube tags box) ---
${(project.youtubeMetadata?.tags || []).join(', ')}

--- HASHTAGS ---
${(project.youtubeMetadata?.hashtags || []).join(' ')}

--- PINNED COMMENT ---
${project.youtubeMetadata?.pinnedComment || ''}

--- COMMUNITY POST ---
${project.youtubeMetadata?.communityPost || ''}
`;
    const metaEnPath = path.join(bundleDir, '06_metadata_youtube_english.txt');
    fs.writeFileSync(metaEnPath, metaEnContent, 'utf-8');
    exportedFiles.push({
      name: '06_metadata_youtube_english.txt',
      url: `/storage/${project.project_id}/youtube_pack/06_metadata_youtube_english.txt`,
      sizeBytes: fs.statSync(metaEnPath).size,
    });

    // 7. Metadata Spanish (.txt)
    const metaEsContent = `=====================================================
METADATOS LOCALIZADOS EN ESPAÑOL (PARA YOUTUBE STUDIO)
Sección: Subtítulos y Traducciones > Idiomas > Español
=====================================================

--- TÍTULO EN ESPAÑOL ---
${project.youtubeMetadata?.localizedEs?.title || project.title}

--- DESCRIPCIÓN EN ESPAÑOL (Con marcas de tiempo en español) ---
${project.youtubeMetadata?.localizedEs?.description || ''}

--- COMENTARIO FIJADO (Opción en español) ---
${project.youtubeMetadata?.localizedEs?.pinnedComment || ''}
`;
    const metaEsPath = path.join(bundleDir, '07_metadata_youtube_spanish.txt');
    fs.writeFileSync(metaEsPath, metaEsContent, 'utf-8');
    exportedFiles.push({
      name: '07_metadata_youtube_spanish.txt',
      url: `/storage/${project.project_id}/youtube_pack/07_metadata_youtube_spanish.txt`,
      sizeBytes: fs.statSync(metaEsPath).size,
    });

    // 8. Guía de Subida en 3 Pasos
    const guideContent = `=====================================================
GUÍA DE SUBIDA MULTILINGÜE EN YOUTUBE STUDIO (OPCIÓN 1)
=====================================================

1. SUBIR EL VIDEO PRINCIPAL:
   - Sube '01_video_master_1080p.mp4'.
   - Copia el título y descripción de '06_metadata_youtube_english.txt'.
   - Sube la miniatura '05_thumbnail_1920x1080.png'.
   - Selecciona "Idioma del video: Inglés".

2. SUBIR LA PISTA DE AUDIO EN ESPAÑOL (DOBLAJE):
   - En la pestaña "Detalles del video", ve a "Pistas de audio" (Audio tracks).
   - Haz clic en "+ Agregar pista de audio".
   - Selecciona el idioma: "Español".
   - Sube el archivo '02_audio_spanish_dub.mp3'.

3. SUBIR SUBTÍTULOS OFICIALES (CC):
   - Ve a la sección "Subtítulos" en YouTube Studio.
   - En Inglés: haz clic en "Agregar" y sube '03_subtitles_english.srt' (con tiempos).
   - En Español: haz clic en "+ Agregar idioma" -> "Español".
     * Sube el archivo '04_subtitles_spanish.srt'.
     * Pega el Título y Descripción de '07_metadata_youtube_spanish.txt' en la traducción del video.

¡Listo! YouTube reproducirá el video con audio en inglés para el público global, y cambiará automáticamente al doblaje en español para los usuarios de habla hispana, con subtítulos limpios en ambos idiomas.
`;
    const guidePath = path.join(bundleDir, '08_instrucciones_subida_youtube.txt');
    fs.writeFileSync(guidePath, guideContent, 'utf-8');
    exportedFiles.push({
      name: '08_instrucciones_subida_youtube.txt',
      url: `/storage/${project.project_id}/youtube_pack/08_instrucciones_subida_youtube.txt`,
      sizeBytes: fs.statSync(guidePath).size,
    });

    return {
      bundleDir,
      files: exportedFiles,
    };
  }
}

