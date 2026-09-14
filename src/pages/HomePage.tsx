import React from "react"
import { Page, ProductData } from "../types"
import { Icon, Button, Badge } from "../components/Icons"
import { SAMPLE_PRODUCTS, DEFAULT_PRODUCT } from "../data/sampleProducts"

interface HomePageProps {
  setPage: (page: Page) => void
  setSelectedProduct: (product: ProductData) => void
}

function PhoneArt({ onTryScan }: { onTryScan: () => void }) {
  return (
    <div className="hero-art">
      <div className="product-pack" onClick={onTryScan} style={{ cursor: "pointer" }} title="Click to test Britannia Good Day Biscuits">
        <div className="pack-seal">★</div>
        <span>BRITANNIA</span>
        <strong>GOOD DAY</strong>
        <i>BUTTER COOKIES • 100g</i>
        <div className="pack-lines" />
        <div
          style={{
            position: "absolute",
            bottom: "12px",
            right: "12px",
            background: "rgba(0,0,0,0.25)",
            padding: "2px 6px",
            borderRadius: "4px",
            fontSize: "8px",
            color: "#fff",
            fontFamily: "'DM Mono', monospace",
          }}
        >
          MRP ₹30
        </div>
      </div>

      <div className="phone-art">
        <div className="phone-top" />
        <div className="scan-window">
          <div className="barcode-mini">||| || ||| |||| |</div>
          <div className="scan-line" />
        </div>
        <div className="scan-card">
          <Badge type="green">Likely Compliant • 86/100</Badge>
          <strong>Label Captured</strong>
          <small>MRP: ₹30 • Batch: GD2026B104 • Expiry: 15 Dec 2026</small>
        </div>
      </div>

      <div className="art-ring" />
    </div>
  )
}

