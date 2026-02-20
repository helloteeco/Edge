import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "teeco-edge-2026";

// State abbreviation to full name mapping
const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

interface CityData {
  id: string;
  name: string;
  state: string;
  population: number;
  has_full_data: boolean;
  market_score: number | null;
  cash_on_cash: string | null;
  avg_adr: string | null;
  occupancy: string | null;
  str_monthly_revenue: string | null;
  median_home_value: string | null;
  regulation: string | null;
}

/**
 * Pick a city for the next blog post.
 * Prioritizes cities that haven't been written about yet,
 * with a mix of popular (high population) and high-scoring markets.
 */
async function pickCity(): Promise<CityData | null> {
  // Get all cities already written about
  const { data: existingPosts } = await supabase
    .from("blog_posts")
    .select("city_ids")
    .not("city_ids", "eq", "{}");

  const writtenCityIds = new Set<string>();
  if (existingPosts) {
    for (const post of existingPosts) {
      if (post.city_ids) {
        for (const id of post.city_ids) {
          writtenCityIds.add(id);
        }
      }
    }
  }

  // Query cities from Supabase — ALL cities, dynamically
  // Prioritize full-data cities first, then by market_score, then by population
  const { data: cities, error } = await supabase
    .from("cities")
    .select("id, name, state, population, has_full_data, market_score, cash_on_cash, avg_adr, occupancy, str_monthly_revenue, median_home_value, regulation")
    .order("has_full_data", { ascending: false })
    .order("market_score", { ascending: false, nullsFirst: false })
    .order("population", { ascending: false });

  if (error || !cities || cities.length === 0) {
    console.error("[GenerateBlog] Error fetching cities:", error);
    return null;
  }

  // Find first city not yet written about
  // Alternate: even days pick high-score, odd days pick high-population
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const sortedCities = dayOfYear % 2 === 0
    ? cities.sort((a, b) => (b.market_score || 0) - (a.market_score || 0))
    : cities.sort((a, b) => (b.population || 0) - (a.population || 0));

  for (const city of sortedCities) {
    if (!writtenCityIds.has(city.id)) {
      return city;
    }
  }

  // If all cities written about, pick a random one from top 100
  const top100 = cities.slice(0, 100);
  return top100[Math.floor(Math.random() * top100.length)];
}

/**
 * Build the data context string for the LLM based on available city data
 */
function buildCityContext(city: CityData): string {
  const stateName = STATE_NAMES[city.state] || city.state;
  let context = `City: ${city.name}, ${stateName} (${city.state})\nPopulation: ${city.population?.toLocaleString() || "Unknown"}`;

  if (city.has_full_data) {
    context += `\nEdge Market Score: ${city.market_score}/100`;
    if (city.cash_on_cash) context += `\nCash-on-Cash Return: ${city.cash_on_cash}%`;
    if (city.avg_adr) context += `\nAverage Daily Rate (ADR): $${city.avg_adr}`;
    if (city.occupancy) context += `\nOccupancy Rate: ${city.occupancy}%`;
    if (city.str_monthly_revenue) context += `\nEstimated Monthly STR Revenue: $${Number(city.str_monthly_revenue).toLocaleString()}`;
    if (city.median_home_value) context += `\nMedian Home Value: $${Number(city.median_home_value).toLocaleString()}`;
    if (city.regulation) context += `\nSTR Regulation Status: ${city.regulation}`;
  } else {
    if (city.market_score) context += `\nEdge Market Score: ${city.market_score}/100`;
    context += `\nNote: This city has basic data only. Focus on the city's general appeal, location advantages, and what investors should research further.`;
  }

  return context;
}

/**
 * Fetch nearby cities for comparison/context
 */
async function getNearbyComparisons(city: CityData): Promise<CityData[]> {
  const { data } = await supabase
    .from("cities")
    .select("id, name, state, population, has_full_data, market_score, cash_on_cash, avg_adr, occupancy, str_monthly_revenue, median_home_value, regulation")
    .eq("state", city.state)
    .neq("id", city.id)
    .not("market_score", "is", null)
    .order("market_score", { ascending: false })
    .limit(5);

  return data || [];
}

/**
 * Generate blog content using OpenAI
 */
