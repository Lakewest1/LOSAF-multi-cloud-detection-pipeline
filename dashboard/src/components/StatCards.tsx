// src/components/StatCards.tsx
// KPI cards with real LOSAF data - NO EXTERNAL DEPENDENCIES

import { useEffect, useState } from "react";
import { api } from "../services/api";

export default function StatCards() {
  const [stats, setStats] = useState({
    totalDetections: 0,
    criticalEvents: 0,
    containedActors: 0,
    autoResponseRate: 0,
    averageRiskScore: 0,
    highRiskEvents: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get("/detections");
        const detections = res.data.detections || [];

        const criticalCount = detections.filter(
          (d: any) => d.severity === "critical"
        ).length;
        const autoResponseCount = detections.filter((d: any) => d.autoResponse)
          .length;
        const uniqueActors = new Set(
          detections
            .filter((d: any) => d.autoResponse)
            .map((d: any) => d.actor)
        );
        const highRiskCount = detections.filter(
          (d: any) => d.matchedWeight >= 70
        ).length;
        const avgRisk =
          detections.length > 0
            ? Math.round(
                detections.reduce((sum: number, d: any) => sum + d.matchedWeight, 0) /
                  detections.length
              )
            : 0;

        setStats({
          totalDetections: detections.length,
          criticalEvents: criticalCount,
          containedActors: uniqueActors.size,
          autoResponseRate:
            detections.length > 0
              ? Math.round((autoResponseCount / detections.length) * 100)
              : 0,
          averageRiskScore: avgRisk,
          highRiskEvents: highRiskCount,
        });
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  // ─── KPI CARD COMPONENT ──────────────────────────────────────────────────

  interface KPICardProps {
    emoji: string;
    label: string;
    value: number | string;
    unit?: string;
    color: string;
    bgColor: string;
    borderColor: string;
    highlight?: boolean;
    status?: string;
  }

  const KPICard = ({
    emoji,
    label,
    value,
    unit,
    color,
    bgColor,
    borderColor,
    highlight,
    status,
  }: KPICardProps) => (
    <div
      style={{
        background: bgColor,
        border: `2px solid ${borderColor}`,
        borderRadius: 12,
        padding: 16,
        position: "relative",
        overflow: "hidden",
        boxShadow: highlight ? `0 4px 16px ${color}20` : "0 2px 8px rgba(0,0,0,0.05)",
        transition: "transform 0.2s, box-shadow 0.2s",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
      }}
    >
      {/* Background accent */}
      <div
        style={{
          position: "absolute",
          top: -10,
          right: -10,
          width: 60,
          height: 60,
          borderRadius: "50%",
          background: color,
          opacity: 0.08,
        }}
      />

      {/* Icon */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 36,
          height: 36,
          borderRadius: 10,
          background: `${color}15`,
          border: `1px solid ${color}30`,
          marginBottom: 12,
          fontSize: 18,
        }}
      >
        {emoji}
      </div>

      {/* Label */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          color: color,
          marginBottom: 8,
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {label}
      </div>

      {/* Value */}
      <div
        style={{
          fontSize: 32,
          fontWeight: 700,
          color: color,
          lineHeight: 1,
          marginBottom: 6,
        }}
      >
        {value}
        {unit && (
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              marginLeft: 4,
              opacity: 0.7,
            }}
          >
            {unit}
          </span>
        )}
      </div>

      {/* Status indicator */}
      <div
        style={{
          fontSize: 11,
          color: color,
          opacity: 0.8,
          fontFamily: "monospace",
        }}
      >
        {status || "Status"}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 24,
        }}
      >
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            style={{
              background: "#f1f5f9",
              borderRadius: 12,
              padding: 16,
              height: 140,
              animation: "pulse 2s ease-in-out infinite",
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 24 }}>
      {/* SECTION 1: CRITICAL & CONTAINED (TOP ROW) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <KPICard
          emoji="🔴"
          label="Critical Incidents"
          value={stats.criticalEvents}
          color="#dc2626"
          bgColor="#fff0f0"
          borderColor="#dc2626"
          highlight={stats.criticalEvents > 0}
          status={stats.criticalEvents > 0 ? "⚠️ Action needed" : "✓ All clear"}
        />
        <KPICard
          emoji="🛡️"
          label="Contained Users"
          value={stats.containedActors}
          color="#15803d"
          bgColor="#f0fdf4"
          borderColor="#15803d"
          highlight={stats.containedActors > 0}
          status={stats.containedActors > 0 ? "✓ Isolated" : "No actions"}
        />
      </div>

      {/* SECTION 2: MULTI-CLOUD & RISK (SECOND ROW) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <KPICard
          emoji="📈"
          label="Avg. Risk Score"
          value={stats.averageRiskScore}
          unit="/100"
          color={
            stats.averageRiskScore >= 80
              ? "#dc2626"
              : stats.averageRiskScore >= 60
                ? "#d97706"
                : "#15803d"
          }
          bgColor={
            stats.averageRiskScore >= 80
              ? "#fff0f0"
              : stats.averageRiskScore >= 60
                ? "#fff8ed"
                : "#f0fdf4"
          }
          borderColor={
            stats.averageRiskScore >= 80
              ? "#dc2626"
              : stats.averageRiskScore >= 60
                ? "#d97706"
                : "#15803d"
          }
          status={
            stats.averageRiskScore >= 80
              ? "🔴 High"
              : stats.averageRiskScore >= 60
                ? "🟠 Medium"
                : "🟢 Low"
          }
        />
        <KPICard
          emoji="⚡"
          label="High-Risk Events"
          value={stats.highRiskEvents}
          color="#d97706"
          bgColor="#fff8ed"
          borderColor="#d97706"
          highlight={stats.highRiskEvents > 0}
          status={stats.highRiskEvents > 0 ? "⚠️ Review" : "✓ Safe"}
        />
        <KPICard
          emoji="🔒"
          label="Auto-Response Rate"
          value={stats.autoResponseRate}
          unit="%"
          color="#1d4ed8"
          bgColor="#eff6ff"
          borderColor="#1d4ed8"
          status={stats.autoResponseRate > 0 ? "✓ Active" : "Waiting"}
        />
        <KPICard
          emoji="📊"
          label="Total Detections"
          value={stats.totalDetections}
          color="#64748b"
          bgColor="#f8fafc"
          borderColor="#e2e8f0"
          status={stats.totalDetections > 0 ? "Analyzed" : "Waiting"}
        />
      </div>

      {/* STATUS BAR */}
      <div
        style={{
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: 12,
          fontSize: 12,
          color: "#64748b",
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <span style={{ fontSize: 16 }}>
          {stats.criticalEvents === 0 ? "✅" : stats.criticalEvents <= 2 ? "⚠️" : "🔴"}
        </span>
        <span>
          System Status:{" "}
          <strong>
            {stats.criticalEvents === 0
              ? "✓ Healthy"
              : stats.criticalEvents <= 2
                ? "⚠️ Warning"
                : "🔴 Critical"}
          </strong>
        </span>
        <div style={{ marginLeft: "auto", fontSize: 11, color: "#94a3b8" }}>
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}