import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ChannelPersona } from '../../src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CHANNELS_DIR = path.resolve(__dirname, '../../channels');

export class PersonaService {
  static getChannels(): ChannelPersona[] {
    if (!fs.existsSync(CHANNELS_DIR)) {
      return [];
    }
    const dirs = fs.readdirSync(CHANNELS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    const channels: ChannelPersona[] = [];
    for (const dir of dirs) {
      const personaPath = path.join(CHANNELS_DIR, dir, 'persona.json');
      if (fs.existsSync(personaPath)) {
        try {
          const content = fs.readFileSync(personaPath, 'utf-8');
          const data = JSON.parse(content) as ChannelPersona;
          channels.push(data);
        } catch (err) {
          console.error(`Error reading persona for channel ${dir}:`, err);
        }
      }
    }
    return channels;
  }

  static getPersona(channelId: string): ChannelPersona | null {
    const personaPath = path.join(CHANNELS_DIR, channelId, 'persona.json');
    if (!fs.existsSync(personaPath)) {
      return null;
    }
    try {
      const content = fs.readFileSync(personaPath, 'utf-8');
      return JSON.parse(content) as ChannelPersona;
    } catch (err) {
      console.error(`Error loading persona ${channelId}:`, err);
      return null;
    }
  }

  static savePersona(input: Partial<ChannelPersona> & { channel_id?: string; name: string }): ChannelPersona {
    const cleanId =
      (input.channel_id || input.name)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 32) || `channel_${Date.now()}`;

    const existing = this.getPersona(cleanId);
    const channelDir = path.join(CHANNELS_DIR, cleanId);
    const charsAssetsDir = path.join(channelDir, 'characters', 'assets');
    if (!fs.existsSync(charsAssetsDir)) {
      fs.mkdirSync(charsAssetsDir, { recursive: true });
    }

    const name = input.name.trim();
    const niche = (input.niche || existing?.niche || 'Documentales e Historias de Impacto').trim();

    const persona: ChannelPersona = {
      channel_id: cleanId,
      name,
      display_title: (input.display_title || existing?.display_title || `${name} (${niche.slice(0, 32)})`).trim(),
      niche,
      language: input.language || existing?.language || 'es',
      target_audience:
        input.target_audience || existing?.target_audience || `Entusiastas y seguidores de ${niche}`,
      cpm_tier: input.cpm_tier || existing?.cpm_tier || 'High ($10-$25 USD)',
      default_voice_id: input.default_voice_id ?? existing?.default_voice_id,
      default_voice_engine: input.default_voice_engine ?? existing?.default_voice_engine,
      narrator: {
        name: input.narrator?.name || existing?.narrator?.name || `El Cronista de ${name}`,
        archetype:
          input.narrator?.archetype ||
          existing?.narrator?.archetype ||
          `Narrador Documental y Analista de ${niche}`,
        tone:
          input.narrator?.tone ||
          existing?.narrator?.tone ||
          'Envolvente, perspicaz, con ritmo cinematográfico y tensión narrativa.',
        perspective:
          input.narrator?.perspective ||
          existing?.narrator?.perspective ||
          'Observador analítico que revela la verdad oculta detrás de cada historia.',
        target_wpm: input.narrator?.target_wpm || existing?.narrator?.target_wpm || 135,
        signature_cues: input.narrator?.signature_cues ||
          existing?.narrator?.signature_cues || {
            openings: [
              'Detrás de cada gran historia que el mundo cree conocer, se esconde un detalle que lo cambia todo.',
              'Nadie imaginaba que una sola decisión desencadenaría una reacción en cadena imposible de detener.',
            ],
            transitions: [
              'Pero aquí es donde la historia da un giro inesperado.',
              'Lo que nadie veía venir estaba ocurriendo en silencio.',
            ],
            closings: [
              'Una lección inolvidable que cambió las reglas para siempre.',
            ],
          },
        key_vocabulary: input.narrator?.key_vocabulary ||
          existing?.narrator?.key_vocabulary || ['punto de quiebre', 'impacto', 'revelación', 'legado'],
        forbidden_phrases: input.narrator?.forbidden_phrases ||
          existing?.narrator?.forbidden_phrases || [
            'en este apasionante video',
            'no olvides suscribirte y darle like',
            'sin más preámbulos',
          ],
      },
      visual_style: {
        engine: input.visual_style?.engine || existing?.visual_style?.engine || 'google_imagen_3',
        aspect_ratio: '16:9',
        art_style_name: input.visual_style?.art_style_name || existing?.visual_style?.art_style_name || '3d_animation',
        prompt_prefix:
          input.visual_style?.prompt_prefix ||
          existing?.visual_style?.prompt_prefix ||
          'Fotografía cinematográfica documental de 35mm, estética 3D estilizada de alto nivel,',
        prompt_suffix:
          input.visual_style?.prompt_suffix ||
          existing?.visual_style?.prompt_suffix ||
          'iluminación volumétrica dramática, atmósfera inmersiva, alta resolución 4k',
        default_foley: input.visual_style?.default_foley || existing?.visual_style?.default_foley,
      },
      sheets_integration:
        input.sheets_integration !== undefined
          ? input.sheets_integration
          : existing?.sheets_integration,
    };

    const personaPath = path.join(channelDir, 'persona.json');
    fs.writeFileSync(personaPath, JSON.stringify(persona, null, 2), 'utf-8');
    return persona;
  }
}

