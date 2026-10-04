import { useState, useMemo } from "react";
import { CITIES, S_CLR } from "../constants";
import { exportToCSV, generateListPDF, generateTripSheetPDF } from "../utils/pdf";
import { playSuccessChime } from "../utils/audio";
import PrintGroup from "./common/PrintGroup";

export default function Pending({ parcels, setParcels, db, showMsg, isDark, user, setGlobalView }) {
  const [fLR, setFLR] = useState("");
  const [fFrom, setFFrom] = useState("All");
  const [fTo, setFTo] = useState("All");
  const [fFromDate, setFFromDate] = useState("");
  const [fToDate, setFToDate] = useState("");
  const [sortOrder, setSortOrder] = useState("lr_asc");
  const [pageIndex, setPageIndex] = useState(1);
  const PAGE_SIZE = 50;

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showTripModal, setShowTripModal] = useState(false);
  const [vehicleNo, setVehicleNo] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [targetBranch, setTargetBranch] = useState(CITIES[0]);
  const [isDispatching, setIsDispatching] = useState(false);

  const cardBg = isDark
    ? "glass-card text-white"
    : "glass-card text-slate-800";
  const inputBg = isDark
    ? "bg-slate-900/80 border-slate-700 text-white placeholder-slate-500"
    : "bg-white/80 border-slate-200 text-slate-900 placeholder-slate-400";
  const tblBg = isDark ? "bg-slate-950/70 text-slate-300" : "bg-slate-100/80 text-slate-700";

  const getDays = iso => {
    if (!iso) return 0;
    const diff = new Date() - new Date(iso);
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  };

  const pendingParcels = useMemo(() => {
    const sTerm = fLR.toLowerCase();
    const filtered = parcels.filter(p => {
      if (p.status !== "Booked" && p.status !== "In Transit") return false;
      if (user.role !== "superadmin" && p.from !== user.branch && p.to !== user.branch) return false;
      if (
        fLR &&
        !p.id.toLowerCase().includes(sTerm) &&
        !p.sPhone.includes(sTerm) &&
        !(p.sName && p.sName.toLowerCase().includes(sTerm))
      )
        return false;
      if (fFrom !== "All" && p.from !== fFrom) return false;
      if (fTo !== "All" && p.to !== fTo) return false;

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
  }, [parcels, fLR, user, fFrom, fTo, fFromDate, fToDate, sortOrder]);

  const totalPages = Math.ceil(pendingParcels.length / PAGE_SIZE) || 1;
  const currentPage = Math.min(Math.max(1, pageIndex), totalPages);
  const paginatedPending = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return pendingParcels.slice(start, start + PAGE_SIZE);
  }, [pendingParcels, currentPage]);

  const { pendingQty, pendingPaid, pendingToPay } = useMemo(() => {
    return pendingParcels.reduce(
      (acc, p) => {
        const amt = Number(p.price) || 0;
        acc.pendingQty += Number(p.count) || 0;
        if (p.payment === "Paid") acc.pendingPaid += amt;
        else if (p.payment === "To Pay") acc.pendingToPay += amt;
        return acc;
      },
      { pendingQty: 0, pendingPaid: 0, pendingToPay: 0 }
    );
  }, [pendingParcels]);

  const toggleSelect = id => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (paginatedPending.length > 0 && paginatedPending.every(p => selectedIds.has(p.id))) {
      const next = new Set(selectedIds);
      paginatedPending.forEach(p => next.delete(p.id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      paginatedPending.forEach(p => next.add(p.id));
      setSelectedIds(next);
    }
  };

  const selectedSummary = useMemo(() => {
    let articles = 0;
    let toPay = 0;
    parcels.forEach(p => {
      if (selectedIds.has(p.id)) {
        articles += Number(p.count) || 1;
        if (p.payment === "To Pay") toPay += Number(p.price) || 0;
      }
    });
    return { articles, toPay };
  }, [parcels, selectedIds]);

  const markBatchInTransit = async (tripInfo = null) => {
    if (selectedIds.size === 0) return;
    const selectedParcels = parcels.filter(p => selectedIds.has(p.id));
    if (selectedParcels.length === 0) return;

    setIsDispatching(true);
    try {
      if (tripInfo) {
        generateTripSheetPDF(tripInfo, selectedParcels);
      }

      const nowStr = new Date().toLocaleString("en-IN");
      const vehNote = tripInfo?.vehicleNo ? ` (Veh: ${tripInfo.vehicleNo})` : "";
      let updatedList = [...parcels];

      for (let p of selectedParcels) {
        const updatedHistory = [
          ...(p.history || []),
          {
            status: "In Transit",
            loc: user.branch,
            time: nowStr,
            user: user.username,
            reason: `Dispatched${vehNote}`
          }
        ];
        const modified = { ...p, status: "In Transit", history: updatedHistory };
        if (db) await db.updateParcel(p.id, modified);
        updatedList = updatedList.map(item => (item.id === p.id ? modified : item));
      }

      if (setParcels) setParcels(updatedList);
      setSelectedIds(new Set());
      setShowTripModal(false);
      setVehicleNo("");
      setDriverName("");
      setDriverPhone("");
      playSuccessChime();
      if (showMsg) {
        showMsg(
          tripInfo
            ? `Trip Sheet generated & ${selectedParcels.length} consignments dispatched to In-Transit!`
            : `${selectedParcels.length} consignments marked In-Transit!`,
          "success"
        );
      }
    } catch (err) {
      if (showMsg) showMsg("Error during batch dispatch: " + err.message, "error");
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Batch Outward Dispatch Floating Action Bar */}
      {selectedIds.size > 0 && (
        <div className="p-3.5 px-5 rounded-2xl bg-indigo-600/90 text-white shadow-xl shadow-indigo-500/25 flex flex-wrap items-center justify-between gap-3 border border-indigo-400/40 backdrop-blur-xl animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-mono font-black text-sm">
              {selectedIds.size}
            </span>
            <div>
              <p className="font-bold text-xs">Lots Selected for Outward Dispatch</p>
              <p className="text-[10px] opacity-80 font-mono">
                {selectedSummary.articles} Articles | To-Pay Cash: ₹{selectedSummary.toPay.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setTargetBranch(fTo !== "All" ? fTo : CITIES[0]);
                setShowTripModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-indigo-700 hover:bg-slate-100 font-black text-xs transition-all shadow-md active:scale-95"
            >
              <span>🚚</span>
              <span>Create Trip Sheet & Dispatch</span>
            </button>
            <button
              onClick={() => markBatchInTransit()}
              disabled={isDispatching}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-950/60 hover:bg-indigo-950 text-white font-bold text-xs transition-all border border-white/20"
            >
              <span>⚡</span>
              <span>{isDispatching ? "Dispatching..." : "Quick In-Transit"}</span>
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs transition-all"
              title="Deselect all"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Filter panel */}
      <div className={`${cardBg} p-4 md:p-6 rounded-3xl border shadow-xl space-y-3`}>
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-xl bg-amber-500/15 text-amber-500 text-sm">⏳</span>
          <h3 className="font-black text-sm uppercase tracking-wider text-amber-500">Filter Pending Inventory</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
          <input
            value={fLR}
            onChange={e => setFLR(e.target.value)}
            placeholder="🔍 Search LR / Phone / Sender..."
            className={`p-2.5 rounded-xl border text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-500/30 ${inputBg}`}
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
          <input
            type="date"
            title="From Booking Date"
            value={fFromDate}
            onChange={e => setFFromDate(e.target.value)}
            className={`p-2.5 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
          />
          <input
            type="date"
            title="To Booking Date"
            value={fToDate}
            onChange={e => setFToDate(e.target.value)}
            className={`p-2.5 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
          />
          <select
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value)}
            className={`p-2.5 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
          >
            <option value="lr_asc">Sort: LR (A ➔ Z)</option>
            <option value="lr_desc">Sort: LR (Z ➔ A)</option>
            <option value="date_desc">Sort: Newest First</option>
            <option value="date_asc">Sort: Oldest First</option>
          </select>
        </div>
      </div>

      {/* Enterprise Data Table */}
      <div className={`${cardBg} rounded-3xl shadow-xl border overflow-hidden`}>
        {/* Table Banner */}
        <div className="bg-amber-500/10 text-amber-600 dark:text-amber-400 p-4 px-6 font-bold md:text-base flex flex-wrap justify-between items-center gap-3 border-b border-amber-500/20">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">⏳</span>
            <span className="font-black tracking-wide">Pending Manifest Dispatch</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportToCSV("Pending_List", pendingParcels)}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-black px-3.5 py-2 rounded-xl transition-all shadow-md shadow-amber-600/20"
            >
              📥 CSV
            </button>
            <button
              onClick={() => generateListPDF("Pending Manifest", user.branch, pendingParcels)}
              className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-black px-3.5 py-2 rounded-xl transition-all shadow-md"
            >
              📄 Print PDF
            </button>
            <span className="bg-amber-500 text-slate-950 font-black px-3 py-1.5 rounded-xl text-xs font-mono shadow-sm">
              {pendingParcels.length} Lots
            </span>
          </div>
        </div>

        {/* Scrollable Data Grid */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead
              className={`${tblBg} text-[10px] uppercase font-black tracking-wider border-b border-slate-500/10 sticky top-0 backdrop-blur-md z-10`}
            >
              <tr>
                <th className="p-4 pl-5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={paginatedPending.length > 0 && paginatedPending.every(p => selectedIds.has(p.id))}
                    onChange={toggleSelectAll}
                    title="Select all on current page"
                    className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                  />
                </th>
                <th className="p-4 pl-2">LR Number</th>
                <th className="p-4">Route Path</th>
                <th className="p-4">Customer Details</th>
                <th className="p-4">Cargo Qty</th>
                <th className="p-4">Status</th>
                <th className="p-4">Stock Age</th>
                <th className="p-4 pr-6 text-center">Receipts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-500/10">
              {pendingParcels.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-12 text-center opacity-50 font-bold text-sm">
                    ✨ Great work! No pending parcels found for this criteria.
                  </td>
                </tr>
              ) : (
                paginatedPending.map(p => {
                  const days = getDays(p.isoDate);
                  const isSelected = selectedIds.has(p.id);
                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-indigo-500/5 dark:hover:bg-indigo-500/10 transition-colors cursor-pointer group ${
                        isSelected ? "bg-indigo-500/10" : ""
                      }`}
                      onClick={() => setGlobalView(p)}
                    >
                      <td className="p-4 pl-5 text-center" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(p.id)}
                          className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                        />
                      </td>
                      <td className="p-4 pl-2 font-black font-mono text-indigo-500 dark:text-indigo-400 group-hover:underline">
                        {p.id}
                      </td>
                      <td className="p-4 font-bold text-xs">
                        <span className="text-slate-400">{p.from}</span>
                        <span className="mx-1 text-indigo-400">➔</span>
                        <span>{p.to}</span>
                      </td>
                      <td className="p-4 text-xs">
                        <p className="font-bold text-slate-800 dark:text-slate-200">
                          {p.sName || "Unknown"} ➔ {p.rName || "Unknown"}
                        </p>
                        <p className="text-[10px] font-mono opacity-60">
                          {p.sPhone} / {p.rPhone}
                        </p>
                      </td>
                      <td className="p-4 font-black text-amber-500 font-mono text-sm">
                        {p.count} <span className="text-[10px] font-normal text-slate-400">{p.type}</span>
                      </td>
                      <td className="p-4">
                        <span
                          className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase text-white shadow-sm"
                          style={{ backgroundColor: S_CLR[p.status] || "#F59E0B" }}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-black ${
                            days > 2
                              ? "bg-rose-500/20 text-rose-500 border border-rose-500/30 animate-pulse"
                              : "bg-emerald-500/15 text-emerald-500"
                          }`}
                        >
                          {days === 0 ? "Today" : `${days} d ago`}
                        </span>
                      </td>
                      <td className="p-4 pr-6 text-center" onClick={e => e.stopPropagation()}>
                        <PrintGroup p={p} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {pendingParcels.length > 0 && (
              <tfoot
                className={`${
                  isDark
                    ? "bg-slate-900/90 border-slate-700/80 text-white"
                    : "bg-slate-100/90 border-slate-300 text-slate-900"
                } border-t-2 font-bold backdrop-blur-md`}
              >
                <tr>
                  <td colSpan="3" className="p-4 pl-6 text-right text-xs uppercase opacity-60">
                    Pending Summary Totals:
                  </td>
                  <td className="p-4 text-amber-500 font-mono text-base">
                    {pendingQty} <span className="text-xs">Items</span>
                  </td>
                  <td colSpan="3" className="p-4 pr-6">
                    <div className="flex flex-wrap gap-3 text-xs bg-black/5 dark:bg-white/5 p-2 px-3 rounded-xl border border-slate-500/10">
                      {pendingPaid > 0 && (
                        <span className="text-emerald-500 font-mono">Paid Value: ₹{pendingPaid.toLocaleString()}</span>
                      )}
                      {pendingToPay > 0 && (
                        <span className="text-rose-500 font-mono">ToPay Value: ₹{pendingToPay.toLocaleString()}</span>
                      )}
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
              Showing <span className="font-bold text-amber-500">{(currentPage - 1) * PAGE_SIZE + 1}</span> to{" "}
              <span className="font-bold text-amber-500">{Math.min(currentPage * PAGE_SIZE, pendingParcels.length)}</span> of{" "}
              <span className="font-bold text-amber-500">{pendingParcels.length}</span> pending lots
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPageIndex(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-xl border border-slate-500/20 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-amber-500/10 font-bold transition-all text-xs"
              >
                ◀ Prev
              </button>
              <span className="px-3 py-1 font-mono font-bold rounded-lg bg-amber-500/10 text-amber-500 text-xs">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setPageIndex(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 rounded-xl border border-slate-500/20 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-amber-500/10 font-bold transition-all text-xs"
              >
                Next ▶
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Outward Trip Manifest (OGPL Loading Sheet) Modal */}
      {showTripModal && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-[250] animate-fade-in"
          onClick={() => !isDispatching && setShowTripModal(false)}
        >
          <div
            className={`glass-card ${
              isDark ? "text-white" : "text-slate-900"
            } p-6 md:p-8 rounded-3xl max-w-lg w-full border shadow-2xl animate-bounce-in space-y-6 relative overflow-hidden`}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-500/20 pb-4">
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-2xl shadow-inner">
                  🚚
                </span>
                <div>
                  <h3 className="font-black text-lg md:text-xl tracking-tight">Create Trip Manifest (OGPL)</h3>
                  <p className="text-[11px] opacity-60 font-semibold">Outward Goods Parcel Loading Sheet & Dispatch</p>
                </div>
              </div>
              <button
                onClick={() => !isDispatching && setShowTripModal(false)}
                disabled={isDispatching}
                className="w-8 h-8 rounded-xl bg-black/10 dark:bg-white/10 hover:bg-rose-500/20 hover:text-rose-400 transition-all flex items-center justify-center text-sm font-bold disabled:opacity-40"
              >
                ✕
              </button>
            </div>

            {/* Quick summary stats */}
            <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-slate-500/10 text-center">
              <div>
                <p className="text-[10px] uppercase font-black opacity-50">Selected LRs</p>
                <p className="text-base font-black font-mono text-indigo-400">{selectedIds.size}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-black opacity-50">Total Articles</p>
                <p className="text-base font-black font-mono text-amber-500">{selectedSummary.articles}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-black opacity-50">To-Pay Cash</p>
                <p className="text-base font-black font-mono text-rose-500">₹{selectedSummary.toPay.toLocaleString()}</p>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-3.5">
              <div>
                <label className="text-[11px] uppercase font-black opacity-60 block mb-1">
                  Destination Branch (Route End)
                </label>
                <select
                  value={targetBranch}
                  onChange={e => setTargetBranch(e.target.value)}
                  className={`w-full p-3 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
                >
                  {CITIES.map(c => (
                    <option key={c} value={c}>
                      🏢 {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] uppercase font-black opacity-60 block mb-1">
                  Vehicle / Truck Number
                </label>
                <input
                  value={vehicleNo}
                  onChange={e => setVehicleNo(e.target.value.toUpperCase())}
                  placeholder="e.g. TN 38 AB 1234 / Lorry No"
                  className={`w-full p-3 rounded-xl border text-xs font-mono font-bold uppercase outline-none focus:ring-2 focus:ring-indigo-500/30 ${inputBg}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] uppercase font-black opacity-60 block mb-1">
                    Driver Name
                  </label>
                  <input
                    value={driverName}
                    onChange={e => setDriverName(e.target.value)}
                    placeholder="e.g. M. Ramanathan"
                    className={`w-full p-3 rounded-xl border text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/30 ${inputBg}`}
                  />
                </div>
                <div>
                  <label className="text-[11px] uppercase font-black opacity-60 block mb-1">
                    Driver Phone
                  </label>
                  <input
                    value={driverPhone}
                    onChange={e => setDriverPhone(e.target.value)}
                    placeholder="e.g. 98765 43210"
                    maxLength={10}
                    className={`w-full p-3 rounded-xl border text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-500/30 ${inputBg}`}
                  />
                </div>
              </div>
            </div>

            {/* Note */}
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[11px] font-medium text-indigo-400">
              ℹ️ Dispatching will update all {selectedIds.size} consignments to <span className="font-bold">In Transit</span> and automatically trigger the high-resolution printable OGPL Trip Manifest PDF with driver & incharge signature lines.
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-500/15">
              <button
                type="button"
                onClick={() => setShowTripModal(false)}
                disabled={isDispatching}
                className="px-4 py-2.5 rounded-xl border border-slate-500/20 hover:bg-black/5 dark:hover:bg-white/5 font-bold text-xs transition-all disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  markBatchInTransit({
                    originBranch: user.branch,
                    destinationBranch: targetBranch,
                    tripDate: new Date().toISOString().split("T")[0],
                    vehicleNo: vehicleNo.trim().toUpperCase() || "N/A",
                    driverName: driverName.trim() || "N/A",
                    driverPhone: driverPhone.trim() || "N/A"
                  })
                }
                disabled={isDispatching}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2 disabled:opacity-50"
              >
                {isDispatching ? (
                  <>
                    <span className="animate-spin text-sm">⏳</span>
                    <span>Processing Manifest...</span>
                  </>
                ) : (
                  <>
                    <span>📄</span>
                    <span>Print Trip Sheet & Dispatch</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
