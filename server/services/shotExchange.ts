/**
 * Manual workflow helpers: export shot prompts as text (to generate images on Google's web tools)
 * and match uploaded image files back to shots by filename.
 */
import type { ProjectScript, SceneItem, ShotItem } from '../../src/types/index.ts';

export interface ExportOptions {
  sceneId?: number;
  onlyMissing?: boolean;
  format?: 'tutorial' | 'prompts_only';
  resolvePrompt: (scene: SceneItem, shot: ShotItem) => string;
  resolveShotSeconds: (scene: SceneItem, shot: ShotItem) => number;
}

export function buildPromptExport(project: ProjectScript, options: ExportOptions): string {
  const format = options.format || 'tutorial';
  const lines: string[] = [];

  if (format === 'tutorial') {
    lines.push(
      'Crea todas las imágenes según los prompts ingresados. Cada prompt está ubicado después de la palabra "Indicación:". Luego, renombra automáticamente cada imagen, usando los 5 primeros caracteres de su respectivo prompt (ej: [001], [002]).'
    );
    lines.push('');
  }

  for (const scene of project.scenes) {
    if (options.sceneId !== undefined && scene.scene_id !== options.sceneId) continue;
    for (const shot of scene.shots || []) {
      if (options.onlyMissing && shot.imageUrl) continue;
      const number = String(shot.global_index).padStart(3, '0');
      const fullPrompt = `[${number}] ${options.resolvePrompt(scene, shot)}`;

      if (format === 'prompts_only') {
        lines.push(fullPrompt);
        lines.push('');
        continue;
      }

      const cast = (project.characters || []).filter((c) => (shot.character_ids || []).includes(c.character_id));
      lines.push(`IMAGEN ${number}  [${shot.shot_id} • Escena ${scene.scene_id}: ${scene.chapter}]`);
      lines.push(`Voz en off: ${shot.voiceText}`);
      lines.push(`Duración: ${options.resolveShotSeconds(scene, shot).toFixed(1)}s`);
      if (cast.length > 0) {
        lines.push(`Personajes de referencia: ${cast.map((c) => c.name).join(', ')}`);
      }
      lines.push(`Indicación: ${fullPrompt}`);
      lines.push('');
    }
  }
  return lines.join('\n');
}

export type ImportMatch =
  | { fileName: string; sceneId: number; shotId: string }
  | { fileName: string; error: string };

/**
 * Matches a filename to a shot. Accepts:
 * - "S03-P02.png" (scene/shot code, any separator)
 * - "[001] anything.png", "001.png", "image_001.jpg" (leading/first 1-4 digit global shot number)
 */
export function matchFileToShot(fileName: string, project: ProjectScript): ImportMatch {
  const base = fileName.replace(/\.[a-z0-9]+$/i, '').trim();

  const codeMatch = base.match(/S\s*0*(\d{1,3})\s*[-_ ]?\s*P\s*0*(\d{1,3})/i);
  if (codeMatch) {
    const sceneId = Number(codeMatch[1]);
    const shotNumber = Number(codeMatch[2]);
    const scene = project.scenes.find((s) => s.scene_id === sceneId);
    const shot = scene?.shots?.[shotNumber - 1];
    if (scene && shot) return { fileName, sceneId, shotId: shot.shot_id };
    return { fileName, error: `No existe el plano S${sceneId}-P${shotNumber}` };
  }

  const bracketMatch = base.match(/^\[\s*0*(\d{1,4})\s*\]/);
  const numberMatch = bracketMatch || base.match(/(?:^|[^0-9])0*(\d{1,4})(?:[^0-9]|$)/);
  if (numberMatch) {
    const globalIndex = Number(numberMatch[1]);
    for (const scene of project.scenes) {
      const shot = scene.shots?.find((s) => s.global_index === globalIndex);
      if (shot) return { fileName, sceneId: scene.scene_id, shotId: shot.shot_id };
    }
    return { fileName, error: `No existe la imagen número ${globalIndex}` };
  }

  return { fileName, error: 'El nombre no contiene número de imagen ([001] / 001) ni código (S01-P01)' };
}
