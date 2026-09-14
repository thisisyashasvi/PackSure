import { ProductData, FontComplianceReport, StatutoryRuleCitation, EnforcementRecommendation } from "../types"

/**
 * Parses net quantity string (e.g. "100 g", "1.5 kg", "750 ml", "1 L") into numeric value in grams or ml.
 */
export function parseNetQuantityInGrams(netQuantityStr: string | null | undefined): number {
  if (!netQuantityStr) return 100
  const normalized = netQuantityStr.toLowerCase().trim()
  
  // Matches e.g. "1.5 kg", "500 g", "750 ml", "1 litre", "2 l"
  const match = normalized.match(/([\d.]+)\s*(kg|kilo|kgs|g|gm|gms|grms|ml|l|litre|litres|ltr|ltrs|n|units)?/)
  if (!match) return 100

  const value = parseFloat(match[1]) || 100
  const unit = match[2] || "g"

  if (unit === "kg" || unit === "kilo" || unit === "kgs" || unit === "l" || unit === "litre" || unit === "litres" || unit === "ltr" || unit === "ltrs") {
    return value * 1000
  }
  return value
}

/**
 * Calculates statutory minimum font height under Rule 7 & Rule 9 (Table 1)
 * of the Legal Metrology (Packaged Commodities) Rules, 2011.
 * 
 * Statutory Prescriptions:
 * 1. Net Quantity <= 50g / 50ml: Minimum 1.0 mm (1.5 mm if blown/embossed)
 * 2. 50g < Net Quantity <= 200g / 200ml: Minimum 2.0 mm (3.0 mm if blown/embossed)
 * 3. 200g < Net Quantity <= 1000g / 1kg: Minimum 4.0 mm (6.0 mm if blown/embossed)
 * 4. Net Quantity > 1000g / 1kg: Minimum 6.0 mm (6.0 mm if blown/embossed)
 */
export function getStatutoryMinFontHeight(netQuantityGramsOrMl: number, isBlownOrEmbossed: boolean = false): number {
  if (netQuantityGramsOrMl <= 50) {
    return isBlownOrEmbossed ? 1.5 : 1.0
  } else if (netQuantityGramsOrMl <= 200) {
    return isBlownOrEmbossed ? 3.0 : 2.0
  } else if (netQuantityGramsOrMl <= 1000) {
    return isBlownOrEmbossed ? 6.0 : 4.0
  } else {
    return 6.0
  }
}

/**
 * Detects non-standard or prohibited units of measurement under Rule 11 & Second Schedule.
 * Standard symbols: g, kg, ml, l, m, cm, N.
 * Non-standard symbols: gms, grms, gm, kilo, kilos, kgs, ltr, ltrs, ml., cc, nos.
 */
export function detectNonStandardUnits(text: string): string[] {
  const flags: string[] = []
  if (!text) return flags

  const lower = text.toLowerCase()

  const nonStandardPatterns = [
    { pattern: /\b(\d+)\s*(gms|grms|gm)\b/i, name: "Use of 'gms/grms/gm' instead of standard SI symbol 'g' (Rule 11)" },
    { pattern: /\b(\d+)\s*(kilos|kgs)\b/i, name: "Use of 'kilos/kgs' instead of standard SI symbol 'kg' (Rule 11)" },
    { pattern: /\b(\d+)\s*(ltr|ltrs|liters|litres)\b/i, name: "Use of 'ltr/ltrs' instead of standard symbol 'l' or 'L' (Rule 11)" },
    { pattern: /\b(\d+)\s*(cc)\b/i, name: "Use of non-standard volumetric unit 'cc' instead of 'ml' or 'cm³'" },
    { pattern: /\b(\d+)\s*(nos|no\.)\b/i, name: "Use of 'nos/no.' instead of standard piece symbol 'N' (Rule 13)" },
  ]

  for (const { pattern, name } of nonStandardPatterns) {
    if (pattern.test(lower)) {
      flags.push(name)
    }
  }

  return flags
}

/**
 * Detects misleading, incomplete, or non-standard declarations in packaging text.
 */
