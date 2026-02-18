# Key Finding

The rendered HTML for the blog page shows the header structure is CORRECT when signed out:
- flex container with justify-between
- Link (logo) on left
- AuthHeader div (Sign In button) on right

But the user's screenshots show they are SIGNED IN (yellow owl avatar visible).

When signed in, the AuthHeader renders:
1. A div with the avatar button (relative positioned)
2. A dropdown menu (absolute positioned, only when open)

The Fragment (<>) wrapping means:
- div.flex.items-center.gap-2 (the AuthHeader wrapper)
  - div.relative (avatar button container)
    - button with AvatarIcon

Wait - the user's screenshot shows the owl icon is on a SEPARATE LINE below "Edge" logo.
This is happening on MOBILE (iPhone) when SIGNED IN.

The issue could be that when signed in, the AuthHeader's inner content is larger or 
the avatar button's min-w-[44px] min-h-[44px] is causing the flex row to wrap.

Actually, looking at the screenshots again more carefully:
- Blog page: "Edge" logo is at top, then the owl icon is on the NEXT LINE, LEFT-aligned
- This looks like the flex container is NOT working - the items are stacking vertically

Wait - could it be that the blog page header has a different structure than what I see in the code?
The deployed version matches the source code (confirmed via curl).

Let me look at this from a different angle. The user is signed in on their phone.
When signed in, AuthHeader renders the avatar. The avatar button has min-w-[44px] min-h-[44px].

On the homepage, the header row is:
- Logo div (Image + "Edge by Teeco" text)
- AuthHeader (avatar)

On the blog page, the header row is:
- Link (Image + "Edge" text)  
- AuthHeader (avatar)

Both should work the same with flex justify-between.

UNLESS... the issue is that the AuthHeader Fragment is causing the modals to be
rendered as siblings in the flex container. But we confirmed AuthModal returns null
when closed, and AvatarPicker returns null when closed.

Let me check if there's something else going on - maybe the blog page has a 
different version deployed, or the issue is with the AvatarIcon component size.

Actually, I think I need to look at this from the user's perspective more carefully.
The owl icon in the blog screenshot is:
- Circular, yellow background
- About 44px in size
- Positioned BELOW the "Edge" text, LEFT-aligned
- There's a gap between the logo row and the breadcrumb

This looks like the AuthHeader is being rendered OUTSIDE the flex container,
or the flex container is wrapping.

One possibility: the AuthHeader's Fragment (<>) renders the inner div + modals.
The modals return null when closed. But what about the Fragment itself?
In React, a Fragment doesn't create a DOM element, so its children become
direct children of the parent. So the flex container sees:
1. Link (logo)
2. div.flex.items-center.gap-2 (AuthHeader's visible content)

This should work fine. Unless there's a hydration issue on the client side.

SOLUTION: Instead of relying on the Fragment, wrap the AuthHeader content in a 
single div, or better yet, ensure the flex container on blog pages matches 
the homepage exactly. But they already look the same in code...

Let me try a different approach: add flex-shrink-0 to the AuthHeader wrapper
to prevent it from being pushed to a new line.
