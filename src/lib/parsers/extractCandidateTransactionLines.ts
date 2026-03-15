const TRANSACTION_HEADER_PATTERNS = [/\bdatum\b/i, /\bomschrijving\b/i, /\bbedrag\b/i];
const TRANSACTION_LINE_START = /^(\d{2}-\d{2}(?:-\d{4})?)\b/;

const FOOTER_PATTERNS = [
  /^eindtotaal\b/i,
  /^totaal\b/i,
  /^nieuw\s+saldo\b/i,
  /^saldo\b/i,
  /^pagina\s+\d+/i,
];

const NOISE_PATTERNS = [/^abn\s*amro\b/i, /^iban\b/i, /^rekening(?:nummer)?\b/i, /^bic\b/i];

const isHeaderLine = (line: string): boolean =>
  TRANSACTION_HEADER_PATTERNS.every((pattern) => pattern.test(line));

const isFooterLine = (line: string): boolean => FOOTER_PATTERNS.some((pattern) => pattern.test(line));

const isNoiseLine = (line: string): boolean => NOISE_PATTERNS.some((pattern) => pattern.test(line));

export const extractCandidateTransactionLines = (pages: string[]): string[] => {
  const lines = pages
    .flatMap((page) => page.split(/\r?\n/g))
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const candidates: string[] = [];
  let inTransactionSection = false;

  for (const line of lines) {
    if (isHeaderLine(line)) {
      inTransactionSection = true;
      continue;
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

    if (TRANSACTION_LINE_START.test(line) || candidates.length > 0) {
      candidates.push(line);
    }
  }

  return candidates;
};
