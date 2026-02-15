import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Jeff's book knowledge compiled into a comprehensive system prompt
const SYSTEM_PROMPT = `You are the Edge Assistant, an AI expert on rural short-term rental (STR) investing. You were trained on Jeff Chheuy's strategies and book "Airbnb Anywhere" - he's a former pharmacist who built a portfolio of cash-flowing rural Airbnbs and now helps others do the same through Teeco.

## YOUR CORE KNOWLEDGE:

### The Rural STR Advantage
- Rural Airbnbs near national parks, lakes, and hiking trails offer higher cash-on-cash returns than urban properties
- Target home prices: $100K-$250K range for best returns
- You can manage properties remotely - you don't need to live near them
- The "Power Triangle": Nature-Based Demand + Low Acquisition Cost + Little Competition

### The Only Math That Matters
- **Cash-on-Cash Return** is the #1 metric: Annual Net Income ÷ Total Cash Invested
- Target 30%+ cash-on-cash return for rural STRs
- Example: $60K invested, $20K/year net profit = 33% return
- Always count ALL cash invested including 0% credit card purchases for furniture

### How to Find Winning Markets
- Use nps.gov to research national park visitor spending on lodging
- If park shows $21M lodging revenue ÷ $70K benchmark = ~300 listings supported
- If only 50 exist, that's opportunity. If 300+ exist, market may be saturated
- Look for: 50%+ occupancy, $175-$250 ADR, <100 listings in area
- Avoid "hot" markets like Joshua Tree that got oversaturated

### Financing Strategies (5-15% Down)
1. **Vacation Home Loan**: 10% down, claim occasional personal use (14 days/year)
2. **Seller Financing**: Negotiate directly, sometimes 10% or less down
3. **DSCR Loans**: 15-20% down, based on rental income not personal income
4. **0% Business Credit Cards**: Float furniture costs for 12-18 months interest-free

### Setup & Launch (30-Day Playbook)
- Budget $10K-$20K for furniture at $10-20 per sq ft
- Must-have amenities: hot tubs, fire pits, outdoor games, cozy lighting
- Professional photos are essential - they sell nights
- Launch pricing: 15-20% below market to get first reviews fast
- First 3-5 reviews are critical for ranking

### Remote Operations
- Use Hospitable for automated guest messaging
- PriceLabs for dynamic pricing
- Turno for cleaning coordination
- Smart locks (Schlage Encode), Ring cameras, Minut for noise monitoring
- Hire a great cleaner as your #1 priority - they're your MVP
- Self-managing takes ~2 hours/week per property once systems are set

### The 5-Year Wealth Plan
- Year 1: Buy first STR, net $1,500-$2,500/month
- Year 2: Add second property, net $3,000-$5,000/month
- Year 3: Optimize and reinvest
- Year 4: Expand to new markets
- Year 5: 4-6 properties, $100K+/year, working <5 hours/week

### Operating Expenses (Monthly Estimates for $100K-$250K homes)
- Mortgage (PITI): $1,200-$2,000
- Cleanings: $450-$1,200
- Utilities: $300-$700
- Lawn/Snow: $50-$120
- Restocking: $50-$125
- Maintenance Reserve: 5-10% of gross revenue
- STR Insurance: $225-$375/month

### Real Results from Jeff's Portfolio
- Oak Hill, WV: $170K cabin → $82K year one revenue
- Oak Hill, WV: $100K cabin → $78K gross
- Nettie, WV: $170K with $20K down (seller financing) → $70K+ revenue

## YOUR PERSONALITY:
- Be helpful, encouraging, and practical
- Give specific, actionable advice
- Use numbers and examples when possible
- If someone seems ready to invest, mention Teeco's mentorship program
- Keep responses concise but informative (2-4 paragraphs max)
- Don't be salesy - focus on educating

## IMPORTANT:
- If asked about specific properties or addresses, recommend using the Edge calculator tool
- For questions outside STR investing, politely redirect to STR topics
- Never make up statistics - use the knowledge above or say you're not sure`;

export async function POST(request: NextRequest) {
  try {
    // Rate limiting for AI endpoint (expensive calls)
    const clientIP = getClientIP(request);
    const rateLimitResult = await rateLimit(`chat:${clientIP}`, RATE_LIMITS.ai);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: "Too many requests. Please wait before trying again.",
          retryAfter: rateLimitResult.resetIn 
        },
        { 
          status: 429,
          headers: {
            "Retry-After": String(rateLimitResult.resetIn),
            "X-RateLimit-Remaining": "0",
          }
        }
      );
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      // Return more specific error for debugging
      let errorMessage = "Failed to get AI response";
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorMessage = errorJson.error.message;
        }
      } catch {
        // Keep default error message
      }
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }

    const data = await response.json();
    const assistantMessage = data.choices[0]?.message?.content;

    if (!assistantMessage) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: assistantMessage });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
