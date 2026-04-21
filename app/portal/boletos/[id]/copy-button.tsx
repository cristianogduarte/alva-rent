'use client';

import { useState } from 'react';

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="mt-2 text-xs text-navy-900 font-semibold hover:underline"
    >
      {copied ? '✅ Copiado!' : `📋 ${label}`}
    </button>
  );
}
