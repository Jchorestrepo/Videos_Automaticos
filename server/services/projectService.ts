import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ProjectScript } from '../../src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_DIR = path.resolve(__dirname, '../../storage/projects');

export class ProjectService {
  static saveProject(project: ProjectScript): void {
    const projectDir = path.join(STORAGE_DIR, project.project_id);
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }
    project.updatedAt = new Date().toISOString();
    const filePath = path.join(projectDir, 'script.json');
    fs.writeFileSync(filePath, JSON.stringify(project, null, 2), 'utf-8');
  }

  static getProject(projectId: string): ProjectScript | null {
    const filePath = path.join(STORAGE_DIR, projectId, 'script.json');
    if (!fs.existsSync(filePath)) {
      return null;
    }
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as ProjectScript;
    } catch (err) {
      console.error(`Error loading project ${projectId}:`, err);
      return null;
    }
  }

  static listProjects(): ProjectScript[] {
    if (!fs.existsSync(STORAGE_DIR)) {
      return [];
    }
    const dirs = fs.readdirSync(STORAGE_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    const projects: ProjectScript[] = [];
    for (const dir of dirs) {
      const p = this.getProject(dir);
      if (p) {
        projects.push(p);
      }
    }
    return projects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Crea un nuevo proyecto reutilizando la voz (archivos MP3 + wordTimings + duraciones)
   * de un proyecto existente, limpiando las imágenes y el render para crear otro video.
   */
  static forkProjectWithVoice(sourceProjectId: string, customTitle?: string): ProjectScript | null {
    const source = this.getProject(sourceProjectId);
    if (!source) return null;

    const newProjectId = `proj_${Date.now()}`;
    const newProjectDir = path.join(STORAGE_DIR, newProjectId);
    const newAudioDir = path.join(newProjectDir, 'audio');
    fs.mkdirSync(newAudioDir, { recursive: true });

    const sourceAudioDir = path.join(STORAGE_DIR, sourceProjectId, 'audio');
    if (fs.existsSync(sourceAudioDir)) {
      const audioFiles = fs.readdirSync(sourceAudioDir);
      for (const file of audioFiles) {
        const srcFile = path.join(sourceAudioDir, file);
        const destFile = path.join(newAudioDir, file);
        if (fs.statSync(srcFile).isFile()) {
          fs.copyFileSync(srcFile, destFile);
        }
      }
    }

    const forkedScenes = source.scenes.map((scene) => {
      const expectedFile = `scene_${scene.scene_id}.mp3`;
      const hasCopiedAudio = fs.existsSync(path.join(newAudioDir, expectedFile));
      return {
        ...scene,
        imageUrl: undefined,
        audioUrl: hasCopiedAudio
          ? `/storage/${newProjectId}/audio/${expectedFile}`
          : scene.audioUrl
          ? scene.audioUrl.replace(sourceProjectId, newProjectId)
          : undefined,
      };
    });

    const nowIso = new Date().toISOString();
    const forkedProject: ProjectScript = {
      ...source,
      project_id: newProjectId,
      title: customTitle || `${source.title} (Nuevo Video • Misma Voz)`,
      scenes: forkedScenes,
      status: 'audio_ready',
      createdAt: nowIso,
      updatedAt: nowIso,
      parent_project_id: sourceProjectId,
      fork_type: 'voice_only',
      outputVideoUrl: undefined,
      thumbnailUrl: undefined,
    };

    this.saveProject(forkedProject);
    return forkedProject;
  }

  /**
   * Duplica solo el guion y el dossier de investigación para trabajar una nueva versión desde cero.
   */
  static forkProjectScriptOnly(sourceProjectId: string, customTitle?: string): ProjectScript | null {
    const source = this.getProject(sourceProjectId);
    if (!source) return null;

    const newProjectId = `proj_${Date.now()}`;
    const nowIso = new Date().toISOString();

    const forkedScenes = source.scenes.map((scene) => ({
      ...scene,
      imageUrl: undefined,
      audioUrl: undefined,
      wordTimings: undefined,
    }));

    const forkedProject: ProjectScript = {
      ...source,
      project_id: newProjectId,
      title: customTitle || `${source.title} (Copia de Guion)`,
      scenes: forkedScenes,
      status: 'characters_ready',
      createdAt: nowIso,
      updatedAt: nowIso,
      parent_project_id: sourceProjectId,
      fork_type: 'script_only',
      outputVideoUrl: undefined,
      thumbnailUrl: undefined,
    };

    this.saveProject(forkedProject);
    return forkedProject;
  }

  static deleteProject(projectId: string): boolean {
    const projectDir = path.join(STORAGE_DIR, projectId);
    if (!fs.existsSync(projectDir)) return false;
    fs.rmSync(projectDir, { recursive: true, force: true });
    return true;
  }
}