export function detectMisleadingDeclarations(
  rawText: string,
  mrp: number | null,
  sellingPrice?: number,
  consumerCare?: string | null
): string[] {
  const issues: string[] = []
  const lower = (rawText || "").toLowerCase()

  // 1. Missing mandatory "inclusive of all taxes"
  const hasMrp = lower.includes("mrp") || lower.includes("max retail price") || mrp !== null
  const hasTaxPhrase = lower.includes("incl") || lower.includes("inclusive of all taxes") || lower.includes("incl. of all taxes") || lower.includes("all taxes")
  if (hasMrp && !hasTaxPhrase) {
    issues.push("Rule 6(1)(e): MRP declaration lacks mandatory 'inclusive of all taxes' or 'incl. of all taxes' statutory phrasing.")
  }

  // 2. Selling price exceeds MRP
  if (sellingPrice && mrp && sellingPrice > mrp) {
    issues.push(`Rule 18(2): Selling price (₹${sellingPrice.toFixed(2)}) exceeds declared printed MRP (₹${mrp.toFixed(2)}) by ₹${(sellingPrice - mrp).toFixed(2)}.`)
  }

  // 3. Incomplete consumer care declaration
  if (consumerCare) {
    const hasPhone = /\d{10}|\d{3,5}[-\s]\d{6,8}|1800[-\s]?\d{3}[-\s]?\d{3,4}/.test(consumerCare)
    const hasEmail = /[\w.-]+@[\w.-]+\.\w+/.test(consumerCare)
    if (!hasPhone && !hasEmail) {
      issues.push("Rule 6(1)(f): Consumer care helpline missing both valid telephone number and email address.")
    } else if (!hasPhone) {
      issues.push("Rule 6(1)(f): Consumer care helpline missing telephone/toll-free contact number.")
    } else if (!hasEmail) {
      issues.push("Rule 6(1)(f): Consumer care helpline missing registered email address.")
    }
  }

  // 4. Dual MRP or Altered Sticker Warnings
  if (lower.includes("special price") && lower.includes("mrp")) {
    issues.push("Rule 18(1): Suspected dual pricing or supplementary price sticker obscuring standard manufacturer MRP.")
  }

  return issues
}

/**
 * Comprehensive Font-Size & Readability Compliance Analysis
 */
export function analyzeFontCompliance(
  product: Partial<ProductData>,
  detectedFontHeightMm?: number,
  pdpAreaCm2: number = 180,
  contrastRatio: number = 5.2
): FontComplianceReport {
  const netQtyGrams = parseNetQuantityInGrams(product.netQuantity)
  const prescribedMinHeightMm = getStatutoryMinFontHeight(netQtyGrams)

  // If detected font height is not provided, evaluate based on product profile or defaults
  let detectedMm = detectedFontHeightMm
  if (detectedMm === undefined) {
    if (product.violations?.includes("font_size_violation" as any)) {
      detectedMm = Math.max(0.6, prescribedMinHeightMm - 1.2)
    } else if (product.violations?.includes("net_qty_missing" as any)) {
      detectedMm = 0.8
    } else {
      detectedMm = prescribedMinHeightMm + 0.5
    }
  }

  const fontHeightCompliant = detectedMm >= prescribedMinHeightMm
  const contrastCompliant = contrastRatio >= 4.5 // Standard ISO / WCAG legibility threshold

  // Raw text analysis
  const combinedText = `${product.rawOcrText || ""} ${product.mrpDisplay || ""} ${product.netQuantity || ""} ${product.consumerCare || ""}`
  const nonStandardUnits = detectNonStandardUnits(combinedText)
  const misleadingPhrases = detectMisleadingDeclarations(
    combinedText,
    product.mrp || null,
    product.sellingPrice,
    product.consumerCare
  )

  // Legibility Score computation (0-100)
  let legibility = 100
  if (!fontHeightCompliant) legibility -= 35
  if (!contrastCompliant) legibility -= 25
  if (nonStandardUnits.length > 0) legibility -= 15 * nonStandardUnits.length
  if (misleadingPhrases.length > 0) legibility -= 10 * misleadingPhrases.length
  legibility = Math.max(10, Math.min(100, legibility))

  let overallStatus: "Compliant" | "Non-Compliant" | "Borderline Warning" = "Compliant"
  if (!fontHeightCompliant || misleadingPhrases.length > 0) {
    overallStatus = "Non-Compliant"
  } else if (!contrastCompliant || nonStandardUnits.length > 0 || legibility < 75) {
    overallStatus = "Borderline Warning"
  }

  return {
    netQuantityValueGramsOrMl: netQtyGrams,
    pdpAreaCm2,
    prescribedMinHeightMm,
    detectedFontHeightMm: detectedMm,
    fontHeightCompliant,
    contrastRatio,
    contrastCompliant,
    legibilityScore: legibility,
    nonStandardUnitsDetected: nonStandardUnits,
    misleadingPhrasesDetected: misleadingPhrases,
    statutoryRuleCitation: `Rule 7 & Rule 9 (Table 1) · Minimum numeral height: ${prescribedMinHeightMm.toFixed(1)} mm for Net Quantity (${netQtyGrams}g/ml)`,
    overallStatus,
  }
}

