import { useState } from "react";

export default function CreditSearchDropdown({ value, onChange, uniqueCompanies, isDark }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const [prevValue, setPrevValue] = useState(value);

  // Sync state with incoming prop change without triggering useEffect cascading renders
  if (value !== prevValue) {
    setPrevValue(value);
    setSearch(value);
  }

  const matches = uniqueCompanies.filter(c => c.toLowerCase().includes(search.toLowerCase()));
  const inputBg = isDark
    ? "bg-slate-900/60 border-slate-700/80 text-white placeholder-slate-500"
    : "bg-white/80 border-slate-200 text-slate-800 placeholder-slate-400";
  const dropdownBg = isDark ? "bg-slate-900/95 border-slate-700 text-white" : "bg-white/95 border-slate-200 text-slate-800";

  return (
    <div className="relative w-full">
      <input
        value={search}
        onChange={e => {
          setSearch(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 250)}
        placeholder="🔍 Search Credit Company Account..."
        className={`w-full p-3 rounded-xl border backdrop-blur-md text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all ${inputBg}`}
      />
      {open && matches.length > 0 && (
        <div
          className={`absolute bottom-full mb-2 left-0 right-0 max-h-48 overflow-y-auto custom-scrollbar z-[100] border shadow-2xl rounded-2xl backdrop-blur-xl ${dropdownBg}`}
        >
          {matches.map((c, i) => (
            <div
              key={i}
              className={`p-3 cursor-pointer border-b border-slate-500/10 text-sm font-bold transition-colors ${
                isDark ? "hover:bg-slate-800 text-slate-200" : "hover:bg-indigo-50 text-slate-800"
              }`}
              onMouseDown={() => {
                onChange(c);
                setSearch(c);
                setOpen(false);
              }}
            >
              🏢 {c}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
