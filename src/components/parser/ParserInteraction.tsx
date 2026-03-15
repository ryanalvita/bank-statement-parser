import { useRef, useState, type ChangeEvent } from 'react';
import { extractPdfText } from '../../lib/pdf/extractPdfText';
import { isAbnAmroStatement } from '../../lib/parsers/detectAbnAmro';
import { extractCandidateTransactionLines } from '../../lib/parsers/extractCandidateTransactionLines';
import { parseFullStatement } from '../../lib/parsers/parseFullStatement';
import { transactionsToTsv } from '../../lib/output/transactionsToTsv';
import type { Transaction } from '../../lib/models/transaction';

const MESSAGE_UNSUPPORTED = 'Unsupported statement format';
const MESSAGE_NON_TEXT = 'Non-text PDF detected';
const MESSAGE_NO_TRANSACTIONS = 'No transactions found';

export default function ParserInteraction() {
  const sampleFileName = 'mutov828136025_14022026-13032026.pdf';
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedPages, setExtractedPages] = useState<string[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState('');
  const [showDebugText, setShowDebugText] = useState(false);
  const [candidateLines, setCandidateLines] = useState<string[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tsvOutput, setTsvOutput] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);

    setExtractedPages([]);
    setCandidateLines([]);
    setTransactions([]);
    setTsvOutput('');
    setError('');
    setCopyStatus('');

    if (!file) {
      return;
    }

    try {
      setIsExtracting(true);
      const result = await extractPdfText(file);
      setExtractedPages(result.pages);

      const hasText = result.pages.some((pageText) => pageText.trim().length > 0);

      if (!hasText) {
        setError(MESSAGE_NON_TEXT);
        return;
      }

      if (!isAbnAmroStatement(result.pages)) {
        setError(MESSAGE_UNSUPPORTED);
        return;
      }

      const lines = extractCandidateTransactionLines(result.pages);
      const parsedTransactions = parseFullStatement(lines);

      if (parsedTransactions.length === 0) {
        setError(MESSAGE_NO_TRANSACTIONS);
      }

      setCandidateLines(lines);
      setTransactions(parsedTransactions);
      setTsvOutput(transactionsToTsv(parsedTransactions));
      setCopyStatus('');
    } catch {
      setError('Failed to extract text from PDF. Please try another file.');
      setCopyStatus('');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCopyTsv = async () => {
    if (!tsvOutput) {
      return;
    }

    try {
      await navigator.clipboard.writeText(tsvOutput);
      setCopyStatus('TSV copied to clipboard.');
      setError('');
    } catch {
      setCopyStatus('');
      setError('Unable to copy TSV to clipboard.');
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setExtractedPages([]);
    setCandidateLines([]);
    setTransactions([]);
    setTsvOutput('');
    setError('');
    setCopyStatus('');
    setIsExtracting(false);
    setShowDebugText(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <section className="mt-6 rounded-md border border-gray-300 bg-white p-4">
      <h2 className="text-sm font-medium text-gray-900">File Upload</h2>
      <p className="mt-2 text-sm text-gray-600">Select one PDF file. The file stays in your browser.</p>
      <p className="mt-1 text-sm text-gray-600">
        The PDF is processed locally in your browser and never uploaded.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple={false}
        onChange={handleFileChange}
        className="mt-3 block w-full text-sm text-gray-700 file:mr-3 file:rounded file:border file:border-gray-300 file:bg-gray-50 file:px-3 file:py-1 file:text-sm"
      />

      <div className="mt-4 space-y-1 text-sm text-gray-600">
        <p>Selected file: {selectedFile?.name || 'None'}</p>
        <p>Extracted pages: {extractedPages.length}</p>
        <p>Candidate transaction lines: {candidateLines.length}</p>
        <p>Parsed transactions: {transactions.length}</p>
        <p>TSV rows: {tsvOutput ? tsvOutput.split('\n').length - 1 : 0}</p>
        {selectedFile?.name === sampleFileName ? (
          <p className={candidateLines.length > 0 ? 'text-green-700' : 'text-red-700'}>
            Sample testcase ({sampleFileName}): {candidateLines.length > 0 ? 'PASS' : 'FAIL'}
          </p>
        ) : null}
        {isExtracting ? <p>Extracting text...</p> : null}
        {error ? <p className="text-red-700">{error}</p> : null}
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={() => setShowDebugText((value) => !value)}
          className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
        >
          {showDebugText ? 'Hide Debug Text' : 'Show Debug Text'}
        </button>
        <button
          type="button"
          onClick={handleCopyTsv}
          disabled={!tsvOutput}
          className="ml-2 rounded border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Copy TSV
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="ml-2 rounded border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
        >
          Reset
        </button>
      </div>

      {copyStatus ? <p className="mt-2 text-sm text-green-700">{copyStatus}</p> : null}

      {showDebugText ? (
        <section className="mt-4 space-y-3">
          {extractedPages.length === 0 ? (
            <p className="text-sm text-gray-600">No extracted text available yet.</p>
          ) : (
            extractedPages.map((pageText, index) => (
              <article key={index} className="rounded border border-gray-200 bg-gray-50 p-3">
                <h3 className="text-sm font-medium text-gray-800">Page {index + 1}</h3>
                <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-gray-700">
                  {pageText || '[No text found on this page]'}
                </pre>
              </article>
            ))
          )}
        </section>
      ) : null}

      {transactions.length > 0 ? (
        <section className="mt-6">
          <h3 className="text-sm font-medium text-gray-900">Parsed Transactions</h3>
          <div className="mt-2 overflow-x-auto rounded border border-gray-300">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-gray-100 text-gray-800">
                <tr>
                  <th className="border-b border-gray-300 px-3 py-2">Date</th>
                  <th className="border-b border-gray-300 px-3 py-2">Time</th>
                  <th className="border-b border-gray-300 px-3 py-2">Description</th>
                  <th className="border-b border-gray-300 px-3 py-2">Category</th>
                  <th className="border-b border-gray-300 px-3 py-2">Outcome</th>
                  <th className="border-b border-gray-300 px-3 py-2">Income</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction, index) => (
                  <tr key={`${transaction.date}-${transaction.description}-${index}`} className="odd:bg-white even:bg-gray-50">
                    <td className="border-b border-gray-200 px-3 py-2">{transaction.date}</td>
                    <td className="border-b border-gray-200 px-3 py-2">{transaction.time}</td>
                    <td className="border-b border-gray-200 px-3 py-2">{transaction.description}</td>
                    <td className="border-b border-gray-200 px-3 py-2">{transaction.category}</td>
                    <td className="border-b border-gray-200 px-3 py-2">{transaction.outcome}</td>
                    <td className="border-b border-gray-200 px-3 py-2">{transaction.income}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </section>
  );
}
