const MARKERS = [/\babn\s*amro\b/i, /\brekening\b/i, /\biban\b/i];

export const isAbnAmroStatement = (pages: string[]): boolean => {
  const content = pages.join('\n');
  return MARKERS.every((pattern) => pattern.test(content));
};
