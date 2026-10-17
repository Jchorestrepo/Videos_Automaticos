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
}

export interface SheetsIntegrationConfig {
  sheet_url: string;
  status_column: string;
  finished_column: string;
}

export interface ChannelPersona {
  channel_id: string;
  name: string;
  display_title: string;
  niche: string;
  language: string;
  target_audience: string;
  cpm_tier: string;
  narrator: NarratorConfig;
  visual_style: VisualStyleConfig;
  sheets_integration?: SheetsIntegrationConfig;
}

export interface SheetVideoItem {
  id: string;
  rowIndex: number;
  title: string;
  characterCompany: string;
  conflict: string;
  sources: string[];
  approved: boolean;
  finished: boolean;
  published: boolean;
}

export interface VisualAssetMetadata {
  id: string;
  url: string;
  prompt: string;
  description?: string;
  characterId?: string;
  characterName?: string;
  placeOrEnvironment?: string;
  companyOrSubject?: string;
  shotType?: ShotType;
  tags?: string[];
  createdAt: string;
}

export interface CharacterProfile {
  character_id: string;
  channel_id: string;
  name: string;
  role: string;
  real_person: boolean;
  anchor_prompt: string;
  signature_props: string[];
  canonical_image_url?: string;
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

export interface ResearchDossier {
  protagonist_profile: {
    name: string;
    role: string;
    backstory: string;
    greatest_achievement: string;
    psychological_flaw: string;
  };
  antagonist_profile: {
    name: string;
    role: string;
    relationship_to_protagonist: string;
    key_move: string;
  };
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

export interface SceneItem {
  scene_id: number;
  chapter: string;
  act_number?: number;
  act_name?: string;
  narrative_block?: NarrativeBlockType;
  shot_type?: ShotType;
  highlight_metric?: string;
  highlight_label?: string;
  voiceover: string;
  visual_prompt: string;
  emotional_lighting?: string;
  camera_motion: 'zoom_in' | 'zoom_out' | 'pan_left' | 'pan_right' | 'static';
  ambient_sfx?: string;
  imageUrl?: string;
  audioUrl?: string;
  durationInSeconds: number;
  wordTimings?: WordTiming[];
  voiceRole?: 'primary' | 'secondary';
  voiceProfile?: string;
  imageReused?: boolean;
  reusedAssetPrompt?: string;
}

export interface ProjectScript {
  project_id: string;
  channel_id: string;
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
  artStyle?: string;
  scenes: SceneItem[];
  status: 'draft' | 'characters_ready' | 'audio_ready' | 'images_ready' | 'rendered';
  createdAt: string;
  updatedAt?: string;
  parent_project_id?: string;
  fork_type?: 'voice_only' | 'script_only';
  outputVideoUrl?: string;
  thumbnailUrl?: string;
}

