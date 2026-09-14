import React, { useState } from "react"
import { Page, User } from "../types"
import { Icon, Logo, Button, Badge } from "../components/Icons"
import { firebaseService } from "../firebase/firebaseService"
import { ConfirmationResult } from "firebase/auth"

interface AuthPageProps {
  setPage: (page: Page) => void
  onLoginSuccess: (user: User) => void
  currentUser: User | null
  redirectTarget?: Page
}

export const AuthPage: React.FC<AuthPageProps> = ({
  setPage,
  onLoginSuccess,
  currentUser,
  redirectTarget = "scan",
}) => {
  const [authMethod, setAuthMethod] = useState<"email" | "phone">("email")
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin")
  
  // Email Form States
  const [email, setEmail] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [rememberMe, setRememberMe] = useState<boolean>(true)
  
  // Sign Up Form States
  const [name, setName] = useState<string>("")
  const [signupEmail, setSignupEmail] = useState<string>("")
  const [signupPassword, setSignupPassword] = useState<string>("")
  const [signupConfirmPassword, setSignupConfirmPassword] = useState<string>("")
  
  // Phone Auth States
  const [phone, setPhone] = useState<string>("")
  const [phoneName, setPhoneName] = useState<string>("")
  const [otpCode, setOtpCode] = useState<string>("")
  const [otpSent, setOtpSent] = useState<boolean>(false)
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)
  
  // Feedback states
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  // Auto-redirect if already authenticated
  React.useEffect(() => {
    if (currentUser) {
      if (currentUser.role === "admin" || currentUser.email.toLowerCase() === "thisisyashasvi@gmail.com") {
        setPage("admin")
      } else if (currentUser.role === "officer") {
        setPage("officer-dashboard")
      } else {
        setPage(redirectTarget || "scan")
      }
    }
  }, [currentUser])

  // Handle Quick Pre-fills
  const handleFillAdmin = () => {
    setAuthMethod("email")
    setActiveTab("signin")
    setEmail("thisisyashasvi@gmail.com")
    setPassword("YashasviProject")
    setErrorMessage(null)
  }

  const handleFillCitizen = () => {
    setAuthMethod("email")
    setActiveTab("signin")
    setEmail("consumer@packsure.in")
    setPassword("Consumer123")
    setErrorMessage(null)
  }

  // Handle Sign In with Firebase Email & Password
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)
    setIsLoading(true)

    try {
      const user = await firebaseService.signInWithEmail(email, password)
      onLoginSuccess(user)
      setIsLoading(false)

      if (user.email.toLowerCase() === "thisisyashasvi@gmail.com" || user.role === "admin") {
        setPage("admin")
      } else if (user.role === "officer") {
        setPage("officer-dashboard")
      } else {
        setPage(redirectTarget || "scan")
      }
    } catch (err: any) {
      setIsLoading(false)
      setErrorMessage(err.message || "Invalid email or password. Please check your credentials.")
    }
  }

  // Handle Sign Up with Firebase Email & Password
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (signupPassword !== signupConfirmPassword) {
      setErrorMessage("Passwords do not match. Please try again.")
      return
    }

    if (signupPassword.length < 6) {
      setErrorMessage("Password should be at least 6 characters long.")
      return
    }

    setIsLoading(true)

    try {
      const user = await firebaseService.signUpWithEmail(signupEmail, signupPassword, name || "Citizen User")
      onLoginSuccess(user)
      setIsLoading(false)

      if (user.email.toLowerCase() === "thisisyashasvi@gmail.com" || user.role === "admin") {
        setPage("admin")
      } else {
        setPage(redirectTarget || "scan")
      }
    } catch (err: any) {
      setIsLoading(false)
      setErrorMessage(err.message || "Failed to create account. Please try again.")
    }
  }

  // Handle Google Sign-In with Firebase Popup
  const handleGoogleSignIn = async () => {
    setErrorMessage(null)
    setSuccessMessage(null)
    setIsLoading(true)

    try {
      const user = await firebaseService.signInWithGoogle()
      onLoginSuccess(user)
      setIsLoading(false)

      if (user.email.toLowerCase() === "thisisyashasvi@gmail.com" || user.role === "admin") {
        setPage("admin")
      } else {
        setPage(redirectTarget || "scan")
      }
    } catch (err: any) {
      setIsLoading(false)
      setErrorMessage(err.message || "Google Sign-in failed. Please try again.")
    }
  }

  // Handle Send Phone OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!phone || phone.trim().length < 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number.")
      return
    }

    setIsLoading(true)
    try {
      const confirmation = await firebaseService.sendPhoneOtp(phone)
      setConfirmationResult(confirmation)
      setOtpSent(true)
      setIsLoading(false)
      setSuccessMessage(`OTP sent successfully to ${phone}. Enter the 6-digit code below.`)
    } catch (err: any) {
      setIsLoading(false)
      setOtpSent(true) // Allow demo OTP fallback
      setSuccessMessage(`Demo OTP mode active for ${phone}. Enter any 6-digit code e.g. 123456`)
    }
  }

  // Handle Verify Phone OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!otpCode || otpCode.trim().length < 4) {
      setErrorMessage("Please enter the verification code sent to your phone.")
      return
    }

    setIsLoading(true)
    try {
      const user = await firebaseService.verifyPhoneOtp(confirmationResult, otpCode, phone, phoneName)
      onLoginSuccess(user)
      setIsLoading(false)
      setPage(redirectTarget || "scan")
    } catch (err: any) {
      setIsLoading(false)
      setErrorMessage(err.message || "Invalid OTP verification code. Please try again.")
    }
  }

  return (
    <main className="page-shell" style={{ maxWidth: "560px", paddingTop: "32px" }}>
      {/* Invisible container for Firebase Phone Recaptcha */}
      <div id="recaptcha-container" />

      {/* Breadcrumb */}
      <div className="crumb" style={{ justifyContent: "center" }}>
        <button className="plain" onClick={() => setPage("home")}>Home</button>
        <Icon name="chevron" size={14} />
        <span>Authorisation Portal</span>
      </div>

      {/* Header */}
      <div style={{ textAlign: "center", marginTop: "20px" }}>
        <div style={{ display: "inline-block", marginBottom: "8px" }}>
          <Badge type="blue">FIREBASE SECURE AUTHENTICATION</Badge>
        </div>
        <h1 style={{ fontSize: "28px", color: "#102b4e", marginTop: "4px" }}>
          Welcome to PackSure
        </h1>
        <p style={{ color: "#687a8c", fontSize: "14px", marginTop: "4px" }}>
          Sign in or register with Email, Google, or Phone OTP to verify packaged commodity compliance.
        </p>
      </div>

      {/* Auth Card */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #d4dfe5",
          borderRadius: "14px",
          padding: "28px",
          marginTop: "24px",
          boxShadow: "0 6px 24px rgba(16, 43, 78, 0.06)",
        }}
      >
        {/* Google Sign-in Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            background: "#fff",
            border: "1px solid #cfdce4",
            borderRadius: "8px",
            padding: "11px",
            fontSize: "14px",
            fontWeight: 600,
            color: "#2c3e50",
            cursor: "pointer",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            marginBottom: "18px",
            transition: "all 0.15s ease",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", margin: "14px 0 16px" }}>
          <div style={{ flex: 1, height: "1px", background: "#e1e9ed" }} />
          <span style={{ padding: "0 12px", fontSize: "11px", color: "#8a9bac", textTransform: "uppercase", fontWeight: 600 }}>
            or choose sign in method
          </span>
          <div style={{ flex: 1, height: "1px", background: "#e1e9ed" }} />
        </div>

        {/* Auth Method Selector: Email vs Phone */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            background: "#edf4f8",
            borderRadius: "8px",
            padding: "3px",
            marginBottom: "16px",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setAuthMethod("email")
              setErrorMessage(null)
            }}
            style={{
              padding: "8px",
              borderRadius: "6px",
              border: "none",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              background: authMethod === "email" ? "#fff" : "transparent",
              color: authMethod === "email" ? "#102b4e" : "#6c7d90",
              boxShadow: authMethod === "email" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            <Icon name="file" size={14} /> Email &amp; Password
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMethod("phone")
              setErrorMessage(null)
            }}
            style={{
              padding: "8px",
              borderRadius: "6px",
              border: "none",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              background: authMethod === "phone" ? "#fff" : "transparent",
              color: authMethod === "phone" ? "#102b4e" : "#6c7d90",
              boxShadow: authMethod === "phone" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            <Icon name="clock" size={14} /> Phone Number (SMS OTP)
          </button>
        </div>

        {/* Feedback Alerts */}
        {errorMessage && (
          <div
            style={{
              background: "#fdf0ef",
              border: "1px solid #f9d5d4",
              borderRadius: "8px",
              padding: "10px 14px",
              color: "#a53c40",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "16px",
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
              padding: "10px 14px",
              color: "#0f8e7d",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "16px",
            }}
          >
            <Icon name="check" size={16} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* 1. EMAIL AUTHENTICATION METHOD */}
        {authMethod === "email" && (
          <>
            {/* Tabs: Sign In / Sign Up */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                background: "#f0f4f7",
                borderRadius: "8px",
                padding: "3px",
                marginBottom: "16px",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setActiveTab("signin")
                  setErrorMessage(null)
                  setSuccessMessage(null)
                }}
                style={{
                  padding: "8px",
                  borderRadius: "6px",
                  border: "none",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  background: activeTab === "signin" ? "#fff" : "transparent",
                  color: activeTab === "signin" ? "#102b4e" : "#6c7d90",
                  boxShadow: activeTab === "signin" ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
                }}
              >
                Sign In (Login)
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("signup")
                  setErrorMessage(null)
                  setSuccessMessage(null)
                }}
                style={{
                  padding: "8px",
                  borderRadius: "6px",
                  border: "none",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  background: activeTab === "signup" ? "#fff" : "transparent",
                  color: activeTab === "signup" ? "#102b4e" : "#6c7d90",
                  boxShadow: activeTab === "signup" ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
                }}
              >
                Sign Up (Register)
              </button>
            </div>

            {/* Sign In Form */}
            {activeTab === "signin" && (
              <form onSubmit={handleSignIn}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#344b62" }}>
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="abc@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    border: "1px solid #cddae1",
                    borderRadius: "7px",
                    padding: "11px",
                    margin: "5px 0 14px",
                    fontSize: "13px",
                  }}
                />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "#344b62" }}>
                    Password
                  </label>
                </div>
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    border: "1px solid #cddae1",
                    borderRadius: "7px",
                    padding: "11px",
                    margin: "5px 0 16px",
                    fontSize: "13px",
                  }}
                />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#54687d", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    Remember me on this device
                  </label>
                </div>

                <Button type="submit" className="wide" disabled={isLoading} style={{ padding: "12px" }}>
                  {isLoading ? (
                    <>
                      <Icon name="refresh" size={16} className="animate-spin" /> Verifying Credentials...
                    </>
                  ) : (
                    <>
                      Sign In with Email <Icon name="arrow" size={16} />
                    </>
                  )}
                </Button>
              </form>
            )}

            {/* Sign Up Form */}
            {activeTab === "signup" && (
              <form onSubmit={handleSignUp}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#344b62" }}>
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    border: "1px solid #cddae1",
                    borderRadius: "7px",
                    padding: "11px",
                    margin: "5px 0 12px",
                    fontSize: "13px",
                  }}
                />

                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#344b62" }}>
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="abc@gmail.com"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    border: "1px solid #cddae1",
                    borderRadius: "7px",
                    padding: "11px",
                    margin: "5px 0 12px",
                    fontSize: "13px",
                  }}
                />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#344b62" }}>
                      Create Password
                    </label>
                    <input
                      type="password"
                      placeholder="Min 6 characters"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                      style={{
                        width: "100%",
                        border: "1px solid #cddae1",
                        borderRadius: "7px",
                        padding: "11px",
                        margin: "5px 0 14px",
                        fontSize: "13px",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#344b62" }}>
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      placeholder="Repeat password"
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      required
                      style={{
                        width: "100%",
                        border: "1px solid #cddae1",
                        borderRadius: "7px",
                        padding: "11px",
                        margin: "5px 0 14px",
                        fontSize: "13px",
                      }}
                    />
                  </div>
                </div>

                <Button type="submit" className="wide" disabled={isLoading} style={{ padding: "12px" }}>
                  {isLoading ? (
                    <>
                      <Icon name="refresh" size={16} className="animate-spin" /> Creating Account...
                    </>
                  ) : (
                    <>
                      Create Free Account <Icon name="arrow" size={16} />
                    </>
                  )}
                </Button>
              </form>
            )}
          </>
        )}

        {/* 2. PHONE AUTHENTICATION METHOD (SMS OTP) */}
        {authMethod === "phone" && (
          <div>
            {!otpSent ? (
              <form onSubmit={handleSendOtp}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#344b62" }}>
                  Your Full Name <span style={{ fontWeight: 400, color: "#8a9bac" }}>(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ananya Iyer"
                  value={phoneName}
                  onChange={(e) => setPhoneName(e.target.value)}
                  style={{
                    width: "100%",
                    border: "1px solid #cddae1",
                    borderRadius: "7px",
                    padding: "11px",
                    margin: "5px 0 12px",
                    fontSize: "13px",
                  }}
                />

                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#344b62" }}>
                  Mobile Phone Number
                </label>
                <div style={{ display: "flex", gap: "8px", margin: "5px 0 16px" }}>
                  <span
                    style={{
                      background: "#f0f4f7",
                      border: "1px solid #cddae1",
                      borderRadius: "7px",
                      padding: "11px 12px",
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "#102b4e",
                    }}
                  >
                    🇮🇳 +91
                  </span>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    style={{
                      flex: 1,
                      border: "1px solid #cddae1",
                      borderRadius: "7px",
                      padding: "11px",
                      fontSize: "13px",
                    }}
                  />
                </div>

                <Button type="submit" className="wide" disabled={isLoading} style={{ padding: "12px" }}>
                  {isLoading ? (
                    <>
                      <Icon name="refresh" size={16} className="animate-spin" /> Sending SMS OTP...
                    </>
                  ) : (
                    <>
                      Send 6-Digit OTP via SMS <Icon name="arrow" size={16} />
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp}>
                <div style={{ fontSize: "12px", color: "#54687d", marginBottom: "12px" }}>
                  Enter the 6-digit verification code sent to <b>+91 {phone}</b>:
                </div>

                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#344b62" }}>
                  6-Digit SMS Verification Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. 123456"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    border: "1px solid #cddae1",
                    borderRadius: "7px",
                    padding: "12px",
                    margin: "5px 0 16px",
                    fontSize: "16px",
                    fontFamily: "'DM Mono', monospace",
                    letterSpacing: "4px",
                    textAlign: "center",
                  }}
                />

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    style={{
                      padding: "10px 14px",
                      background: "#f0f4f7",
                      border: "1px solid #ccd8de",
                      borderRadius: "7px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    ← Change Phone
                  </button>
                  <Button type="submit" className="wide" disabled={isLoading} style={{ padding: "12px", flex: 1 }}>
                    {isLoading ? (
                      <>
                        <Icon name="refresh" size={16} className="animate-spin" /> Verifying Code...
                      </>
                    ) : (
                      <>
                        Verify OTP &amp; Sign In <Icon name="check" size={16} />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Quick Demo Credentials Footer */}
        <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #eaf0f3", fontSize: "11px", color: "#748698" }}>
          <div style={{ fontWeight: 700, color: "#102b4e", marginBottom: "6px" }}>
            QUICK ACCESS ACCOUNTS:
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleFillAdmin}
              style={{
                background: "#f0f6fa",
                border: "1px solid #c7d8e2",
                borderRadius: "5px",
                padding: "4px 8px",
                fontSize: "10px",
                color: "#183856",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              ★ Admin (thisisyashasvi@gmail.com)
            </button>
            <button
              type="button"
              onClick={handleFillCitizen}
              style={{
                background: "#edf7f5",
                border: "1px solid #bfe4db",
                borderRadius: "5px",
                padding: "4px 8px",
                fontSize: "10px",
                color: "#0f8e7d",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              👤 Consumer (consumer@packsure.in)
            </button>
          </div>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: "16px", fontSize: "12px" }}>
        <button
          type="button"
          className="plain"
          onClick={() => setPage("officer-login")}
          style={{ color: "#102b4e", fontWeight: 700 }}
        >
          ⚖ Are you a Legal Metrology Enforcement Officer? Sign in here →
        </button>
      </div>
    </main>
  )
}
