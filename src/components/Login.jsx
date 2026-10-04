import { useState, useEffect } from "react";
import MpsLogo from "./common/MpsLogo";
import { playSuccessChime, playErrorBuzz } from "../utils/audio";

export default function Login({ onLogin, theme }) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const [failCount, setFailCount] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState(0);
  const isDark = theme === "dark";

  // Countdown timer for brute-force lockout
  useEffect(() => {
    if (lockoutTimer <= 0) return;
    const interval = setInterval(() => {
      setLockoutTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setErr("");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  const handleSub = async () => {
    if (lockoutTimer > 0) return;

    if (!u.trim() || !p) {
      setErr("Please enter both User Identifier and Passcode!");
      playErrorBuzz();
      return;
    }

    const success = await onLogin(u.trim(), p);
    if (!success) {
      const nextFails = failCount + 1;
      setFailCount(nextFails);
      setP("");
      playErrorBuzz();

      if (nextFails >= 5) {
        setLockoutTimer(30);
        setErr("Too many failed attempts! Terminal locked for 30 seconds.");
      } else {
        setErr(`Invalid Credentials! Attempt ${nextFails}/5 before temporary lock.`);
        document.getElementById("pwdIn")?.focus();
      }
    } else {
      playSuccessChime();
    }
  };

  return (
    <div
      className={`flex h-screen items-center justify-center p-4 ${
        isDark ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900"
      } relative overflow-hidden`}
    >
      {/* Background ambient light orbs */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none animate-float"></div>
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl pointer-events-none"></div>

      <div
        className={`glass-card ${
          isDark ? "text-white" : "text-slate-800"
        } p-8 md:p-12 rounded-3xl shadow-2xl w-full max-w-sm text-center border relative z-10 backdrop-blur-2xl animate-fade-in space-y-5`}
      >
        <div className="flex justify-center mb-1">
          <MpsLogo />
        </div>

        <div>
          <h2 className="text-xl md:text-2xl font-black tracking-wider text-slate-900 dark:text-white">
            MPS LOGISTICS
          </h2>
          <p className="text-[10px] uppercase tracking-widest font-extrabold text-indigo-500 mt-0.5">
            Enterprise ERP Anti-Gravity Terminal
          </p>
        </div>

        {err ? (
          <p className="text-rose-500 font-bold text-xs p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 animate-fade-in">
            {err}
          </p>
        ) : (
          <div className="h-2"></div>
        )}

        <div className="space-y-3">
          <input
            id="userIn"
            disabled={lockoutTimer > 0}
            onKeyDown={e => (e.key === "Enter" ? document.getElementById("pwdIn")?.focus() : null)}
            value={u}
            onChange={e => {
              setU(e.target.value);
              setErr("");
            }}
            placeholder="User Identifier (e.g. superadmin)"
            className="w-full border p-3.5 rounded-2xl text-center font-bold outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-black/5 dark:bg-white/5 border-slate-300 dark:border-slate-700 transition-all disabled:opacity-50"
          />
          <input
            id="pwdIn"
            disabled={lockoutTimer > 0}
            onKeyDown={e => e.key === "Enter" && handleSub()}
            value={p}
            onChange={e => {
              setP(e.target.value);
              setErr("");
            }}
            type="password"
            placeholder="Security Passcode (e.g. 123)"
            className="w-full border p-3.5 rounded-2xl text-center font-bold outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-black/5 dark:bg-white/5 border-slate-300 dark:border-slate-700 transition-all disabled:opacity-50"
          />
        </div>

        <button
          onClick={handleSub}
          disabled={lockoutTimer > 0}
          className={`w-full font-black py-3.5 rounded-2xl shadow-lg transition-all text-sm tracking-wide ${
            lockoutTimer > 0
              ? "bg-slate-700 text-slate-400 cursor-not-allowed"
              : "bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:-translate-y-0.5 active:translate-y-0"
          }`}
        >
          {lockoutTimer > 0 ? `Locked (${lockoutTimer}s) ⏳` : "Authenticate & Access Server ➔"}
        </button>

        <div className="pt-2 text-[10px] opacity-60 font-semibold space-y-0.5">
          <p>
            Default Superadmin: <span className="font-mono font-bold text-indigo-400">superadmin</span> /{" "}
            <span className="font-mono font-bold text-indigo-400">123</span>
          </p>
          <p>
            Branch Admin: <span className="font-mono font-bold text-indigo-400">admin</span> /{" "}
            <span className="font-mono font-bold text-indigo-400">123</span>
          </p>
        </div>
      </div>
    </div>
  );
}
