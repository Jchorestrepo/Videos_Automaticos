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
  Star,
  Headphones,
  PlayCircle,
  PauseCircle,
  Filter,
  Music,
  Settings,
  AlertTriangle,
  Youtube,
  Rocket,
  Globe,
  Languages,
  Camera,
  X,
} from 'lucide-react';
import type {
  ChannelPersona,
  SheetVideoItem,
  ProjectScript,
  SceneItem,
  CharacterProfile,
  VisualAssetMetadata,
  VoiceCatalogItem,
  MotionIntensityType,
  VisualMotionMode,
  EmotionalAnimationEffect,
  StoryTaskStatus,
  DurationRange,
  ReferencePhotoCandidate,
} from './types/index.ts';
import { DocumentaryVideo } from './remotion/DocumentaryVideo.tsx';
import { GlobalProgressBar } from './components/GlobalProgressBar.tsx';
import { ChannelModal } from './components/ChannelModal.tsx';
import { ChannelBacklogBoard } from './components/ChannelBacklogBoard.tsx';
import { YouTubeStudio } from './components/YouTubeStudio.tsx';
import { ChannelIncubatorStudio } from './components/ChannelIncubatorStudio.tsx';

interface ActLightingRule {
  act_number: number;
  act_name: string;
  emotional_tone: string;
  lighting_prompt: string;
  camera_composition: string;
  expression_prompt: string;
}

type StudioSection = 'production' | 'projects' | 'characters' | 'voices' | 'incubator';

export const CHARACTER_STYLE_PRESET_OPTIONS = [
  {
    id: '3d_pixar_arcane',
    label: '🎨 Pixar & Arcane 3D (Documental Premium)',
    desc: '3D estilizado de alta gama, iluminación volumétrica de estudio.',
  },
  {
    id: 'cinematic_realism',
    label: '📸 Cine Hiperrealista 8K',
    desc: 'Fotografía documental de 85mm con microtexturas y luces reales.',
  },
  {
    id: 'stylized_concept_art',
    label: '🖌️ Concept Art Cinematográfico',
    desc: 'Pintura digital de producción fílmica, estilo ArtStation.',
  },
  {
    id: 'modern_anime_hybrid',
    label: '✨ Anime / Ilustración 3D Híbrida',
    desc: 'Estilo anime moderno cinematográfico con profundidad 3D.',
  },
  {
    id: 'vintage_retro_doc',
    label: '🎞️ Documental Histórico / Retro',
    desc: 'Estética de archivo histórico, grano analógico e iluminación clásica.',
  },
];

