import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse/sync';
import type { SheetVideoItem } from '../../src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CACHE_FILE = path.resolve(__dirname, '../../storage/sheet_cache.json');

const DEFAULT_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1HgeZPdsav5lT5070dAAMtoEDRpF3aa4yvorr5hDV5S4/export?format=csv&gid=0';

export class SheetsService {
  static async fetchSheetItems(sheetUrl: string = DEFAULT_SHEET_URL): Promise<SheetVideoItem[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(sheetUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch Google Sheet: ${response.statusText}`);
      }

      const csvText = await response.text();
      const records = parse(csvText, {
        skip_empty_lines: true,
        relax_column_count: true,
      }) as string[][];

      if (records.length < 2) {
        return [];
      }

      const items: SheetVideoItem[] = [];

      // Iterate starting from row index 1 (skipping header)
      for (let i = 1; i < records.length; i++) {
        const row = records[i];
        const title = (row[0] || '').trim();
        if (!title) continue;

        const characterCompany = (row[1] || '').trim();
        const conflict = (row[2] || '').trim();
        const s1 = (row[3] || '').trim();
        const s2 = (row[4] || '').trim();
        const s3 = (row[5] || '').trim();
        const sources = [s1, s2, s3].filter(Boolean);

        const approved = (row[7] || '').toUpperCase() === 'TRUE';
        const finished = (row[8] || '').toUpperCase() === 'TRUE';
        const published = (row[9] || '').toUpperCase() === 'TRUE';

        items.push({
          id: `case_${i}`,
          rowIndex: i + 1,
          title,
          characterCompany,
          conflict,
          sources,
          approved,
          finished,
          published,
        });
      }

      // Guardar en caché local para resiliencia offline
      try {
        const dir = path.dirname(CACHE_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(CACHE_FILE, JSON.stringify(items, null, 2), 'utf-8');
      } catch (cacheErr) {
        console.warn('No se pudo guardar la caché de Google Sheets:', cacheErr);
      }

      return items;
    } catch (error) {
      console.warn('Aviso: Error obteniendo Google Sheets en vivo, recurriendo a caché local:', error);

      // Respaldo en caché local si existe
      if (fs.existsSync(CACHE_FILE)) {
        try {
          const cachedData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
          console.log(`[SheetsService] Retornando ${cachedData.length} items de la caché local.`);
          return cachedData;
        } catch (readErr) {
          console.error('Error leyendo caché de Google Sheets:', readErr);
        }
      }

      // Si no hay caché, retornar los casos predeterminados sin lanzar error 500
      return [
        {
          id: 'case_default_1',
          rowIndex: 2,
          title: 'Quemó $120M en 24 Meses y Engañó a Silicon Valley: La Caída de Fast',
          characterCompany: 'Domm Holland / Fast (Fast.co)',
          conflict: 'Prometieron revolucionar los pagos en un clic y gastaron más de 10 millones de dólares mensuales con ingresos mínimos.',
          sources: ['NPR', 'Bloomberg', 'TechCrunch'],
          approved: true,
          finished: false,
          published: false,
        },
      ];
    }
  }
}
