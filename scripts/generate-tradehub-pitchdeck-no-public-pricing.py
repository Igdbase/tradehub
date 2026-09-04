#!/usr/bin/env python3
from pathlib import Path
import textwrap


OUT_MAIN = Path("generated/TradeHub_Mature_Pitch_Deck_2026.pdf")
OUT_ALT = Path("generated/TradeHub_Pitch_Deck_No_Public_Pricing_2026.pdf")
OUT_LEGACY = Path("generated/TradeHub_Pitch_Deck_Clean_With_Packages.pdf")
OUT_MD = Path("generated/TradeHub_Pitch_Deck_No_Public_Pricing_2026.md")

W = 960
H = 540


slides = [
    {
        "kicker": "TRADEHUB",
        "title": "Your brand. Your students. One workspace.",
        "body": [
            "A mature operating system for trading educators and signal providers to manage courses, students, practice, journals, payments, support, and controlled signal readiness in one place.",
            "Built for educators who want a serious workspace, not another scattered tool stack.",
        ],
        "accent": "Pitch deck for trading educators, communities, and signal providers",
    },
    {
        "kicker": "THE PROBLEM",
        "title": "Trading education is too scattered",
        "body": [
            "Most educators do not lose time because they lack content. They lose time because the business runs across disconnected apps.",
        ],
        "bullets": [
            "Telegram or WhatsApp for signals and student questions.",
            "A separate course tool for lessons and progress.",
            "Spreadsheets for journals, practice, payments, and support notes.",
            "Manual reminders, manual follow up, and unclear student readiness.",
            "No single source of truth for who paid, learned, practiced, and needs help.",
        ],
    },
    {
        "kicker": "THE SOLUTION",
        "title": "One controlled workspace for the education business",
        "body": [
            "TradeHub brings the operational pieces together while keeping high risk execution paths gated, visible, and reviewable.",
        ],
        "cards": [
            ("Courses", "Structured lessons, resources, checks, notes, bookmarks, and proof of completion."),
            ("Practice", "Replay, simulated orders, reports, challenge rules, assignments, and feedback."),
            ("Journal", "Manual trades, practice outcomes, analytics, calendar, import, and export."),
            ("Operations", "Student CRM, payment readiness, support actions, admin review, and safe alerts."),
        ],
    },
    {
        "kicker": "STUDENT EXPERIENCE",
        "title": "A focused student experience",
        "body": [
            "Students see the work they need to do without being exposed to internal admin records or risky execution controls.",
        ],
        "bullets": [
            "Courses with progress, checks, private notes, bookmarks, resources, and proof.",
            "Practice terminal with replay, indicators, events, simulated orders, and reports.",
            "Manual journal with trade review charts, analytics, calendar, import, and export.",
            "Assignments, feedback, reminders, and task inbox for accountability.",
        ],
    },
    {
        "kicker": "WORKSPACE",
        "title": "Operations without private leakage",
        "body": [
            "The workspace is designed for running the business, not exposing raw student records.",
        ],
        "bullets": [
            "Student CRM lifecycle states, readiness counts, safe support notes, and billing indicators.",
            "Course authoring, lesson ordering, resources, deterministic checks, and completion visibility.",
            "Practice assignments, cohorts, scheduling, review queue, rubric feedback, and resubmissions.",
            "Aggregate only insights for practice, course progress, payments, and support readiness.",
        ],
    },
    {
        "kicker": "PRACTICE TERMINAL",
        "title": "Backtesting without live execution",
        "body": [
            "The practice module helps students rehearse decisions and review outcomes before risk moves into real accounts.",
        ],
        "bullets": [
            "Revealed candle replay with no future candle exposure.",
            "Simulated market, limit, and stop orders with conservative fills.",
            "Instrument aware sizing, indicators, event markers, drawings, notes, and bookmarks.",
            "Session reports, challenge rules, instructor review, and workspace assignments.",
        ],
    },
    {
        "kicker": "JOURNAL",
        "title": "Manual trade review and performance clarity",
        "body": [
            "The journal is for a student who wants to check a trade, understand what happened, and track patterns over time.",
        ],
        "bullets": [
            "Manual trade create, edit, archive, and private notes.",
            "Trade review chart with entry, exit, stop loss, take profit, and candle context.",
            "Analytics for win rate, net PnL, R multiple, expectancy, profit factor, symbols, strategies, tags, emotions, and mistakes.",
            "Safe import, export, and JSON backup owned by the signed in student.",
        ],
    },
    {
        "kicker": "SIGNALS",
        "title": "Signal workflows with controlled boundaries",
        "body": [
            "TradeHub can support signal workflows and controlled readiness checks while keeping live execution separate from normal workspace features.",
        ],
        "bullets": [
            "External signal ingestion is preview only until reviewed and approved.",
            "Signal previews are not student visible and not executable by default.",
            "AutoCopy readiness is gated by payment, consent, vault, kill switches, preflight, and reconciliation.",
            "Trade Copier is a separate optional add on, not bundled into core workspace packages.",
        ],
    },
    {
        "kicker": "ADMIN CONTROLS",
        "title": "Support, payments, and incident visibility",
        "body": [
            "The admin layer helps operators see what is blocked, what needs review, and what must stay off.",
        ],
        "bullets": [
            "Payment and subscription support queue with masked refs.",
            "Dry run messaging and reminder readiness with consent and suppression gates.",
            "Incident, rollback, reconciliation, and live AutoCopy readiness panels.",
            "Deny by default browser rules for protected operational, journal, practice, messaging, and signal data.",
        ],
    },
    {
        "kicker": "PACKAGES",
        "title": "Packages exist. Pricing is by conversation.",
        "body": [
            "TradeHub packages are quoted privately because final terms depend on student capacity, support depth, integrations, hosting profile, and rollout requirements.",
            "The public deck shows what each package contains. The commercial offer is shared after fit review.",
        ],
        "packages": [
            (
                "Launch Workspace",
                "Starter capacity, up to 50 active students",
                [
                    "Student app, courses, practice terminal, manual journal, and reports.",
                    "Basic workspace dashboard, student CRM, payment visibility, assignments, and feedback.",
                    "Best for one educator or a focused trading community.",
                    "Trade Copier is not included by default.",
                ],
            ),
            (
                "Pro Workspace",
                "Growth capacity, up to 500 active students",
                [
                    "Everything in Launch.",
                    "Advanced cohorts, assignment scheduling, review queue, resubmissions, workspace insights, analytics, import, and export.",
                    "Priority onboarding and stronger operations workflows.",
                    "Trade Copier remains a separate optional add on.",
                ],
            ),
            (
                "Enterprise Workspace",
                "Custom capacity and custom agreement",
                [
                    "Everything in Pro.",
                    "Negotiated onboarding, support, branding, reporting, integrations, infrastructure planning, and service terms.",
                    "Built for larger academies, teams, or partners with custom requirements.",
                    "Trade Copier can be discussed separately if the rollout is approved.",
                ],
            ),
        ],
    },
    {
        "kicker": "OPTIONAL ADD ONS",
        "title": "Extra services stay separate",
        "body": [
            "Keeping add ons separate protects margin, keeps the base workspace clean, and avoids promising expensive provider costs before demand is proven.",
        ],
        "bullets": [
            "Trade Copier add on: separate paid service for eligible students only.",
            "Forex and CFD historical provider setup: optional real data provider configuration.",
            "Custom onboarding: workspace setup, training, and migration support.",
            "Custom reports, white label polish, dedicated support, and integration planning.",
        ],
    },
    {
        "kicker": "COMMERCIAL MODEL",
        "title": "Why the price is not public",
        "body": [
            "TradeHub is closer to an operating system than a simple course website. The right commercial model depends on the educator's student volume, support expectations, and infrastructure footprint.",
        ],
        "bullets": [
            "Small workspaces need a clear launch package and predictable support boundaries.",
            "Growing academies need capacity, analytics, cohort operations, and faster support.",
            "Enterprise buyers need negotiated capacity, infrastructure, branding, integrations, and service terms.",
            "Trade Copier has provider and operational costs, so it is quoted and billed separately.",
        ],
    },
    {
        "kicker": "MVP STATUS",
        "title": "The core foundations are built",
        "body": [
            "TradeHub has moved beyond a concept deck. The current build has frozen foundations across the major product areas.",
        ],
        "bullets": [
            "Practice and backtesting MVP with terminal, reports, assignments, feedback, import, export, analytics, and event markers.",
            "Course and lesson MVP with checks, progress, resources, notes, bookmarks, proof, and search.",
            "Workspace ops, student CRM, payment support, dry run reminders, manual journal, and external signal preview.",
            "Controlled live AutoCopy support, readiness, cohort dry run, incident, rollback, and acceptance gates.",
        ],
    },
    {
        "kicker": "POSITIONING",
        "title": "Sell the operating system, not cheap access",
        "body": [
            "TradeHub should be positioned as infrastructure for serious trading educators: a branded workspace that helps students learn, practice, journal, and receive structured support.",
        ],
        "bullets": [
            "The buyer is paying for a working education business system.",
            "Pricing should protect support time, infrastructure cost, provider cost, and future maintenance.",
            "Core packages should stay clean and understandable.",
            "Riskier or cost-heavy features should remain optional add-ons until demand is proven.",
        ],
    },
    {
        "kicker": "TRADEHUB",
        "title": "Bring your education business home.",
        "body": [
            "One workspace for students, lessons, practice, journal clarity, support operations, and controlled signal readiness.",
            "Packages are available. Pricing is shared after a fit review.",
        ],
        "accent": "Contact TradeHub for a private quote",
    },
]


