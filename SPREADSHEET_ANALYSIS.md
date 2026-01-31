# Teeco STR Deal Analyzer - Spreadsheet Analysis

## Structure Overview

The spreadsheet "Teeco STR Deal Analyzer_SHELLY'S" has multiple tabs for different properties:
- 629 Virginia St, Toledo, OH 43620
- 361 Kelly Ave, Oak Hill, WV 25901
- 5327 Kingsberry St, Columbus, GA 31907
- 3122 Glenwood Dr, Columbus, GA 31906
- And more example properties

## Key Sections Identified

### 1. Purchase Details (Column A-B)
- Purchase Price: $250,000
- Down Payment %: 10%
- Down Payment $: $25,000
- Estimated Closing Cost %: 0.00%
- Estimated Closing Cost $: $0
- Seller Credits Negotiated: $0
- Reno (Rehab, Design, Setup): $15,000
- Furnishings: $57,030
- Amenities: $11,813
- Holding Costs: $5,000
- Legal: $1,250
- **Total Cash to Close: $115,093**

### 2. Property Info (Column A-B)
- Address: 629 Virginia St
- City: Toledo
- State: OH
- Zip Code: 43620
- Year Built
- Bedroom: 5
- Bath: 4
- Common Spaces
- Square Feet: 3802

### 3. Loan Details (Column A-B)
- Interest Rate %: 6.00%
- Term (years): 30
- Loan Amount: $225,000
- Monthly Principal + Interest: $1,349
- Private Mortgage Insurance: $108
- **Total Monthly Debt Service: $1,457**

### 4. Expenses (Column C-E) - Monthly & Yearly
- OTA (i.e. Airbnb) Service Fees: $0 / $0
- Capital Expenditures (5%) incl.: $424.80 / $5,097.60
- Electric: $100.00 / $1,200.00
- Water: $80.00 / $960.00
- Business License: $0.00 / $0.00
- Lawn Care: $0.00 / $0.00
- House Supplies: $60.00 / $720.00
- Cleaning - typically passed on to guest: $0.00 / $0.00
- Trash: $24.00 / $288.00
- Internet: $60.00 / $720.00
- Gas: $0.00 / $0.00
- Pest Control: $50.00 / $600.00
- Rental Mgmt Softwares: $20.00 / $240.00
- Website: (blank)
- Property Tax: $4,225.00 / $50,700.00
- Home Insurance: $83.00 / $996.00
- Office booking: $0.00
- Management Fee %: 0% / 0%
- Management Fees: $0.00 / $0.00
- **Operating Expenses: $5,223.80 / $62,685.60**
- **Total Expenses & Debt: $6,681 / $80,169**

### 5. Income Section (Column G-I)
- STR Income: $472.00 Daily Rate, 60% Occupancy, $14,160.00 Monthly
- **Gross Income at selected Occupancy: $8,496.00/month**
- Comp 1, Comp 2, Comp 3 (for comparable properties)

### 6. Evaluation Calculator (Column G-I)
- Lease/Arbitrag (Income)
- Percentage to Investor: 100.00%
- Total Monthly Payment to Owner: $1,815 (Rent)
- Total Annual Payment to Owner: $21,783 (Expenses)
- **Net Operating Income (NOI): $39,266** (Cashflow)
- **Cap Rate: 15.71%**
- Cash Flow (Mo): $1,815
- **Cash Flow (Yr): $21,783**
- **Cash on Cash (CoC) Return: 18.93%** (At Teeco, with Holding Costs)
- **Payback in months: 63.40** (This will not include Total Needed)

### 7. Cash Out/Refi Estimate (for BRRR properties)
- Year(s) to Cash Out/Refi
- Initial Loan Amount: $225,000
- Max LTV by Lender (70-80%): 75%
- Estimated Reappraisal Value
- New Loan Amount: $0
- Closing Costs/Fees (2-5%): 3.00%
- **Cash Out: -$225,000**

### 8. Furnishings Section
- Furniture: recommended at $15-20/sq ft, Estimated $57,030.00, Actual $57,030.00
- Amenities (TOTAL): see list below, Estimated $11,000.00, Actual $11,813.00

### 9. Rehab/Design/Setup Section
- Rehab (TOTAL): see list below, Estimated $40,500.00, Actual $35,500.00
- Reno Coordination: Teeco offers reno coordination at..., Estimated $5,000.00, Actual $0.00
- Design Services: Teeco offers 20% discount on $7..., Estimated $26,614.00, Actual $21,291.20
- Setup: Teeco offers 20% discount | $10.4..., Estimated $49,426.00, Actual $39,540.80

### 10. Amenities List
- Firepit area: $400.00, Actual $4,075.00
- Sauna: $3,498.00
- (more items below viewport)

## Key Formulas to Replicate

1. **Monthly Gross Income** = Daily Rate × Occupancy % × 30
2. **Total Cash to Close** = Down Payment + Closing Costs + Reno + Furnishings + Amenities + Holding Costs + Legal
3. **Monthly P&I** = Standard mortgage formula with rate, term, loan amount
4. **PMI** = Calculated if down payment < 20%
5. **Operating Expenses** = Sum of all monthly expenses
6. **NOI** = Gross Income - Operating Expenses
7. **Cash Flow** = NOI - Debt Service
8. **Cap Rate** = NOI / Purchase Price
9. **Cash on Cash** = Annual Cash Flow / Total Cash Invested
10. **Payback Period** = Total Cash Invested / Annual Cash Flow

## Differences from Current Calculator

| Current Calculator | Spreadsheet |
|-------------------|-------------|
| Basic expenses | Detailed expense breakdown (15+ line items) |
| No furnishing costs | Furnishing budget ($15-20/sq ft) |
| No rehab costs | Full rehab/design/setup section |
| No PMI | PMI calculation included |
| No BRRR analysis | Cash Out/Refi estimate section |
| Simple occupancy | Comp-based occupancy validation |


## Second Property Example: 361 Kelly Ave, Oak Hill, WV 25901

This property shows a NEGATIVE cash flow scenario, which is important for the calculator to handle:

### Purchase Details
- Purchase Price: $240,000
- Down Payment %: 10%
- Down Payment $: $24,000
- Reno (Rehab, Design, Setup): $15,000
- Furnishings: $26,835
- Amenities: $11,813
- Holding Costs: $4,800
- Legal: $1,200
- **Total Cash to Close: $83,648**

### Property Info
- Address: 361 Kelly Avenue
- City: Oak Hill
- State: WV
- Zip Code: 25901
- Bedroom: 4
- Bath: 2
- Square Feet: 1789

### Loan Details
- Interest Rate %: 6.00%
- Term (years): 30
- Loan Amount: $216,000
- Monthly Principal + Interest: $1,295
- Private Mortgage Insurance: $104
- **Total Monthly Debt Service: $1,399**

### Income (NEGATIVE EXAMPLE)
- STR Daily Rate: $288.00
- Occupancy: 32%
- Monthly Gross: $8,640.00
- **Gross Income at selected Occupancy: $2,764.80/month**

### Key Metrics (NEGATIVE)
- Operating Expenses: $3,203.24/mo, $38,438.88/yr
- Total Expenses & Debt: $4,602/mo, $55,227/yr
- **Net Operating Income (NOI): -$5,261**
- **Cap Rate: -2.19%**
- Cash Flow (Mo): **-$1,837**
- Cash Flow (Yr): **-$22,050**
- **Cash on Cash (CoC) Return: -26.36%**
- Payback in months: **-45.52** (negative = never pays back)

This example shows the calculator must handle:
1. Negative cash flow scenarios
2. Negative CoC returns
3. Warning indicators for bad deals
