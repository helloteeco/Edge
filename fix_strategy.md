# Fix Strategy

## Problem:
Three CSS rules in globals.css are too broad and affect page headers:

1. `@media (max-width: 768px) .flex.items-center.gap-2` → flex-wrap: wrap
2. `@media (max-width: 768px) .flex.justify-between` → flex-wrap: wrap  
3. `@media (max-width: 480px) .flex.items-center.justify-between.mb-4` → flex-direction: column

Rule #3 is the PRIMARY cause of the blog header issue (stacks vertically, left-aligns).
Rules #1 and #2 also contribute on tablets.

## Fix approach:
The safest surgical fix is to:
1. Scope the problematic CSS rules to only apply within calculator/listing contexts
2. OR add a `flex-nowrap` override to the page header containers
3. OR change the blog header class to avoid matching the CSS selector

Option 3 is the most surgical - change `mb-4` to something else on the header containers,
or add a unique class. But this changes the margin which could affect layout.

Option 2 is clean - add `flex-row flex-nowrap` explicitly to the header containers.
But Tailwind classes might not override the CSS specificity.

Best approach: Fix the CSS rules in globals.css to be more specific. The rules were meant
for calculator results, so scope them to only apply within calculator content areas.

Actually, the SIMPLEST and most surgical fix:
- Add a data attribute or specific class to page headers
- OR scope the CSS rules with `:not()` selectors
- OR use the `.page-header` approach

Simplest: Change the blog header containers to use inline style `flexWrap: 'nowrap'` 
and `flexDirection: 'row'` which will override the CSS rules.

Wait - even simpler: the CSS rules use class selectors. If we add `!important` to 
inline styles or use more specific selectors, we can override them.

MOST SURGICAL FIX: Modify the globals.css rules to exclude page headers.
We can scope them to only apply within specific containers.
