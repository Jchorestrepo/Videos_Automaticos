import React, { useEffect, useState } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  Image as ImageIcon,
  Mic,
  Film,
  Square,
  Zap,
} from 'lucide-react';
import type { JobProgressState } from '../types/index.ts';

interface GlobalProgressBarProps {
  channelId?: string;
  projectId?: string;
  onJobFinished?: (job: JobProgressState) => void;
  compact?: boolean;
}

export const GlobalProgressBar: React.FC<GlobalProgressBarProps> = ({
  channelId,
  projectId,
  onJobFinished,
  compact = false,
}) => {
  const [jobs, setJobs] = useState<JobProgressState[]>([]);
  const [now, setNow] = useState<number>(Date.now());
  const [cancellingIds, setCancellingIds] = useState<string[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // 1. Carga inicial de trabajos activos
    fetch('/api/jobs/active')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setJobs(data);
        }
      })
      .catch(() => {});

    // 2. Conexión en tiempo real vía Server-Sent Events (SSE)
    const es = new EventSource('/api/jobs/stream');

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'init' && Array.isArray(payload.jobs)) {
          setJobs(payload.jobs);
        } else if (payload.type === 'update' && payload.job) {
          const updatedJob: JobProgressState = payload.job;
          setJobs((prev) => {
            const exists = prev.some((j) => j.jobId === updatedJob.jobId);
            if (!exists) return [updatedJob, ...prev];
            return prev.map((j) => (j.jobId === updatedJob.jobId ? updatedJob : j));
          });

          if (
            updatedJob.status === 'completed' ||
            updatedJob.status === 'failed' ||
            updatedJob.status === 'cancelled'
          ) {
            if (onJobFinished) {
              onJobFinished(updatedJob);
            }
            // Limpiar de la vista tras 8 segundos si ya terminó
            setTimeout(() => {
              setJobs((prev) => prev.filter((j) => j.jobId !== updatedJob.jobId));
            }, 8000);
          }
        }
      } catch {
        // Ignorar errores de parseo SSE
      }
    };

    return () => {
      es.close();
    };
  }, []);

  const handleCancelJob = async (jobId: string) => {
    setCancellingIds((prev) => [...prev, jobId]);
    try {
      await fetch(`/api/jobs/${jobId}/cancel`, { method: 'POST' });
    } catch (e) {
      console.error('Error cancelando tarea:', e);
    } finally {
      setCancellingIds((prev) => prev.filter((id) => id !== jobId));
    }
  };

  // Filtrar trabajos relevantes (mostrar todos los activos o los del canal/proyecto actual)
  const visibleJobs = jobs.filter((j) => {
    // Ocultar trabajos terminados hace más de 10 segundos
    const updatedAge = now - new Date(j.updatedAt).getTime();
    if (j.status !== 'running' && updatedAge > 10000) return false;
    if (projectId && j.projectId && j.projectId !== projectId && j.status !== 'running') {
      return false;
    }
    return true;
  });

  if (visibleJobs.length === 0) return null;

  const formatElapsed = (startedAt: string, updatedAt: string, status: string) => {
    const startMs = new Date(startedAt).getTime();
    const endMs = status === 'running' ? now : new Date(updatedAt).getTime();
    const totalSec = Math.max(0, Math.floor((endMs - startMs) / 1000));
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const getJobIcon = (type: JobProgressState['type']) => {
    switch (type) {
      case 'script':
        return <Sparkles className="w-4 h-4 text-blue-400" />;
      case 'images':
        return <ImageIcon className="w-4 h-4 text-purple-400" />;
      case 'audio':
        return <Mic className="w-4 h-4 text-emerald-400" />;
      case 'render':
        return <Film className="w-4 h-4 text-amber-400" />;
      case 'turbo_production':
        return <Zap className="w-4 h-4 text-amber-300" />;
      default:
        return <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />;
    }
  };

  const getJobBadgeLabel = (type: JobProgressState['type']) => {
    switch (type) {
      case 'script':
        return 'Guion Documental IA';
      case 'images':
        return 'Motor Visual 3D';
      case 'audio':
        return 'Síntesis de Locución';
      case 'render':
        return 'Renderizado MP4 1080p';
      case 'turbo_production':
        return '⚡ Producción Turbo (Imágenes + Audio)';
      default:
        return 'Proceso Activo';
    }
  };

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3 mb-5'}>
      {visibleJobs.map((job) => {
        const isRunning = job.status === 'running';
        const isCompleted = job.status === 'completed';
        const isFailed = job.status === 'failed';
        const isCancelled = job.status === 'cancelled';
        const elapsed = formatElapsed(job.startedAt, job.updatedAt, job.status);

        const barColor = isCompleted
          ? 'from-emerald-500 to-teal-400'
          : isFailed || isCancelled
          ? 'from-rose-600 to-orange-500'
          : job.type === 'images'
          ? 'from-purple-600 via-indigo-500 to-blue-500'
          : job.type === 'audio'
          ? 'from-emerald-600 via-teal-500 to-cyan-500'
          : job.type === 'render'
          ? 'from-amber-500 via-orange-500 to-pink-500'
          : job.type === 'turbo_production'
          ? 'from-amber-400 via-rose-500 to-indigo-600'
          : 'from-blue-600 via-indigo-500 to-purple-500';

        return (
          <div
            key={job.jobId}
            className={`rounded-2xl border p-4 shadow-xl transition-all ${
              isCompleted
                ? 'bg-emerald-950/30 border-emerald-500/40'
                : isFailed || isCancelled
                ? 'bg-rose-950/30 border-rose-500/40'
                : 'bg-slate-900/95 border-blue-500/40 ring-1 ring-blue-500/20'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : isFailed ? (
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                  ) : isCancelled ? (
                    <XCircle className="w-4 h-4 text-amber-400" />
                  ) : (
                    getJobIcon(job.type)
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono uppercase font-extrabold tracking-wider px-2 py-0.5 rounded bg-slate-950 text-blue-300 border border-slate-800">
                      {getJobBadgeLabel(job.type)}
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                      {job.title}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-1.5">
                    {isRunning && (
                      <RefreshCw className="w-3 h-3 text-blue-400 animate-spin shrink-0" />
                    )}
                    <span className="truncate">{job.phase}</span>
                  </p>
                </div>
              </div>

              {/* Porcentaje Grande + Tiempo + Botón Cancelar */}
              <div className="flex items-center gap-3 ml-auto">
                <div className="text-right">
                  <div className="flex items-baseline justify-end gap-1.5">
                    <span className="text-lg sm:text-xl font-black font-mono text-white">
                      {job.percent}%
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      ({job.currentStep}/{job.totalSteps})
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    ⏱ Tiempo: {elapsed}
                  </div>
                </div>

                {isRunning ? (
                  <button
                    onClick={() => handleCancelJob(job.jobId)}
                    disabled={cancellingIds.includes(job.jobId)}
                    className="bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
                    title="Detener proceso inmediatamente"
                  >
                    <Square className="w-3 h-3 fill-rose-400 text-rose-400" />
                    {cancellingIds.includes(job.jobId) ? 'Deteniendo...' : 'Cancelar'}
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      setJobs((prev) => prev.filter((item) => item.jobId !== job.jobId))
                    }
                    className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-slate-800"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Barra de Progreso Visual */}
            <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-300 ease-out relative`}
                style={{ width: `${Math.max(3, Math.min(100, job.percent))}%` }}
              >
                {isRunning && (
                  <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
