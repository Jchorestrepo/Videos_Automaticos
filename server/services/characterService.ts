import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CharacterProfile } from '../../src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CHANNELS_DIR = path.resolve(__dirname, '../../channels');

export class CharacterService {
  static getChannelCharactersDir(channelId: string): string {
    const dir = path.join(CHANNELS_DIR, channelId, 'characters');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  static getCharacters(channelId: string): CharacterProfile[] {
    const dir = this.getChannelCharactersDir(channelId);
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));

    const characters: CharacterProfile[] = [];
    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(dir, file), 'utf-8');
        characters.push(JSON.parse(content) as CharacterProfile);
      } catch (err) {
        console.error(`Error reading character ${file}:`, err);
      }
    }
    return characters;
  }

  static getCharacter(channelId: string, characterId: string): CharacterProfile | null {
    const filePath = path.join(this.getChannelCharactersDir(channelId), `${characterId}.json`);
    if (!fs.existsSync(filePath)) return null;
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as CharacterProfile;
    } catch {
      return null;
    }
  }

  static saveCharacter(channelId: string, profile: CharacterProfile): void {
    const dir = this.getChannelCharactersDir(channelId);
    const filePath = path.join(dir, `${profile.character_id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(profile, null, 2), 'utf-8');
  }

  static findOrDraftCharacter(
    channelId: string,
    characterNameOrCompany: string,
    storyTitle: string,
    conflict?: string
  ): CharacterProfile {
    const existing = this.getCharacters(channelId);
    const lowerName = (characterNameOrCompany || storyTitle).toLowerCase();

    // 1. Fuzzy match against existing library
    for (const char of existing) {
      const charLower = char.name.toLowerCase();
      const idLower = char.character_id.toLowerCase();
      if (
        lowerName.includes(charLower) ||
        charLower.includes(lowerName) ||
        lowerName.includes(idLower)
      ) {
        console.log(`[Character Library] ✓ Personaje existente encontrado en biblioteca: "${char.name}"`);
        return char;
      }
    }

    // 2. Draft new stylized 3D character profile
    const cleanId = (characterNameOrCompany || 'protagonista')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .slice(0, 30);

    const isTech = channelId.includes('tech');
    let anchorPrompt = '';
    let props: string[] = [];

    if (isTech) {
      anchorPrompt = `Stylized 3D cinematic animated character of ${characterNameOrCompany || 'tech visionary founder'}, 30-40 years old, highly expressive facial structure, sharp eyes, modern tailored smart-casual tech entrepreneur attire, Pixar and Arcane inspired visual aesthetic, rich volumetric lighting, high-end 3D documentary render`;
      props = ['sleek smartphone with financial charts', 'glass corporate office window', 'modern minimalist tech desk'];
    } else {
      anchorPrompt = `Stylized 3D cinematic animated historical character representing ${characterNameOrCompany || 'ancient survivor'}, sun-bronzed textured skin, authentic historical linen and leather garments of the era, determined expressive eyes, Arcane and Pixar inspired 3D render, high aesthetic realism`;
      props = ['earthenware water jar', 'ancient tool of trade', 'sun-drenched historical village'];
    }

    const newProfile: CharacterProfile = {
      character_id: cleanId,
      channel_id: channelId,
      name: characterNameOrCompany || 'Protagonista Principal',
      role: `Figura central en ${storyTitle}`,
      real_person: true,
      anchor_prompt: anchorPrompt,
      signature_props: props,
    };

    // Save to channel library for future reuse
    this.saveCharacter(channelId, newProfile);
    console.log(`[Character Library] + Nuevo personaje registrado en biblioteca: "${newProfile.name}" (${newProfile.character_id})`);

    return newProfile;
  }
}
