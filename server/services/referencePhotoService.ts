import dotenv from 'dotenv';
import type { CharacterProfile } from '../../src/types/index.ts';
import { CharacterService } from './characterService.ts';

export interface ReferencePhotoCandidate {
  url: string;
  thumbUrl: string;
  source: 'wikipedia' | 'wikimedia_commons' | 'google';
  title: string;
}

const USER_AGENT = 'DocumentaryStudio/1.0 (reference photo lookup)';
const MAX_CANDIDATES = 8;
const MIN_WIKIMEDIA_RESULTS_BEFORE_GOOGLE = 4;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 12000;
const WIKIPEDIA_LANGUAGES = ['en', 'es'];
const ALLOWED_IMAGE_EXTENSIONS = /\.(jpe?g|png|webp)$/i;

/**
 * Busca fotos reales de personajes públicos: Wikipedia/Wikimedia Commons primero
 * y Google Custom Search como respaldo si hay credenciales configuradas.
 */
export class ReferencePhotoService {
  static async searchCandidates(
    name: string,
    affiliation?: string,
    isCompany?: boolean
  ): Promise<ReferencePhotoCandidate[]> {
    dotenv.config({ override: true });
    const query = name.trim();
    if (!query) return [];

    const isComp = isCompany ?? CharacterService.isCompanyOrBrandEntity(query);

    const [wikipedia, commons] = await Promise.all([
      this.searchWikipedia(query, isComp),
      this.searchCommons(query, isComp),
    ]);
    let candidates = this.dedupe([...wikipedia, ...commons]);

    if (candidates.length < MIN_WIKIMEDIA_RESULTS_BEFORE_GOOGLE) {
      const googleQuery = affiliation && affiliation !== query ? `${query} ${affiliation}` : query;
      candidates = this.dedupe([...candidates, ...(await this.searchGoogle(googleQuery, isComp))]);
    }

    return candidates.slice(0, MAX_CANDIDATES);
  }

  /** Descarga la imagen elegida y la guarda como foto real de referencia del personaje. */
  static async applyCandidate(
    channelId: string,
    characterId: string,
    imageUrl: string
  ): Promise<CharacterProfile | null> {
    const parsed = new URL(imageUrl);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error('Solo se permiten URLs http(s) para la foto de referencia');
    }

    const res = await this.fetchWithTimeout(imageUrl);
    if (!res.ok) throw new Error(`No se pudo descargar la imagen (HTTP ${res.status})`);

    const contentType = (res.headers.get('content-type') || '').split(';')[0].trim();
    if (!/^image\/(jpeg|png|webp)$/.test(contentType)) {
      throw new Error(`El recurso no es una imagen compatible (${contentType || 'desconocido'})`);
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > MAX_IMAGE_BYTES) {
      throw new Error('La imagen supera el tamaño máximo permitido (8 MB)');
    }

