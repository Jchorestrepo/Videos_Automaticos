import React, { useState } from 'react';
import {
  Table,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Bot,
  Plus,
  CheckCircle2,
  FolderOpen,
  Trash2,
  Search,
  Settings,
  FileText,
  Mic,
  Image as ImageIcon,
  Film,
  ClipboardList,
  Clock,
  Rocket,
  Archive,
  ArchiveRestore,
  Youtube,
} from 'lucide-react';
import type {
  ChannelPersona,
  SheetVideoItem,
  ProjectScript,
  StoryTaskStatus,
  DurationRange,
} from '../types/index.ts';

const DURATION_STORAGE_KEY = 'yt_studio_preferred_duration';

const getStoredDurationRange = (): DurationRange => {
  try {
    const saved = localStorage.getItem(DURATION_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (typeof parsed?.min === 'number' && typeof parsed?.max === 'number') {
        const min = Math.min(Math.max(parsed.min, 3), 30);
        const max = Math.min(Math.max(parsed.max, min), 30);
        return { min, max };
      }
    }
  } catch {
    // fallback
  }
  return { min: 10, max: 14 };
};

interface ChannelBacklogBoardProps {
  channel: ChannelPersona;
  stories: SheetVideoItem[];
  loadingStories: boolean;
  channelProjects: ProjectScript[];
  channelCharactersCount: number;
  isGeneratingScript: boolean;
  customTopic: string;
  onCustomTopicChange: (val: string) => void;
  onSyncSheet: () => void;
  onGenerateScript: (
    item?: SheetVideoItem,
    directTopic?: string,
    durationRange?: DurationRange
  ) => void;
  onOpenProject: (project: ProjectScript) => void;
  onUpdateStory?: (storyId: string, patch: Partial<SheetVideoItem>) => void;
  onUpdateStoryStatus: (storyId: string, newStatus: StoryTaskStatus) => void;
  onCreateManualStory: (story: {
    title: string;
    characterCompany: string;
    conflict: string;
    sources: string[];
    status: StoryTaskStatus;
  }) => Promise<void>;
  onDeleteStory: (storyId: string) => void;
  onOpenChannelSettings: () => void;
}

const STATUS_META: Record<
  StoryTaskStatus,
  { label: string; badgeClass: string; dotColor: string }
> = {
  idea: {
    label: '💡 Idea en Evaluación',
    badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
    dotColor: 'bg-slate-400',
  },
  approved: {
    label: '📋 Por Hacer (Aprobado)',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    dotColor: 'bg-amber-400',
  },
  scripted: {
    label: '📝 Guion Listo',
    badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    dotColor: 'bg-blue-400',
  },
  in_production: {
    label: '🎨 En Producción',
    badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    dotColor: 'bg-purple-400',
  },
  completed: {
    label: '✅ Completado / Hecho',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    dotColor: 'bg-emerald-400',
  },
  published: {
    label: '🚀 Publicado en YouTube',
    badgeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    dotColor: 'bg-indigo-400',
  },
};

