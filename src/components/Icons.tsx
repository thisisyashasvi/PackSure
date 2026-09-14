import React from "react"

export type IconName =
  | "scan"
  | "file"
  | "shield"
  | "arrow"
  | "camera"
  | "upload"
  | "check"
  | "alert"
  | "search"
  | "grid"
  | "box"
  | "chart"
  | "settings"
  | "map"
  | "phone"
  | "clock"
  | "user"
  | "chevron"
  | "download"
  | "share"
  | "refresh"
  | "help"
  | "close"
  | "printer"
  | "sparkles"
  | "eye"
  | "filter"
  | "menu"
  | "external"
  | "info"

interface IconProps {
  name: IconName
  size?: number
  className?: string
  style?: React.CSSProperties
}

export const Icon: React.FC<IconProps> = ({ name, size = 20, className = "", style }) => {
  const paths: Record<IconName, string> = {
    scan: "M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2M8 8v8M11 8v8M14 8v8M17 8v8",
    file: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5",
    shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM8.5 12l2.3 2.3 4.7-4.7",
    arrow: "M5 12h14M13 6l6 6-6 6",
    camera: "M4 7h3l1.5-2h7L17 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
    upload: "M12 16V4M7 9l5-5 5 5M5 20h14",
    check: "M5 12l4 4L19 6",
    alert: "M10.3 3.1 2.2 17a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.1a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01",
    search: "m21 21-4.35-4.35M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4z",
    grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
    box: "m21 8-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8",
    chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
    settings: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.3 2.3-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-3.2v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-2.3-2.3.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H4.7v-3.2h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9L6 7.7l2.3-2.3.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5v-.2h3.2v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 8l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2v3.2h-.2a1.7 1.7 0 0 0-1.5 1z",
    map: "M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0zM12 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
    phone: "M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 19h2",
    clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2",
    user: "M20 21a8 8 0 0 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
    chevron: "m9 18 6-6-6-6",
    download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
    share: "M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13",
    refresh: "M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2",
    help: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01",
    close: "M18 6L6 18M6 6l12 12",
    printer: "M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z",
    sparkles: "M12 3l1.9 4.8L19 9.7l-3.8 3.7.9 5.3-4.1-2.2-4.1 2.2.9-5.3L5 9.7l5.1-1.9z",
    eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    filter: "M22 3H2l8 9.46V19l4 2v-8.54L22 3z",
    menu: "M3 12h18M3 6h18M3 18h18",
    external: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3",
    info: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01",
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path d={paths[name] || paths.shield} />
    </svg>
  )
}

export const Logo: React.FC<{ size?: number; showSubtitle?: boolean }> = ({ showSubtitle = false }) => (
  <div className="logo" style={{ cursor: "pointer" }}>
    <span className="logo-mark">
      <Icon name="shield" size={19} />
    </span>
    <span>
      Pack<span>Sure</span>
    </span>
    {showSubtitle && (
      <span className="badge blue" style={{ fontSize: "9px", padding: "2px 6px", marginLeft: "4px" }}>
        SIH 2026
      </span>
    )}
  </div>
)

export const Button: React.FC<{
  children: React.ReactNode
  onClick?: () => void
  secondary?: boolean
  className?: string
  type?: "button" | "submit" | "reset"
  disabled?: boolean
  style?: React.CSSProperties
}> = ({ children, onClick, secondary = false, className = "", type = "button", disabled = false, style }) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    style={style}
    className={`btn ${secondary ? "btn-secondary" : ""} ${className} ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
  >
    {children}
  </button>
)

export const Badge: React.FC<{
  children: React.ReactNode
  type?: "green" | "red" | "amber" | "blue" | "critical" | "high" | "medium" | "low" | "purple"
  className?: string
  style?: React.CSSProperties
}> = ({ children, type = "green", className = "", style }) => (
  <span className={`badge ${type} ${className}`} style={style}>
    {children}
  </span>
)
