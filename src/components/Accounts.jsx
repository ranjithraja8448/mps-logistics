import { useState, useEffect, useMemo } from "react";
import { CITIES } from "../constants";
import { local } from "../services/db";
import { generateEOD_PDF, shareEOD_WhatsApp, exportGSTR1_CSV } from "../utils/pdf";

export default function Accounts({ parcels, setParcels, db, showMsg, isDark, user }) {
  const dObj = new Date();
  const todayStr = dObj.toISOString().split("T")[0];
  dObj.setDate(1);
  const firstDayStr = dObj.toISOString().split("T")[0];

  const [acc, setAcc] = useState({ emi: 25000, diesel: 30000, other: 15000 });
  const [payoutRate, setPayoutRate] = useState(10);
  const [partnerCount, setPartnerCount] = useState(5);
  const [pettyDesc, setPettyDesc] = useState("");
  const [pettyAmt, setPettyAmt] = useState("");
  const [pettyLedger, setPettyLedger] = useState([]);

  const [eodDate, setEodDate] = useState(todayStr);
  const [eodBranch, setEodBranch] = useState(user.branch === "All" ? CITIES[0] : user.branch);

  const [gstrFrom, setGstrFrom] = useState(firstDayStr);
  const [gstrTo, setGstrTo] = useState(todayStr);

  const [selectedBranch, setSelectedBranch] = useState(user.branch === "All" ? CITIES[0] : user.branch);
  const [reconFrom, setReconFrom] = useState(firstDayStr);
  const [reconTo, setReconTo] = useState(todayStr);

  useEffect(() => {
    local.get("mps_petty_cash").then(d => {
      if (d) setPettyLedger(d);
    });
  }, []);

  const addPetty = async () => {
    if (!pettyDesc || !pettyAmt) return;
    const item = { desc: pettyDesc, amt: Number(pettyAmt), date: new Date().toLocaleDateString("en-IN") };
    const n = [item, ...pettyLedger];
    setPettyLedger(n);
    await local.set("mps_petty_cash", n);
    setPettyDesc("");
    setPettyAmt("");
    showMsg("Petty cash logged!");
  };

  const activeParcels = useMemo(() => parcels.filter(p => p.status !== "Deleted"), [parcels]);

  const unsettledBranchParcels = useMemo(() => {
    return activeParcels.filter(p => {
      const pDate = p.isoDate ? p.isoDate.split("T")[0] : "";
      const inRange = (!reconFrom || pDate >= reconFrom) && (!reconTo || pDate <= reconTo);
      const isRelated = p.from === selectedBranch || p.to === selectedBranch;
      const isSettled = p.settledBranches && p.settledBranches.includes(selectedBranch);
      return isRelated && !isSettled && inRange;
    });
  }, [activeParcels, reconFrom, reconTo, selectedBranch]);

  const totalSystemRevenue = useMemo(
    () => activeParcels.reduce((a, b) => a + (Number(b.price) || 0), 0),
    [activeParcels]
  );
  const totalPetty = useMemo(() => pettyLedger.reduce((a, b) => a + (Number(b.amt) || 0), 0), [pettyLedger]);
  const exp = Number(acc.emi) + Number(acc.diesel) + Number(acc.other);
  const net = totalSystemRevenue - exp - totalPetty;

  const { cashCollected, bookedCount, deliveredCount } = useMemo(() => {
    let collected = 0;
    let bCount = 0;
    let dCount = 0;

    unsettledBranchParcels.forEach(p => {
      if (
        (p.from === selectedBranch && p.payment === "Paid") ||
        (p.to === selectedBranch && p.payment === "To Pay" && p.status === "Delivered" && p.deliveryMode === "Cash")
      ) {
        collected += Number(p.price) || 0;
      }
      if (p.from === selectedBranch) {
        bCount += Number(p.count) || 0;
      }
      if (p.to === selectedBranch && p.status === "Delivered") {
        dCount += Number(p.count) || 0;
      }
    });

    return { cashCollected: collected, bookedCount: bCount, deliveredCount: dCount };
  }, [unsettledBranchParcels, selectedBranch]);

  const branchCommission = (bookedCount + deliveredCount) * Number(payoutRate);
  const netRemittance = cashCollected - branchCommission;

  const markLedgerSettled = async () => {
    if (unsettledBranchParcels.length === 0)
      return showMsg("No transactions to settle in this date range!", "error");
    if (!window.confirm(`Settle ledger for ${selectedBranch} from ${reconFrom} to ${reconTo}?`)) return;
    let updatedParcelsList = [...parcels];
    for (let p of unsettledBranchParcels) {
      const updated = { ...p, settledBranches: [...(p.settledBranches || []), selectedBranch] };
      await db.updateParcel(updated.id, updated);
      updatedParcelsList = updatedParcelsList.map(x => (x.id === updated.id ? updated : x));
    }
    setParcels(updatedParcelsList);
    showMsg(`Ledger Settled for ${selectedBranch}.`, "success");
  };

  const triggerEOD = () => {
    generateEOD_PDF(eodDate, eodBranch, activeParcels, pettyLedger);
    showMsg(`${eodBranch} Day-Book Report Generated!`);
  };

  const triggerEOD_WhatsApp = () => {
    const bParcels = activeParcels.filter(p => {
      const pDate = p.isoDate ? p.isoDate.split("T")[0] : "";
      return pDate === eodDate && (p.bookedBranch === eodBranch || p.from === eodBranch);
    });
    const dParcels = activeParcels.filter(p => {
      if (p.status !== "Delivered" || (p.deliveredBranch !== eodBranch && p.to !== eodBranch)) return false;
      return (p.history || []).some(h => h.status === "Delivered" && (h.time || "").includes(eodDate));
    });

    const paidAmt = bParcels.filter(p => p.payment === "Paid").reduce((a, b) => a + (Number(b.price) || 0), 0);
    const toPayCollected = dParcels.filter(p => p.payment === "To Pay").reduce((a, b) => a + (Number(b.price) || 0), 0);
    const creditAmt = bParcels.filter(p => p.payment === "Credit").reduce((a, b) => a + (Number(b.price) || 0), 0);
    const totalCash = paidAmt + toPayCollected;

    shareEOD_WhatsApp(eodDate, eodBranch, {
      bookedCount: bParcels.length,
      delCount: dParcels.length,
      paidAmt,
      toPayCollected,
      totalCash,
      creditAmt
    });
    showMsg("Opening WhatsApp Day-Book Dispatch...", "info");
  };

  const handleExportGSTR1 = () => {
    const success = exportGSTR1_CSV(parcels, gstrFrom, gstrTo);
    if (!success) {
      showMsg("No transactions found in selected tax period!", "error");
    } else {
      showMsg(`GSTR-1 Tax Report (${gstrFrom} to ${gstrTo}) exported successfully!`, "success");
    }
  };

  const cardBg = isDark
    ? "glass-card text-white"
    : "glass-card text-slate-800";
  const inputBg = isDark
    ? "bg-slate-900/80 border-slate-700 text-white placeholder-slate-500"
    : "bg-white/80 border-slate-200 text-slate-900 placeholder-slate-400";

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      {/* Daily EOD Day-Book Generator */}
      <div
        className={`${cardBg} p-6 rounded-3xl border border-indigo-500/30 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl`}
      >
        <div className="flex items-center gap-3">
          <span className="p-3 rounded-2xl bg-indigo-500/15 text-indigo-400 text-2xl">💵</span>
          <div>
            <h3 className="font-black text-lg text-indigo-500 dark:text-indigo-400">Daily EOD Settlement (Day-Book)</h3>
            <p className="text-xs opacity-60 font-semibold mt-0.5">Generate daily cash collection and handover receipts</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5 w-full md:w-auto items-center">
          {user.role === "superadmin" ? (
            <select
              value={eodBranch}
              onChange={e => setEodBranch(e.target.value)}
              className={`p-2.5 px-3.5 rounded-xl border font-bold text-xs outline-none ${inputBg}`}
            >
              {CITIES.map(c => (
                <option key={c} value={c}>
                  🏢 {c}
                </option>
              ))}
            </select>
          ) : (
            <div className="p-2.5 px-4 bg-indigo-500/10 text-indigo-400 font-bold rounded-xl text-xs border border-indigo-500/20">
              🏢 {eodBranch}
            </div>
          )}
          <input
            type="date"
            value={eodDate}
            onChange={e => setEodDate(e.target.value)}
            className={`p-2.5 px-3 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
          />
          <button
            onClick={triggerEOD}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2.5 px-4 rounded-xl shadow-lg shadow-indigo-600/20 transition-all text-xs flex items-center gap-1.5"
          >
            <span>📄</span> Day-Book PDF
          </button>
          <button
            onClick={triggerEOD_WhatsApp}
            title="1-Click WhatsApp EOD Summary to Owner/Manager"
            className="bg-[#25D366] hover:bg-[#1ebd59] text-white font-black py-2.5 px-4 rounded-xl shadow-lg shadow-[#25D366]/20 transition-all text-xs flex items-center gap-1.5"
          >
            <span>💬</span> Share WhatsApp
          </button>
        </div>
      </div>

      {/* GSTR-1 Government Tax Return Export */}
      <div
        className={`${cardBg} p-6 rounded-3xl border border-emerald-500/30 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl`}
      >
        <div className="flex items-center gap-3">
          <span className="p-3 rounded-2xl bg-emerald-500/15 text-emerald-400 text-2xl">📑</span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-lg text-emerald-500 dark:text-emerald-400">GSTR-1 Tax Return Export</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                GST Ready
              </span>
            </div>
            <p className="text-xs opacity-60 font-semibold mt-0.5">
              Govt-compliant B2B & B2C CSV table with 5% GST breakup, taxable value, and GSTINs
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5 w-full md:w-auto items-center">
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <span className="opacity-60 text-[10px] uppercase font-black">From:</span>
            <input
              type="date"
              value={gstrFrom}
              onChange={e => setGstrFrom(e.target.value)}
              className={`p-2.5 px-3 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <span className="opacity-60 text-[10px] uppercase font-black">To:</span>
            <input
              type="date"
              value={gstrTo}
              onChange={e => setGstrTo(e.target.value)}
              className={`p-2.5 px-3 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
            />
          </div>
          <button
            onClick={handleExportGSTR1}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 px-4 rounded-xl shadow-lg shadow-emerald-600/20 transition-all text-xs flex items-center gap-1.5"
          >
            <span>📥</span> Download GSTR-1 CSV
          </button>
        </div>
      </div>

      {/* Franchise Reconciliation & Payout */}
      <div className={`${cardBg} p-6 md:p-8 rounded-3xl border shadow-xl space-y-6`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-500/10 pb-4">
          <div>
            <h3 className="font-black text-xl text-indigo-500 dark:text-indigo-400">Franchise Reconciliation & Payout</h3>
            <p className="text-xs opacity-60 font-semibold mt-0.5">Automated commission settlement across partner branches</p>
          </div>
          <div className="flex flex-wrap gap-2.5 items-center text-xs">
            <span className="text-[10px] font-black opacity-50 uppercase tracking-wider">Scope:</span>
            {user.role === "superadmin" ? (
              <select
                value={selectedBranch}
                onChange={e => setSelectedBranch(e.target.value)}
                className={`p-2 rounded-xl border font-bold outline-none ${inputBg}`}
              >
                {CITIES.map(c => (
                  <option key={c} value={c}>
                    🏢 {c}
                  </option>
                ))}
              </select>
            ) : (
              <span className="p-2 bg-indigo-500/10 text-indigo-400 font-bold rounded-xl">{selectedBranch}</span>
            )}
            <input
              type="date"
              title="From Date"
              value={reconFrom}
              onChange={e => setReconFrom(e.target.value)}
              className={`p-2 rounded-xl border font-bold outline-none ${inputBg}`}
            />
            <span className="opacity-50 font-bold">➔</span>
            <input
              type="date"
              title="To Date"
              value={reconTo}
              onChange={e => setReconTo(e.target.value)}
              className={`p-2 rounded-xl border font-bold outline-none ${inputBg}`}
            />
          </div>
        </div>

        {/* 4 Financial Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl border border-dashed border-slate-500/20 bg-black/5 dark:bg-white/5 space-y-1">
            <span className="text-[10px] uppercase font-black opacity-60 tracking-wider">Unsettled Consignments</span>
            <p className="text-2xl font-black font-mono text-indigo-400">{unsettledBranchParcels.length}</p>
            <p className="text-[10px] opacity-50">
              {bookedCount} Inbound / {deliveredCount} Outbound
            </p>
          </div>
          <div className="p-4 rounded-2xl border border-dashed border-slate-500/20 bg-black/5 dark:bg-white/5 space-y-1">
            <span className="text-[10px] uppercase font-black opacity-60 tracking-wider">Cash Collected (Physical)</span>
            <p className="text-2xl font-black font-mono text-emerald-400">₹{cashCollected.toLocaleString()}</p>
            <p className="text-[10px] opacity-50">Branch In-Hand Cash</p>
          </div>
          <div className="p-4 rounded-2xl border border-dashed border-slate-500/20 bg-black/5 dark:bg-white/5 space-y-1">
            <span className="text-[10px] uppercase font-black opacity-60 tracking-wider">Commission Payout</span>
            <p className="text-2xl font-black font-mono text-amber-400">₹{branchCommission.toLocaleString()}</p>
            <p className="text-[10px] opacity-50">@ ₹{payoutRate} per package unit</p>
          </div>
          <div className="p-4 rounded-2xl border border-dashed border-emerald-500/40 bg-emerald-500/10 space-y-1">
            <span className="text-[10px] uppercase font-black text-emerald-600 dark:text-emerald-400 tracking-wider">
              Net Remittance to HQ
            </span>
            <p className="text-2xl font-black font-mono text-emerald-500">₹{netRemittance.toLocaleString()}</p>
            <p className="text-[10px] opacity-70 font-semibold">
              {netRemittance >= 0 ? "Branch owes HQ" : "HQ owes Branch"}
            </p>
          </div>
        </div>

        {/* Rate configuration & Settle action */}
        <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-slate-500/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold opacity-75">Configurable Payout Rate per Article:</span>
            <input
              type="number"
              value={payoutRate}
              onChange={e => setPayoutRate(Number(e.target.value))}
              className="w-20 p-2 rounded-xl border text-center font-black font-mono outline-none bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
            />
            <span className="text-xs font-mono opacity-50">₹/item</span>
          </div>
          <button
            onClick={markLedgerSettled}
            className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold px-6 py-3 rounded-xl text-xs shadow-lg shadow-emerald-600/20 transition-all"
          >
            Mark Ledger Settled & Closed ✅
          </button>
        </div>
      </div>

      {/* Operational Expenses & Partnership Yield */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fixed Operational Expenses */}
        <div className={`${cardBg} p-6 rounded-3xl border shadow-xl space-y-4`}>
          <div className="flex items-center gap-2 border-b border-slate-500/10 pb-3">
            <span className="p-1.5 rounded-xl bg-indigo-500/15 text-indigo-400 text-sm">🏭</span>
            <h3 className="font-black text-sm uppercase tracking-wider text-indigo-500">Fixed Operating Overhead</h3>
          </div>
          <div className="space-y-3 text-xs font-bold">
            <div>
              <label className="text-[10px] uppercase font-black opacity-60 block mb-1">
                Monthly Fleet Vehicle EMI (₹)
              </label>
              <input
                type="number"
                value={acc.emi}
                onChange={e => setAcc({ ...acc, emi: Number(e.target.value) })}
                className={`w-full p-3 rounded-xl border outline-none font-mono ${inputBg}`}
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-black opacity-60 block mb-1">
                Diesel & Tollway Log (₹)
              </label>
              <input
                type="number"
                value={acc.diesel}
                onChange={e => setAcc({ ...acc, diesel: Number(e.target.value) })}
                className={`w-full p-3 rounded-xl border outline-none font-mono ${inputBg}`}
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-black opacity-60 block mb-1">
                Rent, Warehouse & Power Utilities (₹)
              </label>
              <input
                type="number"
                value={acc.other}
                onChange={e => setAcc({ ...acc, other: Number(e.target.value) })}
                className={`w-full p-3 rounded-xl border outline-none font-mono ${inputBg}`}
              />
            </div>
          </div>
        </div>

        {/* Partnership Settlement Card */}
        <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white flex flex-col justify-between shadow-2xl border border-indigo-500/20">
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-black tracking-wider text-indigo-400">PARTNERSHIP NET YIELD</h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] opacity-60 uppercase font-bold">Stakeholders:</span>
                <input
                  type="number"
                  value={partnerCount}
                  onChange={e => setPartnerCount(Number(e.target.value))}
                  className="w-16 bg-white/10 text-white font-mono font-bold p-1 rounded-xl text-center border border-white/20 outline-none"
                />
              </div>
            </div>
            <p className="text-xs opacity-60 font-semibold">Global System Base Net Profit: ₹{net.toLocaleString()}</p>
          </div>

          <div className="my-6 bg-white/5 p-6 rounded-2xl text-center border border-white/10 backdrop-blur-md">
            <p className="text-[10px] opacity-60 uppercase tracking-widest font-black mb-1">Individual Dividend Yield</p>
            <p className="text-3xl md:text-4xl font-black font-mono text-emerald-400">
              ₹{((net / (partnerCount || 1)) || 0).toLocaleString()}
            </p>
          </div>

          <p className="text-[10px] opacity-40 text-center font-semibold">
            Calculated from gross revenue minus operational overheads and petty ledger.
          </p>
        </div>
      </div>

      {/* Petty Cash Ledger */}
      <div className={`${cardBg} p-6 rounded-3xl border shadow-xl space-y-4`}>
        <div className="flex items-center gap-2 border-b border-slate-500/10 pb-3">
          <span className="p-1.5 rounded-xl bg-orange-500/15 text-orange-400 text-sm">☕</span>
          <h3 className="font-black text-sm uppercase tracking-wider text-orange-500">Branch Petty Cash Ledger</h3>
        </div>

        <div className="flex gap-2">
          <input
            value={pettyDesc}
            onChange={e => setPettyDesc(e.target.value)}
            placeholder="Expense Description (e.g. Tea, Hamali coolie, Packing tape)..."
            className={`flex-1 p-2.5 rounded-xl border text-xs font-semibold outline-none ${inputBg}`}
          />
          <input
            value={pettyAmt}
            onChange={e => setPettyAmt(e.target.value)}
            placeholder="Amount ₹"
            type="number"
            className={`w-28 p-2.5 rounded-xl border text-xs font-mono font-bold outline-none ${inputBg}`}
          />
          <button
            onClick={addPetty}
            className="bg-orange-500 hover:bg-orange-600 text-white px-5 rounded-xl font-black text-sm transition-all shadow-md shadow-orange-500/20"
          >
            + Add
          </button>
        </div>

        <div
          className={`overflow-y-auto max-h-48 border rounded-2xl custom-scrollbar ${
            isDark ? "border-slate-800 bg-black/20" : "border-slate-200 bg-white/40"
          }`}
        >
          {pettyLedger.length === 0 ? (
            <p className="text-center py-6 text-xs opacity-50 font-semibold">No petty cash entries logged yet.</p>
          ) : (
            pettyLedger.map((l, i) => (
              <div
                key={i}
                className="flex justify-between items-center p-3 border-b border-slate-500/10 last:border-0 text-xs font-semibold"
              >
                <span>
                  {l.desc}
                  <span className="text-[10px] font-mono opacity-50 ml-2">({l.date})</span>
                </span>
                <span className="font-black font-mono text-orange-500">₹{l.amt}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
