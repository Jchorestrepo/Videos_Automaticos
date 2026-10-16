import { parse } from 'csv-parse/sync';
import type { SheetVideoItem } from '../../src/types/index.ts';

const DEFAULT_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1HgeZPdsav5lT5070dAAMtoEDRpF3aa4yvorr5hDV5S4/export?format=csv&gid=0';

export class SheetsService {
  static async fetchSheetItems(sheetUrl: string = DEFAULT_SHEET_URL): Promise<SheetVideoItem[]> {
    try {
      const response = await fetch(sheetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

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

      return items;
    } catch (error) {
      console.error('Error fetching Google Sheets items:', error);
      throw error;
    }
  }
}
