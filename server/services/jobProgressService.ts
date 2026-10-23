import type { Response } from 'express';
import type { ChildProcess } from 'node:child_process';
import type { JobProgressState } from '../../src/types/index.ts';

export class JobProgressService {
  private static jobs = new Map<string, JobProgressState>();
  private static cancelledJobs = new Set<string>();
  private static childProcesses = new Map<string, ChildProcess>();
  private static sseClients = new Set<Response>();

  static createJob(params: {
    type: JobProgressState['type'];
    title: string;
    projectId?: string;
    channelId?: string;
    phase: string;
    totalSteps?: number;
  }): JobProgressState {
    const jobId = `job_${params.type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const job: JobProgressState = {
      jobId,
      type: params.type,
      projectId: params.projectId,
      channelId: params.channelId,
      title: params.title,
      status: 'running',
      percent: 2,
      phase: params.phase,
      currentStep: 0,
      totalSteps: params.totalSteps,
      startedAt: now,
      updatedAt: now,
    };
    this.jobs.set(jobId, job);
    this.broadcast(job);
    return job;
  }

  static updateJob(
    jobId: string,
    patch: Partial<Pick<JobProgressState, 'percent' | 'phase' | 'detail' | 'currentStep' | 'totalSteps' | 'projectId'>>
  ): JobProgressState | null {
    const job = this.jobs.get(jobId);
    if (!job) return null;
    if (this.cancelledJobs.has(jobId)) {
      job.status = 'cancelled';
      job.phase = 'Tarea cancelada por el usuario';
      job.updatedAt = new Date().toISOString();
      this.broadcast(job);
      return job;
    }

    if (patch.percent !== undefined) {
      job.percent = Math.max(0, Math.min(99, Math.round(patch.percent)));
    }
    if (patch.phase !== undefined) job.phase = patch.phase;
    if (patch.detail !== undefined) job.detail = patch.detail;
    if (patch.currentStep !== undefined) job.currentStep = patch.currentStep;
    if (patch.totalSteps !== undefined) job.totalSteps = patch.totalSteps;
    if (patch.projectId !== undefined) job.projectId = patch.projectId;
    job.updatedAt = new Date().toISOString();

    this.jobs.set(jobId, job);
    this.broadcast(job);
    return job;
  }

  static completeJob(jobId: string, finalPhase: string = '¡Proceso completado con éxito!', detail?: string): JobProgressState | null {
    const job = this.jobs.get(jobId);
    if (!job) return null;
    job.status = 'completed';
    job.percent = 100;
    job.phase = finalPhase;
    if (detail !== undefined) job.detail = detail;
    job.updatedAt = new Date().toISOString();
    this.childProcesses.delete(jobId);
    this.jobs.set(jobId, job);
    this.broadcast(job);
    return job;
  }

  static failJob(jobId: string, errorMsg: string): JobProgressState | null {
    const job = this.jobs.get(jobId);
    if (!job) return null;
    job.status = 'failed';
    job.error = errorMsg;
    job.phase = `Error: ${errorMsg}`;
    job.updatedAt = new Date().toISOString();
    this.childProcesses.delete(jobId);
    this.jobs.set(jobId, job);
    this.broadcast(job);
    return job;
  }

  static cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;
    this.cancelledJobs.add(jobId);
    const proc = this.childProcesses.get(jobId);
    if (proc) {
      try {
        proc.kill('SIGTERM');
      } catch {}
      this.childProcesses.delete(jobId);
    }
    job.status = 'cancelled';
    job.phase = 'Cancelado por el usuario';
    job.updatedAt = new Date().toISOString();
    this.jobs.set(jobId, job);
    this.broadcast(job);
    return true;
  }

  static isCancelled(jobId?: string): boolean {
    if (!jobId) return false;
    return this.cancelledJobs.has(jobId);
  }

  static registerChildProcess(jobId: string, proc: ChildProcess): void {
    this.childProcesses.set(jobId, proc);
  }

  static getActiveJobs(): JobProgressState[] {
    const now = Date.now();
    const list: JobProgressState[] = [];
    for (const [id, job] of this.jobs.entries()) {
      const ageMs = now - new Date(job.updatedAt).getTime();
      if (job.status === 'running' || ageMs < 15000) {
        list.push(job);
      } else if (ageMs > 120000) {
        this.jobs.delete(id);
      }
    }
    return list.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  static addSseClient(res: Response): void {
    this.sseClients.add(res);
    // Send initial snapshot
    const active = this.getActiveJobs();
    res.write(`data: ${JSON.stringify({ type: 'snapshot', jobs: active })}\n\n`);
  }

  static removeSseClient(res: Response): void {
    this.sseClients.delete(res);
  }

  private static broadcast(job: JobProgressState): void {
    const payload = `data: ${JSON.stringify({ type: 'job_update', job })}\n\n`;
    for (const client of this.sseClients) {
      try {
        client.write(payload);
      } catch {
        this.sseClients.delete(client);
      }
    }
  }
}
