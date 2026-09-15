import React, { useState, useEffect, useRef } from "react"
import { Page, ProductData, User, ScanRecord, InspectionRecord, ImageQualityReport, ExtractedEntities, TargetedOcrResult } from "../types"
import { Icon, Button, Badge } from "../components/Icons"
import { DEFAULT_PRODUCT, SAMPLE_PRODUCTS } from "../data/sampleProducts"
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

const SAMPLE_BARCODES = [
  { label: "Britannia Good Day", code: "8901063012159", note: "GS1 India Compliant" },
  { label: "Thums Up (750ml)", code: "8901764012211", note: "Overcharging Check" },
  { label: "Amul Taaza Milk", code: "8901262010057", note: "Expired Batch" },
  { label: "Unregistered Commodity", code: "8909999999999", note: "Test Unregistered State" },
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
            To perform live barcode inspections, Tesseract.js OCR label checks, and save audit records to the SQL database, please sign in with your account.
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

  // Primary scanning mode: "camera" | "photo" | "barcode"
  const [method, setMethod] = useState<"camera" | "photo" | "barcode">("camera")
  const [barcodeInput, setBarcodeInput] = useState<string>("")
  const [manualSearchQuery, setManualSearchQuery] = useState<string>("")
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
  const [targetedOcr, setTargetedOcr] = useState<TargetedOcrResult | null>(null)
  const [showRawOcrDebug, setShowRawOcrDebug] = useState<boolean>(false)

  // Multi-image state
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; side: string; dataUrl?: string }[]>([])

  // Live Camera & Barcode Scanner State
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const scannerControllerRef = useRef<BarcodeScannerController | null>(null)
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment")
  const [videoDevices, setVideoDevices] = useState<VideoDeviceOption[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("")

  // Barcode Detection & Lookup State
  const [detectedBarcode, setDetectedBarcode] = useState<string | null>(null)
  const [detectedBarcodeFormat, setDetectedBarcodeFormat] = useState<string>("")
  const [barcodeLookupState, setBarcodeLookupState] = useState<"idle" | "scanning" | "found" | "not_found">("scanning")
  const [scannedProductMatch, setScannedProductMatch] = useState<ProductData | null>(null)

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

  // Fetch available camera video devices on mount
  useEffect(() => {
    getAvailableVideoDevices().then((devs) => {
      setVideoDevices(devs)
      if (devs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(devs[0].deviceId)
      }
    })
  }, [])

  // Helper to populate form fields from matched product
  const populateFormWithProduct = (match: ProductData) => {
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

  // Handle detected barcode from live camera or manual lookup
  const handleBarcodeIdentified = (code: string, formatName: string) => {
    const cleanCode = code.trim()
    setDetectedBarcode(cleanCode)
    setDetectedBarcodeFormat(formatName || "EAN-13")
    setBarcodeInput(cleanCode)
    setManualSearchQuery(cleanCode)

    // Lookup in database
    const match = sqlDb.findProductByBarcode(cleanCode)
    if (match) {
      setScannedProductMatch(match)
      setBarcodeLookupState("found")
      populateFormWithProduct(match)
    } else {
      setScannedProductMatch(null)
      setBarcodeLookupState("not_found")
    }
  }

  // Live Camera Scanner Lifecycle
  useEffect(() => {
    if (method === "camera" && videoRef.current) {
      setCameraError(null)
      setIsCameraActive(true)
      setBarcodeLookupState("scanning")

      const controller = startLiveBarcodeScanner(
        videoRef.current,
        (result: BarcodeDetectionResult) => {
          handleBarcodeIdentified(result.rawValue, result.format)
        },
        (errMsg: string) => {
          setCameraError(errMsg)
          setIsCameraActive(false)
        },
        selectedDeviceId || undefined,
        cameraFacing
      )

      scannerControllerRef.current = controller

      return () => {
        controller.stop()
        scannerControllerRef.current = null
        setIsCameraActive(false)
      }
    } else {
      if (scannerControllerRef.current) {
        scannerControllerRef.current.stop()
        scannerControllerRef.current = null
      }
      setIsCameraActive(false)
    }
  }, [method, cameraFacing, selectedDeviceId])

  // Stop Camera explicitly
  const handleCloseCamera = () => {
    if (scannerControllerRef.current) {
      scannerControllerRef.current.stop()
      scannerControllerRef.current = null
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }
    setIsCameraActive(false)
    setBarcodeLookupState("idle")
  }

  // Restart / Reset Scanner
  const handleScanAgain = () => {
    setDetectedBarcode(null)
    setDetectedBarcodeFormat("")
    setScannedProductMatch(null)
    setBarcodeLookupState("scanning")
    if (method === "camera" && !isCameraActive && videoRef.current) {
      const controller = startLiveBarcodeScanner(
        videoRef.current,
        (result: BarcodeDetectionResult) => {
          handleBarcodeIdentified(result.rawValue, result.format)
        },
        (errMsg: string) => {
          setCameraError(errMsg)
          setIsCameraActive(false)
        },
        selectedDeviceId || undefined,
        cameraFacing
      )
      scannerControllerRef.current = controller
      setIsCameraActive(true)
    }
  }

  // Handle Manual Barcode Search
  const handleManualSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const query = (manualSearchQuery || barcodeInput).trim()
    if (!query) return

    const validation = validateBarcodeFormat(query)
    handleBarcodeIdentified(query, validation.format)
  }

  // Real-time SQL Barcode Matching for sidebar inputs
  useEffect(() => {
    if (barcodeInput && barcodeInput.trim().length >= 6) {
      const match = sqlDb.findProductByBarcode(barcodeInput.trim())
      if (match && (!scannedProductMatch || scannedProductMatch.barcode !== match.barcode)) {
        populateFormWithProduct(match)
      }
    }
  }, [barcodeInput])

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
    if (entities.barcode) {
      setBarcodeInput(entities.barcode)
      setManualSearchQuery(entities.barcode)
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

  // Handle Live OCR Text Edits in the Textarea
  const handleOcrTextChange = (newText: string) => {
    setRawOcrText(newText)
    const updatedTargeted = extractTargetedComplianceFields(newText, ocrConfidence)
    const updatedEntities = parseStatutoryEntities(newText)
    setExtractedEntities(updatedEntities)
    setTargetedOcr(updatedTargeted)
    syncEntitiesToForm(updatedEntities, updatedTargeted)
  }

  // Process an image with Quality check and Tesseract OCR
  const processImageForOcr = async (imageSrc: string, fileName: string) => {
    setSelectedImageSrc(imageSrc)
    setImageFileName(fileName)
    setIsOcrProcessing(true)
    setOcrProgress({ status: "Evaluating image quality & blur...", progress: 0.1 })

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

  // Handle Rescan / Retake in Photo mode
  const handleRescan = () => {
    setSelectedImageSrc(null)
    setRawOcrText("")
    setQualityReport(null)
    setExtractedEntities({})
    setTargetedOcr(null)
    setUploadedFiles([])
    setMethod("photo")
  }

  // Handle Sample Preset Selection
  const handleSelectPreset = (preset: typeof SAMPLE_PRESETS[0]) => {
    setSelectedImageSrc(preset.image)
    setImageFileName(`${preset.name.toLowerCase().replace(/\s+/g, "_")}.jpg`)
    setRawOcrText(preset.rawText)
    setOcrConfidence(96)
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

  // Handle Analyze Action & Persistence
  const handleAnalyse = () => {
    setIsAnalyzing(true)

    setTimeout(() => {
      // 1. Find product in DB or construct from custom inputs
      let matchedProduct = barcodeInput ? sqlDb.findProductByBarcode(barcodeInput.trim()) : null

      const finalCategory = isCustomCategory && customCategoryName.trim()
        ? customCategoryName.trim()
        : (selectedCategory || "Food & Beverages")

      // Extract final values prioritizing targeted OCR and user edits
      const finalPackagingDate = targetedOcr?.packagingDate || mfgDateInput || (matchedProduct?.mfgDate || "15 Jun 2026")
      const finalExpiryDate = targetedOcr?.expiryDate || expiryDateInput || (matchedProduct?.expiryDate || null)
      const finalMrp = targetedOcr?.mrp
        ? parseFloat(targetedOcr.mrp)
        : mrpInput
        ? parseFloat(mrpInput)
        : (matchedProduct?.mrp || null)
      const finalNetQty = targetedOcr?.netWeight || netQuantityInput || (matchedProduct?.netQuantity || "100 g")
      const finalPackagedBy = targetedOcr?.packagedBy || manufacturerNameInput || (matchedProduct?.manufacturerName || null)

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
          rawOcrText: rawOcrText || `Net Qty: ${finalNetQty}. MRP: ₹${finalMrp || 0} (inclusive of all taxes). Mfd by: ${finalPackagedBy || "Packer Details"}. Consumer care: ${consumerCareInput || "1800-000-000"}`,
        },
        detectedFontMm,
        pdpArea
      )

      const violations: any[] = []
      if (!fontReport.fontHeightCompliant) violations.push("font_size_violation")
      if (fontReport.nonStandardUnitsDetected.length > 0) violations.push("non_standard_units")
      if (finalMrp === null) violations.push("mrp_missing")
      if (!finalNetQty) violations.push("net_qty_missing")
      if (!finalPackagedBy && !matchedProduct?.manufacturerName) violations.push("manufacturer_missing")

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

      if (matchedProduct) {
        matchedProduct = {
          ...matchedProduct,
          name: productNameInput || matchedProduct.name,
          brand: brandInput || matchedProduct.brand,
          category: finalCategory,
          mrp: finalMrp,
          mrpDisplay: finalMrp !== null ? `₹${finalMrp.toFixed(2)}` : "Missing",
          netQuantity: finalNetQty,
          mfgDate: finalPackagingDate,
          packagingDate: finalPackagingDate,
          expiryDate: finalExpiryDate,
          batchNumber: batchNumberInput || matchedProduct.batchNumber,
          netWeight: finalNetQty,
          packagedBy: finalPackagedBy,
          manufacturerName: finalPackagedBy || matchedProduct.manufacturerName,
          manufacturerAddress: finalPackagedBy || matchedProduct.manufacturerAddress,
          consumerCare: consumerCareInput || matchedProduct.consumerCare,
          countryOfOrigin: countryOfOriginInput || matchedProduct.countryOfOrigin || "India",
          sellingPrice: enteredSellingPrice,
          rawOcrText: rawOcrText || matchedProduct.rawOcrText,
          ocrConfidence: ocrConfidence || matchedProduct.ocrConfidence || 95,
          violations: Array.from(new Set([...matchedProduct.violations, ...violations])),
          fontCompliance: fontReport,
          evidenceImages: uploadedFiles.map((f) => f.name),
          targetedOcr: targetedOcrResult,
          declarations,
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
          mrpDisplay: finalMrp !== null ? `₹${finalMrp.toFixed(2)}` : "Missing",
          netQuantity: finalNetQty,
          mfgDate: finalPackagingDate,
          packagingDate: finalPackagingDate,
          expiryDate: finalExpiryDate,
          batchNumber: batchNumberInput || "BT-2026-01",
          netWeight: finalNetQty,
          packagedBy: finalPackagedBy || "National Packagers Ltd",
          manufacturerName: finalPackagedBy || "National Packagers Ltd",
          manufacturerAddress: finalPackagedBy || "Industrial Area",
          consumerCare: consumerCareInput || "care@commodity.in",
          countryOfOrigin: countryOfOriginInput || "India",
          sellingPrice: enteredSellingPrice,
          rawOcrText: rawOcrText || "Product Label Declarations",
          ocrConfidence: ocrConfidence || 92,
          violations,
          fontCompliance: fontReport,
          evidenceImages: uploadedFiles.map((f) => f.name),
          targetedOcr: targetedOcrResult,
          declarations,
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
          <h1>Live Barcode &amp; OCR Statutory Inspection Suite</h1>
          <p>Scan packaged commodity barcodes instantly or inspect label declarations with targeted OCR under Legal Metrology Rules 2011.</p>
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
        {/* Left Scanning Panel */}
        <section className="scan-panel">
          {/* Tabs */}
          <div className="scan-tabs">
            <button
              className={method === "camera" ? "active" : ""}
              onClick={() => setMethod("camera")}
            >
              <Icon name="camera" /> 📷 Scan Barcode with Camera
            </button>
            <button
              className={method === "photo" ? "active" : ""}
              onClick={() => setMethod("photo")}
            >
              <Icon name="file" /> 🖼️ Upload Product Photo (OCR)
            </button>
            <button
              className={method === "barcode" ? "active" : ""}
              onClick={() => setMethod("barcode")}
            >
              <Icon name="scan" /> ⌨️ Enter Barcode Manually
            </button>
          </div>

          {/* ========================================================
              TAB 1: LIVE CAMERA BARCODE SCANNER MODE
             ======================================================== */}
          {method === "camera" && (
            <div style={{ padding: "16px 20px" }}>
              {/* Camera Header Toolbar */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Badge type="blue">LIVE BARCODE VIEWFINDER</Badge>
                  {isCameraActive && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#0f8e7d", fontWeight: 600 }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", animation: "pulse 1.5s infinite" }} />
                      Continuous Detection Active
                    </span>
                  )}
                </div>

                {/* Device Selector & Flip */}
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  {videoDevices.length > 1 && (
                    <select
                      value={selectedDeviceId}
                      onChange={(e) => setSelectedDeviceId(e.target.value)}
                      style={{
                        padding: "5px 10px",
                        fontSize: "12px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        background: "#fff",
                        color: "#1e293b",
                        maxWidth: "180px",
                      }}
                    >
                      {videoDevices.map((d) => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  )}

                  <button
                    type="button"
                    onClick={() => setCameraFacing(cameraFacing === "environment" ? "user" : "environment")}
                    style={{
                      background: "#f1f5f9",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      padding: "5px 10px",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#334155",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                    title="Flip between Rear and Front cameras"
                  >
                    🔄 Flip Cam
                  </button>

                  {isCameraActive ? (
                    <button
                      type="button"
                      onClick={handleCloseCamera}
                      style={{
                        background: "#fee2e2",
                        border: "1px solid #fecaca",
                        color: "#b91c1c",
                        borderRadius: "6px",
                        padding: "5px 10px",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      ⏹️ Close Camera
                    </button>
                  ) : (
                    <Button onClick={handleScanAgain} style={{ fontSize: "12px", padding: "5px 12px" }}>
                      ▶️ Start Camera
                    </Button>
                  )}
                </div>
              </div>

              {/* Viewfinder Window */}
              <div
                style={{
                  height: "360px",
                  borderRadius: "14px",
                  background: "#08131f",
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  overflow: "hidden",
                  border: "2px solid #1e3a5f",
                  boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
                }}
              >
                {/* Video Element */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: isCameraActive && !cameraError ? "block" : "none",
                  }}
                />

                {/* Dark Vignette / Framing Overlay */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "radial-gradient(ellipse at center, transparent 40%, rgba(8, 19, 31, 0.7) 100%)",
                    pointerEvents: "none",
                    zIndex: 1,
                  }}
                />

                {/* Scanning Frame Reticle */}
                <div
                  style={{
                    position: "relative",
                    width: "75%",
                    maxWidth: "340px",
                    height: "180px",
                    border: "2px solid rgba(85, 210, 186, 0.6)",
                    borderRadius: "12px",
                    zIndex: 2,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    padding: "10px",
                    boxShadow: "0 0 0 4000px rgba(8, 19, 31, 0.35)",
                  }}
                >
                  {/* Corner Targets */}
                  <div style={{ position: "absolute", top: "-2px", left: "-2px", width: "20px", height: "20px", borderTop: "4px solid #55d2ba", borderLeft: "4px solid #55d2ba", borderRadius: "4px 0 0 0" }} />
                  <div style={{ position: "absolute", top: "-2px", right: "-2px", width: "20px", height: "20px", borderTop: "4px solid #55d2ba", borderRight: "4px solid #55d2ba", borderRadius: "0 4px 0 0" }} />
                  <div style={{ position: "absolute", bottom: "-2px", left: "-2px", width: "20px", height: "20px", borderBottom: "4px solid #55d2ba", borderLeft: "4px solid #55d2ba", borderRadius: "0 0 0 4px" }} />
                  <div style={{ position: "absolute", bottom: "-2px", right: "-2px", width: "20px", height: "20px", borderBottom: "4px solid #55d2ba", borderRight: "4px solid #55d2ba", borderRadius: "0 0 4px 0" }} />

                  {/* Animated Laser Scan Beam */}
                  {isCameraActive && !detectedBarcode && (
                    <div
                      style={{
                        position: "absolute",
                        left: "5%",
                        width: "90%",
                        height: "2px",
                        background: "#55d2ba",
                        boxShadow: "0 0 14px 2px #55d2ba",
                        animation: "scanPulse 2s infinite ease-in-out",
                        top: "50%",
                      }}
                    />
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "10px", color: "#7ce5cf", background: "rgba(0,0,0,0.6)", padding: "2px 6px", borderRadius: "4px", fontWeight: 700 }}>
                      EAN-13 / UPC / Code 128
                    </span>
                    <span style={{ fontSize: "10px", color: "#e2e8f0", background: "rgba(0,0,0,0.6)", padding: "2px 6px", borderRadius: "4px" }}>
                      GS1 India
                    </span>
                  </div>

                  <div style={{ textAlign: "center", color: "#cbd5e1", fontSize: "11px", background: "rgba(0,0,0,0.7)", padding: "4px 8px", borderRadius: "4px", alignSelf: "center" }}>
                    {detectedBarcode ? `Target Locked` : `Align commodity barcode inside frame`}
                  </div>
                </div>

                {/* Status Indicator */}
                <div
                  style={{
                    position: "absolute",
                    bottom: "16px",
                    zIndex: 3,
                    background: "rgba(15, 23, 42, 0.85)",
                    border: "1px solid rgba(85, 210, 186, 0.4)",
                    borderRadius: "20px",
                    padding: "6px 16px",
                    fontSize: "12px",
                    color: "#f8fafc",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    backdropFilter: "blur(4px)",
                  }}
                >
                  {detectedBarcode ? (
                    <>
                      <span style={{ color: "#10b981", fontWeight: 700 }}>✅ Barcode detected:</span>
                      <strong style={{ fontFamily: "'DM Mono', monospace", color: "#55d2ba", letterSpacing: "1px" }}>{detectedBarcode}</strong>
                    </>
                  ) : isCameraActive ? (
                    <>
                      <Icon name="refresh" size={14} className="animate-spin" style={{ color: "#55d2ba" }} />
                      <span>Scanning for barcode...</span>
                    </>
                  ) : (
                    <span>Camera is paused. Click "Start Camera" to scan.</span>
                  )}
                </div>

                {/* Camera Permission / Error Fallback */}
                {cameraError && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(15, 23, 42, 0.95)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "20px",
                      textAlign: "center",
                      zIndex: 10,
                    }}
                  >
                    <Icon name="alert" size={36} style={{ color: "#f87171", marginBottom: "10px" }} />
                    <h3 style={{ fontSize: "16px", color: "#f8fafc", margin: "0 0 6px" }}>Camera Access Note</h3>
                    <p style={{ fontSize: "12px", color: "#94a3b8", maxWidth: "380px", margin: "0 0 16px" }}>
                      {cameraError}
                    </p>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <Button onClick={handleScanAgain} style={{ fontSize: "12px" }}>
                        Retry Camera
                      </Button>
                      <Button secondary onClick={() => setMethod("barcode")} style={{ fontSize: "12px" }}>
                        Enter Barcode Manually
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* ========================================================
                  DETECTED BARCODE PRODUCT IDENTIFICATION CARDS
                 ======================================================== */}
              {detectedBarcode && (
                <div style={{ marginTop: "16px" }}>
                  {barcodeLookupState === "found" && scannedProductMatch ? (
                    /* Product Found in Database Card */
                    <div
                      style={{
                        background: "#f0fdf4",
                        border: "2px solid #22c55e",
                        borderRadius: "12px",
                        padding: "16px 20px",
                        boxShadow: "0 4px 16px rgba(34, 197, 94, 0.12)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#dcfce7", color: "#15803d", display: "grid", placeItems: "center" }}>
                            <Icon name="check" size={20} />
                          </div>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <Badge type="green">✅ PRODUCT FOUND IN MASTER DATABASE</Badge>
                              <span style={{ fontSize: "11px", color: "#64748b" }}>{detectedBarcodeFormat}</span>
                            </div>
                            <h3 style={{ fontSize: "17px", color: "#0f172a", margin: "4px 0 2px", fontWeight: 700 }}>
                              {scannedProductMatch.name}
                            </h3>
                            <p style={{ fontSize: "12px", color: "#475569", margin: 0 }}>
                              Brand: <b>{scannedProductMatch.brand}</b> · Category: <b>{scannedProductMatch.category}</b>
                            </p>
                          </div>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: "11px", color: "#64748b" }}>Barcode Number</span>
                          <div style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, fontSize: "14px", color: "#0f172a" }}>
                            {scannedProductMatch.barcode}
                          </div>
                        </div>
                      </div>

                      {/* Mini Key Attributes Pill Row */}
                      <div style={{ display: "flex", gap: "10px", marginTop: "12px", flexWrap: "wrap" }}>
                        <div style={{ background: "#fff", border: "1px solid #bbf7d0", borderRadius: "6px", padding: "6px 12px", fontSize: "12px" }}>
                          <span style={{ color: "#64748b" }}>Declared MRP:</span> <b>₹{scannedProductMatch.mrp?.toFixed(2) || "N/A"}</b>
                        </div>
                        <div style={{ background: "#fff", border: "1px solid #bbf7d0", borderRadius: "6px", padding: "6px 12px", fontSize: "12px" }}>
                          <span style={{ color: "#64748b" }}>Net Quantity:</span> <b>{scannedProductMatch.netQuantity || "100 g"}</b>
                        </div>
                        <div style={{ background: "#fff", border: "1px solid #bbf7d0", borderRadius: "6px", padding: "6px 12px", fontSize: "12px" }}>
                          <span style={{ color: "#64748b" }}>Manufacturer:</span> <b>{scannedProductMatch.manufacturerName?.slice(0, 30)}...</b>
                        </div>
                      </div>

                      {/* Action CTA Buttons */}
                      <div style={{ display: "flex", gap: "10px", marginTop: "14px", alignItems: "center", flexWrap: "wrap" }}>
                        <Button
                          onClick={handleAnalyse}
                          style={{
                            background: "#0f8e7d",
                            color: "#fff",
                            padding: "10px 18px",
                            fontSize: "13px",
                            fontWeight: 700,
                            boxShadow: "0 2px 8px rgba(15, 142, 125, 0.3)",
                          }}
                        >
                          Proceed to Compliance Inspection <Icon name="arrow" size={15} />
                        </Button>
                        <Button secondary onClick={handleScanAgain} style={{ fontSize: "12px", padding: "10px 14px" }}>
                          <Icon name="refresh" size={14} /> Scan Another Barcode
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Product Not Found in Database Card (Unregistered Commodity Notification) */
                    <div
                      style={{
                        background: "#fffbeb",
                        border: "2px solid #f59e0b",
                        borderRadius: "12px",
                        padding: "16px 20px",
                        boxShadow: "0 4px 16px rgba(245, 158, 11, 0.12)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                        <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#fef3c7", color: "#b45309", display: "grid", placeItems: "center", flexShrink: 0 }}>
                          <Icon name="alert" size={20} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <Badge type="amber">⚠️ PRODUCT NOT FOUND IN DATABASE</Badge>
                            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "12px", fontWeight: 700, color: "#92400e" }}>
                              Barcode: {detectedBarcode}
                            </span>
                          </div>

                          <h3 style={{ fontSize: "15px", color: "#78350f", margin: "6px 0 4px", fontWeight: 700 }}>
                            Unregistered Commodity Detected
                          </h3>

                          <p style={{ fontSize: "13px", color: "#92400e", lineHeight: "1.5", margin: "0 0 12px" }}>
                            This product barcode (<b>{detectedBarcode}</b>) is not yet registered in the central PackSure master catalog.
                            <br />
                            <span style={{ fontSize: "12px", color: "#78350f" }}>
                              ℹ️ <i>Note: An unregistered barcode is <b>not</b> an automatic legal metrology violation. Please scan the label text using OCR or enter the declarations manually.</i>
                            </span>
                          </p>

                          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                            <Button
                              onClick={() => {
                                setMethod("photo")
                                setBarcodeInput(detectedBarcode)
                              }}
                              style={{ fontSize: "12px", padding: "8px 16px" }}
                            >
                              <Icon name="file" size={14} /> Scan Label with OCR
                            </Button>
                            <Button
                              secondary
                              onClick={() => {
                                const inputEl = document.getElementById("product-name-field")
                                if (inputEl) inputEl.focus()
                              }}
                              style={{ fontSize: "12px", padding: "8px 14px" }}
                            >
                              ✏️ Enter Details Manually
                            </Button>
                            <Button secondary onClick={handleScanAgain} style={{ fontSize: "12px", padding: "8px 12px" }}>
                              <Icon name="refresh" size={13} /> Scan Again
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Quick Sample Barcodes Helper */}
              <div style={{ marginTop: "20px", borderTop: "1px dashed #d8e3ea", paddingTop: "14px" }}>
                <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                  Test with catalog product barcodes:
                </span>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
                  {SAMPLE_BARCODES.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleBarcodeIdentified(item.code, "EAN-13")}
                      style={{
                        background: "#f1f5f9",
                        border: "1px solid #cbd5e1",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        color: "#1e293b",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span>🏷️</span>
                      <b>{item.label}</b>
                      <code style={{ fontSize: "10px", color: "#0f8e7d" }}>({item.code})</code>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 2: UPLOAD PRODUCT PHOTO (TARGETED OCR) MODE
             ======================================================== */}
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
                      <Icon name="camera" size={15} /> 📷 Use Live Barcode Camera
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

          {/* ========================================================
              TAB 3: MANUAL BARCODE ENTRY & LOOKUP MODE
             ======================================================== */}
          {method === "barcode" && (
            <div style={{ padding: "24px 20px" }}>
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <Icon name="scan" size={20} style={{ color: "#0f8e7d" }} />
                  <h3 style={{ fontSize: "16px", color: "#102b4e", margin: 0, fontWeight: 700 }}>
                    Enter Barcode Manually
                  </h3>
                </div>
                <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 16px" }}>
                  Type an 8–14 digit EAN / UPC barcode to instantly retrieve registered commodity specifications.
                </p>

                <form onSubmit={handleManualSearch} style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <input
                    type="text"
                    placeholder="Enter 13-digit EAN (e.g. 8901063012159)"
                    value={manualSearchQuery}
                    onChange={(e) => {
                      setManualSearchQuery(e.target.value)
                      setBarcodeInput(e.target.value)
                    }}
                    style={{
                      flex: 1,
                      minWidth: "240px",
                      padding: "10px 14px",
                      fontSize: "14px",
                      fontFamily: "'DM Mono', monospace",
                      fontWeight: 600,
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                    }}
                  />
                  <Button type="submit" style={{ padding: "10px 20px" }}>
                    <Icon name="search" size={16} /> Search Product
                  </Button>
                </form>

                {/* Quick Presets */}
                <div style={{ marginTop: "16px", display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 700 }}>Sample Presets:</span>
                  {SAMPLE_BARCODES.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleBarcodeIdentified(item.code, "EAN-13")}
                      style={{
                        background: "#fff",
                        border: "1px solid #cbd5e1",
                        padding: "4px 10px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        color: "#1e293b",
                        cursor: "pointer",
                      }}
                    >
                      {item.label} ({item.code.slice(-5)})
                    </button>
                  ))}
                </div>
              </div>

              {/* Display Lookup Results for Manual Mode */}
              {detectedBarcode && (
                <div style={{ marginTop: "16px" }}>
                  {barcodeLookupState === "found" && scannedProductMatch ? (
                    <div
                      style={{
                        background: "#f0fdf4",
                        border: "2px solid #22c55e",
                        borderRadius: "12px",
                        padding: "16px 20px",
                      }}
                    >
                      <Badge type="green">✅ PRODUCT FOUND IN MASTER DATABASE</Badge>
                      <h3 style={{ fontSize: "17px", color: "#0f172a", margin: "6px 0 2px", fontWeight: 700 }}>
                        {scannedProductMatch.name}
                      </h3>
                      <p style={{ fontSize: "12px", color: "#475569", margin: "0 0 10px" }}>
                        Brand: <b>{scannedProductMatch.brand}</b> · MRP: <b>₹{scannedProductMatch.mrp?.toFixed(2)}</b> · Net Qty: <b>{scannedProductMatch.netQuantity}</b>
                      </p>
                      <Button onClick={handleAnalyse} style={{ fontSize: "12px", padding: "8px 16px" }}>
                        Proceed to Compliance Inspection <Icon name="arrow" size={14} />
                      </Button>
                    </div>
                  ) : (
                    <div
                      style={{
                        background: "#fffbeb",
                        border: "2px solid #f59e0b",
                        borderRadius: "12px",
                        padding: "16px 20px",
                      }}
                    >
                      <Badge type="amber">⚠️ PRODUCT NOT FOUND</Badge>
                      <h3 style={{ fontSize: "15px", color: "#78350f", margin: "6px 0 4px", fontWeight: 700 }}>
                        Unregistered Commodity ({detectedBarcode})
                      </h3>
                      <p style={{ fontSize: "12px", color: "#92400e", margin: "0 0 10px" }}>
                        This product is not registered in the database. Please scan the label text using OCR or enter the details manually. (Not an automatic violation).
                      </p>
                      <Button onClick={() => setMethod("photo")} style={{ fontSize: "12px", padding: "8px 14px" }}>
                        <Icon name="file" size={14} /> Scan Label with OCR
                      </Button>
                    </div>
                  )}
                </div>
              )}
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

          {/* Dedicated "Detected Package Information" Card (5 Targeted Fields) */}
          <div
            style={{
              marginTop: "16px",
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
                    Targeted statutory compliance extraction for packaged commodities
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

            <div
              style={{
                background: "#f0f8f6",
                border: "1px solid #cce8e2",
                borderRadius: "8px",
                padding: "8px 12px",
                fontSize: "12px",
                color: "#08705a",
                marginBottom: "14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Icon name="shield" size={15} style={{ color: "#0f8e7d", flexShrink: 0 }} />
              <span>
                OCR targets <b>only</b> the 5 mandatory compliance fields. Fields with <b style={{ color: "#b45309" }}>⚠️ Please verify</b> indicate low confidence (&lt;75%) or missing values; you can edit them directly below before generating the report.
              </span>
            </div>

            {/* 5 Targeted Fields Grid */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Field 1: Packaging Date */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "12px 14px",
                }}
              >
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
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "12px 14px",
                }}
              >
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
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "12px 14px",
                }}
              >
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
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "12px 14px",
                }}
              >
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
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "12px 14px",
                }}
              >
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
                  <b>Detection:</b> {targetedOcr?.rawMatches.packagedBy ? `Extracted from "${targetedOcr.rawMatches.packagedBy}"` : "No manufacturer/packer name & address found (Marketed By excluded)"}
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
                {showRawOcrDebug ? "Hide Full Preserved OCR Text" : "Show Full Preserved OCR Text (Debug View)"}
              </button>
            </div>

            {/* Raw Preserved OCR Text Panel (Collapsible) */}
            {showRawOcrDebug && (
              <div style={{ marginTop: "10px" }}>
                <p style={{ fontSize: "11px", color: "#647589", margin: "0 0 6px" }}>
                  Full recognized text preserving line breaks and structure. Edits here will re-trigger targeted parser.
                </p>
                <textarea
                  value={rawOcrText}
                  onChange={(e) => handleOcrTextChange(e.target.value)}
                  placeholder="Captured label text will appear here with line breaks preserved..."
                  rows={6}
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
                    resize: "vertical",
                  }}
                />
              </div>
            )}
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
          <p>Auto-filled from barcode or OCR; fully editable by user/inspector.</p>

          <label htmlFor="barcode-field">Barcode number (8–14 digits)</label>
          <input
            id="barcode-field"
            type="text"
            placeholder="e.g. 8901063012159"
            value={barcodeInput}
            onChange={(e) => {
              setBarcodeInput(e.target.value)
              setManualSearchQuery(e.target.value)
            }}
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
