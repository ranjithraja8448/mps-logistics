import { useState, useMemo } from "react";
import { CITIES, STATUSES, S_CLR } from "../constants";
import { exportToCSV, generateListPDF } from "../utils/pdf";
import PrintGroup from "./common/PrintGroup";

export default function Track({ parcels, isDark, user, setGlobalView, initialStatus }) {
  const [fLR, setFLR] = useState("");
  const [fFrom, setFFrom] = useState("All");
  const [fTo, setFTo] = useState("All");
  const [fStatus, setFStatus] = useState(initialStatus || "All");
  const [prevStatus, setPrevStatus] = useState(initialStatus);
  const [fFromDate, setFFromDate] = useState("");
  const [fToDate, setFToDate] = useState("");
  const [sortOrder, setSortOrder] = useState("date_desc");
  const [pageIndex, setPageIndex] = useState(1);
  const PAGE_SIZE = 50;

  // Sync state if initialStatus prop changes from external navigation
  if (initialStatus !== prevStatus) {
    setPrevStatus(initialStatus);
    setFStatus(initialStatus || "All");
  }

  const cardBg = isDark
    ? "glass-card text-white"
    : "glass-card text-slate-800";
  const inputBg = isDark
    ? "bg-slate-900/80 border-slate-700 text-white placeholder-slate-500"
    : "bg-white/80 border-slate-200 text-slate-900 placeholder-slate-400";
  const tblBg = isDark ? "bg-slate-950/70 text-slate-300" : "bg-slate-100/80 text-slate-700";

  const results = useMemo(() => {
    const sTerm = fLR.toLowerCase();
    const filtered = parcels.filter(p => {
      if (fStatus === "All" && p.status === "Deleted") return false;
      if (fStatus !== "All" && p.status !== fStatus) return false;

      if (
        fLR &&
        !p.id.toLowerCase().includes(sTerm) &&
        !p.sPhone.includes(sTerm) &&
        !p.rPhone.includes(sTerm) &&
        !(p.sName && p.sName.toLowerCase().includes(sTerm)) &&
        !(p.rName && p.rName.toLowerCase().includes(sTerm))
      )
        return false;
      if (fFrom !== "All" && p.from !== fFrom) return false;
      if (fTo !== "All" && p.to !== fTo) return false;

      if (user.role === "staff" && p.from !== user.branch && p.to !== user.branch) return false;

      const pDate = p.isoDate ? p.isoDate.split("T")[0] : "";
      if (fFromDate && pDate < fFromDate) return false;
      if (fToDate && pDate > fToDate) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      if (sortOrder === "lr_asc") return a.id.localeCompare(b.id);
      if (sortOrder === "lr_desc") return b.id.localeCompare(a.id);
      if (sortOrder === "date_desc") return new Date(b.isoDate) - new Date(a.isoDate);
      if (sortOrder === "date_asc") return new Date(a.isoDate) - new Date(b.isoDate);
      return 0;
    });
  }, [parcels, fLR, fStatus, fFrom, fTo, user, fFromDate, fToDate, sortOrder]);

  const totalPages = Math.ceil(results.length / PAGE_SIZE) || 1;
  const currentPage = Math.min(Math.max(1, pageIndex), totalPages);
  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return results.slice(start, start + PAGE_SIZE);
  }, [results, currentPage]);

  const { totalQty, totalAmt, totalPaid, totalToPay, totalCredit } = useMemo(() => {
    return results.reduce(
      (acc, p) => {
        const amt = Number(p.price) || 0;
        acc.totalQty += Number(p.count) || 0;
        acc.totalAmt += amt;
        if (p.payment === "Paid") acc.totalPaid += amt;
        else if (p.payment === "To Pay") acc.totalToPay += amt;
        else if (p.payment === "Credit") acc.totalCredit += amt;
        return acc;
      },
      { totalQty: 0, totalAmt: 0, totalPaid: 0, totalToPay: 0, totalCredit: 0 }
    );
  }, [results]);

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Search Filters */}
      <div className={`${cardBg} p-4 md:p-6 rounded-3xl border shadow-xl space-y-3.5`}>
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-indigo-500/15 text-indigo-400 text-sm">🔍</span>
            <h3 className="font-black text-sm uppercase tracking-wider text-indigo-500">Track & Trace Filter Matrix</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportToCSV("Track_List", results)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black px-3.5 py-2 rounded-xl transition-all shadow-md shadow-indigo-600/20"
            >
              📥 CSV Export
            </button>
            <button
              onClick={() => generateListPDF("Tracked Parcels List", user.branch, results)}
              className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-black px-3.5 py-2 rounded-xl transition-all shadow-md"
            >
              📄 Print PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2.5">
          <input
            value={fLR}
            onChange={e => setFLR(e.target.value)}
            placeholder="🔍 LR / Phone / Sender..."
            className={`p-2.5 rounded-xl border text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/30 ${inputBg}`}
          />
          <select
            value={fFrom}
            onChange={e => setFFrom(e.target.value)}
            className={`p-2.5 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
          >
            <option value="All">Origin: All</option>
            {CITIES.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={fTo}
            onChange={e => setFTo(e.target.value)}
            className={`p-2.5 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
          >
            <option value="All">Target: All</option>
            {CITIES.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={fStatus}
            onChange={e => setFStatus(e.target.value)}
            className={`p-2.5 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
          >
            <option value="All">Status: All Active</option>
            {STATUSES.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            type="date"
            title="From Date"
            value={fFromDate}
            onChange={e => setFFromDate(e.target.value)}
            className={`p-2.5 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
          />
          <input
            type="date"
            title="To Date"
            value={fToDate}
            onChange={e => setFToDate(e.target.value)}
            className={`p-2.5 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
          />
          <select
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value)}
            className={`p-2.5 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
          >
            <option value="date_desc">Sort: Newest First</option>
            <option value="date_asc">Sort: Oldest First</option>
            <option value="lr_asc">Sort: LR (A ➔ Z)</option>
            <option value="lr_desc">Sort: LR (Z ➔ A)</option>
          </select>
        </div>
      </div>

      {/* Results Enterprise Data Grid */}
      <div className={`${cardBg} rounded-3xl border shadow-xl overflow-hidden`}>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="min-w-[900px] w-full text-left whitespace-nowrap text-sm">
            <thead
              className={`${tblBg} text-[10px] font-black uppercase tracking-wider border-b border-slate-500/10 sticky top-0 backdrop-blur-md z-10`}
            >
              <tr>
                <th className="p-4 pl-6">LR Code & Date</th>
                <th className="p-4">Route Info</th>
                <th className="p-4">Customer Details</th>
                <th className="p-4">Cargo Manifest</th>
                <th className="p-4">Freight & Mode</th>
                <th className="p-4">Status</th>
                <th className="p-4 pr-6 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-500/10">
              {results.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center opacity-50 font-bold text-sm">
                    🔍 No parcels match your query criteria.
                  </td>
                </tr>
              ) : (
                paginatedResults.map(p => (
                  <tr
                    key={p.id}
                    className="hover:bg-indigo-500/5 dark:hover:bg-indigo-500/10 transition-colors cursor-pointer group"
                    onClick={() => setGlobalView(p)}
                  >
                    <td className="p-4 pl-6">
                      <span className="font-black font-mono text-indigo-500 dark:text-indigo-400 text-sm group-hover:underline block">
                        {p.id}
                      </span>
                      <span className="text-[10px] font-mono opacity-50 block mt-0.5">{p.date}</span>
                    </td>
                    <td className="p-4 font-bold text-xs">
                      <span className="text-slate-400">{p.from}</span>
                      <span className="mx-1 text-indigo-400">➔</span>
                      <span>{p.to}</span>
                    </td>
                    <td className="p-4 text-xs">
                      <p className="font-bold text-slate-800 dark:text-slate-200">
                        {p.sName} ➔ {p.rName}
                      </p>
                      <p className="text-[10px] font-mono opacity-60 mt-0.5">
                        {p.sPhone} | {p.rPhone}
                      </p>
                    </td>
                    <td className="p-4 font-black text-amber-500 font-mono text-sm">
                      {p.count} <span className="text-xs font-normal text-slate-400">{p.type}</span>
                    </td>
                    <td className="p-4">
                      <span className="font-black font-mono text-sm">₹{p.price}</span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-md ml-2 ${
                          p.payment === "Paid"
                            ? "bg-emerald-500/15 text-emerald-500"
                            : p.payment === "To Pay"
                            ? "bg-rose-500/15 text-rose-500"
                            : "bg-purple-500/15 text-purple-500"
                        }`}
                      >
                        {p.payment}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase text-white shadow-sm"
                        style={{ backgroundColor: S_CLR[p.status] || "#6366f1" }}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-center" onClick={e => e.stopPropagation()}>
                      <PrintGroup p={p} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {results.length > 0 && (
              <tfoot
                className={`${
                  isDark
                    ? "bg-slate-900/90 border-slate-700/80 text-white"
                    : "bg-slate-100/90 border-slate-300 text-slate-900"
                } border-t-2 font-bold backdrop-blur-md`}
              >
                <tr>
                  <td colSpan="3" className="p-4 pl-6 text-right text-xs uppercase opacity-60">
                    Aggregate Overview:
                  </td>
                  <td className="p-4 text-amber-500 font-mono text-base">
                    {totalQty} <span className="text-xs">Items</span>
                  </td>
                  <td colSpan="3" className="p-4 pr-6">
                    <div className="flex flex-col gap-1 text-xs">
                      <span className="text-base font-black font-mono text-indigo-400">
                        Total: ₹{totalAmt.toLocaleString()}
                      </span>
                      <div className="flex flex-wrap gap-2 text-[11px] font-mono">
                        {totalPaid > 0 && (
                          <span className="text-emerald-500">Paid: ₹{totalPaid.toLocaleString()}</span>
                        )}
                        {totalToPay > 0 && (
                          <span className="text-rose-500">ToPay: ₹{totalToPay.toLocaleString()}</span>
                        )}
                        {totalCredit > 0 && (
                          <span className="text-purple-400">Credit: ₹{totalCredit.toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination Controls Bar */}
        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 border-t border-slate-500/10 text-xs">
            <div className="text-slate-400 font-medium">
              Showing <span className="font-bold text-indigo-400">{(currentPage - 1) * PAGE_SIZE + 1}</span> to{" "}
              <span className="font-bold text-indigo-400">{Math.min(currentPage * PAGE_SIZE, results.length)}</span> of{" "}
              <span className="font-bold text-indigo-400">{results.length}</span> parcels
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPageIndex(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-xl border border-slate-500/20 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-500/10 font-bold transition-all text-xs"
              >
                ◀ Prev
              </button>
              <span className="px-3 py-1 font-mono font-bold rounded-lg bg-indigo-500/10 text-indigo-400 text-xs">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setPageIndex(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 rounded-xl border border-slate-500/20 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-500/10 font-bold transition-all text-xs"
              >
                Next ▶
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
