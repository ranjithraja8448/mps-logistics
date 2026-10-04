import { useState } from "react";
import { playScanBeep, playSuccessChime, playErrorBuzz } from "../utils/audio";

export default function Delivery({ parcels, showMsg, isDark, setGlobalView }) {
  const [id, setId] = useState("");

  const searchLR = () => {
    playScanBeep();
    const item = parcels.find(p => p.id.toUpperCase() === id.trim().toUpperCase());
    if (item) {
      if (item.status === "Deleted") {
        playErrorBuzz();
        return showMsg("This parcel was Deleted!", "error");
      }
      if (item.status === "Delivered") {
        showMsg("Note: Parcel is already marked Delivered!", "info");
      }
      playSuccessChime();
      setGlobalView(item);
      setId("");
    } else {
      playErrorBuzz();
      showMsg("LR Manifest not found!", "error");
    }
  };

  const cardBg = isDark
    ? "glass-card text-white"
    : "glass-card text-slate-800";

  return (
    <div className="max-w-xl mx-auto space-y-5 md:space-y-6 animate-fade-in my-6">
      <div className={`${cardBg} p-8 md:p-10 rounded-3xl border shadow-2xl text-center space-y-5 relative overflow-hidden`}>
        <div className="w-16 h-16 rounded-3xl bg-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center text-3xl shadow-inner">
          🤝
        </div>
        <div>
          <h2 className="text-2xl font-black text-indigo-500 dark:text-indigo-400">Rapid Delivery Terminal [F6]</h2>
          <p className="text-xs opacity-60 font-semibold mt-1">Scan barcode or enter LR Number for instant handover</p>
        </div>

        <div className="flex gap-2 flex-col sm:flex-row">
          <input
            id="delScan"
            autoFocus
            onKeyDown={e => e.key === "Enter" && searchLR()}
            value={id}
            onChange={e => setId(e.target.value.toUpperCase())}
            placeholder="Enter / Scan LR (e.g. 04/08/0195)..."
            className="flex-1 p-3.5 rounded-2xl border font-mono font-bold text-center tracking-wider text-base outline-none bg-black/5 dark:bg-white/5 border-indigo-500/30 text-indigo-500 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={searchLR}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold px-6 py-3.5 rounded-2xl shadow-lg shadow-indigo-600/30 transition-all text-sm"
          >
            Process Handover ➔
          </button>
        </div>

        <div className="p-3 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 text-xs text-indigo-400 font-semibold flex items-center justify-center gap-2">
          <span>⚡</span>
          <span>Supports handheld 1D/2D USB Barcode Scanners</span>
        </div>
      </div>
    </div>
  );
}
