import React, { useState, useEffect } from "react"
import { Page, User } from "../types"
import { Icon, Logo, Button, Badge } from "../components/Icons"
import { sqlDb } from "../db/sqlEngine"

interface OfficerLoginPageProps {
  setPage: (page: Page) => void
  onLoginSuccess: (user: User) => void
  currentUser: User | null
}

export const OfficerLoginPage: React.FC<OfficerLoginPageProps> = ({
  setPage,
  onLoginSuccess,
  currentUser,
}) => {
  const [officerEmail, setOfficerEmail] = useState<string>("officer@legalmetrology.gov.in")
  const [passcode, setPasscode] = useState<string>("Officer2026")
  const [badgeId, setBadgeId] = useState<string>("LMO-DEL-2026-089")
  const [jurisdictionZone, setJurisdictionZone] = useState<string>("Delhi NCR & Northern Enforcement Division")
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Redirect immediately if already logged in as Admin or Officer
  useEffect(() => {
    const sessionUser = currentUser || sqlDb.getSession()
    if (sessionUser) {
      if (sessionUser.role === "admin" || sessionUser.email.toLowerCase() === "thisisyashasvi@gmail.com") {
        setPage("admin")
      } else if (sessionUser.role === "officer") {
        setPage("officer-dashboard")
      }
    }
  }, [currentUser])

  const handleOfficerLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)
    setIsLoading(true)

    const result = sqlDb.login(officerEmail, passcode)

    if (result.user) {
      const isRootAdmin = result.user.email.toLowerCase() === "thisisyashasvi@gmail.com" || result.user.role === "admin"
      const officerUser: User = {
        ...result.user,
        role: isRootAdmin ? "admin" : "officer",
        badgeNumber: badgeId,
        zone: jurisdictionZone,
        department: `Directorate of Legal Metrology, ${jurisdictionZone}`,
      }
      setIsLoading(false)
      onLoginSuccess(officerUser)

      if (isRootAdmin) {
        setPage("admin")
      } else {
        setPage("officer-dashboard")
      }
    } else {
      setIsLoading(false)
      setErrorMessage("Access Denied: Officer credentials not recognized in Legal Metrology Officer registry.")
    }
  }

  const handleQuickOfficerFill = () => {
    setOfficerEmail("officer@legalmetrology.gov.in")
    setPasscode("Officer2026")
    setBadgeId("LMO-DEL-2026-089")
    setJurisdictionZone("Delhi NCR & Northern Enforcement Division")
    setErrorMessage(null)
  }

  const handleQuickAdminFill = () => {
    setOfficerEmail("thisisyashasvi@gmail.com")
    setPasscode("YashasviProject")
    setBadgeId("ADM-ROOT-2026")
    setJurisdictionZone("National Directorate, New Delhi")
    setErrorMessage(null)
  }

  return (
    <main className="page-shell" style={{ maxWidth: "620px", paddingTop: "40px" }}>
      {/* Breadcrumb */}
      <div className="crumb" style={{ justifyContent: "center" }}>
        <button className="plain" onClick={() => setPage("home")}>Home</button>
        <Icon name="chevron" size={14} />
        <span>Legal Metrology Officer Portal</span>
      </div>

      {/* Official Header */}
      <div style={{ textAlign: "center", marginTop: "24px" }}>
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: "#102b4e",
            color: "#7ce5cf",
            display: "grid",
            placeItems: "center",
            margin: "0 auto 12px",
            border: "2px solid #2d557f",
            boxShadow: "0 4px 12px rgba(16, 43, 78, 0.15)",
          }}
        >
          <Icon name="shield" size={28} />
        </div>

        <div style={{ fontSize: "11px", letterSpacing: "1.5px", fontWeight: 700, color: "#0f8e7d", textTransform: "uppercase" }}>
          GOVERNMENT OF INDIA · DEPARTMENT OF CONSUMER AFFAIRS
        </div>
        <h1 style={{ fontSize: "30px", color: "#102b4e", marginTop: "6px" }}>
          Legal Metrology Officer Portal
        </h1>
        <p style={{ color: "#647589", fontSize: "14px", marginTop: "6px", maxWidth: "480px", margin: "6px auto 0" }}>
          Enforcement console for reviewing consumer grievances, inspecting packaging violations, and issuing Section 36 notices.
        </p>
      </div>

      {/* Officer Login Box */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #c9d8e2",
          borderRadius: "14px",
          padding: "32px",
          marginTop: "26px",
          boxShadow: "0 8px 30px rgba(16, 43, 78, 0.08)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "4px",
            background: "linear-gradient(90deg, #102b4e, #0f8e7d)",
          }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Badge type="green">OFFICER AUTHENTICATION</Badge>
            <span style={{ fontSize: "11px", color: "#748698" }}>LMPC 2011 Enforcement</span>
          </div>
        </div>

        {/* Quick Fill Options */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "18px" }}>
          <button
            type="button"
            onClick={handleQuickOfficerFill}
            style={{
              background: "#f0f7f6",
              border: "1px solid #c2e2da",
              borderRadius: "8px",
              padding: "8px 10px",
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#102b4e" }}>
              ⚖ Metrology Officer (Inspector Sharma)
            </div>
            <div style={{ fontSize: "10px", color: "#617789" }}>
              officer@legalmetrology.gov.in
            </div>
          </button>

          <button
            type="button"
            onClick={handleQuickAdminFill}
            style={{
              background: "#f5f8fa",
              border: "1px solid #d4dfe4",
              borderRadius: "8px",
              padding: "8px 10px",
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#102b4e" }}>
              ★ System Administrator (Yashasvi)
            </div>
            <div style={{ fontSize: "10px", color: "#617789" }}>
              thisisyashasvi@gmail.com
            </div>
          </button>
        </div>

        {/* Feedback Messages */}
        {errorMessage && (
          <div
            style={{
              background: "#fdf0ef",
              border: "1px solid #f9d5d4",
              borderRadius: "8px",
              padding: "12px 16px",
              color: "#a53c40",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "18px",
            }}
          >
            <Icon name="alert" size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div
            style={{
              background: "#e8f7f3",
              border: "1px solid #bfe8de",
              borderRadius: "8px",
              padding: "12px 16px",
              color: "#0f8e7d",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "18px",
            }}
          >
            <Icon name="check" size={16} />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleOfficerLogin}>
          {/* Jurisdiction Zone */}
          <label htmlFor="jurisdiction-select" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#344b62" }}>
            Enforcement Jurisdiction / Regional Directorate
          </label>
          <select
            id="jurisdiction-select"
            value={jurisdictionZone}
            onChange={(e) => setJurisdictionZone(e.target.value)}
            style={{
              width: "100%",
              border: "1px solid #cddae1",
              borderRadius: "7px",
              padding: "11px",
              margin: "5px 0 14px",
              fontSize: "13px",
              background: "#f9fcfe",
            }}
          >
            <option value="Delhi NCR & Northern Enforcement Division">Delhi NCR &amp; Northern Enforcement Division</option>
            <option value="Mumbai Western Enforcement Division">Mumbai Western Enforcement Division</option>
            <option value="Bengaluru South Regional Directorate">Bengaluru South Regional Directorate</option>
            <option value="Kolkata Eastern Regional Cell">Kolkata Eastern Regional Cell</option>
            <option value="Chennai Southern Regional Directorate">Chennai Southern Regional Directorate</option>
          </select>

          {/* Officer Email Address */}
          <label htmlFor="officer-email" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#344b62" }}>
            Designated Officer Email
          </label>
          <input
            id="officer-email"
            type="email"
            placeholder="officer@legalmetrology.gov.in"
            value={officerEmail}
            onChange={(e) => setOfficerEmail(e.target.value)}
            required
            style={{
              width: "100%",
              border: "1px solid #cddae1",
              borderRadius: "7px",
              padding: "12px",
              margin: "5px 0 14px",
              fontSize: "13px",
            }}
          />

          {/* Security Passcode */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "10px" }}>
            <div>
              <label htmlFor="officer-pwd" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#344b62" }}>
                Security Passcode / Password
              </label>
              <input
                id="officer-pwd"
                type="password"
                placeholder="Enter officer passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                required
                style={{
                  width: "100%",
                  border: "1px solid #cddae1",
                  borderRadius: "7px",
                  padding: "12px",
                  margin: "5px 0 16px",
                  fontSize: "13px",
                }}
              />
            </div>

            <div>
              <label htmlFor="badge-id" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#344b62" }}>
                Officer Badge / Gov PIN
              </label>
              <input
                id="badge-id"
                type="text"
                placeholder="e.g. LMO-DEL-2026-089"
                value={badgeId}
                onChange={(e) => setBadgeId(e.target.value)}
                style={{
                  width: "100%",
                  border: "1px solid #cddae1",
                  borderRadius: "7px",
                  padding: "12px",
                  margin: "5px 0 16px",
                  fontSize: "13px",
                  fontFamily: "'DM Mono', monospace",
                  background: "#fdfdfd",
                }}
              />
            </div>
          </div>

          <Button type="submit" className="wide" disabled={isLoading} style={{ background: "#102b4e", padding: "14px" }}>
            {isLoading ? (
              <>
                <Icon name="refresh" size={16} className="animate-spin" /> Verifying Enforcement Credentials...
              </>
            ) : (
              <>
                <Icon name="shield" size={16} /> Access Review Console <Icon name="arrow" size={16} />
              </>
            )}
          </Button>
        </form>

        {/* Security / Legal Notice */}
        <div
          style={{
            marginTop: "20px",
            padding: "12px",
            background: "#f4f8fa",
            borderRadius: "8px",
            border: "1px solid #d9e3e9",
            fontSize: "11px",
            color: "#67798b",
            display: "flex",
            gap: "8px",
            alignItems: "flex-start",
          }}
        >
          <Icon name="alert" size={15} style={{ color: "#bf7914", flex: "none", marginTop: "2px" }} />
          <span>
            <b>Official Notice:</b> This portal is for appointed Legal Metrology Inspectors to review and act on consumer complaints under Section 36 of the Legal Metrology Act, 2009.
          </span>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: "20px", fontSize: "12px" }}>
        <button
          type="button"
          className="plain"
          onClick={() => setPage("auth")}
          style={{ color: "#0f8e7d", fontWeight: 700 }}
        >
          ← Looking for Citizen / Consumer Sign In?
        </button>
      </div>
    </main>
  )
}
