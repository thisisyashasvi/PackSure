import React, { useState, useEffect } from "react"
import { Page, ComplaintData, User, ScanRecord, SqlQueryResult } from "../types"
import { Icon, Logo, Button, Badge } from "../components/Icons"
import { sqlDb } from "../db/sqlEngine"
import { exportToCsvOrXlsx, exportToDocx, exportToPdf } from "../utils/reportExporter"

interface AdminDashboardProps {
  setPage: (page: Page) => void
  complaintsList: ComplaintData[]
  onUpdateComplaintStatus: (id: string, newStatus: "Under Review" | "Notice Issued" | "Resolved") => void
  onDeleteComplaint: (id: string) => void
  currentUser: User | null
  onLogout: () => void
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  setPage,
  complaintsList,
  onUpdateComplaintStatus,
  onDeleteComplaint,
  currentUser,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<string>("Overview")
  const [statusFilter, setStatusFilter] = useState<string>("All")
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintData | null>(null)
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null)

  // SQL Explorer States
  const [sqlQuery, setSqlQuery] = useState<string>("SELECT * FROM scans ORDER BY scanned_at DESC;")
  const [queryResult, setQueryResult] = useState<SqlQueryResult | null>(null)
  const [scansList, setScansList] = useState<ScanRecord[]>([])

  useEffect(() => {
    setScansList(sqlDb.getAllScans())
    // Initial SQL Query Execution
    const initialRes = sqlDb.executeSql("SELECT * FROM scans ORDER BY scanned_at DESC;")
    setQueryResult(initialRes)
  }, [])

  const handleRunSql = (queryToRun?: string) => {
    const q = queryToRun || sqlQuery
    const res = sqlDb.executeSql(q)
    setQueryResult(res)
    setScansList(sqlDb.getAllScans())
  }

  const navItems = [
    { icon: "grid" as const, name: "Overview" },
    { icon: "scan" as const, name: "Scans Archive", badge: scansList.length },
    { icon: "file" as const, name: "Complaints", badge: complaintsList.length },
    { icon: "box" as const, name: "SQL DB Explorer" },
    { icon: "search" as const, name: "Central Repository" },
    { icon: "chart" as const, name: "Analytics" },
  ]

  // Filter complaints
  const filteredComplaints = complaintsList.filter((c) => {
    const matchesStatus =
      statusFilter === "All" ||
      (statusFilter === "Under Review" && c.status === "Under Review") ||
      (statusFilter === "Notice Issued" && c.status === "Notice Issued") ||
      (statusFilter === "Resolved" && c.status === "Resolved") ||
      (statusFilter === "Submitted" && c.status === "Submitted")

    const matchesSearch =
      c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.shopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.issueType.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesStatus && matchesSearch
  })

  const handleApplyAction = (status: "Under Review" | "Notice Issued" | "Resolved") => {
    if (selectedComplaint) {
      onUpdateComplaintStatus(selectedComplaint.id, status)
      setActionSuccessMessage(`Enforcement Action Updated: Status changed to "${status}" for ${selectedComplaint.id}`)
      setTimeout(() => {
        setActionSuccessMessage(null)
        setSelectedComplaint(null)
      }, 1500)
    }
  }

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const confirmDelete = window.confirm(`Are you sure you want to permanently delete complaint ${id} from the SQL database?`)
    if (confirmDelete) {
      onDeleteComplaint(id)
      setActionSuccessMessage(`Complaint ${id} was permanently removed from SQL database.`)
      if (selectedComplaint?.id === id) {
        setSelectedComplaint(null)
      }
      setTimeout(() => setActionSuccessMessage(null), 2500)
    }
  }

  // Admin Officer Details
  const adminName = currentUser?.name || "Yashasvi (Administrator & Review Officer)"
  const adminEmail = currentUser?.email || "thisisyashasvi@gmail.com"

  return (
    <div className="admin">
      {/* Sidebar */}
      <aside className="admin-side">
        <div onClick={() => setPage("home")} style={{ cursor: "pointer" }}>
          <Logo />
        </div>

        <div style={{ padding: "0 10px", marginTop: "8px" }}>
          <span style={{ fontSize: "10px", letterSpacing: "1px", color: "#6e94b5", textTransform: "uppercase" }}>
            Legal Metrology Portal
          </span>
        </div>

        <div className="admin-nav">
          {navItems.map((item) => (
            <button
              key={item.name}
              className={activeTab === item.name ? "active" : ""}
              onClick={() => {
                if (item.name === "Central Repository") {
                  setPage("repository")
                } else {
                  setActiveTab(item.name)
                }
              }}
            >
              <Icon name={item.icon} />
              {item.name}
              {item.badge !== undefined && <em>{item.badge}</em>}
            </button>
          ))}
        </div>

        <div style={{ marginTop: "24px", padding: "0 10px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <Button
            secondary
            onClick={() => setPage("home")}
            style={{ width: "100%", fontSize: "12px", padding: "8px", background: "#1c3d61", color: "#fff", border: "1px solid #2d557f" }}
          >
            ← Exit to Consumer App
          </Button>

          <button
            onClick={() => {
              onLogout()
              setPage("auth")
            }}
            style={{
              width: "100%",
              fontSize: "11px",
              padding: "7px",
              background: "#2d2024",
              color: "#e88d92",
              border: "1px solid #5a3036",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Sign Out
          </button>
        </div>

        <div className="admin-user">
          <span>{adminName.slice(0, 2).toUpperCase()}</span>
          <div>
            <b>{adminName}</b>
            <small>{adminEmail}</small>
          </div>
          <Icon name="shield" size={15} style={{ color: "#7ce5cf" }} />
        </div>
      </aside>

      {/* Main Admin Dashboard */}
      <main className="admin-main">
        {/* Head Bar */}
        <div className="admin-head">
          <div>
            <div className="section-label">LEGAL METROLOGY ENFORCEMENT &amp; SQL ENGINE</div>
            <h1>Good morning, {adminName.split(" ")[0]}.</h1>
            <p>Here’s the real-time packaged commodity compliance, consumer grievances, and SQL database explorer.</p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button className="date-btn">
              <Icon name="clock" size={16} /> Live Database
            </button>
            <button
              className="bell"
              onClick={() => alert(`SQL Database Status: OK. ${scansList.length} total scans recorded.`)}
              title="Database Status"
            >
              ⌁
            </button>
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

        {/* TAB 1: OVERVIEW */}
        {activeTab === "Overview" && (
          <>
            {/* Metric Cards */}
            <div className="metric-grid">
              {[
                { label: "Total scans in SQL DB", val: String(18490 + scansList.length), change: `${scansList.length} in this session`, type: "blue" as const },
                { label: "Potential statutory violations", val: "1,286", change: "6.9% violation rate", type: "red" as const },
                { label: "Active consumer complaints", val: String(complaintsList.length), change: `${complaintsList.filter(c => c.status !== 'Resolved').length} need review`, type: "amber" as const },
                { label: "Products in SQL Catalog", val: String(sqlDb.getAllProducts().length), change: "100% Barcode coverage", type: "green" as const },
              ].map((m) => (
                <div className="metric" key={m.label}>
                  <span className={`metric-dot ${m.type}`} />
                  <p>{m.label}</p>
                  <strong>{m.val}</strong>
                  <small className={m.type === "blue" || m.type === "green" ? "up" : ""}>{m.change}</small>
                </div>
              ))}
            </div>

            {/* Middle Row: Charts & Heatmap */}
            <div className="chart-row">
              {/* Violations by Category */}
              <section className="chart-card">
                <div className="card-heading">
                  <div>
                    <h3>Violations by Category (LMPC 2011)</h3>
                    <p>Breakdown of flagged commodity declarations</p>
                  </div>
                  <button onClick={() => setActiveTab("SQL DB Explorer")}>
                    Query SQL DB <Icon name="arrow" size={14} />
                  </button>
                </div>

                <div className="bars">
                  {[
                    { name: "Food & Beverages", count: 82, pct: 82 },
                    { name: "Personal Care & Cosmetics", count: 59, pct: 59 },
                    { name: "Dairy & Packaged Milk", count: 47, pct: 47 },
                    { name: "Edible Oils & Ghee", count: 42, pct: 42 },
                    { name: "Snacks & Confectionery", count: 28, pct: 28 },
                  ].map((bar) => (
                    <div className="bar" key={bar.name}>
                      <span style={{ fontSize: "11px" }}>{bar.name}</span>
                      <i>
                        <b style={{ width: `${bar.pct}%` }} />
                      </i>
                      <em>{bar.count}</em>
                    </div>
                  ))}
                </div>
              </section>

              {/* Regional Heatmap */}
              <section className="location-card">
                <div className="card-heading">
                  <div>
                    <h3>Top Reporting Districts</h3>
                    <p>Enforcement activity by jurisdiction</p>
                  </div>
                </div>

                <div className="india-map">
                  INDIA
                  <div className="map-dot a" title="Delhi NCR (68 cases)" />
                  <div className="map-dot b" title="Mumbai (51 cases)" />
                  <div className="map-dot c" title="Bengaluru (43 cases)" />
                </div>

                <div className="location-list">
                  <span>
                    <i /> Delhi NCR <b>68</b>
                  </span>
                  <span>
                    <i /> Mumbai <b>51</b>
                  </span>
                  <span>
                    <i /> Bengaluru <b>43</b>
                  </span>
                  <span>
                    <i /> Pune <b>29</b>
                  </span>
                </div>
              </section>
            </div>
          </>
        )}

        {/* TAB 2: SCANS ARCHIVE (Stored Scan Files & Barcode Records) */}
        {(activeTab === "Scans Archive" || activeTab === "Overview") && (
          <section className="table-card" style={{ marginTop: "24px" }}>
            <div className="table-top">
              <div>
                <h3>SQL Scans Archive &amp; Stored Label Files</h3>
                <p>Real-time audit log of all scanned packaged commodities, barcodes, and uploaded image files</p>
              </div>
              <Button secondary onClick={() => setScansList(sqlDb.getAllScans())} style={{ fontSize: "11px", padding: "6px 10px" }}>
                <Icon name="refresh" size={13} /> Refresh Scans
              </Button>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>SCAN ID</th>
                    <th>STORED FILE / IMAGE</th>
                    <th>BARCODE</th>
                    <th>DETECTED PRODUCT</th>
                    <th>USER</th>
                    <th>SCORE &amp; STATUS</th>
                    <th>TIMESTAMP</th>
                  </tr>
                </thead>
                <tbody>
                  {scansList.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "20px" }}>No scans recorded yet.</td>
                    </tr>
                  ) : (
                    scansList.map((s) => (
                      <tr key={s.id}>
                        <td className="mono" style={{ fontWeight: 700, color: "#102b4e" }}>{s.id}</td>
                        <td>
                          <span style={{ background: "#edf5f8", padding: "3px 8px", borderRadius: "4px", fontSize: "11px", color: "#1c5a75" }}>
                            📷 {s.imageFileName}
                          </span>
                        </td>
                        <td className="mono">{s.barcode}</td>
                        <td>
                          <b>{s.productName}</b>
                          <br />
                          <span style={{ fontSize: "10px", color: "#7a8a9a" }}>Brand: {s.brand}</span>
                        </td>
                        <td>{s.userName || "Citizen"}</td>
                        <td>
                          <Badge type={s.complianceStatus === "Likely Compliant" ? "green" : "red"}>
                            {s.complianceScore}/100 ({s.complianceStatus})
                          </Badge>
                        </td>
                        <td>{s.scannedAt}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* TAB 3: SQL DATABASE EXPLORER */}
        {activeTab === "SQL DB Explorer" && (
          <section className="table-card" style={{ marginTop: "24px", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h3 style={{ fontSize: "18px", color: "#102b4e" }}>Interactive SQL Database Engine</h3>
                <p style={{ fontSize: "12px", color: "#6a7b8c", marginTop: "2px" }}>
                  Query relational tables in real-time (`users`, `products`, `scans`, `complaints`)
                </p>
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                {[
                  { label: "All Scans", q: "SELECT * FROM scans;" },
                  { label: "Users Table", q: "SELECT * FROM users;" },
                  { label: "Products Catalog", q: "SELECT * FROM products;" },
                  { label: "Complaints", q: "SELECT * FROM complaints;" },
                  { label: "Show Tables", q: "SHOW TABLES;" },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    onClick={() => {
                      setSqlQuery(btn.q)
                      handleRunSql(btn.q)
                    }}
                    style={{
                      fontSize: "11px",
                      padding: "6px 10px",
                      background: "#f0f5f7",
                      border: "1px solid #cddde3",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontWeight: 600,
                      color: "#183856",
                    }}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Query Input Box */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
              <input
                type="text"
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRunSql()}
                placeholder="Enter SQL Query e.g. SELECT * FROM products;"
                style={{
                  flex: 1,
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "13px",
                  padding: "12px",
                  border: "1px solid #b7cdd7",
                  borderRadius: "8px",
                  margin: 0,
                  background: "#183451",
                  color: "#7ce5cf",
                }}
              />
              <Button onClick={() => handleRunSql()}>
                <Icon name="arrow" size={16} /> Execute SQL
              </Button>
            </div>

            {/* Results Table */}
            {queryResult && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#647789", marginBottom: "8px" }}>
                  <span>Rows returned: <b>{queryResult.rowCount}</b></span>
                  <span>Execution time: <b>{queryResult.executionTimeMs} ms</b></span>
                </div>

                <div className="table-wrap" style={{ maxHeight: "400px", overflowY: "auto", border: "1px solid #e1e9ed", borderRadius: "8px" }}>
                  <table>
                    <thead>
                      <tr>
                        {queryResult.columns.map((col) => (
                          <th key={col}>{col.toUpperCase()}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {queryResult.rows.map((row, idx) => (
                        <tr key={idx}>
                          {queryResult.columns.map((col) => (
                            <td key={col} className={col.includes("id") || col.includes("barcode") ? "mono" : ""}>
                              {String(row[col] ?? "NULL")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}

        {/* TAB 4: COMPLAINTS MANAGEMENT WITH DELETE ABILITY */}
        {(activeTab === "Complaints" || activeTab === "Overview") && (
          <section className="table-card" style={{ marginTop: "24px" }}>
            <div className="table-top">
              <div>
                <h3>Active Consumer Grievances &amp; Enforcement Actions</h3>
                <p>Review dossiers, issue notices, compound cases, or remove invalid complaints</p>
              </div>

              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                {/* Filter Tabs */}
                <div style={{ display: "flex", background: "#f0f4f7", borderRadius: "6px", padding: "2px" }}>
                  {["All", "Under Review", "Notice Issued", "Resolved"].map((tab) => (
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
                  placeholder="Search complaint / product..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    border: "1px solid #d4e0e5",
                    borderRadius: "6px",
                    padding: "6px 10px",
                    fontSize: "11px",
                    margin: 0,
                    width: "180px",
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
                    <th>DUPLICATE STATUS</th>
                    <th>PRODUCT &amp; BRAND</th>
                    <th>ISSUE TYPE</th>
                    <th>MERCHANT / LOCATION</th>
                    <th>DATE</th>
                    <th>STATUS</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredComplaints.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: "center", padding: "28px", color: "#8a9bac" }}>
                        No complaints found matching the selected filter.
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
                            <Badge type={r.duplicateStatus === "Joined Community Report" ? "purple" : r.duplicateStatus === "Independent Duplicate" ? "amber" : "blue"}>
                              {r.duplicateStatus || "Original"}
                            </Badge>
                          </td>
                          <td>
                            <b>{r.productName}</b>
                            <br />
                            <span style={{ fontSize: "10px", color: "#8493a2" }}>Barcode: {r.barcode}</span>
                          </td>
                          <td>
                            <span style={{ color: "#a53c40", fontWeight: 600 }}>{r.issueType}</span>
                          </td>
                          <td>
                            <span>{r.shopName}</span>
                            <br />
                            <span style={{ fontSize: "10px", color: "#8493a2" }}>{r.shopAddress?.slice(0, 30)}...</span>
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
                            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                              <button
                                className="review"
                                onClick={() => setSelectedComplaint(r)}
                                style={{ cursor: "pointer" }}
                              >
                                Review <Icon name="arrow" size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleDelete(r.id, e)}
                                style={{
                                  color: "#c9484d",
                                  background: "#fdf0ef",
                                  border: "1px solid #f9d5d4",
                                  borderRadius: "4px",
                                  padding: "4px 8px",
                                  fontSize: "10px",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                                title="Delete Complaint"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Complaint Review Modal with Delete Action */}
        {selectedComplaint && (
          <div className="modal-overlay">
            <div className="modal-box" style={{ maxWidth: "600px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                <div>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <Badge type="blue">ENFORCEMENT DOSSIER</Badge>
                    {selectedComplaint.priority && (
                      <Badge type={selectedComplaint.priority.toLowerCase() as any}>
                        PRIORITY: {selectedComplaint.priority.toUpperCase()}
                      </Badge>
                    )}
                    {selectedComplaint.communityReports && selectedComplaint.communityReports > 1 && (
                      <Badge type="purple">⚡ {selectedComplaint.communityReports} Community Reports</Badge>
                    )}
                  </div>
                  <h3 style={{ fontSize: "20px", color: "#102b4e", marginTop: "4px" }}>
                    Grievance #{selectedComplaint.id}
                  </h3>
                </div>
                <button className="plain" onClick={() => setSelectedComplaint(null)}>
                  <Icon name="close" size={22} />
                </button>
              </div>

              {/* Priority Explanation Notice */}
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

              <div style={{ marginTop: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "12px" }}>
                <div style={{ background: "#f5f9fa", padding: "12px", borderRadius: "8px" }}>
                  <span style={{ color: "#748496", fontSize: "10px", textTransform: "uppercase" }}>Commodity Details</span>
                  <div style={{ fontWeight: 700, color: "#102b4e", marginTop: "4px" }}>
                    {selectedComplaint.productName}
                  </div>
                  <div>Barcode: {selectedComplaint.barcode}</div>
                  <div>Printed MRP: ₹{selectedComplaint.mrp ?? "Missing"}</div>
                  {selectedComplaint.priceCharged && (
                    <div style={{ color: "#c9484d", fontWeight: 700 }}>
                      Charged Price: ₹{selectedComplaint.priceCharged}
                    </div>
                  )}
                  <div>Duplicate Status: <b>{selectedComplaint.duplicateStatus || "Original"}</b></div>
                </div>

                <div style={{ background: "#f5f9fa", padding: "12px", borderRadius: "8px" }}>
                  <span style={{ color: "#748496", fontSize: "10px", textTransform: "uppercase" }}>Merchant &amp; Complainant</span>
                  <div style={{ fontWeight: 700, color: "#102b4e", marginTop: "4px" }}>
                    {selectedComplaint.shopName}
                  </div>
                  <div>Location: {selectedComplaint.shopAddress}</div>
                  <div>Consumer: {selectedComplaint.complainantName} ({selectedComplaint.complainantPhone})</div>
                  <div>Community Reports: <b>⚡ {selectedComplaint.communityReports || 1}</b></div>
                </div>
              </div>

              <div style={{ marginTop: "12px", padding: "12px", background: "#fff8ed", borderRadius: "8px", fontSize: "12px", border: "1px solid #f2dfb8" }}>
                <b>Alleged Violation:</b> {selectedComplaint.issueType}
                <p style={{ margin: "4px 0 0", color: "#54687d" }}>{selectedComplaint.description}</p>
              </div>

              <div style={{ marginTop: "12px", fontSize: "12px" }}>
                <b>Attached Evidence:</b> {selectedComplaint.evidenceFiles.join(", ") || "label_scan.jpg"}
              </div>

              {/* Action Buttons for Officer */}
              <div style={{ marginTop: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => handleDelete(selectedComplaint.id)}
                  style={{
                    color: "#a53c40",
                    background: "#fdf0ef",
                    border: "1px solid #f9d5d4",
                    borderRadius: "6px",
                    padding: "8px 12px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Delete Complaint
                </button>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
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
