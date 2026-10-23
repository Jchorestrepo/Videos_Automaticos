export interface SignatureCues {
  openings: string[];
  transitions: string[];
  closings: string[];
}

export interface NarratorConfig {
  name: string;
  archetype: string;
  tone: string;
  perspective: string;
  target_wpm: number;
  style_rules?: string[];
  signature_cues: SignatureCues;
  key_vocabulary: string[];
  forbidden_phrases: string[];
}

export interface VisualStyleConfig {
  engine: string;
  aspect_ratio: string;
  art_style_name?: string;
  prompt_prefix: string;
  prompt_suffix: string;
  default_foley?: string;
  core_aesthetic?: string;
  lighting?: string;
  character_consistency_rule?: string;
  color_palette?: string[];
  negative_prompt?: string;
}

export interface SheetsIntegrationConfig {
  enabled?: boolean;
  sheet_url?: string;
  status_column?: string;
  finished_column?: string;
  columns_mapping?: Record<string, string>;
}

export interface ChannelPersona {
  channel_id: string;
  name: string;
  display_title: string;
  niche: string;
  language: string;
  target_audience: string;
  cpm_tier: string;
  default_voice_id?: string;
  default_voice_engine?: 'voicestudio' | 'elevenlabs' | 'openai';
  narrator: NarratorConfig;
  visual_style: VisualStyleConfig;
  sheets_integration?: SheetsIntegrationConfig;
}

export type StoryTaskStatus =
  | 'idea'
  | 'approved'
  | 'scripted'
  | 'in_production'
  | 'completed'
  | 'published';

export interface SheetVideoItem {
  id: string;
  channel_id?: string;
  rowIndex?: number;
  title: string;
  characterCompany: string;
  conflict: string;
  sources: string[];
  status?: StoryTaskStatus;
  approved: boolean;
  finished: boolean;
  published: boolean;
  archived?: boolean;
  linkedProjectId?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}


export interface VisualAssetMetadata {
  id: string;
  url: string;
  prompt: string;
  description?: string;
  characterId?: string;
  characterName?: string;
  characterIds?: string[];
  characterNames?: string[];
  isGroupShot?: boolean;
  placeOrEnvironment?: string;
  companyOrSubject?: string;
  shotType?: ShotType;
  tags?: string[];
  sourceProjectId?: string;
  sourceSceneId?: number;
  createdAt: string;
}

export interface ChannelCharacterLore {
  age?: string;
  personality_traits: string[];
  peculiarities: string[];
  channel_backstory: string;
  reusable_archetypes: string[];
  appearances?: Array<{
    project_id: string;
    title: string;
    role_in_story: string;
  }>;
}

export type CharacterCategory = 'real_person' | 'company_or_brand' | 'channel_lore_cast';

export interface CharacterProfile {
  character_id: string;
  channel_id: string;
  name: string;
  role: string;
  real_person: boolean;
  character_category?: CharacterCategory;
  entity_type?: 'person' | 'company' | 'institution';
  age?: string;
  visual_notes?: string;
  known_face?: boolean;
  company_or_affiliation?: string;
  channel_lore?: ChannelCharacterLore;
  anchor_prompt: string;
  signature_props: string[];
  canonical_image_url?: string;
  real_reference_image_url?: string;
  custom_style_prompt?: string;
  preferred_style_preset?: string;
  portrait_approved?: boolean;
  custom_uploaded?: boolean;
  reference_gallery?: string[];
  assets?: VisualAssetMetadata[];
  updatedAt?: string;
}

export interface WordTiming {
  word: string;
  startMs: number;
  endMs: number;
}

export type NarrativeBlockType =
  | 'hook_climax'
  | 'protagonist_origin'
  | 'antagonist_rival'
  | 'concept_explainer'
  | 'collision_collapse'
  | 'aftermath_verdict';

export type ShotType =
  | 'character_closeup'
  | 'environment_wide'
  | 'object_detail'
  | 'concept_diagram'
  | 'antagonist_shot'
  | 'symbolic_silhouette';

export interface ResearchCastMember {
  name: string;
  role: string;
  company?: string;
  known_face: boolean;
  narrative_role: 'protagonist' | 'antagonist' | 'secondary';
  suggested_archetype?: string;
}

