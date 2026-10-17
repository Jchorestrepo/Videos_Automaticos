import { spawn, exec } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RUNTIME_DIR = '/home/pc/.config/VoiceStudio/runtime/project';
const PYTHON_BIN = '/home/pc/.config/VoiceStudio/runtime/project/.venv/bin/python';
const LOG_FILE = path.resolve(__dirname, '../../storage/voicestudio.log');
const PORT = 3900;
const HEALTH_URL = `http://127.0.0.1:${PORT}/system/info`;

export interface VoiceStudioStatus {
  running: boolean;
  port: number;
  device?: string;
  gpu?: string;
  vramTotalGb?: number;
  pid?: number | null;
  logPath?: string;
}

export class VoiceStudioService {
  private static activeProcess: any = null;

  /**
   * Verifica si VoiceStudio está respondiendo en el puerto 3900
   */
  static async isRunning(): Promise<boolean> {
    try {
      const res = await fetch(HEALTH_URL, {
        signal: AbortSignal.timeout(1500),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Obtiene información detallada del estado del backend de audio local
   */
  static async getStatus(): Promise<VoiceStudioStatus> {
    const running = await this.isRunning();
    if (!running) {
      return {
        running: false,
        port: PORT,
        pid: this.activeProcess?.pid || null,
        logPath: LOG_FILE,
      };
    }

    try {
      const res = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(2000) });
      const data: any = await res.json();
      return {
        running: true,
        port: PORT,
        device: data.device || 'cuda',
        gpu: data.gpu_name || 'NVIDIA GeForce RTX 3080',
        vramTotalGb: data.vram_total_gb,
        pid: this.activeProcess?.pid || null,
        logPath: LOG_FILE,
      };
    } catch {
      return {
        running: true,
        port: PORT,
        device: 'cuda',
        gpu: 'NVIDIA GeForce RTX 3080',
        pid: this.activeProcess?.pid || null,
        logPath: LOG_FILE,
      };
    }
  }

  /**
   * Arranca el backend de VoiceStudio (FastAPI / Uvicorn con CUDA en RTX 3080)
   * Si ya está corriendo, no hace nada y devuelve su estado.
   */
  static async start(): Promise<VoiceStudioStatus> {
    if (await this.isRunning()) {
      console.log('✓ [VoiceStudio] Ya está corriendo en http://127.0.0.1:3900');
      return this.getStatus();
    }

    // Asegurar directorio de almacenamiento para el log
    const storageDir = path.dirname(LOG_FILE);
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    console.log(`🚀 [VoiceStudio] Iniciando backend de audio en ${RUNTIME_DIR} (GPU RTX 3080)...`);
    const logStream = fs.openSync(LOG_FILE, 'a');

    const child = spawn(
      PYTHON_BIN,
      ['-m', 'uvicorn', 'main:app', '--app-dir', 'backend', '--host', '127.0.0.1', '--port', String(PORT)],
      {
        cwd: RUNTIME_DIR,
        detached: true,
        stdio: ['ignore', logStream, logStream],
      }
    );

    child.unref();
    this.activeProcess = child;

    // Esperar hasta que responda el endpoint /system/info (máximo 45 segundos)
    const startTime = Date.now();
    const timeoutMs = 45000;

    while (Date.now() - startTime < timeoutMs) {
      await new Promise((r) => setTimeout(r, 600));
      if (await this.isRunning()) {
        console.log(`✓ [VoiceStudio] Backend de audio ONLINE y listo en http://127.0.0.1:${PORT}`);
        return this.getStatus();
      }
    }

    throw new Error('Tiempo de espera agotado al iniciar VoiceStudio. Revisa storage/voicestudio.log');
  }

  /**
   * Detiene el backend de VoiceStudio para liberar la VRAM de la GPU RTX 3080
   */
  static async stop(): Promise<{ success: boolean; message: string }> {
    try {
      await execAsync(`fuser -k ${PORT}/tcp 2>/dev/null || true`);
      this.activeProcess = null;
      console.log('🛑 [VoiceStudio] Proceso detenido y memoria VRAM liberada.');
      return { success: true, message: 'VoiceStudio detenido con éxito' };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  /**
   * Garantiza que el backend de audio esté activo antes de generar locución.
   * Si está apagado, lo arranca automáticamente sobre la marcha.
   */
  static async ensureReady(): Promise<void> {
    const isOnline = await this.isRunning();
    if (!isOnline) {
      console.log('⚡ [VoiceStudio Auto-Start] El backend de audio está apagado. Arrancando automáticamente...');
      await this.start();
    }
  }
}
