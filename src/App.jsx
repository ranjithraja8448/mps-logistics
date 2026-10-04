import { useState, useEffect, useCallback } from "react";
import { ENV_URL, ENV_KEY } from "./constants";
import { DB, local } from "./services/db";
import MpsLogo from "./components/common/MpsLogo";
import ParcelModal from "./components/common/ParcelModal";
import ShortcutsModal from "./components/common/ShortcutsModal";
import Dashboard from "./components/Dashboard";
import Pending from "./components/Pending";
import Book from "./components/Book";
import Track from "./components/Track";
import Delivery from "./components/Delivery";
import Accounts from "./components/Accounts";
import Admin from "./components/Admin";
import Login from "./components/Login";

const db = new DB(ENV_URL, ENV_KEY);

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [parcels, setParcels] = useState([]);
  const [users, setUsers] = useState([]);
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState("dark");
  const [toast, setToast] = useState(null);
  const [creditAuthList, setCreditAuthList] = useState([]);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [shortcutMode, setShortcutMode] = useState("");
  const [globalViewItem, setGlobalViewItem] = useState(null);
  const [trackFilter, setTrackFilter] = useState("All");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const showMsg = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Sync theme with HTML root class
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  // Network status listener
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showMsg("Network restored: Online mode active", "success");
    };
    const handleOffline = () => {
      setIsOnline(false);
      showMsg("⚠️ Network disconnected: Running on offline cache", "error");
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Sync Data
  const syncData = async () => {
    if (!navigator.onLine) return showMsg("⚠️ Internet Illa! Please connect to network.", "error");
    setIsSyncing(true);
    showMsg("Syncing Latest Data...", "info");
    try {
      const ps = await db.getParcels();
      setParcels(ps);
      const usrs = await db.getUsers();
      setUsers(usrs);
      const cList = await db.getCreditAuth();
      setCreditAuthList(cList);
      showMsg("Data Synced Successfully!", "success");
    } catch (e) {
      showMsg("Sync Failed: " + e.message, "error");
    } finally {
      setIsSyncing(false);
    }
  };

  // Emergency Recovery Sync
  const emergencySync = async () => {
    if (
      !window.confirm(
        "EMERGENCY RECOVERY: Do you want to sync local device data to the live database? RUN THIS ONLY IF LIVE DATA IS MISSING!"
      )
    )
      return;
    if (!navigator.onLine) return showMsg("⚠️ Offline! Net on pannittu sync pannunga.", "error");

    showMsg("Checking local phone memory...", "info");

    try {
      const localData = (await local.get("mps_parcels")) || [];
      if (localData.length === 0) return showMsg("No local offline data found on this device!", "error");

      const liveData = await db.getParcels();
      const liveIds = new Set(liveData.map(p => p.id));

      const missingParcels = localData.filter(p => !liveIds.has(p.id));

      if (missingParcels.length === 0) {
        return showMsg("All data from this phone is already in the live database!", "success");
      }

      showMsg(`Found ${missingParcels.length} missing parcels! Uploading to server...`, "info");

      let count = 0;
      for (let p of missingParcels) {
        const res = await fetch(`${ENV_URL.replace(/\/+$/, "")}/rest/v1/parcels`, {
          method: "POST",
          headers: { apikey: ENV_KEY, Authorization: `Bearer ${ENV_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify(p)
        });
        if (res.ok || res.status === 409) count++;
      }

      showMsg(`Success! ${count} missing parcels uploaded completely!`, "success");

      const freshData = await db.getParcels();
      setParcels(freshData);
    } catch (err) {
      showMsg("Error: " + err.message, "error");
    }
  };

  // Initial App bootstrap
  useEffect(() => {
    async function init() {
      const session = await local.get("mps_session");
      if (session) setUser(session);
      const savedTheme = await local.get("mps_theme");
      if (savedTheme) setTheme(savedTheme);
      const cList = await db.getCreditAuth();
      setCreditAuthList(cList);
      const ps = await db.getParcels();
      setParcels(ps);
      const usrs = await db.getUsers();
      setUsers(usrs);
    }
    init();
  }, []);

  const toggleTheme = () => {
    const nt = theme === "dark" ? "light" : "dark";
    setTheme(nt);
    local.set("mps_theme", nt);
  };

  const handleLogout = useCallback(async (clearCache = false) => {
    setUser(null);
    await local.set("mps_session", null);
    if (clearCache) {
      await local.set("mps_parcels", null);
      await local.set("mps_contacts", null);
      await local.set("mps_petty_cash", null);
      setParcels([]);
      showMsg("Session terminated and device cache cleared securely!", "success");
    } else {
      showMsg("Logged out successfully.", "info");
    }
  }, []);

  // 45-Minute Inactivity Auto-Logout for counter security (lightweight throttled)
  useEffect(() => {
    if (!user) return;
    let timer;
    let lastActivity = Date.now();

    const resetTimer = () => {
      const now = Date.now();
      if (now - lastActivity < 5000) return; // Throttle to max once per 5 seconds
      lastActivity = now;

      clearTimeout(timer);
      timer = setTimeout(() => {
        handleLogout(false);
      }, 45 * 60 * 1000);
    };

    const events = ["mousedown", "keydown", "touchstart"];
    events.forEach(ev => window.addEventListener(ev, resetTimer, { passive: true }));
    resetTimer();
    return () => {
      clearTimeout(timer);
      events.forEach(ev => window.removeEventListener(ev, resetTimer));
    };
  }, [user, handleLogout]);

  // Keyboard Shortcuts (F6-F10 and ? help)
  useEffect(() => {
    const handleKey = e => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isInput = activeTag === "input" || activeTag === "textarea" || activeTag === "select";

      if (e.key === "Escape") {
        setShowShortcutsModal(false);
        setGlobalViewItem(null);
        return;
      }

      if ((e.key === "?" || (e.shiftKey && e.key === "/")) && !isInput) {
        e.preventDefault();
        setShowShortcutsModal(prev => !prev);
        return;
      }

      if (!user || globalViewItem) return;
      let mode = "";
      if (e.key === "F7") mode = "Paid";
      else if (e.key === "F8") mode = "To Pay";
      else if (e.key === "F9") mode = "Credit";
      else if (e.key === "F10") mode = "FOC";
      else if (e.key === "F6") {
        e.preventDefault();
        setPage("delivery");
        showMsg("Delivery Scanner Activated!", "info");
      }
      if (mode) {
        e.preventDefault();
        setPage("book");
        setShortcutMode(mode);
        showMsg(`${mode} Mode Activated!`, "info");
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [user, globalViewItem]);

  if (!user) {
    return (
      <Login
        onLogin={async (u, p) => {
          const valid = users.find(x => x.username === u && x.password === p);
          if (valid) {
            setUser(valid);
            await local.set("mps_session", valid);
            return true;
          }
          return false;
        }}
        theme={theme}
      />
    );
  }

  const isDark = theme === "dark";
  const bgClass = isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900";

  const navItems = [
    { id: "dashboard", icon: "📊", label: "Analysis", role: "staff", hotkey: "" },
    { id: "book", icon: "📦", label: "Book Parcel", role: "staff", hotkey: "F7-F10" },
    { id: "pending", icon: "⏳", label: "Pending Stock", role: "staff", hotkey: "" },
    { id: "track", icon: "🔍", label: "Track & Trace", role: "staff", hotkey: "" },
    { id: "delivery", icon: "🤝", label: "Delivery", role: "staff", hotkey: "F6" },
    { id: "accounts", icon: "💰", label: "Accounts", role: "admin", hotkey: "" },
    { id: "admin", icon: "⚙️", label: "System RBAC", role: "admin", hotkey: "" }
  ];

  return (
    <div className={`flex h-screen font-sans ${bgClass} transition-colors duration-300 overflow-hidden relative`}>
      {/* ══════════════════════════════════════════
          ANTI-GRAVITY COSMIC MESH AURORA (Hardware-accelerated fixed layer)
      ══════════════════════════════════════════ */}
      <div
        className="fixed inset-0 pointer-events-none -z-10 overflow-hidden"
        style={{ transform: "translateZ(0)" }}
      >
        {isDark ? (
          <>
            {/* Dark Mode Cosmic Nebulas */}
            <div className="absolute -top-32 -left-32 w-[650px] h-[650px] rounded-full bg-gradient-to-br from-indigo-600/25 via-violet-600/15 to-transparent blur-[120px]" />
            <div className="absolute top-[10%] -right-32 w-[600px] h-[600px] rounded-full bg-gradient-to-bl from-purple-600/20 via-pink-600/10 to-transparent blur-[130px]" />
            <div className="absolute bottom-[5%] left-[20%] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-emerald-600/15 via-teal-500/10 to-transparent blur-[120px]" />
            <div className="absolute -bottom-20 right-[15%] w-[450px] h-[450px] rounded-full bg-gradient-to-tl from-indigo-500/15 via-blue-600/10 to-transparent blur-[110px]" />
            {/* Tech grid texture overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:28px_28px] opacity-75" />
          </>
        ) : (
          <>
            {/* Light Mode Pearlescent Aurora */}
            <div className="absolute -top-20 -left-20 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-indigo-400/18 via-blue-300/10 to-transparent blur-[100px]" />
            <div className="absolute top-[15%] -right-20 w-[550px] h-[550px] rounded-full bg-gradient-to-bl from-violet-400/15 via-purple-200/10 to-transparent blur-[110px]" />
            <div className="absolute bottom-[10%] left-[25%] w-[480px] h-[480px] rounded-full bg-gradient-to-tr from-emerald-400/12 via-teal-200/8 to-transparent blur-[100px]" />
            {/* Subtle grid texture */}
            <div className="absolute inset-0 bg-[radial-gradient(rgba(99,102,241,0.08)_1px,transparent_1px)] [background-size:28px_28px] opacity-60" />
          </>
        )}
      </div>
      {/* ══════════════════════════════════════════
          ANTI-GRAVITY GLASS SIDEBAR
      ══════════════════════════════════════════ */}
      <aside
        className={`${
          sidebarExpanded ? "w-64" : "w-20"
        } bg-slate-950/85 backdrop-blur-2xl text-slate-300 flex flex-col shadow-2xl border-r border-white/10 relative z-50 transition-all duration-300 shrink-0`}
      >
        {/* Brand / Logo */}
        <div className="h-20 flex items-center justify-between px-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center overflow-hidden">
            <MpsLogo />
            {sidebarExpanded && (
              <div className="animate-fade-in truncate">
                <h1 className="text-base font-black tracking-wider text-white">MPS LOGISTICS</h1>
                <p className="text-[9px] uppercase tracking-widest text-indigo-400 font-extrabold">Enterprise ERP</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarExpanded(!sidebarExpanded)}
            title={sidebarExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all text-xs border border-white/5"
          >
            {sidebarExpanded ? "◀" : "▶"}
          </button>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map(item => {
            if (!(item.role === "staff" || user.role === "admin" || user.role === "superadmin")) return null;
            const isActive = page === item.id;
            return (
              <button
                key={item.id}
                title={`${item.label} ${item.hotkey ? `[${item.hotkey}]` : ""}`}
                onClick={() => setPage(item.id)}
                className={`w-full flex items-center gap-3.5 px-3 py-3 rounded-2xl font-bold transition-all duration-200 group relative ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-600/30 to-violet-600/20 text-white border border-indigo-500/40 shadow-lg shadow-indigo-500/20"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-gradient-to-b from-indigo-400 to-indigo-600 rounded-r-full shadow-glow"></span>
                )}
                <span
                  className={`text-xl transition-transform duration-200 ${
                    isActive ? "scale-110" : "group-hover:scale-110"
                  }`}
                >
                  {item.icon}
                </span>
                {sidebarExpanded && (
                  <div className="flex-1 flex items-center justify-between truncate text-left animate-fade-in">
                    <span className="text-sm font-semibold tracking-wide">{item.label}</span>
                    {item.hotkey && (
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/10 text-indigo-300 border border-white/5">
                        {item.hotkey}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Identity & Logout at bottom */}
        <div className="p-3 border-t border-white/10 bg-white/[0.02]">
          {sidebarExpanded ? (
            <div className="flex items-center justify-between p-2 rounded-2xl bg-white/5 border border-white/5">
              <div className="flex items-center gap-2.5 truncate">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-black text-white shadow-md">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-white truncate">{user.username}</p>
                  <p className="text-[9px] uppercase tracking-wider text-indigo-400 font-extrabold">{user.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    if (window.confirm("Securely wipe all offline cached consignments and terminate session? (Recommended on shared PCs)")) {
                      handleLogout(true);
                    }
                  }}
                  title="Secure Kiosk Logout (Wipe Local Cache)"
                  className="p-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 hover:text-white transition-all text-xs"
                >
                  🧹
                </button>
                <button
                  onClick={() => handleLogout(false)}
                  title="Logout Session"
                  className="p-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-white transition-all text-xs"
                >
                  ⏻
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 items-center">
              <button
                onClick={() => handleLogout(false)}
                title="Logout Session"
                className="w-full py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-white transition-all flex justify-center text-sm"
              >
                ⏻
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ══════════════════════════════════════════
          MAIN VIEWPORT & TOP GLASS HEADER
      ══════════════════════════════════════════ */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="glass-panel backdrop-blur-xl border-b border-white/20 dark:border-white/10 px-4 md:px-8 py-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-40 transition-colors">
          {/* Left: Location & System Status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400">
              <span className="text-sm">🏢</span>
              <span className="text-xs font-black tracking-wide">
                {user.branch === "All" ? "GLOBAL NETWORK (ALL)" : `BRANCH: ${user.branch.toUpperCase()}`}
              </span>
            </div>

            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-[11px] font-bold ${
                isOnline
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 animate-pulse"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-500 shadow-glow" : "bg-rose-500"}`}></span>
              <span>{isOnline ? "Online" : "Offline Mode"}</span>
            </div>
          </div>

          {/* Center: Interactive Shortcut Reference Bar */}
          <div className="hidden lg:flex items-center gap-1.5 bg-black/5 dark:bg-white/5 backdrop-blur-md px-3 py-1 rounded-2xl border border-black/5 dark:border-white/10">
            <span className="text-[10px] uppercase font-black opacity-50 tracking-wider mr-1">Hotkeys:</span>
            <button
              onClick={() => setPage("delivery")}
              title="Fast Delivery Scanner"
              className="px-2 py-0.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-600 dark:text-indigo-400 text-[10px] font-mono font-bold transition-all"
            >
              F6: Scan
            </button>
            <button
              onClick={() => {
                setPage("book");
                setShortcutMode("Paid");
              }}
              title="Book Paid"
              className="px-2 py-0.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-bold transition-all"
            >
              F7: Paid
            </button>
            <button
              onClick={() => {
                setPage("book");
                setShortcutMode("To Pay");
              }}
              title="Book To Pay"
              className="px-2 py-0.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 text-[10px] font-mono font-bold transition-all"
            >
              F8: ToPay
            </button>
            <button
              onClick={() => {
                setPage("book");
                setShortcutMode("Credit");
              }}
              title="Book Credit"
              className="px-2 py-0.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-600 dark:text-purple-400 text-[10px] font-mono font-bold transition-all"
            >
              F9: Credit
            </button>
            <button
              onClick={() => {
                setPage("book");
                setShortcutMode("FOC");
              }}
              title="Book FOC"
              className="px-2 py-0.5 rounded-lg bg-slate-500/15 hover:bg-slate-500/25 text-slate-600 dark:text-slate-400 text-[10px] font-mono font-bold transition-all"
            >
              F10: FOC
            </button>
          </div>

          {/* Right: Actions, Sync, Emergency, Theme Toggle */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Sync button */}
            <button
              onClick={syncData}
              disabled={isSyncing}
              title="Sync data with live server"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 text-xs font-bold transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              <span className={`text-xs ${isSyncing ? "animate-spin" : ""}`}>🔄</span>
              <span className="hidden sm:inline">{isSyncing ? "Syncing..." : "Sync"}</span>
            </button>

            {/* Emergency Recover */}
            <button
              onClick={emergencySync}
              title="Emergency recovery from phone local storage"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-white text-xs font-black shadow-md shadow-rose-500/20 hover:shadow-rose-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all"
            >
              <span>🛡️</span>
              <span className="hidden sm:inline">Recover</span>
            </button>

            {/* Role Badge */}
            <span
              className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-xl border tracking-wider ${
                user.role === "superadmin"
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40"
                  : user.role === "admin"
                  ? "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/40"
                  : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/40"
              }`}
            >
              {user.role}
            </span>

            {/* Keyboard Shortcuts [?] Button */}
            <button
              onClick={() => setShowShortcutsModal(true)}
              title="Keyboard Shortcuts Cheat-Sheet [?]"
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-indigo-500/10 text-xs font-black font-mono transition-all hover:scale-105"
            >
              ⌨️
            </button>

            {/* Dark / Light Toggle */}
            <button
              onClick={toggleTheme}
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-indigo-500/10 text-base transition-all hover:scale-105"
            >
              {isDark ? "☀️" : "🌙"}
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 relative custom-scrollbar">
          <div className="max-w-7xl mx-auto animate-fade-in pb-12">
            {page === "dashboard" && (
              <Dashboard
                parcels={parcels}
                isDark={isDark}
                user={user}
                setPage={setPage}
                setTrackFilter={setTrackFilter}
                setGlobalView={setGlobalViewItem}
              />
            )}
            {page === "pending" && (
              <Pending
                parcels={parcels}
                setParcels={setParcels}
                db={db}
                showMsg={showMsg}
                isDark={isDark}
                user={user}
                setGlobalView={setGlobalViewItem}
              />
            )}
            {page === "book" && (
              <Book
                shortcutMode={shortcutMode}
                parcels={parcels}
                setParcels={setParcels}
                db={db}
                showMsg={showMsg}
                isDark={isDark}
                theme={theme}
                user={user}
                creditAuthList={creditAuthList}
              />
            )}
            {page === "track" && (
              <Track
                parcels={parcels}
                isDark={isDark}
                user={user}
                setGlobalView={setGlobalViewItem}
                initialStatus={trackFilter}
              />
            )}
            {page === "delivery" && (
              <Delivery
                parcels={parcels}
                setParcels={setParcels}
                db={db}
                showMsg={showMsg}
                isDark={isDark}
                user={user}
                creditAuthList={creditAuthList}
                setGlobalView={setGlobalViewItem}
              />
            )}
            {page === "accounts" && (user.role === "admin" || user.role === "superadmin") && (
              <Accounts parcels={parcels} setParcels={setParcels} db={db} showMsg={showMsg} isDark={isDark} user={user} />
            )}
            {page === "admin" && (user.role === "admin" || user.role === "superadmin") && (
              <Admin
                parcels={parcels}
                users={users}
                setUsers={setUsers}
                setParcels={setParcels}
                db={db}
                showMsg={showMsg}
                isDark={isDark}
                user={user}
                creditAuthList={creditAuthList}
                setCreditAuthList={setCreditAuthList}
                setGlobalView={setGlobalViewItem}
              />
            )}
          </div>
        </div>
      </main>

      {/* Floating Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 md:bottom-8 md:right-8 px-5 py-3.5 rounded-2xl shadow-2xl z-[300] flex items-center gap-3 backdrop-blur-xl border animate-bounce-in font-bold text-sm ${
            toast.type === "error"
              ? "bg-rose-500/90 text-white border-rose-400/50 shadow-rose-500/30"
              : toast.type === "info"
              ? "bg-indigo-600/90 text-white border-indigo-400/50 shadow-indigo-500/30"
              : "bg-emerald-600/90 text-white border-emerald-400/50 shadow-emerald-500/30"
          }`}
        >
          <span className="text-xl">{toast.type === "error" ? "⚠️" : toast.type === "info" ? "ℹ️" : "✅"}</span>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Global Parcel Quick-View & Actions Modal */}
      {globalViewItem && (
        <ParcelModal
          item={globalViewItem}
          creditAuthList={creditAuthList}
          onClose={() => setGlobalViewItem(null)}
          db={db}
          parcels={parcels}
          setParcels={setParcels}
          user={user}
          showMsg={showMsg}
          isDark={isDark}
        />
      )}

      {/* Keyboard Shortcuts Reference Modal */}
      {showShortcutsModal && (
        <ShortcutsModal onClose={() => setShowShortcutsModal(false)} isDark={isDark} />
      )}
    </div>
  );
}
