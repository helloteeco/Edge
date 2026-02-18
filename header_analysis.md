# Blog Header Analysis

## Homepage header (correct):
- Line 217: `<div className="flex items-center justify-between mb-1.5 sm:mb-4">`
  - Left: Logo + "Edge by Teeco" text
  - Right: `<AuthHeader variant="dark" />`
- AuthHeader is INSIDE the flex row → icon appears top-right

## Blog listing page (/blog):
- Line 25: `<div className="flex items-center justify-between mb-4">`
  - Left: Logo link + "Edge" text
  - Right: `<AuthHeader variant="dark" />`
- Code looks identical in structure → should work the same

## Blog post page:
- Line 44-45: Same pattern
  - Left: Logo link + "Edge" text
  - Right: `<AuthHeader variant="dark" />`

## Key difference from screenshots:
- On blog pages, the header says just "Edge" not "Edge by Teeco"
- The account icon appears BELOW the header row on the LEFT side
- This suggests the AuthHeader might be rendering outside the flex container
- OR the flex container is breaking due to some CSS issue

## Possible cause:
Looking at screenshots more carefully:
- The account icon (yellow owl) on blog pages is positioned BELOW the header bar, on the LEFT
- On homepage it's in the header bar on the RIGHT
- The blog header div structure looks correct in code...
- Wait - looking at the screenshot again, the blog shows "Edge" logo at top, then the owl icon is on a SEPARATE LINE below it
- This could mean the AuthHeader's wrapper div is not fitting in the flex row
