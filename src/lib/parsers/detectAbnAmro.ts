const REQUIRED_MARKER = /\babn\s*amro\b/i;
const SUPPORTING_MARKERS = [
  /\biban\b/i,
  /\brekening\b/i,
  /\bmutatie(?:overzicht)?\b/i,
  /\btransactie(?:overzicht)?\b/i,
  /\bafschrift\b/i,
];

export const isAbnAmroStatement = (pages: string[]): boolean => {
  const content = pages.join('\n');
  if (!REQUIRED_MARKER.test(content)) {
    return false;
  }

  return SUPPORTING_MARKERS.some((pattern) => pattern.test(content));
};
