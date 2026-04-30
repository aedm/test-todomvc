export type Filter = 'all' | 'active' | 'completed';

type Props = {
  value: Filter;
  onChange: (f: Filter) => void;
  counts: { all: number; active: number; completed: number };
};

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
];

export function FilterBar({ value, onChange, counts }: Props) {
  return (
    <nav aria-label="Filter todos" className="mt-4 flex items-center justify-center gap-1">
      {FILTERS.map(({ key, label }) => {
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-pressed={active}
            className={`rounded-full px-3 py-1 text-sm transition ${
              active
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            {label} <span className="opacity-70">({counts[key]})</span>
          </button>
        );
      })}
    </nav>
  );
}