export interface ResearchDossier {
  protagonist_profile: {
    name: string;
    role: string;
    backstory: string;
    greatest_achievement: string;
    psychological_flaw: string;
    known_face?: boolean;
  };
  antagonist_profile: {
    name: string;
    role: string;
    relationship_to_protagonist: string;
    key_move: string;
    known_face?: boolean;
  };
  cast_members?: ResearchCastMember[];
  core_concept_explainer: {
    concept_name: string;
    simple_definition: string;
    everyday_analogy: string;
    why_it_matters_here: string;
  };
  chronology: Array<{
    date_or_period: string;
    event: string;
  }>;
  hard_numbers: Array<{
    metric: string;
    label: string;
    context: string;
  }>;
  smoking_guns: string[];
  raw_sources_summary?: string;
}

export type EmotionalAnimationEffect =
  | 'none'
  | 'smoke_head'       // Humo o vapor de cólera/tensión saliendo de la cabeza
  | 'dizzy_wobble'     // Mareo, borrachera o desorientación ondulante
  | 'golden_glint'     // Partículas y destellos de oro/éxito
  | 'panic_heartbeat'  // Pulso cardíaco de pánico o estrés
  | 'rage_jitter';     // Micro-temblor de furia contenida

export type VisualMotionMode =
  | 'auto'              // Clasificación automática según shot_type
  | 'character_alive'   // Respiración, micro-parpadeo y profundidad 2.5D
  | 'cinematic_camera'  // Movimiento continuo de cámara (dolly, pan, crane)
  | 'dolly_in'
  | 'dolly_out'
  | 'pan_horizontal'
  | 'crane_vertical'
  | 'static_subtle';

export type MotionIntensityType = 'subtle' | 'standard' | 'dynamic' | number;

export interface SceneItem {
  scene_id: number;
  chapter: string;
  act_number?: number;
  act_name?: string;
  narrative_block?: NarrativeBlockType;
  shot_type?: ShotType;
  character_ids?: string[];
  highlight_metric?: string;
  highlight_label?: string;
  voiceover: string;
  visual_prompt: string;
  emotional_lighting?: string;
  camera_motion: 'zoom_in' | 'zoom_out' | 'pan_left' | 'pan_right' | 'static';
  ambient_sfx?: string;
  imageUrl?: string;
  videoUrl?: string; // Clip de video opcional que reemplaza la foto
  audioUrl?: string;
  voiceoverTextAtAudioGen?: string;
  durationInSeconds: number;
  audioDurationSeconds?: number;
  wordTimings?: WordTiming[];
  voiceRole?: 'primary' | 'secondary';
  voiceProfile?: string;
  imageReused?: boolean;
  reusedAssetPrompt?: string;
  motion_mode?: VisualMotionMode;
  character_effect?: EmotionalAnimationEffect;
}

export interface ProjectScript {
  project_id: string;
  channel_id: string;
  story_id?: string;
  lastActiveStep?: number;
  language?: 'es' | 'en';
  voiceEngine?: 'voicestudio' | 'elevenlabs' | 'openai';
  voiceMode?: 'single' | 'dual';
  primaryVoice?: string;
  secondaryVoice?: string;
  smartReuseImages?: boolean;
  title: string;
  hook: string;
  characterCompany?: string;
  characters?: CharacterProfile[];
  researchDossier?: ResearchDossier;
  targetDurationMinutes?: number;
  targetDurationRange?: DurationRange;
  artStyle?: string;
  scenes: SceneItem[];
  status: 'draft' | 'characters_ready' | 'audio_ready' | 'images_ready' | 'rendered';
  createdAt: string;
  updatedAt?: string;
  parent_project_id?: string;
  fork_type?: 'voice_only' | 'script_only';
  outputVideoUrl?: string;
  outputVideoUrlEs?: string;
  outputVideoUrlEn?: string;
  lastRenderedAt?: string;
  lastRenderedAtEs?: string;
  lastRenderedAtEn?: string;
  videoNeedsReRender?: boolean;
  thumbnailUrl?: string;
  youtubeMetadata?: YouTubePackagingData;
  spanishAudioUrl?: string;
  subtitlesEnUrl?: string;
  subtitlesEsUrl?: string;
  scenes_es?: Array<{
    scene_id: number;
    chapter_es: string;
    voiceover_es: string;
    audioUrl?: string;
    wordTimings?: WordTiming[];
    audioDurationSeconds?: number;
    highlight_metric?: string;
    highlight_label?: string;
  }>;
  scenes_en?: Array<{
    scene_id: number;
    chapter_en: string;
    voiceover_en: string;
    audioUrl?: string;
    wordTimings?: WordTiming[];
    audioDurationSeconds?: number;
    highlight_metric?: string;
    highlight_label?: string;
  }>;
}

