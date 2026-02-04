import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

// Helper to decode share data
function decodeShareData(encoded: string): any {
  try {
    const decoded = atob(encoded);
    return JSON.parse(decoded);
  } catch (e) {
    return null;
  }
}

// Format currency
function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${Math.round(value / 1000)}K`;
  }
  return `$${value.toFixed(0)}`;
}

// Get grade colors matching the app's design
function getGradeColors(grade: string): { bg: string; text: string } {
  switch (grade) {
    case 'A+': return { bg: '#000000', text: '#ffffff' };
    case 'A': return { bg: '#2b2823', text: '#ffffff' };
    case 'B+': return { bg: '#3d3a34', text: '#ffffff' };
    case 'B': return { bg: '#787060', text: '#ffffff' };
    case 'C': return { bg: '#d8d6cd', text: '#2b2823' };
    case 'D': return { bg: '#e5e3da', text: '#787060' };
    default: return { bg: '#e5e3da', text: '#787060' };
  }
}

// Calculate STR grade from CoC return
function calculateDealGrade(coc: number): string {
  if (coc >= 25) return 'A+';
  if (coc >= 20) return 'A';
  if (coc >= 15) return 'B+';
  if (coc >= 10) return 'B';
  if (coc >= 5) return 'C';
  return 'D';
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const encoded = searchParams.get("d");

  if (!encoded) {
    return new Response("Missing data parameter", { status: 400 });
  }

  const data = decodeShareData(encoded);

  if (!data) {
    return new Response("Invalid data", { status: 400 });
  }

  // Deal OG Image - Clean, Premium Design
  if (data.type === "deal") {
    const grade = data.grade || calculateDealGrade(data.coc);
    const gradeColors = getGradeColors(grade);
    const cocColor = data.coc >= 20 ? "#16a34a" : data.coc >= 10 ? "#ca8a04" : "#dc2626";
    
    return new ImageResponse(
      (
        <div
          style={{
            width: "1200px",
            height: "630px",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#e5e3da",
            fontFamily: "system-ui, sans-serif",
            position: "relative",
          }}
        >
          {/* Header Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "24px 40px",
              backgroundColor: "#2b2823",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ color: "white", fontSize: "24px", fontWeight: "700" }}>
                Edge
              </span>
              <span style={{ color: "#787060", fontSize: "18px" }}>by Teeco</span>
            </div>
            <div
              style={{
                backgroundColor: "#16a34a",
                color: "white",
                padding: "8px 20px",
                borderRadius: "20px",
                fontSize: "16px",
                fontWeight: "600",
              }}
            >
              STR Investment Analysis
            </div>
          </div>

          {/* Main Content */}
          <div
            style={{
              flex: 1,
              display: "flex",
              padding: "40px",
              gap: "40px",
            }}
          >
            {/* Left Side - Property Info */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              {/* Address */}
              <h1
                style={{
                  fontSize: "44px",
                  fontWeight: "700",
                  color: "#2b2823",
                  margin: "0 0 8px 0",
                  lineHeight: 1.1,
                }}
              >
                {data.address}
              </h1>
              <p
                style={{
                  fontSize: "22px",
                  color: "#787060",
                  margin: "0 0 32px 0",
                }}
              >
                {data.city}, {data.state} • {data.bedrooms} BR / {data.bathrooms} BA
              </p>

              {/* Stats Row */}
              <div style={{ display: "flex", gap: "16px" }}>
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: "16px",
                    padding: "16px 24px",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  }}
                >
                  <span style={{ fontSize: "14px", color: "#787060", marginBottom: "4px" }}>Occupancy</span>
                  <span style={{ fontSize: "28px", fontWeight: "700", color: "#2b2823" }}>
                    {data.occupancy}%
                  </span>
                </div>
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: "16px",
                    padding: "16px 24px",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  }}
                >
                  <span style={{ fontSize: "14px", color: "#787060", marginBottom: "4px" }}>Avg Nightly Rate</span>
                  <span style={{ fontSize: "28px", fontWeight: "700", color: "#2b2823" }}>
                    ${data.adr}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Side - Revenue Card with Grade */}
            <div
              style={{
                width: "320px",
                backgroundColor: "white",
                borderRadius: "24px",
                padding: "28px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                position: "relative",
              }}
            >
              {/* Grade Badge */}
              <div
                style={{
                  position: "absolute",
                  top: "-16px",
                  right: "24px",
                  backgroundColor: gradeColors.bg,
                  color: gradeColors.text,
                  padding: "8px 20px",
                  borderRadius: "12px",
                  fontSize: "24px",
                  fontWeight: "700",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                }}
              >
                {grade}
              </div>

              <span style={{ fontSize: "16px", color: "#787060", marginBottom: "4px", marginTop: "8px" }}>
                Projected Revenue
              </span>
              <span
                style={{
                  fontSize: "52px",
                  fontWeight: "700",
                  color: "#16a34a",
                  lineHeight: 1,
                }}
              >
                {formatCurrency(data.revenue)}
              </span>
              <span style={{ fontSize: "20px", color: "#16a34a" }}>/year</span>

              <div
                style={{
                  width: "100%",
                  height: "1px",
                  backgroundColor: "#e8e5df",
                  margin: "20px 0",
                }}
              />

              <span style={{ fontSize: "14px", color: "#787060", marginBottom: "4px" }}>
                Cash-on-Cash Return
              </span>
              <span
                style={{
                  fontSize: "36px",
                  fontWeight: "700",
                  color: cocColor,
                }}
              >
                {data.coc.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  }

  // City OG Image - Clean, Premium Design
  if (data.type === "city") {
    const gradeColors = getGradeColors(data.grade);

    return new ImageResponse(
      (
        <div
          style={{
            width: "1200px",
            height: "630px",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#e5e3da",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {/* Header Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "24px 40px",
              backgroundColor: "#2b2823",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ color: "white", fontSize: "24px", fontWeight: "700" }}>
                Edge
              </span>
              <span style={{ color: "#787060", fontSize: "18px" }}>by Teeco</span>
            </div>
            <div
              style={{
                backgroundColor: "#787060",
                color: "white",
                padding: "8px 20px",
                borderRadius: "20px",
                fontSize: "16px",
                fontWeight: "600",
              }}
            >
              STR Market Analysis
            </div>
          </div>

          {/* Main Content */}
          <div
            style={{
              flex: 1,
              display: "flex",
              padding: "40px",
              gap: "40px",
            }}
          >
            {/* Left Side - City Info */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <h1
                style={{
                  fontSize: "56px",
                  fontWeight: "700",
                  color: "#2b2823",
                  margin: "0 0 8px 0",
                }}
              >
                {data.name}
              </h1>
              <p
                style={{
                  fontSize: "28px",
                  color: "#787060",
                  margin: "0 0 32px 0",
                }}
              >
                {data.state}
              </p>

              {/* Stats Row */}
              <div style={{ display: "flex", gap: "16px" }}>
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: "16px",
                    padding: "16px 24px",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  }}
                >
                  <span style={{ fontSize: "14px", color: "#787060", marginBottom: "4px" }}>Market Score</span>
                  <span style={{ fontSize: "28px", fontWeight: "700", color: "#2b2823" }}>
                    {data.score}/100
                  </span>
                </div>
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: "16px",
                    padding: "16px 24px",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  }}
                >
                  <span style={{ fontSize: "14px", color: "#787060", marginBottom: "4px" }}>Median Price</span>
                  <span style={{ fontSize: "28px", fontWeight: "700", color: "#2b2823" }}>
                    {formatCurrency(data.price)}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Side - Revenue Card with Grade */}
            <div
              style={{
                width: "320px",
                backgroundColor: "white",
                borderRadius: "24px",
                padding: "28px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                position: "relative",
              }}
            >
              {/* Grade Badge */}
              <div
                style={{
                  position: "absolute",
                  top: "-16px",
                  right: "24px",
                  backgroundColor: gradeColors.bg,
                  color: gradeColors.text,
                  padding: "8px 20px",
                  borderRadius: "12px",
                  fontSize: "24px",
                  fontWeight: "700",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                }}
              >
                {data.grade}
              </div>

              <span style={{ fontSize: "16px", color: "#787060", marginBottom: "4px", marginTop: "8px" }}>
                Avg STR Revenue
              </span>
              <span
                style={{
                  fontSize: "52px",
                  fontWeight: "700",
                  color: "#16a34a",
                  lineHeight: 1,
                }}
              >
                {formatCurrency(data.revenue * 12)}
              </span>
              <span style={{ fontSize: "20px", color: "#16a34a" }}>/year</span>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  }

  // State OG Image - Clean, Premium Design
  if (data.type === "state") {
    const gradeColors = getGradeColors(data.grade);

    return new ImageResponse(
      (
        <div
          style={{
            width: "1200px",
            height: "630px",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#e5e3da",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {/* Header Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "24px 40px",
              backgroundColor: "#2b2823",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ color: "white", fontSize: "24px", fontWeight: "700" }}>
                Edge
              </span>
              <span style={{ color: "#787060", fontSize: "18px" }}>by Teeco</span>
            </div>
            <div
              style={{
                backgroundColor: "#787060",
                color: "white",
                padding: "8px 20px",
                borderRadius: "20px",
                fontSize: "16px",
                fontWeight: "600",
              }}
            >
              STR State Analysis
            </div>
          </div>

          {/* Main Content */}
          <div
            style={{
              flex: 1,
              display: "flex",
              padding: "40px",
              gap: "40px",
            }}
          >
            {/* Left Side - State Info */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <h1
                style={{
                  fontSize: "64px",
                  fontWeight: "700",
                  color: "#2b2823",
                  margin: "0 0 8px 0",
                }}
              >
                {data.name}
              </h1>
              <p
                style={{
                  fontSize: "28px",
                  color: "#787060",
                  margin: "0 0 32px 0",
                }}
              >
                {data.id}
              </p>

              {/* Stats Row */}
              <div style={{ display: "flex", gap: "16px" }}>
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: "16px",
                    padding: "16px 24px",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  }}
                >
                  <span style={{ fontSize: "14px", color: "#787060", marginBottom: "4px" }}>Markets Analyzed</span>
                  <span style={{ fontSize: "28px", fontWeight: "700", color: "#2b2823" }}>
                    {data.cityCount}
                  </span>
                </div>
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: "16px",
                    padding: "16px 24px",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  }}
                >
                  <span style={{ fontSize: "14px", color: "#787060", marginBottom: "4px" }}>Top Market</span>
                  <span style={{ fontSize: "28px", fontWeight: "700", color: "#2b2823" }}>
                    {data.topCity}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Side - Score Card with Grade */}
            <div
              style={{
                width: "280px",
                backgroundColor: "white",
                borderRadius: "24px",
                padding: "28px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                position: "relative",
              }}
            >
              {/* Grade Badge */}
              <div
                style={{
                  position: "absolute",
                  top: "-16px",
                  right: "24px",
                  backgroundColor: gradeColors.bg,
                  color: gradeColors.text,
                  padding: "8px 20px",
                  borderRadius: "12px",
                  fontSize: "24px",
                  fontWeight: "700",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                }}
              >
                {data.grade}
              </div>

              <span style={{ fontSize: "16px", color: "#787060", marginBottom: "4px", marginTop: "8px" }}>
                State Score
              </span>
              <span
                style={{
                  fontSize: "64px",
                  fontWeight: "700",
                  color: "#2b2823",
                  lineHeight: 1,
                }}
              >
                {data.score}
              </span>
              <span style={{ fontSize: "20px", color: "#787060" }}>/100</span>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  }

  return new Response("Invalid share type", { status: 400 });
}