/**
 * Generates Statutory Rule Citations for a given product inspection.
 */
export function generateStatutoryCitations(product: ProductData, fontReport: FontComplianceReport): StatutoryRuleCitation[] {
  const citations: StatutoryRuleCitation[] = []

  // 1. Rule 6(1)(a) - Manufacturer Details
  citations.push({
    ruleNumber: "Rule 6(1)(a)",
    ruleTitle: "Manufacturer / Packer / Importer Name & Full Address",
    actSection: "Section 18 & Section 36(1), Legal Metrology Act, 2009",
    description: "Every pre-packaged commodity must declare the name and complete physical address of the manufacturer, packer, or importer.",
    penaltySection: "Fine up to ₹25,000 (1st offence), up to ₹50,000 (2nd offence), or imprisonment up to 1 year.",
    status: !product.manufacturerName || !product.manufacturerAddress || product.violations.includes("manufacturer_missing")
      ? "Violation"
      : "Compliant",
  })

  // 2. Rule 6(1)(c) & Rule 7/9 - Net Quantity & Minimum Font Height
  citations.push({
    ruleNumber: "Rule 6(1)(c) & Rule 7/9",
    ruleTitle: "Net Quantity Declaration & Statutory Font Height (Table 1)",
    actSection: "Section 18 & Section 36(1), Legal Metrology Act, 2009",
    description: `Net quantity must be declared with standard SI metric units (g, kg, ml, l) with minimum numeral height of ${fontReport.prescribedMinHeightMm} mm.`,
    penaltySection: "Compounding under Section 48 (₹25,000) or prosecution under Section 36(1).",
    status: !fontReport.fontHeightCompliant || product.violations.includes("net_qty_missing") || fontReport.nonStandardUnitsDetected.length > 0
      ? "Violation"
      : "Compliant",
  })

  // 3. Rule 6(1)(e) & Rule 18(2) - MRP & Dual Pricing / Overcharging
  const isOvercharging = (product.sellingPrice && product.mrp && product.sellingPrice > product.mrp) || product.violations.includes("overcharging")
  const isMrpMissing = product.mrp === null || product.violations.includes("mrp_missing")
  citations.push({
    ruleNumber: "Rule 6(1)(e) & Rule 18(2)",
    ruleTitle: "Maximum Retail Price (MRP) & Prohibition on Overcharging",
    actSection: "Section 18 & Section 36(1) / Section 36(2), Legal Metrology Act, 2009",
    description: "MRP must be clearly printed 'inclusive of all taxes'. No person shall sell, or cause to be sold, any pre-packaged commodity at a price exceeding the retail sale price.",
    penaltySection: "Penalty under Section 36(2): Fine up to ₹25,000 (1st offence), up to ₹50,000 (2nd offence) or imprisonment.",
    status: isOvercharging || isMrpMissing ? "Violation" : "Compliant",
  })

  // 4. Rule 6(1)(d) - Expiry / Date of Packing
  const isExpired = product.violations.includes("expired")
  citations.push({
    ruleNumber: "Rule 6(1)(d)",
    ruleTitle: "Date of Manufacture / Packing / Expiry Declaration",
    actSection: "Section 18, Legal Metrology Act & FSSAI Act, 2006",
    description: "Month and year of manufacture or packing and expiry/use-by date must be conspicuously declared.",
    penaltySection: "Seizure of non-standard / expired commodity under Rule 32 & Section 36 penalty.",
    status: isExpired ? "Violation" : "Compliant",
  })

  // 5. Rule 6(1)(f) - Customer Care Helpline
  const isConsumerCareMissing = !product.consumerCare || product.consumerCare.includes("Missing")
  citations.push({
    ruleNumber: "Rule 6(1)(f)",
    ruleTitle: "Consumer Grievance Redressal / Customer Care Cell",
    actSection: "Section 18 & Section 36(1), Legal Metrology Act, 2009",
    description: "Name, address, telephone number, and email address of the person or office who can be contacted in case of consumer complaints.",
    penaltySection: "Statutory notice under Section 36(1) and rectification order.",
    status: isConsumerCareMissing ? "Violation" : "Compliant",
  })

  return citations
}

