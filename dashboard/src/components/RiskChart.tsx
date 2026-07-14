// src/components/RiskDashboard.tsx
// Lakewest Open Security Automation Framework - Enterprise SOAR Platform
// Premium White Theme with Visual Hierarchy

import { useState, useEffect } from "react";
import type React from "react";
import { supabase } from "../lib/supabase";
import { api } from "../services/api";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
  Cell, PieChart, Pie,
} from "recharts";

import k8sSvgRaw from "simple-icons/icons/kubernetes.svg?raw";

// ─── CUSTOM BRAND-COLORED GLYPHS for AWS/Azure (their trademarked logos
// aren't available in this icon package — these are original, distinct
// shapes rather than a repeated generic cloud icon) ───────────────────────

function AwsGlyph({ color }) {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none">
      {/* Cloud outline */}
      <path
        d="M17.5 18H8a5.5 5.5 0 1 1 5.2-7.3 3.5 3.5 0 1 1 4.3 7.3Z"
        stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
      />
      {/* Distributed nodes inside — represents multi-service compute */}
      <circle cx="9" cy="13.5" r="1.1" fill={color} />
      <circle cx="13" cy="11.5" r="1.1" fill={color} />
      <circle cx="16" cy="14" r="1.1" fill={color} />
      <path d="M9 13.5L13 11.5M13 11.5L16 14M9 13.5L16 14" stroke={color} strokeWidth="0.9" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

function AzureGlyph({ color }) {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none">
      {/* Faceted prism/gem — distinct enterprise-infrastructure shape */}
      <path
        d="M12 2.5 L20 8.5 L17 20.5 L7 20.5 L4 8.5 Z"
        stroke={color} strokeWidth="1.6" strokeLinejoin="round" fill={`${color}12`}
      />
      <path d="M12 2.5 L12 20.5" stroke={color} strokeWidth="1.2" opacity="0.5" />
      <path d="M4 8.5 L20 8.5" stroke={color} strokeWidth="1.2" opacity="0.5" />
      <path d="M12 2.5 L7 20.5" stroke={color} strokeWidth="0.9" opacity="0.35" />
      <path d="M12 2.5 L17 20.5" stroke={color} strokeWidth="0.9" opacity="0.35" />
    </svg>
  );
}

const AwsLogo = () => <AwsGlyph color="#EA580C" />;
const AzureLogo = () => <AzureGlyph color="#2563EB" />;

// ─── REAL KUBERNETES LOGO (bundled locally, no CDN dependency) ───────────────
function BrandIcon({ svg, color }) {
  const colored = svg.replace('<svg ', `<svg fill="${color}" `);
  return (
    <div
      style={{ width: "100%", height: "100%" }}
      dangerouslySetInnerHTML={{ __html: colored }}
    />
  );
}

const K8sLogo = () => <BrandIcon svg={k8sSvgRaw} color="#059669" />;

// ─── INLINE SVG ICONS (Reduced to core 18) ───────────────────────────────────

const Icons = {
  Shield: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.06 1.06 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
    </svg>
  ),
  AlertTriangle: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  Activity: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
    </svg>
  ),
  Cloud: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
    </svg>
  ),
  Container: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
      <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
      <line x1="6" y1="6" x2="6.01" y2="6"/>
      <line x1="6" y1="18" x2="6.01" y2="18"/>
    </svg>
  ),
  Target: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="12" r="2"/>
    </svg>
  ),
  Zap: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  AlertOctagon: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  ShieldCheck: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.06 1.06 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
      <path d="m9 12 2 2 4-4"/>
    </svg>
  ),
  TrendingUp: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
      <polyline points="16 7 22 7 22 13"/>
    </svg>
  ),
  BarChart3: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="3" x2="3" y2="21"/>
      <path d="M18 12V21"/>
      <path d="M12 5v16"/>
      <path d="M6 15v6"/>
    </svg>
  ),
  Gauge: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 14 4-4"/>
      <path d="M3.34 19a10 10 0 1 1 17.32 0"/>
    </svg>
  ),
  Table2: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/>
    </svg>
  ),
  Grid3x3: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2"/>
      <path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>
    </svg>
  ),
  Clock: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  ChevronDown: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6"/>
    </svg>
  ),
  ChevronUp: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m18 15-6-6-6 6"/>
    </svg>
  ),
  Lock: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  Search: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.3-4.3"/>
    </svg>
  ),
  Bell: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
    </svg>
  ),
};

// ─── STATIC DEMO DATA ──────────────────────────────────────────────────────────

const riskHistory = [
  { time: "09:00", risk: 12 }, { time: "09:05", risk: 18 },
  { time: "09:10", risk: 22 }, { time: "09:15", risk: 35 },
  { time: "09:20", risk: 28 }, { time: "09:25", risk: 41 },
  { time: "09:30", risk: 38 }, { time: "09:35", risk: 55 },
  { time: "09:40", risk: 48 }, { time: "09:45", risk: 62 },
  { time: "09:50", risk: 70 }, { time: "09:55", risk: 58 },
  { time: "10:00", risk: 75 }, { time: "10:05", risk: 88 },
  { time: "10:10", risk: 95 }, { time: "10:15", risk: 100 },
];

const weeklyVolume = [
  { day: "Mon", critical: 3, high: 5, medium: 4, low: 2 },
  { day: "Tue", critical: 5, high: 7, medium: 3, low: 4 },
  { day: "Wed", critical: 2, high: 4, medium: 6, low: 3 },
  { day: "Thu", critical: 4, high: 8, medium: 5, low: 5 },
  { day: "Fri", critical: 6, high: 9, medium: 4, low: 3 },
  { day: "Sat", critical: 1, high: 3, medium: 2, low: 1 },
  { day: "Sun", critical: 4, high: 7, medium: 5, low: 2 },
];

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Detection {
  eventId: string;
  ruleId: string;
  ruleName: string;
  actor: string;
  source: string;
  severity: string;
  matchedConditions: string[];
  matchedWeight: number;
  triggerThreshold: number;
  mitreTechnique: string;
  mitreTechniqueName: string;
  mitreTactic: string;
  recommendedAction: string;
  autoResponse: boolean;
  timestamp: string;
}

