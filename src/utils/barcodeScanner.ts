import { BrowserMultiFormatReader } from "@zxing/browser"
import { BarcodeFormat, DecodeHintType } from "@zxing/library"

export interface BarcodeDetectionResult {
  rawValue: string
  format: string
  timestamp: number
  isIndianEan13?: boolean
}

export interface BarcodeValidationResult {
  isValid: boolean
  format: string
  isIndianEan13: boolean
  error?: string
}

export interface VideoDeviceOption {
  deviceId: string
  label: string
}

// Check EAN-13 modulo 10 checksum
export function validateEan13Checksum(code: string): boolean {
  if (!/^\d{13}$/.test(code)) return false
  const digits = code.split("").map(Number)
  const checkDigit = digits[12]
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += i % 2 === 0 ? digits[i] : digits[i] * 3
  }
  const calculatedCheck = (10 - (sum % 10)) % 10
  return calculatedCheck === checkDigit
}

// Validate any detected barcode string
export function validateBarcodeFormat(raw: string): BarcodeValidationResult {
  const code = raw.trim()
  if (!code) {
    return { isValid: false, format: "Unknown", isIndianEan13: false, error: "Barcode cannot be empty" }
  }

  // EAN-13
  if (/^\d{13}$/.test(code)) {
    const isIndian = code.startsWith("890")
    const checksumValid = validateEan13Checksum(code)
    return {
      isValid: true,
      format: isIndian ? "EAN-13 (GS1 India)" : "EAN-13",
      isIndianEan13: isIndian,
      error: checksumValid ? undefined : "Note: Checksum warning on EAN-13 code",
    }
  }

  // EAN-8
  if (/^\d{8}$/.test(code)) {
    return {
      isValid: true,
      format: "EAN-8",
      isIndianEan13: false,
    }
  }

  // UPC-A (12 digits)
  if (/^\d{12}$/.test(code)) {
    return {
      isValid: true,
      format: "UPC-A",
      isIndianEan13: false,
    }
  }

  // UPC-E (6-8 digits)
  if (/^\d{6,8}$/.test(code)) {
    return {
      isValid: true,
      format: "UPC-E",
      isIndianEan13: false,
    }
  }

  // Code 128 / Code 39 / Alphanumeric barcodes
  if (/^[A-Za-z0-9\-\.\ \$\/\+\%]{4,30}$/.test(code)) {
    return {
      isValid: true,
      format: "Code 128 / Code 39",
      isIndianEan13: false,
    }
  }

  return {
    isValid: code.length >= 4,
    format: "Generic Barcode",
    isIndianEan13: false,
  }
}

// Web Audio API beep generator for barcode scan confirmation
export function playScanSuccessBeep() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = "sine"
    osc.frequency.setValueAtTime(1200, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.12)

    gain.gain.setValueAtTime(0.18, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + 0.16)
  } catch {
    // Ignore audio permission or browser restriction errors
  }
}

// Haptic feedback for mobile devices
export function triggerHapticFeedback() {
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([60, 40, 60])
    }
  } catch {}
}

// Enumerate available video camera inputs
export async function getAvailableVideoDevices(): Promise<VideoDeviceOption[]> {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return []
    }
    const devices = await navigator.mediaDevices.enumerateDevices()
    const videoInputs = devices.filter((d) => d.kind === "videoinput")
    return videoInputs.map((d, index) => ({
      deviceId: d.deviceId,
      label: d.label || `Camera ${index + 1} (${d.deviceId.slice(0, 5)}...)`,
    }))
  } catch (err) {
    console.warn("Could not enumerate camera devices:", err)
    return []
  }
}

export interface BarcodeScannerController {
  stop: () => void
  switchCamera: (deviceId?: string, facing?: "environment" | "user") => Promise<void>
}

/**
 * Initializes a continuous live barcode scanner attached to an HTMLVideoElement.
 * Tries Native BarcodeDetector first, falling back to ZXing MultiFormatReader.
 */
