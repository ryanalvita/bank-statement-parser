import type { Transaction } from '../models/transaction';

const DATE_AT_START = /^(\d{2}-\d{2}(?:-\d{4})?)\b/;
const AMOUNT_PATTERN = /([+-]?\s?\d{1,3}(?:\.\d{3})*,\d{2})\b/g;
const OUTCOME_HINTS = /\b(af|debit|debited|afschrijving|incasso|bea|ideal|wero|google pay|takeaway)\b/i;
const INCOME_HINTS = /\b(bij|credit|credited|bijschrijving|salaris|salary|aab inz|tikkie id|personeels)\b/i;
const SUMMARY_MARKER_PATTERN = /\b(number of debit transactions|number of credit transactions|total amount debited|total amount credited)\b/i;

const toNumber = (rawAmount: string): number => {
  const normalized = rawAmount.replace(/\./g, '').replace(',', '.');
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : Number.NaN;
};

const normalizeDate = (rawDate: string): string => {
  const match = rawDate.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) {
    return rawDate;
  }

  const [, dd, mm, yyyy] = match;
  return `${yyyy}-${mm}-${dd}`;
};

const cleanDescription = (fullText: string, date: string, rawAmount: string): string => {
  const markerIndex = fullText.search(SUMMARY_MARKER_PATTERN);
  const textWithoutSummary = markerIndex >= 0 ? fullText.slice(0, markerIndex).trim() : fullText;

  return textWithoutSummary
    .replace(date, '')
    .replace(rawAmount, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export const parseTransactionLine = (line: string): Transaction | null => {
  const parts = line
    .split(/\r?\n/g)
    .map((part) => part.trim())
    .filter(Boolean);
  const firstLine = (parts[0] ?? '').replace(/\s+/g, ' ').trim();
  const fullText = parts.join(' ').replace(/\s+/g, ' ').trim();

  const dateMatch = firstLine.match(DATE_AT_START) ?? fullText.match(DATE_AT_START);

  if (!dateMatch) {
    return null;
  }

  const amountMatchesFirst = [...firstLine.matchAll(AMOUNT_PATTERN)];
  const amountMatchesFull = [...fullText.matchAll(AMOUNT_PATTERN)];
  const amountMatches = amountMatchesFirst.length > 0 ? amountMatchesFirst : amountMatchesFull;

  if (amountMatches.length === 0) {
    return null;
  }

  const date = dateMatch[1];
  const rawAmount = amountMatches[0][1];
  const amountValue = toNumber(rawAmount);

  if (!Number.isFinite(amountValue)) {
    return null;
  }

  const amount = Math.abs(amountValue).toFixed(2);
  const description = cleanDescription(fullText, date, rawAmount);

  const firstLineAndText = `${firstLine} ${fullText}`;
  const hasOutcomeHint = OUTCOME_HINTS.test(firstLineAndText);
  const hasIncomeHint = INCOME_HINTS.test(firstLineAndText);
  let isMoneyOut = true;

  if (amountValue < 0) {
    isMoneyOut = true;
  } else if (hasIncomeHint && !hasOutcomeHint) {
    isMoneyOut = false;
  } else if (hasOutcomeHint && !hasIncomeHint) {
    isMoneyOut = true;
  } else if (hasIncomeHint && hasOutcomeHint) {
    // Conservative fallback: explicit income markers win.
    isMoneyOut = false;
  } else {
    // Unknown positive amounts default to outcome for safer budgeting.
    isMoneyOut = true;
  }

  return {
    date: normalizeDate(date),
    time: '',
    description,
    category: '',
    outcome: isMoneyOut ? amount : '',
    income: isMoneyOut ? '' : amount,
  };
};
