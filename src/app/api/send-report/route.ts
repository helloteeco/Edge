import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const RESEND_API_KEY = process.env.RESEND_API_KEY;

function fmt(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

function buildInlineEmailHtml(params: {
  senderName: string;
  strategyLabel: string;
  propertyAddress: string;
  summary: string;
  inlineData?: any;
}): string {
  const { senderName, strategyLabel, propertyAddress, summary, inlineData } = params;
  const d = inlineData;

  // Verdict color mapping
  const verdictColorMap: Record<string, string> = {
    "STRONG BUY": "#16a34a", "GO STR": "#16a34a",
    "GOOD DEAL": "#22c55e", "STR FAVORED": "#22c55e",
    "CONSIDER": "#eab308", "CLOSE CALL": "#eab308", "PASS": "#f59e0b",
    "CAUTION": "#ef4444", "MARGINAL STR": "#ef4444", "LTR BETTER": "#ef4444",
  };
  const verdictBgMap: Record<string, string> = {
    "#16a34a": "#dcfce7", "#22c55e": "#ecfdf5", "#eab308": "#fefce8",
    "#f59e0b": "#fef3c7", "#ef4444": "#fef2f2",
  };

  const verdictColor = d ? (verdictColorMap[d.verdict] || "#f59e0b") : "#f59e0b";
  const verdictBg = verdictBgMap[verdictColor] || "#fef3c7";

  // Monthly forecast table rows (2 columns x 6 rows)
  let monthlyForecastHtml = "";
  if (d?.monthlyRevenues) {
    const rows: string[] = [];
    for (let i = 0; i < 12; i += 2) {
      const m1 = d.monthlyRevenues[i];
      const m2 = d.monthlyRevenues[i + 1];
      rows.push(`<tr>
        <td style="padding:6px 12px;font-size:13px;color:#2b2823;border-bottom:1px solid #f0ede8;">${m1.month}</td>
        <td style="padding:6px 12px;font-size:13px;font-weight:600;color:#2b2823;border-bottom:1px solid #f0ede8;text-align:right;">${fmt(m1.revenue)}</td>
        <td style="padding:6px 12px;font-size:13px;color:#2b2823;border-bottom:1px solid #f0ede8;">${m2.month}</td>
        <td style="padding:6px 12px;font-size:13px;font-weight:600;color:#2b2823;border-bottom:1px solid #f0ede8;text-align:right;">${fmt(m2.revenue)}</td>
      </tr>`);
    }
    monthlyForecastHtml = rows.join("");
  }

  // Strategy-specific metrics
  let strategyMetricsHtml = "";
  if (d?.buying) {
    strategyMetricsHtml = `
      <tr><td style="padding:8px 16px;font-size:13px;color:#787060;">Purchase Price</td><td style="padding:8px 16px;font-size:13px;font-weight:600;color:#2b2823;text-align:right;">${fmt(d.buying.purchasePrice)}</td></tr>
      <tr><td style="padding:8px 16px;font-size:13px;color:#787060;background:#fafaf8;">Down Payment</td><td style="padding:8px 16px;font-size:13px;font-weight:600;color:#2b2823;text-align:right;background:#fafaf8;">${fmt(d.buying.downPayment)}</td></tr>
      <tr><td style="padding:8px 16px;font-size:13px;color:#787060;">Monthly Mortgage</td><td style="padding:8px 16px;font-size:13px;font-weight:600;color:#2b2823;text-align:right;">${fmt(d.buying.monthlyMortgage)}</td></tr>
      <tr><td style="padding:8px 16px;font-size:13px;color:#787060;background:#fafaf8;">Cash-on-Cash Return</td><td style="padding:8px 16px;font-size:13px;font-weight:700;color:${d.buying.cashOnCashReturn >= 0 ? '#16a34a' : '#ef4444'};text-align:right;background:#fafaf8;">${d.buying.cashOnCashReturn.toFixed(1)}%</td></tr>
      <tr><td style="padding:8px 16px;font-size:13px;color:#787060;">Monthly Cash Flow</td><td style="padding:8px 16px;font-size:13px;font-weight:700;color:${d.buying.monthlyCashFlow >= 0 ? '#16a34a' : '#ef4444'};text-align:right;">${fmt(d.buying.monthlyCashFlow)}</td></tr>
      <tr style="border-top:2px solid #2b2823;"><td style="padding:10px 16px;font-size:14px;font-weight:700;color:#2b2823;">Total Cash Required</td><td style="padding:10px 16px;font-size:14px;font-weight:700;color:#2b2823;text-align:right;">${fmt(d.buying.totalCashNeeded)}</td></tr>`;
  } else if (d?.arbitrage) {
    strategyMetricsHtml = `
      <tr><td style="padding:8px 16px;font-size:13px;color:#787060;">Monthly Rent</td><td style="padding:8px 16px;font-size:13px;font-weight:600;color:#2b2823;text-align:right;">${fmt(d.arbitrage.monthlyRent)}</td></tr>
      <tr><td style="padding:8px 16px;font-size:13px;color:#787060;background:#fafaf8;">Cash-on-Cash Return</td><td style="padding:8px 16px;font-size:13px;font-weight:700;color:${d.arbitrage.cashOnCashReturn >= 0 ? '#16a34a' : '#ef4444'};text-align:right;background:#fafaf8;">${d.arbitrage.cashOnCashReturn.toFixed(1)}%</td></tr>
      <tr><td style="padding:8px 16px;font-size:13px;color:#787060;">Monthly Cash Flow</td><td style="padding:8px 16px;font-size:13px;font-weight:700;color:${d.arbitrage.monthlyCashFlow >= 0 ? '#16a34a' : '#ef4444'};text-align:right;">${fmt(d.arbitrage.monthlyCashFlow)}</td></tr>
      <tr style="border-top:2px solid #2b2823;"><td style="padding:10px 16px;font-size:14px;font-weight:700;color:#2b2823;">Total Cash to Start</td><td style="padding:10px 16px;font-size:14px;font-weight:700;color:#2b2823;text-align:right;">${fmt(d.arbitrage.totalCashNeeded)}</td></tr>`;
  } else if (d?.iownit) {
    const winColor = d.iownit.strWins ? "#16a34a" : "#2563eb";
    strategyMetricsHtml = `
      <tr><td style="padding:8px 16px;font-size:13px;color:#787060;">STR Monthly Net</td><td style="padding:8px 16px;font-size:13px;font-weight:700;color:${d.iownit.strMonthlyCashFlow >= 0 ? '#16a34a' : '#ef4444'};text-align:right;">${fmt(d.iownit.strMonthlyCashFlow)}</td></tr>
      <tr><td style="padding:8px 16px;font-size:13px;color:#787060;background:#fafaf8;">LTR Monthly Net</td><td style="padding:8px 16px;font-size:13px;font-weight:600;color:#2563eb;text-align:right;background:#fafaf8;">${fmt(d.iownit.ltrMonthlyCashFlow)}</td></tr>
      <tr><td style="padding:8px 16px;font-size:13px;color:#787060;">Setup Cost</td><td style="padding:8px 16px;font-size:13px;font-weight:600;color:#2b2823;text-align:right;">${fmt(d.iownit.startupCosts)}</td></tr>
      <tr style="border-top:2px solid ${winColor};"><td style="padding:10px 16px;font-size:14px;font-weight:700;color:${winColor};">${d.iownit.strWins ? 'STR Wins' : 'LTR Wins'}</td><td style="padding:10px 16px;font-size:14px;font-weight:700;color:${winColor};text-align:right;">+${fmt(Math.abs(d.iownit.monthlyDifference))}/mo</td></tr>`;
  }

  // Expenses section
  let expensesHtml = "";
  if (d?.expenses) {
    const e = d.expenses;
    expensesHtml = `
    <div style="background:#ffffff;padding:24px 32px;border-bottom:1px solid #e5e3da;">
      <p style="color:#2b2823;font-size:16px;font-weight:700;margin:0 0 4px 0;">Monthly Operating Expenses</p>
      <p style="color:#787060;font-size:12px;margin:0 0 16px 0;">Adjusted by the analyst</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <tr><td style="padding:5px 0;font-size:12px;color:#787060;">Electric/Gas</td><td style="padding:5px 0;font-size:12px;color:#2b2823;text-align:right;">${fmt(e.electric)}</td><td style="padding:5px 0 5px 20px;font-size:12px;color:#787060;">House Supplies</td><td style="padding:5px 0;font-size:12px;color:#2b2823;text-align:right;">${fmt(e.houseSupplies)}</td></tr>
        <tr><td style="padding:5px 0;font-size:12px;color:#787060;">Water/Sewer</td><td style="padding:5px 0;font-size:12px;color:#2b2823;text-align:right;">${fmt(e.water)}</td><td style="padding:5px 0 5px 20px;font-size:12px;color:#787060;">Consumables</td><td style="padding:5px 0;font-size:12px;color:#2b2823;text-align:right;">${fmt(e.consumables)}</td></tr>
        <tr><td style="padding:5px 0;font-size:12px;color:#787060;">Internet/WiFi</td><td style="padding:5px 0;font-size:12px;color:#2b2823;text-align:right;">${fmt(e.internet)}</td><td style="padding:5px 0 5px 20px;font-size:12px;color:#787060;">Rental Software</td><td style="padding:5px 0;font-size:12px;color:#2b2823;text-align:right;">${fmt(e.rentalSoftware)}</td></tr>
        <tr><td style="padding:5px 0;font-size:12px;color:#787060;">Trash</td><td style="padding:5px 0;font-size:12px;color:#2b2823;text-align:right;">${fmt(e.trash)}</td><td style="padding:5px 0 5px 20px;font-size:12px;color:#787060;">Lawn Care</td><td style="padding:5px 0;font-size:12px;color:#2b2823;text-align:right;">${fmt(e.lawnCare)}</td></tr>
        <tr><td style="padding:5px 0;font-size:12px;color:#787060;">Pest Control</td><td style="padding:5px 0;font-size:12px;color:#2b2823;text-align:right;">${fmt(e.pestControl)}</td><td style="padding:5px 0 5px 20px;font-size:12px;color:#787060;">Maintenance</td><td style="padding:5px 0;font-size:12px;color:#2b2823;text-align:right;">${fmt(e.maintenance)}</td></tr>
      </table>
      <div style="margin-top:12px;padding:10px 16px;background:#2b2823;border-radius:8px;display:flex;justify-content:space-between;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="color:#b8a88a;font-size:13px;font-weight:600;">Total Monthly Expenses</td>
          <td style="color:#ffffff;font-size:15px;font-weight:700;text-align:right;">${fmt(e.totalMonthly)}/mo</td>
        </tr><tr>
          <td style="color:#787060;font-size:11px;padding-top:2px;">Mgmt ${d.managementFeePercent}% + Platform ${d.platformFeePercent}% applied separately</td>
          <td></td>
        </tr></table>
      </div>
    </div>`;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f4f0;">
  <div style="max-width: 640px; margin: 0 auto; padding: 32px 16px;">
    
    <!-- Header -->
    <div style="background: #2b2823; border-radius: 16px 16px 0 0; padding: 28px 32px; text-align: center;">
      <p style="color: #b8a88a; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px 0; font-weight: 600;">Edge by Teeco</p>
      <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0; letter-spacing: -0.3px;">${strategyLabel} Analysis</h1>
    </div>
    
    <!-- Intro -->
    <div style="background: #ffffff; padding: 28px 32px; border-bottom: 1px solid #e5e3da;">
      <p style="color: #2b2823; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
        <strong>${senderName}</strong> shared an investment analysis with you:
      </p>
      <div style="background: #f5f4f0; border-radius: 12px; padding: 16px 20px;">
        <p style="color: #2b2823; font-size: 17px; font-weight: 700; margin: 0 0 4px 0;">${propertyAddress}</p>
        ${d ? `<p style="color: #787060; font-size: 13px; margin: 0;">${d.bedrooms} BR / ${d.bathrooms} BA / Sleeps ${d.guestCount} &middot; ${d.sqft?.toLocaleString() || '—'} sqft &middot; ${d.propertyType}</p>` : `<p style="color: #787060; font-size: 13px; margin: 0;">Strategy: ${strategyLabel}</p>`}
      </div>
    </div>
    
    ${d ? `
    <!-- Deal Score -->
    <div style="background: ${verdictBg}; padding: 24px 32px; border-bottom: 1px solid #e5e3da; text-align: center;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td width="80" style="vertical-align: middle;">
          <div style="width: 64px; height: 64px; border-radius: 50%; border: 3px solid ${verdictColor}; display: inline-block; line-height: 58px; text-align: center; font-size: 24px; font-weight: 800; color: ${verdictColor};">${d.dealScore}</div>
        </td>
        <td style="vertical-align: middle; text-align: left; padding-left: 16px;">
          <p style="font-size: 20px; font-weight: 800; color: ${verdictColor}; margin: 0; letter-spacing: -0.5px;">${d.verdict}</p>
          <p style="font-size: 13px; color: ${verdictColor}; margin: 4px 0 0 0; opacity: 0.85;">Deal Score: ${d.dealScore}/100</p>
        </td>
      </tr></table>
    </div>
    
    <!-- Key Metrics Grid -->
    <div style="background: #ffffff; padding: 24px 32px; border-bottom: 1px solid #e5e3da;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="33%" style="text-align: center; padding: 12px 8px; vertical-align: top;">
            <p style="font-size: 22px; font-weight: 800; color: #16a34a; margin: 0;">${fmt(d.annualRevenue)}</p>
            <p style="font-size: 11px; color: #787060; margin: 4px 0 0 0;">Annual Revenue</p>
          </td>
          <td width="33%" style="text-align: center; padding: 12px 8px; vertical-align: top; border-left: 1px solid #f0ede8; border-right: 1px solid #f0ede8;">
            <p style="font-size: 22px; font-weight: 800; color: #2b2823; margin: 0;">${fmt(d.adr)}</p>
            <p style="font-size: 11px; color: #787060; margin: 4px 0 0 0;">Avg Daily Rate</p>
          </td>
          <td width="33%" style="text-align: center; padding: 12px 8px; vertical-align: top;">
            <p style="font-size: 22px; font-weight: 800; color: #2b2823; margin: 0;">${d.occupancy}%</p>
            <p style="font-size: 11px; color: #787060; margin: 4px 0 0 0;">Occupancy</p>
          </td>
        </tr>
      </table>
    </div>
    
    <!-- Strategy-Specific Financial Analysis -->
    <div style="background: #ffffff; padding: 24px 32px; border-bottom: 1px solid #e5e3da;">
      <p style="color: #2b2823; font-size: 16px; font-weight: 700; margin: 0 0 16px 0;">Financial Analysis</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
        ${strategyMetricsHtml}
      </table>
    </div>
    
    <!-- Monthly Revenue Forecast -->
    ${d.monthlyRevenues ? `
    <div style="background: #ffffff; padding: 24px 32px; border-bottom: 1px solid #e5e3da;">
      <p style="color: #2b2823; font-size: 16px; font-weight: 700; margin: 0 0 4px 0;">Monthly Revenue Forecast</p>
      <p style="color: #787060; font-size: 12px; margin: 0 0 16px 0;">Seasonal demand projection</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
        ${monthlyForecastHtml}
      </table>
      <div style="margin-top:12px;padding:10px 16px;background:#ecfdf5;border-radius:8px;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="font-size:13px;color:#787060;">Projected Annual Total</td>
          <td style="font-size:16px;font-weight:700;color:#16a34a;text-align:right;">${fmt(d.annualRevenue)}</td>
        </tr></table>
      </div>
    </div>` : ''}
    
    <!-- Operating Expenses -->
    ${expensesHtml}
    ` : `
    <!-- Fallback: Summary only -->
    <div style="background: #ffffff; padding: 24px 32px; border-bottom: 1px solid #e5e3da;">
      ${summary ? `<div style="border-left: 3px solid #b8a88a; padding-left: 16px;">
        <p style="color: #2b2823; font-size: 13px; line-height: 1.6; margin: 0; white-space: pre-line;">${summary}</p>
      </div>` : ''}
    </div>
    `}
    
    <!-- CTA -->
    <div style="background: #ffffff; padding: 24px 32px; text-align: center; border-bottom: 1px solid #e5e3da;">
      <p style="color: #787060; font-size: 13px; margin: 0 0 16px 0;">The full detailed report is attached as an HTML file. Open it in any browser for the complete analysis with charts and projections.</p>
      <a href="https://edge.teeco.co/calculator" style="display: inline-block; background: #2b2823; color: white; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 32px; border-radius: 10px;">
        Run Your Own Analysis
      </a>
    </div>
    
    <!-- Footer -->
    <div style="background: #2b2823; border-radius: 0 0 16px 16px; padding: 20px 32px; text-align: center;">
      <p style="color: #b8a88a; font-size: 13px; font-weight: 600; margin: 0 0 4px 0;">Edge by Teeco</p>
      <p style="color: rgba(255,255,255,0.4); font-size: 11px; margin: 0 0 8px 0;">Your unfair advantage in STR investing</p>
      <a href="https://edge.teeco.co" style="color: #b8a88a; font-size: 11px;">edge.teeco.co</a>
      <p style="color: rgba(255,255,255,0.25); font-size: 9px; margin: 12px 0 0 0; line-height: 1.5;">
        This analysis is for informational and educational purposes only and does not constitute financial, legal, or investment advice.
      </p>
    </div>
    
  </div>
</body>
</html>`;
}

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    const rateLimitResult = await rateLimit(`send-report:${clientIP}`, { limit: 10, windowSeconds: 600 });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: "Too many emails sent. Please wait a few minutes." },
        { status: 429 }
      );
    }

    if (!RESEND_API_KEY) {
      return NextResponse.json(
        { success: false, error: "Email service not configured." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { recipientEmail, senderEmail, reportHtml, propertyAddress, strategy, summary, inlineData } = body;

    if (!recipientEmail || !recipientEmail.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Valid email address is required." },
        { status: 400 }
      );
    }

    if (!reportHtml || !propertyAddress) {
      return NextResponse.json(
        { success: false, error: "Report data is required." },
        { status: 400 }
      );
    }

    const senderName = senderEmail || "An Edge by Teeco user";
    const strategyLabel = strategy || "STR Investment";

    // Build rich inline email with all key metrics rendered directly in the email body
    const emailHtml = buildInlineEmailHtml({
      senderName,
      strategyLabel,
      propertyAddress,
      summary,
      inlineData,
    });

    // Send via Resend with the full report HTML as an attachment
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Edge by Teeco <noreply@edge.teeco.co>",
        to: [recipientEmail.toLowerCase().trim()],
        subject: `${strategyLabel} Analysis — ${propertyAddress} | Edge by Teeco`,
        html: emailHtml,
        attachments: [
          {
            filename: `Edge-Report-${propertyAddress.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').substring(0, 60)}.html`,
            content: Buffer.from(reportHtml).toString("base64"),
            type: "text/html",
          },
        ],
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error("[SendReport] Resend API error:", errorData);
      return NextResponse.json(
        { success: false, error: "Failed to send email. Please try again." },
        { status: 500 }
      );
    }

    const responseData = await emailResponse.json();
    console.log("[SendReport] Email sent successfully:", responseData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SendReport] Error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}
