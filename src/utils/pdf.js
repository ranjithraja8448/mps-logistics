import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { numberToWords, formatINR } from "./pricing";

export function drawReceipt(doc, p, startY) {
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.rect(10, startY, 190, 93);

  doc.line(10, startY + 20, 200, startY + 20);
  doc.line(10, startY + 26, 200, startY + 26);
  doc.line(10, startY + 50, 145, startY + 50);
  doc.line(10, startY + 56, 145, startY + 56);
  doc.line(145, startY + 68, 200, startY + 68);
  doc.line(10, startY + 76, 200, startY + 76);

  doc.line(145, startY, 145, startY + 76);
  doc.line(175, startY + 20, 175, startY + 76);
  doc.line(77, startY + 20, 77, startY + 50);
  doc.line(16, startY + 26, 16, startY + 50);
  doc.line(83, startY + 26, 83, startY + 50);

  doc.line(22, startY + 50, 22, startY + 76);
  doc.line(95, startY + 50, 95, startY + 76);
  doc.line(110, startY + 50, 110, startY + 76);
  doc.line(125, startY + 50, 125, startY + 76);

  doc.line(77, startY + 76, 77, startY + 93);
  doc.line(145, startY + 76, 145, startY + 93);

  doc.setFont("helvetica", "bolditalic");
  doc.setFontSize(22);
  doc.text("MPS", 12, startY + 14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("MECHERI", 36, startY + 10);
  doc.text("PARCEL SERVICE", 36, startY + 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text("• WE DELIVER TRUST •", 42, startY + 19);

  const centerX = 107;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("GSTIN : 33CICPS6965E1Z1", centerX, startY + 6, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text("Dharmapuri Main Road, Mecheri, Salem-Dt.", centerX, startY + 10, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.text("90033 77185 / 80726 72255", centerX, startY + 14, { align: "center" });

  doc.setFontSize(9);
  doc.text(`LR. NO.  :  ${p.id}`, 147, startY + 6);
  doc.text(`Date     :  ${p.date}`, 147, startY + 12);
  doc.text(`Pay Mode:  ${p.payment}`, 147, startY + 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`From : ${p.from}`, 12, startY + 24);
  doc.text(`To : ${p.to}`, 79, startY + 24);
  doc.text("Particulars", 152, startY + 24);
  doc.text("Amount", 182, startY + 24);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("Consignor", 14, startY + 45, { angle: 90 });
  doc.text("Consignee", 81, startY + 45, { angle: 90 });

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Tel : ${p.sPhone}`, 18, startY + 32);
  doc.text(`GST : ${p.sGst || ""}`, 18, startY + 38);
  doc.setFont("helvetica", "bold");
  doc.text(p.sName, 18, startY + 46);
  doc.setFont("helvetica", "normal");
  doc.text(`Tel : ${p.rPhone}`, 85, startY + 32);
  doc.text(`GST : ${p.rGst || ""}`, 85, startY + 38);
  doc.setFont("helvetica", "bold");
  doc.text(p.rName, 85, startY + 46);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  const particulars = ["Freight", "Hamali", "Fuel Sur", "Docket", "Collection", "Others"];
  particulars.forEach((item, i) => {
    doc.text(item, 147, startY + 31 + i * 6);
  });
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`Rs. ${p.price}`, 178, startY + 31);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Qty", 12, startY + 54);
  doc.text("Description (Cargo)", 40, startY + 54);
  doc.text("Value", 98, startY + 54);
  doc.text("Weight", 112, startY + 54);
  doc.text("Private Mark", 127, startY + 54);

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  const cList =
    p.cargoList && p.cargoList.length > 0
      ? p.cargoList
      : [{ count: p.count, type: p.type, size: p.size, weight: p.actualWeight }];

  cList.slice(0, 3).forEach((item, idx) => {
    const yPos = startY + 61 + idx * 6;
    doc.text(`${item.count}`, 14, yPos);
    doc.text(`${item.type} ${item.size && item.size !== "Standard" ? `(${item.size})` : ""}`, 24, yPos);
    doc.text(`${item.weight || "-"}`, 115, yPos);
  });

  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.text("Door Delivery Ground Floor Only", 96, startY + 74);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Total", 155, startY + 74);
  doc.text(`Rs. ${p.price}`, 178, startY + 74);

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("GSTIN Payable by :", 13, startY + 81);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.rect(13, startY + 84, 2, 2);
  doc.text("Consignor", 17, startY + 86);
  doc.rect(35, startY + 84, 2, 2);
  doc.text("Consignee", 39, startY + 86);
  if (p.payment === "Paid" || p.payment === "Credit" || p.payment === "FOC") doc.text("X", 13.2, startY + 85.8);
  if (p.payment === "To Pay") doc.text("X", 35.2, startY + 85.8);

  doc.setFontSize(7);
  doc.text("Consignee Signature", 85, startY + 81);
  doc.text("For Mecheri Parcel Service", 152, startY + 81);
}

export function generatePDF(p, layout = 1) {
  const doc = new jsPDF();
  if (layout === 1) {
    drawReceipt(doc, p, 10);
  } else if (layout === 2) {
    drawReceipt(doc, p, 10);
    drawReceipt(doc, p, 110);
  } else if (layout === 3) {
    drawReceipt(doc, p, 10);
    drawReceipt(doc, p, 105);
    drawReceipt(doc, p, 200);
  }
  window.open(doc.output("bloburl"), "_blank");
}

export function generateEOD_PDF(dateStr, branch, parcelsList, pettyList) {
  const doc = new jsPDF();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("END OF DAY (EOD) SETTLEMENT", 105, 15, { align: "center" });
  doc.setFontSize(10);
  doc.text(`Branch: ${branch} | Date: ${dateStr}`, 105, 22, { align: "center" });
  doc.line(10, 25, 200, 25);
  let y = 32;
  doc.setFontSize(10);
  doc.text("Cash Collections (Paid Booking & Delivered To-Pay):", 10, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  let totalCash = 0;
  parcelsList.forEach(p => {
    const pDate = p.isoDate ? p.isoDate.split("T")[0] : "";
    if (
      (p.from === branch && p.payment === "Paid" && pDate === dateStr) ||
      (p.to === branch && p.payment === "To Pay" && p.status === "Delivered" && p.deliveryMode === "Cash" && pDate === dateStr)
    ) {
      doc.text(`LR: ${p.id} | Rs. ${p.price} | Mode: ${p.payment}`, 10, y);
      totalCash += p.price;
      y += 6;
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
    }
  });
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.text(`Total Cash Collected: Rs. ${totalCash}`, 10, y);
  y += 10;
  doc.line(10, y, 200, y);
  y += 6;
  doc.text("Petty Cash Expenses Today:", 10, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  let totalExp = 0;
  pettyList.forEach(pt => {
    if (pt.date === dateStr) {
      doc.text(`${pt.desc} - Rs. ${pt.amt}`, 10, y);
      totalExp += pt.amt;
      y += 6;
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
    }
  });
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.text(`Total Expenses: Rs. ${totalExp}`, 10, y);
  y += 12;
  doc.setFontSize(12);
  doc.text(`NET CASH TO HANDOVER: Rs. ${totalCash - totalExp}`, 10, y);
  doc.line(10, y + 4, 200, y + 4);

  window.open(doc.output("bloburl"), "_blank");
}

export function generateInvoicePDF(
  customer,
  customerPhone,
  customerGst,
  fromD,
  toD,
  parcelsList,
  manualInvoiceNo,
  manualInvDate,
  gstPercent
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10;

  const cleanParty = str => {
    if (!str) return "-";
    return str.replace(/["']/g, "").replace(/\s+/g, " ").trim();
  };

  const formatDisplayDate = dStr => {
    if (!dStr) return "";
    if (typeof dStr === "string" && dStr.includes("-")) {
      const parts = dStr.split("T")[0].split("-");
      if (parts.length === 3) {
        const day = parseInt(parts[2], 10);
        const month = parseInt(parts[1], 10);
        return `${day}/${month}/${parts[0]}`;
      }
    }
    return dStr;
  };

  const getDisplayBookingDate = p => {
    if (p.date) return p.date;
    if (p.isoDate) return formatDisplayDate(p.isoDate);
    return "";
  };

  const formatAmount = val => {
    const num = Number(val) || 0;
    return num % 1 === 0 ? String(num) : num.toFixed(2);
  };

  let partyName = customer || "N/A";
  let gstText = customerGst ? customerGst.trim().toUpperCase() : "";
  if (partyName.toUpperCase().includes("SAI SILKS")) {
    partyName = "SAI SILKS KALAMANDIR LIMITED";
    if (!gstText) gstText = "33AMCS1175P1ZU";
  }

  const invoiceNo = manualInvoiceNo || "N/A";
  const printDate = manualInvDate
    ? formatDisplayDate(manualInvDate)
    : new Date().toLocaleDateString("en-IN");

  const billingRangeText = `${fromD || "Start"} to ${toD || "End"}`;

  // 1. Clean Header (MPS Parcel Service)
  let curY = 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(0, 0, 0);
  doc.text("MPS Parcel Service", pageWidth / 2, curY, { align: "center" });

  curY += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text(
    "Address : Dharmapuri Main Road, Mecheri, Salem-Dt. 636 451. GST : 33CICPS6965E1Z1",
    pageWidth / 2,
    curY,
    { align: "center" }
  );

  curY += 4.5;
  doc.text("Phone Number : 90033 77185 / 80726 72255", pageWidth / 2, curY, { align: "center" });

  curY += 9;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13.5);
  doc.text("INVOICE", pageWidth / 2, curY, { align: "center" });

  // 2. Customer & Invoice Metadata (Two Clean Columns, No Color Boxes)
  curY += 9;
  const metaStartY = curY;
  const leftX = margin + 4;
  const rightX = 145;

  // Left Column: Customer info
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0);
  doc.text("Party Name : ", leftX, curY);
  const pNamePrefixW = doc.getTextWidth("Party Name : ");
  doc.text(partyName.toUpperCase(), leftX + pNamePrefixW, curY);

  curY += 5;
  doc.text("Phone No : ", leftX, curY);
  const phonePrefixW = doc.getTextWidth("Phone No : ");
  doc.setFont("helvetica", "normal");
  doc.text(customerPhone || "-", leftX + phonePrefixW, curY);

  if (gstText) {
    curY += 5;
    doc.setFont("helvetica", "bold");
    doc.text("GSTIN : ", leftX, curY);
    const gstPrefixW = doc.getTextWidth("GSTIN : ");
    doc.text(gstText, leftX + gstPrefixW, curY);
  }

  curY += 7;
  doc.setFont("helvetica", "bold");
  doc.text("Billing Period : ", leftX, curY);
  const bpPrefixW = doc.getTextWidth("Billing Period : ");
  doc.setFont("helvetica", "normal");
  doc.text(billingRangeText, leftX + bpPrefixW, curY);

  // Right Column: Invoice Number & Date
  doc.setFont("helvetica", "bold");
  doc.text("Invoice no.: ", rightX, metaStartY);
  const invNoPrefixW = doc.getTextWidth("Invoice no.: ");
  doc.setFont("helvetica", "normal");
  doc.text(invoiceNo, rightX + invNoPrefixW, metaStartY);

  doc.setFont("helvetica", "bold");
  doc.text("Invoice Date: ", rightX, metaStartY + 5);
  const invDatePrefixW = doc.getTextWidth("Invoice Date: ");
  doc.setFont("helvetica", "normal");
  doc.text(printDate, rightX + invDatePrefixW, metaStartY + 5);

  curY += 7;

  // 3. Table Columns & Data Preparation
  const tableColumn = [
    "S.No",
    "LR Number",
    "Booking Date",
    "Consignor",
    "Consignee",
    "Packages",
    "Amount"
  ];
  let totalAmount = 0;
  let totalPackages = 0;

  const sortedParcels = [...parcelsList].sort((a, b) => {
    const d1 = a.isoDate ? new Date(a.isoDate) : 0;
    const d2 = b.isoDate ? new Date(b.isoDate) : 0;
    if (d1 - d2 !== 0) return d1 - d2;
    return (a.id || "").localeCompare(b.id || "");
  });

  const tableRows = sortedParcels.map((p, index) => {
    const price = Number(p.price) || 0;
    const qty = Number(p.count) || 1;
    totalAmount += price;
    totalPackages += qty;

    const pkgType = p.type && p.type.trim() ? p.type.trim() : "Box";
    const packagesDisplay = `${qty} ${pkgType}`;

    return [
      index + 1,
      p.id,
      getDisplayBookingDate(p),
      cleanParty(p.sName),
      cleanParty(p.rName),
      packagesDisplay,
      formatAmount(price)
    ];
  });

  // GST Calculation (if applied)
  const gstRate = Number(gstPercent) || 0;
  const gstAmount = Math.round((totalAmount * gstRate) / 100);
  const grandTotal = totalAmount + gstAmount;

  if (gstRate > 0) {
    tableRows.push(["Sub-Total", "", "", "", "", totalPackages.toString(), formatAmount(totalAmount)]);
    tableRows.push([`Add GST (${gstRate}%)`, "", "", "", "", "", formatAmount(gstAmount)]);
    tableRows.push(["Grand Total", "", "", "", "", totalPackages.toString(), formatAmount(grandTotal)]);
  } else {
    tableRows.push(["Total", "", "", "", "", totalPackages.toString(), formatAmount(totalAmount)]);
  }

  // Draw Table with pure clean minimal grid
  autoTable(doc, {
    startY: curY,
    margin: { left: margin, right: margin, top: 14, bottom: 15 },
    head: [tableColumn],
    body: tableRows,
    showHead: "everyPage",
    theme: "grid",
    styles: {
      cellPadding: { top: 1.5, bottom: 1.5, left: 1.5, right: 1.5 },
      fontSize: 7.5,
      lineColor: [210, 210, 210],
      lineWidth: 0.12,
      textColor: [0, 0, 0]
    },
    headStyles: {
      fillColor: [245, 245, 245],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
      cellPadding: { top: 2, bottom: 2, left: 1.5, right: 1.5 },
      lineWidth: 0.15,
      lineColor: [180, 180, 180]
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255]
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { halign: "center", fontStyle: "bold", cellWidth: 25 },
      2: { halign: "center", cellWidth: 23 },
      3: { halign: "left", cellWidth: 46 },
      4: { halign: "left", cellWidth: 46 },
      5: { halign: "center", cellWidth: 20 },
      6: { halign: "right", fontStyle: "bold", cellWidth: 20 }
    },
    willDrawCell: function (data) {
      if (data.row.index >= sortedParcels.length) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [245, 245, 245];
        data.cell.styles.textColor = [0, 0, 0];
      }
    }
  });

  let finalY = (doc.lastAutoTable?.finalY || curY) + 6;
  const footerHeight = 44;

  // Add new page only if remaining space is insufficient for the footer
  if (finalY + footerHeight > pageHeight - 12) {
    doc.addPage();
    finalY = 16;
  }

  // 4. Net Payable Amount in Words
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  const wordsText = grandTotal === 0 ? "ZERO ONLY" : numberToWords(grandTotal) || "ZERO ONLY";
  doc.text(`Net Payable Amount : RUPEES ${wordsText}`, margin, finalY);

  // 5. Print DateTime
  finalY += 6.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);
  doc.text(`Print DateTime : ${new Date().toLocaleString("en-IN")}`, margin, finalY);

  // 6. Remark
  finalY += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("Remark : ", margin, finalY);
  const rmkPrefixW = doc.getTextWidth("Remark : ");
  doc.setFont("helvetica", "normal");
  doc.text(
    "Respected and Dear Valued Customer, Kindly ensure to make the payment earliest.",
    margin + rmkPrefixW,
    finalY
  );

  // 7. Bank Details (Plain Clean Text, No Boxes)
  finalY += 7.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text("Bank Details for Payment:", margin, finalY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("Bank Name : Tamilnad Mercantile Bank (TMB)", margin, finalY + 4.5);
  doc.text("A/C Name  : MECHERI PARCEL SERVICE", margin, finalY + 9);
  doc.text("A/C No    : 287150050800853", margin, finalY + 13.5);
  doc.text("IFSC Code : TMBL0000287", margin, finalY + 18);

  window.open(doc.output("bloburl"), "_blank");
}

export function generateListPDF(title, branch, parcelsList) {
  const doc = new jsPDF();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(`MPS - ${title}`, 105, 15, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Branch: ${branch} | Print Date: ${new Date().toLocaleString("en-IN")}`, 105, 22, { align: "center" });

  const tableColumn = ["S.No", "LR Number", "Date", "Route", "Customer (Sender -> Receiver)", "Cargo", "Amount"];
  const tableRows = [];
  let totalQty = 0,
    totalAmt = 0;

  parcelsList.forEach((p, index) => {
    tableRows.push([
      index + 1,
      p.id,
      p.date,
      `${p.from} -> ${p.to}`,
      `${p.sName} -> ${p.rName}`,
      `${p.count} ${p.type}`,
      `Rs.${p.price} (${p.payment})`
    ]);
    totalQty += Number(p.count) || 0;
    totalAmt += Number(p.price) || 0;
  });

  tableRows.push(["TOTAL", "", "", "", "", `${totalQty} Items`, `Rs.${totalAmt}`]);

  autoTable(doc, {
    startY: 28,
    head: [tableColumn],
    body: tableRows,
    theme: "grid",
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "center"
    },
    bodyStyles: { fontSize: 7, textColor: [0, 0, 0] },
    columnStyles: {
      0: { halign: "center" },
      2: { halign: "center" },
      5: { halign: "center" },
      6: { halign: "right", fontStyle: "bold" }
    },
    willDrawCell: function (data) {
      if (data.row.index === tableRows.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [224, 231, 255];
      }
    }
  });
  window.open(doc.output("bloburl"), "_blank");
}

export function exportToCSV(title, parcelsList) {
  if (parcelsList.length === 0) return alert("No data to export!");
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
  const rows = parcelsList.map(p =>
    [p.id, p.date, p.sName, p.rName, p.from, p.to, p.payment, p.price, p.status, p.bookedBy].join(",")
  );
  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `MPS_${title}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function openWhatsApp(phone, isSender, p) {
  const targetPhone = phone || (isSender ? p?.sPhone : p?.rPhone) || "";
  const cleanPhone = (targetPhone || "").replace(/\D/g, "").slice(-10);
  if (!cleanPhone || cleanPhone.length !== 10) {
    alert("Invalid 10-digit mobile number for WhatsApp dispatch!");
    return;
  }

  // Cargo items breakdown
  let cargoSection = `📦 *Cargo Manifest:* ${p?.count || "1"} ${p?.type || "Box"}`;
  if (p?.cargoList && p.cargoList.length > 0) {
    const listText = p.cargoList
      .map(
        c =>
          `   • ${c.count} × ${c.type}${c.size && c.size !== "Standard" ? ` (${c.size})` : ""}${
            c.weight ? ` - ${c.weight} kg` : ""
          }`
      )
      .join("\n");
    cargoSection = `📦 *Cargo Manifest (${p.count || p.cargoList.length} Items Total):*\n${listText}`;
  }

  // Delivery status / Handover info
  let deliverySection = "";
  if (p?.status === "Delivered") {
    deliverySection =
      `\n✅ *Delivery Status:* Delivered\n` +
      `🤝 *Delivered By:* ${p.deliveredBy || "Staff"} (${p.deliveredBranch || p.to || ""})\n` +
      `💳 *Settlement Mode:* ${p.deliveryMode || p.payment || "Cash"}`;
  } else {
    deliverySection = `\n📊 *Status:* ${p?.status || "Booked"}`;
  }

  const text =
    `🚚 *MPS LOGISTICS & PARCEL SERVICE*\n` +
    `_Consignment Booking & Tracking Manifest_\n` +
    `══════════════════════════\n` +
    `📑 *LR Manifest No:* *${p?.id || "N/A"}*\n` +
    `📅 *Booking Date:* ${p?.date || new Date().toLocaleDateString("en-IN")}\n` +
    `🏢 *Booking Station:* ${p?.bookedBranch || p?.from || "-"} (Staff: ${p?.bookedBy || "Counter"})\n` +
    `══════════════════════════\n` +
    `📤 *Consignor (Sender):*\n` +
    `   *${p?.sName || "Sender"}*\n` +
    `   📞 ${p?.sPhone || "-"}${p?.sGst ? `\n   GSTIN: ${p.sGst}` : ""}\n\n` +
    `📥 *Consignee (Receiver):*\n` +
    `   *${p?.rName || "Receiver"}*\n` +
    `   📞 ${p?.rPhone || "-"}${p?.rGst ? `\n   GSTIN: ${p.rGst}` : ""}\n` +
    `══════════════════════════\n` +
    `📍 *Route:* *${p?.from || "-"}* ➔ *${p?.to || "-"}*\n` +
    `${cargoSection}\n` +
    (p?.actualWeight ? `⚖️ *Total Weight:* ${p.actualWeight} kg\n` : "") +
    (p?.eway ? `⚡ *E-Way Bill:* ${p.eway}\n` : "") +
    `══════════════════════════\n` +
    `💰 *Freight Total:* *₹${p?.price || 0}*\n` +
    `💳 *Payment Type:* *${p?.payment || "Paid"}*${p?.creditCustomer ? ` (A/C: ${p.creditCustomer})` : ""}` +
    `${deliverySection}\n` +
    `══════════════════════════\n` +
    `🙏 *Thank you for choosing MPS Logistics!*\n` +
    `Reliable Daily Cargo Services Across Tamil Nadu.`;

  window.open(`https://api.whatsapp.com/send?phone=91${cleanPhone}&text=${encodeURIComponent(text)}`, "_blank");
}

export function shareEOD_WhatsApp(eodDate, eodBranch, summary, targetPhone = "") {
  const cleanTarget = (targetPhone || "").replace(/\D/g, "").slice(-10);
  const text = `📊 *MPS LOGISTICS — DAILY EOD DAY-BOOK SUMMARY*\n` +
    `📅 *Date:* ${eodDate}\n` +
    `🏢 *Branch Station:* ${eodBranch}\n` +
    `═══════════════════════════════\n` +
    `📦 *Booked Consignments:* ${summary.bookedCount || 0}\n` +
    `🤝 *Delivered Consignments:* ${summary.delCount || 0}\n` +
    `💰 *Cash Paid Collections:* ₹${(summary.paidAmt || 0).toLocaleString()}\n` +
    `💵 *To-Pay Cash Collected:* ₹${(summary.toPayCollected || 0).toLocaleString()}\n` +
    `🪙 *Total Cash in Hand:* ₹${(summary.totalCash || 0).toLocaleString()}\n` +
    `💳 *Corporate Credit Value:* ₹${(summary.creditAmt || 0).toLocaleString()}\n` +
    `═══════════════════════════════\n` +
    `⚡ Generated automatically via MPS Anti-Gravity ERP.`;

  const phoneQuery = cleanTarget ? `phone=91${cleanTarget}&` : "";
  window.open(`https://api.whatsapp.com/send?${phoneQuery}text=${encodeURIComponent(text)}`, "_blank");
}

export function generateThermalLabelPDF(p) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [50, 75]
  });

  // Dark brand header
  doc.setFillColor(15, 23, 42);
  doc.rect(2, 2, 71, 9, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("MPS PARCEL SERVICE", 37.5, 7.5, { align: "center" });

  // LR Number prominently centered
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(13);
  doc.text(p.id || "LR-XXXX", 37.5, 17, { align: "center" });

  // Route
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`${p.from}  ➔  ${p.to}`, 37.5, 22, { align: "center" });

  // Divider
  doc.setLineWidth(0.3);
  doc.line(4, 24, 71, 24);

  // Consignor & Consignee details
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`Sender: ${(p.sName || "").slice(0, 18)} (${p.sPhone || ""})`, 4, 28);
  doc.text(`Receiver: ${(p.rName || "").slice(0, 18)} (${p.rPhone || ""})`, 4, 32);

  doc.text(`Cargo: ${p.count} ${p.type} | Wt: ${p.actualWeight || "-"} Kg`, 4, 36);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(`Amt: ₹${p.price} [${p.payment}]`, 4, 41);
  doc.text(`Date: ${p.date || new Date().toLocaleDateString("en-IN")}`, 45, 41);

  // Outer border
  doc.setLineWidth(0.4);
  doc.rect(2, 2, 71, 46);

  doc.save(`MPS_Label_${p.id}.pdf`);
}

