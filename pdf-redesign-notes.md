# PDF Redesign Notes

## Current Issues
1. Monthly Revenue shows flat $4,029 for all months - not using seasonal data
2. "about:blank" showing in browser footer
3. Design feels generic, not premium Teeco brand
4. Email sends text only, not PDF attachment

## Root Cause of Flat Monthly Data
The PDF code at line 435-449 calculates monthly revenues but the historical data might not have proper revenue values. Need to check if the getSeasonalityData function is being used correctly.

## Design Improvements Needed
- Use Teeco brand colors: #2b2823 (dark), #787060 (mocha), #e5e3da (cream)
- Remove emoji icons, use cleaner design
- Add more whitespace and premium typography
- Make header more elegant with Teeco branding
- Remove "about:blank" from footer

## Email PDF Attachment
- Need to generate PDF blob and attach to email
- Use mailto: with attachment or third-party email service
