import { NextRequest, NextResponse } from "next/server";
import { 
  incrementMarketSaveCount, 
  decrementMarketSaveCount, 
  getMarketSaveCount,
  getMarketSaveCounts,
  getTopSavedMarkets,
  toggleUserLike,
  getUserLikedMarkets,
  getUserLikeCount,
  hasUserLiked,
} from "@/lib/supabase";

// Force dynamic rendering
export const dynamic = "force-dynamic";

// GET - Retrieve save counts + user-specific like status
export async function GET(request: NextRequest) {
  try {
    const marketId = request.nextUrl.searchParams.get("marketId");
    const marketType = request.nextUrl.searchParams.get("marketType") as 'city' | 'state';
    const marketIds = request.nextUrl.searchParams.get("marketIds"); // comma-separated
    const top = request.nextUrl.searchParams.get("top");
    const email = request.nextUrl.searchParams.get("email"); // for user-specific like status

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

    // Get counts for multiple markets (batch) + user's liked status
    if (marketIds && marketType) {
      const ids = marketIds.split(',').map(id => id.trim());
      const counts = await getMarketSaveCounts(ids, marketType);
      
      // If email provided, also return which ones the user has liked
      let userLiked: string[] = [];
      if (email) {
        const likedSet = await getUserLikedMarkets(email, ids, marketType);
        userLiked = Array.from(likedSet);
      }
      
      const resp = NextResponse.json({
        success: true,
        counts,
        userLiked,
      });
      // Cache batch counts for 2 minutes, serve stale for 10 min while revalidating
      resp.headers.set('Cache-Control', 's-maxage=120, stale-while-revalidate=600');
      return resp;
    }

    // Get count for single market + user's like status
    if (marketId && marketType) {
      const count = await getMarketSaveCount(marketId, marketType);
      
      let liked = false;
      let userLikeCount = 0;
      if (email) {
        liked = await hasUserLiked(email, marketId, marketType);
        userLikeCount = await getUserLikeCount(email);
      }
      
      return NextResponse.json({
        success: true,
        marketId,
        marketType,
        count,
        liked,
        userLikeCount,
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

// POST - Toggle like (requires email) or legacy increment/decrement
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { marketId, marketType, action, email } = body;

    if (!marketId || !marketType) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: marketId, marketType" },
        { status: 400 }
      );
    }

    if (marketType !== 'city' && marketType !== 'state') {
      return NextResponse.json(
        { success: false, error: "marketType must be 'city' or 'state'" },
        { status: 400 }
      );
    }

    // New: user-specific toggle like (requires email)
    if (action === 'toggle' && email) {
      const result = await toggleUserLike(email, marketId, marketType);
      
      if (result.error) {
        return NextResponse.json({
          success: false,
          error: result.error,
          liked: result.liked,
          count: result.totalLikes,
          userLikeCount: result.userLikeCount,
        }, { status: result.error.includes('limit') ? 429 : 500 });
      }
      
      return NextResponse.json({
        success: true,
        marketId,
        marketType,
        liked: result.liked,
        count: result.totalLikes,
        userLikeCount: result.userLikeCount,
      });
    }

    // Legacy: anonymous increment/decrement (backward compatible)
    if (action !== 'increment' && action !== 'decrement') {
      return NextResponse.json(
        { success: false, error: "action must be 'toggle', 'increment', or 'decrement'" },
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