export default function App() {
  const [studioSection, setStudioSection] = useState<StudioSection>('production');
  const [channels, setChannels] = useState<ChannelPersona[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<ChannelPersona | null>(null);
  const [channelModalMode, setChannelModalMode] = useState<'create' | 'edit' | null>(null);
  const [channelCharacters, setChannelCharacters] = useState<CharacterProfile[]>([]);
  const [selectedLibraryChar, setSelectedLibraryChar] = useState<CharacterProfile | null>(null);
  const [charCategoryFilter, setCharCategoryFilter] = useState<'all' | 'real_person' | 'channel_lore_cast'>('all');
  const [selectedProjectCharIndex, setSelectedProjectCharIndex] = useState<number>(0);
  const [projectsList, setProjectsList] = useState<ProjectScript[]>([]);
  const [allProjectsList, setAllProjectsList] = useState<ProjectScript[]>([]);
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
  const [isTurboGenerating, setIsTurboGenerating] = useState(false);
  const [autoRenderAfterTurbo, setAutoRenderAfterTurbo] = useState(false);
  const [audioGeneratingEngine, setAudioGeneratingEngine] = useState<string | null>(null);
  const [audioGeneratingSceneId, setAudioGeneratingSceneId] = useState<number | null>(null);
  const [isGeneratingPortrait, setIsGeneratingPortrait] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingRefImage, setIsUploadingRefImage] = useState(false);
  const [confirmGenerateAllOpen, setConfirmGenerateAllOpen] = useState(false);

  // Estados para el Modal Creador Asistido de Personajes
  const [charCreatorModalOpen, setCharCreatorModalOpen] = useState(false);
  const [charCreatorType, setCharCreatorType] = useState<'real_person' | 'channel_lore_cast'>('real_person');
  const [charCreatorName, setCharCreatorName] = useState('');
  const [charCreatorRole, setCharCreatorRole] = useState('');
  const [charCreatorStylePreset, setCharCreatorStylePreset] = useState('3d_pixar_arcane');
  const [charCreatorCustomStyle, setCharCreatorCustomStyle] = useState('');
  const [charCreatorRefPhotoBase64, setCharCreatorRefPhotoBase64] = useState<string | null>(null);
  const [charCreatorGenerateImmediately, setCharCreatorGenerateImmediately] = useState(true);

  const [isRendering, setIsRendering] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  // Estados para el Modal Selector de Foto Real de Referencia
  const [refPickerOpen, setRefPickerOpen] = useState(false);
  const [refPickerChar, setRefPickerChar] = useState<CharacterProfile | null>(null);
  const [refPickerQuery, setRefPickerQuery] = useState('');
  const [refPickerCandidates, setRefPickerCandidates] = useState<ReferencePhotoCandidate[]>([]);
  const [isSearchingRefPhotos, setIsSearchingRefPhotos] = useState(false);
  const [isApplyingRefPhoto, setIsApplyingRefPhoto] = useState(false);

  const [autonomousMode, setAutonomousMode] = useState(false);
  const [customTopic, setCustomTopic] = useState('');
  const [configStatus, setConfigStatus] = useState<any>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Estados para el Modal de Configuración de Agnes AI y Vertex AI
  const [vertexModalOpen, setVertexModalOpen] = useState(false);
  const [agnesModalOpen, setAgnesModalOpen] = useState(false);
  const [activeEngineTab, setActiveEngineTab] = useState<'vertex' | 'agnes'>('vertex');
  const [vertexProjectIdInput, setVertexProjectIdInput] = useState('');
  const [vertexLocationInput, setVertexLocationInput] = useState('us-central1');
  const [vertexApiKeyInput, setVertexApiKeyInput] = useState('');
  const [vertexServiceAccountJson, setVertexServiceAccountJson] = useState('');
  const [vertexTesting, setVertexTesting] = useState(false);
  const [vertexSaving, setVertexSaving] = useState(false);
  const [vertexTestStatus, setVertexTestStatus] = useState<{ success: boolean; message: string; preview?: string } | null>(null);
  const [portraitErrorMessage, setPortraitErrorMessage] = useState<string | null>(null);

  const [agnesApiKeyInput, setAgnesApiKeyInput] = useState('');
  const [agnesModelInput, setAgnesModelInput] = useState('agnes-image-2.1-flash');
  const [agnesTesting, setAgnesTesting] = useState(false);
  const [agnesSaving, setAgnesSaving] = useState(false);
  const [agnesTestStatus, setAgnesTestStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [expandedVoiceProjectId, setExpandedVoiceProjectId] = useState<string | null>(null);
  const [libraryPickerSceneId, setLibraryPickerSceneId] = useState<number | null>(null);
  const [smartReuseImages, setSmartReuseImages] = useState<boolean>(true);
  const [librarySearchQuery, setLibrarySearchQuery] = useState<string>('');
  const [characterAssetSearch, setCharacterAssetSearch] = useState<string>('');

  const charFileInputRef = useRef<HTMLInputElement | null>(null);
  const studioCharFileInputRef = useRef<HTMLInputElement | null>(null);
  const charRefFileInputRef = useRef<HTMLInputElement | null>(null);
  const studioCharRefFileInputRef = useRef<HTMLInputElement | null>(null);
  const modalCharRefFileInputRef = useRef<HTMLInputElement | null>(null);
  const previewCustomFileInputRef = useRef<HTMLInputElement | null>(null);

  // Estados para Reproductor Remotion Avanzado y Director IA (Paso 5)
  const playerRef = useRef<PlayerRef>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [activePreviewSceneIndex, setActivePreviewSceneIndex] = useState<number>(0);
  const [showCaptions, setShowCaptions] = useState<boolean>(true);
  const [showAtmosphere, setShowAtmosphere] = useState<boolean>(true);
  const [showHighlightCards, setShowHighlightCards] = useState<boolean>(true);
  const [showChapterBadge, setShowChapterBadge] = useState<boolean>(true);
  const [motionIntensity, setMotionIntensity] = useState<MotionIntensityType>('standard');
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
      loadVoiceCatalog(true);
      showToast('⚡ VoiceStudio Local (RTX 3080) iniciado y voces cargadas.');
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
      loadVoiceCatalog(true);
      showToast('🛑 VoiceStudio detenido. VRAM de GPU liberada.');
    } catch (err: any) {
      alert(`Error al detener VoiceStudio: ${err.message}`);
    }
  };

  // Estados para el Catálogo y Explorador de Voces (Voice Hub)
  const [voiceCatalog, setVoiceCatalog] = useState<VoiceCatalogItem[]>([]);
  const [loadingVoiceCatalog, setLoadingVoiceCatalog] = useState<boolean>(false);
  const [voiceSubTab, setVoiceSubTab] = useState<'catalog' | 'projects'>('catalog');
  const [catalogProviderFilter, setCatalogProviderFilter] = useState<string>('all');
  const [catalogLangFilter, setCatalogLangFilter] = useState<string>('all');
  const [catalogStyleFilter, setCatalogStyleFilter] = useState<string>('all');
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [favoriteVoiceIds, setFavoriteVoiceIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('fav_voices') || '["b4b14f0e"]');
    } catch {
      return ['b4b14f0e'];
    }
  });

  // Laboratorio de Prueba con Frase Propia
  const [testSampleText, setTestSampleText] = useState<string>(
    'Esta es la historia de cómo un imperio de mil millones de dólares se evaporó en cuestión de horas.'
  );
  const [testSampleVoiceId, setTestSampleVoiceId] = useState<string>('b4b14f0e');
  const [testSampleProvider, setTestSampleProvider] = useState<string>('voicestudio');
  const [isSynthesizingTest, setIsSynthesizingTest] = useState<boolean>(false);
  const [testAudioResultUrl, setTestAudioResultUrl] = useState<string | null>(null);

  const sampleAudioRef = useRef<HTMLAudioElement | null>(null);

  const loadVoiceCatalog = async (force: boolean = false) => {
    setLoadingVoiceCatalog(true);
    try {
      const res = await fetch(`/api/audio/catalog${force ? '?refresh=true' : ''}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.voices)) {
        setVoiceCatalog(data.voices);
      }
    } catch (err) {
      console.error('Error cargando catálogo de voces:', err);
    } finally {
      setLoadingVoiceCatalog(false);
    }
  };

  const handleToggleFavoriteVoice = (voiceId: string) => {
    setFavoriteVoiceIds((prev) => {
      const exists = prev.includes(voiceId);
      const next = exists ? prev.filter((id) => id !== voiceId) : [...prev, voiceId];
      try {
        localStorage.setItem('fav_voices', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handlePlayVoiceSample = (sampleUrl?: string, voiceId?: string) => {
    if (!sampleUrl || !voiceId) return;

    if (playingVoiceId === voiceId) {
      if (sampleAudioRef.current) {
        sampleAudioRef.current.pause();
      }
      setPlayingVoiceId(null);
      return;
    }

    if (sampleAudioRef.current) {
      sampleAudioRef.current.pause();
    }

    const audio = new Audio(sampleUrl);
    sampleAudioRef.current = audio;
    setPlayingVoiceId(voiceId);

    audio.play().catch((err) => {
      console.warn('Error reproduciendo muestra:', err);
      setPlayingVoiceId(null);
    });

    audio.onended = () => {
      setPlayingVoiceId(null);
    };

    audio.onerror = () => {
      setPlayingVoiceId(null);
    };
  };

  const handleSynthesizeTestSample = async () => {
    if (!testSampleText.trim()) return;
    setIsSynthesizingTest(true);
    try {
      const res = await fetch('/api/audio/preview-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: testSampleProvider,
          voiceId: testSampleVoiceId,
          text: testSampleText.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error sintetizando muestra');
      setTestAudioResultUrl(data.previewUrl);
      showToast('✓ Muestra de audio generada con éxito.');
      handlePlayVoiceSample(data.previewUrl, 'test_sample_active');
    } catch (err: any) {
      alert(`Error en prueba de voz: ${err.message}`);
    } finally {
      setIsSynthesizingTest(false);
    }
  };

  const handleAssignVoiceToProject = (voice: VoiceCatalogItem, role: 'primary' | 'secondary' = 'primary') => {
    if (!currentProject) {
      showToast('Selecciona primero un proyecto activo en el menú lateral.');
      return;
    }
    const updated = {
      ...currentProject,
      voiceEngine: voice.provider === 'voicestudio' ? 'voicestudio' : (voice.provider === 'elevenlabs' ? 'elevenlabs' : 'openai'),
      [role === 'primary' ? 'primaryVoice' : 'secondaryVoice']: voice.id,
    };
    persistProjectUpdate(updated as any);
    showToast(`🎙️ Voz "${voice.name}" asignada como ${role === 'primary' ? 'Principal' : 'Secundaria'} del proyecto actual.`);
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

  const handleTestAgnesKey = async () => {
    setAgnesTesting(true);
    setAgnesTestStatus(null);
    try {
      const res = await fetch('/api/config/test-agnes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: agnesApiKeyInput }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAgnesTestStatus({ success: true, message: data.message || '¡Conexión exitosa con Agnes AI!' });
        showToast('✓ Conexión exitosa con Agnes AI');
      } else {
        setAgnesTestStatus({ success: false, message: data.error || 'Fallo de autenticación con Agnes AI' });
      }
    } catch (err: any) {
      setAgnesTestStatus({ success: false, message: `Error de red: ${err.message}` });
    } finally {
      setAgnesTesting(false);
    }
  };

  const handleSaveAgnesKey = async () => {
    setAgnesSaving(true);
    try {
      const res = await fetch('/api/config/agnes-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: agnesApiKeyInput, model: agnesModelInput }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('✓ Clave de Agnes AI guardada en .env');
        checkConfigStatus();
        setAgnesModalOpen(false);
      } else {
        showToast(`❌ Error guardando: ${data.error || 'desconocido'}`);
      }
    } catch (err: any) {
      showToast(`❌ Error: ${err.message}`);
    } finally {
      setAgnesSaving(false);
    }
  };

  const handleTestVertex = async () => {
    setVertexTesting(true);
    setVertexTestStatus(null);
    try {
      const res = await fetch('/api/config/test-vertex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setVertexTestStatus({
          success: true,
          message: data.message || '¡Conexión exitosa con Google Vertex AI!',
          preview: data.preview,
        });
        showToast('✓ Conexión exitosa con Google Vertex AI ($300 Crédito)');
        checkConfigStatus();
      } else {
        setVertexTestStatus({
          success: false,
          message: data.error || 'Error al conectar con Vertex AI',
        });
      }
    } catch (err: any) {
      setVertexTestStatus({
        success: false,
        message: `Error de red: ${err.message}`,
      });
    } finally {
      setVertexTesting(false);
    }
  };

  const handleSaveVertex = async () => {
    setVertexSaving(true);
    try {
      const res = await fetch('/api/config/vertex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: vertexProjectIdInput,
          location: vertexLocationInput,
          apiKey: vertexApiKeyInput,
          serviceAccountJson: vertexServiceAccountJson,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('✓ Configuración de Google Cloud Vertex AI guardada en .env');
        checkConfigStatus();
        setVertexModalOpen(false);
      } else {
        showToast(`❌ Error: ${data.error || 'desconocido'}`);
      }
    } catch (err: any) {
      showToast(`❌ Error: ${err.message}`);
    } finally {
      setVertexSaving(false);
    }
  };

  // Cargar proyectos guardados (filtrados por el canal activo, manteniendo allProjectsList para el Banco de Voces compartido)
  const loadProjectsList = (
    selectChannelLatest = false,
    explicitChannelId?: string
  ) => {
    const targetChannelId = explicitChannelId || selectedChannel?.channel_id;
    fetch('/api/projects')
      .then((res) => res.json())
      .then((allProjects: ProjectScript[]) => {
        const list = allProjects || [];
        setAllProjectsList(list);
        const channelProjects = targetChannelId
          ? list.filter((p) => p.channel_id === targetChannelId)
          : list;
        setProjectsList(channelProjects);

        if (selectChannelLatest) {
          setCurrentProject(channelProjects[0] || null);
        } else if (currentProject && targetChannelId && currentProject.channel_id !== targetChannelId) {
          setCurrentProject(channelProjects[0] || null);
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
    loadVoiceCatalog();
  }, []);

  // Al entrar al paso 4 (Imágenes y Voz), refrescar las voces activas de VoiceStudio y el catálogo
  useEffect(() => {
    if (activeStep === 4) {
      checkConfigStatus();
      loadVoiceCatalog(true);
    }
  }, [activeStep]);

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

  // Cargar biblioteca de personajes del canal seleccionado (reseteando al cambiar de canal)
  const loadChannelCharacters = (channelId: string, keepSelectedId?: string) => {
    fetch(`/api/characters/${channelId}`)
      .then((res) => res.json())
      .then((data: CharacterProfile[]) => {
        const list = Array.isArray(data) ? data : [];
        setChannelCharacters(list);
        if (keepSelectedId) {
          const found = list.find((c) => c.character_id === keepSelectedId);
          setSelectedLibraryChar(found || list[0] || null);
        } else {
          setSelectedLibraryChar(list[0] || null);
        }
      })
      .catch((err) => console.error('Error cargando personajes del canal:', err));
  };

  // 2. Cargar historias y tareas del canal activo (sincronizadas con su Google Sheet + estado local)
  const loadSheetItems = (syncFromSheet: boolean = false, explicitChannelId?: string) => {
    const chId = explicitChannelId || selectedChannel?.channel_id;
    if (!chId) return;
    setLoadingSheet(true);
    fetch(`/api/channels/${chId}/stories${syncFromSheet ? '?sync=true' : ''}`)
      .then((res) => res.json())
      .then((data: SheetVideoItem[]) => {
        setSheetItems(Array.isArray(data) ? data : []);
        if (syncFromSheet) {
          showToast('🔄 Historias sincronizadas con Google Sheets conservando tus avances.');
        }
      })
      .catch((err) => console.error('Error cargando historias del canal:', err))
      .finally(() => setLoadingSheet(false));
  };

  // Reaccionar inmediatamente al cambiar de canal: aislar personajes, proyectos e historias
  useEffect(() => {
    if (selectedChannel) {
      loadChannelCharacters(selectedChannel.channel_id);
      loadProjectsList(true, selectedChannel.channel_id);
      loadSheetItems(false, selectedChannel.channel_id);
    }
  }, [selectedChannel?.channel_id]);

  // Actualizar una historia/tarea del canal (estado, subido a youtube, archivado, etc.)
  const handleUpdateStory = async (storyId: string, patch: Partial<SheetVideoItem>) => {
    if (!selectedChannel) return;
    try {
      const res = await fetch(
        `/api/channels/${selectedChannel.channel_id}/stories/${encodeURIComponent(storyId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        }
      );
      const data = await res.json();
      if (data.success) {
        if (Array.isArray(data.stories)) {
          setSheetItems(data.stories);
        } else if (data.story) {
          setSheetItems((prev) =>
            prev.map((s) => (s.id === storyId ? data.story : s))
          );
        }

        if (patch.archived === true) {
          showToast('📦 Historia archivada y marcada como subida a YouTube.');
        } else if (patch.archived === false) {
          showToast('📂 Historia desarchivada y visible en la lista activa.');
        } else if (patch.status) {
          showToast('✅ Estado de la tarea actualizado.');
        }
      }
    } catch (err) {
      console.error('Error actualizando historia:', err);
    }
  };

  // Actualizar el estado de una historia/tarea del canal (Idea -> Por Hacer -> En Producción -> Completado)
  const handleUpdateStoryStatus = async (storyId: string, newStatus: StoryTaskStatus) => {
    await handleUpdateStory(storyId, { status: newStatus });
  };

  // Crear una nueva historia/tarea manual en el backlog del canal
  const handleCreateManualStory = async (storyData: {
    title: string;
    characterCompany: string;
    conflict: string;
    sources: string[];
    status: StoryTaskStatus;
  }) => {
    if (!selectedChannel) return;
    try {
      const res = await fetch(`/api/channels/${selectedChannel.channel_id}/stories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(storyData),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.stories)) {
        setSheetItems(data.stories);
        showToast(`📋 Nueva historia agregada al canal "${selectedChannel.display_title}".`);
      }
    } catch (err) {
      console.error('Error creando historia manual:', err);
    }
  };

  // Eliminar una historia/tarea del backlog del canal
  const handleDeleteStory = async (storyId: string) => {
    if (!selectedChannel) return;
    try {
      const res = await fetch(
        `/api/channels/${selectedChannel.channel_id}/stories/${encodeURIComponent(storyId)}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (data.success && Array.isArray(data.stories)) {
        setSheetItems(data.stories);
        showToast('🗑️ Tarea eliminada del backlog.');
      }
    } catch (err) {
      console.error('Error eliminando historia:', err);
    }
  };

  // Abrir un proyecto existente recordando su paso activo
  const handleOpenProject = (proj: ProjectScript) => {
    setCurrentProject(proj);
    setStudioSection('production');
    if (proj.lastActiveStep && proj.lastActiveStep >= 2 && proj.lastActiveStep <= 6) {
      setActiveStep(proj.lastActiveStep);
    } else if (proj.outputVideoUrl) {
      setActiveStep(6);
    } else if (proj.scenes.some((s) => Boolean(s.imageUrl) || Boolean(s.audioUrl))) {
      setActiveStep(4);
    } else {
      setActiveStep(2);
    }
  };

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
  const handleGenerateScript = async (
    item?: SheetVideoItem,
    directTopic?: string,
    durationRange?: DurationRange
  ) => {
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
          storyId: item?.id,
          durationRange,
        }),
      });

      const script: ProjectScript = await res.json();
      setCurrentProject(script);
      setStudioSection('production');
      setActiveStep(2); // Avanzar al editor de guion
      loadChannelCharacters(selectedChannel.channel_id);
      loadProjectsList(false, selectedChannel.channel_id);
      loadSheetItems(false, selectedChannel.channel_id);
      showToast(`✨ Guion "${script.title}" creado y vinculado en el canal ${selectedChannel.name}.`);
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

  // 4.0 Alternar presencia de un personaje en una escena específica (individual o grupal)
  const handleToggleSceneCharacter = (sceneId: number, charId: string) => {
    if (!currentProject) return;
    const updatedScenes = currentProject.scenes.map((s) => {
      if (s.scene_id !== sceneId) return s;
      const currentIds =
        s.character_ids && s.character_ids.length > 0
          ? s.character_ids
          : currentProject.characters?.[0]
            ? [currentProject.characters[0].character_id]
            : [];
      const exists = currentIds.includes(charId);
      const nextIds = exists
        ? currentIds.filter((id) => id !== charId)
        : [...currentIds, charId];
      return { ...s, character_ids: nextIds };
    });
    persistProjectUpdate({ ...currentProject, scenes: updatedScenes });
  };

  // 4.1 Actualizar datos del personaje activo seleccionado en el elenco del proyecto
  const handleUpdateCharacter = (field: keyof CharacterProfile, value: any) => {
    if (!currentProject) return;
    const chars = [...(currentProject.characters || [])];
    const targetIdx = Math.min(selectedProjectCharIndex, Math.max(0, chars.length - 1));
    const activeChar = chars[targetIdx] || {
      character_id: 'protagonista',
      channel_id: selectedChannel?.channel_id || 'tech_scandals',
      name: currentProject.characterCompany || 'Protagonista',
      role: 'Figura central',
      real_person: true,
      known_face: true,
      character_category: 'real_person',
      anchor_prompt: '',
      signature_props: [],
    };

    const updatedChar = { ...activeChar, [field]: value };
    chars[targetIdx] = updatedChar;
    const updatedProject = {
      ...currentProject,
      characters: chars,
    };
    persistProjectUpdate(updatedProject);
  };

  // 4.2 Seleccionar o agregar personaje de la biblioteca al elenco del proyecto activo
  const handleSelectCharacterFromLibrary = (
    charId: string,
    mode: 'add' | 'replace' = 'add'
  ) => {
    if (!currentProject || !charId) return;
    const found = channelCharacters.find((c) => c.character_id === charId);
    if (!found) return;

    const currentCast = [...(currentProject.characters || [])];
    const existingIdx = currentCast.findIndex((c) => c.character_id === found.character_id);

    if (existingIdx >= 0) {
      setSelectedProjectCharIndex(existingIdx);
      showToast(`🎭 "${found.name}" ya forma parte del elenco de este proyecto.`);
      return;
    }

    let nextCast: CharacterProfile[];
    if (mode === 'replace' && currentCast.length > 0) {
      const targetIdx = Math.min(selectedProjectCharIndex, currentCast.length - 1);
      nextCast = [...currentCast];
      nextCast[targetIdx] = found;
    } else {
      nextCast = [...currentCast, found];
      setSelectedProjectCharIndex(nextCast.length - 1);
    }

    const updatedProject = {
      ...currentProject,
      characters: nextCast,
    };
    persistProjectUpdate(
      updatedProject,
      `🎭 "${found.name}" añadido al elenco del proyecto (${nextCast.length} personajes).`
    );
  };

  // Eliminar un personaje del elenco del proyecto actual (sin borrarlo de la biblioteca del canal)
  const handleRemoveCharacterFromProject = (charId: string) => {
    if (!currentProject) return;
    const currentCast = currentProject.characters || [];
    if (currentCast.length <= 1) {
      showToast('El proyecto debe tener al menos 1 personaje en su elenco.');
      return;
    }
    const nextCast = currentCast.filter((c) => c.character_id !== charId);
    const fallbackId = nextCast[0]?.character_id;
    const updatedScenes = currentProject.scenes.map((s) => {
      if (!s.character_ids) return s;
      const filteredIds = s.character_ids.filter((id) => id !== charId);
      return {
        ...s,
        character_ids: filteredIds.length > 0 ? filteredIds : fallbackId ? [fallbackId] : [],
      };
    });
    setSelectedProjectCharIndex(0);
    persistProjectUpdate(
      { ...currentProject, characters: nextCast, scenes: updatedScenes },
      'Personaje retirado del elenco de este proyecto.'
    );
  };

  // Limpiar y retirar del proyecto todos los personajes que no tienen ninguna escena asignada (0 escenas)
  const handlePruneUnusedCharacters = async () => {
    if (!currentProject) return;
    try {
      const res = await fetch(`/api/projects/${currentProject.project_id}/prune-characters`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success && data.project) {
        setCurrentProject(data.project);
        setSelectedProjectCharIndex(0);
        showToast(
          `🧹 Se retiraron ${data.removedCount} personaje(s) que no tenían escenas asignadas.`
        );
      }
    } catch (err) {
      console.error('Error pruning characters:', err);
      showToast('Error al limpiar personajes sin escenas del proyecto.');
    }
  };

  // Separar automáticamente múltiples personajes de la historia o inyectar Elenco con Lore del Canal (ej. Juanito)
  const handleResolveProjectCast = async (includeLoreCast: boolean = false) => {
    if (!currentProject || !selectedChannel) return;
    try {
      const res = await fetch(`/api/characters/${selectedChannel.channel_id}/resolve-cast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterCompany: currentProject.characterCompany || '',
          title: currentProject.title,
          conflict: currentProject.hook,
          includeLoreCast,
        }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.characters)) {
        const mergedCast: CharacterProfile[] = [...data.characters];
        // Conservar cualquier personaje extra que ya estuviera en el proyecto
        (currentProject.characters || []).forEach((existing) => {
          if (
            !existing.character_id.includes('_y_') &&
            !mergedCast.some((m) => m.character_id === existing.character_id)
          ) {
            mergedCast.push(existing);
          }
        });

        // Asignar personajes por escena según nombres o actos
        const updatedScenes = currentProject.scenes.map((sc, idx) => {
          const text = `${sc.chapter} ${sc.voiceover} ${sc.visual_prompt}`.toLowerCase();
          const matched = mergedCast
            .filter((c) => {
              const first = c.name.split(/\s+/)[0]?.toLowerCase() || '';
              return c.name.toLowerCase().length > 2 && (text.includes(c.name.toLowerCase()) || (first.length >= 4 && text.includes(first)));
            })
            .map((c) => c.character_id);

          if (matched.length > 0) {
            return { ...sc, character_ids: matched };
          }
          if (sc.act_number === 4) {
            const lore = mergedCast.find((c) => c.character_category === 'channel_lore_cast');
            if (lore) return { ...sc, character_ids: [lore.character_id] };
          }
          const realChars = mergedCast.filter((c) => c.character_category !== 'channel_lore_cast');
          const fallbackChar = realChars[idx % Math.max(1, realChars.length)] || mergedCast[0];
          return { ...sc, character_ids: fallbackChar ? [fallbackChar.character_id] : [] };
        });

        loadChannelCharacters(selectedChannel.channel_id);
        persistProjectUpdate(
          {
            ...currentProject,
            characters: mergedCast,
            scenes: updatedScenes,
          },
          includeLoreCast
            ? `🌟 Personaje con Lore del Canal integrado al elenco (${mergedCast.map((c) => c.name).join(', ')}).`
            : `🎭 Elenco individual separado (${mergedCast.map((c) => c.name).join(', ')}).`
        );
      }
    } catch (err) {
      console.error('Error resolviendo elenco:', err);
    }
  };

  // 4.3 Guardar personaje actual en la biblioteca del canal
  const handleSaveCharacterToLibrary = async (charToSave?: CharacterProfile) => {
    if (!selectedChannel) return;
    const projectCast = currentProject?.characters || [];
    const targetChar =
      charToSave ||
      projectCast[selectedProjectCharIndex] ||
      projectCast[0];
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
        currentProject.characters?.some((c) => c.character_id === savedChar.character_id)
      ) {
        persistProjectUpdate({
          ...currentProject,
          characters: currentProject.characters.map((c) =>
            c.character_id === savedChar.character_id ? savedChar : c
          ),
        });
      }
      showToast(`¡"${savedChar.name}" guardado en la Biblioteca de Personajes!`);
    } catch (err) {
      console.error('Error guardando personaje:', err);
    }
  };

  // 4.4 Redactar personaje con IA (Figura Real o Personaje con Lore del Canal)
  const handleDraftNewCharacter = async (
    customName?: string,
    customTitle?: string,
    asLoreCast: boolean = false
  ) => {
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
          characterCategory: asLoreCast ? 'channel_lore_cast' : 'real_person',
          knownFace: !asLoreCast,
          loreData: asLoreCast
            ? {
                age: '15 años',
                personality_traits: ['Alegre', 'Curioso', 'Deportista'],
                peculiarities: [
                  'Siempre lleva una prenda o accesorio deportivo (pelota, muñequera o gorra hacia atrás)',
                  'Expresión expresiva que conecta con la audiencia en ejemplos cotidianos',
                ],
                channel_backstory: `Personaje recurrente del canal para representar ciudadanos, usuarios o figuras de rostro desconocido en "${customTitle || 'las historias del canal'}".`,
                reusable_archetypes: ['Ciudadano común', 'Usuario joven', 'Testigo secundario / Doble'],
              }
            : undefined,
        }),
      });
      const draftedChar: CharacterProfile = await res.json();
      if (currentProject && studioSection === 'production') {
        const currentCast = currentProject.characters || [];
        const exists = currentCast.some((c) => c.character_id === draftedChar.character_id);
        const nextCast = exists
          ? currentCast.map((c) => (c.character_id === draftedChar.character_id ? draftedChar : c))
          : [...currentCast, draftedChar];
        setSelectedProjectCharIndex(nextCast.length - 1);
        persistProjectUpdate({
          ...currentProject,
          characters: nextCast,
        });
      }
      setSelectedLibraryChar(draftedChar);
      loadChannelCharacters(selectedChannel.channel_id, draftedChar.character_id);
      showToast(
        asLoreCast
          ? `🌟 Personaje con Lore del Canal "${draftedChar.name}" creado en la biblioteca.`
          : `🤖 Ficha individual de "${draftedChar.name}" generada en la biblioteca.`
      );
    } catch (err) {
      console.error('Error generando borrador de personaje:', err);
    }
  };

  // Crear personaje desde el modal asistido (con soporte de foto frontal de referencia y estilo IA)
  const handleConfirmCreateNewCharacter = async () => {
    if (!selectedChannel || !charCreatorName.trim()) return;
    try {
      const res = await fetch(`/api/characters/${selectedChannel.channel_id}/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: charCreatorName.trim(),
          title: currentProject?.title || `Historia sobre ${charCreatorName.trim()}`,
          company: charCreatorRole.trim(),
          characterCategory: charCreatorType,
          knownFace: charCreatorType === 'real_person',
          loreData:
            charCreatorType === 'channel_lore_cast'
              ? {
                  age: '15 años',
                  personality_traits: ['Alegre', 'Curioso', 'Expresivo'],
                  peculiarities: [
                    'Accesorio o vestimenta distintiva consistente',
                    'Expresivo para conectar con la audiencia',
                  ],
                  channel_backstory: `Personaje recurrente del canal para representar ciudadanos o figuras de rostro desconocido.`,
                  reusable_archetypes: ['Ciudadano común', 'Doble / Relleno'],
                }
              : undefined,
        }),
      });

      let createdChar: CharacterProfile = await res.json();

      // Si el usuario adjuntó foto real de frente, vincularla
      if (charCreatorRefPhotoBase64) {
        const refRes = await fetch(
          `/api/characters/${selectedChannel.channel_id}/${createdChar.character_id}/upload-real-reference`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: charCreatorRefPhotoBase64 }),
          }
        );
        if (refRes.ok) {
          createdChar = await refRes.json();
        }
      }

      createdChar.preferred_style_preset = charCreatorStylePreset;
      createdChar.custom_style_prompt = charCreatorCustomStyle;

      if (charCreatorGenerateImmediately) {
        await handleGenerateCharacterPortrait(createdChar, {
          stylePreset: charCreatorStylePreset,
          customStyle: charCreatorCustomStyle,
        });
      } else {
        await handleSaveCharacterToLibrary(createdChar);
      }

      if (currentProject && studioSection === 'production') {
        const currentCast = currentProject.characters || [];
        const exists = currentCast.some((c) => c.character_id === createdChar.character_id);
        const nextCast = exists
          ? currentCast.map((c) => (c.character_id === createdChar.character_id ? createdChar : c))
          : [...currentCast, createdChar];
        setSelectedProjectCharIndex(nextCast.length - 1);
        persistProjectUpdate({
          ...currentProject,
          characters: nextCast,
        });
      }

      setSelectedLibraryChar(createdChar);
      loadChannelCharacters(selectedChannel.channel_id, createdChar.character_id);
      setCharCreatorModalOpen(false);
      setCharCreatorName('');
      setCharCreatorRole('');
      setCharCreatorRefPhotoBase64(null);
      setCharCreatorCustomStyle('');

      showToast(`🎉 ¡Personaje "${createdChar.name}" creado con éxito!`);
    } catch (err) {
      console.error('Error creando personaje:', err);
      showToast('Error al crear personaje.');
    }
  };

  // 4.5 Generar retrato oficial 3D de un personaje con IA (asistido por foto real frontal y estilo si existen)
  const handleGenerateCharacterPortrait = async (
    targetChar?: CharacterProfile,
    options?: { stylePreset?: string; customStyle?: string; realReferenceBase64?: string }
  ) => {
    if (!selectedChannel) return;
    const projectCast = currentProject?.characters || [];
    const charObj =
      targetChar ||
      projectCast[selectedProjectCharIndex] ||
      projectCast[0] ||
      selectedLibraryChar;
    if (!charObj) return;

    setIsGeneratingPortrait(true);
    try {
      const payload = {
        ...charObj,
        stylePreset: options?.stylePreset || charObj.preferred_style_preset || '3d_pixar_arcane',
        customStyle:
          options?.customStyle !== undefined
            ? options.customStyle
            : charObj.custom_style_prompt || '',
        realReferenceBase64: options?.realReferenceBase64,
      };

      const res = await fetch(
        `/api/characters/${selectedChannel.channel_id}/${charObj.character_id}/generate-portrait`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || `Error HTTP ${res.status}`);
      }
      const updatedChar: CharacterProfile = await res.json();

      setSelectedLibraryChar(updatedChar);
      loadChannelCharacters(selectedChannel.channel_id, updatedChar.character_id);

      if (
        currentProject &&
        currentProject.characters?.some((c) => c.character_id === updatedChar.character_id)
      ) {
        persistProjectUpdate({
          ...currentProject,
          characters: currentProject.characters.map((c) =>
            c.character_id === updatedChar.character_id ? updatedChar : c
          ),
        });
      }
      setPortraitErrorMessage(null);
      showToast(
        updatedChar.real_reference_image_url
          ? `🎨 ¡Retrato 3D transformado fielmente a partir de la foto real para "${updatedChar.name}"!`
          : `🎨 ¡Retrato oficial 3D individual generado para "${updatedChar.name}"!`
      );
    } catch (err: any) {
      console.error('Error generando retrato del personaje:', err);
      const msg = err.message || 'Error al generar retrato con IA.';
      setPortraitErrorMessage(msg);
      showToast(`❌ ${msg.slice(0, 65)}...`);
    } finally {
      setIsGeneratingPortrait(false);
    }
  };

  // Subir foto real de frente de referencia para que la IA capture sus rasgos exactos
  const handleUploadRealReferencePhoto = async (file: File, targetChar?: CharacterProfile) => {
    if (!selectedChannel || !file) return;
    const projectCast = currentProject?.characters || [];
    const charObj =
      targetChar ||
      projectCast[selectedProjectCharIndex] ||
      projectCast[0] ||
      selectedLibraryChar;
    if (!charObj) return;

    setIsUploadingRefImage(true);
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });

      const res = await fetch(
        `/api/characters/${selectedChannel.channel_id}/${charObj.character_id}/upload-real-reference`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64Data }),
        }
      );

      if (!res.ok) throw new Error('No se pudo subir la foto de referencia');
      const updatedChar: CharacterProfile = await res.json();

      setSelectedLibraryChar(updatedChar);
      loadChannelCharacters(selectedChannel.channel_id, updatedChar.character_id);

      if (
        currentProject &&
        currentProject.characters?.some((c) => c.character_id === updatedChar.character_id)
      ) {
        persistProjectUpdate({
          ...currentProject,
          characters: currentProject.characters.map((c) =>
            c.character_id === updatedChar.character_id ? updatedChar : c
          ),
        });
      }
      showToast(
        `📸 Foto frontal real vinculada a "${updatedChar.name}". ¡Ahora puedes generar su retrato 3D sin que la IA alucine!`
      );
    } catch (err) {
      console.error('Error subiendo foto de referencia:', err);
      showToast('Error al subir la foto frontal de referencia.');
    } finally {
      setIsUploadingRefImage(false);
    }
  };

  // Abrir selector de foto real con búsqueda en Wikipedia/Commons/Google
  const handleOpenRefPhotoPicker = async (targetChar?: CharacterProfile) => {
    if (!selectedChannel) return;
    const projectCast = currentProject?.characters || [];
    const charObj =
      targetChar ||
      projectCast[selectedProjectCharIndex] ||
      projectCast[0] ||
      selectedLibraryChar;
    if (!charObj) return;

    setRefPickerChar(charObj);
    setRefPickerQuery(charObj.name);
    setRefPickerCandidates([]);
    setRefPickerOpen(true);
    setIsSearchingRefPhotos(true);

    try {
      const q = encodeURIComponent(charObj.name);
      const res = await fetch(
        `/api/characters/${selectedChannel.channel_id}/${charObj.character_id}/reference-candidates?q=${q}`
      );
      if (res.ok) {
        const data = await res.json();
        setRefPickerCandidates(data.candidates || []);
      }
    } catch (err) {
      console.error('Error buscando fotos candidatas:', err);
    } finally {
      setIsSearchingRefPhotos(false);
    }
  };

  const handleSearchRefCandidates = async (customQuery: string) => {
    if (!selectedChannel || !refPickerChar) return;
    setIsSearchingRefPhotos(true);
    try {
      const q = encodeURIComponent(customQuery.trim() || refPickerChar.name);
      const res = await fetch(
        `/api/characters/${selectedChannel.channel_id}/${refPickerChar.character_id}/reference-candidates?q=${q}`
      );
      if (res.ok) {
        const data = await res.json();
        setRefPickerCandidates(data.candidates || []);
      }
    } catch (err) {
      console.error('Error buscando fotos:', err);
      showToast('Error al buscar fotos de referencia.');
    } finally {
      setIsSearchingRefPhotos(false);
    }
  };

  const handleApplyRefCandidate = async (candidate: ReferencePhotoCandidate) => {
    if (!selectedChannel || !refPickerChar) return;
    setIsApplyingRefPhoto(true);
    try {
      const res = await fetch(
        `/api/characters/${selectedChannel.channel_id}/${refPickerChar.character_id}/apply-reference`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: candidate.url }),
        }
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'No se pudo aplicar la foto');
      }
      const updatedChar: CharacterProfile = await res.json();

      setSelectedLibraryChar(updatedChar);
      setRefPickerChar(updatedChar);
      loadChannelCharacters(selectedChannel.channel_id, updatedChar.character_id);

      if (
        currentProject &&
        currentProject.characters?.some((c) => c.character_id === updatedChar.character_id)
      ) {
        persistProjectUpdate({
          ...currentProject,
          characters: currentProject.characters.map((c) =>
            c.character_id === updatedChar.character_id ? updatedChar : c
          ),
        });
      }

      setRefPickerOpen(false);
      showToast(`📸 Foto real vinculada con éxito a "${updatedChar.name}".`);
    } catch (err: any) {
      console.error('Error aplicando foto de referencia:', err);
      showToast(`❌ ${err.message || 'Error al aplicar la foto'}`);
    } finally {
      setIsApplyingRefPhoto(false);
    }
  };

  // Desvincular foto real de referencia
  const handleRemoveRealReferencePhoto = async (targetChar?: CharacterProfile) => {
    if (!selectedChannel) return;
    const projectCast = currentProject?.characters || [];
    const charObj =
      targetChar ||
      projectCast[selectedProjectCharIndex] ||
      projectCast[0] ||
      selectedLibraryChar;
    if (!charObj) return;

    const updatedChar: CharacterProfile = {
      ...charObj,
      real_reference_image_url: undefined,
    };
    await handleSaveCharacterToLibrary(updatedChar);
    showToast(`Foto frontal de referencia desvinculada de "${charObj.name}".`);
  };

  // Aprobar formalmente el retrato canónico del personaje
  const handleApproveCharacterPortrait = async (targetChar?: CharacterProfile) => {
    if (!selectedChannel) return;
    const projectCast = currentProject?.characters || [];
    const charObj =
      targetChar ||
      projectCast[selectedProjectCharIndex] ||
      projectCast[0] ||
      selectedLibraryChar;
    if (!charObj) return;

    try {
      const res = await fetch(
        `/api/characters/${selectedChannel.channel_id}/${charObj.character_id}/approve-portrait`,
        { method: 'POST' }
      );
      if (res.ok) {
        const updatedChar: CharacterProfile = await res.json();
        setSelectedLibraryChar(updatedChar);
        loadChannelCharacters(selectedChannel.channel_id, updatedChar.character_id);
        if (
          currentProject &&
          currentProject.characters?.some((c) => c.character_id === updatedChar.character_id)
        ) {
          persistProjectUpdate({
            ...currentProject,
            characters: currentProject.characters.map((c) =>
              c.character_id === updatedChar.character_id ? updatedChar : c
            ),
          });
        }
        showToast(`✅ ¡Diseño y retrato de "${updatedChar.name}" aprobados para el video!`);
      }
    } catch (err) {
      console.error('Error aprobando retrato:', err);
    }
  };

  // Generar Escena 1 de Prueba (Piloto) para verificar al personaje en plano 16:9 antes de generar las demás
  const handleGeneratePilotScene = async () => {
    if (!currentProject) return;
    await handleGenerateImages(1, true);
    showToast('🎬 ¡Escena 1 piloto generada! Revisa si el personaje luce perfecto en 16:9 antes de continuar.');
  };

  // Solicitar generación de escenas con advertencia de validación preventiva
  const handleRequestGenerateAllScenes = () => {
    if (!currentProject) return;
    const projectCast = currentProject.characters || [];
    const unapprovedChar = projectCast.find(
      (c) => !c.canonical_image_url || !c.portrait_approved
    );
    const scene1Done =
      currentProject.scenes[0]?.imageUrl &&
      !currentProject.scenes[0].imageUrl.endsWith('.svg');

    if (unapprovedChar || !scene1Done) {
      setConfirmGenerateAllOpen(true);
    } else {
      handleGenerateImages();
    }
  };

  // 4.6 Subir versión propia trabajada por el usuario para un personaje (PNG/JPG/WebP)
  const handleUploadCharacterImage = async (file: File, targetChar?: CharacterProfile) => {
    if (!selectedChannel || !file) return;
    const projectCast = currentProject?.characters || [];
    const charObj =
      targetChar ||
      projectCast[selectedProjectCharIndex] ||
      projectCast[0] ||
      selectedLibraryChar;
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
        currentProject.characters?.some((c) => c.character_id === updatedChar.character_id)
      ) {
        persistProjectUpdate({
          ...currentProject,
          characters: currentProject.characters.map((c) =>
            c.character_id === updatedChar.character_id ? updatedChar : c
          ),
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

  // 5. Generar imágenes con Arco Emocional, Biblioteca y Reutilización Inteligente (sin repetir en el mismo video)
  const handleGenerateImages = async (
    singleSceneId?: number,
    forceAi: boolean = false,
    onlyDuplicatesOrMissing: boolean = false
  ) => {
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
          onlyDuplicatesOrMissing,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || `Error ${res.status} al generar imagen`);
      }

      const updatedProject = await res.json();
      if (updatedProject && Array.isArray(updatedProject.scenes)) {
        setCurrentProject({
          ...updatedProject,
          scenes: updatedProject.scenes.map((s: any) => ({ ...s })),
        });
        loadProjectsList(false);
        if (selectedChannel) {
          loadChannelCharacters(selectedChannel.channel_id);
        }
        if (!singleSceneId) {
          setActiveStep(4); // Avanzar a galería de imágenes y audio
        }
      }
    } catch (err: any) {
      console.error('Error generando imágenes:', err);
      showToast(`❌ Error al generar imagen: ${err.message || 'Error del servidor'}`);
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
        if (
          currentProject &&
          currentProject.characters?.some((c) => c.character_id === characterId)
        ) {
          setCurrentProject({
            ...currentProject,
            characters: currentProject.characters.map((c) =>
              c.character_id === characterId ? updatedChar : c
            ),
          });
        }
        loadChannelCharacters(selectedChannel.channel_id);
        showToast(`⭐ Retrato oficial individual actualizado para ${updatedChar.name}`);
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

  // 5.1 Conmutar dinámicamente entre pista en Español y Master en Inglés sin perder datos
  const [isSwitchingLanguage, setIsSwitchingLanguage] = useState<boolean>(false);
  const handleSwitchLanguage = async (targetLang: 'es' | 'en') => {
    if (!currentProject || currentProject.language === targetLang) return;
    setIsSwitchingLanguage(true);
    try {
      const res = await fetch('/api/project/switch-language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProject.project_id,
          targetLanguage: targetLang,
        }),
      });
      const data = await res.json();
      if (data.success && data.project) {
        setCurrentProject(data.project);
        loadProjectsList(false);
        showToast(
          targetLang === 'es'
            ? '🇪🇸 Cambiado a Vista en Español (Guion, Audios y Tiempos en Español)'
            : '🇺🇸 Cambiado a Master en Inglés (Guion, Audios y Tiempos en Inglés)'
        );
      } else {
        alert(`Error al cambiar idioma: ${data.error || 'Desconocido'}`);
      }
    } catch (err: any) {
      console.error('Error switching language:', err);
      alert('Error cambiando el idioma del proyecto.');
    } finally {
      setIsSwitchingLanguage(false);
    }
  };

  // Lista consolidada y garantizada de voces para los selectores de Voz Principal y Voz Secundaria
  const getSelectableVoiceOptions = () => {
    const defaultLocal = [
      { id: 'b4b14f0e', name: 'Gomorra', type: 'profile', language: 'Spanish', provider: 'voicestudio' },
      { id: '3ed550f0', name: 'Spanish Narrator', type: 'profile', language: 'Spanish', provider: 'voicestudio' },
      { id: '1236af3e', name: 'Spanish Explainer', type: 'profile', language: 'Spanish', provider: 'voicestudio' },
      { id: '411ae987', name: 'Spanish Companion', type: 'profile', language: 'Spanish', provider: 'voicestudio' },
      { id: 'demo0001', name: 'VoiceStudio Demo Voice', type: 'demo', language: 'English', provider: 'voicestudio' },
    ];

    const seen = new Set<string>();
    const localList: Array<{ id: string; name: string; type?: string; language?: string; provider?: string }> = [];

    const addVoice = (v: { id: string; name: string; type?: string; language?: string; provider?: string }) => {
      if (!v || !v.id) return;
      const key = v.id.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      localList.push(v);
    };

    if (Array.isArray(configStatus?.voiceStudioVoices) && configStatus.voiceStudioVoices.length > 0) {
      configStatus.voiceStudioVoices.forEach((v: any) => addVoice({ ...v, provider: 'voicestudio' }));
    }

    voiceCatalog
      .filter((v) => v.provider === 'voicestudio')
      .forEach((v) =>
        addVoice({
          id: v.id,
          name: v.name,
          type: v.isCloned ? 'profile' : 'demo',
          language: v.language === 'es' ? 'Spanish' : 'English',
          provider: 'voicestudio',
        })
      );

    defaultLocal.forEach((v) => addVoice(v));

    const otherCatalogVoices = voiceCatalog.filter((v) => v.provider !== 'voicestudio');
    return { localList, otherCatalogVoices };
  };

  // Normaliza 'gomorra' -> 'b4b14f0e' para que el <select> coincida exactamente con el <option value>
  const normalizeVoiceSelectValue = (val: string | undefined, defaultId: string = 'b4b14f0e') => {
    if (!val) return defaultId;
    const lower = val.toLowerCase();
    if (lower === 'gomorra') return 'b4b14f0e';
    const { localList, otherCatalogVoices } = getSelectableVoiceOptions();
    const matchLocal = localList.find(
      (v) => v.id.toLowerCase() === lower || v.name.toLowerCase() === lower
    );
    if (matchLocal) return matchLocal.id;
    const matchOther = otherCatalogVoices.find(
      (v) => v.id.toLowerCase() === lower || v.name.toLowerCase() === lower
    );
    if (matchOther) return matchOther.id;
    return val;
  };

  // Helper para mostrar el nombre amigable de una voz
  const getVoiceDisplayName = (voiceIdOrName?: string) => {
    if (!voiceIdOrName) return 'Gomorra';
    const lower = voiceIdOrName.toLowerCase();
    if (lower === 'gomorra' || lower === 'b4b14f0e') return 'Gomorra';
    const { localList, otherCatalogVoices } = getSelectableVoiceOptions();
    const foundLocal = localList.find(
      (v) => v.id.toLowerCase() === lower || v.name.toLowerCase() === lower
    );
    if (foundLocal) return foundLocal.name;
    const foundOther = otherCatalogVoices.find(
      (v) => v.id.toLowerCase() === lower || v.name.toLowerCase() === lower
    );
    if (foundOther) return foundOther.name;
    return voiceIdOrName;
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
    const primaryVoiceToUse = normalizeVoiceSelectValue(currentProject.primaryVoice, 'b4b14f0e');
    const secondaryVoiceToUse = normalizeVoiceSelectValue(currentProject.secondaryVoice, '3ed550f0');

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

  // 5.1 Producción Turbo Concurrente (Imágenes + Audio al mismo tiempo + Auto-Render opcional)
  const handleGenerateTurboProduction = async () => {
    if (!currentProject) return;
    setIsTurboGenerating(true);

    const providerToUse =
      currentProject.voiceEngine ||
      (configStatus?.hasVoiceStudio ? 'voicestudio' : (currentProject.language === 'en' ? 'elevenlabs' : 'openai'));
    const voiceModeToUse = currentProject.voiceMode || 'single';
    const primaryVoiceToUse = normalizeVoiceSelectValue(currentProject.primaryVoice, 'b4b14f0e');
    const secondaryVoiceToUse = normalizeVoiceSelectValue(currentProject.secondaryVoice, '3ed550f0');

    try {
      const res = await fetch('/api/project/generate-all-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProject.project_id,
          smartReuse: smartReuseImages,
          preferredAudioProvider: providerToUse,
          voiceMode: voiceModeToUse,
          primaryVoice: primaryVoiceToUse,
          secondaryVoice: secondaryVoiceToUse,
          autoRender: autoRenderAfterTurbo,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || 'Error en producción turbo concurrente');
      }

      const data = await res.json();
      if (data.project) {
        setCurrentProject(data.project);
        loadProjectsList(false);
        if (selectedChannel) {
          loadChannelCharacters(selectedChannel.channel_id);
        }
        if (autoRenderAfterTurbo && data.outputVideoUrl) {
          setActiveStep(6);
          showToast('⚡🎬 ¡Producción Turbo Completada! Medios generados y video MP4 1080p renderizado con éxito.');
        } else {
          showToast('⚡ ¡Producción Turbo completada! Imágenes y locuciones generadas simultáneamente en paralelo.');
        }
      }
    } catch (err: any) {
      console.error('Error en producción turbo:', err);
      alert(`Error en producción turbo: ${err.message || 'Error desconocido'}`);
    } finally {
      setIsTurboGenerating(false);
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
      videoNeedsReRender: true,
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
      videoNeedsReRender: true,
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
    const updated: ProjectScript = { ...currentProject, scenes: updatedScenes, videoNeedsReRender: true };
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
    const updated: ProjectScript = { ...currentProject, voiceMode: 'dual', scenes: updatedScenes, videoNeedsReRender: true };
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
    const updated: ProjectScript = { ...currentProject, scenes: updatedScenes, videoNeedsReRender: true };
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
  const handleRenderVideo = async (targetLangOverride?: 'es' | 'en') => {
    if (!currentProject) return;
    setIsRendering(true);

    const effectiveLang = targetLangOverride || currentProject.language || 'en';

    try {
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProject.project_id,
          showCaptions,
          showAtmosphere,
          showHighlightCards,
          showChapterBadge,
          motionIntensity,
          language: effectiveLang,
          scenes: currentProject.scenes,
        }),
      });

      const data = await res.json();
      if (data.success && data.project) {
        setCurrentProject(data.project);
        loadProjectsList(false);
        showToast(
          effectiveLang === 'es'
            ? '🎬 ¡Video MP4 en Español (1080p) renderizado con éxito!'
            : '🎬 ¡Video MP4 en Inglés Master (1080p) renderizado con éxito!'
        );
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
  const totalFrames = currentProject && Array.isArray(currentProject.scenes)
    ? Math.max(
        60,
        Math.round(
          currentProject.scenes.reduce((acc, s) => acc + (s.durationInSeconds || 3), 0) * 30
        )
      )
    : 300;

  const projectCast = currentProject?.characters || [];
  const activeCharacter =
    projectCast[Math.min(selectedProjectCharIndex, Math.max(0, projectCast.length - 1))] ||
    projectCast[0];

  // El Banco de Voces y Audios se comparte entre todos los canales
  const projectsWithVoice = (allProjectsList.length > 0 ? allProjectsList : projectsList).filter(
    (p) => Array.isArray(p.scenes) && p.scenes.some((s) => Boolean(s.audioUrl))
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

  const baseFilterVoices = catalogProviderFilter === 'all'
    ? voiceCatalog
    : voiceCatalog.filter((v) => v.provider === catalogProviderFilter);

  const filteredVoices = voiceCatalog.filter((v) => {
    if (catalogProviderFilter !== 'all' && v.provider !== catalogProviderFilter) return false;
    if (catalogLangFilter !== 'all') {
      if (catalogLangFilter === 'es' && v.language !== 'es' && v.language !== 'multilingual') return false;
      if (catalogLangFilter === 'en' && v.language !== 'en' && v.language !== 'multilingual') return false;
      if (catalogLangFilter === 'multilingual' && v.language !== 'multilingual') return false;
    }
    if (catalogStyleFilter !== 'all') {
      if (catalogStyleFilter === 'favorites') {
        if (!favoriteVoiceIds.includes(v.id)) return false;
      } else if (catalogStyleFilter === 'clones') {
        if (!v.isCloned) return false;
      } else if (v.styleCategory !== catalogStyleFilter) {
        return false;
      }
    }
    if (catalogSearch.trim()) {
      const q = catalogSearch.toLowerCase();
      const matchName = v.name.toLowerCase().includes(q);
      const matchDesc = (v.description || '').toLowerCase().includes(q);
      const matchAccent = (v.accent || '').toLowerCase().includes(q);
      const matchLabels = Array.isArray(v.labels)
        ? v.labels.some((l) => l.toLowerCase().includes(q))
        : Object.values(v.labels || {}).some((l) => String(l).toLowerCase().includes(q));
      if (!matchName && !matchDesc && !matchAccent && !matchLabels) return false;
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
                v3.5 Multi-Canal Independiente
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Canales Independientes • Tablero de Historias y Tareas • Progreso en Tiempo Real
            </p>
          </div>
        </div>

        {/* Controles Globales: Selector de Canal + Crear Canal + Configurar Canal */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-xl p-1 gap-1">
            <span className="text-xs text-slate-400 px-2 font-medium">Canal:</span>
            <select
              value={selectedChannel?.channel_id || ''}
              onChange={(e) => {
                const found = channels.find((c) => c.channel_id === e.target.value);
                if (found) {
                  setSelectedChannel(found);
                  setActiveStep(1);
                }
              }}
              className="bg-slate-800 text-xs sm:text-sm font-semibold text-white px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {channels.map((c) => (
                <option key={c.channel_id} value={c.channel_id}>
                  {c.display_title}
                </option>
              ))}
            </select>

            <button
              onClick={() => setChannelModalMode('edit')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Configurar este canal (Personalidad, Voz por defecto, URL de Google Sheet)"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={() => setChannelModalMode('create')}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition shadow-sm"
              title="Crear un nuevo canal independiente"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nuevo Canal</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setVertexProjectIdInput(configStatus?.gcpProject || '407759962191');
              setVertexLocationInput(configStatus?.gcpLocation || 'us-central1');
              setVertexTestStatus(null);
              setAgnesApiKeyInput('');
              setAgnesTestStatus(null);
              setActiveEngineTab(configStatus?.hasVertex ? 'vertex' : 'vertex');
              setVertexModalOpen(true);
            }}
            title="Haz clic para configurar Google Cloud Vertex AI (Aprovechar tus $300 USD de crédito) o Agnes AI"
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition shadow-sm ${
              configStatus?.hasVertex
                ? 'bg-gradient-to-r from-blue-950/60 to-indigo-950/60 text-blue-300 border-blue-500/40 shadow-blue-900/20'
                : configStatus?.hasAgnes
                ? 'bg-gradient-to-r from-fuchsia-950/40 to-purple-950/40 text-fuchsia-300 border-fuchsia-500/40 shadow-fuchsia-900/20'
                : configStatus?.hasImageKey
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                configStatus?.hasVertex
                  ? 'bg-blue-400 animate-pulse'
                  : configStatus?.hasAgnes
                  ? 'bg-fuchsia-400 animate-pulse'
                  : configStatus?.hasImageKey
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-amber-400'
              }`}
            />
            <span>{configStatus?.activeImageEngine || 'Cargando...'}</span>
            <Settings className="w-3.5 h-3.5 ml-1 opacity-70 hover:opacity-100" />
          </button>

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
                  Paso {activeStep}/7
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

              <button
                onClick={() => setStudioSection('incubator')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                  studioSection === 'incubator'
                    ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Rocket className="w-4 h-4 text-amber-400" />
                  Incubadora & Estratega
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                    studioSection === 'incubator'
                      ? 'bg-amber-500 text-white'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  IA
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
                  { id: 1, label: '1. Historias & Tareas', icon: Table },
                  { id: 2, label: '2. Editor de Guion', icon: Edit3 },
                  { id: 3, label: '3. Personaje & Retrato', icon: Users },
                  { id: 4, label: '4. Imágenes & Voz', icon: ImageIcon },
                  { id: 5, label: '5. Video Remotion', icon: Play },
                  { id: 6, label: '6. Render & Export', icon: Download },
                  { id: 7, label: '7. Miniatura & YouTube', icon: Youtube },
                ].map((step) => {
                  const Icon = step.icon;
                  const isActive = activeStep === step.id;
                  const isCompleted = activeStep > step.id;

                  return (
                    <button
                      key={step.id}
                      onClick={() => {
                        setActiveStep(step.id);
                        if (currentProject && step.id >= 2) {
                          persistProjectUpdate({
                            ...currentProject,
                            lastActiveStep: step.id,
                          });
                        }
                      }}
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
            {/* Barra de Progreso Real en Tiempo Real (0% - 100%) para Guiones, Imágenes, Locución y Render MP4 */}
            <GlobalProgressBar
              channelId={selectedChannel?.channel_id}
              projectId={currentProject?.project_id}
              onJobFinished={() => {
                if (selectedChannel) {
                  loadProjectsList(false, selectedChannel.channel_id);
                  loadSheetItems(false, selectedChannel.channel_id);
                }
              }}
            />

            {/* =====================================================================
                SECCIÓN A: BIBLIOTECA DE PROYECTOS Y GUIONES GUARDADOS DEL CANAL
               ===================================================================== */}
            {studioSection === 'projects' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-blue-400 uppercase tracking-wider font-semibold bg-blue-500/10 px-2.5 py-0.5 rounded border border-blue-500/20">
                        Canal Activo • {selectedChannel?.display_title}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2 mt-1">
                      <FolderKanban className="w-5 h-5 text-blue-400" />
                      Proyectos y Guiones de {selectedChannel?.name}
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
                                    {proj.outputVideoUrlEs && proj.outputVideoUrlEn
                                      ? '✓ MP4 (ES + EN)'
                                      : proj.outputVideoUrlEs
                                      ? '✓ MP4 (ES)'
                                      : proj.outputVideoUrlEn
                                      ? '✓ MP4 (EN)'
                                      : '✓ MP4 Listo'}
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
                      Biblioteca Individual de Personajes & Elenco con Lore del Canal
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Cada personaje tiene su propia ficha e imagen individual (aunque en su galería también se archiven fotos grupales con otros personajes). Incluye personajes recurrentes con Lore del Canal (como Juanito) para usar como dobles o relleno consistente.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setCharCreatorType('channel_lore_cast');
                        setCharCreatorName('');
                        setCharCreatorRole('');
                        setCharCreatorRefPhotoBase64(null);
                        setCharCreatorModalOpen(true);
                      }}
                      className="bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 text-xs font-semibold px-3.5 py-2.5 rounded-lg flex items-center gap-1.5 transition"
                    >
                      <Star className="w-4 h-4 text-amber-400" />
                      + Crear Personaje con Lore / Doble
                    </button>

                    <button
                      onClick={() => {
                        setCharCreatorType('real_person');
                        setCharCreatorName('');
                        setCharCreatorRole('');
                        setCharCreatorRefPhotoBase64(null);
                        setCharCreatorModalOpen(true);
                      }}
                      className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-lg shadow-purple-600/20"
                    >
                      <Plus className="w-4 h-4" />
                      Crear Figura con Foto / Estilo
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Columna Izquierda: Galería de Tarjetas de Personajes (5 cols) */}
                  <div className="lg:col-span-5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Personajes del Canal ({channelCharacters.length})
                      </div>
                      <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg">
                        {[
                          { id: 'all', label: `Todos (${channelCharacters.length})` },
                          {
                            id: 'real_person',
                            label: `👤 Reales (${channelCharacters.filter((c) => c.character_category !== 'channel_lore_cast').length})`,
                          },
                          {
                            id: 'channel_lore_cast',
                            label: `🌟 Lore / Dobles (${channelCharacters.filter((c) => c.character_category === 'channel_lore_cast').length})`,
                          },
                        ].map((tab) => (
                          <button
                            key={tab.id}
                            onClick={() => setCharCategoryFilter(tab.id as any)}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition ${
                              charCategoryFilter === tab.id
                                ? 'bg-purple-600 text-white'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 max-h-[680px] overflow-y-auto pr-1">
                      {channelCharacters
                        .filter((char) => {
                          if (charCategoryFilter === 'all') return true;
                          if (charCategoryFilter === 'channel_lore_cast') {
                            return char.character_category === 'channel_lore_cast';
                          }
                          return char.character_category !== 'channel_lore_cast';
                        })
                        .map((char) => {
                          const isSelected =
                            selectedLibraryChar?.character_id === char.character_id;
                          const isAssignedToCurrent =
                            currentProject?.characters?.some(
                              (c) => c.character_id === char.character_id
                            );
                          const isLoreCast = char.character_category === 'channel_lore_cast';
                          const soloCount = (char.assets || []).filter((a) => !a.isGroupShot).length;
                          const groupCount = (char.assets || []).filter((a) => a.isGroupShot).length;

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
                                  <div className="flex items-center gap-1 shrink-0">
                                    {isLoreCast ? (
                                      <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded font-bold">
                                        🌟 Lore / Doble
                                      </span>
                                    ) : (
                                      <span className="text-[9px] bg-slate-800 text-slate-300 border border-slate-700 px-1.5 py-0.5 rounded font-mono">
                                        👤 Individual
                                      </span>
                                    )}
                                    {isAssignedToCurrent && (
                                      <span className="text-[9px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded font-bold">
                                        En Proyecto
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <p className="text-xs text-slate-400 truncate">
                                  {char.company_or_affiliation
                                    ? `${char.company_or_affiliation} • ${char.role}`
                                    : char.role}
                                </p>
                                {isLoreCast && char.channel_lore?.age && (
                                  <p className="text-[10px] text-amber-300/90 truncate">
                                    Edad: {char.channel_lore.age} •{' '}
                                    {(char.channel_lore.personality_traits || []).slice(0, 2).join(', ')}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 text-[10px] flex-wrap">
                                  {char.canonical_image_url ? (
                                    <span className="text-emerald-400 font-semibold">
                                      ✓ Retrato Solo
                                    </span>
                                  ) : (
                                    <span className="text-amber-400/90">
                                      Sin retrato solo
                                    </span>
                                  )}
                                  {(soloCount > 0 || groupCount > 0) && (
                                    <span className="text-slate-400 font-mono">
                                      • {soloCount} solo{groupCount > 0 ? ` / ${groupCount} grupal` : ''}
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
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-lg font-bold text-white">
                                {selectedLibraryChar.name}
                              </h3>
                              <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                                ID: {selectedLibraryChar.character_id}
                              </span>
                              {selectedLibraryChar.character_category === 'channel_lore_cast' ? (
                                <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full">
                                  🌟 Elenco con Lore del Canal (Doble / Relleno Recurrente)
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full">
                                  👤 Figura Individual Independiente
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">{selectedLibraryChar.role}</p>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            {currentProject && (
                              <button
                                onClick={() => {
                                  handleSelectCharacterFromLibrary(
                                    selectedLibraryChar.character_id,
                                    'add'
                                  );
                                }}
                                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition shadow-md shadow-blue-600/20"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Añadir al Elenco del Proyecto
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

                        {/* Área Visual: Comparativa Foto Real de Referencia vs Retrato 3D IA + Estilo */}
                        <div className="bg-slate-950/70 border border-slate-800/90 p-5 rounded-xl space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                            <div>
                              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                                Diseño & Retrato Oficial de {selectedLibraryChar.name}
                              </h4>
                              <p className="text-[11px] text-slate-400">
                                Sube una foto real de frente para guiar las facciones de la IA sin alucinaciones, o genera con estilo cinematográfico.
                              </p>
                            </div>
                            {selectedLibraryChar.portrait_approved ? (
                              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Check className="w-3 h-3" /> Retrato Aprobado
                              </span>
                            ) : (
                              <span className="bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                                ⚠️ Pendiente de Aprobación
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-start">
                            {/* Columna Izquierda: Foto Real de Frente (Referencia) */}
                            <div className="sm:col-span-4 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                                  <Camera className="w-3.5 h-3.5 text-blue-400" />
                                  1. Foto Real de Frente:
                                </span>
                                {selectedLibraryChar.real_reference_image_url && (
                                  <button
                                    onClick={() => handleRemoveRealReferencePhoto(selectedLibraryChar)}
                                    className="text-[10px] text-rose-400 hover:text-rose-300 transition"
                                  >
                                    Quitar
                                  </button>
                                )}
                              </div>

                              <div className="aspect-square w-full rounded-xl bg-slate-900 border border-slate-700 overflow-hidden relative flex items-center justify-center shadow-inner group">
                                {selectedLibraryChar.real_reference_image_url ? (
                                  <>
                                    <img
                                      src={selectedLibraryChar.real_reference_image_url}
                                      alt="Foto real de referencia"
                                      className="w-full h-full object-cover"
                                    />
                                    <span className="absolute bottom-2 left-2 bg-blue-600/90 text-white text-[9px] font-bold px-2 py-0.5 rounded backdrop-blur">
                                      📸 Referencia IA Activa
                                    </span>
                                  </>
                                ) : (
                                  <div
                                    onClick={() => studioCharRefFileInputRef.current?.click()}
                                    className="p-4 text-center space-y-1.5 text-slate-400 cursor-pointer hover:text-slate-200 transition"
                                  >
                                    <Camera className="w-8 h-8 mx-auto text-slate-600 group-hover:text-blue-400 transition" />
                                    <p className="text-[11px] font-semibold">Subir Foto Real</p>
                                    <p className="text-[9px] text-slate-500">
                                      Foto frontal para que la IA copie sus facciones exactas
                                    </p>
                                  </div>
                                )}
                              </div>

                              <input
                                ref={studioCharRefFileInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleUploadRealReferencePhoto(file, selectedLibraryChar);
                                    e.target.value = '';
                                  }
                                }}
                              />

                              <div className="grid grid-cols-2 gap-1.5">
                                <button
                                  onClick={() => handleOpenRefPhotoPicker(selectedLibraryChar)}
                                  className="w-full bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-[11px] font-semibold py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition"
                                  title="Buscar fotos reales en Wikipedia / Wikimedia / Google"
                                >
                                  <Search className="w-3.5 h-3.5" />
                                  Buscar Foto
                                </button>
                                <button
                                  disabled={isUploadingRefImage}
                                  onClick={() => studioCharRefFileInputRef.current?.click()}
                                  className="w-full bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-[11px] font-semibold py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition"
                                >
                                  <Upload className="w-3.5 h-3.5" />
                                  {isUploadingRefImage
                                    ? 'Subiendo...'
                                    : selectedLibraryChar.real_reference_image_url
                                    ? 'Cambiar'
                                    : 'Subir'}
                                </button>
                              </div>
                            </div>

                            {/* Columna Centro: Retrato Oficial 3D Canónico */}
                            <div className="sm:col-span-4 space-y-2">
                              <span className="text-[11px] font-bold text-purple-300 flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                                2. Retrato IA Oficial (Canónico):
                              </span>

                              <div className="aspect-square w-full rounded-xl bg-slate-900 border border-slate-700 overflow-hidden relative flex items-center justify-center shadow-inner">
                                {selectedLibraryChar.canonical_image_url ? (
                                  <>
                                    <img
                                      src={selectedLibraryChar.canonical_image_url}
                                      alt={selectedLibraryChar.name}
                                      className="w-full h-full object-cover"
                                    />
                                    <span
                                      className={`absolute bottom-2 left-2 text-[9px] font-bold px-2 py-0.5 rounded backdrop-blur ${
                                        selectedLibraryChar.custom_uploaded
                                          ? 'bg-emerald-600/90 text-white'
                                          : 'bg-purple-600/90 text-white'
                                      }`}
                                    >
                                      {selectedLibraryChar.custom_uploaded ? '✨ Versión Propia' : '🎨 Retrato 3D IA'}
                                    </span>
                                  </>
                                ) : (
                                  <div className="p-4 text-center space-y-1.5 text-slate-500">
                                    <User className="w-8 h-8 mx-auto text-slate-600" />
                                    <p className="text-[11px]">Sin retrato generado</p>
                                  </div>
                                )}
                              </div>

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
                                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-semibold py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                {isUploadingImage ? 'Subiendo...' : 'Subir Imagen Propia Directa'}
                              </button>
                            </div>

                            {/* Columna Derecha: Estilo IA y Generación */}
                            <div className="sm:col-span-4 space-y-2.5">
                              <div>
                                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                                  Estilo de Renderizado IA:
                                </label>
                                <select
                                  value={selectedLibraryChar.preferred_style_preset || '3d_pixar_arcane'}
                                  onChange={(e) => {
                                    const next = {
                                      ...selectedLibraryChar,
                                      preferred_style_preset: e.target.value,
                                    };
                                    setSelectedLibraryChar(next);
                                  }}
                                  className="w-full bg-slate-900 border border-slate-700 text-xs font-semibold text-white px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-purple-500"
                                >
                                  {CHARACTER_STYLE_PRESET_OPTIONS.map((opt) => (
                                    <option key={opt.id} value={opt.id}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                  Detalles adicionales de estilo (opcional):
                                </label>
                                <input
                                  type="text"
                                  placeholder="Ej: iluminación azulada, ropa formal de los 90s..."
                                  value={selectedLibraryChar.custom_style_prompt || ''}
                                  onChange={(e) => {
                                    setSelectedLibraryChar({
                                      ...selectedLibraryChar,
                                      custom_style_prompt: e.target.value,
                                    });
                                  }}
                                  className="w-full bg-slate-900 border border-slate-700 text-xs text-white px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-purple-500"
                                />
                              </div>

                              <div className="pt-1 space-y-2">
                                <button
                                  disabled={isGeneratingPortrait}
                                  onClick={() =>
                                    handleGenerateCharacterPortrait(selectedLibraryChar, {
                                      stylePreset: selectedLibraryChar.preferred_style_preset,
                                      customStyle: selectedLibraryChar.custom_style_prompt,
                                    })
                                  }
                                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-semibold py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 transition"
                                >
                                  {isGeneratingPortrait ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Wand2 className="w-4 h-4" />
                                  )}
                                  {isGeneratingPortrait
                                    ? 'Generando...'
                                    : selectedLibraryChar.real_reference_image_url
                                    ? '✨ Generar Retrato 3D desde Foto Real'
                                    : '✨ Generar Retrato 3D IA'}
                                </button>

                                {selectedLibraryChar.canonical_image_url && !selectedLibraryChar.portrait_approved && (
                                  <button
                                    onClick={() => handleApproveCharacterPortrait(selectedLibraryChar)}
                                    className="w-full bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition"
                                  >
                                    <Check className="w-4 h-4" />
                                    Aprobar Este Retrato
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Selector de Categoría del Personaje */}
                          <div className="flex items-center justify-between gap-2 bg-slate-900/90 border border-slate-800 px-3 py-2 rounded-lg">
                            <span className="text-[11px] font-semibold text-slate-300">
                              Tipo de Personaje:
                            </span>
                            <select
                              value={selectedLibraryChar.character_category || 'real_person'}
                              onChange={(e) => {
                                const cat = e.target.value as 'real_person' | 'channel_lore_cast';
                                setSelectedLibraryChar({
                                  ...selectedLibraryChar,
                                  character_category: cat,
                                  real_person: cat === 'real_person',
                                  known_face: cat === 'real_person',
                                  channel_lore:
                                    cat === 'channel_lore_cast' && !selectedLibraryChar.channel_lore
                                      ? {
                                          age: '15 años',
                                          personality_traits: ['Alegre', 'Amante del deporte'],
                                          peculiarities: [
                                            'Siempre lleva algún elemento deportivo (pelota, gorra o chaqueta deportiva)',
                                          ],
                                          channel_backstory:
                                            'Personaje secundario recurrente del canal para representar figuras sin rostro conocido o ejemplos cotidianos.',
                                          reusable_archetypes: ['Doble / Relleno', 'Ciudadano común'],
                                        }
                                      : selectedLibraryChar.channel_lore,
                                });
                              }}
                              className="bg-slate-950 border border-slate-700 text-xs font-bold text-amber-300 px-2.5 py-1 rounded"
                            >
                              <option value="real_person">👤 Figura Real (Rostro Conocido)</option>
                              <option value="channel_lore_cast">
                                🌟 Lore del Canal / Doble (Para rostros desconocidos)
                              </option>
                            </select>
                          </div>
                        </div>

                        {/* Campos de edición de la ficha */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                              Nombre Individual:
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
                              Empresa o Afiliación:
                            </label>
                            <input
                              type="text"
                              value={selectedLibraryChar.company_or_affiliation || ''}
                              onChange={(e) =>
                                setSelectedLibraryChar({
                                  ...selectedLibraryChar,
                                  company_or_affiliation: e.target.value,
                                })
                              }
                              placeholder="Ej: Tumblr, Yahoo, Elenco del Canal..."
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

                        {/* PANEL ESPECIAL: LORE PERSISTENTE DEL CANAL (ej. Juanito 15 años alegre y deportista) */}
                        {selectedLibraryChar.character_category === 'channel_lore_cast' && (
                          <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-4 space-y-3.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                <h4 className="text-xs font-extrabold text-amber-300 uppercase tracking-wider">
                                  Lore Persistente del Canal (Consistencia entre Videos)
                                </h4>
                              </div>
                              <span className="text-[10px] font-mono text-amber-200/80 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                Doble / Personaje Recurrente
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="text-[11px] font-bold text-amber-200/90">
                                  Edad / Etapa:
                                </label>
                                <input
                                  type="text"
                                  value={selectedLibraryChar.channel_lore?.age || ''}
                                  onChange={(e) =>
                                    setSelectedLibraryChar({
                                      ...selectedLibraryChar,
                                      channel_lore: {
                                        ...(selectedLibraryChar.channel_lore || {
                                          personality_traits: [],
                                          peculiarities: [],
                                          channel_backstory: '',
                                          reusable_archetypes: [],
                                        }),
                                        age: e.target.value,
                                      },
                                    })
                                  }
                                  placeholder="Ej: 15 años"
                                  className="w-full mt-1 bg-slate-950 border border-amber-500/30 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-400"
                                />
                              </div>

                              <div className="sm:col-span-2">
                                <label className="text-[11px] font-bold text-amber-200/90">
                                  Personalidad (separada por comas):
                                </label>
                                <input
                                  type="text"
                                  value={(
                                    selectedLibraryChar.channel_lore?.personality_traits || []
                                  ).join(', ')}
                                  onChange={(e) =>
                                    setSelectedLibraryChar({
                                      ...selectedLibraryChar,
                                      channel_lore: {
                                        ...(selectedLibraryChar.channel_lore || {
                                          peculiarities: [],
                                          channel_backstory: '',
                                          reusable_archetypes: [],
                                        }),
                                        personality_traits: e.target.value
                                          .split(',')
                                          .map((t) => t.trim())
                                          .filter(Boolean),
                                      },
                                    })
                                  }
                                  placeholder="Ej: Alegre, optimista, amor por el deporte, curioso"
                                  className="w-full mt-1 bg-slate-950 border border-amber-500/30 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-400"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-[11px] font-bold text-amber-200/90">
                                Peculiaridades Recurrentes (se inyectan en futuros videos para que sea consistente):
                              </label>
                              <textarea
                                rows={2}
                                value={(
                                  selectedLibraryChar.channel_lore?.peculiarities || []
                                ).join(' | ')}
                                onChange={(e) =>
                                  setSelectedLibraryChar({
                                    ...selectedLibraryChar,
                                    channel_lore: {
                                      ...(selectedLibraryChar.channel_lore || {
                                        personality_traits: [],
                                        channel_backstory: '',
                                        reusable_archetypes: [],
                                      }),
                                      peculiarities: e.target.value
                                        .split('|')
                                        .map((p) => p.trim())
                                        .filter(Boolean),
                                    },
                                  })
                                }
                                placeholder="Separa con | Ej: Siempre lleva un balón o accesorio deportivo | Gorra hacia atrás | Sonrisa entusiasta"
                                className="w-full mt-1 bg-slate-950 border border-amber-500/30 rounded-lg p-2 text-xs text-amber-100 focus:outline-none focus:border-amber-400"
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-[11px] font-bold text-amber-200/90">
                                  Historia / Lore en el Canal:
                                </label>
                                <input
                                  type="text"
                                  value={selectedLibraryChar.channel_lore?.channel_backstory || ''}
                                  onChange={(e) =>
                                    setSelectedLibraryChar({
                                      ...selectedLibraryChar,
                                      channel_lore: {
                                        ...(selectedLibraryChar.channel_lore || {
                                          personality_traits: [],
                                          peculiarities: [],
                                          reusable_archetypes: [],
                                        }),
                                        channel_backstory: e.target.value,
                                      },
                                    })
                                  }
                                  className="w-full mt-1 bg-slate-950 border border-amber-500/30 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                                />
                              </div>

                              <div>
                                <label className="text-[11px] font-bold text-amber-200/90">
                                  Roles Reutilizables como Doble / Relleno:
                                </label>
                                <input
                                  type="text"
                                  value={(
                                    selectedLibraryChar.channel_lore?.reusable_archetypes || []
                                  ).join(', ')}
                                  onChange={(e) =>
                                    setSelectedLibraryChar({
                                      ...selectedLibraryChar,
                                      channel_lore: {
                                        ...(selectedLibraryChar.channel_lore || {
                                          personality_traits: [],
                                          peculiarities: [],
                                          channel_backstory: '',
                                        }),
                                        reusable_archetypes: e.target.value
                                          .split(',')
                                          .map((r) => r.trim())
                                          .filter(Boolean),
                                      },
                                    })
                                  }
                                  className="w-full mt-1 bg-slate-950 border border-amber-500/30 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" /> Prompt Ancla 3D Individual (Rasgos Faciales, Edad, Vestimenta y Estilo):
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

                        {/* Galería de Activos e Imágenes Asociadas al Personaje (Individuales + Grupales con otros) */}
                        <div className="pt-4 border-t border-slate-800/80 space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                <ImageIcon className="w-4 h-4 text-purple-400" />
                                Biblioteca Visual de {selectedLibraryChar.name} ({selectedLibraryChar.assets?.length || selectedLibraryChar.reference_gallery?.length || 0})
                              </h4>
                              <p className="text-xs text-slate-400">
                                Incluye sus tomas en solitario (reutilizables en cualquier historia nueva) y sus fotos grupales junto a otros personajes.
                              </p>
                            </div>

                            {/* Filtro de búsqueda */}
                            <div className="relative">
                              <input
                                type="text"
                                placeholder="Buscar por lugar, co-protagonista o prompt..."
                                value={characterAssetSearch}
                                onChange={(e) => setCharacterAssetSearch(e.target.value)}
                                className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 w-60"
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
                                a.characterNames?.some((n) => n.toLowerCase().includes(q)) ||
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
                                            ⭐ Retrato Oficial (Solo)
                                          </span>
                                        )}
                                        <span
                                          className={`absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm border ${
                                            asset.isGroupShot
                                              ? 'bg-indigo-600/90 text-white border-indigo-400/50'
                                              : 'bg-emerald-600/90 text-white border-emerald-400/50'
                                          }`}
                                          title={
                                            asset.isGroupShot
                                              ? `Escena grupal con: ${(asset.characterNames || []).join(' + ')}`
                                              : 'Escena individual (apta para reutilizar en solitario)'
                                          }
                                        >
                                          {asset.isGroupShot ? '👥 Grupal' : '👤 Solo'}
                                        </span>
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
                                          {asset.characterNames && asset.characterNames.length > 1 && (
                                            <div className="text-[10px] text-indigo-300 font-medium truncate">
                                              👥 Con: {asset.characterNames.join(' + ')}
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
                                          {!isOfficial && !asset.isGroupShot && (
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
                {/* 1. Encabezado y Selector de Pestañas del Banco de Voces */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Radio className="w-5 h-5 text-indigo-400" />
                      Banco de Voces y Explorador de Locuciones
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Descubre y escucha muestras de todas las voces disponibles en VoiceStudio Local (RTX 3080) y ElevenLabs Cloud, prueba tus propias frases o reutiliza voces de proyectos anteriores.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* Estado del Backend VoiceStudio */}
                    {configStatus?.hasVoiceStudio && (
                      <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
                        <span className={`w-2 h-2 rounded-full ${voiceStudioRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                        <span className="text-slate-300 font-mono">
                          {voiceStudioRunning ? 'VoiceStudio GPU Activo' : 'VoiceStudio Standby'}
                        </span>
                        {!voiceStudioRunning ? (
                          <button
                            onClick={handleStartVoiceStudio}
                            disabled={isStartingVoiceStudio}
                            className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 underline ml-1"
                          >
                            {isStartingVoiceStudio ? 'Iniciando...' : 'Iniciar'}
                          </button>
                        ) : (
                          <button
                            onClick={handleStopVoiceStudio}
                            className="text-[11px] font-bold text-rose-400 hover:text-rose-300 underline ml-1"
                          >
                            Liberar GPU
                          </button>
                        )}
                      </div>
                    )}

                    <button
                      onClick={() => loadVoiceCatalog(true)}
                      disabled={loadingVoiceCatalog}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-slate-700 transition"
                      title="Volver a escanear perfiles y APIs"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${loadingVoiceCatalog ? 'animate-spin' : ''}`} />
                      Actualizar Catálogo
                    </button>
                  </div>
                </div>

                {/* Selector de Sub-Pestañas: Catálogo vs Proyectos Anteriores */}
                <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
                  <button
                    onClick={() => setVoiceSubTab('catalog')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                      voiceSubTab === 'catalog'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    <Headphones className="w-4 h-4" />
                    Catálogo de Voces Disponibles ({voiceCatalog.length})
                  </button>

                  <button
                    onClick={() => setVoiceSubTab('projects')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                      voiceSubTab === 'projects'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    <FolderKanban className="w-4 h-4" />
                    Pistas de Proyectos Anteriores ({projectsWithVoice.length})
                  </button>
                </div>

                {/* =========================================================
                    SUB-TAB 1: CATÁLOGO Y EXPLORADOR DE VOCES
                    ========================================================= */}
                {voiceSubTab === 'catalog' && (
                  <div className="space-y-6">
                    {/* 1.1 Laboratorio de Audición Rápida con Frase Propia */}
                    <div className="bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900 border border-indigo-500/30 rounded-2xl p-5 shadow-lg space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-indigo-400" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                              Laboratorio de Audición Rápida
                              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded font-mono">
                                Prueba Instantánea
                              </span>
                            </h3>
                            <p className="text-xs text-slate-400">
                              Escribe tu propia frase o haz clic en un ejemplo para escuchar cómo pronuncia cualquier voz antes de producir el video.
                            </p>
                          </div>
                        </div>

                        {/* Selección de Frases de Ejemplo */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] text-slate-400">Ejemplos:</span>
                          <button
                            onClick={() =>
                              setTestSampleText(
                                'Esta es la historia de cómo un imperio de mil millones de dólares se evaporó en cuestión de horas.'
                              )
                            }
                            className="text-[11px] bg-slate-800/80 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded border border-slate-700 transition"
                          >
                            🎙️ Misterio / Finanzas
                          </button>
                          <button
                            onClick={() =>
                              setTestSampleText(
                                'En el verano de 1944, una orden secreta cambió el curso de la Segunda Guerra Mundial para siempre.'
                              )
                            }
                            className="text-[11px] bg-slate-800/80 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded border border-slate-700 transition"
                          >
                            🏛️ Documental Histórico
                          </button>
                          <button
                            onClick={() =>
                              setTestSampleText(
                                '¿Qué sucedería si la inteligencia artificial superara el límite cognitivo de toda la humanidad?'
                              )
                            }
                            className="text-[11px] bg-slate-800/80 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded border border-slate-700 transition"
                          >
                            ⚡ Tech / Futuro
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                        <div className="md:col-span-6 space-y-1">
                          <label className="text-[11px] font-bold text-slate-300">
                            Frase o Diálogo para Audición:
                          </label>
                          <input
                            type="text"
                            value={testSampleText}
                            onChange={(e) => setTestSampleText(e.target.value)}
                            placeholder="Escribe la frase que quieres escuchar..."
                            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none transition"
                          />
                        </div>

                        <div className="md:col-span-3 space-y-1">
                          <label className="text-[11px] font-bold text-slate-300">
                            Voz para la Prueba:
                          </label>
                          <select
                            value={`${testSampleProvider}:${testSampleVoiceId}`}
                            onChange={(e) => {
                              const [prov, vid] = e.target.value.split(':');
                              setTestSampleProvider(prov);
                              setTestSampleVoiceId(vid);
                            }}
                            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                          >
                            <optgroup label="⚡ VoiceStudio Local (RTX 3080)">
                              {voiceCatalog
                                .filter((v) => v.provider === 'voicestudio')
                                .map((v) => (
                                  <option key={v.id} value={`voicestudio:${v.id}`}>
                                    {v.name} ({v.language.toUpperCase()})
                                  </option>
                                ))}
                            </optgroup>
                            <optgroup label="✨ ElevenLabs Cloud">
                              {voiceCatalog
                                .filter((v) => v.provider === 'elevenlabs')
                                .map((v) => (
                                  <option key={v.id} value={`elevenlabs:${v.id}`}>
                                    {v.name} ({v.accent || v.language})
                                  </option>
                                ))}
                            </optgroup>
                            <optgroup label="🤖 OpenAI / Edge">
                              {voiceCatalog
                                .filter((v) => v.provider === 'openai' || v.provider === 'edge_neural')
                                .map((v) => (
                                  <option key={v.id} value={`${v.provider}:${v.id}`}>
                                    {v.name} ({v.language.toUpperCase()})
                                  </option>
                                ))}
                            </optgroup>
                          </select>
                        </div>

                        <div className="md:col-span-3 flex items-center gap-2">
                          <button
                            onClick={handleSynthesizeTestSample}
                            disabled={isSynthesizingTest || !testSampleText.trim()}
                            className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition"
                          >
                            {isSynthesizingTest ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                Sintetizando...
                              </>
                            ) : (
                              <>
                                <Zap className="w-3.5 h-3.5" />
                                Sintetizar Muestra
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Reproductor de resultado si existe */}
                      {testAudioResultUrl && (
                        <div className="flex items-center justify-between gap-4 bg-slate-950/80 border border-emerald-500/40 p-3 rounded-xl mt-2">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                            <span className="text-xs font-bold text-emerald-300">
                              Muestra Lista para Escuchar
                            </span>
                          </div>
                          <audio
                            controls
                            autoPlay
                            src={testAudioResultUrl}
                            className="h-8 w-64 md:w-96 rounded"
                          />
                        </div>
                      )}
                    </div>

                    {/* 1.2 Barra de Filtros Multifacéticos */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        {/* Filtro por Proveedor */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                            Motor:
                          </span>
                          <button
                            onClick={() => setCatalogProviderFilter('all')}
                            className={`text-xs px-3 py-1 rounded-lg font-semibold transition ${
                              catalogProviderFilter === 'all'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            Todos ({voiceCatalog.length})
                          </button>
                          <button
                            onClick={() => setCatalogProviderFilter('voicestudio')}
                            className={`text-xs px-3 py-1 rounded-lg font-semibold flex items-center gap-1 transition ${
                              catalogProviderFilter === 'voicestudio'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            <Zap className="w-3 h-3 text-emerald-400" />
                            VoiceStudio Local ({voiceCatalog.filter((v) => v.provider === 'voicestudio').length})
                          </button>
                          <button
                            onClick={() => setCatalogProviderFilter('elevenlabs')}
                            className={`text-xs px-3 py-1 rounded-lg font-semibold flex items-center gap-1 transition ${
                              catalogProviderFilter === 'elevenlabs'
                                ? 'bg-purple-600 text-white'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            <Sparkles className="w-3 h-3 text-purple-300" />
                            ElevenLabs ({voiceCatalog.filter((v) => v.provider === 'elevenlabs').length})
                          </button>
                          <button
                            onClick={() => setCatalogProviderFilter('openai')}
                            className={`text-xs px-3 py-1 rounded-lg font-semibold transition ${
                              catalogProviderFilter === 'openai'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            OpenAI / Edge ({voiceCatalog.filter((v) => v.provider === 'openai' || v.provider === 'edge_neural').length})
                          </button>
                        </div>

                        {/* Búsqueda en Vivo */}
                        <div className="relative w-full sm:w-64">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            value={catalogSearch}
                            onChange={(e) => setCatalogSearch(e.target.value)}
                            placeholder="Buscar voz por nombre o acento..."
                            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none transition"
                          />
                          {catalogSearch && (
                            <button
                              onClick={() => setCatalogSearch('')}
                              className="text-slate-400 hover:text-white text-xs absolute right-2.5 top-2"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Filtros Secundarios: Idioma y Estilo */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60">
                        {/* Idioma */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                            Idioma:
                          </span>
                          <button
                            onClick={() => setCatalogLangFilter('all')}
                            className={`text-xs px-2.5 py-0.5 rounded font-medium transition ${
                              catalogLangFilter === 'all'
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            Todos ({baseFilterVoices.length})
                          </button>
                          <button
                            onClick={() => setCatalogLangFilter('es')}
                            className={`text-xs px-2.5 py-0.5 rounded font-medium transition ${
                              catalogLangFilter === 'es'
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            🇪🇸 Español ({baseFilterVoices.filter((v) => v.language === 'es' || v.language === 'multilingual').length})
                          </button>
                          <button
                            onClick={() => setCatalogLangFilter('en')}
                            className={`text-xs px-2.5 py-0.5 rounded font-medium transition ${
                              catalogLangFilter === 'en'
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            🇺🇸 Inglés ({baseFilterVoices.filter((v) => v.language === 'en' || v.language === 'multilingual').length})
                          </button>
                          <button
                            onClick={() => setCatalogLangFilter('multilingual')}
                            className={`text-xs px-2.5 py-0.5 rounded font-medium transition ${
                              catalogLangFilter === 'multilingual'
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            🌐 Multilingüe ({baseFilterVoices.filter((v) => v.language === 'multilingual').length})
                          </button>
                        </div>

                        {/* Estilo / Categoría */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                            Estilo:
                          </span>
                          <button
                            onClick={() => setCatalogStyleFilter('all')}
                            className={`text-xs px-2.5 py-0.5 rounded font-medium transition ${
                              catalogStyleFilter === 'all'
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            Todos
                          </button>
                          <button
                            onClick={() => setCatalogStyleFilter('favorites')}
                            className={`text-xs px-2.5 py-0.5 rounded font-medium flex items-center gap-1 transition ${
                              catalogStyleFilter === 'favorites'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            Favoritas ({favoriteVoiceIds.filter((id) => baseFilterVoices.some((v) => v.id === id)).length})
                          </button>
                          <button
                            onClick={() => setCatalogStyleFilter('clones')}
                            className={`text-xs px-2.5 py-0.5 rounded font-medium transition ${
                              catalogStyleFilter === 'clones'
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            🎭 Clones ({baseFilterVoices.filter((v) => v.isCloned).length})
                          </button>
                          <button
                            onClick={() => setCatalogStyleFilter('thriller_documentary')}
                            className={`text-xs px-2.5 py-0.5 rounded font-medium transition ${
                              catalogStyleFilter === 'thriller_documentary'
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            🎙️ Thriller ({baseFilterVoices.filter((v) => v.styleCategory === 'thriller_documentary').length})
                          </button>
                          <button
                            onClick={() => setCatalogStyleFilter('historical_epic')}
                            className={`text-xs px-2.5 py-0.5 rounded font-medium transition ${
                              catalogStyleFilter === 'historical_epic'
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            🏛️ Histórico ({baseFilterVoices.filter((v) => v.styleCategory === 'historical_epic').length})
                          </button>
                          <button
                            onClick={() => setCatalogStyleFilter('conversational_dynamic')}
                            className={`text-xs px-2.5 py-0.5 rounded font-medium transition ${
                              catalogStyleFilter === 'conversational_dynamic'
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            💬 Dinámico ({baseFilterVoices.filter((v) => v.styleCategory === 'conversational_dynamic').length})
                          </button>
                        </div>
                      </div>

                      {/* Banner aclaratorio de motor activo */}
                      {catalogProviderFilter !== 'all' && (
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-xs">
                          <span className="text-slate-400">
                            Mostrando únicamente voces de{' '}
                            <strong className="text-white">
                              {catalogProviderFilter === 'voicestudio'
                                ? '⚡ VoiceStudio Local (RTX 3080)'
                                : catalogProviderFilter === 'elevenlabs'
                                ? '✨ ElevenLabs Cloud'
                                : '🤖 OpenAI / Edge'}
                            </strong>
                            {' '}— ({filteredVoices.length} disponibles).
                          </span>
                          <button
                            onClick={() => setCatalogProviderFilter('all')}
                            className="text-indigo-400 hover:text-indigo-300 font-bold underline transition"
                          >
                            Ver todas las {voiceCatalog.length} voces (incluyendo ElevenLabs y OpenAI) →
                          </button>
                        </div>
                      )}
                    </div>

                    {/* 1.3 Tarjetas del Catálogo de Voces */}
                    {loadingVoiceCatalog ? (
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
                        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
                        <div className="text-sm font-bold text-white">
                          Cargando catálogo de voces de VoiceStudio y ElevenLabs...
                        </div>
                        <p className="text-xs text-slate-400">
                          Extrayendo perfiles locales y muestras oficiales de alta fidelidad.
                        </p>
                      </div>
                    ) : filteredVoices.length === 0 ? (
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
                        <Headphones className="w-10 h-10 text-slate-600 mx-auto" />
                        <div className="text-sm font-bold text-white">
                          No se encontraron voces con los filtros seleccionados
                        </div>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                          Prueba a cambiar el motor, el idioma o limpia la barra de búsqueda para ver más opciones.
                        </p>
                        <button
                          onClick={() => {
                            setCatalogProviderFilter('all');
                            setCatalogLangFilter('all');
                            setCatalogStyleFilter('all');
                            setCatalogSearch('');
                          }}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
                        >
                          Restablecer Filtros
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredVoices.map((voice) => {
                          const isPlaying = playingVoiceId === voice.id;
                          const isFav = favoriteVoiceIds.includes(voice.id);
                          const isAssignedPrimary = currentProject?.primaryVoice === voice.id;
                          const isAssignedSecondary = currentProject?.secondaryVoice === voice.id;

                          // Colores por proveedor
                          const providerBadge =
                            voice.provider === 'voicestudio'
                              ? {
                                  label: '⚡ VoiceStudio RTX 3080',
                                  bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
                                }
                              : voice.provider === 'elevenlabs'
                              ? {
                                  label: '✨ ElevenLabs Cloud',
                                  bg: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
                                }
                              : voice.provider === 'openai'
                              ? {
                                  label: '🤖 OpenAI HD',
                                  bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
                                }
                              : {
                                  label: '🌐 Edge Neural',
                                  bg: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
                                };

                          return (
                            <div
                              key={`${voice.provider}-${voice.id}`}
                              className={`bg-slate-900 border rounded-2xl p-4 flex flex-col justify-between space-y-3.5 transition shadow-sm hover:shadow-md ${
                                isAssignedPrimary
                                  ? 'border-indigo-500/80 bg-indigo-950/20 ring-1 ring-indigo-500/30'
                                  : isPlaying
                                  ? 'border-emerald-500/60 bg-emerald-950/10'
                                  : 'border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              {/* Top Bar: Proveedor, Idioma y Favorito */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span
                                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${providerBadge.bg}`}
                                  >
                                    {providerBadge.label}
                                  </span>
                                  <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                                    {voice.language === 'es'
                                      ? '🇪🇸 Español'
                                      : voice.language === 'en'
                                      ? '🇺🇸 Inglés'
                                      : '🌐 Multilingüe'}
                                  </span>
                                  {voice.isCloned && (
                                    <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded">
                                      🎭 Clon
                                    </span>
                                  )}
                                </div>

                                <button
                                  onClick={() => handleToggleFavoriteVoice(voice.id)}
                                  className="text-slate-500 hover:text-amber-400 transition p-1"
                                  title={isFav ? 'Quitar de favoritas' : 'Marcar como favorita'}
                                >
                                  <Star
                                    className={`w-4 h-4 ${
                                      isFav ? 'text-amber-400 fill-amber-400' : ''
                                    }`}
                                  />
                                </button>
                              </div>

                              {/* Nombre, Género y Descripción */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5 truncate">
                                    {voice.name}
                                  </h4>
                                  <span className="text-[10px] text-slate-400 uppercase font-mono">
                                    {voice.gender === 'male'
                                      ? 'Hombre'
                                      : voice.gender === 'female'
                                      ? 'Mujer'
                                      : 'Neutral'}
                                    {voice.accent ? ` • ${voice.accent}` : ''}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                                  {voice.description}
                                </p>
                              </div>

                              {/* Etiquetas / Estilo */}
                              {voice.labels && Object.keys(voice.labels).length > 0 && (
                                <div className="flex items-center gap-1 flex-wrap">
                                  {Object.values(voice.labels)
                                    .slice(0, 3)
                                    .map((lbl, idx) => (
                                      <span
                                        key={idx}
                                        className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded"
                                      >
                                        {lbl}
                                      </span>
                                    ))}
                                </div>
                              )}

                              {/* Barra de Reproducción de Muestra */}
                              <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
                                {voice.sampleUrl ? (
                                  <button
                                    onClick={() =>
                                      handlePlayVoiceSample(voice.sampleUrl, voice.id)
                                    }
                                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition ${
                                      isPlaying
                                        ? 'bg-rose-600/20 text-rose-300 border-rose-500/40 hover:bg-rose-600/30'
                                        : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700'
                                    }`}
                                  >
                                    {isPlaying ? (
                                      <>
                                        <PauseCircle className="w-4 h-4 text-rose-400 animate-pulse" />
                                        <span>Pausar Muestra</span>
                                        <span className="flex items-center gap-0.5 ml-1">
                                          <span className="w-1 h-3 bg-rose-400 animate-bounce" />
                                          <span className="w-1 h-2 bg-rose-400 animate-bounce delay-75" />
                                          <span className="w-1 h-4 bg-rose-400 animate-bounce delay-150" />
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <PlayCircle className="w-4 h-4 text-indigo-400" />
                                        <span>Escuchar Muestra Instantánea</span>
                                      </>
                                    )}
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setTestSampleProvider(voice.provider);
                                      setTestSampleVoiceId(voice.id);
                                      showToast(`Cargada voz "${voice.name}" en el laboratorio de prueba.`);
                                      window.scrollTo({ top: 300, behavior: 'smooth' });
                                    }}
                                    className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-slate-800/60 hover:bg-slate-800 text-slate-300 border border-slate-700/60 flex items-center justify-center gap-1.5 transition"
                                  >
                                    <Headphones className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Probar en Laboratorio</span>
                                  </button>
                                )}
                              </div>

                              {/* Asignación Rápida al Proyecto Actual */}
                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  onClick={() => handleAssignVoiceToProject(voice, 'primary')}
                                  className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold border transition ${
                                    isAssignedPrimary
                                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                                  }`}
                                  title="Asignar como narrador principal del proyecto actual"
                                >
                                  {isAssignedPrimary ? '✓ Principal Actual' : 'Usar Principal'}
                                </button>
                                <button
                                  onClick={() => handleAssignVoiceToProject(voice, 'secondary')}
                                  className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border transition ${
                                    isAssignedSecondary
                                      ? 'bg-purple-600 text-white border-purple-500'
                                      : 'bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-700/60'
                                  }`}
                                  title="Asignar como voz secundaria para diálogos dobles"
                                >
                                  {isAssignedSecondary ? '✓ Secundaria' : 'Secundaria'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* =========================================================
                    SUB-TAB 2: PISTAS DE PROYECTOS ANTERIORES (REUTILIZAR VOZ)
                    ========================================================= */}
                {voiceSubTab === 'projects' && (
                  <div className="space-y-4">
                    {projectsWithVoice.length === 0 ? (
                      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
                        <Mic className="w-10 h-10 text-slate-600 mx-auto" />
                        <div className="text-sm font-bold text-white">
                          Aún no hay proyectos con pistas de voz generadas
                        </div>
                        <p className="text-xs text-slate-400 max-w-md mx-auto">
                          Cuando generes la locución de un proyecto en el Paso 4, aparecerá aquí automáticamente para que puedas escucharla o reutilizarla en futuros videos con nuevas imágenes.
                        </p>
                      </div>
                    ) : (
                      projectsWithVoice.map((proj) => {
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
                                    {proj.voiceEngine === 'voicestudio'
                                      ? '⚡ VoiceStudio Local RTX 3080'
                                      : proj.voiceEngine === 'elevenlabs'
                                      ? '✨ ElevenLabs Multilingual v2'
                                      : '🤖 OpenAI Onyx HD'}
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
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            {/* =====================================================================
                SECCIÓN E: INCUBADORA DE CANALES & ASESOR ESTRATÉGICO DE CRECIMIENTO IA
               ===================================================================== */}
            {studioSection === 'incubator' && (
              <ChannelIncubatorStudio
                channels={channels}
                activeChannel={selectedChannel}
                onSelectChannel={(c) => {
                  setSelectedChannel(c);
                  loadChannelCharacters(c.channel_id);
                  loadProjectsList(false, c.channel_id);
                  loadSheetItems(false, c.channel_id);
                }}
                onChannelCreated={(newChannel) => {
                  setChannels((prev) => {
                    const exists = prev.some((c) => c.channel_id === newChannel.channel_id);
                    if (exists) return prev.map((c) => (c.channel_id === newChannel.channel_id ? newChannel : c));
                    return [...prev, newChannel];
                  });
                  setSelectedChannel(newChannel);
                  loadChannelCharacters(newChannel.channel_id);
                  loadProjectsList(false, newChannel.channel_id);
                  loadSheetItems(false, newChannel.channel_id);
                }}
                onNavigateToProduction={(channelId) => {
                  const found = channels.find((c) => c.channel_id === channelId);
                  if (found) setSelectedChannel(found);
                  setStudioSection('production');
                  setActiveStep(1);
                }}
                showToast={showToast}
              />
            )}

            {/* =====================================================================
                SECCIÓN D: EDITOR DE PRODUCCIÓN (FLUJO PASO A PASO 1..7)
               ===================================================================== */}
            {studioSection === 'production' && (
              <>
                {/* PASO 1: Tablero de Historias, Tareas y Google Sheets por Canal */}
                {activeStep === 1 && selectedChannel && (
                  <ChannelBacklogBoard
                    channel={selectedChannel}
                    stories={sheetItems}
                    loadingStories={loadingSheet}
                    channelProjects={projectsList}
                    channelCharactersCount={channelCharacters.length}
                    isGeneratingScript={isGenerating}
                    customTopic={customTopic}
                    onCustomTopicChange={setCustomTopic}
                    onSyncSheet={() => loadSheetItems(true, selectedChannel.channel_id)}
                    onGenerateScript={handleGenerateScript}
                    onOpenProject={handleOpenProject}
                    onUpdateStory={handleUpdateStory}
                    onUpdateStoryStatus={handleUpdateStoryStatus}
                    onCreateManualStory={handleCreateManualStory}
                    onDeleteStory={handleDeleteStory}
                    onOpenChannelSettings={() => setChannelModalMode('edit')}
                  />
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

                    {/* BARRA DE ELENCO DEL PROYECTO + DOBLES CON LORE DEL CANAL */}
                    <div className="bg-slate-900/90 border border-purple-500/30 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-purple-400" />
                          Elenco Individual del Video ({projectCast.length}):
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                          {projectCast.map((char, idx) => (
                            <span
                              key={char.character_id}
                              onClick={() => {
                                setSelectedProjectCharIndex(idx);
                                setActiveStep(3);
                              }}
                              className={`cursor-pointer text-xs font-semibold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition ${
                                char.character_category === 'channel_lore_cast'
                                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25'
                                  : 'bg-purple-500/15 text-purple-200 border-purple-500/40 hover:bg-purple-500/25'
                              }`}
                              title="Haz clic para editar el retrato individual de este personaje en el Paso 3"
                            >
                              {char.canonical_image_url ? (
                                <img
                                  src={char.canonical_image_url}
                                  alt={char.name}
                                  className="w-4 h-4 rounded-full object-cover"
                                />
                              ) : (
                                <User className="w-3.5 h-3.5" />
                              )}
                              <span>{char.name}</span>
                              {char.character_category === 'channel_lore_cast' && (
                                <span className="text-[9px] bg-amber-500/30 text-amber-200 px-1 rounded">
                                  🌟 Lore
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => handleResolveProjectCast(false)}
                          className="text-xs bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition"
                          title="Si la historia tiene 2 o 3 protagonistas, los separa en fichas e imágenes individuales"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Separar Personajes Individuales
                        </button>
                        <button
                          onClick={() => handleResolveProjectCast(true)}
                          className="text-xs bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition"
                          title="Añade al elenco recurrente del canal (ej. Juanito) como personaje secundario / doble para rostros desconocidos o analogías"
                        >
                          <Star className="w-3.5 h-3.5 text-amber-400" />
                          + Añadir Doble con Lore (Juanito)
                        </button>
                      </div>
                    </div>

                    {/* Escenas en Tarjetas Editables */}
                    <div className="space-y-4">
                      {currentProject.scenes.map((scene) => {
                        const sceneCharIds =
                          scene.character_ids && scene.character_ids.length > 0
                            ? scene.character_ids
                            : projectCast[0]
                              ? [projectCast[0].character_id]
                              : [];

                        return (
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

                              <span>Cinematografía:</span>
                              <select
                                value={scene.motion_mode || 'auto'}
                                onChange={(e) =>
                                  handleUpdateScene(
                                    scene.scene_id,
                                    'motion_mode',
                                    e.target.value
                                  )
                                }
                                className="bg-slate-800 text-purple-300 px-2 py-1 rounded border border-purple-500/30 text-xs focus:outline-none font-semibold"
                              >
                                <option value="auto">🤖 Auto (Según plano)</option>
                                <option value="character_alive">🎭 Personaje Vivo (Respiración + 2.5D)</option>
                                <option value="cinematic_camera">🎥 Cámara Cinematográfica</option>
                              </select>

                              {/* Selector de Efecto Emocional Contextual para personajes */}
                              {(scene.motion_mode === 'character_alive' ||
                                (scene.motion_mode !== 'cinematic_camera' &&
                                  (scene.shot_type === 'character_closeup' ||
                                    scene.shot_type === 'antagonist_shot' ||
                                    (scene.character_effect && scene.character_effect !== 'none')))) && (
                                <>
                                  <span className="text-amber-400 font-medium">Efecto Emocional:</span>
                                  <select
                                    value={scene.character_effect || 'none'}
                                    onChange={(e) =>
                                      handleUpdateScene(
                                        scene.scene_id,
                                        'character_effect',
                                        e.target.value
                                      )
                                    }
                                    className="bg-slate-800 text-amber-300 px-2 py-1 rounded border border-amber-500/40 text-xs focus:outline-none font-semibold"
                                  >
                                    <option value="none">⚪ Respiración Limpia</option>
                                    <option value="smoke_head">💨 Humo en Cabeza (Furia / Enojo)</option>
                                    <option value="dizzy_wobble">🌀 Mareo / Descontrol (Bamboleo)</option>
                                    <option value="golden_glint">✨ Brillo Dorado (Dinero / Éxito)</option>
                                    <option value="panic_heartbeat">💓 Pánico / Taquicardia (Colapso)</option>
                                    <option value="rage_jitter">⚡ Temblor de Rabia</option>
                                  </select>
                                </>
                              )}

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
                                <option value="zoom_in">Dolly In (Acercamiento)</option>
                                <option value="zoom_out">Dolly Out (Retroceso)</option>
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

                          {/* Selector de Personajes Presentes en esta Escena (Solo vs Grupal) */}
                          {projectCast.length > 0 && (
                            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/80 border border-slate-800/80 px-3 py-2 rounded-lg">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[11px] font-bold text-slate-400">
                                  🎭 Personajes en escena:
                                </span>
                                {projectCast.map((char) => {
                                  const isPresent = sceneCharIds.includes(char.character_id);
                                  const isLore = char.character_category === 'channel_lore_cast';
                                  return (
                                    <button
                                      key={char.character_id}
                                      onClick={() =>
                                        handleToggleSceneCharacter(scene.scene_id, char.character_id)
                                      }
                                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-md border flex items-center gap-1.5 transition ${
                                        isPresent
                                          ? isLore
                                            ? 'bg-amber-600/30 text-amber-200 border-amber-400'
                                            : 'bg-purple-600/30 text-purple-200 border-purple-400'
                                          : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
                                      }`}
                                    >
                                      <span>{isPresent ? '✓' : '+'}</span>
                                      <span>{char.name}</span>
                                      {isLore && <span className="text-[9px]">🌟</span>}
                                    </button>
                                  );
                                })}
                              </div>
                              <span
                                className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                                  sceneCharIds.length > 1
                                    ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                }`}
                              >
                                {sceneCharIds.length > 1
                                  ? `👥 Escena Grupal (${sceneCharIds.length} personajes)`
                                  : '👤 Escena Individual (1 personaje)'}
                              </span>
                            </div>
                          )}

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
                      );
                      })}
                    </div>
                  </div>
                )}

                {/* PASO 3: Diseño Visual del Elenco Individual (Retrato Previo + Subida Propia + Lore del Canal) y Fotometría */}
                {activeStep === 3 && currentProject && (
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-purple-400 uppercase tracking-wider font-semibold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                            Paso Previo a las Escenas • Elenco Individual & Lore del Canal ({projectCast.length} personajes)
                          </span>
                        </div>
                        <h2 className="text-xl font-bold text-white mt-1">
                          Elenco Individual de la Historia, Retratos Solos y Dobles con Lore
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Cada personaje de la historia se gestiona por igual con su ficha y retrato individual. Si hay personajes sin rostro conocido, añade un doble con Lore del Canal (ej. Juanito).
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          onClick={() => setStudioSection('characters')}
                          className="bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 font-semibold text-xs px-3.5 py-2.5 rounded-lg flex items-center gap-1.5 transition"
                        >
                          <Eye className="w-4 h-4" />
                          Biblioteca Completa
                        </button>

                        <button
                          disabled={isGeneratingImages}
                          onClick={handleGeneratePilotScene}
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-lg flex items-center gap-2 transition shadow-md shadow-blue-600/20"
                          title="Genera solo la Escena 1 para validar cómo luce el personaje en formato 16:9 cinematográfico antes de generar las demás"
                        >
                          {isGeneratingImages ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Play className="w-4 h-4 text-blue-200" />
                          )}
                          1. Probar Escena 1 Piloto (16:9)
                        </button>

                        <button
                          disabled={isGeneratingImages}
                          onClick={handleRequestGenerateAllScenes}
                          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-lg flex items-center gap-2 transition shadow-lg shadow-emerald-600/20"
                        >
                          {isGeneratingImages ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4" />
                          )}
                          2. Generar Escenas del Video ({currentProject.scenes.length})
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* TARJETAS DEL ELENCO COMPLETO DE LA HISTORIA + ACCIONES DE BIBLIOTECA */}
                    <div className="bg-[#0f172a] border border-slate-800 p-4 rounded-2xl space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                            <Users className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">
                              Elenco Activo en "{currentProject.title}" ({projectCast.length} personajes independientes):
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Haz clic en cualquier personaje para editar su retrato individual o añade otro personaje / doble del canal:
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => handleResolveProjectCast(false)}
                            className="text-xs bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
                            title="Separa nombres múltiples en personajes individuales"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Auto-Separar Protagonistas
                          </button>

                          <button
                            onClick={() => handleResolveProjectCast(true)}
                            className="text-xs bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
                            title="Añade al personaje con Lore del Canal (ej. Juanito) para cubrir personajes sin rostro conocido o analogías"
                          >
                            <Star className="w-3.5 h-3.5 text-amber-400" />
                            + Añadir Doble con Lore (Juanito)
                          </button>

                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                handleSelectCharacterFromLibrary(e.target.value, 'add');
                              }
                            }}
                            className="bg-slate-900 border border-slate-700 text-xs font-semibold text-white px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">+ Añadir de la biblioteca ({channelCharacters.length})...</option>
                            <optgroup label="🌟 Elenco con Lore del Canal (Dobles / Relleno)">
                              {channelCharacters
                                .filter((c) => c.character_category === 'channel_lore_cast')
                                .map((char) => (
                                  <option key={char.character_id} value={char.character_id}>
                                    🌟 {char.name} ({char.channel_lore?.age || char.role})
                                  </option>
                                ))}
                            </optgroup>
                            <optgroup label="👤 Figuras Individuales">
                              {channelCharacters
                                .filter((c) => c.character_category !== 'channel_lore_cast')
                                .map((char) => (
                                  <option key={char.character_id} value={char.character_id}>
                                    👤 {char.name} ({char.company_or_affiliation || char.role})
                                  </option>
                                ))}
                            </optgroup>
                          </select>

                          {projectCast.filter((c, idx) => {
                            const count = currentProject.scenes.filter((s) =>
                              s.character_ids && s.character_ids.length > 0
                                ? s.character_ids.includes(c.character_id)
                                : idx === 0
                            ).length;
                            return count === 0;
                          }).length > 0 && (
                            <button
                              onClick={handlePruneUnusedCharacters}
                              className="text-xs bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition font-semibold"
                              title="Retira automáticamente del video a los personajes que no aparecen en ninguna escena"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                              Limpiar Elenco (0 Escenas)
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setCharCreatorType('real_person');
                              setCharCreatorName('');
                              setCharCreatorRole('');
                              setCharCreatorRefPhotoBase64(null);
                              setCharCreatorModalOpen(true);
                            }}
                            className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold transition"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Nuevo con Foto / Estilo
                          </button>
                        </div>
                      </div>

                      {/* Tarjetas horizontales de cada personaje en el elenco del proyecto */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {projectCast.map((char, idx) => {
                          const isSelected =
                            activeCharacter?.character_id === char.character_id;
                          const isLore = char.character_category === 'channel_lore_cast';
                          const scenesCount = currentProject.scenes.filter((s) =>
                            s.character_ids && s.character_ids.length > 0
                              ? s.character_ids.includes(char.character_id)
                              : idx === 0
                          ).length;

                          return (
                            <div
                              key={char.character_id}
                              onClick={() => setSelectedProjectCharIndex(idx)}
                              className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between gap-3 ${
                                isSelected
                                  ? isLore
                                    ? 'bg-amber-950/30 border-amber-400 ring-1 ring-amber-400/40'
                                    : 'bg-purple-950/30 border-purple-500 ring-1 ring-purple-500/40'
                                  : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center relative">
                                  {char.canonical_image_url ? (
                                    <img
                                      src={char.canonical_image_url}
                                      alt={char.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <User className="w-5 h-5 text-slate-500" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-white truncate">
                                      {char.name}
                                    </span>
                                    <span
                                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                                        isLore
                                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                      }`}
                                    >
                                      {isLore ? '🌟 Lore / Doble' : `👤 #${idx + 1}`}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-400 truncate">
                                    {char.company_or_affiliation || char.role}
                                  </div>
                                  <div
                                    className={`text-[10px] font-mono ${
                                      scenesCount === 0
                                        ? 'text-amber-400 font-bold'
                                        : 'text-emerald-400'
                                    }`}
                                  >
                                    {scenesCount === 0
                                      ? '⚠️ Presente en 0 escenas'
                                      : `🎬 Presente en ${scenesCount} escena(s)`}
                                  </div>
                                </div>
                              </div>

                              {projectCast.length > 1 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveCharacterFromProject(char.character_id);
                                  }}
                                  className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition shrink-0"
                                  title="Quitar de este proyecto"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Tarjeta Visual + Edición del Personaje Seleccionado del Elenco */}
                    {activeCharacter && (
                      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 pb-4 gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                              <User className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-base font-bold text-white">
                                  {activeCharacter.name}
                                </h3>
                                <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded font-mono">
                                  ID: {activeCharacter.character_id}
                                </span>
                                {activeCharacter.character_category === 'channel_lore_cast' && (
                                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-bold">
                                    🌟 Personaje Recurrente con Lore del Canal
                                  </span>
                                )}
                                {activeCharacter.canonical_image_url && (
                                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-semibold">
                                    ✓ Retrato Individual Activo
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

                        {/* Panel de Diseño Visual: Foto Real de Frente vs Retrato 3D Canónico + Estilo */}
                        <div className="bg-slate-950/80 border border-slate-800 p-5 rounded-xl space-y-5">
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                            {/* Bloque Visual Izquierdo: Foto Real de Frente + Retrato Oficial (5 cols) */}
                            <div className="lg:col-span-5 space-y-4">
                              <div className="grid grid-cols-2 gap-3">
                                {/* 1. Foto Real de Frente */}
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                                      <Camera className="w-3.5 h-3.5 text-blue-400" />
                                      Foto Real:
                                    </span>
                                    {activeCharacter.real_reference_image_url && (
                                      <button
                                        onClick={() => handleRemoveRealReferencePhoto(activeCharacter)}
                                        className="text-[10px] text-rose-400 hover:text-rose-300 transition"
                                      >
                                        Quitar
                                      </button>
                                    )}
                                  </div>

                                  <div className="aspect-square w-full rounded-xl bg-slate-900 border border-slate-700 overflow-hidden relative flex items-center justify-center shadow-inner group">
                                    {activeCharacter.real_reference_image_url ? (
                                      <>
                                        <img
                                          src={activeCharacter.real_reference_image_url}
                                          alt="Foto real de referencia"
                                          className="w-full h-full object-cover"
                                        />
                                        <span className="absolute bottom-1.5 left-1.5 bg-blue-600/90 text-white text-[8px] font-bold px-1.5 py-0.5 rounded backdrop-blur">
                                          📸 Referencia Real
                                        </span>
                                      </>
                                    ) : (
                                      <div
                                        onClick={() => charRefFileInputRef.current?.click()}
                                        className="p-3 text-center space-y-1 text-slate-400 cursor-pointer hover:text-slate-200 transition"
                                      >
                                        <Camera className="w-7 h-7 mx-auto text-slate-600 group-hover:text-blue-400 transition" />
                                        <p className="text-[10px] font-semibold">Subir Foto Real</p>
                                        <p className="text-[8px] text-slate-500">De frente para no alucinar</p>
                                      </div>
                                    )}
                                  </div>

                                  <input
                                    ref={charRefFileInputRef}
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        handleUploadRealReferencePhoto(file, activeCharacter);
                                        e.target.value = '';
                                      }
                                    }}
                                  />

                                  <div className="grid grid-cols-2 gap-1">
                                    <button
                                      onClick={() => handleOpenRefPhotoPicker(activeCharacter)}
                                      className="w-full bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-[10px] font-semibold py-1.5 px-1.5 rounded-lg flex items-center justify-center gap-1 transition"
                                      title="Buscar fotos reales en Wikipedia / Wikimedia / Google"
                                    >
                                      <Search className="w-3 h-3" />
                                      Buscar
                                    </button>
                                    <button
                                      disabled={isUploadingRefImage}
                                      onClick={() => charRefFileInputRef.current?.click()}
                                      className="w-full bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-[10px] font-semibold py-1.5 px-1.5 rounded-lg flex items-center justify-center gap-1 transition"
                                    >
                                      <Upload className="w-3 h-3" />
                                      {isUploadingRefImage
                                        ? 'Subiendo...'
                                        : activeCharacter.real_reference_image_url
                                        ? 'Cambiar'
                                        : 'Subir'}
                                    </button>
                                  </div>
                                </div>

                                {/* 2. Retrato IA Canónico */}
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-purple-300 flex items-center gap-1">
                                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                                      Retrato 3D IA:
                                    </span>
                                    {activeCharacter.portrait_approved ? (
                                      <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1 py-0.2 rounded font-bold">
                                        ✓ Aprobado
                                      </span>
                                    ) : (
                                      <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1 py-0.2 rounded font-bold">
                                        Sin validar
                                      </span>
                                    )}
                                  </div>

                                  <div className="aspect-square w-full rounded-xl bg-slate-900 border border-slate-700 overflow-hidden relative flex items-center justify-center shadow-inner">
                                    {activeCharacter.canonical_image_url ? (
                                      <>
                                        <img
                                          src={activeCharacter.canonical_image_url}
                                          alt={activeCharacter.name}
                                          className="w-full h-full object-cover"
                                        />
                                        <span
                                          className={`absolute bottom-1.5 left-1.5 text-[8px] font-bold px-1.5 py-0.5 rounded backdrop-blur ${
                                            activeCharacter.custom_uploaded
                                              ? 'bg-emerald-600/90 text-white'
                                              : 'bg-purple-600/90 text-white'
                                          }`}
                                        >
                                          {activeCharacter.custom_uploaded ? '✨ Propio' : '🎨 3D IA'}
                                        </span>
                                      </>
                                    ) : (
                                      <div className="p-3 text-center space-y-1 text-slate-500">
                                        <User className="w-7 h-7 mx-auto text-slate-600" />
                                        <p className="text-[10px]">Sin retrato</p>
                                      </div>
                                    )}
                                  </div>

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
                                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] font-semibold py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition"
                                  >
                                    <Upload className="w-3 h-3" />
                                    {isUploadingImage ? 'Subiendo...' : 'Subir Propio'}
                                  </button>
                                </div>
                              </div>

                              {/* Selector de Estilo Artístico */}
                              <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl space-y-2">
                                <div>
                                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                                    Estilo Visual Deseado:
                                  </label>
                                  <select
                                    value={activeCharacter.preferred_style_preset || '3d_pixar_arcane'}
                                    onChange={(e) => {
                                      handleUpdateCharacter('preferred_style_preset', e.target.value);
                                    }}
                                    className="w-full bg-slate-950 border border-slate-700 text-xs font-semibold text-white px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-purple-500"
                                  >
                                    {CHARACTER_STYLE_PRESET_OPTIONS.map((opt) => (
                                      <option key={opt.id} value={opt.id}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                    Ajuste fino de estilo (opcional):
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Ej: iluminación azulada, estética sobria..."
                                    value={activeCharacter.custom_style_prompt || ''}
                                    onChange={(e) =>
                                      handleUpdateCharacter('custom_style_prompt', e.target.value)
                                    }
                                    className="w-full bg-slate-950 border border-slate-700 text-xs text-white px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-purple-500"
                                  />
                                </div>

                                <div className="pt-1 flex flex-col gap-1.5">
                                  <button
                                    disabled={isGeneratingPortrait}
                                    onClick={() =>
                                      handleGenerateCharacterPortrait(activeCharacter, {
                                        stylePreset: activeCharacter.preferred_style_preset,
                                        customStyle: activeCharacter.custom_style_prompt,
                                      })
                                    }
                                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/20 transition"
                                  >
                                    {isGeneratingPortrait ? (
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Wand2 className="w-3.5 h-3.5" />
                                    )}
                                    {isGeneratingPortrait
                                      ? 'Generando...'
                                      : activeCharacter.real_reference_image_url
                                      ? '✨ Generar Retrato 3D desde Foto Real'
                                      : '✨ Generar Retrato 3D IA'}
                                  </button>

                                  {activeCharacter.canonical_image_url && !activeCharacter.portrait_approved && (
                                    <button
                                      onClick={() => handleApproveCharacterPortrait(activeCharacter)}
                                      className="w-full bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      Aprobar Retrato Canónico
                                    </button>
                                  )}
                                </div>
                              </div>

                              {activeCharacter.reference_gallery &&
                                activeCharacter.reference_gallery.length > 1 && (
                                  <div className="space-y-1">
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
                                          className={`w-9 h-9 rounded-lg overflow-hidden border-2 shrink-0 ${
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

                            {/* Bloque Derecho: Campos del personaje & Prompt ancla (7 cols) */}
                            <div className="lg:col-span-7 space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    Nombre Individual:
                                  </label>
                                  <input
                                    type="text"
                                    value={activeCharacter.name}
                                    onChange={(e) =>
                                      handleUpdateCharacter('name', e.target.value)
                                    }
                                    className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                  />
                                </div>

                                <div>
                                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    Empresa / Afiliación:
                                  </label>
                                  <input
                                    type="text"
                                    value={activeCharacter.company_or_affiliation || ''}
                                    onChange={(e) =>
                                      handleUpdateCharacter('company_or_affiliation', e.target.value)
                                    }
                                    className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                  />
                                </div>

                                <div>
                                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    Rol en la Historia:
                                  </label>
                                  <input
                                    type="text"
                                    value={activeCharacter.role}
                                    onChange={(e) =>
                                      handleUpdateCharacter('role', e.target.value)
                                    }
                                    className="w-full mt-1 bg-slate-900 border border-slate-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                  />
                                </div>
                              </div>

                              {activeCharacter.character_category === 'channel_lore_cast' &&
                                activeCharacter.channel_lore && (
                                  <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-3.5 space-y-1.5">
                                    <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                      Lore del Canal: {activeCharacter.name} ({activeCharacter.channel_lore.age})
                                    </div>
                                    <p className="text-xs text-slate-300">
                                      {activeCharacter.channel_lore.channel_backstory}
                                    </p>
                                    <div className="text-[11px] text-amber-200/90">
                                      <strong>Peculiaridades:</strong>{' '}
                                      {(activeCharacter.channel_lore.peculiarities || []).join(' • ')}
                                    </div>
                                  </div>
                                )}

                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <label className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5" /> Prompt Ancla 3D Individual:
                                  </label>
                                  <span className="text-[10px] text-slate-500">
                                    Inyectado en las escenas donde participa
                                  </span>
                                </div>
                                <textarea
                                  rows={3}
                                  value={activeCharacter.anchor_prompt}
                                  onChange={(e) =>
                                    handleUpdateCharacter('anchor_prompt', e.target.value)
                                  }
                                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-purple-200/90 focus:outline-none focus:border-purple-500 font-mono leading-relaxed"
                                />
                              </div>

                              <div className="space-y-1">
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
                                  placeholder="smartphone con gráfica de ventas, reloj, oficina moderna..."
                                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Previsualización de la Escena 1 de Prueba (Piloto de Consistencia 16:9) */}
                    {currentProject.scenes[0]?.imageUrl && !currentProject.scenes[0].imageUrl.endsWith('.svg') && (
                      <div className="bg-gradient-to-r from-blue-950/40 via-slate-900 to-indigo-950/40 border border-blue-500/30 rounded-2xl p-5 space-y-4 shadow-lg">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                              <Play className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-sm font-bold text-white flex items-center gap-2">
                                Escena 1 Piloto Generada (Prueba de Consistencia 16:9)
                                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  ✓ Lista para Revisión
                                </span>
                              </div>
                              <p className="text-xs text-slate-400">
                                Comprueba cómo luce {activeCharacter?.name || 'el protagonista'} en el encuadre 16:9 antes de generar las demás escenas.
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              disabled={isGeneratingImages}
                              onClick={handleGeneratePilotScene}
                              className="bg-slate-800 hover:bg-slate-700 text-blue-300 border border-blue-500/30 text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              Regenerar Escena 1
                            </button>

                            <button
                              disabled={isGeneratingImages}
                              onClick={() => handleGenerateImages()}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition shadow-lg shadow-emerald-600/20"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              Quedó Perfecto • Generar Escenas Restantes ({currentProject.scenes.length - 1})
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                          <div className="md:col-span-5 aspect-video rounded-xl overflow-hidden border border-slate-700 bg-black shadow-lg">
                            <img
                              src={currentProject.scenes[0].imageUrl}
                              alt="Escena 1 Piloto"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="md:col-span-7 space-y-2 text-xs">
                            <div className="text-slate-300">
                              <strong className="text-blue-400">Voz en off:</strong> "{currentProject.scenes[0].voiceover}"
                            </div>
                            <div className="text-slate-400 font-mono text-[11px] bg-slate-950/80 p-3 rounded-lg border border-slate-800">
                              <strong className="text-purple-400">Prompt visual generado:</strong> {currentProject.scenes[0].visual_prompt}
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

                    {(() => {
                      const seenUrls = new Map<string, number>();
                      const duplicateSceneIds = new Set<number>();
                      const missingSceneIds = new Set<number>();

                      currentProject.scenes.forEach((sc) => {
                        if (!sc.imageUrl) {
                          missingSceneIds.add(sc.scene_id);
                        } else if (seenUrls.has(sc.imageUrl)) {
                          duplicateSceneIds.add(sc.scene_id);
                        } else {
                          seenUrls.set(sc.imageUrl, sc.scene_id);
                        }
                      });

                      const totalNeedsFix = duplicateSceneIds.size + missingSceneIds.size;
                      const { localList: vsVoiceOptions, otherCatalogVoices } = getSelectableVoiceOptions();
                      const primarySelectedId = normalizeVoiceSelectValue(currentProject.primaryVoice, 'b4b14f0e');
                      const secondarySelectedId = normalizeVoiceSelectValue(currentProject.secondaryVoice, '3ed550f0');

                      return (
                        <>
                          <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 gap-4">
                            <div>
                              <h2 className="text-xl font-bold text-white">
                                Activos Visuales & Locución Sincronizada
                              </h2>
                              <p className="text-xs text-slate-400">
                                Imágenes 16:9 únicas por escena (sin repetir en el mismo video) y locución calibrada al milisegundo.
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2.5">
                              {/* Botón Estelar: Generación Concurrente Turbo (Imágenes Cloud + Audio Local RTX 3080 simultáneos) */}
                              <div className="flex flex-wrap items-center gap-2 bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-indigo-500/15 border border-amber-500/40 rounded-xl p-1.5 shadow-lg">
                                <button
                                  disabled={isTurboGenerating || isGeneratingImages || isGeneratingAudio}
                                  onClick={handleGenerateTurboProduction}
                                  className="bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-2 shadow-md shadow-rose-500/20 transition active:scale-95"
                                  title="Genera todas las imágenes en la nube y sintetiza todas las voces en local simultáneamente para ahorrar la mitad del tiempo"
                                >
                                  <Zap className={`w-4 h-4 ${isTurboGenerating ? 'animate-bounce text-yellow-300' : 'text-yellow-300'}`} />
                                  <span>
                                    {isTurboGenerating ? 'Producción Turbo en Curso...' : '⚡ Generar Imágenes y Audio en Paralelo'}
                                  </span>
                                </button>

                                <label
                                  className="flex items-center gap-1.5 text-[11px] text-slate-300 px-2 cursor-pointer select-none hover:text-white"
                                  title="Al terminar la generación paralela de medios, iniciará automáticamente el renderizado Remotion en 1080p sin que tengas que esperar"
                                >
                                  <input
                                    type="checkbox"
                                    checked={autoRenderAfterTurbo}
                                    onChange={(e) => setAutoRenderAfterTurbo(e.target.checked)}
                                    className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                                  />
                                  <span>Auto-renderizar MP4 al terminar</span>
                                </label>
                              </div>

                              {/* Toggle de Reutilización Inteligente de Otros Videos */}
                              <label
                                className="flex items-center gap-2 cursor-pointer bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/80 px-3 py-2 rounded-lg text-xs font-semibold text-slate-200 transition select-none shadow-sm"
                                title="Si está activo, reutiliza activos de VIDEOS ANTERIORES cuando coinciden con la escena, pero NUNCA repite una misma imagen dentro del mismo video."
                              >
                                <input
                                  type="checkbox"
                                  checked={smartReuseImages}
                                  onChange={(e) => setSmartReuseImages(e.target.checked)}
                                  className="w-3.5 h-3.5 rounded border-slate-600 text-amber-500 focus:ring-amber-500 accent-amber-500 cursor-pointer"
                                />
                                <span className="flex items-center gap-1.5">
                                  <span className="text-amber-400">♻️</span>
                                  <span>Reutilizar de Otros Videos (Sin repetir aquí)</span>
                                </span>
                              </label>

                              {totalNeedsFix > 0 && (
                                <button
                                  disabled={isGeneratingImages}
                                  onClick={() => handleGenerateImages(undefined, true, true)}
                                  className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-3.5 py-2.5 rounded-lg flex items-center gap-1.5 shadow-md shadow-amber-600/20 transition active:scale-95"
                                  title="Genera con IA únicamente las escenas que tienen imágenes repetidas o vacías, conservando intactas las escenas que ya tienen imagen única"
                                >
                                  <Sparkles
                                    className={`w-3.5 h-3.5 ${isGeneratingImages ? 'animate-spin' : ''}`}
                                  />
                                  <span>
                                    Corregir {totalNeedsFix} Escena{totalNeedsFix === 1 ? '' : 's'}{' '}
                                    {duplicateSceneIds.size > 0 ? 'Repetidas' : 'Faltantes'} (IA)
                                  </span>
                                </button>
                              )}

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
                                    ? `Generar Locución (${getVoiceDisplayName(primarySelectedId)} + ${getVoiceDisplayName(secondarySelectedId)})`
                                    : `Generar Locución (${getVoiceDisplayName(primarySelectedId)} en RTX 3080)`}
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

                              {/* Selector Bilingüe si el proyecto tiene ambas pistas */}
                              {(currentProject.scenes_es || currentProject.scenes_en) && (
                                <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
                                  <button
                                    disabled={isSwitchingLanguage}
                                    onClick={() => handleSwitchLanguage('es')}
                                    className={`px-2.5 py-1.5 rounded text-xs font-bold transition flex items-center gap-1 ${
                                      (currentProject.language || 'es') === 'es'
                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                        : 'text-slate-400 hover:text-white'
                                    }`}
                                    title="Editar y escuchar pista en Español"
                                  >
                                    <span>🇪🇸</span> Español
                                  </button>
                                  <button
                                    disabled={isSwitchingLanguage}
                                    onClick={() => handleSwitchLanguage('en')}
                                    className={`px-2.5 py-1.5 rounded text-xs font-bold transition flex items-center gap-1 ${
                                      currentProject.language === 'en'
                                        ? 'bg-blue-600 text-white shadow'
                                        : 'text-slate-400 hover:text-white'
                                    }`}
                                    title="Editar y escuchar pista en Inglés (Master)"
                                  >
                                    <span>🇺🇸</span> English
                                  </button>
                                </div>
                              )}

                              <button
                                disabled={isTranslating}
                                onClick={handleTranslateToEnglish}
                                className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold px-3.5 py-2.5 rounded-lg flex items-center gap-1.5 border border-amber-500/30"
                                title="Genera o actualiza el guion adaptado a Inglés para el Master de YouTube"
                              >
                                {isTranslating ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <span>🇺🇸</span>
                                )}
                                {currentProject.scenes_en ? 'Re-adaptar a Inglés' : 'Adaptar a Inglés'}
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

                          {duplicateSceneIds.size > 0 && (
                            <div className="bg-amber-950/30 border border-amber-500/40 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 text-xs text-amber-200">
                                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                                <span>
                                  Se detectaron <strong>{duplicateSceneIds.size} escenas con imágenes repetidas</strong> dentro de este mismo video (Escenas:{' '}
                                  {Array.from(duplicateSceneIds)
                                    .map((id) => `#${id}`)
                                    .join(', ')}
                                  ). El motor ya bloquea cualquier repetición dentro del mismo video.
                                </span>
                              </div>
                              <button
                                disabled={isGeneratingImages}
                                onClick={() => handleGenerateImages(undefined, true, true)}
                                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shrink-0"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                Generar Imágenes Únicas para las {duplicateSceneIds.size} Escenas Repetidas
                              </button>
                            </div>
                          )}

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
                                    Elenco Activo del Proyecto ({currentProject.characters?.length || 1} personajes):
                                  </div>
                                  <div className="text-sm font-bold text-white flex flex-wrap items-center gap-2">
                                    🎭 {(currentProject.characters || []).map((c) => c.name).join(' • ') || activeCharacter?.name || 'Protagonista'}
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
                                      Configuración de Voces ({vsVoiceOptions.length} locales disponibles)
                                      <button
                                        onClick={() => {
                                          checkConfigStatus();
                                          loadVoiceCatalog(true);
                                          showToast('🔄 Lista de voces de VoiceStudio actualizada.');
                                        }}
                                        className="text-[10px] bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded flex items-center gap-1 transition"
                                        title="Recargar voces de VoiceStudio Local y catálogo"
                                      >
                                        <RefreshCw className="w-2.5 h-2.5" />
                                        Recargar Voces
                                      </button>
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
                                  <div className="flex items-center justify-between">
                                    <label className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                                      <Mic className="w-3 h-3" />
                                      Voz 1 (Principal):
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handlePlayVoiceSample(
                                          `/api/audio/voicestudio/proxy-audio/${primarySelectedId}`,
                                          `preview_v1_${primarySelectedId}`
                                        )
                                      }
                                      className="text-[10px] text-emerald-300 hover:text-emerald-200 flex items-center gap-1"
                                      title="Escuchar muestra de la Voz 1"
                                    >
                                      {playingVoiceId === `preview_v1_${primarySelectedId}` ? (
                                        <Pause className="w-2.5 h-2.5" />
                                      ) : (
                                        <Play className="w-2.5 h-2.5" />
                                      )}
                                      Escuchar
                                    </button>
                                  </div>
                                  <select
                                    value={primarySelectedId}
                                    onChange={(e) => handleUpdateProjectVoice('primary', e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-emerald-500"
                                  >
                                    <optgroup label="⚡ VoiceStudio Local (RTX 3080 - Gratis)">
                                      {vsVoiceOptions.map((v) => (
                                        <option key={v.id} value={v.id}>
                                          {v.name} {v.type === 'profile' ? '★ (Clon Local)' : ''} {v.language === 'Spanish' ? '🇪🇸' : '🇺🇸'}
                                        </option>
                                      ))}
                                    </optgroup>
                                    {otherCatalogVoices.length > 0 && (
                                      <optgroup label="☁️ Otras Voces del Catálogo (ElevenLabs / OpenAI / Edge)">
                                        {otherCatalogVoices.map((v) => (
                                          <option key={v.id} value={v.id}>
                                            {v.name} ({v.provider}) {v.language === 'es' ? '🇪🇸' : '🇺🇸'}
                                          </option>
                                        ))}
                                      </optgroup>
                                    )}
                                  </select>
                                </div>

                                {/* Selector Voz 2 (Visible en modo dual) */}
                                {currentProject.voiceMode === 'dual' ? (
                                  <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <label className="text-[11px] text-purple-400 font-semibold flex items-center gap-1">
                                        <Users className="w-3 h-3" />
                                        Voz 2 (Secundaria):
                                      </label>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handlePlayVoiceSample(
                                            `/api/audio/voicestudio/proxy-audio/${secondarySelectedId}`,
                                            `preview_v2_${secondarySelectedId}`
                                          )
                                        }
                                        className="text-[10px] text-purple-300 hover:text-purple-200 flex items-center gap-1"
                                        title="Escuchar muestra de la Voz 2"
                                      >
                                        {playingVoiceId === `preview_v2_${secondarySelectedId}` ? (
                                          <Pause className="w-2.5 h-2.5" />
                                        ) : (
                                          <Play className="w-2.5 h-2.5" />
                                        )}
                                        Escuchar
                                      </button>
                                    </div>
                                    <select
                                      value={secondarySelectedId}
                                      onChange={(e) => handleUpdateProjectVoice('secondary', e.target.value)}
                                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-purple-500"
                                    >
                                      <optgroup label="⚡ VoiceStudio Local (RTX 3080 - Gratis)">
                                        {vsVoiceOptions.map((v) => (
                                          <option key={v.id} value={v.id}>
                                            {v.name} {v.type === 'profile' ? '★ (Clon Local)' : ''} {v.language === 'Spanish' ? '🇪🇸' : '🇺🇸'}
                                          </option>
                                        ))}
                                      </optgroup>
                                      {otherCatalogVoices.length > 0 && (
                                        <optgroup label="☁️ Otras Voces del Catálogo (ElevenLabs / OpenAI / Edge)">
                                          {otherCatalogVoices.map((v) => (
                                            <option key={v.id} value={v.id}>
                                              {v.name} ({v.provider}) {v.language === 'es' ? '🇪🇸' : '🇺🇸'}
                                            </option>
                                          ))}
                                        </optgroup>
                                      )}
                                    </select>
                                  </div>
                                ) : (
                                  <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/50 flex items-center text-slate-400 text-[11px]">
                                    <span>Todas las escenas narradas por <strong>{getVoiceDisplayName(primarySelectedId)}</strong>. Cambia a modo <strong>2 Voces</strong> para alternar personajes o narradores.</span>
                                  </div>
                                )}
                              </div>

                              {(() => {
                                const pendingVoiceCount = currentProject.scenes.filter((s) => {
                                  if (!s.audioUrl) return true;
                                  const exp = s.voiceRole === 'secondary' && currentProject.voiceMode === 'dual' ? secondarySelectedId : primarySelectedId;
                                  return exp && s.voiceProfile && normalizeVoiceSelectValue(s.voiceProfile) !== exp;
                                }).length;
                                if (pendingVoiceCount === 0) return null;
                                return (
                                  <div className="bg-amber-950/30 border border-amber-500/40 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-200">
                                    <div className="flex items-center gap-2">
                                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                      <span>
                                        Has cambiado la selección de voz: <strong>{pendingVoiceCount} escena(s)</strong> pendientes de sintetizar con la nueva voz.
                                      </span>
                                    </div>
                                    <button
                                      disabled={isGeneratingAudio}
                                      onClick={() => handleGenerateAudio()}
                                      className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-2.5 py-1 rounded text-[11px] shadow flex items-center gap-1.5 transition active:scale-95"
                                    >
                                      <RefreshCw className={`w-3 h-3 ${isGeneratingAudio ? 'animate-spin' : ''}`} />
                                      {isGeneratingAudio ? 'Sintetizando...' : 'Generar Locución con Nuevas Voces'}
                                    </button>
                                  </div>
                                );
                              })()}

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
                              const isDuplicateInVideo = duplicateSceneIds.has(scene.scene_id);

                              return (
                                <div
                                  key={scene.scene_id}
                                  className={`bg-slate-900 border rounded-xl overflow-hidden group shadow-md ${
                                    isDuplicateInVideo ? 'border-amber-500/60 ring-1 ring-amber-500/30' : 'border-slate-800'
                                  }`}
                                >
                                  <div className="aspect-video w-full bg-black relative overflow-hidden">
                                    {scene.imageUrl ? (
                                      <img
                                        key={scene.imageUrl}
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
                                      {isDuplicateInVideo ? (
                                        <div
                                          className="bg-amber-500 text-slate-950 backdrop-blur px-2 py-0.5 rounded text-[10px] font-extrabold border border-amber-300 flex items-center gap-1 shadow-md"
                                          title="Esta imagen ya fue usada en una escena anterior de este mismo video. Usa 'Corregir Repetidas' o 'Nueva IA' para darle su propia imagen única."
                                        >
                                          <span>⚠️ Imagen Repetida en este Video</span>
                                        </div>
                                      ) : (
                                        scene.imageReused && (
                                          <div
                                            className="bg-emerald-600/95 text-white backdrop-blur px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-400 flex items-center gap-1 shadow-md"
                                            title={`Reutilizado de Biblioteca (0 costo de API): ${scene.reusedAssetPrompt || 'Activo existente'}`}
                                          >
                                            <span>♻️ Reutilizado</span>
                                          </div>
                                        )
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
                        </>
                      );
                    })()}
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

                        {/* Conmutador de Pista de Idioma: Español vs English Master */}
                        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
                          <span className="text-[11px] text-slate-400 px-1 font-semibold flex items-center gap-1">
                            <Globe className="w-3 h-3 text-amber-400" />
                            Pista:
                          </span>
                          <button
                            disabled={isSwitchingLanguage}
                            onClick={() => handleSwitchLanguage('es')}
                            className={`px-2.5 py-1 rounded text-[11px] font-bold transition flex items-center gap-1 ${
                              (currentProject.language || 'es') === 'es'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                            title="Ver y escuchar video en Español"
                          >
                            <span>🇪🇸</span> Español
                          </button>
                          <button
                            disabled={isSwitchingLanguage}
                            onClick={() => handleSwitchLanguage('en')}
                            className={`px-2.5 py-1 rounded text-[11px] font-bold transition flex items-center gap-1 ${
                              currentProject.language === 'en'
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                            title="Ver y escuchar video Master en Inglés"
                          >
                            <span>🇺🇸</span> English (Master)
                          </button>
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
                          language: currentProject.language || 'en',
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

                        {/* Intensidad y Estilo Cinematográfico */}
                        <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-2.5 py-1.5 rounded-lg">
                          <span className="text-[11px] text-slate-400 font-medium">Estilo:</span>
                          {[
                            { label: 'Sutil', val: 'subtle' },
                            { label: 'Documental Premium', val: 'standard' },
                            { label: 'Dramático', val: 'dynamic' },
                          ].map((item) => (
                            <button
                              key={item.label}
                              onClick={() => setMotionIntensity(item.val as MotionIntensityType)}
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                                motionIntensity === item.val
                                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/40'
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
                                    key={scene.imageUrl}
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

                    {/* Selector y Estado de Versiones Bilingües (Español e Inglés independientes) */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
                      <div className="flex items-center gap-2.5">
                        <Globe className="w-5 h-5 text-amber-400" />
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-white">Versión Activa para Renderizar:</h4>
                          <p className="text-[11px] text-slate-400">
                            Renderiza en español y en inglés: ambos videos quedan guardados permanentemente.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          disabled={isSwitchingLanguage || isRendering}
                          onClick={() => handleSwitchLanguage('es')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                            (currentProject.language || 'es') === 'es'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow'
                              : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                          }`}
                        >
                          <span>🇪🇸 Español</span>
                          {currentProject.outputVideoUrlEs ? (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono">
                              ✓ 1080p Listo
                            </span>
                          ) : (
                            <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                              Sin render
                            </span>
                          )}
                        </button>
                        <button
                          disabled={isSwitchingLanguage || isRendering}
                          onClick={() => handleSwitchLanguage('en')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                            currentProject.language === 'en'
                              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                              : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                          }`}
                        >
                          <span>🇺🇸 English (Master)</span>
                          {currentProject.outputVideoUrlEn ? (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono">
                              ✓ 1080p Listo
                            </span>
                          ) : (
                            <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                              Sin render
                            </span>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Si ambos videos ya están renderizados, mostrar barra de descarga rápida bilingüe */}
                    {currentProject.outputVideoUrlEs && currentProject.outputVideoUrlEn && (
                      <div className="bg-emerald-950/20 border border-emerald-500/40 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                          <div>
                            <h4 className="text-xs sm:text-sm font-bold text-emerald-300">
                              ¡Ambos videos están renderizados y listos! (ES + EN)
                            </h4>
                            <p className="text-[11px] text-slate-300">
                              Puedes descargar cualquiera de las dos versiones o verlas abajo.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <a
                            href={currentProject.outputVideoUrlEs}
                            download={`${currentProject.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_ES_1080p.mp4`}
                            className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow transition active:scale-95"
                          >
                            <Download className="w-3.5 h-3.5" /> Descargar 🇪🇸 Español (1080p)
                          </a>
                          <a
                            href={currentProject.outputVideoUrlEn}
                            download={`${currentProject.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_EN_1080p.mp4`}
                            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow transition active:scale-95"
                          >
                            <Download className="w-3.5 h-3.5" /> Descargar 🇺🇸 English (1080p)
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Validador Pre-Render de Calidad (Imágenes, Audio, Desfase de Texto y Voces) */}
                    {(() => {
                      const totalSc = currentProject.scenes.length;
                      const missingImgs = currentProject.scenes.filter((s) => !s.imageUrl);
                      const missingAuds = currentProject.scenes.filter((s) => !s.audioUrl);
                      const outdatedAuds = currentProject.scenes.filter(
                        (s) =>
                          s.audioUrl &&
                          s.voiceoverTextAtAudioGen &&
                          s.voiceoverTextAtAudioGen.trim() !== s.voiceover.trim()
                      );

                      // Detectar si alguna escena tiene una voz generada diferente a la asignada actualmente en el proyecto
                      const expectedPrimary = normalizeVoiceSelectValue(currentProject.primaryVoice, 'b4b14f0e');
                      const expectedSecondary = normalizeVoiceSelectValue(currentProject.secondaryVoice, '3ed550f0');
                      const outdatedVoiceScenes = currentProject.scenes.filter((s) => {
                        if (!s.audioUrl) return false;
                        const targetExpected =
                          s.voiceRole === 'secondary' && currentProject.voiceMode === 'dual'
                            ? expectedSecondary
                            : expectedPrimary;
                        if (!targetExpected || !s.voiceProfile) return false;
                        const actual = normalizeVoiceSelectValue(s.voiceProfile);
                        return actual !== targetExpected;
                      });

                      const isCurrentEs = (currentProject.language || 'es') === 'es';
                      const currentLangVideoUrl = isCurrentEs
                        ? currentProject.outputVideoUrlEs
                        : currentProject.outputVideoUrlEn;
                      const otherLangVideoUrl = isCurrentEs
                        ? currentProject.outputVideoUrlEn
                        : currentProject.outputVideoUrlEs;
                      const otherLangLabel = isCurrentEs ? '🇺🇸 Inglés Master' : '🇪🇸 Español';
                      const currentLangLabel = isCurrentEs ? '🇪🇸 Español' : '🇺🇸 Inglés Master';

                      const needsReRender = Boolean(
                        currentProject.videoNeedsReRender ||
                        outdatedVoiceScenes.length > 0 ||
                        outdatedAuds.length > 0 ||
                        !currentLangVideoUrl
                      );

                      const allReady =
                        missingImgs.length === 0 &&
                        missingAuds.length === 0 &&
                        outdatedAuds.length === 0 &&
                        outdatedVoiceScenes.length === 0;

                      return (
                        <div className="space-y-5">
                          <div
                            className={`rounded-2xl border p-4 space-y-3 ${
                              allReady
                                ? 'bg-emerald-950/20 border-emerald-500/30'
                                : 'bg-amber-950/20 border-amber-500/40'
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                {allReady ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                                )}
                                <h4 className="text-xs sm:text-sm font-bold text-white">
                                  {allReady
                                    ? '✓ Checklist de Calidad Pre-Render Verificado (100% Sincronizado)'
                                    : '⚠️ Revisión de Calidad antes de Renderizar MP4'}
                                </h4>
                              </div>

                              {!allReady && (
                                <button
                                  onClick={() => setActiveStep(4)}
                                  className="text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-lg transition"
                                >
                                  Ir al Paso 4 (Imágenes & Voz) →
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
                              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between">
                                <span className="text-slate-300">🖼️ Imágenes 3D:</span>
                                <span
                                  className={`font-mono font-bold ${
                                    missingImgs.length === 0 ? 'text-emerald-400' : 'text-amber-400'
                                  }`}
                                >
                                  {totalSc - missingImgs.length}/{totalSc}
                                </span>
                              </div>

                              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between">
                                <span className="text-slate-300">🎙️ Locución TTS:</span>
                                <span
                                  className={`font-mono font-bold ${
                                    missingAuds.length === 0 ? 'text-emerald-400' : 'text-amber-400'
                                  }`}
                                >
                                  {totalSc - missingAuds.length}/{totalSc}
                                </span>
                              </div>

                              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between">
                                <span className="text-slate-300">🔄 Sincronía Guion:</span>
                                <span
                                  className={`font-mono font-bold ${
                                    outdatedAuds.length === 0 ? 'text-emerald-400' : 'text-rose-400'
                                  }`}
                                >
                                  {outdatedAuds.length === 0
                                    ? 'Al día'
                                    : `${outdatedAuds.length} editada(s)`}
                                </span>
                              </div>

                              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between">
                                <span className="text-slate-300">🎭 Voces Asignadas:</span>
                                <span
                                  className={`font-mono font-bold ${
                                    outdatedVoiceScenes.length === 0 ? 'text-emerald-400' : 'text-amber-400'
                                  }`}
                                >
                                  {outdatedVoiceScenes.length === 0
                                    ? 'Sincronizadas'
                                    : `${outdatedVoiceScenes.length} cambiadas`}
                                </span>
                              </div>
                            </div>

                            {/* Alerta si el texto cambió */}
                            {outdatedAuds.length > 0 && (
                              <div className="text-xs text-rose-300 bg-rose-950/40 border border-rose-500/30 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2">
                                <span>
                                  El texto de locución cambió en la(s) escena(s){' '}
                                  <strong>
                                    {outdatedAuds.map((s) => `#${s.scene_id}`).join(', ')}
                                  </strong>{' '}
                                  después de haber generado su audio.
                                </span>
                                <button
                                  onClick={() => setActiveStep(4)}
                                  className="bg-rose-600 hover:bg-rose-500 text-white font-semibold px-2.5 py-1 rounded text-[11px]"
                                >
                                  Regenerar Audios Editados
                                </button>
                              </div>
                            )}

                            {/* Alerta si cambió la voz en el selector pero aún no se sintetizó */}
                            {outdatedVoiceScenes.length > 0 && (
                              <div className="text-xs text-amber-300 bg-amber-950/40 border border-amber-500/40 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <Mic className="w-4 h-4 text-amber-400 shrink-0" />
                                  <span>
                                    Has seleccionado nuevas voces en el Paso 4, pero <strong>{outdatedVoiceScenes.length} escena(s)</strong> ({outdatedVoiceScenes.map((s) => `#${s.scene_id}`).join(', ')}) aún tienen el audio grabado con la voz anterior.
                                  </span>
                                </div>
                                <button
                                  disabled={isGeneratingAudio}
                                  onClick={() => handleGenerateAudio()}
                                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs shadow-md flex items-center gap-1.5 transition active:scale-95"
                                >
                                  <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingAudio ? 'animate-spin' : ''}`} />
                                  {isGeneratingAudio ? 'Sintetizando...' : 'Sintetizar Nuevas Voces Ahora'}
                                </button>
                              </div>
                            )}
                          </div>

                          {/* SECCIÓN PRINCIPAL: Si requiere nuevo render por cambio de voces o si no hay video aún en la pista actual */}
                          {needsReRender ? (
                            <div className="space-y-4">
                              <div className="bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border-2 border-indigo-500/50 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
                                <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400">
                                  <Film className="w-7 h-7" />
                                </div>
                                <div>
                                  <h3 className="text-base font-bold text-white flex items-center justify-center gap-2">
                                    {currentLangVideoUrl
                                      ? `⚡ Nuevas Voces Detectadas: Listo para Re-Renderizar (${currentLangLabel})`
                                      : `🎬 Listo para Generar el Archivo MP4 en ${currentLangLabel}`}
                                  </h3>
                                  <p className="text-xs text-slate-300 max-w-lg mx-auto mt-1">
                                    {currentLangVideoUrl
                                      ? `Has actualizado la pista en ${currentLangLabel}. Remotion compilará las escenas aplicando los audios sincronizados en 1080p.`
                                      : `Remotion CLI compilará las ${currentProject.scenes.length} escenas en resolución 1080p con locución en ${currentLangLabel}, conservando cualquier otra versión ya existente.`}
                                  </p>
                                </div>

                                <div className="flex justify-center gap-3 text-xs font-mono text-slate-400 flex-wrap">
                                  <span className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300">
                                    Idioma: <strong className="text-amber-400">{currentLangLabel}</strong>
                                  </span>
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

                                <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                                  <button
                                    disabled={isRendering || !allReady}
                                    onClick={() => handleRenderVideo(isCurrentEs ? 'es' : 'en')}
                                    className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 disabled:opacity-50 text-white font-bold text-sm px-8 py-3.5 rounded-xl flex items-center gap-2.5 shadow-xl shadow-blue-500/25 transition active:scale-95"
                                  >
                                    {isRendering ? (
                                      <>
                                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                                        <span>Renderizando en 1080p... (Revisa la barra superior)</span>
                                      </>
                                    ) : (
                                      <>
                                        <Download className="w-4 h-4" />
                                        <span>
                                          {currentLangVideoUrl
                                            ? `Re-Renderizar Video en ${currentLangLabel} (${Math.round(totalFrames / 30)}s)`
                                            : `Renderizar Video en ${currentLangLabel} (${Math.round(totalFrames / 30)}s)`}
                                        </span>
                                      </>
                                    )}
                                  </button>

                                  <button
                                    onClick={() => setActiveStep(7)}
                                    className="bg-slate-800 hover:bg-slate-700 text-red-400 hover:text-red-300 border border-slate-700 font-bold text-sm px-6 py-3.5 rounded-xl flex items-center gap-2 shadow transition active:scale-95"
                                  >
                                    <Youtube className="w-4 h-4 text-red-500" />
                                    Diseñar Miniatura Mientras Tanto (Paso 7) →
                                  </button>
                                </div>
                              </div>

                              {/* Si ya existía un video renderizado (en este idioma o en el otro), mostrarlo como referencia */}
                              {(currentLangVideoUrl || otherLangVideoUrl) && (
                                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3 opacity-90 hover:opacity-100 transition">
                                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                                    <span className="text-xs text-amber-300 font-semibold flex items-center gap-1.5">
                                      <Film className="w-3.5 h-3.5 text-amber-400" />
                                      {otherLangVideoUrl && !currentLangVideoUrl
                                        ? `Video disponible en ${otherLangLabel} (La pista en ${currentLangLabel} aún no ha sido renderizada)`
                                        : `Video Previo Renderizado en ${currentLangLabel}`}
                                    </span>
                                    <a
                                      href={currentLangVideoUrl || otherLangVideoUrl}
                                      download={`${currentProject.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_1080p.mp4`}
                                      className="text-[11px] text-slate-400 hover:text-white underline flex items-center gap-1"
                                    >
                                      <Download className="w-3 h-3" /> Descargar Video Disponible
                                    </a>
                                  </div>
                                  <div className="bg-black/80 rounded-xl overflow-hidden border border-slate-800 aspect-video max-w-md mx-auto">
                                    <video
                                      key={`prev_${currentLangVideoUrl || otherLangVideoUrl}`}
                                      controls
                                      src={currentLangVideoUrl || otherLangVideoUrl}
                                      className="w-full h-full object-contain"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            /* VIDEO AL DÍA: Renderizado exitosamente con las voces y guion actuales */
                            <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 shadow-2xl space-y-4">
                              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                                <div className="flex items-center gap-2">
                                  <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                                  <span className="text-sm font-bold text-emerald-400">
                                    ¡Video MP4 1080p en {currentLangLabel} Renderizado con Éxito!
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
                                  key={currentLangVideoUrl}
                                  controls
                                  src={currentLangVideoUrl}
                                  className="w-full h-full object-contain"
                                />
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                                <div className="flex flex-wrap items-center gap-3">
                                  <a
                                    href={currentLangVideoUrl}
                                    download={`${currentProject.title.replace(
                                      /[^a-zA-Z0-9_-]/g,
                                      '_'
                                    )}_${isCurrentEs ? 'ES' : 'EN'}_1080p.mp4`}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition active:scale-95"
                                  >
                                    <Download className="w-5 h-5" />
                                    Descargar Video {currentLangLabel} (1080p)
                                  </a>

                                  {otherLangVideoUrl && (
                                    <a
                                      href={otherLangVideoUrl}
                                      download={`${currentProject.title.replace(
                                        /[^a-zA-Z0-9_-]/g,
                                        '_'
                                      )}_${isCurrentEs ? 'EN' : 'ES'}_1080p.mp4`}
                                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs px-4 py-3 rounded-xl flex items-center gap-2 border border-slate-700 transition"
                                    >
                                      <Download className="w-4 h-4 text-amber-400" />
                                      Descargar También {otherLangLabel}
                                    </a>
                                  )}

                                  <button
                                    onClick={() => setActiveStep(7)}
                                    className="bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-sm px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-red-600/20 transition active:scale-95"
                                  >
                                    <Youtube className="w-5 h-5" />
                                    Crear Miniatura & Empaque (Paso 7) →
                                  </button>
                                </div>

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
                                    onClick={() => handleRenderVideo(isCurrentEs ? 'es' : 'en')}
                                    className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 font-semibold text-xs px-4 py-2.5 rounded-lg flex items-center gap-2 border border-slate-700 transition"
                                  >
                                    <RefreshCw
                                      className={`w-3.5 h-3.5 ${
                                        isRendering ? 'animate-spin text-blue-400' : ''
                                      }`}
                                    />
                                    {isRendering ? 'Renderizando...' : `Volver a Renderizar (${currentLangLabel})`}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

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

                      <div className="pt-2 text-center">
                        <button
                          onClick={() => setActiveStep(7)}
                          className="bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-sm px-8 py-3.5 rounded-xl flex items-center gap-2.5 mx-auto shadow-lg shadow-red-600/25 transition active:scale-95"
                        >
                          <Youtube className="w-5 h-5" />
                          Abrir Estudio Completo de Miniaturas & SEO YouTube (Paso 7) →
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* PASO 7: Miniatura & Empaque de YouTube */}
                {activeStep === 7 && currentProject && selectedChannel && (
                  <YouTubeStudio
                    project={currentProject}
                    channel={selectedChannel}
                    onUpdateProject={(updated, msg) => {
                      setCurrentProject(updated);
                      persistProjectUpdate(updated, msg);
                    }}
                    showToast={showToast}
                  />
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* Modal de Creación / Configuración de Canal Independiente */}
      <ChannelModal
        isOpen={channelModalMode !== null}
        mode={channelModalMode || 'create'}
        initialChannel={selectedChannel}
        voiceCatalog={voiceCatalog}
        onClose={() => setChannelModalMode(null)}
        onSaved={(savedChannel, isNew) => {
          setChannels((prev) => {
            const exists = prev.some((c) => c.channel_id === savedChannel.channel_id);
            if (exists) {
              return prev.map((c) =>
                c.channel_id === savedChannel.channel_id ? savedChannel : c
              );
            }
            return [...prev, savedChannel];
          });
          setSelectedChannel(savedChannel);
          if (isNew) {
            setStudioSection('production');
            setActiveStep(1);
            showToast(
              `🎉 ¡Nuevo canal "${savedChannel.display_title}" creado con éxito! Ya puedes agregar historias o vincular su Google Sheet.`
            );
          } else {
            loadSheetItems(false, savedChannel.channel_id);
            showToast(`⚙️ Configuración de "${savedChannel.display_title}" actualizada.`);
          }
        }}
      />

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

      {/* MODAL 1: Creador Asistido de Personajes (Foto Frontal Real & Estilo IA) */}
      {charCreatorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {charCreatorType === 'channel_lore_cast'
                      ? 'Crear Personaje con Lore del Canal / Doble Recurrente'
                      : 'Crear Figura Individual con Foto Real & Estilo'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {charCreatorType === 'channel_lore_cast'
                      ? 'Personaje consistente para usar como relleno o ciudadano en historias del canal.'
                      : 'Pasa una foto real de frente para guiar las facciones de la IA y evitar que alucine.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCharCreatorModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selector de Tipo */}
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setCharCreatorType('real_person')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  charCreatorType === 'real_person'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                Figura Real (Rostro Específico)
              </button>

              <button
                type="button"
                onClick={() => setCharCreatorType('channel_lore_cast')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  charCreatorType === 'channel_lore_cast'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Star className="w-3.5 h-3.5" />
                Lore del Canal / Doble
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
                  Nombre del Personaje:
                </label>
                <input
                  type="text"
                  placeholder="Ej: David Karp, Marissa Mayer, Sam Bankman-Fried, Juanito..."
                  value={charCreatorName}
                  onChange={(e) => setCharCreatorName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
                  Rol o Empresa:
                </label>
                <input
                  type="text"
                  placeholder="Ej: Fundador de Tumblr, CEO de Yahoo, Ingeniero Principal..."
                  value={charCreatorRole}
                  onChange={(e) => setCharCreatorRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Subida de Foto Real Frontal */}
              <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-blue-400" />
                    Foto Frontal del Personaje Real (Recomendada):
                  </label>
                  {charCreatorRefPhotoBase64 && (
                    <button
                      onClick={() => setCharCreatorRefPhotoBase64(null)}
                      className="text-[10px] text-rose-400 hover:text-rose-300 transition"
                    >
                      Quitar foto
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  💡 Si pasas una foto real de frente, la IA capturará la estructura de sus ojos, nariz, boca y pelo para adaptarlo al estilo sin alucinar un rostro distinto.
                </p>

                <input
                  ref={modalCharRefFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const b64 = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(String(reader.result));
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                      });
                      setCharCreatorRefPhotoBase64(b64);
                      e.target.value = '';
                    }
                  }}
                />

                {charCreatorRefPhotoBase64 ? (
                  <div className="flex items-center gap-3 bg-slate-900 border border-emerald-500/40 p-2.5 rounded-xl">
                    <img
                      src={charCreatorRefPhotoBase64}
                      alt="Referencia"
                      className="w-14 h-14 object-cover rounded-lg border border-slate-700 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Foto Frontal Vinculada
                      </div>
                      <div className="text-[11px] text-slate-400">
                        La IA usará esta fotografía real como referencia facial.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => modalCharRefFileInputRef.current?.click()}
                      className="text-xs text-blue-400 hover:text-blue-300 font-semibold px-2 py-1 rounded bg-slate-800"
                    >
                      Cambiar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => modalCharRefFileInputRef.current?.click()}
                    className="w-full py-3 px-4 border border-dashed border-slate-700 hover:border-blue-500/80 rounded-xl bg-slate-900/50 hover:bg-slate-900 text-slate-300 flex items-center justify-center gap-2 transition"
                  >
                    <Upload className="w-4 h-4 text-blue-400" />
                    <span>Seleccionar Foto Real de Frente (PNG/JPG/WebP)</span>
                  </button>
                )}
              </div>

              {/* Selector de Estilo Artístico */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Estilo de Renderizado IA:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {CHARACTER_STYLE_PRESET_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setCharCreatorStylePreset(opt.id)}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        charCreatorStylePreset === opt.id
                          ? 'bg-purple-950/40 border-purple-500 ring-1 ring-purple-500/50 text-white'
                          : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <div className="text-xs font-bold">{opt.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Instrucciones adicionales de estilo (opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ej: traje oscuro, iluminación lateral cálida, expresión seria..."
                  value={charCreatorCustomStyle}
                  onChange={(e) => setCharCreatorCustomStyle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="genImmediately"
                  checked={charCreatorGenerateImmediately}
                  onChange={(e) => setCharCreatorGenerateImmediately(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="genImmediately" className="text-xs text-slate-300 cursor-pointer">
                  Generar retrato 3D automáticamente con IA al crear
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCharCreatorModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={!charCreatorName.trim() || isGeneratingPortrait}
                onClick={handleConfirmCreateNewCharacter}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-lg shadow-purple-600/20 transition"
              >
                {isGeneratingPortrait ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {isGeneratingPortrait ? 'Creando y Renderizando...' : 'Crear Personaje'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Selector de Foto Real de Referencia (Wikipedia / Wikimedia / Google) */}
      {refPickerOpen && refPickerChar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                  <Search className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Foto Real de Referencia
                    <span className="text-xs text-indigo-300 font-normal">({refPickerChar.name})</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Búsqueda en Wikipedia, Wikimedia Commons y Google Imágenes
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRefPickerOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Barra de búsqueda manual */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearchRefCandidates(refPickerQuery);
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={refPickerQuery}
                onChange={(e) => setRefPickerQuery(e.target.value)}
                placeholder="Nombre o alias del personaje..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={isSearchingRefPhotos || !refPickerQuery.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition disabled:opacity-50 shrink-0"
              >
                {isSearchingRefPhotos ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                Buscar
              </button>
            </form>

            {/* Galería de candidatos */}
            <div className="flex-1 overflow-y-auto pr-1">
              {isSearchingRefPhotos ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                  <p className="text-xs">Buscando retratos libres en Wikimedia y Wikipedia...</p>
                </div>
              ) : refPickerCandidates.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Camera className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="text-xs font-semibold">No se encontraron fotos automáticamente</p>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    Prueba cambiando el término de búsqueda o sube una foto manualmente con el botón Subir.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {refPickerCandidates.map((cand, idx) => (
                    <div
                      key={idx}
                      className="group relative bg-slate-950 border border-slate-800 hover:border-indigo-500 rounded-xl overflow-hidden flex flex-col transition cursor-pointer shadow-md"
                      onClick={() => !isApplyingRefPhoto && handleApplyRefCandidate(cand)}
                    >
                      <div className="aspect-square w-full bg-slate-900 relative overflow-hidden flex items-center justify-center">
                        <img
                          src={cand.thumbUrl || cand.url}
                          alt={cand.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          loading="lazy"
                        />
                        <span className="absolute top-1.5 right-1.5 bg-black/70 backdrop-blur text-[8px] text-slate-300 px-1.5 py-0.5 rounded uppercase font-bold">
                          {cand.source === 'wikimedia_commons' ? 'Commons' : cand.source}
                        </span>
                      </div>
                      <div className="p-2 flex-1 flex flex-col justify-between space-y-1">
                        <p className="text-[10px] text-slate-300 line-clamp-2 leading-tight" title={cand.title}>
                          {cand.title}
                        </p>
                        <button
                          type="button"
                          disabled={isApplyingRefPhoto}
                          className="w-full mt-1 bg-indigo-600/30 group-hover:bg-indigo-600 text-indigo-200 group-hover:text-white text-[10px] font-semibold py-1 rounded transition"
                        >
                          Usar esta foto
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer con estado y cancelar */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400">
                {isApplyingRefPhoto ? 'Descargando y vinculando imagen...' : `${refPickerCandidates.length} candidatas encontradas`}
              </span>
              <button
                type="button"
                onClick={() => setRefPickerOpen(false)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Advertencia Preventiva de Generación Masiva */}
      {confirmGenerateAllOpen && currentProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">
                  ¿Generar las {currentProject.scenes.length} escenas de una vez?
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Has solicitado generar todas las imágenes del video al mismo tiempo. Sin embargo,{' '}
                  <strong className="text-amber-300">
                    si un personaje tiene algún rasgo que no te gusta o alucina, todas las escenas saldrán mal
                  </strong>{' '}
                  y tendrás que regenerarlas, perdiendo tiempo y cuota de IA.
                </p>
                <p className="text-xs text-emerald-400 pt-1 font-semibold">
                  💡 Te recomendamos generar primero la <strong>Escena 1 de Prueba</strong> (tarda solo unos segundos) para verificar al personaje en plano 16:9 cinematográfico.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmGenerateAllOpen(false)}
                className="w-full sm:w-auto px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => {
                  setConfirmGenerateAllOpen(false);
                  handleGeneratePilotScene();
                }}
                className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20 transition"
              >
                <Play className="w-3.5 h-3.5" />
                1. Probar Solo Escena 1 Primero (Recomendado)
              </button>

              <button
                type="button"
                onClick={() => {
                  setConfirmGenerateAllOpen(false);
                  handleGenerateImages();
                }}
                className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold px-4 py-2.5 rounded-lg transition"
              >
                Continuar con Todo el Lote
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Alerta de Error de Retrato Fiel */}
      {portraitErrorMessage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setPortraitErrorMessage(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  No se pudo generar el Retrato Fiel
                </h3>
                <p className="text-xs text-slate-400">
                  Protección anti-alucinaciones activada: se detuvo el fallback a caras aleatorias.
                </p>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2 text-xs text-slate-300">
              <div className="font-semibold text-rose-300">Detalle del error del motor:</div>
              <p className="font-mono text-[11px] bg-slate-900 p-2.5 rounded-lg border border-slate-800 break-words whitespace-pre-wrap text-slate-300 max-h-40 overflow-y-auto">
                {portraitErrorMessage}
              </p>
              <div className="text-[11px] text-slate-400 leading-relaxed pt-1">
                {portraitErrorMessage.includes('depleted') || portraitErrorMessage.includes('402') || portraitErrorMessage.includes('SERVICE_BLOCKED') || portraitErrorMessage.includes('Vertex') ? (
                  <span>
                    💡 <strong>Solución:</strong> Tus créditos de Google Cloud Vertex AI ($300 USD) están disponibles para usarse. Configura tu Project ID o Service Account para activar el motor multimodal de alta fidelidad.
                  </span>
                ) : (
                  <span>
                    Para preservar el parecido físico exacto de una persona real, se requiere un motor multimodal (Google Vertex AI o Gemini) capaz de transformar la foto de referencia.
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setPortraitErrorMessage(null)}
                className="text-xs text-slate-400 hover:text-white px-3 py-2 transition"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => {
                  setPortraitErrorMessage(null);
                  setActiveEngineTab('vertex');
                  setVertexModalOpen(true);
                }}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-lg shadow-blue-600/20 transition flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Configurar Google Cloud Vertex AI ($300 Crédito)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Unificado de Configuración de Motores de IA (Google Vertex AI & Agnes AI) */}
      {(vertexModalOpen || agnesModalOpen) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setVertexModalOpen(false);
                setAgnesModalOpen(false);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Pestañas de selección de motor */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <button
                type="button"
                onClick={() => setActiveEngineTab('vertex')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition ${
                  activeEngineTab === 'vertex'
                    ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                Google Cloud Vertex AI ($300 USD Crédito)
                <span className="text-[10px] bg-blue-500/30 text-blue-200 px-1.5 py-0.5 rounded font-mono font-semibold">
                  Recomendado
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveEngineTab('agnes')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition ${
                  activeEngineTab === 'agnes'
                    ? 'bg-fuchsia-600/20 text-fuchsia-300 border border-fuchsia-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
                Agnes AI (Gratis)
              </button>
            </div>

            {activeEngineTab === 'vertex' ? (
              /* PANEL VERTEX AI */
              <div className="space-y-4 text-xs">
                <div className="bg-gradient-to-br from-blue-950/40 via-indigo-950/30 to-slate-900 border border-blue-500/30 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-bold text-sm flex items-center gap-2">
                      ☁️ Google Cloud Vertex AI & Imagen 3
                    </span>
                    <span
                      className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                        configStatus?.hasVertex
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {configStatus?.hasVertex ? '✓ Conectado a GCP' : 'Crédito $300 Listo para Conectar'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Utiliza tu crédito gratuito de <strong>$300 USD</strong> de Google Cloud Platform para generar retratos fieles con <strong>Gemini Multimodal</strong> e imágenes 16:9 ultra-fotorrealistas con <strong>Imagen 3</strong>.
                  </p>
                  <div className="text-[10px] text-blue-300/80 bg-blue-950/50 p-2 rounded border border-blue-800/50">
                    💡 <strong>Para usar el crédito con API Key:</strong> En GCP Console &gt; <em>APIs &amp; Services &gt; Credentials</em>, edita tu API Key y asegúrate de que tenga habilitada la <strong>Vertex AI API</strong> (o marca &quot;Don&apos;t restrict key&quot;). O pega un JSON de Service Account abajo para omitir cualquier restricción.
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Project ID o Número de Proyecto GCP:
                    </label>
                    <input
                      type="text"
                      placeholder="ej: 407759962191 o mi-proyecto-gcp"
                      value={vertexProjectIdInput}
                      onChange={(e) => setVertexProjectIdInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Ubicación / Región GCP:
                    </label>
                    <input
                      type="text"
                      placeholder="us-central1"
                      value={vertexLocationInput}
                      onChange={(e) => setVertexLocationInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Google Cloud API Key (opcional si usas Service Account):
                  </label>
                  <input
                    type="password"
                    placeholder="AIzaSy... (API Key de tu proyecto Google Cloud)"
                    value={vertexApiKeyInput}
                    onChange={(e) => setVertexApiKeyInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-semibold">
                      Service Account Key JSON (Método 100% Robusto):
                    </label>
                    <span className="text-[10px] text-slate-500">
                      Evita cualquier bloqueo de API Key
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    placeholder="Pega aquí el contenido JSON descargado de tu Service Account (con rol Vertex AI User o roles/aiplatform.user)..."
                    value={vertexServiceAccountJson}
                    onChange={(e) => setVertexServiceAccountJson(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono text-[11px]"
                  />
                </div>

                {vertexTestStatus && (
                  <div
                    className={`p-3 rounded-lg border text-[11px] leading-relaxed ${
                      vertexTestStatus.success
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                    }`}
                  >
                    <div className="font-semibold mb-0.5">
                      {vertexTestStatus.success ? '✓ Conexión con Vertex AI Confirmada:' : '⚠️ Diagnóstico de Conexión:'}
                    </div>
                    <div>{vertexTestStatus.message}</div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-slate-800 gap-2">
                  <button
                    type="button"
                    disabled={vertexTesting}
                    onClick={handleTestVertex}
                    className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-blue-300 border border-blue-500/30 text-xs font-semibold px-3 py-2 rounded-lg transition"
                  >
                    {vertexTesting ? 'Probando Vertex AI...' : '🔍 Probar Conexión con Vertex AI'}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setVertexModalOpen(false);
                        setAgnesModalOpen(false);
                      }}
                      className="text-xs text-slate-400 hover:text-white px-3 py-2 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={vertexSaving}
                      onClick={handleSaveVertex}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-lg shadow-blue-600/20 transition"
                    >
                      {vertexSaving ? 'Guardando...' : 'Guardar en .env'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* PANEL AGNES AI */
              <div className="space-y-4 text-xs">
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Estado actual de Agnes:</span>
                    <span
                      className={`font-semibold px-2 py-0.5 rounded ${
                        configStatus?.hasAgnes
                          ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {configStatus?.hasAgnes ? '✓ Agnes AI Conectado y Activo' : 'Sin clave configurada'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 leading-relaxed">
                    ¿Aún no tienes clave? Puedes obtenerla de forma gratuita registrándote en{' '}
                    <a
                      href="https://platform.agnes-ai.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-fuchsia-400 hover:text-fuchsia-300 underline font-semibold inline-flex items-center gap-0.5"
                    >
                      platform.agnes-ai.com
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Agnes API Key:
                  </label>
                  <input
                    type="password"
                    placeholder="Pega aquí tu clave API de Agnes AI..."
                    value={agnesApiKeyInput}
                    onChange={(e) => setAgnesApiKeyInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-fuchsia-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Modelo de Imagen Preferido:
                  </label>
                  <select
                    value={agnesModelInput}
                    onChange={(e) => setAgnesModelInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-fuchsia-500"
                  >
                    <option value="agnes-image-2.1-flash">agnes-image-2.1-flash (Recomendado - Ultra Rápido y 16:9)</option>
                    <option value="agnes-image-2.5-flash">agnes-image-2.5-flash (Alta Densidad Visual)</option>
                    <option value="agnes-image-2.0-flash">agnes-image-2.0-flash (Estándar)</option>
                  </select>
                </div>

                {agnesTestStatus && (
                  <div
                    className={`p-3 rounded-lg border text-[11px] ${
                      agnesTestStatus.success
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                    }`}
                  >
                    {agnesTestStatus.message}
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-slate-800 gap-2">
                  <button
                    type="button"
                    disabled={agnesTesting || !agnesApiKeyInput.trim()}
                    onClick={handleTestAgnesKey}
                    className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-xs font-semibold px-3 py-2 rounded-lg transition"
                  >
                    {agnesTesting ? 'Probando...' : '🔍 Verificar Clave'}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setVertexModalOpen(false);
                        setAgnesModalOpen(false);
                      }}
                      className="text-xs text-slate-400 hover:text-white px-3 py-2 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={agnesSaving}
                      onClick={handleSaveAgnesKey}
                      className="bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-lg shadow-fuchsia-600/20 transition"
                    >
                      {agnesSaving ? 'Guardando...' : 'Guardar en .env'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
