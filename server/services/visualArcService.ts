import type { CharacterProfile, ShotType } from '../../src/types/index.ts';

export interface ActLightingRule {
  act_number: number;
  act_name: string;
  emotional_tone: string;
  lighting_prompt: string;
  camera_composition: string;
  expression_prompt: string;
}

export class VisualArcService {
  private static actRules: ActLightingRule[] = [
    {
      act_number: 1,
      act_name: 'Acto I: El Gancho en la Cima',
      emotional_tone: 'Euforia, poder absoluto, espejismo de invencibilidad',
      lighting_prompt:
        'bright high-key golden morning sunlight streaming through panoramic windows, warm vibrant cinematic glow, subtle lens flare, crisp reflections',
      camera_composition: 'heroic low-angle widescreen composition, imposing scale',
      expression_prompt: 'charismatic confident poise, visionary gaze, boundless ambition',
    },
    {
      act_number: 2,
      act_name: 'Acto II: El Expediente del Protagonista',
      emotional_tone: 'Origen, obsesión temprana, construcción del personaje',
      lighting_prompt:
        'warm nostalgic tungsten desk lamp mixed with natural daylight, rich biographical documentary atmosphere, volumetric dust particles',
      camera_composition: 'intimate 35mm documentary medium shot, natural depth of field',
      expression_prompt: 'intense focused determination, hungry ambitious eyes',
    },
    {
      act_number: 3,
      act_name: 'Acto III: El Antagonista en la Sombra',
      emotional_tone: 'Rivalidad estratégica, cálculo frío, amenaza silenciosa',
      lighting_prompt:
        'cool steel-blue and cyan late-night lighting, sharp rim light, high-contrast thriller shadows',
      camera_composition: 'over-the-shoulder strategic framing, tense asymmetric balance',
      expression_prompt: 'calculating analytical expression, sharp observant eyes',
    },
    {
      act_number: 4,
      act_name: 'Acto IV: El Paréntesis Maestro (Concepto Clave)',
      emotional_tone: 'Revelación intelectual, claridad visual, metáfora del sistema',
      lighting_prompt:
        'dramatic spotlighting over dark obsidian background, glowing amber and cobalt visual accents, crisp studio contrast',
      camera_composition: 'clean symmetrical conceptual framing, razor-sharp focus on central subject',
      expression_prompt: 'thoughtful intrigued expression discovering a hidden mechanism',
    },
    {
      act_number: 5,
      act_name: 'Acto V: El Choque y las 72 Horas del Colapso',
      emotional_tone: 'Pánico, implosión financiera, caos en tiempo real',
      lighting_prompt:
        'dramatic low-key chiaroscuro lighting, deep threatening shadows, intense crimson warning reflections, rainy glass reflections',
      camera_composition: 'dramatic Dutch-angle close-up or chaotic wide war-room shot',
      expression_prompt: 'wide shocked eyes, furrowed brow, visible stress and exhaustion',
    },
    {
      act_number: 6,
      act_name: 'Acto VI: Las Cenizas y el Veredicto Forense',
      emotional_tone: 'Reflexión sobria, lección histórica grabada a fuego',
      lighting_prompt:
        'philosophical cinematic twilight, warm amber sunset contrasting against deep dusk shadows, golden hour rim lighting',
      camera_composition: 'cinematic wide silhouette shot, contemplative atmospheric profile',
      expression_prompt: 'stoic solemn contemplative gaze into the distance',
    },
  ];

  static getAllActRules(): ActLightingRule[] {
    return this.actRules;
  }

  static getActRule(sceneIndex: number, totalScenes: number = 24): ActLightingRule {
    if (totalScenes <= 1) return this.actRules[0];

    const progress = sceneIndex / Math.max(1, totalScenes - 1);
    const actIndex = Math.min(
      this.actRules.length - 1,
      Math.floor(progress * this.actRules.length)
    );

    return this.actRules[actIndex];
  }

