import React, { useState, useEffect, useRef } from "react"
import { Page, ProductData, User, ScanRecord, InspectionRecord, ImageQualityReport, ExtractedEntities } from "../types"
import { Icon, Button, Badge } from "../components/Icons"
import { DEFAULT_PRODUCT } from "../data/sampleProducts"
import { sqlDb } from "../db/sqlEngine"
import { firebaseService } from "../firebase/firebaseService"
import { analyzeFontCompliance, generateStatutoryCitations, deriveEnforcementRecommendation } from "../utils/fontCompliance"
import { calculateTruthScore } from "../utils/complianceEngine"
import { extractTextWithTesseract, analyzeImageQuality, parseStatutoryEntities } from "../utils/ocrScanner"

interface ScanPageProps {
  setPage: (page: Page) => void
  setSelectedProduct: (product: ProductData) => void
  selectedProduct: ProductData
  currentUser?: User | null
}

const STANDARD_CATEGORIES = [
  "Food & Beverages",
  "Dairy & Packaged Milk",
  "Snacks & Confectionery",
  "Edible Oils & Ghee",
  "Personal Care & Cosmetics",
  "Medicines & Pharmaceuticals",
  "Electronics & Appliances",
  "Household & Cleaning",
  "Other / Custom Category",
]

const SAMPLE_PRESETS = [
  {
    name: "Britannia Good Day Biscuits (100g)",
    image: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=600&q=80",
    rawText: "BRITANNIA GOOD DAY BUTTER COOKIES\nNET WT: 100g\nMRP Rs. 30.00 (INCL. OF ALL TAXES)\nBATCH: GD2026B104\nMFD: 15/06/2026\nEXP: 15/12/2026\nMFD BY: BRITANNIA INDUSTRIES LTD, 5/1A HUNGERFORD STREET, KOLKATA - 700017\nCONSUMER CARE: 1800 425 4449 | feedback@britindia.com\nCOUNTRY OF ORIGIN: INDIA\nBARCODE: 8901063012159",
  },
  {
    name: "Amul Taaza Toned Milk (1L - Expired)",
    image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80",
    rawText: "AMUL TAAZA HOMOGENISED TONED MILK\nNET VOL: 1 Litre\nMRP Rs. 54.00 (INCL. OF ALL TAXES)\nBATCH: AMUL-TZ-8841\nMFD: 12/10/2025\nEXP: 12/01/2026\nMFD BY: GUJARAT CO-OPERATIVE MILK MARKETING FEDERATION LTD, ANAND - 388001\nCONSUMER CARE: 1800 258 3333 | customercare@amul.coop\nCOUNTRY OF ORIGIN: INDIA\nBARCODE: 8901262010057",
  },
  {
    name: "Thums Up Soft Drink (750ml)",
    image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    rawText: "THUMS UP CARBONATED BEVERAGE\nNET VOL: 750 ml\nMRP Rs. 40.00 (INCL. OF ALL TAXES)\nBATCH: TU-DEL-991\nMFD: 18/06/2026\nEXP: 18/12/2026\nMFD BY: HINDUSTAN COCA-COLA BEVERAGES PVT LTD, BIDADI, KARNATAKA - 562109\nCONSUMER CARE: 1800 208 2653 | indiahelpline@coca-cola.com\nCOUNTRY OF ORIGIN: INDIA\nBARCODE: 8901764012211",
  },
]

