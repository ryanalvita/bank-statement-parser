import { useState } from 'react';

export default function ParserInteraction() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsingResults] = useState<string[]>([]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
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
        <p>Parsed results: {parsingResults.length}</p>
      </div>
    </section>
  );
}