export function startLiveBarcodeScanner(
  videoElement: HTMLVideoElement,
  onDetected: (result: BarcodeDetectionResult) => void,
  onError: (errorMsg: string) => void,
  preferredDeviceId?: string,
  preferredFacingMode: "environment" | "user" = "environment"
): BarcodeScannerController {
  let isRunning = true
  let currentStream: MediaStream | null = null
  let zxingReader: BrowserMultiFormatReader | null = null
  let nativeDetector: any = null
  let animationFrameId: number | null = null
  let intervalId: any = null
  let isDetecting = false
  let lastDetectedCode = ""
  let lastDetectedTime = 0

  // Check if Native BarcodeDetector is available in window
  const hasNativeBarcodeDetector = typeof window !== "undefined" && "BarcodeDetector" in window

  const setupHints = () => {
    const hints = new Map()
    const formats = [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.ITF,
      BarcodeFormat.QR_CODE,
      BarcodeFormat.DATA_MATRIX,
    ]
    hints.set(DecodeHintType.POSSIBLE_FORMATS, formats)
    hints.set(DecodeHintType.TRY_HARDER, true)
    return hints
  }

  const handleSuccessfulDetection = (rawValue: string, formatName: string) => {
    const now = Date.now()
    const trimmed = rawValue.trim()
    if (!trimmed) return

    // Debounce duplicate reads within 2 seconds
    if (trimmed === lastDetectedCode && now - lastDetectedTime < 2000) {
      return
    }

    lastDetectedCode = trimmed
    lastDetectedTime = now

    playScanSuccessBeep()
    triggerHapticFeedback()

    const validation = validateBarcodeFormat(trimmed)
    onDetected({
      rawValue: trimmed,
      format: validation.format || formatName,
      timestamp: now,
      isIndianEan13: validation.isIndianEan13,
    })
  }

  const startStream = async (deviceId?: string, facing: "environment" | "user" = "environment") => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported on this browser.")
      }

      // Stop existing tracks if any
      if (currentStream) {
        currentStream.getTracks().forEach((t) => t.stop())
        currentStream = null
      }

      const videoConstraints: MediaTrackConstraints = (deviceId && deviceId.trim().length > 0)
        ? { deviceId: { exact: deviceId } }
        : {
            facingMode: { ideal: facing },
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
          }

      const constraints: MediaStreamConstraints = {
        video: videoConstraints,
        audio: false,
      }

      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints)
      } catch (e) {
        // Fallback constraint if exact deviceId or high resolution fails
        console.warn("Primary camera constraint failed, attempting fallback:", e)
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing },
          audio: false,
        })
      }

      currentStream = stream
      videoElement.srcObject = stream
      await videoElement.play()

      // Initialize scanner loop
      if (hasNativeBarcodeDetector) {
        try {
          const supportedFormats = [
            "ean_13",
            "ean_8",
            "upc_a",
            "upc_e",
            "code_128",
            "code_39",
            "itf",
            "qr_code",
          ]
          nativeDetector = new (window as any).BarcodeDetector({ formats: supportedFormats })
          runNativeScanningLoop()
          return
        } catch (e) {
          console.warn("Native BarcodeDetector initialization failed, using ZXing:", e)
        }
      }

      // Fallback to ZXing BrowserMultiFormatReader
      runZxingScanningLoop()
    } catch (err: any) {
      if (isRunning) {
        console.error("Camera startup error:", err)
        onError(
          err.name === "NotAllowedError"
            ? "Camera permission was denied. Please allow camera access in your browser."
            : `Could not access camera: ${err.message || "Device unavailable"}`
        )
      }
    }
  }

  const runNativeScanningLoop = () => {
    const scanFrame = async () => {
      if (!isRunning) return

      if (videoElement.readyState >= 2 && !isDetecting) {
        isDetecting = true
        try {
          const barcodes = await nativeDetector.detect(videoElement)
          if (barcodes && barcodes.length > 0) {
            const bc = barcodes[0]
            if (bc.rawValue) {
              handleSuccessfulDetection(bc.rawValue, bc.format || "Barcode")
            }
          }
        } catch {
          // Frame decode skip
        } finally {
          isDetecting = false
        }
      }

      if (isRunning) {
        animationFrameId = requestAnimationFrame(scanFrame)
      }
    }

    animationFrameId = requestAnimationFrame(scanFrame)
  }

  const runZxingScanningLoop = () => {
    try {
      const hints = setupHints()
      zxingReader = new BrowserMultiFormatReader(hints, 250)

      // Use canvas snapshot frame scanning for maximum reliability across browsers
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d", { willReadFrequently: true })

      intervalId = setInterval(async () => {
        if (!isRunning || !videoElement || videoElement.readyState < 2 || isDetecting) return

        isDetecting = true
        try {
          canvas.width = videoElement.videoWidth || 640
          canvas.height = videoElement.videoHeight || 480
          if (ctx && canvas.width > 0 && canvas.height > 0) {
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
            const result = await zxingReader?.decodeFromCanvas(canvas)
            if (result && result.getText()) {
              handleSuccessfulDetection(result.getText(), result.getBarcodeFormat() ? String(result.getBarcodeFormat()) : "EAN / Barcode")
            }
          }
        } catch {
          // No barcode found in current frame, normal behavior for continuous scanner
        } finally {
          isDetecting = false
        }
      }, 200)
    } catch (err: any) {
      console.error("ZXing loop initialization error:", err)
    }
  }

  // Begin stream
  startStream(preferredDeviceId, preferredFacingMode)

  return {
    stop: () => {
      isRunning = false
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId)
        animationFrameId = null
      }
      if (intervalId !== null) {
        clearInterval(intervalId)
        intervalId = null
      }
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop())
        currentStream = null
      }
      if (videoElement) {
        videoElement.srcObject = null
      }
    },
    switchCamera: async (newDeviceId?: string, facing?: "environment" | "user") => {
      await startStream(newDeviceId, facing || preferredFacingMode)
    },
  }
}
