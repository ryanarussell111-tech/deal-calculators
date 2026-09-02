# Deal Analyzer

Real estate deal analysis calculators. Two tools so far, sharing one core of
underwriting math:

- **Rental Cash Flow** — buy-and-hold analysis: monthly cash flow, cap rate,
  cash-on-cash return, total cash to close, and a 1–5 year projection.
- **BRRRR** — buy, rehab, rent, refinance: how much of your capital comes back
  out at the refinance, what stays trapped in the deal, and what the property
  cash flows once it's refinanced.

Everything runs in the browser. There is no backend, no API keys, and no
external service calls — inputs never leave the page.

## Running it

```bash
npm install
npm start          # dev server at http://localhost:3000
```

```bash
npm test           # unit + UI tests
npm run build      # static production bundle in build/
```

The production build is a static site. Any static host (Netlify, Vercel,
GitHub Pages, S3) will serve `build/` as-is.

## Layout

| File | What it is |
| --- | --- |
| `src/rentalCashFlow.js` | Rental underwriting math. Pure functions, no React. |
| `src/brrrr.js` | BRRRR math. Reuses the rental core for the post-refi hold. |
| `src/RentalCalculator.jsx` | Rental form + results UI. |
| `src/BrrrrCalculator.jsx` | BRRRR form + results UI. |
| `src/calcUI.jsx` | Form and result components shared by both calculators. |
| `src/App.jsx` | Shell and tab navigation. |

The math lives in plain modules with no UI imports, so a new calculator can
reuse `monthlyMortgagePayment()` or `calculateRentalCashFlow()` directly —
that's how the BRRRR tool models its post-refinance rental phase.

## Modeling notes

A few conventions worth knowing before you trust a number:

- **Vacancy** reduces gross rent. Management and maintenance/CapEx are taken as
  a percentage of gross rent, not of collected rent.
- **NOI excludes debt service**, so cap rate is comparable across deals
  regardless of how they're financed. BRRRR reports cap rate against ARV.
- **BRRRR acquisition loans are interest-only** during the hold, which matches
  typical hard money terms: interest accrues monthly and the full principal is
  owed at refinance. An amortizing acquisition loan will pay down a little
  principal, so the cash-out figure here runs slightly conservative against one.
- **Projections hold everything but rent flat.** Taxes, insurance, HOA,
  utilities, and the mortgage payment don't inflate; only rent grows, and only
  when the rent-growth toggle is on.
- **Cash-on-cash in BRRRR** is measured against cash left in the deal after the
  refinance. When the refinance returns everything invested, the return is
  reported as infinite, which is the convention but is also a reminder that the
  metric stops being meaningful there.

## Tests

```bash
npm test
```

The math modules are covered against hand-verified example deals, including the
standard amortization reference values, all-cash purchases, refinances that
under-cover the loan payoff, and rent-growth compounding.
