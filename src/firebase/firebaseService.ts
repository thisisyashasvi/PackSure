import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  User as FirebaseUser,
} from "firebase/auth"
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore"
import { auth, googleProvider, db } from "./config"
import { User, ProductData, ScanRecord, ComplaintData } from "../types"
import { sqlDb } from "../db/sqlEngine"

export class FirebaseService {
  private recaptchaVerifier: RecaptchaVerifier | null = null

  // Map Firebase User to App User Model
  public mapFirebaseUserToUser(fbUser: FirebaseUser, extraData?: Partial<User>): User {
    const email = fbUser.email?.toLowerCase() || ""
    const phone = fbUser.phoneNumber || extraData?.phone || ""
    const isAdmin = email === "thisisyashasvi@gmail.com"
    const isOfficer = email === "officer@legalmetrology.gov.in" || email.includes(".gov.in")

    return {
      id: fbUser.uid,
      name: fbUser.displayName || extraData?.name || (email ? email.split("@")[0] : (phone ? `User (${phone.slice(-4)})` : "Citizen User")),
      email: email || (phone ? `${phone.replace("+", "")}@phone.packsure.in` : "citizen@packsure.in"),
      phone: phone,
      password: "••••••••",
      role: isAdmin ? "admin" : isOfficer ? "officer" : (extraData?.role || "user"),
      createdAt: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      department: isAdmin
        ? "National Consumer Safety & Legal Metrology Directorate"
        : isOfficer
        ? "Directorate of Legal Metrology, Enforcement Unit"
        : undefined,
      badgeNumber: isOfficer ? "LMO-DEL-2026-089" : undefined,
    }
  }

  // 1. Sign In with Email & Password
  public async signInWithEmail(email: string, pass: string): Promise<User> {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass)
    const fbUser = userCredential.user
    
    let roleData: Partial<User> = {}
    try {
      const userDoc = await getDoc(doc(db, "users", fbUser.uid))
      if (userDoc.exists()) {
        roleData = userDoc.data() as Partial<User>
      }
    } catch {}