interface Alert {
  id: string;
  user: string;
  ip: string;
  severity: string;
  status: string;
  risk: number;
  ml: number;
  tactic: string;
  country: string;
  time: string;
}

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────

const T = {
  // Premium Gold
  gold: "#D4AF37",
  goldDark: "#B8960F",
  goldBg: "rgba(212, 175, 55, 0.08)",
  goldBorder: "rgba(212, 175, 55, 0.2)",
  
  // Blue
  blue: "#1E40AF",
  blueLight: "#3B82F6",
  blueBg: "rgba(30, 64, 175, 0.06)",
  blueBorder: "rgba(30, 64, 175, 0.15)",
  
  // Surface
  bg: "#FFFFFF",
  bgSecondary: "#F8FAFC",
  bgTertiary: "#F1F5F9",
  
  // Text
  text: "#0F172A",
  textSecondary: "#334155",
  textMuted: "#64748B",
  
  // Severity - Only Red for danger, only Green for success
  critical: "#DC2626",
  high: "#EA580C",
  medium: "#2563EB",
  low: "#059669",
  
  // Borders (reduced, relying more on shadows)
  borderLight: "#F1F5F9",
  border: "#E2E8F0",
  
  // Shadows (Microsoft-style depth)
  shadowXs: "0 1px 2px 0 rgba(0, 0, 0, 0.03)",
  shadowSm: "0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.03)",
  shadowMd: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.04)",
  shadowLg: "0 10px 15px -3px rgba(0, 0, 0, 0.06), 0 4px 6px -4px rgba(0, 0, 0, 0.04)",
  shadowXl: "0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)",
  shadowHero: "0 0 0 1px rgba(212, 175, 55, 0.15), 0 4px 24px rgba(0, 0, 0, 0.08)",
};

const SEV_COLOR: Record<string, string> = {
  CRITICAL: T.critical, HIGH: T.high, MEDIUM: T.medium, LOW: T.low,
};

const SOURCE_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  aws_cloudtrail: { label: "AWS", color: "#EA580C", bg: "#FFF7ED" },
  azure_entra: { label: "AZURE", color: "#2563EB", bg: "#EFF6FF" },
  kubernetes_audit: { label: "KUBERNETES", color: "#059669", bg: "#ECFDF5" },
};

// ─── ANIMATIONS ───────────────────────────────────────────────────────────────

const ANIMATIONS = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Inter:wght@300;400;500;600;700;800;900&display=swap');

  @keyframes slideInUp {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes countUp {
    from { opacity: 0; transform: scale(0.9); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes pulseCritical {
    0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4); }
    50% { box-shadow: 0 0 0 8px rgba(220, 38, 38, 0); }
  }
  @keyframes glowPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }

  .card-hero:hover {
    transform: translateY(-2px);
    box-shadow: 0 0 0 1px rgba(212, 175, 55, 0.25), 0 8px 32px rgba(0, 0, 0, 0.1);
  }
  .card-standard:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
  }
  .alert-row:hover {
    background: #F8FAFC;
    border-left-width: 4px;
  }
  .scrollbar-thin::-webkit-scrollbar { width: 4px; }
  .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
  .scrollbar-thin::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 2px; }
