import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { numberToWords } from "./pricing";

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
  const margin = 14;

  const formatDisplayDate = dStr => {
    if (!dStr) return "";
    if (typeof dStr === "string" && dStr.includes("-")) {
      const parts = dStr.split("T")[0].split("-");
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dStr;
  };

  const invoiceNo = manualInvoiceNo || "N/A";
  const printDate = manualInvDate
    ? formatDisplayDate(manualInvDate)
    : new Date().toLocaleDateString("en-IN");

  const billingRangeText = `${formatDisplayDate(fromD) || "Start"} to ${formatDisplayDate(toD) || "End"}`;

  // Company Brand Header
  let curY = 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text("MPS PARCEL SERVICE", pageWidth / 2, curY, { align: "center" });

  curY += 4.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    "Dharmapuri Main Road, Mecheri, Salem-Dt. 636 451 | GSTIN : 33CICPS6965E1Z1",
    pageWidth / 2,
    curY,
    { align: "center" }
  );

  curY += 3.8;
  doc.text("Phone Number : 90033 77185 / 80726 72255", pageWidth / 2, curY, { align: "center" });

  curY += 2.5;
  doc.setLineWidth(0.3);
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, curY, pageWidth - margin, curY);

  curY += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("TAX INVOICE", pageWidth / 2, curY, { align: "center" });

  curY += 5;
  // Customer & Invoice Details (Two Columns)
  const leftX = margin;
  const rightX = 118;
  doc.setFontSize(8);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Customer Name  :", leftX, curY);
  doc.setFont("helvetica", "normal");
  doc.text(customer || "N/A", leftX + 26, curY);

  doc.setFont("helvetica", "bold");
  doc.text("Invoice No   :", rightX, curY);
  doc.setFont("helvetica", "normal");
  doc.text(invoiceNo, rightX + 20, curY);

  curY += 4.2;
  doc.setFont("helvetica", "bold");
  doc.text("Contact Number :", leftX, curY);
  doc.setFont("helvetica", "normal");
  doc.text(customerPhone || "-", leftX + 26, curY);

  doc.setFont("helvetica", "bold");
  doc.text("Invoice Date :", rightX, curY);
  doc.setFont("helvetica", "normal");
  doc.text(printDate, rightX + 20, curY);

  curY += 4.2;
  doc.setFont("helvetica", "bold");
  doc.text("GST Number     :", leftX, curY);
  doc.setFont("helvetica", "normal");
  doc.text(customerGst && customerGst.trim() ? customerGst.trim().toUpperCase() : "Unregistered", leftX + 26, curY);

  doc.setFont("helvetica", "bold");
  doc.text("Billing Range:", rightX, curY);
  doc.setFont("helvetica", "normal");
  doc.text(billingRangeText, rightX + 20, curY);

  curY += 3.5;

  const getCustomerName = (p, invCust) => {
    const normInv = (invCust || "").trim().toLowerCase();
    const s = (p.sName || "").trim();
    const r = (p.rName || "").trim();

    // If Sender matches invoice customer, show Receiver (the party delivered to)
    if (s && normInv && s.toLowerCase().includes(normInv)) {
      return r || s;
    }
    // If Receiver matches invoice customer, show Sender (the party who booked/sent)
    if (r && normInv && r.toLowerCase().includes(normInv)) {
      return s || r;
    }
    // If both exist and distinct
    if (r && s) {
      if (r.toLowerCase() === s.toLowerCase()) return r;
      return `${s} ➔ ${r}`;
    }
    return r || s || "-";
  };

  const tableColumn = ["S.No", "LR Number", "Date", "From", "To", "Customer Name", "Article Qty", "Amount (Rs)"];
  let totalAmount = 0;
  let totalPackages = 0;

  const sortedParcels = [...parcelsList].sort((a, b) => {
    const d1 = a.isoDate ? new Date(a.isoDate) : 0;
    const d2 = b.isoDate ? new Date(b.isoDate) : 0;
    return d1 - d2;
  });

  const tableRows = sortedParcels.map((p, index) => {
    const price = Number(p.price) || 0;
    const qty = Number(p.count) || 1;
    totalAmount += price;
    totalPackages += qty;
    return [
      index + 1,
      p.id,
      p.date || "",
      p.from || "",
      p.to || "",
      getCustomerName(p, customer),
      qty,
      price.toFixed(2)
    ];
  });

  // GST Calculation
  const gstRate = Number(gstPercent) || 0;
  const gstAmount = Math.round((totalAmount * gstRate) / 100);
  const grandTotal = totalAmount + gstAmount;

  const footRows = [];
  if (gstRate > 0) {
    footRows.push(["Sub-Total", "", "", "", "", "", `${totalPackages}`, totalAmount.toFixed(2)]);
    footRows.push([`Add GST (${gstRate}%)`, "", "", "", "", "", "", gstAmount.toFixed(2)]);
    footRows.push(["Grand Total", "", "", "", "", "", "", grandTotal.toFixed(2)]);
  } else {
    footRows.push(["Total", "", "", "", "", "", `${totalPackages}`, totalAmount.toFixed(2)]);
  }

  // Single page fitting logic (up to 32 rows fit on 1 page with compact padding)
  const isSinglePage = sortedParcels.length <= 32;
  const rowPadding = isSinglePage ? 1.05 : 1.35;
  const bodyFontSize = isSinglePage ? 7 : 7.2;

  autoTable(doc, {
    startY: curY,
    margin: { left: margin, right: margin, top: 18, bottom: 46 },
    head: [tableColumn],
    body: tableRows,
    foot: footRows,
    showFoot: "lastPage",
    showHead: "everyPage",
    theme: "grid",
    styles: {
      cellPadding: rowPadding,
      fontSize: bodyFontSize,
      lineColor: [203, 213, 225],
      lineWidth: 0.15,
      textColor: [30, 41, 59]
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: "bold",
      fontSize: 7.5,
      halign: "center",
      cellPadding: 1.5,
      lineWidth: 0.2,
      lineColor: [148, 163, 184]
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: "bold",
      fontSize: 7.5,
      cellPadding: 1.5,
      lineWidth: 0.2,
      lineColor: [148, 163, 184]
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { fontStyle: "bold", cellWidth: 24 },
      2: { halign: "center", cellWidth: 20 },
      3: { cellWidth: 22 },
      4: { cellWidth: 22 },
      5: { cellWidth: 42 },
      6: { halign: "center", fontStyle: "bold", cellWidth: 18 },
      7: { halign: "right", fontStyle: "bold", cellWidth: 24 }
    },
    didDrawPage: function (data) {
      if (data.pageNumber > 1) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text(`MPS PARCEL SERVICE — INVOICE No: ${invoiceNo} (Continued)`, margin, 12);
        doc.setLineWidth(0.2);
        doc.setDrawColor(203, 213, 225);
        doc.line(margin, 14, pageWidth - margin, 14);
      }
    }
  });

  let finalY = doc.lastAutoTable.finalY + 3;
  const footerHeight = 44;

  // Add new page if remaining space is insufficient for the footer
  if (finalY + footerHeight > pageHeight - 12) {
    doc.addPage();
    finalY = 16;
  }

  // Net Payable Banner
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, finalY, pageWidth - margin * 2, 7.5, "FD");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  const wordsText = grandTotal === 0 ? "ZERO ONLY" : numberToWords(grandTotal) || "ZERO ONLY";
  doc.text(`Net Payable Amount : RUPEES ${wordsText}`, margin + 3, finalY + 5);

  finalY += 9.5;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(`Print DateTime : ${new Date().toLocaleString("en-IN")}`, margin, finalY);

  finalY += 3.5;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(
    "Remark : Respected Valued Customer, Kindly ensure to make the payment within 10 days of Bill receipt.",
    margin,
    finalY
  );

  finalY += 3.5;
  const boxWidth = (pageWidth - margin * 2 - 6) / 2;
  const boxHeight = 26;

  // Left Box: Bank Details
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, finalY, boxWidth, boxHeight, 1.5, 1.5, "D");

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Bank Details for Payment (NEFT / RTGS / IMPS):", margin + 3, finalY + 4.5);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  doc.text("Bank Name : Tamilnad Mercantile Bank (TMB)", margin + 3, finalY + 8.5);
  doc.text("A/C Name  : MECHERI PARCEL SERVICE", margin + 3, finalY + 12.5);
  doc.text("A/C No    : 287150050800853", margin + 3, finalY + 16.5);
  doc.text("IFSC Code : TMBL0000287  |  Branch: MECHERI", margin + 3, finalY + 20.5);

  // Right Box: Authorized Signatory
  const rightBoxX = margin + boxWidth + 6;
  doc.roundedRect(rightBoxX, finalY, boxWidth, boxHeight, 1.5, 1.5, "D");

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("For MECHERI PARCEL SERVICE", rightBoxX + boxWidth / 2, finalY + 5, { align: "center" });

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("(Authorised Signatory)", rightBoxX + boxWidth / 2, finalY + boxHeight - 3, { align: "center" });

  // Page Numbers on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(148, 163, 184);
    doc.text("MPS Logistics & Parcel Service — Computer Generated Invoice", margin, pageHeight - 6);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: "right" });
  }

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