def pdf_escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def color(rgb):
    return f"{rgb[0]:.3f} {rgb[1]:.3f} {rgb[2]:.3f}"


BLACK = (0.05, 0.055, 0.065)
TEXT = (0.12, 0.13, 0.15)
MUTED = (0.42, 0.43, 0.46)
LIGHT = (0.94, 0.94, 0.94)
MID = (0.78, 0.78, 0.78)
ACCENT = (0.0, 0.45, 0.38)
AMBER = (0.70, 0.43, 0.05)


class Canvas:
    def __init__(self):
        self.ops = []

    def rect(self, x, y, w, h, fill=None, stroke=None, lw=1):
        if fill:
            self.ops.append(f"q {color(fill)} rg {x:.2f} {y:.2f} {w:.2f} {h:.2f} re f Q")
        if stroke:
            self.ops.append(f"q {lw:.2f} w {color(stroke)} RG {x:.2f} {y:.2f} {w:.2f} {h:.2f} re S Q")

    def line(self, x1, y1, x2, y2, stroke=MID, lw=1):
        self.ops.append(f"q {lw:.2f} w {color(stroke)} RG {x1:.2f} {y1:.2f} m {x2:.2f} {y2:.2f} l S Q")

    def text(self, x, y, value, size=14, font="F1", rgb=TEXT):
        self.ops.append(
            f"BT /{font} {size:.2f} Tf {color(rgb)} rg 1 0 0 1 {x:.2f} {y:.2f} Tm ({pdf_escape(value)}) Tj ET"
        )

    def wrapped(self, x, y, value, width, size=14, font="F1", rgb=TEXT, leading=None, max_lines=None):
        if leading is None:
            leading = size * 1.42
        chars = max(18, int(width / (size * 0.52)))
        lines = []
        for para in value.split("\n"):
            lines.extend(textwrap.wrap(para, chars) or [""])
        if max_lines is not None:
            lines = lines[:max_lines]
        for i, line in enumerate(lines):
            self.text(x, y - i * leading, line, size=size, font=font, rgb=rgb)
        return y - len(lines) * leading

    def content(self):
        return "\n".join(self.ops).encode("latin-1")


