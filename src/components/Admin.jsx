import { useState, useMemo } from "react";
import { CITIES, TYPES, STATUSES, PAY_MODES, S_CLR, genUserId } from "../constants";
import { generateInvoicePDF } from "../utils/pdf";
import PrintGroup from "./common/PrintGroup";
import DeletedParcelsLog from "./DeletedParcelsLog";

export default function Admin({
  parcels,
  users,
  setUsers,
  setParcels,
  db,
  showMsg,
  isDark,
  user,
  creditAuthList,
  setCreditAuthList,
  setGlobalView
}) {
  const [tab, setTab] = useState("parcels");
  const [pageIndex, setPageIndex] = useState(1);
  const PAGE_SIZE = 50;
  const [editF, setEditF] = useState(null);
  const [editReason, setEditReason] = useState("");
  const [newUser, setNewUser] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newRole, setNewRole] = useState("staff");
  const [newBranch, setNewBranch] = useState("Mecheri");
  const [revealedPass, setRevealedPass] = useState({});

  const [newCPhone, setNewCPhone] = useState("");
  const [newCName, setNewCName] = useState("");
  const [newCGst, setNewCGst] = useState("");

  const [paymentFilter, setPaymentFilter] = useState("All");
  const [branchFilter, setBranchFilter] = useState(user.branch === "All" ? "All" : user.branch);
  const d = new Date();
  const todayStr = d.toISOString().split("T")[0];
  d.setDate(1);
  const firstDayStr = d.toISOString().split("T")[0];
  const [fromDate, setFromDate] = useState(firstDayStr);
  const [toDate, setToDate] = useState(todayStr);
  const [invCustomer, setInvCustomer] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [manualInvNo, setManualInvNo] = useState("");
  const [manualInvDate, setManualInvDate] = useState(todayStr);
  const [invGstPercent, setInvGstPercent] = useState("");

  const isSuper = user.role === "superadmin";
  const cardBg = isDark
    ? "glass-card text-white"
    : "glass-card text-slate-800";
  const inputBg = isDark
    ? "bg-slate-900/80 border-slate-700 text-white placeholder-slate-500"
    : "bg-white/80 border-slate-200 text-slate-900 placeholder-slate-400";
  const tblBg = isDark ? "bg-slate-950/70 text-slate-300" : "bg-slate-100/80 text-slate-700";

  const handleRoleChange = role => {
    setNewRole(role);
    if (role === "superadmin") {
      setNewBranch("All");
    } else if (role === "staff" && newBranch === "All") {
      setNewBranch("Mecheri");
    }
  };

  const handleAddUser = async () => {
    if (!newUser || !newPass) return showMsg("Please enter username and password", "error");
    const u = {
      id: genUserId(),
      username: newUser.toLowerCase().trim(),
      password: newPass,
      role: newRole,
      branch: newBranch
    };
    await db.insertUser(u);
    setUsers([...users, u]);
    setNewUser("");
    setNewPass("");
    showMsg("User account provisioned!", "success");
  };

  const addCreditAuth = async () => {
    if (newCPhone.length !== 10 || !newCName)
      return showMsg("Invalid Credit details! 10-digit phone required.", "error");
    const newData = {
      phone: newCPhone,
      company: newCName.toUpperCase().trim(),
      gst: newCGst.toUpperCase().trim()
    };
    const newList = [...creditAuthList, newData];
    setCreditAuthList(newList);
    await db.insertCreditAuth(newData);
    setNewCPhone("");
    setNewCName("");
    setNewCGst("");
    showMsg("Credit Account Authorized!");
  };

  const [editingCredit, setEditingCredit] = useState(null);

  const removeCredit = async (phone, company) => {
    if (!window.confirm(`Revoke credit authorization for ${company}?`)) return;
    const newList = creditAuthList.filter(c => !(c.phone === phone && c.company === company));
    setCreditAuthList(newList);
    await db.deleteCreditAuth(phone, company);
    showMsg("Credit Authorization Revoked", "error");
  };

  const saveCreditAccount = async () => {
    if (!editingCredit || !editingCredit.company.trim()) return showMsg("Company / Customer Name is mandatory!", "error");
    const cleanPhone = (editingCredit.phone || "").replace(/\D/g, "").slice(0, 10);
    if (cleanPhone.length !== 10) return showMsg("Valid 10-digit mobile phone is mandatory!", "error");

    const updatedData = {
      company: editingCredit.company.toUpperCase().trim(),
      phone: cleanPhone,
      gst: (editingCredit.gst || "").toUpperCase().trim()
    };

    const origPhone = editingCredit.originalPhone;
    const origCompany = editingCredit.originalCompany;

    await db.updateCreditAuth(origPhone, origCompany, updatedData);

    const updatedList = creditAuthList.map(c =>
      c.phone === origPhone && c.company === origCompany ? updatedData : c
    );
    setCreditAuthList(updatedList);

    // If company name changed, update all corresponding booked consignments
    if (origCompany !== updatedData.company) {
      const affected = parcels.filter(p => p.creditCustomer === origCompany);
      if (affected.length > 0) {
        let updatedParcels = [...parcels];
        for (let ap of affected) {
          const up = { ...ap, creditCustomer: updatedData.company };
          await db.updateParcel(up.id, up);
          updatedParcels = updatedParcels.map(x => (x.id === up.id ? up : x));
        }
        setParcels(updatedParcels);
      }
    }

    setEditingCredit(null);
    showMsg(`Credit account "${updatedData.company}" updated successfully!`, "success");
  };

  const restoreRecord = async id => {
    const targetItem = parcels.find(p => p.id === id);
    if (!targetItem) return;

    const updatedHistory = [
      ...(targetItem.history || []),
      { status: "Restored", loc: user.branch, time: new Date().toLocaleString(), user: user.username, reason: "Restored by Superadmin God Mode" }
    ];
    const modifiedItem = { ...targetItem, status: "Booked", history: updatedHistory };

    await db.updateParcel(id, modifiedItem);
    setParcels(parcels.map(p => (p.id === id ? modifiedItem : p)));
    showMsg(`LR ${id} successfully restored to active Booked status!`, "success");
  };

  const deleteRecord = async id => {
    const reason = window.prompt(`Exact reason for deleting ${id}:`);
    if (!reason || !reason.trim()) return showMsg("Deletion requires mandatory audit reason!", "error");

    const targetItem = parcels.find(p => p.id === id);
    if (!targetItem) return;

    const updatedHistory = [
      ...(targetItem.history || []),
      { status: "Deleted", loc: user.branch, time: new Date().toLocaleString(), user: user.username, reason }
    ];
    const modifiedItem = { ...targetItem, status: "Deleted", deletedBy: user.username, history: updatedHistory };

    await db.updateParcel(id, modifiedItem);
    setParcels(parcels.map(p => (p.id === id ? modifiedItem : p)));
    showMsg(`LR ${id} marked as Deleted with audit record.`);
  };

  const saveOverrides = async () => {
    if (!editReason.trim()) return showMsg("Reason for edit is mandatory!", "error");
    const updatedHistory = [
      ...(editF.history || []),
      { status: "Edited", loc: user.branch, time: new Date().toLocaleString(), user: user.username, reason: editReason }
    ];
    const finalData = { ...editF, history: updatedHistory };
    await db.updateParcel(editF.id, finalData);
    setParcels(parcels.map(p => (p.id === editF.id ? finalData : p)));
    setEditF(null);
    setEditReason("");
    showMsg("Consignment updated and audit logged!");
  };

  const sortedTableData = useMemo(() => {
    return [...parcels].reverse().filter(p => {
      if (p.status === "Deleted" && !isSuper) return false;
      if (fromDate && toDate && p.isoDate) {
        const pDate = p.isoDate.split("T")[0];
        if (pDate < fromDate || pDate > toDate) return false;
      }
      if (paymentFilter !== "All" && p.payment !== paymentFilter) return false;
      if (branchFilter !== "All") {
        if (
          p.bookedBranch !== branchFilter &&
          p.deliveredBranch !== branchFilter &&
          p.from !== branchFilter &&
          p.to !== branchFilter
        )
          return false;
      }
      if (searchQuery) {
        const matchTerm = searchQuery.toLowerCase();
        return (
          p.id.toLowerCase().includes(matchTerm) ||
          p.sPhone.includes(matchTerm) ||
          p.rPhone.includes(matchTerm) ||
          (p.sName && p.sName.toLowerCase().includes(matchTerm))
        );
      }
      return true;
    });
  }, [parcels, isSuper, fromDate, toDate, paymentFilter, branchFilter, searchQuery]);

  const totalPages = Math.ceil(sortedTableData.length / PAGE_SIZE) || 1;
  const currentPage = Math.min(Math.max(1, pageIndex), totalPages);
  const paginatedTableData = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedTableData.slice(start, start + PAGE_SIZE);
  }, [sortedTableData, currentPage]);

  const exportData = () => {
    if (sortedTableData.length === 0) return showMsg("No data to export", "error");
    const headers = [
      "LR No",
      "Date",
      "Sender",
      "Receiver",
      "Origin",
      "Destination",
      "Payment Mode",
      "Amount",
      "Status",
      "Booked By"
    ];
    const rows = sortedTableData.map(p =>
      [p.id, p.date, p.sName, p.rName, p.from, p.to, p.payment, p.price, p.status, p.bookedBy].join(",")
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `MPS_Audit_Report.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showMsg("Report Downloaded!");
  };

  const triggerInvoice = () => {
    if (!invCustomer) return showMsg("Select a Customer Account!", "error");
    if (!manualInvNo || manualInvNo.trim() === "") return showMsg("Please enter an Invoice Number!", "error");

    const invoiceParcels = parcels.filter(p => {
      if (p.status === "Deleted") return false;
      const isCreditLedger =
        p.payment === "Credit" || p.deliveryMode === "Credit" || (p.notes && p.notes.includes("Mode: Credit"));
      const matchCustomer =
        p.creditCustomer && p.creditCustomer.trim().toLowerCase() === invCustomer.trim().toLowerCase();
      const pDateStr = p.isoDate ? p.isoDate.split("T")[0] : "";
      const matchDate = (!fromDate || pDateStr >= fromDate) && (!toDate || pDateStr <= toDate);
      return isCreditLedger && matchCustomer && matchDate;
    });

    if (invoiceParcels.length === 0) return showMsg("No credit bills found for this period.", "error");

    const sampleAuth = creditAuthList.find(c => c.company.toLowerCase() === invCustomer.toLowerCase());
    const displayPhone = sampleAuth ? sampleAuth.phone : "Multiple Acc Numbers";
    const displayGst = sampleAuth ? sampleAuth.gst || "" : "";

    generateInvoicePDF(
      invCustomer,
      displayPhone,
      displayGst,
      fromDate,
      toDate,
      invoiceParcels,
      manualInvNo.toUpperCase(),
      manualInvDate,
      invGstPercent
    );
    showMsg(`Invoice Generated for ${invCustomer}`);
  };

  const settleCreditBill = async () => {
    if (!invCustomer) return showMsg("Select a Customer Account!", "error");
    if (!window.confirm(`Mark all bills for ${invCustomer} (${fromDate} to ${toDate}) as PAID?`)) return;

    const invoiceParcels = parcels.filter(p => {
      if (p.status === "Deleted" || p.creditSettled) return false;
      const isCreditLedger =
        p.payment === "Credit" || p.deliveryMode === "Credit" || (p.notes && p.notes.includes("Mode: Credit"));
      const matchCustomer =
        p.creditCustomer && p.creditCustomer.trim().toLowerCase() === invCustomer.trim().toLowerCase();
      const pDateStr = p.isoDate ? p.isoDate.split("T")[0] : "";
      const matchDate = (!fromDate || pDateStr >= fromDate) && (!toDate || pDateStr <= toDate);
      return isCreditLedger && matchCustomer && matchDate;
    });

    if (invoiceParcels.length === 0) return showMsg("No unpaid bills found in this date range.", "error");
    let updatedParcelsList = [...parcels];
    for (let p of invoiceParcels) {
      const updated = { ...p, creditSettled: true };
      await db.updateParcel(updated.id, updated);
      updatedParcelsList = updatedParcelsList.map(x => (x.id === updated.id ? updated : x));
    }
    setParcels(updatedParcelsList);
    showMsg(`Successfully settled ${invoiceParcels.length} parcels for ${invCustomer}!`);
  };

  const uniqueCompanies = [
    ...new Set([...creditAuthList.map(c => c.company), ...parcels.map(p => p.creditCustomer).filter(Boolean)])
  ];

  const unpaidCreditParcels = parcels.filter(
    p =>
      p.status !== "Deleted" &&
      !p.creditSettled &&
      (p.payment === "Credit" || p.deliveryMode === "Credit" || (p.notes && p.notes.includes("Mode: Credit")))
  );
  const customerBalances = {};
  let grandTotalCredit = 0;
  unpaidCreditParcels.forEach(p => {
    if (p.creditCustomer) {
      const amt = Number(p.price) || 0;
      if (!customerBalances[p.creditCustomer]) customerBalances[p.creditCustomer] = 0;
      customerBalances[p.creditCustomer] += amt;
      grandTotalCredit += amt;
    }
  });

  return (
    <div className="space-y-5 md:space-y-6 animate-fade-in">
      {/* Tab Navigation Pill Bar */}
      <div className="flex flex-wrap gap-2.5 p-1.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-slate-500/10 w-max">
        <button
          onClick={() => setTab("parcels")}
          className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all ${
            tab === "parcels"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
              : "opacity-60 hover:opacity-100 hover:bg-white/5"
          }`}
        >
          📦 Manifests & Overrides
        </button>
        <button
          onClick={() => setTab("staff")}
          className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all ${
            tab === "staff"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
              : "opacity-60 hover:opacity-100 hover:bg-white/5"
          }`}
        >
          👥 System RBAC & Credentials
        </button>
        <button
          onClick={() => setTab("credit")}
          className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all ${
            tab === "credit"
              ? "bg-amber-600 text-white shadow-lg shadow-amber-600/30"
              : "opacity-60 hover:opacity-100 hover:bg-white/5"
          }`}
        >
          💳 Credit & GST Accounts
        </button>
      </div>

      {/* TAB 1: SYSTEM RBAC & CREDENTIALS */}
      {tab === "staff" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6 animate-fade-in">
          {/* Add user form */}
          <div className={`${cardBg} p-5 md:p-6 rounded-3xl border shadow-xl space-y-4`}>
            <div className="flex items-center gap-2 border-b border-slate-500/10 pb-3">
              <span className="p-1.5 rounded-xl bg-indigo-500/15 text-indigo-400 text-sm">👤</span>
              <h3 className="font-black text-sm uppercase tracking-wider text-indigo-500">Provision User Identity</h3>
            </div>
            <input
              value={newUser}
              onChange={e => setNewUser(e.target.value)}
              placeholder="Username (e.g. salem_operator)"
              className={`w-full p-3 rounded-xl border text-xs font-semibold outline-none ${inputBg}`}
            />
            <input
              value={newPass}
              onChange={e => setNewPass(e.target.value)}
              type="password"
              placeholder="Passcode Credentials"
              className={`w-full p-3 rounded-xl border text-xs font-semibold outline-none ${inputBg}`}
            />
            {isSuper && (
              <select
                value={newRole}
                onChange={e => handleRoleChange(e.target.value)}
                className={`w-full p-3 rounded-xl border font-bold outline-none text-xs ${inputBg}`}
              >
                <option value="staff">Privilege Level: STAFF (Branch Scope)</option>
                <option value="admin">Privilege Level: ADMIN (Accounts & Branch Overrides)</option>
                <option value="superadmin">Privilege Level: SUPERADMIN (God Mode)</option>
              </select>
            )}
            <select
              disabled={newRole === "superadmin"}
              value={newBranch}
              onChange={e => setNewBranch(e.target.value)}
              className={`w-full p-3 rounded-xl border font-bold outline-none text-xs ${inputBg} ${
                newRole === "superadmin" ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {isSuper && (newRole === "admin" || newRole === "superadmin") && (
                <option value="All">Global Access (All Branches)</option>
              )}
              {CITIES.map(c => (
                <option key={c} value={c}>
                  🏢 Branch: {c}
                </option>
              ))}
            </select>
            <button
              onClick={handleAddUser}
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold py-3 rounded-xl text-xs shadow-lg shadow-indigo-600/30 transition-all"
            >
              Commit & Authorize Account ➔
            </button>
          </div>

          {/* User Matrix List with Superadmin plain-text passwords */}
          <div className={`${cardBg} p-5 md:p-6 rounded-3xl border shadow-xl lg:col-span-2 space-y-4`}>
            <div className="flex justify-between items-center border-b border-slate-500/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-purple-500/15 text-purple-400 text-sm">🔑</span>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wider">Identity Mapping Matrix</h3>
                  <p className="text-[10px] opacity-60 font-semibold">Active credentials and role permissions</p>
                </div>
              </div>
              {isSuper && (
                <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-500 text-[10px] font-black border border-amber-500/30">
                  ⚡ God Mode: Passwords Visible
                </span>
              )}
            </div>

            <div className="space-y-2.5 max-h-96 overflow-y-auto custom-scrollbar pr-2">
              {users
                .filter(u => (isSuper ? true : u.role === "staff"))
                .map(u => {
                  const canManage = isSuper ? u.username !== user.username : true;
                  return (
                    <div
                      key={u.id}
                      className="flex flex-col sm:flex-row justify-between sm:items-center p-3.5 border rounded-2xl bg-black/5 dark:bg-white/5 border-slate-500/10 gap-3"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <p className="font-extrabold text-sm">{u.username}</p>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 font-bold">
                            {u.branch}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <p
                            className={`text-[10px] uppercase font-black ${
                              u.role === "superadmin"
                                ? "text-amber-500"
                                : u.role === "admin"
                                ? "text-purple-400"
                                : "text-blue-400"
                            }`}
                          >
                            Role: {u.role}
                          </p>
                          {isSuper && (
                            <span
                              onClick={() => setRevealedPass(prev => ({ ...prev, [u.id]: !prev[u.id] }))}
                              title="Click to view/hide passcode"
                              className="text-[11px] font-mono font-bold text-amber-400/90 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/20 cursor-pointer select-none flex items-center gap-1.5 transition-all"
                            >
                              <span>🔑</span>
                              <span>{revealedPass[u.id] ? u.password : "••••••"}</span>
                              <span className="text-[10px] opacity-70">{revealedPass[u.id] ? "🔒" : "👁️"}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {canManage && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={async () => {
                              await db.deleteUser(u.id);
                              setUsers(users.filter(x => x.id !== u.id));
                              showMsg("Access revoked", "error");
                            }}
                            className="text-rose-500 hover:text-white hover:bg-rose-600 text-xs font-bold border border-rose-500/30 px-3 py-1.5 rounded-xl bg-rose-500/10 transition-all"
                          >
                            Revoke 🗑️
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CREDIT & GST LEDGER */}
      {tab === "credit" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          {/* Add credit account */}
          <div className={`${cardBg} p-5 md:p-6 rounded-3xl border shadow-xl space-y-4`}>
            <div className="flex items-center gap-2 border-b border-slate-500/10 pb-3">
              <span className="p-1.5 rounded-xl bg-amber-500/15 text-amber-500 text-sm">🏢</span>
              <h3 className="font-black text-sm uppercase tracking-wider text-amber-500">Authorize Credit Account</h3>
            </div>
            <p className="text-xs opacity-60 font-semibold">
              Associate phone numbers with corporate clients for unified monthly billing.
            </p>
            <input
              value={newCPhone}
              onChange={e => setNewCPhone(e.target.value)}
              placeholder="Customer 10-digit Mobile Number"
              className={`w-full p-3 rounded-xl border text-xs font-mono font-semibold outline-none ${inputBg}`}
            />
            <input
              value={newCName}
              onChange={e => setNewCName(e.target.value)}
              placeholder="Company / Individual Corporate Name"
              className={`w-full p-3 rounded-xl border text-xs font-semibold outline-none uppercase ${inputBg}`}
            />
            <input
              value={newCGst}
              onChange={e => setNewCGst(e.target.value)}
              placeholder="GST Number (Optional, 15 Chars)"
              className={`w-full p-3 rounded-xl border text-xs font-mono font-semibold outline-none uppercase ${inputBg}`}
            />
            <button
              onClick={addCreditAuth}
              className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-extrabold py-3 rounded-xl text-xs shadow-lg shadow-amber-600/30 transition-all"
            >
              Grant Credit Clearance ✅
            </button>
          </div>

          {/* Approved Credit Ledger */}
          <div className={`${cardBg} p-5 md:p-6 rounded-3xl border shadow-xl h-96 overflow-y-auto custom-scrollbar space-y-4`}>
            <div className="flex justify-between items-center border-b border-slate-500/10 pb-3">
              <h3 className="font-black text-sm uppercase tracking-wider">Approved Credit Directory</h3>
              <span className="text-xs font-mono font-bold opacity-60">{creditAuthList.length} Accounts</span>
            </div>
            {creditAuthList.length === 0 ? (
              <p className="text-xs opacity-50 text-center py-10 font-semibold">No credit accounts authorized yet.</p>
            ) : (
              <div className="space-y-2.5">
                {creditAuthList.map((c, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center p-3.5 border border-slate-500/10 rounded-2xl bg-black/5 dark:bg-white/5 gap-2"
                  >
                    <div>
                      <p className="font-black text-sm text-amber-500">{c.company}</p>
                      <p className="text-[11px] font-mono opacity-80 mt-0.5">
                        📱 {c.phone} {c.gst && <span className="text-indigo-400 font-bold ml-2">GST: {c.gst}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() =>
                          setEditingCredit({
                            originalPhone: c.phone,
                            originalCompany: c.company,
                            company: c.company,
                            phone: c.phone,
                            gst: c.gst || ""
                          })
                        }
                        title="Edit Customer/Company Name, Phone, or GST"
                        className="text-amber-500 hover:bg-amber-500/20 text-xs font-bold px-2.5 py-1 rounded-lg border border-amber-500/30 transition-all flex items-center gap-1"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => removeCredit(c.phone, c.company)}
                        title="Revoke Credit Authorization"
                        className="text-rose-500 hover:bg-rose-500/20 text-xs font-bold px-2.5 py-1 rounded-lg border border-rose-500/30 transition-all"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Monthly Invoice Generator */}
          <div className={`${cardBg} p-5 md:p-6 rounded-3xl border shadow-xl space-y-4 lg:col-span-2 border-indigo-500/30`}>
            <div className="flex items-center gap-2 border-b border-slate-500/10 pb-3">
              <span className="p-1.5 rounded-xl bg-indigo-500/15 text-indigo-400 text-sm">📑</span>
              <div>
                <h3 className="font-black text-sm uppercase tracking-wider text-indigo-500 dark:text-indigo-400">
                  Generate Monthly Consolidated Invoice
                </h3>
                <p className="text-[10px] opacity-60 font-semibold">
                  Consolidated billing with dynamic GST slab calculation
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-7 gap-3">
              <div className="sm:col-span-2 flex flex-col">
                <label className="text-[10px] uppercase font-black opacity-60 ml-1 mb-1">Corporate Client</label>
                <select
                  value={invCustomer}
                  onChange={e => setInvCustomer(e.target.value)}
                  className={`p-3 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
                >
                  <option value="">Select Account...</option>
                  {uniqueCompanies.map((c, i) => (
                    <option key={i} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] uppercase font-black opacity-60 ml-1 mb-1">Invoice No</label>
                <input
                  type="text"
                  value={manualInvNo}
                  onChange={e => setManualInvNo(e.target.value)}
                  placeholder="MPS/INV/01"
                  className={`p-3 rounded-xl border text-xs font-mono font-bold outline-none uppercase ${inputBg}`}
                />
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] uppercase font-black opacity-60 ml-1 mb-1">GST %</label>
                <select
                  value={invGstPercent}
                  onChange={e => setInvGstPercent(e.target.value)}
                  className={`p-3 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
                >
                  <option value="">0% (Nil)</option>
                  <option value="5">5% GST</option>
                  <option value="12">12% GST</option>
                  <option value="18">18% GST</option>
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] uppercase font-black opacity-60 ml-1 mb-1">Invoice Date</label>
                <input
                  type="date"
                  value={manualInvDate}
                  onChange={e => setManualInvDate(e.target.value)}
                  className={`p-3 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
                />
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] uppercase font-black opacity-60 ml-1 mb-1">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                  className={`p-3 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
                />
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] uppercase font-black opacity-60 ml-1 mb-1">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={e => setToDate(e.target.value)}
                  className={`p-3 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
                />
              </div>
            </div>

            <div className="flex gap-3 flex-col sm:flex-row pt-2">
              <button
                onClick={triggerInvoice}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
              >
                <span>📄</span> Generate & Print Consolidated Invoice PDF
              </button>
              <button
                onClick={settleCreditBill}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3.5 px-6 rounded-xl text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
              >
                <span>✅</span> Mark Billing Period Settled
              </button>
            </div>
          </div>

          {/* Unpaid Credit Balances Summary */}
          <div className={`${cardBg} p-5 md:p-6 rounded-3xl border space-y-4 lg:col-span-2 border-rose-500/30 bg-rose-500/5`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-rose-500/20 pb-3">
              <div>
                <h3 className="font-black text-sm uppercase tracking-wider text-rose-500">
                  Unsettled Corporate Credit Balances
                </h3>
                <p className="text-[10px] opacity-60 font-semibold">
                  Total unsettled outstanding freight receivable by client company
                </p>
              </div>
              <span className="bg-rose-500 text-white px-4 py-2 rounded-xl text-sm font-black font-mono shadow-md shadow-rose-500/30">
                Total Outstanding: ₹{grandTotalCredit.toLocaleString()}
              </span>
            </div>
            {Object.keys(customerBalances).length === 0 ? (
              <p className="text-xs opacity-50 font-bold text-center py-8">
                ✨ Perfect! All credit customer bills are settled.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(customerBalances)
                  .sort((a, b) => b[1] - a[1])
                  .map(([customer, amt]) => (
                    <div
                      key={customer}
                      className="p-4 border border-rose-500/20 rounded-2xl bg-black/5 dark:bg-white/5 flex flex-col justify-between"
                    >
                      <span className="font-extrabold text-xs text-slate-400 truncate mb-1" title={customer}>
                        {customer}
                      </span>
                      <span className="font-black font-mono text-rose-500 text-xl">₹{amt.toLocaleString()}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ALL MANIFESTS & OVERRIDES */}
      {tab === "parcels" && (
        <>
          <div className={`${cardBg} p-4 md:p-6 rounded-3xl border shadow-xl space-y-3.5`}>
            <div className="flex flex-wrap justify-between items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-indigo-500/15 text-indigo-400 text-sm">📋</span>
                <h3 className="font-black text-sm uppercase tracking-wider text-indigo-500">
                  Administrative Manifest Control
                </h3>
              </div>
              <button
                onClick={exportData}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black px-4 py-2 rounded-xl transition-all shadow-md shadow-indigo-600/20"
              >
                📥 Download Report CSV
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="🔍 Search LR / Name / Phone..."
                className={`p-2.5 rounded-xl border text-xs font-semibold outline-none ${inputBg}`}
              />
              <input
                type="date"
                title="From Date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className={`p-2.5 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
              />
              <input
                type="date"
                title="To Date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className={`p-2.5 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
              />
              <select
                value={paymentFilter}
                onChange={e => setPaymentFilter(e.target.value)}
                className={`p-2.5 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
              >
                <option value="All">Payment: All Modes</option>
                {PAY_MODES.map(m => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={branchFilter}
                onChange={e => setBranchFilter(e.target.value)}
                className={`p-2.5 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
              >
                <option value="All">Branch: All</option>
                {CITIES.map(c => (
                  <option key={c} value={c}>
                    🏢 {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={`${cardBg} rounded-3xl border shadow-xl overflow-hidden mt-6`}>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="min-w-[850px] w-full text-left whitespace-nowrap text-sm">
                <thead
                  className={`${tblBg} text-[10px] font-black uppercase tracking-wider border-b border-slate-500/10 sticky top-0 backdrop-blur-md z-10`}
                >
                  <tr>
                    <th className="p-4 pl-6">LR Manifest</th>
                    <th className="p-4">Route Path</th>
                    <th className="p-4">Amount & Mode</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 pr-6 text-center">RBAC Operations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-500/10">
                  {sortedTableData.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-12 text-center opacity-50 font-bold text-xs">
                        No consignments matching current administrative query.
                      </td>
                    </tr>
                  ) : (
                    paginatedTableData.map(p => {
                      const canEditDrop = p.status !== "Delivered" && p.status !== "RTO" && p.status !== "Deleted";
                      const canAdminModify = user.role === "admin" || isSuper;
                      return (
                        <tr
                          key={p.id}
                          className={`hover:bg-indigo-500/5 dark:hover:bg-indigo-500/10 transition-colors ${
                            p.status === "Deleted" ? "bg-rose-500/5" : ""
                          }`}
                        >
                          <td className="p-4 pl-6">
                            <span
                              className="font-black font-mono text-indigo-500 dark:text-indigo-400 cursor-pointer hover:underline text-sm"
                              onClick={() => setGlobalView(p)}
                            >
                              📦 {p.id}
                            </span>
                            <span className="text-[10px] font-mono opacity-50 block mt-0.5">{p.date}</span>
                          </td>
                          <td className="p-4 font-bold text-xs">
                            <span className="text-slate-400">{p.from}</span>
                            <span className="mx-1 text-indigo-400">➔</span>
                            <span>{p.to}</span>
                          </td>
                          <td className="p-4">
                            <span className="font-black font-mono text-sm">₹{p.price}</span>
                            <span className="text-[10px] opacity-60 font-semibold ml-1">({p.payment})</span>
                          </td>
                          <td className="p-4">
                            <span
                              className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase text-white shadow-sm"
                              style={{ backgroundColor: S_CLR[p.status] || "#6366f1" }}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td className="p-4 pr-6 text-center">
                            <div
                              className="flex items-center justify-center gap-1.5"
                              onClick={e => e.stopPropagation()}
                            >
                              {/* Staff badge */}
                              {user.role === "staff" && (
                                <span className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg bg-black/10 dark:bg-white/10 opacity-60">
                                  🔒 Locked
                                </span>
                              )}

                              {/* Admin or Superadmin edit button */}
                              {canAdminModify && (canEditDrop || isSuper) && p.status !== "Deleted" && (
                                <button
                                  onClick={() => setEditF(p)}
                                  className="text-indigo-400 hover:text-white hover:bg-indigo-600 text-xs font-bold border border-indigo-500/30 px-2.5 py-1 rounded-xl transition-all"
                                >
                                  ✏️ Edit
                                </button>
                              )}

                              {/* Superadmin Delete button with reason prompt */}
                              {isSuper && p.status !== "Deleted" && (
                                <button
                                  onClick={() => deleteRecord(p.id)}
                                  className="text-rose-400 hover:text-white hover:bg-rose-600 text-xs font-bold border border-rose-500/30 px-2.5 py-1 rounded-xl transition-all"
                                >
                                  🗑️ Delete
                                </button>
                              )}

                              {/* Superadmin Restore button for deleted consignments */}
                              {isSuper && p.status === "Deleted" && (
                                <button
                                  onClick={() => restoreRecord(p.id)}
                                  className="text-emerald-400 hover:text-white hover:bg-emerald-600 text-xs font-bold border border-emerald-500/30 px-2.5 py-1 rounded-xl transition-all flex items-center gap-1"
                                >
                                  ♻️ Restore
                                </button>
                              )}

                              {!canEditDrop && !isSuper && p.status !== "Deleted" && user.role !== "staff" && (
                                <span className="text-[10px] opacity-50 italic">Closed</span>
                              )}

                              {p.status !== "Deleted" && (
                                <div className="ml-1">
                                  <PrintGroup p={p} />
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Bar */}
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 border-t border-slate-500/10 text-xs">
                <div className="text-slate-400 font-medium">
                  Showing <span className="font-bold text-indigo-400">{(currentPage - 1) * PAGE_SIZE + 1}</span> to{" "}
                  <span className="font-bold text-indigo-400">{Math.min(currentPage * PAGE_SIZE, sortedTableData.length)}</span> of{" "}
                  <span className="font-bold text-indigo-400">{sortedTableData.length}</span> consignments
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

          {isSuper && <DeletedParcelsLog parcels={parcels} isDark={isDark} />}
        </>
      )}

      {/* PARCEL EDIT OVERRIDE MODAL */}
      {editF && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[200] animate-fade-in">
          <div
            className={`glass-card ${cardBg} p-6 md:p-8 rounded-3xl max-w-2xl w-full space-y-4 shadow-2xl animate-bounce-in max-h-[92vh] overflow-y-auto custom-scrollbar border`}
          >
            <div className="flex justify-between items-center border-b border-slate-500/20 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">✏️</span>
                <div>
                  <h3 className="font-black text-lg">Modify Manifest: {editF.id}</h3>
                  <p className="text-[10px] opacity-60">Consignment dated {editF.date}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setEditF(null);
                  setEditReason("");
                }}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl text-sm"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Sender Details */}
              <div className="space-y-2.5 bg-black/5 dark:bg-white/5 p-3.5 rounded-2xl border border-slate-500/10">
                <h4 className="text-[10px] uppercase font-black text-indigo-400">Sender Profile</h4>
                <input
                  value={editF.sName}
                  onChange={e => setEditF({ ...editF, sName: e.target.value.toUpperCase() })}
                  placeholder="Sender Name"
                  className={`w-full p-2.5 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
                />
                <input
                  disabled={!isSuper}
                  value={editF.sPhone}
                  onChange={e => setEditF({ ...editF, sPhone: e.target.value })}
                  placeholder="Sender Phone"
                  className={`w-full p-2.5 rounded-xl border text-xs font-mono font-bold outline-none ${inputBg} ${
                    !isSuper ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                />
                <input
                  disabled={!isSuper}
                  value={editF.sGst}
                  onChange={e => setEditF({ ...editF, sGst: e.target.value.toUpperCase() })}
                  placeholder="Sender GSTIN"
                  className={`w-full p-2.5 rounded-xl border text-xs font-mono font-bold outline-none ${inputBg} ${
                    !isSuper ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                />
              </div>

              {/* Receiver Details */}
              <div className="space-y-2.5 bg-black/5 dark:bg-white/5 p-3.5 rounded-2xl border border-slate-500/10">
                <h4 className="text-[10px] uppercase font-black text-emerald-400">Receiver Profile</h4>
                <input
                  value={editF.rName}
                  onChange={e => setEditF({ ...editF, rName: e.target.value.toUpperCase() })}
                  placeholder="Receiver Name"
                  className={`w-full p-2.5 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
                />
                <input
                  disabled={!isSuper}
                  value={editF.rPhone}
                  onChange={e => setEditF({ ...editF, rPhone: e.target.value })}
                  placeholder="Receiver Phone"
                  className={`w-full p-2.5 rounded-xl border text-xs font-mono font-bold outline-none ${inputBg} ${
                    !isSuper ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                />
                <input
                  disabled={!isSuper}
                  value={editF.rGst}
                  onChange={e => setEditF({ ...editF, rGst: e.target.value.toUpperCase() })}
                  placeholder="Receiver GSTIN"
                  className={`w-full p-2.5 rounded-xl border text-xs font-mono font-bold outline-none ${inputBg}`}
                />
              </div>

              {/* Logistics & Cargo */}
              <div className="space-y-2.5 bg-black/5 dark:bg-white/5 p-3.5 rounded-2xl border border-slate-500/10 sm:col-span-2">
                <h4 className="text-[10px] uppercase font-black text-amber-500">
                  Logistics & Cargo {!isSuper && <span className="opacity-60">(Locked 🔒)</span>}
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <select
                    disabled={!isSuper}
                    value={editF.from}
                    onChange={e => setEditF({ ...editF, from: e.target.value })}
                    className={`p-2 rounded-xl border text-xs font-bold outline-none ${inputBg} ${
                      !isSuper ? "opacity-60 cursor-not-allowed" : ""
                    }`}
                  >
                    <option value="">Origin</option>
                    {CITIES.map(c => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  <select
                    disabled={!isSuper}
                    value={editF.to}
                    onChange={e => setEditF({ ...editF, to: e.target.value })}
                    className={`p-2 rounded-xl border text-xs font-bold outline-none ${inputBg} ${
                      !isSuper ? "opacity-60 cursor-not-allowed" : ""
                    }`}
                  >
                    <option value="">Destination</option>
                    {CITIES.map(c => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  <input
                    disabled={!isSuper}
                    type="number"
                    value={editF.count}
                    onChange={e => setEditF({ ...editF, count: e.target.value })}
                    placeholder="Qty"
                    className={`p-2 rounded-xl border text-xs font-bold outline-none ${inputBg} ${
                      !isSuper ? "opacity-60 cursor-not-allowed" : ""
                    }`}
                  />
                  <select
                    disabled={!isSuper}
                    value={editF.type}
                    onChange={e => setEditF({ ...editF, type: e.target.value })}
                    className={`p-2 rounded-xl border text-xs font-bold outline-none ${inputBg} ${
                      !isSuper ? "opacity-60 cursor-not-allowed" : ""
                    }`}
                  >
                    <option value="">Type</option>
                    {TYPES.map(t => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status */}
              <div className="flex flex-col">
                <label className="text-[10px] uppercase font-black opacity-60 mb-1">Status Override</label>
                <select
                  value={editF.status}
                  onChange={e => setEditF({ ...editF, status: e.target.value })}
                  className={`p-2.5 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
                >
                  {STATUSES.filter(s => s !== "Deleted").map(s => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Price & Payment Mode */}
              <div className="flex gap-2">
                <div className="flex flex-col flex-1">
                  <label className={`text-[10px] uppercase font-black mb-1 ${isSuper ? "text-indigo-400" : "opacity-40"}`}>
                    Freight Price {!isSuper ? "🔒 (Superadmin)" : ""}
                  </label>
                  <input
                    type="number"
                    disabled={!isSuper}
                    value={editF.price}
                    onChange={e => setEditF({ ...editF, price: Number(e.target.value) })}
                    className={`p-2.5 rounded-xl border text-xs font-mono font-bold outline-none ${inputBg} ${
                      !isSuper ? "opacity-50 cursor-not-allowed bg-black/10" : ""
                    }`}
                  />
                </div>
                <div className="flex flex-col flex-1">
                  <label className={`text-[10px] uppercase font-black mb-1 ${isSuper ? "text-indigo-400" : "opacity-40"}`}>
                    Payment Mode {!isSuper ? "🔒 (Superadmin)" : ""}
                  </label>
                  <select
                    disabled={!isSuper}
                    value={editF.payment}
                    onChange={e => setEditF({ ...editF, payment: e.target.value })}
                    className={`p-2.5 rounded-xl border text-xs font-bold outline-none ${inputBg} ${
                      !isSuper ? "opacity-50 cursor-not-allowed bg-black/10" : ""
                    }`}
                  >
                    {PAY_MODES.map(p => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Mandatory Reason for Edit Input */}
            <div className="p-3.5 bg-amber-500/10 rounded-2xl border border-amber-500/30 space-y-1">
              <label className="text-[10px] uppercase font-black text-amber-500 block">
                Mandatory Audit Reason (Required for Tracking Trail) *
              </label>
              <input
                value={editReason}
                onChange={e => setEditReason(e.target.value)}
                placeholder="Enter specific audit explanation (e.g. Corrected consignee phone number per customer request)..."
                className={`w-full p-2.5 rounded-xl border text-xs font-semibold outline-none ${inputBg}`}
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={saveOverrides}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold py-3 px-4 rounded-xl text-xs shadow-lg shadow-indigo-600/30 transition-all"
              >
                Save Changes & Log Audit Trail ➔
              </button>
              <button
                onClick={() => {
                  setEditF(null);
                  setEditReason("");
                }}
                className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-5 rounded-xl text-xs transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT CREDIT ACCOUNT MODAL */}
      {editingCredit && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[210] animate-fade-in">
          <div
            className={`glass-card ${cardBg} p-6 md:p-8 rounded-3xl max-w-md w-full space-y-4 shadow-2xl border`}
          >
            <div className="flex justify-between items-center border-b border-slate-500/20 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400">✏️</span>
                <div>
                  <h3 className="font-black text-base text-amber-500">Edit Credit Client Account</h3>
                  <p className="text-[10px] opacity-60">Update customer/company name & details</p>
                </div>
              </div>
              <button
                onClick={() => setEditingCredit(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-black opacity-70 ml-1 mb-1 block text-amber-400">
                  Customer / Company Name *
                </label>
                <input
                  value={editingCredit.company}
                  onChange={e => setEditingCredit({ ...editingCredit, company: e.target.value.toUpperCase() })}
                  placeholder="Enter Company / Client Name..."
                  className={`w-full p-3 rounded-xl border text-sm font-bold outline-none ${inputBg}`}
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-black opacity-70 ml-1 mb-1 block">
                  10-Digit Mobile Phone *
                </label>
                <input
                  maxLength={10}
                  value={editingCredit.phone}
                  onChange={e => setEditingCredit({ ...editingCredit, phone: e.target.value.replace(/\D/g, "") })}
                  placeholder="10-digit mobile..."
                  className={`w-full p-3 rounded-xl border text-sm font-mono font-bold outline-none ${inputBg}`}
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-black opacity-70 ml-1 mb-1 block">
                  GST Identification Number (GSTIN)
                </label>
                <input
                  maxLength={15}
                  value={editingCredit.gst}
                  onChange={e => setEditingCredit({ ...editingCredit, gst: e.target.value.toUpperCase().trim() })}
                  placeholder="Optional 15-digit GSTIN..."
                  className={`w-full p-3 rounded-xl border text-sm font-mono font-bold outline-none ${inputBg}`}
                />
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={saveCreditAccount}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black py-3 px-4 rounded-xl text-xs shadow-lg shadow-amber-500/20 transition-all"
              >
                Save Client Updates ➔
              </button>
              <button
                onClick={() => setEditingCredit(null)}
                className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
