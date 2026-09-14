export type Page =
  | "home"
  | "scan"
  | "result"
  | "complaint"
  | "track"
  | "admin"
  | "auth"
  | "officer-login"
  | "officer-dashboard"
  | "repository"

export type UserRole = "admin" | "officer" | "user"

export interface User {
  id: string
  name: string
  email: string
  password: string
  role: UserRole
  createdAt: string
  department?: string
  phone?: string
  badgeNumber?: string
  zone?: string
}

export interface AuthSession {
  user: User | null
  isAuthenticated: boolean
  token?: string
}

export type ViolationType =
  | "none"
  | "expired"
  | "mrp_missing"
  | "net_qty_missing"
  | "overcharging"
  | "manufacturer_missing"
  | "font_size_violation"
  | "non_standard_units"
  | "misleading_declaration"
  | "missing_consumer_care"
  | "missing_mfg_date"
  | "other"

export type ComplianceStatus = "Likely Compliant" | "Violation Detected" | "Critical Warning"

export interface MandatoryDeclaration {
  id: string
  rule: string
  label: string
  detectedValue: string
  status: "pass" | "fail" | "warn"
  note?: string
  fontHeightMm?: number
  minRequiredFontMm?: number
}

export interface FontComplianceReport {
  netQuantityValueGramsOrMl: number
  pdpAreaCm2: number
  prescribedMinHeightMm: number
  detectedFontHeightMm: number
  fontHeightCompliant: boolean
  contrastRatio: number
  contrastCompliant: boolean
  legibilityScore: number // 0-100
  nonStandardUnitsDetected: string[]
  misleadingPhrasesDetected: string[]
  statutoryRuleCitation: string
  overallStatus: "Compliant" | "Non-Compliant" | "Borderline Warning"
}

export interface StatutoryRuleCitation {
  ruleNumber: string
  ruleTitle: string
  actSection: string
  description: string
  penaltySection: string
  status: "Compliant" | "Violation" | "Warning"
}

export interface EnforcementRecommendation {
  actionType: "Notice Section 36" | "Compounding Section 48" | "Seizure Rule 32" | "Advisory / Warning" | "No Action (Compliant)"
  statutoryReference: string
  recommendedPenaltyInr?: number
  actionDescription: string
  urgency: "Immediate" | "High" | "Standard" | "Informational"
}

export type PriorityLevel = "Critical" | "High" | "Medium" | "Low"

export type DuplicateStatus = "Original" | "Joined Community Report" | "Independent Duplicate" | "Potential Duplicate"

export interface ScoreFactor {
  id: string
  title: string
  points: number // negative for deduction, positive for bonus
  explanation: string
  type: "deduction" | "bonus"
}

export interface TruthScoreBreakdown {
  score: number
  category: "Likely Compliant" | "Needs Attention" | "Possible Violation"
  categoryColor: "green" | "amber" | "red"
  factors: ScoreFactor[]
}

export interface PriorityEvaluation {
  priority: PriorityLevel
  explanation: string
  color: "critical" | "high" | "medium" | "low"
}

export interface ProductData {
  id: string
  name: string
  brand: string
  category: string
  barcode: string
  mrp: number | null
  mrpDisplay: string
  netQuantity: string | null
  mfgDate: string
  expiryDate: string | null
  batchNumber: string | null
  manufacturerName: string | null
  manufacturerAddress: string | null
  consumerCare: string | null
  countryOfOrigin: string
  unitSalePrice?: string
  complianceStatus: ComplianceStatus
  complianceScore: number
  violations: ViolationType[]
  sellingPrice?: number
  ocrConfidence: number
  rawOcrText: string
  declarations: MandatoryDeclaration[]
  alertMessage?: string
  warningAdvice?: string
  packageColor?: string
  scoreBreakdown?: TruthScoreBreakdown
  fontCompliance?: FontComplianceReport
  evidenceImages?: string[]
}

export interface ScanRecord {
  id: string
  userId?: string
  userName?: string
  barcode: string
  productName: string
  brand: string
  mrp: number | null
  netQuantity?: string | null
  expiryDate?: string | null
  complianceStatus: ComplianceStatus
  complianceScore: number
  violations: string[]
  imageFileName: string
  scannedAt: string
}

export interface InspectionRecord {
  id: string
  dossierNumber: string
  inspectorId: string
  inspectorName: string
  inspectorBadge: string
  zone: string
  barcode: string
  productName: string
  brand: string
  category: string
  mrp: number | null
  sellingPrice?: number
  netQuantity: string
  mfgDate?: string
  expiryDate?: string
  manufacturerName: string
  manufacturerAddress: string
  consumerCare: string
  countryOfOrigin: string
  complianceScore: number
  complianceStatus: ComplianceStatus
  violations: ViolationType[]
  evidenceImages: string[]
  fontCompliance: FontComplianceReport
  enforcementAction: EnforcementRecommendation
  statutoryCitations: StatutoryRuleCitation[]
  inspectedAt: string
  status: "Under Inspection" | "Notice Issued" | "Compounded" | "Closed" | "Verified Compliant"
  merchantName?: string
  merchantAddress?: string
  inspectorNotes?: string
}

export type ExportFormat = "pdf" | "docx" | "xlsx" | "csv"

export interface ComplaintData {
  id: string
  userId?: string
  barcode: string
  productName: string
  brand: string
  issueType: string
  shopName: string
  shopAddress: string
  locationCoords?: string
  description: string
  mrp: number | null
  priceCharged?: number
  evidenceFiles: string[]
  complainantName: string
  complainantPhone: string
  complainantEmail?: string
  submittedAt: string
  status: "Submitted" | "Under Review" | "Notice Issued" | "Penalty Imposed" | "Resolved"
  officerName?: string
  remarks?: string
  priority?: PriorityLevel
  priorityExplanation?: string
  communityReports?: number
  duplicateStatus?: DuplicateStatus
  timeline: {
    stage: string
    title: string
    description: string
    date: string
    time: string
    completed: boolean
    current?: boolean
  }[]
}

export interface SqlQueryResult {
  columns: string[]
  rows: any[]
  rowCount: number
  executionTimeMs: number
  error?: string
}

export interface ImageQualityReport {
  isBlurry: boolean
  blurScore: number // 0-100 (higher is sharper)
  brightnessScore: number // 0-100
  contrastScore: number // 0-100
  isSupportedFormat: boolean
  format: string
  width: number
  height: number
  warnings: string[]
  recommendation: "good" | "blurry" | "low_contrast" | "unsupported"
}

export interface ExtractedEntities {
  productName?: string
  brand?: string
  netQuantity?: string
  mrp?: number
  mrpDisplay?: string
  mfgDate?: string
  expiryDate?: string
  batchNumber?: string
  manufacturerName?: string
  manufacturerAddress?: string
  consumerCare?: string
  countryOfOrigin?: string
  barcode?: string
}

export interface OcrScanResult {
  rawText: string
  lines: string[]
  confidence: number
  entities: ExtractedEntities
  quality: ImageQualityReport
  scannedAt: string
  imageFileName?: string
  imageDataUrl?: string
}