  private static formatCharacterAnchorWithLore(char: CharacterProfile): string {
    const lorePeculiarities = char.channel_lore?.peculiarities?.length
      ? ` (Recurring visual traits: ${char.channel_lore.peculiarities.join('; ')})`
      : '';
    // Extraer la descripción física esencial evitando frases de estilo redundantes
    const cleanAnchor = (char.anchor_prompt || '')
      .replace(/Pixar and Arcane inspired visual aesthetic,?/gi, '')
      .replace(/rich volumetric lighting,?/gi, '')
      .replace(/single individual 3D documentary render,?/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    return `${char.name}: ${cleanAnchor}${lorePeculiarities}`;
  }

  static enrichScenePrompt(
    basePrompt: string,
    characterAnchor: string | null,
    sceneIndex: number,
    totalScenes: number = 24,
    customArtStyle?: string,
    shotType?: ShotType,
    sceneCharacters?: CharacterProfile[]
  ): { fullPrompt: string; actRule: ActLightingRule } {
    const actRule = this.getActRule(sceneIndex, totalScenes);

    const artStyle =
      customArtStyle && customArtStyle !== '3d_animation'
        ? customArtStyle
        : 'High-end stylized 3D animated documentary illustration, Pixar and Arcane inspired visual aesthetic, rich 3D rendered textures, cinematic octane render quality';

    const effectiveShot: ShotType =
      shotType ||
      (['character_closeup', 'environment_wide', 'object_detail', 'symbolic_silhouette'][
        sceneIndex % 4
      ] as ShotType);

    const activeChars = sceneCharacters?.filter(Boolean) || [];
    let resolvedCharDirective = '';

    if (activeChars.length === 1) {
      resolvedCharDirective = `Character in frame — ${this.formatCharacterAnchorWithLore(
        activeChars[0]
      )}.`;
    } else if (activeChars.length > 1) {
      const charDescriptions = activeChars
        .slice(0, 3)
        .map((c, idx) => `Character ${idx + 1} (${this.formatCharacterAnchorWithLore(c)})`)
        .join(' AND ');
      resolvedCharDirective = `Multiple distinct characters interacting in the same unified scene: ${charDescriptions}.`;
    } else if (characterAnchor) {
      resolvedCharDirective = `Character in frame: ${characterAnchor}.`;
    }

    let subjectDirective = '';
    switch (effectiveShot) {
      case 'environment_wide':
        subjectDirective = `Establishing wide environment shot focusing on the setting and atmosphere (${basePrompt}). ${
          resolvedCharDirective
            ? `Characters present in the environment: ${resolvedCharDirective}`
            : 'If a figure is present in the distance, keep them integrated in the environment.'
        }`;
        break;
      case 'object_detail':
        subjectDirective = `${
          resolvedCharDirective ? `Close interaction with ${activeChars.map((c) => c.name).join(' / ')}. ` : ''
        }Extreme macro close-up shot of key physical evidence and objects (${basePrompt}), shallow depth of field, intricate surface textures.`;
        break;
      case 'concept_diagram':
        subjectDirective = `Cinematic 3D visual metaphor illustrating the concept (${basePrompt}). ${
          resolvedCharDirective ? `Metaphor protagonized by: ${resolvedCharDirective}` : ''
        } Dramatic lighting, symbolic objects in motion.`;
        break;
      case 'antagonist_shot':
        subjectDirective = `Dramatic thriller shot of the rival force or opposing figure in action (${basePrompt}). ${resolvedCharDirective} Expression: ${actRule.expression_prompt}, tense body language.`;
        break;
      case 'symbolic_silhouette':
        subjectDirective = `Powerful atmospheric silhouette composition (${basePrompt}). ${resolvedCharDirective} High contrast rim lighting.`;
        break;
      case 'character_closeup':
      default:
        subjectDirective = resolvedCharDirective
          ? `${resolvedCharDirective} Expression: ${actRule.expression_prompt}. Scene action: ${basePrompt}.`
          : `Main subject action: ${basePrompt}. Expression: ${actRule.expression_prompt}.`;
        break;
    }

    const antiGridGuard =
      'SINGLE UNIFIED 16:9 WIDESCREEN CINEMATIC FRAME, one single continuous scene only, strictly NO grid, NO split-screen, NO collage, NO multiple panels, NO character turnaround sheet, no text overlay, no watermark.';

    const fullPrompt = `${artStyle}. ${subjectDirective} Lighting & Atmosphere: ${actRule.lighting_prompt}. Camera framing: ${actRule.camera_composition}. ${antiGridGuard}`;

    return {
      fullPrompt,
      actRule,
    };
  }
}
