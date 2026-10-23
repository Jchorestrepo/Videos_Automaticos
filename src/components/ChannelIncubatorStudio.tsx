import React, { useState, useEffect } from 'react';
import {
  Rocket,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  Tv,
  Users,
  Compass,
  ArrowRight,
  Flame,
  Check,
  RefreshCw,
  Image as ImageIcon,
  Shield,
  Layers,
  Award,
  AlertTriangle,
  Lightbulb,
  ExternalLink,
  Target,
  Clock,
  PlayCircle,
  FolderPlus,
  Palette,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';
import type {
  ChannelPersona,
  ChannelIncubatorConcept,
  ChannelAuditReport,
  LaunchBatchItem,
} from '../types/index.ts';

interface ChannelIncubatorStudioProps {
  channels: ChannelPersona[];
  activeChannel: ChannelPersona | null;
  onSelectChannel: (channel: ChannelPersona) => void;
  onChannelCreated: (newChannel: ChannelPersona) => void;
  onNavigateToProduction: (channelId: string) => void;
  showToast: (msg: string) => void;
}

export function ChannelIncubatorStudio({
  channels,
  activeChannel,
  onSelectChannel,
  onChannelCreated,
  onNavigateToProduction,
  showToast,
}: ChannelIncubatorStudioProps) {
  const [activeTab, setActiveTab] = useState<'incubator' | 'audit'>('incubator');

  // Estados de Incubación
  const [nicheIdea, setNicheIdea] = useState('');
  const [preferredTone, setPreferredTone] = useState(
    'Cinematográfico, analítico, con ritmo de thriller y suspenso forense'
  );
  const [isBrainstorming, setIsBrainstorming] = useState(false);
  const [concept, setConcept] = useState<ChannelIncubatorConcept | null>(null);
  const [selectedNameIndex, setSelectedNameIndex] = useState<number>(0);
  const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);
  const [isGeneratingBanner, setIsGeneratingBanner] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);

  // Estados de Auditoría
  const [auditReport, setAuditReport] = useState<ChannelAuditReport | null>(null);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [injectedHits, setInjectedHits] = useState<string[]>([]);

  // Cargar reporte guardado al cambiar de canal o entrar a pestaña auditoría
  useEffect(() => {
    if (!activeChannel) return;
    loadSavedAudit(activeChannel.channel_id);
  }, [activeChannel?.channel_id]);

  const loadSavedAudit = async (channelId: string, force: boolean = false) => {
    setIsLoadingAudit(true);
    try {
      const res = await fetch(`/api/channels/${channelId}/audit?force=${force}`);
      const data = await res.json();
      if (data.success && data.report) {
        setAuditReport(data.report);
      }
    } catch (err) {
      console.error('Error cargando auditoría:', err);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  // 1. Incubar Propuesta con IA
  const handleBrainstorm = async () => {
    if (!nicheIdea.trim()) {
      showToast('Por favor escribe una idea o tema para el canal.');
      return;
    }
    setIsBrainstorming(true);
    try {
      const res = await fetch('/api/channels/incubator/brainstorm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: nicheIdea.trim(),
          preferredTone,
          language: 'es',
        }),
      });
      const data = await res.json();
      if (data.success && data.concept) {
        setConcept(data.concept);
        setSelectedNameIndex(0);
        setLogoUrl(null);
        setBannerUrl(null);
        showToast('✨ ¡Estrategia y Lote de Lanzamiento incubados con éxito!');
      }
    } catch (err) {
      console.error('Error incubando canal:', err);
      showToast('Error de conexión al incubar propuesta.');
    } finally {
      setIsBrainstorming(false);
    }
  };

  // 2. Generar Logo 1:1 o Banner con IA
  const handleGenerateAsset = async (type: 'logo' | 'banner') => {
    if (!concept) return;
    const selectedName = concept.suggestedNames[selectedNameIndex]?.name || 'Canal';
    const tempId = selectedName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 24);

    if (type === 'logo') setIsGeneratingLogo(true);
    else setIsGeneratingBanner(true);

    try {
      const res = await fetch('/api/channels/incubator/generate-asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: tempId,
          type,
          prompt: `${selectedName} (${concept.nicheAnalysis.targetAudience})`,
          aesthetic: concept.recommendedVisualStyle.promptPrefix,
        }),
      });
      const data = await res.json();
      if (data.success && data.publicUrl) {
        if (type === 'logo') setLogoUrl(data.publicUrl);
        else setBannerUrl(data.publicUrl);
        showToast(`✓ ${type === 'logo' ? 'Logo 1:1' : 'Banner de cabecera'} generado con IA`);
      }
    } catch (err) {
      console.error('Error generando asset de marca:', err);
      showToast(`No se pudo generar el ${type}.`);
    } finally {
      if (type === 'logo') setIsGeneratingLogo(false);
      else setIsGeneratingBanner(false);
    }
  };

  // 3. Crear Canal Oficial e Inyectar las 10 Historias al Backlog
  const handleCreateChannelFull = async () => {
    if (!concept) return;
    const nameObj = concept.suggestedNames[selectedNameIndex] || {
      name: 'Nuevo Canal',
      handle: '@canal',
      tagline: '',
      rationale: '',
    };
    setIsCreatingChannel(true);

    try {
      const personaPayload: Partial<ChannelPersona> & { name: string } = {
        name: nameObj.name,
        display_title: `${nameObj.name} | ${nameObj.tagline || 'Documentales'}`,
        niche: nicheIdea || concept.suggestedNames[0]?.name || 'Documentales',
        language: 'es',
        target_audience: concept.nicheAnalysis.targetAudience,
        cpm_tier: concept.nicheAnalysis.cpmTier,
        narrator: {
          name: concept.recommendedNarrator.archetype || 'El Narrador',
          archetype: concept.recommendedNarrator.archetype,
          tone: concept.recommendedNarrator.tone,
          perspective: 'Tercera persona testimonial',
          target_wpm: concept.recommendedNarrator.targetWpm || 145,
          signature_cues: {
            openings: concept.recommendedNarrator.signatureOpenings || [],
            transitions: [],
            closings: [],
          },
          key_vocabulary: [],
          forbidden_phrases: [],
        },
        visual_style: {
          engine: 'gemini',
          aspect_ratio: '16:9',
          art_style_name: concept.recommendedVisualStyle.artStyleName,
          prompt_prefix: concept.recommendedVisualStyle.promptPrefix,
          prompt_suffix: '8k resolution, volumetric rim lighting, masterpiece',
          color_palette: concept.recommendedVisualStyle.colorPalette,
        },
      };

      const res = await fetch('/api/channels/incubator/create-full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona: personaPayload,
          launchBatch: concept.launchBatch,
        }),
      });

      const data = await res.json();
      if (data.success && data.channel) {
        onChannelCreated(data.channel);
        showToast(
          `🎉 ¡Canal "${data.channel.name}" creado con éxito con ${data.storyCount} historias listas en producción!`
        );
        onNavigateToProduction(data.channel.channel_id);
      }
    } catch (err) {
      console.error('Error creando canal:', err);
      showToast('Error al crear el canal oficial.');
    } finally {
      setIsCreatingChannel(false);
    }
  };

  // 4. Inyectar recomendación de auditoría al backlog del canal (Paso 1)
  const handleInjectHit = async (rec: any, index: number) => {
    if (!activeChannel) return;
    try {
      const res = await fetch(`/api/channels/${activeChannel.channel_id}/inject-hit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendation: rec }),
      });
      const data = await res.json();
      if (data.success) {
        setInjectedHits((prev) => [...prev, rec.title]);
        showToast(`✓ ¡"${rec.title}" inyectado al Tablero de Historias (Paso 1)!`);
      }
    } catch (err) {
      console.error('Error inyectando historia:', err);
      showToast('No se pudo inyectar la historia.');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-amber-400 uppercase tracking-wider font-semibold bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20 flex items-center gap-1.5">
              <Rocket className="w-3.5 h-3.5" />
              Estrategia & Crecimiento IA
            </span>
            {activeChannel && (
              <span className="text-xs text-slate-400">• Canal Activo: {activeChannel.name}</span>
            )}
          </div>
          <h2 className="text-xl font-bold text-white mt-1">
            Incubadora de Canales & Asesor Estratégico de YouTube
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Crea nuevos canales con identidad de marca y lote de lanzamiento de 10 videos, o audita tus canales existentes para descubrir oportunidades y fugas de retención.
          </p>
        </div>

        {/* Selector de Canal Activo */}
        {channels.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400 font-semibold">Canal:</label>
            <select
              value={activeChannel?.channel_id || ''}
              onChange={(e) => {
                const found = channels.find((c) => c.channel_id === e.target.value);
                if (found) onSelectChannel(found);
              }}
              className="bg-slate-900 border border-slate-700 text-xs text-white rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
            >
              {channels.map((c) => (
                <option key={c.channel_id} value={c.channel_id}>
                  {c.display_title || c.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* PESTAÑAS: INCUBADORA VS AUDITORÍA */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('incubator')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
            activeTab === 'incubator'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/25'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          <Rocket className="w-4 h-4" />
          1. Incubadora de Nuevos Canales (De Cero a 10 Videos)
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
            activeTab === 'audit'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/25'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          2. Asesor Estratégico & Auditoría IA (Canal Activo)
        </button>
      </div>

      {/* =========================================================================
          PESTAÑA 1: INCUBADORA DE NUEVOS CANALES
         ========================================================================= */}
      {activeTab === 'incubator' && (
        <div className="space-y-6">
          {/* CAJA DE BRIEFING / IDEA DEL CANAL */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                ¿Qué tipo de canal deseas crear?
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Escribe una idea, nicho o temática. La IA estructurará la estrategia completa, el arquetipo del narrador y los 10 primeros videos para arrancar con ventaja.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Concepto, Temática o Nicho:
                </label>
                <textarea
                  rows={3}
                  value={nicheIdea}
                  onChange={(e) => setNicheIdea(e.target.value)}
                  placeholder="Ej: Canal de documentales sobre los mayores fraudes y quiebras de empresas de tecnología, revelando traiciones internas y decisiones desastrosas con tono de thriller..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Tono Narrativo Deseado:</label>
                <select
                  value={preferredTone}
                  onChange={(e) => setPreferredTone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Cinematográfico, analítico, con ritmo de thriller y suspenso forense">
                    🎬 Thriller Cinematográfico & Forense
                  </option>
                  <option value="Épico, solemne, reflexivo y de alta inmersión histórica">
                    🏛️ Épico & Reflexivo (Historia/Filosofía)
                  </option>
                  <option value="Directo, ácido, crítico y desmitificador de mitos">
                    ⚡ Crítico, Ácido & Revelador
                  </option>
                  <option value="Didáctico, ágil, adictivo con analogías cotidianas">
                    💡 Didáctico & Dinámico (Estilo Veritasium)
                  </option>
                </select>

                <div className="pt-2">
                  <button
                    disabled={isBrainstorming || !nicheIdea.trim()}
                    onClick={handleBrainstorm}
                    className="w-full bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 disabled:opacity-50 text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 transition active:scale-95"
                  >
                    <Sparkles className={`w-4 h-4 ${isBrainstorming ? 'animate-spin' : ''}`} />
                    {isBrainstorming ? 'Incubando con IA...' : '✨ Incubar Estrategia Completa'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RESULTADO DE LA INCUBACIÓN */}
          {concept && (
            <div className="space-y-6 animate-fadeIn">
              {/* SECCIÓN A: SELECCIÓN DE NOMBRE & POSICIONAMIENTO */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Award className="w-4 h-4 text-amber-400" />
                      1. Nombres Sugeridos con @Handle y Eslogan
                    </h4>
                    <p className="text-xs text-slate-400">
                      Selecciona el nombre que mejor defina la identidad de tu canal:
                    </p>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    CPM Estimado: {concept.nicheAnalysis.cpmTier}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {concept.suggestedNames.map((nameItem, idx) => {
                    const isSelected = selectedNameIndex === idx;
                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedNameIndex(idx)}
                        className={`text-left p-3.5 rounded-xl border transition flex flex-col justify-between ${
                          isSelected
                            ? 'bg-amber-950/30 border-amber-500 ring-2 ring-amber-500/40 text-white'
                            : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white">{nameItem.name}</span>
                            {isSelected && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-amber-400">{nameItem.handle}</div>
                          <div className="text-[11px] text-slate-400 italic">"{nameItem.tagline}"</div>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-2 border-t border-slate-800/80 pt-1.5 line-clamp-2">
                          {nameItem.rationale}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECCIÓN B: IDENTIDAD VISUAL CON IA (LOGO & BANNER) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Logo 1:1 Circular */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3.5 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                      Logo / Avatar Circular (1:1)
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Símbolo focal optimizado para ser reconocible en móvil y feed.
                    </p>
                  </div>

                  <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-slate-700 bg-slate-950 mx-auto shadow-2xl flex items-center justify-center relative group">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-2">
                        <Users className="w-8 h-8 text-slate-600 mx-auto" />
                        <span className="text-[10px] text-slate-500 block mt-1">Sin Logo</span>
                      </div>
                    )}
                  </div>

                  <button
                    disabled={isGeneratingLogo}
                    onClick={() => handleGenerateAsset('logo')}
                    className="w-full bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 transition"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isGeneratingLogo ? 'animate-spin' : ''}`} />
                    {isGeneratingLogo ? 'Generando Logo...' : '🎨 Generar Logo con IA'}
                  </button>
                </div>

                {/* Banner Panorámico de YouTube (16:9 Header) */}
                <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3.5 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-purple-400" />
                      Portada / Banner de Cabecera (YouTube 16:9)
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Composición panorámica cinematográfica para la página principal del canal.
                    </p>
                  </div>

                  <div className="aspect-[16/6] w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950 relative flex items-center justify-center">
                    {bannerUrl ? (
                      <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <Tv className="w-8 h-8 text-slate-700 mx-auto" />
                        <span className="text-xs text-slate-500 block mt-1">
                          Banner Panorámico No Generado
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    disabled={isGeneratingBanner}
                    onClick={() => handleGenerateAsset('banner')}
                    className="w-full bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 transition"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isGeneratingBanner ? 'animate-spin' : ''}`} />
                    {isGeneratingBanner ? 'Generando Banner...' : '🎨 Generar Banner con IA'}
                  </button>
                </div>
              </div>

              {/* SECCIÓN C: LOTE DE LANZAMIENTO (10 VIDEOS DE ALTO IMPACTO) */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Flame className="w-4 h-4 text-red-500" />
                      Lote de Lanzamiento Inicial (Tus Primeros 10 Videos)
                    </h4>
                    <p className="text-xs text-slate-400">
                      Estructurados para establecer autoridad y activar el algoritmo de YouTube desde el primer mes.
                    </p>
                  </div>

                  <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                    10 Historias Listas
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {concept.launchBatch.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5 space-y-2 hover:border-slate-700 transition"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          Video #{idx + 1} • {item.suggestedDurationMinutes} min
                        </span>
                        <span className="text-[11px] text-slate-400 truncate max-w-[50%]">
                          🎭 {item.characterCompany}
                        </span>
                      </div>

                      <h5 className="text-xs sm:text-sm font-bold text-white leading-snug">
                        {item.title}
                      </h5>

                      <p className="text-[11px] text-slate-300">
                        <strong className="text-amber-400">Gancho:</strong> {item.hook}
                      </p>

                      <p className="text-[10px] text-slate-400 italic">
                        💡 {item.whyItWorks}
                      </p>
                    </div>
                  ))}
                </div>

                {/* BOTÓN DEFINITIVO DE ALTA DE CANAL */}
                <div className="pt-4 border-t border-slate-800 text-center">
                  <button
                    disabled={isCreatingChannel}
                    onClick={handleCreateChannelFull}
                    className="bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-sm px-8 py-4 rounded-2xl flex items-center gap-3 mx-auto shadow-2xl shadow-emerald-600/30 transition active:scale-95"
                  >
                    <Rocket className={`w-5 h-5 ${isCreatingChannel ? 'animate-bounce' : ''}`} />
                    {isCreatingChannel
                      ? 'Creando Canal e Inyectando Historias...'
                      : `🚀 Crear Canal "${concept.suggestedNames[selectedNameIndex]?.name || 'Oficial'}" e Inyectar las 10 Historias`}
                  </button>
                  <p className="text-xs text-slate-500 mt-2">
                    Crea la carpeta oficial del canal en disco e inyecta de inmediato las 10 historias en tu Tablero de Tareas (Paso 1).
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          PESTAÑA 2: ASESOR ESTRATÉGICO & AUDITORÍA IA (CANAL ACTIVO)
         ========================================================================= */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          {!activeChannel ? (
            <div className="text-center py-12 text-slate-400">
              Selecciona un canal para auditar su rendimiento y estrategia.
            </div>
          ) : (
            <>
              {/* HEADER CON BOTÓN DE AUDITORÍA */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-purple-400 uppercase tracking-wider font-semibold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                      Canal: {activeChannel.display_title || activeChannel.name}
                    </span>
                    <span className="text-xs text-slate-400">• Nicho: {activeChannel.niche}</span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">
                    Auditoría 360° del Algoritmo y Retención de Audiencia
                  </h3>
                  <p className="text-xs text-slate-400">
                    Diagnóstico quirúrgico de tus guiones, duraciones y personajes para maximizar tus posibilidades de éxito en YouTube.
                  </p>
                </div>

                <button
                  disabled={isLoadingAudit}
                  onClick={() => loadSavedAudit(activeChannel.channel_id, true)}
                  className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-purple-600/25 transition active:scale-95"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAudit ? 'animate-spin' : ''}`} />
                  {isLoadingAudit ? 'Auditando Canal...' : '🔬 Ejecutar Auditoría Estratégica con IA'}
                </button>
              </div>

              {/* REPORTE DE AUDITORÍA */}
              {auditReport ? (
                <div className="space-y-6">
                  {/* METRICAS PRINCIPALES & DIAGNÓSTICO EJECUTIVO */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Score de Salud */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between items-center text-center">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Score de Salud del Canal
                      </span>
                      <div className="my-2">
                        <span
                          className={`text-5xl font-black font-mono ${
                            auditReport.healthScore >= 80
                              ? 'text-emerald-400'
                              : auditReport.healthScore >= 60
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {auditReport.healthScore}
                        </span>
                        <span className="text-xs text-slate-500 font-mono"> / 100</span>
                      </div>
                      <span className="text-[11px] text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                        {auditReport.healthScore >= 80 ? '✓ Excelente Potencial' : 'En Optimización'}
                      </span>
                    </div>

                    {/* Diagnóstico Ejecutivo */}
                    <div className="md:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2 flex flex-col justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5 text-purple-400" />
                          Diagnóstico del Algoritmo de YouTube:
                        </span>
                        <p className="text-xs text-slate-200 mt-2 leading-relaxed">
                          {auditReport.summaryDiagnosis}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-800 text-xs">
                        <span className="text-slate-400">
                          ⏱️ Duración Óptima Recomendada:{' '}
                          <strong className="text-amber-300">
                            {auditReport.optimalDurationMinutes}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* FORTALEZAS VS FUGAS DE RETENCIÓN */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Fortalezas */}
                    <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 space-y-3">
                      <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        Ventajas Competitivas Detectadas
                      </h4>
                      <ul className="space-y-2 text-xs text-slate-200">
                        {auditReport.contentStrengths.map((str, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-emerald-400 font-bold">•</span>
                            <span>{str}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Fugas de Retención */}
                    <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-5 space-y-3">
                      <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" />
                        Riesgos de Retención & Puntos Ciegos
                      </h4>
                      <ul className="space-y-2 text-xs text-slate-200">
                        {auditReport.retentionRisks.map((risk, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-rose-400 font-bold">•</span>
                            <span>{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* CONSEJOS DE EMPAQUE & FRANQUICIAS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Consejos de Miniatura & Título */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2.5">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                        Estrategia de Miniaturas para este Nicho
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {auditReport.packagingAdvice}
                      </p>
                    </div>

                    {/* Series / Franquicias Serializadas */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2.5">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-blue-400" />
                        Franquicias / Listas de Reproducción Recomendadas
                      </h4>
                      <div className="space-y-2 text-xs">
                        {auditReport.franchiseIdeas?.map((fr, idx) => (
                          <div key={idx} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                            <div className="font-bold text-amber-300">{fr.title}</div>
                            <div className="text-[11px] text-slate-400">{fr.concept}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* PRÓXIMOS VIDEOS RECOMENDADOS (NEXT HITS) */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <Flame className="w-4 h-4 text-red-500" />
                          Próximos Videos Sugeridos para Multiplicar Visitas (Next Hits)
                        </h4>
                        <p className="text-xs text-slate-400">
                          Ideas diseñadas específicamente para complementar lo que ya has producido en este canal.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {auditReport.nextHitRecommendations.map((rec, idx) => {
                        const isInjected = injectedHits.includes(rec.title);
                        return (
                          <div
                            key={idx}
                            className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-slate-700 transition"
                          >
                            <div className="space-y-1.5 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                                  Hit #{idx + 1}
                                </span>
                                <span className="text-xs text-slate-400">
                                  🎭 {rec.characterCompany}
                                </span>
                              </div>
                              <h5 className="text-xs sm:text-sm font-bold text-white">
                                {rec.title}
                              </h5>
                              <p className="text-[11px] text-slate-300">
                                <strong className="text-amber-400">Gancho:</strong> {rec.hook}
                              </p>
                              <p className="text-[10px] text-slate-500 italic">
                                💡 {rec.strategicReason}
                              </p>
                            </div>

                            <button
                              disabled={isInjected}
                              onClick={() => handleInjectHit(rec, idx)}
                              className={`flex-shrink-0 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition ${
                                isInjected
                                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 cursor-default'
                                  : 'bg-amber-600 hover:bg-amber-500 text-white shadow-md'
                              }`}
                            >
                              {isInjected ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  ✓ Inyectado al Backlog
                                </>
                              ) : (
                                <>
                                  <FolderPlus className="w-3.5 h-3.5" />
                                  + Inyectar a Historias (Paso 1)
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl space-y-3">
                  <TrendingUp className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-sm font-bold text-slate-300">
                    Aún no se ha ejecutado la auditoría para este canal
                  </p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Haz clic en "Ejecutar Auditoría Estratégica con IA" arriba para analizar tus videos y recibir el reporte completo con sugerencias.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
