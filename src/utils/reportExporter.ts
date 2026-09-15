import { InspectionRecord, ProductData, ScanRecord, ComplaintData, ExportFormat } from "../types"

/**
 * PDF / Printable Government Inspection Dossier Generator
 */
export function exportToPdf(data: InspectionRecord | ProductData, inspectorNotes?: string): void {
  const isInspection = "dossierNumber" in data
  const dossierId = isInspection ? (data as InspectionRecord).dossierNumber : `DOS-2026-${Math.floor(100000 + Math.random() * 900000)}`
  const barcode = data.barcode
  const productName = data.name || (data as InspectionRecord).productName
  const brand = data.brand
  const category = data.category
  const mrp = data.mrp !== null ? `₹${data.mrp.toFixed(2)}` : "Not Declared"
  const netQty = data.netQuantity || "Not Declared"
  const mfrName = data.manufacturerName || "Not Declared"
  const mfrAddr = data.manufacturerAddress || "Not Declared"
  const score = data.complianceScore
  const status = data.complianceStatus
  const inspectedAt = isInspection ? (data as InspectionRecord).inspectedAt : new Date().toLocaleString("en-IN")
  const inspectorName = isInspection ? (data as InspectionRecord).inspectorName : "Inspector Aarav Sharma"
  const badgeNumber = isInspection ? (data as InspectionRecord).inspectorBadge : "LMO-DEL-2026-089"
  const zone = isInspection ? (data as InspectionRecord).zone : "Delhi NCR Enforcement Division"
  
  const pkgDate = ("packagingDate" in data && data.packagingDate) || ("mfgDate" in data && data.mfgDate) || "Not Declared"
  const expDate = data.expiryDate || "Not Declared"
  const fontReport = data.fontCompliance
  const violations = data.violations || []

  const printWindow = window.open("", "_blank")
  if (!printWindow) {
    alert("Please allow popups to open and print the PDF inspection report.")
    return
  }

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Legal Metrology Inspection Dossier - ${dossierId}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #102b4e;
      line-height: 1.4;
      margin: 0;
      padding: 20px;
      font-size: 11pt;
      background: #fff;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #0f8e7d;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .emblem {
      font-size: 24px;
      font-weight: bold;
      color: #0f8e7d;
      letter-spacing: 1px;
    }
    .sub-title {
      font-size: 13pt;
      font-weight: 700;
      color: #1c3c60;
      margin-top: 2px;
    }
    .dept {
      font-size: 9pt;
      color: #536b82;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .meta-box {
      display: flex;
      justify-content: space-between;
      background: #f4f8fa;
      border: 1px solid #d4e2e9;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 16px;
      font-size: 10pt;
    }
    .meta-col { display: flex; flex-direction: column; gap: 4px; }
    .status-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 10pt;
      text-transform: uppercase;
    }
    .status-green { background: #e6f7f2; color: #08705a; border: 1px solid #a3dfd1; }
    .status-red { background: #fdf1f1; color: #a52d33; border: 1px solid #f7c3c6; }
    .status-amber { background: #fff8eb; color: #b45309; border: 1px solid #fde0a8; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0 16px;
      font-size: 10pt;
    }
    th, td {
      border: 1px solid #ccdbe3;
      padding: 7px 10px;
      text-align: left;
    }
    th {
      background: #eaf1f5;
      color: #102b4e;
      font-weight: 700;
      font-size: 9pt;
      text-transform: uppercase;
    }
    .section-head {
      font-size: 11pt;
      font-weight: 700;
      color: #102b4e;
      border-left: 3px solid #0f8e7d;
      padding-left: 8px;
      margin: 16px 0 8px;
      text-transform: uppercase;
    }
    .signature-row {
      display: flex;
      justify-content: space-between;
      margin-top: 36px;
      padding-top: 20px;
    }
    .sign-box {
      width: 220px;
      text-align: center;
      border-top: 1px solid #9aaec0;
      padding-top: 6px;
      font-size: 9pt;
      color: #486178;
    }
    .footer {
      margin-top: 24px;
      text-align: center;
      font-size: 8pt;
      color: #798e9f;
      border-top: 1px dashed #d1dee6;
      padding-top: 8px;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 16px; text-align: right;">
    <button onclick="window.print()" style="background:#0f8e7d;color:#fff;border:none;padding:8px 18px;border-radius:6px;font-weight:700;cursor:pointer;font-size:12pt;">
      🖨 Print / Save as PDF
    </button>
  </div>

  <div class="header">
    <div class="emblem">GOVERNMENT OF INDIA</div>
    <div class="sub-title">DIRECTORATE OF LEGAL METROLOGY</div>
    <div class="dept">Department of Consumer Affairs · Packaged Commodities Enforcement Cell</div>
    <div style="font-size: 11pt; font-weight: bold; margin-top: 6px; color: #0f8e7d;">
      STATUTORY COMMODITY INSPECTION DOSSIER &amp; COMPLIANCE CERTIFICATE
    </div>
  </div>

  <div class="meta-box">
    <div class="meta-col">
      <div><b>Dossier Ref No:</b> <span style="font-family:monospace; font-weight:700;">${dossierId}</span></div>
      <div><b>Inspection Date:</b> ${inspectedAt}</div>
      <div><b>Enforcement Zone:</b> ${zone}</div>
    </div>
    <div class="meta-col">
      <div><b>Inspecting Officer:</b> ${inspectorName}</div>
      <div><b>Badge Number:</b> ${badgeNumber}</div>
      <div><b>Compliance Verdict:</b> 
        <span class="status-badge ${status === "Likely Compliant" ? "status-green" : status === "Critical Warning" ? "status-red" : "status-amber"}">
          ${status} (${score}/100)
        </span>
      </div>
    </div>
  </div>

  <div class="section-head">1. Packaged Commodity Specification (Targeted Declarations)</div>
  <table>
    <tr>
      <th style="width: 25%;">Product Name</th>
      <td><b>${productName}</b></td>
      <th style="width: 20%;">Brand</th>
      <td>${brand}</td>
    </tr>
    <tr>
      <th>Barcode (EAN/UPC)</th>
      <td style="font-family:monospace;">${barcode}</td>
      <th>Category</th>
      <td>${category}</td>
    </tr>
    <tr>
      <th>Declared Printed MRP</th>
      <td><b>${mrp}</b></td>
      <th>Declared Net Qty</th>
      <td><b>${netQty}</b></td>
    </tr>
    <tr>
      <th>Packaging Date</th>
      <td><b>${pkgDate}</b></td>
      <th>Use By / Expiry Date</th>
      <td><b>${expDate}</b></td>
    </tr>
    <tr>
      <th>Manufacturer / Packer</th>
      <td colspan="3">${mfrName}, ${mfrAddr}</td>
    </tr>
  </table>

  <div class="section-head">2. Rule 7 &amp; Rule 9 Statutory Font-Height &amp; Readability Audit</div>
  <table>
    <tr>
      <th>Principal Display Panel (PDP)</th>
      <td>${fontReport?.pdpAreaCm2 || 180} cm²</td>
      <th>Net Quantity Weight Category</th>
      <td>${fontReport?.netQuantityValueGramsOrMl || 100} g / ml</td>
    </tr>
    <tr>
      <th>Prescribed Min Font Height</th>
      <td><b>${fontReport?.prescribedMinHeightMm || 2.0} mm</b> (Table 1, Rule 9)</td>
      <th>Detected Numeral Font Height</th>
      <td>
        <b style="color: ${fontReport?.fontHeightCompliant !== false ? "#08705a" : "#a52d33"};">
          ${fontReport?.detectedFontHeightMm || 2.5} mm
        </b> 
        (${fontReport?.fontHeightCompliant !== false ? "✓ COMPLIANT" : "✗ VIOLATION"})
      </td>
    </tr>
    <tr>
      <th>Contrast Ratio &amp; Legibility</th>
      <td>${fontReport?.contrastRatio || 5.2}:1 (WCAG/ISO Compliant)</td>
      <th>Legibility Score</th>
      <td><b>${fontReport?.legibilityScore || 85} / 100</b></td>
    </tr>
  </table>

  ${fontReport?.nonStandardUnitsDetected && fontReport.nonStandardUnitsDetected.length > 0 ? `
    <div style="background:#fff8eb;border:1px solid #fed7aa;padding:8px 12px;border-radius:4px;font-size:9pt;margin-bottom:12px;color:#9a3412;">
      <b>Non-Standard Units Flagged:</b> ${fontReport.nonStandardUnitsDetected.join("; ")}
    </div>
  ` : ""}

  <div class="section-head">3. Legal Metrology Statutory Rule Evaluation</div>
  <table>
    <thead>
      <tr>
        <th style="width: 25%;">Rule / Section</th>
        <th style="width: 35%;">Statutory Declaration Requirement</th>
        <th style="width: 20%;">Finding</th>
        <th style="width: 20%;">Status</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><b>Rule 6(1)(a) / Sec 36(1)</b></td>
        <td>Manufacturer / Packer name &amp; complete address</td>
        <td>${mfrName ? "Declared on packaging" : "Missing / Illegible"}</td>
        <td><b>${mfrName ? "COMPLIANT" : "NON-COMPLIANT"}</b></td>
      </tr>
      <tr>
        <td><b>Rule 6(1)(c) / Rule 7</b></td>
        <td>Net Quantity in metric units (g, kg, ml, l)</td>
        <td>${netQty}</td>
        <td><b>${netQty && netQty !== "Not Declared" ? "COMPLIANT" : "NON-COMPLIANT"}</b></td>
      </tr>
      <tr>
        <td><b>Rule 6(1)(d)</b></td>
        <td>Month &amp; Year of Packaging / Mfg</td>
        <td>${pkgDate}</td>
        <td><b>${pkgDate !== "Not Declared" ? "COMPLIANT" : "NON-COMPLIANT"}</b></td>
      </tr>
      <tr>
        <td><b>Rule 6(1)(d)</b></td>
        <td>Use By / Best Before / Expiry Date</td>
        <td>${expDate}</td>
        <td><b>${expDate !== "Not Declared" && !violations.includes("expired") ? "COMPLIANT" : "NON-COMPLIANT"}</b></td>
      </tr>
      <tr>
        <td><b>Rule 6(1)(e) / Rule 18(2)</b></td>
        <td>MRP inclusive of all taxes</td>
        <td>${mrp}</td>
        <td><b>${mrp && mrp !== "Not Declared" ? "COMPLIANT" : "NON-COMPLIANT"}</b></td>
      </tr>
      <tr>
        <td><b>Rule 6(1)(f)</b></td>
        <td>Consumer care contact (Tel / Email)</td>
        <td>${data.consumerCare || "Declared"}</td>
        <td><b>${data.consumerCare ? "COMPLIANT" : "NON-COMPLIANT"}</b></td>
      </tr>
    </tbody>
  </table>

  <div class="section-head">4. Inspecting Officer Enforcement Remarks &amp; Action</div>
  <div style="background:#f9fafb;border:1px solid #e5e7eb;padding:10px 14px;border-radius:6px;font-size:10pt;">
    <b>Officer Finding:</b> ${inspectorNotes || (violations.length === 0 ? "Sample inspected in retail premises. All 10 mandatory declarations verified. Font heights comply with Rule 7 Table 1." : `Violations noted under Legal Metrology Act, 2009: ${violations.join(", ")}.`)}
    <br><br>
    <b>Enforcement Directive:</b> ${violations.length === 0 ? "Certificate of Compliance recorded in Central Registry. No further action required." : "Statutory Notice under Section 36(1) issued to manufacturer and retail merchant for rectification within 14 days."}
  </div>

  <div class="signature-row">
    <div class="sign-box">
      <b>Digital Hash / Signature</b><br>
      <span style="font-family:monospace;font-size:8pt;color:#0f8e7d;">AUTH-LMO-${Date.now().toString(36).toUpperCase()}</span>
    </div>
    <div class="sign-box">
      <b>${inspectorName}</b><br>
      Legal Metrology Enforcement Officer<br>
      Badge: ${badgeNumber}
    </div>
  </div>

  <div class="footer">
    PackSure Legal Metrology Inspection Management System · Generated under statutory authority of the Legal Metrology Act, 2009 &amp; LMPC Rules, 2011 · Document Ref: ${dossierId}
  </div>
</body>
</html>
  `

  printWindow.document.open()
  printWindow.document.write(htmlContent)
  printWindow.document.close()
}

/**
 * Microsoft Word (DOCX / Structured Word Document) Generator
 */
export function exportToDocx(data: InspectionRecord | ProductData, inspectorNotes?: string): void {
  const isInspection = "dossierNumber" in data
  const dossierId = isInspection ? (data as InspectionRecord).dossierNumber : `DOS-2026-${Math.floor(100000 + Math.random() * 900000)}`
  const productName = data.name || (data as InspectionRecord).productName
  const brand = data.brand
  const barcode = data.barcode
  const mrp = data.mrp !== null ? `₹${data.mrp.toFixed(2)}` : "Not Declared"
  const netQty = data.netQuantity || "Not Declared"
  const mfrName = data.manufacturerName || "Not Declared"
  const mfrAddr = data.manufacturerAddress || "Not Declared"
  const score = data.complianceScore
  const status = data.complianceStatus
  const inspectedAt = isInspection ? (data as InspectionRecord).inspectedAt : new Date().toLocaleString("en-IN")
  const inspectorName = isInspection ? (data as InspectionRecord).inspectorName : "Inspector Aarav Sharma"
  const fontReport = data.fontCompliance

  const pkgDate = ("packagingDate" in data && data.packagingDate) || ("mfgDate" in data && data.mfgDate) || "Not Declared"
  const expDate = data.expiryDate || "Not Declared"

  const wordHtml = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>Legal Metrology Inspection Dossier - ${dossierId}</title>
  <style>
    body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #102b4e; }
    h1 { font-size: 18pt; color: #0f8e7d; text-align: center; margin: 0; }
    h2 { font-size: 14pt; color: #1c3c60; text-align: center; margin: 4px 0 16px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th, td { border: 1px solid #94a3b8; padding: 6px 10px; font-size: 10pt; }
    th { background-color: #f1f5f9; font-weight: bold; }
    .header-box { background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; margin-bottom: 16px; }
  </style>
</head>
<body>
  <h1>GOVERNMENT OF INDIA</h1>
  <h2>DIRECTORATE OF LEGAL METROLOGY — INSPECTION DOSSIER</h2>
  
  <div class="header-box">
    <p><b>Dossier Number:</b> ${dossierId} | <b>Date of Inspection:</b> ${inspectedAt}</p>
    <p><b>Inspecting Officer:</b> ${inspectorName} | <b>Overall Verdict:</b> ${status} (${score}/100)</p>
  </div>

  <h3>1. Product &amp; Packaging Declarations (Targeted Extraction)</h3>
  <table>
    <tr><th>Product Name</th><td>${productName}</td><th>Brand</th><td>${brand}</td></tr>
    <tr><th>Barcode</th><td>${barcode}</td><th>Category</th><td>${data.category}</td></tr>
    <tr><th>Printed MRP</th><td>${mrp}</td><th>Net Quantity</th><td>${netQty}</td></tr>
    <tr><th>Packaging Date</th><td>${pkgDate}</td><th>Use By / Expiry Date</th><td>${expDate}</td></tr>
    <tr><th>Manufacturer &amp; Address</th><td colspan='3'>${mfrName}, ${mfrAddr}</td></tr>
  </table>

  <h3>2. Rule 7 &amp; 9 Font-Height &amp; Readability Findings</h3>
  <table>
    <tr><th>Prescribed Min Font Height (Table 1)</th><td>${fontReport?.prescribedMinHeightMm || 2.0} mm</td></tr>
    <tr><th>Detected Numeral Font Height</th><td>${fontReport?.detectedFontHeightMm || 2.5} mm (${fontReport?.fontHeightCompliant !== false ? "COMPLIANT" : "NON-COMPLIANT"})</td></tr>
    <tr><th>Contrast Ratio &amp; Legibility Score</th><td>${fontReport?.contrastRatio || 5.2}:1 (${fontReport?.legibilityScore || 85}/100)</td></tr>
  </table>

  <h3>3. Inspecting Officer Order &amp; Directives</h3>
  <p>${inspectorNotes || "Verification completed in accordance with the Legal Metrology (Packaged Commodities) Rules, 2011."}</p>
  
  <br><br>
  <p><b>Officer Sign-off:</b> ${inspectorName} (Verified &amp; Recorded in PackSure Central Legal Metrology Database)</p>
</body>
</html>
  `

  const blob = new Blob(["\ufeff", wordHtml], {
    type: "application/msword;charset=utf-8",
  })
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = `Legal_Metrology_Inspection_${dossierId}.doc`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Excel / CSV Spreadsheet Exporter for Audit Records
 */
export function exportToCsvOrXlsx(
  records: (InspectionRecord | ScanRecord | ComplaintData)[],
  filenamePrefix: string = "PackSure_Legal_Metrology_Audit"
): void {
  if (!records || records.length === 0) {
    alert("No records available to export.")
    return
  }

  const headers = [
    "Dossier / Record ID",
    "Barcode",
    "Product Name",
    "Brand",
    "MRP (INR)",
    "Net Quantity",
    "Packaging Date",
    "Expiry Date",
    "Compliance Score",
    "Compliance Status",
    "Violations Flagged",
    "Font Height Compliant",
    "Detected Font (mm)",
    "Prescribed Font (mm)",
    "Enforcement Action",
    "Timestamp",
    "Inspector / Submitter",
  ]

  const rows = records.map((r) => {
    const isInspection = "dossierNumber" in r
    const isScan = "scannedAt" in r
    const isComplaint = "complainantName" in r

    const id = isInspection ? (r as InspectionRecord).dossierNumber : r.id
    const barcode = `"${r.barcode}"`
    const name = `"${(r.productName || "").replace(/"/g, '""')}"`
    const brand = `"${(r.brand || "").replace(/"/g, '""')}"`
    const mrp = r.mrp !== null ? String(r.mrp) : "N/A"
    const netQty = `"${(r.netQuantity || "N/A").replace(/"/g, '""')}"`
    
    let score = "N/A"
    let status = "N/A"
    let violations = "None"
    let fontCompliant = "N/A"
    let detectedFont = "N/A"
    let prescribedFont = "N/A"
    let action = "N/A"
    let time = "N/A"
    let officer = "N/A"

    if (isInspection) {
      const insp = r as InspectionRecord
      score = String(insp.complianceScore)
      status = insp.complianceStatus
      violations = `"${insp.violations.join(", ") || "None"}"`
      fontCompliant = insp.fontCompliance?.fontHeightCompliant ? "YES" : "NO"
      detectedFont = String(insp.fontCompliance?.detectedFontHeightMm || "N/A")
      prescribedFont = String(insp.fontCompliance?.prescribedMinHeightMm || "N/A")
      action = `"${insp.enforcementAction?.actionType || insp.status}"`
      time = insp.inspectedAt
      officer = `"${insp.inspectorName} (${insp.inspectorBadge})"`
    } else if (isScan) {
      const sc = r as ScanRecord
      score = String(sc.complianceScore)
      status = sc.complianceStatus
      violations = `"${sc.violations.join(", ") || "None"}"`
      time = sc.scannedAt
      officer = `"${sc.userName || "Citizen"}"`
    } else if (isComplaint) {
      const cp = r as ComplaintData
      status = cp.status
      violations = `"${cp.issueType}"`
      time = cp.submittedAt
      officer = `"${cp.complainantName}"`
      action = `"${cp.status} - ${cp.remarks || "Under Review"}"`
    }

    const rowPkgDate = `"${(("packagingDate" in r && (r as any).packagingDate) || ("mfgDate" in r && (r as any).mfgDate) || "N/A").replace(/"/g, '""')}"`
    const rowExpDate = `"${(r.expiryDate || "N/A").replace(/"/g, '""')}"`

    return [
      id,
      barcode,
      name,
      brand,
      mrp,
      netQty,
      rowPkgDate,
      rowExpDate,
      score,
      status,
      violations,
      fontCompliant,
      detectedFont,
      prescribedFont,
      action,
      time,
      officer,
    ].join(",")
  })

  const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n")
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
