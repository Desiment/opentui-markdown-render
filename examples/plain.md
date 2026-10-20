# Plain Markdown

This example must be legible on a light terminal surface.

## Inline Formatting

It includes **bold text**, *emphasis*, ~~strikethrough~~, `inline code`, and a
link label: [OpenTUI](https://github.com/anomalyco/opentui). Escaped Markdown
stays literal: \*not emphasis\* and \$5.

### Lists

- First unordered item
- Second item
  - Nested item
  - Another nested item

1. First ordered item
2. Second ordered item
3. Third ordered item

> A blockquote checks indentation, wrapping, and the left border.
>
> It may contain a second paragraph.

---

## Code

```ts
const greeting = "Hello from a light theme"
console.log(greeting)
```

```json
{ "renderer": "OpenTUI", "theme": "light" }
```
