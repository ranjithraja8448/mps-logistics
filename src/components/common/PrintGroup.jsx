import { generatePDF, generateThermalLabelPDF } from "../../utils/pdf";

export default function PrintGroup({ p }) {
  return (
    <div
      className="flex items-center gap-1.5 bg-slate-500/10 dark:bg-white/5 backdrop-blur-md p-1 rounded-xl border border-slate-500/20 dark:border-white/10 w-max shadow-sm"
      onClick={e => e.stopPropagation()}
    >
      <span className="text-[9px] font-black opacity-60 ml-1.5 uppercase tracking-wider text-slate-600 dark:text-slate-300">
        🖨️:
      </span>
      <button
        onClick={e => {
          e.stopPropagation();
          generatePDF(p, 1);
        }}
        title="1 copy per page (Full)"
        className="px-2 py-1 text-[10px] font-black rounded-lg bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 transition-all duration-200 shadow-sm border border-slate-200/50 dark:border-slate-700/50"
      >
        1x
      </button>
      <button
        onClick={e => {
          e.stopPropagation();
          generatePDF(p, 2);
        }}
        title="2 copies per page (Half)"
        className="px-2 py-1 text-[10px] font-black rounded-lg bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 transition-all duration-200 shadow-sm border border-slate-200/50 dark:border-slate-700/50"
      >
        2x
      </button>
      <button
        onClick={e => {
          e.stopPropagation();
          generatePDF(p, 3);
        }}
        title="3 copies per page (Third)"
        className="px-2 py-1 text-[10px] font-black rounded-lg bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 transition-all duration-200 shadow-sm border border-slate-200/50 dark:border-slate-700/50"
      >
        3x
      </button>
      <button
        onClick={e => {
          e.stopPropagation();
          generateThermalLabelPDF(p);
        }}
        title="Print Thermal Box Sticker (3x2 inch)"
        className="px-2 py-1 text-[10px] font-black rounded-lg bg-amber-500/15 text-amber-500 hover:bg-amber-500 hover:text-slate-900 transition-all duration-200 shadow-sm border border-amber-500/30"
      >
        🏷️
      </button>
    </div>
  );
}
