const RECOVERY_KEY_STORAGE = 'deepwork_recovery_key_v1';
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - base64.length % 4) % 4));
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

export const E2EE = {
  getOrCreateRecoveryKey(): string {
    let key = localStorage.getItem(RECOVERY_KEY_STORAGE);
    if (!key) {
      key = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
      localStorage.setItem(RECOVERY_KEY_STORAGE, key);
    }
    return key;
  },
  getRecoveryKey(): string { return localStorage.getItem(RECOVERY_KEY_STORAGE) || ''; },
  setRecoveryKey(key: string): void {
    const normalized = key.trim();
    if (fromBase64Url(normalized).length !== 32) throw new Error('Recovery key must be a valid 32-byte Deepwork key.');
    localStorage.setItem(RECOVERY_KEY_STORAGE, normalized);
  },
  async encrypt(value: unknown, rawKey: string): Promise<string> {
    const keyBytes = fromBase64Url(rawKey);
    if (keyBytes.length !== 32) throw new Error('Missing or invalid encryption key.');
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await crypto.subtle.importKey('raw', keyBytes as BufferSource, 'AES-GCM', false, ['encrypt']);
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, encoder.encode(JSON.stringify(value)) as BufferSource);
    return `dw1.${toBase64Url(iv)}.${toBase64Url(new Uint8Array(encrypted))}`;
  },
  async decrypt<T>(payload: string, rawKey: string): Promise<T> {
    const [version, ivPart, dataPart] = payload.split('.');
    if (version !== 'dw1' || !ivPart || !dataPart) throw new Error('Encrypted data has an unsupported format.');
    const key = await crypto.subtle.importKey('raw', fromBase64Url(rawKey) as BufferSource, 'AES-GCM', false, ['decrypt']);
    const clear = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64Url(ivPart) as BufferSource }, key, fromBase64Url(dataPart) as BufferSource);
    return JSON.parse(decoder.decode(clear)) as T;
  },
  createKey(): string { return toBase64Url(crypto.getRandomValues(new Uint8Array(32))); }
};
