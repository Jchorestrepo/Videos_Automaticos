import React, { useState, useRef } from 'react';
import {
  Film,
  Sparkles,
  Copy,
  Download,
  Upload,
  RefreshCw,
  Check,
  ChevronRight,
  Image as ImageIcon,
  Wand2,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import type {
  ProjectScript,
  SceneItem,
  ShotItem,
  ShotPacingSeconds,
  VisualMode,
} from '../types/index.ts';

const COP_PER_IMAGE_ESTIMATE = 130;

export interface ShotStoryboardPanelProps {
  project: ProjectScript;
  onProjectUpdate: (updated: ProjectScript) => void;
  showToast: (msg: string) => void;
}

export const ShotStoryboardPanel: React.FC<ShotStoryboardPanelProps> = ({
  project,
  onProjectUpdate,
  showToast,
}) => {
  const [isPlanning, setIsPlanning] = useState(false);
  const [planningSceneId, setPlanningSceneId] = useState<number | null>(null);
  const [isGeneratingShots, setIsGeneratingShots] = useState(false);
  const [generatingKey, setGeneratingKey] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'tutorial' | 'prompts_only'>('tutorial');
  const [exportOnlyMissing, setExportOnlyMissing] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [expandedSceneId, setExpandedSceneId] = useState<number | null>(
    project.scenes[0]?.scene_id ?? 1
  );
  const [unmatchedFiles, setUnmatchedFiles] = useState<Array<{ fileName: string; error: string }>>([]);

  const bulkFileInputRef = useRef<HTMLInputElement | null>(null);

  const visualMode: VisualMode = project.visualMode || 'classic';
  const pacing: ShotPacingSeconds = project.shotPacingSeconds || 3;

  const totalShots = project.scenes.reduce((acc, s) => acc + (s.shots?.length || 0), 0);
  const shotsWithImage = project.scenes.reduce(
    (acc, s) =>
      acc +
      (s.shots || []).filter(
        (sh) => Boolean(sh.imageUrl) && !sh.imageUrl!.split('?')[0].toLowerCase().endsWith('.svg')
      ).length,
    0
  );
  const missingShots = Math.max(0, totalShots - shotsWithImage);
  const estimatedCopMissing = missingShots * COP_PER_IMAGE_ESTIMATE;

  const handleModeChange = async (newMode: VisualMode) => {
    try {
      const res = await fetch(`/api/projects/${project.project_id}/shots/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visualMode: newMode }),
      });
      const data = await res.json();
      if (data.project) {
        onProjectUpdate(data.project);
        showToast(
          newMode === 'sequence'
            ? '🎬 Modo Secuencia de Planos activado (cortes dinámicos por escena)'
            : '🖼️ Modo Clásico activado (1 imagen por escena, tus planos siguen guardados)'
        );
      }
    } catch (err: any) {
      showToast(`Error cambiando modo visual: ${err.message}`);
    }
  };

  const handlePacingChange = async (newPacing: ShotPacingSeconds) => {
    try {
      const res = await fetch(`/api/projects/${project.project_id}/shots/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shotPacingSeconds: newPacing }),
      });
      const data = await res.json();
      if (data.project) {
        onProjectUpdate(data.project);
        showToast(`⏱️ Ritmo ajustado a un corte cada ~${newPacing}s. Re-planifica para aplicar los nuevos cortes.`);
      }
    } catch (err: any) {
      showToast(`Error cambiando ritmo: ${err.message}`);
    }
  };

  const handlePlanShots = async (sceneId?: number) => {
    setIsPlanning(true);
    if (sceneId !== undefined) setPlanningSceneId(sceneId);
    try {
      const res = await fetch(`/api/projects/${project.project_id}/shots/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneId,
          pacing,
          reuseSceneImage: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error planificando planos');
      if (data.project) {
        onProjectUpdate(data.project);
        showToast(
          sceneId !== undefined
            ? `✓ Escena #${sceneId} dividida en planos (${pacing}s por corte)`
            : `✓ ¡${data.counts?.total || 0} planos diseñados en todo el video!`
        );
      }
    } catch (err: any) {
      showToast(`Error planificando: ${err.message}`);
    } finally {
      setIsPlanning(false);
      setPlanningSceneId(null);
    }
  };

  const fetchExportText = async (sceneId?: number): Promise<string> => {
    const params = new URLSearchParams({
      format: exportFormat,
      onlyMissing: String(exportOnlyMissing),
    });
    if (sceneId !== undefined) params.set('sceneId', String(sceneId));
    const res = await fetch(
      `/api/projects/${project.project_id}/shots/export-prompts?${params.toString()}`
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error exportando prompts');
    return data.text || '';
  };

  const handleCopyPrompts = async (sceneId?: number) => {
    try {
      const text = await fetchExportText(sceneId);
      await navigator.clipboard.writeText(text);
      const key = sceneId !== undefined ? `scene_${sceneId}` : 'all';
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2200);
      showToast(
        sceneId !== undefined
          ? `📋 Prompts de la Escena #${sceneId} copiados al portapapeles`
          : `📋 Todos los prompts (${exportOnlyMissing ? missingShots : totalShots}) copiados al portapapeles`
      );
    } catch (err: any) {
      showToast(`Error copiando prompts: ${err.message}`);
    }
  };

  const handleDownloadPromptsTxt = async () => {
    try {
      const text = await fetchExportText();
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeTitle = project.title.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 40);
      a.download = `prompts_${safeTitle}_${pacing}s.txt`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('📥 Archivo .TXT de prompts descargado');
    } catch (err: any) {
      showToast(`Error descargando TXT: ${err.message}`);
    }
  };

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error(`Error leyendo ${file.name}`));
      reader.readAsDataURL(file);
    });

  const handleUploadFiles = async (
    fileList: FileList | null,
    explicitTarget?: { sceneId: number; shotId: string }
  ) => {
    if (!fileList || fileList.length === 0) return;
    setIsImporting(true);
    setUnmatchedFiles([]);
    try {
      const payloadFiles = [];
      for (const file of Array.from(fileList)) {
        const imageBase64 = await readFileAsDataUrl(file);
        payloadFiles.push({
          fileName: file.name,
          imageBase64,
          sceneId: explicitTarget?.sceneId,
          shotId: explicitTarget?.shotId,
        });
      }

      const res = await fetch(`/api/projects/${project.project_id}/shots/import-images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: payloadFiles }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error importando imágenes');
      if (data.project) onProjectUpdate(data.project);

      const matchedCount = data.matched?.length || 0;
      const unmatched = data.unmatched || [];
      setUnmatchedFiles(unmatched);

      if (unmatched.length > 0) {
        showToast(
          `⚠️ ${matchedCount} imagen(es) asignadas • ${unmatched.length} sin coincidencia de nombre`
        );
      } else {
        showToast(`✅ ¡${matchedCount} imagen(es) vinculadas a sus planos correctamente!`);
      }
    } catch (err: any) {
      showToast(`Error importando imágenes: ${err.message}`);
    } finally {
      setIsImporting(false);
      if (bulkFileInputRef.current) bulkFileInputRef.current.value = '';
    }
  };

  const handleGenerateShotImages = async (opts: {
    sceneId?: number;
    shotId?: string;
    onlyMissing?: boolean;
  }) => {
    const key = opts.shotId || (opts.sceneId !== undefined ? `scene_${opts.sceneId}` : 'all');
    setIsGeneratingShots(true);
    setGeneratingKey(key);
    try {
      const res = await fetch(`/api/projects/${project.project_id}/shots/generate-images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error generando imágenes de planos');
      if (data.project) {
        onProjectUpdate(data.project);
        showToast(`✨ ¡${data.generatedCount || 0} imagen(es) de planos generadas con Gemini!`);
      }
    } catch (err: any) {
      showToast(`Error generando planos: ${err.message}`);
    } finally {
      setIsGeneratingShots(false);
      setGeneratingKey(null);
    }
  };

  const handleUpdateShotPrompt = async (
    scene: SceneItem,
    shotId: string,
    newPrompt: string
  ) => {
    const updatedShots: ShotItem[] = (scene.shots || []).map((sh) =>
      sh.shot_id === shotId ? { ...sh, visual_prompt: newPrompt } : sh
    );
    try {
      const res = await fetch(`/api/projects/${project.project_id}/shots/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneId: scene.scene_id, shots: updatedShots }),
      });
      const data = await res.json();
      if (data.project) onProjectUpdate(data.project);
    } catch (err: any) {
      showToast(`Error guardando prompt: ${err.message}`);
    }
  };

  return (
    <div className="bg-slate-900/95 border border-indigo-500/30 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
      {/* Cabecera: Selector de Modo (Clásico vs Secuencia) + Selector de Ritmo (3s / 4s / 6s) */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white">
                Metodología Visual del Video
              </h3>
              <span
                className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${
                  visualMode === 'sequence'
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                {visualMode === 'sequence'
                  ? `Secuencia Activa • Corte cada ~${pacing}s`
                  : 'Modo Clásico • 1 Imagen / Escena'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Conviven ambos modos sin perder tu avance: usa 1 imagen por escena o divide cada escena en planos de cámara sincronizados con la narración.
            </p>
          </div>
        </div>

        {/* Switch Modo Clásico / Modo Secuencia */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800">
            <button
              type="button"
              onClick={() => handleModeChange('classic')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                visualMode === 'classic'
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              Clásico (24 imgs)
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('sequence')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                visualMode === 'sequence'
                  ? 'bg-indigo-600 text-white shadow shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Secuencia Dinámica (Multi-Plano)
            </button>
          </div>

          {/* Selector de ritmo: 3s (~8 planos), 4s (~6 planos), 6s (~4 planos) */}
          <div className="inline-flex items-center rounded-xl bg-slate-950 p-1 border border-slate-800">
            {([3, 4, 6] as ShotPacingSeconds[]).map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => handlePacingChange(sec)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition ${
                  pacing === sec
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
                title={
                  sec === 3
                    ? 'Corte cada ~3s (~8 planos por escena • Máxima retención)'
                    : sec === 4
                    ? 'Corte cada ~4s (~6 planos por escena • Equilibrado)'
                    : 'Corte cada ~6s (~4 planos por escena • Documental pausado)'
                }
              >
                Cada {sec}s ({sec === 3 ? '~8' : sec === 4 ? '~6' : '~4'}/esc)
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Barra de Acciones de Secuencia: Planificar + Exportar/Importar Manual + Generar con IA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Columna 1: Paso 1 - Planificar Planos */}
        <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5 flex flex-col justify-between gap-3">
          <div>
            <div className="text-[11px] font-mono uppercase text-indigo-400 font-bold">
              1. Director de Planos (Storyboard)
            </div>
            <div className="text-xs text-slate-300 mt-1">
              {totalShots > 0 ? (
                <>
                  <span className="font-bold text-white">{totalShots} planos</span> diseñados en{' '}
                  {project.scenes.length} escenas ({shotsWithImage} con imagen,{' '}
                  <span className="text-amber-300 font-semibold">{missingShots} pendientes</span>).
                </>
              ) : (
                'Divide automáticamente cada escena en planos de cámara según la locución y reutiliza la imagen principal como Plano 1.'
              )}
            </div>
          </div>

          <button
            type="button"
            disabled={isPlanning}
            onClick={() => handlePlanShots()}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold px-3.5 py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition"
          >
            {isPlanning && planningSceneId === null ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4" />
            )}
            <span>
              {isPlanning && planningSceneId === null
                ? 'Diseñando Planos con IA...'
                : totalShots > 0
                ? `Re-planificar Todo (Corte cada ${pacing}s)`
                : `Diseñar Planos del Video (Corte cada ${pacing}s)`}
            </span>
          </button>
        </div>

        {/* Columna 2: Paso 2A - Flujo Manual Gratis (Copiar/Descargar Prompts + Importar en Bloque) */}
        <div className="bg-slate-950/80 border border-emerald-500/30 rounded-xl p-3.5 flex flex-col justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono uppercase text-emerald-400 font-bold">
                2A. Modo Manual (Google Web / $0)
              </span>
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOnlyMissing}
                    onChange={(e) => setExportOnlyMissing(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-emerald-500 w-3 h-3"
                  />
                  <span>Solo faltantes</span>
                </label>
                <select
                  value={exportFormat}
                  onChange={(e) =>
                    setExportFormat(e.target.value as 'tutorial' | 'prompts_only')
                  }
                  className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-slate-200"
                >
                  <option value="tutorial">Formato Tutorial ([001] + Voz)</option>
                  <option value="prompts_only">Solo Prompts ([001] ...)</option>
                </select>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Copia o descarga todos los prompts con prefijo <code className="text-emerald-300">[001]</code>, créalos en Google y súbelos juntos aquí.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={totalShots === 0}
              onClick={() => handleCopyPrompts()}
              className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-emerald-300 border border-emerald-500/30 text-xs font-bold px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 transition"
            >
              {copiedKey === 'all' ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>Copiar Prompts</span>
            </button>

            <button
              type="button"
              disabled={totalShots === 0}
              onClick={handleDownloadPromptsTxt}
              className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 text-xs font-bold px-2.5 py-2 rounded-lg flex items-center gap-1 transition"
              title="Descargar archivo .txt con todos los prompts"
            >
              <Download className="w-3.5 h-3.5" />
              <span>.TXT</span>
            </button>

            <input
              ref={bulkFileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleUploadFiles(e.target.files)}
            />
            <button
              type="button"
              disabled={totalShots === 0 || isImporting}
              onClick={() => bulkFileInputRef.current?.click()}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition"
              title="Selecciona todas las imágenes descargadas (001.png, [001].png o S01-P01.png) para pegarlas de golpe"
            >
              {isImporting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              <span>Pegar / Subir Lote</span>
            </button>
          </div>
        </div>

        {/* Columna 3: Paso 2B - Flujo Automático con Gemini API */}
        <div className="bg-slate-950/80 border border-amber-500/30 rounded-xl p-3.5 flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase text-amber-400 font-bold">
                2B. Modo Automático (Gemini API)
              </span>
              <span className="text-[11px] font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                ~${estimatedCopMissing.toLocaleString('es-CO')} COP ({missingShots} imgs)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Genera automáticamente los planos faltantes con Gemini 2.5 Flash Image manteniendo retratos de referencia y continuidad.
            </p>
          </div>

          <button
            type="button"
            disabled={totalShots === 0 || missingShots === 0 || isGeneratingShots}
            onClick={() => handleGenerateShotImages({ onlyMissing: true })}
            className="w-full bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 disabled:opacity-40 text-white text-xs font-bold px-3.5 py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-md shadow-amber-600/20 transition"
          >
            {isGeneratingShots && generatingKey === 'all' ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>
              {isGeneratingShots && generatingKey === 'all'
                ? 'Generando Planos en Curso...'
                : `Generar ${missingShots} Planos Faltantes (~$${estimatedCopMissing.toLocaleString('es-CO')} COP)`}
            </span>
          </button>
        </div>
      </div>

      {/* Aviso si algún archivo importado no coincidió por nombre */}
      {unmatchedFiles.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-200 space-y-1">
          <div className="font-bold">
            Archivos sin número o código reconocido ({unmatchedFiles.length}):
          </div>
          <div className="text-[11px] text-slate-300">
            Renómbralos como <code>001.png</code>, <code>[001].png</code> o <code>S01-P01.png</code>, o súbelos directamente en la tarjeta de su plano abajo:
          </div>
          <ul className="list-disc list-inside text-[11px] text-amber-300/90">
            {unmatchedFiles.slice(0, 8).map((u, idx) => (
              <li key={idx}>
                <span className="font-mono">{u.fileName}</span>: {u.error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tira de Planos por Escena (Storyboard Desplegable) */}
      {totalShots > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="font-semibold text-slate-200">
              Storyboard por Escena (clic en una escena para ver, copiar o editar sus planos):
            </span>
            <span>
              {shotsWithImage}/{totalShots} planos con imagen lista
            </span>
          </div>

          <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
            {project.scenes.map((scene) => {
              const shots = scene.shots || [];
              const readyCount = shots.filter(
                (sh) =>
                  Boolean(sh.imageUrl) && !sh.imageUrl!.split('?')[0].toLowerCase().endsWith('.svg')
              ).length;
              const isExpanded = expandedSceneId === scene.scene_id;

              return (
                <div
                  key={scene.scene_id}
                  className="bg-slate-950/90 border border-slate-800 rounded-xl overflow-hidden"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-900/70">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedSceneId(isExpanded ? null : scene.scene_id)
                      }
                      className="flex items-center gap-2 text-left text-xs font-bold text-white hover:text-indigo-300 transition"
                    >
                      <ChevronRight
                        className={`w-4 h-4 text-slate-400 transition-transform ${
                          isExpanded ? 'rotate-90 text-indigo-400' : ''
                        }`}
                      />
                      <span>
                        Escena #{scene.scene_id}: {scene.chapter}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                          readyCount === shots.length && shots.length > 0
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {readyCount}/{shots.length} planos
                      </span>
                    </button>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCopyPrompts(scene.scene_id)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 border border-slate-700"
                        title="Copiar los prompts de esta escena"
                      >
                        {copiedKey === `scene_${scene.scene_id}` ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>Copiar Escena</span>
                      </button>

                      <button
                        type="button"
                        disabled={isPlanning}
                        onClick={() => handlePlanShots(scene.scene_id)}
                        className="bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[11px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 border border-indigo-500/30"
                        title="Re-planificar los planos de esta escena"
                      >
                        {isPlanning && planningSceneId === scene.scene_id ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Wand2 className="w-3 h-3" />
                        )}
                        <span>Re-planificar</span>
                      </button>

                      <button
                        type="button"
                        disabled={isGeneratingShots || readyCount === shots.length}
                        onClick={() =>
                          handleGenerateShotImages({
                            sceneId: scene.scene_id,
                            onlyMissing: true,
                          })
                        }
                        className="bg-amber-600/90 hover:bg-amber-500 disabled:opacity-40 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1"
                        title="Generar con Gemini los planos faltantes de esta escena"
                      >
                        {isGeneratingShots && generatingKey === `scene_${scene.scene_id}` ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Sparkles className="w-3 h-3" />
                        )}
                        <span>Generar Escena ({shots.length - readyCount})</span>
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 border-t border-slate-800/80">
                      {shots.map((shot) => {
                        const numStr = String(shot.global_index).padStart(3, '0');
                        const hasImg =
                          Boolean(shot.imageUrl) &&
                          !shot.imageUrl!.split('?')[0].toLowerCase().endsWith('.svg');

                        return (
                          <div
                            key={shot.shot_id}
                            className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between"
                          >
                            {/* Miniatura 16:9 */}
                            <div className="relative aspect-video bg-slate-950 border-b border-slate-800 overflow-hidden">
                              {hasImg ? (
                                <img
                                  src={shot.imageUrl}
                                  alt={shot.shot_id}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 text-[11px] p-2 text-center">
                                  <ImageIcon className="w-5 h-5 mb-1 opacity-50" />
                                  <span>Sin imagen ({numStr}.png)</span>
                                </div>
                              )}
                              <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                                <span className="bg-black/80 text-white text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-slate-700">
                                  [{numStr}] {shot.shot_id}
                                </span>
                                {shot.imageSource && (
                                  <span className="bg-indigo-950/90 text-indigo-300 text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border border-indigo-500/30">
                                    {shot.imageSource === 'scene_reuse'
                                      ? 'Plano Base'
                                      : shot.imageSource === 'manual'
                                      ? 'Manual'
                                      : 'IA'}
                                  </span>
                                )}
                              </div>
                              {hasImg && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute top-1.5 right-1.5 drop-shadow" />
                              )}
                            </div>

                            {/* Fragmento de locución + Prompt editable */}
                            <div className="p-2.5 space-y-2 flex-1 flex flex-col justify-between">
                              <div className="space-y-1.5">
                                <div
                                  className="text-[11px] text-amber-200/90 italic line-clamp-2"
                                  title={shot.voiceText}
                                >
                                  "{shot.voiceText}"
                                </div>
                                <textarea
                                  defaultValue={shot.visual_prompt}
                                  onBlur={(e) => {
                                    const val = e.target.value.trim();
                                    if (val && val !== shot.visual_prompt) {
                                      handleUpdateShotPrompt(scene, shot.shot_id, val);
                                    }
                                  }}
                                  rows={3}
                                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-[11px] text-slate-300 focus:border-indigo-500 focus:outline-none resize-none"
                                  placeholder="Prompt visual en inglés..."
                                />
                              </div>

                              <div className="flex items-center justify-between gap-1 pt-1">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await navigator.clipboard.writeText(
                                      `[${numStr}] ${shot.visual_prompt}`
                                    );
                                    setCopiedKey(shot.shot_id);
                                    setTimeout(() => setCopiedKey(null), 1800);
                                    showToast(`Prompt [${numStr}] copiado`);
                                  }}
                                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold px-2 py-1 rounded flex items-center gap-1"
                                  title="Copiar prompt de este plano"
                                >
                                  {copiedKey === shot.shot_id ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                  <span>Copiar</span>
                                </button>

                                <label
                                  className="bg-slate-800 hover:bg-slate-700 text-emerald-300 text-[10px] font-semibold px-2 py-1 rounded flex items-center gap-1 cursor-pointer"
                                  title="Subir imagen manual para este plano"
                                >
                                  <Upload className="w-3 h-3" />
                                  <span>Subir</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) =>
                                      handleUploadFiles(e.target.files, {
                                        sceneId: scene.scene_id,
                                        shotId: shot.shot_id,
                                      })
                                    }
                                  />
                                </label>

                                <button
                                  type="button"
                                  disabled={isGeneratingShots}
                                  onClick={() =>
                                    handleGenerateShotImages({
                                      sceneId: scene.scene_id,
                                      shotId: shot.shot_id,
                                      onlyMissing: false,
                                    })
                                  }
                                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1"
                                  title="Generar este plano con Gemini (~$130 COP)"
                                >
                                  {isGeneratingShots && generatingKey === shot.shot_id ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Sparkles className="w-3 h-3" />
                                  )}
                                  <span>IA</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
