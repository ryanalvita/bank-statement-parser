import type { Transaction } from '../models/transaction';

const DATE_TOKEN = /^\d{2}-\d{2}-\d{4}$/;
const AMOUNT_TOKEN = /^[+-]?\d{1,3}(?:\.\d{3})*,\d{2}$/;
const SUMMARY_MARKER =
  /\b(number of debit transactions|number of credit transactions|total amount debited|total amount credited)\b/i;
const PAGE_MARKER = /^page\s+\d+\s+of\s+\d+/i;
const LINE_GROUPING_TOLERANCE = 2.4;
const POSITION_MARGIN = 10;

const OUTCOME_HINTS =
  /\b(af|debit|debited|afschrijving|incasso|bea|ideal|wero|google pay|takeaway|ovpay|basic package)\b/i;
const INCOME_HINTS = /\b(bijschrijving|salary|salaris|personeels|aab inz|tikkie id|refund)\b/i;

type PositionedItem = {
  str?: string;
  transform?: number[];
};

type Token = {
  text: string;
  x: number;
  y: number;
};

type Line = {
  y: number;
  tokens: Token[];
};

type Columns = {
  dateX: number;
  debitX: number;
  creditX: number;
  splitX: number;
  hasHeader: boolean;
};

type WorkingTransaction = {
  date: string;
  descriptionParts: string[];
  debitRaw: string;
  creditRaw: string;
};

const toNumber = (rawAmount: string): number =>
  Number.parseFloat(rawAmount.replace(/\./g, '').replace(',', '.'));

const normalizeDate = (rawDate: string): string => {
  const match = rawDate.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) {
    return rawDate;
  }

  const [, dd, mm, yyyy] = match;
  return `${yyyy}-${mm}-${dd}`;
};

const stripTrailingSummary = (text: string): string => {
  const summaryIndex = text.search(SUMMARY_MARKER);
  if (summaryIndex >= 0) {
    return text.slice(0, summaryIndex).trim();
  }

  return text.trim();
};

const normalizeDescription = (descriptionParts: string[]): string =>
  stripTrailingSummary(descriptionParts.join(' ').replace(/\s+/g, ' '));

const finalizeTransaction = (current: WorkingTransaction | null): Transaction | null => {
  if (!current) {
    return null;
  }

  const description = normalizeDescription(current.descriptionParts);
  const debitAmount = current.debitRaw ? toNumber(current.debitRaw) : Number.NaN;
  const creditAmount = current.creditRaw ? toNumber(current.creditRaw) : Number.NaN;

  if (!description || (!Number.isFinite(debitAmount) && !Number.isFinite(creditAmount))) {
    return null;
  }

  return {
    date: normalizeDate(current.date),
    time: '',
    description,
    category: '',
    outcome: Number.isFinite(debitAmount) ? debitAmount.toFixed(2) : '',
    income: Number.isFinite(creditAmount) ? creditAmount.toFixed(2) : '',
  };
};

const toTokens = (items: PositionedItem[]): Token[] =>
  items
    .map((item) => {
      const text = (item.str ?? '').trim();
      const x = item.transform?.[4];
      const y = item.transform?.[5];

      if (!text || typeof x !== 'number' || typeof y !== 'number') {
        return null;
      }

      return { text, x, y };
    })
    .filter((item): item is Token => item !== null);

const groupByLine = (tokens: Token[]): Line[] => {
  const sorted = [...tokens].sort((a, b) => {
    if (Math.abs(a.y - b.y) > LINE_GROUPING_TOLERANCE) {
      return b.y - a.y;
    }
    return a.x - b.x;
  });

  const lines: Line[] = [];

  for (const token of sorted) {
    const previous = lines[lines.length - 1];
    if (!previous || Math.abs(previous.y - token.y) > LINE_GROUPING_TOLERANCE) {
      lines.push({ y: token.y, tokens: [token] });
      continue;
    }

    previous.tokens.push(token);
  }

  for (const line of lines) {
    line.tokens.sort((a, b) => a.x - b.x);
  }

  return lines;
};

const isSummaryLine = (lineText: string): boolean => SUMMARY_MARKER.test(lineText) || PAGE_MARKER.test(lineText);

const isTableHeaderLine = (line: Line): boolean => {
  const tokenSet = new Set(line.tokens.map((token) => token.text.toLowerCase()));
  return tokenSet.has('date') && tokenSet.has('description') && tokenSet.has('debited') && tokenSet.has('credited');
};

const detectDateX = (lines: Line[]): number => {
  for (const line of lines) {
    if (!isTableHeaderLine(line)) {
      continue;
    }

    const dateToken = line.tokens.find((token) => token.text.toLowerCase() === 'date');
    if (dateToken) {
      return dateToken.x;
    }
  }

  return 40;
};

const assignClusters = (positions: number[], leftCenter: number, rightCenter: number) => {
  const left: number[] = [];
  const right: number[] = [];

  for (const value of positions) {
    if (Math.abs(value - leftCenter) <= Math.abs(value - rightCenter)) {
      left.push(value);
    } else {
      right.push(value);
    }
  }

  return { left, right };
};

