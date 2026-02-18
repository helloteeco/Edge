# Header Fix Plan

## Issue Confirmed from Screenshots

### Homepage (IMG_8163.PNG) - CORRECT:
- "Edge by Teeco" logo + icon on LEFT
- Yellow owl avatar on RIGHT, SAME ROW
- Both in the dark header bar

### Blog listing (IMG_8161.png) - BROKEN:
- "Edge" logo + icon on LEFT, first row
- Yellow owl avatar on SECOND ROW, LEFT-ALIGNED
- The owl is between the header and breadcrumb
- It's NOT in the same row as the logo

### Blog post (IMG_8165.png) - BROKEN:
- Same issue: "Edge" logo first row, owl drops to second row on left

## Root Cause Analysis

The code structure looks identical:
```
<div className="flex items-center justify-between mb-4">
  <Link>Logo</Link>
  <AuthHeader variant="dark" />
</div>
```

But the AuthHeader returns a Fragment (<>):
```
<>
  <div className="flex items-center gap-2">
    {/* sign in button or avatar */}
  </div>
  <AuthModal />
  <AvatarPicker />
</>
```

The Fragment means AuthModal and AvatarPicker are SIBLINGS of the flex container div,
not children of it. On the homepage, this works because the parent flex container
only sees the div as a flex child. But wait - the Fragment means AuthModal and AvatarPicker
are rendered as siblings of the AuthHeader's inner div, but they're also siblings in the
parent flex container.

Actually, the issue is that AuthHeader returns a Fragment with 3 children:
1. The visible div (avatar/sign-in button)
2. AuthModal (rendered conditionally)
3. AvatarPicker (rendered conditionally)

When these are placed inside the flex container:
```
<div className="flex items-center justify-between mb-4">
  <Link>Logo</Link>
  <> <!-- Fragment dissolves -->
    <div>Avatar button</div>
    <AuthModal /> <!-- This becomes a flex child! -->
    <AvatarPicker /> <!-- This becomes a flex child! -->
  </>
</div>
```

The AuthModal and AvatarPicker components might be rendering invisible divs that
still take up space in the flex layout, pushing the avatar button around.

Wait, but they're modals - they should be portaled or absolutely positioned.
Let me check if AuthModal renders anything when closed.

Actually, looking more carefully at the screenshots:
- The owl icon is BELOW the logo row, LEFT-aligned
- On homepage, the owl is on the SAME row as logo, RIGHT-aligned

The key difference: on the homepage, the flex container has `mb-1.5 sm:mb-4`
and on blog pages it has `mb-4`. But that wouldn't cause this issue.

Let me check if AuthModal renders a wrapper div even when closed.
