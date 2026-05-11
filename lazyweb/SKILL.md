---
name: lazyweb
description: |
  Search Lazyweb's database of real-world app screenshots (mobile and desktop) for design inspiration and research.
  Use for competitive analysis, UI pattern research, improving existing designs, and comparing implementations against top apps.
  Supports: text search, visual similarity, finding similar screenshots, and health checks.
---

# Lazyweb: UI Reference & Design Research

This skill allows you to access Lazyweb's curated database of thousands of real-world app screenshots to inform your design and implementation decisions.

## Reusable Script

Use the bundled Node.js script to interact with the Lazyweb MCP server:
`node <path_to_skill>/scripts/lazyweb_mcp.cjs <tool_name> [args_json]`

## Available Tools

- `lazyweb_search` - Natural language search over mobile/desktop screenshots.
  - Args: `{"query": "pricing page", "limit": 20, "platform": "desktop"}` (platform: mobile, desktop, or all)
- `lazyweb_find_similar` - Find more results like a known screenshot ID.
  - Args: `{"screenshot_id": 123, "limit": 20}`
- `lazyweb_compare_image` - Visual search from image data or URL.
  - Args: `{"image_url": "https://...", "limit": 20}` or `{"image_base64": "...", "mime_type": "image/png"}`
- `lazyweb_health` - Check backend connectivity.

## Common Workflows

### 1. Pricing Page References
To see how other apps handle pricing:
1. Run `lazyweb_search` with query "pricing page".
2. Filter by platform if needed (e.g., `platform: "desktop"` for SaaS).
3. Review `visionDescription` to identify relevant patterns (tiers, toggles, social proof).

### 2. Onboarding Research
To research onboarding flows:
1. Run `lazyweb_search` with query "onboarding flow" or "signup step".
2. Use `limit: 50` to get a broad range of examples.
3. Look for "progress bars", "minimalist inputs", or "social login" patterns in the descriptions.

### 3. Improving an Existing Design
If you have a screenshot or description of a current UI:
1. (If screenshot available) Use `lazyweb_compare_image` to find similar layouts in the wild.
2. (If description only) Search for the component name (e.g., "settings modal", "navigation sidebar").
3. Identify 2-3 "best-in-class" examples and suggest specific improvements (spacing, hierarchy, micro-interactions).

### 4. Comparing UI Against Real Apps
To validate a new implementation:
1. Identify the core components of your implementation.
2. Search Lazyweb for those components in high-quality apps (e.g., "Stripe dashboard", "Notion sidebar").
3. Compare alignment, typography, and affordances.

## Best Practices

- **Read descriptions**: Always check `visionDescription` to confirm a screenshot matches your needs before referencing it.
- **Cast a wide net**: Run 2-3 searches with different angles for the best results.
- **Platform matters**: SaaS products usually need `platform: "desktop"`, while consumer apps often need `platform: "mobile"`.
- **Ignore the token**: The token is stored locally in `~/.lazyweb/lazyweb_mcp_token` and is automatically used by the script. Do not log or commit it.