export function generateTripSheetPDF(tripInfo, parcelList) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Header
  doc.setFillColor(15, 23, 42); // dark navy
  doc.rect(0, 0, pageWidth, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("MPS LOGISTICS - OUTWARD TRIP MANIFEST (OGPL)", 14, 12);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Head Office: Dharmapuri Main Road, Mecheri, Salem-Dt. | Ph: 90033 77185 / 80726 72255", 14, 18);
  doc.text(`Manifest Generated: ${new Date().toLocaleString("en-IN")}`, 14, 23);

  // Metadata Card
  doc.setDrawColor(200);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 32, pageWidth - 28, 24, 2, 2, "FD");

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`Origin: ${tripInfo.originBranch || "Mecheri"}`, 18, 39);
  doc.text(`Destination: ${tripInfo.destinationBranch || "All"}`, 80, 39);
  doc.text(`Trip Date: ${tripInfo.tripDate || new Date().toISOString().split("T")[0]}`, 140, 39);

  doc.text(`Vehicle No: ${tripInfo.vehicleNo || "N/A"}`, 18, 48);
  doc.text(`Driver: ${tripInfo.driverName || "N/A"} (${tripInfo.driverPhone || "N/A"})`, 80, 48);
  doc.text(`Total LRs: ${parcelList.length}`, 140, 48);

  // Table rows
  let totalArticles = 0;
  let totalToPayCash = 0;
  let totalPaidValue = 0;
  let totalCreditValue = 0;

  const rows = parcelList.map((p, idx) => {
    const qty = Number(p.count) || 1;
    const amt = Number(p.price) || 0;
    totalArticles += qty;
    if (p.payment === "To Pay") totalToPayCash += amt;
    else if (p.payment === "Paid") totalPaidValue += amt;
    else if (p.payment === "Credit") totalCreditValue += amt;

    return [
      idx + 1,
      p.id,
      p.date || "",
      `${p.from} ➔ ${p.to}`,
      `${p.sName || ""} (${p.sPhone || ""})\n➔ ${p.rName || ""} (${p.rPhone || ""})`,
      `${qty} ${p.type || "Box"}`,
      p.payment,
      p.payment === "To Pay" ? `Rs. ${amt}` : "Rs. 0",
      ""
    ];
  });

  autoTable(doc, {
    startY: 60,
    head: [["#", "LR Number", "Date", "Route", "Consignor ➔ Consignee", "Qty & Type", "Mode", "ToPay (Rs)", "Receiver Sign"]],
    body: rows,
    theme: "grid",
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8,
      halign: "center"
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59]
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 26, fontStyle: "bold" },
      2: { cellWidth: 16 },
      3: { cellWidth: 24, fontStyle: "bold" },
      4: { cellWidth: 42 },
      5: { cellWidth: 18, halign: "center", fontStyle: "bold" },
      6: { cellWidth: 14, halign: "center" },
      7: { cellWidth: 18, halign: "right", fontStyle: "bold" },
      8: { cellWidth: 20 }
    }
  });

  const finalY = (doc.lastAutoTable?.finalY || 160) + 8;

  // Summary box
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, finalY, pageWidth - 28, 22, 2, 2, "FD");

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(`Total LRs: ${parcelList.length}`, 18, finalY + 7);
  doc.text(`Total Cargo Articles: ${totalArticles} Items`, 65, finalY + 7);
  doc.text(`To-Pay Cash to Collect: Rs. ${totalToPayCash.toLocaleString()}`, 130, finalY + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Prepaid Value: Rs. ${totalPaidValue.toLocaleString()}  |  Credit Value: Rs. ${totalCreditValue.toLocaleString()}`, 18, finalY + 16);

  // Signature Blocks
  const sigY = finalY + 36;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Driver Signature", 24, sigY);
  doc.line(20, sigY - 2, 60, sigY - 2);

  doc.text("Godown Incharge (Loaded By)", 85, sigY);
  doc.line(80, sigY - 2, 135, sigY - 2);

  doc.text("Destination Branch Receiver", 150, sigY);
  doc.line(145, sigY - 2, 195, sigY - 2);

  doc.save(`TripSheet_${tripInfo.originBranch}_to_${tripInfo.destinationBranch}_${tripInfo.vehicleNo || "Veh"}.pdf`);
}

export function exportGSTR1_CSV(parcels, fromDate, toDate) {
  const filtered = parcels.filter(p => {
    if (p.status === "Deleted") return false;
    const pDate = p.isoDate ? p.isoDate.split("T")[0] : "";
    if (fromDate && pDate < fromDate) return false;
    if (toDate && pDate > toDate) return false;
    return true;
  });

  if (filtered.length === 0) return false;

  const headers = [
    "GSTIN/UIN of Recipient",
    "Receiver Name",
    "Invoice Number",
    "Invoice Date",
    "Invoice Value",
    "Place Of Supply",
    "Reverse Charge",
    "Applicable % of Tax Rate",
    "Invoice Type",
    "E-Commerce GSTIN",
    "Rate (%)",
    "Taxable Value",
    "Cess Amount",
    "Sender GSTIN",
    "Sender Name",
    "Payment Mode"
  ];

  const rows = filtered.map(p => {
    const totalVal = Number(p.price) || 0;
    const taxRate = 5;
    const taxableVal = +(totalVal / 1.05).toFixed(2);
    const rGst = p.rGst && p.rGst.trim().length >= 10 ? p.rGst.trim().toUpperCase() : "URP";
    const sGst = p.sGst && p.sGst.trim().length >= 10 ? p.sGst.trim().toUpperCase() : "URP";

    return [
      `"${rGst}"`,
      `"${(p.rName || "").replace(/"/g, '""')}"`,
      `"${p.id}"`,
      `"${p.date || ""}"`,
      totalVal,
      `"33-Tamil Nadu"`,
      `"N"`,
      `""`,
      `"Regular"`,
      `""`,
      taxRate,
      taxableVal,
      0,
      `"${sGst}"`,
      `"${(p.sName || "").replace(/"/g, '""')}"`,
      `"${p.payment}"`
    ].join(",");
  });

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `GSTR1_Report_${fromDate || "Start"}_to_${toDate || "End"}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return true;
}

