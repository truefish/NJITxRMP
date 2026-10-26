import { RatingsService } from './core';
const service = new RatingsService({
  async get(key) { return (await chrome.storage.local.get(key))[key]; },
  async set(key, value) { await chrome.storage.local.set({ [key]: value }); }
});
chrome.runtime.onMessage.addListener((request, sender, respond) => {
  const url = sender.url ? new URL(sender.url) : null;
  if (!url || !['generalssb-prod.ec.njit.edu', 'reg-prod.ec.njit.edu'].includes(url.hostname) || url.protocol !== 'https:') return;
  if (typeof request?.name !== 'string' || request.name.length > 200) return;
  let task;
  if (request.type === 'lookup') task = service.lookup(request.name, request.force === true);
  else if (request.type === 'override' && typeof request.url === 'string') task = service.override(request.name, request.url);
  else if (request.type === 'reset') task = service.reset(request.name);
  else return;
  task.then(respond).catch(error => respond({ status: 'unavailable', candidates: [], error: String(error.message ?? error) }));
  return true;
});
