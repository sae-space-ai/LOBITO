// Setup para pruebas con Vitest
// Mock de localStorage y APIs del navegador
import { beforeEach } from 'vitest';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock de fetch para pruebas
globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  return new Response(JSON.stringify({ error: 'Mock - no real fetch in tests' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// Mock de crypto.randomUUID
if (!globalThis.crypto) {
  (globalThis as any).crypto = {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substring(2, 10),
  };
}

// Reset localStorage entre tests
beforeEach(() => {
  localStorageMock.clear();
});
