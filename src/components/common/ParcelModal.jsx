import { useState } from "react";
import PrintGroup from "./PrintGroup";
import CreditSearchDropdown from "./CreditSearchDropdown";
import { S_CLR } from "../../constants";
import { playSuccessChime, playErrorBuzz } from "../../utils/audio";

export default function ParcelModal({ item, creditAuthList, onClose, db, parcels, setParcels, user, showMsg, isDark }) {
  const [payMethod, setPayMethod] = useState("");
  const [delCreditCustomer, setDelCreditCustomer] = useState("");
  const cardBg = isDark ? "text-white" : "text-slate-900";

  const deliverParcel = async () => {
    if (item.payment === "To Pay" && !payMethod) {
      playErrorBuzz();
      return showMsg("Please specify payment mode!", "error");
    }

    let finalCreditCustomer = item.creditCustomer || "";
    if (item.payment === "To Pay" && payMethod === "Credit") {
      if (!delCreditCustomer) {
        playErrorBuzz();
        return showMsg("Search and Select a Credit Account!", "error");
      }
      finalCreditCustomer = delCreditCustomer;
      showMsg(`Bill assigned to ${finalCreditCustomer}'s Account!`, "info");
    }

    const dMode = item.payment === "To Pay" ? `[Mode: ${payMethod}]` : "";
    const updatedHistory = [
      ...(item.history || []),
      { status: "Delivered", loc: item.to, time: new Date().toLocaleString(), user: user.username }
    ];

    const modifiedItem = {
      ...item,
      status: "Delivered",
      history: updatedHistory,
      deliveryMode: payMethod,
      deliveredBy: user.username,
      deliveredBranch: user.branch,
      creditCustomer: finalCreditCustomer,
      creditSettled: item.creditSettled || false,
      notes: `${item.notes || ""} Delivered ${dMode}`
    };

    await db.updateParcel(modifiedItem.id, modifiedItem);
    setParcels(parcels.map(p => (p.id === modifiedItem.id ? modifiedItem : p)));
    playSuccessChime();
    showMsg("Parcel Delivered Successfully!");
    onClose();
  };

  const isPending = item.status === "Booked" || item.status === "In Transit";
  const uniqueCompanies = [...new Set(creditAuthList.map(c => c.company))];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[200] overflow-y-auto animate-fade-in">
      <div
        className={`glass-card ${cardBg} p-6 md:p-8 rounded-3xl max-w-lg w-full space-y-5 border shadow-2xl animate-bounce-in my-auto max-h-[92vh] overflow-y-auto custom-scrollbar`}
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-500/20 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 text-lg">📦</span>
            <div>
              <h3 className="font-black text-lg md:text-xl font-mono text-indigo-500 dark:text-indigo-400">{item.id}</h3>
              <p className="text-[10px] opacity-60 font-semibold">{item.date}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="px-3 py-1 text-[11px] font-black rounded-full uppercase tracking-wider text-white shadow-sm"
              style={{ backgroundColor: S_CLR[item.status] || "#6366f1" }}
            >
              {item.status}
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-500/20 text-slate-400 hover:text-white transition-all text-sm"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Route & Customer Cards */}
        <div className="grid grid-cols-2 gap-3 text-xs md:text-sm">
          <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-slate-500/10">
            <p className="text-[10px] uppercase font-bold opacity-60 text-indigo-400">Origin ➔ Target</p>
            <p className="font-extrabold text-sm mt-0.5">
              {item.from} ➔ {item.to}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-slate-500/10">
            <p className="text-[10px] uppercase font-bold opacity-60 text-emerald-400">Payment & Price</p>
            <p className="font-extrabold text-sm mt-0.5 text-emerald-500">
              ₹{item.price} <span className="text-xs font-normal opacity-80">({item.payment})</span>
            </p>
          </div>

          <div className="col-span-2 sm:col-span-1 p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-slate-500/10">
            <p className="text-[10px] uppercase font-bold opacity-60 text-blue-400">Consignor (Sender)</p>
            <p className="font-bold text-sm mt-0.5 truncate">{item.sName}</p>
            <p className="text-xs font-mono opacity-70 mt-0.5">{item.sPhone}</p>
            {item.sGst && <p className="text-[10px] opacity-60 font-mono mt-0.5">GST: {item.sGst}</p>}
          </div>

          <div className="col-span-2 sm:col-span-1 p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-slate-500/10">
            <p className="text-[10px] uppercase font-bold opacity-60 text-purple-400">Consignee (Receiver)</p>
            <p className="font-bold text-sm mt-0.5 truncate">{item.rName}</p>
            <p className="text-xs font-mono opacity-70 mt-0.5">{item.rPhone}</p>
            {item.rGst && <p className="text-[10px] opacity-60 font-mono mt-0.5">GST: {item.rGst}</p>}
          </div>

          {/* Cargo breakdown */}
          <div className="col-span-2 bg-black/5 dark:bg-white/5 p-3.5 rounded-2xl border border-slate-500/10 space-y-1.5">
            <div className="flex justify-between items-center">
              <p className="text-[10px] uppercase font-black opacity-60 text-amber-500">
                Cargo Manifest ({item.count} Items Total)
              </p>
              {item.actualWeight && (
                <span className="text-[10px] font-mono font-bold opacity-70">Weight: {item.actualWeight} kg</span>
              )}
            </div>
            {item.cargoList ? (
              item.cargoList.map((c, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center text-xs py-1 border-b border-slate-500/10 last:border-0"
                >
                  <span className="font-bold">
                    {c.count} × {c.type}{" "}
                    {c.size && c.size !== "Standard" ? (
                      <span className="text-[10px] font-normal text-indigo-400">({c.size})</span>
                    ) : null}
                  </span>
                  <span className="font-mono text-slate-400">
                    {c.weight ? `${c.weight} kg` : ""} {c.rate ? `@ ₹${c.rate}` : ""}
                  </span>
                </div>
              ))
            ) : (
              <p className="font-bold text-xs">
                {item.count} × {item.type}{" "}
                {item.size && item.size !== "Standard" ? (
                  <span className="text-indigo-400">({item.size})</span>
                ) : null}
              </p>
            )}
          </div>

          {item.status === "Delivered" && (
            <div className="col-span-2 p-3.5 bg-emerald-500/10 rounded-2xl border border-emerald-500/30">
              <p className="text-[10px] uppercase font-black text-emerald-600 dark:text-emerald-400 mb-1">
                ✅ Delivery & Settlement Info
              </p>
              <div className="font-bold text-xs space-y-1">
                {item.payment === "To Pay" ? (
                  <p>
                    Collected via:{" "}
                    <span className="text-emerald-500 px-2 py-0.5 bg-emerald-500/10 rounded-md font-mono">
                      {item.deliveryMode || "Cash"}
                    </span>
                  </p>
                ) : (
                  <p>
                    Booking Mode:{" "}
                    <span className="text-indigo-500 px-2 py-0.5 bg-indigo-500/10 rounded-md font-mono">
                      {item.payment}
                    </span>
                  </p>
                )}
                {item.creditCustomer && (
                  <p className="text-purple-400">
                    Credit Company: <span className="font-semibold">{item.creditCustomer}</span>
                  </p>
                )}
                <p className="text-[10px] opacity-70">
                  Handled By: <span className="font-semibold">{item.deliveredBy || "System"}</span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Live Milestone Tracking Timeline */}
        <div
          className={`p-4 rounded-2xl border ${
            isDark ? "bg-slate-900/60 border-slate-700" : "bg-slate-50 border-slate-200"
          }`}
        >
          <h4 className="text-[10px] font-black uppercase opacity-70 mb-3 tracking-widest text-indigo-500 dark:text-indigo-400">
            📍 Live Audit & Status History
          </h4>
          <div className="relative border-l-2 border-indigo-500/30 ml-2 space-y-4">
            {item.history &&
              item.history.map((h, i) => (
                <div key={i} className="relative pl-4 animate-fade-in">
                  <div
                    className={`absolute -left-[5px] top-1.5 w-2 h-2 rounded-full ${
                      i === item.history.length - 1 ? "bg-emerald-500 ring-4 ring-emerald-500/20" : "bg-indigo-500"
                    }`}
                  ></div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-black">{h.status}</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-black/10 dark:bg-white/10 opacity-70">
                      @{h.loc}
                    </span>
                  </div>
                  <p className="text-[10px] opacity-60 mt-0.5">
                    {h.time} {h.user && <span className="font-bold text-indigo-400 ml-1">by {h.user}</span>}
                  </p>
                  {h.reason && (
                    <p
                      className={`text-[10px] mt-1 font-bold px-2.5 py-1 rounded-lg inline-block border ${
                        h.status === "Deleted"
                          ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                          : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                      }`}
                    >
                      💬 Reason: {h.reason}
                    </p>
                  )}
                </div>
              ))}
          </div>
        </div>

        {/* Quick Delivery Action (If destination is user branch or superadmin) */}
        {isPending && (user.branch === item.to || user.role === "superadmin") && (
          <div className="p-4 border border-emerald-500/30 bg-emerald-500/5 rounded-2xl space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚡</span>
              <h4 className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Fast Delivery Verification
              </h4>
            </div>
            {item.payment === "To Pay" && (
              <div className="space-y-3">
                <select
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value)}
                  className="w-full p-2.5 rounded-xl border font-bold text-sm bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select Payment Collected...</option>
                  <option value="Cash">💵 Physical Cash</option>
                  <option value="GPay">📱 UPI / GPay</option>
                  <option value="Credit">💳 Credit A/C</option>
                </select>

                {payMethod === "Credit" && (
                  <CreditSearchDropdown
                    value={delCreditCustomer}
                    onChange={setDelCreditCustomer}
                    uniqueCompanies={uniqueCompanies}
                    isDark={isDark}
                  />
                )}
              </div>
            )}
            <button
              onClick={deliverParcel}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold py-3 rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all text-sm"
            >
              Confirm Delivery & Handover ✅
            </button>
          </div>
        )}

        {/* Footer with Print & Close */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-500/20">
          <PrintGroup p={item} />
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-xl text-sm transition-all shadow-sm"
          >
            Close ✕
          </button>
        </div>
      </div>
    </div>
  );
}
