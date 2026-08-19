# Bounded evidence: fictional website architecture decision

Evidence set: `website-decision-2026-08-19`

A twelve-page public information site has weekly editorial updates, no login, no personalization,
no transactional data, and no runtime integration. Nontechnical editors need a visual CMS. The
decision team approved the following weighted matrix on a 1–5 scale, where 5 is best:

| Criterion           | Weight | Managed static build + headless CMS | Custom SSR app + database |
| ------------------- | -----: | ----------------------------------: | ------------------------: |
| Security exposure   |     30 |                                   5 |                         3 |
| Editorial workflow  |     20 |                                   4 |                         5 |
| Performance         |     20 |                                   5 |                         4 |
| Operational burden  |     20 |                                   5 |                         2 |
| Cost predictability |     10 |                                   5 |                         2 |

- `E-W1 — scoring rule`: Weighted score is the sum of `weight × score`, divided by 100.
- `E-W2 — static result`: `(30×5 + 20×4 + 20×5 + 20×5 + 10×5) / 100 = 4.8`.
- `E-W3 — SSR result`: `(30×3 + 20×5 + 20×4 + 20×2 + 10×2) / 100 = 3.3`.
- `E-W4 — gate`: Any option scoring below 3 in operational burden requires a documented exception.
  No exception is present in this evidence.

The claim asks which option this approved matrix selects; it does not ask the verifier to invent
new requirements.
