import { NextRequest, NextResponse } from "next/server";
import { 
  incrementMarketSaveCount, 
  decrementMarketSaveCount, 
  getMarketSaveCount,
  getMarketSaveCounts,
  getTopSavedMarkets 
} from "@/lib/supabase";

// Force dynamic rendering
export const dynamic = "force-dynamic";

// GET - Retrieve save counts
export async function GET(request: NextRequest) {
  try {
    const marketId = request.nextUrl.searchParams.get("marketId");
    const marketType = request.nextUrl.searchParams.get("marketType") as 'city' | 'state';
    const marketIds = request.nextUrl.searchParams.get("marketIds"); // comma-separated
    const top = request.nextUrl.searchParams.get("top");

    // Get top saved markets
    if (top) {
      const type = marketType || 'city';
      const limit = parseInt(top, 10) || 10;
      const topMarkets = await getTopSavedMarkets(type, limit);
      
      return NextResponse.json({
        success: true,
        data: topMarkets
      });
    }

    // Get counts for multiple markets (batch)
    if (marketIds && marketType) {
      const ids = marketIds.split(',').map(id => id.trim());
      const counts = await getMarketSaveCounts(ids, marketType);
      
      return NextResponse.json({
        success: true,
        counts
      });
    }

    // Get count for single market
    if (marketId && marketType) {
      const count = await getMarketSaveCount(marketId, marketType);
      
      return NextResponse.json({
        success: true,
        marketId,
        marketType,
        count
      });
    }

    return NextResponse.json(
      { success: false, error: "Missing required parameters" },
      { status: 400 }
    );

  } catch (error) {
    console.error("Error fetching market save counts:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred" },
      { status: 500 }
    );
  }
}

// POST - Increment or decrement save count
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { marketId, marketType, action } = body;

    if (!marketId || !marketType || !action) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: marketId, marketType, action" },
        { status: 400 }
      );
    }

    if (marketType !== 'city' && marketType !== 'state') {
      return NextResponse.json(
        { success: false, error: "marketType must be 'city' or 'state'" },
        { status: 400 }
      );
    }

    if (action !== 'increment' && action !== 'decrement') {
      return NextResponse.json(
        { success: false, error: "action must be 'increment' or 'decrement'" },
        { status: 400 }
      );
    }

    let success: boolean;
    if (action === 'increment') {
      success = await incrementMarketSaveCount(marketId, marketType);
    } else {
      success = await decrementMarketSaveCount(marketId, marketType);
    }

    if (!success) {
      return NextResponse.json(
        { success: false, error: "Failed to update save count" },
        { status: 500 }
      );
    }

    // Return updated count
    const newCount = await getMarketSaveCount(marketId, marketType);

    return NextResponse.json({
      success: true,
      marketId,
      marketType,
      action,
      count: newCount
    });

  } catch (error) {
    console.error("Error updating market save count:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred" },
      { status: 500 }
    );
  }
}
