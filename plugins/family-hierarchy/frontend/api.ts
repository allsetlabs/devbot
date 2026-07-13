import type { FamilyTree } from './types';

// The plugin is served by the DevBot backend on its own port, with the shared API key.
const BACKEND_PORT = import.meta.env.VITE_BACKEND_PORT;
const API_KEY = import.meta.env.VITE_API_KEY;
if (!BACKEND_PORT) throw new Error('VITE_BACKEND_PORT is not set. Check your .env file.');

const BASE = `${window.location.protocol}//${window.location.hostname}:${BACKEND_PORT}/api/plugins/family-hierarchy`;

function headers(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (API_KEY) h['X-API-Key'] = API_KEY;
  return h;
}

export async function getFamilyTree(): Promise<FamilyTree> {
  const res = await fetch(`${BASE}/tree`, { headers: headers() });
  if (!res.ok) throw new Error(`Failed to load family tree (${res.status})`);
  return res.json();
}

export async function putFamilyTree(tree: FamilyTree): Promise<{ ok: boolean; people: number }> {
  const res = await fetch(`${BASE}/tree`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(tree),
  });
  if (!res.ok) throw new Error(`Failed to save family tree (${res.status})`);
  return res.json();
}
