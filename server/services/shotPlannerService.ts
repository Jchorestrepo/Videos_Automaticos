import type {
  CharacterProfile,
  ChannelPersona,
  ProjectScript,
  SceneItem,
  ShotItem,
  ShotPacingSeconds,
  ShotType,
} from '../../src/types/index.ts';
import { ImageService } from './imageService.ts';
import { VisualArcService } from './visualArcService.ts';
import { computeWordsPerShot, segmentVoiceover, tokenizeWords, type ShotSegment } from './shotSegmenter.ts';

export const DEFAULT_SHOT_PACING: ShotPacingSeconds = 3;
export const ALLOWED_SHOT_PACINGS: ShotPacingSeconds[] = [3, 4, 6];

const DIRECTOR_MODEL = 'gemini-2.5-flash';
const SHOT_TYPES: ShotType[] = [
  'character_closeup',
  'environment_wide',
  'object_detail',
  'concept_diagram',
  'antagonist_shot',
  'symbolic_silhouette',
];
const CAMERA_MOTIONS: NonNullable<ShotItem['camera_motion']>[] = ['zoom_in', 'zoom_out', 'pan_left', 'pan_right', 'static'];
const FALLBACK_GRAMMAR: ShotType[] = ['environment_wide', 'character_closeup', 'object_detail', 'symbolic_silhouette'];

export interface ScenePlanResult {
  sceneId: number;
  shotCount: number;
  usedFallback: boolean;
  error?: string;
}

interface DirectorShot {
  visual_prompt?: string;
  shot_type?: string;
  camera_motion?: string;
  character_ids?: string[];
  continuity_note?: string;
}

export function normalizePacing(value: unknown): ShotPacingSeconds {
  const n = Number(value);
  return (ALLOWED_SHOT_PACINGS as number[]).includes(n) ? (n as ShotPacingSeconds) : DEFAULT_SHOT_PACING;
}

export function formatShotId(sceneId: number, shotNumber: number): string {
  return `S${String(sceneId).padStart(2, '0')}-P${String(shotNumber).padStart(2, '0')}`;
}

function isUsableImage(url?: string): boolean {
  return Boolean(url) && !url!.split('?')[0].toLowerCase().endsWith('.svg');
}

export class ShotPlannerService {
  /** Plans shots for one scene (or all when sceneId is undefined) and renumbers global indexes. */
  static async planProject(
    project: ProjectScript,
    persona: ChannelPersona | null,
    options: { sceneId?: number; pacing?: ShotPacingSeconds; reuseSceneImage?: boolean } = {}
  ): Promise<ScenePlanResult[]> {
    const pacing = normalizePacing(options.pacing ?? project.shotPacingSeconds);
    project.visualMode = 'sequence';
    project.shotPacingSeconds = pacing;
    project.shotsLanguage = project.language || 'es';

    const targets =
      options.sceneId !== undefined
        ? project.scenes.filter((s) => s.scene_id === options.sceneId)
        : project.scenes;
    if (targets.length === 0) throw new Error(`Escena ${options.sceneId} no encontrada`);

    const results: ScenePlanResult[] = [];
    for (const scene of targets) {
      results.push(
        await this.planScene(project, scene, persona, pacing, options.reuseSceneImage !== false)
      );
    }
    this.renumberGlobalIndexes(project);
    return results;
  }

  static renumberGlobalIndexes(project: ProjectScript): void {
    let counter = 1;
    for (const scene of project.scenes) {
      for (const shot of scene.shots || []) {
        shot.global_index = counter++;
      }
    }
  }

  private static async planScene(
    project: ProjectScript,
    scene: SceneItem,
    persona: ChannelPersona | null,
    pacing: ShotPacingSeconds,
    reuseSceneImage: boolean
  ): Promise<ScenePlanResult> {
    const words = tokenizeWords(scene.voiceover);
    const wordsPerShot = computeWordsPerShot(pacing, words.length, scene.audioDurationSeconds);
    const segments = segmentVoiceover(scene.voiceover, wordsPerShot);
    const cast = this.resolveSceneCast(project, scene);

    let directed: DirectorShot[] | null = null;
    let error: string | undefined;
    try {
      directed = await this.directShots(project, scene, segments, cast, persona);
    } catch (err: any) {
      error = err?.message || String(err);
      console.warn(`[Shot Planner] Escena ${scene.scene_id}: director IA falló, usando plan base. Motivo: ${error}`);
    }

    const previous = new Map((scene.shots || []).map((s) => [s.shot_id, s]));
    scene.shots = segments.map((segment, i) => {
      const d = directed?.[i] || this.fallbackShot(scene, segment, i);
      const shotId = formatShotId(scene.scene_id, i + 1);
      const shot: ShotItem = {
        shot_id: shotId,
        global_index: 0,
        wordStart: segment.wordStart,
        wordEnd: segment.wordEnd,
        voiceText: segment.text,
        visual_prompt: (d.visual_prompt || scene.visual_prompt || '').trim(),
        shot_type: SHOT_TYPES.includes(d.shot_type as ShotType) ? (d.shot_type as ShotType) : scene.shot_type,
        camera_motion: CAMERA_MOTIONS.includes(d.camera_motion as any)
          ? (d.camera_motion as ShotItem['camera_motion'])
          : CAMERA_MOTIONS[i % 4],
        character_ids: Array.isArray(d.character_ids)
          ? d.character_ids.filter((id) => cast.some((c) => c.character_id === id))
          : scene.character_ids,
        continuity_note: d.continuity_note?.trim() || undefined,
      };
      if (i === 0 && reuseSceneImage && isUsableImage(scene.imageUrl)) {
        shot.visual_prompt = scene.visual_prompt;
        shot.imageUrl = scene.imageUrl;
        shot.imageSource = 'scene_reuse';
      } else if (previous.get(shotId)?.visual_prompt === shot.visual_prompt) {
        shot.imageUrl = previous.get(shotId)?.imageUrl;
        shot.imageSource = previous.get(shotId)?.imageSource;
      }
      return shot;
    });
    scene.shotsPlannedWordCount = words.length;

    return { sceneId: scene.scene_id, shotCount: scene.shots.length, usedFallback: !directed, error };
  }

