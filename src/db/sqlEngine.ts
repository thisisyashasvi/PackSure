import { User, ProductData, ScanRecord, ComplaintData, InspectionRecord, SqlQueryResult } from "../types"
import { DEFAULT_PRODUCT, SAMPLE_PRODUCTS, SEED_COMPLAINTS } from "../data/sampleProducts"
import { analyzeFontCompliance, generateStatutoryCitations, deriveEnforcementRecommendation } from "../utils/fontCompliance"

// Database Storage Keys
const DB_STORAGE_KEY_USERS = "packsure_sql_users"
const DB_STORAGE_KEY_PRODUCTS = "packsure_sql_products"
const DB_STORAGE_KEY_SCANS = "packsure_sql_scans"
const DB_STORAGE_KEY_COMPLAINTS = "packsure_sql_complaints"
const DB_STORAGE_KEY_INSPECTIONS = "packsure_sql_inspections"
const DB_STORAGE_KEY_SESSION = "packsure_auth_session"

// Default Admin, Officer, and Citizen Users
const DEFAULT_USERS: User[] = [
  {
    id: "usr-admin-01",
    name: "Yashasvi (System Administrator)",
    email: "thisisyashasvi@gmail.com",
    password: "YashasviProject",
    role: "admin",
    createdAt: "01 Sep 2026",
    department: "National Consumer Safety & Legal Metrology Directorate",
    phone: "9810012345",
  },
  {
    id: "usr-officer-01",
    name: "Inspector Aarav Sharma",
    email: "officer@legalmetrology.gov.in",
    password: "Officer2026",
    role: "officer",
    createdAt: "01 Sep 2026",
    badgeNumber: "LMO-DEL-2026-089",
    zone: "Delhi NCR & Northern Enforcement Division",
    department: "Directorate of Legal Metrology, Enforcement Inspection Unit",
    phone: "9818812345",
  },
  {
    id: "usr-citizen-01",
    name: "Vikas Malhotra",
    email: "vikas.malhotra@email.com",
    password: "Vikas2026",
    role: "user",
    createdAt: "02 Sep 2026",
    phone: "9876543210",
  },
  {
    id: "usr-citizen-02",
    name: "Ananya Iyer",
    email: "consumer@packsure.in",
    password: "Consumer123",
    role: "user",
    createdAt: "02 Sep 2026",
    phone: "9740112233",
  },
]

// Default Product Records to populate SQL Database
const DEFAULT_SQL_PRODUCTS: ProductData[] = Object.values(SAMPLE_PRODUCTS)

// Initial Scans Seed Data
const DEFAULT_SCANS: ScanRecord[] = [
  {
    id: "SCN-2026-0901",
    userId: "usr-citizen-01",
    userName: "Vikas Malhotra",
    barcode: "8901063012159",
    productName: "Britannia Good Day Biscuits",
    brand: "Britannia",
    mrp: 30,
    netQuantity: "100 g",
    expiryDate: "15 December 2026",
    complianceStatus: "Likely Compliant",
    complianceScore: 86,
    violations: [],
    imageFileName: "good_day_front_label.jpg",
    scannedAt: "02 Sep 2026, 04:15 PM",
  },
  {
    id: "SCN-2026-0902",
    userId: "usr-citizen-02",
    userName: "Ananya Iyer",
    barcode: "8901764012211",
    productName: "Thums Up Carbonated Beverage (750ml)",
    brand: "Thums Up",
    mrp: 40,
    netQuantity: "750 ml",
    expiryDate: "18 Dec 2026",
    complianceStatus: "Critical Warning",
    complianceScore: 42,
    violations: ["overcharging"],
    imageFileName: "thumsup_shelf_tag.jpg",
    scannedAt: "02 Sep 2026, 10:30 AM",
  },
  {
    id: "SCN-2026-0903",
    userId: "usr-citizen-01",
    userName: "Vikas Malhotra",
    barcode: "8901262010057",
    productName: "Amul Taaza Homogenised Toned Milk",
    brand: "Amul",
    mrp: 54,
    netQuantity: "1 Litre",
    expiryDate: "12 January 2026",
    complianceStatus: "Violation Detected",
    complianceScore: 38,
    violations: ["expired"],
    imageFileName: "amul_taaza_expiry_scan.jpg",
    scannedAt: "01 Sep 2026, 06:12 PM",
  },
]

