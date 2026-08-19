# Bounded evidence: synthetic A/B conversion table

Evidence set: `data-analysis-2026-08-19`

This table is synthetic and contains aggregate counts only.

| Device  | Variant | Conversions | Visitors |   Rate |
| ------- | ------- | ----------: | -------: | -----: |
| Mobile  | A       |          90 |    1,000 |   9.0% |
| Mobile  | B       |          19 |      200 |   9.5% |
| Desktop | A       |         160 |      200 |  80.0% |
| Desktop | B       |         760 |    1,000 |  76.0% |
| All     | A       |         250 |    1,200 | 20.83% |
| All     | B       |         779 |    1,200 | 64.92% |

- `E-D1 — allocation`: Variant A received 83.3% mobile traffic; variant B received 16.7% mobile
  traffic. Device allocation is therefore severely imbalanced.
- `E-D2 — mobile`: B is 0.5 percentage points higher than A on mobile.
- `E-D3 — desktop`: B is 4 percentage points lower than A on desktop.
- `E-D4 — aggregate`: The large aggregate advantage for B coincides with B receiving far more of
  the high-converting desktop segment.
- `E-D5 — missing controls`: No randomization receipt, sample-ratio-mismatch check, uncertainty
  interval, or causal adjustment is supplied.

The proposed decision is a universal rollout to both device segments based only on the aggregate
rate.
