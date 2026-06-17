type MessageTree = Record<string, string | MessageTree>;

export function collectMessageKeys(obj: MessageTree, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object') {
      return collectMessageKeys(value as MessageTree, path);
    }
    return [path];
  });
}

export function findMissingKeys(base: MessageTree, other: MessageTree, prefix = ''): string[] {
  const missing: string[] = [];
  for (const key of Object.keys(base)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const baseVal = base[key];
    const otherVal = other[key];
    if (baseVal && typeof baseVal === 'object') {
      if (!otherVal || typeof otherVal !== 'object') {
        missing.push(path);
        continue;
      }
      missing.push(...findMissingKeys(baseVal as MessageTree, otherVal as MessageTree, path));
    } else if (otherVal === undefined) {
      missing.push(path);
    }
  }
  return missing;
}