import React, { useState, useEffect, useRef } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
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
  ChevronRight,
  ExternalLink,
  Edit3,
  Bot,
  Zap,
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
  FolderKanban,
  Upload,
  Plus,
  Copy,
  Trash2,
  Search,
  Check,
  Wand2,
  FileText,
  Radio,
  Eye,
  Sliders,
  FastForward,
  Rewind,
  MessageSquare,
  Pause,
  RotateCcw,
} from 'lucide-react';
import type {
  ChannelPersona,
  SheetVideoItem,
  ProjectScript,
  SceneItem,
  CharacterProfile,
  VisualAssetMetadata,
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

type StudioSection = 'production' | 'projects' | 'characters' | 'voices';

export default function App() {
  const [studioSection, setStudioSection] = useState<StudioSection>('production');
  const [channels, setChannels] = useState<ChannelPersona[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<ChannelPersona | null>(null);
  const [channelCharacters, setChannelCharacters] = useState<CharacterProfile[]>([]);
  const [selectedLibraryChar, setSelectedLibraryChar] = useState<CharacterProfile | null>(null);
  const [projectsList, setProjectsList] = useState<ProjectScript[]>([]);
  const [projectSearch, setProjectSearch] = useState('');
  const [projectStatusFilter, setProjectStatusFilter] = useState<string>('all');

  const [visualArcRules, setVisualArcRules] = useState<ActLightingRule[]>([]);
  const [sheetItems, setSheetItems] = useState<SheetVideoItem[]>([]);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [currentProject, setCurrentProject] = useState<ProjectScript | null>(null);
  const [activeStep, setActiveStep] = useState<number>(1);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioGeneratingEngine, setAudioGeneratingEngine] = useState<string | null>(null);
  const [audioGeneratingSceneId, setAudioGeneratingSceneId] = useState<number | null>(null);
  const [isGeneratingPortrait, setIsGeneratingPortrait] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  const [autonomousMode, setAutonomousMode] = useState(false);
  const [customTopic, setCustomTopic] = useState('');
  const [configStatus, setConfigStatus] = useState<any>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [expandedVoiceProjectId, setExpandedVoiceProjectId] = useState<string | null>(null);
  const [libraryPickerSceneId, setLibraryPickerSceneId] = useState<number | null>(null);
  const [smartReuseImages, setSmartReuseImages] = useState<boolean>(true);
  const [librarySearchQuery, setLibrarySearchQuery] = useState<string>('');
  const [characterAssetSearch, setCharacterAssetSearch] = useState<string>('');

  const charFileInputRef = useRef<HTMLInputElement | null>(null);
  const studioCharFileInputRef = useRef<HTMLInputElement | null>(null);
  const previewCustomFileInputRef = useRef<HTMLInputElement | null>(null);

  // Estados para Reproductor Remotion Avanzado y Director IA (Paso 5)
  const playerRef = useRef<PlayerRef>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [activePreviewSceneIndex, setActivePreviewSceneIndex] = useState<number>(0);
  const [showCaptions, setShowCaptions] = useState<boolean>(true);
  const [showAtmosphere, setShowAtmosphere] = useState<boolean>(true);
  const [showHighlightCards, setShowHighlightCards] = useState<boolean>(true);
  const [showChapterBadge, setShowChapterBadge] = useState<boolean>(true);
  const [motionIntensity, setMotionIntensity] = useState<number>(1);
  const [aiInstruction, setAiInstruction] = useState<string>('');
  const [aiTargetSceneId, setAiTargetSceneId] = useState<number | 'all'>('all');
  const [isApplyingAiCorrection, setIsApplyingAiCorrection] = useState<boolean>(false);
  const [aiAutoRegenImage, setAiAutoRegenImage] = useState<boolean>(false);
  const [aiAutoRegenAudio, setAiAutoRegenAudio] = useState<boolean>(false);
  const [aiLastFeedback, setAiLastFeedback] = useState<string | null>(null);

  // Estado del servidor de audio VoiceStudio Local
  const [isStartingVoiceStudio, setIsStartingVoiceStudio] = useState<boolean>(false);
  const [voiceStudioRunning, setVoiceStudioRunning] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setSaveSuccessMsg(msg);
    setTimeout(() => setSaveSuccessMsg(null), 4500);
  };

  // Comprobar estado de VoiceStudio
  const checkVoiceStudioStatus = () => {
    fetch('/api/audio/voicestudio/status')
      .then((res) => res.json())
      .then((data) => setVoiceStudioRunning(Boolean(data.running)))
      .catch(() => setVoiceStudioRunning(false));
  };

  const handleStartVoiceStudio = async () => {
    setIsStartingVoiceStudio(true);
    try {
      const res = await fetch('/api/audio/voicestudio/start', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error iniciando VoiceStudio');
      setVoiceStudioRunning(true);
      checkConfigStatus();
      showToast('⚡ VoiceStudio Local (RTX 3080) iniciado y listo para sintetizar audio.');
    } catch (err: any) {
      alert(`Error al iniciar VoiceStudio: ${err.message}`);
    } finally {
      setIsStartingVoiceStudio(false);
    }
  };

  const handleStopVoiceStudio = async () => {
    try {
      const res = await fetch('/api/audio/voicestudio/stop', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error deteniendo VoiceStudio');
      setVoiceStudioRunning(false);
      checkConfigStatus();
      showToast('🛑 VoiceStudio detenido. VRAM de GPU liberada.');
    } catch (err: any) {
      alert(`Error al detener VoiceStudio: ${err.message}`);
    }
  };

  // 0. Comprobar proveedores configurados en .env
  const checkConfigStatus = () => {
    fetch('/api/config/status')
      .then((res) => res.json())
      .then((data) => {
        setConfigStatus(data);
        if (data?.hasVoiceStudio) {
          setVoiceStudioRunning(true);
        }
      })
      .catch((err) => console.error(err));
  };

  // Cargar todos los proyectos guardados
  const loadProjectsList = (selectLatestIfNone = false) => {
    fetch('/api/projects')
      .then((res) => res.json())
      .then((projects: ProjectScript[]) => {
        setProjectsList(projects || []);
        if (selectLatestIfNone && projects && projects.length > 0 && !currentProject) {
          setCurrentProject(projects[0]);
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

  useEffect(() => {
    checkConfigStatus();
    loadVisualArcRules();
    loadProjectsList(true);
  }, []);

  // 1. Cargar canales al inicio (priorizando tech_scandals por defecto)
  useEffect(() => {
    fetch('/api/channels')
      .then((res) => res.json())
      .then((data: ChannelPersona[]) => {
        setChannels(data);
        if (data.length > 0) {
          const defaultTech = data.find((c) => c.channel_id === 'tech_scandals') || data[0];
          setSelectedChannel(defaultTech);
        }
      })
      .catch((err) => console.error('Error cargando canales:', err));
  }, []);

  // Cargar biblioteca de personajes del canal seleccionado
  const loadChannelCharacters = (channelId: string, keepSelectedId?: string) => {
    fetch(`/api/characters/${channelId}`)
      .then((res) => res.json())
      .then((data: CharacterProfile[]) => {
        setChannelCharacters(data);
        if (keepSelectedId) {
          const found = data.find((c) => c.character_id === keepSelectedId);
          if (found) setSelectedLibraryChar(found);
        } else if (data.length > 0 && !selectedLibraryChar) {
          setSelectedLibraryChar(data[0]);
        }
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

  // Sincronizar proyecto en el backend y en la lista local
  const persistProjectUpdate = async (updatedProject: ProjectScript, notifyMsg?: string) => {
    setCurrentProject(updatedProject);
    try {
      await fetch('/api/script/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: updatedProject }),
      });
      loadProjectsList(false);
      if (notifyMsg) showToast(notifyMsg);
    } catch (err) {
      console.error('Error guardando proyecto:', err);
    }
  };

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
      setStudioSection('production');
      setActiveStep(2); // Avanzar al editor de guion
      loadChannelCharacters(selectedChannel.channel_id);
      loadProjectsList(false);
      showToast(`✨ Guion "${script.title}" creado y guardado en tu biblioteca.`);
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
    persistProjectUpdate(updatedProject);
  };

  // 4.1 Actualizar datos del personaje activo en el proyecto
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
    persistProjectUpdate(updatedProject);
  };

  // 4.2 Seleccionar personaje existente de la biblioteca para el proyecto activo
  const handleSelectCharacterFromLibrary = (charId: string) => {
    if (!currentProject) return;
    const found = channelCharacters.find((c) => c.character_id === charId);
    if (!found) return;

    const updatedProject = {
      ...currentProject,
      characters: [found],
    };
    persistProjectUpdate(
      updatedProject,
      `🎭 Personaje "${found.name}" vinculado al proyecto actual.`
    );
  };

  // 4.3 Guardar personaje actual en la biblioteca del canal
  const handleSaveCharacterToLibrary = async (charToSave?: CharacterProfile) => {
    if (!selectedChannel) return;
    const targetChar = charToSave || currentProject?.characters?.[0];
    if (!targetChar) return;

    try {
      const res = await fetch(`/api/characters/${selectedChannel.channel_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targetChar),
      });
      const data = await res.json();
      const savedChar: CharacterProfile = data.character || targetChar;

      loadChannelCharacters(selectedChannel.channel_id, savedChar.character_id);
      if (
        currentProject &&
        currentProject.characters?.[0]?.character_id === savedChar.character_id
      ) {
        persistProjectUpdate({
          ...currentProject,
          characters: [savedChar, ...(currentProject.characters.slice(1) || [])],
        });
      }
      showToast(`¡"${savedChar.name}" guardado en la Biblioteca de Personajes!`);
    } catch (err) {
      console.error('Error guardando personaje:', err);
    }
  };

  // 4.4 Redactar personaje con IA
  const handleDraftNewCharacter = async (customName?: string, customTitle?: string) => {
    if (!selectedChannel) return;
    try {
      const res = await fetch(`/api/characters/${selectedChannel.channel_id}/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:
            customName ||
            currentProject?.characterCompany ||
            currentProject?.title ||
            'Nuevo Protagonista',
          title: customTitle || currentProject?.title || 'Documental',
        }),
      });
      const draftedChar: CharacterProfile = await res.json();
      if (currentProject && studioSection === 'production') {
        persistProjectUpdate({
          ...currentProject,
          characters: [draftedChar],
        });
      }
      setSelectedLibraryChar(draftedChar);
      loadChannelCharacters(selectedChannel.channel_id, draftedChar.character_id);
      showToast(`🤖 Ficha de "${draftedChar.name}" generada en la biblioteca.`);
    } catch (err) {
      console.error('Error generando borrador de personaje:', err);
    }
  };

  // 4.5 Generar retrato previo 3D de un personaje con IA (antes de las escenas)
  const handleGenerateCharacterPortrait = async (targetChar?: CharacterProfile) => {
    if (!selectedChannel) return;
    const charObj = targetChar || currentProject?.characters?.[0] || selectedLibraryChar;
    if (!charObj) return;

    setIsGeneratingPortrait(true);
    try {
      const res = await fetch(
        `/api/characters/${selectedChannel.channel_id}/${charObj.character_id}/generate-portrait`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(charObj),
        }
      );
      if (!res.ok) throw new Error('Error al generar retrato');
      const updatedChar: CharacterProfile = await res.json();

      setSelectedLibraryChar(updatedChar);
      loadChannelCharacters(selectedChannel.channel_id, updatedChar.character_id);

      if (
        currentProject &&
        currentProject.characters?.[0]?.character_id === updatedChar.character_id
      ) {
        persistProjectUpdate({
          ...currentProject,
          characters: [updatedChar, ...(currentProject.characters.slice(1) || [])],
        });
      }
      showToast(`🎨 ¡Retrato oficial 3D generado para "${updatedChar.name}"!`);
    } catch (err) {
      console.error('Error generando retrato del personaje:', err);
    } finally {
      setIsGeneratingPortrait(false);
    }
  };

  // 4.6 Subir versión propia trabajada por el usuario para un personaje (PNG/JPG/WebP)
  const handleUploadCharacterImage = async (file: File, targetChar?: CharacterProfile) => {
    if (!selectedChannel || !file) return;
    const charObj = targetChar || currentProject?.characters?.[0] || selectedLibraryChar;
    if (!charObj) return;

    setIsUploadingImage(true);
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });

      const res = await fetch(
        `/api/characters/${selectedChannel.channel_id}/${charObj.character_id}/upload-image`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64Data,
            characterData: charObj,
          }),
        }
      );

      if (!res.ok) throw new Error('No se pudo subir la imagen');
      const updatedChar: CharacterProfile = await res.json();

      setSelectedLibraryChar(updatedChar);
      loadChannelCharacters(selectedChannel.channel_id, updatedChar.character_id);

      if (
        currentProject &&
        currentProject.characters?.[0]?.character_id === updatedChar.character_id
      ) {
        persistProjectUpdate({
          ...currentProject,
          characters: [updatedChar, ...(currentProject.characters.slice(1) || [])],
        });
      }
      showToast(
        `✨ ¡Tu versión personalizada de "${updatedChar.name}" es ahora la referencia oficial!`
      );
    } catch (err) {
      console.error('Error subiendo versión propia del personaje:', err);
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Cambiar entre versiones guardadas en reference_gallery de un personaje
  const handleSelectCharacterGalleryImage = async (
    charObj: CharacterProfile,
    imgUrl: string
  ) => {
    const updated: CharacterProfile = {
      ...charObj,
      canonical_image_url: imgUrl,
      custom_uploaded: imgUrl.includes('_custom_'),
    };
    await handleSaveCharacterToLibrary(updated);
  };

  // Eliminar un personaje de la biblioteca
  const handleDeleteCharacter = async (charObj: CharacterProfile) => {
    if (!selectedChannel) return;
    try {
      await fetch(`/api/characters/${selectedChannel.channel_id}/${charObj.character_id}`, {
        method: 'DELETE',
      });
      const remaining = channelCharacters.filter((c) => c.character_id !== charObj.character_id);
      setChannelCharacters(remaining);
      setSelectedLibraryChar(remaining[0] || null);
      showToast(`🗑️ Personaje "${charObj.name}" eliminado de la biblioteca.`);
    } catch (err) {
      console.error('Error eliminando personaje:', err);
    }
  };

  // 4.7 Subir imagen personalizada para una escena individual del proyecto
  const handleUploadCustomSceneImage = async (sceneId: number, file: File) => {
    if (!currentProject || !file) return;
    setIsUploadingImage(true);
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });

      const res = await fetch(
        `/api/projects/${currentProject.project_id}/scenes/${sceneId}/upload-image`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64Data }),
        }
      );
      if (!res.ok) throw new Error('Error subiendo imagen de escena');
      const updatedProject: ProjectScript = await res.json();
      setCurrentProject(updatedProject);
      loadProjectsList(false);
      showToast(`🖼️ Imagen personalizada aplicada en la Escena ${sceneId}.`);
    } catch (err) {
      console.error('Error subiendo imagen de escena:', err);
    } finally {
      setIsUploadingImage(false);
    }
  };

  // 4.8 Reutilizar SOLO LA VOZ de un proyecto para generar otro video (Voice Fork)
  const handleForkProjectVoice = async (sourceProject: ProjectScript) => {
    try {
      const res = await fetch(`/api/projects/${sourceProject.project_id}/fork-voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${sourceProject.title.replace(/ \(Nuevo Video.*\)$/, '')} (Nuevo Video • Misma Voz)`,
        }),
      });
      if (!res.ok) throw new Error('No se pudo clonar la voz del proyecto');
      const forked: ProjectScript = await res.json();
      setCurrentProject(forked);
      loadProjectsList(false);
      setStudioSection('production');
      setActiveStep(3); // Llevar directo a elegir/mejorar personaje antes de crear las nuevas imágenes
      showToast(
        `🎙️ ¡Voz y sincronización clonadas en "${forked.project_id}"! Ahora puedes elegir o subir tu personaje y crear otro video.`
      );
    } catch (err) {
      console.error('Error clonando voz del proyecto:', err);
    }
  };

  // 4.9 Duplicar solo el guion de un proyecto (Script Fork)
  const handleForkProjectScript = async (sourceProject: ProjectScript) => {
    try {
      const res = await fetch(`/api/projects/${sourceProject.project_id}/fork-script`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${sourceProject.title.replace(/ \(Copia.*\)$/, '')} (Copia de Guion)`,
        }),
      });
      if (!res.ok) throw new Error('No se pudo duplicar el guion');
      const forked: ProjectScript = await res.json();
      setCurrentProject(forked);
      loadProjectsList(false);
      setStudioSection('production');
      setActiveStep(2);
      showToast(`📝 Guion duplicado como nuevo proyecto (${forked.project_id}).`);
    } catch (err) {
      console.error('Error duplicando guion:', err);
    }
  };

  // 4.10 Salto interactivo a una escena en el reproductor Remotion
  const jumpToScene = (sceneIndex: number) => {
    if (!currentProject || !playerRef.current) return;
    const targetScene = currentProject.scenes[sceneIndex];
    if (!targetScene) return;
    const framesBefore = Math.round(
      currentProject.scenes.slice(0, sceneIndex).reduce((acc, s) => acc + s.durationInSeconds, 0) * 30
    );
    playerRef.current.seekTo(framesBefore);
    setActivePreviewSceneIndex(sceneIndex);
  };

  // 4.11 Aplicar corrección con Director Asistente IA
  const handleApplyAiAdjustment = async () => {
    if (!currentProject || !aiInstruction.trim()) return;
    setIsApplyingAiCorrection(true);
    try {
      const res = await fetch('/api/script/ai-adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProject.project_id,
          sceneId: aiTargetSceneId === 'all' ? undefined : aiTargetSceneId,
          instruction: aiInstruction.trim(),
          autoRegenerateImage: aiAutoRegenImage,
          autoRegenerateAudio: aiAutoRegenAudio,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error aplicando corrección de IA');
      setCurrentProject(data.project);
      setAiLastFeedback(data.summary);
      setAiInstruction('');
      showToast(`✨ Director IA: ${data.summary}`);
    } catch (err: any) {
      alert(`Error con el Director IA: ${err.message}`);
    } finally {
      setIsApplyingAiCorrection(false);
    }
  };


  // Eliminar un proyecto
  const handleDeleteProject = async (projectId: string) => {
    try {
      await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
      const updated = projectsList.filter((p) => p.project_id !== projectId);
      setProjectsList(updated);
      if (currentProject?.project_id === projectId) {
        setCurrentProject(updated[0] || null);
      }
      showToast(`🗑️ Proyecto ${projectId} eliminado.`);
    } catch (err) {
      console.error('Error eliminando proyecto:', err);
    }
  };

  // 5. Generar imágenes con Arco Emocional, Biblioteca y Reutilización Inteligente
  const handleGenerateImages = async (singleSceneId?: number, forceAi: boolean = false) => {
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
          smartReuse: smartReuseImages,
          forceAi,
        }),
      });

      const updatedProject: ProjectScript = await res.json();
      setCurrentProject(updatedProject);
      loadProjectsList(false);
      if (selectedChannel) {
        loadChannelCharacters(selectedChannel.channel_id);
      }
      if (!singleSceneId) {
        setActiveStep(4); // Avanzar a galería de imágenes y audio
      }
    } catch (err) {
      console.error('Error generando imágenes:', err);
    } finally {
      setIsGeneratingImages(false);
    }
  };

  // Reutilizar una imagen existente de la biblioteca en una escena (0 costo, instantáneo)
  const handleAssignLibraryImageToScene = async (sceneId: number, imageUrl: string, prompt?: string) => {
    if (!currentProject) return;
    const updatedScenes = currentProject.scenes.map((s) => {
      if (s.scene_id === sceneId) {
        return { ...s, imageUrl, imageReused: true, reusedAssetPrompt: prompt };
      }
      return s;
    });
    const updatedProject = { ...currentProject, scenes: updatedScenes };
    setCurrentProject(updatedProject);
    setLibraryPickerSceneId(null);

    try {
      await fetch(`/api/projects/${currentProject.project_id}/scenes/${sceneId}/set-library-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl, prompt }),
      });
      showToast(`🖼️ Imagen reutilizada con éxito en la Escena ${sceneId} (0 costo)`);
      loadProjectsList(false);
    } catch (err) {
      console.error('Error asignando imagen de biblioteca:', err);
    }
  };

  // Establecer una imagen como retrato oficial del personaje desde la galería
  const handleSetCanonicalCharacterImage = async (characterId: string, imageUrl: string) => {
    if (!selectedChannel) return;
    try {
      const res = await fetch(`/api/characters/${selectedChannel.channel_id}/${characterId}/set-canonical`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }),
      });
      if (res.ok) {
        const updatedChar: CharacterProfile = await res.json();
        setSelectedLibraryChar(updatedChar);
        if (currentProject && currentProject.characters?.[0]?.character_id === characterId) {
          setCurrentProject({
            ...currentProject,
            characters: [updatedChar],
          });
        }
        loadChannelCharacters(selectedChannel.channel_id);
        showToast(`⭐ Retrato oficial actualizado para ${updatedChar.name}`);
      }
    } catch (err) {
      console.error('Error actualizando retrato oficial:', err);
    }
  };

  // Obtener todas las imágenes disponibles en la biblioteca para reutilizar con sus metadatos
  const getAvailableLibraryImages = () => {
    interface LibraryAssetItem {
      url: string;
      label: string;
      source: string;
      prompt?: string;
      place?: string;
      company?: string;
      shotType?: string;
      tags?: string[];
    }
    const list: LibraryAssetItem[] = [];
    const seen = new Set<string>();

    const add = (
      url?: string,
      label?: string,
      source: string = 'Personaje',
      meta?: { prompt?: string; place?: string; company?: string; shotType?: string; tags?: string[] }
    ) => {
      if (!url || seen.has(url)) return;
      seen.add(url);
      list.push({
        url,
        label: label || 'Imagen de Biblioteca',
        source,
        prompt: meta?.prompt,
        place: meta?.place,
        company: meta?.company,
        shotType: meta?.shotType,
        tags: meta?.tags,
      });
    };

    // 1. Activos enriquecidos del personaje activo
    if (activeCharacter?.assets && activeCharacter.assets.length > 0) {
      activeCharacter.assets.forEach((asset) => {
        add(asset.url, asset.description || asset.placeOrEnvironment || `${activeCharacter.name} (Activo)`, `🎭 ${activeCharacter.name}`, {
          prompt: asset.prompt,
          place: asset.placeOrEnvironment,
          company: asset.companyOrSubject,
          shotType: asset.shotType,
          tags: asset.tags,
        });
      });
    }

    // 2. Retrato oficial del personaje activo
    if (activeCharacter?.canonical_image_url) {
      add(activeCharacter.canonical_image_url, `${activeCharacter.name} (Retrato Oficial)`, 'Personaje Oficial');
    }
    if (activeCharacter?.reference_gallery) {
      activeCharacter.reference_gallery.forEach((url, i) => {
        add(url, `${activeCharacter.name} (Activo #${i + 1})`, 'Galería del Personaje');
      });
    }

    // 3. Otros personajes y sus activos registrados en el canal
    channelCharacters.forEach((c) => {
      if (c.character_id !== activeCharacter?.character_id) {
        if (c.assets && c.assets.length > 0) {
          c.assets.forEach((asset) => {
            add(asset.url, asset.description || asset.placeOrEnvironment || `${c.name} (Activo)`, `Biblioteca: ${c.name}`, {
              prompt: asset.prompt,
              place: asset.placeOrEnvironment,
              company: asset.companyOrSubject,
              shotType: asset.shotType,
              tags: asset.tags,
            });
          });
        }
        if (c.canonical_image_url) add(c.canonical_image_url, `${c.name} (Retrato)`, 'Biblioteca del Canal');
        c.reference_gallery?.forEach((url, i) => {
          add(url, `${c.name} (Variación #${i + 1})`, 'Biblioteca del Canal');
        });
      }
    });

    // 4. Imágenes ya generadas en escenas del proyecto
    if (currentProject?.scenes) {
      currentProject.scenes.forEach((s) => {
        if (s.imageUrl) {
          add(s.imageUrl, `Escena ${s.scene_id}: ${s.chapter}`, 'Escenas del Video', {
            prompt: s.visual_prompt,
            place: s.chapter,
            shotType: s.shot_type,
          });
        }
      });
    }

    return list;
  };

  // 5.0 Traducir Guion Aprobado de Español a Inglés Documental (y activar ElevenLabs)
  const handleTranslateToEnglish = async () => {
    if (!currentProject) return;
    setIsTranslating(true);
    try {
      const res = await fetch('/api/script/translate-en', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: currentProject.project_id }),
      });
      if (!res.ok) {
        const errData = await res.json();
        alert(`Error traduciendo a inglés: ${errData.error || res.statusText}`);
        return;
      }
      const translated: ProjectScript = await res.json();
      setCurrentProject(translated);
      loadProjectsList(false);
      showToast(
        '🇺🇸 ¡Guion adaptado a Inglés Documental! Motor ElevenLabs activado para producción final.'
      );
    } catch (err) {
      console.error('Error traduciendo guion a inglés:', err);
    } finally {
      setIsTranslating(false);
    }
  };

  // Helper para mostrar el nombre amigable de una voz
  const getVoiceDisplayName = (voiceIdOrName?: string) => {
    if (!voiceIdOrName) return 'Gomorra';
    const found = configStatus?.voiceStudioVoices?.find(
      (v: any) =>
        v.id.toLowerCase() === voiceIdOrName.toLowerCase() ||
        v.name.toLowerCase() === voiceIdOrName.toLowerCase()
    );
    return found?.name || (voiceIdOrName.toLowerCase().includes('gomorra') ? 'Gomorra' : voiceIdOrName);
  };

  // 5.1 Generar locución de audio Multi-Motor (VoiceStudio Gomorra Local RTX 3080 / ElevenLabs Cloud / OpenAI)
  const handleGenerateAudio = async (
    singleSceneId?: number,
    explicitProvider?: 'voicestudio' | 'openai' | 'elevenlabs',
    explicitVoice?: string
  ) => {
    if (!currentProject) return;

    const providerToUse =
      explicitProvider ||
      currentProject.voiceEngine ||
      (configStatus?.hasVoiceStudio ? 'voicestudio' : (currentProject.language === 'en' ? 'elevenlabs' : 'openai'));

    setIsGeneratingAudio(true);
    setAudioGeneratingEngine(providerToUse);
    setAudioGeneratingSceneId(singleSceneId !== undefined ? singleSceneId : null);

    const voiceModeToUse = currentProject.voiceMode || 'single';
    const primaryVoiceToUse = currentProject.primaryVoice || 'gomorra';
    const secondaryVoiceToUse = currentProject.secondaryVoice || 'demo0001';

    try {
      const res = await fetch('/api/audio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProject.project_id,
          sceneId: singleSceneId,
          provider: providerToUse,
          voice: explicitVoice,
          voiceMode: voiceModeToUse,
          primaryVoice: primaryVoiceToUse,
          secondaryVoice: secondaryVoiceToUse,
        }),
      });

      const updatedProject: ProjectScript = await res.json();
      setCurrentProject(updatedProject);
      loadProjectsList(false);

      const isVoiceStudio = providerToUse === 'voicestudio';
      showToast(
        singleSceneId !== undefined
          ? `🎙️ Locución de escena ${singleSceneId} generada con ${isVoiceStudio ? 'VoiceStudio Local (RTX 3080)' : providerToUse}.`
          : `🎙️ Locución completa sintetizada con ${isVoiceStudio ? 'VoiceStudio Local GPU RTX 3080' : providerToUse} (${voiceModeToUse === 'dual' ? '2 Voces' : '1 Voz'}).`
      );
    } catch (err) {
      console.error('Error generando audio:', err);
    } finally {
      setIsGeneratingAudio(false);
      setAudioGeneratingEngine(null);
      setAudioGeneratingSceneId(null);
    }
  };

  // Cambiar modo de voz (1 sola voz vs 2 voces intercambiables)
  const handleSetVoiceMode = async (mode: 'single' | 'dual') => {
    if (!currentProject) return;
    const updated: ProjectScript = {
      ...currentProject,
      voiceMode: mode,
      primaryVoice: currentProject.primaryVoice || 'gomorra',
      secondaryVoice: currentProject.secondaryVoice || 'demo0001',
    };
    setCurrentProject(updated);
    try {
      await fetch('/api/project/voice-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProject.project_id,
          voiceMode: mode,
          primaryVoice: updated.primaryVoice,
          secondaryVoice: updated.secondaryVoice,
        }),
      });
      showToast(mode === 'single' ? '🎙️ Modo: 1 Sola Voz para todo el video' : '👥 Modo: 2 Voces Intercambiables activado');
    } catch (err) {
      console.error(err);
    }
  };

  // Cambiar la voz principal (Voz 1) o secundaria (Voz 2)
  const handleUpdateProjectVoice = async (type: 'primary' | 'secondary', voiceId: string) => {
    if (!currentProject) return;
    const updated: ProjectScript = {
      ...currentProject,
      [type === 'primary' ? 'primaryVoice' : 'secondaryVoice']: voiceId,
    };
    setCurrentProject(updated);
    try {
      await fetch('/api/project/voice-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProject.project_id,
          [type === 'primary' ? 'primaryVoice' : 'secondaryVoice']: voiceId,
        }),
      });
      const name = getVoiceDisplayName(voiceId);
      showToast(`🎙️ ${type === 'primary' ? 'Voz 1 (Principal)' : 'Voz 2 (Secundaria)'}: ${name}`);
    } catch (err) {
      console.error(err);
    }
  };

  // Alternar el rol de voz de una escena entre Voz 1 y Voz 2
  const handleToggleSceneVoiceRole = async (sceneId: number) => {
    if (!currentProject) return;
    const updatedScenes = currentProject.scenes.map((s) => {
      if (s.scene_id === sceneId) {
        const nextRole: 'primary' | 'secondary' = s.voiceRole === 'secondary' ? 'primary' : 'secondary';
        return { ...s, voiceRole: nextRole };
      }
      return s;
    });
    const updated: ProjectScript = { ...currentProject, scenes: updatedScenes };
    setCurrentProject(updated);

    try {
      const targetRole = updatedScenes.find((s) => s.scene_id === sceneId)?.voiceRole;
      await fetch('/api/project/voice-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProject.project_id,
          scenes: [{ scene_id: sceneId, voiceRole: targetRole }],
        }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Distribuir alternadamente las 2 voces (Escenas impares = Voz 1, Pares = Voz 2)
  const handleAutoAlternateVoices = async () => {
    if (!currentProject) return;
    const updatedScenes = currentProject.scenes.map((s, idx) => ({
      ...s,
      voiceRole: (idx % 2 === 0 ? 'primary' : 'secondary') as 'primary' | 'secondary',
    }));
    const updated: ProjectScript = { ...currentProject, voiceMode: 'dual', scenes: updatedScenes };
    setCurrentProject(updated);
    try {
      await fetch('/api/project/voice-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProject.project_id,
          voiceMode: 'dual',
          scenes: updatedScenes.map((s) => ({ scene_id: s.scene_id, voiceRole: s.voiceRole })),
        }),
      });
      showToast('🔀 Voces distribuidas alternadamente (Impares = Voz 1, Pares = Voz 2)');
    } catch (err) {
      console.error(err);
    }
  };

  // Asignar todas las escenas a la Voz 1 (Principal)
  const handleResetAllToPrimaryVoice = async () => {
    if (!currentProject) return;
    const updatedScenes = currentProject.scenes.map((s) => ({
      ...s,
      voiceRole: 'primary' as const,
    }));
    const updated: ProjectScript = { ...currentProject, scenes: updatedScenes };
    setCurrentProject(updated);
    try {
      await fetch('/api/project/voice-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProject.project_id,
          scenes: updatedScenes.map((s) => ({ scene_id: s.scene_id, voiceRole: 'primary' })),
        }),
      });
      showToast('🎙️ Todas las escenas asignadas a la Voz 1');
    } catch (err) {
      console.error(err);
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
        loadProjectsList(false);
        showToast('🎬 ¡Video MP4 1080p renderizado con éxito!');
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

  const projectsWithVoice = projectsList.filter((p) =>
    p.scenes.some((s) => Boolean(s.audioUrl))
  );

  const filteredProjects = projectsList.filter((p) => {
    const matchesSearch =
      !projectSearch.trim() ||
      p.title.toLowerCase().includes(projectSearch.toLowerCase()) ||
      p.project_id.toLowerCase().includes(projectSearch.toLowerCase()) ||
      (p.characterCompany || '').toLowerCase().includes(projectSearch.toLowerCase());

    if (!matchesSearch) return false;
    if (projectStatusFilter === 'all') return true;
    if (projectStatusFilter === 'has_voice') {
      return p.scenes.some((s) => Boolean(s.audioUrl));
    }
    if (projectStatusFilter === 'has_images') {
      return p.scenes.some((s) => Boolean(s.imageUrl));
    }
    if (projectStatusFilter === 'rendered') {
      return Boolean(p.outputVideoUrl) || p.status === 'rendered';
    }
    return true;
  });

  return (
    <div className="h-screen bg-[#070b14] text-slate-100 flex flex-col overflow-hidden">
      {/* 1. Header Superior Global */}
      <header className="border-b border-slate-800/80 bg-[#0b101e]/95 backdrop-blur sticky top-0 z-50 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Film className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
              Studio Multi-Canal Pro
              <span className="text-[11px] bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2.5 py-0.5 rounded-full font-mono font-semibold">
                v3.0 Character & Voice Studio
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Biblioteca Visual de Personajes • Guardado de Guiones • Reutilización Modular de Locución
            </p>
          </div>
        </div>

        {/* Controles Globales: Selector de Canal, Estado de Motores y Modo */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg p-1">
            <span className="text-xs text-slate-400 px-2.5 font-medium">Canal:</span>
            <select
              value={selectedChannel?.channel_id || ''}
              onChange={(e) => {
                const found = channels.find((c) => c.channel_id === e.target.value);
                if (found) setSelectedChannel(found);
              }}
              className="bg-slate-800 text-xs sm:text-sm font-semibold text-white px-3 py-1.5 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {channels.map((c) => (
                <option key={c.channel_id} value={c.channel_id}>
                  {c.display_title}
                </option>
              ))}
            </select>
          </div>

          <div
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
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

          {/* Control y Estado Interactivo de VoiceStudio Local (RTX 3080) */}
          <div className="hidden lg:flex items-center gap-2 bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs">
            {voiceStudioRunning ? (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold" title="VoiceStudio activo con aceleración CUDA en RTX 3080">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  VoiceStudio RTX 3080
                </span>
                <button
                  onClick={handleStopVoiceStudio}
                  className="text-[10px] bg-slate-800 hover:bg-rose-950/70 hover:text-rose-300 text-slate-400 border border-slate-700 hover:border-rose-800/60 px-2 py-0.5 rounded transition font-medium"
                  title="Detener servidor de audio local y liberar los 10GB de VRAM"
                >
                  Liberar GPU
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-slate-600" />
                  VoiceStudio Off
                </span>
                <button
                  onClick={handleStartVoiceStudio}
                  disabled={isStartingVoiceStudio}
                  className="text-[10px] bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold px-2 py-0.5 rounded flex items-center gap-1 transition shadow-sm"
                  title="Iniciar backend de audio VoiceStudio en GPU RTX 3080"
                >
                  {isStartingVoiceStudio ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Iniciando...
                    </>
                  ) : (
                    <>
                      <Zap className="w-3 h-3 text-amber-300" />
                      Arrancar Audio
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Motor de Voz Cloud de Respaldo */}
          <div
            className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold bg-purple-500/10 text-purple-300 border-purple-500/30"
            title="Motor de voz alternativo para producción cloud"
          >
            <Mic className="w-3.5 h-3.5 text-purple-400" />
            <span>{configStatus?.hasElevenLabs ? 'ElevenLabs v2' : 'OpenAI TTS-1'}</span>
          </div>

          <button
            onClick={() => setAutonomousMode(!autonomousMode)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
              autonomousMode
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/40 shadow-lg shadow-amber-500/10'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${autonomousMode ? 'text-amber-400' : 'text-slate-400'}`} />
            {autonomousMode ? 'Modo Autónomo' : 'Modo Estudio'}
          </button>
        </div>
      </header>

      {/* Toast Global de Confirmaciones */}
      {saveSuccessMsg && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900/95 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 shadow-2xl shadow-black/80 backdrop-blur">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* 2. Contenedor Principal con Sidebar Persistente Lateral */}
      <div className="flex-1 flex flex-row min-h-0">
        {/* BARRA LATERAL DEL ESTUDIO (SIDEBAR) */}
        <aside className="w-72 md:w-80 bg-[#0a0f1d] border-r border-slate-800/80 p-4 flex flex-col justify-between gap-6 shrink-0 overflow-y-auto">
          <div className="space-y-6">
            {/* Menú de Vistas del Estudio */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 px-2.5 pb-1">
                Áreas del Estudio
              </div>

              <button
                onClick={() => setStudioSection('production')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                  studioSection === 'production'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Film className="w-4 h-4" />
                  Editor de Producción
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                    studioSection === 'production'
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Paso {activeStep}/6
                </span>
              </button>

              <button
                onClick={() => {
                  loadProjectsList(false);
                  setStudioSection('projects');
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                  studioSection === 'projects'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <FolderKanban className="w-4 h-4" />
                  Mis Proyectos y Guiones
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                    studioSection === 'projects'
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {projectsList.length}
                </span>
              </button>

              <button
                onClick={() => {
                  if (selectedChannel) loadChannelCharacters(selectedChannel.channel_id);
                  setStudioSection('characters');
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                  studioSection === 'characters'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Users className="w-4 h-4" />
                  Biblioteca de Personajes
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                    studioSection === 'characters'
                      ? 'bg-purple-500 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {channelCharacters.length}
                </span>
              </button>

              <button
                onClick={() => {
                  loadProjectsList(false);
                  setStudioSection('voices');
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                  studioSection === 'voices'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Radio className="w-4 h-4" />
                  Banco de Voces y Audios
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                    studioSection === 'voices'
                      ? 'bg-indigo-500 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {projectsWithVoice.length}
                </span>
              </button>
            </div>

            {/* Tarjeta del Proyecto Activo en el Sidebar */}
            {currentProject && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-400">
                    Proyecto Activo
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {currentProject.language === 'en' ? '🇺🇸 EN' : '🇪🇸 ES'}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-white line-clamp-2 leading-snug">
                    {currentProject.title}
                  </h4>
                  <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                    {currentProject.project_id}
                  </p>
                </div>

                {currentProject.fork_type === 'voice_only' && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-2.5 py-1.5 text-[10px] text-emerald-300 font-semibold flex items-center gap-1.5">
                    <Mic className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>Voz reutilizada lista para nuevo video</span>
                  </div>
                )}

                {/* Personaje vinculado actual */}
                {activeCharacter && (
                  <div className="flex items-center gap-2.5 bg-slate-950/80 p-2 rounded-lg border border-slate-800/80">
                    {activeCharacter.canonical_image_url ? (
                      <img
                        src={activeCharacter.canonical_image_url}
                        alt={activeCharacter.name}
                        className="w-9 h-9 rounded-lg object-cover border border-purple-500/40 shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-bold text-white truncate">
                        {activeCharacter.name}
                      </div>
                      <div className="text-[10px] text-purple-300 truncate">
                        {activeCharacter.custom_uploaded
                          ? '✨ Versión Propia'
                          : activeCharacter.canonical_image_url
                          ? '🎨 Con Retrato IA'
                          : '📝 Solo Texto'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Acciones rápidas sobre el proyecto activo */}
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    onClick={() => handleForkProjectScript(currentProject)}
                    title="Guardar una copia independiente de este guion"
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 border border-slate-700 transition"
                  >
                    <Copy className="w-3 h-3 text-blue-400" />
                    Clonar Guion
                  </button>
                  <button
                    onClick={() => handleForkProjectVoice(currentProject)}
                    title="Crear otro video conservando solo la voz de este proyecto"
                    className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-[10px] font-semibold py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 border border-indigo-500/30 transition"
                  >
                    <Mic className="w-3 h-3 text-indigo-400" />
                    Reusar Voz
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Resumen Inferior del Estudio */}
          <div className="hidden lg:block bg-slate-900/50 border border-slate-800/80 rounded-xl p-3 text-[11px] text-slate-400 space-y-1">
            <div className="font-bold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              Flujo de Calidad Visual
            </div>
            <p className="leading-relaxed">
              Crea o sube la versión definitiva de tu personaje en la biblioteca antes de generar las escenas para mantener su identidad.
            </p>
          </div>
        </aside>

        {/* ÁREA DE TRABAJO PRINCIPAL */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Sub-barra de 6 Pasos (Visible cuando estamos en el Editor de Producción) */}
          {studioSection === 'production' && (
            <div className="bg-[#0b101e] border-b border-slate-800 px-6 py-3">
              <div className="max-w-6xl mx-auto flex items-center justify-between overflow-x-auto gap-2">
                {[
                  { id: 1, label: '1. Temas & Sheets', icon: Table },
                  { id: 2, label: '2. Editor de Guion', icon: Edit3 },
                  { id: 3, label: '3. Personaje & Retrato', icon: Users },
                  { id: 4, label: '4. Imágenes & Voz', icon: ImageIcon },
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
          )}

          <main className="flex-1 max-w-6xl w-full mx-auto p-6">
            {/* =====================================================================
                SECCIÓN A: BIBLIOTECA DE PROYECTOS Y GUIONES GUARDADOS
               ===================================================================== */}
            {studioSection === 'projects' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <FolderKanban className="w-5 h-5 text-blue-400" />
                      Mis Proyectos y Biblioteca de Guiones
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Todos tus guiones se guardan automáticamente. Puedes retomarlos, duplicar el guion o usar solo su voz para generar un video nuevo.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setStudioSection('production');
                      setActiveStep(1);
                    }}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-md shadow-blue-600/20"
                  >
                    <Plus className="w-4 h-4" />
                    Crear Nuevo Proyecto / Guion
                  </button>
                </div>

                {/* Buscador y Filtros */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
                  <div className="flex items-center gap-2 flex-1 min-w-[240px] bg-slate-950 border border-slate-800 rounded-lg px-3 py-2">
                    <Search className="w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Buscar por título, protagonista o ID de proyecto..."
                      value={projectSearch}
                      onChange={(e) => setProjectSearch(e.target.value)}
                      className="bg-transparent text-xs text-white focus:outline-none w-full"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { id: 'all', label: `Todos (${projectsList.length})` },
                      { id: 'has_voice', label: `🎙️ Con Voz (${projectsWithVoice.length})` },
                      {
                        id: 'has_images',
                        label: `🖼️ Con Imágenes (${
                          projectsList.filter((p) => p.scenes.some((s) => Boolean(s.imageUrl)))
                            .length
                        })`,
                      },
                      {
                        id: 'rendered',
                        label: `🎬 Renderizados (${
                          projectsList.filter((p) => Boolean(p.outputVideoUrl)).length
                        })`,
                      },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setProjectStatusFilter(tab.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          projectStatusFilter === tab.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lista de Tarjetas de Proyectos Guardados */}
                {filteredProjects.length === 0 ? (
                  <div className="text-center py-12 bg-slate-900/40 border border-slate-800 rounded-2xl text-slate-400 text-sm">
                    No se encontraron proyectos con ese filtro.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredProjects.map((proj) => {
                      const isCurrent = currentProject?.project_id === proj.project_id;
                      const audioCount = proj.scenes.filter((s) => Boolean(s.audioUrl)).length;
                      const imageCount = proj.scenes.filter((s) => Boolean(s.imageUrl)).length;
                      const firstSceneWithImg = proj.scenes.find((s) => Boolean(s.imageUrl));
                      const charImg = proj.characters?.[0]?.canonical_image_url;
                      const totalDurationMin = (
                        proj.scenes.reduce((acc, s) => acc + s.durationInSeconds, 0) / 60
                      ).toFixed(1);
                      const totalWords = proj.scenes.reduce(
                        (acc, s) => acc + s.voiceover.split(/\s+/).filter(Boolean).length,
                        0
                      );

                      return (
                        <div
                          key={proj.project_id}
                          className={`bg-slate-900 border rounded-2xl overflow-hidden flex flex-col justify-between transition shadow-md ${
                            isCurrent
                              ? 'border-blue-500 ring-1 ring-blue-500/40'
                              : 'border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            {/* Cabecera visual del proyecto */}
                            <div className="h-36 bg-slate-950 relative overflow-hidden border-b border-slate-800">
                              {firstSceneWithImg?.imageUrl ? (
                                <img
                                  src={firstSceneWithImg.imageUrl}
                                  alt={proj.title}
                                  className="w-full h-full object-cover opacity-80"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-slate-900 via-[#101935] to-slate-950 flex items-center justify-center">
                                  <FileText className="w-10 h-10 text-slate-700" />
                                </div>
                              )}

                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                              {/* Badges superiores */}
                              <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
                                {isCurrent && (
                                  <span className="bg-blue-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow">
                                    ACTIVO EN EDITOR
                                  </span>
                                )}
                                <span className="bg-slate-900/90 backdrop-blur text-slate-300 text-[10px] font-mono px-2 py-0.5 rounded border border-slate-700">
                                  {proj.language === 'en' ? '🇺🇸 Inglés' : '🇪🇸 Español'}
                                </span>
                                {proj.fork_type === 'voice_only' && (
                                  <span className="bg-emerald-500/20 backdrop-blur text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded">
                                    🎙️ Voz Reutilizada
                                  </span>
                                )}
                                {proj.outputVideoUrl && (
                                  <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                                    ✓ MP4 Listo
                                  </span>
                                )}
                              </div>

                              {/* Avatar del personaje del proyecto */}
                              {proj.characters?.[0] && (
                                <div className="absolute bottom-3 left-3 flex items-center gap-2">
                                  {charImg ? (
                                    <img
                                      src={charImg}
                                      alt={proj.characters[0].name}
                                      className="w-8 h-8 rounded-lg object-cover border border-purple-400"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-lg bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300">
                                      <User className="w-4 h-4" />
                                    </div>
                                  )}
                                  <span className="text-xs font-bold text-white drop-shadow">
                                    {proj.characters[0].name}
                                  </span>
                                </div>
                              )}

                              <div className="absolute bottom-3 right-3 text-[11px] font-mono font-bold text-amber-300 bg-slate-900/80 px-2 py-0.5 rounded border border-amber-500/30">
                                ⏱ {totalDurationMin} min • {proj.scenes.length} escenas
                              </div>
                            </div>

                            {/* Cuerpo de la tarjeta */}
                            <div className="p-4 space-y-2.5">
                              <h3 className="text-sm font-bold text-white line-clamp-2 leading-snug">
                                {proj.title}
                              </h3>
                              <p className="text-xs text-slate-400 line-clamp-2 italic">
                                "{proj.hook}"
                              </p>

                              {/* Indicadores de Activos del Proyecto */}
                              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                                <span className="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded text-slate-300 font-mono">
                                  📝 {totalWords} palabras
                                </span>
                                <span
                                  className={`px-2.5 py-1 rounded border font-semibold ${
                                    audioCount > 0
                                      ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                                      : 'bg-slate-950 text-slate-500 border-slate-800'
                                  }`}
                                >
                                  🎙️ Voz: {audioCount}/{proj.scenes.length}
                                </span>
                                <span
                                  className={`px-2.5 py-1 rounded border font-semibold ${
                                    imageCount > 0
                                      ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                                      : 'bg-slate-950 text-slate-500 border-slate-800'
                                  }`}
                                >
                                  🖼️ Imágenes: {imageCount}/{proj.scenes.length}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Barra de Acciones del Proyecto */}
                          <div className="p-4 pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 bg-slate-950/40">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                onClick={() => {
                                  setCurrentProject(proj);
                                  setStudioSection('production');
                                  setActiveStep(2);
                                }}
                                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                Abrir Guion
                              </button>

                              <button
                                onClick={() => handleForkProjectVoice(proj)}
                                className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
                                title="Conserva los audios y tiempos de este proyecto y crea un proyecto limpio para generar otras imágenes y otro video"
                              >
                                <Mic className="w-3.5 h-3.5 text-indigo-400" />
                                Usar solo la Voz (Nuevo Video)
                              </button>

                              <button
                                onClick={() => handleForkProjectScript(proj)}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition"
                                title="Duplicar solo el guion"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                Duplicar Guion
                              </button>
                            </div>

                            <button
                              onClick={() => handleDeleteProject(proj.project_id)}
                              className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition"
                              title="Eliminar proyecto"
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
            )}

            {/* =====================================================================
                SECCIÓN B: BIBLIOTECA VISUAL DE PERSONAJES (CHARACTER STUDIO)
               ===================================================================== */}
            {studioSection === 'characters' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-purple-400 uppercase tracking-wider font-semibold bg-purple-500/10 px-2.5 py-0.5 rounded border border-purple-500/20">
                        Character Studio • {selectedChannel?.display_title}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-white mt-1">
                      Biblioteca Visual de Personajes y Versiones Mejoradas
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Previsualiza a tus personajes con IA antes de crear las escenas o sube tus propias versiones mejoradas para cuidar al máximo la calidad.
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => {
                        const name = prompt(
                          'Nombre del nuevo personaje (ej: Sam Bankman-Fried, Elizabeth Holmes):'
                        );
                        if (name && name.trim()) {
                          handleDraftNewCharacter(name.trim(), `Historia sobre ${name.trim()}`);
                        }
                      }}
                      className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-lg shadow-purple-600/20"
                    >
                      <Plus className="w-4 h-4" />
                      Crear Nuevo Personaje
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Columna Izquierda: Galería de Tarjetas de Personajes (5 cols) */}
                  <div className="lg:col-span-5 space-y-3">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Personajes Registrados ({channelCharacters.length})
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 max-h-[680px] overflow-y-auto pr-1">
                      {channelCharacters.map((char) => {
                        const isSelected =
                          selectedLibraryChar?.character_id === char.character_id;
                        const isAssignedToCurrent =
                          currentProject?.characters?.[0]?.character_id === char.character_id;

                        return (
                          <div
                            key={char.character_id}
                            onClick={() => setSelectedLibraryChar(char)}
                            className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center gap-3.5 ${
                              isSelected
                                ? 'bg-purple-950/30 border-purple-500 ring-1 ring-purple-500/30'
                                : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            {/* Miniatura del Retrato */}
                            <div className="w-16 h-16 rounded-xl bg-slate-950 border border-slate-700 overflow-hidden shrink-0 relative flex items-center justify-center">
                              {char.canonical_image_url ? (
                                <img
                                  src={char.canonical_image_url}
                                  alt={char.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <User className="w-7 h-7 text-slate-600" />
                              )}
                              {char.custom_uploaded && (
                                <span
                                  className="absolute bottom-0 inset-x-0 bg-emerald-600/90 text-[8px] font-extrabold text-white text-center py-0.5 uppercase"
                                  title="Versión propia subida por ti"
                                >
                                  Propio
                                </span>
                              )}
                            </div>

                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center justify-between gap-1">
                                <h4 className="text-sm font-bold text-white truncate">
                                  {char.name}
                                </h4>
                                {isAssignedToCurrent && (
                                  <span className="text-[9px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded font-bold shrink-0">
                                    En Proyecto
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 truncate">{char.role}</p>
                              <div className="flex items-center gap-2 text-[10px]">
                                {char.canonical_image_url ? (
                                  <span className="text-emerald-400 font-semibold">
                                    ✓ Retrato Oficial Activo
                                  </span>
                                ) : (
                                  <span className="text-amber-400/90">
                                    Sin retrato visual aún
                                  </span>
                                )}
                                {char.reference_gallery && char.reference_gallery.length > 1 && (
                                  <span className="text-slate-500 font-mono">
                                    ({char.reference_gallery.length} versiones)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Columna Derecha: Mesa de Trabajo y Subida de Versiones del Personaje Seleccionado (7 cols) */}
                  <div className="lg:col-span-7">
                    {selectedLibraryChar ? (
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
                        {/* Encabezado del personaje */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-bold text-white">
                                {selectedLibraryChar.name}
                              </h3>
                              <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                                ID: {selectedLibraryChar.character_id}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400">{selectedLibraryChar.role}</p>
                          </div>

                          <div className="flex items-center gap-2">
                            {currentProject && (
                              <button
                                onClick={() => {
                                  handleSelectCharacterFromLibrary(
                                    selectedLibraryChar.character_id
                                  );
                                }}
                                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition shadow-md shadow-blue-600/20"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Usar en Proyecto Activo
                              </button>
                            )}

                            <button
                              onClick={() => handleSaveCharacterToLibrary(selectedLibraryChar)}
                              className="bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition"
                            >
                              <Save className="w-3.5 h-3.5" />
                              Guardar Ficha
                            </button>

                            <button
                              onClick={() => handleDeleteCharacter(selectedLibraryChar)}
                              className="text-slate-500 hover:text-rose-400 p-2 rounded-lg hover:bg-rose-500/10 transition"
                              title="Eliminar personaje"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Área Visual: Retrato Principal + Botones de Generación IA y Subida Propia */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center bg-slate-950/70 border border-slate-800/90 p-4 rounded-xl">
                          <div className="sm:col-span-5">
                            <div className="aspect-square w-full rounded-xl bg-slate-900 border border-slate-700 overflow-hidden relative flex items-center justify-center shadow-inner">
                              {selectedLibraryChar.canonical_image_url ? (
                                <img
                                  src={selectedLibraryChar.canonical_image_url}
                                  alt={selectedLibraryChar.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="text-center p-4 space-y-2 text-slate-500">
                                  <User className="w-12 h-12 mx-auto text-slate-600" />
                                  <p className="text-[11px]">
                                    Aún no hay imagen de referencia. Genera un retrato con IA o sube tu propia versión.
                                  </p>
                                </div>
                              )}

                              {selectedLibraryChar.canonical_image_url && (
                                <span
                                  className={`absolute top-2.5 left-2.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full backdrop-blur border ${
                                    selectedLibraryChar.custom_uploaded
                                      ? 'bg-emerald-500/90 text-white border-emerald-400'
                                      : 'bg-purple-600/90 text-white border-purple-400'
                                  }`}
                                >
                                  {selectedLibraryChar.custom_uploaded
                                    ? '✨ Versión Propia Subida'
                                    : '🎨 Retrato IA'}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="sm:col-span-7 space-y-3">
                            <div className="space-y-1">
                              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                                Control de Calidad del Personaje
                              </h4>
                              <p className="text-xs text-slate-400 leading-relaxed">
                                Antes de crear las escenas del video, puedes generar el retrato del personaje para verlo o <strong>subir tu propia versión más trabajada</strong>. Esta imagen se inyectará como referencia visual en las escenas.
                              </p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                              <button
                                disabled={isGeneratingPortrait}
                                onClick={() =>
                                  handleGenerateCharacterPortrait(selectedLibraryChar)
                                }
                                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-semibold py-2.5 px-3.5 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 transition"
                              >
                                {isGeneratingPortrait ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Wand2 className="w-4 h-4" />
                                )}
                                {isGeneratingPortrait
                                  ? 'Generando Retrato...'
                                  : 'Generar Retrato con IA'}
                              </button>

                              <input
                                ref={studioCharFileInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleUploadCharacterImage(file, selectedLibraryChar);
                                    e.target.value = '';
                                  }
                                }}
                              />
                              <button
                                disabled={isUploadingImage}
                                onClick={() => studioCharFileInputRef.current?.click()}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold py-2.5 px-3.5 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition"
                              >
                                <Upload className="w-4 h-4" />
                                {isUploadingImage
                                  ? 'Subiendo...'
                                  : 'Subir Mi Propia Versión'}
                              </button>
                            </div>

                            {/* Galería de versiones anteriores del personaje */}
                            {selectedLibraryChar.reference_gallery &&
                              selectedLibraryChar.reference_gallery.length > 0 && (
                                <div className="pt-2 space-y-1.5">
                                  <div className="text-[11px] font-semibold text-slate-400">
                                    Historial de Versiones ({selectedLibraryChar.reference_gallery.length}) — haz clic para elegir la oficial:
                                  </div>
                                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                    {selectedLibraryChar.reference_gallery.map((imgUrl, idx) => {
                                      const isCurrentImg =
                                        selectedLibraryChar.canonical_image_url === imgUrl;
                                      return (
                                        <button
                                          key={idx}
                                          onClick={() =>
                                            handleSelectCharacterGalleryImage(
                                              selectedLibraryChar,
                                              imgUrl
                                            )
                                          }
                                          className={`w-12 h-12 rounded-lg overflow-hidden border-2 shrink-0 transition ${
                                            isCurrentImg
                                              ? 'border-emerald-400 scale-105'
                                              : 'border-slate-700 opacity-60 hover:opacity-100'
                                          }`}
                                        >
                                          <img
                                            src={imgUrl}
                                            alt={`Versión ${idx + 1}`}
                                            className="w-full h-full object-cover"
                                          />
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                          </div>
                        </div>

                        {/* Campos de edición de la ficha */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                              Nombre del Personaje:
                            </label>
                            <input
                              type="text"
                              value={selectedLibraryChar.name}
                              onChange={(e) =>
                                setSelectedLibraryChar({
                                  ...selectedLibraryChar,
                                  name: e.target.value,
                                })
                              }
                              className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                              Rol en la Historia:
                            </label>
                            <input
                              type="text"
                              value={selectedLibraryChar.role}
                              onChange={(e) =>
                                setSelectedLibraryChar({
                                  ...selectedLibraryChar,
                                  role: e.target.value,
                                })
                              }
                              className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" /> Prompt Ancla 3D (Rasgos Faciales, Edad, Vestimenta y Estilo):
                          </label>
                          <textarea
                            rows={4}
                            value={selectedLibraryChar.anchor_prompt}
                            onChange={(e) =>
                              setSelectedLibraryChar({
                                ...selectedLibraryChar,
                                anchor_prompt: e.target.value,
                              })
                            }
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-purple-200 font-mono leading-relaxed focus:outline-none focus:border-purple-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Objetos y Elementos Distintivos (Props separados por comas):
                          </label>
                          <input
                            type="text"
                            value={(selectedLibraryChar.signature_props || []).join(', ')}
                            onChange={(e) =>
                              setSelectedLibraryChar({
                                ...selectedLibraryChar,
                                signature_props: e.target.value
                                  .split(',')
                                  .map((p) => p.trim()),
                              })
                            }
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300 focus:outline-none focus:border-purple-500"
                          />
                        </div>

                        {/* Galería de Activos e Imágenes Asociadas al Personaje / Empresa / Entorno */}
                        <div className="pt-4 border-t border-slate-800/80 space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                <ImageIcon className="w-4 h-4 text-purple-400" />
                                Biblioteca de Imágenes Asociadas ({selectedLibraryChar.assets?.length || selectedLibraryChar.reference_gallery?.length || 0})
                              </h4>
                              <p className="text-xs text-slate-400">
                                Imágenes guardadas de este personaje, sus locaciones y su empresa para reutilización automática en futuros videos.
                              </p>
                            </div>

                            {/* Filtro de búsqueda */}
                            <div className="relative">
                              <input
                                type="text"
                                placeholder="Buscar por lugar, empresa o prompt..."
                                value={characterAssetSearch}
                                onChange={(e) => setCharacterAssetSearch(e.target.value)}
                                className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 w-56"
                              />
                              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                            </div>
                          </div>

                          {/* Grid de activos enriquecidos */}
                          {(() => {
                            const assetsList: VisualAssetMetadata[] = selectedLibraryChar.assets && selectedLibraryChar.assets.length > 0
                              ? selectedLibraryChar.assets
                              : (selectedLibraryChar.reference_gallery || []).map((url, i) => ({
                                  id: `ref_${i}`,
                                  url,
                                  prompt: '',
                                  description: `Activo #${i + 1}`,
                                  createdAt: '',
                                }));

                            const filtered = assetsList.filter((a) => {
                              if (!characterAssetSearch) return true;
                              const q = characterAssetSearch.toLowerCase();
                              return (
                                a.prompt?.toLowerCase().includes(q) ||
                                a.description?.toLowerCase().includes(q) ||
                                a.placeOrEnvironment?.toLowerCase().includes(q) ||
                                a.companyOrSubject?.toLowerCase().includes(q) ||
                                a.tags?.some((t) => t.toLowerCase().includes(q))
                              );
                            });

                            if (filtered.length === 0) {
                              return (
                                <div className="p-6 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                                  {characterAssetSearch ? 'No se encontraron imágenes que coincidan con la búsqueda.' : 'No hay imágenes guardadas para este personaje aún.'}
                                </div>
                              );
                            }

                            return (
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {filtered.map((asset, idx) => {
                                  const isOfficial = selectedLibraryChar.canonical_image_url === asset.url;
                                  return (
                                    <div
                                      key={asset.id || idx}
                                      className={`group bg-slate-950/80 border rounded-xl overflow-hidden flex flex-col transition hover:border-purple-500/50 ${
                                        isOfficial ? 'border-purple-500 ring-1 ring-purple-500/30' : 'border-slate-800/80'
                                      }`}
                                    >
                                      <div className="aspect-video w-full bg-black relative overflow-hidden">
                                        <img
                                          src={asset.url}
                                          alt={asset.description || 'Activo'}
                                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                        />
                                        {isOfficial && (
                                          <span className="absolute top-2 left-2 bg-purple-600/90 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow backdrop-blur-sm">
                                            ⭐ Retrato Oficial
                                          </span>
                                        )}
                                        {asset.placeOrEnvironment && (
                                          <span className="absolute bottom-1 left-1 bg-black/80 text-amber-300 text-[9px] font-medium px-1.5 py-0.5 rounded backdrop-blur max-w-[85%] truncate">
                                            🏢 {asset.placeOrEnvironment}
                                          </span>
                                        )}
                                      </div>

                                      <div className="p-2.5 space-y-2 flex-1 flex flex-col justify-between">
                                        <div className="space-y-1">
                                          {asset.description && (
                                            <div className="text-[11px] font-semibold text-slate-200 line-clamp-1">
                                              {asset.description}
                                            </div>
                                          )}
                                          {asset.prompt ? (
                                            <div className="text-[10px] text-slate-400 line-clamp-2 leading-tight" title={asset.prompt}>
                                              {asset.prompt}
                                            </div>
                                          ) : (
                                            <div className="text-[10px] text-slate-500 italic">Sin prompt guardado</div>
                                          )}
                                        </div>

                                        <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800/50">
                                          {!isOfficial && (
                                            <button
                                              onClick={() => handleSetCanonicalCharacterImage(selectedLibraryChar.character_id, asset.url)}
                                              className="text-[10px] text-purple-300 hover:text-purple-200 bg-purple-500/10 hover:bg-purple-500/20 px-2 py-1 rounded border border-purple-500/20 transition flex-1 text-center font-medium"
                                            >
                                              ⭐ Hacer Oficial
                                            </button>
                                          )}
                                          {asset.prompt && (
                                            <button
                                              onClick={() => {
                                                navigator.clipboard.writeText(asset.prompt);
                                                showToast('Prompt copiado al portapapeles');
                                              }}
                                              className="text-[10px] text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-800 px-2 py-1 rounded border border-slate-700/50 transition"
                                              title="Copiar prompt al portapapeles"
                                            >
                                              <Copy className="w-3 h-3" />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-sm">
                        Selecciona un personaje de la izquierda o crea uno nuevo.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* =====================================================================
                SECCIÓN C: BANCO DE VOCES Y AUDIOS REUTILIZABLES (VOICE HUB)
               ===================================================================== */}
            {studioSection === 'voices' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Radio className="w-5 h-5 text-indigo-400" />
                      Banco de Voces y Reutilización de Locuciones
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      ¿Te gustó cómo quedó la voz de un proyecto pero no el video? Usa solo esa voz con un clic para generar otro video con nuevas imágenes o personajes.
                    </p>
                  </div>
                </div>

                {projectsWithVoice.length === 0 ? (
                  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
                    <Mic className="w-10 h-10 text-slate-600 mx-auto" />
                    <div className="text-sm font-bold text-white">
                      Aún no hay proyectos con pistas de voz generadas
                    </div>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Cuando generes la locución de un proyecto en el Paso 4, aparecerá aquí automáticamente para que puedas escucharla o reutilizarla en futuros videos.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {projectsWithVoice.map((proj) => {
                      const audioScenes = proj.scenes.filter((s) => Boolean(s.audioUrl));
                      const totalSec = Math.round(
                        proj.scenes.reduce((acc, s) => acc + s.durationInSeconds, 0)
                      );
                      const isExpanded = expandedVoiceProjectId === proj.project_id;

                      return (
                        <div
                          key={proj.project_id}
                          className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-md"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-0.5 rounded">
                                  {proj.voiceEngine === 'elevenlabs'
                                    ? '🎙️ ElevenLabs Multilingual v2'
                                    : '🎙️ OpenAI Onyx HD'}
                                </span>
                                <span className="text-xs font-mono text-slate-400">
                                  {proj.language === 'en' ? '🇺🇸 Inglés' : '🇪🇸 Español'}
                                </span>
                                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                                  {audioScenes.length}/{proj.scenes.length} escenas con audio ({totalSec}s totales)
                                </span>
                              </div>
                              <h3 className="text-base font-bold text-white">{proj.title}</h3>
                              <p className="text-xs text-slate-400 font-mono">
                                ID Origen: {proj.project_id}
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2.5">
                              <button
                                onClick={() =>
                                  setExpandedVoiceProjectId(
                                    isExpanded ? null : proj.project_id
                                  )
                                }
                                className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-1.5 border border-slate-700 transition"
                              >
                                <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                                {isExpanded
                                  ? 'Ocultar Pistas de Audio'
                                  : `Escuchar Pistas (${audioScenes.length})`}
                              </button>

                              <button
                                onClick={() => handleForkProjectVoice(proj)}
                                className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition"
                              >
                                <Mic className="w-4 h-4" />
                                Usar solo esta Voz y Generar Otro Video
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Lista desplegable de los audios por escena */}
                          {isExpanded && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-800">
                              {proj.scenes.map((scene) => (
                                <div
                                  key={scene.scene_id}
                                  className="bg-slate-950 border border-slate-800/90 p-3 rounded-xl space-y-2"
                                >
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-white truncate">
                                      Escena {scene.scene_id}: {scene.chapter}
                                    </span>
                                    <span className="font-mono text-amber-300 shrink-0">
                                      {scene.durationInSeconds}s
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-400 line-clamp-2">
                                    {scene.voiceover}
                                  </p>
                                  {scene.audioUrl ? (
                                    <audio
                                      controls
                                      src={scene.audioUrl}
                                      className="w-full h-7 rounded"
                                    />
                                  ) : (
                                    <div className="text-[11px] text-slate-600 italic">
                                      Sin audio generado
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* =====================================================================
                SECCIÓN D: EDITOR DE PRODUCCIÓN (FLUJO PASO A PASO 1..6)
               ===================================================================== */}
            {studioSection === 'production' && (
              <>
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
                              CPM:{' '}
                              <strong className="text-emerald-400">
                                {selectedChannel.cpm_tier}
                              </strong>
                            </span>
                            <span className="text-xs text-slate-400 ml-2">
                              Personajes en Biblioteca:{' '}
                              <strong className="text-blue-400">
                                {channelCharacters.length}
                              </strong>
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
                        {isGenerating ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
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
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${loadingSheet ? 'animate-spin' : ''}`}
                          />
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
                                        Fuente {sIdx + 1}{' '}
                                        <ExternalLink className="w-2.5 h-2.5" />
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
                                  {isGenerating ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Bot className="w-3.5 h-3.5" />
                                  )}
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

                {/* PASO 2: Editor y Refinador de Guion + Dossier de Investigación 360° */}
                {activeStep === 2 && currentProject && (
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono text-blue-400 uppercase tracking-wider font-semibold">
                            Proyecto: {currentProject.project_id}
                          </span>
                          <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-mono font-bold">
                            ⏱{' '}
                            {(
                              currentProject.scenes.reduce(
                                (acc, s) => acc + s.durationInSeconds,
                                0
                              ) / 60
                            ).toFixed(1)}{' '}
                            min ({currentProject.scenes.length} escenas •{' '}
                            {currentProject.scenes.length * 4} sub-cortes de cámara)
                          </span>
                          <span className="text-xs bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full font-mono">
                            📝{' '}
                            {currentProject.scenes.reduce(
                              (acc, s) =>
                                acc + s.voiceover.split(/\s+/).filter(Boolean).length,
                              0
                            )}{' '}
                            palabras
                          </span>
                        </div>
                        <h2 className="text-xl font-bold text-white mt-1">
                          {currentProject.title}
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">
                          Gancho de apertura:{' '}
                          <em className="text-slate-300">"{currentProject.hook}"</em>
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          onClick={() =>
                            persistProjectUpdate(
                              currentProject,
                              '💾 ¡Guion guardado en tu Biblioteca de Proyectos!'
                            )
                          }
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 border border-slate-700 transition"
                        >
                          <Save className="w-3.5 h-3.5 text-emerald-400" />
                          Guardar Guion
                        </button>

                        <button
                          onClick={() => handleForkProjectScript(currentProject)}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs px-3.5 py-2.5 rounded-lg flex items-center gap-1.5 border border-slate-700 transition"
                        >
                          <Copy className="w-3.5 h-3.5 text-blue-400" />
                          Guardar Copia / Versión
                        </button>

                        <button
                          onClick={() => setActiveStep(3)}
                          className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-5 py-2.5 rounded-lg flex items-center gap-2 transition shadow-lg shadow-blue-600/20"
                        >
                          <Users className="w-4 h-4" />
                          Aprobar Guion y Ver Personaje
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* DOSSIER DE INVESTIGACIÓN FORENSE 360° */}
                    {currentProject.researchDossier && (
                      <div className="bg-gradient-to-br from-slate-900 via-[#0d1527] to-slate-900 border border-blue-500/30 rounded-2xl p-5 space-y-4 shadow-lg">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                          <div className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-blue-400" />
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                              Dossier de Investigación Forense 360° (Estructura Narrativa de 6 Actos)
                            </h3>
                          </div>
                          <span className="text-[11px] font-mono text-slate-400">
                            {currentProject.researchDossier.raw_sources_summary ||
                              'Investigación Verificada'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-slate-950/80 border border-blue-500/20 rounded-xl p-4 space-y-2">
                            <div className="text-[11px] font-extrabold uppercase tracking-wider text-blue-400">
                              Acto II • ¿Quién es el Protagonista?
                            </div>
                            <div className="text-sm font-bold text-white">
                              {currentProject.researchDossier.protagonist_profile.name}
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">
                              <strong>Origen:</strong>{' '}
                              {currentProject.researchDossier.protagonist_profile.backstory}
                            </p>
                            <p className="text-xs text-emerald-300/90 leading-relaxed">
                              <strong>Cima:</strong>{' '}
                              {
                                currentProject.researchDossier.protagonist_profile
                                  .greatest_achievement
                              }
                            </p>
                            <p className="text-xs text-amber-300/90 leading-relaxed">
                              <strong>Punto Ciego:</strong>{' '}
                              {
                                currentProject.researchDossier.protagonist_profile
                                  .psychological_flaw
                              }
                            </p>
                          </div>

                          <div className="bg-slate-950/80 border border-purple-500/20 rounded-xl p-4 space-y-2">
                            <div className="text-[11px] font-extrabold uppercase tracking-wider text-purple-400">
                              Acto III • El Antagonista / Contrapeso
                            </div>
                            <div className="text-sm font-bold text-white">
                              {currentProject.researchDossier.antagonist_profile.name}
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">
                              <strong>Rol:</strong>{' '}
                              {currentProject.researchDossier.antagonist_profile.role}
                            </p>
                            <p className="text-xs text-slate-300 leading-relaxed">
                              <strong>Tensión:</strong>{' '}
                              {
                                currentProject.researchDossier.antagonist_profile
                                  .relationship_to_protagonist
                              }
                            </p>
                            <p className="text-xs text-purple-300/90 leading-relaxed">
                              <strong>Jugada Clave:</strong>{' '}
                              {currentProject.researchDossier.antagonist_profile.key_move}
                            </p>
                          </div>

                          <div className="bg-slate-950/80 border border-emerald-500/20 rounded-xl p-4 space-y-2">
                            <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400">
                              Acto IV • Paréntesis de Concepto Clave
                            </div>
                            <div className="text-sm font-bold text-white">
                              {
                                currentProject.researchDossier.core_concept_explainer
                                  .concept_name
                              }
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">
                              <strong>Definición:</strong>{' '}
                              {
                                currentProject.researchDossier.core_concept_explainer
                                  .simple_definition
                              }
                            </p>
                            <p className="text-xs text-emerald-300/90 leading-relaxed">
                              <strong>Analogía Cotidiana:</strong> "
                              {
                                currentProject.researchDossier.core_concept_explainer
                                  .everyday_analogy
                              }
                              "
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Escenas en Tarjetas Editables */}
                    <div className="space-y-4">
                      {currentProject.scenes.map((scene) => (
                        <div
                          key={scene.scene_id}
                          className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4 shadow-sm"
                        >
                          <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 pb-3 gap-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-bold flex items-center justify-center">
                                {scene.scene_id}
                              </span>
                              {scene.act_number && (
                                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-amber-500/20">
                                  Acto {scene.act_number}
                                </span>
                              )}
                              <input
                                type="text"
                                value={scene.chapter}
                                onChange={(e) =>
                                  handleUpdateScene(scene.scene_id, 'chapter', e.target.value)
                                }
                                className="bg-transparent font-bold text-white text-sm focus:outline-none focus:border-b border-blue-500 min-w-[220px]"
                              />
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                              <span>Plano Visual:</span>
                              <select
                                value={scene.shot_type || 'character_closeup'}
                                onChange={(e) =>
                                  handleUpdateScene(
                                    scene.scene_id,
                                    'shot_type',
                                    e.target.value
                                  )
                                }
                                className="bg-slate-800 text-blue-300 px-2 py-1 rounded border border-slate-700 text-xs focus:outline-none"
                              >
                                <option value="character_closeup">
                                  Protagonista (Close-up)
                                </option>
                                <option value="environment_wide">
                                  Entorno / B-Roll (Wide)
                                </option>
                                <option value="object_detail">
                                  Evidencia / Objeto (Macro)
                                </option>
                                <option value="antagonist_shot">Antagonista / Rival</option>
                                <option value="concept_diagram">
                                  Metáfora Conceptual 3D
                                </option>
                                <option value="symbolic_silhouette">
                                  Silueta Simbólica
                                </option>
                              </select>
                              <span>Cámara:</span>
                              <select
                                value={scene.camera_motion}
                                onChange={(e) =>
                                  handleUpdateScene(
                                    scene.scene_id,
                                    'camera_motion',
                                    e.target.value
                                  )
                                }
                                className="bg-slate-800 text-slate-200 px-2 py-1 rounded border border-slate-700 text-xs focus:outline-none"
                              >
                                <option value="zoom_in">Zoom In + Sub-cortes</option>
                                <option value="zoom_out">Zoom Out + Sub-cortes</option>
                                <option value="pan_left">Paneo Izq + Sub-cortes</option>
                                <option value="pan_right">Paneo Der + Sub-cortes</option>
                                <option value="static">Estático</option>
                              </select>
                              <span>Duración:</span>
                              <span className="font-mono text-white font-semibold">
                                {scene.durationInSeconds}s
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                            <div>
                              <label className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                                Tarjeta en Pantalla — Cifra o Concepto Clave (Beat 5s–13s):
                              </label>
                              <input
                                type="text"
                                value={scene.highlight_metric || ''}
                                onChange={(e) =>
                                  handleUpdateScene(
                                    scene.scene_id,
                                    'highlight_metric',
                                    e.target.value
                                  )
                                }
                                placeholder="Ej: $124 MILLONES / BURN RATE"
                                className="w-full mt-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Etiqueta de Contexto de la Tarjeta:
                              </label>
                              <input
                                type="text"
                                value={scene.highlight_label || ''}
                                onChange={(e) =>
                                  handleUpdateScene(
                                    scene.scene_id,
                                    'highlight_label',
                                    e.target.value
                                  )
                                }
                                placeholder="Ej: CAPITAL QUEMADO EN 24 MESES"
                                className="w-full mt-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                              Texto de Locución (
                              {
                                scene.voiceover
                                  .split(/\s+/)
                                  .filter(Boolean).length
                              }{' '}
                              palabras):
                            </label>
                            <textarea
                              rows={3}
                              value={scene.voiceover}
                              onChange={(e) =>
                                handleUpdateScene(
                                  scene.scene_id,
                                  'voiceover',
                                  e.target.value
                                )
                              }
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-blue-500 leading-relaxed"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5" /> Acción de la Escena (Encuadre 16:9 único sin grids):
                            </label>
                            <textarea
                              rows={2}
                              value={scene.visual_prompt}
                              onChange={(e) =>
                                handleUpdateScene(
                                  scene.scene_id,
                                  'visual_prompt',
                                  e.target.value
                                )
                              }
                              className="w-full bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-400 focus:outline-none focus:border-blue-500 font-mono"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* PASO 3: Diseño Visual del Personaje (Retrato Previo + Subida Propia) y Fotometría */}
                {activeStep === 3 && currentProject && (
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-purple-400 uppercase tracking-wider font-semibold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                            Paso Previo a las Escenas • Control de Calidad del Personaje
                          </span>
                        </div>
                        <h2 className="text-xl font-bold text-white mt-1">
                          Diseño del Personaje, Subida de Versión Propia y Fotometría
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Genera el retrato del personaje para verlo antes de crear las escenas o sube tu propia versión mejorada para cuidar la calidad.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          onClick={() => setStudioSection('characters')}
                          className="bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 font-semibold text-xs px-4 py-2.5 rounded-lg flex items-center gap-2 transition"
                        >
                          <Eye className="w-4 h-4" />
                          Abrir Biblioteca Completa de Personajes
                        </button>

                        <button
                          disabled={isGeneratingImages}
                          onClick={() => handleGenerateImages()}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm px-5 py-2.5 rounded-lg flex items-center gap-2 transition shadow-lg shadow-emerald-600/20"
                        >
                          {isGeneratingImages ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4" />
                          )}
                          Aprobar Personaje y Generar Escenas (16:9)
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Selector de Personaje desde la Biblioteca del Canal */}
                    <div className="bg-[#0f172a] border border-slate-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                          <BookmarkCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">
                            Biblioteca de Personajes de {selectedChannel?.name}:
                          </div>
                          <div className="text-xs text-slate-400">
                            Selecciona un personaje existente o crea su retrato oficial antes de pasar a las imágenes del video:
                          </div>
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
                          onClick={() => handleDraftNewCharacter()}
                          className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-2 rounded-lg flex items-center gap-1.5 transition"
                        >
                          <Bot className="w-3.5 h-3.5 text-blue-400" />
                          Redactar Nuevo con IA
                        </button>
                      </div>
                    </div>

                    {/* Tarjeta Visual + Edición del Personaje Ancla */}
                    {activeCharacter && (
                      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 pb-4 gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                              <User className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-white">
                                  {activeCharacter.name}
                                </h3>
                                <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded font-mono">
                                  ID: {activeCharacter.character_id}
                                </span>
                                {activeCharacter.canonical_image_url && (
                                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-semibold">
                                    ✓ Referencia Multimodal Activa
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400">{activeCharacter.role}</p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleSaveCharacterToLibrary(activeCharacter)}
                            className="bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 font-semibold text-xs px-4 py-2 rounded-lg flex items-center gap-2 transition border border-slate-700"
                          >
                            <Save className="w-3.5 h-3.5" />
                            Guardar Mejoras en Biblioteca Permanente
                          </button>
                        </div>

                        {/* Panel de Previsualización del Personaje y Subida de Versión Propia */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start bg-slate-950/70 border border-slate-800 p-5 rounded-xl">
                          {/* Retrato del Personaje */}
                          <div className="md:col-span-4 space-y-3">
                            <div className="aspect-square w-full max-w-[260px] mx-auto rounded-xl bg-slate-900 border border-slate-700 overflow-hidden relative flex items-center justify-center shadow-lg">
                              {activeCharacter.canonical_image_url ? (
                                <img
                                  src={activeCharacter.canonical_image_url}
                                  alt={activeCharacter.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="p-5 text-center space-y-2 text-slate-500">
                                  <User className="w-12 h-12 mx-auto text-slate-600" />
                                  <p className="text-xs">
                                    Genera el retrato previo o sube tu versión trabajada antes de crear las escenas.
                                  </p>
                                </div>
                              )}

                              {activeCharacter.canonical_image_url && (
                                <span
                                  className={`absolute top-2.5 left-2.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full backdrop-blur border ${
                                    activeCharacter.custom_uploaded
                                      ? 'bg-emerald-500/90 text-white border-emerald-400'
                                      : 'bg-purple-600/90 text-white border-purple-400'
                                  }`}
                                >
                                  {activeCharacter.custom_uploaded
                                    ? '✨ Versión Propia'
                                    : '🎨 Retrato IA'}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-col gap-2">
                              <button
                                disabled={isGeneratingPortrait}
                                onClick={() =>
                                  handleGenerateCharacterPortrait(activeCharacter)
                                }
                                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-semibold py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 shadow-md shadow-purple-600/20 transition"
                              >
                                {isGeneratingPortrait ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Wand2 className="w-3.5 h-3.5" />
                                )}
                                {isGeneratingPortrait
                                  ? 'Generando Retrato...'
                                  : '1. Ver Personaje con IA (Retrato)'}
                              </button>

                              <input
                                ref={charFileInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleUploadCharacterImage(file, activeCharacter);
                                    e.target.value = '';
                                  }
                                }}
                              />
                              <button
                                disabled={isUploadingImage}
                                onClick={() => charFileInputRef.current?.click()}
                                className="w-full bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 transition"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                {isUploadingImage
                                  ? 'Subiendo...'
                                  : '2. Subir Mi Versión Mejorada'}
                              </button>
                            </div>

                            {activeCharacter.reference_gallery &&
                              activeCharacter.reference_gallery.length > 1 && (
                                <div className="space-y-1 pt-1">
                                  <div className="text-[10px] text-slate-400 font-semibold">
                                    Versiones guardadas de este personaje:
                                  </div>
                                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                                    {activeCharacter.reference_gallery.map((url, idx) => (
                                      <button
                                        key={idx}
                                        onClick={() =>
                                          handleSelectCharacterGalleryImage(
                                            activeCharacter,
                                            url
                                          )
                                        }
                                        className={`w-10 h-10 rounded-lg overflow-hidden border-2 shrink-0 ${
                                          activeCharacter.canonical_image_url === url
                                            ? 'border-emerald-400'
                                            : 'border-slate-700 opacity-60 hover:opacity-100'
                                        }`}
                                      >
                                        <img
                                          src={url}
                                          alt={`v${idx + 1}`}
                                          className="w-full h-full object-cover"
                                        />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                          </div>

                          {/* Campos de texto y prompt del personaje */}
                          <div className="md:col-span-8 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                  Nombre del Personaje o Entidad:
                                </label>
                                <input
                                  type="text"
                                  value={activeCharacter.name}
                                  onChange={(e) =>
                                    handleUpdateCharacter('name', e.target.value)
                                  }
                                  className="w-full mt-1.5 bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                                />
                              </div>

                              <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                  Rol o Arquetipo en la Historia:
                                </label>
                                <input
                                  type="text"
                                  value={activeCharacter.role}
                                  onChange={(e) =>
                                    handleUpdateCharacter('role', e.target.value)
                                  }
                                  className="w-full mt-1.5 bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                                />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5" /> Prompt Ancla 3D (Pixar / Arcane Documentary Aesthetic):
                                </label>
                                <span className="text-[11px] text-slate-500">
                                  Combinado con tu imagen de referencia en cada escena
                                </span>
                              </div>
                              <textarea
                                rows={4}
                                value={activeCharacter.anchor_prompt}
                                onChange={(e) =>
                                  handleUpdateCharacter('anchor_prompt', e.target.value)
                                }
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-purple-200/90 focus:outline-none focus:border-purple-500 font-mono leading-relaxed"
                              />
                            </div>

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
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                              />
                            </div>
                          </div>
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
                        {visualArcRules.map((rule) => (
                          <div
                            key={rule.act_number}
                            className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-2 flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between text-xs font-bold pb-1 border-b border-slate-800">
                                <span className="text-blue-400">Acto {rule.act_number}</span>
                                {rule.act_number === 1 && (
                                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                                )}
                                {rule.act_number === 2 && (
                                  <Zap className="w-3.5 h-3.5 text-yellow-400" />
                                )}
                                {rule.act_number === 3 && (
                                  <Flame className="w-3.5 h-3.5 text-rose-500" />
                                )}
                                {rule.act_number === 4 && (
                                  <Moon className="w-3.5 h-3.5 text-indigo-400" />
                                )}
                                {rule.act_number === 5 && (
                                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                                )}
                              </div>
                              <h4 className="text-xs font-bold text-white mt-1.5">
                                {rule.act_name}
                              </h4>
                              <p className="text-[11px] text-amber-300/90 mt-0.5 leading-snug">
                                {rule.emotional_tone}
                              </p>
                            </div>

                            <div className="text-[10px] text-slate-400 bg-slate-950 p-2 rounded border border-slate-800/80 line-clamp-3">
                              <strong className="text-slate-300">💡 Luz:</strong>{' '}
                              {rule.lighting_prompt}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* PASO 4: Galería de Imágenes & Locución de Audio */}
                {activeStep === 4 && currentProject && (
                  <div className="space-y-6">
                    {/* Si el proyecto fue creado reutilizando la voz de otro proyecto */}
                    {currentProject.fork_type === 'voice_only' && (
                      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Mic className="w-5 h-5 text-emerald-400 shrink-0" />
                          <div>
                            <div className="text-xs font-bold text-emerald-300">
                              Modo "Nuevo Video con la Misma Voz" Activo (Origen: {currentProject.parent_project_id})
                            </div>
                            <div className="text-xs text-slate-300">
                              Todos los archivos de voz y sus marcas de tiempo por palabra fueron conservados intactos. Solo genera o sube las nuevas imágenes para producir el nuevo video.
                            </div>
                          </div>
                        </div>
                        <button
                          disabled={isGeneratingImages}
                          onClick={() => handleGenerateImages()}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-md"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Generar Nuevo Set de Imágenes 16:9
                        </button>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 gap-4">
                      <div>
                        <h2 className="text-xl font-bold text-white">
                          Activos Visuales & Locución Sincronizada
                        </h2>
                        <p className="text-xs text-slate-400">
                          Imágenes 16:9 con tu personaje oficial y locución calibrada al milisegundo.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5">
                        {/* Toggle de Reutilización Inteligente de Biblioteca */}
                        <label
                          className="flex items-center gap-2 cursor-pointer bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/80 px-3 py-2 rounded-lg text-xs font-semibold text-slate-200 transition select-none shadow-sm"
                          title="Si está activo, busca primero en tu biblioteca por personaje, lugar o empresa para reutilizar imágenes existentes (0 costo y 0 espera de API)"
                        >
                          <input
                            type="checkbox"
                            checked={smartReuseImages}
                            onChange={(e) => setSmartReuseImages(e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-slate-600 text-amber-500 focus:ring-amber-500 accent-amber-500 cursor-pointer"
                          />
                          <span className="flex items-center gap-1.5">
                            <span className="text-amber-400">♻️</span>
                            <span>Reutilización Inteligente</span>
                          </span>
                        </label>

                        <button
                          disabled={isGeneratingImages}
                          onClick={() => handleGenerateImages()}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3.5 py-2.5 rounded-lg flex items-center gap-1.5 border border-slate-700"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${
                              isGeneratingImages ? 'animate-spin' : ''
                            }`}
                          />
                          Generar / Regenerar Imágenes
                        </button>

                        {/* 1. Botón Principal: Locución con VoiceStudio Local (RTX 3080) */}
                        <button
                          disabled={isGeneratingAudio}
                          onClick={() => handleGenerateAudio(undefined, 'voicestudio')}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-md shadow-emerald-600/20 transition active:scale-95"
                          title="Generar locución local usando tu GPU RTX 3080 (0 costo, ultra-rápido y con subtítulos sincronizados)"
                        >
                          {audioGeneratingEngine === 'voicestudio' && audioGeneratingSceneId === null ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Mic className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {currentProject?.voiceMode === 'dual'
                              ? 'Generar Locución (2 Voces en RTX 3080)'
                              : `Generar Locución (${getVoiceDisplayName(currentProject?.primaryVoice || 'gomorra')} en RTX 3080)`}
                          </span>
                        </button>

                        {/* 2. Alternativa Cloud: ElevenLabs */}
                        <button
                          disabled={isGeneratingAudio}
                          onClick={() => handleGenerateAudio(undefined, 'elevenlabs')}
                          className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-semibold px-3.5 py-2.5 rounded-lg flex items-center gap-1.5 border border-purple-500/30 transition active:scale-95"
                          title="Generar con ElevenLabs Cloud (Adam o Antoni)"
                        >
                          {audioGeneratingEngine === 'elevenlabs' && audioGeneratingSceneId === null ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" />
                          )}
                          <span>Voz ElevenLabs (Cloud)</span>
                        </button>

                        <button
                          disabled={isTranslating}
                          onClick={handleTranslateToEnglish}
                          className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold px-3.5 py-2.5 rounded-lg flex items-center gap-1.5 border border-amber-500/30"
                        >
                          {isTranslating ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <span>🇺🇸</span>
                          )}
                          Adaptar a Inglés
                        </button>

                        <button
                          onClick={() => setActiveStep(5)}
                          className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-md shadow-blue-500/20"
                        >
                          <Play className="w-3.5 h-3.5" />
                          Previsualizar Video
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Banner de Estado de Personaje y Audio */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {activeCharacter?.canonical_image_url ? (
                            <img
                              src={activeCharacter.canonical_image_url}
                              alt={activeCharacter.name}
                              className="w-10 h-10 rounded-lg object-cover border border-purple-500/40"
                            />
                          ) : (
                            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                          )}
                          <div>
                            <div className="text-xs text-slate-400 font-medium">
                              Referencia de Personaje Activa:
                            </div>
                            <div className="text-sm font-bold text-white flex items-center gap-2">
                              🎭 {activeCharacter?.name || 'Protagonista'}
                              <span className="text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded font-mono">
                                {activeCharacter?.custom_uploaded
                                  ? 'Versión Propia Inyectada'
                                  : '3D Pixar/Arcane'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleForkProjectVoice(currentProject)}
                          className="text-xs bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition"
                          title="Guardar esta voz y abrir un proyecto nuevo para probar otras imágenes"
                        >
                          <Mic className="w-3.5 h-3.5" />
                          Usar esta Voz en Otro Video
                        </button>
                      </div>

                      {/* Panel de Configuración de Locución: 1 Voz vs 2 Voces Intercambiables */}
                      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                              <Mic className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-2">
                                Configuración de Voces
                                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono">
                                  VoiceStudio GPU RTX 3080
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Selector de Modo: 1 Sola Voz vs 2 Voces */}
                          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                            <button
                              onClick={() => handleSetVoiceMode('single')}
                              className={`text-[11px] font-semibold px-2.5 py-1 rounded transition flex items-center gap-1.5 ${
                                currentProject.voiceMode !== 'dual'
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              <Mic className="w-3 h-3" />
                              1 Sola Voz
                            </button>
                            <button
                              onClick={() => handleSetVoiceMode('dual')}
                              className={`text-[11px] font-semibold px-2.5 py-1 rounded transition flex items-center gap-1.5 ${
                                currentProject.voiceMode === 'dual'
                                  ? 'bg-purple-600 text-white shadow-sm'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              <Users className="w-3 h-3" />
                              2 Voces
                            </button>
                          </div>
                        </div>

                        {/* Selectores de Voces */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          {/* Selector Voz 1 */}
                          <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                            <label className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                              <Mic className="w-3 h-3" />
                              Voz 1 (Principal):
                            </label>
                            <select
                              value={currentProject.primaryVoice || 'gomorra'}
                              onChange={(e) => handleUpdateProjectVoice('primary', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-emerald-500"
                            >
                              {(configStatus?.voiceStudioVoices || [
                                { id: 'b4b14f0e', name: 'Gomorra', type: 'profile' },
                                { id: 'demo0001', name: 'VoiceStudio Demo Voice', type: 'profile' },
                              ]).map((v: any) => (
                                <option key={v.id} value={v.id}>
                                  {v.name} {v.type === 'profile' ? '★ (Clon)' : ''}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Selector Voz 2 (Visible en modo dual) */}
                          {currentProject.voiceMode === 'dual' ? (
                            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                              <label className="text-[11px] text-purple-400 font-semibold flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                Voz 2 (Secundaria):
                              </label>
                              <select
                                value={currentProject.secondaryVoice || 'demo0001'}
                                onChange={(e) => handleUpdateProjectVoice('secondary', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-purple-500"
                              >
                                {(configStatus?.voiceStudioVoices || [
                                  { id: 'demo0001', name: 'VoiceStudio Demo Voice', type: 'profile' },
                                  { id: 'b4b14f0e', name: 'Gomorra', type: 'profile' },
                                ]).map((v: any) => (
                                  <option key={v.id} value={v.id}>
                                    {v.name} {v.type === 'profile' ? '★ (Clon)' : ''}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/50 flex items-center text-slate-400 text-[11px]">
                              <span>Todas las escenas narradas por la Voz 1. Cambia a modo <strong>2 Voces</strong> para alternar personajes o narradores.</span>
                            </div>
                          )}
                        </div>

                        {/* Botones de acción rápida para 2 voces */}
                        {currentProject.voiceMode === 'dual' && (
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                            <span className="text-[10px] text-slate-400">
                              💡 Haz clic en la pastilla de voz de cada escena para cambiar quién habla.
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={handleAutoAlternateVoices}
                                className="text-[10px] bg-slate-800 hover:bg-slate-700 text-purple-300 font-semibold px-2 py-1 rounded border border-purple-500/20 flex items-center gap-1 transition"
                                title="Asignar automáticamente Voz 1 a escenas impares y Voz 2 a escenas pares"
                              >
                                🔀 Alternar 1 y 2 Auto
                              </button>
                              <button
                                onClick={handleResetAllToPrimaryVoice}
                                className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-2 py-1 rounded border border-slate-700 flex items-center gap-1 transition"
                                title="Asignar todas las escenas a la Voz 1"
                              >
                                🎙️ Todas a Voz 1
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Grid de Escenas con Imagen, Subida Propia y Audio */}
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
                                  <span className="text-xs">
                                    Imagen pendiente de generación o subida
                                  </span>
                                </div>
                              )}

                              <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 max-w-[80%]">
                                <div className="bg-slate-900/80 backdrop-blur px-2.5 py-1 rounded text-xs font-bold text-white border border-slate-700">
                                  Escena {scene.scene_id}
                                </div>
                                {act && (
                                  <div className="bg-blue-900/80 backdrop-blur px-2 py-1 rounded text-[11px] font-semibold text-blue-300 border border-blue-700/60">
                                    Acto {act.act_number}: {act.act_name}
                                  </div>
                                )}
                                {scene.imageReused && (
                                  <div
                                    className="bg-emerald-600/95 text-white backdrop-blur px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-400 flex items-center gap-1 shadow-md"
                                    title={`Reutilizado de Biblioteca (0 costo de API): ${scene.reusedAssetPrompt || 'Activo existente'}`}
                                  >
                                    <span>♻️ Reutilizado</span>
                                  </div>
                                )}
                              </div>

                              <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur px-2.5 py-1 rounded text-xs font-mono font-bold text-amber-300 border border-amber-500/40">
                                {scene.durationInSeconds}s
                              </div>
                            </div>

                            <div className="p-4 space-y-3">
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="text-sm font-bold text-white truncate">
                                  {scene.chapter}
                                </h4>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    disabled={isGeneratingImages}
                                    onClick={() => handleGenerateImages(scene.scene_id, false)}
                                    className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20"
                                    title="Generar o buscar en biblioteca para esta escena"
                                  >
                                    <RefreshCw className="w-2.5 h-2.5" /> IA
                                  </button>

                                  {scene.imageUrl && (
                                    <button
                                      disabled={isGeneratingImages}
                                      onClick={() => handleGenerateImages(scene.scene_id, true)}
                                      className="text-[10px] text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-0.5 bg-purple-500/10 px-1.5 py-1 rounded border border-purple-500/20"
                                      title="Forzar creación con IA sin usar la biblioteca de caché"
                                    >
                                      <Sparkles className="w-2.5 h-2.5" /> Nueva IA
                                    </button>
                                  )}

                                  <label
                                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 cursor-pointer"
                                    title="Subir una imagen propia para esta escena"
                                  >
                                    <Upload className="w-2.5 h-2.5" /> Subir
                                    <input
                                      type="file"
                                      accept="image/png,image/jpeg,image/webp"
                                      className="hidden"
                                      onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) {
                                          handleUploadCustomSceneImage(scene.scene_id, f);
                                          e.target.value = '';
                                        }
                                      }}
                                    />
                                  </label>

                                  {/* Botón Reutilizar de la Biblioteca */}
                                  <button
                                    onClick={() => setLibraryPickerSceneId(scene.scene_id)}
                                    className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20"
                                    title="Reutilizar una imagen existente de la biblioteca del personaje para esta escena (0 costo de API, 0 espera)"
                                  >
                                    <ImageIcon className="w-2.5 h-2.5" /> Galería
                                  </button>

                                  {/* Selector / Toggle de Voz para la Escena */}
                                  {currentProject.voiceMode === 'dual' ? (
                                    <button
                                      onClick={() => handleToggleSceneVoiceRole(scene.scene_id)}
                                      className={`text-[10px] font-semibold flex items-center gap-1 px-2 py-1 rounded border transition ${
                                        scene.voiceRole === 'secondary'
                                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30'
                                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                                      }`}
                                      title="Haz clic para alternar entre Voz 1 y Voz 2 en esta escena"
                                    >
                                      {scene.voiceRole === 'secondary' ? (
                                        <>
                                          <Users className="w-2.5 h-2.5 text-purple-400" />
                                          <span>Voz 2 ({getVoiceDisplayName(currentProject.secondaryVoice || 'demo0001')})</span>
                                        </>
                                      ) : (
                                        <>
                                          <Mic className="w-2.5 h-2.5 text-emerald-400" />
                                          <span>Voz 1 ({getVoiceDisplayName(currentProject.primaryVoice || 'gomorra')})</span>
                                        </>
                                      )}
                                    </button>
                                  ) : null}

                                  {/* Botón Sintetizar con VoiceStudio (usando la voz asignada) */}
                                  <button
                                    disabled={isGeneratingAudio}
                                    onClick={() => handleGenerateAudio(scene.scene_id, 'voicestudio')}
                                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20"
                                    title="Sintetizar locución con VoiceStudio en RTX 3080"
                                  >
                                    {audioGeneratingEngine === 'voicestudio' &&
                                    (audioGeneratingSceneId === scene.scene_id || audioGeneratingSceneId === null) ? (
                                      <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                                    ) : (
                                      <Mic className="w-2.5 h-2.5" />
                                    )}
                                    <span>Sintetizar</span>
                                  </button>

                                  {/* Botón ElevenLabs Cloud alternativo */}
                                  <button
                                    disabled={isGeneratingAudio}
                                    onClick={() => handleGenerateAudio(scene.scene_id, 'elevenlabs')}
                                    className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20"
                                    title="Regenerar con ElevenLabs Cloud"
                                  >
                                    {audioGeneratingEngine === 'elevenlabs' &&
                                    (audioGeneratingSceneId === scene.scene_id || audioGeneratingSceneId === null) ? (
                                      <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                                    ) : (
                                      <Volume2 className="w-2.5 h-2.5" />
                                    )}
                                    <span>ElevenLabs</span>
                                  </button>
                                </div>
                              </div>

                              <p className="text-xs text-slate-400 line-clamp-2">
                                {scene.voiceover}
                              </p>

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
                                  <audio
                                    controls
                                    src={scene.audioUrl}
                                    className="w-full h-7 rounded"
                                  />
                                </div>
                              ) : (
                                <div className="bg-slate-950/60 border border-dashed border-slate-800 p-2 rounded-lg text-center">
                                  <span className="text-[11px] text-slate-500">
                                    Audio aún no sintetizado
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* PASO 5: Previsualizador Remotion en Vivo y Sala de Dirección */}
                {activeStep === 5 && currentProject && (
                  <div className="space-y-6">
                    {/* Input oculto para subir imagen personalizada desde el visor */}
                    <input
                      type="file"
                      ref={previewCustomFileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        const activeScene = currentProject.scenes[activePreviewSceneIndex];
                        if (file && activeScene) {
                          handleUploadCustomSceneImage(activeScene.scene_id, file);
                        }
                      }}
                    />

                    {/* Encabezado Superior */}
                    <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 gap-3">
                      <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                          <Film className="w-5 h-5 text-blue-400" />
                          Reproductor de Video en Tiempo Real & Sala de Dirección
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Previsualiza a 30fps con efectos Ken Burns, cambia la velocidad (1.5x), activa/desactiva capas y pide correcciones con IA.
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => handleForkProjectVoice(currentProject)}
                          className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-semibold text-xs px-3.5 py-2.5 rounded-lg flex items-center gap-2 transition"
                          title="Duplica el audio y timings para generar un video completamente nuevo con otra temática visual"
                        >
                          <Mic className="w-4 h-4" />
                          ¿Te gustó la voz? Crear Otro Video con esta Voz
                        </button>

                        <button
                          onClick={() => setActiveStep(6)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition"
                        >
                          <Download className="w-4 h-4" />
                          Continuar a Exportación & Empaque
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Barra Superior de Control de Reproducción y Velocidad */}
                    <div className="bg-[#0f172a] border border-slate-800 p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-4 text-xs">
                      {/* Metadatos del video */}
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <Volume2 className="w-4 h-4 text-emerald-400" />
                          <span className="text-slate-400">Voz:</span>
                          <strong className="text-white capitalize">
                            {currentProject.voiceEngine || 'OpenAI / Gomorra'}
                          </strong>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-blue-400" />
                          <span className="text-slate-400">Escena actual:</span>
                          <strong className="text-blue-400">
                            #{currentProject.scenes[activePreviewSceneIndex]?.scene_id || 1} de {currentProject.scenes.length}
                          </strong>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-amber-300 font-bold bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded">
                            {Math.round(totalFrames / 30)}s total ({totalFrames} frames)
                          </span>
                        </div>
                      </div>

                      {/* Selector de Velocidad de Reproducción y Saltos */}
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Botones de salto rápido */}
                        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
                          <button
                            onClick={() => {
                              if (!playerRef.current) return;
                              const current = playerRef.current.getCurrentFrame();
                              playerRef.current.seekTo(Math.max(0, current - 150));
                            }}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[11px] font-medium flex items-center gap-1 transition"
                            title="Retroceder 5 segundos"
                          >
                            <Rewind className="w-3 h-3" /> -5s
                          </button>
                          <button
                            onClick={() => {
                              if (!playerRef.current) return;
                              const current = playerRef.current.getCurrentFrame();
                              playerRef.current.seekTo(Math.min(totalFrames - 1, current + 150));
                            }}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[11px] font-medium flex items-center gap-1 transition"
                            title="Avanzar 5 segundos"
                          >
                            +5s <FastForward className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Velocidad de reproducción (0.75x, 1x, 1.25x, 1.5x, 2x) */}
                        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
                          <span className="text-[11px] text-slate-400 px-1 font-semibold flex items-center gap-1">
                            <Sliders className="w-3 h-3 text-cyan-400" />
                            Velocidad:
                          </span>
                          {[0.75, 1, 1.25, 1.5, 2].map((speed) => (
                            <button
                              key={speed}
                              onClick={() => setPlaybackSpeed(speed)}
                              className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
                                playbackSpeed === speed
                                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
                              }`}
                            >
                              {speed}x
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Contenedor del Reproductor Remotion */}
                    <div className="bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-2xl max-w-4xl mx-auto relative group">
                      <Player
                        ref={playerRef}
                        component={DocumentaryVideo}
                        inputProps={{
                          channelId: selectedChannel?.channel_id || 'tech_scandals',
                          title: currentProject.title,
                          scenes: currentProject.scenes,
                          showCaptions,
                          showAtmosphere,
                          showHighlightCards,
                          showChapterBadge,
                          motionIntensity,
                        }}
                        durationInFrames={totalFrames}
                        fps={30}
                        compositionWidth={1920}
                        compositionHeight={1080}
                        playbackRate={playbackSpeed}
                        showPlaybackRateControl={[0.5, 0.75, 1, 1.25, 1.5, 2]}
                        style={{
                          width: '100%',
                          aspectRatio: '16/9',
                        }}
                        controls
                        autoPlay={false}
                        loop
                      />
                    </div>

                    {/* Capas Visuales y Efectos Dinámicos en Tiempo Real */}
                    <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                        <span className="text-xs font-bold text-white flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-amber-400" />
                          Capas Visuales Activas en Tiempo Real
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Prende o apaga cualquier capa para evaluar el impacto visual
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => setShowCaptions(!showCaptions)}
                            className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 transition ${
                              showCaptions
                                ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                                : 'bg-slate-800/50 border-slate-700 text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Subtítulos Cinéticos {showCaptions ? '✓' : '✕'}
                          </button>

                          <button
                            onClick={() => setShowAtmosphere(!showAtmosphere)}
                            className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 transition ${
                              showAtmosphere
                                ? 'bg-amber-600/20 border-amber-500/40 text-amber-300'
                                : 'bg-slate-800/50 border-slate-700 text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            <Flame className="w-3.5 h-3.5" />
                            Atmósfera & Grano {showAtmosphere ? '✓' : '✕'}
                          </button>

                          <button
                            onClick={() => setShowHighlightCards(!showHighlightCards)}
                            className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 transition ${
                              showHighlightCards
                                ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300'
                                : 'bg-slate-800/50 border-slate-700 text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            <Zap className="w-3.5 h-3.5" />
                            Tarjetas Forenses / Cifras {showHighlightCards ? '✓' : '✕'}
                          </button>

                          <button
                            onClick={() => setShowChapterBadge(!showChapterBadge)}
                            className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 transition ${
                              showChapterBadge
                                ? 'bg-purple-600/20 border-purple-500/40 text-purple-300'
                                : 'bg-slate-800/50 border-slate-700 text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            <BookmarkCheck className="w-3.5 h-3.5" />
                            Insignia de Capítulo {showChapterBadge ? '✓' : '✕'}
                          </button>
                        </div>

                        {/* Intensidad de Movimiento Ken Burns */}
                        <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-2.5 py-1.5 rounded-lg">
                          <span className="text-[11px] text-slate-400 font-medium">Movimiento:</span>
                          {[
                            { label: 'Sutil', val: 0.5 },
                            { label: 'Normal', val: 1.0 },
                            { label: 'Dramático', val: 1.5 },
                          ].map((item) => (
                            <button
                              key={item.label}
                              onClick={() => setMotionIntensity(item.val)}
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                                motionIntensity === item.val
                                  ? 'bg-indigo-600 text-white'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Timeline de Escenas Interactivo (Scene Jumper) */}
                    <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Film className="w-4 h-4 text-cyan-400" />
                          <h3 className="text-xs font-bold text-white">
                            Explorador de Escenas & Salto Inmediato
                          </h3>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          Haz clic en cualquier escena para saltar el reproductor directamente a su fotograma inicial
                        </span>
                      </div>

                      <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
                        {currentProject.scenes.map((scene, idx) => {
                          const framesBefore = Math.round(
                            currentProject.scenes.slice(0, idx).reduce((acc, s) => acc + s.durationInSeconds, 0) * 30
                          );
                          const secondsBefore = Math.round(framesBefore / 30);
                          const mins = Math.floor(secondsBefore / 60);
                          const secs = secondsBefore % 60;
                          const timecode = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
                          const isFocused = activePreviewSceneIndex === idx;

                          return (
                            <button
                              key={scene.scene_id}
                              onClick={() => jumpToScene(idx)}
                              className={`flex-shrink-0 w-36 text-left p-2 rounded-xl border transition ${
                                isFocused
                                  ? 'bg-blue-950/60 border-blue-500 shadow-md shadow-blue-500/20 ring-1 ring-blue-500'
                                  : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                              }`}
                            >
                              <div className="aspect-video bg-slate-900 rounded-lg overflow-hidden relative mb-1.5 border border-slate-800/80">
                                {scene.imageUrl ? (
                                  <img
                                    src={scene.imageUrl}
                                    alt={`Escena ${scene.scene_id}`}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-600">
                                    <ImageIcon className="w-5 h-5" />
                                  </div>
                                )}
                                <span className="absolute bottom-1 right-1 bg-black/80 text-[10px] font-mono px-1 rounded text-slate-300">
                                  {timecode}
                                </span>
                                <span className="absolute top-1 left-1 bg-blue-600/90 text-white text-[9px] font-bold px-1 rounded">
                                  #{scene.scene_id}
                                </span>
                              </div>

                              <div className="truncate text-[11px] font-semibold text-white">
                                {scene.chapter || `Escena ${scene.scene_id}`}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {scene.highlight_metric || `${Math.round(scene.durationInSeconds)}s`}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* CAJA DE TEXTO: Director Asistente IA */}
                    <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900 to-purple-950/30 border border-indigo-500/30 p-5 rounded-2xl shadow-xl space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-500/20 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center">
                            <Bot className="w-4 h-4 text-indigo-300" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                              Director Asistente IA — Corrección y Ajuste en Lenguaje Natural
                              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-semibold">
                                Quirúrgico
                              </span>
                            </h3>
                            <p className="text-xs text-slate-400">
                              ¿No te gusta algo del video? Escribe lo que quieres corregir y la IA ajustará la locución, cifras o estética visual.
                            </p>
                          </div>
                        </div>

                        {/* Selector de Objetivo (Escena Actual vs Todo el Documental) */}
                        <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 p-1 rounded-lg text-xs">
                          <button
                            onClick={() =>
                              setAiTargetSceneId(
                                currentProject.scenes[activePreviewSceneIndex]?.scene_id || 1
                              )
                            }
                            className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                              aiTargetSceneId !== 'all'
                                ? 'bg-indigo-600 text-white font-semibold'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            🎯 Escena #{currentProject.scenes[activePreviewSceneIndex]?.scene_id || 1}
                          </button>
                          <button
                            onClick={() => setAiTargetSceneId('all')}
                            className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                              aiTargetSceneId === 'all'
                                ? 'bg-indigo-600 text-white font-semibold'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            🌐 Todo el Video
                          </button>
                        </div>
                      </div>

                      {/* Textarea de Instrucción al Director IA */}
                      <div className="space-y-2">
                        <textarea
                          rows={3}
                          value={aiInstruction}
                          onChange={(e) => setAiInstruction(e.target.value)}
                          placeholder={`Escribe la corrección para ${
                            aiTargetSceneId === 'all'
                              ? 'todo el documental'
                              : `la Escena #${aiTargetSceneId}`
                          }. Ej: 'Haz que la locución suene más dramática y misteriosa, cambia el dato a $250M y que el plano visual sea un servidor con chispas en un sótano oscuro' o 'Acorta el texto de la locución para que vaya más rápido al grano'....`}
                          className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none transition resize-none"
                        />

                        {/* Sugerencias Rápidas (Chips de Inspiración) */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] text-slate-400 flex items-center gap-1 mr-1">
                            <Sparkles className="w-3 h-3 text-amber-400" /> Ideas rápidas:
                          </span>
                          {[
                            '🔥 Aumentar tensión y suspenso',
                            '📊 Destacar cifras duras y pérdidas millonarias',
                            '🌧️ Atmósfera visual más oscura y cinematográfica',
                            '⚡ Hacer narración más enérgica y concisa',
                            '🔍 Añadir un plano macro de evidencia forense',
                          ].map((chip) => (
                            <button
                              key={chip}
                              onClick={() => {
                                setAiInstruction((prev) =>
                                  prev ? `${prev}. ${chip.slice(2)}` : chip.slice(2)
                                );
                              }}
                              className="text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 px-2.5 py-1 rounded-full transition"
                            >
                              {chip}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Opciones de Auto-Regeneración y Botón de Aplicar */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <div className="flex flex-wrap items-center gap-4 text-xs">
                          <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white select-none">
                            <input
                              type="checkbox"
                              checked={aiAutoRegenImage}
                              onChange={(e) => setAiAutoRegenImage(e.target.checked)}
                              className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                            />
                            <span>🎨 Auto-regenerar imagen con IA si cambia el prompt visual</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white select-none">
                            <input
                              type="checkbox"
                              checked={aiAutoRegenAudio}
                              onChange={(e) => setAiAutoRegenAudio(e.target.checked)}
                              className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                            />
                            <span>🎙️ Auto-regenerar locución con IA si cambia el texto</span>
                          </label>
                        </div>

                        <button
                          onClick={handleApplyAiAdjustment}
                          disabled={isApplyingAiCorrection || !aiInstruction.trim()}
                          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition ml-auto"
                        >
                          {isApplyingAiCorrection ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              El Director IA está ajustando la escena...
                            </>
                          ) : (
                            <>
                              <Wand2 className="w-4 h-4" />
                              Aplicar Corrección con Director IA
                            </>
                          )}
                        </button>
                      </div>

                      {/* Notificación del último ajuste aplicado */}
                      {aiLastFeedback && (
                        <div className="bg-emerald-950/40 border border-emerald-500/40 p-3 rounded-xl flex items-start gap-2.5 text-xs text-emerald-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-white">Último ajuste del Director IA:</span>{' '}
                            {aiLastFeedback}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Editor Manual Rápido de la Escena Enfocada */}
                    {(() => {
                      const scene = currentProject.scenes[activePreviewSceneIndex];
                      if (!scene) return null;

                      return (
                        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                              <Edit3 className="w-4 h-4 text-amber-400" />
                              <h3 className="text-sm font-bold text-white">
                                Ajuste Directo Manual — Escena #{scene.scene_id}:{' '}
                                <span className="text-slate-400 font-normal">
                                  {scene.chapter || 'Sin título'}
                                </span>
                              </h3>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleGenerateImages(scene.scene_id, true)}
                                disabled={isGeneratingImages}
                                className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                Regenerar Imagen
                              </button>

                              <button
                                onClick={() => previewCustomFileInputRef.current?.click()}
                                disabled={isUploadingImage}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                Subir Imagen
                              </button>

                              <button
                                onClick={() =>
                                  handleGenerateAudio(
                                    scene.scene_id,
                                    currentProject.voiceEngine || 'openai'
                                  )
                                }
                                disabled={isGeneratingAudio}
                                className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
                              >
                                <Mic className="w-3.5 h-3.5" />
                                Regenerar Audio
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            {/* Locución */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-slate-400">
                                <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                                  <Mic className="w-3.5 h-3.5 text-emerald-400" />
                                  Texto de Locución (Voiceover)
                                </label>
                                <span className="text-[10px] font-mono">
                                  {scene.voiceover.split(/\s+/).filter(Boolean).length} palabras (~{Math.round(scene.durationInSeconds)}s)
                                </span>
                              </div>
                              <textarea
                                rows={4}
                                value={scene.voiceover}
                                onChange={(e) =>
                                  handleUpdateScene(scene.scene_id, 'voiceover', e.target.value)
                                }
                                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-3 text-xs text-white focus:outline-none resize-none leading-relaxed"
                              />
                            </div>

                            {/* Prompt Visual & Tarjetas Forenses */}
                            <div className="space-y-3">
                              <div className="space-y-1.5">
                                <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                                  <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                                  Prompt Visual (en Inglés para generador de imagen)
                                </label>
                                <textarea
                                  rows={2}
                                  value={scene.visual_prompt}
                                  onChange={(e) =>
                                    handleUpdateScene(scene.scene_id, 'visual_prompt', e.target.value)
                                  }
                                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-2.5 text-xs text-slate-300 focus:outline-none resize-none font-mono text-[11px]"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[11px] text-slate-400 block mb-1">
                                    Cifra en Tarjeta (Métrica):
                                  </label>
                                  <input
                                    type="text"
                                    value={scene.highlight_metric || ''}
                                    onChange={(e) =>
                                      handleUpdateScene(
                                        scene.scene_id,
                                        'highlight_metric',
                                        e.target.value
                                      )
                                    }
                                    placeholder="Ej: $124 MILLONES"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-bold focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-[11px] text-slate-400 block mb-1">
                                    Etiqueta de Tarjeta:
                                  </label>
                                  <input
                                    type="text"
                                    value={scene.highlight_label || ''}
                                    onChange={(e) =>
                                      handleUpdateScene(
                                        scene.scene_id,
                                        'highlight_label',
                                        e.target.value
                                      )
                                    }
                                    placeholder="Ej: VALOR EVAPORADO"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
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

                        <div className="bg-black rounded-xl overflow-hidden border border-slate-800 aspect-video relative shadow-inner">
                          <video
                            controls
                            src={currentProject.outputVideoUrl}
                            className="w-full h-full object-contain"
                          />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                          <a
                            href={currentProject.outputVideoUrl}
                            download={`${currentProject.title.replace(
                              /[^a-zA-Z0-9_-]/g,
                              '_'
                            )}.mp4`}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition active:scale-95"
                          >
                            <Download className="w-5 h-5" />
                            Descargar Video MP4 (1080p Completo)
                          </a>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleForkProjectVoice(currentProject)}
                              className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-semibold text-xs px-4 py-2.5 rounded-lg flex items-center gap-2 transition"
                            >
                              <Mic className="w-3.5 h-3.5" />
                              Usar solo esta Voz para Otro Video
                            </button>

                            <button
                              disabled={isRendering}
                              onClick={handleRenderVideo}
                              className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 font-semibold text-xs px-4 py-2.5 rounded-lg flex items-center gap-2 border border-slate-700 transition"
                            >
                              <RefreshCw
                                className={`w-3.5 h-3.5 ${
                                  isRendering ? 'animate-spin text-blue-400' : ''
                                }`}
                              />
                              {isRendering ? 'Renderizando...' : 'Volver a Renderizar'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4">
                        <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mx-auto text-blue-400">
                          <Film className="w-7 h-7" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-white">
                            Listo para Generar el Archivo MP4 Definitivo
                          </h3>
                          <p className="text-xs text-slate-400 max-w-lg mx-auto mt-1">
                            Remotion CLI compilará las {currentProject.scenes.length}{' '}
                            escenas fotograma a fotograma en resolución 1080p, aplicando movimientos Ken Burns, el audio con marcas de tiempo y la tipografía cinética.
                          </p>
                        </div>

                        <div className="flex justify-center gap-3 text-xs font-mono text-slate-400">
                          <span className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300">
                            Duración:{' '}
                            <strong className="text-white">
                              {Math.round(totalFrames / 30)}s
                            </strong>
                          </span>
                          <span className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300">
                            Fotogramas:{' '}
                            <strong className="text-white">{totalFrames} frames</strong>
                          </span>
                          <span className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300">
                            Resolución:{' '}
                            <strong className="text-white">1920x1080 (16:9)</strong>
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
                                <span>
                                  Renderizando en 1080p... (Por favor espera 1-2 min)
                                </span>
                              </>
                            ) : (
                              <>
                                <Download className="w-4 h-4" />
                                <span>
                                  Renderizar Video MP4 en 1080p (
                                  {Math.round(totalFrames / 30)}s)
                                </span>
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
                              return `${String(min).padStart(2, '0')}:${String(
                                sec
                              ).padStart(2, '0')} - ${s.chapter}`;
                            })
                            .join('\n')}\n\nCanal: ${selectedChannel?.name}\nNicho: ${
                            selectedChannel?.niche
                          }`}
                          className="w-full mt-1.5 bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 font-mono focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* Modal / Selector de Reutilización de Imágenes de la Biblioteca */}
      {libraryPickerSceneId !== null && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header del modal */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Biblioteca de Imágenes • Reutilizar en Escena {libraryPickerSceneId}
                    {activeCharacter && (
                      <span className="text-[11px] text-purple-300 bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 rounded font-mono">
                        🎭 {activeCharacter.name}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Selecciona cualquier imagen existente de tu biblioteca (0 costo de API, 0 espera e instantáneo).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative w-56">
                  <input
                    type="text"
                    placeholder="Filtrar por lugar, empresa o prompt..."
                    value={librarySearchQuery}
                    onChange={(e) => setLibrarySearchQuery(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>

                <button
                  onClick={() => setLibraryPickerSceneId(null)}
                  className="text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition text-xs font-semibold"
                >
                  ✕ Cerrar
                </button>
              </div>
            </div>

            {/* Contenido / Grid de imágenes */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {(() => {
                const availableImages = getAvailableLibraryImages();
                if (availableImages.length === 0) {
                  return (
                    <div className="text-center py-12 text-slate-500 space-y-2">
                      <ImageIcon className="w-12 h-12 mx-auto text-slate-600" />
                      <p className="text-sm font-semibold text-slate-400">No hay imágenes en la biblioteca aún</p>
                      <p className="text-xs">
                        Genera imágenes con IA o sube imágenes en tus escenas o en el Character Studio para que aparezcan aquí automáticamente.
                      </p>
                    </div>
                  );
                }

                const filteredImages = availableImages.filter((item) => {
                  if (!librarySearchQuery) return true;
                  const q = librarySearchQuery.toLowerCase();
                  return (
                    item.label.toLowerCase().includes(q) ||
                    item.source.toLowerCase().includes(q) ||
                    item.prompt?.toLowerCase().includes(q) ||
                    item.place?.toLowerCase().includes(q) ||
                    item.company?.toLowerCase().includes(q) ||
                    item.tags?.some((t) => t.toLowerCase().includes(q))
                  );
                });

                if (filteredImages.length === 0) {
                  return (
                    <div className="text-center py-12 text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                      No se encontraron imágenes que coincidan con "{librarySearchQuery}".
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                    {filteredImages.map((item, idx) => {
                      const isCurrentSceneImage =
                        currentProject?.scenes.find((s) => s.scene_id === libraryPickerSceneId)?.imageUrl === item.url;

                      return (
                        <div
                          key={idx}
                          className={`group rounded-xl border overflow-hidden bg-slate-950 flex flex-col transition hover:border-amber-500/60 shadow-md ${
                            isCurrentSceneImage
                              ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                              : 'border-slate-800'
                          }`}
                        >
                          <div className="aspect-video w-full bg-black relative overflow-hidden">
                            <img
                              src={item.url}
                              alt={item.label}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            />
                            {isCurrentSceneImage && (
                              <span className="absolute top-2 left-2 bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow">
                                En esta escena
                              </span>
                            )}
                            <span className="absolute bottom-1 right-1 bg-black/70 text-[9px] text-slate-300 px-1.5 py-0.5 rounded backdrop-blur">
                              {item.source}
                            </span>
                            {item.place && (
                              <span className="absolute bottom-1 left-1 bg-black/80 text-amber-300 text-[9px] font-medium px-1.5 py-0.5 rounded backdrop-blur max-w-[70%] truncate">
                                🏢 {item.place}
                              </span>
                            )}
                          </div>

                          <div className="p-2.5 space-y-2 flex-1 flex flex-col justify-between">
                            <div className="space-y-1">
                              <div className="text-[11px] font-semibold text-slate-300 line-clamp-1" title={item.label}>
                                {item.label}
                              </div>
                              {item.prompt && (
                                <div className="text-[10px] text-slate-400 line-clamp-2 leading-tight" title={item.prompt}>
                                  {item.prompt}
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col gap-1.5 pt-1">
                              <button
                                onClick={() => handleAssignLibraryImageToScene(libraryPickerSceneId, item.url, item.prompt)}
                                className={`w-full text-xs font-semibold py-1.5 rounded-lg flex items-center justify-center gap-1 transition ${
                                  isCurrentSceneImage
                                    ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 cursor-default'
                                    : 'bg-amber-600 hover:bg-amber-500 text-white shadow-sm'
                                }`}
                              >
                                <Check className="w-3 h-3" />
                                {isCurrentSceneImage ? 'Asignada' : 'Usar en Escena'}
                              </button>

                              {activeCharacter && activeCharacter.canonical_image_url !== item.url && (
                                <button
                                  onClick={() => handleSetCanonicalCharacterImage(activeCharacter.character_id, item.url)}
                                  className="w-full text-[10px] text-purple-300 hover:text-purple-200 bg-purple-500/10 hover:bg-purple-500/20 py-1 rounded border border-purple-500/20 transition"
                                  title="Establecer esta imagen como el retrato oficial del personaje"
                                >
                                  ⭐ Hacer Retrato Oficial
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
