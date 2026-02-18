# Blog Header - Live Site Analysis

On desktop, the blog page header looks CORRECT:
- "Edge" logo is top-left (element 1)
- "Sign In" button is top-right (element 2)
- They are on the same row

But the user's screenshots are from MOBILE (iPhone). On mobile, the header layout may be breaking.

Looking at the user's screenshot (IMG_8161.png - blog listing):
- "Edge" logo + icon is at top-left
- The yellow owl account icon is BELOW the header, on the LEFT side
- It's NOT in the header row

This means the issue is mobile-specific. The flex container might be wrapping on small screens,
or the AuthHeader component has different rendering on mobile.

Looking at the user's screenshot more carefully:
- The owl icon is sitting between the header and the breadcrumb
- It's left-aligned, not right-aligned

The homepage (IMG_8163.PNG) shows:
- "Edge by Teeco" logo at top-left
- Yellow owl at top-RIGHT, same row
- This is correct

So the blog pages have a mobile-specific layout issue where the account icon drops below the header.
