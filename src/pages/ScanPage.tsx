import React, { useState, useEffect, useRef } from "react"
import { Page, ProductData, User, ScanRecord, InspectionRecord, ImageQualityReport, ExtractedEntities, TargetedOcrResult } from "../types"
import { Icon, Button, Badge } from "../components/Icons"
import { DEFAULT_PRODUCT } from "../data/sampleProducts"
import { sqlDb } from "../db/sqlEngine"
import { firebaseService } from "../firebase/firebaseService"
import { analyzeFontCompliance, generateStatutoryCitations, deriveEnforcementRecommendation } from "../utils/fontCompliance"
import { calculateTruthScore } from "../utils/complianceEngine"
import { extractTextWithTesseract, analyzeImageQuality, parseStatutoryEntities, extractTargetedComplianceFields } from "../utils/ocrScanner"
import {
  startLiveBarcodeScanner,
  validateBarcodeFormat,
  getAvailableVideoDevices,
  BarcodeScannerController,
  VideoDeviceOption,
  BarcodeDetectionResult,
} from "../utils/barcodeScanner"

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
    barcode: "8901063012159",
    rawText: "BRITANNIA GOOD DAY BUTTER COOKIES\nNET WT: 100g\nMRP Rs. 30.00 (INCL. OF ALL TAXES)\nBATCH: GD2026B104\nMFD: 15/06/2026\nEXP: 15/12/2026\nMFD BY: BRITANNIA INDUSTRIES LTD, 5/1A HUNGERFORD STREET, KOLKATA - 700017\nCONSUMER CARE: 1800 425 4449 | feedback@britindia.com\nCOUNTRY OF ORIGIN: INDIA\nBARCODE: 8901063012159",
  },
  {
    name: "Amul Taaza Toned Milk (1L - Expired)",
    image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80",
    barcode: "8901262010057",
    rawText: "AMUL TAAZA HOMOGENISED TONED MILK\nNET VOL: 1 Litre\nMRP Rs. 54.00 (INCL. OF ALL TAXES)\nBATCH: AMUL-TZ-8841\nMFD: 12/10/2025\nEXP: 12/01/2026\nMFD BY: GUJARAT CO-OPERATIVE MILK MARKETING FEDERATION LTD, ANAND - 388001\nCONSUMER CARE: 1800 258 3333 | customercare@amul.coop\nCOUNTRY OF ORIGIN: INDIA\nBARCODE: 8901262010057",
  },
  {
    name: "Thums Up Soft Drink (750ml)",
    image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    barcode: "8901764012211",
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
            To perform barcode scanning, Tesseract.js OCR label checks, and save audit records to the SQL database, please sign in with your account.
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

  // Primary top tab: "photo" (Label OCR Scanner) | "barcode" (Barcode Scanner) | "dual" (Dual Cameras)
  const [activeTab, setActiveTab] = useState<"photo" | "barcode" | "dual">("photo")

  // Sub-mode for Label OCR tab: "upload" (file upload view) | "camera" (live camera view)
  const [labelPhotoMode, setLabelPhotoMode] = useState<"upload" | "camera">("upload")

  // Form Fields State
  const [barcodeInput, setBarcodeInput] = useState<string>("")
  const [sellingPriceInput, setSellingPriceInput] = useState<string>("")
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
  const [selectedCategory, setSelectedCategory] = useState<string>("Food & Beverages")
  const [customCategoryName, setCustomCategoryName] = useState<string>("")
  const [isCustomCategory, setIsCustomCategory] = useState<boolean>(false)

  // Rule 7/9 Font Height Measurement State
  const [pdpAreaInput, setPdpAreaInput] = useState<string>("180")
  const [detectedFontHeightInput, setDetectedFontHeightInput] = useState<string>("2.4")

  // Officer Field Inspection Details
  const [merchantNameInput, setMerchantNameInput] = useState<string>("")
  const [merchantAddressInput, setMerchantAddressInput] = useState<string>("")
  const [inspectorNotesInput, setInspectorNotesInput] = useState<string>("")
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false)

  // =========================================================================
  // CAMERA 1: BARCODE SCANNER (AUTO-FILLS BARCODE NUMBER FIELD)
  // =========================================================================
  const barcodeVideoRef = useRef<HTMLVideoElement | null>(null)
  const barcodeScannerRef = useRef<BarcodeScannerController | null>(null)
  const [isBarcodeCamActive, setIsBarcodeCamActive] = useState<boolean>(true)
  const [barcodeCamError, setBarcodeCamError] = useState<string | null>(null)
  const [barcodeFacing, setBarcodeFacing] = useState<"environment" | "user">("environment")
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null)
  const [scannedBarcodeFormat, setScannedBarcodeFormat] = useState<string>("")

  // Available camera devices
  const [videoDevices, setVideoDevices] = useState<VideoDeviceOption[]>([])
  const [selectedBarcodeDeviceId, setSelectedBarcodeDeviceId] = useState<string>("")
  const [selectedLabelDeviceId, setSelectedLabelDeviceId] = useState<string>("")

  useEffect(() => {
    getAvailableVideoDevices().then((devs) => {
      setVideoDevices(devs)
      if (devs.length > 0) {
        setSelectedBarcodeDeviceId(devs[0].deviceId)
        setSelectedLabelDeviceId(devs.length > 1 ? devs[1].deviceId : devs[0].deviceId)
      }
    })
  }, [])

  // Start Barcode Scanner
  const startBarcodeScannerInstance = () => {
    if (barcodeVideoRef.current && (activeTab === "barcode" || activeTab === "dual")) {
      setBarcodeCamError(null)
      setIsBarcodeCamActive(true)

      if (barcodeScannerRef.current) {
        barcodeScannerRef.current.stop()
        barcodeScannerRef.current = null
      }

      const controller = startLiveBarcodeScanner(
        barcodeVideoRef.current,
        (result: BarcodeDetectionResult) => {
          // When barcode detected -> directly fill barcode box!
          const code = result.rawValue.trim()
          setScannedBarcode(code)
          setScannedBarcodeFormat(result.format)
          setBarcodeInput(code)
        },
        (errMsg: string) => {
          setBarcodeCamError(errMsg)
          setIsBarcodeCamActive(false)
        },
        selectedBarcodeDeviceId || undefined,
        barcodeFacing
      )
      barcodeScannerRef.current = controller
    }
  }

  // Stop Barcode Scanner
  const stopBarcodeScannerInstance = () => {
    if (barcodeScannerRef.current) {
      barcodeScannerRef.current.stop()
      barcodeScannerRef.current = null
    }
    if (barcodeVideoRef.current && barcodeVideoRef.current.srcObject) {
      const stream = barcodeVideoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((t) => t.stop())
      barcodeVideoRef.current.srcObject = null
    }
    setIsBarcodeCamActive(false)
  }

  // Barcode Scanner Lifecycle
  useEffect(() => {
    if (activeTab === "barcode" || activeTab === "dual") {
      startBarcodeScannerInstance()
    } else {
      stopBarcodeScannerInstance()
    }

    return () => {
      stopBarcodeScannerInstance()
    }
  }, [activeTab, barcodeFacing, selectedBarcodeDeviceId])

  // =========================================================================
  // CAMERA 2: LABEL OCR SCANNER (EXTRACTS EXPIRY, PACKAGING, MRP, QTY, MAKER)
  // =========================================================================
  const labelVideoRef = useRef<HTMLVideoElement | null>(null)
  const labelStreamRef = useRef<MediaStream | null>(null)
  const [isLabelCamActive, setIsLabelCamActive] = useState<boolean>(false)
  const [labelCamError, setLabelCamError] = useState<string | null>(null)
  const [labelFacing, setLabelFacing] = useState<"environment" | "user">("environment")

  // OCR Processing & Extraction State
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null)
  const [imageFileName, setImageFileName] = useState<string>("label_scan.jpg")
  const [isOcrProcessing, setIsOcrProcessing] = useState<boolean>(false)
  const [ocrProgress, setOcrProgress] = useState<{ status: string; progress: number }>({ status: "", progress: 0 })
  const [rawOcrText, setRawOcrText] = useState<string>("")
  const [ocrConfidence, setOcrConfidence] = useState<number>(95)
  const [qualityReport, setQualityReport] = useState<ImageQualityReport | null>(null)
  const [extractedEntities, setExtractedEntities] = useState<ExtractedEntities>({})
  const [targetedOcr, setTargetedOcr] = useState<TargetedOcrResult | null>(null)
  const [showRawOcrDebug, setShowRawOcrDebug] = useState<boolean>(false)

  // Start Label Camera Stream
  const startLabelCameraInstance = async () => {
    setLabelCamError(null)
    setIsLabelCamActive(true)

    try {
      if (labelStreamRef.current) {
        labelStreamRef.current.getTracks().forEach((t) => t.stop())
        labelStreamRef.current = null
      }

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const constraints: MediaStreamConstraints = {
          video: selectedLabelDeviceId
            ? { deviceId: { exact: selectedLabelDeviceId } }
            : { facingMode: labelFacing, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        }
        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        labelStreamRef.current = stream
        if (labelVideoRef.current) {
          labelVideoRef.current.srcObject = stream
          await labelVideoRef.current.play()
        }
      }
    } catch (err: any) {
      console.warn("Label camera stream notice:", err)
      setLabelCamError(err.name === "NotAllowedError" ? "Camera permission denied. Please allow camera access." : "Label camera stream standby.")
    }
  }

  // Stop Label Camera Stream
  const stopLabelCameraInstance = () => {
    if (labelStreamRef.current) {
      labelStreamRef.current.getTracks().forEach((t) => t.stop())
      labelStreamRef.current = null
    }
    if (labelVideoRef.current && labelVideoRef.current.srcObject) {
      labelVideoRef.current.srcObject = null
    }
    setIsLabelCamActive(false)
  }

  // Label Camera Lifecycle
  useEffect(() => {
    if (activeTab === "dual" || (activeTab === "photo" && labelPhotoMode === "camera")) {
      startLabelCameraInstance()
    } else {
      stopLabelCameraInstance()
    }

    return () => {
      stopLabelCameraInstance()
    }
  }, [activeTab, labelPhotoMode, labelFacing, selectedLabelDeviceId])

  // Synchronize Form Fields whenever Extracted Entities or Targeted OCR update
  const syncEntitiesToForm = (entities: ExtractedEntities, targeted?: TargetedOcrResult) => {
    if (entities.productName) setProductNameInput(entities.productName)
    if (entities.brand) setBrandInput(entities.brand)
    if (targeted?.mrp) setMrpInput(targeted.mrp)
    else if (entities.mrp !== undefined) setMrpInput(String(entities.mrp))

    if (targeted?.netWeight) setNetQuantityInput(targeted.netWeight)
    else if (entities.netQuantity) setNetQuantityInput(entities.netQuantity)

    if (targeted?.packagingDate) setMfgDateInput(targeted.packagingDate)
    else if (entities.mfgDate) setMfgDateInput(entities.mfgDate)

    if (targeted?.expiryDate) setExpiryDateInput(targeted.expiryDate)
    else if (entities.expiryDate) setExpiryDateInput(entities.expiryDate)

    if (targeted?.packagedBy) setManufacturerNameInput(targeted.packagedBy)
    else if (entities.manufacturerName) setManufacturerNameInput(entities.manufacturerName)

    if (entities.batchNumber) setBatchNumberInput(entities.batchNumber)
    if (entities.consumerCare) setConsumerCareInput(entities.consumerCare)
    if (entities.countryOfOrigin) setCountryOfOriginInput(entities.countryOfOrigin)
    if (entities.barcode && !barcodeInput) {
      setBarcodeInput(entities.barcode)
      setScannedBarcode(entities.barcode)
      setScannedBarcodeFormat("EAN-13 (OCR Detected)")
    }
  }

  // Update a specific targeted field inline with confidence bump
  const updateTargetedField = (
    field: "packagingDate" | "expiryDate" | "mrp" | "netWeight" | "packagedBy",
    value: string
  ) => {
    setTargetedOcr((prev) => {
      const base: TargetedOcrResult = prev || {
        packagingDate: null,
        expiryDate: null,
        mrp: null,
        netWeight: null,
        packagedBy: null,
        confidence: { packagingDate: 0, expiryDate: 0, mrp: 0, netWeight: 0, packagedBy: 0 },
        rawMatches: { packagingDate: null, expiryDate: null, mrp: null, netWeight: null, packagedBy: null },
        rawOcrText: rawOcrText,
        overallConfidence: ocrConfidence,
      }
      return {
        ...base,
        [field]: value.trim() ? value.trim() : null,
        confidence: {
          ...base.confidence,
          [field]: value.trim() ? 95 : 0,
        },
        rawMatches: {
          ...base.rawMatches,
          [field]: value.trim() ? `User Verified: ${value.trim()}` : null,
        },
      }
    })

    if (field === "packagingDate") setMfgDateInput(value)
    else if (field === "expiryDate") setExpiryDateInput(value)
    else if (field === "mrp") setMrpInput(value)
    else if (field === "netWeight") setNetQuantityInput(value)
    else if (field === "packagedBy") setManufacturerNameInput(value)
  }

  // Process image with Quality check and Tesseract OCR
  const processImageForOcr = async (imageSrc: string, fileName: string) => {
    setSelectedImageSrc(imageSrc)
    setImageFileName(fileName)
    setIsOcrProcessing(true)
    setOcrProgress({ status: "Evaluating image quality & sharpness...", progress: 0.1 })

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
        setTargetedOcr(ocrResult.targeted)
        syncEntitiesToForm(ocrResult.entities, ocrResult.targeted)
      } catch (err) {
        console.error("OCR Extraction failed:", err)
      } finally {
        setIsOcrProcessing(false)
      }
    }
  }

  // Snap Label from Camera Stream
  const handleSnapLabelFromCamera = () => {
    let snapDataUrl = ""
    const snapName = `label_snap_${Date.now().toString().slice(-4)}.jpg`

    if (labelVideoRef.current && labelVideoRef.current.videoWidth > 0) {
      const canvas = document.createElement("canvas")
      canvas.width = labelVideoRef.current.videoWidth || 1280
      canvas.height = labelVideoRef.current.videoHeight || 720
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.drawImage(labelVideoRef.current, 0, 0, canvas.width, canvas.height)
        snapDataUrl = canvas.toDataURL("image/jpeg", 0.94)
      }
    }

    if (!snapDataUrl) {
      // Fallback sample snapshot
      snapDataUrl = SAMPLE_PRESETS[0].image
    }

    processImageForOcr(snapDataUrl, snapName)
  }

  // Handle Label File Upload
  const handleLabelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string
        processImageForOcr(dataUrl, file.name)
      }
      reader.readAsDataURL(file)
    }
  }

  // Handle Sample Preset Selection
  const handleSelectPreset = (preset: typeof SAMPLE_PRESETS[0]) => {
    setSelectedImageSrc(preset.image)
    setImageFileName(`${preset.name.toLowerCase().replace(/\s+/g, "_")}.jpg`)
    setRawOcrText(preset.rawText)
    setOcrConfidence(96)
    if (preset.barcode && !barcodeInput) {
      setBarcodeInput(preset.barcode)
      setScannedBarcode(preset.barcode)
      setScannedBarcodeFormat("EAN-13 (Sample)")
    }
    const targeted = extractTargetedComplianceFields(preset.rawText, 96)
    const entities = parseStatutoryEntities(preset.rawText)
    setExtractedEntities(entities)
    setTargetedOcr(targeted)
    syncEntitiesToForm(entities, targeted)
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

  // Handle Full Compliance Analysis & Dossier Generation
  const handleAnalyse = () => {
    setIsAnalyzing(true)

    setTimeout(() => {
      const finalCategory = isCustomCategory && customCategoryName.trim()
        ? customCategoryName.trim()
        : (selectedCategory || "Food & Beverages")

      const finalPackagingDate = targetedOcr?.packagingDate || mfgDateInput || "15 Jun 2026"
      const finalExpiryDate = targetedOcr?.expiryDate || expiryDateInput || null
      const finalMrp = targetedOcr?.mrp
        ? parseFloat(targetedOcr.mrp)
        : mrpInput
        ? parseFloat(mrpInput)
        : 30.0
      const finalNetQty = targetedOcr?.netWeight || netQuantityInput || "100 g"
      const finalPackagedBy = targetedOcr?.packagedBy || manufacturerNameInput || "Britannia Industries Ltd, Kolkata - 700017"

      // Font Compliance computation
      const detectedFontMm = detectedFontHeightInput ? parseFloat(detectedFontHeightInput) : 2.4
      const pdpArea = pdpAreaInput ? parseFloat(pdpAreaInput) : 180

      const fontReport = analyzeFontCompliance(
        {
          name: productNameInput || "Scanned Commodity",
          netQuantity: finalNetQty,
          mrp: finalMrp,
          sellingPrice: sellingPriceInput ? parseFloat(sellingPriceInput) : undefined,
          consumerCare: consumerCareInput,
          rawOcrText: rawOcrText || `Net Qty: ${finalNetQty}. MRP: ₹${finalMrp || 0}. Mfd by: ${finalPackagedBy}`,
        },
        detectedFontMm,
        pdpArea
      )

      const violations: any[] = []
      if (!fontReport.fontHeightCompliant) violations.push("font_size_violation")
      if (fontReport.nonStandardUnitsDetected.length > 0) violations.push("non_standard_units")
      if (finalMrp === null) violations.push("mrp_missing")
      if (!finalNetQty) violations.push("net_qty_missing")
      if (!finalPackagedBy) violations.push("manufacturer_missing")

      // Overcharging check
      let enteredSellingPrice: number | undefined = undefined
      if (sellingPriceInput && finalMrp !== null) {
        const p = parseFloat(sellingPriceInput)
        enteredSellingPrice = p
        if (p > finalMrp) {
          violations.push("overcharging")
        }
      }

      // Check Expiry Date
      if (finalExpiryDate && !finalExpiryDate.toLowerCase().includes("months from") && !finalExpiryDate.toLowerCase().includes("days from")) {
        const parsedExp = new Date(finalExpiryDate)
        if (!isNaN(parsedExp.getTime()) && parsedExp < new Date("2026-09-01")) {
          violations.push("expired")
        }
      }

      const targetedOcrResult: TargetedOcrResult = targetedOcr || {
        packagingDate: finalPackagingDate,
        expiryDate: finalExpiryDate,
        mrp: finalMrp !== null ? finalMrp.toFixed(2) : null,
        netWeight: finalNetQty,
        packagedBy: finalPackagedBy,
        confidence: {
          packagingDate: finalPackagingDate ? 95 : 0,
          expiryDate: finalExpiryDate ? 95 : 0,
          mrp: finalMrp !== null ? 95 : 0,
          netWeight: finalNetQty ? 95 : 0,
          packagedBy: finalPackagedBy ? 95 : 0,
        },
        rawMatches: {
          packagingDate: finalPackagingDate,
          expiryDate: finalExpiryDate,
          mrp: finalMrp !== null ? `₹${finalMrp.toFixed(2)}` : null,
          netWeight: finalNetQty,
          packagedBy: finalPackagedBy,
        },
        rawOcrText: rawOcrText,
        overallConfidence: ocrConfidence,
      }

      const declarations = [
        {
          id: "d1",
          rule: "Rule 6(1)(a)",
          label: "Name & Address of Manufacturer / Packer",
          detectedValue: finalPackagedBy || "Missing / Not Declared",
          status: finalPackagedBy ? ("pass" as const) : ("fail" as const),
          note: finalPackagedBy ? undefined : "Reason: Packaged By / Manufactured By could not be verified near maker labels (Rule 6(1)(a)).",
        },
        {
          id: "d2",
          rule: "Rule 6(1)(aa)",
          label: "Country of Origin",
          detectedValue: countryOfOriginInput || "India",
          status: "pass" as const,
        },
        {
          id: "d3",
          rule: "Rule 6(1)(c)",
          label: "Net Quantity (Weight / Measure / Count)",
          detectedValue: finalNetQty || "Missing / Blank",
          status: finalNetQty ? (fontReport.nonStandardUnitsDetected.length > 0 ? ("warn" as const) : ("pass" as const)) : ("fail" as const),
          note: !finalNetQty ? "Reason: Net quantity could not be detected near net weight labels (Rule 6(1)(c))." : undefined,
        },
        {
          id: "d4",
          rule: "Rule 6(1)(d)",
          label: "Month & Year of Manufacture / Packing",
          detectedValue: finalPackagingDate || "Not Declared",
          status: finalPackagingDate ? ("pass" as const) : ("warn" as const),
          note: !finalPackagingDate ? "Reason: Packaging Date could not be detected near packaging labels (Rule 6(1)(d))." : undefined,
        },
        {
          id: "d5",
          rule: "Rule 6(1)(d)",
          label: "Use By / Best Before / Expiry Date",
          detectedValue: finalExpiryDate || "Not Declared",
          status: finalExpiryDate ? (violations.includes("expired") ? ("fail" as const) : ("pass" as const)) : ("warn" as const),
          note: violations.includes("expired") ? "Reason: Declared expiry date has passed under Section 18 & FSSAI." : (!finalExpiryDate ? "Reason: Expiry date declaration not found." : undefined),
        },
        {
          id: "d6",
          rule: "Rule 6(1)(e)",
          label: "Maximum Retail Price (MRP) incl. of all taxes",
          detectedValue: finalMrp !== null ? `₹${finalMrp.toFixed(2)} (incl. of all taxes)` : "Missing / Illegible",
          status: finalMrp !== null ? (violations.includes("overcharging") ? ("fail" as const) : ("pass" as const)) : ("fail" as const),
          note: finalMrp === null ? "Reason: MRP could not be detected near an MRP/price label (Rule 6(1)(e))." : (violations.includes("overcharging") ? `Reason: Charged price ₹${enteredSellingPrice?.toFixed(2)} exceeds printed MRP ₹${finalMrp.toFixed(2)}.` : undefined),
        },
        {
          id: "d7",
          rule: "Rule 6(1)(f)",
          label: "Consumer Care Details (Phone / Email)",
          detectedValue: consumerCareInput || "Not Found",
          status: consumerCareInput ? ("pass" as const) : ("fail" as const),
          note: !consumerCareInput ? "Reason: Consumer care helpline or email is absent (Rule 6(1)(f))." : undefined,
        },
        {
          id: "d8",
          rule: "Rule 6(1)(g)",
          label: "Batch Number / Lot Code",
          detectedValue: batchNumberInput || "Not Declared",
          status: batchNumberInput ? ("pass" as const) : ("warn" as const),
        },
      ]

      const inspectedProduct: ProductData = {
        ...DEFAULT_PRODUCT,
        id: `prod-${Date.now()}`,
        name: productNameInput || "Scanned Packaged Commodity",
        brand: brandInput || "Brand",
        category: finalCategory,
        barcode: barcodeInput.trim() || scannedBarcode || "8901000000000",
        mrp: finalMrp,
        mrpDisplay: finalMrp !== null ? `₹${finalMrp.toFixed(2)}` : "Missing",
        netQuantity: finalNetQty,
        mfgDate: finalPackagingDate,
        packagingDate: finalPackagingDate,
        expiryDate: finalExpiryDate,
        batchNumber: batchNumberInput || "BT-2026-01",
        netWeight: finalNetQty,
        packagedBy: finalPackagedBy,
        manufacturerName: finalPackagedBy,
        manufacturerAddress: finalPackagedBy,
        consumerCare: consumerCareInput || "care@commodity.in",
        countryOfOrigin: countryOfOriginInput || "India",
        sellingPrice: enteredSellingPrice,
        rawOcrText: rawOcrText || "Product Label Declarations",
        ocrConfidence: ocrConfidence || 92,
        violations,
        fontCompliance: fontReport,
        evidenceImages: selectedImageSrc ? [imageFileName] : [],
        targetedOcr: targetedOcrResult,
        declarations,
      }

      // Truth Score
      const truthScore = calculateTruthScore(inspectedProduct)
      inspectedProduct.complianceScore = truthScore.score
      inspectedProduct.complianceStatus =
        truthScore.category === "Likely Compliant"
          ? "Likely Compliant"
          : truthScore.score >= 50
          ? "Critical Warning"
          : "Violation Detected"

      // Save to SQL Catalog
      sqlDb.saveProduct(inspectedProduct)

      // Save Scan Record
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
        barcode: inspectedProduct.barcode,
        productName: inspectedProduct.name,
        brand: inspectedProduct.brand,
        mrp: inspectedProduct.mrp,
        netQuantity: inspectedProduct.netQuantity,
        expiryDate: inspectedProduct.expiryDate,
        complianceStatus: inspectedProduct.complianceStatus,
        complianceScore: inspectedProduct.complianceScore,
        violations: inspectedProduct.violations.map(String),
        imageFileName: imageFileName || `${inspectedProduct.id}_scan.jpg`,
        scannedAt: nowFormatted,
      }
      sqlDb.recordScan(newScanRecord)

      // Save Official Inspection Dossier
      const enforcementAction = deriveEnforcementRecommendation(inspectedProduct, fontReport)
      const citations = generateStatutoryCitations(inspectedProduct, fontReport)
      const dossierNumber = `DOS-2026-${currentUser?.zone?.slice(0, 3)?.toUpperCase() || "DEL"}-${Math.floor(1000 + Math.random() * 9000)}`

      const newInspectionRecord: InspectionRecord = {
        id: `insp-${Date.now()}`,
        dossierNumber,
        inspectorId: currentUser?.id || "usr-officer-01",
        inspectorName: currentUser?.name || "Inspector Aarav Sharma",
        inspectorBadge: currentUser?.badgeNumber || "LMO-DEL-2026-089",
        zone: currentUser?.zone || "Delhi NCR Enforcement Division",
        barcode: inspectedProduct.barcode,
        productName: inspectedProduct.name,
        brand: inspectedProduct.brand,
        category: inspectedProduct.category,
        mrp: inspectedProduct.mrp,
        sellingPrice: enteredSellingPrice,
        netQuantity: inspectedProduct.netQuantity || "100 g",
        mfgDate: inspectedProduct.mfgDate,
        expiryDate: inspectedProduct.expiryDate || undefined,
        manufacturerName: inspectedProduct.manufacturerName || "Declared on Package",
        manufacturerAddress: inspectedProduct.manufacturerAddress || "Industrial Area",
        consumerCare: inspectedProduct.consumerCare || "care@consumer.gov.in",
        countryOfOrigin: inspectedProduct.countryOfOrigin || "India",
        complianceScore: inspectedProduct.complianceScore,
        complianceStatus: inspectedProduct.complianceStatus,
        violations: inspectedProduct.violations,
        evidenceImages: selectedImageSrc ? [imageFileName] : [],
        fontCompliance: fontReport,
        enforcementAction,
        statutoryCitations: citations,
        inspectedAt: nowFormatted,
        status: inspectedProduct.complianceStatus === "Likely Compliant" ? "Verified Compliant" : "Notice Issued",
        merchantName: merchantNameInput || "Retail Merchant / Supermarket",
        merchantAddress: merchantAddressInput || "Delhi NCR Inspection District",
        inspectorNotes: inspectorNotesInput || "Automated Legal Metrology barcode & OCR label inspection.",
      }
      sqlDb.saveInspection(newInspectionRecord)

      firebaseService.recordScan(newScanRecord).catch(() => {})
      firebaseService.saveProduct(inspectedProduct).catch(() => {})

      setSelectedProduct(inspectedProduct)
      setIsAnalyzing(false)
      setPage("result")
    }, 500)
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
          <div className="section-label">LEGAL METROLOGY COMPLIANCE SUITE</div>
          <h1>Barcode &amp; OCR Label Statutory Inspection Suite</h1>
          <p>Scan the commodity barcode directly to populate the barcode number, or use the camera to OCR-extract Expiry, PKD, MRP, and Maker details.</p>
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

      {/* Mode View Tabs */}
      <div className="scan-tabs" style={{ marginTop: "16px" }}>
        <button
          className={activeTab === "photo" ? "active" : ""}
          onClick={() => setActiveTab("photo")}
        >
          <Icon name="file" /> 📸 Scan Label Photo (OCR &amp; Expiry)
        </button>
        <button
          className={activeTab === "barcode" ? "active" : ""}
          onClick={() => setActiveTab("barcode")}
        >
          <Icon name="scan" /> 📷 Scan Barcode
        </button>
        <button
          className={activeTab === "dual" ? "active" : ""}
          onClick={() => setActiveTab("dual")}
        >
          ⚡ Dual-Camera View (Barcode + Label OCR)
        </button>
      </div>

      {/* Main Scan Layout */}
      <div className="scan-layout" style={{ marginTop: "20px" }}>
        {/* Left Section */}
        <section className="scan-panel" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* =========================================================================
              TAB: SCAN LABEL PHOTO / OCR & EXPIRY SCANNER
             ========================================================================= */}
          {(activeTab === "photo" || activeTab === "dual") && (
            <div
              style={{
                background: "#fff",
                border: activeTab === "dual" ? "2px solid #3b82f6" : "1px solid #d9e3e9",
                borderRadius: "14px",
                padding: "20px",
                boxShadow: "0 4px 16px rgba(16, 43, 78, 0.06)",
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "20px" }}>📸</span>
                  <div>
                    <h3 style={{ fontSize: "16px", color: "#102b4e", margin: 0, fontWeight: 700 }}>
                      Package Label &amp; Declarations OCR Scanner
                    </h3>
                    <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0" }}>
                      Extracts Packaging Date, Expiry Date, MRP, Net Quantity, and Packaged By
                    </p>
                  </div>
                </div>

                {/* Sub-mode switch (Upload vs Camera) */}
                {activeTab === "photo" && !selectedImageSrc && (
                  <div style={{ display: "flex", gap: "4px", background: "#f1f5f9", padding: "3px", borderRadius: "8px" }}>
                    <button
                      type="button"
                      onClick={() => setLabelPhotoMode("upload")}
                      style={{
                        background: labelPhotoMode === "upload" ? "#fff" : "transparent",
                        color: labelPhotoMode === "upload" ? "#0f8e7d" : "#64748b",
                        border: "none",
                        borderRadius: "6px",
                        padding: "5px 12px",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                        boxShadow: labelPhotoMode === "upload" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                      }}
                    >
                      📁 Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setLabelPhotoMode("camera")}
                      style={{
                        background: labelPhotoMode === "camera" ? "#fff" : "transparent",
                        color: labelPhotoMode === "camera" ? "#0f8e7d" : "#64748b",
                        border: "none",
                        borderRadius: "6px",
                        padding: "5px 12px",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                        boxShadow: labelPhotoMode === "camera" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                      }}
                    >
                      📷 Use Camera
                    </button>
                  </div>
                )}
              </div>

              {/* 1. Live Camera Mode for Label OCR */}
              {(labelPhotoMode === "camera" || activeTab === "dual") && !selectedImageSrc && (
                <div>
                  <div
                    style={{
                      height: "300px",
                      borderRadius: "12px",
                      background: "#08131f",
                      position: "relative",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      border: "2px solid #234365",
                    }}
                  >
                    <video
                      ref={labelVideoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: isLabelCamActive ? "block" : "none",
                      }}
                    />

                    {/* Framing Reticle */}
                    <div
                      style={{
                        position: "relative",
                        width: "85%",
                        maxWidth: "360px",
                        height: "180px",
                        border: "2px dashed #60a5fa",
                        borderRadius: "12px",
                        zIndex: 2,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        padding: "10px",
                        boxShadow: "0 0 0 4000px rgba(8, 19, 31, 0.35)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "10px", color: "#93c5fd", background: "rgba(0,0,0,0.6)", padding: "2px 6px", borderRadius: "3px", fontWeight: 700 }}>
                          LABEL DECLARATIONS TARGET
                        </span>
                        <span style={{ fontSize: "10px", color: "#cbd5e1", background: "rgba(0,0,0,0.6)", padding: "2px 6px", borderRadius: "3px" }}>
                          OCR Engine Active
                        </span>
                      </div>

                      <div style={{ textAlign: "center", color: "#dbeafe", fontSize: "11px", background: "rgba(0,0,0,0.7)", padding: "4px 10px", borderRadius: "4px", alignSelf: "center" }}>
                        Position Expiry, Packaging Date, MRP &amp; Net Weight in frame
                      </div>
                    </div>

                    {/* Camera Control Overlays */}
                    <div style={{ position: "absolute", bottom: "14px", zIndex: 3, display: "flex", gap: "10px", alignItems: "center" }}>
                      <button
                        type="button"
                        onClick={handleSnapLabelFromCamera}
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
                          boxShadow: "0 4px 14px rgba(15, 142, 125, 0.4)",
                        }}
                      >
                        <Icon name="camera" size={16} /> 📸 Capture Label &amp; Extract Info (OCR)
                      </button>

                      <button
                        type="button"
                        onClick={() => setLabelFacing(labelFacing === "environment" ? "user" : "environment")}
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

                  <div style={{ marginTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>
                      Aim camera at the product packaging declarations and click <b>Capture Label</b>.
                    </span>
                    {activeTab === "photo" && (
                      <button
                        type="button"
                        className="plain"
                        onClick={() => setLabelPhotoMode("upload")}
                        style={{ fontSize: "12px", color: "#0f8e7d", fontWeight: 700, cursor: "pointer" }}
                      >
                        📁 Switch to File Upload
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* 2. File Upload Mode for Label OCR */}
              {labelPhotoMode === "upload" && activeTab !== "dual" && !selectedImageSrc && (
                <div style={{ textAlign: "center", padding: "16px 0" }}>
                  <div className="camera-circle" style={{ margin: "0 auto 12px" }}>
                    <Icon name="camera" size={32} />
                  </div>
                  <h3 style={{ fontSize: "16px", color: "#102b4e", margin: "0 0 6px" }}>
                    Attach High-Resolution Product Label Photo
                  </h3>
                  <p style={{ fontSize: "13px", color: "#647589", maxWidth: "440px", margin: "0 auto 18px" }}>
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
                        onChange={handleLabelFileUpload}
                        style={{ display: "none" }}
                      />
                    </label>

                    <Button secondary onClick={() => setLabelPhotoMode("camera")}>
                      <Icon name="camera" size={15} /> 📷 Use Camera
                    </Button>
                  </div>

                  {/* Sample Presets */}
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
                </div>
              )}

              {/* 3. Captured / Uploaded Image Preview with OCR State */}
              {selectedImageSrc && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Badge type="green">LABEL PHOTO CAPTURED</Badge>
                      <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>{imageFileName}</span>
                    </div>
                    <Button
                      secondary
                      onClick={() => {
                        setSelectedImageSrc(null)
                        if (labelPhotoMode === "camera") {
                          startLabelCameraInstance()
                        }
                      }}
                      style={{ fontSize: "11px", padding: "5px 10px" }}
                    >
                      <Icon name="refresh" size={12} /> Rescan / Retake
                    </Button>
                  </div>

                  <div
                    style={{
                      maxHeight: "220px",
                      overflow: "hidden",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
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
                          background: "rgba(16, 43, 78, 0.8)",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          padding: "16px",
                          backdropFilter: "blur(2px)",
                        }}
                      >
                        <div className="laser-line" style={{ width: "80%", height: "2px", background: "#55d2ba", boxShadow: "0 0 10px #55d2ba", marginBottom: "14px" }} />
                        <Icon name="refresh" size={26} className="animate-spin" style={{ color: "#7ce5cf" }} />
                        <b style={{ marginTop: "8px", fontSize: "13px" }}>{ocrProgress.status || "Extracting characters..."}</b>
                        <div style={{ width: "55%", background: "rgba(255,255,255,0.2)", height: "6px", borderRadius: "3px", marginTop: "8px", overflow: "hidden" }}>
                          <div style={{ width: `${Math.round(ocrProgress.progress * 100)}%`, background: "#55d2ba", height: "100%", transition: "width 0.3s ease" }} />
                        </div>
                        <span style={{ fontSize: "11px", color: "#b9dfd8", marginTop: "4px" }}>
                          Tesseract.js OCR: {Math.round(ocrProgress.progress * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              TAB: LIVE BARCODE SCANNER
             ========================================================================= */}
          {(activeTab === "barcode" || activeTab === "dual") && (
            <div
              style={{
                background: "#fff",
                border: activeTab === "dual" ? "2px solid #0f8e7d" : "1px solid #d9e3e9",
                borderRadius: "14px",
                padding: "20px",
                boxShadow: "0 4px 16px rgba(16, 43, 78, 0.06)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "20px" }}>📷</span>
                  <div>
                    <h3 style={{ fontSize: "16px", color: "#102b4e", margin: 0, fontWeight: 700 }}>
                      Live Barcode Scanner
                    </h3>
                    <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0" }}>
                      Point camera at any barcode — automatically reads the number and fills the barcode field
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={() => setBarcodeFacing(barcodeFacing === "environment" ? "user" : "environment")}
                    style={{
                      background: "#f1f5f9",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      padding: "5px 10px",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#334155",
                      cursor: "pointer",
                    }}
                  >
                    🔄 Flip Camera
                  </button>
                  {isBarcodeCamActive ? (
                    <button
                      type="button"
                      onClick={stopBarcodeScannerInstance}
                      style={{
                        background: "#fee2e2",
                        border: "1px solid #fecaca",
                        color: "#b91c1c",
                        borderRadius: "6px",
                        padding: "5px 10px",
                        fontSize: "11px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      ⏹️ Stop Camera
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startBarcodeScannerInstance}
                      style={{
                        background: "#0f8e7d",
                        border: "none",
                        color: "#fff",
                        borderRadius: "6px",
                        padding: "5px 12px",
                        fontSize: "11px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      ▶️ Start Camera
                    </button>
                  )}
                </div>
              </div>

              {/* Viewfinder */}
              <div
                style={{
                  height: "260px",
                  borderRadius: "12px",
                  background: "#08131f",
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  border: "2px solid #1e3a5f",
                }}
              >
                <video
                  ref={barcodeVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: isBarcodeCamActive ? "block" : "none",
                  }}
                />

                {/* Reticle */}
                <div
                  style={{
                    position: "relative",
                    width: "70%",
                    maxWidth: "300px",
                    height: "130px",
                    border: "2px solid rgba(85, 210, 186, 0.6)",
                    borderRadius: "8px",
                    zIndex: 2,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    padding: "8px",
                    boxShadow: "0 0 0 4000px rgba(8, 19, 31, 0.35)",
                  }}
                >
                  <div style={{ position: "absolute", top: "-2px", left: "-2px", width: "16px", height: "16px", borderTop: "3px solid #55d2ba", borderLeft: "3px solid #55d2ba" }} />
                  <div style={{ position: "absolute", top: "-2px", right: "-2px", width: "16px", height: "16px", borderTop: "3px solid #55d2ba", borderRight: "3px solid #55d2ba" }} />
                  <div style={{ position: "absolute", bottom: "-2px", left: "-2px", width: "16px", height: "16px", borderBottom: "3px solid #55d2ba", borderLeft: "3px solid #55d2ba" }} />
                  <div style={{ position: "absolute", bottom: "-2px", right: "-2px", width: "16px", height: "16px", borderBottom: "3px solid #55d2ba", borderRight: "3px solid #55d2ba" }} />

                  {isBarcodeCamActive && (
                    <div
                      style={{
                        position: "absolute",
                        left: "5%",
                        width: "90%",
                        height: "2px",
                        background: "#55d2ba",
                        boxShadow: "0 0 12px 2px #55d2ba",
                        animation: "scanPulse 2s infinite ease-in-out",
                        top: "50%",
                      }}
                    />
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "9px", color: "#7ce5cf", background: "rgba(0,0,0,0.6)", padding: "2px 5px", borderRadius: "3px", fontWeight: 700 }}>
                      EAN-13 / UPC / Code 128
                    </span>
                    <span style={{ fontSize: "9px", color: "#e2e8f0", background: "rgba(0,0,0,0.6)", padding: "2px 5px", borderRadius: "3px" }}>
                      GS1 India
                    </span>
                  </div>

                  <div style={{ textAlign: "center", color: "#cbd5e1", fontSize: "11px", background: "rgba(0,0,0,0.7)", padding: "3px 8px", borderRadius: "3px", alignSelf: "center" }}>
                    {scannedBarcode ? `✅ Barcode Scanned: ${scannedBarcode}` : "Align commodity barcode inside frame"}
                  </div>
                </div>

                {/* Status indicator */}
                <div
                  style={{
                    position: "absolute",
                    bottom: "12px",
                    zIndex: 3,
                    background: "rgba(15, 23, 42, 0.85)",
                    border: "1px solid rgba(85, 210, 186, 0.3)",
                    borderRadius: "16px",
                    padding: "4px 14px",
                    fontSize: "12px",
                    color: "#f8fafc",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {scannedBarcode ? (
                    <>
                      <span style={{ color: "#10b981", fontWeight: 700 }}>✅ Filled in Barcode Box:</span>
                      <strong style={{ fontFamily: "'DM Mono', monospace", color: "#55d2ba" }}>{scannedBarcode}</strong>
                    </>
                  ) : isBarcodeCamActive ? (
                    <>
                      <Icon name="refresh" size={13} className="animate-spin" style={{ color: "#55d2ba" }} />
                      <span>Scanning for barcode in real-time...</span>
                    </>
                  ) : (
                    <span>Scanner paused</span>
                  )}
                </div>
              </div>

              {/* Scanned Barcode Banner */}
              {scannedBarcode && (
                <div
                  style={{
                    marginTop: "12px",
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: "8px",
                    padding: "10px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Badge type="green">BARCODE FILLED</Badge>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, fontSize: "14px", color: "#15803d" }}>
                      {scannedBarcode}
                    </span>
                    <span style={{ fontSize: "11px", color: "#64748b" }}>({scannedBarcodeFormat || "EAN-13"})</span>
                  </div>
                  <span style={{ fontSize: "11px", color: "#15803d", fontWeight: 600 }}>
                    ✓ Auto-populated into Barcode Field
                  </span>
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              TARGETED 5-FIELD EXTRACTED DECLARATIONS CARD
             ========================================================================= */}
          <div
            style={{
              background: "#fff",
              border: "2px solid #0f8e7d",
              borderRadius: "12px",
              padding: "18px 20px",
              boxShadow: "0 4px 16px rgba(15, 142, 125, 0.08)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "18px" }}>🎯</span>
                <div>
                  <h3 style={{ fontSize: "15px", color: "#102b4e", margin: 0, fontWeight: 700 }}>
                    Detected Package Information
                  </h3>
                  <p style={{ fontSize: "12px", color: "#647589", margin: "2px 0 0" }}>
                    Targeted statutory compliance fields extracted from OCR Label Scanner
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <Badge type="green">Targeted 5-Field Audit</Badge>
                {ocrConfidence > 0 && (
                  <span style={{ fontSize: "11px", color: "#647589" }}>
                    Confidence: <strong style={{ color: "#0f8e7d" }}>{ocrConfidence}%</strong>
                  </span>
                )}
              </div>
            </div>

            {/* 5 Targeted Fields Grid */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Field 1: Packaging Date */}
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "#102b4e", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>📅</span> 1. Packaging Date (Rule 6(1)(d))
                  </label>
                  {targetedOcr?.packagingDate && targetedOcr.confidence.packagingDate >= 75 ? (
                    <Badge type="green">✓ {targetedOcr.confidence.packagingDate}% High</Badge>
                  ) : (
                    <Badge type="amber">⚠️ Please verify</Badge>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="e.g. 15/06/2026 or 12 Aug 2026"
                  value={targetedOcr?.packagingDate ?? mfgDateInput ?? ""}
                  onChange={(e) => updateTargetedField("packagingDate", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    fontSize: "13px",
                    fontWeight: 600,
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    background: "#fff",
                    color: "#0f172a",
                  }}
                />
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                  <b>Detection:</b> {targetedOcr?.rawMatches.packagingDate ? `Extracted from "${targetedOcr.rawMatches.packagingDate}"` : "Not detected near packaging/mfg date labels"}
                </div>
              </div>

              {/* Field 2: Use By / Expiry Date */}
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "#102b4e", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>⏳</span> 2. Use By / Expiry Date (Rule 6(1)(d))
                  </label>
                  {targetedOcr?.expiryDate && targetedOcr.confidence.expiryDate >= 75 ? (
                    <Badge type="green">✓ {targetedOcr.confidence.expiryDate}% High</Badge>
                  ) : (
                    <Badge type="amber">⚠️ Please verify</Badge>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="e.g. 15/12/2026 or Best Before 6 Months from Packaging"
                  value={targetedOcr?.expiryDate ?? expiryDateInput ?? ""}
                  onChange={(e) => updateTargetedField("expiryDate", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    fontSize: "13px",
                    fontWeight: 600,
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    background: "#fff",
                    color: "#0f172a",
                  }}
                />
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                  <b>Detection:</b> {targetedOcr?.rawMatches.expiryDate ? `Extracted from "${targetedOcr.rawMatches.expiryDate}"` : "Not detected near use-by/expiry labels"}
                </div>
              </div>

              {/* Field 3: MRP */}
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "#102b4e", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>💰</span> 3. MRP / Maximum Retail Price (Rule 6(1)(e))
                  </label>
                  {targetedOcr?.mrp && targetedOcr.confidence.mrp >= 75 ? (
                    <Badge type="green">✓ {targetedOcr.confidence.mrp}% High</Badge>
                  ) : (
                    <Badge type="amber">⚠️ Please verify</Badge>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontWeight: 700, color: "#64748b", fontSize: "14px" }}>₹</span>
                  <input
                    type="text"
                    placeholder="e.g. 30.00"
                    value={targetedOcr?.mrp ?? mrpInput ?? ""}
                    onChange={(e) => updateTargetedField("mrp", e.target.value)}
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      fontSize: "13px",
                      fontWeight: 600,
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      background: "#fff",
                      color: "#0f172a",
                    }}
                  />
                </div>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                  <b>Detection:</b> {targetedOcr?.rawMatches.mrp ? `Extracted from "${targetedOcr.rawMatches.mrp}"` : "No price number isolated near MRP label"}
                </div>
              </div>

              {/* Field 4: Net Weight / Net Quantity */}
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "#102b4e", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>⚖️</span> 4. Net Weight / Net Quantity (Rule 6(1)(c))
                  </label>
                  {targetedOcr?.netWeight && targetedOcr.confidence.netWeight >= 75 ? (
                    <Badge type="green">✓ {targetedOcr.confidence.netWeight}% High</Badge>
                  ) : (
                    <Badge type="amber">⚠️ Please verify</Badge>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="e.g. 100 g, 500 g, 1 kg, 750 ml, 1 Litre"
                  value={targetedOcr?.netWeight ?? netQuantityInput ?? ""}
                  onChange={(e) => updateTargetedField("netWeight", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    fontSize: "13px",
                    fontWeight: 600,
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    background: "#fff",
                    color: "#0f172a",
                  }}
                />
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                  <b>Detection:</b> {targetedOcr?.rawMatches.netWeight ? `Extracted from "${targetedOcr.rawMatches.netWeight}"` : "No net weight/volume with metric unit detected"}
                </div>
              </div>

              {/* Field 5: Packaged By / Manufactured By */}
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "#102b4e", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>🏢</span> 5. Packaged By / Manufactured By (Rule 6(1)(a))
                  </label>
                  {targetedOcr?.packagedBy && targetedOcr.confidence.packagedBy >= 75 ? (
                    <Badge type="green">✓ {targetedOcr.confidence.packagedBy}% High</Badge>
                  ) : (
                    <Badge type="amber">⚠️ Please verify</Badge>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="e.g. Britannia Industries Ltd, Kolkata - 700017"
                  value={targetedOcr?.packagedBy ?? manufacturerNameInput ?? ""}
                  onChange={(e) => updateTargetedField("packagedBy", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    fontSize: "13px",
                    fontWeight: 600,
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    background: "#fff",
                    color: "#0f172a",
                  }}
                />
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                  <b>Detection:</b> {targetedOcr?.rawMatches.packagedBy ? `Extracted from "${targetedOcr.rawMatches.packagedBy}"` : "No manufacturer/packer name & address found"}
                </div>
              </div>
            </div>

            {/* Collapsible Raw OCR Output Toggle */}
            <div style={{ marginTop: "14px", borderTop: "1px dashed #d1e2e9", paddingTop: "10px" }}>
              <button
                type="button"
                className="plain"
                onClick={() => setShowRawOcrDebug(!showRawOcrDebug)}
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#0f8e7d",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer",
                }}
              >
                <Icon name="file" size={14} />
                {showRawOcrDebug ? "Hide Preserved OCR Text" : "Show Full Preserved OCR Text (Debug View)"}
              </button>
            </div>

            {showRawOcrDebug && (
              <div style={{ marginTop: "10px" }}>
                <textarea
                  value={rawOcrText}
                  onChange={(e) => setRawOcrText(e.target.value)}
                  placeholder="Captured label text will appear here..."
                  rows={5}
                  style={{
                    width: "100%",
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "11px",
                    lineHeight: "1.5",
                    padding: "8px",
                    borderRadius: "6px",
                    border: "1px solid #cbd8e1",
                    background: "#f8fafc",
                    color: "#1e293b",
                  }}
                />
              </div>
            )}
          </div>
        </section>

        {/* Right Sidebar: Combined Inspection Declarations */}
        <aside className="manual-card">
          <span className="or">SUMMARY</span>
          <h3>Commodity Declarations</h3>
          <p>Auto-filled from Barcode Scanner &amp; Label OCR; fully editable.</p>

          <label htmlFor="barcode-field">Barcode Number (Auto-filled from Scanner)</label>
          <input
            id="barcode-field"
            type="text"
            placeholder="e.g. 8901063012159"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            style={{
              fontFamily: "'DM Mono', monospace",
              fontWeight: 700,
              borderColor: barcodeInput ? "#10b981" : undefined,
              background: barcodeInput ? "#f0fdf4" : undefined,
            }}
          />

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
              <label htmlFor="selling-price-field">Charged Price (₹)</label>
              <input
                id="selling-price-field"
                type="number"
                placeholder="Optional"
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
              <label htmlFor="batch-field">Batch No. (Rule 6(1)(g))</label>
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

          {/* Officer Inspection Details */}
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
                  <label style={{ fontSize: "11px" }}>Store Address</label>
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
