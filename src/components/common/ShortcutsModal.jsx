export default function ShortcutsModal({ onClose, isDark }) {
  const shortcutGroups = [
    {
      title: "Consignment Booking [F7 - F10]",
      color: "text-emerald-400",
      items: [
        { key: "F7", desc: "Open Booking with PAID Payment Mode", badge: "bg-emerald-500/20 text-emerald-400" },
        { key: "F8", desc: "Open Booking with TO PAY Payment Mode", badge: "bg-amber-500/20 text-amber-400" },
        { key: "F9", desc: "Open Booking with CREDIT Account Mode", badge: "bg-purple-500/20 text-purple-400" },
        { key: "F10", desc: "Open Booking with FOC (Free of Cost) Mode", badge: "bg-slate-500/20 text-slate-400" }
      ]
    },
    {
      title: "Scanner & Operations",
      color: "text-indigo-400",
      items: [
        { key: "F6", desc: "Rapid Delivery Barcode Scanner Terminal", badge: "bg-indigo-500/20 text-indigo-400" },
        { key: "Enter", desc: "Execute Scanner Search / Submit Modal Form", badge: "bg-indigo-500/20 text-indigo-400" },
        { key: "Esc", desc: "Dismiss Active Popup, Manifest Quick-View, or Modal", badge: "bg-rose-500/20 text-rose-400" }
      ]
    },
    {
      title: "Global Navigation & Shortcuts",
      color: "text-violet-400",
      items: [
        { key: "?", desc: "Toggle this Keyboard Shortcuts Reference", badge: "bg-violet-500/20 text-violet-400" },
        { key: "Shift + /", desc: "Alternative trigger for Shortcuts Reference", badge: "bg-violet-500/20 text-violet-400" },
        { key: "Tab", desc: "Jump to next field with Auto-SmartFocus", badge: "bg-blue-500/20 text-blue-400" }
      ]
    }
  ];

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[250] animate-fade-in"
      onClick={onClose}
    >
      <div
        className={`glass-card ${
          isDark ? "text-white" : "text-slate-900"
        } p-6 md:p-8 rounded-3xl max-w-xl w-full border shadow-2xl animate-bounce-in space-y-6 relative overflow-hidden`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-500/20 pb-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xl shadow-inner">
              ⌨️
            </span>
            <div>
              <h3 className="font-black text-lg md:text-xl tracking-tight">Keyboard Shortcuts Reference</h3>
              <p className="text-[11px] opacity-60 font-semibold">Speed up your warehouse and counter operations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-black/10 dark:bg-white/10 hover:bg-rose-500/20 hover:text-rose-400 transition-all flex items-center justify-center text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Shortcuts Categories */}
        <div className="space-y-4 max-h-[65vh] overflow-y-auto custom-scrollbar pr-1">
          {shortcutGroups.map(group => (
            <div key={group.title} className="space-y-2">
              <h4 className={`text-xs uppercase font-black tracking-wider ${group.color}`}>{group.title}</h4>
              <div className="grid gap-2">
                {group.items.map(item => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-2.5 px-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-slate-500/10 hover:border-indigo-500/30 transition-all text-xs"
                  >
                    <span className="font-medium opacity-90">{item.desc}</span>
                    <kbd className={`px-2.5 py-1 rounded-xl font-mono font-black text-xs shadow-sm border border-slate-500/20 ${item.badge}`}>
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer tip */}
        <div className="pt-2 border-t border-slate-500/15 flex items-center justify-between text-xs opacity-60 font-semibold">
          <span>Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px]">Esc</kbd> anytime to close</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition-all shadow-md shadow-indigo-600/20"
          >
            Got it ➔
          </button>
        </div>
      </div>
    </div>
  );
}
