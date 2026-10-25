import type { SceneItem, ShotItem } from '../types/index.ts';

export const MIN_SHOT_SECONDS = 1.2;

export interface ShotFrameRange {
  shot: ShotItem;
  from: number;
  durationInFrames: number;
}

function plannedWordCount(scene: SceneItem, shots: ShotItem[]): number {
  const lastEnd = shots.reduce((max, s) => Math.max(max, s.wordEnd), 0);
  return Math.max(1, scene.shotsPlannedWordCount || lastEnd);
}

/**
 * Converts a shot's word anchor into a frame offset inside the scene.
 * Uses real word timings when available (mapped proportionally so it also works
 * when the scene is rendered in a different language than it was planned in),
 * otherwise distributes proportionally by word position.
 */
function shotStartFrame(
  shot: ShotItem,
  scene: SceneItem,
  totalWords: number,
  fps: number,
  sceneDurationInFrames: number
): number {
  const ratio = Math.min(1, Math.max(0, shot.wordStart / totalWords));
  const timings = scene.wordTimings || [];
  if (timings.length > 0) {
    const idx = Math.min(timings.length - 1, Math.round(ratio * timings.length));
    return Math.round((timings[idx].startMs / 1000) * fps);
  }
  return Math.round(ratio * sceneDurationInFrames);
}

/**
 * Resolves the frame range of every shot so that ranges are contiguous, start at 0,
 * cover exactly the scene duration, and no shot is shorter than MIN_SHOT_SECONDS
 * (too-short shots are merged into the previous one).
 */
export function resolveShotFrames(
  scene: SceneItem,
  fps: number,
  sceneDurationInFrames: number
): ShotFrameRange[] {
  const shots = [...(scene.shots || [])].sort((a, b) => a.wordStart - b.wordStart);
  if (shots.length === 0 || sceneDurationInFrames <= 0) return [];

  const totalWords = plannedWordCount(scene, shots);
  const minFrames = Math.max(1, Math.round(MIN_SHOT_SECONDS * fps));

  const starts = shots.map((shot, i) =>
    i === 0 ? 0 : shotStartFrame(shot, scene, totalWords, fps, sceneDurationInFrames)
  );

  const kept: Array<{ shot: ShotItem; from: number }> = [];
  for (let i = 0; i < shots.length; i++) {
    const from = Math.min(Math.max(starts[i], 0), sceneDurationInFrames);
    const prev = kept[kept.length - 1];
    if (prev && from - prev.from < minFrames) continue;
    if (prev && sceneDurationInFrames - from < minFrames) continue;
    kept.push({ shot: shots[i], from });
  }

  return kept.map((entry, i) => {
    const end = i + 1 < kept.length ? kept[i + 1].from : sceneDurationInFrames;
    return { shot: entry.shot, from: entry.from, durationInFrames: end - entry.from };
  });
}
