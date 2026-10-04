import { useState } from "react";

export default function SuggestInput({ id, label, value, onChange, onSelect, dataList, isPhone, theme, onKeyDown }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [prevValue, setPrevValue] = useState(value);

  // Reset activeIndex when query value changes without extra render pass
  if (value !== prevValue) {
    setPrevValue(value);
    setActiveIndex(-1);
  }

  const matches = dataList.filter(c =>
    isPhone ? c.phone.includes(value) : (c.name || "").toLowerCase().includes(value.toLowerCase())
  );

  const handleKeyDown = e => {
    if (open && matches.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex(prev => (prev + 1) % matches.length);
        return;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex(prev => (prev - 1 + matches.length) % matches.length);
        return;
      } else if (e.key === "Enter") {
        if (activeIndex >= 0 && activeIndex < matches.length) {
          e.preventDefault();
          onSelect(matches[activeIndex]);
          setOpen(false);
          return;
        }
      } else if (e.key === "Escape") {
        setOpen(false);
        return;
      }
    }
    if (onKeyDown) onKeyDown(e);
  };

  const isDark = theme === "dark";
  const inputBg = isDark
    ? "bg-slate-900/60 border-slate-700/80 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
    : "bg-white/80 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

  return (
    <div className={`relative w-full ${open ? "z-50" : "z-10"}`}>
      <input
        id={id}
        onKeyDown={handleKeyDown}
        value={value}
        onChange={e => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 250)}
        placeholder={label}
        className={`w-full p-3 rounded-xl border backdrop-blur-md transition-all duration-200 outline-none text-sm font-semibold shadow-sm ${inputBg}`}
      />
      {open && matches.length > 0 && (
        <div
          className={`absolute top-full left-0 right-0 mt-2 rounded-2xl shadow-2xl border overflow-hidden max-h-52 overflow-y-auto custom-scrollbar z-[100] backdrop-blur-xl ${
            isDark ? "bg-slate-900/95 border-slate-700" : "bg-white/95 border-slate-200"
          }`}
        >
          {matches.map((c, i) => (
            <div
              key={i}
              className={`p-3 cursor-pointer text-sm transition-all duration-150 border-b border-slate-500/10 ${
                activeIndex === i
                  ? "bg-indigo-600 text-white font-bold"
                  : isDark
                  ? "hover:bg-slate-800/80 text-slate-200"
                  : "hover:bg-indigo-50 text-slate-800"
              }`}
              onMouseDown={() => {
                onSelect(c);
                setOpen(false);
              }}
            >
              <div className="flex justify-between items-center">
                <span className="font-bold">{c.name || "Anonymous"}</span>
                <span
                  className={`text-xs font-mono px-2 py-0.5 rounded-md ${
                    activeIndex === i ? "bg-white/20" : "bg-indigo-500/10 text-indigo-500"
                  }`}
                >
                  {c.phone}
                </span>
              </div>
              {c.gst && <p className="text-[10px] opacity-70 mt-0.5">GST: {c.gst}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