    const user = this.mapFirebaseUserToUser(fbUser, roleData)
    sqlDb.saveSession(user)
    return user
  }

  // 2. Sign Up with Email & Password
  public async signUpWithEmail(email: string, pass: string, name: string): Promise<User> {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass)
    const fbUser = userCredential.user
    const user = this.mapFirebaseUserToUser(fbUser, { name, role: "user" })

    try {
      await setDoc(doc(db, "users", fbUser.uid), {
        id: fbUser.uid,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      })
    } catch {}

    sqlDb.register({ name, email, password: pass, role: "user" })
    sqlDb.saveSession(user)
    return user
  }

  // 3. Genuine Google Sign-In (Opens Google OAuth Window / Popup)
  public async signInWithGoogle(): Promise<User> {
    try {
      // Triggers the official Google Sign-In popup
      const result = await signInWithPopup(auth, googleProvider)
      const fbUser = result.user
      const user = this.mapFirebaseUserToUser(fbUser)

      // Sync user record to Cloud Firestore
      try {
        await setDoc(
          doc(db, "users", fbUser.uid),
          {
            id: fbUser.uid,
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
            lastLogin: new Date().toISOString(),
          },
          { merge: true }
        )
      } catch {}

      sqlDb.saveSession(user)
      return user
    } catch (err: any) {
      if (err.code === "auth/popup-blocked") {
        // If popup is blocked by the browser, fallback to full page redirect
        await signInWithRedirect(auth, googleProvider)
        throw new Error("Redirecting to Google Sign-In page...")
      }
      if (err.code === "auth/popup-closed-by-user") {
        throw new Error("Google Sign-in window was closed before completing sign in.")
      }
      if (err.code === "auth/unauthorized-domain") {
        throw new Error("The current domain is not authorized in Firebase Console (Authentication > Settings > Authorized domains). Add 'localhost' to Authorized Domains.")
      }
      throw new Error(err.message || "Failed to sign in with Google.")
    }
  }

  // 4. Check for Google Redirect Result (if popup was blocked)
  public async checkRedirectResult(): Promise<User | null> {
    try {
      const result = await getRedirectResult(auth)
      if (result && result.user) {
        const user = this.mapFirebaseUserToUser(result.user)
        sqlDb.saveSession(user)
        return user
      }
    } catch {}
    return null
  }

  // 5. Setup Recaptcha for Phone Auth
  public setupRecaptcha(containerId: string): RecaptchaVerifier {
    if (this.recaptchaVerifier) {
      try {
        this.recaptchaVerifier.clear()
      } catch {}
    }
    this.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: "invisible",
      callback: () => {},
      "expired-callback": () => {},
    })
    return this.recaptchaVerifier
  }

  // 6. Send Phone Authentication OTP
  public async sendPhoneOtp(
    phoneNumber: string,
    verifier?: RecaptchaVerifier
  ): Promise<ConfirmationResult> {
    const formattedPhone = phoneNumber.startsWith("+") ? phoneNumber : `+91${phoneNumber.trim()}`
    const appVerifier = verifier || this.recaptchaVerifier || this.setupRecaptcha("recaptcha-container")
    return await signInWithPhoneNumber(auth, formattedPhone, appVerifier)
  }

  // 7. Verify Phone OTP
  public async verifyPhoneOtp(
    confirmationResult: ConfirmationResult,
    otpCode: string,
    phoneNumber: string,
    name?: string
  ): Promise<User> {
    const userCredential = await confirmationResult.confirm(otpCode)
    const fbUser = userCredential.user
    const user = this.mapFirebaseUserToUser(fbUser, { name, phone: phoneNumber, role: "user" })

    try {
      await setDoc(
        doc(db, "users", fbUser.uid),
        {
          id: fbUser.uid,
          name: user.name,
          phone: phoneNumber,
          role: "user",
          createdAt: user.createdAt,
        },
        { merge: true }
      )
    } catch {}

    sqlDb.saveSession(user)
    return user
  }

  // 8. Sign Out
  public async signOut(): Promise<void> {
    try {
      await signOut(auth)
    } catch {}
    sqlDb.saveSession(null)
  }

  // 9. Auth State Listener
  public onAuthChanged(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        let roleData: Partial<User> = {}
        try {
          const userDoc = await getDoc(doc(db, "users", fbUser.uid))
          if (userDoc.exists()) {
            roleData = userDoc.data() as Partial<User>
          }
        } catch {}

        const user = this.mapFirebaseUserToUser(fbUser, roleData)
        callback(user)
      } else {
        callback(sqlDb.getSession())
      }
    })
  }

  // ---------------- FIRESTORE COLLECTIONS ---------------- //

  public async saveProduct(product: ProductData): Promise<void> {
    sqlDb.saveProduct(product)
    try {
      await setDoc(doc(db, "products", product.barcode), product, { merge: true })
    } catch {}
  }

  public async fetchProducts(): Promise<ProductData[]> {
    try {
      const snap = await getDocs(collection(db, "products"))
      if (!snap.empty) {
        const prods: ProductData[] = []
        snap.forEach((d) => prods.push(d.data() as ProductData))
        return prods
      }
    } catch {}
    return sqlDb.getAllProducts()
  }

  public async saveComplaint(complaint: ComplaintData): Promise<void> {
    sqlDb.saveComplaint(complaint)
    try {
      await setDoc(doc(db, "complaints", complaint.id), complaint, { merge: true })
    } catch {}
  }

  public async deleteComplaint(id: string): Promise<void> {
    sqlDb.deleteComplaint(id)
    try {
      await deleteDoc(doc(db, "complaints", id))
    } catch {}
  }

  public async fetchComplaints(): Promise<ComplaintData[]> {
    try {
      const q = query(collection(db, "complaints"), orderBy("submittedAt", "desc"))
      const snap = await getDocs(q)
      if (!snap.empty) {
        const comps: ComplaintData[] = []
        snap.forEach((d) => comps.push(d.data() as ComplaintData))
        return comps
      }
    } catch {}
    return sqlDb.getAllComplaints()
  }

  public async recordScan(scan: ScanRecord): Promise<void> {
    sqlDb.recordScan(scan)
    try {
      await setDoc(doc(db, "scans", scan.id), scan)
    } catch {}
  }

  public async fetchScans(): Promise<ScanRecord[]> {
    try {
      const snap = await getDocs(collection(db, "scans"))
      if (!snap.empty) {
        const scans: ScanRecord[] = []
        snap.forEach((d) => scans.push(d.data() as ScanRecord))
        return scans
      }
    } catch {}
    return sqlDb.getAllScans()
  }
}

export const firebaseService = new FirebaseService()
