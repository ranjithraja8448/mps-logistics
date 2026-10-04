import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { CITIES, STATUSES, S_CLR } from "../constants";
import { generateListPDF } from "../utils/pdf";
import PrintGroup from "./common/PrintGroup";

export default function Dashboard({ parcels, isDark, user, setPage, setTrackFilter, setGlobalView }) {
  const [selectedBranch, setSelectedBranch] = useState(user.branch === "All" ? "All" : user.branch);
  const [expandedStaff, setExpandedStaff] = useState(null);
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split("T")[0]);

  const activeParcels = useMemo(() => parcels.filter(p => p.status !== "Deleted"), [parcels]);

  const branchParcels = useMemo(() => {
    return activeParcels.filter(p =>
      selectedBranch === "All" ? true : p.bookedBranch === selectedBranch || p.from === selectedBranch || p.to === selectedBranch
    );
  }, [activeParcels, selectedBranch]);

  const rev = useMemo(() => branchParcels.reduce((a, b) => a + (Number(b.price) || 0), 0), [branchParcels]);

  const cardBg = isDark
    ? "glass-card text-white"
    : "glass-card text-slate-800";

  const chartData = useMemo(() => {
    return STATUSES.filter(s => s !== "Deleted").map(s => ({
      name: s,
      count: branchParcels.filter(p => p.status === s).length
    }));
  }, [branchParcels]);

  const pendingCount = useMemo(
    () => branchParcels.filter(p => p.status === "Booked" || p.status === "In Transit").length,
    [branchParcels]
  );
  const deliveredCount = useMemo(
    () => branchParcels.filter(p => p.status === "Delivered").length,
    [branchParcels]
  );

  const goToTrack = status => {
    setTrackFilter(status);
    setPage("track");
  };

  const filteredDelParcels = useMemo(() => {
    const [selY, selM, selD] = deliveryDate.split("-");
    const targetDate = new Date(selY, selM - 1, selD);
    const targetDateString = targetDate.toDateString();
    const t1 = targetDate.toLocaleDateString();
    const t2 = targetDate.toLocaleDateString("en-IN");
    const t3 = targetDate.toLocaleDateString("en-US");
    const t4 = `${String(selD).padStart(2, "0")}/${String(selM).padStart(2, "0")}/${selY}`;
    const t5 = `${Number(selD)}/${Number(selM)}/${selY}`;
    const t6 = `${String(selM).padStart(2, "0")}/${String(selD).padStart(2, "0")}/${selY}`;

    return branchParcels.filter(p => {
      if (p.status !== "Delivered" || !p.history) return false;
      return p.history.some(h => {
        if (h.status !== "Delivered") return false;
        const hTimeStr = h.time || "";
        let isMatch = false;
        try {
          const parsedDate = new Date(hTimeStr);
          if (!isNaN(parsedDate)) {
            isMatch = parsedDate.toDateString() === targetDateString;
          }
        } catch {
          // Fallback to text formatting match
        }
        if (!isMatch) {
          isMatch =
            hTimeStr.includes(t1) ||
            hTimeStr.includes(t2) ||
            hTimeStr.includes(t3) ||
            hTimeStr.includes(t4) ||
            hTimeStr.includes(t5) ||
            hTimeStr.includes(t6);
        }
        return isMatch;
      });
    });
  }, [branchParcels, deliveryDate]);

  const { staffStats, tCollected, tTotalValue } = useMemo(() => {
    const stats = {};
    let collected = 0,
      totalVal = 0;

    filteredDelParcels.forEach(p => {
      const staffName = p.deliveredBy || "System";
      if (!stats[staffName]) {
        stats[staffName] = { count: 0, totalValue: 0, collected: 0, paid: 0, toPay: 0, credit: 0, parcels: [] };
      }

      const amt = Number(p.price) || 0;
      stats[staffName].count += 1;
      stats[staffName].totalValue += amt;
      totalVal += amt;
      stats[staffName].parcels.push(p);

      if (p.payment === "Paid") {
        stats[staffName].paid += amt;
      } else if (p.payment === "Credit" || (p.payment === "To Pay" && p.deliveryMode === "Credit")) {
        stats[staffName].credit += amt;
      } else if (p.payment === "To Pay") {
        stats[staffName].toPay += amt;
        if (p.deliveryMode === "Cash" || p.deliveryMode === "GPay" || !p.deliveryMode) {
          stats[staffName].collected += amt;
          collected += amt;
        }
      }
    });

    return { staffStats: stats, tCollected: collected, tTotalValue: totalVal };
  }, [filteredDelParcels]);

  const editLogs = useMemo(() => {
    const parseLocTime = timeStr => {
      if (!timeStr) return 0;
      try {
        if (timeStr.includes(",")) {
          const parts = timeStr.split(",");
          const datePart = parts[0].trim();
          const timePart = parts[1].trim();
          if (datePart.includes("/")) {
            const [d, m, y] = datePart.split("/");
            return new Date(`${m}/${d}/${y} ${timePart}`).getTime() || new Date(timeStr).getTime() || 0;
          }
        }
        return new Date(timeStr).getTime() || 0;
      } catch {
        return 0;
      }
    };

    const logs = [];
    const targetParcels = user.role === "superadmin" && selectedBranch === "All" ? parcels : branchParcels;

    targetParcels.forEach(p => {
      if (p.history) {
        p.history.forEach(h => {
          if (h.status === "Edited" || h.status === "Deleted") {
            logs.push({
              lr: p.id,
              time: h.time,
              user: h.user || "Unknown",
              reason: h.reason || "No reason provided",
              loc: h.loc,
              status: h.status,
              parsedTime: parseLocTime(h.time)
            });
          }
        });
      }
    });
    logs.sort((a, b) => b.parsedTime - a.parsedTime);
    return logs;
  }, [parcels, branchParcels, user.role, selectedBranch]);

  return (
    <div className="space-y-6">
      {/* Branch selector for Superadmin */}
      {(user.role === "superadmin" || user.branch === "All") && (
        <div className="flex justify-end items-center gap-3">
          <label className="text-xs uppercase font-extrabold opacity-60">Network Scope:</label>
          <select
            value={selectedBranch}
            onChange={e => setSelectedBranch(e.target.value)}
            className="p-2.5 px-4 rounded-2xl border font-bold text-xs outline-none bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-700 shadow-sm backdrop-blur-md focus:ring-2 focus:ring-indigo-500/30"
          >
            <option value="All">🌍 Global Network (All Branches)</option>
            {CITIES.map(c => (
              <option key={c} value={c}>
                🏢 Branch: {c}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 5 KPI Metric Anti-Gravity Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        {/* Card 1: Total Bookings */}
        <div
          onClick={() => goToTrack("All")}
          className={`${cardBg} p-4 md:p-5 rounded-3xl shadow-lg flex flex-col justify-between cursor-pointer group hover:-translate-y-1 transition-all duration-300 relative overflow-hidden`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black opacity-60 uppercase tracking-wider text-blue-500">
              Total Bookings
            </span>
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-500 text-sm group-hover:scale-110 transition-transform">
              📦
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl md:text-3xl font-black text-blue-500 font-mono tracking-tight">
              {branchParcels.length}
            </span>
            <p className="text-[10px] opacity-50 mt-0.5 font-semibold">Active Parcels</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500/50 to-indigo-500/50"></div>
        </div>

        {/* Card 2: Total Revenue */}
        <div
          className={`${cardBg} p-4 md:p-5 rounded-3xl shadow-lg flex flex-col justify-between hover:-translate-y-1 transition-all duration-300 relative overflow-hidden`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black opacity-60 uppercase tracking-wider text-indigo-500">
              Total Revenue
            </span>
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 text-sm">💰</span>
          </div>
          <div className="mt-3">
            <span className="text-2xl md:text-3xl font-black text-indigo-500 font-mono tracking-tight">
              ₹{rev.toLocaleString()}
            </span>
            <p className="text-[10px] opacity-50 mt-0.5 font-semibold">Gross Valuation</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500/50 to-purple-500/50"></div>
        </div>

        {/* Card 3: Pending Parcels */}
        <div
          onClick={() => setPage("pending")}
          className={`${cardBg} p-4 md:p-5 rounded-3xl shadow-lg flex flex-col justify-between cursor-pointer group hover:-translate-y-1 transition-all duration-300 relative overflow-hidden`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black opacity-60 uppercase tracking-wider text-amber-500">
              Pending Stock
            </span>
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500 text-sm group-hover:scale-110 transition-transform animate-pulse">
              ⏳
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl md:text-3xl font-black text-amber-500 font-mono tracking-tight">
              {pendingCount}
            </span>
            <p className="text-[10px] opacity-50 mt-0.5 font-semibold">Ready for Delivery</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500/50 to-orange-500/50"></div>
        </div>

        {/* Card 4: Delivered */}
        <div
          onClick={() => goToTrack("Delivered")}
          className={`${cardBg} p-4 md:p-5 rounded-3xl shadow-lg flex flex-col justify-between cursor-pointer group hover:-translate-y-1 transition-all duration-300 relative overflow-hidden`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black opacity-60 uppercase tracking-wider text-emerald-500">
              Delivered
            </span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 text-sm group-hover:scale-110 transition-transform">
              ✅
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl md:text-3xl font-black text-emerald-500 font-mono tracking-tight">
              {deliveredCount}
            </span>
            <p className="text-[10px] opacity-50 mt-0.5 font-semibold">Completed Orders</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/50 to-teal-500/50"></div>
        </div>

        {/* Card 5: Today's Cash In-Hand */}
        <div
          className={`${cardBg} col-span-2 md:col-span-1 p-4 md:p-5 rounded-3xl shadow-lg flex flex-col justify-between hover:-translate-y-1 transition-all duration-300 relative overflow-hidden border-emerald-500/30`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black opacity-60 uppercase tracking-wider text-teal-500">
              Cash Handover
            </span>
            <span className="p-2 rounded-xl bg-teal-500/10 text-teal-500 text-sm">💵</span>
          </div>
          <div className="mt-3">
            <span className="text-2xl md:text-3xl font-black text-emerald-500 font-mono tracking-tight">
              ₹{tCollected.toLocaleString()}
            </span>
            <p className="text-[10px] opacity-50 mt-0.5 font-semibold">Today's Collections</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500/50 to-emerald-500/50"></div>
        </div>
      </div>

      {/* Main Content: Chart & Delivery Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Status Analytics BarChart */}
        <div className={`${cardBg} p-5 md:p-6 rounded-3xl shadow-xl flex flex-col justify-between`}>
          <div className="flex justify-between items-center mb-4 border-b border-slate-500/10 pb-3">
            <div>
              <h3 className="font-black text-sm uppercase tracking-wider text-indigo-500">Pipeline Distribution</h3>
              <p className="text-[10px] opacity-50 font-semibold">Real-time status grouping</p>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-indigo-500/10 text-indigo-400">
              {branchParcels.length} Active
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis
                  dataKey="name"
                  stroke={isDark ? "#94a3b8" : "#64748b"}
                  fontSize={10}
                  tickLine={false}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.95)",
                    borderRadius: "16px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.3)",
                    backdropFilter: "blur(12px)",
                    color: isDark ? "#fff" : "#000",
                    fontSize: "12px",
                    fontWeight: "bold"
                  }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={S_CLR[entry.name] || "#6366f1"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Today's Deliveries & Staff Ranking */}
        <div className={`${cardBg} p-5 md:p-6 rounded-3xl shadow-xl flex flex-col justify-between`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 border-b border-slate-500/10 pb-3">
            <div>
              <h3 className="font-black text-sm uppercase tracking-wider text-emerald-500">Staff Deliveries</h3>
              <p className="text-[10px] opacity-50 font-semibold">Settlement & Handover Summary</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={deliveryDate}
                onChange={e => setDeliveryDate(e.target.value)}
                className="p-1.5 px-3 rounded-xl border text-xs font-bold bg-white/80 dark:bg-slate-800 border-slate-200 dark:border-slate-700 outline-none"
              />
              <button
                onClick={() => generateListPDF(`Deliveries - ${deliveryDate}`, selectedBranch, filteredDelParcels)}
                title="Export Deliveries PDF"
                className="p-1.5 px-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow transition-all"
              >
                📄 PDF
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 max-h-64 pr-1 custom-scrollbar">
            {Object.keys(staffStats).length === 0 ? (
              <div className="text-center py-12 opacity-50 font-semibold text-xs">
                <p className="text-2xl mb-1">📭</p>
                No recorded deliveries on {deliveryDate}.
              </div>
            ) : (
              Object.entries(staffStats)
                .sort((a, b) => b[1].count - a[1].count)
                .map(([staff, stats], i) => (
                  <div
                    key={i}
                    className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                      isDark ? "bg-slate-900/50 border-slate-800" : "bg-slate-50 border-slate-200/80"
                    }`}
                  >
                    <div
                      onClick={() => setExpandedStaff(expandedStaff === staff ? null : staff)}
                      className="flex justify-between items-center p-3 cursor-pointer hover:bg-indigo-500/5"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "👤"}</span>
                        <div>
                          <p className="font-extrabold text-sm">{staff}</p>
                          <p className="text-[10px] font-mono text-indigo-400 font-bold">
                            Total: ₹{stats.totalValue.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-500 font-mono font-black text-sm">
                          {stats.count} Parcels
                        </span>
                        <span className="text-xs opacity-50">{expandedStaff === staff ? "▲" : "▼"}</span>
                      </div>
                    </div>

                    {expandedStaff === staff && (
                      <div
                        className={`p-3 space-y-2 border-t ${
                          isDark ? "border-slate-800 bg-slate-950/40" : "border-slate-200 bg-white/60"
                        }`}
                      >
                        <div className="flex justify-between text-[10px] uppercase font-mono font-bold opacity-75 px-1">
                          <span className="text-emerald-500">Paid: ₹{stats.paid}</span>
                          <span className="text-amber-500">ToPay: ₹{stats.toPay}</span>
                          <span className="text-purple-500">Credit: ₹{stats.credit}</span>
                        </div>
                        <div className="text-xs font-black text-emerald-500 bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                          💵 Physical Cash to Handover: ₹{stats.collected.toLocaleString()}
                        </div>
                        <div className="space-y-1.5 pt-1">
                          {stats.parcels.map(p => (
                            <div
                              key={p.id}
                              onClick={() => setGlobalView(p)}
                              className="flex justify-between items-center p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-indigo-500/10 cursor-pointer transition-colors text-xs"
                            >
                              <div className="flex flex-col">
                                <span className="font-mono font-bold text-indigo-400 hover:underline">📦 {p.id}</span>
                                <span className="text-[10px] opacity-70 truncate max-w-[120px]">
                                  {p.sName} ➔ {p.rName}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-right">
                                  <span className="font-bold">₹{p.price}</span>
                                  <span className="text-[9px] block opacity-60 font-semibold">{p.payment}</span>
                                </div>
                                <PrintGroup p={p} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
            )}
          </div>

          {Object.keys(staffStats).length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-500/10 flex justify-between items-center text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold opacity-50">Date Total:</span>
                <p className="font-black text-sm text-indigo-400 font-mono">₹{tTotalValue.toLocaleString()} Value</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold opacity-50">Net Cash Handover:</span>
                <p className="font-black text-sm text-emerald-500 font-mono">₹{tCollected.toLocaleString()}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          LIVE AUDIT TRAIL TIMELINE
      ══════════════════════════════════════════ */}
      <div className={`${cardBg} p-5 md:p-6 rounded-3xl shadow-xl space-y-4`}>
        <div className="flex justify-between items-center border-b border-slate-500/10 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-500/15 text-amber-500 text-lg">🕵️‍♂️</span>
            <div>
              <h3 className="font-black text-sm uppercase tracking-wider text-amber-500">Live Audit & Override Trail</h3>
              <p className="text-[10px] opacity-60 font-semibold">Full history of parcel modifications and deletions</p>
            </div>
          </div>
          <span className="bg-amber-500/15 text-amber-500 text-xs px-3 py-1 rounded-xl font-mono font-black border border-amber-500/30">
            {editLogs.length} Events Logged
          </span>
        </div>

        <div className="max-h-72 overflow-y-auto custom-scrollbar pr-2 space-y-2.5">
          {editLogs.length === 0 ? (
            <div className="text-center py-10 opacity-50 font-semibold text-xs">
              <p className="text-2xl mb-1">🛡️</p>
              System is pristine! No manual edits or deletions recorded.
            </div>
          ) : (
            editLogs.map((log, i) => (
              <div
                key={i}
                className={`flex flex-col md:flex-row md:items-center justify-between p-3.5 rounded-2xl border transition-all duration-200 gap-3 ${
                  log.status === "Deleted"
                    ? "bg-rose-500/5 border-rose-500/20"
                    : "bg-black/5 dark:bg-white/5 border-slate-500/10"
                }`}
              >
                <div className="flex items-center gap-3 md:w-1/3">
                  <div
                    className={`p-2.5 rounded-xl ${
                      log.status === "Deleted" ? "bg-rose-500/15 text-rose-500" : "bg-amber-500/15 text-amber-500"
                    }`}
                  >
                    <span className="text-base">{log.status === "Deleted" ? "🗑️" : "✏️"}</span>
                  </div>
                  <div>
                    <p
                      className="text-xs font-black font-mono text-indigo-500 dark:text-indigo-400 cursor-pointer hover:underline"
                      onClick={() => {
                        const p = parcels.find(x => x.id === log.lr);
                        if (p) setGlobalView(p);
                      }}
                    >
                      📦 {log.lr}
                    </p>
                    <p className="text-[10px] opacity-70 font-semibold mt-0.5">
                      👤 {log.user} {log.loc && <span className="opacity-50">@{log.loc}</span>}
                    </p>
                  </div>
                </div>

                <div className="flex-1">
                  <span className="text-[9px] uppercase font-bold opacity-50 block mb-0.5">Mandatory Reason:</span>
                  <p
                    className={`text-xs font-semibold px-3 py-1.5 rounded-xl inline-block border ${
                      log.status === "Deleted"
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}
                  >
                    "{log.reason}"
                  </p>
                </div>

                <div className="text-left md:text-right md:w-1/4">
                  <p className="text-[10px] font-mono opacity-60 font-semibold">{log.time}</p>
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md inline-block mt-1 ${
                      log.status === "Deleted" ? "bg-rose-500 text-white" : "bg-amber-500 text-slate-900"
                    }`}
                  >
                    {log.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
