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

  static savePersona(persona: ChannelPersona): boolean {
    const channelDir = path.join(CHANNELS_DIR, persona.channel_id);
    if (!fs.existsSync(channelDir)) {
      fs.mkdirSync(channelDir, { recursive: true });
    }
    const personaPath = path.join(channelDir, 'persona.json');
    fs.writeFileSync(personaPath, JSON.stringify(persona, null, 2), 'utf-8');
    return true;
  }
}
