# ROOT CAUSE FOUND

## Two CSS rules in globals.css are breaking the blog header on mobile:

### Rule 1 (max-width: 768px):
```css
.flex.items-center.gap-2 {
  flex-wrap: wrap;
  gap: 0.5rem;
}
```
This matches AuthHeader's inner div class "flex items-center gap-2" and causes the avatar to wrap.

### Rule 2 (max-width: 768px):
```css
.flex.justify-between {
  flex-wrap: wrap;
  gap: 0.5rem;
}
```
This matches the header container "flex items-center justify-between mb-4" and causes wrapping.

### Rule 3 (max-width: 480px) - CRITICAL:
```css
.flex.items-center.justify-between.mb-4 {
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
}
```
This EXACTLY matches the blog header container class "flex items-center justify-between mb-4"!
It changes flex-direction to column and align-items to flex-start, which:
- Stacks the logo and AuthHeader VERTICALLY
- Aligns them to the LEFT (flex-start)

This is EXACTLY what the user sees in the screenshots - the owl icon is below the logo, left-aligned!

### Why homepage is NOT affected:
The homepage header has class "flex items-center justify-between mb-1.5 sm:mb-4"
- On mobile (< 640px), the class is "mb-1.5" not "mb-4"
- So the selector `.flex.items-center.justify-between.mb-4` does NOT match the homepage header on mobile!
- The homepage uses `mb-1.5 sm:mb-4` which resolves to `mb-1.5` on small screens

## FIX:
Scope these CSS rules to only affect calculator/listing content, not page headers.
The safest fix is to add a more specific selector or use a wrapper class.
