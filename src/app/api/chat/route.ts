import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";
import { cityData, stateData, getMarketCounts, DATA_LAST_UPDATED } from "@/data/helpers";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ── Precomputed lookup tables (built once at module load) ──────────────
const cityByName = new Map<string, typeof cityData[number]>();
const citiesByState = new Map<string, typeof cityData>();
for (const c of cityData) {
  cityByName.set(`${c.name.toLowerCase()}, ${c.stateCode.toLowerCase()}`, c);
  cityByName.set(c.name.toLowerCase(), c); // fallback without state
  const arr = citiesByState.get(c.stateCode.toLowerCase()) || [];
  arr.push(c);
  citiesByState.set(c.stateCode.toLowerCase(), arr);
}

const stateByCode = new Map<string, typeof stateData[number]>();
const stateByName = new Map<string, typeof stateData[number]>();
for (const s of stateData) {
  stateByCode.set(s.abbreviation.toLowerCase(), s);
  stateByName.set(s.name.toLowerCase(), s);
}

// ── Helper: find a city flexibly ───────────────────────────────────────
function findCity(query: string) {
  const q = query.toLowerCase().trim();
  // exact "city, ST"
  if (cityByName.has(q)) return cityByName.get(q)!;
  // fuzzy: starts-with
  const entries = Array.from(cityByName.entries());
  for (const [key, city] of entries) {
    if (key.startsWith(q) || key.includes(q)) return city;
  }
  return null;
}

function findState(query: string) {
  const q = query.toLowerCase().trim();
  return stateByCode.get(q) || stateByName.get(q) || null;
}