`;

// ─── REUSABLE COMPONENTS ─────────────────────────────────────────────────────

function Chip({ label, color, bg, border }: { label: string; color: string; bg: string; border: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 9px", borderRadius: 5, fontSize: 10, fontWeight: 600,
      fontFamily: "'Inter', sans-serif", background: bg, color: color,
      border: `1px solid ${border}`, whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const s = severity?.toUpperCase() || "LOW";
  const colors: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    CRITICAL: { bg: "#FEF2F2", text: "#991B1B", border: "#FECACA", dot: T.critical },
    HIGH: { bg: "#FFF7ED", text: "#9A3412", border: "#FED7AA", dot: T.high },
    MEDIUM: { bg: "#EFF6FF", text: "#1E40AF", border: "#BFDBFE", dot: T.medium },
    LOW: { bg: "#ECFDF5", text: "#065F46", border: "#A7F3D0", dot: T.low },
  };
  const c = colors[s] || colors.LOW;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 9px",
      borderRadius: 5, fontSize: 10, fontWeight: 600,
      fontFamily: "'Inter', sans-serif", background: c.bg, color: c.text,
      border: `1px solid ${c.border}`,
    }}>
      <div style={{ width: 5, height: 5, borderRadius: "50%", background: c.dot }} />
      {s}
    </span>
  );
}

function SourceBadge({ source }: { source: string }) {
  const s = SOURCE_STYLE[source] || { label: source?.toUpperCase() || "UNKNOWN", color: T.textMuted, bg: T.bgTertiary };
  return <Chip label={s.label} color={s.color} bg={s.bg} border={`${s.color}20`} />;
}

function StatusBadge({ status }: { status: string }) {
  const s = status?.toUpperCase() || "UNKNOWN";
  const config: Record<string, { color: string; bg: string; border: string }> = {
    CRITICAL: { color: "#991B1B", bg: "#FEF2F2", border: "#FECACA" },
    HIGH: { color: "#9A3412", bg: "#FFF7ED", border: "#FED7AA" },
    MEDIUM: { color: "#1E40AF", bg: "#EFF6FF", border: "#BFDBFE" },
    CONTAINED: { color: "#065F46", bg: "#ECFDF5", border: "#A7F3D0" },
    ACTIVE: { color: "#991B1B", bg: "#FEF2F2", border: "#FECACA" },
    RESOLVED: { color: "#065F46", bg: "#ECFDF5", border: "#A7F3D0" },
  };
  const c = config[s] || { color: T.textMuted, bg: T.bgTertiary, border: T.border };
  return <Chip label={s} color={c.color} bg={c.bg} border={c.border} />;
}

function KpiCard({ icon: Icon, label, value, accent, sub, emphasis = false, delay = 0 }: {
  icon: React.FC; label: string; value: string | number; accent: string; sub?: string;
  emphasis?: boolean; delay?: number;
}) {
  return (
    <div className={emphasis ? "card-hero" : "card-standard"} style={{
      background: T.bg,
      border: emphasis ? `1px solid ${T.goldBorder}` : `1px solid ${T.borderLight}`,
      borderRadius: 12,
      padding: emphasis ? "24px 28px" : "18px 22px",
      position: "relative",
      overflow: "hidden",
      boxShadow: emphasis ? T.shadowHero : T.shadowSm,
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      animation: `slideInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) ${delay}s both`,
      ...(emphasis && {
        borderTop: `3px solid ${accent}`,
      }),
    }}>
      {emphasis && (
        <div style={{
          position: "absolute", top: -30, right: -30,
          width: 100, height: 100, borderRadius: "50%",
          background: `radial-gradient(circle, ${accent}10, transparent 70%)`,
          pointerEvents: "none",
        }} />
      )}
      
      <div style={{
        width: emphasis ? 48 : 38, height: emphasis ? 48 : 38,
        borderRadius: 10,
        background: emphasis ? `${accent}12` : T.bgSecondary,
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: emphasis ? 16 : 12, color: accent,
        ...(emphasis && { boxShadow: `0 0 0 4px ${accent}08` }),
      }}>
        <Icon />
      </div>
      
      <div style={{
        fontSize: emphasis ? 11 : 10, fontWeight: 700,
        letterSpacing: emphasis ? 1.5 : 1.2,
        textTransform: "uppercase",
        color: T.textSecondary, marginBottom: emphasis ? 8 : 6,
        fontFamily: "'Inter', sans-serif",
      }}>
        {label}
      </div>
      
      <div style={{
        fontSize: emphasis ? 44 : 30, fontWeight: 800,
        color: emphasis ? accent : T.text, lineHeight: 1,
        fontFamily: "'Inter', sans-serif",
        fontVariantNumeric: "tabular-nums",
        letterSpacing: "-0.03em",
        animation: `countUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) ${delay + 0.1}s both`,
        ...(emphasis && {
          animation: `countUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) ${delay + 0.1}s both, glowPulse 2s ease-in-out infinite`,
        }),
      }}>
        {value}
      </div>
      
      {sub && (
        <div style={{
          fontSize: emphasis ? 12 : 11, color: T.textMuted,
          marginTop: emphasis ? 10 : 8, fontFamily: "'Inter', sans-serif",
        }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function SectionHero({ icon: Icon, title, accent, badge, extra }: {
  icon: React.FC; title: string; accent: string;
  badge?: { text: string; color: string; bg: string };
  extra?: React.ReactNode;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "18px 28px",
      background: `linear-gradient(to right, ${T.bg}, ${T.bgSecondary})`,
      borderBottom: `1px solid ${T.border}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `linear-gradient(135deg, ${accent}15, ${accent}08)`,
          border: `1px solid ${accent}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: accent,
        }}>
          <Icon />
        </div>
        <div>
          <h2 style={{
            margin: 0, fontSize: 14, fontWeight: 700,
            letterSpacing: 1.2, textTransform: "uppercase",
            color: T.text, fontFamily: "'Inter', sans-serif",
          }}>
            {title}
          </h2>
        </div>
        {badge && (
          <span style={{
            padding: "3px 12px", borderRadius: 20, fontSize: 10, fontWeight: 700,
            background: badge.bg, color: badge.color,
            border: `1px solid ${badge.color}30`,
            fontFamily: "'Inter', sans-serif",
            letterSpacing: 0.8,
          }}>
            {badge.text}
          </span>
        )}
      </div>
      {extra}
    </div>
  );
}

function SectionStandard({ icon: Icon, title, accent, extra }: {
  icon: React.FC; title: string; accent: string; extra?: React.ReactNode;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "14px 22px", borderBottom: `1px solid ${T.borderLight}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: T.bgSecondary, display: "flex", alignItems: "center",
          justifyContent: "center", color: accent,
        }}>
          <Icon />
        </div>
        <h3 style={{
          margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: 1.5,
          textTransform: "uppercase", color: T.textSecondary,
          fontFamily: "'Inter', sans-serif",
        }}>
          {title}
        </h3>
      </div>
      {extra}
    </div>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8,
      padding: "10px 14px", boxShadow: T.shadowLg,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: 1, color: T.textSecondary,
        marginBottom: 6, textTransform: "uppercase", fontFamily: "'Inter', sans-serif",
      }}>
        {label}
      </div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ fontSize: 11, color: T.text, fontFamily: "'Inter', sans-serif", marginBottom: 2 }}>
          <span style={{ color: p.color }}>{p.dataKey}</span>: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
}

