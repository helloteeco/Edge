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

  // Deal OG Image
  if (data.type === "deal") {
    const cocColor = data.coc >= 20 ? "#16a34a" : data.coc >= 15 ? "#ca8a04" : "#dc2626";
    
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
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "32px 48px",
              backgroundColor: "#2b2823",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  backgroundColor: "#787060",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: "24px",
                  fontWeight: "bold",
                }}
              >
                E
              </div>
              <span style={{ color: "white", fontSize: "28px", fontWeight: "600" }}>
                Edge by Teeco
              </span>
            </div>
            <div
              style={{
                backgroundColor: "#16a34a",
                color: "white",
                padding: "10px 24px",
                borderRadius: "20px",
                fontSize: "18px",
                fontWeight: "600",
              }}
            >
              STR Investment Analysis
            </div>
          </div>

          {/* Content */}
          <div
            style={{
              flex: 1,
              display: "flex",
              padding: "48px",
              gap: "48px",
            }}
          >
            {/* Left - Property Info */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <h1
                style={{
                  fontSize: "42px",
                  fontWeight: "700",
                  color: "#2b2823",
                  margin: "0 0 12px 0",
                  lineHeight: 1.2,
                }}
              >
                {data.address}
              </h1>
              <p
                style={{
                  fontSize: "24px",
                  color: "#787060",
                  margin: "0 0 32px 0",
                }}
              >
                {data.city}, {data.state} • {data.bedrooms} BR / {data.bathrooms} BA
              </p>

              {/* Stats Row */}
              <div style={{ display: "flex", gap: "24px", marginTop: "auto" }}>
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: "16px",
                    padding: "20px 28px",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <span style={{ fontSize: "18px", color: "#787060" }}>Occupancy</span>
                  <span style={{ fontSize: "32px", fontWeight: "700", color: "#2b2823" }}>
                    {data.occupancy}%
                  </span>
                </div>
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: "16px",
                    padding: "20px 28px",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <span style={{ fontSize: "18px", color: "#787060" }}>Avg Nightly Rate</span>
                  <span style={{ fontSize: "32px", fontWeight: "700", color: "#2b2823" }}>
                    ${data.adr}
                  </span>
                </div>
              </div>
            </div>

            {/* Right - Revenue Card */}
            <div
              style={{
                width: "320px",
                backgroundColor: "white",
                borderRadius: "24px",
                padding: "32px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
              }}
            >
              <span style={{ fontSize: "20px", color: "#787060", marginBottom: "8px" }}>
                Projected Revenue
              </span>
              <span
                style={{
                  fontSize: "56px",
                  fontWeight: "700",
                  color: "#16a34a",
                  lineHeight: 1,
                }}
              >
                {formatCurrency(data.revenue)}
              </span>
              <span style={{ fontSize: "24px", color: "#16a34a" }}>/year</span>

              <div
                style={{
                  width: "100%",
                  height: "1px",
                  backgroundColor: "#e8e5df",
                  margin: "24px 0",
                }}
              />

              <span style={{ fontSize: "18px", color: "#787060", marginBottom: "4px" }}>
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

  // City OG Image
  if (data.type === "city") {
    const gradeStyle = getGradeColors(data.grade);

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
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "32px 48px",
              backgroundColor: "#2b2823",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  backgroundColor: "#787060",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: "24px",
                  fontWeight: "bold",
                }}
              >
                E
              </div>
              <span style={{ color: "white", fontSize: "28px", fontWeight: "600" }}>
                Edge by Teeco
              </span>
            </div>
            <div
              style={{
                backgroundColor: "#787060",
                color: "white",
                padding: "10px 24px",
                borderRadius: "20px",
                fontSize: "18px",
                fontWeight: "600",
              }}
            >
              STR Market Analysis
            </div>
          </div>

          {/* Content */}
          <div
            style={{
              flex: 1,
              display: "flex",
              padding: "48px",
              gap: "48px",
            }}
          >
            {/* Left - City Info */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <h1
                style={{
                  fontSize: "52px",
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

              {/* Stats */}
              <div style={{ display: "flex", gap: "24px", marginTop: "auto" }}>
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: "16px",
                    padding: "20px 28px",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <span style={{ fontSize: "18px", color: "#787060" }}>Median Price</span>
                  <span style={{ fontSize: "32px", fontWeight: "700", color: "#2b2823" }}>
                    {formatCurrency(data.price)}
                  </span>
                </div>
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: "16px",
                    padding: "20px 28px",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <span style={{ fontSize: "18px", color: "#787060" }}>Monthly Revenue</span>
                  <span style={{ fontSize: "32px", fontWeight: "700", color: "#16a34a" }}>
                    {formatCurrency(data.revenue)}/mo
                  </span>
                </div>
              </div>
            </div>

            {/* Right - Grade Card */}
            <div
              style={{
                width: "320px",
                backgroundColor: "white",
                borderRadius: "24px",
                padding: "32px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
              }}
            >
              <span style={{ fontSize: "20px", color: "#787060", marginBottom: "16px" }}>
                Investment Grade
              </span>
              <div
                style={{
                  width: "120px",
                  height: "120px",
                  borderRadius: "24px",
                  backgroundColor: gradeStyle.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ fontSize: "56px", fontWeight: "700", color: gradeStyle.text }}>
                  {data.grade}
                </span>
              </div>

              <div
                style={{
                  width: "100%",
                  height: "1px",
                  backgroundColor: "#e8e5df",
                  margin: "24px 0",
                }}
              />

              <span style={{ fontSize: "18px", color: "#787060", marginBottom: "4px" }}>
                Market Score
              </span>
              <span style={{ fontSize: "36px", fontWeight: "700", color: "#2b2823" }}>
                {data.score}/100
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

  // State OG Image
  if (data.type === "state") {
    const gradeStyle = getGradeColors(data.grade);

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
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "32px 48px",
              backgroundColor: "#2b2823",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  backgroundColor: "#787060",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: "24px",
                  fontWeight: "bold",
                }}
              >
                E
              </div>
              <span style={{ color: "white", fontSize: "28px", fontWeight: "600" }}>
                Edge by Teeco
              </span>
            </div>
            <div
              style={{
                backgroundColor: "#787060",
                color: "white",
                padding: "10px 24px",
                borderRadius: "20px",
                fontSize: "18px",
                fontWeight: "600",
              }}
            >
              State Overview
            </div>
          </div>

          {/* Content */}
          <div
            style={{
              flex: 1,
              display: "flex",
              padding: "48px",
              gap: "48px",
            }}
          >
            {/* Left - State Info */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
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
                {data.cityCount} STR Markets Analyzed
              </p>

              {/* Stats */}
              <div style={{ display: "flex", gap: "24px", marginTop: "auto" }}>
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: "16px",
                    padding: "20px 28px",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <span style={{ fontSize: "18px", color: "#787060" }}>Top Market</span>
                  <span style={{ fontSize: "28px", fontWeight: "700", color: "#2b2823" }}>
                    {data.topCity}
                  </span>
                </div>
                <div
                  style={{
                    backgroundColor: "white",
                    borderRadius: "16px",
                    padding: "20px 28px",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <span style={{ fontSize: "18px", color: "#787060" }}>State Code</span>
                  <span style={{ fontSize: "28px", fontWeight: "700", color: "#2b2823" }}>
                    {data.id}
                  </span>
                </div>
              </div>
            </div>

            {/* Right - Grade Card */}
            <div
              style={{
                width: "320px",
                backgroundColor: "white",
                borderRadius: "24px",
                padding: "32px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
              }}
            >
              <span style={{ fontSize: "20px", color: "#787060", marginBottom: "16px" }}>
                Investment Grade
              </span>
              <div
                style={{
                  width: "120px",
                  height: "120px",
                  borderRadius: "24px",
                  backgroundColor: gradeStyle.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ fontSize: "56px", fontWeight: "700", color: gradeStyle.text }}>
                  {data.grade}
                </span>
              </div>

              <div
                style={{
                  width: "100%",
                  height: "1px",
                  backgroundColor: "#e8e5df",
                  margin: "24px 0",
                }}
              />

              <span style={{ fontSize: "18px", color: "#787060", marginBottom: "4px" }}>
                Market Score
              </span>
              <span style={{ fontSize: "36px", fontWeight: "700", color: "#2b2823" }}>
                {data.score}/100
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

  return new Response("Unknown share type", { status: 400 });
}
