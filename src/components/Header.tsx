import React, { useState } from "react"
import { Page, User } from "../types"
import { Icon, Logo, Button, Badge } from "./Icons"

interface HeaderProps {
  currentPage: Page
  setPage: (page: Page) => void
  currentUser: User | null
  onLogout: () => void
}

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  setPage,
  currentUser,
  onLogout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)

  const handleNav = (page: Page) => {
    setPage(page)
    setMobileMenuOpen(false)
    setUserDropdownOpen(false)
  }

  const isAdmin = currentUser?.role === "admin" || currentUser?.email.toLowerCase() === "thisisyashasvi@gmail.com"
  const isOfficer = currentUser?.role === "officer"

  return (
    <>
      <header>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => handleNav("home")} className="plain" aria-label="PackSure Home">
            <Logo showSubtitle />
          </button>
        </div>

        <nav className="desktop-nav">
          <button
            className={currentPage === "home" ? "active-nav" : ""}
            onClick={() => handleNav("home")}
          >
            Home
          </button>
          <a
            href="#works"
            onClick={(e) => {
              if (currentPage !== "home") {
                e.preventDefault()
                setPage("home")
                setTimeout(() => {
                  document.getElementById("works")?.scrollIntoView({ behavior: "smooth" })
                }, 100)
              }
            }}
          >
            How It Works
          </a>
          <button
            className={currentPage === "scan" ? "active-nav" : ""}
            onClick={() => handleNav("scan")}
          >
            Scan Product
          </button>
          <button
            className={currentPage === "result" ? "active-nav" : ""}
            onClick={() => handleNav("result")}
          >
            Scan Result
          </button>
          <button
            className={currentPage === "complaint" ? "active-nav" : ""}
            onClick={() => handleNav("complaint")}
          >
            Complaints
          </button>
          <button
            className={currentPage === "track" ? "active-nav" : ""}
            onClick={() => handleNav("track")}
          >
            Track Status
          </button>
          <button
            className={currentPage === "repository" ? "active-nav" : ""}
            onClick={() => handleNav("repository")}
            style={{ fontWeight: 600 }}
          >
            Central Repository
          </button>

          {/* Admin Dashboard Tab (Admin Only) */}
          {isAdmin && (
            <button
              className={currentPage === "admin" ? "active-nav" : ""}
              onClick={() => handleNav("admin")}
              style={{ color: "#0f8e7d", fontWeight: 700 }}
            >
              ★ Admin Dashboard
            </button>
          )}

          {/* Officer Review Dashboard Tab (Officer Only) */}
          {isOfficer && (
            <button
              className={currentPage === "officer-dashboard" ? "active-nav" : ""}
              onClick={() => handleNav("officer-dashboard")}
              style={{ color: "#0f8e7d", fontWeight: 700 }}
            >
              ⚖ Officer Review Console
            </button>
          )}

          {/* Public Officer Portal Link (When not logged in) */}
          {!currentUser && (
            <button
              className={currentPage === "officer-login" ? "active-nav" : ""}
              onClick={() => handleNav("officer-login")}
              style={{ color: "#102b4e", fontWeight: 600 }}
              title="Official portal for Metrology Enforcement Officers"
            >
              ⚖ Officer Portal
            </button>
          )}
        </nav>

        <div className="header-actions">
          {/* User Account / Login State */}
          {currentUser ? (
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 12px",
                  background: "#f4f8fa",
                  border: "1px solid #d4dfe5",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    width: "26px",
                    height: "26px",
                    borderRadius: "50%",
                    background: isAdmin ? "#102b4e" : isOfficer ? "#0f8e7d" : "#102b4e",
                    color: "#fff",
                    fontSize: "11px",
                    fontWeight: 700,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  {currentUser.name.slice(0, 2).toUpperCase()}
                </span>
                <div style={{ textAlign: "left", fontSize: "11px" }}>
                  <div style={{ fontWeight: 700, color: "#102b4e", maxWidth: "120px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {currentUser.name.split(" ")[0]}
                  </div>
                  <Badge type={isAdmin ? "amber" : isOfficer ? "green" : "blue"} style={{ fontSize: "8px", padding: "1px 4px" }}>
                    {isAdmin ? "Admin" : isOfficer ? "Metrology Officer" : "Consumer"}
                  </Badge>
                </div>
                <Icon name="chevron" size={14} style={{ color: "#7a8c9e" }} />
              </button>

              {/* User Dropdown */}
              {userDropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "42px",
                    width: "230px",
                    background: "#fff",
                    border: "1px solid #d9e3e9",
                    borderRadius: "10px",
                    padding: "12px",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                    zIndex: 100,
                  }}
                >
                  <div style={{ paddingBottom: "8px", borderBottom: "1px solid #edf2f4", marginBottom: "8px" }}>
                    <div style={{ fontWeight: 700, fontSize: "12px", color: "#102b4e" }}>{currentUser.name}</div>
                    <div style={{ fontSize: "10px", color: "#788a9c" }}>{currentUser.email}</div>
                  </div>

                  {isAdmin && (
                    <button
                      className="plain"
                      onClick={() => handleNav("admin")}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "8px",
                        fontSize: "12px",
                        color: "#0f8e7d",
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <Icon name="grid" size={15} /> Admin Dashboard
                    </button>
                  )}

                  {isOfficer && (
                    <button
                      className="plain"
                      onClick={() => handleNav("officer-dashboard")}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "8px",
                        fontSize: "12px",
                        color: "#0f8e7d",
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <Icon name="file" size={15} /> Review Complaints
                    </button>
                  )}

                  <button
                    className="plain"
                    onClick={() => handleNav("track")}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "8px",
                      fontSize: "12px",
                      color: "#4a5d71",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Icon name="clock" size={15} /> My Grievances
                  </button>

                  <button
                    className="plain"
                    onClick={() => {
                      onLogout()
                      setUserDropdownOpen(false)
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "8px",
                      fontSize: "12px",
                      color: "#c9484d",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      marginTop: "4px",
                      borderTop: "1px solid #edf2f4",
                    }}
                  >
                    <Icon name="user" size={15} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <button
                className="login"
                onClick={() => handleNav("auth")}
                title="Consumer Sign In"
              >
                <Icon name="user" size={16} /> Sign In
              </button>
              <button
                type="button"
                onClick={() => handleNav("officer-login")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#102b4e",
                  background: "#f0f4f7",
                  border: "1px solid #d4dfe5",
                  borderRadius: "6px",
                  padding: "7px 10px",
                  cursor: "pointer",
                }}
                title="Login for Legal Metrology Officers"
              >
                ⚖ Officer Login
              </button>
            </div>
          )}

          <Button onClick={() => handleNav("scan")}>
            Scan now <Icon name="arrow" size={16} />
          </Button>

          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
            style={{ display: "none", padding: "8px" }}
          >
            <Icon name={mobileMenuOpen ? "close" : "menu"} size={22} />
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-drawer">
          <button
            className={currentPage === "home" ? "active" : ""}
            onClick={() => handleNav("home")}
          >
            <Icon name="shield" size={18} /> Home
          </button>
          <button
            className={currentPage === "scan" ? "active" : ""}
            onClick={() => handleNav("scan")}
          >
            <Icon name="scan" size={18} /> Scan Product
          </button>
          <button
            className={currentPage === "result" ? "active" : ""}
            onClick={() => handleNav("result")}
          >
            <Icon name="file" size={18} /> Scan Result
          </button>
          <button
            className={currentPage === "complaint" ? "active" : ""}
            onClick={() => handleNav("complaint")}
          >
            <Icon name="alert" size={18} /> Submit Complaint
          </button>
          <button
            className={currentPage === "track" ? "active" : ""}
            onClick={() => handleNav("track")}
          >
            <Icon name="clock" size={18} /> Track Grievance
          </button>
          {isAdmin && (
            <button
              className={currentPage === "admin" ? "active" : ""}
              onClick={() => handleNav("admin")}
              style={{ color: "#0f8e7d", fontWeight: 700 }}
            >
              <Icon name="grid" size={18} /> Admin Dashboard
            </button>
          )}
          {isOfficer && (
            <button
              className={currentPage === "officer-dashboard" ? "active" : ""}
              onClick={() => handleNav("officer-dashboard")}
              style={{ color: "#0f8e7d", fontWeight: 700 }}
            >
              <Icon name="file" size={18} /> Review Consumer Complaints
            </button>
          )}
          {!currentUser && (
            <>
              <button
                className={currentPage === "auth" ? "active" : ""}
                onClick={() => handleNav("auth")}
              >
                <Icon name="user" size={18} /> Citizen Sign In / Register
              </button>
              <button
                className={currentPage === "officer-login" ? "active" : ""}
                onClick={() => handleNav("officer-login")}
                style={{ color: "#102b4e", fontWeight: 700 }}
              >
                ⚖ Metrology Officer Login
              </button>
            </>
          )}
        </div>
      )}
    </>
  )
}
