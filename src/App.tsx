import React, { useState, useEffect } from 'react';
import { Player } from '@remotion/player';
import {
  Film,
  Sparkles,
  Layers,
  Image as ImageIcon,
  Play,
  Download,
  Table,
  CheckCircle2,
  RefreshCw,
  Sliders,
  ChevronRight,
  ExternalLink,
  Edit3,
  Bot,
  Zap,
  AlertCircle,
  Users,
  User,
  Save,
  Sun,
  Moon,
  Flame,
  Shield,
  BookmarkCheck,
  Mic,
  Volume2,
  Music,
} from 'lucide-react';
import type {
  ChannelPersona,
  SheetVideoItem,
  ProjectScript,
  SceneItem,
  CharacterProfile,
} from './types/index.ts';
import { DocumentaryVideo } from './remotion/DocumentaryVideo.tsx';

interface ActLightingRule {
  act_number: number;
  act_name: string;
  emotional_tone: string;
  lighting_prompt: string;
  camera_composition: string;
  expression_prompt: string;
}

export default function App() {
  const [channels, setChannels] = useState<ChannelPersona[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<ChannelPersona | null>(null);
  const [channelCharacters, setChannelCharacters] = useState<CharacterProfile[]>([]);
  const [visualArcRules, setVisualArcRules] = useState<ActLightingRule[]>([]);
  const [sheetItems, setSheetItems] = useState<SheetVideoItem[]>([]);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [currentProject, setCurrentProject] = useState<ProjectScript | null>(null);
  const [activeStep, setActiveStep] = useState<number>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [autonomousMode, setAutonomousMode] = useState(false);
  const [customTopic, setCustomTopic] = useState('');
  const [configStatus, setConfigStatus] = useState<any>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // 0. Comprobar proveedores configurados en .env
  const checkConfigStatus = () => {
    fetch('/api/config/status')
      .then((res) => res.json())
      .then((data) => setConfigStatus(data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    checkConfigStatus();
    loadVisualArcRules();
    loadLatestProject();
  }, []);

  // Cargar el proyecto más reciente si existe
  const loadLatestProject = () => {
    fetch('/api/projects')
      .then((res) => res.json())
      .then((projects: ProjectScript[]) => {
        if (projects && projects.length > 0) {
          const latest = projects[projects.length - 1];
          setCurrentProject(latest);
        }
      })
      .catch(console.error);
  };

  // Cargar reglas de arco visual
  const loadVisualArcRules = () => {
    fetch('/api/visual-arc/rules')
      .then((res) => res.json())
      .then((data) => setVisualArcRules(data))
      .catch((err) => console.error('Error cargando reglas de arco visual:', err));
  };

  // 1. Cargar canales al inicio
  useEffect(() => {
    fetch('/api/channels')
      .then((res) => res.json())
      .then((data: ChannelPersona[]) => {
        setChannels(data);
        if (data.length > 0) {
          setSelectedChannel(data[0]);
        }
      })
      .catch((err) => console.error('Error cargando canales:', err));
  }, []);

  // Cargar biblioteca de personajes del canal seleccionado
  const loadChannelCharacters = (channelId: string) => {
    fetch(`/api/characters/${channelId}`)
      .then((res) => res.json())
      .then((data: CharacterProfile[]) => {
        setChannelCharacters(data);
      })
      .catch((err) => console.error('Error cargando personajes del canal:', err));
  };

  useEffect(() => {
    if (selectedChannel) {
      loadChannelCharacters(selectedChannel.channel_id);
    }
  }, [selectedChannel]);

  // 2. Cargar items de Google Sheets
  const loadSheetItems = () => {
    setLoadingSheet(true);
    fetch('/api/sheets/items')
      .then((res) => res.json())
      .then((data: SheetVideoItem[]) => {
        setSheetItems(data);
      })
      .catch((err) => console.error('Error cargando Google Sheets:', err))
      .finally(() => setLoadingSheet(false));
  };

  useEffect(() => {
    loadSheetItems();
  }, []);

  // 3. Generar guion a partir de un tema del Sheet o personalizado
  const handleGenerateScript = async (item?: SheetVideoItem, directTopic?: string) => {
    if (!selectedChannel) return;
    setIsGenerating(true);

    const topic = directTopic || item?.title || customTopic;
    const conflict = item?.conflict;
    const characters = item?.characterCompany;
    const sources = item?.sources;

    try {
      const res = await fetch('/api/script/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          channelId: selectedChannel.channel_id,
          conflict,
          characters,
          sources,
        }),
      });

      const script: ProjectScript = await res.json();
      setCurrentProject(script);
      setActiveStep(2); // Avanzar al editor de guion
      loadChannelCharacters(selectedChannel.channel_id);
    } catch (err) {
      console.error('Error generando guion:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // 4. Actualizar escena en el guion
  const handleUpdateScene = (sceneId: number, field: keyof SceneItem, value: any) => {
    if (!currentProject) return;
    const updatedScenes = currentProject.scenes.map((s) =>
      s.scene_id === sceneId ? { ...s, [field]: value } : s
    );
    const updatedProject = { ...currentProject, scenes: updatedScenes };
    setCurrentProject(updatedProject);

    // Guardar en backend
    fetch('/api/script/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project: updatedProject }),
    }).catch(console.error);
  };

  // 4.1 Actualizar datos del personaje activo
  const handleUpdateCharacter = (field: keyof CharacterProfile, value: any) => {
    if (!currentProject) return;
    const chars = currentProject.characters || [];
    const activeChar = chars[0] || {
      character_id: 'protagonista',
      channel_id: selectedChannel?.channel_id || 'tech_scandals',
      name: currentProject.characterCompany || 'Protagonista',
      role: 'Figura central',
      real_person: true,
      anchor_prompt: '',
      signature_props: [],
    };

    const updatedChar = { ...activeChar, [field]: value };
    const updatedProject = {
      ...currentProject,
      characters: [updatedChar, ...chars.slice(1)],
    };
    setCurrentProject(updatedProject);

    fetch('/api/script/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project: updatedProject }),
    }).catch(console.error);
  };

  // 4.2 Seleccionar personaje existente de la biblioteca
  const handleSelectCharacterFromLibrary = (charId: string) => {
    if (!currentProject) return;
    const found = channelCharacters.find((c) => c.character_id === charId);
    if (!found) return;

    const updatedProject = {
      ...currentProject,
      characters: [found],
    };
    setCurrentProject(updatedProject);

    fetch('/api/script/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project: updatedProject }),
    }).catch(console.error);
  };

  // 4.3 Guardar personaje actual en la biblioteca del canal
  const handleSaveCharacterToLibrary = async () => {
    if (!currentProject || !selectedChannel) return;
    const activeChar = currentProject.characters?.[0];
    if (!activeChar) return;

    try {
      await fetch(`/api/characters/${selectedChannel.channel_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activeChar),
      });
      loadChannelCharacters(selectedChannel.channel_id);
      setSaveSuccessMsg(`¡"${activeChar.name}" guardado en la biblioteca permanente del canal!`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Error guardando personaje:', err);
    }
  };

  // 4.4 Redactar personaje con IA
  const handleDraftNewCharacter = async () => {
    if (!currentProject || !selectedChannel) return;
    try {
      const res = await fetch(`/api/characters/${selectedChannel.channel_id}/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: currentProject.characterCompany || currentProject.title,
          title: currentProject.title,
        }),
      });
      const draftedChar: CharacterProfile = await res.json();
      const updatedProject = {
        ...currentProject,
        characters: [draftedChar],
      };
      setCurrentProject(updatedProject);
      loadChannelCharacters(selectedChannel.channel_id);
    } catch (err) {
      console.error('Error generando borrador de personaje:', err);
    }
  };

  // 5. Generar imágenes con Arco Emocional y Personaje Ancla (16:9)
  const handleGenerateImages = async (singleSceneId?: number) => {
    if (!currentProject) return;
    setIsGeneratingImages(true);

    try {
      const res = await fetch('/api/images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProject.project_id,
          sceneId: singleSceneId,
          characterId: currentProject.characters?.[0]?.character_id,
        }),
      });

      const updatedProject: ProjectScript = await res.json();
      setCurrentProject(updatedProject);
      if (!singleSceneId) {
        setActiveStep(4); // Avanzar a galería de imágenes y audio
      }
    } catch (err) {
      console.error('Error generando imágenes:', err);
    } finally {
      setIsGeneratingImages(false);
    }
  };

  // 5.1 Generar locución de audio con ElevenLabs y sincronización por palabra
  const handleGenerateAudio = async (singleSceneId?: number) => {
    if (!currentProject) return;
    setIsGeneratingAudio(true);

    try {
      const res = await fetch('/api/audio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProject.project_id,
          sceneId: singleSceneId,
        }),
      });

      const updatedProject: ProjectScript = await res.json();
      setCurrentProject(updatedProject);
    } catch (err) {
      console.error('Error generando audio con ElevenLabs:', err);
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  // 6. Renderizar video MP4 con Remotion CLI (1080p, audio y subtítulos)
  const handleRenderVideo = async () => {
    if (!currentProject) return;
    setIsRendering(true);

    try {
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProject.project_id,
        }),
      });

      const data = await res.json();
      if (data.success && data.project) {
        setCurrentProject(data.project);
      } else {
        alert(`Error renderizando video: ${data.error || 'Ocurrió un problema desconocido'}`);
      }
    } catch (err) {
      console.error('Error renderizando video MP4:', err);
      alert('Error en el proceso de renderizado. Revisa la consola o los logs del servidor.');
    } finally {
      setIsRendering(false);
    }
  };

  // Helper para mapear una escena al acto correspondiente
  const getSceneAct = (sceneIndex: number, totalScenes: number) => {
    if (!visualArcRules || visualArcRules.length === 0) return null;
    if (totalScenes <= 1) return visualArcRules[0];
    const progress = sceneIndex / Math.max(1, totalScenes - 1);
    const actIndex = Math.min(
      visualArcRules.length - 1,
      Math.floor(progress * visualArcRules.length)
    );
    return visualArcRules[actIndex];
  };

  // Calcular duración total en frames para el reproductor de Remotion (30fps)
  const totalFrames = currentProject
    ? Math.max(
        60,
        Math.round(
          currentProject.scenes.reduce((acc, s) => acc + s.durationInSeconds, 0) * 30
        )
      )
    : 300;

  const activeCharacter = currentProject?.characters?.[0];

  return (
    <div className="min-h-screen bg-[#080d1a] text-slate-100 flex flex-col">
      {/* 1. Header con Selector de Canal y Modo Autónomo */}
      <header className="border-b border-slate-800/80 bg-[#0c1222]/90 backdrop-blur sticky top-0 z-50 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Film className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              Studio Multi-Canal
              <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-mono font-medium">
                v2.1 Audio & Subtítulos Cinéticos
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Automatización de Documentales de Alto CPM con Estilo 3D y Sincronización Milimétrica
            </p>
          </div>
        </div>

        {/* Selector de Canal Activo */}
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg p-1">
            <span className="text-xs text-slate-400 px-3 font-medium">Canal:</span>
            <select
              value={selectedChannel?.channel_id || ''}
              onChange={(e) => {
                const found = channels.find((c) => c.channel_id === e.target.value);
                if (found) setSelectedChannel(found);
              }}
              className="bg-slate-800 text-sm font-semibold text-white px-3 py-1.5 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {channels.map((c) => (
                <option key={c.channel_id} value={c.channel_id}>
                  {c.display_title}
                </option>
              ))}
            </select>
          </div>

          {/* Status del Motor de IA Activo */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
              configStatus?.hasImageKey
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                configStatus?.hasImageKey ? 'bg-emerald-400 animate-pulse' : 'bg-blue-400'
              }`}
            />
            {configStatus?.activeImageEngine || 'Cargando...'}
          </div>

          {/* Toggle de Modo Autónomo */}
          <button
            onClick={() => setAutonomousMode(!autonomousMode)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition border ${
              autonomousMode
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/40 shadow-lg shadow-amber-500/10'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <Zap className={`w-4 h-4 ${autonomousMode ? 'text-amber-400' : 'text-slate-400'}`} />
            {autonomousMode ? 'Modo Autónomo: ACTIVO' : 'Modo Asistido (Paso a Paso)'}
          </button>
        </div>
      </header>

      {/* 2. Barra de Navegación de 6 Pasos */}
      <div className="bg-[#0b101e] border-b border-slate-800 px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between overflow-x-auto gap-2">
          {[
            { id: 1, label: '1. Temas & Sheets', icon: Table },
            { id: 2, label: '2. Editor de Guion', icon: Edit3 },
            { id: 3, label: '3. Personajes & Arco', icon: Users },
            { id: 4, label: '4. Imágenes & Audio', icon: ImageIcon },
            { id: 5, label: '5. Video Remotion', icon: Play },
            { id: 6, label: '6. Render & Export', icon: Download },
          ].map((step) => {
            const Icon = step.icon;
            const isActive = activeStep === step.id;
            const isCompleted = activeStep > step.id;

            return (
              <button
                key={step.id}
                onClick={() => setActiveStep(step.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : isCompleted
                    ? 'text-blue-400 hover:bg-slate-800/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{step.label}</span>
                {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 ml-1" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Contenido Principal */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6">
        {/* PASO 1: Temas y Google Sheets */}
        {activeStep === 1 && (
          <div className="space-y-6">
            {/* Banner de Personalidad Activa */}
            {selectedChannel && (
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/60 p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase font-bold tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                      ADN del Narrador
                    </span>
                    <span className="text-xs text-slate-400">
                      CPM: <strong className="text-emerald-400">{selectedChannel.cpm_tier}</strong>
                    </span>
                    <span className="text-xs text-slate-400 ml-2">
                      Personajes en Biblioteca: <strong className="text-blue-400">{channelCharacters.length}</strong>
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-white">
                    {selectedChannel.narrator.archetype}
                  </h2>
                  <p className="text-xs text-slate-300 max-w-2xl">
                    {selectedChannel.narrator.tone}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">Ritmo de Locución:</div>
                  <div className="text-sm font-mono font-bold text-white">
                    {selectedChannel.narrator.target_wpm} palabras / min
                  </div>
                </div>
              </div>
            )}

            {/* Tema Libre Personalizado */}
            <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
              <input
                type="text"
                placeholder="O escribe un tema libre (ej: ¿Cómo quebró Fast en 24 horas tras quemar 100M?)..."
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <button
                disabled={!customTopic || isGenerating}
                onClick={() => handleGenerateScript(undefined, customTopic)}
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-5 py-2.5 rounded-lg flex items-center gap-2 transition disabled:opacity-50"
              >
                {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Generar Guion
              </button>
            </div>

            {/* Casos Sincronizados de Google Sheets */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Table className="w-4 h-4 text-emerald-400" />
                    Casos Automatizados en tu Google Sheet
                  </h3>
                  <p className="text-xs text-slate-400">
                    Sincronizados en vivo desde tu hoja de investigación económica y tecnológica.
                  </p>
                </div>
                <button
                  onClick={loadSheetItems}
                  disabled={loadingSheet}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-md border border-slate-700"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingSheet ? 'animate-spin' : ''}`} />
                  Actualizar Hoja
                </button>
              </div>

              {loadingSheet ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  Cargando filas de Google Sheets...
                </div>
              ) : (
                <div className="grid gap-3">
                  {sheetItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-[#0f172a]/70 hover:bg-[#0f172a] border border-slate-800 hover:border-slate-700 p-4 rounded-xl transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                            {item.characterCompany || 'Caso Tech'}
                          </span>
                          {item.approved && (
                            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded flex items-center gap-1">
                              ✓ Aprobado en Sheet
                            </span>
                          )}
                          {item.finished && (
                            <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                              Video Terminado
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-white leading-snug">
                          {item.title}
                        </h4>
                        <p className="text-xs text-slate-400 line-clamp-2">
                          {item.conflict}
                        </p>
                        {item.sources.length > 0 && (
                          <div className="flex items-center gap-3 pt-1">
                            {item.sources.map((src, sIdx) => (
                              <a
                                key={sIdx}
                                href={src}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-blue-400/80 hover:text-blue-300 flex items-center gap-1 truncate max-w-[200px]"
                              >
                                Fuente {sIdx + 1} <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center">
                        <button
                          disabled={isGenerating}
                          onClick={() => handleGenerateScript(item)}
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-lg flex items-center gap-2 transition shadow-md shadow-blue-500/10 disabled:opacity-50"
                        >
                          {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
                          Generar Guion
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PASO 2: Editor y Refinador de Guion */}
        {activeStep === 2 && currentProject && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono text-blue-400 uppercase tracking-wider font-semibold">
                  Proyecto: {currentProject.project_id}
                </span>
                <h2 className="text-xl font-bold text-white mt-0.5">
                  {currentProject.title}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Gancho de apertura: <em className="text-slate-300">"{currentProject.hook}"</em>
                </p>
              </div>

              <button
                onClick={() => setActiveStep(3)}
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-5 py-2.5 rounded-lg flex items-center gap-2 transition shadow-lg shadow-blue-600/20"
              >
                <Users className="w-4 h-4" />
                Aprobar Guion y Definir Personajes
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Escenas en Tarjetas Editables */}
            <div className="space-y-4">
              {currentProject.scenes.map((scene) => (
                <div
                  key={scene.scene_id}
                  className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4 shadow-sm"
                >
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-bold flex items-center justify-center">
                        {scene.scene_id}
                      </span>
                      <input
                        type="text"
                        value={scene.chapter}
                        onChange={(e) =>
                          handleUpdateScene(scene.scene_id, 'chapter', e.target.value)
                        }
                        className="bg-transparent font-bold text-white text-sm focus:outline-none focus:border-b border-blue-500"
                      />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span>Cámara:</span>
                      <select
                        value={scene.camera_motion}
                        onChange={(e) =>
                          handleUpdateScene(scene.scene_id, 'camera_motion', e.target.value)
                        }
                        className="bg-slate-800 text-slate-200 px-2 py-1 rounded border border-slate-700 text-xs focus:outline-none"
                      >
                        <option value="zoom_in">Zoom In</option>
                        <option value="zoom_out">Zoom Out</option>
                        <option value="pan_left">Paneo Izquierda</option>
                        <option value="pan_right">Paneo Derecha</option>
                        <option value="static">Estático</option>
                      </select>
                      <span>Duración:</span>
                      <span className="font-mono text-white font-semibold">
                        {scene.durationInSeconds}s
                      </span>
                    </div>
                  </div>

                  {/* Texto de Locución en Español */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Texto de Locución (Español):
                    </label>
                    <textarea
                      rows={3}
                      value={scene.voiceover}
                      onChange={(e) =>
                        handleUpdateScene(scene.scene_id, 'voiceover', e.target.value)
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500 leading-relaxed"
                    />
                  </div>

                  {/* Acción Visual base */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Acción de la Escena (Se combinará con el personaje ancla y la iluminación):
                    </label>
                    <textarea
                      rows={2}
                      value={scene.visual_prompt}
                      onChange={(e) =>
                        handleUpdateScene(scene.scene_id, 'visual_prompt', e.target.value)
                      }
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-400 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PASO 3: Fichas de Personajes y Fotometría de la Historia */}
        {activeStep === 3 && currentProject && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-purple-400 uppercase tracking-wider font-semibold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                    Consistencia Visual & Iluminación por Actos
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white mt-1">
                  Ficha de Personajes y Fotometría de la Historia
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ancla las facciones del protagonista en estilo 3D (Pixar/Arcane) para mantener el mismo rostro a lo largo de las escenas.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  disabled={isGeneratingImages}
                  onClick={() => handleGenerateImages()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm px-5 py-2.5 rounded-lg flex items-center gap-2 transition shadow-lg shadow-emerald-600/20"
                >
                  {isGeneratingImages ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Aprobar Personaje y Generar Imágenes (16:9)
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Mensaje de confirmación al guardar en biblioteca */}
            {saveSuccessMsg && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {saveSuccessMsg}
              </div>
            )}

            {/* Selector de Personaje desde la Biblioteca del Canal */}
            <div className="bg-[#0f172a] border border-slate-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <BookmarkCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Biblioteca de Personajes de {selectedChannel?.name}:</div>
                  <div className="text-xs text-slate-400">Reutiliza el mismo rostro si este personaje vuelve a aparecer en futuros videos:</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={activeCharacter?.character_id || ''}
                  onChange={(e) => handleSelectCharacterFromLibrary(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-xs font-semibold text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">-- Seleccionar de la biblioteca --</option>
                  {channelCharacters.map((char) => (
                    <option key={char.character_id} value={char.character_id}>
                      {char.name} ({char.role})
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleDraftNewCharacter}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-2 rounded-lg flex items-center gap-1.5 transition"
                >
                  <Bot className="w-3.5 h-3.5 text-blue-400" />
                  Redactar Nuevo con IA
                </button>
              </div>
            </div>

            {/* Tarjeta de Edición del Personaje Ancla */}
            {activeCharacter && (
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 pb-4 gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white">{activeCharacter.name}</h3>
                        <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded font-mono">
                          ID: {activeCharacter.character_id}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{activeCharacter.role}</p>
                    </div>
                  </div>

                  <button
                    onClick={handleSaveCharacterToLibrary}
                    className="bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 font-semibold text-xs px-4 py-2 rounded-lg flex items-center gap-2 transition border border-slate-700"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Guardar en Biblioteca Permanente
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Nombre del Personaje o Entidad:
                    </label>
                    <input
                      type="text"
                      value={activeCharacter.name}
                      onChange={(e) => handleUpdateCharacter('name', e.target.value)}
                      className="w-full mt-1.5 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Rol o Arquetipo en la Historia:
                    </label>
                    <input
                      type="text"
                      value={activeCharacter.role}
                      onChange={(e) => handleUpdateCharacter('role', e.target.value)}
                      className="w-full mt-1.5 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Prompt Ancla 3D */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Prompt Ancla 3D (Pixar / Arcane Documentary Aesthetic):
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Inyectado en cada escena para garantizar similitud facial
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={activeCharacter.anchor_prompt}
                    onChange={(e) => handleUpdateCharacter('anchor_prompt', e.target.value)}
                    className="w-full bg-slate-950/90 border border-slate-800 rounded-lg p-3 text-xs text-purple-200/90 focus:outline-none focus:border-purple-500 font-mono leading-relaxed"
                  />
                </div>

                {/* Signature Props */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Objetos y Elementos Distintivos (Props separados por comas):
                  </label>
                  <input
                    type="text"
                    value={(activeCharacter.signature_props || []).join(', ')}
                    onChange={(e) =>
                      handleUpdateCharacter(
                        'signature_props',
                        e.target.value.split(',').map((p) => p.trim())
                      )
                    }
                    placeholder="smartphone con gráfica de ventas, reloj de lujo, oficina vidriada moderna..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Arco Emocional y Fotometría Cinematográfica (5 Actos) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400" />
                    Arco Fotométrico y Emocional de la Narrativa (5 Actos)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Cada escena adapta automáticamente la iluminación, composición de cámara y expresión facial según su posición dramática.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {visualArcRules.map((rule) => {
                  return (
                    <div
                      key={rule.act_number}
                      className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-2 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs font-bold pb-1 border-b border-slate-800">
                          <span className="text-blue-400">Acto {rule.act_number}</span>
                          {rule.act_number === 1 && <Sun className="w-3.5 h-3.5 text-amber-400" />}
                          {rule.act_number === 2 && <Zap className="w-3.5 h-3.5 text-yellow-400" />}
                          {rule.act_number === 3 && <Flame className="w-3.5 h-3.5 text-rose-500" />}
                          {rule.act_number === 4 && <Moon className="w-3.5 h-3.5 text-indigo-400" />}
                          {rule.act_number === 5 && <Sparkles className="w-3.5 h-3.5 text-purple-400" />}
                        </div>
                        <h4 className="text-xs font-bold text-white mt-1.5">{rule.act_name}</h4>
                        <p className="text-[11px] text-amber-300/90 mt-0.5 leading-snug">
                          {rule.emotional_tone}
                        </p>
                      </div>

                      <div className="text-[10px] text-slate-400 bg-slate-950 p-2 rounded border border-slate-800/80 line-clamp-3">
                        <strong className="text-slate-300">💡 Luz:</strong> {rule.lighting_prompt}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Mapeo de Escenas al Arco */}
              <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl">
                <div className="text-xs font-bold text-slate-300 mb-2">
                  Distribución de Escenas en este Video:
                </div>
                <div className="flex flex-wrap gap-2">
                  {currentProject.scenes.map((scene, sIdx) => {
                    const act = getSceneAct(sIdx, currentProject.scenes.length);
                    return (
                      <div
                        key={scene.scene_id}
                        className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2"
                      >
                        <span className="font-bold text-white">Escena {scene.scene_id}:</span>
                        <span className="text-slate-400 truncate max-w-[140px]">{scene.chapter}</span>
                        <span className="text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded text-[10px] font-mono">
                          {act ? `Acto ${act.act_number}: ${act.act_name}` : 'Acto 1'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PASO 4: Galería de Imágenes & Locución de Audio (ElevenLabs) */}
        {activeStep === 4 && currentProject && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Activos Visuales & Locución Sincronizada
                </h2>
                <p className="text-xs text-slate-400">
                  Imágenes 16:9 con personaje ancla y narración con ElevenLabs calibrada al milisegundo.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  disabled={isGeneratingImages}
                  onClick={() => handleGenerateImages()}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-1.5 border border-slate-700"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingImages ? 'animate-spin' : ''}`} />
                  Regenerar Imágenes
                </button>

                <button
                  disabled={isGeneratingAudio}
                  onClick={() => handleGenerateAudio()}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-md shadow-purple-500/20"
                >
                  {isGeneratingAudio ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Mic className="w-3.5 h-3.5" />}
                  Generar Locución (ElevenLabs)
                </button>

                <button
                  onClick={() => setActiveStep(5)}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-md shadow-blue-500/20"
                >
                  <Play className="w-3.5 h-3.5" />
                  Previsualizar Video en Remotion
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Banner de Estado de Personaje y Audio */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                  <div>
                    <div className="text-xs text-slate-400 font-medium">Consistencia Facial:</div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      🎭 {activeCharacter?.name || 'Protagonista'}
                      <span className="text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded font-mono">
                        3D Pixar/Arcane
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-slate-400 text-right">
                  Motor: <strong className="text-emerald-400">{configStatus?.activeImageEngine || 'Gemini 3.1 16:9'}</strong>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 font-medium">Motor de Locución Documental:</div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      ElevenLabs Multilingual v2
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-mono">
                        Timestamps por Palabra
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-slate-400 text-right">
                  Voz: <strong className="text-indigo-400">Adam (Thriller)</strong>
                </div>
              </div>
            </div>

            {/* Grid de Escenas con Imagen y Audio */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {currentProject.scenes.map((scene, sIdx) => {
                const act = getSceneAct(sIdx, currentProject.scenes.length);

                return (
                  <div
                    key={scene.scene_id}
                    className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden group shadow-md"
                  >
                    <div className="aspect-video w-full bg-black relative overflow-hidden">
                      {scene.imageUrl ? (
                        <img
                          src={scene.imageUrl}
                          alt={scene.chapter}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 bg-slate-950 p-4 text-center">
                          <ImageIcon className="w-8 h-8 mb-2" />
                          <span className="text-xs">Imagen pendiente de generación</span>
                        </div>
                      )}

                      {/* Badge de Escena y Acto */}
                      <div className="absolute top-3 left-3 flex items-center gap-2">
                        <div className="bg-slate-900/80 backdrop-blur px-2.5 py-1 rounded text-xs font-bold text-white border border-slate-700">
                          Escena {scene.scene_id}
                        </div>
                        {act && (
                          <div className="bg-blue-900/80 backdrop-blur px-2 py-1 rounded text-[11px] font-semibold text-blue-300 border border-blue-700/60">
                            Acto {act.act_number}: {act.act_name}
                          </div>
                        )}
                      </div>

                      {/* Duración exacta calibrada */}
                      <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur px-2.5 py-1 rounded text-xs font-mono font-bold text-amber-300 border border-amber-500/40">
                        {scene.durationInSeconds}s
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-white truncate">
                          {scene.chapter}
                        </h4>
                        <div className="flex items-center gap-2">
                          <button
                            disabled={isGeneratingImages}
                            onClick={() => handleGenerateImages(scene.scene_id)}
                            className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20"
                          >
                            <RefreshCw className="w-2.5 h-2.5" /> Imagen
                          </button>
                          <button
                            disabled={isGeneratingAudio}
                            onClick={() => handleGenerateAudio(scene.scene_id)}
                            className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20"
                          >
                            <Mic className="w-2.5 h-2.5" /> Audio
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-400 line-clamp-2">
                        {scene.voiceover}
                      </p>

                      {/* Reproductor de Audio Sincronizado */}
                      {scene.audioUrl ? (
                        <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                              <Volume2 className="w-3.5 h-3.5" /> Locución Sincronizada ({scene.durationInSeconds}s)
                            </span>
                            <span className="text-slate-500 font-mono">
                              {scene.wordTimings?.length || 0} palabras
                            </span>
                          </div>
                          <audio controls src={scene.audioUrl} className="w-full h-7 rounded" />
                        </div>
                      ) : (
                        <div className="bg-slate-950/60 border border-dashed border-slate-800 p-2 rounded-lg text-center">
                          <span className="text-[11px] text-slate-500">Audio aún no sintetizado</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* PASO 5: Previsualizador Remotion en Vivo con Audio y Subtítulos Cinéticos */}
        {activeStep === 5 && currentProject && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Reproductor de Video en Tiempo Real
                </h2>
                <p className="text-xs text-slate-400">
                  Composición Remotion renderizada en vivo con efectos Ken Burns, locución y subtítulos cinéticos.
                </p>
              </div>

              <button
                onClick={() => setActiveStep(6)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-lg shadow-emerald-600/20"
              >
                <Download className="w-4 h-4" />
                Continuar a Exportación & Empaque
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Banner de Sincronización Audiovisual */}
            <div className="bg-[#0f172a] border border-slate-800 p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-300">
                  Audio Activo: <strong className="text-white">ElevenLabs Adam (Documental Thriller)</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span className="text-slate-300">
                  Subtítulos: <strong className="text-blue-400">Cinéticos de 3-4 palabras con resalto activo</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-amber-300 font-bold">
                  {Math.round(totalFrames / 30)}s duración total ({totalFrames} frames)
                </span>
              </div>
            </div>

            {/* Remotion Player Interactivo */}
            <div className="bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-2xl max-w-4xl mx-auto">
              <Player
                component={DocumentaryVideo}
                inputProps={{
                  channelId: selectedChannel?.channel_id || 'tech_scandals',
                  title: currentProject.title,
                  scenes: currentProject.scenes,
                }}
                durationInFrames={totalFrames}
                fps={30}
                compositionWidth={1920}
                compositionHeight={1080}
                style={{
                  width: '100%',
                  aspectRatio: '16/9',
                }}
                controls
                autoPlay={false}
                loop
              />
            </div>

            <div className="text-center text-xs text-slate-500">
              💡 Al reproducir el video escucharás la locución de ElevenLabs y verás los subtítulos cinéticos iluminar cada palabra en tiempo real.
            </div>
          </div>
        )}

        {/* PASO 6: Render y Empaque de YouTube */}
        {activeStep === 6 && currentProject && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="border-b border-slate-800 pb-4 text-center">
              <h2 className="text-xl font-bold text-white flex items-center justify-center gap-2">
                <Download className="w-5 h-5 text-emerald-400" />
                Renderizado Final & Empaque YouTube
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Generación del video final en MP4 1080p a 30fps con Remotion, locución sincronizada y subtítulos cinéticos.
              </p>
            </div>

            {/* Panel de Video Renderizado si ya existe */}
            {currentProject.outputVideoUrl ? (
              <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 shadow-2xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-sm font-bold text-emerald-400">
                      ¡Video MP4 Renderizado con Éxito!
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                    <span className="bg-slate-800 px-2.5 py-1 rounded text-slate-300">
                      1080p (1920x1080)
                    </span>
                    <span className="bg-slate-800 px-2.5 py-1 rounded text-slate-300">
                      {Math.round(totalFrames / 30)}s ({totalFrames} frames)
                    </span>
                    <span className="bg-slate-800 px-2.5 py-1 rounded text-slate-300">
                      30 FPS
                    </span>
                  </div>
                </div>

                {/* Reproductor Nativo del Archivo MP4 Exportado */}
                <div className="bg-black rounded-xl overflow-hidden border border-slate-800 aspect-video relative shadow-inner">
                  <video
                    controls
                    src={currentProject.outputVideoUrl}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Botones de Descarga y Re-renderizado */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <a
                    href={currentProject.outputVideoUrl}
                    download={`${currentProject.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.mp4`}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition active:scale-95"
                  >
                    <Download className="w-5 h-5" />
                    Descargar Video MP4 (1080p Completo)
                  </a>

                  <button
                    disabled={isRendering}
                    onClick={handleRenderVideo}
                    className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 font-semibold text-xs px-4 py-2.5 rounded-lg flex items-center gap-2 border border-slate-700 transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRendering ? 'animate-spin text-blue-400' : ''}`} />
                    {isRendering ? 'Renderizando...' : 'Volver a Renderizar'}
                  </button>
                </div>
              </div>
            ) : (
              /* Tarjeta de Renderizado Inicial */
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mx-auto text-blue-400">
                  <Film className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Listo para Generar el Archivo MP4 Definitivo
                  </h3>
                  <p className="text-xs text-slate-400 max-w-lg mx-auto mt-1">
                    Remotion CLI compilará las {currentProject.scenes.length} escenas fotograma a fotograma en resolución 1080p, aplicando movimientos Ken Burns, el audio con marcas de tiempo y la tipografía cinética.
                  </p>
                </div>

                <div className="flex justify-center gap-3 text-xs font-mono text-slate-400">
                  <span className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300">
                    Duración: <strong className="text-white">{Math.round(totalFrames / 30)}s</strong>
                  </span>
                  <span className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300">
                    Fotogramas: <strong className="text-white">{totalFrames} frames</strong>
                  </span>
                  <span className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300">
                    Resolución: <strong className="text-white">1920x1080 (16:9)</strong>
                  </span>
                </div>

                <div className="pt-2">
                  <button
                    disabled={isRendering}
                    onClick={handleRenderVideo}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-sm px-8 py-3.5 rounded-xl flex items-center gap-2.5 mx-auto shadow-lg shadow-blue-500/25 transition active:scale-95"
                  >
                    {isRendering ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>Renderizando en 1080p... (Por favor espera 1-2 min)</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Renderizar Video MP4 en 1080p ({Math.round(totalFrames / 30)}s)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Metadatos y SEO para YouTube */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Título Sugerido para YouTube (Alto CTR):
                </label>
                <input
                  type="text"
                  readOnly
                  value={currentProject.title}
                  className="w-full mt-1.5 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm font-bold text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-purple-400" /> Descripción con Capítulos y Marcas de Tiempo (SEO):
                </label>
                <textarea
                  rows={8}
                  readOnly
                  value={`En este documental desglosamos la verdad detrás de ${currentProject.title}.\n\n⏱️ CAPÍTULOS:\n${currentProject.scenes
                    .map((s, idx) => {
                      const accumSeconds = currentProject.scenes
                        .slice(0, idx)
                        .reduce((acc, prev) => acc + prev.durationInSeconds, 0);
                      const min = Math.floor(accumSeconds / 60);
                      const sec = Math.floor(accumSeconds % 60);
                      return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')} - ${s.chapter}`;
                    })
                    .join('\n')}\n\nCanal: ${selectedChannel?.name}\nNicho: ${selectedChannel?.niche}`}
                  className="w-full mt-1.5 bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 font-mono focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
