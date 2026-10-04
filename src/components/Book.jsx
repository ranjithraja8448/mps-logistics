import { useState, useEffect } from "react";
import { CITIES, TYPES } from "../constants";
import { calcPrice, generateLR } from "../utils/pricing";
import { generatePDF, generateThermalLabelPDF, openWhatsApp } from "../utils/pdf";
import { playSuccessChime, playErrorBuzz } from "../utils/audio";
import { local } from "../services/db";
import SuggestInput from "./common/SuggestInput";
import CreditSearchDropdown from "./common/CreditSearchDropdown";
import EwayScannerModal from "./common/EwayScannerModal";

export default function Book({ shortcutMode, parcels, setParcels, db, showMsg, isDark, theme, user, creditAuthList }) {
  const initCargo = { count: "1", type: "Box", size: "Standard", weight: "", rate: "" };
  const initF = {
    sName: "",
    sPhone: "",
    sGst: "",
    rName: "",
    rPhone: "",
    rGst: "",
    from: user.branch === "All" ? "" : user.branch,
    to: "",
    payment: "Paid",
    creditCustomer: ""
  };

  const [f, setF] = useState(initF);
  const [cargoList, setCargoList] = useState([{ ...initCargo }]);
  const [done, setDone] = useState(null);
  const [eway, setEway] = useState("");
  const [contacts, setContacts] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [manualLrNo, setManualLrNo] = useState("");
  const [isManualLR, setIsManualLR] = useState(false);

  // Sync payment shortcut mode without cascading render effects
  const [prevShortcut, setPrevShortcut] = useState(shortcutMode);
  if (shortcutMode && shortcutMode !== prevShortcut) {
    setPrevShortcut(shortcutMode);
    setF(prev => ({ ...prev, payment: shortcutMode }));
  }

  // Derive LR number purely without extra state mutation effect
  const autoLrNo = (!isManualLR && f.from && f.to) ? generateLR(f.from, f.to, parcels) : "";

  useEffect(() => {
    async function load() {
      const cMap = {};
      parcels.forEach(p => {
        if (p.sPhone && !cMap[p.sPhone]) cMap[p.sPhone] = { phone: p.sPhone, name: p.sName, gst: p.sGst };
        if (p.rPhone && !cMap[p.rPhone]) cMap[p.rPhone] = { phone: p.rPhone, name: p.rName, gst: p.rGst };
      });
      const saved = (await local.get("mps_contacts")) || {};
      Object.keys(saved).forEach(k => {
        cMap[k] = { phone: k, name: saved[k].name, gst: saved[k].gst };
      });
      setContacts(Object.values(cMap));
    }
    load();
  }, [parcels]);

  const handleEwayChange = e => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 12);
    setEway(val);
    if (val.length === 12) {
      showMsg("Validating E-Way Bill Parameters...", "info");
      setTimeout(() => {
        setF(p => ({
          ...p,
          sName: "SRI MURUGAN TEXTILES",
          sPhone: "9876543210",
          sGst: "33AABCU1234F1Z1",
          from: user.branch !== "All" ? user.branch : "Mecheri",
          rName: "TAMIL ENTERPRISES",
          rPhone: "9123456780",
          rGst: "33BBACU5678F1Z2",
          to: "Salem",
          payment: "Paid"
        }));
        setCargoList([{ count: "15", type: "Bale", size: "Standard", weight: "", rate: "120" }]);
        showMsg("E-Way Bill Content Processed & Populated!", "success");
      }, 750);
    }
  };

  const handleQRScan = text => {
    setShowScanner(false);
    const ewayMatch = text.match(/\b\d{12}\b/);
    if (ewayMatch) {
      const val = ewayMatch[0];
      setEway(val);
      showMsg("QR Scanned! E-Way number extracted: " + val, "success");
      setTimeout(() => {
        setF(p => ({
          ...p,
          sName: "SCANNED CLIENT",
          sPhone: "9999999999",
          rName: "TARGET CLIENT",
          rPhone: "8888888888",
          to: "Salem",
          from: user.branch !== "All" ? user.branch : "Mecheri"
        }));
        setCargoList([{ count: "10", type: "Box", size: "Standard", weight: "", rate: "150" }]);
        showMsg("E-Way Bill Content Auto-Filled!", "info");
      }, 800);
    } else {
      showMsg("Invalid QR Code! No E-Way Bill Number found.", "error");
    }
  };

  const smartFocus = (d, isSender) => {
    setTimeout(() => {
      if (isSender) {
        if (!d.name) document.getElementById("sName")?.focus();
        else if (!d.gst) document.getElementById("sGst")?.focus();
        else document.getElementById("sFrom")?.focus();
      } else {
        if (!d.name) document.getElementById("rName")?.focus();
        else if (!d.gst) document.getElementById("rGst")?.focus();
        else document.getElementById("rTo")?.focus();
      }
    }, 50);
  };

  const handlePhoneChange = async (isSender, value) => {
    const fieldPrefix = isSender ? "s" : "r";
    setF(prev => ({ ...prev, [`${fieldPrefix}Phone`]: value }));
    const match = contacts.find(c => c.phone === value);
    if (match) {
      setF(prev => ({ ...prev, [`${fieldPrefix}Name`]: match.name || "", [`${fieldPrefix}Gst`]: match.gst || "" }));
      smartFocus(match, isSender);
    }
  };

  const handleContactSelect = (isSender, d) => {
    const px = isSender ? "s" : "r";
    setF(p => ({ ...p, [`${px}Phone`]: d.phone, [`${px}Name`]: d.name || "", [`${px}Gst`]: d.gst || "" }));
    smartFocus(d, isSender);
  };

  const updateCargo = (index, field, value) => {
    const newList = [...cargoList];
    newList[index][field] = value;
    setCargoList(newList);
  };

  const addCargoRow = () => {
    setCargoList([...cargoList, { ...initCargo }]);
  };
  const removeCargoRow = index => {
    const newList = [...cargoList];
    newList.splice(index, 1);
    setCargoList(newList);
  };

  const ep = cargoList.reduce(
    (total, item) => total + calcPrice(f.from, f.to, item.rate, item.count, item.type, f.payment, item.size),
    0
  );

  const cardBg = isDark
    ? "glass-card text-white"
    : "glass-card text-slate-800";
  const inputBg = isDark
    ? "bg-slate-900/80 border-slate-700 text-white placeholder-slate-500"
    : "bg-white/80 border-slate-200 text-slate-900 placeholder-slate-400";
  const uniqueCompanies = [...new Set(creditAuthList.map(c => c.company))];

  // Submit booking logic
  const submit = async () => {
    if (isSubmitting) return;

    if (!navigator.onLine) {
      return showMsg("⚠️ Internet Illa! Net ON pannittu booking podunga.", "error");
    }

    if (isManualLR && (!manualLrNo || manualLrNo.trim() === "")) return showMsg("LR Number is mandatory in Manual Mode!", "error");
    if (!f.sName || !f.sPhone || !f.from || !f.rName || !f.rPhone || !f.to)
      return showMsg("Please fill all required profile fields!", "error");

    const invalidCargo = cargoList.find(c => !c.count || !c.rate || !c.type);
    if (invalidCargo) return showMsg("Please enter Quantity, Type, and Rate for all cargo items!", "error");

    if (f.payment === "Credit" && !f.creditCustomer) return showMsg("Search and Select a Credit Account!", "error");

    setIsSubmitting(true);
    const dObj = new Date();
    const isoDate = dObj.toISOString();
    const locDateStr = dObj.toLocaleDateString("en-IN");

    try {
      let freshParcels = await db.getParcels();
      let finalLR = "";

      if (isManualLR) {
        finalLR = manualLrNo.trim().toUpperCase();
        if (freshParcels.some(p => p.id.toUpperCase() === finalLR)) {
          setIsSubmitting(false);
          return showMsg(`LR Number ${finalLR} already exists!`, "error");
        }
      } else {
        finalLR = generateLR(f.from, f.to, freshParcels);
      }

      const totalQty = cargoList.reduce((sum, item) => sum + Number(item.count), 0);
      const primaryType = cargoList.length > 1 ? "Mixed Items" : cargoList[0].type;
      const totalWeight = cargoList.reduce((sum, item) => sum + Number(item.weight || 0), 0);

      const p = {
        ...f,
        count: totalQty.toString(),
        type: primaryType,
        actualWeight: totalWeight.toString(),
        cargoList: cargoList,
        id: finalLR,
        date: locDateStr,
        isoDate,
        price: ep,
        status: "Booked",
        bookedBranch: user.branch,
        bookedBy: user.username,
        history: [{ status: "Booked", loc: f.from, time: dObj.toLocaleString(), user: user.username }]
      };

      let success = false;
      let retryLimit = 5;
      let currentLR = finalLR;

      while (!success && retryLimit > 0) {
        try {
          p.id = currentLR;
          await db.insertParcel(p);
          success = true;
        } catch (insertError) {
          const eMsg = (insertError.message || "").toLowerCase();
          const isDuplicate = eMsg.includes("duplicate key") || eMsg.includes("unique constraint");

          if (!isManualLR && isDuplicate) {
            retryLimit--;
            const parts = currentLR.split("/");
            if (parts.length === 3) {
              const nextNum = parseInt(parts[2], 10) + 1;
              currentLR = `${parts[0]}/${parts[1]}/${String(nextNum).padStart(4, "0")}`;
            } else {
              throw insertError;
            }
          } else {
            throw insertError;
          }
        }
      }

      if (!success) {
        throw new Error("Could not resolve unique LR number after retries.");
      }

      const saved = (await local.get("mps_contacts")) || {};
      saved[f.sPhone] = { name: p.sName, gst: f.sGst };
      saved[f.rPhone] = { name: p.rName, gst: f.rGst };
      await local.set("mps_contacts", saved);

      setParcels([p, ...parcels]);
      setDone(p);
      playSuccessChime();
      showMsg("Booking Successful!");
    } catch (err) {
      console.error(err);
      playErrorBuzz();
      let eMsg = err.message || "Network or Database Error!";
      if (eMsg.toLowerCase().includes("duplicate key") || eMsg.toLowerCase().includes("unique constraint")) {
        eMsg = isManualLR ? `LR Number ${manualLrNo} is already used! Use a different one.` : "Database conflict resolving LR. Try again.";
      }
      showMsg(`❌ DB/Network Error: ${eMsg}`, "error");
    }
    setIsSubmitting(false);
  };

  // ══════════════════════════════════════════
  // REGISTRATION SUCCESS SCREEN
  // ══════════════════════════════════════════
  if (done)
    return (
      <div
        className={`${cardBg} p-8 md:p-12 rounded-3xl max-w-xl mx-auto text-center border-t-4 border-emerald-500 shadow-2xl animate-bounce-in space-y-6 my-8`}
      >
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center text-3xl">
          ✅
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-black">Consignment Booked!</h2>
          <p className="text-xs opacity-60 font-semibold mt-1">Live Manifest ID Generated</p>
        </div>

        <div className="bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-indigo-500/20 border border-indigo-500/40 text-indigo-400 text-2xl md:text-3xl font-mono font-black p-4 rounded-2xl shadow-inner tracking-wider">
          {done.id}
        </div>

        <div className="p-3 bg-black/5 dark:bg-white/5 rounded-2xl text-xs space-y-1 font-semibold">
          <div className="flex justify-between">
            <span className="opacity-60">Route:</span>
            <span className="font-bold">
              {done.from} ➔ {done.to}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="opacity-60">Bill Amount:</span>
            <span className="font-bold text-emerald-500">
              ₹{done.price} ({done.payment})
            </span>
          </div>
        </div>

        <div>
          <p className="text-[10px] font-black uppercase opacity-60 mb-2.5 tracking-wider text-indigo-400">
            Print Receipt Layouts:
          </p>
          <div className="flex justify-center gap-2.5">
            <button
              onClick={() => generatePDF(done, 1)}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl text-xs shadow-md transition-all"
            >
              1 Copy (Full)
            </button>
            <button
              onClick={() => generatePDF(done, 2)}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl text-xs shadow-md shadow-indigo-600/30 transition-all"
            >
              2 Copies (Half)
            </button>
            <button
              onClick={() => generatePDF(done, 3)}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-xs shadow-md shadow-emerald-600/30 transition-all"
            >
              3 Copies (Third)
            </button>
            <button
              onClick={() => generateThermalLabelPDF(done)}
              title="Print Thermal 3x2 inch Box Sticker"
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 rounded-xl text-xs shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-1"
            >
              🏷️ Sticker
            </button>
          </div>
        </div>

        <button
          onClick={() => openWhatsApp(done.sPhone, true, done)}
          className="w-full bg-[#25D366] hover:bg-[#1ebd59] text-white font-extrabold py-3.5 rounded-xl text-sm shadow-lg shadow-[#25D366]/20 transition-all flex items-center justify-center gap-2"
        >
          <span>💬</span> Send WhatsApp Consignment Receipt
        </button>

        <button
          onClick={() => {
            setDone(null);
            setF(initF);
            setCargoList([{ ...initCargo }]);
            setEway("");
            setManualLrNo("");
            setIsManualLR(false);
          }}
          className="w-full bg-slate-700/80 hover:bg-slate-700 text-white font-bold py-3 rounded-xl text-sm transition-all"
        >
          + Book Another Consignment
        </button>
      </div>
    );

  return (
    <div className="space-y-5 md:space-y-6">
      {/* Top Banner: LR Booking Mode & E-Way Quick-Fill */}
      <div className={`${cardBg} p-5 rounded-3xl border shadow-xl flex flex-col lg:flex-row gap-4 relative z-20`}>
        {/* LR Generation Mode */}
        <div className="flex-1">
          <div className="flex justify-between items-center mb-1.5 ml-1">
            <label className="text-xs uppercase font-black text-indigo-500 dark:text-indigo-400 tracking-wider">
              📑 LR Manifest Identification
            </label>
            <button
              onClick={() => setIsManualLR(!isManualLR)}
              className={`text-[10px] font-black px-3 py-1 rounded-xl transition-all border ${
                isManualLR
                  ? "bg-amber-500 text-slate-900 border-amber-400 shadow-md shadow-amber-500/20"
                  : "bg-indigo-500/15 text-indigo-400 border-indigo-500/30"
              }`}
            >
              {isManualLR ? "Mode: MANUAL ✏️" : "Mode: AUTO ⚡"}
            </button>
          </div>
          <input
            value={isManualLR ? manualLrNo : autoLrNo}
            onChange={e => setManualLrNo(e.target.value.toUpperCase())}
            readOnly={!isManualLR}
            placeholder={
              isManualLR ? "Enter Custom LR No (Ex: 04/08/9999)" : "Select Origin & Destination to Generate LR..."
            }
            className={`w-full p-3 rounded-xl border text-sm font-mono font-black tracking-wider outline-none transition-all ${
              isManualLR
                ? "bg-amber-500/10 border-amber-500/40 text-amber-500 focus:ring-2 focus:ring-amber-500/30"
                : "bg-black/5 dark:bg-white/5 border-slate-500/20 text-indigo-400 cursor-not-allowed opacity-90"
            }`}
          />
        </div>

        {/* E-Way Bill Quick Fill & Scanner */}
        <div className="flex-1">
          <label className="text-xs uppercase font-black opacity-70 ml-1 mb-1.5 block tracking-wider">
            ⚡ E-Way Bill Accelerated Entry
          </label>
          <div className="flex gap-2">
            <input
              id="eway"
              value={eway}
              onChange={handleEwayChange}
              placeholder="Enter 12-Digit E-Way Bill No..."
              className={`flex-1 p-3 rounded-xl border text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-500/30 ${inputBg}`}
            />
            <button
              onClick={() => setShowScanner(true)}
              className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold px-4 py-3 rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 transition-all shrink-0"
            >
              <span>📷</span> Scan QR
            </button>
          </div>
        </div>
      </div>

      {showScanner && <EwayScannerModal onScan={handleQRScan} onClose={() => setShowScanner(false)} />}

      {/* Sender & Receiver Dual Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 relative z-30">
        {/* Sender Profile */}
        <div className={`${cardBg} p-5 md:p-6 rounded-3xl border shadow-xl space-y-3.5`}>
          <div className="flex items-center gap-2 border-b border-slate-500/10 pb-2">
            <span className="p-1.5 rounded-xl bg-indigo-500/15 text-indigo-400 text-sm">📤</span>
            <h3 className="font-black text-sm uppercase tracking-wider text-indigo-500">Sender Profile (Consignor)</h3>
          </div>
          <SuggestInput
            id="sPhone"
            label="Mobile Number *"
            value={f.sPhone}
            onChange={v => handlePhoneChange(true, v)}
            onSelect={d => handleContactSelect(true, d)}
            dataList={contacts}
            isPhone={true}
            theme={theme}
            onKeyDown={e => e.key === "Enter" && document.getElementById("sName")?.focus()}
          />
          <SuggestInput
            id="sName"
            label="Full Name / Company *"
            value={f.sName}
            onChange={v => setF({ ...f, sName: v.toUpperCase() })}
            onSelect={d => handleContactSelect(true, d)}
            dataList={contacts}
            isPhone={false}
            theme={theme}
            onKeyDown={e => e.key === "Enter" && document.getElementById("sGst")?.focus()}
          />
          <input
            id="sGst"
            value={f.sGst}
            onChange={e => setF({ ...f, sGst: e.target.value.toUpperCase() })}
            placeholder="GSTIN (Optional)"
            className={`w-full p-3 rounded-xl border text-xs font-mono font-bold outline-none uppercase ${inputBg}`}
          />
          <select
            id="sFrom"
            disabled={user.branch !== "All"}
            value={f.from}
            onChange={e => setF({ ...f, from: e.target.value })}
            className={`w-full p-3 rounded-xl border text-xs font-bold outline-none ${inputBg} ${
              user.branch !== "All" ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            <option value="">Origin Branch *</option>
            {CITIES.map(c => (
              <option key={c} value={c}>
                🏢 {c}
              </option>
            ))}
          </select>
        </div>

        {/* Receiver Profile */}
        <div className={`${cardBg} p-5 md:p-6 rounded-3xl border shadow-xl space-y-3.5`}>
          <div className="flex items-center gap-2 border-b border-slate-500/10 pb-2">
            <span className="p-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 text-sm">📥</span>
            <h3 className="font-black text-sm uppercase tracking-wider text-emerald-500">
              Receiver Profile (Consignee)
            </h3>
          </div>
          <SuggestInput
            id="rPhone"
            label="Mobile Number *"
            value={f.rPhone}
            onChange={v => handlePhoneChange(false, v)}
            onSelect={d => handleContactSelect(false, d)}
            dataList={contacts}
            isPhone={true}
            theme={theme}
            onKeyDown={e => e.key === "Enter" && document.getElementById("rName")?.focus()}
          />
          <SuggestInput
            id="rName"
            label="Full Name / Company *"
            value={f.rName}
            onChange={v => setF({ ...f, rName: v.toUpperCase() })}
            onSelect={d => handleContactSelect(false, d)}
            dataList={contacts}
            isPhone={false}
            theme={theme}
            onKeyDown={e => e.key === "Enter" && document.getElementById("rGst")?.focus()}
          />
          <input
            id="rGst"
            value={f.rGst}
            onChange={e => setF({ ...f, rGst: e.target.value.toUpperCase() })}
            placeholder="GSTIN (Optional)"
            className={`w-full p-3 rounded-xl border text-xs font-mono font-bold outline-none uppercase ${inputBg}`}
          />
          <select
            id="rTo"
            value={f.to}
            onChange={e => setF({ ...f, to: e.target.value })}
            className={`w-full p-3 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
          >
            <option value="">Destination Branch *</option>
            {CITIES.map(c => (
              <option key={c} value={c}>
                🏢 {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Dynamic Cargo Manifest & Rate Calculation */}
      <div className={`${cardBg} p-5 md:p-6 rounded-3xl border shadow-xl space-y-4 relative z-20`}>
        <div className="flex justify-between items-center border-b border-slate-500/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-purple-500/15 text-purple-400 text-sm">📐</span>
            <h3 className="font-black text-sm uppercase tracking-wider">Dynamic Cargo Dimensions & Articles</h3>
          </div>
          <button
            onClick={addCargoRow}
            className="bg-indigo-600/15 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/30 font-bold px-3 py-1.5 rounded-xl text-xs transition-all flex items-center gap-1"
          >
            <span>+</span> Add Cargo Row
          </button>
        </div>

        <div className="space-y-3">
          {cargoList.map((c, index) => (
            <div
              key={index}
              className="grid grid-cols-2 md:grid-cols-12 gap-2.5 items-center bg-black/5 dark:bg-white/5 p-3 rounded-2xl border border-slate-500/10 relative"
            >
              {cargoList.length > 1 && (
                <button
                  onClick={() => removeCargoRow(index)}
                  title="Remove Row"
                  className="absolute -top-2 -right-2 bg-rose-500 hover:bg-rose-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shadow-md transition-all"
                >
                  ✕
                </button>
              )}
              <div className="md:col-span-1 hidden md:block text-center font-black font-mono text-slate-400 text-xs">
                #{index + 1}
              </div>
              <input
                type="number"
                value={c.count}
                onChange={e => updateCargo(index, "count", e.target.value)}
                placeholder="Qty *"
                className={`md:col-span-2 p-2.5 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
              />
              <select
                value={c.type}
                onChange={e => updateCargo(index, "type", e.target.value)}
                className={`md:col-span-3 p-2.5 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
              >
                {TYPES.map(t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <select
                value={c.size}
                onChange={e => updateCargo(index, "size", e.target.value)}
                className={`md:col-span-2 p-2.5 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
              >
                <option value="Standard">Normal (1x)</option>
                <option value="Medium">Medium (1.5x)</option>
                <option value="Large">Large (2x)</option>
                <option value="Jumbo">Jumbo (3x)</option>
              </select>
              <input
                type="number"
                value={c.weight}
                onChange={e => updateCargo(index, "weight", e.target.value)}
                placeholder="Wt (kg)"
                className={`md:col-span-2 p-2.5 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
              />
              <input
                type="number"
                value={c.rate}
                onChange={e => updateCargo(index, "rate", e.target.value)}
                placeholder="Rate ₹ *"
                className={`md:col-span-2 p-2.5 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
              />
            </div>
          ))}
        </div>

        {/* Payment mode & Live Price summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-500/10">
          <div className="space-y-3">
            <label className="text-[10px] uppercase font-black opacity-60 tracking-wider">Payment Mode & Hotkeys</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { mode: "Paid", key: "F7", color: "emerald" },
                { mode: "To Pay", key: "F8", color: "amber" },
                { mode: "Credit", key: "F9", color: "purple" },
                { mode: "FOC", key: "F10", color: "slate" }
              ].map(m => (
                <button
                  key={m.mode}
                  type="button"
                  onClick={() => setF({ ...f, payment: m.mode })}
                  className={`p-2.5 rounded-xl font-bold text-xs flex flex-col items-center justify-center transition-all border ${
                    f.payment === m.mode
                      ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30 scale-102"
                      : "bg-black/5 dark:bg-white/5 border-slate-500/20 text-slate-700 dark:text-slate-300 hover:bg-indigo-500/10"
                  }`}
                >
                  <span>{m.mode}</span>
                  <span className="text-[9px] font-mono opacity-70 mt-0.5">[{m.key}]</span>
                </button>
              ))}
            </div>

            {f.payment === "Credit" && (
              <CreditSearchDropdown
                value={f.creditCustomer}
                onChange={val => setF({ ...f, creditCustomer: val })}
                uniqueCompanies={uniqueCompanies}
                isDark={isDark}
              />
            )}
          </div>

          {/* Price preview card */}
          <div className="p-4 rounded-2xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 text-white flex items-center justify-between shadow-xl">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-400">
                Calculated Freight Value
              </span>
              <p className="text-3xl md:text-4xl font-black font-mono text-emerald-400 mt-1">₹{ep.toLocaleString()}</p>
              <p className="text-[10px] opacity-60 mt-0.5">Mode: {f.payment}</p>
            </div>
            <div className="text-right">
              <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-400 text-xs font-mono font-black border border-emerald-500/30">
                {cargoList.reduce((s, i) => s + (Number(i.count) || 0), 0)} Items Total
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm button */}
      <button
        id="btnSubmit"
        onClick={submit}
        disabled={isSubmitting}
        className={`w-full py-4 rounded-2xl text-white font-extrabold text-base md:text-lg shadow-2xl transition-all flex items-center justify-center gap-3 ${
          isSubmitting
            ? "bg-slate-700 cursor-not-allowed opacity-80"
            : "bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:-translate-y-0.5 active:translate-y-0"
        }`}
      >
        {isSubmitting && <span className="animate-spin text-xl">🔄</span>}
        <span>{isSubmitting ? "Generating Consignment Manifest..." : "Confirm & Issue Booking LR ➔"}</span>
      </button>
    </div>
  );
}
