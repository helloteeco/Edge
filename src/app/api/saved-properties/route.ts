import { NextRequest, NextResponse } from "next/server";
import { 
  getSavedProperties, 
  saveProperty, 
  removeProperty, 
  updatePropertyNotes,
  getUser,
  upsertUser,
} from "@/lib/supabase";

// Force dynamic rendering
export const dynamic = "force-dynamic";

// GET - Fetch saved properties for a user
export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get("email");
    
    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    const user = await getUser(email);
    
    if (!user) {
      return NextResponse.json({
        success: true,
        properties: [],
        message: "User not found or not logged in",
      });
    }

    const properties = await getSavedProperties(email);

    // Transform to match frontend expected format
    const transformedProperties = properties.map(p => ({
      id: p.id,
      address: p.address,
      savedAt: new Date(p.saved_at).getTime(),
      notes: p.notes || "",
      result: {
        annualRevenue: p.annual_revenue,
        cashOnCash: p.cash_on_cash,
        monthlyNetCashFlow: p.monthly_net_cash_flow,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        guestCount: p.guest_count,
      },
    }));

    return NextResponse.json({
      success: true,
      properties: transformedProperties,
      count: transformedProperties.length,
    });

  } catch (error) {
    console.error("Error fetching saved properties:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred" },
      { status: 500 }
    );
  }
}

// POST - Save a new property
export async function POST(request: NextRequest) {
  try {
    const { email, property } = await request.json();

    if (!email || !property) {
      return NextResponse.json(
        { success: false, error: "Email and property are required" },
        { status: 400 }
      );
    }

    // Ensure user exists (create if not)
    const user = await getUser(email);
    
    if (!user) {
      // Create user if they don't exist
      const newUser = await upsertUser(email);
      if (!newUser) {
        return NextResponse.json(
          { success: false, error: "Failed to create user. Please sign in first." },
          { status: 401 }
        );
      }
    }

    const savedProperty = await saveProperty(email, {
      address: property.address,
      notes: property.notes || "",
      annual_revenue: property.result?.annualRevenue,
      cash_on_cash: property.result?.cashOnCash,
      monthly_net_cash_flow: property.result?.monthlyNetCashFlow,
      bedrooms: property.result?.bedrooms,
      bathrooms: property.result?.bathrooms,
      guest_count: property.result?.guestCount,
    });

    if (!savedProperty) {
      return NextResponse.json(
        { success: false, error: "Failed to save property" },
        { status: 500 }
      );
    }

    // Get updated count
    const allProperties = await getSavedProperties(email);

    return NextResponse.json({
      success: true,
      property: {
        id: savedProperty.id,
        address: savedProperty.address,
        savedAt: new Date(savedProperty.saved_at).getTime(),
        notes: savedProperty.notes,
        result: {
          annualRevenue: savedProperty.annual_revenue,
          cashOnCash: savedProperty.cash_on_cash,
          monthlyNetCashFlow: savedProperty.monthly_net_cash_flow,
          bedrooms: savedProperty.bedrooms,
          bathrooms: savedProperty.bathrooms,
          guestCount: savedProperty.guest_count,
        },
      },
      totalSaved: allProperties.length,
    });

  } catch (error) {
    console.error("Error saving property:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a saved property
export async function DELETE(request: NextRequest) {
  try {
    const { email, propertyId } = await request.json();

    if (!email || !propertyId) {
      return NextResponse.json(
        { success: false, error: "Email and propertyId are required" },
        { status: 400 }
      );
    }

    const success = await removeProperty(email, propertyId);

    if (!success) {
      return NextResponse.json(
        { success: false, error: "Failed to remove property" },
        { status: 500 }
      );
    }

    // Get updated count
    const allProperties = await getSavedProperties(email);

    return NextResponse.json({
      success: true,
      message: "Property removed",
      totalSaved: allProperties.length,
    });

  } catch (error) {
    console.error("Error removing property:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred" },
      { status: 500 }
    );
  }
}

// PATCH - Update property notes
export async function PATCH(request: NextRequest) {
  try {
    const { email, propertyId, notes } = await request.json();

    if (!email || !propertyId) {
      return NextResponse.json(
        { success: false, error: "Email and propertyId are required" },
        { status: 400 }
      );
    }

    const success = await updatePropertyNotes(email, propertyId, notes || "");

    if (!success) {
      return NextResponse.json(
        { success: false, error: "Failed to update notes" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Notes updated",
    });

  } catch (error) {
    console.error("Error updating notes:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred" },
      { status: 500 }
    );
  }
}
