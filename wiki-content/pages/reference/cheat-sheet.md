---
title: "Markdown Cheat Sheet"
category: "reference"
description: "Quick reference for markdown syntax"
tags: ["reference", "markdown"]
order: 1
---

# Markdown Cheat Sheet

[TOC]

## Text Formatting

| Style | Syntax | Example |
|-------|--------|---------|
| Bold | `**text**` | **bold** |
| Italic | `*text*` | *italic* |
| Code | `` `code` `` | `code` |
| Strikethrough | `~~text~~` | ~~strikethrough~~ |

## Links

```
[Link text](https://example.com)
[[Internal Page Link]]
```

## Images

```
![Alt text](path/to/image.png)
```

## Lists

**Unordered:**
```
- Item one
- Item two
  - Nested item
```

**Ordered:**
```
1. First
2. Second
3. Third
```

## Code Blocks

````
```javascript
function hello() {
  console.log("Hello, world!");
}
```
````

## Admonitions

```
> [!NOTE]
> A note with a title

> [!WARNING]
> Something important

> [!TIP]
> A helpful tip

> [!DANGER]
> Caution required
```

## Footnotes

```
Reference[^1] or with a label[^label].

[^1]: First footnote definition
[^label]: A labelled footnote
```

## Task Lists

```
- [x] Completed task
- [ ] Pending task
- [ ] Another task
```

## Tables

```
| Left | Center | Right |
|------|--------|-------|
| A    | B      | C     |
| D    | E      | F     |
```
