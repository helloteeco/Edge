# Amenity Data Audit

## How amenities are sourced

The comp data comes from Airbnb's search API via `listing.preview_amenities`.

**The problem**: `preview_amenities` is Airbnb's **search result preview** field — it only contains 3-5 generic amenities like:
- "Wifi"
- "Kitchen" 
- "Free parking"
- "Air conditioning"
- "Washer"

It does NOT contain detailed amenities like:
- Hot tub / Jacuzzi
- Sauna
- Pool
- Game room
- Pet friendly

Those detailed amenities are only available from Airbnb's **individual listing detail** endpoint (the full amenity list), NOT from the search/explore endpoint.

## Impact on our filter pills

The amenity filter pills (Hot Tub, Sauna, Pool, Game Room, Pet Friendly) will almost NEVER light up because `preview_amenities` doesn't include those details. They'll always show "0 comps" and be grayed out — essentially dead UI.

## Options

1. **Remove the amenity pills** — honest, clean UI
2. **Fetch full amenity data** — would require individual API calls per comp listing (expensive, slow)
3. **Use listing names/descriptions** — many listings mention "hot tub" or "pool" in their title
4. **Keep them but label as "coming soon"** — transparent
