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

  // =========================================================================
  // DEAL OG IMAGE — Premium, bold, legible on mobile preview cards
  // =========================================================================
  if (data.type === "deal") {
    const grade = data.grade || calculateDealGrade(data.coc);
    const gradeColors = getGradeColors(grade);
    const cocColor = data.coc >= 20 ? "#16a34a" : data.coc >= 10 ? "#ca8a04" : "#dc2626";
    const monthlyRevenue = Math.round(data.revenue / 12);
    const compsCount = data.comparablesCount || 0;
    
    return new ImageResponse(
      (
        <div
          style={{
            width: "1200px",
            height: "630px",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#f5f4f0",
            fontFamily: "system-ui, -apple-system, sans-serif",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Top accent bar */}
          <div style={{ width: "100%", height: "6px", backgroundColor: "#2b2823", display: "flex" }} />
          
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "28px 48px 20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <span style={{ fontSize: "32px", fontWeight: "800", color: "#2b2823", letterSpacing: "-0.5px" }}>
                Edge
              </span>
              <div style={{ display: "flex", backgroundColor: "#2b2823", borderRadius: "8px", padding: "6px 14px" }}>
                <span style={{ color: "#d8d6cd", fontSize: "16px", fontWeight: "600" }}>by Teeco</span>
              </div>
            </div>
            {/* Grade Badge — large and prominent */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <span style={{ fontSize: "18px", color: "#787060", fontWeight: "500" }}>STR Grade</span>
              <div
                style={{
                  backgroundColor: gradeColors.bg,
                  color: gradeColors.text,
                  padding: "10px 24px",
                  borderRadius: "14px",
                  fontSize: "32px",
                  fontWeight: "800",
                  letterSpacing: "-0.5px",
                  display: "flex",
                }}
              >
                {grade}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div
            style={{
              flex: 1,
              display: "flex",
              padding: "8px 48px 36px",
              gap: "48px",
            }}
          >
            {/* Left Column — Property + Revenue Hero */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              {/* Address Block */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <h1
                  style={{
                    fontSize: "42px",
                    fontWeight: "800",
                    color: "#2b2823",
                    margin: "0",
                    lineHeight: 1.15,
                    letterSpacing: "-0.5px",
                  }}
                >
                  {data.address}
                </h1>
                <p
                  style={{
                    fontSize: "22px",
                    color: "#787060",
                    margin: "8px 0 0 0",
                    fontWeight: "500",
                  }}
                >
                  {data.city}, {data.state} &bull; {data.bedrooms} Bed / {data.bathrooms} Bath
                </p>
              </div>

              {/* Revenue Hero — the main number people see */}
              <div style={{ display: "flex", flexDirection: "column", marginTop: "24px" }}>
                <span style={{ fontSize: "18px", color: "#787060", fontWeight: "500", marginBottom: "4px" }}>
                  Projected Annual Revenue
                </span>
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                  <span
                    style={{
                      fontSize: "72px",
                      fontWeight: "800",
                      color: "#16a34a",
                      lineHeight: 1,
                      letterSpacing: "-2px",
                    }}
                  >
                    {formatCurrency(data.revenue)}
                  </span>
                  <span style={{ fontSize: "28px", color: "#16a34a", fontWeight: "600" }}>/yr</span>
                </div>
                <span style={{ fontSize: "20px", color: "#787060", marginTop: "4px" }}>
                  {formatCurrency(monthlyRevenue)}/mo estimated
                </span>
              </div>
            </div>

            {/* Right Column — Key Metrics Cards */}
            <div
              style={{
                width: "380px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                justifyContent: "center",
              }}
            >
              {/* Cash-on-Cash Return Card */}
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "20px",
                  padding: "24px 28px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "15px", color: "#787060", fontWeight: "500" }}>Cash-on-Cash Return</span>
                </div>
                <span style={{ fontSize: "40px", fontWeight: "800", color: cocColor, letterSpacing: "-1px" }}>
                  {data.coc.toFixed(1)}%
                </span>
              </div>

              {/* Occupancy Card */}
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "20px",
                  padding: "24px 28px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "15px", color: "#787060", fontWeight: "500" }}>Occupancy Rate</span>
                </div>
                <span style={{ fontSize: "40px", fontWeight: "800", color: "#2b2823", letterSpacing: "-1px" }}>
                  {data.occupancy}%
                </span>
              </div>

              {/* ADR Card */}
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "20px",
                  padding: "24px 28px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "15px", color: "#787060", fontWeight: "500" }}>Avg Nightly Rate</span>
                </div>
                <span style={{ fontSize: "40px", fontWeight: "800", color: "#2b2823", letterSpacing: "-1px" }}>
                  ${data.adr}
                </span>
              </div>

              {/* Data Confidence Footer */}
              {compsCount > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    padding: "12px 0 0",
                  }}
                >
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#16a34a", display: "flex" }} />
                  <span style={{ fontSize: "15px", color: "#787060", fontWeight: "500" }}>
                    Based on {compsCount} comparable listings analyzed
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 48px",
              backgroundColor: "#2b2823",
            }}
          >
            <span style={{ color: "#d8d6cd", fontSize: "16px" }}>
              edge.teeco.co
            </span>
            <span style={{ color: "#787060", fontSize: "15px" }}>
              Free STR analysis for any US address
            </span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  }

  // =========================================================================
  // CITY OG IMAGE — Premium market analysis card
  // =========================================================================
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
            backgroundColor: "#f5f4f0",
            fontFamily: "system-ui, -apple-system, sans-serif",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Top accent bar */}
          <div style={{ width: "100%", height: "6px", backgroundColor: "#2b2823", display: "flex" }} />
          
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "28px 48px 20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <span style={{ fontSize: "32px", fontWeight: "800", color: "#2b2823", letterSpacing: "-0.5px" }}>
                Edge
              </span>
              <div style={{ display: "flex", backgroundColor: "#2b2823", borderRadius: "8px", padding: "6px 14px" }}>
                <span style={{ color: "#d8d6cd", fontSize: "16px", fontWeight: "600" }}>by Teeco</span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "18px", color: "#787060", fontWeight: "500" }}>STR Grade</span>
              <div
                style={{
                  backgroundColor: gradeColors.bg,
                  color: gradeColors.text,
                  padding: "10px 24px",
                  borderRadius: "14px",
                  fontSize: "32px",
                  fontWeight: "800",
                  display: "flex",
                }}
              >
                {data.grade}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div
            style={{
              flex: 1,
              display: "flex",
              padding: "8px 48px 36px",
              gap: "48px",
            }}
          >
            {/* Left — City Info + Score Hero */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <h1
                  style={{
                    fontSize: "56px",
                    fontWeight: "800",
                    color: "#2b2823",
                    margin: "0",
                    lineHeight: 1.1,
                    letterSpacing: "-1px",
                  }}
                >
                  {data.name}
                </h1>
                <p style={{ fontSize: "26px", color: "#787060", margin: "8px 0 0", fontWeight: "500" }}>
                  {data.state}
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", marginTop: "24px" }}>
                <span style={{ fontSize: "18px", color: "#787060", fontWeight: "500", marginBottom: "4px" }}>
                  Market Score
                </span>
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                  <span
                    style={{
                      fontSize: "80px",
                      fontWeight: "800",
                      color: "#2b2823",
                      lineHeight: 1,
                      letterSpacing: "-2px",
                    }}
                  >
                    {data.score}
                  </span>
                  <span style={{ fontSize: "32px", color: "#787060", fontWeight: "600" }}>/100</span>
                </div>
              </div>
            </div>

            {/* Right — Metrics Cards */}
            <div
              style={{
                width: "380px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "20px",
                  padding: "24px 28px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                }}
              >
                <span style={{ fontSize: "15px", color: "#787060", fontWeight: "500" }}>Avg Annual Revenue</span>
                <span style={{ fontSize: "36px", fontWeight: "800", color: "#16a34a", letterSpacing: "-1px" }}>
                  {formatCurrency(data.revenue * 12)}
                </span>
              </div>

              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "20px",
                  padding: "24px 28px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                }}
              >
                <span style={{ fontSize: "15px", color: "#787060", fontWeight: "500" }}>Median Home Price</span>
                <span style={{ fontSize: "36px", fontWeight: "800", color: "#2b2823", letterSpacing: "-1px" }}>
                  {formatCurrency(data.price)}
                </span>
              </div>

              {data.appreciation && (
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "20px",
                    padding: "24px 28px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                  }}
                >
                  <span style={{ fontSize: "15px", color: "#787060", fontWeight: "500" }}>YoY Appreciation</span>
                  <span style={{ fontSize: "36px", fontWeight: "800", color: "#16a34a", letterSpacing: "-1px" }}>
                    +{data.appreciation}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 48px",
              backgroundColor: "#2b2823",
            }}
          >
            <span style={{ color: "#d8d6cd", fontSize: "16px" }}>edge.teeco.co</span>
            <span style={{ color: "#787060", fontSize: "15px" }}>Explore 1,000+ STR markets across the US</span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  }

  // =========================================================================
  // STATE OG IMAGE — Premium state analysis card
  // =========================================================================
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
            backgroundColor: "#f5f4f0",
            fontFamily: "system-ui, -apple-system, sans-serif",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Top accent bar */}
          <div style={{ width: "100%", height: "6px", backgroundColor: "#2b2823", display: "flex" }} />
          
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "28px 48px 20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <span style={{ fontSize: "32px", fontWeight: "800", color: "#2b2823", letterSpacing: "-0.5px" }}>
                Edge
              </span>
              <div style={{ display: "flex", backgroundColor: "#2b2823", borderRadius: "8px", padding: "6px 14px" }}>
                <span style={{ color: "#d8d6cd", fontSize: "16px", fontWeight: "600" }}>by Teeco</span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "18px", color: "#787060", fontWeight: "500" }}>STR Grade</span>
              <div
                style={{
                  backgroundColor: gradeColors.bg,
                  color: gradeColors.text,
                  padding: "10px 24px",
                  borderRadius: "14px",
                  fontSize: "32px",
                  fontWeight: "800",
                  display: "flex",
                }}
              >
                {data.grade}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div
            style={{
              flex: 1,
              display: "flex",
              padding: "8px 48px 36px",
              gap: "48px",
            }}
          >
            {/* Left — State Info + Score Hero */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <h1
                  style={{
                    fontSize: "56px",
                    fontWeight: "800",
                    color: "#2b2823",
                    margin: "0",
                    lineHeight: 1.1,
                    letterSpacing: "-1px",
                  }}
                >
                  {data.name}
                </h1>
                <p style={{ fontSize: "22px", color: "#787060", margin: "8px 0 0", fontWeight: "500" }}>
                  {data.cityCount} markets analyzed
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", marginTop: "24px" }}>
                <span style={{ fontSize: "18px", color: "#787060", fontWeight: "500", marginBottom: "4px" }}>
                  State Score
                </span>
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                  <span
                    style={{
                      fontSize: "80px",
                      fontWeight: "800",
                      color: "#2b2823",
                      lineHeight: 1,
                      letterSpacing: "-2px",
                    }}
                  >
                    {data.score}
                  </span>
                  <span style={{ fontSize: "32px", color: "#787060", fontWeight: "600" }}>/100</span>
                </div>
              </div>
            </div>

            {/* Right — Metrics Cards */}
            <div
              style={{
                width: "380px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "20px",
                  padding: "24px 28px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                }}
              >
                <span style={{ fontSize: "15px", color: "#787060", fontWeight: "500" }}>Top Market</span>
                <span style={{ fontSize: "28px", fontWeight: "800", color: "#2b2823" }}>
                  {data.topCity}
                </span>
              </div>

              {data.avgRevenue && (
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "20px",
                    padding: "24px 28px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                  }}
                >
                  <span style={{ fontSize: "15px", color: "#787060", fontWeight: "500" }}>Avg Revenue</span>
                  <span style={{ fontSize: "36px", fontWeight: "800", color: "#16a34a", letterSpacing: "-1px" }}>
                    {formatCurrency(data.avgRevenue)}
                  </span>
                </div>
              )}

              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "20px",
                  padding: "24px 28px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                }}
              >
                <span style={{ fontSize: "15px", color: "#787060", fontWeight: "500" }}>Markets</span>
                <span style={{ fontSize: "36px", fontWeight: "800", color: "#2b2823", letterSpacing: "-1px" }}>
                  {data.cityCount}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 48px",
              backgroundColor: "#2b2823",
            }}
          >
            <span style={{ color: "#d8d6cd", fontSize: "16px" }}>edge.teeco.co</span>
            <span style={{ color: "#787060", fontSize: "15px" }}>Explore 1,000+ STR markets across the US</span>
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
