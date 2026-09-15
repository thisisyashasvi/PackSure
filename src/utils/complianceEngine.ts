import { ProductData, ComplaintData, TruthScoreBreakdown, ScoreFactor, PriorityEvaluation, PriorityLevel } from "../types"

/**
 * 1. Improved Package Complaint Risk Score Predictor (0–100)
 * Evaluates statutory non-compliance factors where a HIGHER score indicates
 * HIGHER risk / HIGHER likelihood of consumer grievance and enforcement action.
 */
export function calculateTruthScore(
  product: ProductData,
  communityReportsCount: number = 0
): TruthScoreBreakdown {
  const factors: ScoreFactor[] = []
  let riskScore = 0

  const violations = product.violations || []
  const hasViolation = (v: string) => violations.includes(v as any)

  // 1. Product Expired (+40 Risk)
  const isExpired = hasViolation("expired") || (product.expiryDate && new Date(product.expiryDate) < new Date("2026-09-01"))
  if (isExpired) {
    factors.push({
      id: "expired",
      title: "Product Expired",
      points: 40,
      explanation: `+40: Product expired past declared date (${product.expiryDate || "Expired"}). Immediate consumer health hazard under FSSAI & LMPC Rules.`,
      type: "deduction",
    })
    riskScore += 40
  }

  // 2. Expiry within 7 days (+15 Risk)
  if (!isExpired && product.expiryDate) {
    const expTime = new Date(product.expiryDate).getTime()
    const nowTime = new Date("2026-09-14").getTime()
    const diffDays = Math.ceil((expTime - nowTime) / (1000 * 60 * 60 * 24))
    if (diffDays >= 0 && diffDays <= 7) {
      factors.push({
        id: "expiring_soon",
        title: "Expiring Within 7 Days",
        points: 15,
        explanation: `+15: Commodity expires in ${diffDays} days (${product.expiryDate}). Fast-turnover shelf scrutiny recommended.`,
        type: "deduction",
      })
      riskScore += 15
    }
  }

  // 3. Selling price above MRP (+30 Risk)
  const isOvercharging =
    hasViolation("overcharging") ||
    (product.sellingPrice !== undefined && product.mrp !== null && product.sellingPrice > product.mrp)
  if (isOvercharging) {
    const diff = (product.sellingPrice || 0) - (product.mrp || 0)
    factors.push({
      id: "overcharging",
      title: "Selling Price Above MRP (Overcharging)",
      points: 30,
      explanation: `+30: Shop price ₹${product.sellingPrice || 0} is higher than printed MRP ₹${product.mrp || 0} (+₹${diff.toFixed(2)} illegal surcharge).`,
      type: "deduction",
    })
    riskScore += 30
  }

  // 4. MRP missing (+25 Risk)
  const isMrpMissing = hasViolation("mrp_missing") || product.mrp === null || !product.mrpDisplay || product.mrpDisplay.includes("Missing")
  if (isMrpMissing) {
    factors.push({
      id: "mrp_missing",
      title: "Statutory MRP Missing / Illegible",
      points: 25,
      explanation: "+25: Maximum Retail Price (MRP) inclusive of all taxes is absent on package violating Rule 6(1)(e).",
      type: "deduction",
    })
    riskScore += 25
  }

  // 5. Net Quantity Missing (+15 Risk)
  const isNetQtyMissing = hasViolation("net_qty_missing") || !product.netQuantity || product.netQuantity.includes("Missing")
  if (isNetQtyMissing) {
    factors.push({
      id: "net_qty_missing",
      title: "Net Quantity Missing",
      points: 15,
      explanation: "+15: Standard net quantity (weight, volume, or piece count) is missing under Rule 6(1)(c).",
      type: "deduction",
    })
    riskScore += 15
  }

  // 6. Batch Number Missing (+10 Risk)
  const isBatchMissing = !product.batchNumber || product.batchNumber.includes("Missing") || product.batchNumber.includes("Not Declared")
  if (isBatchMissing) {
    factors.push({
      id: "batch_missing",
      title: "Batch / Lot Number Missing",
      points: 10,
      explanation: "+10: Batch or lot number for quality traceability is missing under Rule 6(1)(e).",
      type: "deduction",
    })
    riskScore += 10
  }

  // 7. Manufacturer Address Missing (+15 Risk)
  const isMfrMissing = hasViolation("manufacturer_missing") || !product.manufacturerAddress || product.manufacturerAddress.includes("Missing") || product.manufacturerAddress.includes("Not Declared")
  if (isMfrMissing) {
    factors.push({
      id: "manufacturer_missing",
      title: "Manufacturer / Packer Address Missing",
      points: 15,
      explanation: "+15: Full name and address of manufacturer or packer is missing under Rule 6(1)(a).",
      type: "deduction",
    })
    riskScore += 15
  }

  // 8. Customer Care Details Missing (+10 Risk)
  const isConsumerCareMissing = !product.consumerCare || product.consumerCare.includes("Missing") || product.consumerCare.includes("Not Declared")
  if (isConsumerCareMissing) {
    factors.push({
      id: "consumer_care_missing",
      title: "Consumer Care Helpline Missing",
      points: 10,
      explanation: "+10: Reachable customer care contact or grievance email is missing under Rule 6(1)(f).",
      type: "deduction",
    })
    riskScore += 10
  }

  // 9. Font Height Violation under Rule 7/9 (+15 Risk)
  const hasFontViolation = hasViolation("font_size_violation") || (product.fontCompliance && !product.fontCompliance.fontHeightCompliant)
  if (hasFontViolation) {
    const minH = product.fontCompliance?.prescribedMinHeightMm || 2.0
    const detH = product.fontCompliance?.detectedFontHeightMm || 1.2
    factors.push({
      id: "font_size_violation",
      title: "Statutory Font-Height Non-Compliance",
      points: 15,
      explanation: `+15: Numeral font height (${detH} mm) is smaller than statutory minimum (${minH} mm) prescribed under Table 1 of Rule 7 & 9.`,
      type: "deduction",
    })
    riskScore += 15
  }

  // 10. Non-Standard Metric Units (+10 Risk)
  const hasNonStandardUnits = hasViolation("non_standard_units") || (product.fontCompliance && product.fontCompliance.nonStandardUnitsDetected.length > 0)
  if (hasNonStandardUnits) {
    const unitList = product.fontCompliance?.nonStandardUnitsDetected.join(", ") || "Use of non-standard abbreviations (e.g. gms, kilo, ltr)"
    factors.push({
      id: "non_standard_units",
      title: "Non-Standard Unit Symbols",
      points: 10,
      explanation: `+10: Packaging uses prohibited/non-standard metric abbreviations (${unitList}) violating Rule 11.`,
      type: "deduction",
    })
    riskScore += 10
  }

  // 11. Low OCR Scan Quality (+10 Risk)
  if (product.ocrConfidence !== undefined && product.ocrConfidence < 60) {
    factors.push({
      id: "low_ocr",
      title: "Low OCR Scan Confidence",
      points: 10,
      explanation: `+10: OCR label reading confidence is ${product.ocrConfidence.toFixed(1)}% (< 60%). Re-scan recommended.`,
      type: "deduction",
    })
    riskScore += 10
  }

  // 12. Possible Label Tampering (+25 Risk)
  if (product.rawOcrText && (product.rawOcrText.includes("TAMPERED") || product.rawOcrText.includes("STICKER OVER") || product.alertMessage?.includes("Tampered"))) {
    factors.push({
      id: "tampered_label",
      title: "Possible Label Tampering",
      points: 25,
      explanation: "+25: Suspected over-stickering or tampered date/price markings detected.",
      type: "deduction",
    })
    riskScore += 25
  }

  // 13. Repeated Community Complaints (+5 to +20 Risk)
  if (communityReportsCount > 0) {
    let penalty = 5
    if (communityReportsCount >= 5) penalty = 20
    else if (communityReportsCount >= 3) penalty = 10

    factors.push({
      id: "community_complaints",
      title: "Community Grievance History",
      points: penalty,
      explanation: `+${penalty}: ${communityReportsCount} previous grievance report(s) logged by consumers for this commodity/outlet.`,
      type: "deduction",
    })
    riskScore += penalty
  }

  // Positive Compliance Credits (Lowers Complaint Risk)
  // A. Barcode matches registered catalog product (-5 Risk)
  if (product.barcode && product.barcode.length >= 8) {
    factors.push({
      id: "known_barcode",
      title: "Registered GS1 Barcode Match",
      points: -5,
      explanation: "−5: Barcode successfully verified against national commodity master registry.",
      type: "bonus",
    })
    riskScore -= 5
  }

  // B. All required fields detected clearly (-5 Risk)
  const failedDeclarations = product.declarations ? product.declarations.filter((d) => d.status === "fail") : []
  if (failedDeclarations.length === 0 && !isExpired && !isOvercharging && !isMrpMissing) {
    factors.push({
      id: "all_declarations_passed",
      title: "All Statutory Declarations Verified",
      points: -5,
      explanation: "−5: All 7 mandatory statutory declarations under LMPC Rule 6(1) verified with clear OCR fidelity.",
      type: "bonus",
    })
    riskScore -= 5
  }

  // Clamp final score between 0 and 100
  const finalScore = Math.max(0, Math.min(100, riskScore))

  // Determine Category: HIGH score means LIKELY TO COMPLAINT
  let category: "Likely Compliant" | "Needs Attention" | "Possible Violation" = "Likely Compliant"
  let categoryColor: "green" | "amber" | "red" = "green"

  if (finalScore >= 50) {
    category = "Possible Violation"
    categoryColor = "red"
  } else if (finalScore >= 25) {
    category = "Needs Attention"
    categoryColor = "amber"
  } else {
    category = "Likely Compliant"
    categoryColor = "green"
  }

  return {
    score: finalScore,
    category,
    categoryColor,
    factors,
  }
}