async function generateContent(city: CityData, comparisons: CityData[]): Promise<{
  title: string;
  description: string;
  content: string;
  tags: string[];
  slug: string;
} | null> {
  if (!OPENAI_API_KEY) {
    console.error("[GenerateBlog] OPENAI_API_KEY not configured");
    return null;
  }

  const cityContext = buildCityContext(city);
  const stateName = STATE_NAMES[city.state] || city.state;

  let comparisonContext = "";
  if (comparisons.length > 0) {
    comparisonContext = "\n\nNearby markets in " + stateName + " for comparison:\n";
    for (const comp of comparisons) {
      comparisonContext += `- ${comp.name}: Score ${comp.market_score || "N/A"}`;
      if (comp.str_monthly_revenue) comparisonContext += `, $${Number(comp.str_monthly_revenue).toLocaleString()}/mo revenue`;
      if (comp.median_home_value) comparisonContext += `, $${Number(comp.median_home_value).toLocaleString()} median home`;
      comparisonContext += "\n";
    }
  }

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().toLocaleString("en-US", { month: "long" });

  // Determine the angle based on the city's data
  let angle = "";
  if (city.has_full_data && city.market_score) {
    if (city.market_score >= 70) {
      angle = `This is a HIGH-SCORING market. Explain WHY the numbers are strong with specific data points. Show what makes this market special relative to comparable markets.`;
    } else if (city.market_score >= 50) {
      angle = `This is a MODERATE market. Give a balanced, honest take — quantify both the upside and the risks. Be specific about what works and what doesn't.`;
    } else {
      angle = `This is a LOWER-SCORING market. Do NOT label it "contrarian" or "under-the-radar" unless you can demonstrate clear quantitative mispricing (e.g., revenue-to-price ratio is better than higher-scored peers). Be honest about why the numbers are what they are. If there is a niche play, quantify it specifically. If the numbers don't work, say so clearly and explain what would need to change.`;
    }
  } else {
    angle = `This city has limited STR data. Focus on what makes the location interesting for Airbnb investors to research further — tourism, economy, growth trends, nearby attractions. Be clear about what data is missing and what investors need to verify before committing capital. Encourage readers to explore it on Edge.`;
  }

  const systemPrompt = `You are a knowledgeable, conversational real estate writer who specializes in Airbnb and short-term rental (STR) investing. You write for Edge by Teeco (edge.teeco.co), a platform that helps investors find and analyze STR markets across the US.

Your writing style:
- Conversational and educational FIRST, data and analysis SECOND
- Write like you're explaining to a smart friend who's interested in Airbnb investing
- Use "you" and "your" to address the reader directly
- Short paragraphs (2-3 sentences max)
- No fluff or filler — every sentence should teach something or provide insight
- When you cite numbers, explain what they MEAN for an investor (don't just list stats)
- READABILITY: Use plain, clear language. When you introduce a financial term (e.g., cash-on-cash return, ADR, occupancy rate, cap rate), briefly explain what it means in parentheses or in the next sentence so a first-time reader can follow. Avoid jargon without context. The analysis should be sophisticated, but the language should be accessible to anyone.
- Include practical takeaways — what should someone actually DO with this information?
- Mention "Edge" naturally when relevant (e.g., "you can explore the full breakdown on Edge" or "Edge scores this market at...")
- NEVER make up statistics. Only use the data provided. If data is limited, say so honestly.
- Focus on Airbnb/STR investing over traditional long-term rentals
- Do NOT use excessive bold formatting or markdown headers. Use them sparingly for readability.
- Do NOT include disclaimers about "not financial advice" in the body — that's handled elsewhere.

EDITORIAL QUALITY STANDARDS (mandatory for every article):
1. NEVER label a market "contrarian" or "under-the-radar" unless you demonstrate clear quantitative mispricing with specific numbers (e.g., revenue-to-price ratio exceeds higher-scored peers).
2. ALWAYS distinguish revenue metrics from return metrics. Monthly revenue is not the same as cash-on-cash return. If revenue is high but returns are low, explain why (high home prices, taxes, management costs, etc.).
3. If cash-on-cash return is negative or below 5%, explicitly explain why and whether it is structurally fixable (e.g., lower purchase price, better management, seasonal optimization) or a fundamental issue with the market.
4. If STR regulations materially affect viability (e.g., permit caps, zoning restrictions, licensing moratoriums), clearly explain how they impact real underwriting — not just mention them in passing.
5. Do NOT give generic STR advice ("furnish well", "get good photos") unless backed by a quantified niche opportunity specific to this market.
6. The conclusion MUST logically match the numbers presented. If the data shows a weak market, do not end with an optimistic recommendation. If the data is strong, don't hedge unnecessarily.
7. Write for capital allocators, not lifestyle investors. Assume the reader is evaluating this market against 20 alternatives and needs to know: what is the risk-adjusted return, what are the structural advantages or disadvantages, and what would make this a clear yes or no.`;

  const userPrompt = `Write a blog article about ${city.name}, ${stateName} as an Airbnb/STR investment market in ${currentMonth} ${currentYear}.

${angle}

DATA:
${cityContext}
${comparisonContext}

REQUIREMENTS:
1. Title: Create a compelling, SEO-friendly title that includes "${city.name}" and relates to Airbnb/STR investing. Keep it under 70 characters. Include the year ${currentYear}.
2. Description: Write a 1-2 sentence meta description (under 160 characters) for SEO.
3. Content: Write 800-1200 words of article content in HTML format. Structure:
   - Opening hook (why this market matters or is interesting right now)
   - The numbers (if available) — what the data tells us, explained conversationally
   - Comparison to nearby markets (use the comparison data provided)
   - What type of investor this market suits (budget-conscious, experienced, etc.)
   - Practical next steps (what to research, what to look for)
   - Brief mention of exploring the market on Edge (link to /city/${city.id})
   
   Use these HTML elements: <p>, <h2>, <h3>, <strong>, <a>, <ul>, <li>
   For links to Edge pages, use these formats:
   - City page: <a href="/city/${city.id}">${city.name} on Edge</a>
   - State page: <a href="/state/${city.state.toLowerCase()}">${stateName} markets</a>
   - Calculator: <a href="/calculator">Edge Calculator</a>
   - Search: <a href="/search">Search all markets</a>
   
4. Tags: Provide 3-5 relevant tags (e.g., "${city.state}", "${city.name}", "airbnb-investing", "cash-flow")
5. Slug: Create a URL-friendly slug like "${city.name.toLowerCase().replace(/\s+/g, '-')}-airbnb-investment-${currentYear}"

Respond in this exact JSON format:
{
  "title": "...",
  "description": "...",
  "content": "...<html content>...",
  "tags": ["tag1", "tag2", ...],
  "slug": "..."
}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 3000,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[GenerateBlog] OpenAI API error:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    return {
      title: parsed.title,
      description: parsed.description,
      content: parsed.content,
      tags: parsed.tags || [],
      slug: parsed.slug.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-"),
    };
  } catch (error) {
    console.error("[GenerateBlog] Error generating content:", error);
    return null;
  }
}

/**
 * Main handler — generates a blog post draft and saves to Supabase
 */
async function handleGenerate(request: NextRequest) {
  try {
    // Auth check
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const url = new URL(request.url);
    const password = url.searchParams.get("password");

    const isAuthed =
      (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
      password === ADMIN_PASSWORD;

    if (!isAuthed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Optional: specify a city ID to write about
    const forceCityId = url.searchParams.get("city_id");

    let city: CityData | null = null;

    if (forceCityId) {
      const { data } = await supabase
        .from("cities")
        .select("id, name, state, population, has_full_data, market_score, cash_on_cash, avg_adr, occupancy, str_monthly_revenue, median_home_value, regulation")
        .eq("id", forceCityId)
        .single();
      city = data;
    } else {
      city = await pickCity();
    }

    if (!city) {
      return NextResponse.json({ error: "No city available for blog generation" }, { status: 404 });
    }

    // Get comparison cities
    const comparisons = await getNearbyComparisons(city);

    // Generate content
    const generated = await generateContent(city, comparisons);
    if (!generated) {
      return NextResponse.json({ error: "Failed to generate blog content" }, { status: 500 });
    }

    // Check for duplicate slug
    const { data: existing } = await supabase
      .from("blog_posts")
      .select("id")
      .eq("slug", generated.slug)
      .single();

    if (existing) {
      // Append a random suffix
      generated.slug = `${generated.slug}-${Date.now().toString(36).slice(-4)}`;
    }

    // Save as draft
    const { data: post, error } = await supabase
      .from("blog_posts")
      .insert({
        slug: generated.slug,
        title: generated.title,
        description: generated.description,
        category: "city-dive",
        content: generated.content,
        city_ids: [city.id],
        tags: generated.tags,
        featured_data: {
          cityName: city.name,
          stateName: STATE_NAMES[city.state] || city.state,
          stateCode: city.state,
          population: city.population,
          marketScore: city.market_score,
          hasFullData: city.has_full_data,
          cashOnCash: city.cash_on_cash,
          avgAdr: city.avg_adr,
          occupancy: city.occupancy,
          strMonthlyRevenue: city.str_monthly_revenue,
          medianHomeValue: city.median_home_value,
          regulation: city.regulation,
        },
        status: "draft",
      })
      .select()
      .single();

    if (error) {
      console.error("[GenerateBlog] Error saving post:", error);
      return NextResponse.json({ error: "Failed to save blog post" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      post: {
        id: post.id,
        slug: post.slug,
        title: post.title,
        description: post.description,
        city: `${city.name}, ${city.state}`,
        status: "draft",
      },
    });
  } catch (error) {
    console.error("[GenerateBlog] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handleGenerate(request);
}

export async function POST(request: NextRequest) {
  return handleGenerate(request);
}