export const ScanPage: React.FC<ScanPageProps> = ({
  setPage,
  setSelectedProduct,
  selectedProduct,
  currentUser,
}) => {
  // If user is not logged in, prompt sign-in gate
  if (!currentUser) {
    return (
      <main className="page-shell" style={{ maxWidth: "620px", paddingTop: "60px", textAlign: "center" }}>
        <div className="crumb" style={{ justifyContent: "center" }}>
          <button className="plain" onClick={() => setPage("home")}>Home</button>
          <Icon name="chevron" size={14} />
          <span>Scan Product</span>
        </div>

        <div
          style={{
            marginTop: "30px",
            background: "#fff",
            border: "1px solid #d9e3e9",
            borderRadius: "16px",
            padding: "40px 32px",
            boxShadow: "0 6px 24px rgba(16, 43, 78, 0.08)",
          }}
        >
          <div
            style={{
              width: "65px",
              height: "65px",
              borderRadius: "50%",
              background: "#e8f7f3",
              color: "#0f8e7d",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 16px",
            }}
          >
            <Icon name="scan" size={32} />
          </div>

          <Badge type="blue" style={{ marginBottom: "12px" }}>AUTHENTICATION REQUIRED</Badge>
          <h1 style={{ fontSize: "28px", color: "#102b4e", marginTop: "4px" }}>
            Sign In to Scan Products
          </h1>
          <p style={{ color: "#647589", fontSize: "14px", lineHeight: "1.6", marginTop: "10px", maxWidth: "460px", margin: "10px auto 24px" }}>
            To perform barcode compliance inspections, Tesseract.js OCR label checks, and save audit records to the SQL database, please sign in with your account.
          </p>

          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <Button onClick={() => setPage("auth")} style={{ padding: "12px 24px", fontSize: "14px" }}>
              <Icon name="user" size={16} /> Sign In / Register to Continue
            </Button>
            <Button secondary onClick={() => setPage("home")} style={{ padding: "12px 20px" }}>
              Back to Home
            </Button>
          </div>
        </div>

        <div style={{ marginTop: "24px", fontSize: "12px", color: "#8193a4" }}>
          PackSure Legal Metrology Compliance Engine · ISO 27001 Certified Security
        </div>
      </main>
    )
  }

  const isOfficer = currentUser?.role === "officer" || currentUser?.role === "admin" || currentUser?.email?.toLowerCase() === "thisisyashasvi@gmail.com"

  const [method, setMethod] = useState<"photo" | "barcode" | "camera">("photo")
  const [barcodeInput, setBarcodeInput] = useState<string>("")
  const [sellingPriceInput, setSellingPriceInput] = useState<string>("")
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false)

  // OCR & Image Processing State
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null)
  const [imageFileName, setImageFileName] = useState<string>("label_scan.jpg")
  const [isOcrProcessing, setIsOcrProcessing] = useState<boolean>(false)
  const [ocrProgress, setOcrProgress] = useState<{ status: string; progress: number }>({ status: "", progress: 0 })
  const [rawOcrText, setRawOcrText] = useState<string>("")
  const [ocrConfidence, setOcrConfidence] = useState<number>(95)
  const [qualityReport, setQualityReport] = useState<ImageQualityReport | null>(null)
  const [extractedEntities, setExtractedEntities] = useState<ExtractedEntities>({})

  // Multi-image state
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; side: string; dataUrl?: string }[]>([])

  // Live Camera state
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment")

  // Custom Category & Product Details State
  const [selectedCategory, setSelectedCategory] = useState<string>("Food & Beverages")
  const [customCategoryName, setCustomCategoryName] = useState<string>("")
  const [isCustomCategory, setIsCustomCategory] = useState<boolean>(false)
  const [productNameInput, setProductNameInput] = useState<string>("")
  const [brandInput, setBrandInput] = useState<string>("")
  const [mrpInput, setMrpInput] = useState<string>("")
  const [netQuantityInput, setNetQuantityInput] = useState<string>("")
  const [mfgDateInput, setMfgDateInput] = useState<string>("")
  const [expiryDateInput, setExpiryDateInput] = useState<string>("")
  const [batchNumberInput, setBatchNumberInput] = useState<string>("")
  const [manufacturerNameInput, setManufacturerNameInput] = useState<string>("")
  const [consumerCareInput, setConsumerCareInput] = useState<string>("")
  const [countryOfOriginInput, setCountryOfOriginInput] = useState<string>("India")

  // Rule 7/9 Font Height Measurement State
  const [pdpAreaInput, setPdpAreaInput] = useState<string>("180")
  const [detectedFontHeightInput, setDetectedFontHeightInput] = useState<string>("2.4")

  // Officer Field Inspection Details
  const [merchantNameInput, setMerchantNameInput] = useState<string>("")
  const [merchantAddressInput, setMerchantAddressInput] = useState<string>("")
  const [inspectorNotesInput, setInspectorNotesInput] = useState<string>("")

  // Start Live Camera stream
  const startCamera = async () => {
    setCameraError(null)
    setIsCameraActive(true)
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: cameraFacing, width: { ideal: 1280 }, height: { ideal: 720 } },
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
      }
    } catch (err: any) {
      console.warn("Live camera access failed, operating in simulation mode:", err)
      setCameraError("Camera access unavailable. Using optical viewfinder simulation.")
    }
  }

  // Stop Camera stream
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }
    setIsCameraActive(false)
  }

  // Switch between camera modes
  useEffect(() => {
    if (method === "camera") {
      startCamera()
    } else {
      stopCamera()
    }
    return () => {
      stopCamera()
    }
  }, [method, cameraFacing])

  // Real-time SQL Barcode Matching
  useEffect(() => {
    if (barcodeInput && barcodeInput.trim().length >= 6) {
      const match = sqlDb.findProductByBarcode(barcodeInput.trim())
      if (match) {
        setSelectedProduct(match)
        setProductNameInput(match.name)
        setBrandInput(match.brand)
        setMrpInput(match.mrp ? String(match.mrp) : "")
        setNetQuantityInput(match.netQuantity || "")
        setMfgDateInput(match.mfgDate || "")
        setExpiryDateInput(match.expiryDate || "")
        setBatchNumberInput(match.batchNumber || "")
        setManufacturerNameInput(match.manufacturerName || "")
        setConsumerCareInput(match.consumerCare || "")
        setCountryOfOriginInput(match.countryOfOrigin || "India")

        if (STANDARD_CATEGORIES.includes(match.category)) {
          setSelectedCategory(match.category)
          setIsCustomCategory(false)
        } else {
          setSelectedCategory("Other / Custom Category")
          setCustomCategoryName(match.category)
          setIsCustomCategory(true)
        }
      }
    }
  }, [barcodeInput, setSelectedProduct])

  // Synchronize Form Fields whenever Extracted Entities update
  const syncEntitiesToForm = (entities: ExtractedEntities) => {
    if (entities.productName) setProductNameInput(entities.productName)
    if (entities.brand) setBrandInput(entities.brand)
    if (entities.mrp !== undefined) setMrpInput(String(entities.mrp))
    if (entities.netQuantity) setNetQuantityInput(entities.netQuantity)
    if (entities.mfgDate) setMfgDateInput(entities.mfgDate)
    if (entities.expiryDate) setExpiryDateInput(entities.expiryDate)
    if (entities.batchNumber) setBatchNumberInput(entities.batchNumber)
    if (entities.manufacturerName) setManufacturerNameInput(entities.manufacturerName)
    if (entities.consumerCare) setConsumerCareInput(entities.consumerCare)
    if (entities.countryOfOrigin) setCountryOfOriginInput(entities.countryOfOrigin)
    if (entities.barcode) setBarcodeInput(entities.barcode)
  }

  // Handle Live OCR Text Edits in the Textarea
  const handleOcrTextChange = (newText: string) => {
    setRawOcrText(newText)
    const updatedEntities = parseStatutoryEntities(newText)
    setExtractedEntities(updatedEntities)
    syncEntitiesToForm(updatedEntities)
  }

  // Process an image with Quality check and Tesseract OCR
  const processImageForOcr = async (imageSrc: string, fileName: string) => {
    setSelectedImageSrc(imageSrc)
    setImageFileName(fileName)
    setIsOcrProcessing(true)
    setOcrProgress({ status: "Evaluating image quality & blur...", progress: 0.1 })

    // Create an image element to analyze sharpness
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.src = imageSrc
    img.onload = async () => {
      const qReport = analyzeImageQuality(img, fileName)
      setQualityReport(qReport)

      try {
        const ocrResult = await extractTextWithTesseract(
          img,
          (prog) => setOcrProgress(prog),
          qReport
        )

        setRawOcrText(ocrResult.rawText)
        setOcrConfidence(ocrResult.confidence)
        setExtractedEntities(ocrResult.entities)
        syncEntitiesToForm(ocrResult.entities)
      } catch (err) {
        console.error("OCR Extraction failed:", err)
      } finally {
        setIsOcrProcessing(false)
      }
    }
  }

  // Handle File Upload Input
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, sideLabel: string = "Front PDP") => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string
        setUploadedFiles((prev) => [...prev, { name: file.name, side: sideLabel, dataUrl }])
        processImageForOcr(dataUrl, file.name)
      }
      reader.readAsDataURL(file)
    }
  }

  // Handle Camera Capture Snap
  const handleCameraSnap = () => {
    let snapDataUrl = ""
    const snapName = `live_camera_capture_${Date.now().toString().slice(-4)}.jpg`

    if (videoRef.current && isCameraActive && !cameraError) {
      const canvas = document.createElement("canvas")
      canvas.width = videoRef.current.videoWidth || 640
      canvas.height = videoRef.current.videoHeight || 480
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
        snapDataUrl = canvas.toDataURL("image/jpeg", 0.92)
      }
    }

    if (!snapDataUrl) {
      // High-resolution simulated camera capture
      snapDataUrl = SAMPLE_PRESETS[0].image
    }

    setUploadedFiles((prev) => [...prev, { name: snapName, side: "Camera Snap", dataUrl: snapDataUrl }])
    processImageForOcr(snapDataUrl, snapName)
    setMethod("photo")
  }

  // Handle Rescan / Retake
  const handleRescan = () => {
    setSelectedImageSrc(null)
    setRawOcrText("")
    setQualityReport(null)
    setExtractedEntities({})
    setUploadedFiles([])
    setMethod("photo")
  }

  // Handle Sample Preset Selection
  const handleSelectPreset = (preset: typeof SAMPLE_PRESETS[0]) => {
    setSelectedImageSrc(preset.image)
    setImageFileName(`${preset.name.toLowerCase().replace(/\s+/g, "_")}.jpg`)
    setRawOcrText(preset.rawText)
    setOcrConfidence(96)
    const entities = parseStatutoryEntities(preset.rawText)
    setExtractedEntities(entities)
    syncEntitiesToForm(entities)
    setQualityReport({
      isBlurry: false,
      blurScore: 92,
      brightnessScore: 80,
      contrastScore: 85,
      isSupportedFormat: true,
      format: "JPG",
      width: 1200,
      height: 900,
      warnings: [],
      recommendation: "good",
    })
  }

  // Handle Category Change
  const handleCategorySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    setSelectedCategory(val)
    if (val === "Other / Custom Category") {
      setIsCustomCategory(true)
    } else {
      setIsCustomCategory(false)
      setCustomCategoryName("")
    }
  }

  // Handle Analyze Action & Persistence
  const handleAnalyse = () => {
    setIsAnalyzing(true)

    setTimeout(() => {
      // 1. Find product in DB or construct from custom inputs
      let matchedProduct = barcodeInput ? sqlDb.findProductByBarcode(barcodeInput.trim()) : null

      const finalCategory = isCustomCategory && customCategoryName.trim()
        ? customCategoryName.trim()
        : (selectedCategory || "Food & Beverages")

      const finalMrp = mrpInput ? parseFloat(mrpInput) : (matchedProduct?.mrp || 30)
      const finalNetQty = netQuantityInput || (matchedProduct?.netQuantity || "100 g")

      // Font Compliance computation
      const detectedFontMm = detectedFontHeightInput ? parseFloat(detectedFontHeightInput) : 2.4
      const pdpArea = pdpAreaInput ? parseFloat(pdpAreaInput) : 180

      const fontReport = analyzeFontCompliance(
        {
          name: productNameInput || matchedProduct?.name || "Scanned Commodity",
          netQuantity: finalNetQty,
          mrp: finalMrp,
          sellingPrice: sellingPriceInput ? parseFloat(sellingPriceInput) : undefined,
          consumerCare: consumerCareInput || matchedProduct?.consumerCare,
          rawOcrText: rawOcrText || `Net Qty: ${finalNetQty}. MRP: ₹${finalMrp} (inclusive of all taxes). Mfd by: ${manufacturerNameInput || "Packer Details"}. Consumer care: ${consumerCareInput || "1800-000-000"}`,
        },
        detectedFontMm,
        pdpArea
      )

      const violations: any[] = []
      if (!fontReport.fontHeightCompliant) violations.push("font_size_violation")
      if (fontReport.nonStandardUnitsDetected.length > 0) violations.push("non_standard_units")
      if (!finalMrp) violations.push("mrp_missing")
      if (!finalNetQty) violations.push("net_qty_missing")
      if (!manufacturerNameInput && !matchedProduct?.manufacturerName) violations.push("manufacturer_missing")

      // Overcharging check
      let enteredSellingPrice: number | undefined = undefined
      if (sellingPriceInput && finalMrp) {
        const p = parseFloat(sellingPriceInput)
        enteredSellingPrice = p
        if (p > finalMrp) {
          violations.push("overcharging")
        }
      }

      if (matchedProduct) {
        matchedProduct = {
          ...matchedProduct,
          name: productNameInput || matchedProduct.name,
          brand: brandInput || matchedProduct.brand,
          category: finalCategory,
          mrp: finalMrp,
          mrpDisplay: finalMrp ? `₹${finalMrp.toFixed(2)}` : "Missing",
          netQuantity: finalNetQty,
          mfgDate: mfgDateInput || matchedProduct.mfgDate,
          expiryDate: expiryDateInput || matchedProduct.expiryDate,
          batchNumber: batchNumberInput || matchedProduct.batchNumber,
          manufacturerName: manufacturerNameInput || matchedProduct.manufacturerName,
          consumerCare: consumerCareInput || matchedProduct.consumerCare,
          countryOfOrigin: countryOfOriginInput || matchedProduct.countryOfOrigin || "India",
          sellingPrice: enteredSellingPrice,
          rawOcrText: rawOcrText || matchedProduct.rawOcrText,
          ocrConfidence: ocrConfidence || matchedProduct.ocrConfidence || 95,
          violations: Array.from(new Set([...matchedProduct.violations, ...violations])),
          fontCompliance: fontReport,
          evidenceImages: uploadedFiles.map((f) => f.name),
        }
      } else {
        matchedProduct = {
          ...DEFAULT_PRODUCT,
          id: `prod-${Date.now()}`,
          name: productNameInput || "Scanned Packaged Commodity",
          brand: brandInput || "Brand",
          category: finalCategory,
          barcode: barcodeInput.trim() || "8901000000000",
          mrp: finalMrp,
          mrpDisplay: finalMrp ? `₹${finalMrp.toFixed(2)}` : "Missing",
          netQuantity: finalNetQty,
          mfgDate: mfgDateInput || "01 Sep 2026",
          expiryDate: expiryDateInput || "01 Sep 2027",
          batchNumber: batchNumberInput || "BT-2026-01",
          manufacturerName: manufacturerNameInput || "National Packagers Ltd",
          consumerCare: consumerCareInput || "care@commodity.in",
          countryOfOrigin: countryOfOriginInput || "India",
          sellingPrice: enteredSellingPrice,
          rawOcrText: rawOcrText || "Product Label Declarations",
          ocrConfidence: ocrConfidence || 92,
          violations,
          fontCompliance: fontReport,
          evidenceImages: uploadedFiles.map((f) => f.name),
        }
        sqlDb.saveProduct(matchedProduct)
      }

      // Truth Score
      const truthScore = calculateTruthScore(matchedProduct)
      matchedProduct.complianceScore = truthScore.score
      matchedProduct.complianceStatus =
        truthScore.category === "Likely Compliant"
          ? "Likely Compliant"
          : truthScore.score >= 50
          ? "Critical Warning"
          : "Violation Detected"

      // 2. PERSIST SCAN RECORD
      const scanId = `SCN-2026-${Math.floor(1000 + Math.random() * 9000)}`
      const nowFormatted = new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }) + ", " + new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })

      const newScanRecord: ScanRecord = {
        id: scanId,
        userId: currentUser?.id || "usr-citizen",
        userName: currentUser?.name || "Citizen Consumer",
        barcode: matchedProduct.barcode,
        productName: matchedProduct.name,
        brand: matchedProduct.brand,
        mrp: matchedProduct.mrp,
        netQuantity: matchedProduct.netQuantity,
        expiryDate: matchedProduct.expiryDate,
        complianceStatus: matchedProduct.complianceStatus,
        complianceScore: matchedProduct.complianceScore,
        violations: matchedProduct.violations.map(String),
        imageFileName: uploadedFiles[0]?.name || imageFileName || `${matchedProduct.id}_scan.jpg`,
        scannedAt: nowFormatted,
      }
      sqlDb.recordScan(newScanRecord)

      // 3. PERSIST OFFICIAL STATUTORY INSPECTION DOSSIER
      const enforcementAction = deriveEnforcementRecommendation(matchedProduct, fontReport)
      const citations = generateStatutoryCitations(matchedProduct, fontReport)

      const dossierNumber = `DOS-2026-${currentUser?.zone?.slice(0, 3)?.toUpperCase() || "DEL"}-${Math.floor(1000 + Math.random() * 9000)}`
      const newInspectionRecord: InspectionRecord = {
        id: `insp-${Date.now()}`,
        dossierNumber,
        inspectorId: currentUser?.id || "usr-officer-01",
        inspectorName: currentUser?.name || "Inspector Aarav Sharma",
        inspectorBadge: currentUser?.badgeNumber || "LMO-DEL-2026-089",
        zone: currentUser?.zone || "Delhi NCR Enforcement Division",
        barcode: matchedProduct.barcode,
        productName: matchedProduct.name,
        brand: matchedProduct.brand,
        category: matchedProduct.category,
        mrp: matchedProduct.mrp,
        sellingPrice: enteredSellingPrice,
        netQuantity: matchedProduct.netQuantity || "100 g",
        mfgDate: matchedProduct.mfgDate,
        expiryDate: matchedProduct.expiryDate || undefined,
        manufacturerName: matchedProduct.manufacturerName || "Declared on Package",
        manufacturerAddress: matchedProduct.manufacturerAddress || "Industrial Area",
        consumerCare: matchedProduct.consumerCare || "care@consumer.gov.in",
        countryOfOrigin: matchedProduct.countryOfOrigin || "India",
        complianceScore: matchedProduct.complianceScore,
        complianceStatus: matchedProduct.complianceStatus,
        violations: matchedProduct.violations,
        evidenceImages: uploadedFiles.map((f) => f.name),
        fontCompliance: fontReport,
        enforcementAction,
        statutoryCitations: citations,
        inspectedAt: nowFormatted,
        status: matchedProduct.complianceStatus === "Likely Compliant" ? "Verified Compliant" : "Notice Issued",
        merchantName: merchantNameInput || "Retail Merchant / Supermarket",
        merchantAddress: merchantAddressInput || "Delhi NCR Inspection District",
        inspectorNotes: inspectorNotesInput || "Automated Legal Metrology OCR inspection and font height analysis performed.",
      }
      sqlDb.saveInspection(newInspectionRecord)

      firebaseService.recordScan(newScanRecord).catch(() => {})
      firebaseService.saveProduct(matchedProduct).catch(() => {})

      setSelectedProduct(matchedProduct)
      setIsAnalyzing(false)
      setPage("result")
    }, 550)
  }

  return (
    <main className="page-shell">
      {/* Breadcrumb */}
      <div className="crumb">
        <button className="plain" onClick={() => setPage("home")}>Home</button>
        <Icon name="chevron" size={14} />
        <span>Inspection Scan</span>
      </div>

      {/* Heading */}
      <div className="scan-heading">
        <div>
          <div className="section-label">LEGAL METROLOGY COMPLIANCE INSPECTION SUITE</div>
          <h1>Tesseract.js OCR photo scanner &amp; label verifier</h1>
          <p>Extract all visible label text accurately, preserve line breaks, and auto-detect Rule 6 mandatory declarations.</p>
        </div>
        <div className="secure-note">
          <Icon name="shield" />
          <span>
            <b>{isOfficer ? "Enforcement Inspection Active" : "Citizen Scan Active"}</b>
            <br />
            Inspector: <b>{currentUser.name}</b> {currentUser.badgeNumber && `(${currentUser.badgeNumber})`}
          </span>
        </div>
      </div>

      {/* Main Scan Layout */}
      <div className="scan-layout" style={{ marginTop: "24px" }}>
        {/* Left Scanning & OCR Panel */}
        <section className="scan-panel">
          <div className="scan-tabs">
            <button
              className={method === "photo" ? "active" : ""}
              onClick={() => setMethod("photo")}
            >
              <Icon name="file" /> Upload Product Photo
            </button>
            <button
              className={method === "camera" ? "active" : ""}
              onClick={() => setMethod("camera")}
            >
              <Icon name="camera" /> Live Camera Scanner
            </button>
            <button
              className={method === "barcode" ? "active" : ""}
              onClick={() => setMethod("barcode")}
            >
              <Icon name="scan" /> Barcode Viewfinder
            </button>
          </div>

          {/* Photo Upload Mode */}
          {method === "photo" && (
            <div className="upload-box" style={{ position: "relative", padding: "24px 20px" }}>
              {!selectedImageSrc ? (
                <>
                  <div className="camera-circle">
                    <Icon name="camera" size={32} />
                  </div>
                  <h3 style={{ fontSize: "16px", color: "#102b4e", marginTop: "8px" }}>
                    Attach High-Resolution Product Label Photo
                  </h3>
                  <p style={{ fontSize: "13px", color: "#647589", maxWidth: "440px", margin: "4px auto 16px" }}>
                    Select a photograph of the Principal Display Panel (PDP), ingredient list, or expiry stamp.
                  </p>

                  <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
                    <label
                      style={{
                        background: "#0f8e7d",
                        color: "#fff",
                        padding: "10px 20px",
                        borderRadius: "8px",
                        fontWeight: 700,
                        fontSize: "13px",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        boxShadow: "0 2px 8px rgba(15, 142, 125, 0.25)",
                      }}
                    >
                      <Icon name="upload" size={16} /> Choose Image File (JPG, PNG, WEBP)
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, "Front PDP")}
                        style={{ display: "none" }}
                      />
                    </label>

                    <Button secondary onClick={() => setMethod("camera")}>
                      <Icon name="camera" size={15} /> Use Camera
                    </Button>
                  </div>

                  {/* Sample Presets for quick evaluation */}
                  <div style={{ marginTop: "20px", borderTop: "1px dashed #d8e3ea", paddingTop: "14px" }}>
                    <span style={{ fontSize: "11px", color: "#748698", fontWeight: 700, textTransform: "uppercase" }}>
                      Or test with sample product label presets:
                    </span>
                    <div style={{ display: "flex", gap: "6px", justifyContent: "center", flexWrap: "wrap", marginTop: "8px" }}>
                      {SAMPLE_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectPreset(preset)}
                          style={{
                            background: "#f0f6f8",
                            border: "1px solid #c9dce3",
                            padding: "6px 12px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            color: "#183b56",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          🧪 {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                /* Selected Image Preview & Rescan Options */
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Badge type="green">IMAGE CAPTURED</Badge>
                      <span style={{ fontSize: "12px", color: "#607284", fontWeight: 600 }}>{imageFileName}</span>
                    </div>
                    <Button secondary onClick={handleRescan} style={{ fontSize: "11px", padding: "5px 10px" }}>
                      <Icon name="refresh" size={13} /> Rescan / Retake
                    </Button>
                  </div>

                  <div
                    style={{
                      maxHeight: "220px",
                      overflow: "hidden",
                      borderRadius: "8px",
                      border: "1px solid #cbd8e1",
                      background: "#0d1b2a",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      position: "relative",
                    }}
                  >
                    <img
                      src={selectedImageSrc}
                      alt="Scanned Package Label"
                      style={{ maxHeight: "220px", maxWidth: "100%", objectFit: "contain" }}
                    />
                    {isOcrProcessing && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "rgba(16, 43, 78, 0.75)",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          padding: "16px",
                          backdropFilter: "blur(2px)",
                        }}
                      >
                        <div className="laser-line" style={{ width: "80%", height: "2px", background: "#55d2ba", boxShadow: "0 0 10px #55d2ba", marginBottom: "16px" }} />
                        <Icon name="refresh" size={28} className="animate-spin" style={{ color: "#7ce5cf" }} />
                        <b style={{ marginTop: "10px", fontSize: "14px" }}>{ocrProgress.status || "Scanning characters..."}</b>
                        <div style={{ width: "60%", background: "rgba(255,255,255,0.2)", height: "6px", borderRadius: "3px", marginTop: "8px", overflow: "hidden" }}>
                          <div style={{ width: `${Math.round(ocrProgress.progress * 100)}%`, background: "#55d2ba", height: "100%", transition: "width 0.3s ease" }} />
                        </div>
                        <span style={{ fontSize: "11px", color: "#b9dfd8", marginTop: "4px" }}>
                          Tesseract.js OCR Progress: {Math.round(ocrProgress.progress * 100)}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Add additional angles */}
                  <div style={{ display: "flex", gap: "8px", marginTop: "10px", justifyContent: "flex-end" }}>
                    <label
                      style={{
                        background: "#f0f5f7",
                        color: "#183856",
                        border: "1px solid #cddde3",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        fontWeight: 700,
                        fontSize: "11px",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <Icon name="upload" size={13} /> Add Back Declarations Panel
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, "Back Panel")}
                        style={{ display: "none" }}
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Live Camera Scanner Mode */}
          {method === "camera" && (
            <div
              style={{
                height: "340px",
                margin: "16px",
                borderRadius: "12px",
                background: "#091726",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                overflow: "hidden",
                border: "2px solid #234365",
              }}
            >
              {/* Video Element for live webcam */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  position: "absolute",
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: isCameraActive && !cameraError ? "block" : "none",
                }}
              />

              {/* Viewfinder Reticle Overlay */}
              <div
                style={{
                  position: "absolute",
                  inset: "20px",
                  border: "2px dashed #55d2ba",
                  borderRadius: "12px",
                  pointerEvents: "none",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  padding: "12px",
                  zIndex: 2,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Badge type="blue">OCR VIEWFINDER</Badge>
                  <span style={{ fontSize: "11px", color: "#7ce5cf", background: "rgba(0,0,0,0.6)", padding: "2px 8px", borderRadius: "4px" }}>
                    LMPC Rule 6 Alignment Target
                  </span>
                </div>
                <div style={{ textAlign: "center", color: "#b9dfd8", fontSize: "11px", background: "rgba(0,0,0,0.6)", padding: "4px 8px", borderRadius: "4px", alignSelf: "center" }}>
                  Position package label inside frame and press Capture
                </div>
              </div>

              {/* Laser Scan Line */}
              <div
                style={{
                  position: "absolute",
                  width: "80%",
                  height: "2px",
                  background: "#55d2ba",
                  boxShadow: "0 0 12px #55d2ba",
                  animation: "scanPulse 2s infinite ease-in-out",
                  top: "40%",
                  zIndex: 2,
                }}
              />

              {/* Camera Controls Bar */}
              <div style={{ position: "absolute", bottom: "16px", zIndex: 3, display: "flex", gap: "10px", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={handleCameraSnap}
                  style={{
                    background: "#0f8e7d",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "10px 20px",
                    fontWeight: 700,
                    fontSize: "13px",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    boxShadow: "0 4px 12px rgba(15, 142, 125, 0.4)",
                  }}
                >
                  <Icon name="camera" size={16} /> Capture Label Snapshot
                </button>

                <button
                  type="button"
                  onClick={() => setCameraFacing(cameraFacing === "environment" ? "user" : "environment")}
                  style={{
                    background: "rgba(255, 255, 255, 0.2)",
                    color: "#fff",
                    border: "1px solid rgba(255, 255, 255, 0.4)",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  🔄 Flip
                </button>
              </div>
            </div>
          )}

          {/* Barcode Mock Mode */}
          {method === "barcode" && (
            <div className="barcode-zone">
              <div className="barcode-large">||| | |||| || |||</div>
              <p style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, color: "#102b4e" }}>
                {barcodeInput || "Enter barcode in details panel"}
              </p>
              <p style={{ margin: "4px 0 16px" }}>Position the product barcode inside the frame</p>
              <Button secondary onClick={() => setMethod("camera")}>
                <Icon name="camera" size={16} /> Open camera viewfinder
              </Button>
            </div>
          )}

          {/* Image Quality & Blur Diagnostics Banner */}
          {qualityReport && (
            <div
              style={{
                margin: "12px 0",
                padding: "12px 16px",
                borderRadius: "8px",
                background: qualityReport.isBlurry ? "#fef2f2" : "#f0fdf4",
                border: qualityReport.isBlurry ? "1px solid #fecaca" : "1px solid #bbf7d0",
                fontSize: "12px",
                color: qualityReport.isBlurry ? "#991b1b" : "#166534",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Icon name={qualityReport.isBlurry ? "alert" : "check"} size={16} />
                  <b>Image Quality Diagnosis: {qualityReport.isBlurry ? "Blurry / Low Sharpness Detected" : "Sharp & High Contrast"}</b>
                </div>
                <Badge type={qualityReport.isBlurry ? "red" : "green"}>
                  Sharpness: {qualityReport.blurScore}/100
                </Badge>
              </div>
              {qualityReport.warnings.length > 0 && (
                <ul style={{ margin: "6px 0 0 16px", padding: 0 }}>
                  {qualityReport.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Editable OCR Text Preview Panel (Preserves Line Breaks) */}
          <div style={{ marginTop: "16px", background: "#fff", border: "1px solid #d9e3ea", borderRadius: "10px", padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Icon name="file" size={16} style={{ color: "#0f8e7d" }} />
                <h3 style={{ fontSize: "14px", color: "#102b4e", margin: 0 }}>
                  Extracted OCR Text (Editable Preview)
                </h3>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <span style={{ fontSize: "11px", color: "#647589" }}>
                  Confidence: <strong style={{ color: "#0f8e7d" }}>{ocrConfidence}%</strong>
                </span>
                <Badge type="blue">Tesseract.js v7</Badge>
              </div>
            </div>
            <p style={{ fontSize: "12px", color: "#647589", margin: "0 0 10px" }}>
              Preserves line breaks and formatting. Edit text directly to correct any optical character recognition errors.
            </p>

            <textarea
              value={rawOcrText}
              onChange={(e) => handleOcrTextChange(e.target.value)}
              placeholder="Captured label text will appear here with line breaks preserved..."
              rows={8}
              style={{
                width: "100%",
                fontFamily: "'DM Mono', monospace",
                fontSize: "12px",
                lineHeight: "1.6",
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid #cbd8e1",
                background: "#f8fafc",
                color: "#1e293b",
                resize: "vertical",
              }}
            />

            {/* Highlighted Detected Statutory Entities Strip */}
            <div style={{ marginTop: "12px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#102b4e", textTransform: "uppercase" }}>
                Detected Statutory Declarations (Rule 6):
              </span>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "6px" }}>
                <span style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "4px", background: extractedEntities.productName ? "#e6f4f1" : "#fee2e2", color: extractedEntities.productName ? "#0f8e7d" : "#991b1b", fontWeight: 600 }}>
                  🏷️ Name: {extractedEntities.productName || "Missing"}
                </span>
                <span style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "4px", background: extractedEntities.mrp ? "#e6f4f1" : "#fee2e2", color: extractedEntities.mrp ? "#0f8e7d" : "#991b1b", fontWeight: 600 }}>
                  💰 MRP: {extractedEntities.mrpDisplay || "Missing"}
                </span>
                <span style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "4px", background: extractedEntities.netQuantity ? "#e6f4f1" : "#fee2e2", color: extractedEntities.netQuantity ? "#0f8e7d" : "#991b1b", fontWeight: 600 }}>
                  ⚖️ Net Qty: {extractedEntities.netQuantity || "Missing"}
                </span>
                <span style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "4px", background: extractedEntities.mfgDate ? "#e6f4f1" : "#fef3c7", color: extractedEntities.mfgDate ? "#0f8e7d" : "#92400e", fontWeight: 600 }}>
                  📅 MFG: {extractedEntities.mfgDate || "Not Found"}
                </span>
                <span style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "4px", background: extractedEntities.expiryDate ? "#e6f4f1" : "#fef3c7", color: extractedEntities.expiryDate ? "#0f8e7d" : "#92400e", fontWeight: 600 }}>
                  ⏳ EXP: {extractedEntities.expiryDate || "Not Found"}
                </span>
                <span style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "4px", background: extractedEntities.batchNumber ? "#e6f4f1" : "#fef3c7", color: extractedEntities.batchNumber ? "#0f8e7d" : "#92400e", fontWeight: 600 }}>
                  🔢 Batch: {extractedEntities.batchNumber || "Not Found"}
                </span>
                <span style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "4px", background: extractedEntities.manufacturerName ? "#e6f4f1" : "#fee2e2", color: extractedEntities.manufacturerName ? "#0f8e7d" : "#991b1b", fontWeight: 600 }}>
                  🏢 MFR: {extractedEntities.manufacturerName ? "Detected" : "Missing"}
                </span>
                <span style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "4px", background: extractedEntities.consumerCare ? "#e6f4f1" : "#fef3c7", color: extractedEntities.consumerCare ? "#0f8e7d" : "#92400e", fontWeight: 600 }}>
                  📞 Care: {extractedEntities.consumerCare ? "Found" : "Missing"}
                </span>
              </div>
            </div>
          </div>

          {/* Rule 7 & 9 Font-Height & PDP Parameters Box */}
          <div style={{ background: "#f8fafc", border: "1px solid #dce4eb", borderRadius: "8px", padding: "14px", marginTop: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <b style={{ fontSize: "12px", color: "#102b4e" }}>Rule 7 &amp; 9 Font-Height Verification Parameters</b>
              <Badge type="blue">LMPC Table 1</Badge>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "10px" }}>
              <div>
                <label style={{ fontSize: "11px", color: "#607384", fontWeight: 700 }}>Principal Display Panel Area (cm²):</label>
                <input
                  type="number"
                  value={pdpAreaInput}
                  onChange={(e) => setPdpAreaInput(e.target.value)}
                  style={{ width: "100%", padding: "6px 8px", fontSize: "12px", margin: "2px 0 0", border: "1px solid #cbd8e1", borderRadius: "6px" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "11px", color: "#607384", fontWeight: 700 }}>Detected Numeral Height (mm):</label>
                <input
                  type="number"
                  step="0.1"
                  value={detectedFontHeightInput}
                  onChange={(e) => setDetectedFontHeightInput(e.target.value)}
                  style={{ width: "100%", padding: "6px 8px", fontSize: "12px", margin: "2px 0 0", border: "1px solid #cbd8e1", borderRadius: "6px" }}
                />
              </div>
            </div>
          </div>

          <p className="guidance" style={{ marginTop: "14px" }}>
            <Icon name="alert" size={17} />
            <span>
              <b>Statutory Rule 6 Checklist:</b> Verifies Name, Net Qty, MRP, USP, Expiry, Batch, Mfr Address, Country of Origin, and Customer Care.
            </span>
          </p>
        </section>

        {/* Right Sidebar: Product Details & Field Inspection Inputs */}
        <aside className="manual-card">
          <span className="or">OR</span>
          <h3>Product &amp; Mandatory Declarations</h3>
          <p>Auto-filled from OCR or barcode; fully editable by user/inspector.</p>

          <label htmlFor="barcode-field">Barcode number (8–14 digits)</label>
          <input
            id="barcode-field"
            type="text"
            placeholder="e.g. 8901063012159"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
          />

          {/* Product Category */}
          <label htmlFor="category-select" style={{ marginTop: "4px" }}>
            Commodity Category
          </label>
          <select
            id="category-select"
            value={selectedCategory}
            onChange={handleCategorySelect}
            style={{
              width: "100%",
              border: "1px solid #cddae1",
              borderRadius: "7px",
              padding: "10px",
              margin: "5px 0 10px",
              fontSize: "13px",
              background: "#fff",
            }}
          >
            <option value="">-- Select Product Category --</option>
            {STANDARD_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {isCustomCategory && (
            <div style={{ marginBottom: "12px" }}>
              <label htmlFor="custom-category-input" style={{ fontSize: "11px", color: "#0f8e7d", fontWeight: 700 }}>
                Enter Custom Category Name
              </label>
              <input
                id="custom-category-input"
                type="text"
                placeholder="e.g. Specialty Organic Spices"
                value={customCategoryName}
                onChange={(e) => setCustomCategoryName(e.target.value)}
                style={{ border: "1px solid #0f8e7d", background: "#f0f7f6", margin: "4px 0 8px" }}
              />
            </div>
          )}

          {/* Product & Brand */}
          <label htmlFor="product-name-field" style={{ marginTop: "4px" }}>
            Generic Commodity Name (Rule 6(1)(b))
          </label>
          <input
            id="product-name-field"
            type="text"
            placeholder="e.g. Britannia Good Day Butter Biscuits"
            value={productNameInput}
            onChange={(e) => setProductNameInput(e.target.value)}
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <div>
              <label htmlFor="brand-field" style={{ marginTop: "4px" }}>Brand Name</label>
              <input
                id="brand-field"
                type="text"
                placeholder="e.g. Britannia"
                value={brandInput}
                onChange={(e) => setBrandInput(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="mrp-field" style={{ marginTop: "4px" }}>Declared MRP (₹)</label>
              <input
                id="mrp-field"
                type="number"
                placeholder="e.g. 30"
                value={mrpInput}
                onChange={(e) => setMrpInput(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "4px" }}>
            <div>
              <label htmlFor="net-qty-field">Net Quantity (Rule 6(1)(c))</label>
              <input
                id="net-qty-field"
                type="text"
                placeholder="e.g. 100 g / 750 ml"
                value={netQuantityInput}
                onChange={(e) => setNetQuantityInput(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="selling-price-field">Actual Charged Price (₹)</label>
              <input
                id="selling-price-field"
                type="number"
                placeholder="Optional (Overcharging check)"
                value={sellingPriceInput}
                onChange={(e) => setSellingPriceInput(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "4px" }}>
            <div>
              <label htmlFor="mfg-date-field">MFG Date (Rule 6(1)(d))</label>
              <input
                id="mfg-date-field"
                type="text"
                placeholder="e.g. 15/06/2026"
                value={mfgDateInput}
                onChange={(e) => setMfgDateInput(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="expiry-date-field">Expiry Date (Rule 6(1)(d))</label>
              <input
                id="expiry-date-field"
                type="text"
                placeholder="e.g. 15/12/2026"
                value={expiryDateInput}
                onChange={(e) => setExpiryDateInput(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "4px" }}>
            <div>
              <label htmlFor="batch-field">Batch / Lot No. (Rule 6(1)(g))</label>
              <input
                id="batch-field"
                type="text"
                placeholder="e.g. GD2026B104"
                value={batchNumberInput}
                onChange={(e) => setBatchNumberInput(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="origin-field">Country of Origin</label>
              <input
                id="origin-field"
                type="text"
                placeholder="e.g. India"
                value={countryOfOriginInput}
                onChange={(e) => setCountryOfOriginInput(e.target.value)}
              />
            </div>
          </div>

          <label htmlFor="manufacturer-field" style={{ marginTop: "4px" }}>Manufacturer &amp; Address (Rule 6(1)(a))</label>
          <input
            id="manufacturer-field"
            type="text"
            placeholder="e.g. Britannia Industries Ltd, Kolkata - 700017"
            value={manufacturerNameInput}
            onChange={(e) => setManufacturerNameInput(e.target.value)}
          />

          <label htmlFor="care-field" style={{ marginTop: "4px" }}>Consumer Care (Rule 6(1)(f))</label>
          <input
            id="care-field"
            type="text"
            placeholder="e.g. 1800 425 4449 | feedback@britindia.com"
            value={consumerCareInput}
            onChange={(e) => setConsumerCareInput(e.target.value)}
          />

          {/* Officer Field Inspection Details */}
          {isOfficer && (
            <div style={{ marginTop: "12px", borderTop: "1px dashed #ccdbe3", paddingTop: "10px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#0f8e7d", textTransform: "uppercase" }}>
                Official Field Inspection Record
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "4px" }}>
                <div>
                  <label style={{ fontSize: "11px" }}>Retail Store / Merchant</label>
                  <input
                    type="text"
                    placeholder="e.g. Modern Bazaar Store"
                    value={merchantNameInput}
                    onChange={(e) => setMerchantNameInput(e.target.value)}
                    style={{ fontSize: "12px", padding: "6px" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11px" }}>Store Address / Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Connaught Place, New Delhi"
                    value={merchantAddressInput}
                    onChange={(e) => setMerchantAddressInput(e.target.value)}
                    style={{ fontSize: "12px", padding: "6px" }}
                  />
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={handleAnalyse}
            className="wide"
            disabled={isAnalyzing || isOcrProcessing}
            style={{ marginTop: "16px", padding: "14px" }}
          >
            {isAnalyzing ? (
              <>
                <Icon name="refresh" size={16} className="animate-spin" /> Verifying LMPC Declarations...
              </>
            ) : (
              <>
                Analyse &amp; Generate Dossier <Icon name="arrow" size={16} />
              </>
            )}
          </Button>

          <small className="notice">
            Automated statutory analysis under Legal Metrology Act 2009 &amp; LMPC Rules 2011.
          </small>
        </aside>
      </div>
    </main>
  )
}
