import React, { useState } from "react"
import { Page, ComplaintData, User } from "../types"
import { Icon, Logo, Button, Badge } from "../components/Icons"
import { exportToPdf, exportToDocx, exportToCsvOrXlsx } from "../utils/reportExporter"

interface OfficerDashboardProps {
  setPage: (page: Page) => void
  complaintsList: ComplaintData[]
  onUpdateComplaintStatus: (id: string, newStatus: "Under Review" | "Notice Issued" | "Resolved") => void
  currentUser: User | null
  onLogout: () => void
}

export const OfficerDashboard: React.FC<OfficerDashboardProps> = ({
  setPage,
  complaintsList,
  onUpdateComplaintStatus,
  currentUser,
  onLogout,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>("All")
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintData | null>(null)
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null)
  const [officerNoteInput, setOfficerNoteInput] = useState<string>("")

  // Filter all complaints submitted by consumers
  const filteredComplaints = complaintsList.filter((c) => {
    const matchesStatus =
      statusFilter === "All" ||
      (statusFilter === "Submitted" && c.status === "Submitted") ||
      (statusFilter === "Under Review" && c.status === "Under Review") ||
      (statusFilter === "Notice Issued" && c.status === "Notice Issued") ||
      (statusFilter === "Resolved" && c.status === "Resolved")

    const matchesSearch =
      c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.shopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.issueType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.complainantName.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesStatus && matchesSearch
  })

  const handleApplyAction = (status: "Under Review" | "Notice Issued" | "Resolved") => {
    if (selectedComplaint) {
      onUpdateComplaintStatus(selectedComplaint.id, status)
      setActionSuccessMessage(`Enforcement Action Recorded: Complaint ${selectedComplaint.id} status updated to "${status}".`)
      setTimeout(() => {
        setActionSuccessMessage(null)
        setSelectedComplaint(null)
      }, 1400)
    }
  }

  const officerName = currentUser?.name || "Inspector Aarav Sharma"
  const badgeId = currentUser?.badgeNumber || "LMO-DEL-2026-089"
  const zone = currentUser?.zone || "Delhi NCR Enforcement Division"

  return (
    <div className="admin" style={{ gridTemplateColumns: "260px 1fr" }}>
      {/* Officer Sidebar */}
      <aside className="admin-side" style={{ background: "#0e233d" }}>
        <div onClick={() => setPage("home")} style={{ cursor: "pointer" }}>
          <Logo />
        </div>

        <div style={{ padding: "0 10px", marginTop: "10px" }}>
          <Badge type="green" style={{ fontSize: "9px" }}>OFFICER REVIEW CONSOLE</Badge>
          <div style={{ fontSize: "11px", color: "#8ab4d7", marginTop: "4px" }}>
            Legal Metrology Act, 2009
          </div>
        </div>

        <div className="admin-nav" style={{ marginTop: "28px" }}>
          <button className="active" style={{ background: "#1c3c60", color: "#fff" }}>
            <Icon name="file" /> Consumer Complaints <em>{complaintsList.length}</em>
          </button>
          <button onClick={() => setPage("scan")}>
            <Icon name="scan" /> Field Inspection Scan
          </button>
          <button onClick={() => setPage("repository")}>
            <Icon name="search" /> Central Repository &amp; Evidence
          </button>
          <button onClick={() => alert(`Enforcement Zone: ${zone} · All legal dossiers are synced with National Legal Metrology Cell.`)}>
            <Icon name="shield" /> Directorate Jurisdiction
          </button>
        </div>

        <div style={{ marginTop: "auto", padding: "0 10px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <Button
            secondary
            onClick={() => setPage("home")}
            style={{ width: "100%", fontSize: "12px", padding: "8px", background: "#173352", color: "#fff", border: "1px solid #284c73" }}
          >
            ← Exit to Consumer App
          </Button>

          <button
            onClick={() => {
              onLogout()
              setPage("officer-login")
            }}
            style={{
              width: "100%",
              fontSize: "11px",
              padding: "7px",
              background: "#2a1b1e",
              color: "#e88d92",
              border: "1px solid #522c32",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Officer Sign Out
          </button>
        </div>

        <div className="admin-user" style={{ borderTop: "1px solid #1f3d5c", marginTop: "16px" }}>
          <span>{officerName.slice(0, 2).toUpperCase()}</span>
          <div>
            <b>{officerName}</b>
            <small>Badge: {badgeId}</small>
          </div>
          <Icon name="shield" size={15} style={{ color: "#7ce5cf" }} />
        </div>
      </aside>

      {/* Main Officer Console */}
      <main className="admin-main">
        {/* Head Bar */}
        <div className="admin-head">
          <div>
            <div className="section-label" style={{ color: "#0f8e7d" }}>
              LEGAL METROLOGY CONSUMER GRIEVANCE REVIEW PORTAL
            </div>
            <h1 style={{ fontSize: "30px", marginTop: "4px" }}>
              Grievance Dossier Review Console
            </h1>
            <p style={{ fontSize: "14px", color: "#6a7d90" }}>
              Review consumer-submitted complaints, inspect evidence files, and issue statutory Section 36 notices under the Legal Metrology (Packaged Commodities) Rules, 2011.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <Button secondary onClick={() => exportToCsvOrXlsx(complaintsList, "Legal_Metrology_Complaints_Audit")} style={{ fontSize: "12px", padding: "10px 14px" }}>
              <Icon name="download" size={14} /> Export Audit CSV
            </Button>
            <Button onClick={() => setPage("scan")} style={{ fontSize: "12px", padding: "10px 14px" }}>
              <Icon name="scan" size={15} /> New Inspection Scan
            </Button>
          </div>
        </div>

        {actionSuccessMessage && (
          <div
            style={{
              marginTop: "16px",
              padding: "12px 16px",
              background: "#e8f7f3",
              color: "#0f8e7d",
              border: "1px solid #bce2d8",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 700,
            }}
          >
            ✓ {actionSuccessMessage}
          </div>
        )}

        {/* Officer KPI Stats */}
        <div className="metric-grid" style={{ marginTop: "20px" }}>
          {[
            { label: "Total Consumer Complaints", val: String(complaintsList.length), change: "All complaints submitted", type: "blue" as const },
            { label: "Pending Officer Review", val: String(complaintsList.filter(c => c.status === "Submitted" || c.status === "Under Review").length), change: "Requires investigation", type: "amber" as const },
            { label: "Section 36 Notices Issued", val: String(complaintsList.filter(c => c.status === "Notice Issued").length), change: "Merchant summons active", type: "red" as const },
            { label: "Resolved / Penal Compounded", val: String(complaintsList.filter(c => c.status === "Resolved").length), change: "Cases closed", type: "green" as const },
          ].map((m) => (
            <div className="metric" key={m.label}>
              <span className={`metric-dot ${m.type}`} />
              <p>{m.label}</p>
              <strong>{m.val}</strong>
              <small className={m.type === "blue" || m.type === "green" ? "up" : ""}>{m.change}</small>
            </div>
          ))}
        </div>

        {/* Complaints Table (Showing ALL complaints submitted by consumers) */}
        <section className="table-card" style={{ marginTop: "24px" }}>
          <div className="table-top">
            <div>
              <h3>All Consumer Grievances &amp; Violations Logged</h3>
              <p>Real-time stream of complaints submitted across all retail sectors and pre-packaged commodities</p>
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              {/* Filter Tabs */}
              <div style={{ display: "flex", background: "#f0f4f7", borderRadius: "6px", padding: "2px" }}>
                {["All", "Submitted", "Under Review", "Notice Issued", "Resolved"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setStatusFilter(tab)}
                    style={{
                      padding: "6px 10px",
                      fontSize: "11px",
                      fontWeight: 600,
                      borderRadius: "5px",
                      background: statusFilter === tab ? "#fff" : "transparent",
                      color: statusFilter === tab ? "#102b4e" : "#65758a",
                      boxShadow: statusFilter === tab ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Search complaint / consumer / store..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  border: "1px solid #d4e0e5",
                  borderRadius: "6px",
                  padding: "6px 10px",
                  fontSize: "11px",
                  margin: 0,
                  width: "220px",
                }}
              />
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>COMPLAINT ID</th>
                  <th>PRIORITY</th>
                  <th>COMMUNITY REPORTS</th>
                  <th>CONSUMER</th>
                  <th>COMMODITY &amp; BRAND</th>
                  <th>ALLEGED VIOLATION</th>
                  <th>MERCHANT / LOCATION</th>
                  <th>DATE</th>
                  <th>STATUS</th>
                  <th>OFFICER ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: "center", padding: "30px", color: "#8a9bac" }}>
                      No consumer complaints found matching the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredComplaints.map((r) => {
                    const priority = r.priority || "Medium"
                    const priorityColor =
                      priority === "Critical"
                        ? "critical"
                        : priority === "High"
                        ? "high"
                        : priority === "Medium"
                        ? "medium"
                        : "low"

                    return (
                      <tr key={r.id}>
                        <td className="mono" style={{ fontWeight: 700, color: "#102b4e" }}>
                          {r.id}
                        </td>
                        <td>
                          <Badge type={priorityColor as any}>
                            {priority}
                          </Badge>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: (r.communityReports || 1) > 1 ? "#7e22ce" : "#475569" }}>
                            ⚡ {r.communityReports || 1} { (r.communityReports || 1) > 1 ? "Reports" : "Report" }
                          </span>
                        </td>
                        <td>
                          <b>{r.complainantName}</b>
                          <br />
                          <span style={{ fontSize: "10px", color: "#7a8a9a" }}>Tel: {r.complainantPhone}</span>
                        </td>
                        <td>
                          <b>{r.productName}</b>
                          <br />
                          <span style={{ fontSize: "10px", color: "#7a8a9a" }}>Barcode: {r.barcode} · MRP: ₹{r.mrp}</span>
                        </td>
                        <td>
                          <span style={{ color: "#a53c40", fontWeight: 700 }}>{r.issueType}</span>
                          {r.priceCharged && r.mrp && r.priceCharged > r.mrp && (
                            <div style={{ fontSize: "10px", color: "#c9484d" }}>
                              Charged ₹{r.priceCharged} (+₹{(r.priceCharged - r.mrp).toFixed(2)})
                            </div>
                          )}
                        </td>
                        <td>
                          <span>{r.shopName}</span>
                          <br />
                          <span style={{ fontSize: "10px", color: "#8493a2" }}>{r.shopAddress?.slice(0, 25)}...</span>
                        </td>
                        <td>{r.submittedAt}</td>
                        <td>
                          <Badge
                            type={
                              r.status === "Resolved"
                                ? "green"
                                : r.status === "Notice Issued"
                                ? "amber"
                                : r.status === "Submitted"
                                ? "blue"
                                : "amber"
                            }
                          >
                            {r.status}
                          </Badge>
                        </td>
                        <td>
                          <button
                            className="review"
                            onClick={() => {
                              setSelectedComplaint(r)
                              setOfficerNoteInput(r.remarks || "")
                            }}
                            style={{ cursor: "pointer", fontWeight: 700 }}
                          >
                            Inspect &amp; Act <Icon name="arrow" size={14} />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Officer Complaint Investigation Modal */}
        {selectedComplaint && (
          <div className="modal-overlay">
            <div className="modal-box" style={{ maxWidth: "640px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <Badge type="green">LEGAL METROLOGY INSPECTION DOSSIER</Badge>
                    <Badge
                      type={
                        selectedComplaint.priority === "Critical"
                          ? "critical"
                          : selectedComplaint.priority === "High"
                          ? "high"
                          : selectedComplaint.priority === "Medium"
                          ? "medium"
                          : "low"
                      }
                    >
                      {selectedComplaint.priority || "Medium"} Priority
                    </Badge>
                  </div>
                  <h3 style={{ fontSize: "20px", color: "#102b4e", marginTop: "4px" }}>
                    Grievance #{selectedComplaint.id}
                  </h3>
                </div>
                <button className="plain" onClick={() => setSelectedComplaint(null)}>
                  <Icon name="close" size={22} />
                </button>
              </div>

              {/* Priority Explanation Banner */}
              {selectedComplaint.priorityExplanation && (
                <div
                  style={{
                    marginTop: "12px",
                    padding: "10px 14px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 600,
                    background:
                      selectedComplaint.priority === "Critical"
                        ? "#fef2f2"
                        : selectedComplaint.priority === "High"
                        ? "#fff7ed"
                        : selectedComplaint.priority === "Medium"
                        ? "#fefce8"
                        : "#f8fafc",
                    border:
                      selectedComplaint.priority === "Critical"
                        ? "1px solid #fecaca"
                        : selectedComplaint.priority === "High"
                        ? "1px solid #fed7aa"
                        : selectedComplaint.priority === "Medium"
                        ? "1px solid #fef08a"
                        : "1px solid #e2e8f0",
                    color:
                      selectedComplaint.priority === "Critical"
                        ? "#991b1b"
                        : selectedComplaint.priority === "High"
                        ? "#9a3412"
                        : selectedComplaint.priority === "Medium"
                        ? "#854d0e"
                        : "#334155",
                  }}
                >
                  {selectedComplaint.priorityExplanation}
                </div>
              )}

              {/* Grid Summary */}
              <div style={{ marginTop: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "12px" }}>
                <div style={{ background: "#f5f9fa", padding: "12px", borderRadius: "8px" }}>
                  <span style={{ color: "#748496", fontSize: "10px", textTransform: "uppercase", fontWeight: 700 }}>
                    Commodity &amp; Price Verification
                  </span>
                  <div style={{ fontWeight: 700, color: "#102b4e", marginTop: "4px" }}>
                    {selectedComplaint.productName} ({selectedComplaint.brand})
                  </div>
                  <div>Barcode: <span className="mono" style={{ display: "inline" }}>{selectedComplaint.barcode}</span></div>
                  <div>Printed MRP: <b>₹{selectedComplaint.mrp ?? "Missing"}</b></div>
                  {selectedComplaint.priceCharged && (
                    <div style={{ color: "#c9484d", fontWeight: 700 }}>
                      Charged Price: ₹{selectedComplaint.priceCharged} (Overcharged by +₹{(selectedComplaint.priceCharged - (selectedComplaint.mrp || 0)).toFixed(2)})
                    </div>
                  )}
                  <div>Duplicate Status: <b>{selectedComplaint.duplicateStatus || "Original"}</b></div>
                </div>

                <div style={{ background: "#f5f9fa", padding: "12px", borderRadius: "8px" }}>
                  <span style={{ color: "#748496", fontSize: "10px", textTransform: "uppercase", fontWeight: 700 }}>
                    Merchant &amp; Complainant Details
                  </span>
                  <div style={{ fontWeight: 700, color: "#102b4e", marginTop: "4px" }}>
                    {selectedComplaint.shopName}
                  </div>
                  <div>Address: {selectedComplaint.shopAddress}</div>
                  <div>Complainant: <b>{selectedComplaint.complainantName}</b> ({selectedComplaint.complainantPhone})</div>
                  <div>Community Reports: <b>⚡ {selectedComplaint.communityReports || 1}</b></div>
                </div>
              </div>

              <div style={{ marginTop: "12px", padding: "12px", background: "#fff8ed", borderRadius: "8px", fontSize: "12px", border: "1px solid #f2dfb8" }}>
                <b>Alleged Violation:</b> <span style={{ color: "#a53c40", fontWeight: 700 }}>{selectedComplaint.issueType}</span>
                <p style={{ margin: "4px 0 0", color: "#54687d" }}>{selectedComplaint.description}</p>
              </div>

              <div style={{ marginTop: "12px", fontSize: "12px" }}>
                <b>Attached Evidence Files:</b>{" "}
                {selectedComplaint.evidenceFiles.map((file, i) => (
                  <span key={i} style={{ background: "#edf6f5", color: "#0f8e7d", padding: "2px 8px", borderRadius: "4px", margin: "0 4px", fontSize: "11px" }}>
                    📷 {file}
                  </span>
                ))}
              </div>

              {/* Officer Note */}
              <div style={{ marginTop: "12px" }}>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "#344b62", display: "block", marginBottom: "4px" }}>
                  Officer Inspection Note / Hearing Remarks:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Conducted merchant spot-check. Warning issued under Section 36."
                  value={officerNoteInput}
                  onChange={(e) => setOfficerNoteInput(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", fontSize: "12px", border: "1px solid #ccdbe3", borderRadius: "6px" }}
                />
              </div>

              {/* Export Statutory Notice */}
              <div style={{ marginTop: "12px", display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <Button secondary onClick={() => exportToDocx(selectedComplaint as any, officerNoteInput)} style={{ fontSize: "11px", padding: "6px 10px" }}>
                  <Icon name="file" size={13} /> Export DOCX Notice
                </Button>
                <Button onClick={() => exportToPdf(selectedComplaint as any, officerNoteInput)} style={{ fontSize: "11px", padding: "6px 12px" }}>
                  <Icon name="printer" size={13} /> Print Section 36 Notice (PDF)
                </Button>
              </div>

              {/* Officer Enforcement Action Buttons */}
              <div style={{ marginTop: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", borderTop: "1px solid #e1ebf0", paddingTop: "12px" }}>
                <Button secondary onClick={() => setSelectedComplaint(null)}>
                  Close
                </Button>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => handleApplyAction("Under Review")}
                    style={{
                      background: "#e8f1f8",
                      color: "#30719d",
                      border: "1px solid #bed6e8",
                      borderRadius: "6px",
                      padding: "8px 12px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Set Under Review
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyAction("Notice Issued")}
                    style={{
                      background: "#fcf1df",
                      color: "#aa6810",
                      border: "1px solid #ebcaa0",
                      borderRadius: "6px",
                      padding: "8px 12px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Issue Section 36 Notice
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyAction("Resolved")}
                    style={{
                      background: "#0f8e7d",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      padding: "8px 14px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Resolve &amp; Compound
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
