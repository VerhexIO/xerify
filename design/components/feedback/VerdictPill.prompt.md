Renders one of Xerify's three verification outcomes with its real exit code. Mirrors `xerify verify`'s JSON `data.verdict` field exactly — never invent a fourth state.

```jsx
<VerdictPill verdict="confirmed" />
<VerdictPill verdict="unclear" showExit={false} />
```
