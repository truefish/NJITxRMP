import { plannerAdapter, schedulerAdapter } from './adapters';
import { normalizeName, searchUrl, type Result } from './core';
const css = `
:host{display:block;width:100%;min-width:0;max-width:100%;white-space:normal;font:12px/1.5 Arial,sans-serif;text-align:left;color-scheme:light;--fg:#222;--muted:#53616c;--line:#aab5ba;--accent:#a71930;--surface:transparent;--field:#fff}
*{box-sizing:border-box}button,input{font:inherit;border-radius:0}button,a,input,summary{outline-offset:3px}button:focus-visible,a:focus-visible,input:focus-visible,summary:focus-visible{outline:2px solid var(--accent)}
.inline{margin-top:8px;border-left:3px solid var(--accent);padding:3px 6px 3px 10px;background:var(--surface);color:var(--fg);max-width:100%;overflow-wrap:anywhere}
.head{display:flex;align-items:baseline;flex-wrap:wrap;gap:2px 7px}.head>*,.stats>*,.actions>*{min-width:0;max-width:100%}button,a,summary{white-space:normal;overflow-wrap:anywhere}button{cursor:pointer;background:none;color:var(--muted);border:0;padding:0;text-align:left;text-decoration:underline;text-underline-offset:3px}button:disabled{cursor:wait;opacity:.65}
.rating{color:var(--accent);font-weight:700;font-size:14px;text-decoration:none}.rating:hover{text-decoration:underline}.count,.stamp,.muted{color:var(--muted);font-size:11px}.stats{display:flex;flex-wrap:wrap;gap:3px 16px;margin:7px 0}.stats strong{font-weight:700}p{margin:7px 0}a{color:var(--accent);text-underline-offset:3px}.actions{display:flex;flex-wrap:wrap;gap:4px 14px;margin-top:10px}.stamp{margin-top:9px}.notice{margin:8px 0}.candidate{display:block;color:var(--accent);margin:8px 0}form{display:grid;gap:7px;margin-top:10px}label{display:block}input{width:100%;min-width:0;border:1px solid var(--line);padding:6px;background:var(--field);color:var(--fg)}form button{justify-self:start;color:var(--accent)}details{margin-top:8px}summary{cursor:pointer;color:var(--muted);font-size:11px}small{display:block;color:var(--muted);font-size:10px;margin-top:8px}[hidden]{display:none!important}`;
let nextId = 0;
function element<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = '') { const node = document.createElement(tag); node.textContent = text; node.className = className; return node; }
function button(text: string, action: () => void, key: string) { const node = element('button', text); node.type = 'button'; node.dataset.focus = key; node.addEventListener('click', event => { event.stopPropagation(); action(); }); return node; }
function link(text: string, url: string) { const node = element('a', text); node.href = url; node.target = '_blank'; node.rel = 'noopener noreferrer'; return node; }
async function message(name: string, type = 'lookup', extra = {}): Promise<Result> {
  try { return await chrome.runtime.sendMessage({ type, name, ...extra }) ?? { status: 'unavailable', candidates: [], error: 'Extension did not respond. Reload this NJIT tab.' }; }
  catch { return { status: 'unavailable', candidates: [], error: 'Extension connection lost. Reload this NJIT tab.' }; }
}
const bindings = new Map<string, Set<(result: Result) => void>>();
function broadcast(name: string, result: Result) { bindings.get(normalizeName(name))?.forEach(update => update(result)); }
function ratingLabel(result?: Result) {
  if (!result) return 'RMP · Loading…';
  const p = result.candidates[0];
  if (result.status === 'matched' && p) return p.count ? `RMP ${p.rating?.toFixed(1) ?? '—'}/5${result.stale ? ' · cached' : ''}` : 'RMP · Unrated';
  return { ambiguous: 'RMP · Choose match', missing: 'RMP · No match', unavailable: 'RMP · Unavailable', matched: 'RMP' }[result.status];
}
function createInstructor(name: string) {
  const host = element('span'); host.dataset.njitxrmp = '';
  const root = host.attachShadow({ mode: 'open' }); const wrapper = element('div', '', 'inline'); root.append(element('style', css), wrapper);
  const id = `ratings-${++nextId}`, key = normalizeName(name);
  let result: Result | undefined, expanded = false, busy = false, correctionOpen = false, correctionValue = '', actionError = '', optionsOpen = false;
  const refresh = async (type = 'lookup', extra = {}) => {
    if (busy) return; busy = true; actionError = ''; render();
    const next = await message(name, type, extra); busy = false; if (!host.isConnected) return;
    if (type === 'override' && next.status === 'unavailable') { actionError = next.error ?? 'Could not save this match.'; render(); }
    else broadcast(name, next);
  };
  function render() {
    const focusKey = (root.activeElement as HTMLElement | null)?.dataset.focus;
    wrapper.replaceChildren();
    const head = element('div', '', 'head');
    const trigger = button(ratingLabel(result), () => { expanded = !expanded; render(); }, 'rating'); trigger.className = 'rating';
    trigger.setAttribute('aria-label', `View Rate My Professors ratings for ${name}`); trigger.setAttribute('aria-expanded', String(expanded)); trigger.setAttribute('aria-controls', id); head.append(trigger);
    const professor = result?.status === 'matched' ? result.candidates[0] : undefined;
    if (professor) head.append(element('span', `${professor.count} ratings`, 'count')); wrapper.append(head);
    const region = element('div'); region.id = id; region.hidden = !expanded; region.setAttribute('role', 'region'); region.setAttribute('aria-label', `RMP details for ${name}`); wrapper.append(region);
    if (!expanded) { if (focusKey) trigger.focus({ preventScroll: true }); return; }
    if (busy || !result) { const status = element('p', 'Loading ratings…', 'muted'); status.setAttribute('role', 'status'); region.append(status); }
    if (actionError) { const alert = element('p', actionError, 'notice'); alert.setAttribute('role', 'alert'); region.append(alert); }
    if (result?.stale || result?.error) region.append(element('p', `${result.stale ? 'Showing older cached ratings. ' : ''}${result.error ?? ''}`, 'notice'));
    if (professor) {
      if (normalizeName(professor.name) !== key) region.append(element('p', `Matched: ${professor.name}`, 'muted'));
      const stats = element('div', '', 'stats');
      for (const [title, value] of [['Difficulty', professor.count && professor.difficulty != null ? `${professor.difficulty.toFixed(1)} / 5` : '—'], ['Take again', professor.count && professor.retake != null ? `${Math.round(professor.retake)}%` : '—']]) { const stat = element('span'); stat.append(document.createTextNode(`${title} `), element('strong', value)); stats.append(stat); } region.append(stats);
    } else if (result?.status === 'ambiguous') {
      region.append(element('p', 'Choose the correct NJIT professor:'));
      for (const p of result.candidates) { const candidate = button(`${p.name} · ${p.department}`, () => void refresh('override', { url: `https://www.ratemyprofessors.com/professor/${p.id}` }), `candidate-${p.id}`); candidate.className = 'candidate'; candidate.disabled = busy; region.append(candidate); }
    } else if (result) region.append(element('p', result.status === 'missing' ? 'No matching NJIT professor found.' : 'Ratings are currently unavailable.'));
    const actions = element('div', '', 'actions'); actions.append(link(professor ? 'View on RMP ↗' : 'Find on RMP ↗', professor ? `https://www.ratemyprofessors.com/professor/${professor.id}` : searchUrl(name)));
    const correct = button('Wrong professor?', () => { correctionOpen = !correctionOpen; render(); if (correctionOpen) root.querySelector('input')?.focus(); }, 'correct'); correct.setAttribute('aria-expanded', String(correctionOpen)); actions.append(correct); region.append(actions);
    if (correctionOpen) {
      const form = element('form'), input = element('input'); input.id = `${id}-profile`; input.type = 'url'; input.required = true; input.value = correctionValue; input.placeholder = 'https://www.ratemyprofessors.com/professor/…'; input.disabled = busy; input.dataset.focus = 'profile'; input.addEventListener('input', () => { correctionValue = input.value; });
      const label = element('label', 'NJIT professor profile URL'); label.htmlFor = input.id; const save = element('button', 'Save match'); save.type = 'submit'; save.disabled = busy; save.dataset.focus = 'save';
      form.append(label, input, save); form.addEventListener('submit', event => { event.preventDefault(); void refresh('override', { url: correctionValue }); }); region.append(form);
    }
    const stamp = element('div', '', 'stamp'); if (result?.updated) { const date = new Date(result.updated); stamp.title = date.toLocaleString(); stamp.append(document.createTextNode(`${result.stale ? 'Cached' : 'Updated'} ${date.toDateString() === new Date().toDateString() ? 'today' : date.toLocaleDateString()} · `)); } const retry = button('Refresh', () => void refresh('lookup', { force: true }), 'refresh'); retry.disabled = busy; stamp.append(retry); region.append(stamp);
    const options = element('details'); options.open = optionsOpen; options.addEventListener('toggle', () => { optionsOpen = options.open; }); const summary = element('summary', 'Options'); summary.dataset.focus = 'options'; options.append(summary);
    const reset = button('Reset saved match', () => void refresh('reset'), 'reset'); reset.disabled = busy; options.append(element('p'), reset); if (professor?.department) options.append(element('p', professor.department, 'muted')); options.append(element('small', 'NJITxRMP · Ratings from Rate My Professors. Not affiliated with NJIT or RMP.')); region.append(options);
    if (focusKey) { const replacement = [...root.querySelectorAll<HTMLElement>('[data-focus]')].find(node => node.dataset.focus === focusKey); if (replacement && !(replacement as HTMLButtonElement).disabled) replacement.focus({ preventScroll: true }); else trigger.focus({ preventScroll: true }); }
  }
  wrapper.addEventListener('click', event => event.stopPropagation());
  wrapper.addEventListener('keydown', event => { if (event.key === 'Escape' && expanded) { event.stopPropagation(); expanded = false; render(); root.querySelector('button')?.focus(); } });
  const update = (next: Result) => { if (!host.isConnected) return; result = next; render(); };
  if (!bindings.has(key)) bindings.set(key, new Set()); bindings.get(key)!.add(update); render(); void message(name).then(update);
  return { host, dispose: () => { bindings.get(key)?.delete(update); if (!bindings.get(key)?.size) bindings.delete(key); } };
}
const cellStates = new Map<HTMLElement, { signature: string; host: HTMLElement; dispose: () => void }>();
export function scan() {
  const cells = location.hostname === 'reg-prod.ec.njit.edu' ? plannerAdapter(document) : schedulerAdapter(document), present = new Set(cells.map(entry => entry.cell));
  for (const [cell, state] of cellStates) if (!cell.isConnected || !present.has(cell)) { state.dispose(); state.host.remove(); cellStates.delete(cell); }
  for (const { cell, names } of cells) {
    const signature = JSON.stringify(names), old = cellStates.get(cell); if (old?.signature === signature && old.host.isConnected) continue; old?.dispose(); old?.host.remove();
    const host = element('span'); host.dataset.njitxrmp = ''; const instructors = names.map(createInstructor); host.append(...instructors.map(entry => entry.host)); cell.append(host); cellStates.set(cell, { signature, host, dispose: () => instructors.forEach(entry => entry.dispose()) });
  }
}
let timer: ReturnType<typeof setTimeout>;
new MutationObserver(records => { if (records.every(record => (record.target as Element).closest?.('[data-njitxrmp]'))) return; clearTimeout(timer); timer = setTimeout(scan, 150); }).observe(document.body, { childList: true, subtree: true, characterData: true });
scan();