/**
 * Derives recommended enforcement and legal actions for inspectors.
 */
export function deriveEnforcementRecommendation(
  product: ProductData,
  fontReport: FontComplianceReport
): EnforcementRecommendation {
  const violations = product.violations || []
  const isExpired = violations.includes("expired")
  const isOvercharging = violations.includes("overcharging") || (product.sellingPrice && product.mrp && product.sellingPrice > product.mrp)
  const isFontViolation = !fontReport.fontHeightCompliant
  const isMissingDeclarations = violations.includes("mrp_missing") || violations.includes("manufacturer_missing") || violations.includes("net_qty_missing")

  if (isExpired) {
    return {
      actionType: "Seizure Rule 32",
      statutoryReference: "Rule 32, LMPC Rules 2011 & Section 15(1), Legal Metrology Act 2009",
      recommendedPenaltyInr: 50000,
      actionDescription: "Immediate seizure and confiscation of expired packaged stock from retail shelf. Issue Section 36 summons to store manager and distributor.",
      urgency: "Immediate",
    }
  }

  if (isOvercharging) {
    const diff = ((product.sellingPrice || 0) - (product.mrp || 0)).toFixed(2)
    return {
      actionType: "Notice Section 36",
      statutoryReference: "Section 36(2), Legal Metrology Act, 2009 & Rule 18(2)",
      recommendedPenaltyInr: 25000,
      actionDescription: `Issue Statutory Show Cause Notice for selling at ₹${product.sellingPrice} (+₹${diff} above declared MRP). Offer compounding under Section 48 upon payment of ₹25,000 fee.`,
      urgency: "High",
    }
  }

  if (isFontViolation || isMissingDeclarations) {
    return {
      actionType: "Compounding Section 48",
      statutoryReference: "Section 18 & Section 36(1), Legal Metrology Act 2009 & Rule 7/9",
      recommendedPenaltyInr: 25000,
      actionDescription: `Issue Notice for non-compliant declarations (Font size ${fontReport.detectedFontHeightMm}mm vs prescribed ${fontReport.prescribedMinHeightMm}mm). Summon manufacturer for rectification & compounding under Section 48.`,
      urgency: "High",
    }
  }

  if (fontReport.nonStandardUnitsDetected.length > 0 || fontReport.misleadingPhrasesDetected.length > 0) {
    return {
      actionType: "Advisory / Warning",
      statutoryReference: "Rule 11 & Rule 6(1)(e), LMPC Rules 2011",
      recommendedPenaltyInr: 5000,
      actionDescription: "Issue formal rectification warning letter to manufacturer with 14-day compliance window to align packaging artwork with standard SI units.",
      urgency: "Standard",
    }
  }

  return {
    actionType: "No Action (Compliant)",
    statutoryReference: "Legal Metrology (Packaged Commodities) Rules, 2011",
    actionDescription: "Product satisfies all statutory declaration mandates. Verification certificate issued and recorded in central registry.",
    urgency: "Informational",
  }
}
