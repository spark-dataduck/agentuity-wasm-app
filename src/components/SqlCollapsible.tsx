import { useState } from 'react';

interface SqlCollapsibleProps {
  sql: string;
}

export function SqlCollapsible({ sql }: SqlCollapsibleProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-1">
      <button
        onClick={() => setOpen(!open)}
        className="text-[11px] text-fg-3 hover:text-fg-2 font-mono flex items-center gap-1"
      >
        <span className={`transition-transform ${open ? 'rotate-90' : ''}`}>
          ▸
        </span>
        Show SQL
      </button>
      {open && (
        <pre className="mt-1.5 p-3 bg-bg-1 border border-line rounded text-[11px] text-fg-2 font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap">
          {sql.trim()}
        </pre>
      )}
    </div>
  );
}