def draw_header(c, slide, idx):
    c.rect(0, 0, W, H, fill=(1, 1, 1))
    c.rect(0, H - 18, W, 18, fill=BLACK)
    c.text(50, H - 55, slide["kicker"], 11, "F2", AMBER)
    c.line(50, H - 66, 910, H - 66, stroke=LIGHT, lw=1)
    c.text(50, 32, "TRADEHUB", 9, "F2", MUTED)
    c.text(892, 32, f"{idx:02d}", 9, "F2", MUTED)


def draw_bullets(c, bullets, start_y):
    y = start_y
    for bullet in bullets:
        c.rect(58, y - 2, 5, 5, fill=BLACK)
        y = c.wrapped(76, y, bullet, 720, size=15, font="F1", rgb=TEXT, leading=22) - 12


def draw_cards(c, cards):
    positions = [(50, 228), (490, 228), (50, 82), (490, 82)]
    for (title, text), (x, y) in zip(cards, positions):
        c.rect(x, y, 390, 104, fill=(0.985, 0.985, 0.985), stroke=MID, lw=1)
        c.text(x + 22, y + 72, title, 18, "F2", BLACK)
        c.wrapped(x + 22, y + 46, text, 330, size=13, font="F1", rgb=TEXT, leading=17)


def draw_packages(c, packages):
    x0 = 50
    card_w = 272
    gap = 22
    y = 50
    h = 255
    for i, (name, cap, items) in enumerate(packages):
        x = x0 + i * (card_w + gap)
        c.rect(x, y, card_w, h, fill=(0.985, 0.985, 0.985), stroke=BLACK if i == 1 else MID, lw=1.5)
        c.text(x + 18, y + h - 34, name, 17, "F2", BLACK)
        c.wrapped(x + 18, y + h - 58, cap, card_w - 36, size=10.8, font="F2", rgb=ACCENT, leading=15, max_lines=2)
        by = y + h - 96
        for item in items:
            c.rect(x + 18, by - 1, 4, 4, fill=BLACK)
            by = c.wrapped(x + 30, by, item, card_w - 48, size=9.4, font="F1", rgb=TEXT, leading=12.6, max_lines=4) - 7