  static resolveSceneCast(project: ProjectScript, scene: SceneItem): CharacterProfile[] {
    const ids = scene.character_ids || [];
    return (project.characters || []).filter(
      (c) => ids.includes(c.character_id) && c.character_category !== 'company_or_brand'
    );
  }

  private static fallbackShot(scene: SceneItem, segment: ShotSegment, index: number): DirectorShot {
    const shotType = FALLBACK_GRAMMAR[index % FALLBACK_GRAMMAR.length];
    return {
      visual_prompt:
        index === 0
          ? scene.visual_prompt
          : `Focus on the moment described: "${segment.text}". Context: ${scene.visual_prompt}`,
      shot_type: shotType,
      camera_motion: CAMERA_MOTIONS[index % 4],
      character_ids: shotType === 'environment_wide' || shotType === 'object_detail' ? [] : scene.character_ids,
    };
  }

  private static async directShots(
    project: ProjectScript,
    scene: SceneItem,
    segments: ShotSegment[],
    cast: CharacterProfile[],
    persona: ChannelPersona | null
  ): Promise<DirectorShot[]> {
    const client = ImageService.getGoogleGenAIClient();
    if (!client) throw new Error('No hay cliente de Google GenAI configurado');

    const castText =
      cast.length > 0
        ? cast.map((c) => `- "${c.character_id}": ${c.name} (${c.role}). Look: ${c.anchor_prompt}`).join('\n')
        : '- (no characters in this scene)';
    const fragments = segments.map((s, i) => `${i + 1}. "${s.text}"`).join('\n');

    const prompt = `You are a documentary film director breaking ONE narrated scene into consecutive camera shots.
Channel: "${persona?.name || project.channel_id}" — ${persona?.niche || ''}. Premium cinematic documentary, adult audience. Never cartoonish stick figures.
Scene ${scene.scene_id} "${scene.chapter}". Establishing visual of the scene: ${scene.visual_prompt}

Characters available (use only these exact ids in character_ids):
${castText}

Narration fragments (YOU MUST RETURN EXACTLY ${segments.length} SHOTS, one per numbered fragment below, in the exact same order):
${fragments}

Rules:
- Return a JSON object {"shots": [...]} with EXACTLY ${segments.length} items (one for fragment 1..${segments.length}). Never merge or split fragments.
- Each shot must literally illustrate what its fragment says (place, object, gesture, number, consequence).
- Camera grammar: vary framing (wide → medium → detail). Never use the same shot_type twice in a row.
- Shot 1 is the establishing shot and must match the establishing visual above.
- Continuity: keep location, wardrobe, time of day and lighting consistent inside the scene unless the narration changes them; describe it in continuity_note.
- visual_prompt: English, 40-80 words, concrete and filmable. Describe only content and framing, NOT art style. No text, letters, logos or screens with readable words.
- shot_type one of: ${SHOT_TYPES.join(', ')}.
- camera_motion one of: ${CAMERA_MOTIONS.join(', ')}.

Return JSON: {"shots":[{"visual_prompt":"","shot_type":"","camera_motion":"","character_ids":[],"continuity_note":""}]}`;

    let lastErr: Error | null = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await client.ai.models.generateContent({
          model: DIRECTOR_MODEL,
          contents: prompt,
          config: { responseMimeType: 'application/json', temperature: attempt === 1 ? 0.55 : 0.3 },
        });
        const parsed = JSON.parse(response.text || '{}');
        if (Array.isArray(parsed.shots) && parsed.shots.length > 0) {
          if (parsed.shots.length === segments.length) {
            return parsed.shots;
          }
          // Si devolvió más o menos por 1 elemento, ajustar sin perder los demás planos dirigidos
          return segments.map((seg, idx) => parsed.shots[idx] || this.fallbackShot(scene, seg, idx));
        }
        throw new Error('Respuesta JSON sin arreglo shots');
      } catch (err: any) {
        lastErr = err;
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 1200));
        }
      }
    }
    throw lastErr || new Error('Fallo al dirigir planos');
  }

  /** Full, self-contained prompt (channel style + framing + continuity). Same text for API and manual use. */
  static buildFullShotPrompt(project: ProjectScript, scene: SceneItem, shot: ShotItem): string {
    const sceneIndex = Math.max(0, scene.scene_id - 1); // same index generateSceneImage uses
    const cast = (project.characters || []).filter((c) => (shot.character_ids || []).includes(c.character_id));
    const base = shot.continuity_note ? `${shot.visual_prompt} Continuity: ${shot.continuity_note}` : shot.visual_prompt;
    return VisualArcService.enrichScenePrompt(
      base,
      null,
      sceneIndex,
      project.scenes.length,
      project.artStyle,
      shot.shot_type,
      cast
    ).fullPrompt;
  }

  static countShots(project: ProjectScript): { total: number; withImage: number } {
    let total = 0;
    let withImage = 0;
    for (const scene of project.scenes) {
      for (const shot of scene.shots || []) {
        total++;
        if (isUsableImage(shot.imageUrl)) withImage++;
      }
    }
    return { total, withImage };
  }
}