// Seed Statutory Inspection Dossiers
const DEFAULT_INSPECTIONS: InspectionRecord[] = [
  {
    id: "insp-001",
    dossierNumber: "DOS-2026-DEL-0891",
    inspectorId: "usr-officer-01",
    inspectorName: "Inspector Aarav Sharma",
    inspectorBadge: "LMO-DEL-2026-089",
    zone: "Delhi NCR - Connaught Place Zone",
    barcode: "8901063012159",
    productName: "Britannia Good Day Butter Biscuits",
    brand: "Britannia",
    category: "Food & Beverages",
    mrp: 30,
    netQuantity: "100 g",
    mfgDate: "15 Jun 2026",
    expiryDate: "15 Dec 2026",
    manufacturerName: "Britannia Industries Ltd",
    manufacturerAddress: "5/1A Hungerford Street, Kolkata - 700017",
    consumerCare: "1800-425-4449 / feedback@britindia.com",
    countryOfOrigin: "India",
    complianceScore: 92,
    complianceStatus: "Likely Compliant",
    violations: [],
    evidenceImages: ["good_day_front.jpg", "good_day_back_panel.jpg", "good_day_barcode.jpg"],
    fontCompliance: analyzeFontCompliance({
      name: "Britannia Good Day Butter Biscuits",
      netQuantity: "100 g",
      mrp: 30,
      consumerCare: "1800-425-4449 / feedback@britindia.com",
    }, 2.4, 180, 5.8),
    enforcementAction: {
      actionType: "No Action (Compliant)",
      statutoryReference: "Legal Metrology Rules 2011",
      actionDescription: "All 10 mandatory declarations verified. Font heights comply with Rule 7 Table 1.",
      urgency: "Informational",
    },
    statutoryCitations: [],
    inspectedAt: "02 Sep 2026, 11:30 AM",
    status: "Verified Compliant",
    merchantName: "Modern Bazaar Supermarket",
    merchantAddress: "Connaught Place, Block B, New Delhi",
    inspectorNotes: "Conducted routine retail spot check. Verified batch lot 100g pack.",
  },
  {
    id: "insp-002",
    dossierNumber: "DOS-2026-DEL-0892",
    inspectorId: "usr-officer-01",
    inspectorName: "Inspector Aarav Sharma",
    inspectorBadge: "LMO-DEL-2026-089",
    zone: "Delhi NCR - South Extension Zone",
    barcode: "8901764012211",
    productName: "Thums Up Carbonated Beverage (750ml)",
    brand: "Thums Up",
    category: "Food & Beverages",
    mrp: 40,
    sellingPrice: 48,
    netQuantity: "750 ml",
    mfgDate: "10 Jul 2026",
    expiryDate: "18 Dec 2026",
    manufacturerName: "Hindustan Coca-Cola Beverages Pvt Ltd",
    manufacturerAddress: "B-91 Mayapuri Industrial Area, New Delhi",
    consumerCare: "1800-208-2653 / indiahelpline@coca-cola.com",
    countryOfOrigin: "India",
    complianceScore: 42,
    complianceStatus: "Critical Warning",
    violations: ["overcharging"],
    evidenceImages: ["thumsup_chiller_shelf.jpg", "receipt_overcharging.jpg"],
    fontCompliance: analyzeFontCompliance({
      name: "Thums Up Carbonated Beverage (750ml)",
      netQuantity: "750 ml",
      mrp: 40,
      sellingPrice: 48,
    }, 4.2, 280, 5.1),
    enforcementAction: {
      actionType: "Notice Section 36",
      statutoryReference: "Section 36(2), Legal Metrology Act, 2009 & Rule 18(2)",
      recommendedPenaltyInr: 25000,
      actionDescription: "Retailer charging ₹48 against printed MRP ₹40 (+₹8 cooling charge surcharge). Notice issued.",
      urgency: "High",
    },
    statutoryCitations: [],
    inspectedAt: "02 Sep 2026, 02:15 PM",
    status: "Notice Issued",
    merchantName: "Gupta Cold Drinks & General Store",
    merchantAddress: "Shop 14, Main Market, South Extension Part 1, New Delhi",
    inspectorNotes: "Conducted decoy purchase. Overcharging confirmed by cash memo.",
  },
  {
    id: "insp-003",
    dossierNumber: "DOS-2026-DEL-0893",
    inspectorId: "usr-officer-01",
    inspectorName: "Inspector Aarav Sharma",
    inspectorBadge: "LMO-DEL-2026-089",
    zone: "Delhi NCR - Karol Bagh Zone",
    barcode: "8901425001243",
    productName: "Haldiram's Bhujia Sev (400g)",
    brand: "Haldiram's",
    category: "Snacks & Confectionery",
    mrp: 95,
    netQuantity: "400 g",
    mfgDate: "01 Aug 2026",
    expiryDate: "01 Feb 2027",
    manufacturerName: "Haldiram Snacks Pvt Ltd",
    manufacturerAddress: "B-1/H-8 Mohan Co-op Industrial Estate, Mathura Road, New Delhi",
    consumerCare: "011-45204100 / customercare@haldirams.com",
    countryOfOrigin: "India",
    complianceScore: 58,
    complianceStatus: "Violation Detected",
    violations: ["font_size_violation"],
    evidenceImages: ["haldirams_pdp_crop.jpg", "micrometer_font_measure.jpg"],
    fontCompliance: analyzeFontCompliance({
      name: "Haldiram's Bhujia Sev (400g)",
      netQuantity: "400 g",
      mrp: 95,
      violations: ["font_size_violation"],
    }, 1.6, 220, 4.8),
    enforcementAction: {
      actionType: "Compounding Section 48",
      statutoryReference: "Rule 7 & Rule 9 Table 1, LMPC Rules 2011",
      recommendedPenaltyInr: 25000,
      actionDescription: "Declared Net Quantity font height is 1.6 mm against mandatory 4.0 mm for 400g category. Section 36(1) show-cause notice issued.",
      urgency: "High",
    },
    statutoryCitations: [],
    inspectedAt: "01 Sep 2026, 04:45 PM",
    status: "Notice Issued",
    merchantName: "Aggarwal Sweets & Provisions",
    merchantAddress: "Karol Bagh Metro Station Road, New Delhi",
    inspectorNotes: "Optical micrometer measurement verified undersized net quantity font.",
  },
  {
    id: "insp-004",
    dossierNumber: "DOS-2026-MUM-0114",
    inspectorId: "usr-officer-01",
    inspectorName: "Inspector Aarav Sharma",
    inspectorBadge: "LMO-DEL-2026-089",
    zone: "Western Directorate - Mumbai Suburban",
    barcode: "8906014640198",
    productName: "Fortune Sunlite Refined Sunflower Oil",
    brand: "Fortune",
    category: "Edible Oils & Ghee",
    mrp: 145,
    netQuantity: "1 ltrs",
    mfgDate: "20 May 2026",
    expiryDate: "20 May 2027",
    manufacturerName: "Adani Wilmar Limited",
    manufacturerAddress: "Fortune House, Near Navrangpura Railway Crossing, Ahmedabad - 380009",
    consumerCare: "1800-233-9999 / customercare@adaniwilmar.in",
    countryOfOrigin: "India",
    complianceScore: 68,
    complianceStatus: "Violation Detected",
    violations: ["non_standard_units"],
    evidenceImages: ["fortune_oil_pouch.jpg"],
    fontCompliance: analyzeFontCompliance({
      name: "Fortune Sunlite Refined Sunflower Oil",
      netQuantity: "1 ltrs",
      mrp: 145,
      rawOcrText: "Net Quantity: 1 ltrs. MRP Rs. 145.00",
      violations: ["non_standard_units"],
    }, 4.2, 310, 5.4),
    enforcementAction: {
      actionType: "Advisory / Warning",
      statutoryReference: "Rule 11 & Second Schedule, LMPC Rules 2011",
      recommendedPenaltyInr: 10000,
      actionDescription: "Use of non-standard volumetric abbreviation 'ltrs' instead of standard symbol 'l' or 'L'. Rectification directive issued.",
      urgency: "Standard",
    },
    statutoryCitations: [],
    inspectedAt: "30 Aug 2026, 03:20 PM",
    status: "Under Inspection",
    merchantName: "D-Mart Retail Hypermarket",
    merchantAddress: "Andheri East, Mumbai",
    inspectorNotes: "Manufacturer notified for packaging artwork amendment.",
  },
]

