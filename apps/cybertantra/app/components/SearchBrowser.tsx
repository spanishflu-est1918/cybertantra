'use client';

import { BrowserComponentProps } from '@cybertantra/ui/types';

type SearchBrowserProps = BrowserComponentProps;

export default function SearchBrowser({ onClose }: SearchBrowserProps) {
  return (
    <div className="p-4 border border-primary rounded">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Search Lecture Database</h2>
        <button onClick={onClose} className="text-primary hover:opacity-80">
          [X]
        </button>
      </div>
      <p>Search functionality coming soon...</p>
    </div>
  );
}