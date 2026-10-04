export default function DeletedParcelsLog({ parcels, isDark }) {
  const deletedList = parcels.filter(p => p.status === "Deleted");
  const cardBg = isDark
    ? "glass-card bg-slate-900/60 border-slate-700/60 text-white"
    : "glass-card bg-white/75 border-slate-200/80 text-slate-900";
  const tblBg = isDark ? "bg-slate-950/70 text-slate-300" : "bg-slate-100/80 text-slate-700";

  return (
    <div className={`${cardBg} p-5 md:p-6 rounded-3xl border shadow-xl mt-6 space-y-4`}>
      <div className="flex items-center gap-2.5 border-b border-slate-500/10 pb-3">
        <span className="p-2 rounded-xl bg-rose-500/15 text-rose-500 text-lg">🗑️</span>
        <div>
          <h3 className="font-black text-sm uppercase tracking-wider text-rose-500">Deleted Parcels Purge Log</h3>
          <p className="text-[10px] opacity-60 font-semibold">Immutable audit history of deleted consignments</p>
        </div>
        <span className="ml-auto bg-rose-500 text-white text-[10px] px-2.5 py-1 rounded-xl font-mono font-bold shadow-sm">
          {deletedList.length} Purged
        </span>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left whitespace-nowrap text-sm">
          <thead className={`${tblBg} text-[10px] uppercase font-black tracking-wider border-b border-slate-500/10`}>
            <tr>
              <th className="p-3 pl-4">LR No</th>
              <th className="p-3">Route & Customers</th>
              <th className="p-3">Purged By</th>
              <th className="p-3">Audit Reason</th>
              <th className="p-3 pr-4">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-500/10">
            {deletedList.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-8 text-center opacity-50 font-bold text-xs">
                  No consignments have been deleted from the database.
                </td>
              </tr>
            ) : (
              deletedList.map(p => {
                const lastAction = p.history?.slice(-1)[0];
                return (
                  <tr key={p.id} className="hover:bg-rose-500/5 transition-colors">
                    <td className="p-3 pl-4 font-mono font-black text-rose-400 line-through">📦 {p.id}</td>
                    <td className="p-3 text-xs">
                      <p className="font-bold">
                        {p.from} ➔ {p.to}
                      </p>
                      <p className="text-[10px] opacity-60">
                        {p.sName} ➔ {p.rName}
                      </p>
                    </td>
                    <td className="p-3 text-xs font-bold text-indigo-400">
                      👤 {p.deletedBy || lastAction?.user || "System"}
                    </td>
                    <td className="p-3 text-xs">
                      <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold text-[11px]">
                        "{lastAction?.reason || "No reason specified"}"
                      </span>
                    </td>
                    <td className="p-3 pr-4 text-xs font-mono opacity-70">{lastAction?.time || p.date}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
