import { BRANCH_CONFIG } from "../constants";

// 🔥 PERMANENT FUTURE-PROOF LR GENERATOR 🔥
export const generateLR = (fromCity, toCity, allParcels) => {
  if (!fromCity || !toCity) return `MPS${String(Math.floor(Math.random() * 1000)).padStart(6, "0")}`;
  const fCode = BRANCH_CONFIG[fromCity] || "00";
  const tCode = BRANCH_CONFIG[toCity] || "00";
  const fromPrefix = `${fCode}/${tCode}/`;
  let max = 0;

  if (allParcels && allParcels.length > 0) {
    allParcels.forEach(p => {
      if (p.id && p.id.startsWith(fromPrefix)) {
        const parts = p.id.split("/");
        if (parts.length === 3) {
          const rawSeq = parts[2];
          const num = parseInt(rawSeq, 10);
          if (!isNaN(num) && rawSeq.length !== 6 && num > max) {
            max = num;
          }
        }
      }
    });
  }
  return `${fCode}/${tCode}/${String(max + 1).padStart(4, "0")}`;
};

export function calcPrice(from, to, ratePerUnit, count = 1, type = "Box", paymentMode = "Paid", size = "Standard") {
  if (paymentMode === "FOC") return 0;
  if (!ratePerUnit || ratePerUnit <= 0) return 0;
  let rate = parseFloat(ratePerUnit);

  let sizeMultiplier = 1;
  if (size === "Medium") sizeMultiplier = 1.5;
  if (size === "Large") sizeMultiplier = 2.0;
  if (size === "Jumbo") sizeMultiplier = 3.0;

  let tc = 0;
  if (type === "Electronics") tc = 60;
  if (type === "Furniture") tc = 150;
  if (type === "Medical") tc = 40;
  if (type === "Machinery") tc = 120;
  if (type === "Glassware") tc = 80;

  return Math.round(rate * sizeMultiplier * (parseInt(count) || 1) + tc);
}

export function numberToWords(num) {
  const a = [
    "",
    "One ",
    "Two ",
    "Three ",
    "Four ",
    "Five ",
    "Six ",
    "Seven ",
    "Eight ",
    "Nine ",
    "Ten ",
    "Eleven ",
    "Twelve ",
    "Thirteen ",
    "Fourteen ",
    "Fifteen ",
    "Sixteen ",
    "Seventeen ",
    "Eighteen ",
    "Nineteen "
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  if ((num = num.toString()).length > 9) return "Overflow";
  let n = ("000000000" + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return;
  let str = "";
  str += n[1] != 0 ? (a[Number(n[1])] || b[n[1][0]] + " " + a[n[1][1]]) + "Crore " : "";
  str += n[2] != 0 ? (a[Number(n[2])] || b[n[2][0]] + " " + a[n[2][1]]) + "Lakh " : "";
  str += n[3] != 0 ? (a[Number(n[3])] || b[n[3][0]] + " " + a[n[3][1]]) + "Thousand " : "";
  str += n[4] != 0 ? (a[Number(n[4])] || b[n[4][0]] + " " + a[n[4][1]]) + "Hundred " : "";
  str += n[5] != 0 ? (str != "" ? "and " : "") + (a[Number(n[5])] || b[n[5][0]] + " " + a[n[5][1]]) + "Only" : "Only";
  return str.toUpperCase();
}
