import React, { useState } from "react"
import { Page, ProductData, ViolationType, User } from "../types"
import { Icon, Button, Badge } from "../components/Icons"
import { SAMPLE_PRODUCTS, DEFAULT_PRODUCT } from "../data/sampleProducts"
import { calculateTruthScore, calculateComplaintPriority } from "../utils/complianceEngine"
import { analyzeFontCompliance, generateStatutoryCitations, deriveEnforcementRecommendation } from "../utils/fontCompliance"
import { exportToPdf, exportToDocx, exportToCsvOrXlsx } from "../utils/reportExporter"

interface ResultPageProps {
  setPage: (page: Page) => void
  product: ProductData
  setSelectedProduct: (product: ProductData) => void
  onFileComplaintForProduct?: (product: ProductData, initialIssue?: string) => void
  currentUser?: User | null
}

export const ResultPage: React.FC<ResultPageProps> = ({
  setPage,
  product = DEFAULT_PRODUCT,
  setSelectedProduct,
  onFileComplaintForProduct,
  currentUser,
}) => {
  const isStaff =
    currentUser?.role === "admin" ||
    currentUser?.role === "officer" ||
    currentUser?.email?.toLowerCase() === "thisisyashasvi@gmail.com"

  const [activeTab, setActiveTab] = useState<"targeted" | "checklist" | "citations" | "ocr">("targeted")
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false)
  const [showScoreBreakdown, setShowScoreBreakdown] = useState<boolean>(true)

  // Current active product (defaults to Britannia Good Day Biscuits if not specified)
  const currentProduct = product || DEFAULT_PRODUCT

  // Font Compliance Calculation
  const fontReport = currentProduct.fontCompliance || analyzeFontCompliance(currentProduct)

  // Dynamic Truth Score Calculation
  const truthScore = calculateTruthScore({ ...currentProduct, fontCompliance: fontReport })

  // Statutory Citations & Enforcement Recommendation
  const statutoryCitations = generateStatutoryCitations(currentProduct, fontReport)
  const enforcementRecommendation = deriveEnforcementRecommendation(currentProduct, fontReport)

  // 5 Targeted Compliance Fields Audit Data
  const targetedFields = [
    {
      key: "packagingDate",
      title: "1. Packaging Date",
      rule: "Rule 6(1)(d)",
      icon: "📅",
      value: currentProduct.packagingDate || currentProduct.mfgDate || null,
      status: currentProduct.packagingDate || currentProduct.mfgDate ? ("pass" as const) : ("warn" as const),
      statusLabel: currentProduct.packagingDate || currentProduct.mfgDate ? "Pass ✅" : "Unable to Verify ⚠️",
      reason: currentProduct.packagingDate || currentProduct.mfgDate
        ? "Packaging / manufacturing date clearly detected and verified under Rule 6(1)(d)."
        : "Reason: Packaging Date could not be detected near packaging labels (Rule 6(1)(d)).",
    },
    {
      key: "expiryDate",
      title: "2. Use By / Expiry Date",
      rule: "Rule 6(1)(d)",
      icon: "⏳",
      value: currentProduct.expiryDate || null,
      status: currentProduct.violations.includes("expired")
        ? ("fail" as const)
        : currentProduct.expiryDate
        ? ("pass" as const)
        : ("warn" as const),
      statusLabel: currentProduct.violations.includes("expired")
        ? "Violation ❌"
        : currentProduct.expiryDate
        ? "Pass ✅"
        : "Unable to Verify ⚠️",
      reason: currentProduct.violations.includes("expired")
        ? `Reason: Declared expiry date (${currentProduct.expiryDate}) has passed. Sale of expired commodities violates Section 18 of LMPC Act & FSSAI.`
        : currentProduct.expiryDate
        ? "Use By / Best Before duration verified active."
        : "Reason: Expiry date statement not detected near commodity marking.",
    },
    {
      key: "mrp",
      title: "3. Maximum Retail Price (MRP)",
      rule: "Rule 6(1)(e)",
      icon: "💰",
      value: currentProduct.mrp !== null ? `₹${currentProduct.mrp.toFixed(2)} (incl. of all taxes)` : null,
      status: currentProduct.violations.includes("overcharging")
        ? ("fail" as const)
        : currentProduct.mrp === null
        ? ("fail" as const)
        : ("pass" as const),
      statusLabel: currentProduct.violations.includes("overcharging") || currentProduct.mrp === null
        ? "Violation ❌"
        : "Pass ✅",
      reason: currentProduct.violations.includes("overcharging")
        ? `Reason: Charged price (₹${currentProduct.sellingPrice?.toFixed(2)}) exceeds declared printed MRP (₹${currentProduct.mrp?.toFixed(2)}) under Rule 18(2).`
        : currentProduct.mrp === null
        ? "Reason: MRP could not be detected near an MRP/price label (Rule 6(1)(e))."
        : "Statutory MRP inclusive of all taxes clearly printed and compliant.",
    },
    {
      key: "netWeight",
      title: "4. Net Weight / Net Quantity",
      rule: "Rule 6(1)(c)",
      icon: "⚖️",
      value: currentProduct.netWeight || currentProduct.netQuantity || null,
      status: (!currentProduct.netQuantity && !currentProduct.netWeight)
        ? ("fail" as const)
        : fontReport.nonStandardUnitsDetected.length > 0
        ? ("fail" as const)
        : !fontReport.fontHeightCompliant
        ? ("warn" as const)
        : ("pass" as const),
      statusLabel: (!currentProduct.netQuantity && !currentProduct.netWeight) || fontReport.nonStandardUnitsDetected.length > 0
        ? "Violation ❌"
        : !fontReport.fontHeightCompliant
        ? "Unable to Verify ⚠️"
        : "Pass ✅",
      reason: (!currentProduct.netQuantity && !currentProduct.netWeight)
        ? "Reason: Net quantity (weight/volume) could not be detected near net weight labels (Rule 6(1)(c))."
        : fontReport.nonStandardUnitsDetected.length > 0
        ? `Reason: Non-standard metric units used (${fontReport.nonStandardUnitsDetected.join(", ")}) violating Rule 11.`
        : !fontReport.fontHeightCompliant
        ? `Reason: Detected numeral height (${fontReport.detectedFontHeightMm}mm) is below minimum (${fontReport.prescribedMinHeightMm}mm) under Table 1.`
        : "Standard metric net weight / volume declaration verified.",
    },
    {
      key: "packagedBy",
      title: "5. Packaged By / Manufactured By",
      rule: "Rule 6(1)(a)",
      icon: "🏢",
      value: currentProduct.packagedBy || currentProduct.manufacturerName || null,
      status: currentProduct.violations.includes("manufacturer_missing") || (!currentProduct.packagedBy && !currentProduct.manufacturerName)
        ? ("fail" as const)
        : ("pass" as const),
      statusLabel: currentProduct.violations.includes("manufacturer_missing") || (!currentProduct.packagedBy && !currentProduct.manufacturerName)
        ? "Violation ❌"
        : "Pass ✅",
      reason: currentProduct.violations.includes("manufacturer_missing") || (!currentProduct.packagedBy && !currentProduct.manufacturerName)
        ? "Reason: Name and address of manufacturer or packer is missing under Rule 6(1)(a). (Marketed By alone is unverified)."
        : "Complete manufacturer / packer identification and address verified.",
    },
  ]

  // Determine primary issue type for reporting
  const getPrimaryIssueType = (): string => {
    if (currentProduct.violations.includes("expired")) return "Expired product"
    if (currentProduct.violations.includes("mrp_missing")) return "MRP missing"
    if (currentProduct.violations.includes("net_qty_missing") || !fontReport.fontHeightCompliant) return "Incorrect label"
    if (currentProduct.violations.includes("overcharging")) return "Overcharging above MRP"
    if (currentProduct.violations.includes("manufacturer_missing")) return "Missing manufacturer details"
    return "Routine inquiry / General feedback"
  }

  // Priority Assessment
  const priorityInfo = calculateComplaintPriority(
    {
      issueType: getPrimaryIssueType(),
      mrp: currentProduct.mrp,
      priceCharged: currentProduct.sellingPrice,
      description: currentProduct.alertMessage,
    },
    currentProduct
  )

  // Scenario quick toggles for evaluation
  const handleScenarioChange = (scenarioKey: string) => {
    const selected = SAMPLE_PRODUCTS[scenarioKey] || DEFAULT_PRODUCT
    setSelectedProduct(selected)
  }

  const handleReportIssue = () => {
    if (onFileComplaintForProduct) {
      onFileComplaintForProduct(currentProduct, getPrimaryIssueType())
    }
    setPage("complaint")
  }

  const isViolation =
    truthScore.category === "Possible Violation" ||
    truthScore.category === "Needs Attention" ||
    currentProduct.complianceStatus === "Violation Detected" ||
    currentProduct.complianceStatus === "Critical Warning" ||
    truthScore.score >= 25 ||
    !fontReport.fontHeightCompliant

  // Warning Cards Generator for the 5 Specific Cases
  const renderWarningComponent = () => {
    const violations = currentProduct.violations

    return (
      <aside className="notice-stack">
        {/* Warning 1: Product Expired */}
        {violations.includes("expired") && (
          <div className="warning-card" style={{ borderLeft: "4px solid #c9484d", background: "#fdf1f1" }}>
            <Icon name="alert" style={{ color: "#c9484d" }} />
            <div>
              <h3 style={{ color: "#a52d33" }}>Product Expired</h3>
              <p>
                The declared best-before/expiry date (<b>{currentProduct.expiryDate}</b>) has expired. Selling expired packaged food is strictly illegal under FSSAI and Section 18 of LMPC Rules.
              </p>
              <button
                className="plain"
                onClick={handleReportIssue}
                style={{ color: "#a52d33", fontWeight: 700, fontSize: "11px", marginTop: "6px", display: "inline-flex", alignItems: "center", gap: "4px" }}
              >
                File expired goods report <Icon name="arrow" size={13} />
              </button>
            </div>
          </div>
        )}

        {/* Warning 2: MRP Missing */}
        {violations.includes("mrp_missing") && (
          <div className="warning-card" style={{ borderLeft: "4px solid #bf7914", background: "#fdf8ee" }}>
            <Icon name="alert" style={{ color: "#bf7914" }} />
            <div>
              <h3 style={{ color: "#8e5709" }}>MRP Missing / Illegible</h3>
              <p>
                Maximum Retail Price is not declared on the package. Every pre-packaged commodity in India must state: <i>“MRP Rs. __ incl. of all taxes”</i> under Rule 6(1)(e).
              </p>
              <button
                className="plain"
                onClick={handleReportIssue}
                style={{ color: "#8e5709", fontWeight: 700, fontSize: "11px", marginTop: "6px", display: "inline-flex", alignItems: "center", gap: "4px" }}
              >
                Report missing MRP <Icon name="arrow" size={13} />
              </button>
            </div>
          </div>
        )}

        {/* Warning 3: Net Quantity Missing */}
        {violations.includes("net_qty_missing") && (
          <div className="warning-card" style={{ borderLeft: "4px solid #bf7914", background: "#fdf8ee" }}>
            <Icon name="alert" style={{ color: "#bf7914" }} />
            <div>
              <h3 style={{ color: "#8e5709" }}>Net Quantity Not Declared</h3>
              <p>
                Standard weight or measure declaration is absent. Packaged goods must clearly declare net contents in metric units under Rule 6(1)(c).
              </p>
              <button
                className="plain"
                onClick={handleReportIssue}
                style={{ color: "#8e5709", fontWeight: 700, fontSize: "11px", marginTop: "6px", display: "inline-flex", alignItems: "center", gap: "4px" }}
              >
                Report quantity defect <Icon name="arrow" size={13} />
              </button>
            </div>
          </div>
        )}

        {/* Warning 4: Overcharging above MRP */}
        {violations.includes("overcharging") && (
          <div className="warning-card" style={{ borderLeft: "4px solid #c9484d", background: "#fdf1f1" }}>
            <Icon name="alert" style={{ color: "#c9484d" }} />
            <div>
              <h3 style={{ color: "#a52d33" }}>Overcharging Above Printed MRP</h3>
              <p>
                Retailer charged <b>₹{currentProduct.sellingPrice?.toFixed(2)}</b> against maximum retail price of <b>{currentProduct.mrpDisplay}</b>. Penalized under Section 36(1) of LM Act.
              </p>
              <button
                className="plain"
                onClick={handleReportIssue}
                style={{ color: "#a52d33", fontWeight: 700, fontSize: "11px", marginTop: "6px", display: "inline-flex", alignItems: "center", gap: "4px" }}
              >
                File overcharging grievance <Icon name="arrow" size={13} />
              </button>
            </div>
          </div>
        )}

        {/* Warning 5: Missing Manufacturer Details */}
        {violations.includes("manufacturer_missing") && (
          <div className="warning-card" style={{ borderLeft: "4px solid #bf7914", background: "#fdf8ee" }}>
            <Icon name="alert" style={{ color: "#bf7914" }} />
            <div>
              <h3 style={{ color: "#8e5709" }}>Missing Manufacturer Identity</h3>
              <p>
                Name and complete address of the manufacturer/packer is missing. Pre-packaged commodities without maker identity violate Rule 6(1)(a).
              </p>
              <button
                className="plain"
                onClick={handleReportIssue}
                style={{ color: "#8e5709", fontWeight: 700, fontSize: "11px", marginTop: "6px", display: "inline-flex", alignItems: "center", gap: "4px" }}
              >
                Report unlabelled package <Icon name="arrow" size={13} />
              </button>
            </div>
          </div>
        )}
      </aside>
    )
  }

  return (
    <main className="page-shell">
      {/* Breadcrumb Navigation */}
      <div className="crumb">
        <button className="plain" onClick={() => setPage("home")}>Home</button>
        <Icon name="chevron" size={14} />
        <button className="plain" onClick={() => setPage("scan")}>Scan</button>
        <Icon name="chevron" size={14} />
        <span>Verification Dossier</span>
      </div>

      {/* Top Banner with Scenario Switcher for Evaluation */}
      <div className="results-top-strip">
        <div className="crumb-wrap">
          <Badge type="blue">LMPC ACT 2009 AUDIT REPORT</Badge>
          <span style={{ fontSize: "12px", color: "#607284" }}>
            Dossier Reference: <b>DOS-2026-{currentProduct.id.slice(0, 6).toUpperCase()}</b>
          </span>
        </div>

        {/* Interactive Scenario Switcher */}
        {isStaff && (
          <div className="scenario-switcher">
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#4d647a" }}>
              DEMO VIOLATION SCENARIOS:
            </span>
            <div className="scenario-buttons">
              <button
                className={currentProduct.violations.includes("none") ? "selected" : ""}
                onClick={() => handleScenarioChange("compliant")}
              >
                ✓ Compliant
              </button>
              <button
                className={currentProduct.violations.includes("expired") ? "selected danger" : ""}
                onClick={() => handleScenarioChange("expired")}
              >
                ⚠ Expired
              </button>
              <button
                className={currentProduct.violations.includes("mrp_missing") ? "selected danger" : ""}
                onClick={() => handleScenarioChange("mrp_missing")}
              >
                ⚠ MRP Missing
              </button>
              <button
                className={currentProduct.violations.includes("net_qty_missing") ? "selected danger" : ""}
                onClick={() => handleScenarioChange("net_qty_missing")}
              >
                ⚠ Net Qty Missing
              </button>
              <button
                className={currentProduct.violations.includes("overcharging") ? "selected danger" : ""}
                onClick={() => handleScenarioChange("overcharging")}
              >
                ⚠ Overcharging (Above MRP)
              </button>
              <button
                className={currentProduct.violations.includes("manufacturer_missing") ? "selected danger" : ""}
                onClick={() => handleScenarioChange("manufacturer_missing")}
              >
                ⚠ Missing Manufacturer
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Product Hero Info Card */}
      <section className="result-hero">
        <div className="product-photo" style={{ background: isViolation ? "#fdf0ef" : "#eef5ee" }}>
          <div
            className="mini-pack"
            style={{
              background:
                currentProduct.id === "britannia-good-day"
                  ? "linear-gradient(120deg,#e8b14e,#d87524)"
                  : currentProduct.id === "amul-taaza-milk"
                  ? "linear-gradient(120deg,#5dade2,#2980b9)"
                  : currentProduct.id === "thums-up-can"
                  ? "linear-gradient(120deg,#c0392b,#8e44ad)"
                  : "linear-gradient(120deg,#e8b14e,#d87524)",
            }}
          >
            <small>{currentProduct.brand?.toUpperCase()}</small>
            <strong>{currentProduct.name?.split(" ")[1] || "PACK"}</strong>
            <i>{currentProduct.netQuantity || "100g"}</i>
          </div>
        </div>

        <div className="product-info">
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <Badge type="blue">{currentProduct.category}</Badge>
            <Badge type={truthScore.categoryColor === "green" ? "green" : truthScore.categoryColor === "amber" ? "amber" : "red"}>
              {truthScore.category}
            </Badge>
            <Badge type={priorityInfo.color as any}>
              PRIORITY: {priorityInfo.priority.toUpperCase()}
            </Badge>
          </div>
          <h2>{currentProduct.name}</h2>
          <p style={{ margin: "2px 0 6px" }}>
            <b>Brand:</b> {currentProduct.brand} · <b>Manufacturer:</b>{" "}
            {currentProduct.manufacturerName || "Not Declared on Package"}
          </p>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "12px", color: "#52687d" }}>
            <span>
              Barcode: <strong className="mono" style={{ display: "inline" }}>{currentProduct.barcode}</strong>
            </span>
            <span>
              MRP: <strong style={{ color: "#102b4e" }}>{currentProduct.mrpDisplay}</strong>
            </span>
            <span>
              Net Qty: <strong>{currentProduct.netQuantity || "Missing"}</strong>
            </span>
            <span>
              Expiry: <strong>{currentProduct.expiryDate || "Not Declared"}</strong>
            </span>
            <span>
              Batch: <strong>{currentProduct.batchNumber || "Not Declared"}</strong>
            </span>
          </div>
        </div>

        {/* Circular Truth Score Indicator */}
        <div
          className={`score ${
            truthScore.categoryColor === "green"
              ? ""
              : truthScore.categoryColor === "amber"
              ? "score-warning"
              : "score-bad"
          }`}
        >
          <div className="score-ring-wrap">
            <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)", position: "absolute", top: 0, left: 0 }}>
              {/* Background Track */}
              <circle
                cx="40"
                cy="40"
                r="34"
                stroke={
                  truthScore.categoryColor === "green"
                    ? "#e5f4ef"
                    : truthScore.categoryColor === "amber"
                    ? "#ffedd5"
                    : "#fee2e2"
                }
                strokeWidth="6"
                fill="transparent"
              />
              {/* Dynamic Score Progress Arc */}
              <circle
                cx="40"
                cy="40"
                r="34"
                stroke={
                  truthScore.categoryColor === "green"
                    ? "#0f8e7d"
                    : truthScore.categoryColor === "amber"
                    ? "#ea580c"
                    : "#c9484d"
                }
                strokeWidth="6"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 34}
                strokeDashoffset={
                  (2 * Math.PI * 34) * (1 - Math.max(0, Math.min(100, truthScore.score)) / 100)
                }
                strokeLinecap={truthScore.score > 0 && truthScore.score < 100 ? "round" : "butt"}
                style={{ transition: "stroke-dashoffset 0.6s ease" }}
              />
            </svg>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
              <strong
                style={{
                  color:
                    truthScore.categoryColor === "green"
                      ? "#0f8e7d"
                      : truthScore.categoryColor === "amber"
                      ? "#ea580c"
                      : "#c9484d",
                }}
              >
                {truthScore.score}
              </strong>
              <small style={{ color: "#647589" }}>/100</small>
            </div>
          </div>
          <span>
            {truthScore.category === "Likely Compliant"
              ? "Low Risk\n(Compliant)"
              : truthScore.category === "Needs Attention"
              ? "Moderate Risk\n(Attention)"
              : "High Risk\n(Complaint)"}
          </span>
        </div>
      </section>

      {/* Priority Explanation Card */}
      <div
        style={{
          marginTop: "12px",
          padding: "12px 16px",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          fontSize: "13px",
          background:
            priorityInfo.color === "critical"
              ? "#fef2f2"
              : priorityInfo.color === "high"
              ? "#fff7ed"
              : priorityInfo.color === "medium"
              ? "#fefce8"
              : "#f8fafc",
          border:
            priorityInfo.color === "critical"
              ? "1px solid #fecaca"
              : priorityInfo.color === "high"
              ? "1px solid #fed7aa"
              : priorityInfo.color === "medium"
              ? "1px solid #fef08a"
              : "1px solid #e2e8f0",
          color:
            priorityInfo.color === "critical"
              ? "#991b1b"
              : priorityInfo.color === "high"
              ? "#9a3412"
              : priorityInfo.color === "medium"
              ? "#854d0e"
              : "#334155",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Badge type={priorityInfo.color as any}>{priorityInfo.priority}</Badge>
          <span style={{ fontWeight: 600 }}>{priorityInfo.explanation}</span>
        </div>
        <button
          className="plain"
          onClick={() => setShowScoreBreakdown(!showScoreBreakdown)}
          style={{
            fontSize: "12px",
            fontWeight: 700,
            color: "#0f8e7d",
            whiteSpace: "nowrap",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            cursor: "pointer",
          }}
        >
          <Icon name="info" size={14} />
          {showScoreBreakdown ? "Hide Score Breakdown" : "Why this score?"}
        </button>
      </div>

      {/* "Why this score?" Explainable Complaint Risk Score Breakdown Panel */}
      {showScoreBreakdown && (
        <section className="score-breakdown-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div>
              <h3 style={{ fontSize: "14px", color: "#102b4e", margin: 0 }}>
                Complaint Risk Score Calculation Breakdown (Base: 0 Risk Points)
              </h3>
              <p style={{ fontSize: "12px", color: "#6b7d8e", margin: "2px 0 0" }}>
                Algorithmic violation risk index: higher score indicates higher probability of consumer complaint / statutory action
              </p>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ fontSize: "11px", color: "#718292" }}>Final Risk Score:</span>
              <strong style={{ fontSize: "16px", color: truthScore.categoryColor === "green" ? "#0f8e7d" : truthScore.categoryColor === "amber" ? "#ea580c" : "#c9484d" }}>
                {truthScore.score} / 100
              </strong>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {truthScore.factors.length === 0 ? (
              <div style={{ fontSize: "12px", color: "#0f8e7d", padding: "8px 0" }}>
                ✓ No violations detected. Product has 0 risk points and meets all statutory packaging declarations.
              </div>
            ) : (
              truthScore.factors.map((f) => (
                <div key={f.id} className="score-factor-item">
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontWeight: 700, fontSize: "13px", color: "#102b4e" }}>{f.title}</span>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "4px",
                          background: f.points > 0 ? (f.points >= 25 ? "#fee2e2" : "#ffedd5") : "#e2f4ec",
                          color: f.points > 0 ? (f.points >= 25 ? "#991b1b" : "#c2410c") : "#08705a",
                        }}
                      >
                        {f.points > 0 ? `+${f.points} risk pts` : `${f.points} risk pts`}
                      </span>
                    </div>
                    <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#54687d" }}>{f.explanation}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* Alert Banner for Flagged Products */}
      {isViolation && (
        <div className="alert-banner red-alert" style={{ marginTop: "16px" }}>
          <Icon name="alert" size={22} />
          <div>
            <b>Possible Statutory Violation Detected</b>
            <span>
              {currentProduct.alertMessage ||
                "Mandatory packaging declarations are missing or non-compliant under the Legal Metrology Rules."}
            </span>
          </div>
          <button onClick={handleReportIssue}>
            Report this issue <Icon name="arrow" size={15} />
          </button>
        </div>
      )}

      {/* Font-Size & Readability Compliance Card (Rule 7 & Rule 9 Table 1) */}
      <section style={{ marginTop: "16px", background: "#f8fafc", border: "1px solid #dbe5ee", borderRadius: "10px", padding: "16px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h3 style={{ fontSize: "15px", color: "#102b4e", margin: 0 }}>
                Rule 7 &amp; Rule 9 Statutory Font-Height &amp; Readability Audit
              </h3>
              <Badge type={fontReport.fontHeightCompliant ? "green" : "red"}>
                {fontReport.fontHeightCompliant ? "✓ Font Height Compliant" : "✗ Undersized Font Violation"}
              </Badge>
            </div>
            <p style={{ fontSize: "12px", color: "#667d91", margin: "3px 0 0" }}>
              Evaluation against Table 1 of the Legal Metrology (Packaged Commodities) Rules, 2011
            </p>
          </div>

          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "11px", color: "#74889c" }}>Legibility Score:</span>
              <div style={{ fontSize: "16px", fontWeight: 700, color: fontReport.legibilityScore >= 75 ? "#08705a" : "#b45309" }}>
                {fontReport.legibilityScore} / 100
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "10px", fontSize: "12px" }}>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", padding: "10px", borderRadius: "6px" }}>
            <span style={{ color: "#738699", fontSize: "10px", textTransform: "uppercase", fontWeight: 700 }}>Weight / Volume Tier</span>
            <div style={{ fontWeight: 700, color: "#102b4e", marginTop: "2px" }}>
              {fontReport.netQuantityValueGramsOrMl} g/ml ({currentProduct.netQuantity || "100g"})
            </div>
          </div>

          <div style={{ background: "#fff", border: "1px solid #e2e8f0", padding: "10px", borderRadius: "6px" }}>
            <span style={{ color: "#738699", fontSize: "10px", textTransform: "uppercase", fontWeight: 700 }}>Prescribed Min Height</span>
            <div style={{ fontWeight: 700, color: "#102b4e", marginTop: "2px" }}>
              <b>{fontReport.prescribedMinHeightMm.toFixed(1)} mm</b> (Table 1)
            </div>
          </div>

          <div style={{ background: "#fff", border: "1px solid #e2e8f0", padding: "10px", borderRadius: "6px" }}>
            <span style={{ color: "#738699", fontSize: "10px", textTransform: "uppercase", fontWeight: 700 }}>Detected Numeral Height</span>
            <div style={{ fontWeight: 700, color: fontReport.fontHeightCompliant ? "#08705a" : "#a52d33", marginTop: "2px" }}>
              {fontReport.detectedFontHeightMm.toFixed(1)} mm {fontReport.fontHeightCompliant ? "✓ PASS" : "✗ FAIL"}
            </div>
          </div>

          <div style={{ background: "#fff", border: "1px solid #e2e8f0", padding: "10px", borderRadius: "6px" }}>
            <span style={{ color: "#738699", fontSize: "10px", textTransform: "uppercase", fontWeight: 700 }}>Text Contrast Ratio</span>
            <div style={{ fontWeight: 700, color: fontReport.contrastCompliant ? "#08705a" : "#a52d33", marginTop: "2px" }}>
              {fontReport.contrastRatio}:1 (ISO/WCAG Compliant)
            </div>
          </div>
        </div>

        {/* Non-Standard Unit / Misleading Text Warnings */}
        {(fontReport.nonStandardUnitsDetected.length > 0 || fontReport.misleadingPhrasesDetected.length > 0) && (
          <div style={{ marginTop: "10px", padding: "10px 14px", background: "#fff8eb", border: "1px solid #fed7aa", borderRadius: "6px", fontSize: "12px", color: "#9a3412" }}>
            {fontReport.nonStandardUnitsDetected.map((u, i) => (
              <div key={i} style={{ marginBottom: "2px" }}>⚠ <b>Non-Standard Unit:</b> {u}</div>
            ))}
            {fontReport.misleadingPhrasesDetected.map((m, i) => (
              <div key={i}>⚠ <b>Mandatory Phrase Issue:</b> {m}</div>
            ))}
          </div>
        )}
      </section>

      {/* Enforcement Directive Banner */}
      <div style={{ marginTop: "16px", padding: "14px 18px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Icon name="shield" size={18} style={{ color: "#0f8e7d" }} />
            <b style={{ color: "#166534", fontSize: "13px" }}>Recommended Enforcement Action:</b>
            <Badge type={enforcementRecommendation.actionType.includes("Section 36") || enforcementRecommendation.actionType.includes("Seizure") ? "red" : "green"}>
              {enforcementRecommendation.actionType}
            </Badge>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#374151" }}>
            {enforcementRecommendation.actionDescription} ({enforcementRecommendation.statutoryReference})
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <Button secondary onClick={() => exportToDocx(currentProduct)} style={{ fontSize: "11px", padding: "6px 10px" }}>
            <Icon name="file" size={13} /> Export DOCX
          </Button>
          <Button onClick={() => exportToPdf(currentProduct)} style={{ fontSize: "11px", padding: "6px 12px" }}>
            <Icon name="printer" size={13} /> Print Official Dossier
          </Button>
        </div>
      </div>

      {/* Alert Banner for Flagged Products */}
      {isViolation && (
        <div className="alert-banner red-alert" style={{ marginTop: "16px" }}>
          <Icon name="alert" size={22} />
          <div>
            <b>Possible Statutory Violation Detected</b>
            <span>
              {currentProduct.alertMessage ||
                "Mandatory packaging declarations are missing or non-compliant under the Legal Metrology Rules."}
            </span>
          </div>
          <button onClick={handleReportIssue}>
            Report this issue <Icon name="arrow" size={15} />
          </button>
        </div>
      )}

      {/* Main Grid: Checklist & Warnings */}
      <div className="result-grid">
        {/* Left Side: Declarations Checklist or Raw OCR */}
        <section className="details-card">
          <div className="card-heading">
            <div>
              <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                <button
                  className="plain"
                  onClick={() => setActiveTab("targeted")}
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: activeTab === "targeted" ? "#102b4e" : "#8395a7",
                    borderBottom: activeTab === "targeted" ? "2px solid #0f8e7d" : "none",
                    paddingBottom: "4px",
                  }}
                >
                  🎯 Detected Package Information (5 Fields)
                </button>
                <button
                  className="plain"
                  onClick={() => setActiveTab("checklist")}
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: activeTab === "checklist" ? "#102b4e" : "#8395a7",
                    borderBottom: activeTab === "checklist" ? "2px solid #0f8e7d" : "none",
                    paddingBottom: "4px",
                  }}
                >
                  Statutory Rule 6 Checklist
                </button>
                <button
                  className="plain"
                  onClick={() => setActiveTab("citations")}
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: activeTab === "citations" ? "#102b4e" : "#8395a7",
                    borderBottom: activeTab === "citations" ? "2px solid #0f8e7d" : "none",
                    paddingBottom: "4px",
                  }}
                >
                  Statutory Rule Citations
                </button>
                <button
                  className="plain"
                  onClick={() => setActiveTab("ocr")}
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: activeTab === "ocr" ? "#102b4e" : "#8395a7",
                    borderBottom: activeTab === "ocr" ? "2px solid #0f8e7d" : "none",
                    paddingBottom: "4px",
                  }}
                >
                  Extracted OCR Data
                </button>
              </div>
              <p>Details evaluated under Legal Metrology (Packaged Commodities) Rules 2011</p>
            </div>
            <Badge type={isViolation ? "amber" : "green"}>
              {currentProduct.declarations.filter((d) => d.status === "pass").length} of{" "}
              {currentProduct.declarations.length} confirmed
            </Badge>
          </div>

          {/* 1. Targeted 5-Field Audit View */}
          {activeTab === "targeted" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "14px" }}>
              <div
                style={{
                  background: "#f0f8f6",
                  border: "1px solid #cce8e2",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  fontSize: "12px",
                  color: "#08705a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Icon name="shield" size={16} style={{ color: "#0f8e7d" }} />
                  <span>
                    <b>Targeted Compliance Audit:</b> Status and statutory findings for the 5 mandatory package fields.
                  </span>
                </div>
                <Badge type="green">LMPC Rule 6 Verification</Badge>
              </div>

              {targetedFields.map((field) => (
                <div
                  key={field.key}
                  style={{
                    background: field.status === "fail" ? "#fdf1f1" : field.status === "warn" ? "#fdf8ee" : "#fff",
                    border:
                      field.status === "fail"
                        ? "1px solid #f7c3c6"
                        : field.status === "warn"
                        ? "1px solid #fde0a8"
                        : "1px solid #dbe5ee",
                    borderLeft:
                      field.status === "fail"
                        ? "4px solid #c9484d"
                        : field.status === "warn"
                        ? "4px solid #ea580c"
                        : "4px solid #0f8e7d",
                    borderRadius: "8px",
                    padding: "12px 16px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "16px" }}>{field.icon}</span>
                      <b style={{ fontSize: "13px", color: "#102b4e" }}>{field.title}</b>
                      <span style={{ fontSize: "11px", color: "#64748b" }}>({field.rule})</span>
                    </div>
                    <Badge
                      type={field.status === "pass" ? "green" : field.status === "warn" ? "amber" : "red"}
                      style={{ fontWeight: 700 }}
                    >
                      {field.statusLabel}
                    </Badge>
                  </div>

                  <div style={{ margin: "4px 0 6px", fontSize: "13px" }}>
                    <span style={{ color: "#64748b", fontSize: "12px" }}>Extracted / Declared Value: </span>
                    <b style={{ color: field.value ? "#0f172a" : "#991b1b" }}>
                      {field.value || "Not Detected / Missing"}
                    </b>
                  </div>

                  <div
                    style={{
                      fontSize: "12px",
                      color: field.status === "fail" ? "#991b1b" : field.status === "warn" ? "#9a3412" : "#08705a",
                      fontWeight: field.status !== "pass" ? 600 : 400,
                    }}
                  >
                    {field.reason}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 2. Full Rule 6 Declarations Checklist */}
          {activeTab === "checklist" && (
            <div className="check-list">
              <div className="check-item">
                <span className="check-dot"><Icon name="check" size={14} /></span>
                <div>
                  <span>Generic Commodity Name &amp; Brand (Rule 6(1)(b))</span>
                  <b>{currentProduct.name} ({currentProduct.brand})</b>
                </div>
              </div>

              <div className="check-item">
                <span className="check-dot"><Icon name="check" size={14} /></span>
                <div>
                  <span>Barcode (EAN-13 / GS1 Master)</span>
                  <b className="mono" style={{ margin: 0 }}>{currentProduct.barcode}</b>
                </div>
              </div>

              <div className="check-item">
                <span className={currentProduct.mrp === null ? "check-dot warn" : "check-dot"}>
                  {currentProduct.mrp === null ? <Icon name="alert" size={14} /> : <Icon name="check" size={14} />}
                </span>
                <div>
                  <span>Maximum Retail Price (MRP - Rule 6(1)(e))</span>
                  <b>{currentProduct.mrpDisplay}</b>
                </div>
              </div>

              {currentProduct.sellingPrice && currentProduct.mrp && currentProduct.sellingPrice > currentProduct.mrp && (
                <div className="check-item" style={{ background: "#fff5f5" }}>
                  <span className="check-dot warn"><Icon name="alert" size={14} /></span>
                  <div>
                    <span>Selling Price Charged vs MRP (Rule 18(2))</span>
                    <b style={{ color: "#c9484d" }}>
                      ₹{currentProduct.sellingPrice.toFixed(2)} charged (Overcharged by +₹
                      {(currentProduct.sellingPrice - currentProduct.mrp).toFixed(2)})
                    </b>
                  </div>
                </div>
              )}

              <div className="check-item">
                <span className={!fontReport.fontHeightCompliant || !currentProduct.netQuantity ? "check-dot warn" : "check-dot"}>
                  {!fontReport.fontHeightCompliant || !currentProduct.netQuantity ? <Icon name="alert" size={14} /> : <Icon name="check" size={14} />}
                </span>
                <div>
                  <span>Net Quantity &amp; Font Height (Rule 6(1)(c) &amp; Rule 7/9)</span>
                  <b>{currentProduct.netQuantity || "Missing"} · Font: {fontReport.detectedFontHeightMm}mm (Min {fontReport.prescribedMinHeightMm}mm)</b>
                </div>
              </div>

              <div className="check-item">
                <span className={currentProduct.violations.includes("expired") ? "check-dot warn" : "check-dot"}>
                  {currentProduct.violations.includes("expired") ? <Icon name="alert" size={14} /> : <Icon name="check" size={14} />}
                </span>
                <div>
                  <span>Best Before / Expiry Date (Rule 6(1)(d))</span>
                  <b style={{ color: currentProduct.violations.includes("expired") ? "#c9484d" : "inherit" }}>
                    {currentProduct.expiryDate || "Not Declared"}{" "}
                    {currentProduct.violations.includes("expired") && "(EXPIRED)"}
                  </b>
                </div>
              </div>

              <div className="check-item">
                <span className="check-dot"><Icon name="check" size={14} /></span>
                <div>
                  <span>Batch Number / Lot Code (Rule 6(1)(g))</span>
                  <b>{currentProduct.batchNumber || "Not Declared"}</b>
                </div>
              </div>

              <div className="check-item">
                <span className={!currentProduct.manufacturerName ? "check-dot warn" : "check-dot"}>
                  {!currentProduct.manufacturerName ? <Icon name="alert" size={14} /> : <Icon name="check" size={14} />}
                </span>
                <div>
                  <span>Manufacturer &amp; Packer Details (Rule 6(1)(a))</span>
                  <b>{currentProduct.manufacturerName || "Missing / Not Declared"}</b>
                </div>
              </div>

              <div className="check-item">
                <span className={!currentProduct.consumerCare ? "check-dot warn" : "check-dot"}>
                  {!currentProduct.consumerCare ? <Icon name="alert" size={14} /> : <Icon name="check" size={14} />}
                </span>
                <div>
                  <span>Customer-care helpline (Rule 6(1)(f))</span>
                  <b>{currentProduct.consumerCare || "Not Found"}</b>
                </div>
              </div>

              <div className="check-item">
                <span className="check-dot"><Icon name="check" size={14} /></span>
                <div>
                  <span>Country of Origin (Rule 6(1)(aa))</span>
                  <b>{currentProduct.countryOfOrigin}</b>
                </div>
              </div>
            </div>
          )}

          {activeTab === "citations" && (
            <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {statutoryCitations.map((c, i) => (
                <div key={i} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "12px", borderRadius: "8px", fontSize: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <b style={{ color: "#102b4e" }}>{c.ruleNumber}: {c.ruleTitle}</b>
                    <Badge type={c.status === "Compliant" ? "green" : "red"}>{c.status}</Badge>
                  </div>
                  <p style={{ margin: "4px 0", color: "#475569" }}>{c.description}</p>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>
                    <b>Act Section:</b> {c.actSection} · <b>Statutory Penalty:</b> {c.penaltySection}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "ocr" && (
            <div style={{ marginTop: "20px" }}>
              <div
                style={{
                  background: "#183451",
                  color: "#e8f4f2",
                  borderRadius: "8px",
                  padding: "16px",
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "12px",
                  lineHeight: "1.7",
                }}
              >
                <div style={{ color: "#7ce5cf", marginBottom: "8px", fontSize: "11px" }}>
                  // OCR Confidence: {currentProduct.ocrConfidence}% · Standard Lexicon Match
                </div>
                {currentProduct.rawOcrText}
              </div>
              <div style={{ marginTop: "12px", fontSize: "11px", color: "#6b7d8e" }}>
                OCR scanned on {new Date().toLocaleDateString("en-GB")} via PackSure LMPC Parser Engine.
              </div>
            </div>
          )}
        </section>

        {/* Right Side: Specific Warning / Safety Components */}
        {renderWarningComponent()}
      </div>

      {/* Action Buttons */}
      <div className="result-actions">
        <Button secondary onClick={() => exportToPdf(currentProduct)}>
          <Icon name="printer" size={16} /> Print / Save PDF
        </Button>
        <Button secondary onClick={() => exportToDocx(currentProduct)}>
          <Icon name="file" size={16} /> Export DOCX
        </Button>
        <Button secondary onClick={() => exportToCsvOrXlsx([currentProduct], "PackSure_Product_Inspection")}>
          <Icon name="download" size={16} /> Export CSV / Excel
        </Button>
        <Button secondary onClick={handleReportIssue}>
          <Icon name="alert" size={16} /> Report an issue / File Complaint
        </Button>
        <Button onClick={() => setPage("scan")}>
          Scan another product <Icon name="arrow" size={17} />
        </Button>
      </div>

      {/* Legal Metrology Mandatory Disclaimer */}
      <p className="disclaimer">
        <b>Disclaimer:</b> This is an automated preliminary compliance check, not a final legal decision.
      </p>

      {/* Verification Report Modal */}
      {showPrintModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Icon name="shield" size={20} style={{ color: "#0f8e7d" }} />
                <h3 style={{ fontSize: "18px", color: "#102b4e" }}>PackSure Verification Certificate</h3>
              </div>
              <button className="plain" onClick={() => setShowPrintModal(false)}>
                <Icon name="close" size={20} />
              </button>
            </div>

            <div style={{ marginTop: "16px", padding: "16px", background: "#f5f9fa", borderRadius: "8px", fontSize: "12px", color: "#445a71" }}>
              <p><b>Product:</b> {currentProduct.name}</p>
              <p><b>Barcode:</b> {currentProduct.barcode}</p>
              <p><b>Compliance Score:</b> {currentProduct.complianceScore} / 100 ({currentProduct.complianceStatus})</p>
              <p><b>Date of Inspection:</b> 02 September 2026</p>
              <p style={{ marginTop: "10px", fontSize: "10px", color: "#748496" }}>
                Certificate ID: VER-2026-{Math.floor(100000 + Math.random() * 900000)}
              </p>
            </div>

            <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <Button secondary onClick={() => setShowPrintModal(false)}>Close</Button>
              <Button onClick={() => { exportToPdf(currentProduct); setShowPrintModal(false) }}>
                <Icon name="printer" size={15} /> Print / Save PDF
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
