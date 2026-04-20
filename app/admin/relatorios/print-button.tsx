'use client';

export function PrintButton({ label = 'imprimir' }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="text-xs px-3 py-1.5 border border-navy-100 rounded-md font-semibold hover:bg-navy-50"
    >
      {label}
    </button>
  );
}
