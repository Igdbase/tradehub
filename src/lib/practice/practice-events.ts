import "server-only";

import type {
  NormalizedCandle,
  PracticeEventMarkerCategory,
  PracticeEventMarkerImpact,
  PracticeEventMarkerSummary,
  PracticeSessionSummary
} from "@/types/practice";

type StaticPracticeEventTemplate = {
  eventId: string;
  assetTags: string[];
  symbolTags: string[];
  title: string;
  category: PracticeEventMarkerCategory;
  impact: PracticeEventMarkerImpact;
  safeSummary: string;
  sourceLabel?: string;
  rangeOffsetRatio: number;
};

const staticManualPracticeEventTemplates: StaticPracticeEventTemplate[] = [
  {
    eventId: "static_manual_platform_replay_note",
    assetTags: ["USD", "BTC", "XAU", "EUR"],
    symbolTags: ["BTCUSDT", "ETHUSDT", "EURUSD", "XAUUSD"],
    title: "Replay discipline note",
    category: "platform_note",
    impact: "low",
    safeSummary: "Manual TradeHub practice note: review volatility before adding simulated risk.",
    sourceLabel: "TradeHub static practice seed",
    rangeOffsetRatio: 0.18
  },
  {
    eventId: "static_manual_usd_macro_demo",
    assetTags: ["USD", "BTC", "XAU", "EUR"],
    symbolTags: ["BTCUSDT", "ETHUSDT", "EURUSD", "XAUUSD"],
    title: "USD macro demo event",
    category: "economic",
    impact: "high",
    safeSummary: "Static practice event for replay awareness only. It is not a live calendar feed.",
    sourceLabel: "TradeHub static practice seed",
    rangeOffsetRatio: 0.42
  },
  {
    eventId: "static_manual_crypto_liquidity_note",
    assetTags: ["BTC", "ETH", "USD"],
    symbolTags: ["BTCUSDT", "ETHUSDT"],
    title: "Crypto liquidity demo note",
    category: "news",
    impact: "medium",
    safeSummary: "Static crypto practice marker for reviewing simulated order behavior around event windows.",
    sourceLabel: "TradeHub static practice seed",
    rangeOffsetRatio: 0.58
  },
  {
    eventId: "static_manual_gold_usd_demo",
    assetTags: ["XAU", "USD"],
    symbolTags: ["XAUUSD"],
    title: "Gold/USD demo event",
    category: "economic",
    impact: "medium",
    safeSummary: "Static XAUUSD practice marker. No external market data or news provider is called.",
    sourceLabel: "TradeHub static practice seed",
    rangeOffsetRatio: 0.64
  },
  {
    eventId: "static_manual_eur_policy_demo",
    assetTags: ["EUR", "USD"],
    symbolTags: ["EURUSD"],
    title: "EUR policy demo event",
    category: "economic",
    impact: "medium",
    safeSummary: "Static EURUSD practice marker for post-event journaling and replay review.",
    sourceLabel: "TradeHub static practice seed",
    rangeOffsetRatio: 0.74
  }
];

function sanitizeTag(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);
}

function boundedText(value: string, maxLength: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function eventTimeForSession(session: PracticeSessionSummary, ratio: number) {
  const startMs = Date.parse(session.dateStart);
  const endMs = Date.parse(session.dateEnd);
  const safeStartMs = Number.isFinite(startMs) ? startMs : Date.now();
  const safeEndMs = Number.isFinite(endMs) && endMs > safeStartMs
    ? endMs
    : safeStartMs + session.timeframeMinutes * 60 * 1000;
  const eventMs = safeStartMs + Math.floor((safeEndMs - safeStartMs) * Math.max(0.05, Math.min(ratio, 0.95)));

  return new Date(eventMs).toISOString();
}

function templateMatchesSession(template: StaticPracticeEventTemplate, session: PracticeSessionSummary) {
  const symbol = sanitizeTag(session.symbol);

  if (template.symbolTags.map(sanitizeTag).includes(symbol)) {
    return true;
  }

  return template.assetTags.map(sanitizeTag).some((tag) => symbol.includes(tag));
}

export function listStaticManualPracticeEventMarkers(input: {
  session: PracticeSessionSummary;
  latestRevealedTime?: string;
}): PracticeEventMarkerSummary[] {
  const latestRevealedMs = input.latestRevealedTime ? Date.parse(input.latestRevealedTime) : Number.NaN;
  const sessionStartMs = Date.parse(input.session.dateStart);

  if (!Number.isFinite(latestRevealedMs) || !Number.isFinite(sessionStartMs)) {
    return [];
  }

  return staticManualPracticeEventTemplates
    .filter((template) => templateMatchesSession(template, input.session))
    .map((template): PracticeEventMarkerSummary => {
      const eventTime = eventTimeForSession(input.session, template.rangeOffsetRatio);

      return {
        eventId: `${template.eventId}_${sanitizeTag(input.session.symbol)}_${input.session.timeframeMinutes}`,
        scope: "global",
        assetTags: template.assetTags.map(sanitizeTag).filter(Boolean).slice(0, 8),
        symbolTags: template.symbolTags.map(sanitizeTag).filter(Boolean).slice(0, 8),
        title: boundedText(template.title, 90),
        category: template.category,
        impact: template.impact,
        eventTime,
        safeSummary: boundedText(template.safeSummary, 240),
        sourceLabel: boundedText(template.sourceLabel ?? "TradeHub static practice seed", 80),
        createdAt: eventTime,
        updatedAt: eventTime,
        workspaceId: undefined
      };
    })
    .filter((event) => {
      const eventTimeMs = Date.parse(event.eventTime);

      return Number.isFinite(eventTimeMs) &&
        eventTimeMs >= sessionStartMs &&
        eventTimeMs <= latestRevealedMs;
    })
    .sort((left, right) => left.eventTime.localeCompare(right.eventTime));
}

export function listVisiblePracticeEventsForRevealedCandles(input: {
  session: PracticeSessionSummary;
  revealedCandles: NormalizedCandle[];
}) {
  const latestRevealedTime = input.revealedCandles[input.revealedCandles.length - 1]?.closeTime;

  return listStaticManualPracticeEventMarkers({
    session: input.session,
    latestRevealedTime
  });
}