class SqlDatabaseManager {
  private users: User[] = []
  private products: ProductData[] = []
  private scans: ScanRecord[] = []
  private complaints: ComplaintData[] = []
  private inspections: InspectionRecord[] = []

  constructor() {
    this.initDatabase()
  }

  // Initialize and load tables from localStorage or seed with defaults
  public initDatabase(): void {
    try {
      const storedUsers = localStorage.getItem(DB_STORAGE_KEY_USERS)
      this.users = storedUsers ? JSON.parse(storedUsers) : DEFAULT_USERS
      // Ensure admin exists
      if (!this.users.some((u) => u.email === "thisisyashasvi@gmail.com")) {
        this.users.unshift(DEFAULT_USERS[0])
      }
      // Ensure officer exists
      if (!this.users.some((u) => u.email === "officer@legalmetrology.gov.in")) {
        this.users.push(DEFAULT_USERS[1])
      }
      this.persistUsers()

      const storedProducts = localStorage.getItem(DB_STORAGE_KEY_PRODUCTS)
      this.products = storedProducts ? JSON.parse(storedProducts) : DEFAULT_SQL_PRODUCTS
      this.persistProducts()

      const storedScans = localStorage.getItem(DB_STORAGE_KEY_SCANS)
      this.scans = storedScans ? JSON.parse(storedScans) : DEFAULT_SCANS
      this.persistScans()

      const storedComplaints = localStorage.getItem(DB_STORAGE_KEY_COMPLAINTS)
      this.complaints = storedComplaints ? JSON.parse(storedComplaints) : SEED_COMPLAINTS
      this.persistComplaints()

      const storedInspections = localStorage.getItem(DB_STORAGE_KEY_INSPECTIONS)
      this.inspections = storedInspections ? JSON.parse(storedInspections) : DEFAULT_INSPECTIONS
      this.persistInspections()
    } catch {
      this.users = [...DEFAULT_USERS]
      this.products = [...DEFAULT_SQL_PRODUCTS]
      this.scans = [...DEFAULT_SCANS]
      this.complaints = [...SEED_COMPLAINTS]
      this.inspections = [...DEFAULT_INSPECTIONS]
    }
  }

