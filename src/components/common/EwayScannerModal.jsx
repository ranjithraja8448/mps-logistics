import { useEffect } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

export default function EwayScannerModal({ onScan, onClose }) {
  useEffect(() => {
    const config = { fps: 10, qrbox: { width: 250, height: 250 }, videoConstraints: { facingMode: "environment" } };
    const scanner = new Html5QrcodeScanner("qr-reader", config, false);
    scanner.render(
      decodedText => {
        scanner.clear().catch(() => {});
        onScan(decodedText);
      },
      () => {
        // Ignored frame-level scan misses
      }
    );
    return () => {
      scanner.clear().catch(err => console.debug("Scanner cleanup:", err));
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-[250] p-4 animate-fade-in">
      <div className="glass-card bg-slate-900/90 border border-white/20 text-white p-6 rounded-3xl w-full max-w-sm shadow-2xl space-y-4">
        <div className="flex justify-between items-center border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">📷</span>
            <h3 className="font-black text-lg">Scan E-Way QR</h3>
          </div>
          <button
            onClick={onClose}
            className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 px-3 py-1.5 rounded-xl font-bold text-xs transition-colors"
          >
            Close ✕
          </button>
        </div>
        <div id="qr-reader" className="w-full overflow-hidden rounded-2xl border-2 border-indigo-500/40 bg-black"></div>
        <p className="text-center text-xs font-semibold opacity-70 text-slate-300">
          Point your camera at the printed E-Way Bill barcode or QR code.
        </p>
      </div>
    </div>
  );
}
