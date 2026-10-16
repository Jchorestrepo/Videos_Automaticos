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
}
