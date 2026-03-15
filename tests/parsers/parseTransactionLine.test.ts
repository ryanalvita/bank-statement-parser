import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseTransactionLine } from '../../src/lib/parsers/parseTransactionLine';

const currentDir = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(currentDir, '..', 'fixtures', 'single-transaction-line.txt');

describe('parseTransactionLine', () => {
  it('parses a single candidate line into a normalized transaction', () => {
    const line = readFileSync(fixturePath, 'utf8').trim();
    const parsed = parseTransactionLine(line);

    expect(parsed).not.toBeNull();
    expect(parsed?.date).toBe('2026-01-01');
    expect(parsed?.time).toBe('09:30');
    expect(parsed?.outcome).toBe('4.50');
    expect(parsed?.income).toBe('');
    expect(parsed?.category).toBe('');
  });
});
