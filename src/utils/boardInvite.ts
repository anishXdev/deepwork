/** A join code carries both the public lookup code and the board's E2EE key. */
export function makeSecureBoardJoinCode(inviteCode: string, encryptionKey: string): string {
  return `${inviteCode.trim().toUpperCase()}~${encryptionKey}`;
}

export function parseSecureBoardJoinCode(value: string): { inviteCode: string; encryptionKey?: string } {
  const normalized = (value || '').trim().replace(/\s/g, '');
  const match = normalized.match(/^(DW-[A-Z0-9]{6})~([A-Za-z0-9_-]{43})$/i);
  if (match) return { inviteCode: match[1], encryptionKey: match[2] };
  return { inviteCode: normalized.toUpperCase() };
}