  private persistInspections(): void {
    try {
      localStorage.setItem(DB_STORAGE_KEY_INSPECTIONS, JSON.stringify(this.inspections))
    } catch {}
  }

  private persistUsers(): void {
    try {
      localStorage.setItem(DB_STORAGE_KEY_USERS, JSON.stringify(this.users))
    } catch {}
  }

  private persistProducts(): void {
    try {
      localStorage.setItem(DB_STORAGE_KEY_PRODUCTS, JSON.stringify(this.products))
    } catch {}
  }

  private persistScans(): void {
    try {
      localStorage.setItem(DB_STORAGE_KEY_SCANS, JSON.stringify(this.scans))
    } catch {}
  }

  private persistComplaints(): void {
    try {
      localStorage.setItem(DB_STORAGE_KEY_COMPLAINTS, JSON.stringify(this.complaints))
    } catch {}
  }

  // Barcode Lookup: Query products table by barcode
  public findProductByBarcode(barcode: string): ProductData | null {
    if (!barcode) return null
    const cleanBarcode = barcode.trim()
    const found = this.products.find((p) => p.barcode === cleanBarcode)
    return found ? { ...found } : null
  }

  // Add or update product in catalog
  public saveProduct(product: ProductData): void {
    const idx = this.products.findIndex((p) => p.barcode === product.barcode)
    if (idx >= 0) {
      this.products[idx] = { ...product }
    } else {
      this.products.push({ ...product })
    }
    this.persistProducts()
  }

  public getAllProducts(): ProductData[] {
    return [...this.products]
  }

  // Scan Persistence
  public recordScan(scan: ScanRecord): void {
    this.scans.unshift(scan)
    this.persistScans()
  }

  public getAllScans(): ScanRecord[] {
    return [...this.scans]
  }

  // Complaints Persistence
  public saveComplaint(complaint: ComplaintData): void {
    const idx = this.complaints.findIndex((c) => c.id === complaint.id)
    if (idx >= 0) {
      this.complaints[idx] = complaint
    } else {
      this.complaints.unshift(complaint)
    }
    this.persistComplaints()
  }

  public deleteComplaint(id: string): boolean {
    const initialLen = this.complaints.length
    this.complaints = this.complaints.filter((c) => c.id !== id)
    this.persistComplaints()
    return this.complaints.length < initialLen
  }

