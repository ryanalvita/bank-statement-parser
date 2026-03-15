# Bank Statement Parser

Bank Statement Parser is a local-first web app that extracts transactions from bank statement PDFs and prepares them for spreadsheet workflows.

## What It Does

- Parses uploaded bank statement PDFs in the browser
- Detects supported statement format (currently ABN AMRO)
- Extracts transaction rows using PDF text and text-position data
- Shows parsed transactions in a table
- Exports data as TSV for easy spreadsheet pasting

## Current Scope

- Supported bank parser: `ABN AMRO`
- Other banks are listed in the UI but currently disabled (backlog)
- If a statement format is unsupported, the app returns `Unsupported statement format`

## Privacy

- Statement files are processed locally in the browser
- Files are not uploaded as part of the parsing workflow
- Note: PDF text extraction uses `pdfjs-dist` from jsDelivr at runtime, so internet access to load that module is required

## Tech Stack

- Astro 6
- React 19 (interactive parser UI)
- Tailwind CSS 4
- TypeScript
- PDF.js (`pdfjs-dist`, loaded via CDN in browser)

## Getting Started

### Prerequisites

- Node.js `>=22.12.0` (see `.nvmrc`)
- npm

### Install and Run

```bash
npm install
npm run dev
```

Open `http://localhost:4321`.

## Available Scripts

- `npm run dev` - Start local dev server
- `npm run build` - Build production output
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Auto-fix lint issues
- `npm run format` - Format files with Prettier
- `npm run format:check` - Check formatting
- `npm run type-check` - Run `astro check`
- `npm run check` - Type-check + lint + format check

## How Parsing Works

1. User uploads a PDF in the parser UI (`ParserInteraction.tsx`)
2. `extractPdfText` extracts per-page text and positioned text items
3. ABN AMRO format is detected from statement markers
4. `parsePositionedTransactions` groups text items by line and maps values into:
   - `date`
   - `time` (currently empty)
   - `description`
   - `category` (currently empty)
   - `outcome`
   - `income`
5. Parsed transactions are converted to TSV with header:
   `Date\tTime\tDescription\tCategory\tOutcome\tIncome`

## Output Format

The app exports TSV in this column order:

- `Date` (`YYYY-MM-DD`)
- `Time`
- `Description`
- `Category`
- `Outcome`
- `Income`

## Project Structure

```text
src/
  components/
    parser/ParserInteraction.tsx   # Main parser UI
  lib/
    models/transaction.ts          # Transaction types/categories
    output/transactionsToTsv.ts    # TSV serializer
    parsers/
      detectAbnAmro.ts             # Format detection
      extractCandidateTransactionLines.ts
      parsePositionedTransactions.ts
    pdf/extractPdfText.ts          # PDF text + positioned item extraction
    pipeline/
      abnAmroPipeline.ts           # End-to-end ABN parser pipeline
      bankParser.ts                # Generic parser interfaces
  pages/
    index.astro                    # Main parser page
    about.astro
    feedback.astro
    support.astro
```

## Notes and Limitations

- Parser rules are tuned for ABN AMRO layouts and may need updates when statement formatting changes
- Scanned/image-only PDFs may fail with `Non-text PDF detected`
- Time/category enrichment is not yet inferred from statement content

## Acknowledgements

- [@jonnysmillie](https://github.com/jonnysmillie) for the Astro base template used to start this project: [astro-base](https://github.com/jonnysmillie/astro-base/)
- OpenAI Codex

## License

MIT
