import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  CharacterProfile,
  ChannelCharacterLore,
  VisualAssetMetadata,
  ShotType,
  ResearchDossier,
  SceneItem,
} from '../../src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CHANNELS_DIR = path.resolve(__dirname, '../../channels');
const STORAGE_DIR = path.resolve(__dirname, '../../storage/projects');

export interface ParsedPersonEntity {
  name: string;
  company?: string;
  isKnownRealPerson: boolean;
  roleHint?: string;
  narrativeRole?: 'protagonist' | 'antagonist' | 'secondary';
}

export class CharacterService {
  private static migrationDoneForChannel = new Set<string>();

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

  static slugifyId(text: string): string {
    return (
      text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 32) || `char_${Date.now()}`
    );
  }

  /**
   * Semillas del Elenco Recurrente con Lore del Canal (Personajes Secundarios / Dobles comodín)
   */
  private static getDefaultChannelLoreCast(channelId: string): CharacterProfile[] {
    if (channelId === 'ancient_lives') {
      return [
        {
          character_id: 'juanito_aprendiz_antiguo',
          channel_id: channelId,
          name: 'Juanito (El Joven Aprendiz)',
          role: 'Personaje Recurrente del Canal • Aprendiz de Oficios y Mensajero Ágil',
          real_person: false,
          character_category: 'channel_lore_cast',
          known_face: false,
          company_or_affiliation: 'Elenco con Lore del Canal',
          channel_lore: {
            age: '15 años',
            personality_traits: ['Alegre', 'Atlético y veloz', 'Curioso', 'Competitivo'],
            peculiarities: [
              'Siempre lleva una cinta tejida azul atada en la frente al estilo corredor antiguo',
              'Carga una pequeña pelota de cuero rellena de grano con la que hace malabares',
              'Sonríe con entusiasmo incluso en los trabajos más agotadores',
            ],
            channel_backstory:
              'Juanito es un joven de 15 años con energía inagotable y amor por las carreras y el deporte físico. En cada civilización antigua del canal aparece como el aprendiz joven, mensajero o ayudante sin rostro histórico conocido, manteniendo siempre su cinta azul y su espíritu deportivo.',
            reusable_archetypes: [
              'joven aprendiz',
              'mensajero',
              'ayudante',
              'ciudadano común',
              'adolescente',
              'personaje secundario sin rostro',
            ],
            appearances: [],
          },
          anchor_prompt:
            'Stylized 3D cinematic animated character of Juanito, a cheerful 15-year-old athletic boy, warm expressive brown eyes, wide optimistic smile, wearing a distinctive woven blue headband across his forehead, simple historical tunic with rolled sleeves for running, holding a small stitched leather ball, Pixar and Arcane inspired 3D documentary aesthetic, single individual character render',
          signature_props: [
            'woven blue runner headband',
            'small stitched leather ball',
            'messenger satchel',
          ],
          reference_gallery: [],
          assets: [],
        },
      ];
    }

    // Default: tech_scandals y canales modernos
    return [
      {
        character_id: 'juanito',
        channel_id: channelId,
        name: 'Juanito',
        role: 'Personaje Recurrente del Canal • Joven Entusiasta del Deporte, Beta Tester y Creador',
        real_person: false,
        character_category: 'channel_lore_cast',
        known_face: false,
        company_or_affiliation: 'Elenco con Lore del Canal',
        channel_lore: {
          age: '15 años',
          personality_traits: [
            'Alegre',
            'Amor por el deporte',
            'Curioso',
            'Optimista',
            'Hiperactivo digital',
          ],
          peculiarities: [
            'Siempre usa una gorra deportiva azul hacia atrás',
            'Viste una chaqueta o sudadera deportiva con el número 10 y auriculares al cuello',
            'Siempre tiene un balón de fútbol o un cronómetro deportivo cerca de su escritorio',
            'Usa analogías deportivas y celebra como si metiera un gol cuando descubre algo nuevo',
          ],
          channel_backstory:
            'Juanito es un chico de 15 años alegre y apasionado por el deporte que vive conectado probando cada nueva plataforma, app viral o tendencia tecnológica. Cuando en una historia aparece un usuario temprano, un creador joven, un testigo cotidiano o un personaje del que no se conoce el rostro, Juanito entra en acción como parte del lore oficial del canal.',
          reusable_archetypes: [
            'usuario joven',
            'creador de contenido',
            'beta tester',
            'estudiante',
            'comunidad de usuarios',
            'testigo cotidiano',
            'personaje sin rostro conocido',
          ],
          appearances: [],
        },
        anchor_prompt:
          'Stylized 3D cinematic animated character of Juanito, a cheerful 15-year-old boy with a passion for sports, warm expressive eyes, bright energetic smile, wearing a signature backwards blue athletic cap, sporty jersey hoodie with number 10, headphones around his neck, Pixar and Arcane inspired visual aesthetic, rich volumetric lighting, single individual 3D documentary render',
        signature_props: [
          'backwards blue sports cap',
          'soccer ball next to laptop',
          'sporty digital chronograph watch',
        ],
        reference_gallery: [],
        assets: [],
      },
      {
        character_id: 'elena_vega_auditora',
        channel_id: channelId,
        name: 'Elena Vega (La Ingeniera Testigo)',
        role: 'Personaje Recurrente del Canal • Desarrolladora Senior / Whistleblower / Analista',
        real_person: false,
        character_category: 'channel_lore_cast',
        known_face: false,
        company_or_affiliation: 'Elenco con Lore del Canal',
        channel_lore: {
          age: '29 años',
          personality_traits: ['Escéptica', 'Brillante', 'Observadora', 'Adicta al café expreso'],
          peculiarities: [
            'Usa gafas de montura fina metálica donde se reflejan gráficas y terminales',
            'Siempre sostiene un termo negro lleno de stickers de ciberseguridad',
            'Lleva una libreta roja de notas forenses donde subraya inconsistencias',
          ],
          channel_backstory:
            'Elena Vega es el rostro recurrente del canal para representar a los ingenieros internos, auditores anónimos, ex-empleados o filtradores (whistleblowers) cuya identidad o fotografía real no es pública.',
          reusable_archetypes: [
            'ingeniero anónimo',
            'whistleblower',
            'empleado interno',
            'auditor financiero',
            'desarrollador testigo',
            'analista secundario',
          ],
          appearances: [],
        },
        anchor_prompt:
          'Stylized 3D cinematic animated character of Elena Vega, a 29-year-old sharp female software engineer and forensic analyst, dark hair tied in a messy bun with a pencil, thin metallic glasses reflecting terminal code, sceptical observant expression, wearing a dark blazer over a tech hoodie, holding a black thermal mug with stickers, Pixar and Arcane inspired 3D documentary aesthetic, single individual render',
        signature_props: [
          'black thermal coffee mug with security stickers',
          'thin metallic glasses',
          'red forensic notebook',
        ],
        reference_gallery: [],
        assets: [],
      },
    ];
  }

  /**
   * Migra archivos antiguos donde había 2 o 3 personajes combinados en un solo JSON
   * y asegura que existan los personajes con Lore del Canal.
   */
  static ensureChannelMigrationAndLore(channelId: string): void {
    if (this.migrationDoneForChannel.has(channelId)) return;
    this.migrationDoneForChannel.add(channelId);

    const dir = this.getChannelCharactersDir(channelId);

    // 1. Migrar "david_karp_tumblr_y_marissa_ma.json" -> "david_karp.json" + "marissa_mayer.json"
    const combinedTumblrPath = path.join(dir, 'david_karp_tumblr_y_marissa_ma.json');
    if (fs.existsSync(combinedTumblrPath)) {
      try {
        const raw = JSON.parse(fs.readFileSync(combinedTumblrPath, 'utf-8')) as CharacterProfile;
        const allAssets = raw.assets || [];

        const karpAssets: VisualAssetMetadata[] = [];
        const mayerAssets: VisualAssetMetadata[] = [];

        for (const asset of allAssets) {
          const pLower = `${asset.prompt} ${asset.description || ''}`.toLowerCase();
          const hasKarp = pLower.includes('karp') || pLower.includes('david');
          const hasMayer = pLower.includes('mayer') || pLower.includes('marissa');

          if (hasKarp && hasMayer) {
            const sharedAsset: VisualAssetMetadata = {
              ...asset,
              characterId: 'david_karp',
              characterName: 'David Karp',
              characterIds: ['david_karp', 'marissa_mayer'],
              characterNames: ['David Karp', 'Marissa Mayer'],
              isGroupShot: true,
            };
            karpAssets.push(sharedAsset);
            mayerAssets.push({
              ...sharedAsset,
              characterId: 'marissa_mayer',
              characterName: 'Marissa Mayer',
            });
          } else if (hasMayer || (asset.companyOrSubject === 'Yahoo' && !hasKarp)) {
            mayerAssets.push({
              ...asset,
              characterId: 'marissa_mayer',
              characterName: 'Marissa Mayer',
              characterIds: ['marissa_mayer'],
              characterNames: ['Marissa Mayer'],
              isGroupShot: false,
            });
          } else {
            karpAssets.push({
              ...asset,
              characterId: 'david_karp',
              characterName: 'David Karp',
              characterIds: ['david_karp'],
              characterNames: ['David Karp'],
              isGroupShot: false,
            });
          }
        }

        const davidKarp: CharacterProfile = {
          character_id: 'david_karp',
          channel_id: channelId,
          name: 'David Karp',
          role: 'Fundador y CEO de Tumblr',
          real_person: true,
          character_category: 'real_person',
          known_face: true,
          company_or_affiliation: 'Tumblr',
          anchor_prompt:
            'Stylized 3D cinematic animated character of David Karp (young founder of Tumblr), 27 years old, tall lean build, tousled dark brown hair, expressive creative eyes, New York indie tech entrepreneur attire with dark minimalist jacket over a simple t-shirt, Pixar and Arcane inspired visual aesthetic, rich volumetric lighting, single individual 3D documentary render',
          signature_props: [
            'minimalist laptop showing Tumblr dashboard',
            'New York loft office window',
            'vintage camera on desk',
          ],
          canonical_image_url: raw.canonical_image_url,
          custom_uploaded: false,
          reference_gallery: karpAssets.map((a) => a.url).slice(0, 24),
          assets: karpAssets,
          updatedAt: new Date().toISOString(),
        };

        const marissaMayer: CharacterProfile = {
          character_id: 'marissa_mayer',
          channel_id: channelId,
          name: 'Marissa Mayer',
          role: 'CEO de Yahoo',
          real_person: true,
          character_category: 'real_person',
          known_face: true,
          company_or_affiliation: 'Yahoo',
          anchor_prompt:
            'Stylized 3D cinematic animated character of Marissa Mayer (CEO of Yahoo), 38-year-old female corporate tech executive, straight blonde hair, sharp piercing blue eyes, calculating analytical expression, tailored designer corporate dress and blazer, Pixar and Arcane inspired visual aesthetic, rich volumetric lighting, single individual 3D documentary render',
          signature_props: [
            'sleek Yahoo corporate boardroom presentation screen',
            'glass executive desk',
            'billion-dollar acquisition contract',
          ],
          canonical_image_url: mayerAssets.find((a) => !a.isGroupShot)?.url,
          custom_uploaded: false,
          reference_gallery: mayerAssets.map((a) => a.url).slice(0, 24),
          assets: mayerAssets,
          updatedAt: new Date().toISOString(),
        };

        this.saveCharacterDirect(channelId, davidKarp);
        this.saveCharacterDirect(channelId, marissaMayer);
        fs.unlinkSync(combinedTumblrPath);
        console.log(
          '[Character Migration] ✓ "david_karp_tumblr_y_marissa_ma" separado en perfiles individuales: david_karp.json y marissa_mayer.json'
        );
      } catch (e) {
        console.warn('[Character Migration] Aviso migrando Tumblr/Yahoo:', e);
      }
    }

    // 2. Migrar "dom_hofmann_rus_yusupov_y_coli.json" -> 3 perfiles individuales
    const combinedVinePath = path.join(dir, 'dom_hofmann_rus_yusupov_y_coli.json');
    if (fs.existsSync(combinedVinePath)) {
      try {
        const domHofmann: CharacterProfile = {
          character_id: 'dom_hofmann',
          channel_id: channelId,
          name: 'Dom Hofmann',
          role: 'Co-fundador de Vine',
          real_person: true,
          character_category: 'real_person',
          known_face: true,
          company_or_affiliation: 'Vine',
          anchor_prompt:
            'Stylized 3D cinematic animated character of Dom Hofmann (Vine co-founder), 26-year-old creative software developer, short messy brown hair, thoughtful intense eyes, wearing a casual dark hoodie and glasses, New York startup studio vibe, Pixar and Arcane inspired 3D documentary render, single individual portrait',
          signature_props: [
            'smartphone recording a 6-second looping video',
            'Vine green logo sticker on laptop',
            'indie NYC coding desk',
          ],
          reference_gallery: [],
          assets: [],
          updatedAt: new Date().toISOString(),
        };

        const rusYusupov: CharacterProfile = {
          character_id: 'rus_yusupov',
          channel_id: channelId,
          name: 'Rus Yusupov',
          role: 'Co-fundador y Director de Diseño de Vine',
          real_person: true,
          character_category: 'real_person',
          known_face: true,
          company_or_affiliation: 'Vine',
          anchor_prompt:
            'Stylized 3D cinematic animated character of Rus Yusupov (Vine co-founder and design lead), 28-year-old digital product designer, dark wavy hair, expressive dark eyes, wearing a modern street-style jacket over a graphic tee, creative NYC studio lighting, Pixar and Arcane inspired 3D documentary render, single individual portrait',
          signature_props: [
            'UI wireframe sketches for 6-second video player',
            'sleek design monitor',
            'minimalist smartphone',
          ],
          reference_gallery: [],
          assets: [],
          updatedAt: new Date().toISOString(),
        };

        const colinKroll: CharacterProfile = {
          character_id: 'colin_kroll',
          channel_id: channelId,
          name: 'Colin Kroll',
          role: 'Co-fundador y CTO de Vine',
          real_person: true,
          character_category: 'real_person',
          known_face: true,
          company_or_affiliation: 'Vine',
          anchor_prompt:
            'Stylized 3D cinematic animated character of Colin Kroll (Vine co-founder and engineering lead), 28-year-old backend systems engineer, short light-brown hair, focused intense gaze, wearing a casual plaid button-down shirt over a t-shirt, server monitor reflections, Pixar and Arcane inspired 3D documentary render, single individual portrait',
          signature_props: [
            'high-traffic video server monitor',
            'laptop with backend metrics',
            'headphones on desk',
          ],
          reference_gallery: [],
          assets: [],
          updatedAt: new Date().toISOString(),
        };

        this.saveCharacterDirect(channelId, domHofmann);
        this.saveCharacterDirect(channelId, rusYusupov);
        this.saveCharacterDirect(channelId, colinKroll);
        fs.unlinkSync(combinedVinePath);
        console.log(
          '[Character Migration] ✓ "dom_hofmann_rus_yusupov_y_coli" separado en 3 perfiles independientes: dom_hofmann, rus_yusupov y colin_kroll'
        );
      } catch (e) {
        console.warn('[Character Migration] Aviso migrando Vine:', e);
      }
    }

    // 3. Limpiar "kevin_rose___digg.json" -> "kevin_rose.json"
    const oldKevinPath = path.join(dir, 'kevin_rose___digg.json');
    if (fs.existsSync(oldKevinPath)) {
      try {
        const raw = JSON.parse(fs.readFileSync(oldKevinPath, 'utf-8')) as CharacterProfile;
        const kevinClean: CharacterProfile = {
          ...raw,
          character_id: 'kevin_rose',
          channel_id: channelId,
          name: 'Kevin Rose',
          role: 'Fundador de Digg',
          real_person: true,
          character_category: 'real_person',
          known_face: true,
          company_or_affiliation: 'Digg',
          updatedAt: new Date().toISOString(),
        };
        this.saveCharacterDirect(channelId, kevinClean);
        fs.unlinkSync(oldKevinPath);
      } catch (e) {
        console.warn('[Character Migration] Aviso normalizando kevin_rose:', e);
      }
    }

    // 3b. Eliminar archivo huérfano de empresa ("twitter.json") que no corresponde a una persona
    const orphanTwitterPath = path.join(dir, 'twitter.json');
    if (fs.existsSync(orphanTwitterPath)) {
      try {
        fs.unlinkSync(orphanTwitterPath);
      } catch {
        // ignore
      }
    }

    // 4. Asegurar que los personajes existentes tengan character_category y known_face definidos
    const currentFiles = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
    for (const file of currentFiles) {
      try {
        const fullPath = path.join(dir, file);
        const char = JSON.parse(fs.readFileSync(fullPath, 'utf-8')) as CharacterProfile;
        let modified = false;
        if (!char.character_category) {
          char.character_category = char.real_person === false ? 'channel_lore_cast' : 'real_person';
          modified = true;
        }
        if (char.known_face === undefined) {
          char.known_face = char.real_person !== false;
          modified = true;
        }
        if (char.character_id === 'campesino_egipcio' && !char.channel_lore) {
          char.character_category = 'channel_lore_cast';
          char.known_face = false;
          char.channel_lore = {
            age: '32 años',
            personality_traits: ['Resiliente', 'Ingenioso', 'protector de su familia', 'Observador'],
            peculiarities: [
              'Ojos delineados con kohl oscuro para protegerse del sol abrasador',
              'Lleva siempre una vasija de barro poroso que enfría el agua por evaporación',
              'Tiene una cicatriz de trabajo en el antebrazo derecho',
            ],
            channel_backstory:
              'Nekht es el obrero y artesano recurrente de nuestro canal de historia antigua. Representa al trabajador anónimo que construyó imperios bajo condiciones extremas.',
            reusable_archetypes: [
              'campesino antiguo',
              'obrero constructor',
              'artesano',
              'padre de familia antiguo',
            ],
            appearances: [],
          };
          modified = true;
        }
        // Limpiar placeholders .svg de escenas infiltrados por error en galerías de personajes
        if (char.assets && char.assets.some((a) => a.url?.toLowerCase().endsWith('.svg'))) {
          char.assets = char.assets.filter((a) => !a.url?.toLowerCase().endsWith('.svg'));
          modified = true;
        }
        if (
          char.reference_gallery &&
          char.reference_gallery.some((u) => u.toLowerCase().includes('_frame_') && u.toLowerCase().endsWith('.svg'))
        ) {
          char.reference_gallery = char.reference_gallery.filter(
            (u) => !(u.toLowerCase().includes('_frame_') && u.toLowerCase().endsWith('.svg'))
          );
          modified = true;
        }
        if (
          char.canonical_image_url &&
          char.canonical_image_url.toLowerCase().includes('_frame_') &&
          char.canonical_image_url.toLowerCase().endsWith('.svg')
        ) {
          const validSoloAsset = (char.assets || []).find(
            (a) => !a.isGroupShot && a.url && !a.url.toLowerCase().endsWith('.svg')
          );
          const validGalleryImg = (char.reference_gallery || []).find(
            (u) => !u.toLowerCase().endsWith('.svg')
          );
          char.canonical_image_url = validSoloAsset?.url || validGalleryImg || undefined;
          modified = true;
        }
        if (modified) {
          fs.writeFileSync(fullPath, JSON.stringify(char, null, 2), 'utf-8');
        }
      } catch {
        // ignore
      }
    }

    // 5. Sembrar el Elenco Recurrente con Lore del Canal (ej. Juanito, Elena Vega) si no existen
    const defaultLoreCast = this.getDefaultChannelLoreCast(channelId);
    for (const loreChar of defaultLoreCast) {
      const targetPath = path.join(dir, `${loreChar.character_id}.json`);
      if (!fs.existsSync(targetPath)) {
        this.saveCharacterDirect(channelId, {
          ...loreChar,
          updatedAt: new Date().toISOString(),
        });
        console.log(
          `[Channel Lore Cast] ★ Personaje con Lore del Canal sembrado: "${loreChar.name}" (${loreChar.character_id})`
        );
      }
    }
  }

  private static saveCharacterDirect(channelId: string, profile: CharacterProfile): CharacterProfile {
    const dir = this.getChannelCharactersDir(channelId);
    const filePath = path.join(dir, `${profile.character_id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(profile, null, 2), 'utf-8');
    return profile;
  }

  static getCharacters(channelId: string): CharacterProfile[] {
    this.ensureChannelMigrationAndLore(channelId);
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
    this.ensureChannelMigrationAndLore(channelId);
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
    this.ensureChannelMigrationAndLore(channelId);
    const dir = this.getChannelCharactersDir(channelId);
    const cleanId = profile.character_id ? this.slugifyId(profile.character_id) : this.slugifyId(profile.name);
    const existing = this.getCharacter(channelId, cleanId);

    const isLoreCast =
      profile.character_category === 'channel_lore_cast' ||
      profile.real_person === false ||
      Boolean(profile.channel_lore);

    const merged: CharacterProfile = {
      ...existing,
      ...profile,
      character_id: cleanId,
      channel_id: channelId,
      real_person: !isLoreCast,
      character_category: isLoreCast ? 'channel_lore_cast' : 'real_person',
      known_face: profile.known_face ?? (isLoreCast ? false : true),
      channel_lore: profile.channel_lore ?? existing?.channel_lore,
      canonical_image_url: profile.canonical_image_url ?? existing?.canonical_image_url,
      real_reference_image_url: profile.real_reference_image_url ?? existing?.real_reference_image_url,
      custom_style_prompt: profile.custom_style_prompt ?? existing?.custom_style_prompt,
      preferred_style_preset: profile.preferred_style_preset ?? existing?.preferred_style_preset,
      portrait_approved: profile.portrait_approved ?? existing?.portrait_approved,
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
   * Detecta si un nombre corresponde a un rol genérico / personaje sin rostro conocido
   * o a una entidad corporativa abstracta en lugar de un individuo con nombre y apellido.
   */
  static isUnnamedOrUnknownFaceEntity(name: string): boolean {
    const clean = name.trim().toLowerCase();
    if (!clean) return true;
    const genericRolePatterns = [
      /\b(campesino|obrero|ciudadano|inquilino|buzo|cirujano|amauta|soldado|esclavo|mercader|aprendiz)\b/i,
      /\b(usuario|usuarios|comunidad|empleado|empleados|ingeniero|ingenieros|programador|hacker|inversor|inversores|cliente|clientes|testigo|anónimo|desconocido|adolescente|niño|joven|creador|creadores)\b/i,
      /\b(junta directiva|wall street|silicon valley|el mercado|la competencia)\b/i,
    ];
    if (genericRolePatterns.some((rx) => rx.test(clean))) {
      return true;
    }
    return false;
  }

  /**
   * Divide una cadena que puede contener 1, 2 o más personajes (ej: "David Karp (Tumblr) y Marissa Mayer (Yahoo)"
   * o "Dom Hofmann, Rus Yusupov y Colin Kroll / Vine (Twitter)") en entidades individuales independientes.
   */
  static splitCharacterEntities(rawInput: string): ParsedPersonEntity[] {
    if (!rawInput || !rawInput.trim()) return [];

    // 1. Si hay una barra "/" que separa a las personas de la empresa general (ej: "Dom Hofmann, Rus Yusupov y Colin Kroll / Vine (Twitter)")
    let peoplePart = rawInput.trim();
    let globalCompany = '';
    if (peoplePart.includes('/')) {
      const slashParts = peoplePart.split('/').map((s) => s.trim()).filter(Boolean);
      peoplePart = slashParts[0] || '';
      globalCompany = slashParts.slice(1).join(' / ');
    }

    // 2. Separar por conectores de múltiples personas: ",", " y ", " and ", " & ", " vs ", " vs. ", " contra "
    const rawTokens = peoplePart
      .split(/\s*(?:,|\by\b|\band\b|&|\bvs\.?\b|\bcontra\b|;)\s*/i)
      .map((t) => t.trim())
      .filter((t) => t.length > 1);

    const results: ParsedPersonEntity[] = [];
    const seenNames = new Set<string>();

    for (let idx = 0; idx < rawTokens.length; idx++) {
      let token = rawTokens[idx];
      let localCompany = globalCompany;

      // Extraer empresa entre paréntesis si existe, ej: "David Karp (Tumblr)"
      const parenMatch = token.match(/\(([^)]+)\)/);
      if (parenMatch) {
        localCompany = parenMatch[1].trim();
        token = token.replace(/\([^)]+\)/g, '').trim();
      }

      // Limpiar caracteres residuales
      const cleanName = token.replace(/^[-–—:]+|[-–—:]+$/g, '').trim();
      if (!cleanName || cleanName.length < 2) continue;

      const normKey = cleanName.toLowerCase();
      if (seenNames.has(normKey)) continue;
      seenNames.add(normKey);

      const isUnnamed = this.isUnnamedOrUnknownFaceEntity(cleanName);
      results.push({
        name: cleanName,
        company: localCompany || undefined,
        isKnownRealPerson: !isUnnamed,
        narrativeRole: idx === 0 ? 'protagonist' : idx === 1 ? 'antagonist' : 'secondary',
      });
    }

    return results;
  }

  /**
   * Busca o crea un personaje del "Elenco con Lore del Canal" (secundario / doble recurrente)
   * cuando la historia tiene un personaje del que no se conoce su rostro o necesita un secundario consistente.
   */
  static findOrCreateChannelLoreCharacter(
    channelId: string,
    roleOrArchetypeHint: string,
    storyTitle: string,
    projectId?: string
  ): CharacterProfile {
    const allChars = this.getCharacters(channelId);
    const loreCast = allChars.filter(
      (c) => c.character_category === 'channel_lore_cast' || c.real_person === false
    );

    const hintLower = (roleOrArchetypeHint || '').toLowerCase();

    // 1. Buscar coincidencia semántica con los arquetipos reutilizables de nuestro elenco con lore (ej: Juanito o Elena)
    let matchedLoreChar: CharacterProfile | undefined;

    if (
      /joven|niño|adolescente|usuario|creador|tiktok|vine|tumblr|juego|deporte|estudiante|beta|comunidad|fan/i.test(
        hintLower
      )
    ) {
      matchedLoreChar = loreCast.find((c) => c.character_id.includes('juanito'));
    } else if (
      /ingenier|auditor|emplead|testigo|whistleblower|programador|desarrollador|analista|financier/i.test(
        hintLower
      )
    ) {
      matchedLoreChar = loreCast.find((c) => c.character_id.includes('elena'));
    }

    if (!matchedLoreChar) {
      for (const candidate of loreCast) {
        const archetypes = candidate.channel_lore?.reusable_archetypes || [];
        if (
          archetypes.some(
            (arch) =>
              hintLower.includes(arch.toLowerCase()) || arch.toLowerCase().includes(hintLower)
          )
        ) {
          matchedLoreChar = candidate;
          break;
        }
      }
    }

    // Si no hubo match específico pero hay elenco con lore en el canal, usar el primero (ej. Juanito)
    if (!matchedLoreChar && loreCast.length > 0) {
      matchedLoreChar = loreCast[0];
    }

    if (matchedLoreChar) {
      // Registrar aparición en su historial del canal si hay proyecto
      if (projectId && matchedLoreChar.channel_lore) {
        const appearances = matchedLoreChar.channel_lore.appearances || [];
        if (!appearances.some((a) => a.project_id === projectId)) {
          matchedLoreChar.channel_lore.appearances = [
            {
              project_id: projectId,
              title: storyTitle,
              role_in_story: roleOrArchetypeHint || 'Personaje Secundario / Doble del Canal',
            },
            ...appearances,
          ].slice(0, 30);
          matchedLoreChar = this.saveCharacter(channelId, matchedLoreChar);
        }
      }
      return matchedLoreChar;
    }

    // Si no existía ninguno, crear un nuevo personaje con Lore del Canal
    const cleanId = this.slugifyId(roleOrArchetypeHint || 'juanito');
    const newLoreChar: CharacterProfile = {
      character_id: cleanId,
      channel_id: channelId,
      name: roleOrArchetypeHint || 'Juanito',
      role: `Personaje Recurrente del Canal (${roleOrArchetypeHint || 'Secundario'})`,
      real_person: false,
      character_category: 'channel_lore_cast',
      known_face: false,
      company_or_affiliation: 'Elenco con Lore del Canal',
      channel_lore: {
        age: '15 años',
        personality_traits: ['Alegre', 'Amante del deporte', 'Curioso'],
        peculiarities: [
          'Siempre lleva una gorra deportiva azul hacia atrás',
          'Tiene un balón deportivo cerca y usa un reloj con cronómetro',
        ],
        channel_backstory: `Personaje recurrente del canal creado originalmente en "${storyTitle}" para interpretar roles donde no se conoce el rostro real, manteniendo sus peculiaridades en cada video.`,
        reusable_archetypes: [roleOrArchetypeHint || 'secundario', 'usuario', 'testigo'],
        appearances: projectId
          ? [{ project_id: projectId, title: storyTitle, role_in_story: roleOrArchetypeHint }]
          : [],
      },
      anchor_prompt: `Stylized 3D cinematic animated character of ${
        roleOrArchetypeHint || 'Juanito'
      }, 15-year-old cheerful athletic boy with backwards blue sports cap, expressive eyes, Pixar and Arcane inspired 3D documentary render, single individual character`,
      signature_props: ['backwards blue sports cap', 'soccer ball', 'sporty wristwatch'],
      reference_gallery: [],
      assets: [],
      updatedAt: new Date().toISOString(),
    };

    return this.saveCharacter(channelId, newLoreChar);
  }

  /**
   * Busca o crea un ÚNICO personaje individual en la biblioteca.
   * Si se pasa una cadena con varios nombres por error, toma el primero (para mantener compatibilidad),
   * pero para elenco completo se debe usar `resolveCastForStory`.
   */
  static findOrDraftCharacter(
    channelId: string,
    characterNameOrCompany: string,
    storyTitle: string,
    conflict?: string,
    options?: {
      company?: string;
      roleHint?: string;
      knownFace?: boolean;
      characterCategory?: 'real_person' | 'channel_lore_cast';
      loreData?: Partial<ChannelCharacterLore>;
    }
  ): CharacterProfile {
    const existing = this.getCharacters(channelId);

    // Si la cadena viene combinada (ej. "David Karp y Marissa Mayer"), extraemos la primera entidad individual
    const splitEntities = this.splitCharacterEntities(characterNameOrCompany);
    const primaryEntity = splitEntities[0] || {
      name: (characterNameOrCompany || storyTitle || 'Protagonista').trim(),
      company: options?.company,
      isKnownRealPerson: options?.knownFace ?? true,
    };

    const cleanPersonName = primaryEntity.name;
    const companyName = options?.company || primaryEntity.company;
    const isLoreCast =
      options?.characterCategory === 'channel_lore_cast' ||
      options?.knownFace === false ||
      !primaryEntity.isKnownRealPerson;

    // Si es un personaje sin rostro conocido y no tiene nombre propio específico, usar el sistema de Lore del Canal
    if (isLoreCast && this.isUnnamedOrUnknownFaceEntity(cleanPersonName) && !options?.loreData) {
      return this.findOrCreateChannelLoreCharacter(channelId, cleanPersonName, storyTitle);
    }

    const lowerName = cleanPersonName.toLowerCase();
    const targetSlug = this.slugifyId(cleanPersonName);

    // 1. Buscar coincidencia exacta o fuerte en la biblioteca individual
    for (const char of existing) {
      const charLower = char.name.toLowerCase();
      const idLower = char.character_id.toLowerCase();
      if (
        idLower === targetSlug ||
        charLower === lowerName ||
        (lowerName.length > 4 && (charLower.includes(lowerName) || lowerName.includes(charLower)))
      ) {
        console.log(
          `[Character Library] ✓ Personaje individual encontrado en biblioteca: "${char.name}" (${char.character_id})`
        );
        return char;
      }
    }

    // 2. Redactar nueva ficha individual 3D (estrictamente 1 sola persona)
    const isTech = channelId.includes('tech');
    let anchorPrompt = '';
    let props: string[] = [];

    const peculiaritiesText = options?.loreData?.peculiarities?.length
      ? ` Signature recurring character quirks: ${options.loreData.peculiarities.join(', ')}.`
      : '';

    if (isLoreCast) {
      anchorPrompt = `Stylized 3D cinematic animated character of ${cleanPersonName} (${
        options?.loreData?.age || 'recurring channel character'
      }), ${
        options?.loreData?.personality_traits?.join(', ') || 'expressive and memorable personality'
      }.${peculiaritiesText} Pixar and Arcane inspired visual aesthetic, rich volumetric lighting, SINGLE INDIVIDUAL 3D character render (only 1 person in frame)`;
      props = options?.loreData?.peculiarities?.slice(0, 3) || [
        'signature personal accessory',
        'characteristic outfit detail',
      ];
    } else if (isTech) {
      anchorPrompt = `Stylized 3D cinematic animated character of ${cleanPersonName}${
        companyName ? ` (${companyName})` : ''
      }, single individual person only, 30-42 years old, distinctive realistic facial structure, expressive eyes, modern tailored tech executive or founder attire, Pixar and Arcane inspired visual aesthetic, rich volumetric lighting, high-end 3D documentary render`;
      props = [
        companyName ? `${companyName} branded office environment` : 'modern minimalist tech desk',
        'sleek smartphone with financial charts',
        'glass corporate office window',
      ];
    } else {
      anchorPrompt = `Stylized 3D cinematic animated historical character of ${cleanPersonName}, single individual person only, sun-bronzed textured skin, authentic historical garments of the era, determined expressive eyes, Arcane and Pixar inspired 3D render, high aesthetic realism`;
      props = [
        'earthenware water jar',
        'authentic historical tool of trade',
        'sun-drenched historical setting',
      ];
    }

    const newProfile: CharacterProfile = {
      character_id: targetSlug,
      channel_id: channelId,
      name: cleanPersonName,
      role:
        options?.roleHint ||
        (companyName
          ? `Figura clave en ${companyName} (${storyTitle.slice(0, 45)})`
          : `Figura central en ${storyTitle.slice(0, 50)}`),
      real_person: !isLoreCast,
      character_category: isLoreCast ? 'channel_lore_cast' : 'real_person',
      known_face: !isLoreCast,
      company_or_affiliation:
        companyName || (isLoreCast ? 'Elenco con Lore del Canal' : undefined),
      channel_lore: isLoreCast
        ? {
            age: options?.loreData?.age || '20 años',
            personality_traits: options?.loreData?.personality_traits || [
              'Carismático',
              'Expresivo',
            ],
            peculiarities: options?.loreData?.peculiarities || [
              'Detalle visual propio recurrente en todos los videos',
            ],
            channel_backstory:
              options?.loreData?.channel_backstory ||
              `Personaje del universo del canal creado para "${storyTitle}".`,
            reusable_archetypes: options?.loreData?.reusable_archetypes || [
              'personaje secundario',
              'doble recurrente',
            ],
            appearances: [],
          }
        : undefined,
      anchor_prompt: anchorPrompt,
      signature_props: props,
      reference_gallery: [],
      assets: [],
      updatedAt: new Date().toISOString(),
    };

    const saved = this.saveCharacter(channelId, newProfile);
    console.log(
      `[Character Library] + Nuevo personaje individual registrado: "${saved.name}" (${saved.character_id}) [${saved.character_category}]`
    );
    return saved;
  }

  /**
   * Resuelve el ELENCO COMPLETO de una historia (múltiples personajes individuales + personajes de Lore del Canal
   * para roles sin rostro conocido).
   */
  static resolveCastForStory(
    channelId: string,
    rawCharacterCompany: string,
    storyTitle: string,
    conflict?: string,
    dossier?: ResearchDossier,
    projectId?: string
  ): CharacterProfile[] {
    const castMap = new Map<string, CharacterProfile>();

    const addChar = (c: CharacterProfile) => {
      if (c && !castMap.has(c.character_id)) {
        castMap.set(c.character_id, c);
      }
    };

    // 1. Desagregar todos los individuos mencionados en el input `rawCharacterCompany`
    const parsedFromInput = this.splitCharacterEntities(rawCharacterCompany);
    for (const ent of parsedFromInput) {
      if (ent.isKnownRealPerson) {
        const char = this.findOrDraftCharacter(channelId, ent.name, storyTitle, conflict, {
          company: ent.company,
          roleHint:
            ent.narrativeRole === 'antagonist'
              ? `Contraparte / Rival${ent.company ? ` en ${ent.company}` : ''}`
              : `Protagonista / Fundador${ent.company ? ` de ${ent.company}` : ''}`,
          knownFace: true,
          characterCategory: 'real_person',
        });
        addChar(char);
      } else {
        const loreChar = this.findOrCreateChannelLoreCharacter(
          channelId,
          ent.name,
          storyTitle,
          projectId
        );
        addChar(loreChar);
      }
    }

    // 2. Incorporar Protagonista y Antagonista del ResearchDossier si no estaban ya en la lista
    if (dossier) {
      if (dossier.protagonist_profile?.name) {
        const protEntities = this.splitCharacterEntities(dossier.protagonist_profile.name);
        for (const pEnt of protEntities) {
          const isKnown =
            dossier.protagonist_profile.known_face !== false && pEnt.isKnownRealPerson;
          if (isKnown) {
            const char = this.findOrDraftCharacter(channelId, pEnt.name, storyTitle, conflict, {
              company: pEnt.company,
              roleHint: dossier.protagonist_profile.role || `Protagonista en ${storyTitle}`,
              knownFace: true,
              characterCategory: 'real_person',
            });
            addChar(char);
          } else {
            const loreChar = this.findOrCreateChannelLoreCharacter(
              channelId,
              dossier.protagonist_profile.role || pEnt.name,
              storyTitle,
              projectId
            );
            addChar(loreChar);
          }
        }
      }

      if (dossier.antagonist_profile?.name) {
        const antEntities = this.splitCharacterEntities(dossier.antagonist_profile.name);
        for (const aEnt of antEntities) {
          const isKnown =
            dossier.antagonist_profile.known_face !== false && aEnt.isKnownRealPerson;
          if (isKnown) {
            const char = this.findOrDraftCharacter(channelId, aEnt.name, storyTitle, conflict, {
              company: aEnt.company,
              roleHint: dossier.antagonist_profile.role || `Antagonista en ${storyTitle}`,
              knownFace: true,
              characterCategory: 'real_person',
            });
            addChar(char);
          } else {
            // Si el antagonista o fuerza opuesta no tiene rostro conocido (ej. usuarios furiosos, ingenieros, junta anónima),
            // vincular un personaje del Lore del Canal como secundario/doble consistente
            const loreChar = this.findOrCreateChannelLoreCharacter(
              channelId,
              `${aEnt.name} (${dossier.antagonist_profile.role || 'Secundario'})`,
              storyTitle,
              projectId
            );
            addChar(loreChar);
          }
        }
      }

      // 3. Si el Dossier especificó cast_members adicionales
      if (Array.isArray(dossier.cast_members)) {
        for (const member of dossier.cast_members) {
          if (!member.name) continue;
          if (member.known_face && !this.isUnnamedOrUnknownFaceEntity(member.name)) {
            const char = this.findOrDraftCharacter(channelId, member.name, storyTitle, conflict, {
              company: member.company,
              roleHint: member.role,
              knownFace: true,
              characterCategory: 'real_person',
            });
            addChar(char);
          } else {
            const loreChar = this.findOrCreateChannelLoreCharacter(
              channelId,
              member.suggested_archetype || member.role || member.name,
              storyTitle,
              projectId
            );
            addChar(loreChar);
          }
        }
      }
    }

    // 4. Garantizar siempre al menos 1 personaje en el proyecto
    if (castMap.size === 0) {
      const fallback = this.findOrDraftCharacter(
        channelId,
        rawCharacterCompany || storyTitle,
        storyTitle,
        conflict
      );
      addChar(fallback);
    }

    // 5. Incluir siempre al menos 1 personaje secundario con Lore del Canal (ej. Juanito) en el elenco disponible
    // para las escenas de analogía cotidiana (Acto IV) o personajes secundarios sin rostro
    const hasLoreMember = Array.from(castMap.values()).some(
      (c) => c.character_category === 'channel_lore_cast'
    );
    if (!hasLoreMember) {
      const loreSupport = this.findOrCreateChannelLoreCharacter(
        channelId,
        'usuario joven / analogía cotidiana',
        storyTitle,
        projectId
      );
      addChar(loreSupport);
    }

    return Array.from(castMap.values());
  }

  /**
   * Asigna automáticamente qué personaje(s) del elenco aparecen en cada escena
   * según los nombres mencionados en voiceover/visual_prompt, el acto narrativo y el shot_type.
   */
  static assignCharactersToScenes(
    scenes: SceneItem[],
    cast: CharacterProfile[]
  ): SceneItem[] {
    if (!cast || cast.length === 0) return scenes;

    const realCharacters = cast.filter((c) => c.character_category !== 'channel_lore_cast');
    const loreCharacters = cast.filter((c) => c.character_category === 'channel_lore_cast');

    const primaryProtagonist = realCharacters[0] || cast[0];
    const primaryAntagonist = realCharacters[1] || realCharacters[0] || cast[0];
    const secondarySupporting = realCharacters[2];
    const primaryLoreCast = loreCharacters[0] || cast.find((c) => c.character_category === 'channel_lore_cast');
    const witnessOrAuditor = realCharacters.find(
      (c) =>
        c.role?.toLowerCase().includes('testigo') ||
        c.role?.toLowerCase().includes('auditor') ||
        c.role?.toLowerCase().includes('ingenier') ||
        c.role?.toLowerCase().includes('denunciante') ||
        c.name.toLowerCase().includes('auditor') ||
        c.name.toLowerCase().includes('testigo')
    );

    return scenes.map((scene) => {
      // Si la escena ya tiene character_ids válidos dentro del elenco actual, conservarlos
      if (
        Array.isArray(scene.character_ids) &&
        scene.character_ids.length > 0 &&
        scene.character_ids.every((id) => cast.some((c) => c.character_id === id))
      ) {
        return scene;
      }

      const combinedText = `${scene.voiceover} ${scene.visual_prompt} ${scene.chapter}`.toLowerCase();
      const matchedIds: string[] = [];

      // 1. Detectar menciones explícitas de cada personaje real o de lore en la escena
      for (const char of cast) {
        const nameTokens = char.name
          .toLowerCase()
          .replace(/\([^)]*\)/g, '')
          .split(/\s+/)
          .filter((w) => w.length >= 3);

        const mentionedByName = nameTokens.some((token) => combinedText.includes(token));
        if (mentionedByName) {
          matchedIds.push(char.character_id);
        }
      }

      if (matchedIds.length > 0) {
        return {
          ...scene,
          character_ids: Array.from(new Set(matchedIds)),
        };
      }

      // 2. Asignación inteligente por tipo de plano y acto cuando no se menciona el nombre literal
      if (scene.shot_type === 'object_detail') {
        return { ...scene, character_ids: [] };
      }

      // Acto 3 (Antagonistas y fuerzas opuestas) o planos de antagonista
      if (scene.shot_type === 'antagonist_shot' || scene.act_number === 3) {
        return {
          ...scene,
          character_ids: [primaryAntagonist.character_id],
        };
      }

      // En el Acto 4 (Explicación del Concepto / Analogía Cotidiana, escenas 13-16),
      // usar al personaje recurrente con Lore del Canal (ej. Juanito) para protagonizar la analogía
      if (
        scene.act_number === 4 &&
        primaryLoreCast &&
        (scene.scene_id === 14 || scene.scene_id === 15 || scene.shot_type === 'concept_diagram')
      ) {
        return {
          ...scene,
          character_ids: [primaryLoreCast.character_id],
        };
      }

      if (scene.shot_type === 'concept_diagram') {
        return { ...scene, character_ids: [] };
      }

      // En el Acto 2 (Origen y socios iniciales): si hay un cofundador/socio secundario
      if (scene.act_number === 2 && secondarySupporting && (scene.scene_id === 7 || scene.scene_id === 8)) {
        return {
          ...scene,
          character_ids: [primaryProtagonist.character_id, secondarySupporting.character_id],
        };
      }

      // En el Acto 5 (Crisis, auditorías y denuncias internas): si hay testigo/auditor
      if (scene.act_number === 5 && witnessOrAuditor && (scene.scene_id === 17 || scene.scene_id === 18)) {
        return {
          ...scene,
          character_ids: [witnessOrAuditor.character_id],
        };
      }

      // En el Acto 5 (Choque de trenes), si hay más de 1 personaje real y es una escena de enfrentamiento
      if (
        scene.act_number === 5 &&
        realCharacters.length >= 2 &&
        (scene.shot_type === 'symbolic_silhouette' || scene.scene_id === 19 || scene.scene_id === 23)
      ) {
        return {
          ...scene,
          character_ids: [realCharacters[0].character_id, realCharacters[1].character_id],
        };
      }

      return {
        ...scene,
        character_ids: [primaryProtagonist.character_id],
      };
    });
  }

  /**
   * Poda y elimina del elenco de un proyecto aquellos personajes que no aparecen en ninguna escena (0 escenas).
   * Garantiza que siempre se conserve al menos 1 personaje en el elenco.
   */
  static pruneUnusedCharacters(
    scenes: SceneItem[],
    cast: CharacterProfile[]
  ): CharacterProfile[] {
    if (!cast || cast.length <= 1) return cast || [];

    const usedCharacterIds = new Set<string>();
    for (const scene of scenes) {
      if (Array.isArray(scene.character_ids)) {
        for (const id of scene.character_ids) {
          if (id) usedCharacterIds.add(id);
        }
      }
    }

    const activeCast = cast.filter((char) => usedCharacterIds.has(char.character_id));

    // Si por algún motivo todos quedaran en 0, conservar el primero
    return activeCast.length > 0 ? activeCast : [cast[0]];
  }

  /**
   * Detecta y categoriza el entorno o locación a partir del prompt visual
   */
  static detectPlace(prompt: string): string | undefined {
    if (!prompt) return undefined;
    const lower = prompt.toLowerCase();
    const places = [
      {
        name: 'Headquarters / Sede Central',
        regex: /\b(headquarters|hq|corporate campus|main office|corporate building)\b/i,
      },
      {
        name: 'Oficina Corporativa / Boardroom',
        regex: /\b(boardroom|executive office|corporate office|meeting room|conference room)\b/i,
      },
      {
        name: 'Sala de Servidores / Datacenter',
        regex: /\b(server room|data center|datacenter|server rack|supercomputer)\b/i,
      },
      {
        name: 'Oficina de Desarrollo / Open Space',
        regex: /\b(tech office|workspace|open office|cubicle|modern studio|laptop screen)\b/i,
      },
      {
        name: 'Conferencia / Escenario de Prensa',
        regex: /\b(stage|conference|press conference|keynote|auditorium|speech)\b/i,
      },
      {
        name: 'Tribunal / Audiencia Legal',
        regex: /\b(courtroom|courthouse|trial|judge bench|legal hearing|lawsuit)\b/i,
      },
      {
        name: 'New York City / Calle Urbana',
        regex: /\b(new york|nyc|manhattan|times square|urban street|city skyline|street corner)\b/i,
      },
      {
        name: 'Silicon Valley / San Francisco',
        regex: /\b(silicon valley|san francisco|bay area|palo alto)\b/i,
      },
      { name: 'Café / Restaurante', regex: /\b(coffee shop|cafe|cafeteria|restaurant|diner)\b/i },
      {
        name: 'Apartamento / Hogar',
        regex: /\b(apartment|living room|home office|bedroom|garage)\b/i,
      },
      {
        name: 'Cancha / Entorno Deportivo',
        regex: /\b(stadium|soccer|football|basketball|court|field|gym|sports)\b/i,
      },
      {
        name: 'Antigua Ciudad / Entorno Histórico',
        regex: /\b(ancient city|ruins|temple|palace|historical village|earthenware)\b/i,
      },
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
      characterName
        .toLowerCase()
        .split(/\s+/)
        .forEach((w) => {
          if (w.length > 2) tags.add(w);
        });
    }

    const stopWords = new Set([
      'a', 'an', 'the', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by',
      'from', 'as', 'into', 'like', 'through', 'after', 'over', 'between', 'out', 'against',
      'during', 'without', 'before', 'under', 'around', 'among', 'shot', 'wide', 'close-up',
      'view', 'cinematic', '3d', 'render', 'style', 'lighting', 'visual', 'detailed', 'high',
      'filled', 'working', 'young', 'employees', 'background', 'corner', 'single', 'unified',
      'frame',
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
   * dentro de la biblioteca de activos del personaje (y de los co-protagonistas si es escena grupal)
   * con metadatos completos para su futura reutilización inteligente.
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
      coCharacterIds?: string[];
      sourceProjectId?: string;
      sourceSceneId?: number;
    }
  ): CharacterProfile | null {
    // Nunca guardar un placeholder SVG de emergencia en la galería ni activos permanentes del personaje
    if (!imagePublicUrl || imagePublicUrl.toLowerCase().endsWith('.svg')) {
      return null;
    }

    const allIds = Array.from(new Set([characterId, ...(metadata?.coCharacterIds || [])])).filter(
      Boolean
    );
    const isGroupShot = allIds.length > 1;

    const charactersList = allIds
      .map((id) => this.getCharacter(channelId, id))
      .filter((c): c is CharacterProfile => Boolean(c));

    if (charactersList.length === 0) return null;

    // Inferir sourceProjectId desde imagePublicUrl si viene de /storage/<projectId>/...
    const cleanPublicUrl = imagePublicUrl.split('?')[0];
    let inferredProjectId = metadata?.sourceProjectId;
    if (!inferredProjectId && cleanPublicUrl.startsWith('/storage/')) {
      const parts = cleanPublicUrl.replace('/storage/', '').split('/');
      if (parts[0]) inferredProjectId = parts[0];
    }

    let permanentUrl = cleanPublicUrl;
    try {
      if (cleanPublicUrl.startsWith('/storage/')) {
        const storageSubPath = cleanPublicUrl.replace('/storage/', '');
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

    const allCharNames = charactersList.map((c) => c.name);
    let primaryUpdated: CharacterProfile | null = null;

    for (const character of charactersList) {
      const currentGallery = character.reference_gallery || [];
      const currentAssets: VisualAssetMetadata[] = character.assets || [];

      const place =
        metadata?.placeOrEnvironment ||
        (metadata?.prompt ? this.detectPlace(metadata.prompt) : undefined);
      const tags =
        metadata?.tags ||
        (metadata?.prompt
          ? this.extractTags(metadata.prompt, allCharNames.join(' '), metadata.companyOrSubject)
          : []);

      const existingAssetIndex = currentAssets.findIndex(
        (a) => a.url === permanentUrl || a.url === imagePublicUrl
      );
      if (existingAssetIndex === -1) {
        const newAsset: VisualAssetMetadata = {
          id: `asset_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          url: permanentUrl,
          prompt: metadata?.prompt || '',
          description: metadata?.description,
          characterId: character.character_id,
          characterName: character.name,
          characterIds: allIds,
          characterNames: allCharNames,
          isGroupShot,
          placeOrEnvironment: place,
          companyOrSubject: metadata?.companyOrSubject || character.company_or_affiliation,
          shotType: metadata?.shotType,
          tags,
          sourceProjectId: inferredProjectId,
          sourceSceneId: metadata?.sourceSceneId,
          createdAt: new Date().toISOString(),
        };
        character.assets = [newAsset, ...currentAssets].slice(0, 100);
      }

      if (!currentGallery.includes(permanentUrl)) {
        character.reference_gallery = [permanentUrl, ...currentGallery].slice(0, 48);
      }

      character.updatedAt = new Date().toISOString();
      // Solo asignar como retrato oficial canónico si es una imagen INDIVIDUAL (no grupal)
      if (!character.canonical_image_url && !isGroupShot) {
        character.canonical_image_url = permanentUrl;
      }

      const saved = this.saveCharacter(channelId, character);
      if (saved.character_id === characterId) {
        primaryUpdated = saved;
      }
    }

    return primaryUpdated;
  }

  /**
   * Busca en la biblioteca de activos un elemento que coincida con los personajes de la escena,
   * lugar, empresa o contexto visual para reutilizarlo de VIDEOS ANTERIORES y ahorrar costos de API.
   * REGLA DE ORO:
   * 1. NUNCA reutiliza una imagen creada en el MISMO video (`sourceProjectId === currentProjectId`).
   * 2. NUNCA reutiliza una imagen que ya haya sido usada en otra escena del MISMO video (`excludeUrls` / `excludePrompts`).
   * 3. Si la escena requiere a un personaje SOLO o con personajes nuevos, evita fotos grupales con personajes ajenos.
   */
  static findMatchingAsset(
    channelId: string,
    characterId: string | undefined,
    scene: {
      visual_prompt: string;
      chapter?: string;
      shot_type?: ShotType;
      character_ids?: string[];
    },
    companyOrSubject?: string,
    options?: {
      currentProjectId?: string;
      excludeUrls?: Iterable<string>;
      excludePrompts?: Iterable<string>;
    }
  ): VisualAssetMetadata | null {
    const characters = this.getCharacters(channelId);
    if (!characters.length) return null;

    const excludeUrlSet = new Set<string>(options?.excludeUrls ? Array.from(options.excludeUrls) : []);
    const excludePromptSet = new Set<string>(
      options?.excludePrompts
        ? Array.from(options.excludePrompts).map((p) => p.trim().toLowerCase())
        : []
    );

    const requestedCharIds =
      scene.character_ids && scene.character_ids.length > 0
        ? scene.character_ids
        : characterId
        ? [characterId]
        : [];

    const seenAssetUrls = new Set<string>();
    const allAssets: VisualAssetMetadata[] = [];

    const pushUniqueAssets = (list?: VisualAssetMetadata[]) => {
      if (!list) return;
      for (const a of list) {
        if (a?.url && !a.url.toLowerCase().endsWith('.svg') && !seenAssetUrls.has(a.url)) {
          seenAssetUrls.add(a.url);
          allAssets.push(a);
        }
      }
    };

    for (const reqId of requestedCharIds) {
      const c = characters.find((ch) => ch.character_id === reqId);
      pushUniqueAssets(c?.assets);
    }
    // Si la escena NO pide personajes, solo incluir assets del canal que no tengan personajes asociados
    if (requestedCharIds.length === 0) {
      for (const char of characters) {
        if (char.assets) {
          for (const a of char.assets) {
            const aChars = a.characterIds || (a.characterId ? [a.characterId] : []);
            if (aChars.length === 0) {
              pushUniqueAssets([a]);
            }
          }
        }
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
      // REGLA 1: Prohibido reutilizar imágenes creadas en este mismo proyecto/video
      if (options?.currentProjectId) {
        if (asset.sourceProjectId === options.currentProjectId) {
          continue;
        }
        if (asset.url.includes(`/storage/${options.currentProjectId}/`)) {
          continue;
        }
      }

      // REGLA 2: Prohibido repetir una imagen que ya está siendo usada en otra escena de este mismo video
      if (excludeUrlSet.has(asset.url)) {
        continue;
      }
      if (asset.prompt && excludePromptSet.has(asset.prompt.trim().toLowerCase())) {
        continue;
      }

      // REGLA 3: Blindaje estricto de elenco (CERO contaminación de personajes ajenos en cualquier tipo de plano):
      const assetChars = asset.characterIds || (asset.characterId ? [asset.characterId] : []);

      // Si la escena no tiene personajes solicitados, no reutilizar activos con personajes asociados
      if (requestedCharIds.length === 0 && assetChars.length > 0) {
        continue;
      }

      // Si la escena solicita personajes, el activo NO puede contener ningún personaje ajeno a requestedCharIds
      if (requestedCharIds.length > 0) {
        if (assetChars.length === 0) {
          // Activo sin personajes solo aceptable si es plano de entorno u objeto sin figuras humanas
          if (scene.shot_type === 'character_closeup' || scene.shot_type === 'antagonist_shot') {
            continue;
          }
        } else {
          const hasForeignCharacter = assetChars.some((id) => !requestedCharIds.includes(id));
          if (hasForeignCharacter || (asset.isGroupShot && requestedCharIds.length === 1)) {
            continue;
          }
        }
      }

      let score = 0;

      // 0. Coincidencia exacta de personaje(s) en escena (+30)
      if (
        requestedCharIds.length > 0 &&
        assetChars.length > 0 &&
        requestedCharIds.every((id) => assetChars.includes(id)) &&
        assetChars.length === requestedCharIds.length
      ) {
        score += 30;
      } else if (
        requestedCharIds.length > 0 &&
        assetChars.length > 0 &&
        assetChars.some((id) => requestedCharIds.includes(id))
      ) {
        score += 20;
      }

      // 1. Coincidencia de Lugar / Entorno (+35)
      const hasPlaceMatch = Boolean(
        scenePlace && asset.placeOrEnvironment && scenePlace === asset.placeOrEnvironment
      );
      if (hasPlaceMatch) {
        score += 35;
      }

      // 2. Coincidencia de Empresa / Sujeto (+20)
      if (companyOrSubject && asset.companyOrSubject) {
        const compLower = companyOrSubject.toLowerCase();
        if (
          compLower.includes(asset.companyOrSubject.toLowerCase()) ||
          asset.companyOrSubject.toLowerCase().includes(compLower)
        ) {
          score += 20;
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

      // Exigir coincidencia real de contexto visual (entorno o al menos 2 palabras clave del prompt)
      if (!hasPlaceMatch && tokenOverlap < 2) {
        continue;
      }

      if (score > highestScore) {
        highestScore = score;
        bestMatch = asset;
      }
    }

    if (highestScore >= 60 && bestMatch) {
      console.log(
        `[Smart Asset Reuse] ✓ Coincidencia única de otro video (Score ${highestScore}) para: "${
          scene.chapter || scene.visual_prompt.slice(0, 35)
        }..." -> Asset: "${bestMatch.placeOrEnvironment || bestMatch.description || bestMatch.url}"`
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

  /**
   * Resuelve cualquier URL de imagen de la plataforma (assets de canal, almacenamiento o data URL) a base64
   */
  static resolveImageFileBase64(imageUrl?: string): { base64: string; mimeType: string } | null {
    if (!imageUrl) return null;
    try {
      if (imageUrl.startsWith('data:image/')) {
        const match = imageUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
        if (match) {
          const ext = match[1].toLowerCase();
          const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
          return { base64: match[2], mimeType };
        }
      }
      let localPath = '';
      const cleanUrl = imageUrl.split('?')[0];
      if (cleanUrl.startsWith('/channel-assets/')) {
        const rel = cleanUrl.replace('/channel-assets/', '');
        localPath = path.join(CHANNELS_DIR, rel);
      } else if (cleanUrl.startsWith('/storage/')) {
        const rel = cleanUrl.replace('/storage/', '');
        localPath = path.join(STORAGE_DIR, rel);
      }
      if (!localPath || !fs.existsSync(localPath)) return null;
      const ext = path.extname(localPath).toLowerCase();
      if (ext === '.svg') return null;
      const mimeType =
        ext === '.png'
          ? 'image/png'
          : ext === '.webp'
          ? 'image/webp'
          : 'image/jpeg';
      const base64 = fs.readFileSync(localPath).toString('base64');
      return { base64, mimeType };
    } catch {
      return null;
    }
  }

  /**
   * Guarda una foto frontal real de referencia del personaje para alimentar a la IA multimodal
   */
  static saveRealReferenceImage(
    channelId: string,
    characterId: string,
    base64Data: string
  ): CharacterProfile | null {
    const character = this.getCharacter(channelId, characterId);
    if (!character) return null;

    const assetsDir = this.getChannelCharacterAssetsDir(channelId);
    let ext = 'jpg';
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

    const filename = `${characterId}_realref_${Date.now()}.${ext}`;
    const filePath = path.join(assetsDir, filename);
    fs.writeFileSync(filePath, Buffer.from(cleanBase64, 'base64'));

    const publicUrl = `/channel-assets/${channelId}/characters/assets/${filename}`;
    const updated: CharacterProfile = {
      ...character,
      real_reference_image_url: publicUrl,
      updatedAt: new Date().toISOString(),
    };

    return this.saveCharacter(channelId, updated);
  }
}