def render_slide(slide, idx):
    c = Canvas()
    draw_header(c, slide, idx)
    c.wrapped(50, H - 105, slide["title"], 760, size=31, font="F2", rgb=BLACK, leading=38)
    body_y = H - 158
    for para in slide.get("body", []):
        body_y = c.wrapped(50, body_y, para, 780, size=16, font="F1", rgb=TEXT, leading=22) - 10
    if "bullets" in slide:
        draw_bullets(c, slide["bullets"], min(body_y - 6, 310))
    if "cards" in slide:
        draw_cards(c, slide["cards"])
    if "packages" in slide:
        draw_packages(c, slide["packages"])
    if "accent" in slide:
        c.rect(50, 92, 610, 48, fill=BLACK)
        c.text(72, 111, slide["accent"], 16, "F2", (1, 1, 1))
    return c.content()


def write_pdf(path, page_streams):
    objects = [None]

    def reserve():
        objects.append(None)
        return len(objects) - 1

    def add(value):
        objects.append(value)
        return len(objects) - 1

    catalog_id = reserve()
    pages_id = reserve()
    font_regular_id = add(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    font_bold_id = add(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")

    page_ids = []
    for stream in page_streams:
        content = b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream"
        content_id = add(content)
        page = (
            f"<< /Type /Page /Parent {pages_id} 0 R /MediaBox [0 0 {W} {H}] "
            f"/Resources << /Font << /F1 {font_regular_id} 0 R /F2 {font_bold_id} 0 R >> >> "
            f"/Contents {content_id} 0 R >>"
        ).encode()
        page_ids.append(add(page))

    kids = " ".join(f"{pid} 0 R" for pid in page_ids)
    objects[catalog_id] = f"<< /Type /Catalog /Pages {pages_id} 0 R >>".encode()
    objects[pages_id] = f"<< /Type /Pages /Count {len(page_ids)} /Kids [ {kids} ] >>".encode()

    out = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for obj_id in range(1, len(objects)):
        offsets.append(len(out))
        out.extend(f"{obj_id} 0 obj\n".encode())
        out.extend(objects[obj_id])
        out.extend(b"\nendobj\n")
    xref_start = len(out)
    out.extend(f"xref\n0 {len(objects)}\n".encode())
    out.extend(b"0000000000 65535 f \n")
    for obj_id in range(1, len(objects)):
        out.extend(f"{offsets[obj_id]:010d} 00000 n \n".encode())
    out.extend(
        f"trailer\n<< /Size {len(objects)} /Root {catalog_id} 0 R >>\nstartxref\n{xref_start}\n%%EOF\n".encode()
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(out)


def write_markdown(path):
    lines = ["# TradeHub Pitch Deck", "", "Public pricing is private. Packages and scope are visible.", ""]
    for i, slide in enumerate(slides, start=1):
        lines.append(f"## {i:02d}. {slide['title']}")
        lines.append("")
        lines.append(f"**{slide['kicker']}**")
        lines.append("")
        for para in slide.get("body", []):
            lines.append(para)
            lines.append("")
        for bullet in slide.get("bullets", []):
            lines.append(f"- {bullet}")
        if slide.get("cards"):
            for title, text in slide["cards"]:
                lines.append(f"- **{title}:** {text}")
        if slide.get("packages"):
            for name, cap, items in slide["packages"]:
                lines.append(f"- **{name}:** {cap}")
                for item in items:
                    lines.append(f"  - {item}")
        if slide.get("accent"):
            lines.append("")
            lines.append(f"**{slide['accent']}**")
        lines.append("")
    path.write_text("\n".join(lines), encoding="utf-8")


def main():
    page_streams = [render_slide(slide, idx) for idx, slide in enumerate(slides, start=1)]
    write_pdf(OUT_MAIN, page_streams)
    write_pdf(OUT_ALT, page_streams)
    write_pdf(OUT_LEGACY, page_streams)
    write_markdown(OUT_MD)
    print(f"Wrote {OUT_MAIN}")
    print(f"Wrote {OUT_ALT}")
    print(f"Wrote {OUT_LEGACY}")
    print(f"Wrote {OUT_MD}")


if __name__ == "__main__":
    main()