    const dataUrl = `data:${contentType};base64,${buffer.toString('base64')}`;
    return CharacterService.saveRealReferenceImage(channelId, characterId, dataUrl);
  }

  /**
   * Asigna automáticamente la primera candidata a los personajes reales que aún no tienen foto.
   * Nunca lanza: si falla un personaje, se registra y se continúa con el resto.
   */
  static async autoAssignMissingPhotos(
    channelId: string,
    characters: CharacterProfile[]
  ): Promise<CharacterProfile[]> {
    return Promise.all(
      characters.map(async (character) => {
        const isRealPerson =
          character.character_category === 'real_person' || character.real_person;
        if (!isRealPerson || character.real_reference_image_url) return character;

        try {
          const candidates = await this.searchCandidates(
            character.name,
            character.company_or_affiliation
          );
          for (const candidate of candidates) {
            try {
              const updated = await this.applyCandidate(
                channelId,
                character.character_id,
                candidate.url
              );
              if (updated) return updated;
            } catch (err: any) {
              console.warn(
                `[ReferencePhoto] Candidata descartada para "${character.name}": ${err.message}`
              );
            }
          }
        } catch (err: any) {
          console.warn(`[ReferencePhoto] Búsqueda fallida para "${character.name}": ${err.message}`);
        }
        return character;
      })
    );
  }

  private static async searchWikipedia(
    query: string,
    isCompany?: boolean
  ): Promise<ReferencePhotoCandidate[]> {
    const results = await Promise.all(
      WIKIPEDIA_LANGUAGES.map(async (lang) => {
        const searchQuery = isCompany ? `${query} logo` : query;
        const params = new URLSearchParams({
          action: 'query',
          format: 'json',
          generator: 'search',
          gsrsearch: searchQuery,
          gsrlimit: '5',
          prop: 'pageimages',
          piprop: 'original|thumbnail',
          pithumbsize: '500',
        });
        const data = await this.fetchJson(`https://${lang}.wikipedia.org/w/api.php?${params}`);
        const pages: any[] = Object.values(data?.query?.pages || {});
        return pages
          .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
          .filter((p) => {
            const src = p.original?.source || '';
            const thumb = p.thumbnail?.source || '';
            return (
              (src && (ALLOWED_IMAGE_EXTENSIONS.test(src) || /\.svg$/i.test(src))) ||
              (thumb && ALLOWED_IMAGE_EXTENSIONS.test(thumb))
            );
          })
          .map<ReferencePhotoCandidate>((p) => {
            const isSvg = /\.svg$/i.test(p.original?.source || '');
            const downloadUrl = isSvg && p.thumbnail?.source
              ? p.thumbnail.source.replace(/\/\d+px-/, '/800px-')
              : (p.original?.source || p.thumbnail?.source);
            return {
              url: downloadUrl,
              thumbUrl: p.thumbnail?.source || downloadUrl,
              source: 'wikipedia',
              title: `${p.title} (${lang}.wikipedia)`,
            };
          });
      })
    );
    return results.flat();
  }

  private static async searchCommons(
    query: string,
    isCompany?: boolean
  ): Promise<ReferencePhotoCandidate[]> {
    const commonsQuery = isCompany
      ? `${query} (logo OR headquarters OR building)`
      : `${query} filetype:bitmap`;
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      generator: 'search',
      gsrsearch: commonsQuery,
      gsrnamespace: '6',
      gsrlimit: '10',
      prop: 'imageinfo',
      iiprop: 'url|mime',
      iiurlwidth: '500',
    });
    const data = await this.fetchJson(`https://commons.wikimedia.org/w/api.php?${params}`);
    const pages: any[] = Object.values(data?.query?.pages || {});
    return pages
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
      .map((p) => ({ page: p, info: p.imageinfo?.[0] }))
      .filter(({ info }) => {
        if (!info?.url) return false;
        const mime = info.mime || '';
        return (
          /^image\/(jpeg|png|webp)$/.test(mime) ||
          mime === 'image/svg+xml' ||
          /\.svg$/i.test(info.url)
        );
      })
      .map<ReferencePhotoCandidate>(({ page, info }) => {
        const isSvg = info.mime === 'image/svg+xml' || /\.svg$/i.test(info.url);
        const downloadUrl = isSvg && info.thumburl
          ? info.thumburl.replace(/\/\d+px-/, '/800px-')
          : info.url;
        return {
          url: downloadUrl,
          thumbUrl: info.thumburl || downloadUrl,
          source: 'wikimedia_commons',
          title: String(page.title || '').replace(/^File:/, ''),
        };
      });
  }

  private static async searchGoogle(
    query: string,
    isCompany?: boolean
  ): Promise<ReferencePhotoCandidate[]> {
    const apiKey = (process.env.GOOGLE_CSE_API_KEY || '').trim();
    const engineId = (process.env.GOOGLE_CSE_ID || '').trim();
    if (!apiKey || !engineId) return [];

    const searchQuery = isCompany
      ? `${query} logo company headquarters`
      : `${query} portrait`;

    const params = new URLSearchParams({
      key: apiKey,
      cx: engineId,
      q: searchQuery,
      searchType: 'image',
      num: String(MAX_CANDIDATES),
      safe: 'active',
    });
    const data = await this.fetchJson(`https://www.googleapis.com/customsearch/v1?${params}`);
    const items: any[] = data?.items || [];
    return items
      .filter((item) => item.link && /^image\/(jpeg|png|webp)$/.test(item.mime || 'image/jpeg'))
      .map<ReferencePhotoCandidate>((item) => ({
        url: item.link,
        thumbUrl: item.image?.thumbnailLink || item.link,
        source: 'google',
        title: item.title || query,
      }));
  }

  private static async fetchJson(url: string): Promise<any> {
    try {
      const res = await this.fetchWithTimeout(url);
      if (!res.ok) {
        console.warn(`[ReferencePhoto] HTTP ${res.status} en ${new URL(url).host}`);
        return null;
      }
      return await res.json();
    } catch (err: any) {
      console.warn(`[ReferencePhoto] Error consultando ${new URL(url).host}: ${err.message}`);
      return null;
    }
  }

  private static fetchWithTimeout(url: string): Promise<Response> {
    return fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  }

  private static dedupe(candidates: ReferencePhotoCandidate[]): ReferencePhotoCandidate[] {
    const seen = new Set<string>();
    return candidates.filter((c) => {
      if (seen.has(c.url)) return false;
      seen.add(c.url);
      return true;
    });
  }
}
