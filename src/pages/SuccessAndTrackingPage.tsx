import React, { useState } from "react"
import { Page, ComplaintData, User } from "../types"
import { Icon, Button, Badge } from "../components/Icons"
import { SEED_COMPLAINTS } from "../data/sampleProducts"

interface TrackingPageProps {
  setPage: (page: Page) => void
  recentComplaint?: ComplaintData | null
  complaintsList: ComplaintData[]
  currentUser?: User | null
}

export const SuccessAndTrackingPage: React.FC<TrackingPageProps> = ({
  setPage,
  recentComplaint,
  complaintsList,
  currentUser,
}) => {
  const isStaff =
    currentUser?.role === "admin" ||
    currentUser?.role === "officer" ||
    currentUser?.email?.toLowerCase() === "thisisyashasvi@gmail.com"

  // Filter complaints so consumers only see their own lodged complaints; Admins & Officers see all
  const userComplaints = isStaff
    ? complaintsList
    : currentUser
    ? complaintsList.filter((c) => {
        const matchEmail =
          currentUser.email && c.complainantEmail && c.complainantEmail.toLowerCase() === currentUser.email.toLowerCase()
        const matchPhone = currentUser.phone && c.complainantPhone && c.complainantPhone === currentUser.phone
        const matchUserId = c.userId && c.userId === currentUser.id
        const matchRecent = recentComplaint && c.id === recentComplaint.id
        return matchEmail || matchPhone || matchUserId || matchRecent
      })
    : recentComplaint
    ? complaintsList.filter((c) => c.id === recentComplaint.id)
    : []

  const initialComplaint = recentComplaint || userComplaints[0] || (isStaff ? SEED_COMPLAINTS[0] : null)
  const [searchId, setSearchId] = useState<string>(initialComplaint?.id || "")
  const [activeComplaint, setActiveComplaint] = useState<ComplaintData | null>(initialComplaint)
  const [showAcknowledgement, setShowAcknowledgement] = useState<boolean>(!!recentComplaint)
  const [feedbackSuccess, setFeedbackSuccess] = useState<boolean>(false)

  // Handle search / lookup with privacy verification
  const handleSearch = (idToSearch?: string) => {
    const target = (idToSearch || searchId).trim().toUpperCase()
    if (!target) return

    const found = complaintsList.find((c) => c.id.toUpperCase() === target)
    if (!found) {
      alert(`Complaint ID "${target}" not found. Please verify your Grievance Tracking ID.`)
      return
    }

    const isOwner =
      (currentUser?.email && found.complainantEmail?.toLowerCase() === currentUser.email.toLowerCase()) ||
      (currentUser?.phone && found.complainantPhone === currentUser.phone) ||
      (currentUser?.id && found.userId === currentUser.id) ||
      (recentComplaint && found.id === recentComplaint.id)

    if (isStaff || isOwner) {
      setActiveComplaint(found)
      setShowAcknowledgement(false)
    } else {
      alert(`Access Restricted: Grievance "${target}" is private. It can only be viewed by the complainant who filed it, or by Legal Metrology Officers and Admins.`)
    }
  }

  // If user just submitted a complaint and wants to see the success receipt screen first
  if (showAcknowledgement && activeComplaint) {
    return (
      <main className="confirmation">
        <div className="success-ring">
          <Icon name="check" size={38} />
        </div>
        <div className="section-label">GRIEVANCE REGISTERED &amp; ACKNOWLEDGED</div>
        <h1>Thank you for speaking up.</h1>
        <p>
          Your complaint has been formally recorded under Section 18 of the Legal Metrology Act, 2009. An automated enforcement dossier has been created.
        </p>

        <div className="complaint-id" style={{ background: "#f8fafb" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "6px" }}>
            <span>OFFICIAL GRIEVANCE TRACKING ID</span>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              {activeComplaint.priority && (
                <Badge type={activeComplaint.priority.toLowerCase() as any}>
                  PRIORITY: {activeComplaint.priority.toUpperCase()}
                </Badge>
              )}
              {activeComplaint.communityReports && activeComplaint.communityReports > 1 && (
                <Badge type="purple">⚡ {activeComplaint.communityReports} Community Reports</Badge>
              )}
            </div>
          </div>
          <strong>{activeComplaint.id}</strong>
          <small style={{ display: "block", marginTop: "6px", fontSize: "11px", color: "#6b7d8e" }}>
            Product: <b>{activeComplaint.productName}</b>
          </small>
          {activeComplaint.priorityExplanation && (
            <p style={{ margin: "8px 0 0", fontSize: "11px", color: "#647589", fontStyle: "italic" }}>
              {activeComplaint.priorityExplanation}
            </p>
          )}
        </div>

        <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap", marginBottom: "20px" }}>
          <Button onClick={() => setShowAcknowledgement(false)}>
            Track live status <Icon name="arrow" size={17} />
          </Button>
          <Button
            secondary
            onClick={() => {
              alert(`Acknowledgement slip for ${activeComplaint.id} downloaded successfully.`)
            }}
          >
            <Icon name="download" size={16} /> Download Receipt PDF
          </Button>
        </div>

        <button className="text-btn" onClick={() => setPage("home")}>
          Back to home
        </button>
      </main>
    )
  }

  const c = activeComplaint

  return (
    <main className="page-shell tracking">
      {/* Header */}
      <div className="crumb">
        <button className="plain" onClick={() => setPage("home")}>Home</button>
        <Icon name="chevron" size={14} />
        <span>Track Grievance Status</span>
      </div>

      <div className="section-label" style={{ marginTop: "24px" }}>
        NATIONAL CONSUMER GRIEVANCE TRACKER
      </div>
      <h1>Track your complaint.</h1>
      <p>
        Enter your official PackSure Complaint ID (e.g. <b>PKS-2026-00124</b>) to view real-time enforcement actions by the Legal Metrology Department.
      </p>

      {/* Search Bar */}
      <div className="track-search">
        <Icon name="search" size={20} />
        <input
          type="text"
          placeholder="Enter complaint ID e.g. PKS-2026-00124"
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <Button onClick={() => handleSearch()}>Search Grievance</Button>
      </div>

      {/* Quick Lookup Chips */}
      <div style={{ marginTop: "12px", display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: "11px", color: "#6b7d8e", fontWeight: 600 }}>
          {isStaff ? "Quick Demo IDs (Staff Console):" : "Your Filed Grievances:"}
        </span>
        {userComplaints.length > 0 ? (
          userComplaints.slice(0, 5).map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setSearchId(item.id)
                setActiveComplaint(item)
                setShowAcknowledgement(false)
              }}
              style={{
                background: c?.id === item.id ? "#102b4e" : "#f1f5f6",
                color: c?.id === item.id ? "#fff" : "#15304c",
                border: "1px solid #d4e0e5",
                borderRadius: "6px",
                padding: "4px 10px",
                fontSize: "11px",
                fontFamily: "'DM Mono', monospace",
                cursor: "pointer",
              }}
            >
              {item.id}
            </button>
          ))
        ) : (
          <span style={{ fontSize: "11px", color: "#8a9aa8", fontStyle: "italic" }}>
            {currentUser ? "No grievances filed under your account yet." : "Log in or enter a Grievance ID above to track your complaint."}
          </span>
        )}
      </div>

      {/* Tracking Content or Empty State */}
      {!c ? (
        <section
          style={{
            marginTop: "28px",
            background: "#fff",
            border: "1px solid #dbe5ea",
            borderRadius: "12px",
            padding: "40px 24px",
            textAlign: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "50%",
              background: "#eef7f5",
              color: "#0f8e7d",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <Icon name="shield" size={26} />
          </div>
          <h3 style={{ margin: "0 0 8px", color: "#102b4e", fontSize: "18px" }}>No Grievance Selected</h3>
          <p style={{ color: "#647589", fontSize: "14px", maxWidth: "460px", margin: "0 auto 24px" }}>
            {currentUser
              ? "You haven't filed any packaging compliance grievances yet. Scan a commodity to check compliance or lodge a new complaint."
              : "Complaints are confidential to the complainant and enforcement officers. Please sign in or enter your Grievance ID above to track."}
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <Button onClick={() => setPage("scan")}>
              <Icon name="camera" size={16} /> Scan a Product
            </Button>
            {!currentUser && (
              <Button secondary onClick={() => setPage("auth")}>
                <Icon name="user" size={16} /> Sign In
              </Button>
            )}
          </div>
        </section>
      ) : (
      <div className="track-content">
        {/* Left Side: Real-time Timeline Card */}
        <section className="timeline-card">
          <div className="card-heading">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <h3 style={{ margin: 0 }}>Grievance #{c.id}</h3>
                <Badge
                  type={
                    c.status === "Resolved"
                      ? "green"
                      : c.status === "Notice Issued"
                      ? "amber"
                      : "blue"
                  }
                >
                  {c.status}
                </Badge>
                {c.priority && (
                  <Badge type={c.priority.toLowerCase() as any}>
                    PRIORITY: {c.priority.toUpperCase()}
                  </Badge>
                )}
                {c.communityReports && c.communityReports > 1 && (
                  <Badge type="purple">⚡ {c.communityReports} Community Reports</Badge>
                )}
              </div>
              <p style={{ marginTop: "4px" }}>Submitted on {c.submittedAt} · Legal Metrology Unit</p>
              {c.priorityExplanation && (
                <div style={{ fontSize: "11px", color: "#647589", marginTop: "4px", fontStyle: "italic" }}>
                  {c.priorityExplanation}
                </div>
              )}
            </div>
            <Button
              secondary
              style={{ fontSize: "12px", padding: "6px 12px" }}
              onClick={() => alert(`Official verification certificate for ${c.id} generated.`)}
            >
              <Icon name="printer" size={14} /> Print Dossier
            </Button>
          </div>

          {/* Timeline Stages */}
          <div className="timeline">
            {c.timeline.map((step, idx) => (
              <div
                key={idx}
                className={`timeline-step ${step.completed ? "done" : ""} ${step.current ? "current" : ""}`}
              >
                <span>
                  {step.completed ? (
                    <Icon name="check" size={15} />
                  ) : step.current ? (
                    <Icon name="clock" size={15} />
                  ) : (
                    step.stage
                  )}
                </span>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <b>{step.title}</b>
                    <small style={{ color: "#748496" }}>{step.time}</small>
                  </div>
                  <p>{step.description}</p>
                  <small style={{ color: step.current ? "#0f8e7d" : "#98a5b0" }}>
                    {step.date} {step.current && "· In Progress"}
                  </small>
                </div>
              </div>
            ))}
          </div>

          {/* Officer remarks if available */}
          {c.remarks && (
            <div
              style={{
                marginTop: "10px",
                padding: "14px",
                background: "#f0f7f6",
                borderRadius: "8px",
                borderLeft: "3px solid #0f8e7d",
                fontSize: "12px",
                color: "#18454b",
              }}
            >
              <b>Inspection Officer Note:</b>
              <p style={{ margin: "4px 0 0", color: "#3d646b" }}>{c.remarks}</p>
            </div>
          )}
        </section>

        {/* Right Side: Grievance Summary Card */}
        <aside className="summary-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <h3 style={{ margin: 0 }}>Grievance Summary</h3>
            {c.priority && (
              <Badge type={c.priority.toLowerCase() as any}>
                {c.priority}
              </Badge>
            )}
          </div>

          <div className="summary-line">
            <span>Product &amp; Brand</span>
            <b>{c.productName}</b>
            <span style={{ fontSize: "10px", color: "#7f8e9b" }}>Barcode: {c.barcode}</span>
          </div>

          <div className="summary-line">
            <span>Issue Reported</span>
            <b style={{ color: "#c9484d" }}>{c.issueType}</b>
          </div>

          <div className="summary-line">
            <span>Merchant / Shop</span>
            <b>{c.shopName}</b>
            <span style={{ fontSize: "10px", color: "#7f8e9b" }}>{c.shopAddress}</span>
          </div>

          {c.communityReports && (
            <div className="summary-line">
              <span>Community Reports</span>
              <b>⚡ {c.communityReports} reports merged</b>
            </div>
          )}

          {c.priceCharged && c.mrp && (
            <div className="summary-line">
              <span>Price Charged vs MRP</span>
              <b>
                Charged ₹{c.priceCharged.toFixed(2)} (Printed MRP: ₹{c.mrp.toFixed(2)})
              </b>
            </div>
          )}

          <div className="summary-line">
            <span>Evidence Attached</span>
            <b>{c.evidenceFiles.length} files verified</b>
          </div>

          <div className="summary-line">
            <span>Investigating Officer</span>
            <b>{c.officerName || "Inspector Aarav Sharma"}</b>
          </div>

          <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <button
              onClick={() => {
                setFeedbackSuccess(true)
                setTimeout(() => setFeedbackSuccess(false), 3000)
              }}
              style={{
                background: "#e8f4f2",
                border: "1px solid #c0ded8",
                borderRadius: "8px",
                padding: "10px",
                fontSize: "12px",
                fontWeight: 700,
                color: "#0f8e7d",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <Icon name="upload" size={14} />
              {feedbackSuccess ? "Supplementary Evidence Added!" : "Add More Evidence"}
            </button>

            <button
              className="plain"
              onClick={() => setPage("scan")}
              style={{ fontSize: "12px", color: "#54687d", textAlign: "center", marginTop: "4px" }}
            >
              ← Scan another product
            </button>
          </div>
        </aside>
      </div>
      )}
    </main>
  )
}
