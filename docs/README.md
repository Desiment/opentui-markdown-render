# Documentation

This directory contains the long-form documentation for `opentui-markdown-render`. The root [README](../README.md) is intentionally a product overview and a quick entry point; this directory contains the details needed to integrate, configure, extend, and maintain the renderer.

## Choose a path

### I want to use the package

1. [Getting started](getting-started.md) — install the package, create an OpenTUI renderer, mount `MarkdownRenderer`, and set up scrolling and local assets.
2. [Features and supported Markdown](features.md) — understand what each Markdown construct becomes in the terminal and what falls back to source text.
3. [Configuration](CONFIGURATION.md) — configure themes, headings, images, Mermaid, frames, tables, and the status line.
4. [API reference](api.md) — use the component props, parser, layout helpers, status line, and host integration hooks.
5. [Integration recipes](recipes.md) — streaming updates, cached documents, config isolation, theme switching, status lines, frames, and review overlays.

### I need to understand a limitation

- [Features and supported Markdown](features.md#fallbacks-and-limitations) explains terminal capability fallbacks and intentional differences from browser Markdown.
- [Mermaid support matrix](MERMAID_SUPPORT.md) lists syntax by diagram family.
- [Configuration](CONFIGURATION.md#configuration-sources-and-precedence) explains which runtime value wins when the host, config file, and defaults disagree.
- [Troubleshooting](troubleshooting.md) walks through formula, image, table, Mermaid, theme, layout, and source-range problems.

### I am embedding the renderer in a larger TUI

- Read [Getting started](getting-started.md#embedding-in-a-scrollable-view) first for the recommended layout.
- Read [API reference](api.md#render-units-and-source-ranges) for selection, comments, and overlays.
- Read [Integration recipes](recipes.md) for host-owned state and component composition.
- Read [Architecture](architecture.md) for the parser/view/native boundary and host responsibilities.

### I am changing the project

- [Development](development.md) covers the verification commands, test categories, fixture workflow, native addon, and documentation captures.
- [Architecture](architecture.md) describes the invariants that should remain true when changing the renderer.
- [Examples](../examples/README.md) is the fixture index and executable feature inventory.

## Reference map

| Page | Audience | Main question answered |
| --- | --- | --- |
| [Getting started](getting-started.md) | New users and integrators | How do I get a document on screen? |
| [Features](features.md) | Users and bug reporters | What does the renderer support and how does it fall back? |
| [Configuration](CONFIGURATION.md) | Application authors | How do I control the look and layout? |
| [API](api.md) | TypeScript/OpenTUI authors | What can I import and pass to the component? |
| [Integration recipes](recipes.md) | Host application authors | How do I combine the renderer with my own state and layout? |
| [Mermaid support](MERMAID_SUPPORT.md) | Diagram authors | Which Mermaid syntax is implemented? |
| [Troubleshooting](troubleshooting.md) | Integrators and bug reporters | Why did a feature fall back or render differently? |
| [Architecture](architecture.md) | Contributors and host authors | Where does parsing, layout, and rendering happen? |
| [Development](development.md) | Contributors | How do I test and extend the project? |

## Documentation conventions

- Code samples use TypeScript/TSX and assume Bun plus the OpenTUI/Solid peer dependencies.
- Configuration examples are JSONC unless explicitly labelled JSON. Comments are accepted by the file loader but must be removed when a strict JSON consumer is used elsewhere.
- “Host” means the application embedding the renderer. The renderer owns document rendering; the host owns the OpenTUI lifecycle, scroll container, persistent interaction state, and application-specific status values.
- “Fallback” means the content remains readable in source-oriented form. It does not necessarily mean the unsupported feature is visually approximated.