/**
 * 2. Complaint Priority System
 * Calculates Critical, High, Medium, Low priority with explicit rationale.
 */
export function calculateComplaintPriority(
  complaint: Partial<ComplaintData>,
  product?: ProductData | null
): PriorityEvaluation {
  const issue = (complaint.issueType || "").toLowerCase()
  const desc = (complaint.description || "").toLowerCase()
  const cat = (product?.category || "").toLowerCase()
  const isHealthSensitive =
    cat.includes("food") || cat.includes("beverage") || cat.includes("cosmetic") || cat.includes("pharmaceutical") || cat.includes("milk")

  // Rule 1: CRITICAL (Dark Red)
  // Expired food/cosmetic/medicine, suspected tampered expiry date, or multiple serious violations
  const isExpired = issue.includes("expired") || desc.includes("expired") || product?.violations?.includes("expired")
  const isTampered = issue.includes("tamper") || desc.includes("tamper") || desc.includes("over-sticker")
  const hasMultipleViolations = (product?.violations && product.violations.filter((v) => v !== "none").length >= 2) || false

  if (isExpired && isHealthSensitive) {
    return {
      priority: "Critical",
      explanation: `Priority: Critical — Sale of expired perishable / ingestible commodity (${product?.name || "Food/Cosmetic/Medicine"}), posing immediate consumer health risk under FSSAI & LMPC Section 18.`,
      color: "critical",
    }
  }

  if (isTampered) {
    return {
      priority: "Critical",
      explanation: "Priority: Critical — Suspected deliberate tampering or alteration of statutory expiry date / MRP markings.",
      color: "critical",
    }
  }

  if (hasMultipleViolations && isExpired) {
    return {
      priority: "Critical",
      explanation: "Priority: Critical — Multiple compounding statutory violations detected including expired stock.",
      color: "critical",
    }
  }

  // Rule 2: HIGH (Red / Orange)
  // Selling price above MRP, missing MRP, missing expiry for an expiry-required category, or repeated complaints
  const priceCharged = complaint.priceCharged !== undefined ? Number(complaint.priceCharged) : (product?.sellingPrice || 0)
  const mrp = complaint.mrp !== undefined && complaint.mrp !== null ? Number(complaint.mrp) : (product?.mrp || 0)
  const isOvercharging = (priceCharged > 0 && mrp > 0 && priceCharged > mrp) || issue.includes("overcharging") || issue.includes("above mrp")

  if (isOvercharging) {
    return {
      priority: "High",
      explanation: `Priority: High — Selling price is ₹${priceCharged.toFixed(2)}, which is above the detected MRP of ₹${mrp.toFixed(2)} (+₹${(priceCharged - mrp).toFixed(2)} excess surcharge).`,
      color: "high",
    }
  }

  if (issue.includes("mrp missing") || issue.includes("mrp illegible") || product?.violations?.includes("mrp_missing")) {
    return {
      priority: "High",
      explanation: "Priority: High — Commodity is being sold without statutory Maximum Retail Price (MRP) declaration under Rule 6(1)(e).",
      color: "high",
    }
  }

  if (issue.includes("expired") || isExpired) {
    return {
      priority: "High",
      explanation: `Priority: High — Commodity has crossed the declared Best Before / Expiry date (${product?.expiryDate || "Expired"}).`,
      color: "high",
    }
  }

  if (complaint.communityReports && complaint.communityReports >= 2) {
    return {
      priority: "High",
      explanation: `Priority: High — Repeated community grievances reported for this merchant / location (${complaint.communityReports} reports).`,
      color: "high",
    }
  }

  // Rule 3: MEDIUM (Amber / Yellow)
  // Missing net quantity, batch number, manufacturer address, or customer-care information
  if (
    issue.includes("net quantity") ||
    issue.includes("manufacturer") ||
    issue.includes("batch") ||
    issue.includes("contact") ||
    issue.includes("customer care") ||
    product?.violations?.includes("net_qty_missing") ||
    product?.violations?.includes("manufacturer_missing")
  ) {
    return {
      priority: "Medium",
      explanation: "Priority: Medium — Mandatory packaging declaration missing (Net Quantity / Manufacturer Address / Batch Details) under Rule 6(1).",
      color: "medium",
    }
  }

  // Rule 4: LOW (Blue / Grey)
  // Minor label clarity issue, incomplete evidence, or general feedback
  return {
    priority: "Low",
    explanation: "Priority: Low — Minor label legibility defect or routine packaging clarification enquiry.",
    color: "low",
  }
}

