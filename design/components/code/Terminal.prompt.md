Fake terminal window (traffic-light dots, dark panel) for scripted CLI walkthroughs in docs and marketing.

```jsx
<Terminal
  title="ask"
  lines={[
    { prompt: true, text: 'xerify --json ask --to anthropic:claude --question "..."' },
    { text: '{"ok":true,"data":{"answer":"..."}}' },
    { dim: true, text: '// exit 0' }
  ]}
/>
```