  public incrementCommunityReports(id: string): ComplaintData | null {
    const complaint = this.complaints.find((c) => c.id === id)
    if (complaint) {
      complaint.communityReports = (complaint.communityReports || 1) + 1
      complaint.duplicateStatus = "Joined Community Report"
      this.persistComplaints()
      return complaint
    }
    return null
  }

  public getAllComplaints(): ComplaintData[] {
    return [...this.complaints]
  }

  // Inspection Dossiers Persistence
  public saveInspection(inspection: InspectionRecord): void {
    const idx = this.inspections.findIndex((i) => i.id === inspection.id || i.dossierNumber === inspection.dossierNumber)
    if (idx >= 0) {
      this.inspections[idx] = inspection
    } else {
      this.inspections.unshift(inspection)
    }
    this.persistInspections()
  }

  public deleteInspection(id: string): boolean {
    const initialLen = this.inspections.length
    this.inspections = this.inspections.filter((i) => i.id !== id && i.dossierNumber !== id)
    this.persistInspections()
    return this.inspections.length < initialLen
  }

  public getAllInspections(): InspectionRecord[] {
    return [...this.inspections]
  }

  public getInspectionById(id: string): InspectionRecord | undefined {
    return this.inspections.find((i) => i.id === id || i.dossierNumber === id)
  }

  // User Authentication & Registration
  public login(email: string, password: string): { user: User | null; error?: string } {
    const cleanEmail = email.trim().toLowerCase()
    const cleanPassword = password.trim()

    // 1. Root Administrator Check (Full Admin Rights)
    if (cleanEmail === "thisisyashasvi@gmail.com" && cleanPassword === "YashasviProject") {
      let admin = this.users.find((u) => u.email.toLowerCase() === "thisisyashasvi@gmail.com")
      if (!admin) {
        admin = DEFAULT_USERS[0]
        this.users.unshift(admin)
        this.persistUsers()
      }
      return { user: { ...admin, role: "admin" } }
    }

    // 2. Legal Metrology Officer Check (Complaint Reviewer Rights - No Destructive Admin Rights)
    if (
      (cleanEmail === "officer@legalmetrology.gov.in" || cleanEmail.includes("officer") || cleanEmail.includes(".gov.in")) &&
      (cleanPassword === "Officer2026" || cleanPassword === "YashasviProject")
    ) {
      let officer = this.users.find((u) => u.email.toLowerCase() === cleanEmail)
      if (!officer) {
        officer = {
          ...DEFAULT_USERS[1],
          email: cleanEmail,
        }
      }
      return { user: { ...officer, role: "officer" } }
    }

    // 3. Standard User Check
    const matchedUser = this.users.find(
      (u) => u.email.toLowerCase() === cleanEmail && u.password === cleanPassword
    )

    if (matchedUser) {
      return { user: matchedUser }
    }

    return { user: null, error: "Invalid email or password. Please check your credentials." }
  }

  public register(userData: Omit<User, "id" | "createdAt">): { user: User | null; error?: string } {
    const cleanEmail = userData.email.trim().toLowerCase()
    if (this.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return { user: null, error: "An account with this email already exists." }
    }

    const isSpecialAdmin = cleanEmail === "thisisyashasvi@gmail.com"

    const newUser: User = {
      ...userData,
      id: `usr-${Date.now()}`,
      email: cleanEmail,
      role: isSpecialAdmin ? "admin" : (userData.role || "user"),
      createdAt: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    }

    this.users.push(newUser)
    this.persistUsers()
    return { user: newUser }
  }

  public getAllUsers(): User[] {
    return [...this.users]
  }

  // Session Storage Management
  public saveSession(user: User | null): void {
    try {
      if (user) {
        localStorage.setItem(DB_STORAGE_KEY_SESSION, JSON.stringify(user))
      } else {
        localStorage.removeItem(DB_STORAGE_KEY_SESSION)
      }
    } catch {}
  }