export interface LocalizedMetadata {
  title: string;
  description: string;
  pinnedComment?: string;
}

export interface SuggestedTitleItem {
  title: string;
  category: 'curiosity' | 'drama' | 'story' | 'negative' | 'question' | 'direct';
  score?: number;
  hookExplanation: string;
}

export interface ThumbnailLayerConfig {
  backgroundUrl?: string;
  backgroundBrightness: number;
  backgroundContrast: number;
  backgroundVignette: boolean;
  characterId?: string;
  characterUrl?: string;
  characterPosition: 'left' | 'right' | 'center' | 'none';
  characterScale: number;
  characterGlow: boolean;
  characterGlowColor: string;
  textLine1: string;
  textLine2: string;
  stylePreset: 'yellow_black' | 'red_alert' | 'gold_luxury' | 'neon_cyan' | 'clean_white';
  fontFamily: 'Impact' | 'Anton' | 'Bebas Neue' | 'Montserrat Black' | 'Arial Black';
  fontSize: number;
  tiltAngle: number;
  badgeType: 'none' | 'arrow' | 'vs' | 'alert' | 'secret' | 'question';
  arrowAngle?: number;
}

export interface YouTubePackagingData {
  selectedTitle?: string;
  suggestedTitles?: SuggestedTitleItem[];
  suggestedThumbnailTexts?: string[];
  description?: string;
  hashtags?: string[];
  tags?: string[];
  pinnedComment?: string;
  communityPost?: string;
  thumbnailConfig?: ThumbnailLayerConfig;
  localizedEs?: LocalizedMetadata;
}

export interface JobProgressState {
  jobId: string;
  type: 'script' | 'images' | 'audio' | 'render' | 'portrait' | 'translate' | 'ai_adjust' | 'turbo_production';
  projectId?: string;
  channelId?: string;
  title: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  percent: number;
  phase: string;
  detail?: string;
  currentStep?: number;
  totalSteps?: number;
  startedAt: string;
  updatedAt: string;
  error?: string;
}

export interface VoiceCatalogItem {
  id: string;
  name: string;
  provider: 'voicestudio' | 'elevenlabs' | 'openai' | 'edge_neural';
  language: 'es' | 'en' | 'multilingual';
  gender: 'male' | 'female' | 'neutral';
  styleCategory:
    | 'thriller'
    | 'historical'
    | 'conversational'
    | 'clone'
    | 'dramatic'
    | 'thriller_documentary'
    | 'historical_epic'
    | 'conversational_dynamic';
  accent?: string;
  description: string;
  sampleUrl?: string;
  isCloned?: boolean;
  isFavorite?: boolean;
  avatarUrl?: string;
  refText?: string;
  labels?: Record<string, string> | string[];
}

export interface LaunchBatchItem {
  title: string;
  hook: string;
  characterCompany: string;
  conflict: string;
  whyItWorks: string;
  suggestedDurationMinutes: number;
}

export interface ChannelIncubatorConcept {
  suggestedNames: Array<{
    name: string;
    handle: string;
    tagline: string;
    rationale: string;
  }>;
  nicheAnalysis: {
    targetAudience: string;
    cpmTier: string;
    competitiveMoat: string;
  };
  recommendedNarrator: {
    archetype: string;
    tone: string;
    targetWpm: number;
    signatureOpenings: string[];
  };
  recommendedVisualStyle: {
    artStyleName: string;
    promptPrefix: string;
    lighting: string;
    colorPalette: string[];
  };
  launchBatch: LaunchBatchItem[];
}

export interface ChannelAuditReport {
  channelId: string;
  channelName: string;
  analyzedAt: string;
  healthScore: number;
  summaryDiagnosis: string;
  contentStrengths: string[];
  retentionRisks: string[];
  optimalDurationMinutes: string;
  packagingAdvice: string;
  franchiseIdeas: Array<{
    title: string;
    concept: string;
    targetAudience: string;
  }>;
  nextHitRecommendations: Array<{
    title: string;
    hook: string;
    characterCompany: string;
    conflict: string;
    strategicReason: string;
  }>;
}

export interface DurationRange {
  min: number;
  max: number;
}

export interface ReferencePhotoCandidate {
  url: string;
  thumbUrl: string;
  source: 'wikipedia' | 'wikimedia_commons' | 'google';
  title: string;
}

