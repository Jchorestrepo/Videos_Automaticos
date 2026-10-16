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
      act_name: 'El Ascenso / La Ilusión',
      emotional_tone: 'Euforia, carisma, ambición desmedida',
      lighting_prompt:
        'bright high-key golden morning sunlight streaming through panoramic windows, warm vibrant cinematic glow, lens flare, crisp clean reflection',
      camera_composition: 'heroic low-angle medium shot, confident imposing posture',
      expression_prompt: 'charismatic beaming smile, vision in eyes, boundless optimism',
    },
    {
      act_number: 2,
      act_name: 'La Fricción Oculta',
      emotional_tone: 'Tensión creciente, duda interna, presión',
      lighting_prompt:
        'harsh fluorescent late-night overhead lighting, split-lighting casting half the face in shadow, subtle reflections from glowing monitors',
      camera_composition: 'medium close-up, Dutch angle tilt suggesting unease',
      expression_prompt:
        'micro-expressions of stress, subtle beads of nervous sweat, forced tight smile hiding internal panic',
    },
    {
      act_number: 3,
      act_name: 'El Punto de Fractura',
      emotional_tone: 'Pánico, caos, el castillo de naipes tambaleándose',
      lighting_prompt:
        'dramatic low-key chiaroscuro lighting, deep threatening shadows, intense red warning indicator reflections, high contrast',
      camera_composition: 'dramatic eye-level close-up, intense depth of field, background motion blur',
      expression_prompt:
        'wide shocked eyes, furrowed brow, disheveled hair, sheer panic as documents pile up',
    },
    {
      act_number: 4,
      act_name: 'La Implosión / Ruina',
      emotional_tone: 'Desolación, derrota, aislamiento total',
      lighting_prompt:
        'cold desaturated midnight blue and charcoal shadows, dim moody silhouette, soft rain droplets glistening on dark glass',
      camera_composition:
        'wide melancholic shot, solitary isolated figure against massive empty space',
      expression_prompt:
        'defeated exhausted expression, staring down into the abyss, hollow eyes',
    },
    {
      act_number: 5,
      act_name: 'La Moraleja / Epílogo',
      emotional_tone: 'Reflexión sobria, lección histórica grabada a fuego',
      lighting_prompt:
        'philosophical cinematic twilight, warm amber sunset contrasting against deep dusk shadows, golden hour rim lighting',
      camera_composition: 'cinematic medium silhouette shot, contemplative atmospheric profile',
      expression_prompt: 'stoic solemn contemplative gaze into the distance',
    },
  ];

  static getAllActRules(): ActLightingRule[] {
    return this.actRules;
  }

  static getActRule(sceneIndex: number, totalScenes: number = 5): ActLightingRule {
    if (totalScenes <= 1) return this.actRules[0];

    // Map scene index (0-based) to 5 acts
    const progress = sceneIndex / Math.max(1, totalScenes - 1);
    const actIndex = Math.min(
      this.actRules.length - 1,
      Math.floor(progress * this.actRules.length)
    );

    return this.actRules[actIndex];
  }

  static enrichScenePrompt(
    basePrompt: string,
    characterAnchor: string | null,
    sceneIndex: number,
    totalScenes: number = 5,
    customArtStyle?: string
  ): { fullPrompt: string; actRule: ActLightingRule } {
    const actRule = this.getActRule(sceneIndex, totalScenes);

    const artStyle =
      customArtStyle ||
      'High-end stylized 3D animated character documentary illustration, Pixar and Arcane inspired visual aesthetic, rich 3D rendered textures, highly expressive facial features, cinematic octane render quality, 16:9 widescreen composition';

    const characterPart = characterAnchor
      ? `Main Character: ${characterAnchor}. Expression: ${actRule.expression_prompt}.`
      : `Character expression: ${actRule.expression_prompt}.`;

    const fullPrompt = `${artStyle}. ${characterPart} Action: ${basePrompt}. Lighting & Atmosphere: ${actRule.lighting_prompt}. Camera: ${actRule.camera_composition}, no watermark, clean cinematic frame.`;

    return {
      fullPrompt,
      actRule,
    };
  }
}
