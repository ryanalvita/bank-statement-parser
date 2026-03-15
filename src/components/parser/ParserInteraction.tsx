import { useState, type ChangeEvent } from 'react';
import { extractPdfText } from '../../lib/pdf/extractPdfText';
import { isAbnAmroStatement } from '../../lib/parsers/detectAbnAmro';
import { extractCandidateTransactionLines } from '../../lib/parsers/extractCandidateTransactionLines';

export default function ParserInteraction() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedPages, setExtractedPages] = useState<string[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState('');
  const [showDebugText, setShowDebugText] = useState(false);
  const [candidateLines, setCandidateLines] = useState<string[]>([]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);

    setExtractedPages([]);
    setCandidateLines([]);
    setError('');

    if (!file) {
      return;
    }

    try {
      setIsExtracting(true);
      const result = await extractPdfText(file);
      setExtractedPages(result.pages);

      const hasText = result.pages.some((pageText) => pageText.trim().length > 0);

      if (!hasText) {
        setError('This PDF does not contain selectable text. Only text-based PDFs are supported.');
        return;
      }

      if (!isAbnAmroStatement(result.pages)) {
        setError('Unsupported statement format.');
        return;
      }

      setCandidateLines(extractCandidateTransactionLines(result.pages));
    } catch {
      setError('Failed to extract text from PDF. Please try another file.');
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <section className="mt-6 rounded-md border border-gray-300 bg-white p-4">
      <h2 className="text-sm font-medium text-gray-900">File Upload</h2>
      <p className="mt-2 text-sm text-gray-600">Select one PDF file. The file stays in your browser.</p>

      <input
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
      </div>

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
    </section>
  );
}