// ── Tool definitions for OpenAI function calling ──────────────────────
const tools = [
  {
    type: "function" as const,
    function: {
      name: "lookup_city",
      description: "Look up STR market data for a specific city including grade, revenue, occupancy, ADR, home prices, cash-on-cash return, regulation status, and top amenities.",
      parameters: {
        type: "object",
        properties: {
          city_name: { type: "string", description: "City name, optionally with state code e.g. 'Gatlinburg, TN' or 'Gatlinburg'" },
        },
        required: ["city_name"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "lookup_state",
      description: "Look up state-level STR data including grade, average ADR, median home value, appreciation, net migration, and number of analyzed cities.",
      parameters: {
        type: "object",
        properties: {
          state: { type: "string", description: "State name or two-letter code e.g. 'Tennessee' or 'TN'" },
        },
        required: ["state"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "find_top_markets",
      description: "Find the top STR markets matching criteria like max home price, min cash-on-cash return, min occupancy, or specific state. Returns up to 10 results sorted by market score.",
      parameters: {
        type: "object",
        properties: {
          max_home_price: { type: "number", description: "Maximum median home price" },
          min_cash_on_cash: { type: "number", description: "Minimum cash-on-cash return percentage" },
          min_occupancy: { type: "number", description: "Minimum occupancy rate (0-100)" },
          state: { type: "string", description: "Filter to a specific state (name or code)" },
          limit: { type: "number", description: "Max results to return (default 8)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "compare_markets",
      description: "Compare two or more cities side by side on key STR metrics.",
      parameters: {
        type: "object",
        properties: {
          cities: {
            type: "array",
            items: { type: "string" },
            description: "List of city names to compare e.g. ['Gatlinburg, TN', 'Pigeon Forge, TN']",
          },
        },
        required: ["cities"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_platform_stats",
      description: "Get overall Edge platform statistics: total cities covered, markets with full data, data freshness date.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
];

// ── Tool execution ────────────────────────────────────────────────────
function executeTool(name: string, args: Record<string, unknown>): string {
  switch (name) {
    case "lookup_city": {
      const city = findCity(args.city_name as string);
      if (!city) return JSON.stringify({ error: `City "${args.city_name}" not found in our database of ${cityData.length} analyzed markets. The user can try the Calculator tab to analyze any US address.` });
      return JSON.stringify({
        name: city.name,
        state: city.stateCode,
        grade: city.grade,
        verdict: city.verdict,
        marketScore: city.marketScore,
        cashOnCash: `${city.cashOnCash.toFixed(1)}%`,
        monthlyRevenue: `$${city.strMonthlyRevenue.toLocaleString()}`,
        annualRevenue: `$${(city.strMonthlyRevenue * 12).toLocaleString()}`,
        avgADR: `$${city.avgADR}`,
        occupancy: `${city.occupancy}%`,
        medianHomeValue: `$${city.medianHomeValue.toLocaleString()}`,
        population: city.population.toLocaleString(),
        regulation: city.strStatus,
        permitRequired: city.permitRequired,
        listingsPerThousand: city.listingsPerThousand,
        marketType: city.marketType,
        highlights: city.highlights,
        topAmenities: city.amenityDelta.slice(0, 5).map(a => `${a.name} (+${a.boost}% boost)`),
        incomeByBedroom: Object.entries(city.incomeBySize).map(([br, rev]) => `${br}BR: $${(rev as number).toLocaleString()}/yr`),
        scores: city.scores,
      });
    }
    case "lookup_state": {
      const state = findState(args.state as string);
      if (!state) return JSON.stringify({ error: `State "${args.state}" not found.` });
      const cities = citiesByState.get(state.abbreviation.toLowerCase()) || [];
      const topCities = [...cities].sort((a, b) => b.marketScore - a.marketScore).slice(0, 5);
      return JSON.stringify({
        name: state.name,
        abbreviation: state.abbreviation,
        grade: state.grade,
        verdict: state.verdict,
        avgADR: `$${state.avgADR}`,
        medianHomeValue: `$${state.medianHomeValue.toLocaleString()}`,
        appreciation: `${state.appreciation}%`,
        netMigration: state.netMigration.toLocaleString(),
        regulation: state.regulation,
        analyzedCities: state.cityCount,
        topCities: topCities.map(c => ({
          name: c.name,
          grade: c.grade,
          cashOnCash: `${c.cashOnCash.toFixed(1)}%`,
          annualRevenue: `$${(c.strMonthlyRevenue * 12).toLocaleString()}`,
          medianHomeValue: `$${c.medianHomeValue.toLocaleString()}`,
        })),
      });
    }
    case "find_top_markets": {
      let filtered = [...cityData];
      if (args.max_home_price) filtered = filtered.filter(c => c.medianHomeValue <= (args.max_home_price as number));
      if (args.min_cash_on_cash) filtered = filtered.filter(c => c.cashOnCash >= (args.min_cash_on_cash as number));
      if (args.min_occupancy) filtered = filtered.filter(c => c.occupancy >= (args.min_occupancy as number));
      if (args.state) {
        const st = findState(args.state as string);
        if (st) filtered = filtered.filter(c => c.stateCode.toLowerCase() === st.abbreviation.toLowerCase());
      }
      const limit = Math.min((args.limit as number) || 8, 10);
      const top = filtered.sort((a: typeof cityData[number], b: typeof cityData[number]) => b.marketScore - a.marketScore).slice(0, limit);
      if (top.length === 0) return JSON.stringify({ message: "No markets match those criteria. Try relaxing the filters." });
      return JSON.stringify({
        count: top.length,
        totalMatching: filtered.length,
        markets: top.map(c => ({
          name: `${c.name}, ${c.stateCode}`,
          grade: c.grade,
          cashOnCash: `${c.cashOnCash.toFixed(1)}%`,
          annualRevenue: `$${(c.strMonthlyRevenue * 12).toLocaleString()}`,
          avgADR: `$${c.avgADR}`,
          occupancy: `${c.occupancy}%`,
          medianHomeValue: `$${c.medianHomeValue.toLocaleString()}`,
          regulation: c.strStatus,
        })),
      });
    }
    case "compare_markets": {
      const cities = (args.cities as string[]).map(name => {
        const city = findCity(name);
        if (!city) return { name, error: "Not found" };
        return {
          name: `${city.name}, ${city.stateCode}`,
          grade: city.grade,
          cashOnCash: `${city.cashOnCash.toFixed(1)}%`,
          annualRevenue: `$${(city.strMonthlyRevenue * 12).toLocaleString()}`,
          avgADR: `$${city.avgADR}`,
          occupancy: `${city.occupancy}%`,
          medianHomeValue: `$${city.medianHomeValue.toLocaleString()}`,
          regulation: city.strStatus,
          marketScore: city.marketScore,
          highlights: city.highlights,
        };
      });
      return JSON.stringify({ comparison: cities });
    }
    case "get_platform_stats": {
      const counts = getMarketCounts();
      return JSON.stringify({
        totalCities: counts.total,
        marketsWithFullData: counts.withFullData,
        statesAnalyzed: 50,
        dataLastUpdated: DATA_LAST_UPDATED,
      });
    }
    default:
      return JSON.stringify({ error: "Unknown tool" });
  }
}

// ── System prompt ─────────────────────────────────────────────────────
const marketCounts = getMarketCounts();
const SYSTEM_PROMPT = `You are the Edge AI — the intelligent STR (short-term rental) investment engine built into Edge by Teeco. You have direct access to real market data for ${marketCounts.withFullData}+ US cities and all 50 states.

## YOUR CAPABILITIES:
You can look up real data for any of our analyzed cities and states, find top markets matching specific criteria, and compare markets side by side. When users ask about specific markets, cities, or states, ALWAYS use your tools to pull real data — never guess or make up numbers.

## YOUR CORE KNOWLEDGE (from Jeff Chheuy's "Airbnb Anywhere"):

### The Rural STR Advantage
- Rural Airbnbs near national parks, lakes, and hiking trails offer higher cash-on-cash returns than urban properties
- Target home prices: $100K-$250K range for best returns
- You can manage properties remotely — you don't need to live near them
- The "Power Triangle": Nature-Based Demand + Low Acquisition Cost + Little Competition

### The Only Math That Matters
- **Cash-on-Cash Return** is the #1 metric: Annual Net Income ÷ Total Cash Invested
- Target 30%+ cash-on-cash return for rural STRs
- Example: $60K invested, $20K/year net profit = 33% return

### How to Find Winning Markets
- Look for: 50%+ occupancy, $175-$250 ADR, <100 listings in area
- Avoid "hot" markets that got oversaturated

### Financing Strategies (5-15% Down)
1. Vacation Home Loan: 10% down
2. Seller Financing: Sometimes 10% or less
3. DSCR Loans: 15-20% down, based on rental income
4. 0% Business Credit Cards for furniture

### Setup & Launch
- Budget $10K-$20K for furniture at $10-20 per sq ft
- Must-have amenities: hot tubs, fire pits, outdoor games, cozy lighting
- Launch pricing: 15-20% below market to get first reviews fast

### Real Results from Jeff's Portfolio
- Oak Hill, WV: $170K cabin → $82K year one revenue
- Oak Hill, WV: $100K cabin → $78K gross
- Nettie, WV: $170K with $20K down (seller financing) → $70K+ revenue

## RESPONSE STYLE:
- Write in plain text only. NEVER use Markdown formatting: no ** for bold, no ## for headers, no * for bullets, no backticks, no links in []() format.
- Use plain dashes (-) for lists if needed, but prefer short flowing sentences.
- Be direct and concise. Answer the question first, then offer a brief follow-up or next step. Do NOT dump walls of data.
- Think like a knowledgeable friend who happens to be an STR expert — conversational, clear, and helpful.
- When sharing numbers, weave them naturally into sentences: "Gatlinburg averages $52K/yr with 68% occupancy" not a formatted table.
- Keep responses to 2-3 short paragraphs max. If listing markets, cap at 3-5 with one line each.
- Guide the user toward their next step: "Want me to compare a couple of these?" or "You can run a full analysis on the Calculator tab."
- For specific property addresses, point them to the Calculator tab at edge.teeco.co/calculator.
- If someone seems ready to invest, mention Teeco's coaching program briefly.
- Your data is from Edge's database (updated ${DATA_LAST_UPDATED}) — mention this naturally, not as a disclaimer.

## WHEN THE USER SENDS AN IMAGE:
- The user may send screenshots of Zillow/Airbnb listings, property photos, or market data.
- If it's a listing screenshot: extract the property details (price, location, bedrooms, etc.) and analyze its STR potential using your tools to look up the city's market data.
- If it's a property photo: describe what you see and suggest how it could be optimized for STR (amenities, staging, etc.).
- If it's a map or chart: interpret the data and relate it to STR investing.
- Always connect your image analysis back to real Edge market data when possible.

## IMPORTANT:
- ALWAYS use tools when users ask about specific cities, states, or market criteria.
- Never make up statistics — use tools or say you don't have that data.
- For questions outside STR investing, politely redirect.
- The Edge Calculator can analyze ANY US address — point users to it for specific properties.
- You provide educational information only, not financial, legal, or investment advice. If a user asks for specific advice on whether to buy a property, remind them to do their own due diligence and consult qualified professionals.`;

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    const rateLimitResult = await rateLimit(`chat:${clientIP}`, RATE_LIMITS.ai);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before trying again.", retryAfter: rateLimitResult.resetIn },
        { status: 429, headers: { "Retry-After": String(rateLimitResult.resetIn), "X-RateLimit-Remaining": "0" } }
      );
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
    }

    const { messages } = await request.json();
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Messages array is required" }, { status: 400 });
    }

    // Build conversation with system prompt
    // Support both text-only and multimodal (image) messages
    const conversation: Array<{ role: string; content: unknown; tool_call_id?: string; tool_calls?: unknown[] }> = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    for (const msg of messages) {
      if (msg.image) {
        // Multimodal message with image — use content array format for OpenAI vision
        const contentParts: Array<{ type: string; text?: string; image_url?: { url: string; detail?: string } }> = [];
        if (msg.content) {
          contentParts.push({ type: "text", text: msg.content });
        }
        contentParts.push({
          type: "image_url",
          image_url: { url: msg.image, detail: "auto" },
        });
        conversation.push({ role: msg.role, content: contentParts });
      } else {
        conversation.push({ role: msg.role, content: msg.content });
      }
    }

    // Allow up to 3 rounds of tool calls
    for (let round = 0; round < 3; round++) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({
          // Use gpt-4o for vision messages, gpt-4o-mini for text-only
          model: messages.some((m: { image?: string }) => m.image) ? "gpt-4o" : "gpt-4o-mini",
          messages: conversation,
          tools,
          tool_choice: round === 0 ? "auto" : "auto",
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenAI API error:", response.status, errorText);
        let errorMessage = "Failed to get AI response";
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error?.message) errorMessage = errorJson.error.message;
        } catch { /* keep default */ }
        return NextResponse.json({ error: errorMessage }, { status: 500 });
      }

      const data = await response.json();
      const choice = data.choices[0];

      // If the model wants to call tools, execute them and continue
      if (choice.finish_reason === "tool_calls" || choice.message.tool_calls) {
        conversation.push(choice.message);
        for (const toolCall of choice.message.tool_calls) {
          const args = JSON.parse(toolCall.function.arguments);
          const result = executeTool(toolCall.function.name, args);
          conversation.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: result,
          });
        }
        continue; // next round
      }

      // Model returned a final text response
      const assistantMessage = choice.message?.content;
      if (!assistantMessage) {
        return NextResponse.json({ error: "No response from AI" }, { status: 500 });
      }
      return NextResponse.json({ message: assistantMessage });
    }

    // If we exhausted rounds, return whatever we have
    return NextResponse.json({ error: "AI took too long to respond. Please try again." }, { status: 500 });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
