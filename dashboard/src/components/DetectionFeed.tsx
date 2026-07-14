import { useEffect, useState } from "react";
import { api } from "../services/api";

interface Detection {
  eventId: string;
  ruleId: string;
  ruleName: string;
  actor: string;
  source: string;
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

export default function DetectionFeed() {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [totalEvaluated, setTotalEvaluated] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/detections")
      .then((res) => {
        setDetections(res.data.detections);
        setTotalEvaluated(res.data.totalEventsEvaluated);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading detections...</p>;

  return (
    <div style={{ marginTop: 30 }}>
      <h2>🛡️ Detection Engine Results</h2>
      <p style={{ color: "#666" }}>
        {detections.length} rule(s) fired across {totalEvaluated} evaluated events
      </p>

      {detections.map((d, idx) => (
        <div
          key={idx}
          style={{
            border: "1px solid #ddd",
            borderLeft: `4px solid ${d.autoResponse ? "#d32f2f" : "#f57c00"}`,
            borderRadius: 6,
            padding: 12,
            marginBottom: 10,
            background: "#fafafa",
          }}
        >
          <strong>🚨 {d.ruleName}</strong>
          <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>
            <div>Actor: {d.actor} ({d.source})</div>
            <div>MITRE: {d.mitreTechnique} - {d.mitreTechniqueName} ({d.mitreTactic})</div>
            <div>Matched: {d.matchedConditions.join(", ")}</div>
            <div>Weight: {d.matchedWeight}/{d.triggerThreshold} threshold</div>
            <div>
              Response: <strong>{d.recommendedAction}</strong>{" "}
              ({d.autoResponse ? "automatic" : "requires SOC approval"})
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}