const mean = (values: number[]): number => {
  if (values.length === 0) {
    return Number.NaN;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const detectHeaderSplit = (lines: Line[]): { hasHeader: boolean; splitX: number } => {
  for (const line of lines) {
    if (!isTableHeaderLine(line)) {
      continue;
    }

    const debitedToken = line.tokens.find((token) => token.text.toLowerCase() === 'debited');
    const creditedToken = line.tokens.find((token) => token.text.toLowerCase() === 'credited');

    if (debitedToken && creditedToken) {
      return {
        hasHeader: true,
        splitX: (debitedToken.x + creditedToken.x) / 2,
      };
    }
  }

  return { hasHeader: false, splitX: 505 };
};

const detectAmountCenters = (lines: Line[], dateX: number): { debitX: number; creditX: number } => {
  const positions = lines
    .filter((line) => !isSummaryLine(line.tokens.map((token) => token.text).join(' ')))
    .flatMap((line) =>
      line.tokens
        .filter((token) => AMOUNT_TOKEN.test(token.text) && token.x >= dateX + 100)
        .map((token) => token.x),
    );

  if (positions.length === 0) {
    return { debitX: 450, creditX: 560 };
  }

  if (positions.length === 1) {
    return { debitX: positions[0], creditX: positions[0] + 90 };
  }

  let leftCenter = Math.min(...positions);
  let rightCenter = Math.max(...positions);

  for (let index = 0; index < 8; index += 1) {
    const { left, right } = assignClusters(positions, leftCenter, rightCenter);
    const nextLeft = mean(left);
    const nextRight = mean(right);

    if (Number.isFinite(nextLeft)) {
      leftCenter = nextLeft;
    }
    if (Number.isFinite(nextRight)) {
      rightCenter = nextRight;
    }
  }

  if (leftCenter > rightCenter) {
    return { debitX: rightCenter, creditX: leftCenter };
  }

  return { debitX: leftCenter, creditX: rightCenter };
};

const detectColumns = (lines: Line[]): Columns => {
  const dateX = detectDateX(lines);
  const { hasHeader, splitX } = detectHeaderSplit(lines);
  const { debitX, creditX } = detectAmountCenters(lines, dateX);

  return {
    dateX,
    debitX,
    creditX,
    splitX,
    hasHeader,
  };
};

const decideAmountSide = (token: Token, lineText: string, columns: Columns): 'debit' | 'credit' => {
  const hasOutcomeHint = OUTCOME_HINTS.test(lineText);
  const hasIncomeHint = INCOME_HINTS.test(lineText);

  if (hasOutcomeHint && !hasIncomeHint) {
    return 'debit';
  }

  if (hasIncomeHint && !hasOutcomeHint) {
    return 'credit';
  }

  if (columns.hasHeader && Math.abs(token.x - columns.splitX) >= POSITION_MARGIN) {
    return token.x < columns.splitX ? 'debit' : 'credit';
  }

  const distanceToDebit = Math.abs(token.x - columns.debitX);
  const distanceToCredit = Math.abs(token.x - columns.creditX);
  return distanceToDebit <= distanceToCredit ? 'debit' : 'credit';
};

const parseLineIntoTransactionParts = (
  line: Line,
  columns: Columns,
  current: WorkingTransaction | null,
): { nextCurrent: WorkingTransaction | null; finalized: Transaction | null } => {
  const lineText = line.tokens.map((token) => token.text).join(' ').replace(/\s+/g, ' ').trim();

  if (!lineText || isTableHeaderLine(line)) {
    return { nextCurrent: current, finalized: null };
  }

  if (isSummaryLine(lineText)) {
    return { nextCurrent: null, finalized: finalizeTransaction(current) };
  }

  const dateIndex = line.tokens.findIndex(
    (token) => DATE_TOKEN.test(token.text) && token.x <= columns.dateX + 40,
  );
  const startsNewTransaction = dateIndex >= 0;

  let nextCurrent = current;
  let finalized: Transaction | null = null;

  if (startsNewTransaction) {
    finalized = finalizeTransaction(current);
    nextCurrent = {
      date: line.tokens[dateIndex].text,
      descriptionParts: [],
      debitRaw: '',
      creditRaw: '',
    };
  }

  if (!nextCurrent) {
    return { nextCurrent, finalized };
  }

  const firstUsableIndex = startsNewTransaction ? dateIndex + 1 : 0;
  const lineAmountTokens: Token[] = [];

  for (let index = firstUsableIndex; index < line.tokens.length; index += 1) {
    const token = line.tokens[index];

    if (DATE_TOKEN.test(token.text) && token.x <= columns.dateX + 40) {
      continue;
    }

    if (AMOUNT_TOKEN.test(token.text)) {
      lineAmountTokens.push(token);
      continue;
    }

    nextCurrent.descriptionParts.push(token.text);
  }

  if (lineAmountTokens.length >= 2) {
    const sortedByX = [...lineAmountTokens].sort((a, b) => a.x - b.x);
    nextCurrent.debitRaw = sortedByX[0].text;
    nextCurrent.creditRaw = sortedByX[sortedByX.length - 1].text;
    return { nextCurrent, finalized };
  }

  if (lineAmountTokens.length === 1) {
    const side = decideAmountSide(lineAmountTokens[0], lineText, columns);
    if (side === 'debit') {
      nextCurrent.debitRaw = lineAmountTokens[0].text;
    } else {
      nextCurrent.creditRaw = lineAmountTokens[0].text;
    }
  }

  return { nextCurrent, finalized };
};

export const parsePositionedTransactions = (pages: PositionedItem[][]): Transaction[] => {
  const transactions: Transaction[] = [];
  let current: WorkingTransaction | null = null;

  for (const pageItems of pages) {
    const lines = groupByLine(toTokens(pageItems));
    const columns = detectColumns(lines);

    for (const line of lines) {
      const { nextCurrent, finalized } = parseLineIntoTransactionParts(line, columns, current);
      if (finalized) {
        transactions.push(finalized);
      }
      current = nextCurrent;
    }
  }

  const tail = finalizeTransaction(current);
  if (tail) {
    transactions.push(tail);
  }

  return transactions;
};
