export const SCHOOL = 668;
export const TTL = 24 * 60 * 60 * 1000;
export interface Professor { id: number; name: string; department: string; rating: number | null; difficulty: number | null; retake: number | null; count: number }
export interface Result { status: 'matched' | 'ambiguous' | 'missing' | 'unavailable'; candidates: Professor[]; updated?: number; stale?: boolean; error?: string }
export interface Storage { get(key: string): Promise<unknown>; set(key: string, value: unknown): Promise<void> }
export function normalizeName(raw: string): string {
  let name = raw.replace(/\((?:primary|secondary)\)/gi, '').replace(/\s+/g, ' ').trim();
  const parts = name.split(',');
  if (parts.length === 2) name = `${parts[1].trim()} ${parts[0].trim()}`;
  return name.normalize('NFKD').replace(/\p{M}/gu, '').replace(/[.’']/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}
export function searchUrl(name: string): string { return `https://www.ratemyprofessors.com/search/professors/${SCHOOL}?q=${encodeURIComponent(normalizeName(name))}`; }
export function profileId(url: string): number {
  const parsed = new URL(url);
  const match = parsed.pathname.match(/^\/professor\/(\d+)\/?$/);
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'www.ratemyprofessors.com' || parsed.port || parsed.username || parsed.password || !match || !Number.isSafeInteger(Number(match[1])) || Number(match[1]) <= 0) throw new Error('Use an https://www.ratemyprofessors.com/professor/123 profile URL.');
  return Number(match[1]);
}
export function parseProfessors(html: string): Professor[] {
  const start = /window\.__RELAY_STORE__\s*=\s*/g.exec(html);
  if (!start) throw new Error('RMP did not return readable ratings. Open RMP or try again later.');
  const offset = start.index + start[0].length;
  let depth = 0, quoted = false, escaped = false, end = -1;
  for (let i = offset; i < html.length; i++) {
    const c = html[i];
    if (quoted) { if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === '"') quoted = false; }
    else if (c === '"') quoted = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) { end = i + 1; break; }
  }
  if (end < 0) throw new Error('Incomplete RMP response.');
  const store = JSON.parse(html.slice(offset, end)) as Record<string, any>;
  const number = (v: unknown, max: number) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max ? v : null;
  return Object.values(store).filter(p => p?.__typename === 'Teacher' && store[p.school?.__ref]?.__typename === 'School' && store[p.school?.__ref]?.legacyId === SCHOOL && Number.isSafeInteger(p.legacyId) && p.legacyId > 0 && typeof p.firstName === 'string' && typeof p.lastName === 'string').map(p => ({
    id: p.legacyId, name: `${p.firstName} ${p.lastName}`, department: typeof p.department === 'string' ? p.department : '',
    rating: number(p.avgRating, 5), difficulty: number(p.avgDifficulty, 5), retake: number(p.wouldTakeAgainPercent, 100), count: number(p.numRatings, Number.MAX_SAFE_INTEGER) ?? 0
  }));
}
export class RatingsService {
  private pending = new Map<string, Promise<Result>>();
  private operations = new Map<string, Promise<void>>();
  private active = 0;
  private queue: (() => void)[] = [];
  private blockedUntil = 0;
  constructor(private storage: Storage, private fetcher: typeof fetch = (...args) => globalThis.fetch(...args), private now = Date.now) {}
  private serialize<T>(name: string, operation: () => Promise<T>): Promise<T> {
    const task = (this.operations.get(name) ?? Promise.resolve()).then(operation);
    const tail = task.then(() => {}, () => {});
    this.operations.set(name, tail);
    void tail.then(() => { if (this.operations.get(name) === tail) this.operations.delete(name); });
    return task;
  }
  private async fetchPage(url: string): Promise<Professor[]> {
    if (this.active >= 3) await new Promise<void>(resolve => this.queue.push(resolve));
    else this.active++;
    try {
      const savedLimit = await this.storage.get('rateLimitUntil');
      if (typeof savedLimit === 'number' && Number.isFinite(savedLimit)) this.blockedUntil = Math.max(this.blockedUntil, savedLimit);
      if (this.now() < this.blockedUntil) throw new Error('RMP is rate limiting requests. Please try again later.');
      const response = await this.fetcher(url, { credentials: 'omit', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(15000) });
      if (response.status === 429) {
        const header = response.headers.get('retry-after');
        const seconds = header && /^\d+$/.test(header) ? Number(header) * 1000 : header ? Date.parse(header) - this.now() : 60000;
        this.blockedUntil = this.now() + Math.max(60000, Number.isFinite(seconds) ? seconds : 60000);
        await this.storage.set('rateLimitUntil', this.blockedUntil);
      }
      if (!response.ok) throw new Error(`RMP unavailable (${response.status}). Try again later.`);
      return parseProfessors(await response.text());
    } finally { const next = this.queue.shift(); if (next) next(); else this.active--; }
  }
  lookup(name: string, force = false): Promise<Result> {
    const key = normalizeName(name);
    if (!key || key.length > 200) return Promise.resolve({ status: 'missing', candidates: [] });
    if (this.pending.has(key)) return this.pending.get(key)!;
    const task = this.serialize(key, () => this.resolve(key, force)).finally(() => { if (this.pending.get(key) === task) this.pending.delete(key); });
    this.pending.set(key, task); return task;
  }
  private async resolve(name: string, force: boolean): Promise<Result> {
    const cache = await this.storage.get(`cache:${name}`) as Result | undefined;
    if (!force && cache?.updated && this.now() - cache.updated < TTL) return cache;
    try {
      const override = await this.storage.get(`override:${name}`) as number | undefined;
      const all = await this.fetchPage(override ? `https://www.ratemyprofessors.com/professor/${override}` : searchUrl(name));
      const exact = all.filter(p => override ? p.id === override : normalizeName(p.name) === name);
      const result: Result = { status: exact.length === 1 ? 'matched' : all.length ? 'ambiguous' : 'missing', candidates: exact.length === 1 ? exact : all, updated: this.now() };
      if (result.status === 'matched') await this.storage.set(`cache:${name}`, result);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ratings unavailable.';
      return cache ? { ...cache, stale: true, error: message } : { status: 'unavailable', candidates: [], error: message };
    }
  }
  override(name: string, url: string): Promise<Result> {
    const key = normalizeName(name);
    this.pending.delete(key);
    return this.serialize(key, async () => {
    const id = profileId(url);
    const professors = await this.fetchPage(`https://www.ratemyprofessors.com/professor/${id}`);
    const professor = professors.find(p => p.id === id);
    if (!professor) throw new Error('This profile could not be verified as an NJIT professor.');
    const result: Result = { status: 'matched', candidates: [professor], updated: this.now() };
    await this.storage.set(`override:${normalizeName(name)}`, id);
    await this.storage.set(`cache:${normalizeName(name)}`, result);
    return result;
    });
  }
  reset(name: string): Promise<Result> {
    const key = normalizeName(name);
    this.pending.delete(key);
    return this.serialize(key, async () => {
    await this.storage.set(`override:${normalizeName(name)}`, null);
    await this.storage.set(`cache:${normalizeName(name)}`, null);
    return this.resolve(key, true);
    });
  }
}
