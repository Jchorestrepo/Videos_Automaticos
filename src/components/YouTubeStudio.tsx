import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Download,
  Copy,
  Check,
  RefreshCw,
  Image as ImageIcon,
  Type,
  User,
  Sliders,
  Youtube,
  AlertTriangle,
  Flame,
  Layers,
  ArrowRight,
  Smile,
  Shield,
  HelpCircle,
  FileText,
  MessageSquare,
  Share2,
  Maximize2,
  Wand2,
  Upload,
  CheckCircle2,
  Hash,
  Tag,
  Globe,
  Volume2,
  FileAudio,
  PackageCheck,
  FileCode,
} from 'lucide-react';
import type {
  ProjectScript,
  ChannelPersona,
  YouTubePackagingData,
  ThumbnailLayerConfig,
  SuggestedTitleItem,
} from '../types/index.ts';

interface YouTubeStudioProps {
  project: ProjectScript;
  channel: ChannelPersona;
  onUpdateProject: (updated: ProjectScript, notifyMsg?: string) => void;
  showToast: (msg: string) => void;
}

export function YouTubeStudio({
  project,
  channel,
  onUpdateProject,
  showToast,
}: YouTubeStudioProps) {
  const [activeTab, setActiveTab] = useState<'thumbnail' | 'seo' | 'multilang'>('thumbnail');
  const [isGeneratingMetadata, setIsGeneratingMetadata] = useState(false);
  const [isGeneratingBg, setIsGeneratingBg] = useState(false);
  const [isSavingThumbnail, setIsSavingThumbnail] = useState(false);
  const [isGeneratingSubtitles, setIsGeneratingSubtitles] = useState(false);
  const [isGeneratingDub, setIsGeneratingDub] = useState(false);
  const [isGeneratingBundle, setIsGeneratingBundle] = useState(false);
  const [bundleFiles, setBundleFiles] = useState<Array<{ name: string; url: string; sizeBytes?: number }>>([]);
  const [seoLang, setSeoLang] = useState<'en' | 'es'>('en');
  const [dubProvider, setDubProvider] = useState<'edge' | 'elevenlabs' | 'voicestudio'>('edge');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Prompt personalizado para fondo de IA
  const [customBgPrompt, setCustomBgPrompt] = useState('');
  const [showPromptInput, setShowPromptInput] = useState(false);

  // Estado del creador de miniatura
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const initialConfig: ThumbnailLayerConfig = project.youtubeMetadata?.thumbnailConfig || {
    backgroundUrl:
      project.thumbnailUrl ||
      project.scenes.find((s) => s.imageUrl)?.imageUrl ||
      '',
    backgroundBrightness: 1.0,
    backgroundContrast: 1.15,
    backgroundVignette: true,
    characterId: project.characters?.[0]?.character_id,
    characterUrl: project.characters?.[0]?.canonical_image_url || '',
    characterPosition: 'right',
    characterScale: 1.0,
    characterGlow: true,
    characterGlowColor: '#FFE500',
    textLine1: project.youtubeMetadata?.suggestedThumbnailTexts?.[0] || 'LA VERDAD',
    textLine2: project.characterCompany ? project.characterCompany.toUpperCase() : 'DOCUMENTAL',
    stylePreset: 'yellow_black',
    fontFamily: 'Impact',
    fontSize: 82,
    tiltAngle: -3,
    badgeType: 'arrow',
    arrowAngle: -25,
  };

  const [thumbConfig, setThumbConfig] = useState<ThumbnailLayerConfig>(initialConfig);
  const [metadata, setMetadata] = useState<YouTubePackagingData>(
    project.youtubeMetadata || {
      selectedTitle: project.title,
      suggestedTitles: [],
      suggestedThumbnailTexts: [
        'LA VERDAD',
        'EL ERROR DE $1B',
        'LO PERDIÓ TODO',
        'SECRETO REVELADO',
        'NO DEBIÓ HACERLO',
      ],
      description: '',
      hashtags: ['#Documental', '#Historia', '#Investigación'],
      tags: [],
      pinnedComment: '',
      communityPost: '',
    }
  );

  const handleCopy = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    showToast('✓ ¡Copiado al portapapeles!');
    setTimeout(() => {
      setCopiedSection((prev) => (prev === sectionId ? null : prev));
    }, 2500);
  };

  // 1. Generar empaque SEO y sugerencias virales con IA
  const handleGenerateMetadata = async () => {
    setIsGeneratingMetadata(true);
    try {
      const res = await fetch('/api/youtube/metadata/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.project_id,
          channelId: channel.channel_id,
        }),
      });
      const data = await res.json();
      if (data.success && data.metadata) {
        setMetadata(data.metadata);
        if (data.metadata.suggestedThumbnailTexts?.[0] && !thumbConfig.textLine1) {
          setThumbConfig((prev) => ({
            ...prev,
            textLine1: data.metadata.suggestedThumbnailTexts[0],
          }));
        }
        onUpdateProject({
          ...project,
          title: data.metadata.selectedTitle || project.title,
          youtubeMetadata: {
            ...data.metadata,
            thumbnailConfig: thumbConfig,
          },
        });
        showToast('✨ ¡Empaque de YouTube generado con éxito por IA!');
      } else {
        showToast('Aviso: Se aplicó la plantilla de empaque sugerido.');
      }
    } catch (err) {
      console.error('Error generando metadatos:', err);
      showToast('Error al conectar con el servidor para generar metadatos.');
    } finally {
      setIsGeneratingMetadata(false);
    }
  };

  // 2. Generar fondo cinematográfico con IA
  const handleGenerateAiBackground = async () => {
    setIsGeneratingBg(true);
    try {
      const res = await fetch('/api/youtube/thumbnail/generate-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.project_id,
          channelId: channel.channel_id,
          prompt: customBgPrompt.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.backgroundUrl) {
        setThumbConfig((prev) => ({
          ...prev,
          backgroundUrl: data.backgroundUrl,
        }));
        showToast('🎨 ¡Fondo cinematográfico 16:9 generado con IA!');
        setShowPromptInput(false);
      }
    } catch (err) {
      console.error('Error generando fondo:', err);
      showToast('No se pudo generar el fondo con IA.');
    } finally {
      setIsGeneratingBg(false);
    }
  };

  // 3. Subir fondo propio desde la máquina local
  const handleUploadCustomBackground = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setThumbConfig((prev) => ({
        ...prev,
        backgroundUrl: result,
      }));
      showToast('✓ Imagen personalizada cargada como fondo');
    };
    reader.readAsDataURL(file);
  };

  // 4. Renderizado en Canvas 1280x720 en tiempo real
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isCancelled = false;

    const renderCanvas = async () => {
      const W = 1280;
      const H = 720;
      canvas.width = W;
      canvas.height = H;

      // 1. Limpiar canvas
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, W, H);

      // 2. Dibujar Fondo
      if (thumbConfig.backgroundUrl) {
        try {
          const bgImg = await loadImage(thumbConfig.backgroundUrl);
          if (!isCancelled) {
            ctx.save();
            ctx.filter = `brightness(${thumbConfig.backgroundBrightness}) contrast(${thumbConfig.backgroundContrast}) saturate(1.2)`;
            // Escalar para cubrir 1280x720 sin deformar
            drawImageCover(ctx, bgImg, 0, 0, W, H);
            ctx.restore();
          }
        } catch (e) {
          console.warn('Error cargando fondo de miniatura:', e);
        }
      }

      // Viñeta oscura periférica para destacar el centro y texto
      if (thumbConfig.backgroundVignette) {
        ctx.save();
        const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.75);
        vignette.addColorStop(0, 'rgba(0,0,0,0)');
        vignette.addColorStop(0.7, 'rgba(0,0,0,0.4)');
        vignette.addColorStop(1, 'rgba(0,0,0,0.85)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }

      // Degradado sutil en el lado del texto para asegurar 100% legibilidad
      ctx.save();
      const textBackdrop = ctx.createLinearGradient(0, 0, W * 0.65, 0);
      textBackdrop.addColorStop(0, 'rgba(0,0,0,0.75)');
      textBackdrop.addColorStop(0.7, 'rgba(0,0,0,0.3)');
      textBackdrop.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = textBackdrop;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();

      // 3. Dibujar Personaje con contorno brillante / Neón
      if (thumbConfig.characterPosition !== 'none' && thumbConfig.characterUrl) {
        try {
          const charImg = await loadImage(thumbConfig.characterUrl);
          if (!isCancelled) {
            ctx.save();
            const scale = thumbConfig.characterScale;
            const targetH = H * 0.95 * scale;
            const aspect = charImg.width / charImg.height;
            const targetW = targetH * aspect;

            let charX = W - targetW - 20; // Derecha por defecto
            if (thumbConfig.characterPosition === 'left') {
              charX = 30;
            } else if (thumbConfig.characterPosition === 'center') {
              charX = (W - targetW) / 2;
            }
            const charY = H - targetH;

            // Aura de Neón / Glow perimetral
            if (thumbConfig.characterGlow) {
              ctx.save();
              ctx.shadowColor = thumbConfig.characterGlowColor || '#FFE500';
              ctx.shadowBlur = 45;
              ctx.drawImage(charImg, charX, charY, targetW, targetH);
              ctx.drawImage(charImg, charX, charY, targetW, targetH);
              ctx.restore();
            }

            // Imagen principal del personaje
            ctx.drawImage(charImg, charX, charY, targetW, targetH);
            ctx.restore();
          }
        } catch (e) {
          console.warn('Error dibujando personaje en miniatura:', e);
        }
      }

      // 4. Dibujar Badges / Stickers de Retención
      if (thumbConfig.badgeType !== 'none') {
        ctx.save();
        if (thumbConfig.badgeType === 'arrow') {
          // Flecha roja curva/inclinada de YouTube apuntando al foco
          const arrowX = W * 0.58;
          const arrowY = H * 0.45;
          ctx.translate(arrowX, arrowY);
          ctx.rotate(((thumbConfig.arrowAngle || -25) * Math.PI) / 180);

          ctx.shadowColor = 'rgba(0,0,0,0.8)';
          ctx.shadowBlur = 20;
          ctx.fillStyle = '#EF4444';
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 6;

          ctx.beginPath();
          ctx.moveTo(0, -25);
          ctx.lineTo(90, -25);
          ctx.lineTo(90, -55);
          ctx.lineTo(160, 0);
          ctx.lineTo(90, 55);
          ctx.lineTo(90, 25);
          ctx.lineTo(0, 25);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (thumbConfig.badgeType === 'vs') {
          // Círculo VS electrizante
          const vsX = W * 0.52;
          const vsY = H * 0.5;
          ctx.save();
          ctx.translate(vsX, vsY);
          ctx.shadowColor = '#FF0055';
          ctx.shadowBlur = 30;
          ctx.fillStyle = '#111827';
          ctx.beginPath();
          ctx.arc(0, 0, 65, 0, Math.PI * 2);
          ctx.fill();
          ctx.lineWidth = 6;
          ctx.strokeStyle = '#FF0055';
          ctx.stroke();

          ctx.font = '900 68px "Impact", "Anton", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#FFFFFF';
          ctx.fillText('VS', 0, 4);
          ctx.restore();
        } else if (thumbConfig.badgeType === 'alert') {
          // Badge "¡ALERTA!"
          ctx.translate(W * 0.08, H * 0.16);
          ctx.rotate((-4 * Math.PI) / 180);
          ctx.fillStyle = '#DC2626';
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 4;
          ctx.shadowColor = 'rgba(0,0,0,0.9)';
          ctx.shadowBlur = 25;
          roundRect(ctx, 0, 0, 230, 60, 12);
          ctx.fill();
          ctx.stroke();

          ctx.font = '900 36px "Impact", "Anton", sans-serif';
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('¡ALERTA!', 115, 32);
        } else if (thumbConfig.badgeType === 'secret') {
          // Badge "SECRETO" o "CONFIDENCIAL"
          ctx.translate(W * 0.08, H * 0.16);
          ctx.rotate((-5 * Math.PI) / 180);
          ctx.fillStyle = '#F59E0B';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 4;
          ctx.shadowColor = 'rgba(0,0,0,0.9)';
          ctx.shadowBlur = 25;
          roundRect(ctx, 0, 0, 310, 60, 10);
          ctx.fill();
          ctx.stroke();

          ctx.font = '900 34px "Impact", "Anton", sans-serif';
          ctx.fillStyle = '#000000';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('CONFIDENCIAL', 155, 32);
        } else if (thumbConfig.badgeType === 'question') {
          // Signo ¿?! de misterio
          ctx.translate(W * 0.55, H * 0.35);
          ctx.rotate((12 * Math.PI) / 180);
          ctx.shadowColor = '#F59E0B';
          ctx.shadowBlur = 35;
          ctx.font = '900 130px "Impact", "Anton", sans-serif';
          ctx.fillStyle = '#FFE500';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 14;
          ctx.strokeText('¿?!', 0, 0);
          ctx.fillText('¿?!', 0, 0);
        }
        ctx.restore();
      }

      // 5. Dibujar Tipografía Viral de Alto Impacto
      const l1 = (thumbConfig.textLine1 || '').trim().toUpperCase();
      const l2 = (thumbConfig.textLine2 || '').trim().toUpperCase();

      if (l1 || l2) {
        ctx.save();
        const textX = W * 0.08;
        const textY = H * 0.54;

        ctx.translate(textX, textY);
        ctx.rotate(((thumbConfig.tiltAngle || 0) * Math.PI) / 180);

        const fFamily = thumbConfig.fontFamily || 'Impact';
        const fSize = thumbConfig.fontSize || 82;
        ctx.font = `900 ${fSize}px "${fFamily}", "Anton", "Bebas Neue", sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        const drawStyledLine = (
          text: string,
          yOffset: number,
          style: ThumbnailLayerConfig['stylePreset']
        ) => {
          if (!text) return;
          const metrics = ctx.measureText(text);
          const textW = metrics.width;
          const padX = 24;
          const padY = 12;
          const boxH = fSize + padY * 2;

          ctx.save();
          if (style === 'yellow_black') {
            // Estilo MrBeast / Documental Épico
            // Sombra 3D profunda
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 18;
            ctx.shadowOffsetX = 6;
            ctx.shadowOffsetY = 8;

            // Borde exterior negro grueso
            ctx.lineWidth = fSize * 0.22;
            ctx.strokeStyle = '#000000';
            ctx.lineJoin = 'round';
            ctx.strokeText(text, 0, yOffset);

            // Relleno amarillo vibrante
            ctx.fillStyle = '#FFE500';
            ctx.fillText(text, 0, yOffset);
          } else if (style === 'red_alert') {
            // Estilo Rojo Alerta con Resplandor
            ctx.shadowColor = '#FF0033';
            ctx.shadowBlur = 35;
            ctx.lineWidth = fSize * 0.2;
            ctx.strokeStyle = '#000000';
            ctx.lineJoin = 'round';
            ctx.strokeText(text, 0, yOffset);

            ctx.fillStyle = '#FF1F1F';
            ctx.fillText(text, 0, yOffset);
          } else if (style === 'gold_luxury') {
            // Estilo Oro Metálico / Gran Fortuna
            ctx.shadowColor = 'rgba(0,0,0,0.9)';
            ctx.shadowBlur = 20;
            ctx.shadowOffsetX = 4;
            ctx.shadowOffsetY = 6;

            ctx.lineWidth = fSize * 0.18;
            ctx.strokeStyle = '#181203';
            ctx.strokeText(text, 0, yOffset);

            const goldGrad = ctx.createLinearGradient(0, yOffset, 0, yOffset + fSize);
            goldGrad.addColorStop(0, '#FFFBEB');
            goldGrad.addColorStop(0.35, '#FBBF24');
            goldGrad.addColorStop(1, '#B45309');
            ctx.fillStyle = goldGrad;
            ctx.fillText(text, 0, yOffset);
          } else if (style === 'neon_cyan') {
            // Estilo Neón Cyber / Tech
            ctx.shadowColor = '#06B6D4';
            ctx.shadowBlur = 40;
            ctx.lineWidth = fSize * 0.18;
            ctx.strokeStyle = '#021319';
            ctx.strokeText(text, 0, yOffset);

            ctx.fillStyle = '#22D3EE';
            ctx.fillText(text, 0, yOffset);
          } else if (style === 'clean_white') {
            // Caja negra con texto blanco
            ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
            roundRect(ctx, -padX, yOffset - padY, textW + padX * 2, boxH, 8);
            ctx.fill();

            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(text, 0, yOffset);
          }
          ctx.restore();
        };

        let currentY = 0;
        if (l1) {
          drawStyledLine(l1, currentY, thumbConfig.stylePreset);
          currentY += fSize * 1.08;
        }
        if (l2) {
          // Línea 2 con estilo secundario complementario
          const secondaryStyle =
            thumbConfig.stylePreset === 'yellow_black'
              ? 'clean_white'
              : thumbConfig.stylePreset === 'red_alert'
              ? 'yellow_black'
              : thumbConfig.stylePreset;
          drawStyledLine(l2, currentY, secondaryStyle);
        }

        ctx.restore();
      }
    };

    renderCanvas();

    return () => {
      isCancelled = true;
    };
  }, [thumbConfig]);

  // 5. Descargar miniatura en PNG localmente en 1280x720
  const handleDownloadThumbnail = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png', 1.0);
    const link = document.createElement('a');
    const safeTitle = project.title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 45);
    link.download = `Miniatura_${safeTitle}.png`;
    link.href = dataUrl;
    link.click();
    showToast('📥 ¡Miniatura HD 1280x720 descargada!');
  };

  // 6. Guardar miniatura en el servidor y actualizar el proyecto
  const handleSaveThumbnailToServer = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsSavingThumbnail(true);
    try {
      const base64Image = canvas.toDataURL('image/png', 0.95);
      const res = await fetch('/api/youtube/thumbnail/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.project_id,
          base64Image,
          metadata,
          thumbnailConfig: thumbConfig,
        }),
      });
      const data = await res.json();
      if (data.success && data.thumbnailUrl) {
        onUpdateProject({
          ...project,
          thumbnailUrl: data.thumbnailUrl,
          youtubeMetadata: {
            ...metadata,
            thumbnailConfig: thumbConfig,
          },
        });
        showToast('✓ ¡Miniatura guardada como oficial del proyecto!');
      }
    } catch (err) {
      console.error('Error guardando miniatura:', err);
      showToast('Error al guardar la miniatura en el servidor.');
    } finally {
      setIsSavingThumbnail(false);
    }
  };

  // 7. Aplicar título sugerido
  const handleSelectTitle = (t: SuggestedTitleItem) => {
    setMetadata((prev) => ({ ...prev, selectedTitle: t.title }));
    onUpdateProject({ ...project, title: t.title }, `✓ Título actualizado a: "${t.title}"`);
  };

  // 8. Generar subtítulos oficiales SRT y VTT
  const handleGenerateSubtitles = async () => {
    setIsGeneratingSubtitles(true);
    try {
      const res = await fetch('/api/youtube/subtitles/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.project_id }),
      });
      const data = await res.json();
      if (data.success && data.project) {
        onUpdateProject(data.project);
        showToast('✓ Subtítulos oficiales en Inglés y Español generados.');
      }
    } catch (err) {
      console.error('Error generando subtítulos:', err);
      showToast('Error al generar subtítulos.');
    } finally {
      setIsGeneratingSubtitles(false);
    }
  };

  // 9. Generar pista de doblaje en español
  const handleGenerateDubbing = async () => {
    setIsGeneratingDub(true);
    try {
      const res = await fetch('/api/youtube/dubbing/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.project_id,
          preferredVoiceProvider: dubProvider,
        }),
      });
      const data = await res.json();
      if (data.success && data.project) {
        onUpdateProject(data.project);
        showToast('✓ ¡Pista de doblaje en español normalizada a -14 LUFS lista!');
      }
    } catch (err) {
      console.error('Error generando doblaje:', err);
      showToast('Error al generar doblaje en español.');
    } finally {
      setIsGeneratingDub(false);
    }
  };

  // 10. Generar paquete maestro para YouTube
  const handleGenerateBundle = async () => {
    setIsGeneratingBundle(true);
    try {
      const res = await fetch('/api/youtube/bundle/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.project_id }),
      });
      const data = await res.json();
      if (data.success && data.bundle) {
        setBundleFiles(data.bundle.files || []);
        showToast('📦 ¡Paquete Maestro de YouTube generado en youtube_pack/!');
      }
    } catch (err) {
      console.error('Error generando bundle:', err);
      showToast('Error al empaquetar archivos para YouTube.');
    } finally {
      setIsGeneratingBundle(false);
    }
  };

  // Calcular longitud de tags
  const tagsString = metadata.tags?.join(', ') || '';
  const tagsCharCount = tagsString.length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* HEADER DE LA PANTALLA */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-red-400 uppercase tracking-wider font-semibold bg-red-500/10 px-2.5 py-0.5 rounded border border-red-500/20 flex items-center gap-1.5">
              <Youtube className="w-3.5 h-3.5" />
              Empaque & Lanzamiento YouTube
            </span>
            <span className="text-xs text-slate-400">• {channel.name}</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">
            Miniatura Viral (1280x720) & Optimización SEO de YouTube
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Crea una miniatura de alto impacto visual que dispare el CTR y genera títulos, descripción con marcas de tiempo y etiquetas optimizadas.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            disabled={isGeneratingMetadata}
            onClick={handleGenerateMetadata}
            className="bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 disabled:opacity-50 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-red-600/20 transition active:scale-95"
          >
            <Sparkles className={`w-4 h-4 ${isGeneratingMetadata ? 'animate-spin' : ''}`} />
            {isGeneratingMetadata ? 'Generando con IA...' : '✨ Generar Empaque con IA'}
          </button>
        </div>
      </div>

      {/* TABS PRINCIPALES: MINIATURA VS METADATOS */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('thumbnail')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
            activeTab === 'thumbnail'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/25'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          Estudio de Miniaturas 16:9 (Canvas HD)
        </button>

        <button
          onClick={() => setActiveTab('seo')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
            activeTab === 'seo'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/25'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          <FileText className="w-4 h-4" />
          Títulos Virales & SEO Suite
          {metadata.suggestedTitles && metadata.suggestedTitles.length > 0 && (
            <span className="bg-red-500/20 text-red-300 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
              {metadata.suggestedTitles.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('multilang')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
            activeTab === 'multilang'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          <Globe className="w-4 h-4" />
          Paquete Multilenguaje & Master YouTube (Opción 1)
          {(project.spanishAudioUrl || project.subtitlesEnUrl) && (
            <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1">
              ✓ Listo
            </span>
          )}
        </button>
      </div>

      {/* =========================================================================
          TAB 1: ESTUDIO DE MINIATURAS INTERACTIVO (CANVAS 1280x720)
         ========================================================================= */}
      {activeTab === 'thumbnail' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* COLUMNA IZQUIERDA / SUPERIOR: CANVAS PREVIEW Y ACCIONES (7 columnas) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 font-bold text-white">
                  <Maximize2 className="w-3.5 h-3.5 text-red-400" />
                  Vista Previa en Tiempo Real (1280x720 • 16:9)
                </span>
                <span className="font-mono bg-slate-950 px-2 py-0.5 rounded text-[11px] text-slate-400 border border-slate-800">
                  YouTube Thumbnail HD
                </span>
              </div>

              {/* El Canvas Nativo */}
              <div className="aspect-video w-full rounded-xl overflow-hidden border border-slate-700/80 bg-black shadow-inner relative flex items-center justify-center">
                <canvas
                  ref={canvasRef}
                  className="w-full h-full object-contain"
                  style={{ maxHeight: '420px' }}
                />
              </div>

              {/* Botones de Exportación / Guardado */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  onClick={handleDownloadThumbnail}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  Descargar Miniatura HD (.PNG)
                </button>

                <button
                  disabled={isSavingThumbnail}
                  onClick={handleSaveThumbnailToServer}
                  className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 transition"
                >
                  <Check className="w-3.5 h-3.5 text-blue-400" />
                  {isSavingThumbnail ? 'Guardando...' : 'Guardar en Proyecto'}
                </button>
              </div>
            </div>

            {/* Selector Rápido de Fondos de Escenas del Video */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                  Elegir Fondo de las Escenas del Video:
                </h4>
                <span className="text-[10px] text-slate-500">
                  {project.scenes.filter((s) => s.imageUrl).length} escenas disponibles
                </span>
              </div>

              <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
                {project.scenes
                  .filter((s) => s.imageUrl)
                  .map((scene) => {
                    const isSelected = thumbConfig.backgroundUrl === scene.imageUrl;
                    return (
                      <button
                        key={scene.scene_id}
                        onClick={() =>
                          setThumbConfig((prev) => ({
                            ...prev,
                            backgroundUrl: scene.imageUrl,
                          }))
                        }
                        className={`relative flex-shrink-0 w-28 aspect-video rounded-lg overflow-hidden border transition group ${
                          isSelected
                            ? 'border-red-500 ring-2 ring-red-500/40'
                            : 'border-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <img
                          src={scene.imageUrl}
                          alt={scene.chapter}
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />
                        <span className="absolute bottom-1 right-1 bg-black/80 text-[9px] px-1 rounded text-slate-300 font-mono">
                          #{scene.scene_id}
                        </span>
                        {isSelected && (
                          <span className="absolute top-1 left-1 bg-red-600 text-white text-[8px] font-bold px-1 rounded">
                            Activo
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>

              {/* Botón de Fondo con IA y Subida Local */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80">
                <button
                  disabled={isGeneratingBg}
                  onClick={() => setShowPromptInput(!showPromptInput)}
                  className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-semibold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  Generar Fondo 16:9 con IA
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-slate-700 transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Subir Foto Propia
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUploadCustomBackground}
                />
              </div>

              {showPromptInput && (
                <div className="bg-slate-950 p-3 rounded-xl border border-indigo-500/30 space-y-2 mt-2">
                  <label className="text-[11px] font-bold text-indigo-300">
                    Instrucción para el Fondo de la Miniatura con IA:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ej: Sala de juntas en ruinas, rascacielos nocturno ardiendo..."
                      value={customBgPrompt}
                      onChange={(e) => setCustomBgPrompt(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      disabled={isGeneratingBg}
                      onClick={handleGenerateAiBackground}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${isGeneratingBg ? 'animate-spin' : ''}`}
                      />
                      Generar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* COLUMNA DERECHA: CONTROLES DEL EDITOR (5 columnas) */}
          <div className="lg:col-span-5 space-y-4">
            {/* PANEL 1: TIPOGRAFÍA & TEXTO DE IMPACTO */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3.5">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-amber-400" />
                Texto Viral de Miniatura
              </h4>

              {/* Ideas de Textos de IA */}
              {metadata.suggestedThumbnailTexts &&
                metadata.suggestedThumbnailTexts.length > 0 && (
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1.5">
                      Sugerencias de Frases Cortas (clic para aplicar):
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {metadata.suggestedThumbnailTexts.map((txt, i) => (
                        <button
                          key={i}
                          onClick={() => setThumbConfig((prev) => ({ ...prev, textLine1: txt }))}
                          className="bg-slate-950 hover:bg-slate-800 text-amber-300 border border-amber-500/30 text-[11px] font-bold px-2.5 py-1 rounded-lg transition"
                        >
                          {txt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              <div className="space-y-2">
                <div>
                  <label className="text-[11px] text-slate-400">Línea Principal (Gancho):</label>
                  <input
                    type="text"
                    value={thumbConfig.textLine1}
                    onChange={(e) =>
                      setThumbConfig((prev) => ({ ...prev, textLine1: e.target.value }))
                    }
                    placeholder="Ej: LA VERDAD"
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm font-bold text-amber-400 focus:outline-none focus:border-amber-500 uppercase"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400">Línea Secundaria (Subtítulo):</label>
                  <input
                    type="text"
                    value={thumbConfig.textLine2}
                    onChange={(e) =>
                      setThumbConfig((prev) => ({ ...prev, textLine2: e.target.value }))
                    }
                    placeholder="Ej: CASO DOCUMENTAL"
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs font-bold text-white focus:outline-none focus:border-slate-700 uppercase"
                  />
                </div>
              </div>

              {/* Estilos Tipográficos Preestablecidos */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1.5">Estilo Visual:</label>
                <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                  {[
                    { id: 'yellow_black', label: '🟡 MrBeast Amarillo', desc: 'Borde negro grueso' },
                    { id: 'red_alert', label: '🔴 Alerta Roja', desc: 'Peligro / Resplandor' },
                    { id: 'gold_luxury', label: '🪙 Dorado 3D', desc: 'Imperio / Riqueza' },
                    { id: 'neon_cyan', label: '🔵 Neón Cyan', desc: 'Tech / Futuro' },
                    { id: 'clean_white', label: '⚪ Caja Negra', desc: 'Minimalista' },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() =>
                        setThumbConfig((prev) => ({
                          ...prev,
                          stylePreset: preset.id as any,
                        }))
                      }
                      className={`p-2 rounded-xl border text-left transition ${
                        thumbConfig.stylePreset === preset.id
                          ? 'border-amber-400 bg-amber-500/10 text-white'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div>{preset.label}</div>
                      <div className="text-[10px] text-slate-500 font-normal">{preset.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Fuente y Sliders de Ajuste */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] text-slate-400">Tipografía:</label>
                  <select
                    value={thumbConfig.fontFamily}
                    onChange={(e) =>
                      setThumbConfig((prev) => ({
                        ...prev,
                        fontFamily: e.target.value as any,
                      }))
                    }
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none"
                  >
                    <option value="Impact">Impact</option>
                    <option value="Anton">Anton</option>
                    <option value="Bebas Neue">Bebas Neue</option>
                    <option value="Montserrat Black">Montserrat Black</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400">
                    Inclinación Dinámica: {thumbConfig.tiltAngle}°
                  </label>
                  <input
                    type="range"
                    min="-8"
                    max="8"
                    step="1"
                    value={thumbConfig.tiltAngle}
                    onChange={(e) =>
                      setThumbConfig((prev) => ({
                        ...prev,
                        tiltAngle: Number(e.target.value),
                      }))
                    }
                    className="w-full mt-2 accent-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* PANEL 2: RECORTE DEL PERSONAJE Y RESPLANDOR NEÓN */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-purple-400" />
                  Sujeto / Personaje en Miniatura
                </h4>
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
                  {(['none', 'left', 'center', 'right'] as const).map((pos) => (
                    <button
                      key={pos}
                      onClick={() => setThumbConfig((prev) => ({ ...prev, characterPosition: pos }))}
                      className={`px-2 py-0.5 rounded capitalize font-semibold transition ${
                        thumbConfig.characterPosition === pos
                          ? 'bg-purple-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {pos === 'none' ? 'Ocultar' : pos}
                    </button>
                  ))}
                </div>
              </div>

              {thumbConfig.characterPosition !== 'none' && (
                <div className="space-y-3">
                  {/* Selector de personaje del proyecto */}
                  {project.characters && project.characters.length > 0 && (
                    <div>
                      <label className="text-[11px] text-slate-400">Seleccionar Personaje:</label>
                      <select
                        value={thumbConfig.characterId || ''}
                        onChange={(e) => {
                          const found = project.characters?.find(
                            (c) => c.character_id === e.target.value
                          );
                          if (found) {
                            setThumbConfig((prev) => ({
                              ...prev,
                              characterId: found.character_id,
                              characterUrl: found.canonical_image_url || prev.characterUrl,
                            }));
                          }
                        }}
                        className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none"
                      >
                        {project.characters.map((char) => (
                          <option key={char.character_id} value={char.character_id}>
                            {char.name} ({char.role})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Escala y Aura Neón */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400">
                        Tamaño: {Math.round(thumbConfig.characterScale * 100)}%
                      </label>
                      <input
                        type="range"
                        min="0.7"
                        max="1.3"
                        step="0.05"
                        value={thumbConfig.characterScale}
                        onChange={(e) =>
                          setThumbConfig((prev) => ({
                            ...prev,
                            characterScale: Number(e.target.value),
                          }))
                        }
                        className="w-full mt-2 accent-purple-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Aura Neón:</label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          id="glow-toggle"
                          checked={thumbConfig.characterGlow}
                          onChange={(e) =>
                            setThumbConfig((prev) => ({
                              ...prev,
                              characterGlow: e.target.checked,
                            }))
                          }
                          className="rounded accent-purple-500"
                        />
                        <label htmlFor="glow-toggle" className="text-xs text-slate-300">
                          Activar Glow
                        </label>
                        {thumbConfig.characterGlow && (
                          <div className="flex gap-1 ml-auto">
                            {['#FFE500', '#EF4444', '#06B6D4', '#FFFFFF'].map((color) => (
                              <button
                                key={color}
                                onClick={() =>
                                  setThumbConfig((prev) => ({
                                    ...prev,
                                    characterGlowColor: color,
                                  }))
                                }
                                style={{ backgroundColor: color }}
                                className={`w-4 h-4 rounded-full border ${
                                  thumbConfig.characterGlowColor === color
                                    ? 'ring-2 ring-white scale-110'
                                    : 'border-slate-700'
                                }`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* PANEL 3: BADGES & FLECHA ROJA DE RETENCIÓN */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-red-500" />
                Stickers & Flechas de Retención (CTR Booster)
              </h4>

              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { id: 'arrow', label: '🏹 Flecha Roja' },
                  { id: 'vs', label: '⚔️ Duelo VS' },
                  { id: 'alert', label: '🚨 ¡ALERTA!' },
                  { id: 'secret', label: '🔒 CONFIDENCIAL' },
                  { id: 'question', label: '❓ Signo ¿?!' },
                  { id: 'none', label: 'Sin Sticker' },
                ].map((b) => (
                  <button
                    key={b.id}
                    onClick={() =>
                      setThumbConfig((prev) => ({
                        ...prev,
                        badgeType: b.id as any,
                      }))
                    }
                    className={`p-2 rounded-xl border text-center font-bold transition ${
                      thumbConfig.badgeType === b.id
                        ? 'border-red-500 bg-red-500/10 text-white'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>

              {thumbConfig.badgeType === 'arrow' && (
                <div className="pt-1">
                  <label className="text-[11px] text-slate-400">
                    Ángulo de la Flecha: {thumbConfig.arrowAngle || -25}°
                  </label>
                  <input
                    type="range"
                    min="-90"
                    max="90"
                    step="5"
                    value={thumbConfig.arrowAngle || -25}
                    onChange={(e) =>
                      setThumbConfig((prev) => ({
                        ...prev,
                        arrowAngle: Number(e.target.value),
                      }))
                    }
                    className="w-full mt-1 accent-red-500"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: EMPAQUE YOUTUBE & SEO SUITE (TÍTULOS, DESCRIPCIÓN, TAGS)
         ========================================================================= */}
      {activeTab === 'seo' && (
        <div className="space-y-6">
          {/* BARRA DE SELECCIÓN DE IDIOMA DE METADATOS BILINGÜES */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Visualizar y Copiar Metadatos SEO</h4>
                <p className="text-[11px] text-slate-400">Alterna entre los metadatos principales en inglés y la traducción en español para YouTube Studio.</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setSeoLang('en')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                  seoLang === 'en'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🇺🇸</span> English (Master)
              </button>
              <button
                onClick={() => setSeoLang('es')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                  seoLang === 'es'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🇪🇸</span> Español (Localizado)
              </button>
            </div>
          </div>

          {/* SECCIÓN 1: TÍTULOS VIRALES MULTI-ÁNGULO */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Flame className="w-4 h-4 text-red-500" />
                  Títulos Virales con Análisis Psicológico de Gancho
                </h3>
                <p className="text-xs text-slate-400">
                  Variantes optimizadas para disparar el CTR sin caer en clickbait engañoso.
                </p>
              </div>

              {/* Título actual y contador */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Longitud Título Activo:</span>
                <span
                  className={`font-mono font-bold px-2 py-0.5 rounded border ${
                    project.title.length <= 65
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}
                >
                  {project.title.length} / 100 caracteres
                  {project.title.length <= 65 ? ' (Óptimo para móvil)' : ' (Puede recortarse)'}
                </span>
              </div>
            </div>

            {/* Grid de títulos sugeridos */}
            {metadata.suggestedTitles && metadata.suggestedTitles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {metadata.suggestedTitles.map((item, idx) => {
                  const isCurrent = project.title === item.title;
                  const categoryBadge = {
                    curiosity: { label: '🎯 Brecha de Curiosidad', color: 'text-amber-300 bg-amber-500/10 border-amber-500/30' },
                    drama: { label: '⚔️ Conflicto & Escándalo', color: 'text-rose-300 bg-rose-500/10 border-rose-500/30' },
                    story: { label: '📖 Storytelling / Caída', color: 'text-blue-300 bg-blue-500/10 border-blue-500/30' },
                    negative: { label: '🛑 Alerta / Peligro', color: 'text-red-300 bg-red-500/10 border-red-500/30' },
                    question: { label: '❓ Pregunta Provocadora', color: 'text-purple-300 bg-purple-500/10 border-purple-500/30' },
                    direct: { label: '📊 Cifras & Magnitud', color: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' },
                  }[item.category] || { label: '🔥 Título Viral', color: 'text-slate-300 bg-slate-800 border-slate-700' };

                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border transition flex flex-col justify-between gap-2.5 ${
                        isCurrent
                          ? 'bg-red-950/20 border-red-500 ring-1 ring-red-500/30'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${categoryBadge.color}`}
                          >
                            {categoryBadge.label}
                          </span>
                          {item.score && (
                            <span className="text-[10px] font-mono text-emerald-400 font-bold">
                              CTR Est: {item.score}%
                            </span>
                          )}
                        </div>

                        <div className="text-xs sm:text-sm font-bold text-white leading-snug">
                          {item.title}
                        </div>

                        <div className="text-[11px] text-slate-400 italic">
                          💡 {item.hookExplanation}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                        <button
                          onClick={() => handleSelectTitle(item)}
                          className={`flex-1 text-xs font-semibold py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
                            isCurrent
                              ? 'bg-red-600 text-white shadow-sm'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          {isCurrent ? 'Título Activo' : 'Usar este Título'}
                        </button>

                        <button
                          onClick={() => handleCopy(item.title, `title_${idx}`)}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded-lg border border-slate-700 transition"
                          title="Copiar título"
                        >
                          {copiedSection === `title_${idx}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed border-slate-800 rounded-xl space-y-2">
                <p className="text-xs text-slate-400">
                  Haz clic en el botón superior <strong>"✨ Generar Empaque con IA"</strong> para obtener 6 variantes estratégicas de títulos virales.
                </p>
              </div>
            )}
          </div>

          {/* SECCIÓN 2: DESCRIPCIÓN SEO CON CAPÍTULOS Y MARCAS DE TIEMPO EXACTAS */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  Descripción SEO con Marcas de Tiempo Automáticas
                </h3>
                <p className="text-xs text-slate-400">
                  Calculadas con las duraciones reales de las escenas para habilitar los capítulos en la barra de reproducción de YouTube.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded border bg-slate-950 text-slate-300 border-slate-800">
                  {seoLang === 'en' ? '🇺🇸 Inglés (Master)' : '🇪🇸 Español (Localizado)'}
                </span>
                <button
                  onClick={() => {
                    const textToCopy =
                      seoLang === 'es' && metadata.localizedEs?.description
                        ? metadata.localizedEs.description
                        : metadata.description || '';
                    handleCopy(textToCopy, 'desc');
                  }}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow transition"
                >
                  {copiedSection === 'desc' ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copiedSection === 'desc' ? '¡Copiado!' : `Copiar Descripción (${seoLang.toUpperCase()})`}
                </button>
              </div>
            </div>

            <textarea
              rows={11}
              value={
                seoLang === 'es' && metadata.localizedEs?.description
                  ? metadata.localizedEs.description
                  : metadata.description || ''
              }
              onChange={(e) => {
                const val = e.target.value;
                if (seoLang === 'es') {
                  setMetadata((prev) => ({
                    ...prev,
                    localizedEs: {
                      title: prev.localizedEs?.title || prev.selectedTitle || project.title,
                      description: val,
                      pinnedComment: prev.localizedEs?.pinnedComment,
                    },
                  }));
                } else {
                  setMetadata((prev) => ({ ...prev, description: val }));
                }
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 font-mono leading-relaxed focus:outline-none focus:border-purple-500"
              placeholder="La descripción completa generada aparecerá aquí..."
            />
          </div>

          {/* SECCIÓN 3: ETIQUETAS (TAGS) PARA YOUTUBE STUDIO & HASHTAGS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Caja de Etiquetas con contador estricto de 500 chars */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-blue-400" />
                  Etiquetas para YouTube Studio (Tags)
                </h4>
                <span
                  className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
                    tagsCharCount <= 490
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}
                >
                  {tagsCharCount} / 500 caracteres
                </span>
              </div>

              <p className="text-[11px] text-slate-400">
                Pega directamente este texto en la sección "Etiquetas" de YouTube Studio al subir el video:
              </p>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 font-mono break-words leading-relaxed max-h-36 overflow-y-auto">
                {tagsString || 'No hay etiquetas configuradas todavía.'}
              </div>

              <button
                onClick={() => handleCopy(tagsString, 'tags')}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 transition"
              >
                {copiedSection === 'tags' ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                {copiedSection === 'tags' ? '¡Etiquetas Copiadas!' : 'Copiar Todas las Etiquetas'}
              </button>
            </div>

            {/* Hashtags Principales */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-emerald-400" />
                  Hashtags Recomendados
                </h4>
                <button
                  onClick={() =>
                    handleCopy((metadata.hashtags || []).join(' '), 'hashtags')
                  }
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                >
                  {copiedSection === 'hashtags' ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  Copiar Todos
                </button>
              </div>

              <p className="text-[11px] text-slate-400">
                Aparecerán automáticamente sobre el título y en el motor de búsqueda:
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                {metadata.hashtags?.map((hash, i) => (
                  <span
                    key={i}
                    onClick={() => handleCopy(hash, `hash_${i}`)}
                    className="bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-semibold px-2.5 py-1 rounded-lg cursor-pointer hover:bg-emerald-900/50 transition flex items-center gap-1"
                    title="Clic para copiar"
                  >
                    {hash}
                    {copiedSection === `hash_${i}` && <Check className="w-3 h-3 text-emerald-400" />}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* SECCIÓN 4: HERRAMIENTAS DE RETENCIÓN & COMUNIDAD */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Comentario Fijado */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                  Comentario Fijado (Incentivo de Debate)
                </h4>
                <button
                  onClick={() => {
                    const textToCopy =
                      seoLang === 'es' && metadata.localizedEs?.pinnedComment
                        ? metadata.localizedEs.pinnedComment
                        : metadata.pinnedComment || '';
                    handleCopy(textToCopy, 'pinned');
                  }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                >
                  {copiedSection === 'pinned' ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  {copiedSection === 'pinned' ? '¡Copiado!' : `Copiar (${seoLang.toUpperCase()})`}
                </button>
              </div>

              <textarea
                rows={3}
                value={
                  seoLang === 'es' && metadata.localizedEs?.pinnedComment
                    ? metadata.localizedEs.pinnedComment
                    : metadata.pinnedComment || ''
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (seoLang === 'es') {
                    setMetadata((prev) => ({
                      ...prev,
                      localizedEs: {
                        title: prev.localizedEs?.title || prev.selectedTitle || project.title,
                        description: prev.localizedEs?.description || prev.description || '',
                        pinnedComment: val,
                      },
                    }));
                  } else {
                    setMetadata((prev) => ({ ...prev, pinnedComment: val }));
                  }
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 focus:outline-none"
              />
            </div>

            {/* Post Pestaña Comunidad */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5 text-rose-400" />
                  Anuncio Pestaña Comunidad
                </h4>
                <button
                  onClick={() => handleCopy(metadata.communityPost || '', 'comm')}
                  className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1"
                >
                  {copiedSection === 'comm' ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  Copiar
                </button>
              </div>

              <textarea
                rows={3}
                value={metadata.communityPost}
                onChange={(e) =>
                  setMetadata((prev) => ({ ...prev, communityPost: e.target.value }))
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: PAQUETE MAESTRO MULTILENGUAJE & YOUTUBE (OPCIÓN 1)
         ========================================================================= */}
      {activeTab === 'multilang' && (
        <div className="space-y-6">
          {/* BANNER EXPLICATIVO DE LA ESTRATEGIA MULTILENGUAJE */}
          <div className="bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-900 border border-blue-500/30 rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-wider font-bold bg-blue-500/20 text-blue-400 px-2.5 py-0.5 rounded border border-blue-500/30">
                Estrategia Oficial YouTube • Opción 1
              </span>
              <span className="text-xs text-slate-400 font-medium">Multi-Audio & Subtítulos CC</span>
            </div>
            <h3 className="text-base font-bold text-white">
              Un Solo Canal Internacional con Alcance Global y Máximo CPM
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
              Renderizas <strong>un solo video en 1080p limpio</strong> (sin subtítulos pegados). En YouTube subes la <strong>pista de doblaje en español</strong> y los <strong>subtítulos oficiales .srt</strong> en ambos idiomas. De este modo, el público angloparlante lo disfruta en inglés, el hispanohablante lo escucha en español con un clic, y los subtítulos nunca se solapan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* CARD 1: SUBTÍTULOS OFICIALES (.SRT / .VTT) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-emerald-400" />
                    Subtítulos Oficiales (Inglés & Español)
                  </h4>
                  {project.subtitlesEnUrl && (
                    <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">
                      ✓ Sincronizados
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Genera archivos <code>.srt</code> y <code>.vtt</code> con códigos de tiempo exactos listos para subir a la pestaña Subtítulos de YouTube Studio.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  disabled={isGeneratingSubtitles}
                  onClick={handleGenerateSubtitles}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition active:scale-95"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingSubtitles ? 'animate-spin' : ''}`} />
                  {isGeneratingSubtitles ? 'Generando Subtítulos...' : 'Generar Subtítulos (.srt / .vtt)'}
                </button>

                {(project.subtitlesEnUrl || project.subtitlesEsUrl) && (
                  <div className="flex items-center gap-2 pt-1">
                    {project.subtitlesEnUrl && (
                      <a
                        href={project.subtitlesEnUrl}
                        download={`subtitles_en_${project.project_id}.srt`}
                        className="flex-1 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 transition text-center"
                      >
                        <Download className="w-3.5 h-3.5 text-blue-400" />
                        Descargar English .SRT
                      </a>
                    )}
                    {project.subtitlesEsUrl && (
                      <a
                        href={project.subtitlesEsUrl}
                        download={`subtitles_es_${project.project_id}.srt`}
                        className="flex-1 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 transition text-center"
                      >
                        <Download className="w-3.5 h-3.5 text-amber-400" />
                        Descargar Español .SRT
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* CARD 2: PISTA DE DOBLAJE EN ESPAÑOL */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-amber-400" />
                    Pista de Doblaje en Español (-14 LUFS)
                  </h4>
                  {project.spanishAudioUrl && (
                    <span className="text-[10px] font-mono bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded border border-amber-500/30">
                      ✓ Pista Lista
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Traduce el guion y genera una pista de audio continua en español normalizada con FFmpeg para la función Multi-Audio de YouTube.
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs text-slate-400">Motor de voz:</span>
                  <select
                    value={dubProvider}
                    onChange={(e: any) => setDubProvider(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none"
                  >
                    <option value="edge">Edge Neural Jorge (Gratis)</option>
                    <option value="elevenlabs">ElevenLabs Multilingual v2</option>
                    <option value="voicestudio">VoiceStudio Local (RTX 3080)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  disabled={isGeneratingDub}
                  onClick={handleGenerateDubbing}
                  className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 transition active:scale-95"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingDub ? 'animate-spin' : ''}`} />
                  {isGeneratingDub ? 'Sintetizando y Normalizando a -14 LUFS...' : 'Generar Pista de Doblaje en Español'}
                </button>

                {project.spanishAudioUrl && (
                  <div className="space-y-2 pt-1">
                    <audio
                      controls
                      src={project.spanishAudioUrl}
                      className="w-full h-8 rounded"
                    />
                    <a
                      href={project.spanishAudioUrl}
                      download={`audio_spanish_track_${project.project_id}.mp3`}
                      className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 transition text-center"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-400" />
                      Descargar Pista de Audio en Español (.mp3)
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CARD 3: PAQUETE MAESTRO YOUTUBE BUNDLE (DESCARGA COMPLETA) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <PackageCheck className="w-5 h-5 text-blue-400" />
                  YouTube Master Pack (Paquete de Producción Completo)
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Reúne en una sola carpeta todos los archivos necesarios para publicar en YouTube en 2 minutos sin olvidar ningún detalle.
                </p>
              </div>

              <button
                disabled={isGeneratingBundle}
                onClick={handleGenerateBundle}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-600/25 transition active:scale-95"
              >
                <PackageCheck className={`w-4 h-4 ${isGeneratingBundle ? 'animate-spin' : ''}`} />
                {isGeneratingBundle ? 'Empaquetando...' : '📦 Generar Paquete YouTube'}
              </button>
            </div>

            {/* LISTA DE ARCHIVOS DISPONIBLES EN EL PAQUETE */}
            {bundleFiles.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-300">
                  Archivos listos en la carpeta de producción:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {bundleFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3 hover:border-slate-700 transition"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-mono font-semibold text-slate-200 truncate">
                          {file.name}
                        </p>
                        {file.sizeBytes && (
                          <p className="text-[10px] text-slate-500 font-mono">
                            {(file.sizeBytes / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        )}
                      </div>
                      <a
                        href={file.url}
                        download={file.name}
                        className="bg-slate-900 hover:bg-slate-800 text-blue-400 text-xs px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-1.5 transition flex-shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Descargar
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-4 text-center text-xs text-slate-400">
                Haz clic en <strong>"Generar Paquete YouTube"</strong> para compilar el video master, pista de audio doblada, subtítulos SRT, miniatura y guías de publicación en un solo lugar.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// HELPERS AUXILIARES PARA EL CANVAS NATIVO
// ============================================================================

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const imgRatio = img.width / img.height;
  const targetRatio = w / h;
  let sx = 0,
    sy = 0,
    sw = img.width,
    sh = img.height;

  if (imgRatio > targetRatio) {
    sw = img.height * targetRatio;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / targetRatio;
    sy = (img.height - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
