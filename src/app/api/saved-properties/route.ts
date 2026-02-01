import { NextRequest, NextResponse } from "next/server";
import { 
  getSavedProperties, 
  savePropertyForUser, 
  removePropertyForUser, 
  updatePropertyNotes,
  getUser,
  SavedProperty 
} from "@/lib/user-store";

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

    const user = getUser(email);
    
    if (!user) {
      return NextResponse.json({
        success: true,
        properties: [],
        message: "User not found or not logged in",
      });
    }

    const properties = getSavedProperties(email);

    return NextResponse.json({
      success: true,
      properties,
      count: properties.length,
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

    const user = getUser(email);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found. Please sign in first." },
        { status: 401 }
      );
    }

    const savedProperty: SavedProperty = {
      id: property.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      address: property.address,
      savedAt: Date.now(),
      notes: property.notes || "",
      result: property.result ? {
        annualRevenue: property.result.annualRevenue,
        cashOnCash: property.result.cashOnCash,
        monthlyNetCashFlow: property.result.monthlyNetCashFlow,
        bedrooms: property.result.bedrooms,
        bathrooms: property.result.bathrooms,
        guestCount: property.result.guestCount,
      } : undefined,
    };

    const updatedUser = savePropertyForUser(email, savedProperty);

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: "Failed to save property" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      property: savedProperty,
      totalSaved: updatedUser.savedProperties.length,
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

    const updatedUser = removePropertyForUser(email, propertyId);

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Property removed",
      totalSaved: updatedUser.savedProperties.length,
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

    const updatedUser = updatePropertyNotes(email, propertyId, notes || "");

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: "User or property not found" },
        { status: 404 }
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