export const HomePage: React.FC<HomePageProps> = ({ setPage, setSelectedProduct }) => {
  const features = [
    {
      icon: "scan" as const,
      title: "Barcode Identification",
      text: "Instantly identify standard 8-to-14 digit Indian barcodes (EAN-13) against standard registered product data.",
    },
    {
      icon: "file" as const,
      title: "OCR Label Compliance Check",
      text: "Automated optical character recognition checks all 7 mandatory declarations under Legal Metrology Rules, 2011.",
    },
    {
      icon: "shield" as const,
      title: "Evidence-Backed Complaints",
      text: "Auto-generate official grievance dossiers with OCR extracted label evidence for the Department of Consumer Affairs.",
    },
    {
      icon: "alert" as const,
      title: "Overcharging & Expiry Shield",
      text: "Detect dual pricing, arbitrary refrigeration surcharges, and expired goods with instant violation advisories.",
    },
  ]

  const quickSamples = [
    {
      key: "compliant",
      title: "Britannia Good Day",
      tag: "Likely Compliant",
      badgeType: "green" as const,
      score: "86/100",
      desc: "Default Compliant Sample",
      icon: "check" as const,
    },
    {
      key: "expired",
      title: "Amul Taaza Milk",
      tag: "Product Expired",
      badgeType: "red" as const,
      score: "38/100",
      desc: "Past Expiry Date Warning",
      icon: "alert" as const,
    },
    {
      key: "mrp_missing",
      title: "PureDrop Mustard Oil",
      tag: "MRP Missing",
      badgeType: "amber" as const,
      score: "44/100",
      desc: "Rule 6(1)(e) Violation",
      icon: "alert" as const,
    },
    {
      key: "overcharging",
      title: "Thums Up (750ml)",
      tag: "Sold Above MRP",
      badgeType: "red" as const,
      score: "42/100",
      desc: "Charged ₹55 vs MRP ₹40",
      icon: "alert" as const,
    },
  ]

  const handleTestSample = (sampleKey: string) => {
    const prod = SAMPLE_PRODUCTS[sampleKey] || DEFAULT_PRODUCT
    setSelectedProduct(prod)
    setPage("result")
  }

  return (
    <main>
      {/* Hero Section */}
      <section className="hero">
        <div className="eyebrow">
          <span />
          SIH 2026: A CONSUMER SAFETY &amp; LEGAL METROLOGY TOOL FOR INDIA
        </div>
        <h1>
          Scan. Verify.<br />
          <em>Buy with confidence.</em>
        </h1>
        <p>
          Verify Maximum Retail Price (MRP), expiry date, net quantity, and mandatory package-label declarations in seconds. Protect yourself from unfair trade practices.
        </p>

        <div className="hero-buttons">
          <Button
            onClick={() => {
              setSelectedProduct(DEFAULT_PRODUCT)
              setPage("scan")
            }}
          >
            Scan a Product <Icon name="arrow" size={17} />
          </Button>
          <Button
            secondary
            onClick={() => document.getElementById("works")?.scrollIntoView({ behavior: "smooth" })}
          >
            How it works
          </Button>
        </div>

        <div className="trust-row">
          <span>
            <Icon name="shield" size={17} /> Privacy-first (Local OCR)
          </span>
          <span>
            <Icon name="clock" size={17} /> Fast 10-Second Analysis
          </span>
          <span>
            <Icon name="check" size={17} /> LMPC Rules 2011 Verified
          </span>
        </div>

        <PhoneArt
          onTryScan={() => {
            setSelectedProduct(DEFAULT_PRODUCT)
            setPage("result")
          }}
        />
      </section>

      {/* Quick Test Samples Banner */}
      <section style={{ background: "#edf6f5", padding: "28px max(7vw, 48px)", borderBottom: "1px solid #d4e7e4" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
          <div>
            <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "1px", color: "#117c70" }}>
              INSTANT PREVIEW &amp; TEST SCENARIOS
            </span>
            <h3 style={{ fontSize: "18px", color: "#102b4e", marginTop: "4px" }}>
              Explore how PackSure checks compliance across different product conditions:
            </h3>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {quickSamples.map((s) => (
              <button
                key={s.key}
                onClick={() => handleTestSample(s.key)}
                style={{
                  background: "#fff",
                  border: "1px solid #c9dedb",
                  borderRadius: "8px",
                  padding: "8px 14px",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#15304c" }}>{s.title}</div>
                  <div style={{ fontSize: "10px", color: "#65758a" }}>{s.desc}</div>
                </div>
                <Badge type={s.badgeType}>{s.tag}</Badge>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="section-label">BUILT FOR EVERYDAY CONSUMER SAFETY</div>
        <h2>
          Everything you need to<br />
          shop with clarity.
        </h2>
        <div className="feature-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))" }}>
          {features.map((f, i) => (
            <article className="feature-card" key={f.title}>
              <div className={`feature-icon f${i}`}>
                <Icon name={f.icon} size={25} />
              </div>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
              <button onClick={() => setPage("scan")}>
                Try scanning <Icon name="arrow" size={15} />
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* Mandatory Declarations Under Law Card */}
      <section style={{ padding: "0 max(7vw, 48px) 70px" }}>
        <div
          style={{
            background: "linear-gradient(135deg, #102b4e 0%, #153860 100%)",
            color: "#fff",
            borderRadius: "16px",
            padding: "36px 40px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "36px",
            alignItems: "center",
          }}
          className="rules-card"
        >
          <div>
            <span style={{ color: "#7ce5cf", fontSize: "11px", fontWeight: 700, letterSpacing: "1.5px" }}>
              LEGAL METROLOGY (PACKAGED COMMODITIES) RULES, 2011
            </span>
            <h2 style={{ color: "#fff", fontSize: "28px", marginTop: "10px" }}>
              7 Mandatory Declarations Every Package Must Display
            </h2>
            <p style={{ color: "#b9c8d5", fontSize: "14px", lineHeight: "1.6", marginTop: "12px" }}>
              Under Indian law (Section 18 &amp; 36 of Legal Metrology Act, 2009), non-compliance or selling above MRP is a punishable offence with fines and compounding actions.
            </p>
            <div style={{ marginTop: "24px" }}>
              <Button onClick={() => setPage("scan")} style={{ background: "#0f8e7d" }}>
                Scan a Product Now <Icon name="arrow" size={16} />
              </Button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {[
              "1. Manufacturer / Packer / Importer Name & Address",
              "2. Country of Origin",
              "3. Common / Generic Name of Commodity",
              "4. Net Quantity (Weight / Measure / Count)",
              "5. Month & Year of Manufacture / Packing",
              "6. Best Before / Expiry Date",
              "7. Maximum Retail Price (MRP) incl. all taxes",
              "8. Consumer Care Helpline & Email",
            ].map((rule) => (
              <div
                key={rule}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#e8f4f2",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                <span style={{ color: "#7ce5cf", marginRight: "6px" }}>✓</span> {rule}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="works" className="how">
        <div>
          <div className="section-label">HOW IT WORKS</div>
          <h2>
            Two minutes of care.<br />
            <em>A lot more certainty.</em>
          </h2>
          <p>
            PackSure combines fast barcode identification with high-precision optical character recognition (OCR) to evaluate label declarations against statutory Indian packaging standards.
          </p>
          <Button onClick={() => setPage("scan")}>
            Start a scan <Icon name="arrow" size={17} />
          </Button>
        </div>

        <div className="steps">
          {[
            ["01", "Scan or Enter Barcode", "Capture the packaging label photo or enter the 8-14 digit EAN barcode."],
            ["02", "Automated Validation", "PackSure inspects all 7 mandatory declarations and checks for overcharging vs MRP."],
            ["03", "Actionable Redressal", "Instantly generate and track an evidence-backed complaint to the Legal Metrology Officer."],
          ].map(([num, title, text]) => (
            <div className="step" key={num}>
              <span>{num}</span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
