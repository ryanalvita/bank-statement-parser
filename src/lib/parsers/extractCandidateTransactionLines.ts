const HEADER_MARKERS = [/\bdatum\b/i, /\bomschrijving\b/i, /\bbedrag\b/i, /\bbij\b/i];
const DATE_TOKEN = /\b\d{2}-\d{2}(?:-\d{4})?\b/;
const AMOUNT_TOKEN = /[+-]?\s?\d{1,3}(?:\.\d{3})*,\d{2}\b/;

const FOOTER_PATTERNS = [
  /^eindtotaal\b/i,
  /^totaal\b/i,
  /^nieuw\s+saldo\b/i,
  /^saldo\b/i,
  /^pagina\s+\d+/i,
];

const NOISE_PATTERNS = [
  /^abn\s*amro\b/i,
  /^iban\b/i,
  /^rekening(?:nummer)?\b/i,
  /^bic\b/i,
  /^opening saldo\b/i,
  /^vorig saldo\b/i,
];

const isHeaderLine = (line: string): boolean => {
  const score = HEADER_MARKERS.filter((pattern) => pattern.test(line)).length;
  return score >= 2;
};

const isFooterLine = (line: string): boolean => FOOTER_PATTERNS.some((pattern) => pattern.test(line));

const isNoiseLine = (line: string): boolean => NOISE_PATTERNS.some((pattern) => pattern.test(line));

const looksLikeTransactionLine = (line: string): boolean => {
  return DATE_TOKEN.test(line) && AMOUNT_TOKEN.test(line);
};

export const extractCandidateTransactionLines = (pages: string[]): string[] => {
  const lines = pages
    .flatMap((page) => page.split(/\r?\n/g))
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const candidates: string[] = [];
  let inTransactionSection = false;

  for (const line of lines) {
    if (isHeaderLine(line) || looksLikeTransactionLine(line)) {
      inTransactionSection = true;

      if (looksLikeTransactionLine(line)) {
        candidates.push(line);
        continue;
      }
    }

    if (!inTransactionSection) {
      continue;
    }

    if (isFooterLine(line)) {
      inTransactionSection = false;
      continue;
    }

    if (isNoiseLine(line)) {
      continue;
    }

    if (looksLikeTransactionLine(line) || candidates.length > 0) {
      candidates.push(line);
    }
  }

  if (candidates.length > 0) {
    return candidates;
  }

  // Fallback path for unexpected statement layouts:
  // keep any line that resembles a transaction.
  return lines.filter(looksLikeTransactionLine);
};