export const ChannelBacklogBoard: React.FC<ChannelBacklogBoardProps> = ({
  channel,
  stories,
  loadingStories,
  channelProjects,
  channelCharactersCount,
  isGeneratingScript,
  customTopic,
  onCustomTopicChange,
  onSyncSheet,
  onGenerateScript,
  onOpenProject,
  onUpdateStory,
  onUpdateStoryStatus,
  onCreateManualStory,
  onDeleteStory,
  onOpenChannelSettings,
}) => {
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'pending' | 'production' | 'done' | 'published' | 'archived'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [durationRange, setDurationRange] = useState<DurationRange>(getStoredDurationRange);

  const updateDurationRange = (field: keyof DurationRange, rawValue: string) => {
    const value = Math.min(Math.max(Number(rawValue) || 1, 3), 30);
    setDurationRange((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'min' && next.max < value) next.max = value;
      if (field === 'max' && next.min > value) next.min = value;
      try {
        localStorage.setItem(DURATION_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };
  const [showNewStoryModal, setShowNewStoryModal] = useState(false);

  // Manejo de cambio en checkbox 'Subido a YouTube' (auto-archiva y actualiza estado)
  const handleToggleUploadedToYoutube = (item: SheetVideoItem, isUploaded: boolean) => {
    if (onUpdateStory) {
      if (isUploaded) {
        onUpdateStory(item.id, {
          published: true,
          status: 'published',
          archived: true,
        });
      } else {
        const fallbackStatus: StoryTaskStatus = item.linkedProjectId ? 'completed' : 'approved';
        onUpdateStory(item.id, {
          published: false,
          status: fallbackStatus,
          archived: false,
        });
      }
    } else {
      onUpdateStoryStatus(item.id, isUploaded ? 'published' : 'completed');
    }
  };

  const handleStatusChange = (item: SheetVideoItem, newStatus: StoryTaskStatus) => {
    if (newStatus === 'published') {
      if (onUpdateStory) {
        onUpdateStory(item.id, {
          status: 'published',
          published: true,
          archived: true,
        });
      } else {
        onUpdateStoryStatus(item.id, newStatus);
      }
    } else {
      if (onUpdateStory) {
        onUpdateStory(item.id, {
          status: newStatus,
          published: false,
          archived: false,
        });
      } else {
        onUpdateStoryStatus(item.id, newStatus);
      }
    }
  };

  // Campos para agregar nueva tarea/historia manual
  const [newTitle, setNewTitle] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newConflict, setNewConflict] = useState('');
  const [newSources, setNewSources] = useState('');
  const [newStatus, setNewStatus] = useState<StoryTaskStatus>('approved');
  const [creatingStory, setCreatingStory] = useState(false);

  // Encontrar el proyecto vinculado a una historia
  const findLinkedProject = (item: SheetVideoItem): ProjectScript | undefined => {
    if (item.linkedProjectId) {
      const exact = channelProjects.find((p) => p.project_id === item.linkedProjectId);
      if (exact) return exact;
    }
    const normTitle = (item.title || '').toLowerCase().trim();
    const normChar = (item.characterCompany || '').toLowerCase().trim();
    return channelProjects.find((p) => {
      if (p.story_id === item.id) return true;
      const pTitle = (p.title || '').toLowerCase().trim();
      const pChar = (p.characterCompany || '').toLowerCase().trim();
      return (
        (normTitle && pTitle === normTitle) ||
        (normChar.length > 3 && pChar.includes(normChar))
      );
    });
  };

  // Estadísticas rápidas del canal (discriminando activas vs archivadas)
  const activeStories = stories.filter((s) => !s.archived);
  const archivedStories = stories.filter((s) => Boolean(s.archived));

  const counts = {
    all: activeStories.length,
    pending: activeStories.filter(
      (s) => (s.status || 'approved') === 'idea' || (s.status || 'approved') === 'approved'
    ).length,
    production: activeStories.filter(
      (s) => s.status === 'scripted' || s.status === 'in_production'
    ).length,
    done: activeStories.filter((s) => s.status === 'completed' || s.finished).length,
    published: activeStories.filter((s) => s.status === 'published').length,
    archived: archivedStories.length,
  };

  const filteredStories = stories.filter((item) => {
    if (statusFilter === 'archived') {
      if (!item.archived) return false;
    } else {
      if (item.archived) return false;

      const st: StoryTaskStatus =
        item.status || (item.finished ? 'completed' : item.approved ? 'approved' : 'idea');

      if (statusFilter === 'pending' && st !== 'idea' && st !== 'approved') return false;
      if (statusFilter === 'production' && st !== 'scripted' && st !== 'in_production')
        return false;
      if (statusFilter === 'done' && st !== 'completed') return false;
      if (statusFilter === 'published' && st !== 'published') return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchChar = (item.characterCompany || '').toLowerCase().includes(q);
      const matchConflict = (item.conflict || '').toLowerCase().includes(q);
      if (!matchTitle && !matchChar && !matchConflict) return false;
    }

    return true;
  });

  const handleAddStorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreatingStory(true);
    try {
      await onCreateManualStory({
        title: newTitle.trim(),
        characterCompany: newCompany.trim() || 'Protagonista',
        conflict: newConflict.trim(),
        sources: newSources
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        status: newStatus,
      });
      setNewTitle('');
      setNewCompany('');
      setNewConflict('');
      setNewSources('');
      setShowNewStoryModal(false);
    } finally {
      setCreatingStory(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Banner de Identidad del Canal Activo */}
      <div className="bg-gradient-to-r from-slate-900 via-[#11192e] to-slate-900 border border-slate-700/70 p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs uppercase font-bold tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
              Canal Activo • {channel.display_title}
            </span>
            <span className="text-xs text-slate-400">
              CPM:{' '}
              <strong className="text-emerald-400">{channel.cpm_tier}</strong>
            </span>
            <span className="text-xs text-slate-400">
              Personajes del Canal:{' '}
              <strong className="text-purple-400">{channelCharactersCount}</strong>
            </span>
            <span className="text-xs text-slate-400">
              Proyectos Creados:{' '}
              <strong className="text-blue-400">{channelProjects.length}</strong>
            </span>
          </div>

          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            {channel.narrator.archetype}
            <span className="text-xs font-normal text-slate-400">
              ({channel.narrator.target_wpm} palabras/min)
            </span>
          </h2>
          <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
            {channel.narrator.tone}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenChannelSettings}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center gap-2 transition"
          >
            <Settings className="w-4 h-4 text-blue-400" />
            Configurar Canal / Google Sheet
          </button>
        </div>
      </div>

      {/* 2. Barra de Generación Rápida o Nueva Tarea */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-9 bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl flex flex-wrap sm:flex-nowrap items-center gap-3">
          <input
            type="text"
            placeholder={`Escribe un tema directo para ${channel.name} (ej: ¿Cómo colapsó un imperio en 24 horas?)...`}
            value={customTopic}
            onChange={(e) => onCustomTopicChange(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <div
            className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 shrink-0"
            title="Duración objetivo del video (también se usa al adaptar a inglés)"
          >
            <span className="text-[11px] text-slate-400">Duración</span>
            <input
              type="number"
              min={3}
              max={30}
              value={durationRange.min}
              onChange={(e) => updateDurationRange('min', e.target.value)}
              className="w-12 bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-white text-center focus:outline-none focus:border-blue-500"
            />
            <span className="text-[11px] text-slate-500">–</span>
            <input
              type="number"
              min={3}
              max={30}
              value={durationRange.max}
              onChange={(e) => updateDurationRange('max', e.target.value)}
              className="w-12 bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-white text-center focus:outline-none focus:border-blue-500"
            />
            <span className="text-[11px] text-slate-400">min</span>
          </div>
          <button
            disabled={!customTopic.trim() || isGeneratingScript}
            onClick={() => onGenerateScript(undefined, customTopic, durationRange)}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm px-5 py-2.5 rounded-lg flex items-center gap-2 transition disabled:opacity-50 shrink-0 shadow-md shadow-blue-600/20"
          >
            {isGeneratingScript ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Generar Guion Ahora
          </button>
        </div>

        <div className="lg:col-span-3 flex items-stretch">
          <button
            onClick={() => setShowNewStoryModal(!showNewStoryModal)}
            className="w-full bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-bold text-xs px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            Nueva Tarea / Idea en Backlog
          </button>
        </div>
      </div>

      {/* Formulario Desplegable para Agregar Nueva Tarea/Historia al Backlog del Canal */}
      {showNewStoryModal && (
        <form
          onSubmit={handleAddStorySubmit}
          className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-5 space-y-4 shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-emerald-400" />
              Agregar Nueva Historia / Video Pendiente a "{channel.display_title}"
            </h4>
            <button
              type="button"
              onClick={() => setShowNewStoryModal(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕ Cerrar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="md:col-span-2">
              <label className="text-slate-300 font-semibold block mb-1">
                Título o Pregunta del Video *
              </label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ej: La caída secreta de WeWork y Adam Neumann..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">
                Protagonista / Empresa / Época
              </label>
              <input
                type="text"
                value={newCompany}
                onChange={(e) => setNewCompany(e.target.value)}
                placeholder="Ej: Adam Neumann - WeWork"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="md:col-span-2">
              <label className="text-slate-300 font-semibold block mb-1">
                Conflicto Central / Enfoque Documental
              </label>
              <textarea
                rows={2}
                value={newConflict}
                onChange={(e) => setNewConflict(e.target.value)}
                placeholder="Resumen de qué trata el caso, cifras clave o el giro dramático..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Estado Inicial de la Tarea
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as StoryTaskStatus)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none"
                >
                  <option value="approved">📋 Por Hacer / Aprobado</option>
                  <option value="idea">💡 Idea en Evaluación</option>
                  <option value="completed">✅ Completado / Hecho</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={creatingStory}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition shadow-md"
              >
                <Plus className="w-4 h-4" />
                {creatingStory ? 'Guardando...' : 'Guardar en Lista de Tareas'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* 3. Tablero de Control de Tareas y Estados (Para saber qué video ya hiciste y cuál está pendiente) */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl">
          {/* Pestañas de Estado con Contadores */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: `Todas Activas (${counts.all})`, icon: Table },
              {
                id: 'pending',
                label: `📋 Pendientes (${counts.pending})`,
                icon: Clock,
              },
              {
                id: 'production',
                label: `🎨 En Producción (${counts.production})`,
                icon: Film,
              },
              {
                id: 'done',
                label: `✅ Completados (${counts.done})`,
                icon: CheckCircle2,
              },
              {
                id: 'published',
                label: `🚀 Publicados (${counts.published})`,
                icon: Rocket,
              },
              {
                id: 'archived',
                label: `📦 Archivados (${counts.archived})`,
                icon: Archive,
              },
            ].map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                    active
                      ? tab.id === 'archived'
                        ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                        : 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Buscador + Botón Sincronizar Google Sheets */}
          <div className="flex items-center gap-2.5 ml-auto">
            <div className="relative w-52">
              <input
                type="text"
                placeholder="Buscar historia o caso..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
            </div>

            {channel.sheets_integration?.sheet_url && (
              <button
                onClick={onSyncSheet}
                disabled={loadingStories}
                className="text-xs text-emerald-300 hover:text-white flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg border border-emerald-500/30 font-semibold transition"
                title="Importa nuevas filas desde tu Google Sheet conservando tus estados locales"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${loadingStories ? 'animate-spin' : ''}`}
                />
                Sincronizar Sheet
              </button>
            )}
          </div>
        </div>

        {/* Lista de Tarjetas de Historias / Tareas */}
        {loadingStories ? (
          <div className="text-center py-12 text-slate-400 text-sm flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
            <span>Cargando historias y tareas del canal {channel.display_title}...</span>
          </div>
        ) : filteredStories.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-2">
            <p className="text-sm font-semibold text-slate-300">
              {statusFilter === 'archived'
                ? 'No hay historias archivadas.'
                : `No hay historias en esta vista (${statusFilter}).`}
            </p>
            <p className="text-xs text-slate-500 max-w-lg mx-auto">
              {statusFilter === 'archived'
                ? 'Cuando marques el check "Subido a YouTube" en una historia, se archivará automáticamente para despejar tu lista activa y aparecerá aquí.'
                : 'Cambia el filtro superior o haz clic en "+ Nueva Tarea / Idea en Backlog" para añadir una historia a este canal.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredStories.map((item) => {
              const linkedProject = findLinkedProject(item);
              const currentStatus: StoryTaskStatus =
                item.status ||
                (item.finished ? 'completed' : item.approved ? 'approved' : 'idea');
              const meta = STATUS_META[currentStatus] || STATUS_META.approved;

              const audioDone = linkedProject
                ? linkedProject.scenes.filter((s) => Boolean(s.audioUrl)).length
                : 0;
              const imgDone = linkedProject
                ? linkedProject.scenes.filter((s) => Boolean(s.imageUrl)).length
                : 0;
              const totalScenes = linkedProject ? linkedProject.scenes.length : 0;
              const hasRenderedMp4 = Boolean(linkedProject?.outputVideoUrl);

              const isUploadedToYoutube = Boolean(item.archived || currentStatus === 'published' || item.published);

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-4 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                    item.archived
                      ? 'bg-amber-950/10 border-amber-500/25 hover:border-amber-500/40 opacity-90'
                      : currentStatus === 'completed' || currentStatus === 'published'
                      ? 'bg-emerald-950/10 border-emerald-500/30 hover:border-emerald-500/50'
                      : linkedProject
                      ? 'bg-slate-900/90 border-blue-500/30 hover:border-blue-500/50'
                      : 'bg-[#0f172a]/80 hover:bg-[#0f172a] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Columna Izquierda: Información de la Historia + Progreso real */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 rounded">
                        {item.characterCompany || channel.name}
                      </span>

                      {/* Selector directo de Estado */}
                      <select
                        value={currentStatus}
                        onChange={(e) =>
                          handleStatusChange(item, e.target.value as StoryTaskStatus)
                        }
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg border cursor-pointer focus:outline-none ${meta.badgeClass}`}
                        title="Cambia el estado de esta historia para llevar control de qué videos ya hiciste y cuáles faltan"
                      >
                        <option value="idea" className="bg-slate-900 text-slate-200">
                          💡 Idea en Evaluación
                        </option>
                        <option value="approved" className="bg-slate-900 text-amber-300">
                          📋 Por Hacer (Aprobado)
                        </option>
                        <option value="scripted" className="bg-slate-900 text-blue-300">
                          📝 Guion Creado
                        </option>
                        <option value="in_production" className="bg-slate-900 text-purple-300">
                          🎨 En Producción (Voz/Imágenes)
                        </option>
                        <option value="completed" className="bg-slate-900 text-emerald-300">
                          ✅ Completado / Video Hecho
                        </option>
                        <option value="published" className="bg-slate-900 text-indigo-300">
                          🚀 Publicado en YouTube
                        </option>
                      </select>

                      {/* Checkbox 'Subido a YouTube' (Archiva automáticamente al marcarlo) */}
                      <label
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition select-none ${
                          isUploadedToYoutube
                            ? 'bg-red-500/15 border-red-500/40 text-red-300 hover:bg-red-500/25 shadow-sm shadow-red-500/10'
                            : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                        }`}
                        title={
                          item.archived
                            ? 'Subido a YouTube (Archivado). Haz clic para desmarcar y restaurar a la lista activa.'
                            : 'Marcar como Subido a YouTube y archivar de la lista activa.'
                        }
                      >
                        <input
                          type="checkbox"
                          checked={isUploadedToYoutube}
                          onChange={(e) => handleToggleUploadedToYoutube(item, e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-red-600 focus:ring-red-500 focus:ring-offset-0 cursor-pointer"
                        />
                        <Youtube className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span>Subido a YouTube</span>
                      </label>

                      {/* Indicador de Archivado */}
                      {item.archived && (
                        <span className="text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded flex items-center gap-1">
                          <Archive className="w-3 h-3 text-amber-400" />
                          Archivado
                        </span>
                      )}

                      {/* Píldoras de Progreso del Proyecto Vinculado */}
                      {linkedProject && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-mono bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            Guion ({totalScenes} esc)
                          </span>
                          <span
                            className={`text-[11px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${
                              audioDone === totalScenes && totalScenes > 0
                                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                : 'bg-slate-950 text-slate-400 border-slate-800'
                            }`}
                          >
                            <Mic className="w-3 h-3" />
                            Voz {audioDone}/{totalScenes}
                          </span>
                          <span
                            className={`text-[11px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${
                              imgDone === totalScenes && totalScenes > 0
                                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                : 'bg-slate-950 text-slate-400 border-slate-800'
                            }`}
                          >
                            <ImageIcon className="w-3 h-3" />
                            Img {imgDone}/{totalScenes}
                          </span>
                          {hasRenderedMp4 && (
                            <span className="text-[11px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded flex items-center gap-1 shadow">
                              <Film className="w-3 h-3" />
                              MP4 Listo
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <h4
                      className={`text-sm font-bold leading-snug ${
                        currentStatus === 'completed' || currentStatus === 'published'
                          ? 'text-emerald-200'
                          : 'text-white'
                      }`}
                    >
                      {item.title}
                    </h4>

                    {item.conflict && (
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {item.conflict}
                      </p>
                    )}

                    {item.sources && item.sources.length > 0 && (
                      <div className="flex items-center gap-3 pt-0.5 flex-wrap">
                        {item.sources.map((src, sIdx) => (
                          <a
                            key={sIdx}
                            href={src}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-blue-400/80 hover:text-blue-300 flex items-center gap-1 truncate max-w-[220px]"
                          >
                            Fuente {sIdx + 1} <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Columna Derecha: Botones de Acción (Abrir Proyecto Existente o Generar Guion) */}
                  <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
                    {linkedProject ? (
                      <>
                        <button
                          onClick={() => onOpenProject(linkedProject)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 transition shadow-lg shadow-emerald-600/20"
                        >
                          <FolderOpen className="w-4 h-4" />
                          Abrir Proyecto ({linkedProject.project_id.slice(0, 12)})
                        </button>

                        <button
                          disabled={isGeneratingScript}
                          onClick={() => onGenerateScript(item, undefined, durationRange)}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold text-xs px-3 py-2.5 rounded-xl flex items-center gap-1.5 transition disabled:opacity-50"
                          title="Crear otra versión de guion desde cero para esta historia"
                        >
                          <Bot className="w-3.5 h-3.5 text-blue-400" />
                          Nuevo Guion
                        </button>
                      </>
                    ) : (
                      <button
                        disabled={isGeneratingScript}
                        onClick={() => onGenerateScript(item, undefined, durationRange)}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 transition shadow-md shadow-blue-500/10 disabled:opacity-50"
                      >
                        {isGeneratingScript ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Bot className="w-3.5 h-3.5" />
                        )}
                        Generar Guion
                      </button>
                    )}

                    {/* Si está archivada, botón para restaurar al backlog activo */}
                    {item.archived && (
                      <button
                        onClick={() => handleToggleUploadedToYoutube(item, false)}
                        className="bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-semibold text-xs px-3 py-2.5 rounded-xl flex items-center gap-1.5 transition shadow-sm"
                        title="Desarchivar esta historia y devolverla a la lista activa"
                      >
                        <ArchiveRestore className="w-3.5 h-3.5 text-amber-400" />
                        Restaurar
                      </button>
                    )}

                    {/* Botón rápido para marcar como Hecho / Pendiente */}
                    <button
                      onClick={() =>
                        handleStatusChange(
                          item,
                          currentStatus === 'completed' ? 'approved' : 'completed'
                        )
                      }
                      className={`p-2 rounded-xl border transition ${
                        currentStatus === 'completed'
                          ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30'
                      }`}
                      title={
                        currentStatus === 'completed'
                          ? 'Marcar de nuevo como pendiente'
                          : 'Marcar como Video Completado / Hecho'
                      }
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onDeleteStory(item.id)}
                      className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-rose-400 hover:border-rose-500/30 transition"
                      title="Eliminar tarea del backlog"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
