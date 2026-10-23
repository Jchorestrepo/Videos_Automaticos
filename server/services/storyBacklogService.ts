import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SheetVideoItem, StoryTaskStatus } from '../../src/types/index.ts';
import { PersonaService } from './personaService.ts';
import { SheetsService } from './sheetsService.ts';
import { ProjectService } from './projectService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CHANNELS_DIR = path.resolve(__dirname, '../../channels');

const DEFAULT_ANCIENT_LIVES_STORIES: SheetVideoItem[] = [
  {
    id: 'ancient_case_1',
    channel_id: 'ancient_lives',
    rowIndex: 2,
    title: 'Sobrevivir a 50°C sin Agua Potable: Un Día Real como Obrero en el Antiguo Egipto',
    characterCompany: 'Nekht (Campesino del Nilo) / Antiguo Egipto',
    conflict: 'Cómo lograban los constructores y campesinos egipcios sobrevivir al calor extremo del desierto, las infecciones parasitarias del Nilo y las jornadas extenuantes usando ingeniería doméstica de barro y cerveza espesa.',
    sources: ['Historia National Geographic', 'British Museum Papyrus Archive'],
    status: 'approved',
    approved: true,
    finished: false,
    published: false,
  },
  {
    id: 'ancient_case_2',
    channel_id: 'ancient_lives',
    rowIndex: 3,
    title: 'La Pesadilla de Dormir en la Antigua Roma: Incendios, Insulaes de 7 Pisos y Crimen Nocturno',
    characterCompany: 'Marco (Inquilino de Suburra) / Imperio Romano',
    conflict: 'Más del 90% de los habitantes de Roma vivían hacinados en edificios de madera e adobe a punto de derrumbarse, sin baños ni cocinas, donde caer la noche significaba jugarse la vida.',
    sources: ['Juvenal Satires', 'Archaeology of Roman Insulae'],
    status: 'approved',
    approved: true,
    finished: false,
    published: false,
  },
  {
    id: 'ancient_case_3',
    channel_id: 'ancient_lives',
    rowIndex: 4,
    title: 'El Trabajo Más Peligroso del Mundo Antiguo: Los Buzos de Esponjas y Púrpura de Tiro',
    characterCompany: 'Kallias / Fenicia y Mar Egeo',
    conflict: 'Para producir un solo gramo del tinte más caro de la antigüedad, miles de buzos descendían 30 metros a pulmón libre con piedras atadas al cuerpo y hervían glándulas tóxicas durante semanas.',
    sources: ['Plinio el Viejo - Historia Natural', 'World History Encyclopedia'],
    status: 'idea',
    approved: false,
    finished: false,
    published: false,
  },
  {
    id: 'ancient_case_4',
    channel_id: 'ancient_lives',
    rowIndex: 5,
    title: 'Cirugía Cerebral con Piedra Obsidiana: ¿Cómo Sobrevivían al Dolor en el Imperio Inca?',
    characterCompany: 'Amauta Cirujano / Tahuantinsuyo (Andes)',
    conflict: 'Los cirujanos andinos realizaban trepanaciones craneales con una tasa de supervivencia superior a la de los hospitales de la Guerra Civil estadounidense siglos después.',
    sources: ['Smithsonian Institute of Andean Bioarchaeology', 'Science Magazine'],
    status: 'idea',
    approved: false,
    finished: false,
    published: false,
  },
];

