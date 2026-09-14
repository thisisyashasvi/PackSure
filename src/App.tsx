import { useState, useEffect } from "react"
import { Page, ProductData, ComplaintData, User } from "./types"
import { Header } from "./components/Header"
import { Footer } from "./components/Footer"
import { HomePage } from "./pages/HomePage"
import { ScanPage } from "./pages/ScanPage"
import { ResultPage } from "./pages/ResultPage"
import { ComplaintPage } from "./pages/ComplaintPage"
import { SuccessAndTrackingPage } from "./pages/SuccessAndTrackingPage"
import { AdminDashboard } from "./pages/AdminDashboard"
import { AuthPage } from "./pages/AuthPage"
import { OfficerLoginPage } from "./pages/OfficerLoginPage"
import { OfficerDashboard } from "./pages/OfficerDashboard"
import { RepositoryPage } from "./pages/RepositoryPage"
import { DEFAULT_PRODUCT, SEED_COMPLAINTS } from "./data/sampleProducts"
import { sqlDb } from "./db/sqlEngine"
import { firebaseService } from "./firebase/firebaseService"

export default function App() {
  // Authenticated User State (Loaded from Firebase/Session storage)
  const [currentUser, setCurrentUser] = useState<User | null>(() => sqlDb.getSession())

  // App navigation state with hash router support
  const [page, setPageState] = useState<Page>(() => {
    const hash = window.location.hash.replace("#", "").replace("/", "")
    const sessionUser = sqlDb.getSession()
    const isAdmin = sessionUser?.role === "admin" || sessionUser?.email.toLowerCase() === "thisisyashasvi@gmail.com"
    const isOfficer = sessionUser?.role === "officer" || isAdmin

    if (isAdmin && (hash === "officer-login" || hash === "auth" || !hash)) {
      return "admin"
    }
    if (isOfficer && (hash === "officer-login" || hash === "auth")) {
      return "officer-dashboard"
    }

    if (["home", "scan", "result", "complaint", "track", "admin", "auth", "officer-login", "officer-dashboard", "repository"].includes(hash)) {
      return hash as Page
    }
    return "home"
  })

  // Redirect target after authentication
  const [redirectTarget, setRedirectTarget] = useState<Page>("scan")

  // Selected product for compliance analysis
  const [selectedProduct, setSelectedProduct] = useState<ProductData>(DEFAULT_PRODUCT)

  // Current complaint issue type when navigating from result
  const [complaintInitialIssue, setComplaintInitialIssue] = useState<string>("Overcharging above MRP")

  // Shared state of complaints
  const [complaintsList, setComplaintsList] = useState<ComplaintData[]>(() => sqlDb.getAllComplaints() || SEED_COMPLAINTS)

  // Most recently submitted complaint (for the success receipt)
  const [recentComplaint, setRecentComplaint] = useState<ComplaintData | null>(null)

  // Sync with Firebase Auth state and Cloud Firestore on mount
  useEffect(() => {
    const unsubscribe = firebaseService.onAuthChanged((user) => {
      if (user) {
        setCurrentUser(user)
      }
    })

    // Fetch live complaints from Cloud Firestore
    firebaseService.fetchComplaints().then((comps) => {
      if (comps && comps.length > 0) {
        setComplaintsList(comps)
      }
    }).catch(() => {})

    // Check for Google Auth redirect result if popup was blocked
    firebaseService.checkRedirectResult().then((user) => {
      if (user) {
        setCurrentUser(user)
      }
    }).catch(() => {})

    return () => unsubscribe()
  }, [])

  // Sync hash changes with state & access control
  const setPage = (newPage: Page) => {
    const sessionUser = currentUser || sqlDb.getSession()
    const isAdmin = sessionUser?.role === "admin" || sessionUser?.email.toLowerCase() === "thisisyashasvi@gmail.com"
    const isOfficer = sessionUser?.role === "officer" || isAdmin

    // If already logged in as Admin or Officer and trying to view login pages, redirect immediately
    if (newPage === "officer-login" || newPage === "auth") {
      if (isAdmin) {
        setPageState("admin")
        window.location.hash = "#admin"
        window.scrollTo({ top: 0, behavior: "smooth" })
        return
      }
      if (isOfficer) {
        setPageState("officer-dashboard")
        window.location.hash = "#officer-dashboard"
        window.scrollTo({ top: 0, behavior: "smooth" })
        return
      }
    }

    // Protected Admin Route Check (Only Root Admin)
    if (newPage === "admin") {
      if (!isAdmin) {
        setRedirectTarget("admin")
        setPageState("officer-login")
        window.location.hash = "#officer-login"
        window.scrollTo({ top: 0, behavior: "smooth" })
        return
      }
    }

    // Protected Officer Dashboard Route Check (Officer or Admin)
    if (newPage === "officer-dashboard") {
      if (!isOfficer) {
        setRedirectTarget("officer-dashboard")
        setPageState("officer-login")
        window.location.hash = "#officer-login"
        window.scrollTo({ top: 0, behavior: "smooth" })
        return
      }
    }

    setPageState(newPage)
    window.location.hash = newPage === "home" ? "" : `#${newPage}`
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "").replace("/", "")
      if (["home", "scan", "result", "complaint", "track", "admin", "auth", "officer-login", "officer-dashboard", "repository"].includes(hash)) {
        const sessionUser = currentUser || sqlDb.getSession()
        const isAdmin = sessionUser?.role === "admin" || sessionUser?.email.toLowerCase() === "thisisyashasvi@gmail.com"
        const isOfficer = sessionUser?.role === "officer" || isAdmin

        // Direct already-authenticated officers/admins away from login pages
        if (hash === "officer-login" || hash === "auth") {
          if (isAdmin) {
            setPageState("admin")
            return
          }
          if (isOfficer) {
            setPageState("officer-dashboard")
            return
          }
        }

        if (hash === "admin") {
          if (!isAdmin) {
            setRedirectTarget("admin")
            setPageState("officer-login")
            return
          }
        }

        if (hash === "officer-dashboard") {
          if (!isOfficer) {
            setRedirectTarget("officer-dashboard")
            setPageState("officer-login")
            return
          }
        }

        setPageState(hash as Page)
      }
    }
    window.addEventListener("hashchange", handleHashChange)
    return () => window.removeEventListener("hashchange", handleHashChange)
  }, [currentUser])

  // Handle Login Success and Immediate Redirection
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user)
    sqlDb.saveSession(user)

    const isAdmin = user.role === "admin" || user.email.toLowerCase() === "thisisyashasvi@gmail.com"
    const isOfficer = user.role === "officer"

    if (isAdmin) {
      setPageState("admin")
      window.location.hash = "#admin"
    } else if (isOfficer) {
      setPageState("officer-dashboard")
      window.location.hash = "#officer-dashboard"
    } else {
      setPageState(redirectTarget || "scan")
      window.location.hash = `#${redirectTarget || "scan"}`
    }
  }

  // Handle Logout
  const handleLogout = async () => {
    await firebaseService.signOut()
    setCurrentUser(null)
    setPage("home")
  }

  // Handle new complaint submission
  const handleSubmitComplaint = async (newComplaint: ComplaintData) => {
    await firebaseService.saveComplaint(newComplaint)
    setComplaintsList(sqlDb.getAllComplaints())
    setRecentComplaint(newComplaint)
  }

  // Handle joining an existing community complaint
  const handleJoinExistingComplaint = async (id: string) => {
    const updated = sqlDb.incrementCommunityReports(id)
    if (updated) {
      await firebaseService.saveComplaint(updated)
      setComplaintsList(sqlDb.getAllComplaints())
      setRecentComplaint(updated)
      setPage("track")
    }
  }

  // Handle complaint deletion (Admin action only)
  const handleDeleteComplaint = async (id: string) => {
    await firebaseService.deleteComplaint(id)
    setComplaintsList(sqlDb.getAllComplaints())
  }

  // Handle complaint status update from Officer / Admin
  const handleUpdateComplaintStatus = async (
    id: string,
    newStatus: "Under Review" | "Notice Issued" | "Resolved"
  ) => {
    const existing = sqlDb.getAllComplaints().find((c) => c.id === id)
    if (existing) {
      const updatedTimeline = existing.timeline.map((step) => {
        if (newStatus === "Notice Issued" && step.title.includes("Notice")) {
          return { ...step, completed: true, current: true, date: "Today", time: "Just now" }
        }
        if (newStatus === "Resolved" && (step.title.includes("Resolved") || step.title.includes("Resolution"))) {
          return { ...step, completed: true, current: true, date: "Today", time: "Just now" }
        }
        return step
      })

      const updatedComplaint: ComplaintData = {
        ...existing,
        status: newStatus,
        timeline: updatedTimeline,
        remarks: `Status updated to ${newStatus} by ${currentUser?.name || "Inspector Aarav Sharma"}.`,
      }

      await firebaseService.saveComplaint(updatedComplaint)
      setComplaintsList(sqlDb.getAllComplaints())
    }
  }

  // Handle navigating from result to complaint with product context
  const handleFileComplaintForProduct = (product: ProductData, initialIssue?: string) => {
    setSelectedProduct(product)
    if (initialIssue) {
      setComplaintInitialIssue(initialIssue)
    }
    setPage("complaint")
  }

  // Admin Dashboard renders in full-screen mode (Root Admin Only)
  if (page === "admin") {
    return (
      <AdminDashboard
        setPage={setPage}
        complaintsList={complaintsList}
        onUpdateComplaintStatus={handleUpdateComplaintStatus}
        onDeleteComplaint={handleDeleteComplaint}
        currentUser={currentUser}
        onLogout={handleLogout}
      />
    )
  }

  // Officer Dashboard renders in full-screen mode (Complaint Review Console)
  if (page === "officer-dashboard") {
    return (
      <OfficerDashboard
        setPage={setPage}
        complaintsList={complaintsList}
        onUpdateComplaintStatus={handleUpdateComplaintStatus}
        currentUser={currentUser}
        onLogout={handleLogout}
      />
    )
  }

  return (
    <>
      <Header
        currentPage={page}
        setPage={setPage}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {page === "home" && (
        <HomePage setPage={setPage} setSelectedProduct={setSelectedProduct} />
      )}

      {page === "scan" && (
        <ScanPage
          setPage={setPage}
          selectedProduct={selectedProduct}
          setSelectedProduct={setSelectedProduct}
          currentUser={currentUser}
        />
      )}

      {page === "result" && (
        <ResultPage
          setPage={setPage}
          product={selectedProduct}
          setSelectedProduct={setSelectedProduct}
          onFileComplaintForProduct={handleFileComplaintForProduct}
          currentUser={currentUser}
        />
      )}

      {page === "complaint" && (
        <ComplaintPage
          setPage={setPage}
          product={selectedProduct}
          initialIssue={complaintInitialIssue}
          onSubmitComplaint={handleSubmitComplaint}
          complaintsList={complaintsList}
          onJoinExistingComplaint={handleJoinExistingComplaint}
          currentUser={currentUser}
        />
      )}

      {page === "track" && (
        <SuccessAndTrackingPage
          setPage={setPage}
          recentComplaint={recentComplaint}
          complaintsList={complaintsList}
          currentUser={currentUser}
        />
      )}

      {page === "auth" && (
        <AuthPage
          setPage={setPage}
          onLoginSuccess={handleLoginSuccess}
          currentUser={currentUser}
          redirectTarget={redirectTarget}
        />
      )}

      {page === "officer-login" && (
        <OfficerLoginPage
          setPage={setPage}
          onLoginSuccess={handleLoginSuccess}
          currentUser={currentUser}
        />
      )}

      {page === "repository" && (
        <RepositoryPage
          setPage={setPage}
          currentUser={currentUser}
          setSelectedProduct={setSelectedProduct}
        />
      )}

      <Footer setPage={setPage} />
    </>
  )
}
