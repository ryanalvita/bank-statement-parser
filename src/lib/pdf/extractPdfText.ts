export interface PdfTextItem {
  str?: string;
  hasEOL?: boolean;
  transform?: number[];
  width?: number;
}

export interface ExtractedPdfText {
  pages: string[];
  pageItems: PdfTextItem[][];
}

const PDFJS_VERSION = '4.8.69';
const PDFJS_MODULE_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.min.mjs`;
const PDFJS_WORKER_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

const toPageText = (items: PdfTextItem[]): string => {
  const lines: string[] = [];
  let currentLine = '';

  for (const item of items) {
    const value = (item.str ?? '').trim();
    if (!value) {
      continue;
    }

    currentLine = currentLine ? `${currentLine} ${value}` : value;

    if (item.hasEOL) {
      lines.push(currentLine);
      currentLine = '';
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.join('\n').trim();
};

export const extractPdfText = async (file: File): Promise<ExtractedPdfText> => {
  const pdfjs = await import(/* @vite-ignore */ PDFJS_MODULE_URL);
  pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;

  const data = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data });
  const pdf = await loadingTask.promise;

  const pages: string[] = [];
  const pageItems: PdfTextItem[][] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const textItems = (textContent.items ?? []) as PdfTextItem[];
    pages.push(toPageText(textItems));
    pageItems.push(textItems);
  }

  return { pages, pageItems };
};
