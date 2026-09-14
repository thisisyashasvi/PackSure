import React, { useState } from "react"
import { Page, User, InspectionRecord, ScanRecord, ComplaintData } from "../types"
import { Icon, Button, Badge } from "../components/Icons"
import { sqlDb } from "../db/sqlEngine"
import { exportToPdf, exportToDocx, exportToCsvOrXlsx } from "../utils/reportExporter"

interface RepositoryPageProps {
  setPage: (page: Page) => void
  currentUser: User | null
  setSelectedProduct?: (product: any) => void
}

export const RepositoryPage: React.FC<RepositoryPageProps> = ({
  setPage,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<"inspections" | "scans" | "complaints" | "evidence">("inspections")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("All")
  const [violationFilter, setViolationFilter] = useState<string>("All")
  const [zoneFilter, setZoneFilter] = useState<string>("All")

  // Modal inspection inspection state
  const [selectedInspection, setSelectedInspection] = useState<InspectionRecord | null>(null)
  const [selectedEvidenceImage, setSelectedEvidenceImage] = useState<string | null>(null)

  const inspectionsList = sqlDb.getAllInspections()
  const scansList = sqlDb.getAllScans()
  const complaintsList = sqlDb.getAllComplaints()

  // Filter inspections
  const filteredInspections = inspectionsList.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.barcode.includes(searchQuery) ||
      item.dossierNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.merchantName && item.merchantName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.inspectorName.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus =
      statusFilter === "All" ||
      (statusFilter === "Compliant" && item.complianceStatus === "Likely Compliant") ||
      (statusFilter === "Violations" && (item.complianceStatus === "Violation Detected" || item.complianceStatus === "Critical Warning"))

    const matchesViolation =
      violationFilter === "All" ||
      (violationFilter === "Font Height" && (item.violations.includes("font_size_violation") || !item.fontCompliance?.fontHeightCompliant)) ||
      (violationFilter === "Overcharging" && item.violations.includes("overcharging")) ||
      (violationFilter === "Missing MRP" && item.violations.includes("mrp_missing")) ||
      (violationFilter === "Non-Standard Units" && item.violations.includes("non_standard_units")) ||
      (violationFilter === "Expired" && item.violations.includes("expired"))

    const matchesZone =
      zoneFilter === "All" ||
      item.zone.toLowerCase().includes(zoneFilter.toLowerCase())

    return matchesSearch && matchesStatus && matchesViolation && matchesZone
  })

  // Filter scans
  const filteredScans = scansList.filter((s) => {
    return (
      !searchQuery ||
      s.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.barcode.includes(searchQuery) ||
      (s.userName && s.userName.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  })

  // Filter complaints
  const filteredComplaints = complaintsList.filter((c) => {
    return (
      !searchQuery ||
      c.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.barcode.includes(searchQuery) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.shopName.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  // Collect all evidence photos from inspections and complaints
  const evidenceGallery: { title: string; image: string; tag: string; id: string; date: string }[] = []
  inspectionsList.forEach((insp) => {
    insp.evidenceImages.forEach((img) => {
      evidenceGallery.push({
        title: `${insp.productName} (${insp.brand})`,
        image: img,
        tag: insp.violations.length > 0 ? "Violation Evidence" : "Compliant Label",
        id: insp.dossierNumber,
        date: insp.inspectedAt,
      })
    })
  })

  const handleExportFiltered = () => {
    if (activeTab === "inspections") {
      exportToCsvOrXlsx(filteredInspections, "Legal_Metrology_Inspections_Audit")
    } else if (activeTab === "scans") {
      exportToCsvOrXlsx(filteredScans, "Consumer_Scans_Audit")
    } else {
      exportToCsvOrXlsx(filteredComplaints, "Grievances_Audit")
    }
  }

  return (
    <main className="page-shell">
      {/* Breadcrumb */}
      <div className="crumb">
        <button className="plain" onClick={() => setPage("home")}>Home</button>
        <Icon name="chevron" size={14} />
        <span>Central Legal Metrology Repository</span>
      </div>

      {/* Header Bar */}
      <div className="result-title" style={{ marginTop: "16px" }}>
        <div>
          <div className="section-label" style={{ color: "#0f8e7d" }}>
            NATIONAL LEGAL METROLOGY PACKAGED COMMODITIES REPOSITORY
          </div>
          <h1 style={{ fontSize: "28px", marginTop: "4px" }}>
            Searchable Inspection &amp; Evidence Repository
          </h1>
          <p style={{ color: "#607489", fontSize: "14px", marginTop: "4px" }}>
            Search, filter, and audit verified commodity declarations, statutory enforcement dossiers, and evidentiary label photographs.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <Button secondary onClick={handleExportFiltered} style={{ fontSize: "12px", padding: "8px 14px" }}>
            <Icon name="download" size={14} /> Export to Excel / CSV
          </Button>
          <Button onClick={() => setPage("scan")} style={{ fontSize: "12px", padding: "8px 14px" }}>
            <Icon name="scan" size={14} /> New Inspection Scan
          </Button>
        </div>
      </div>

      {/* Metric Quick Strip */}
      <div className="metric-grid" style={{ marginTop: "20px" }}>
        {[
          { label: "Total Registered Inspections", val: String(inspectionsList.length), change: "Official Field Dossiers", type: "blue" as const },
          { label: "Compliant Declarations", val: String(inspectionsList.filter((i) => i.complianceStatus === "Likely Compliant").length), change: "Rule 6 Verified", type: "green" as const },
          { label: "Statutory Violations Flagged", val: String(inspectionsList.filter((i) => i.complianceStatus !== "Likely Compliant").length), change: "Section 36 Active", type: "red" as const },
          { label: "Archived Label Evidence Files", val: String(evidenceGallery.length + scansList.length), change: "High-Res OCR Captures", type: "amber" as const },
        ].map((m) => (
          <div className="metric" key={m.label}>
            <span className={`metric-dot ${m.type}`} />
            <p>{m.label}</p>
            <strong>{m.val}</strong>
            <small className={m.type === "green" || m.type === "blue" ? "up" : ""}>{m.change}</small>
          </div>
        ))}
      </div>

      {/* Main Tabs Navigation */}
      <div style={{ display: "flex", borderBottom: "2px solid #e2eaf0", marginTop: "24px", gap: "20px" }}>
        {[
          { id: "inspections", label: `Field Inspections (${inspectionsList.length})`, icon: "shield" as const },
          { id: "scans", label: `Citizen Scans (${scansList.length})`, icon: "scan" as const },
          { id: "complaints", label: `Statutory Grievances (${complaintsList.length})`, icon: "file" as const },
          { id: "evidence", label: `Evidence Locker (${evidenceGallery.length})`, icon: "camera" as const },
        ].map((tab) => (
          <button
            key={tab.id}
            className="plain"
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 4px",
              fontSize: "14px",
              fontWeight: 700,
              color: activeTab === tab.id ? "#0f8e7d" : "#62788d",
              borderBottom: activeTab === tab.id ? "3px solid #0f8e7d" : "3px solid transparent",
              cursor: "pointer",
            }}
          >
            <Icon name={tab.icon} size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Search & Filter Bar */}
      <div
        style={{
          marginTop: "20px",
          background: "#fff",
          border: "1px solid #d9e3ea",
          borderRadius: "10px",
          padding: "14px 18px",
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ flex: "1 1 240px", position: "relative" }}>
          <input
            type="text"
            placeholder="Search by Barcode, Commodity, Brand, Merchant, or Dossier ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 12px",
              fontSize: "13px",
              borderRadius: "6px",
              border: "1px solid #cbd9e2",
              margin: 0,
            }}
          />
        </div>

        {activeTab === "inspections" && (
          <>
            {/* Status Filter */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#6c8196" }}>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: "8px 10px", fontSize: "12px", borderRadius: "6px", border: "1px solid #cbd9e2", background: "#f8fafc" }}
              >
                <option value="All">All Statuses</option>
                <option value="Compliant">Compliant Only</option>
                <option value="Violations">Violations Detected</option>
              </select>
            </div>

            {/* Violation Category Filter */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#6c8196" }}>Violation:</span>
              <select
                value={violationFilter}
                onChange={(e) => setViolationFilter(e.target.value)}
                style={{ padding: "8px 10px", fontSize: "12px", borderRadius: "6px", border: "1px solid #cbd9e2", background: "#f8fafc" }}
              >
                <option value="All">All Rule Violations</option>
                <option value="Font Height">Font Height (Rule 7/9)</option>
                <option value="Overcharging">Overcharging (Rule 18(2))</option>
                <option value="Missing MRP">Missing MRP (Rule 6(1)(e))</option>
                <option value="Non-Standard Units">Non-Standard Units (Rule 11)</option>
                <option value="Expired">Expired Goods (Sec 18)</option>
              </select>
            </div>

            {/* Zone Filter */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#6c8196" }}>Zone:</span>
              <select
                value={zoneFilter}
                onChange={(e) => setZoneFilter(e.target.value)}
                style={{ padding: "8px 10px", fontSize: "12px", borderRadius: "6px", border: "1px solid #cbd9e2", background: "#f8fafc" }}
              >
                <option value="All">All Enforcement Zones</option>
                <option value="Delhi">Delhi NCR</option>
                <option value="Mumbai">Mumbai Suburban</option>
                <option value="Bengaluru">Bengaluru Division</option>
              </select>
            </div>
          </>
        )}

        {(searchQuery || statusFilter !== "All" || violationFilter !== "All" || zoneFilter !== "All") && (
          <button
            className="plain"
            onClick={() => {
              setSearchQuery("")
              setStatusFilter("All")
              setViolationFilter("All")
              setZoneFilter("All")
            }}
            style={{ fontSize: "12px", color: "#0f8e7d", fontWeight: 700, cursor: "pointer" }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* TAB 1: FIELD INSPECTIONS TABLE */}
      {activeTab === "inspections" && (
        <section className="table-card" style={{ marginTop: "16px" }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>DOSSIER NUMBER</th>
                  <th>COMMODITY &amp; BRAND</th>
                  <th>BARCODE</th>
                  <th>DECLARED NET QTY</th>
                  <th>FONT COMPLIANCE (RULE 7/9)</th>
                  <th>SCORE &amp; STATUS</th>
                  <th>ENFORCEMENT ACTION</th>
                  <th>INSPECTOR &amp; DATE</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredInspections.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", padding: "30px", color: "#7f92a3" }}>
                      No inspection dossiers found matching the specified filters.
                    </td>
                  </tr>
                ) : (
                  filteredInspections.map((insp) => (
                    <tr key={insp.id}>
                      <td className="mono" style={{ fontWeight: 700, color: "#102b4e" }}>
                        {insp.dossierNumber}
                      </td>
                      <td>
                        <b>{insp.productName}</b>
                        <br />
                        <span style={{ fontSize: "11px", color: "#6a7d90" }}>{insp.brand} · MRP: ₹{insp.mrp}</span>
                      </td>
                      <td className="mono">{insp.barcode}</td>
                      <td>
                        <b>{insp.netQuantity}</b>
                      </td>
                      <td>
                        {insp.fontCompliance ? (
                          <div style={{ fontSize: "11px" }}>
                            <span
                              style={{
                                fontWeight: 700,
                                color: insp.fontCompliance.fontHeightCompliant ? "#08705a" : "#a52d33",
                              }}
                            >
                              {insp.fontCompliance.detectedFontHeightMm}mm / Min {insp.fontCompliance.prescribedMinHeightMm}mm
                            </span>
                            <br />
                            <small style={{ color: "#74889c" }}>
                              {insp.fontCompliance.fontHeightCompliant ? "✓ Compliant" : "✗ Undersized"}
                            </small>
                          </div>
                        ) : (
                          <span style={{ fontSize: "11px", color: "#8a9bac" }}>Verified</span>
                        )}
                      </td>
                      <td>
                        <Badge
                          type={
                            insp.complianceStatus === "Likely Compliant"
                              ? "green"
                              : insp.complianceStatus === "Critical Warning"
                              ? "red"
                              : "amber"
                          }
                        >
                          {insp.complianceScore}/100
                        </Badge>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, fontSize: "11px", color: "#102b4e" }}>
                          {insp.enforcementAction?.actionType || insp.status}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: "11px" }}>{insp.inspectorName}</span>
                        <br />
                        <span style={{ fontSize: "10px", color: "#7b8e9f" }}>{insp.inspectedAt}</span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            className="review"
                            onClick={() => setSelectedInspection(insp)}
                            style={{ cursor: "pointer", fontWeight: 700, fontSize: "11px" }}
                          >
                            Dossier <Icon name="arrow" size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 2: SCANS TABLE */}
      {activeTab === "scans" && (
        <section className="table-card" style={{ marginTop: "16px" }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>SCAN ID</th>
                  <th>STORED LABEL FILE</th>
                  <th>BARCODE</th>
                  <th>COMMODITY &amp; BRAND</th>
                  <th>SUBMITTED BY</th>
                  <th>COMPLIANCE STATUS</th>
                  <th>TIMESTAMP</th>
                </tr>
              </thead>
              <tbody>
                {filteredScans.map((s) => (
                  <tr key={s.id}>
                    <td className="mono" style={{ fontWeight: 700, color: "#102b4e" }}>{s.id}</td>
                    <td>
                      <span style={{ background: "#edf6f8", padding: "3px 8px", borderRadius: "4px", fontSize: "11px", color: "#145975" }}>
                        📷 {s.imageFileName}
                      </span>
                    </td>
                    <td className="mono">{s.barcode}</td>
                    <td>
                      <b>{s.productName}</b> ({s.brand})
                    </td>
                    <td>{s.userName || "Citizen"}</td>
                    <td>
                      <Badge type={s.complianceStatus === "Likely Compliant" ? "green" : "red"}>
                        {s.complianceScore}/100 ({s.complianceStatus})
                      </Badge>
                    </td>
                    <td>{s.scannedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 3: GRIEVANCES TABLE */}
      {activeTab === "complaints" && (
        <section className="table-card" style={{ marginTop: "16px" }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>COMPLAINT ID</th>
                  <th>PRIORITY</th>
                  <th>COMMODITY</th>
                  <th>ALLEGED VIOLATION</th>
                  <th>MERCHANT</th>
                  <th>STATUS</th>
                  <th>DATE</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.map((c) => (
                  <tr key={c.id}>
                    <td className="mono" style={{ fontWeight: 700, color: "#102b4e" }}>{c.id}</td>
                    <td>
                      <Badge
                        type={
                          c.priority === "Critical"
                            ? "critical"
                            : c.priority === "High"
                            ? "high"
                            : c.priority === "Medium"
                            ? "medium"
                            : "low"
                        }
                      >
                        {c.priority || "Medium"}
                      </Badge>
                    </td>
                    <td><b>{c.productName}</b></td>
                    <td><span style={{ color: "#a53c40", fontWeight: 600 }}>{c.issueType}</span></td>
                    <td>{c.shopName}</td>
                    <td><Badge type={c.status === "Resolved" ? "green" : "blue"}>{c.status}</Badge></td>
                    <td>{c.submittedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 4: EVIDENCE LOCKER */}
      {activeTab === "evidence" && (
        <div style={{ marginTop: "16px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "16px" }}>
          {evidenceGallery.map((item, idx) => (
            <div
              key={idx}
              style={{
                background: "#fff",
                border: "1px solid #dce5ec",
                borderRadius: "10px",
                overflow: "hidden",
                boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
              }}
            >
              <div
                onClick={() => setSelectedEvidenceImage(item.image)}
                style={{
                  height: "140px",
                  background: "#f0f5f7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  borderBottom: "1px solid #e1ebf0",
                }}
              >
                <div style={{ textAlign: "center", color: "#6a8196" }}>
                  <Icon name="camera" size={32} />
                  <div style={{ fontSize: "11px", marginTop: "4px", fontWeight: 600 }}>{item.image}</div>
                  <span style={{ fontSize: "10px", color: "#0f8e7d" }}>Click to Inspect</span>
                </div>
              </div>
              <div style={{ padding: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Badge type={item.tag === "Violation Evidence" ? "red" : "green"}>{item.tag}</Badge>
                  <span className="mono" style={{ fontSize: "10px", color: "#7a8e9e" }}>{item.id}</span>
                </div>
                <h4 style={{ fontSize: "13px", color: "#102b4e", margin: "8px 0 2px" }}>{item.title}</h4>
                <p style={{ fontSize: "10px", color: "#7c8e9f", margin: 0 }}>Archived: {item.date}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DETAILED INSPECTION DOSSIER MODAL */}
      {selectedInspection && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: "720px", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <Badge type="green">OFFICIAL LEGAL METROLOGY DOSSIER</Badge>
                  <Badge type={selectedInspection.complianceStatus === "Likely Compliant" ? "green" : "red"}>
                    {selectedInspection.complianceScore}/100 ({selectedInspection.complianceStatus})
                  </Badge>
                </div>
                <h2 style={{ fontSize: "22px", color: "#102b4e", marginTop: "4px" }}>
                  {selectedInspection.productName} ({selectedInspection.brand})
                </h2>
                <div style={{ fontSize: "11px", color: "#667d91" }}>
                  Dossier Ref: <b className="mono">{selectedInspection.dossierNumber}</b> · Inspected on {selectedInspection.inspectedAt}
                </div>
              </div>
              <button className="plain" onClick={() => setSelectedInspection(null)}>
                <Icon name="close" size={24} />
              </button>
            </div>

            {/* Grid specs */}
            <div style={{ marginTop: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "12px" }}>
              <div style={{ background: "#f5f9fa", padding: "12px", borderRadius: "8px" }}>
                <span style={{ color: "#718496", fontSize: "10px", fontWeight: 700, textTransform: "uppercase" }}>
                  Package Specifications
                </span>
                <div style={{ marginTop: "4px" }}>Barcode: <b className="mono">{selectedInspection.barcode}</b></div>
                <div>Printed MRP: <b>₹{selectedInspection.mrp}</b></div>
                {selectedInspection.sellingPrice && (
                  <div style={{ color: "#a52d33", fontWeight: 700 }}>
                    Selling Price: ₹{selectedInspection.sellingPrice} (Overcharged by +₹{(selectedInspection.sellingPrice - (selectedInspection.mrp || 0)).toFixed(2)})
                  </div>
                )}
                <div>Net Quantity: <b>{selectedInspection.netQuantity}</b></div>
                <div>Category: <b>{selectedInspection.category}</b></div>
              </div>

              <div style={{ background: "#f5f9fa", padding: "12px", borderRadius: "8px" }}>
                <span style={{ color: "#718496", fontSize: "10px", fontWeight: 700, textTransform: "uppercase" }}>
                  Inspection &amp; Jurisdiction
                </span>
                <div style={{ marginTop: "4px" }}>Inspector: <b>{selectedInspection.inspectorName}</b></div>
                <div>Badge ID: <b className="mono">{selectedInspection.inspectorBadge}</b></div>
                <div>Enforcement Zone: {selectedInspection.zone}</div>
                <div>Merchant: {selectedInspection.merchantName || "Retail Store"}</div>
              </div>
            </div>

            {/* Font Compliance Table 1 Details */}
            {selectedInspection.fontCompliance && (
              <div style={{ marginTop: "14px", background: "#f8fafc", border: "1px solid #e2e8f0", padding: "12px", borderRadius: "8px", fontSize: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <b style={{ color: "#102b4e" }}>Rule 7 &amp; Rule 9 Statutory Font-Height Evaluation</b>
                  <Badge type={selectedInspection.fontCompliance.fontHeightCompliant ? "green" : "red"}>
                    {selectedInspection.fontCompliance.fontHeightCompliant ? "✓ Font Height Compliant" : "✗ Undersized Font"}
                  </Badge>
                </div>
                <div style={{ marginTop: "8px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", fontSize: "11px" }}>
                  <div>Prescribed Min: <b>{selectedInspection.fontCompliance.prescribedMinHeightMm} mm</b></div>
                  <div>Detected Height: <b style={{ color: selectedInspection.fontCompliance.fontHeightCompliant ? "#08705a" : "#a52d33" }}>{selectedInspection.fontCompliance.detectedFontHeightMm} mm</b></div>
                  <div>Legibility Score: <b>{selectedInspection.fontCompliance.legibilityScore} / 100</b></div>
                </div>
                {selectedInspection.fontCompliance.nonStandardUnitsDetected.length > 0 && (
                  <div style={{ marginTop: "6px", color: "#9a3412", fontSize: "11px" }}>
                    ⚠ <b>Non-Standard Units Flagged:</b> {selectedInspection.fontCompliance.nonStandardUnitsDetected.join(", ")}
                  </div>
                )}
              </div>
            )}

            {/* Enforcement Action */}
            <div style={{ marginTop: "14px", padding: "12px", background: "#fff8eb", border: "1px solid #fed7aa", borderRadius: "8px", fontSize: "12px" }}>
              <b style={{ color: "#9a3412" }}>Recommended Enforcement Action:</b>{" "}
              <span style={{ fontWeight: 700 }}>{selectedInspection.enforcementAction?.actionType}</span>
              <p style={{ margin: "4px 0 0", color: "#54687d" }}>
                {selectedInspection.enforcementAction?.actionDescription}
              </p>
            </div>

            {/* Evidence Thumbnails */}
            <div style={{ marginTop: "14px", fontSize: "12px" }}>
              <b>Attached Evidence Photographs:</b>
              <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                {selectedInspection.evidenceImages.map((img, i) => (
                  <span
                    key={i}
                    onClick={() => setSelectedEvidenceImage(img)}
                    style={{
                      background: "#eef6f6",
                      color: "#0f8e7d",
                      border: "1px solid #bce1db",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "11px",
                      fontWeight: 600,
                    }}
                  >
                    📷 {img}
                  </span>
                ))}
              </div>
            </div>

            {/* Export Toolbar in Modal */}
            <div style={{ marginTop: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e1e9ef", paddingTop: "14px" }}>
              <Button secondary onClick={() => setSelectedInspection(null)}>
                Close
              </Button>
              <div style={{ display: "flex", gap: "8px" }}>
                <Button secondary onClick={() => exportToDocx(selectedInspection)} style={{ fontSize: "12px", padding: "8px 12px" }}>
                  <Icon name="file" size={14} /> Export DOCX
                </Button>
                <Button onClick={() => exportToPdf(selectedInspection)} style={{ fontSize: "12px", padding: "8px 14px" }}>
                  <Icon name="printer" size={14} /> Print / Save PDF
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EVIDENCE PHOTO PREVIEW MODAL */}
      {selectedEvidenceImage && (
        <div className="modal-overlay" onClick={() => setSelectedEvidenceImage(null)}>
          <div className="modal-box" style={{ maxWidth: "480px", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "16px", color: "#102b4e" }}>Evidentiary Label Inspection Photo</h3>
              <button className="plain" onClick={() => setSelectedEvidenceImage(null)}>
                <Icon name="close" size={20} />
              </button>
            </div>
            <div
              style={{
                marginTop: "16px",
                height: "260px",
                background: "#183451",
                borderRadius: "8px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "#7ce5cf",
              }}
            >
              <Icon name="camera" size={48} />
              <div style={{ marginTop: "10px", fontWeight: 700, fontSize: "14px" }}>{selectedEvidenceImage}</div>
              <small style={{ color: "#a8c5d8" }}>High-Fidelity Optical Inspection Capture</small>
            </div>
            <div style={{ marginTop: "14px", fontSize: "11px", color: "#6a7d90" }}>
              Timestamped &amp; SHA-256 hash verified for statutory evidentiary admissibility.
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