  public getSession(): User | null {
    try {
      const stored = localStorage.getItem(DB_STORAGE_KEY_SESSION)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  }

  // SQL Query Processor for Admin SQL Explorer
  public executeSql(sqlQuery: string): SqlQueryResult {
    const startTime = performance.now()
    const query = sqlQuery.trim()

    try {
      if (!query) {
        return { columns: [], rows: [], rowCount: 0, executionTimeMs: 0 }
      }

      const upper = query.toUpperCase()

      // SHOW TABLES
      if (upper.startsWith("SHOW TABLES")) {
        return {
          columns: ["table_name", "record_count", "description"],
          rows: [
            { table_name: "users", record_count: this.users.length, description: "Registered users & credentials" },
            { table_name: "products", record_count: this.products.length, description: "Master product & barcode catalog" },
            { table_name: "scans", record_count: this.scans.length, description: "Audit trail of scanned labels & files" },
            { table_name: "inspections", record_count: this.inspections.length, description: "Statutory Legal Metrology inspection dossiers" },
            { table_name: "complaints", record_count: this.complaints.length, description: "Consumer grievance dossiers" },
          ],
          rowCount: 5,
          executionTimeMs: Math.round(performance.now() - startTime),
        }
      }

      // SELECT FROM INSPECTIONS
      if (upper.includes("FROM INSPECTIONS")) {
        const rows = this.inspections.map((i) => ({
          dossier: i.dossierNumber,
          barcode: i.barcode,
          product_name: i.productName,
          status: i.status,
          score: `${i.complianceScore}/100`,
          inspector: i.inspectorName,
          inspected_at: i.inspectedAt,
        }))
        return {
          columns: ["dossier", "barcode", "product_name", "status", "score", "inspector", "inspected_at"],
          rows,
          rowCount: rows.length,
          executionTimeMs: Math.round(performance.now() - startTime),
        }
      }

      // SELECT FROM USERS
      if (upper.includes("FROM USERS")) {
        const rows = this.users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          created_at: u.createdAt,
          department: u.department || "N/A",
        }))
        return {
          columns: ["id", "name", "email", "role", "created_at", "department"],
          rows,
          rowCount: rows.length,
          executionTimeMs: Math.round(performance.now() - startTime),
        }
      }

      // SELECT FROM PRODUCTS
      if (upper.includes("FROM PRODUCTS")) {
        const rows = this.products.map((p) => ({
          id: p.id,
          barcode: p.barcode,
          name: p.name,
          brand: p.brand,
          mrp: p.mrp ? `₹${p.mrp}` : "Missing",
          net_quantity: p.netQuantity || "Missing",
          expiry_date: p.expiryDate || "Missing",
          compliance_status: p.complianceStatus,
          score: `${p.complianceScore}/100`,
        }))
        return {
          columns: ["id", "barcode", "name", "brand", "mrp", "net_quantity", "expiry_date", "compliance_status", "score"],
          rows,
          rowCount: rows.length,
          executionTimeMs: Math.round(performance.now() - startTime),
        }
      }

      // SELECT FROM SCANS
      if (upper.includes("FROM SCANS")) {
        const rows = this.scans.map((s) => ({
          id: s.id,
          barcode: s.barcode,
          product_name: s.productName,
          user_name: s.userName || "Guest Consumer",
          image_file: s.imageFileName,
          compliance_status: s.complianceStatus,
          score: `${s.complianceScore}/100`,
          scanned_at: s.scannedAt,
        }))
        return {
          columns: ["id", "barcode", "product_name", "user_name", "image_file", "compliance_status", "score", "scanned_at"],
          rows,
          rowCount: rows.length,
          executionTimeMs: Math.round(performance.now() - startTime),
        }
      }

      // SELECT FROM COMPLAINTS
      if (upper.includes("FROM COMPLAINTS")) {
        const rows = this.complaints.map((c) => ({
          id: c.id,
          barcode: c.barcode,
          product_name: c.productName,
          issue_type: c.issueType,
          shop_name: c.shopName,
          status: c.status,
          submitted_at: c.submittedAt,
        }))
        return {
          columns: ["id", "barcode", "product_name", "issue_type", "shop_name", "status", "submitted_at"],
          rows,
          rowCount: rows.length,
          executionTimeMs: Math.round(performance.now() - startTime),
        }
      }

      // General fallback query response
      return {
        columns: ["query", "status", "rows_affected"],
        rows: [{ query, status: "SUCCESS", rows_affected: 1 }],
        rowCount: 1,
        executionTimeMs: Math.round(performance.now() - startTime),
      }
    } catch (err: any) {
      return {
        columns: ["error"],
        rows: [],
        rowCount: 0,
        executionTimeMs: Math.round(performance.now() - startTime),
        error: err.message || "SQL Execution Error",
      }
    }
  }
}

export const sqlDb = new SqlDatabaseManager()
