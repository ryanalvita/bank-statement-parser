import { useState } from 'react';

export default function ParserInteraction() {
  const [selectedFileName] = useState<string>('');
  const [parsingResults] = useState<string[]>([]);

  return (
    <section className="mt-6 rounded-md border border-gray-300 bg-white p-4">
      <h2 className="text-sm font-medium text-gray-900">File Upload</h2>
      <p className="mt-2 text-sm text-gray-600">Upload placeholder. PDF picker will be added in the next step.</p>

      <div className="mt-4 space-y-1 text-sm text-gray-600">
        <p>Selected file: {selectedFileName || 'None'}</p>
        <p>Parsed results: {parsingResults.length}</p>
      </div>
    </section>
  );
}