/**
 * 3. Duplicate Complaint Detection
 * Checks whether a candidate complaint matches an existing complaint in the system.
 */
export function findDuplicateComplaint(
  candidate: Partial<ComplaintData>,
  existingComplaints: ComplaintData[]
): ComplaintData | null {
  if (!existingComplaints || existingComplaints.length === 0) return null

  const candidateBarcode = (candidate.barcode || "").trim()
  const candidateProdName = (candidate.productName || "").trim().toLowerCase()
  const candidateIssue = (candidate.issueType || "").trim().toLowerCase()
  const candidateShop = (candidate.shopName || "").trim().toLowerCase()
  const candidateAddress = (candidate.shopAddress || "").trim().toLowerCase()

  for (const existing of existingComplaints) {
    // 1. Barcode match OR Product Name close match
    const matchBarcode = candidateBarcode && existing.barcode && candidateBarcode === existing.barcode
    const matchName =
      candidateProdName &&
      existing.productName &&
      (candidateProdName.includes(existing.productName.toLowerCase()) ||
        existing.productName.toLowerCase().includes(candidateProdName))

    const isProductMatch = matchBarcode || matchName
    if (!isProductMatch) continue

    // 2. Issue Type match (similar issue categories)
    const existingIssue = (existing.issueType || "").toLowerCase()
    const isIssueMatch =
      candidateIssue === existingIssue ||
      (candidateIssue.includes("overcharging") && existingIssue.includes("overcharging")) ||
      (candidateIssue.includes("mrp") && existingIssue.includes("mrp")) ||
      (candidateIssue.includes("expired") && existingIssue.includes("expired")) ||
      (candidateIssue.includes("quantity") && existingIssue.includes("quantity")) ||
      (candidateIssue.includes("manufacturer") && existingIssue.includes("manufacturer"))

    if (!isIssueMatch) continue

    // 3. Shop Name OR Location match
    const existingShop = (existing.shopName || "").toLowerCase()
    const existingAddr = (existing.shopAddress || "").toLowerCase()

    const isShopMatch =
      (candidateShop && existingShop && (candidateShop.includes(existingShop) || existingShop.includes(candidateShop))) ||
      (candidateAddress && existingAddr && (candidateAddress.includes(existingAddr) || existingAddr.includes(candidateAddress))) ||
      (candidateShop && candidateShop.length > 3 && existingShop.length > 3 && candidateShop.slice(0, 5) === existingShop.slice(0, 5))

    if (isShopMatch) {
      return existing
    }
  }

  return null
}
