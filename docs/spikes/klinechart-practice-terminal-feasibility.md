# KLineChart Practice Terminal Feasibility Spike

Status: isolated internal proof of concept only. This is not a production migration, Stage 29D.16 acceptance, or owner acceptance.

## Package And Licence

- `klinecharts` is pinned to `10.0.3` from the official npm package.
- `@klinecharts/extension` is pinned to `0.1.0` from the official KLineChart extension npm package.
- Both packages declare the Apache License 2.0.
- A distributed TradeHub build must include the Apache 2.0 licence text, preserve applicable copyright/NOTICE attribution, identify any modifications made to the library, and avoid using KLineChart names or marks as an endorsement. TradeHub has not modified either dependency in this spike.
- The installed packages carry their own `LICENSE` files; `klinecharts` also carries its upstream `NOTICE` file. Release packaging must retain the applicable notices.

## Isolation And Data Boundary

- Route: `/app/internal/klinechart-spike`.
- The route is student-role protected and has no normal product navigation entry.
- It reads deterministic demo candles from the existing protected Practice candle route.
- The deterministic spike session is seeded with persisted reveal index `23`. Initial load requests no query override and receives the authoritative 24-candle persisted slice.
- Any optional historical-slice query is clamped server-side to the minimum of the normalized request, persisted `currentCandleIndex`, and final candle index. A future query cannot advance reveal state.
- Next Candle first persists exactly the intended next index through the protected replay-index mutation, then requests the authoritative revealed slice without an index override.
- The client receives no later candles and makes no public or private provider request.
- Spike drawings live under one KLineChart overlay group and temporary `sessionStorage`. The allowlisted JSON contains overlay id, native name, and chart points only. Candles, orders, events, bookmarks, reports, credentials, and provider data are excluded.

## Tools Proven In The Spike

| TradeHub comparison tool | KLineChart implementation | Spike posture |
| --- | --- | --- |
| Trend Line / segment | Native `segment` overlay with a spike-only two-click pointer controller | Two-click interaction, live no-button preview, repeat creation, endpoint handles |
| Horizontal Line | Native `horizontalStraightLine` | Interactive one-point placement |
| Vertical Line | Native `verticalStraightLine` | Interactive one-point placement |
| Fibonacci Line | Native `fibonacciLine` | Interactive step overlay |
| Rectangle / Zone | Official extension `rect` | Interactive step overlay |
| Measure | Official extension `measure` | Interactive step overlay |
| Select and endpoint move | Native overlay selection/default point figures | Selected overlay exposes draggable points |
| Delete selected / clear all | `removeOverlay()` by id/group | Spike group only |
| Retrieve / serialize | `getOverlays()` plus an allowlisted JSON mapper | Tab-scoped restoration after reload |

## Not Proven Or Not Supported Here

- No production Practice drawing records are read or written.
- No Text Note, brush, ray, risk/reward, zoom rectangle, indicator, order, event, bookmark, journal, or report integration is included.
- No server persistence or cross-device drawing restoration is included.
- No migration of existing TradeHub drawing records to KLineChart points is included.
- Canvas overlays do not automatically provide DOM-level accessibility semantics for each drawing.
- This spike does not assess every mobile gesture, long-running overlay volume, localization, printing, or production telemetry requirement.

## Owner-Defined Trend Line Result

KLineChart's overlay engine uses step drawing rather than a held-pointer drag. However, the stock `segment` interaction in KLineChart `10.0.3` remains at native step `2/3` after the owner's two clicks and therefore does not satisfy the contract by itself. The spike uses a thin TradeHub-owned pointer controller around the native `segment`: `convertFromPixel` records the first anchor, `overrideOverlay` updates the native segment endpoint while the pointer moves without a held button, and the second click finalizes the two-point object. The segment remains a KLineChart overlay with native selection and default point handles; the adapter only changes its input sequence.

Conclusion: KLineChart can render and manage the owner-defined interaction with a small custom input controller, but its stock `segment` interaction cannot do so unadapted. The isolated adapter passed the deterministic Chromium and WebKit interaction suites described below. This does not constitute owner acceptance or approval to migrate production.

## Browser Validation

On 30 August 2026, the isolated suite passed in both Chromium and WebKit at `1366x820` laptop and `900x760` tablet viewports. Each test first persisted index `23`, made an authenticated direct request for `?index=71`, and received exactly 24 candles with index `23`; after one normal replay advance it received exactly 25 candles with index `24`. Each engine also exercised real pointer clicks and movement for two independent Trend Lines, native selection, endpoint movement, Horizontal and Vertical Lines, Fibonacci, Rectangle, Measure, selected deletion, `getOverlays()` serialization, reload restoration, and group-only clear. The suite does not stand in for owner visual acceptance, touch-device acceptance, or production-terminal acceptance.

## Migration Risks

1. KLineChart 10 uses `setDataLoader`; the production terminal currently uses `lightweight-charts` series APIs. Candle, indicator, marker, and viewport integration would need an adapter rewrite.
2. Existing TradeHub drawing records use candle indices and price fields. KLineChart overlays use timestamp/data-index/value points, so versioned two-way mapping and migration tests are required.
3. Native canvas hit testing and point handles need sustained Chromium, WebKit, touch, high-DPI, and responsive testing.
4. The official extension package is at `0.1.0`; rectangle and measure behavior should be treated as a smaller-maturity dependency surface.
5. Native overlay callbacks must be bridged to the current student-owned, revealed-candle-bounded persistence APIs without allowing drafts or future coordinates to save.
6. Styling, axes, event markers, order overlays, indicators, screenshot-free report behavior, and terminal viewport restoration all require explicit parity work.
7. Client-only initialization and cleanup must remain safe under Next.js navigation, React development remounts, and chart resize changes.
8. Introducing a second chart library increases bundle and maintenance cost until a production decision removes one implementation.

## Estimated Production Change Surface

A disciplined migration would likely modify or replace 8-12 production/test modules rather than only swapping one import:

- the Practice Terminal chart integration inside `student-practice-terminal-client.tsx`;
- a new KLineChart adapter/data-loader module;
- a drawing tool controller;
- an overlay-to-Practice drawing mapper;
- drawing persistence/restoration callbacks;
- indicator/event/order overlay adapters;
- chart styles and responsive resize handling;
- student browser drawing helpers and acceptance specs;
- focused source QA and migration compatibility tests;
- possibly Practice drawing types if a versioned point representation is adopted.

The existing protected candle, replay, order, annotation, and security routes should remain authoritative and do not need replacement merely because the renderer changes.

## Comparison Commands

```bash
npm run seed:demo
npm run klinechart:spike:qa
npm run browser:qa:klinechart-spike
npm run browser:qa:klinechart-spike:webkit
```

Browser runs require local Firebase emulators and the seeded demo student, following the existing TradeHub browser QA runbook.
