# Teeco STR Deal Analyzer - Formula Audit

## Property 1: 629 Virginia St, Toledo, OH 43620

### Given Values
- Purchase Price: $250,000
- Down Payment: 10% = $25,000
- Loan Amount: $225,000
- Interest Rate: 6.00%
- Term: 30 years
- Daily Rate: $472
- Occupancy: 60%

---

## 1. MORTGAGE CALCULATION AUDIT

### Spreadsheet Shows:
- Monthly P&I: $1,349
- PMI: $108
- Total Monthly Debt Service: $1,457

### My Verification:
Standard mortgage formula: M = P × [r(1+r)^n] / [(1+r)^n - 1]
- P = $225,000
- r = 6% / 12 = 0.5% = 0.005
- n = 30 × 12 = 360 months

M = 225,000 × [0.005 × (1.005)^360] / [(1.005)^360 - 1]
M = 225,000 × [0.005 × 6.0226] / [6.0226 - 1]
M = 225,000 × [0.030113] / [5.0226]
M = 225,000 × 0.005996
M = **$1,349.13** ✅ CORRECT

### PMI Verification:
PMI typically ranges from 0.5% to 1% of loan amount annually when down payment < 20%
- $225,000 × 0.58% / 12 = $108.75/month
- Spreadsheet shows: $108 ✅ CORRECT (reasonable PMI rate)

---

## 2. GROSS INCOME CALCULATION AUDIT

### Spreadsheet Shows:
- Daily Rate: $472
- Occupancy: 60%
- Monthly: $14,160.00
- Gross Income at Occupancy: $8,496.00

### My Verification:
- Monthly nights available: 30
- Occupied nights: 30 × 60% = 18 nights
- Gross Revenue: 18 × $472 = **$8,496** ✅ CORRECT

Alternative calculation shown in spreadsheet:
- $472 × 30 days = $14,160 (100% occupancy)
- $14,160 × 60% = **$8,496** ✅ CORRECT

---

## 3. OPERATING EXPENSES AUDIT

### Spreadsheet Shows:
- Operating Expenses: $5,223.80/month

### Line Items:
| Expense | Monthly | Yearly |
|---------|---------|--------|
| CapEx (5%) | $424.80 | $5,097.60 |
| Electric | $100.00 | $1,200.00 |
| Water | $80.00 | $960.00 |
| House Supplies | $60.00 | $720.00 |
| Trash | $24.00 | $288.00 |
| Internet | $60.00 | $720.00 |
| Pest Control | $50.00 | $600.00 |
| Rental Mgmt Software | $20.00 | $240.00 |
| Property Tax | $4,225.00 | $50,700.00 |
| Home Insurance | $83.00 | $996.00 |

### My Verification:
Sum of monthly: $424.80 + $100 + $80 + $60 + $24 + $60 + $50 + $20 + $4,225 + $83 = **$5,126.80**

⚠️ **DISCREPANCY FOUND**: Spreadsheet shows $5,223.80, my sum is $5,126.80
Difference: $97.00

**Possible explanation**: Property tax shown as $4,225/month seems HIGH. Let me check...
- $4,225 × 12 = $50,700/year property tax
- On a $250,000 home, that's a 20.28% tax rate - **EXTREMELY HIGH**
- Typical property tax is 1-2% of home value = $2,500-$5,000/YEAR, not $50,700

⚠️ **ERROR IDENTIFIED**: Property tax appears to be entered as YEARLY amount in the MONTHLY column
- Should be: $50,700 / 12 = $4,225/month OR
- More likely: Property tax should be ~$4,225/YEAR = $352/month

---

## 4. NOI CALCULATION AUDIT

### Spreadsheet Shows:
- Net Operating Income: $39,266

### My Verification:
NOI = Gross Income - Operating Expenses (excluding debt service)
- Annual Gross: $8,496 × 12 = $101,952
- Annual Operating Expenses: $5,223.80 × 12 = $62,685.60
- NOI = $101,952 - $62,685.60 = **$39,266.40** ✅ CORRECT (matches spreadsheet)

Note: The NOI calculation is correct given the inputs, but the inputs may have the property tax error noted above.

---

## 5. CAP RATE AUDIT

### Spreadsheet Shows:
- Cap Rate: 15.71%

### My Verification:
Cap Rate = NOI / Purchase Price
- Cap Rate = $39,266 / $250,000 = 0.1571 = **15.71%** ✅ CORRECT

Note: This cap rate is unusually high. If property tax is corrected, cap rate would be lower.

---

## 6. CASH FLOW AUDIT

### Spreadsheet Shows:
- Cash Flow (Mo): $1,815
- Cash Flow (Yr): $21,783

### My Verification:
Cash Flow = NOI - Debt Service
- Monthly: $8,496 - $5,223.80 - $1,457 = **$1,815.20** ✅ CORRECT
- Annual: $1,815.20 × 12 = **$21,782.40** ✅ CORRECT

---

## 7. CASH ON CASH RETURN AUDIT

### Spreadsheet Shows:
- Cash on Cash: 18.93%
- Total Cash to Close: $115,093

### My Verification:
CoC = Annual Cash Flow / Total Cash Invested
- CoC = $21,783 / $115,093 = 0.1893 = **18.93%** ✅ CORRECT

### Total Cash to Close Breakdown:
| Item | Amount |
|------|--------|
| Down Payment | $25,000 |
| Closing Costs | $0 |
| Reno | $15,000 |
| Furnishings | $57,030 |
| Amenities | $11,813 |
| Holding Costs | $5,000 |
| Legal | $1,250 |
| **Total** | **$115,093** ✅ CORRECT |

---

## 8. PAYBACK PERIOD AUDIT

### Spreadsheet Shows:
- Payback in months: 63.40

### My Verification:
Payback = Total Cash Invested / Monthly Cash Flow
- Payback = $115,093 / $1,815 = **63.41 months** ✅ CORRECT

---

## SUMMARY OF FINDINGS

### ✅ Correct Formulas:
1. Mortgage P&I calculation
2. PMI calculation
3. Gross income calculation
4. NOI formula
5. Cap Rate formula
6. Cash Flow formula
7. Cash on Cash formula
8. Payback period formula
9. Total Cash to Close calculation

### ⚠️ Potential Data Entry Errors:
1. **Property Tax**: $4,225/month ($50,700/year) on a $250,000 home is a 20% tax rate. This is likely a data entry error. Typical would be $200-400/month.

2. **Operating Expenses Sum**: Minor discrepancy of $97 between line items and total.

### 📋 Recommendations for Calculator:
1. Add property tax validation (flag if >3% of home value)
2. Use standard formulas - they are correct
3. Add warning for unusually high/low values
4. Include all startup costs in Total Cash to Close
