import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseFullStatement } from '../../src/lib/parsers/parseFullStatement';

const currentDir = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(currentDir, '..', 'fixtures', 'multiple-candidate-lines.txt');

describe('parseFullStatement', () => {
  it('parses multiple candidate lines and keeps transaction order', () => {
    const lines = readFileSync(fixturePath, 'utf8')
      .split(/\r?\n/g)
      .map((line) => line.trim())
      .filter(Boolean);

    const transactions = parseFullStatement(lines);

    expect(transactions).toHaveLength(3);
    expect(transactions[0].date).toBe('2026-01-01');
    expect(transactions[1].date).toBe('2026-01-02');
    expect(transactions[2].date).toBe('2026-01-03');

    expect(transactions[0].outcome).toBe('12.40');
    expect(transactions[0].income).toBe('');
    expect(transactions[1].income).toBe('2500.00');
    expect(transactions[1].outcome).toBe('');
    expect(transactions[2].outcome).toBe('45.00');
  });
});
