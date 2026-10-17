import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CharacterProfile, VisualAssetMetadata, ShotType } from '../../src/types/index.ts';

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

  static getChannelCharacterAssetsDir(channelId: string): string {
    const dir = path.join(this.getChannelCharactersDir(channelId), 'assets');
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
    return characters.sort((a, b) => {
      const tA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const tB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return tB - tA;
    });
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

  static saveCharacter(channelId: string, profile: CharacterProfile): CharacterProfile {
    const dir = this.getChannelCharactersDir(channelId);
    const existing = this.getCharacter(channelId, profile.character_id);
    const merged: CharacterProfile = {
      ...existing,
      ...profile,
      channel_id: channelId,
      canonical_image_url: profile.canonical_image_url ?? existing?.canonical_image_url,
      custom_uploaded: profile.custom_uploaded ?? existing?.custom_uploaded,
      reference_gallery: profile.reference_gallery ?? existing?.reference_gallery ?? [],
      assets: profile.assets ?? existing?.assets ?? [],
      updatedAt: new Date().toISOString(),
    };
    if (
      merged.canonical_image_url &&
      (!merged.reference_gallery || !merged.reference_gallery.includes(merged.canonical_image_url))
    ) {
      merged.reference_gallery = [
        merged.canonical_image_url,
        ...(merged.reference_gallery || []),
      ].slice(0, 48);
    }
    const filePath = path.join(dir, `${merged.character_id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(merged, null, 2), 'utf-8');
    return merged;
  }

  static deleteCharacter(channelId: string, characterId: string): boolean {
    const filePath = path.join(this.getChannelCharactersDir(channelId), `${characterId}.json`);
    if (!fs.existsSync(filePath)) return false;
    fs.unlinkSync(filePath);
    return true;
  }

  /**
   * Detecta y categoriza el entorno o locación a partir del prompt visual
   */
  static detectPlace(prompt: string): string | undefined {
    if (!prompt) return undefined;
    const lower = prompt.toLowerCase();
    const places = [
      { name: 'Headquarters / Sede Central', regex: /\b(headquarters|hq|corporate campus|main office|corporate building)\b/i },
      { name: 'Oficina Corporativa / Boardroom', regex: /\b(boardroom|executive office|corporate office|meeting room|conference room)\b/i },
      { name: 'Sala de Servidores / Datacenter', regex: /\b(server room|data center|datacenter|server rack|supercomputer)\b/i },
      { name: 'Oficina de Desarrollo / Open Space', regex: /\b(tech office|workspace|open office|cubicle|modern studio|laptop screen)\b/i },
      { name: 'Conferencia / Escenario de Prensa', regex: /\b(stage|conference|press conference|keynote|auditorium|speech)\b/i },
      { name: 'Tribunal / Audiencia Legal', regex: /\b(courtroom|courthouse|trial|judge bench|legal hearing|lawsuit)\b/i },
      { name: 'New York City / Calle Urbana', regex: /\b(new york|nyc|manhattan|times square|urban street|city skyline|street corner)\b/i },
      { name: 'Silicon Valley / San Francisco', regex: /\b(silicon valley|san francisco|bay area|palo alto)\b/i },
      { name: 'Café / Restaurante', regex: /\b(coffee shop|cafe|cafeteria|restaurant|diner)\b/i },
      { name: 'Apartamento / Hogar', regex: /\b(apartment|living room|home office|bedroom|garage)\b/i },
      { name: 'Antigua Ciudad / Entorno Histórico', regex: /\b(ancient city|ruins|temple|palace|historical village|earthenware)\b/i },
    ];

    for (const p of places) {
      if (p.regex.test(lower)) return p.name;
    }
    return undefined;
  }

  /**
   * Extrae etiquetas clave semánticas a partir del prompt y entidad
   */
  static extractTags(prompt: string, characterName?: string, company?: string): string[] {
    const tags = new Set<string>();
    if (company) tags.add(company.toLowerCase());
    if (characterName) {
      characterName.toLowerCase().split(/\s+/).forEach((w) => {
        if (w.length > 2) tags.add(w);
      });
    }

    const stopWords = new Set([
      'a', 'an', 'the', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by',
      'from', 'as', 'into', 'like', 'through', 'after', 'over', 'between', 'out', 'against',
      'during', 'without', 'before', 'under', 'around', 'among', 'shot', 'wide', 'close-up',
      'view', 'cinematic', '3d', 'render', 'style', 'lighting', 'visual', 'detailed', 'high',
      'filled', 'working', 'young', 'employees', 'background', 'corner'
    ]);

    const words = prompt
      .toLowerCase()
      .replace(/[^a-z0-9áéíóúüñ\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopWords.has(w));

    words.slice(0, 10).forEach((w) => tags.add(w));
    return Array.from(tags).slice(0, 8);
  }

  /**
   * Guarda de forma permanente cualquier imagen creada en el proyecto
   * dentro de la biblioteca de activos del personaje con metadatos completos
   * para su futura reutilización inteligente (0 costo de API).
   */
  static addImageToCharacterGallery(
    channelId: string,
    characterId: string,
    imagePublicUrl: string,
    metadata?: {
      prompt?: string;
      description?: string;
      placeOrEnvironment?: string;
      companyOrSubject?: string;
      shotType?: ShotType;
      tags?: string[];
    }
  ): CharacterProfile | null {
    const character = this.getCharacter(channelId, characterId);
    if (!character) return null;

    let permanentUrl = imagePublicUrl;
    try {
      if (imagePublicUrl.startsWith('/storage/')) {
        const storageSubPath = imagePublicUrl.replace('/storage/', '');
        const sourcePath = path.resolve(__dirname, '../../storage/projects', storageSubPath);
        if (fs.existsSync(sourcePath)) {
          const assetsDir = this.getChannelCharacterAssetsDir(channelId);
          const ext = path.extname(sourcePath) || '.jpg';
          const filename = `${characterId}_frame_${Date.now()}_${Math.floor(Math.random() * 1000)}${ext}`;
          const destPath = path.join(assetsDir, filename);
          fs.copyFileSync(sourcePath, destPath);
          permanentUrl = `/channel-assets/${channelId}/characters/assets/${filename}`;
        }
      }
    } catch (e) {
      console.warn('[Character Gallery] Warning copying image to character assets:', e);
    }

    const currentGallery = character.reference_gallery || [];
    const currentAssets: VisualAssetMetadata[] = character.assets || [];

    const place = metadata?.placeOrEnvironment || (metadata?.prompt ? this.detectPlace(metadata.prompt) : undefined);
    const tags = metadata?.tags || (metadata?.prompt ? this.extractTags(metadata.prompt, character.name, metadata.companyOrSubject) : []);

    const existingAssetIndex = currentAssets.findIndex((a) => a.url === permanentUrl || a.url === imagePublicUrl);
    if (existingAssetIndex === -1) {
      const newAsset: VisualAssetMetadata = {
        id: `asset_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        url: permanentUrl,
        prompt: metadata?.prompt || '',
        description: metadata?.description,
        characterId: character.character_id,
        characterName: character.name,
        placeOrEnvironment: place,
        companyOrSubject: metadata?.companyOrSubject,
        shotType: metadata?.shotType,
        tags,
        createdAt: new Date().toISOString(),
      };
      character.assets = [newAsset, ...currentAssets].slice(0, 100);
    } else if (metadata?.prompt && !currentAssets[existingAssetIndex].prompt) {
      currentAssets[existingAssetIndex].prompt = metadata.prompt;
      currentAssets[existingAssetIndex].description = metadata.description || currentAssets[existingAssetIndex].description;
      currentAssets[existingAssetIndex].placeOrEnvironment = place || currentAssets[existingAssetIndex].placeOrEnvironment;
      currentAssets[existingAssetIndex].shotType = metadata.shotType || currentAssets[existingAssetIndex].shotType;
      currentAssets[existingAssetIndex].tags = tags.length ? tags : currentAssets[existingAssetIndex].tags;
      character.assets = currentAssets;
    }

    if (!currentGallery.includes(permanentUrl)) {
      character.reference_gallery = [permanentUrl, ...currentGallery].slice(0, 48);
    }

    character.updatedAt = new Date().toISOString();
    if (!character.canonical_image_url) {
      character.canonical_image_url = permanentUrl;
    }
    return this.saveCharacter(channelId, character);
  }

  /**
   * Busca en la biblioteca de activos un elemento que coincida con el lugar,
   * empresa o contexto visual de la escena para reutilizarlo y ahorrar costos de API.
   */
  static findMatchingAsset(
    channelId: string,
    characterId: string | undefined,
    scene: { visual_prompt: string; chapter?: string; shot_type?: ShotType },
    companyOrSubject?: string
  ): VisualAssetMetadata | null {
    const characters = this.getCharacters(channelId);
    if (!characters.length) return null;

    let allAssets: VisualAssetMetadata[] = [];
    const targetChar = characterId ? characters.find((c) => c.character_id === characterId) : characters[0];
    if (targetChar?.assets?.length) {
      allAssets.push(...targetChar.assets);
    }
    for (const char of characters) {
      if (char.character_id !== targetChar?.character_id && char.assets?.length) {
        allAssets.push(...char.assets);
      }
    }

    if (!allAssets.length) return null;

    const scenePromptLower = scene.visual_prompt.toLowerCase();
    const scenePlace = this.detectPlace(scene.visual_prompt);
    const sceneWords = new Set(
      scenePromptLower
        .replace(/[^a-z0-9áéíóúüñ\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 3)
    );

    let bestMatch: VisualAssetMetadata | null = null;
    let highestScore = 0;

    for (const asset of allAssets) {
      let score = 0;

      // 1. Coincidencia de Lugar / Entorno (+35)
      if (scenePlace && asset.placeOrEnvironment) {
        if (scenePlace === asset.placeOrEnvironment) {
          score += 35;
        }
      }

      // 2. Coincidencia de Empresa / Sujeto (+25)
      if (companyOrSubject && asset.companyOrSubject) {
        const compLower = companyOrSubject.toLowerCase();
        if (
          compLower.includes(asset.companyOrSubject.toLowerCase()) ||
          asset.companyOrSubject.toLowerCase().includes(compLower)
        ) {
          score += 25;
        }
      }

      // 3. Coincidencia de Tipo de Plano (+10)
      if (scene.shot_type && asset.shotType && scene.shot_type === asset.shotType) {
        score += 10;
      }

      // 4. Coincidencia de palabras clave y tokens (+5 por token, máx 30)
      let tokenOverlap = 0;
      const assetKeywords = new Set([
        ...(asset.tags || []),
        ...asset.prompt
          .toLowerCase()
          .replace(/[^a-z0-9áéíóúüñ\s]/g, ' ')
          .split(/\s+/)
          .filter((w) => w.length > 3),
      ]);

      for (const word of sceneWords) {
        if (assetKeywords.has(word)) {
          tokenOverlap++;
        }
      }
      score += Math.min(tokenOverlap * 5, 30);

      if (score > highestScore) {
        highestScore = score;
        bestMatch = asset;
      }
    }

    // Si el score supera el umbral de confianza (50)
    if (highestScore >= 50 && bestMatch) {
      console.log(
        `[Smart Asset Reuse] ✓ Coincidencia encontrada (Score ${highestScore}) para: "${scene.chapter || scene.visual_prompt.slice(0, 35)}..." -> Asset: "${bestMatch.placeOrEnvironment || bestMatch.description || bestMatch.url}"`
      );
      return bestMatch;
    }

    return null;
  }

  static saveUploadedCharacterImage(
    channelId: string,
    characterId: string,
    base64Data: string
  ): CharacterProfile | null {
    const character = this.getCharacter(channelId, characterId);
    if (!character) return null;

    const assetsDir = this.getChannelCharacterAssetsDir(channelId);
    let ext = 'png';
    let cleanBase64 = base64Data;

    if (base64Data.startsWith('data:image/')) {
      const match = base64Data.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (match) {
        ext = match[1] === 'jpeg' ? 'jpg' : match[1];
        cleanBase64 = match[2];
      } else {
        cleanBase64 = base64Data.split(',')[1] || base64Data;
      }
    }

    const filename = `${characterId}_custom_${Date.now()}.${ext}`;
    const filePath = path.join(assetsDir, filename);
    fs.writeFileSync(filePath, Buffer.from(cleanBase64, 'base64'));

    const publicUrl = `/channel-assets/${channelId}/characters/assets/${filename}`;
    const gallery = [
      publicUrl,
      ...(character.reference_gallery || []).filter((u) => u !== publicUrl),
    ].slice(0, 48);

    const updated: CharacterProfile = {
      ...character,
      canonical_image_url: publicUrl,
      custom_uploaded: true,
      reference_gallery: gallery,
      updatedAt: new Date().toISOString(),
    };

    return this.saveCharacter(channelId, updated);
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
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 30) || `char_${Date.now()}`;

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
      reference_gallery: [],
      updatedAt: new Date().toISOString(),
    };

    // Save to channel library for future reuse
    const saved = this.saveCharacter(channelId, newProfile);
    console.log(`[Character Library] + Nuevo personaje registrado en biblioteca: "${saved.name}" (${saved.character_id})`);

    return saved;
  }
}
