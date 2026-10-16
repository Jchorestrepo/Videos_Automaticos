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

export interface CharacterProfile {
  character_id: string;
  channel_id: string;
  name: string;
  role: string;
  real_person: boolean;
  anchor_prompt: string;
  signature_props: string[];
  canonical_image_url?: string;
}

export interface WordTiming {
  word: string;
  startMs: number;
  endMs: number;
}

export interface SceneItem {
  scene_id: number;
  chapter: string;
  act_name?: string;
  voiceover: string;
  visual_prompt: string;
  emotional_lighting?: string;
  camera_motion: 'zoom_in' | 'zoom_out' | 'pan_left' | 'pan_right' | 'static';
  ambient_sfx?: string;
  imageUrl?: string;
  audioUrl?: string;
  durationInSeconds: number;
  wordTimings?: WordTiming[];
}

export interface ProjectScript {
  project_id: string;
  channel_id: string;
  title: string;
  hook: string;
  characterCompany?: string;
  characters?: CharacterProfile[];
  artStyle?: string;
  scenes: SceneItem[];
  status: 'draft' | 'characters_ready' | 'audio_ready' | 'images_ready' | 'rendered';
  createdAt: string;
  outputVideoUrl?: string;
  thumbnailUrl?: string;
}
