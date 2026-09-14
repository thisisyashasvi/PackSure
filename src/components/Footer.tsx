import React from "react"
import { Page } from "../types"
import { Logo } from "./Icons"

interface FooterProps {
  setPage: (page: Page) => void
}

export const Footer: React.FC<FooterProps> = ({ setPage }) => {
  return (
    <footer>
      <div className="footer-top">
        <div>
          <Logo />
          <p>
            Smart India Hackathon (SIH) Project: Compliance Check for Packaged Commodities via Scanning.
            Empowering Indian consumers and enforcement authorities with automated label verification under the Legal Metrology (Packaged Commodities) Rules, 2011.
          </p>
          <div style={{ marginTop: "16px", display: "flex", gap: "10px", alignItems: "center" }}>
            <span
              style={{
                fontSize: "11px",
                background: "rgba(255,255,255,0.1)",
                padding: "4px 10px",
                borderRadius: "6px",
                color: "#7ce5cf",
                fontFamily: "'DM Mono', monospace",
              }}
            >
              National Consumer Helpline: 1915
            </span>
          </div>
        </div>

        <div>
          <h4>Consumer Rights</h4>
          <button className="plain" onClick={() => setPage("scan")} style={{ color: "#e6edf2", display: "block", margin: "9px 0", fontSize: "13px" }}>
            Scan a Product
          </button>
          <button className="plain" onClick={() => setPage("complaint")} style={{ color: "#e6edf2", display: "block", margin: "9px 0", fontSize: "13px" }}>
            Report Overcharging / Expiry
          </button>
          <button className="plain" onClick={() => setPage("track")} style={{ color: "#e6edf2", display: "block", margin: "9px 0", fontSize: "13px" }}>
            Track Grievance Status
          </button>
          <a href="https://consumeraffairs.nic.in" target="_blank" rel="noopener noreferrer" style={{ color: "#9aafc2" }}>
            Dept. of Consumer Affairs ↗
          </a>
        </div>

        <div>
          <h4>Enforcement Portal</h4>
          <button className="plain" onClick={() => setPage("home")} style={{ color: "#e6edf2", display: "block", margin: "9px 0", fontSize: "13px" }}>
            About the Service
          </button>
          <button className="plain" onClick={() => setPage("officer-login")} style={{ color: "#7ce5cf", display: "block", margin: "9px 0", fontSize: "13px", fontWeight: 700 }}>
            ⚖ Metrology Officer Login
          </button>
          <a href="#rules" onClick={(e) => { e.preventDefault(); alert("Legal Metrology (Packaged Commodities) Rules, 2011: Mandates 7 declarations on every package including Name of Manufacturer, Net Qty, Month/Year, Expiry/Best Before, MRP, and Consumer Care details.") }}>
            LMPC 2011 Declarations
          </a>
          <a href="#privacy" onClick={(e) => { e.preventDefault(); alert("Privacy Notice: PackSure does not share consumer personal identity. Scanned image data is processed strictly for preliminary compliance matching.") }}>
            Privacy & Data Security
          </a>
        </div>

        <div className="partner">
          <span>IN ACCORDANCE WITH</span>
          <strong>
            Legal Metrology<br />
            (Packaged Commodities)<br />
            Rules, 2011
          </strong>
          <span style={{ display: "block", marginTop: "10px", color: "#6aaeb0" }}>
            Ministry of Consumer Affairs, Food & Public Distribution
          </span>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© 2026 PackSure. Smart India Hackathon Prototype.</span>
        <span style={{ float: "right", color: "#8aa5bc" }}>
          Disclaimer: This is an automated preliminary compliance check, not a final legal decision.
        </span>
      </div>
    </footer>
  )
}
