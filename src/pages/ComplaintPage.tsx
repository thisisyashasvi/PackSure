import React, { useState, useEffect } from "react"
import { Page, ProductData, ComplaintData, User } from "../types"
import { Icon, Button, Badge } from "../components/Icons"
import { DEFAULT_PRODUCT } from "../data/sampleProducts"
import { sqlDb } from "../db/sqlEngine"
import { calculateComplaintPriority, findDuplicateComplaint } from "../utils/complianceEngine"

interface ComplaintPageProps {
  setPage: (page: Page) => void
  product: ProductData
  initialIssue?: string
  onSubmitComplaint: (newComplaint: ComplaintData) => void
  currentUser?: User | null
  complaintsList?: ComplaintData[]
  onJoinExistingComplaint?: (existingId: string) => void
}

export const ComplaintPage: React.FC<ComplaintPageProps> = ({
  setPage,
  product = DEFAULT_PRODUCT,
  initialIssue = "Overcharging above MRP",
  onSubmitComplaint,
  currentUser,
  complaintsList = [],
  onJoinExistingComplaint,
}) => {
  const [issueType, setIssueType] = useState<string>(initialIssue)

  // Auth method detection: Email vs Phone OTP
  const isPhoneAuthUser = !!currentUser?.phone && (!currentUser?.email || currentUser.email.includes("@phone.packsure.in") || currentUser.email === "citizen@packsure.in")
  const isEmailAuthUser = !!currentUser?.email && !currentUser.email.includes("@phone.packsure.in") && currentUser.email !== "citizen@packsure.in"
  
  // Editable Product Details State (Inherited from scan if available, else clean empty)
  const [productName, setProductName] = useState<string>(product?.name || "")
  const [brand, setBrand] = useState<string>(product?.brand || "")
  const [barcode, setBarcode] = useState<string>(product?.barcode || "")
  const [mrp, setMrp] = useState<string>(product?.mrp ? String(product.mrp) : "")
  const [netQuantity, setNetQuantity] = useState<string>(product?.netQuantity || "")
  const [showProductPicker, setShowProductPicker] = useState<boolean>(false)

  // Incident and merchant details - Empty by default
  const [shopName, setShopName] = useState<string>("")
  const [shopAddress, setShopAddress] = useState<string>("")
  const [description, setDescription] = useState<string>("")
  const [priceCharged, setPriceCharged] = useState<string>("")

  // Complainant Contact Info
  const [complainantName, setComplainantName] = useState<string>("")
  const [complainantPhone, setComplainantPhone] = useState<string>(isPhoneAuthUser ? (currentUser?.phone || "") : "")
  const [complainantEmail, setComplainantEmail] = useState<string>(isEmailAuthUser ? (currentUser?.email || "") : "")

  // Duplicate Check Modal State
  const [duplicateMatch, setDuplicateMatch] = useState<ComplaintData | null>(null)
  const [showDuplicateModal, setShowDuplicateModal] = useState<boolean>(false)

  useEffect(() => {
    if (currentUser) {
      const isPhoneAuth = !!currentUser.phone && (!currentUser.email || currentUser.email.includes("@phone.packsure.in") || currentUser.email === "citizen@packsure.in")
      const isEmailAuth = !!currentUser.email && !currentUser.email.includes("@phone.packsure.in") && currentUser.email !== "citizen@packsure.in"

      if (isEmailAuth) {
        setComplainantEmail(currentUser.email)
      } else {
        setComplainantEmail("")
      }

      if (isPhoneAuth) {
        setComplainantPhone(currentUser.phone || "")
      }
    }
  }, [currentUser])
  const [evidenceFiles, setEvidenceFiles] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // Real-time calculated priority
  const calculatedPriority = calculateComplaintPriority(
    {
      issueType,
      mrp: mrp ? parseFloat(mrp) : (product?.mrp || null),
      priceCharged: priceCharged ? parseFloat(priceCharged) : undefined,
      description,
    },
    product
  )

  const issueOptions = [
    "Overcharging above MRP",
    "Expired product sold",
    "MRP missing or illegible",
    "Net quantity missing or short",
    "Missing manufacturer details",
    "Misleading / Tampered label",
    "Other LMPC violation",
  ]

  // Select a product from SQL DB catalog
  const handleSelectFromDb = (p: ProductData) => {
    setProductName(p.name)
    setBrand(p.brand)
    setBarcode(p.barcode)
    setMrp(p.mrp ? String(p.mrp) : "")
    setNetQuantity(p.netQuantity || "")
    if (p.mrp) {
      setPriceCharged(String(p.mrp + 10))
    }
    setShowProductPicker(false)
  }

  const handleEvidenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setEvidenceFiles((prev) => [...prev, file.name])
    }
  }

  const handleUseGps = () => {
    setShopAddress("Sector 18 Market, Noida, Gautam Buddha Nagar, UP (28.5708° N, 77.3271° E)")
  }

  const executeSubmit = (duplicateStatus: "Original" | "Independent Duplicate" = "Original") => {
    setIsSubmitting(true)
    setShowDuplicateModal(false)

    setTimeout(() => {
      // Generate realistic complaint ID (such as PKS-2026-00124)
      const randomNum = Math.floor(10000 + Math.random() * 90000)
      const generatedId = `PKS-2026-${randomNum}`

      const parsedMrp = mrp ? parseFloat(mrp) : (product?.mrp || 30)
      const parsedPrice = priceCharged ? parseFloat(priceCharged) : (parsedMrp + 5)

      const newComplaint: ComplaintData = {
        id: generatedId,
        userId: currentUser?.id,
        barcode: barcode || product?.barcode || "8901063012159",
        productName: productName || product?.name || "Packaged Commodity",
        brand: brand || product?.brand || "Packaged Goods",
        issueType,
        shopName: shopName || "Local Retail Store",
        shopAddress: shopAddress || "Market Locality",
        locationCoords: "28.5708° N, 77.3271° E",
        description: description || "Packaging compliance grievance filed under Legal Metrology Act, 2009.",
        mrp: parsedMrp,
        priceCharged: parsedPrice,
        evidenceFiles,
        complainantName: complainantName || "Citizen Complainant",
        complainantPhone: complainantPhone || (isPhoneAuthUser ? (currentUser?.phone || "") : ""),
        complainantEmail: complainantEmail || (isEmailAuthUser ? (currentUser?.email || "") : ""),
        submittedAt: new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }) + ", " + new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        status: "Submitted",
        officerName: "Inspector Aarav Sharma (Legal Metrology Unit)",
        priority: calculatedPriority.priority,
        priorityExplanation: calculatedPriority.explanation,
        communityReports: 1,
        duplicateStatus,
        timeline: [
          {
            stage: "1",
            title: "Grievance Lodged",
            description: `Complaint ${generatedId} recorded in Legal Metrology National Portal.`,
            date: "Today",
            time: "Just now",
            completed: true,
          },
          {
            stage: "2",
            title: "Automated OCR & Evidence Matching",
            description: `Evidence matched with commodity ${barcode || "8901063012159"}.`,
            date: "Today",
            time: "Processing",
            completed: true,
            current: true,
          },
          {
            stage: "3",
            title: "Under Review by Legal Metrology Officer",
            description: "Designated enforcement inspector will conduct merchant verification.",
            date: "Pending",
            time: "Within 48 hours",
            completed: false,
          },
          {
            stage: "4",
            title: "Notice Issued to Merchant / Packer",
            description: "Show-cause notice under Section 36 of Legal Metrology Act, 2009.",
            date: "Pending",
            time: "--",
            completed: false,
          },
          {
            stage: "5",
            title: "Penal Action / Resolution",
            description: "Compound fine or case settlement.",
            date: "Pending",
            time: "--",
            completed: false,
          },
        ],
      }

      onSubmitComplaint(newComplaint)
    }, 700)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Check for possible duplicate complaint
    const candidateData = {
      barcode,
      productName,
      issueType,
      shopName,
      shopAddress,
    }

    const match = findDuplicateComplaint(candidateData, complaintsList)
    if (match) {
      setDuplicateMatch(match)
      setShowDuplicateModal(true)
      return
    }

    executeSubmit("Original")
  }

  const handleJoinReport = () => {
    if (duplicateMatch) {
      if (onJoinExistingComplaint) {
        onJoinExistingComplaint(duplicateMatch.id)
      } else {
        sqlDb.incrementCommunityReports(duplicateMatch.id)
        setPage("track")
      }
      setShowDuplicateModal(false)
    }
  }

  const catalogProducts = sqlDb.getAllProducts()

  return (
    <main className="page-shell complaint-page">
      {/* Breadcrumb */}
      <div className="crumb">
        <button className="plain" onClick={() => setPage("home")}>Home</button>
        <Icon name="chevron" size={14} />
        <button className="plain" onClick={() => setPage("result")}>Scan Result</button>
        <Icon name="chevron" size={14} />
        <span>Submit Grievance</span>
      </div>

      {/* Header */}
      <div className="complaint-header">
        <div>
          <div className="section-label">CONSUMER GRIEVANCE REDRESSAL (LEGAL METROLOGY)</div>
          <h1>Tell us what happened.</h1>
          <p>
            Share the details of the violation. We’ll compile your evidence into a verified Legal Metrology dossier.
          </p>
        </div>

        <div className="form-progress">
          <span className="active">1</span>
          <i />
          <span className="active">2</span>
          <i />
          <span className="active">3</span>
          <small>Details &nbsp;&nbsp;&nbsp;&nbsp; Evidence &nbsp;&nbsp;&nbsp;&nbsp; Submit</small>
        </div>
      </div>

      {/* Complaint Form Layout */}
      <div className="complaint-layout">
        <form onSubmit={handleSubmit}>
          {/* Dynamic Calculated Priority Indicator */}
          <div
            style={{
              marginBottom: "18px",
              padding: "12px 16px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontSize: "13px",
              background:
                calculatedPriority.color === "critical"
                  ? "#fef2f2"
                  : calculatedPriority.color === "high"
                  ? "#fff7ed"
                  : calculatedPriority.color === "medium"
                  ? "#fefce8"
                  : "#f8fafc",
              border:
                calculatedPriority.color === "critical"
                  ? "1px solid #fecaca"
                  : calculatedPriority.color === "high"
                  ? "1px solid #fed7aa"
                  : calculatedPriority.color === "medium"
                  ? "1px solid #fef08a"
                  : "1px solid #e2e8f0",
              color:
                calculatedPriority.color === "critical"
                  ? "#991b1b"
                  : calculatedPriority.color === "high"
                  ? "#9a3412"
                  : calculatedPriority.color === "medium"
                  ? "#854d0e"
                  : "#334155",
            }}
          >
            <Badge type={calculatedPriority.color as any}>
              PRIORITY: {calculatedPriority.priority.toUpperCase()}
            </Badge>
            <span style={{ fontWeight: 600 }}>{calculatedPriority.explanation}</span>
          </div>

          {/* Section 1: Issue Type */}
          <section className="form-section">
            <h3>1. What is the nature of the violation?</h3>
            <div className="issue-grid">
              {issueOptions.map((issue) => (
                <button
                  type="button"
                  key={issue}
                  onClick={() => setIssueType(issue)}
                  className={issueType === issue ? "chosen" : ""}
                >
                  {issueType === issue ? <Icon name="check" size={15} /> : <span style={{ width: "15px" }} />}
                  {issue}
                </button>
              ))}
            </div>
          </section>

          {/* Section 2: Scanned Commodity Information (Customizable & Changeable) */}
          <section className="form-section">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ margin: 0 }}>2. Scanned Commodity Information</h3>
              <button
                type="button"
                onClick={() => setShowProductPicker(!showProductPicker)}
                style={{
                  fontSize: "12px",
                  color: "#0f8e7d",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Icon name="refresh" size={13} /> {showProductPicker ? "Hide Catalog" : "Change Product / Select from DB"}
              </button>
            </div>

            {/* Catalog Selection Modal / Drawer */}
            {showProductPicker && (
              <div
                style={{
                  background: "#f0f7f6",
                  border: "1px solid #bce2d9",
                  borderRadius: "10px",
                  padding: "16px",
                  marginBottom: "16px",
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#102b4e", marginBottom: "8px" }}>
                  SELECT A PRODUCT FROM SQL DATABASE CATALOG:
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {catalogProducts.map((catProd) => (
                    <button
                      key={catProd.id}
                      type="button"
                      onClick={() => handleSelectFromDb(catProd)}
                      style={{
                        background: "#fff",
                        border: "1px solid #cce2dc",
                        borderRadius: "8px",
                        padding: "8px 12px",
                        textAlign: "left",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "12px", color: "#102b4e" }}>
                          {catProd.name}
                        </div>
                        <div style={{ fontSize: "10px", color: "#677e8a" }}>
                          Barcode: {catProd.barcode} · MRP: {catProd.mrpDisplay}
                        </div>
                      </div>
                      <Badge type="blue" style={{ fontSize: "8px" }}>Select</Badge>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Editable Product Fields */}
            <div className="product-fill" style={{ marginBottom: "14px" }}>
              <div className="fill-icon">
                <Icon name="box" size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <b style={{ fontSize: "14px", color: "#102b4e" }}>{productName}</b>
                  <Badge type="green">{brand}</Badge>
                </div>
                <span style={{ fontSize: "11px", color: "#6a7d90", marginTop: "2px" }}>
                  Barcode: {barcode} · Printed MRP: ₹{mrp || "0.00"} · Net Qty: {netQuantity}
                </span>
              </div>
            </div>

            <div className="form-grid">
              <label>
                Product Name
                <input
                  type="text"
                  placeholder="e.g. Britannia Good Day Biscuits / Amul Milk"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  required
                />
              </label>

              <label>
                Brand Name
                <input
                  type="text"
                  placeholder="e.g. Britannia / Amul / Coca-Cola"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  required
                />
              </label>
            </div>

            <div className="form-grid">
              <label>
                Barcode Number (EAN)
                <input
                  type="text"
                  placeholder="e.g. 8901063012159"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  required
                />
              </label>

              <label>
                Net Quantity (Declared)
                <input
                  type="text"
                  placeholder="e.g. 100 g / 1 Litre / 500 ml"
                  value={netQuantity}
                  onChange={(e) => setNetQuantity(e.target.value)}
                />
              </label>
            </div>

            {/* Overcharging Price Check */}
            <div className="form-grid" style={{ marginTop: "4px" }}>
              <label>
                Printed MRP on Package (₹)
                <input
                  type="number"
                  placeholder="e.g. 30"
                  value={mrp}
                  onChange={(e) => setMrp(e.target.value)}
                  required
                />
              </label>

              <label>
                Actual Price Charged by Merchant (₹)
                <input
                  type="number"
                  placeholder="e.g. 35.00"
                  value={priceCharged}
                  onChange={(e) => setPriceCharged(e.target.value)}
                  required
                />
              </label>
            </div>

            {/* Live Price Comparison Alert */}
            {priceCharged && mrp && parseFloat(priceCharged) > parseFloat(mrp) && (
              <div
                style={{
                  background: "#fdf0ef",
                  border: "1px solid #f9d5d4",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  fontSize: "12px",
                  color: "#a53c40",
                  marginTop: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Icon name="alert" size={16} />
                <span>
                  <b>Overcharging Detected:</b> Merchant charged ₹{parseFloat(priceCharged).toFixed(2)} on MRP of ₹{parseFloat(mrp).toFixed(2)} (+₹{(parseFloat(priceCharged) - parseFloat(mrp)).toFixed(2)} excess).
                </span>
              </div>
            )}
          </section>

          {/* Section 3: Merchant & Location Details */}
          <section className="form-section">
            <h3>3. Where did this transaction take place?</h3>
            <div className="form-grid">
              <label>
                Store / Merchant Name
                <input
                  type="text"
                  placeholder="e.g. Shree Ganesh Supermarket / Stall 4"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  required
                />
              </label>

              <label>
                Location / Address <span className="optional">(with Landmark)</span>
                <div className="input-icon">
                  <Icon name="map" size={17} />
                  <input
                    type="text"
                    placeholder="Enter street, market or city"
                    value={shopAddress}
                    onChange={(e) => setShopAddress(e.target.value)}
                    required
                  />
                </div>
              </label>
            </div>

            <div style={{ marginTop: "-6px", marginBottom: "12px" }}>
              <button
                type="button"
                className="plain"
                onClick={handleUseGps}
                style={{ fontSize: "11px", color: "#0f8e7d", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "4px" }}
              >
                <Icon name="map" size={13} /> Auto-detect GPS Location (Mock)
              </button>
            </div>
          </section>

          {/* Section 4: Incident Description */}
          <section className="form-section">
            <h3>4. Describe the incident</h3>
            <label>
              Details of Violation
              <textarea
                placeholder="Explain what the shopkeeper said, whether a bill was refused, or where the label was tampered..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </label>
          </section>

          {/* Section 5: Complainant Details */}
          <section className="form-section">
            <h3>5. Complainant Contact Information</h3>
            <p style={{ fontSize: "12px", color: "#6b7d8e", marginBottom: "12px" }}>
              Required by the Legal Metrology Department to send formal acknowledgement and hearing summons if needed.
            </p>
            <div className="form-grid">
              <label>
                Full Name
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={complainantName}
                  onChange={(e) => setComplainantName(e.target.value)}
                  required
                />
              </label>

              <label>
                10-Digit Mobile Number {isPhoneAuthUser && <span style={{ fontSize: "11px", color: "#0f8e7d", fontWeight: 700 }}>(Locked to Phone Login)</span>}
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={complainantPhone}
                  onChange={(e) => !isPhoneAuthUser && setComplainantPhone(e.target.value)}
                  readOnly={isPhoneAuthUser}
                  style={
                    isPhoneAuthUser
                      ? { background: "#f1f5f7", cursor: "not-allowed", color: "#324b67", fontWeight: 600, border: "1px solid #c7d6dc" }
                      : {}
                  }
                  required
                />
              </label>
            </div>

            <label style={{ marginTop: "6px" }}>
              Email Address {isEmailAuthUser ? <span style={{ fontSize: "11px", color: "#0f8e7d", fontWeight: 700 }}>(Locked to Account Login)</span> : <span className="optional">(For status updates)</span>}
              <input
                type="email"
                placeholder="e.g. yourname@gmail.com"
                value={complainantEmail}
                onChange={(e) => !isEmailAuthUser && setComplainantEmail(e.target.value)}
                readOnly={isEmailAuthUser}
                style={
                  isEmailAuthUser
                    ? { background: "#f1f5f7", cursor: "not-allowed", color: "#324b67", fontWeight: 600, border: "1px solid #c7d6dc" }
                    : {}
                }
              />
            </label>
          </section>

          <Button type="submit" className="submit-btn wide" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Icon name="refresh" size={16} className="animate-spin" /> Lodging Official Grievance...
              </>
            ) : (
              <>
                Submit Complaint to Legal Metrology Cell <Icon name="arrow" size={17} />
              </>
            )}
          </Button>
        </form>

        {/* Sidebar: Evidence & Privacy Assurance */}
        <aside>
          <div className="evidence-card">
            <h3>Upload Evidence</h3>
            <p>Photographs of the shop bill, receipt, or packaging make your complaint legally actionable.</p>

            <label
              className="mini-upload"
              style={{ display: "block", cursor: "pointer" }}
            >
              <Icon name="upload" size={24} />
              <span>
                <b>Click to upload photo</b>
                <br />
                Bill receipt, shelf price tag or package
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleEvidenceUpload}
                style={{ display: "none" }}
              />
            </label>

            {evidenceFiles.length > 0 && (
              <div style={{ marginTop: "14px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#102b4e" }}>
                  Attached Files ({evidenceFiles.length}):
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "6px" }}>
                  {evidenceFiles.map((file, idx) => (
                    <div
                      key={idx}
                      style={{
                        fontSize: "11px",
                        background: "#eef7f5",
                        padding: "5px 10px",
                        borderRadius: "6px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        color: "#0f8e7d",
                      }}
                    >
                      <Icon name="file" size={14} /> {file}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <small>Supports JPG, PNG, PDF · Maximum 5 files</small>
          </div>

          <div className="privacy-card">
            <Icon name="shield" size={20} />
            <p>
              Your contact details are encrypted and utilized solely by authorized Legal Metrology enforcement officers under Section 49 of the Consumer Protection Act.
            </p>
          </div>

          <div
            style={{
              marginTop: "16px",
              padding: "16px",
              background: "#fff",
              border: "1px solid #d9e3e9",
              borderRadius: "10px",
              fontSize: "11px",
              color: "#6b7d8e",
            }}
          >
            <div style={{ fontWeight: 700, color: "#102b4e", marginBottom: "4px" }}>
              National Consumer Helpline:
            </div>
            <span>
              Toll-Free: <b>1915</b> or SMS to <b>8800001915</b>
            </span>
          </div>
        </aside>
      </div>

      {/* Duplicate Complaint Detection Warning Modal */}
      {showDuplicateModal && duplicateMatch && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: "560px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#fef3c7", color: "#b45309", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="alert" size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "17px", color: "#102b4e" }}>
                  A similar complaint may already exist.
                </h3>
                <span style={{ fontSize: "12px", color: "#6b7d8e" }}>
                  Duplicate Prevention &amp; Community Enforcement
                </span>
              </div>
            </div>

            <p style={{ fontSize: "13px", color: "#475569", lineHeight: "1.5", margin: "12px 0" }}>
              An earlier grievance regarding <b>{duplicateMatch.productName}</b> at <b>{duplicateMatch.shopName}</b> has already been registered in the system. You can join the existing community report to accelerate enforcement action or submit as a new complaint.
            </p>

            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px 16px", fontSize: "12px", color: "#334155", display: "flex", flexDirection: "column", gap: "6px" }}>
              <div><b>Existing Grievance ID:</b> <span className="mono" style={{ color: "#102b4e", fontWeight: 700 }}>{duplicateMatch.id}</span></div>
              <div><b>Product / Commodity:</b> {duplicateMatch.productName} ({duplicateMatch.brand})</div>
              <div><b>Reported Issue:</b> <span style={{ color: "#c9484d", fontWeight: 600 }}>{duplicateMatch.issueType}</span></div>
              <div><b>Reported Date:</b> {duplicateMatch.submittedAt}</div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "4px" }}>
                <span><b>Current Status:</b></span>
                <Badge type="amber">{duplicateMatch.status}</Badge>
                <span>· <b>Community Reports:</b> {duplicateMatch.communityReports || 1}</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "22px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => executeSubmit("Independent Duplicate")}
                style={{
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#334155",
                  cursor: "pointer",
                }}
              >
                Submit as New Complaint
              </button>

              <button
                type="button"
                onClick={handleJoinReport}
                style={{
                  background: "#0f8e7d",
                  border: "none",
                  borderRadius: "8px",
                  padding: "10px 16px",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#ffffff",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Icon name="check" size={16} /> Join Existing Report (+1 Community Voice)
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
