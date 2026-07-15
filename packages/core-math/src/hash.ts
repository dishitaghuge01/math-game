export function fnv1a(str: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < str.length; index += 1) {
    hash ^= str.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
