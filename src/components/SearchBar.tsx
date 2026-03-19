interface Props {
  value: string;
  onChange: (v: string) => void;
  total: number;
  filtered: number;
  visible: number;
}

export default function SearchBar({
  value,
  onChange,
  total,
  filtered,
  visible,
}: Props) {
  return (
    <div className="mb-8">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
          🔍
        </span>
        <input
          type="search"
          placeholder="Search apps, vendors, commands…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
          className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-10 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-slate-500 transition-colors"
        />
        {value && (
          <button
            onClick={() => onChange("")}
            aria-label="Clear"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
          >
            ✕
          </button>
        )}
      </div>
      <p className="mt-2 text-sm text-slate-500">
        {value
          ? `${visible} of ${filtered} matching apps shown`
          : `${visible} of ${total} apps shown`}
      </p>
    </div>
  );
}