function DetectionCard({ detection, index }: { detection: Detection; index: number }) {
  const isCritical = detection.severity === "critical";
  const accentColor = isCritical ? T.critical : T.high;
  
  return (
    <div style={{
      background: T.bg, borderRadius: 10, padding: "16px 18px",
      border: `1px solid ${T.borderLight}`,
      borderLeft: `4px solid ${accentColor}`,
      boxShadow: T.shadowXs, position: "relative",
      animation: `slideInUp 0.3s ease ${index * 0.04}s both`,
      transition: "all 0.2s ease",
    }}>
      {detection.autoResponse && (
        <div style={{
          position: "absolute", top: 0, right: 0,
          padding: "3px 10px", background: "#FEF2F2",
          borderBottomLeftRadius: 6, fontSize: 9, fontWeight: 700,
          letterSpacing: 0.8, color: "#991B1B",
          fontFamily: "'Inter', sans-serif",
          display: "flex", alignItems: "center", gap: 4,
          borderLeft: "1px solid #FECACA", borderBottom: "1px solid #FECACA",
        }}>
          <Icons.Zap />
          CONTAINED
        </div>
      )}

      <div style={{
        display: "flex", alignItems: "center", gap: 6, marginBottom: 10,
        flexWrap: "wrap", paddingRight: detection.autoResponse ? 100 : 0,
      }}>
        <SourceBadge source={detection.source} />
        <SeverityBadge severity={detection.severity} />
        <span style={{
          fontSize: 10, color: T.textMuted, fontFamily: "'JetBrains Mono', monospace",
          background: T.bgSecondary, padding: "2px 7px", borderRadius: 4,
        }}>
          {detection.mitreTechnique}
        </span>
      </div>

      <div style={{
        fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 4,
        fontFamily: "'Inter', sans-serif", lineHeight: 1.4,
      }}>
        {detection.ruleName}
      </div>

      <div style={{
        fontSize: 11, color: T.textSecondary, fontFamily: "'JetBrains Mono', monospace",
        marginBottom: 8, background: T.bgSecondary, padding: "4px 8px",
        borderRadius: 4, display: "inline-block",
      }}>
        {detection.actor} <span style={{ color: T.textMuted }}>·</span> {detection.mitreTechniqueName}
        <span style={{ color: T.textMuted }}> · </span>
        <span style={{ color: T.goldDark, fontWeight: 600 }}>{detection.mitreTactic}</span>
      </div>

      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
        {detection.matchedConditions.map((cond, i) => (
          <Chip key={i} label={cond} color={T.textSecondary} bg={T.bgSecondary} border={T.borderLight} />
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <div style={{ flex: 1, height: 5, background: T.bgTertiary, borderRadius: 3, overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${Math.min(100, (detection.matchedWeight / detection.triggerThreshold) * 100)}%`,
            background: `linear-gradient(to right, ${accentColor}, ${T.gold})`,
            borderRadius: 3, transition: "width 0.5s ease",
          }} />
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700, color: T.textSecondary,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {detection.matchedWeight}/{detection.triggerThreshold}
        </span>
      </div>

      <div style={{
        fontSize: 11, fontWeight: 600, fontFamily: "'Inter', sans-serif",
        display: "flex", alignItems: "center", gap: 6,
        padding: "5px 10px", borderRadius: 6,
        background: detection.autoResponse ? "#FEF2F2" : "#FFF7ED",
        color: detection.autoResponse ? "#991B1B" : "#9A3412",
      }}>
        <Icons.Lock />
        {detection.recommendedAction.replace(/_/g, " ")}
        <span style={{ fontWeight: 400, fontSize: 10, marginLeft: "auto", opacity: 0.7 }}>
          {detection.autoResponse ? "automatic" : "approval required"}
        </span>
      </div>
    </div>
  );
}

function ContainedActorCard({ actor, detections }: { actor: string; detections: Detection[] }) {
  return (
    <div style={{
      background: T.bg, borderRadius: 10, padding: "14px 16px",
      border: `1px solid ${T.borderLight}`, borderTop: "3px solid #059669",
      boxShadow: T.shadowSm, transition: "all 0.2s ease",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%", background: "#ECFDF5",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#059669", flexShrink: 0,
        }}>
          <Icons.ShieldCheck />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text, fontFamily: "'Inter', sans-serif" }}>
            {actor}
          </div>
          <div style={{ fontSize: 11, color: T.textMuted, fontFamily: "'Inter', sans-serif" }}>
            {detections.length} threat{detections.length > 1 ? "s" : ""} contained
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
        {detections.map((d, i) => (
          <Chip key={i} label={d.recommendedAction.replace(/_/g, " ")} color="#065F46" bg="#ECFDF5" border="#A7F3D0" />
        ))}
      </div>
    </div>
  );
}

// ─── MAIN DASHBOARD ──────────────────────────────────────────────────────────

export default function RiskDashboard() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [currentTime, setCurrentTime] = useState("");
  const [liveRisk, setLiveRisk] = useState(100);
  const [showLegacy, setShowLegacy] = useState(true);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [detectionsEvaluated, setDetectionsEvaluated] = useState(0);
  const [detectionsLoading, setDetectionsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Computed stats
  const severityBreakdownLive = [
    { name: "Critical", value: alerts.filter(a => a.severity === "CRITICAL").length, color: SEV_COLOR.CRITICAL },
    { name: "High", value: alerts.filter(a => a.severity === "HIGH").length, color: SEV_COLOR.HIGH },
    { name: "Medium", value: alerts.filter(a => a.severity === "MEDIUM").length, color: SEV_COLOR.MEDIUM },
    { name: "Low", value: alerts.filter(a => a.severity === "LOW").length, color: SEV_COLOR.LOW },
  ];

  const criticalCount = alerts.filter(a => a.severity === "CRITICAL").length;
  const containedCount = alerts.filter(a => a.risk >= 80).length;
  const averageRisk = alerts.length > 0 ? Math.round(alerts.reduce((s, a) => s + a.risk, 0) / alerts.length) : 0;
  const awsCount = detections.filter(d => d.source === "aws_cloudtrail").length;
  const azureCount = detections.filter(d => d.source === "azure_entra").length;
  const k8sCount = detections.filter(d => d.source === "kubernetes_audit").length;
  const uniqueTechniques = new Set(detections.map(d => d.mitreTechnique)).size;
  const detectionCriticalCount = detections.filter(d => d.severity === "critical" || d.severity === "high").length;
  const containedActors = new Set(detections.filter(d => d.autoResponse).map(d => d.actor));
  const totalEventsEvaluated = detectionsEvaluated || 32;
  const totalRulesFired = detections.length;

  // Priority Queue - Immediate actions from critical detections
  const priorityQueue = detections
    .filter(d => d.severity === "critical" && !d.autoResponse)
    .slice(0, 3)
    .concat(detections.filter(d => d.severity === "high" && !d.autoResponse).slice(0, 2))
    .slice(0, 4);

  // Clock
  useEffect(() => {
    const tick = () => setCurrentTime(new Date().toUTCString().replace("GMT", "UTC"));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Legacy alerts
  useEffect(() => {
    let mounted = true;
    const mapRow = (row: any): Alert => ({
      id: row.id, user: row.user_email || "unknown@unknown.com",
      ip: row.source_ip || "0.0.0.0",
      severity: String(row.severity || "LOW").trim().toUpperCase(),
      status: String(row.status || "ACTIVE").trim().toUpperCase(),
      risk: Number(row.risk_score || 0), ml: Number(row.risk_score || 0),
      tactic: row.tactic || "Identity Attack", country: row.country || "Unknown",
      time: new Date(row.created_at || Date.now()).toLocaleTimeString(),
    });

    const load = async () => {
      const { data, error } = await supabase.from("incidents").select("*").order("created_at", { ascending: false });
      if (error) { console.error("Supabase fetch error:", error); return; }
      if (!mounted) return;
      setAlerts(data.map(mapRow));
    };

    load();

    const channel = supabase.channel("incidents-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "incidents" }, (payload: any) => {
        if (!mounted) return;
        if (payload.eventType === "INSERT") {
          const newRow = mapRow(payload.new);
          setAlerts(prev => prev.some(a => a.id === newRow.id) ? prev : [newRow, ...prev]);
        } else if (payload.eventType === "UPDATE") {
          const updated = mapRow(payload.new);
          setAlerts(prev => prev.map(a => a.id === updated.id ? { ...a, ...updated } : a));
        } else if (payload.eventType === "DELETE") load();
      }).subscribe();

    return () => { mounted = false; supabase.removeChannel(channel); };
  }, []);

  // Multi-cloud detections
  useEffect(() => {
    api.get("/detections")
      .then(res => {
        setDetections(res.data.detections || []);
        setDetectionsEvaluated(res.data.totalEventsEvaluated || 0);
      })
      .catch(err => console.error("Detections fetch error:", err))
      .finally(() => setDetectionsLoading(false));
  }, []);

  // Live risk animation
  useEffect(() => {
    const id = setInterval(() => setLiveRisk(p => Math.min(100, Math.max(0, p + (Math.random() - 0.5) * 10))), 5000);
    return () => clearInterval(id);
  }, []);

  const riskRound = Math.round(liveRisk);
  const riskColor = riskRound >= 80 ? T.critical : riskRound >= 50 ? T.high : T.low;

  return (
    <div style={{
      background: T.bgSecondary, minHeight: "100vh",
      fontFamily: "'Inter', sans-serif", color: T.text,
    }}>
      <style>{ANIMATIONS}</style>

      {/* ─── HEADER ─── */}
      <header style={{
        background: T.bg, borderBottom: `1px solid ${T.border}`,
        boxShadow: T.shadowSm, position: "sticky", top: 3, zIndex: 100, marginTop:4,
      }}>
        <div style={{
          height: 2, background: `linear-gradient(to right, transparent, ${T.gold}, transparent)`,
        }} />
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 28px", height: 70,
        }}>
          {/* Logo - Simplified */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 8,
              background: `linear-gradient(135deg, ${T.blue}, ${T.blueLight})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#FFFFFF", boxShadow: `0 2px 8px rgba(30, 64, 175, 0.25)`,
            }}>
              <Icons.Shield />
            </div>
            <div>
              <div style={{
                fontSize: 15, fontWeight: 800, letterSpacing: 2,
                color: T.text, textTransform: "uppercase",
                fontFamily: "'Inter', sans-serif", lineHeight: 1.1, marginTop:8, 
              }}>
                LOSAF
              </div>
              <div style={{
                fontSize: 9, letterSpacing: 1, color: T.goldDark,
                textTransform: "uppercase", fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
              }}>
                Cloud-Native Security Automation Platform
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav style={{ display: "flex", gap: 0 }}>
            {[
              { label: "Threats", icon: Icons.Activity, active: true },
              { label: "Incidents", icon: Icons.AlertTriangle, active: false },
              { label: "Assets", icon: Icons.Container, active: false },
              { label: "Hunting", icon: Icons.Target, active: false },
              { label: "Playbooks", icon: Icons.Zap, active: false },
              { label: "Reports", icon: Icons.BarChart3, active: false },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.label} style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "8px 14px", borderRadius: 0, border: "none",
                  cursor: "pointer", fontSize: 11, fontWeight: 600,
                  letterSpacing: 0.3, fontFamily: "'Inter', sans-serif",
                  background: "transparent",
                  color: tab.active ? T.blue : T.textMuted,
                  borderBottom: tab.active ? `2px solid ${T.blue}` : "2px solid transparent",
                  transition: "all 0.15s ease",
                }}>
                  <Icon />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Right side */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button style={{
              padding: "6px", borderRadius: 6, border: "none", background: "transparent",
              cursor: "pointer", color: T.textMuted,
            }}>
              <Icons.Search />
            </button>
            <button style={{
              padding: "6px", borderRadius: 6, border: "none", background: "transparent",
              cursor: "pointer", color: T.textMuted, position: "relative",
            }}>
              <Icons.Bell />
              <div style={{
                position: "absolute", top: 2, right: 2,
                width: 7, height: 7, borderRadius: "50%", background: T.critical,
              }} />
            </button>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "#FEF2F2", border: "1px solid #FECACA",
              borderRadius: 16, padding: "3px 10px",
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: "50%", background: T.critical,
                animation: "glowPulse 1.5s ease-in-out infinite",
              }} />
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
                color: "#991B1B", textTransform: "uppercase",
                fontFamily: "'Inter', sans-serif",
              }}>
                Live
              </span>
            </div>
            <span style={{
              fontSize: 10, color: T.textMuted, fontFamily: "'JetBrains Mono', monospace",
              display: "flex", alignItems: "center", gap: 4,
            }}>
              <Icons.Clock />
              {currentTime}
            </span>
          </div>
        </div>
      </header>

      {/* ─── MAIN CONTENT ─── */}
      <main style={{ padding: "0 28px", maxWidth: 1440, margin: "0 auto" }}>
        
        {/* Page title */}
        <div style={{ padding: "28px 0 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: 2.5,
              color: T.blue, textTransform: "uppercase",
              fontFamily: "'Inter', sans-serif",
            }}>
              <strong>Multi-Cloud Threat Detection</strong>
            </span>
          </div>
          <h1 style={{
            margin: 0, fontSize: 24, fontWeight: 800, color: T.text,
            fontFamily: "'Inter', sans-serif", letterSpacing: -0.5,
          }}>
            AWS <span style={{ color: T.textMuted, fontWeight: 300 }}>·</span>{" "}
            Azure <span style={{ color: T.textMuted, fontWeight: 300 }}>·</span>{" "}
            Kubernetes <span style={{ color: T.textMuted, fontWeight: 300 }}>·</span>{" "}
            Unified Detection Pipeline
          </h1>
        </div>

        {/* ─── CRITICAL KPIs ─── */}
        <div style={{
          display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
          gap: 14, marginBottom: 32,
        }}>
          <KpiCard icon={Icons.AlertOctagon} label="Critical Alerts" value={detectionCriticalCount} 
            accent={T.critical} sub="Immediate attention required" emphasis delay={0} />
          <KpiCard icon={AwsLogo} label="AWS Events" value={awsCount} accent="#EA580C" sub="CloudTrail" delay={0.03} />
          <KpiCard icon={AzureLogo} label="Azure Events" value={azureCount} accent="#2563EB" sub="Entra ID" delay={0.06} />
          <KpiCard icon={K8sLogo} label="Kubernetes" value={k8sCount} accent="#059669" sub="Audit Logs" delay={0.09} />
          <KpiCard icon={Icons.Target} label="MITRE Techniques" value={uniqueTechniques} accent="#7C3AED" sub="Unique ATT&CK" delay={0.12} />
        </div>

        {/* ─── PRIORITY QUEUE ─── */}
        {priorityQueue.length > 0 && (
          <div style={{
            background: `linear-gradient(135deg, #FEF2F2, #FFF7ED)`,
            border: `1px solid #FECACA`, borderRadius: 12,
            padding: "16px 20px", marginBottom: 32,
            boxShadow: T.shadowMd,
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
            }}>
              <Icons.Zap />
              <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
                color: "#991B1B", textTransform: "uppercase",
                fontFamily: "'Inter', sans-serif",
              }}>
                Immediate Actions Required
              </span>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {priorityQueue.map((d, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 14px", background: T.bg, borderRadius: 8,
                  border: `1px solid ${T.border}`, boxShadow: T.shadowXs,
                  fontSize: 12, fontFamily: "'Inter', sans-serif", fontWeight: 600,
                  color: T.text,
                }}>
                  <SeverityBadge severity={d.severity} />
                  <span>{d.recommendedAction.replace(/_/g, " ")}</span>
                  <span style={{ color: T.textMuted, fontSize: 10, fontWeight: 400 }}>
                    {d.actor.split("@")[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── LIVE DETECTION FEED (HERO SECTION) ─── */}
        <section style={{
          background: T.bg, borderRadius: 14,
          boxShadow: T.shadowLg,
          marginBottom: 32,
          overflow: "hidden",
          border: `1px solid ${T.goldBorder}`,
        }}>
          <SectionHero
            icon={Icons.Activity}
            title="Live Detection Feed"
            accent={T.gold}
            badge={{
              text: `${detections.length} active`,
              color: "#991B1B",
              bg: "#FEF2F2",
            }}
            extra={
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{
                  padding: "3px 10px", borderRadius: 5, fontSize: 10, fontWeight: 700,
                  background: "#FEF2F2", color: "#991B1B", border: "1px solid #FECACA",
                  fontFamily: "'Inter', sans-serif",
                }}>
                  {detectionCriticalCount} critical
                </span>
                <span style={{
                  padding: "3px 10px", borderRadius: 5, fontSize: 10, fontWeight: 700,
                  background: "#ECFDF5", color: "#065F46", border: "1px solid #A7F3D0",
                  fontFamily: "'Inter', sans-serif", display: "flex", alignItems: "center", gap: 4,
                }}>
                  <Icons.Lock />
                  {containedActors.size} contained
                </span>
                <div style={{
                  display: "flex", background: T.bgTertiary, borderRadius: 5, padding: 2,
                  border: `1px solid ${T.border}`, marginLeft: 8,
                }}>
                  <button onClick={() => setViewMode("grid")} style={{
                    padding: "4px 8px", borderRadius: 3, border: "none", cursor: "pointer",
                    background: viewMode === "grid" ? T.bg : "transparent",
                    color: viewMode === "grid" ? T.blue : T.textMuted,
                    boxShadow: viewMode === "grid" ? T.shadowSm : "none",
                  }} title="Grid view">
                    <Icons.Grid3x3 />
                  </button>
                  <button onClick={() => setViewMode("table")} style={{
                    padding: "4px 8px", borderRadius: 3, border: "none", cursor: "pointer",
                    background: viewMode === "table" ? T.bg : "transparent",
                    color: viewMode === "table" ? T.blue : T.textMuted,
                    boxShadow: viewMode === "table" ? T.shadowSm : "none",
                  }} title="Table view">
                    <Icons.Table2 />
                  </button>
                </div>
              </div>
            }
          />

          <div style={{ padding: "24px 28px 28px" }}>
            {detectionsLoading ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: T.textMuted }}>
                <div style={{ fontSize: 14, fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
                  Loading detection pipeline...
                </div>
              </div>
            ) : detections.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: T.textMuted }}>
                <div style={{ fontSize: 14, fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
                  No Detections Fired Yet
                </div>
                <div style={{
                  fontSize: 11, marginTop: 6, fontFamily: "'JetBrains Mono', monospace",
                  color: T.textMuted,
                }}>
                  collector:aws → collector:k8s → collector:azure → normalizer → mapper → detector
                </div>
              </div>
            ) : (
              <>
                <div style={{
                  fontSize: 12, color: T.textSecondary, fontFamily: "'Inter', sans-serif",
                  marginBottom: 20, fontWeight: 500,
                }}>
                  {detections.length} rule{detections.length > 1 ? "s" : ""} fired across{" "}
                  <strong style={{ color: T.text }}>{totalEventsEvaluated}</strong> evaluated events
                </div>

                {viewMode === "grid" ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
                    {detections.map((d, i) => (
                      <DetectionCard key={`${d.eventId}-${d.ruleId}-${i}`} detection={d} index={i} />
                    ))}
                  </div>
                ) : (
                  <div className="scrollbar-thin" style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ borderBottom: `2px solid ${T.border}`, textAlign: "left" }}>
                          <th style={{ padding: "8px 12px", color: T.textMuted, fontWeight: 600, fontSize: 10, letterSpacing: 1, textTransform: "uppercase" }}>Source</th>
                          <th style={{ padding: "8px 12px", color: T.textMuted, fontWeight: 600, fontSize: 10, letterSpacing: 1, textTransform: "uppercase" }}>Severity</th>
                          <th style={{ padding: "8px 12px", color: T.textMuted, fontWeight: 600, fontSize: 10, letterSpacing: 1, textTransform: "uppercase" }}>Rule</th>
                          <th style={{ padding: "8px 12px", color: T.textMuted, fontWeight: 600, fontSize: 10, letterSpacing: 1, textTransform: "uppercase" }}>Actor</th>
                          <th style={{ padding: "8px 12px", color: T.textMuted, fontWeight: 600, fontSize: 10, letterSpacing: 1, textTransform: "uppercase" }}>MITRE</th>
                          <th style={{ padding: "8px 12px", color: T.textMuted, fontWeight: 600, fontSize: 10, letterSpacing: 1, textTransform: "uppercase" }}>Weight</th>
                          <th style={{ padding: "8px 12px", color: T.textMuted, fontWeight: 600, fontSize: 10, letterSpacing: 1, textTransform: "uppercase" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detections.map((d, i) => (
                          <tr key={`${d.eventId}-${i}`} className="alert-row" style={{
                            borderBottom: `1px solid ${T.borderLight}`,
                            transition: "background 0.15s ease",
                          }}>
                            <td style={{ padding: "10px 12px" }}><SourceBadge source={d.source} /></td>
                            <td style={{ padding: "10px 12px" }}><SeverityBadge severity={d.severity} /></td>
                            <td style={{ padding: "10px 12px", fontWeight: 600, color: T.text, fontFamily: "'Inter', sans-serif" }}>{d.ruleName}</td>
                            <td style={{ padding: "10px 12px", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: T.textSecondary }}>{d.actor}</td>
                            <td style={{ padding: "10px 12px" }}>
                              <span style={{ fontSize: 10, color: T.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>
                                {d.mitreTechnique}
                              </span>
                            </td>
                            <td style={{ padding: "10px 12px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <div style={{ width: 40, height: 4, background: T.bgTertiary, borderRadius: 2, overflow: "hidden" }}>
                                  <div style={{
                                    height: "100%",
                                    width: `${Math.min(100, (d.matchedWeight / d.triggerThreshold) * 100)}%`,
                                    background: d.severity === "critical" ? T.critical : T.high,
                                    borderRadius: 2,
                                  }} />
                                </div>
                                <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: T.textSecondary }}>
                                  {d.matchedWeight}
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: "10px 12px" }}>
                              <span style={{
                                fontSize: 10, fontWeight: 600, color: d.autoResponse ? "#991B1B" : "#9A3412",
                                fontFamily: "'Inter', sans-serif",
                              }}>
                                {d.autoResponse ? "CONTAINED" : "PENDING"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* Footer */}
            <div style={{
              marginTop: 24, padding: "12px 18px",
              background: `linear-gradient(to right, ${T.goldBg}, ${T.blueBg})`,
              borderRadius: 8, textAlign: "center",
              border: `1px solid ${T.borderLight}`,
            }}>
              <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
                color: T.blue, textTransform: "uppercase",
                fontFamily: "'Inter', sans-serif",
              }}>
                LOSAF
              </span>
              <span style={{ color: T.gold, margin: "0 6px" }}>·</span>
              <span style={{ fontSize: 10, color: T.textMuted, fontFamily: "'Inter', sans-serif" }}>
                Lakewest Open Security Automation Framework · AWS · Azure · Kubernetes · MITRE ATT&CK
              </span>
            </div>
          </div>
        </section>

        {/* ─── CONTAINED ACTORS ─── */}
        {containedActors.size > 0 && (
          <section style={{
            background: T.bg, borderRadius: 12,
            boxShadow: T.shadowSm, marginBottom: 24,
            overflow: "hidden",
          }}>
            <SectionStandard
              icon={Icons.ShieldCheck}
              title="Contained Actors"
              accent="#059669"
              extra={
                <span style={{
                  padding: "3px 10px", borderRadius: 5, fontSize: 10, fontWeight: 700,
                  background: "#ECFDF5", color: "#065F46", border: "1px solid #A7F3D0",
                  fontFamily: "'Inter', sans-serif",
                }}>
                  {containedActors.size} unique
                </span>
              }
            />
            <div style={{ padding: "16px 22px 20px" }}>
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: 12,
              }}>
                {Array.from(containedActors).map(actor => (
                  <ContainedActorCard
                    key={actor}
                    actor={actor}
                    detections={detections.filter(d => d.actor === actor && d.autoResponse)}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── LEGACY TOGGLE ─── */}
        <button onClick={() => setShowLegacy(!showLegacy)} style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          padding: "12px 18px", background: T.bg, border: `1px solid ${T.borderLight}`,
          borderRadius: 8, cursor: "pointer", color: T.textMuted,
          fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 600,
          letterSpacing: 1.5, textTransform: "uppercase",
          marginBottom: showLegacy ? 24 : 0, boxShadow: T.shadowXs,
        }}>
          <div style={{ flex: 1, height: 1, background: T.borderLight }} />
          {showLegacy ? <Icons.ChevronUp /> : <Icons.ChevronDown />}
          Legacy: Single-Cloud Azure Sentinel SOAR
          {showLegacy ? <Icons.ChevronUp /> : <Icons.ChevronDown />}
          <div style={{ flex: 1, height: 1, background: T.borderLight }} />
        </button>

        {/* ─── LEGACY SECTION ─── */}
        {showLegacy && (
          <>
            <p style={{
              fontSize: 10, color: T.textMuted, fontFamily: "'Inter', sans-serif",
              fontStyle: "italic", marginBottom: 16,
            }}>
              The original single-tenant SOAR platform this project evolved from.
            </p>

            <div style={{
              display: "grid", gridTemplateColumns: "repeat(5, 1fr)",
              gap: 14, marginBottom: 20,
            }}>
              <KpiCard icon={Icons.AlertOctagon} label="Critical Incidents" value={criticalCount} 
                accent={T.critical} sub="Severity = Critical" delay={0} />
              <KpiCard icon={Icons.ShieldCheck} label="High-Risk Alerts" value={containedCount} 
                accent="#059669" sub="Risk ≥ 80" delay={0.04} />
              <KpiCard icon={Icons.Gauge} label="Average Risk" value={averageRisk} 
                accent="#EA580C" sub="All Active Alerts" delay={0.08} />
              <KpiCard icon={Icons.Activity} label="Total Alerts" value={alerts.length} 
                accent={T.blue} sub="All Severities" delay={0.12} />
              <KpiCard icon={Icons.Zap} label="Live Risk Index" value={riskRound} 
                accent={riskColor} sub="Real-Time Pulse" delay={0.16} />
            </div>

            <div style={{
              display: "grid", gridTemplateColumns: "1fr 360px",
              gap: 16, marginBottom: 20,
            }}>
              <section style={{
                background: T.bg, borderRadius: 10, overflow: "hidden",
                boxShadow: T.shadowSm,
              }}>
                <div style={{
                  padding: "14px 20px", borderBottom: `1px solid ${T.borderLight}`,
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Icons.TrendingUp />
                    <span style={{
                      fontSize: 11, fontWeight: 700, letterSpacing: 1.2,
                      textTransform: "uppercase", color: T.textSecondary,
                      fontFamily: "'Inter', sans-serif",
                    }}>
                      Threat Trend
                    </span>
                  </div>
                </div>
                <div style={{ padding: "16px 20px 20px" }}>
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={riskHistory} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                      <defs>
                        <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={T.blue} stopOpacity={0.12} />
                          <stop offset="95%" stopColor={T.blue} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={T.borderLight} vertical={false} />
                      <XAxis dataKey="time" tick={{ fill: T.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: T.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                      <Tooltip content={<ChartTooltip />} />
                      <ReferenceLine y={80} stroke={T.critical} strokeDasharray="5 3" strokeWidth={1} />
                      <Area type="monotone" dataKey="risk" stroke={T.blue} strokeWidth={2} fillOpacity={1} fill="url(#riskGrad)" dot={false} activeDot={{ r: 4, fill: T.blue, stroke: T.bg, strokeWidth: 2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section style={{
                background: T.bg, borderRadius: 10, overflow: "hidden",
                boxShadow: T.shadowSm,
              }}>
                <div style={{
                  padding: "14px 20px", borderBottom: `1px solid ${T.borderLight}`,
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <Icons.BarChart3 />
                  <span style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: 1.2,
                    textTransform: "uppercase", color: T.textSecondary,
                    fontFamily: "'Inter', sans-serif",
                  }}>
                    Severity Breakdown
                  </span>
                </div>
                <div style={{ padding: "16px 20px 20px" }}>
                  {severityBreakdownLive.every(s => s.value === 0) ? (
                    <div style={{ textAlign: "center", padding: "30px 0", color: T.textMuted, fontSize: 11 }}>
                      No data yet
                    </div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={120}>
                        <PieChart>
                          <Pie data={severityBreakdownLive} cx="50%" cy="50%" innerRadius={32} outerRadius={50} paddingAngle={3} dataKey="value" stroke="none">
                            {severityBreakdownLive.map((e, i) => <Cell key={i} fill={e.color} />)}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ marginTop: 12 }}>
                        {severityBreakdownLive.map(s => (
                          <div key={s.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{ width: 7, height: 7, borderRadius: "50%", background: s.color }} />
                              <span style={{ fontSize: 11, color: T.textSecondary }}>{s.name}</span>
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: T.text, fontFamily: "'JetBrains Mono', monospace" }}>{s.value}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </section>
            </div>

            <section style={{
              background: T.bg, borderRadius: 10, overflow: "hidden",
              boxShadow: T.shadowSm, marginBottom: 20,
            }}>
              <div style={{
                padding: "14px 20px", borderBottom: `1px solid ${T.borderLight}`,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <Icons.BarChart3 />
                <span style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: 1.2,
                  textTransform: "uppercase", color: T.textSecondary,
                  fontFamily: "'Inter', sans-serif",
                }}>
                  Weekly Alert Volume
                </span>
              </div>
              <div style={{ padding: "16px 20px 20px" }}>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={weeklyVolume} barSize={10} barGap={2} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.borderLight} vertical={false} />
                    <XAxis dataKey="day" tick={{ fill: T.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: T.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="critical" stackId="a" fill={SEV_COLOR.CRITICAL} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="high" stackId="a" fill={SEV_COLOR.HIGH} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="medium" stackId="a" fill={SEV_COLOR.MEDIUM} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="low" stackId="a" fill={SEV_COLOR.LOW} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section style={{
              background: T.bg, borderRadius: 10, overflow: "hidden",
              boxShadow: T.shadowSm,
            }}>
              <div style={{
                padding: "14px 20px", borderBottom: `1px solid ${T.borderLight}`,
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icons.AlertOctagon />
                  <span style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: 1.2,
                    textTransform: "uppercase", color: T.textSecondary,
                    fontFamily: "'Inter', sans-serif",
                  }}>
                    Active Alerts (Azure Sentinel)
                  </span>
                </div>
                {alerts.length > 0 && (
                  <span style={{
                    padding: "3px 10px", borderRadius: 5, fontSize: 10, fontWeight: 700,
                    background: "#FEF2F2", color: "#991B1B", border: "1px solid #FECACA",
                    fontFamily: "'Inter', sans-serif",
                  }}>
                    {alerts.length} total
                  </span>
                )}
              </div>
              <div style={{ padding: "16px 20px 20px" }}>
                {alerts.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "30px 0", color: T.textMuted }}>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>No Active Incidents</div>
                  </div>
                ) : (
                  <div className="scrollbar-thin" style={{ maxHeight: 360, overflowY: "auto" }}>
                    {alerts.map(a => {
                      const sev = SEV_COLOR[a.severity] || SEV_COLOR.LOW;
                      return (
                        <div key={a.id} className="alert-row" style={{
                          background: T.bg, borderLeft: `3px solid ${sev}`,
                          borderBottom: `1px solid ${T.borderLight}`,
                          padding: "10px 14px", marginBottom: 0,
                          transition: "all 0.15s ease",
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: "'Inter', sans-serif" }}>
                                {a.user}
                              </div>
                              <div style={{ fontSize: 9, color: T.textMuted, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                                {a.ip} · {a.tactic} · {a.country}
                              </div>
                            </div>
                            <div style={{ fontSize: 9, color: T.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>
                              {a.time}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                            <SeverityBadge severity={a.severity} />
                            <StatusBadge status={a.status} />
                            <span style={{
                              padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 600,
                              background: T.blueBg, color: T.blue, border: `1px solid ${T.blueBorder}`,
                              fontFamily: "'Inter', sans-serif",
                            }}>
                              Risk: {a.risk}/100
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}