export class StoryBacklogService {
  static getStoriesFilePath(channelId: string): string {
    const dir = path.join(CHANNELS_DIR, channelId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return path.join(dir, 'stories.json');
  }

  private static normalizeTitle(str: string): string {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  static inferStatusFromFlags(item: Partial<SheetVideoItem>): StoryTaskStatus {
    if (item.status) return item.status;
    if (item.published) return 'published';
    if (item.finished) return 'completed';
    if (item.approved) return 'approved';
    return 'idea';
  }

  static syncFlagsFromStatus(status: StoryTaskStatus): {
    approved: boolean;
    finished: boolean;
    published: boolean;
  } {
    switch (status) {
      case 'published':
        return { approved: true, finished: true, published: true };
      case 'completed':
        return { approved: true, finished: true, published: false };
      case 'in_production':
      case 'scripted':
      case 'approved':
        return { approved: true, finished: false, published: false };
      case 'idea':
      default:
        return { approved: false, finished: false, published: false };
    }
  }

  static saveStories(channelId: string, stories: SheetVideoItem[]): void {
    const filePath = this.getStoriesFilePath(channelId);
    fs.writeFileSync(filePath, JSON.stringify(stories, null, 2), 'utf-8');
  }

  static async getStories(channelId: string, forceSheetSync: boolean = false): Promise<SheetVideoItem[]> {
    const filePath = this.getStoriesFilePath(channelId);
    let localStories: SheetVideoItem[] = [];
    const fileExists = fs.existsSync(filePath);

    if (fileExists) {
      try {
        localStories = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } catch (err) {
        console.error(`[StoryBacklog] Error leyendo stories.json de ${channelId}:`, err);
        localStories = [];
      }
    }

    const persona = PersonaService.getPersona(channelId);
    const sheetUrl = persona?.sheets_integration?.sheet_url?.trim();

    // Si tiene Google Sheet configurado y es la primera vez o se pidió sincronizar
    if (sheetUrl && (!fileExists || forceSheetSync)) {
      try {
        const sheetItems = await SheetsService.fetchSheetItems(sheetUrl, channelId);
        const mergedMap = new Map<string, SheetVideoItem>();

        for (const existing of localStories) {
          mergedMap.set(existing.id, existing);
        }

        for (const sItem of sheetItems) {
          // Buscar por ID o por título normalizado
          const normTitle = this.normalizeTitle(sItem.title);
          let match = mergedMap.get(sItem.id);
          if (!match) {
            for (const loc of localStories) {
              if (this.normalizeTitle(loc.title) === normTitle) {
                match = loc;
                break;
              }
            }
          }

          if (match) {
            // Conservar el estado avanzado local, pero actualizar textos o fuentes si cambiaron en el Sheet
            const sheetStatus = this.inferStatusFromFlags(sItem);
            const currentStatus = match.status || this.inferStatusFromFlags(match);
            const statusRank: Record<StoryTaskStatus, number> = {
              idea: 0,
              approved: 1,
              scripted: 2,
              in_production: 3,
              completed: 4,
              published: 5,
            };
            const bestStatus =
              statusRank[sheetStatus] > statusRank[currentStatus] ? sheetStatus : currentStatus;
            const flags = this.syncFlagsFromStatus(bestStatus);

            const updated: SheetVideoItem = {
              ...match,
              rowIndex: sItem.rowIndex ?? match.rowIndex,
              title: sItem.title || match.title,
              characterCompany: sItem.characterCompany || match.characterCompany,
              conflict: sItem.conflict || match.conflict,
              sources: sItem.sources?.length ? sItem.sources : match.sources,
              channel_id: channelId,
              status: bestStatus,
              ...flags,
              archived:
                match.archived !== undefined
                  ? match.archived
                  : sItem.published === true || bestStatus === 'published',
              updatedAt: new Date().toISOString(),
            };
            mergedMap.set(match.id, updated);
          } else {
            const initStatus = this.inferStatusFromFlags(sItem);
            const flags = this.syncFlagsFromStatus(initStatus);
            mergedMap.set(sItem.id, {
              ...sItem,
              channel_id: channelId,
              status: initStatus,
              ...flags,
              archived:
                sItem.archived !== undefined
                  ? sItem.archived
                  : sItem.published === true || initStatus === 'published',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        }

        localStories = Array.from(mergedMap.values());
      } catch (err) {
        console.warn(`[StoryBacklog] No se pudo sincronizar Sheet para ${channelId}:`, err);
      }
    } else if (!fileExists && channelId === 'ancient_lives') {
      localStories = DEFAULT_ANCIENT_LIVES_STORIES.map((s) => ({
        ...s,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    }

    // Cruzar automáticamente con los proyectos existentes de este canal para saber qué videos ya tienen guion, audio, imágenes o MP4
    const channelProjects = ProjectService.listProjects(channelId);
    let changed = !fileExists || forceSheetSync;

    for (const story of localStories) {
      story.channel_id = channelId;
      if (!story.status) {
        story.status = this.inferStatusFromFlags(story);
      }

      const normStoryTitle = this.normalizeTitle(story.title);
      const matchingProjects = channelProjects.filter((p) => {
        if (p.story_id && p.story_id === story.id) return true;
        if (story.linkedProjectId && p.project_id === story.linkedProjectId) return true;
        const normProjTitle = this.normalizeTitle(p.title);
        if (!normStoryTitle || !normProjTitle) return false;
        const prefixLen = Math.min(28, normStoryTitle.length, normProjTitle.length);
        return (
          prefixLen >= 10 &&
          (normProjTitle.includes(normStoryTitle.slice(0, prefixLen)) ||
            normStoryTitle.includes(normProjTitle.slice(0, prefixLen)))
        );
      });

      if (matchingProjects.length > 0) {
        // Priorizar el proyecto más avanzado (rendered > images > audio > más reciente)
        const rankProject = (p: (typeof channelProjects)[0]) => {
          if (p.outputVideoUrl || p.status === 'rendered') return 4;
          const imgCount = p.scenes.filter((s) => Boolean(s.imageUrl)).length;
          const audCount = p.scenes.filter((s) => Boolean(s.audioUrl)).length;
          if (imgCount > 0 && audCount > 0) return 3;
          if (imgCount > 0 || audCount > 0) return 2;
          return 1;
        };

        matchingProjects.sort((a, b) => {
          const rDiff = rankProject(b) - rankProject(a);
          if (rDiff !== 0) return rDiff;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        const bestProj = matchingProjects[0];
        if (story.linkedProjectId !== bestProj.project_id) {
          story.linkedProjectId = bestProj.project_id;
          changed = true;
        }
        if (bestProj.story_id !== story.id) {
          bestProj.story_id = story.id;
          ProjectService.saveProject(bestProj);
        }

        // Actualizar estado automáticamente según progreso real del proyecto (respetando si ya estaba marcado como 'published' o 'completed')
        const pRank = rankProject(bestProj);
        let inferredStatus: StoryTaskStatus = 'scripted';
        if (pRank === 4) inferredStatus = 'completed';
        else if (pRank >= 2) inferredStatus = 'in_production';

        if (story.status !== 'published') {
          if (inferredStatus === 'completed' && story.status !== 'completed') {
            story.status = 'completed';
            Object.assign(story, this.syncFlagsFromStatus('completed'));
            changed = true;
          } else if (
            inferredStatus === 'in_production' &&
            (story.status === 'idea' || story.status === 'approved' || story.status === 'scripted')
          ) {
            story.status = 'in_production';
            Object.assign(story, this.syncFlagsFromStatus('in_production'));
            changed = true;
          } else if (
            inferredStatus === 'scripted' &&
            (story.status === 'idea' || story.status === 'approved')
          ) {
            story.status = 'scripted';
            Object.assign(story, this.syncFlagsFromStatus('scripted'));
            changed = true;
          }
        }
      } else if (story.linkedProjectId) {
        // El proyecto vinculado fue eliminado
        story.linkedProjectId = undefined;
        if (story.status === 'scripted' || story.status === 'in_production') {
          story.status = 'approved';
          Object.assign(story, this.syncFlagsFromStatus('approved'));
        }
        changed = true;
      }
    }

    if (changed) {
      this.saveStories(channelId, localStories);
    }

    return localStories;
  }

  static async createStory(
    channelId: string,
    data: {
      title: string;
      characterCompany?: string;
      conflict?: string;
      sources?: string[];
      status?: StoryTaskStatus;
      notes?: string;
    }
  ): Promise<SheetVideoItem> {
    const stories = await this.getStories(channelId, false);
    const status: StoryTaskStatus = data.status || 'approved';
    const flags = this.syncFlagsFromStatus(status);
    const now = new Date().toISOString();

    const newItem: SheetVideoItem = {
      id: `story_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      channel_id: channelId,
      rowIndex: stories.length + 2,
      title: data.title.trim(),
      characterCompany: (data.characterCompany || 'Protagonista').trim(),
      conflict: (data.conflict || data.title).trim(),
      sources: data.sources || [],
      status,
      ...flags,
      archived: false,
      notes: data.notes,
      createdAt: now,
      updatedAt: now,
    };

    const updated = [newItem, ...stories];
    this.saveStories(channelId, updated);
    return newItem;
  }

  static async updateStory(
    channelId: string,
    storyId: string,
    patch: Partial<SheetVideoItem>
  ): Promise<SheetVideoItem | null> {
    const stories = await this.getStories(channelId, false);
    const idx = stories.findIndex((s) => s.id === storyId);
    if (idx === -1) return null;

    const current = stories[idx];
    let nextStatus: StoryTaskStatus = patch.status || current.status || 'idea';

    // Si se cambiaron flags booleanos explícitamente sin pasar status
    if (!patch.status) {
      if (patch.published === true) nextStatus = 'published';
      else if (patch.finished === true) nextStatus = 'completed';
      else if (patch.finished === false && current.status === 'completed') {
        nextStatus = current.linkedProjectId ? 'in_production' : 'approved';
      } else if (patch.approved === true && current.status === 'idea') {
        nextStatus = 'approved';
      } else if (patch.approved === false) {
        nextStatus = 'idea';
      }
    }

    const flags = this.syncFlagsFromStatus(nextStatus);
    const isArchived =
      patch.archived !== undefined
        ? patch.archived
        : patch.published === true || nextStatus === 'published'
        ? true
        : current.archived ?? false;

    const updatedItem: SheetVideoItem = {
      ...current,
      ...patch,
      id: current.id,
      channel_id: channelId,
      status: nextStatus,
      ...flags,
      archived: isArchived,
      updatedAt: new Date().toISOString(),
    };

    stories[idx] = updatedItem;
    this.saveStories(channelId, stories);
    return updatedItem;
  }

  static async deleteStory(channelId: string, storyId: string): Promise<boolean> {
    const stories = await this.getStories(channelId, false);
    const filtered = stories.filter((s) => s.id !== storyId);
    if (filtered.length === stories.length) return false;
    this.saveStories(channelId, filtered);
    return true;
  }
}
