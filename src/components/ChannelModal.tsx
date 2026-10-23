import React, { useState, useEffect } from 'react';
import {
  Tv,
  Plus,
  Settings,
  Save,
  Table,
  Sparkles,
  Mic,
  User,
} from 'lucide-react';
import type { ChannelPersona, VoiceCatalogItem } from '../types/index.ts';

interface ChannelModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialChannel?: ChannelPersona | null;
  voiceCatalog: VoiceCatalogItem[];
  onClose: () => void;
  onSaved: (savedChannel: ChannelPersona, isNew: boolean) => void;
}

export const ChannelModal: React.FC<ChannelModalProps> = ({
  isOpen,
  mode,
  initialChannel,
  voiceCatalog,
  onClose,
  onSaved,
}) => {
  const [name, setName] = useState('');
  const [displayTitle, setDisplayTitle] = useState('');
  const [niche, setNiche] = useState('');
  const [language, setLanguage] = useState<'es' | 'en'>('es');
  const [cpmTier, setCpmTier] = useState('Alto ($14 - $25 USD)');
  const [archetype, setArchetype] = useState('El Investigador Documental');
  const [tone, setTone] = useState(
    'Riguroso, cinematográfico, envolvente. Explica casos complejos con ritmo de thriller.'
  );
  const [targetWpm, setTargetWpm] = useState<number>(150);
  const [visualPrefix, setVisualPrefix] = useState(
    '3D Stylized Clay-Digital Diorama, high-end Pixar/Blender miniature aesthetic, tactile matte textures, dramatic volumetric rim lighting, 8k cinematic render'
  );
  const [sheetUrl, setSheetUrl] = useState('');
  const [defaultVoiceId, setDefaultVoiceId] = useState('gomorra');
  const [defaultVoiceEngine, setDefaultVoiceEngine] = useState<'voicestudio' | 'openai' | 'elevenlabs'>('voicestudio');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (mode === 'edit' && initialChannel) {
      setName(initialChannel.name || '');
      setDisplayTitle(initialChannel.display_title || initialChannel.name || '');
      setNiche(initialChannel.niche || '');
      setLanguage(initialChannel.language === 'en' ? 'en' : 'es');
      setCpmTier(initialChannel.cpm_tier || 'Alto ($14 - $25 USD)');
      setArchetype(initialChannel.narrator?.archetype || 'El Investigador Documental');
      setTone(initialChannel.narrator?.tone || '');
      setTargetWpm(initialChannel.narrator?.target_wpm || 150);
      setVisualPrefix(initialChannel.visual_style?.prompt_prefix || '');
      setSheetUrl(initialChannel.sheets_integration?.sheet_url || '');
      setDefaultVoiceId(initialChannel.default_voice_id || 'gomorra');
      setDefaultVoiceEngine(initialChannel.default_voice_engine || 'voicestudio');
    } else {
      setName('');
      setDisplayTitle('');
      setNiche('Crímenes Financieros, Misterios o Documentales');
      setLanguage('es');
      setCpmTier('Alto ($15 - $28 USD)');
      setArchetype('El Cronista Forense');
      setTone(
        'Cinematográfico, analítico y directo. Desglosa cada historia con suspenso e investigación profunda.'
      );
      setTargetWpm(150);
      setVisualPrefix(
        '3D Stylized Clay-Digital Diorama, high-end Pixar/Blender miniature aesthetic, tactile matte textures, dramatic volumetric rim lighting, 8k render'
      );
      setSheetUrl('');
      setDefaultVoiceId('gomorra');
      setDefaultVoiceEngine('voicestudio');
    }
  }, [isOpen, mode, initialChannel]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Escribe un nombre para el canal.');
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<ChannelPersona> = {
        ...(mode === 'edit' && initialChannel ? initialChannel : {}),
        channel_id:
          mode === 'edit' && initialChannel
            ? initialChannel.channel_id
            : name
                .trim()
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]+/g, '_')
                .replace(/^_+|_+$/g, ''),
        name: name.trim(),
        display_title: (displayTitle.trim() || name.trim()),
        language,
        niche: niche.trim() || 'Documentales',
        cpm_tier: cpmTier.trim() || 'Alto ($12 - $22 USD)',
        default_voice_id: defaultVoiceId,
        default_voice_engine: defaultVoiceEngine,
        narrator: {
          name: initialChannel?.narrator?.name || archetype.trim() || 'El Narrador',
          perspective: initialChannel?.narrator?.perspective || 'Tercera persona omnisciente',
          signature_cues: initialChannel?.narrator?.signature_cues || {
            openings: ['Todo parecía indicar que el éxito era inevitable...'],
            transitions: ['Pero detrás de escena, la realidad era otra.'],
            closings: ['Al final, la historia dejó una lección imborrable.'],
          },
          key_vocabulary: initialChannel?.narrator?.key_vocabulary || ['imperio', 'colapso', 'evidencia'],
          forbidden_phrases: initialChannel?.narrator?.forbidden_phrases || ['En este video veremos'],
          ...(mode === 'edit' && initialChannel?.narrator ? initialChannel.narrator : {}),
          archetype: archetype.trim() || 'Narrador Documental',
          tone: tone.trim() || 'Narrativa documental inmersiva.',
          style_rules: initialChannel?.narrator?.style_rules || [
            'Abrir siempre con un gancho impactante en los primeros 15 segundos.',
            'Dividir la historia en actos claros con contexto de los personajes.',
            'Explicar conceptos complejos con analogías visuales simples.',
          ],
          target_wpm: Number(targetWpm) || 150,
        },
        visual_style: {
          engine: initialChannel?.visual_style?.engine || 'gemini-imagen-3',
          aspect_ratio: initialChannel?.visual_style?.aspect_ratio || '16:9',
          art_style_name: initialChannel?.visual_style?.art_style_name || '3D Clay-Digital Diorama',
          prompt_suffix:
            initialChannel?.visual_style?.prompt_suffix ||
            'volumetric lighting, 8k cinematic render, no text',
          ...(mode === 'edit' && initialChannel?.visual_style
            ? initialChannel.visual_style
            : {
                core_aesthetic: '3D Stylized Clay-Digital Diorama',
                lighting: 'Dramatic volumetric rim lighting',
                character_consistency_rule:
                  'Mantener rasgos faciales y vestimenta idénticos en todas las escenas.',
                color_palette: ['#0B0F19', '#1E293B', '#38BDF8', '#F43F5E'],
                negative_prompt:
                  'photorealistic, 2d flat cartoon, anime, text, watermark, deformed hands',
              }),
          prompt_prefix: visualPrefix.trim(),
        },
        sheets_integration: {
          enabled: Boolean(sheetUrl.trim()),
          sheet_url: sheetUrl.trim() || undefined,
          status_column: initialChannel?.sheets_integration?.status_column || 'Aprobado',
          finished_column: initialChannel?.sheets_integration?.finished_column || 'Video Terminado',
          columns_mapping: initialChannel?.sheets_integration?.columns_mapping || {
            status: 'Estado',
            topic: 'Tema / Historia',
            angle: 'Enfoque / Gancho',
            script_output: 'Guion Generado',
            video_url: 'Link Video',
          },
        },
      };

      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error guardando canal');
      }

      onSaved(data.channel, mode === 'create');
      onClose();
    } catch (err: any) {
      alert(`Error guardando canal: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              {mode === 'create' ? <Plus className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {mode === 'create'
                  ? 'Crear Nuevo Canal Independiente'
                  : `Configurar Canal: ${initialChannel?.display_title}`}
              </h3>
              <p className="text-xs text-slate-400">
                Cada canal tiene sus propios proyectos, historias/tareas, personajes y hoja de Google Sheets independiente.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 text-xs font-semibold"
          >
            ✕ Cerrar
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* 1. Identidad del Canal */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <Tv className="w-3.5 h-3.5" /> 1. Identidad y Nicho del Canal
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Nombre Corto del Canal *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Imperios Caídos, Crímenes Financieros..."
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (mode === 'create' && !displayTitle) {
                      setDisplayTitle(e.target.value);
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Título Visible en el Selector (con Emoji opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: 🕵️‍♂️ Crímenes Financieros (Documentales)"
                  value={displayTitle}
                  onChange={(e) => setDisplayTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-2">
                <label className="text-slate-300 font-semibold block mb-1">
                  Nicho / Temática Principal
                </label>
                <input
                  type="text"
                  placeholder="Ej: Misterios históricos, Fraudes corporativos, Geopolítica..."
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3.5 py-2 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Idioma Base del Canal
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as 'es' | 'en')}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2 text-white focus:outline-none"
                >
                  <option value="es">🇪🇸 Español</option>
                  <option value="en">🇺🇸 Inglés</option>
                </select>
              </div>
            </div>
          </div>

          {/* 2. Personalidad del Narrador y Voz Predeterminada */}
          <div className="space-y-3 pt-3 border-t border-slate-800/80">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> 2. ADN del Narrador y Voz por Defecto (Banco de Voces Compartido)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-2">
                <label className="text-slate-300 font-semibold block mb-1">
                  Arquetipo del Narrador
                </label>
                <input
                  type="text"
                  value={archetype}
                  onChange={(e) => setArchetype(e.target.value)}
                  placeholder="Ej: El Investigador Forense / El Viajero del Tiempo"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl px-3.5 py-2 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Velocidad (Palabras/min)
                </label>
                <input
                  type="number"
                  min={110}
                  max={200}
                  value={targetWpm}
                  onChange={(e) => setTargetWpm(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl px-3.5 py-2 text-white focus:outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">
                Tono Narrativo e Instrucciones de Guion
              </label>
              <textarea
                rows={2}
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl p-3 text-white focus:outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
              <div>
                <label className="text-slate-300 font-semibold flex items-center gap-1.5 mb-1">
                  <Mic className="w-3.5 h-3.5 text-indigo-400" /> Voz Predeterminada para este Canal:
                </label>
                <select
                  value={defaultVoiceId}
                  onChange={(e) => {
                    const vId = e.target.value;
                    setDefaultVoiceId(vId);
                    const found = voiceCatalog.find((v) => v.id === vId);
                    if (found) {
                      setDefaultVoiceEngine(
                        found.provider === 'voicestudio'
                          ? 'voicestudio'
                          : found.provider === 'elevenlabs'
                          ? 'elevenlabs'
                          : 'openai'
                      );
                    }
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none"
                >
                  <option value="gomorra">⚡ Gomorra (VoiceStudio Local RTX 3080)</option>
                  {voiceCatalog.map((v) => (
                    <option key={`${v.provider}-${v.id}`} value={v.id}>
                      {v.provider === 'voicestudio'
                        ? '⚡ '
                        : v.provider === 'elevenlabs'
                        ? '✨ '
                        : '🤖 '}
                      {v.name} ({v.language.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  CPM Estimado / Categoría
                </label>
                <input
                  type="text"
                  value={cpmTier}
                  onChange={(e) => setCpmTier(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-emerald-400 font-semibold focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 3. Estilo Visual y Hoja de Google Sheets Propia */}
          <div className="space-y-3 pt-3 border-t border-slate-800/80">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Table className="w-3.5 h-3.5" /> 3. Google Sheets del Canal y Estilo Visual 3D
            </h4>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">
                URL de Google Sheet de este Canal (Opcional — pega el link normal o CSV para importar ideas):
              </label>
              <input
                type="text"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/.../edit#gid=0 (o déjalo vacío para gestionar ideas directo aquí)"
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-slate-200 font-mono text-[11px] focus:outline-none"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Puedes pegar el enlace normal de tu hoja pública de Google Sheets; el sistema lo convierte automáticamente a CSV y guarda el estado de tus tareas localmente por canal.
              </p>
            </div>

            <div>
              <label className="text-slate-300 font-semibold flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Prompt Base de Estética Visual (Prefijo IA):
              </label>
              <textarea
                rows={2}
                value={visualPrefix}
                onChange={(e) => setVisualPrefix(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl p-2.5 text-slate-300 font-mono text-[11px] focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-blue-600/25 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving
                ? 'Guardando...'
                : mode === 'create'
                ? 'Crear Canal Ahora'
                : 'Guardar Cambios del Canal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
