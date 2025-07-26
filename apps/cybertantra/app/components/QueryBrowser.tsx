'use client';

import { BrowserComponentProps } from '@cybertantra/ui/types';

type QueryBrowserProps = BrowserComponentProps;

export default function QueryBrowser({ onClose }: QueryBrowserProps) {
  return (
    <div className="p-4 border border-primary rounded">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Advanced AI Query</h2>
        <button onClick={onClose} className="text-primary hover:opacity-80">
          [X]
        </button>
      </div>
      <p>Advanced AI query with context coming soon...</p>
    </div>
  );
}