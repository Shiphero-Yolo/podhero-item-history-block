"""Generate the PODHero Item History user guide PDF."""

from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.platypus.flowables import HRFlowable, KeepTogether

# ---------- Brand palette ----------
PURPLE = HexColor("#5B2C91")        # primary
CORAL = HexColor("#FF4D6D")         # secondary
YELLOW = HexColor("#FFD93D")        # accent
NAVY = HexColor("#1B1B3A")          # dark text
GRAY_BG = HexColor("#F4F4F8")       # soft background
GRAY_TEXT = HexColor("#5C5C7A")     # secondary text
GREEN = HexColor("#2FBF71")         # success
RED = HexColor("#E63946")           # error
BLUE = HexColor("#4361EE")          # info / current

OUTPUT = "/Users/abrahamlopez-sh/fde/podhero-item-history-block/docs/PODHero-Item-History-User-Guide.pdf"

# ---------- Page templates ----------
PAGE_W, PAGE_H = LETTER
MARGIN = 0.75 * inch


def cover_page(canvas, doc):
    canvas.saveState()
    # Full purple background
    canvas.setFillColor(PURPLE)
    canvas.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)

    # Coral diagonal accent band
    canvas.setFillColor(CORAL)
    p = canvas.beginPath()
    p.moveTo(0, PAGE_H * 0.30)
    p.lineTo(PAGE_W, PAGE_H * 0.45)
    p.lineTo(PAGE_W, PAGE_H * 0.38)
    p.lineTo(0, PAGE_H * 0.23)
    p.close()
    canvas.drawPath(p, stroke=0, fill=1)

    # Yellow dot accent
    canvas.setFillColor(YELLOW)
    canvas.circle(PAGE_W - 1.2 * inch, PAGE_H - 1.2 * inch, 0.55 * inch, stroke=0, fill=1)

    # Logo-style PODHero badge
    canvas.setFillColor(YELLOW)
    canvas.roundRect(MARGIN, PAGE_H - 1.4 * inch, 1.85 * inch, 0.6 * inch, 0.12 * inch, stroke=0, fill=1)
    canvas.setFillColor(PURPLE)
    canvas.setFont("Helvetica-Bold", 24)
    canvas.drawString(MARGIN + 0.2 * inch, PAGE_H - 1.08 * inch, "PODHero")

    # Title
    canvas.setFillColor(white)
    canvas.setFont("Helvetica-Bold", 42)
    canvas.drawString(MARGIN, PAGE_H * 0.55, "Item History")
    canvas.setFont("Helvetica-Bold", 42)
    canvas.drawString(MARGIN, PAGE_H * 0.55 - 0.7 * inch, "User Guide")

    # Subtitle
    canvas.setFillColor(YELLOW)
    canvas.setFont("Helvetica", 16)
    canvas.drawString(MARGIN, PAGE_H * 0.55 - 1.3 * inch, "Track every order. Every step. Every time.")

    # Footer block
    canvas.setFillColor(white)
    canvas.setFont("Helvetica", 11)
    canvas.drawString(MARGIN, 0.9 * inch, "For Shopify Admin users")
    canvas.setFillColor(YELLOW)
    canvas.setFont("Helvetica-Bold", 11)
    canvas.drawString(MARGIN, 0.7 * inch, "Version 1.0")

    canvas.restoreState()


def content_page(canvas, doc):
    canvas.saveState()
    # Top header bar
    canvas.setFillColor(PURPLE)
    canvas.rect(0, PAGE_H - 0.5 * inch, PAGE_W, 0.5 * inch, stroke=0, fill=1)

    # Yellow accent stripe
    canvas.setFillColor(YELLOW)
    canvas.rect(0, PAGE_H - 0.55 * inch, PAGE_W, 0.05 * inch, stroke=0, fill=1)

    # Header text - PODHero badge
    canvas.setFillColor(YELLOW)
    canvas.setFont("Helvetica-Bold", 13)
    canvas.drawString(MARGIN, PAGE_H - 0.32 * inch, "PODHero")
    canvas.setFillColor(white)
    canvas.setFont("Helvetica", 11)
    canvas.drawString(MARGIN + 0.95 * inch, PAGE_H - 0.32 * inch, "Item History User Guide")

    # Footer bar
    canvas.setFillColor(GRAY_BG)
    canvas.rect(0, 0, PAGE_W, 0.45 * inch, stroke=0, fill=1)
    canvas.setFillColor(GRAY_TEXT)
    canvas.setFont("Helvetica", 9)
    canvas.drawString(MARGIN, 0.18 * inch, "PODHero Item History Block")
    canvas.drawRightString(PAGE_W - MARGIN, 0.18 * inch, f"Page {doc.page - 1}")

    # Side accent
    canvas.setFillColor(CORAL)
    canvas.rect(0, 0.45 * inch, 0.12 * inch, PAGE_H - 1.0 * inch, stroke=0, fill=1)

    canvas.restoreState()


# ---------- Styles ----------
styles = getSampleStyleSheet()

H1 = ParagraphStyle(
    "H1", parent=styles["Heading1"],
    fontName="Helvetica-Bold", fontSize=26, leading=30,
    textColor=PURPLE, spaceAfter=8, spaceBefore=0,
)
H2 = ParagraphStyle(
    "H2", parent=styles["Heading2"],
    fontName="Helvetica-Bold", fontSize=15, leading=20,
    textColor=NAVY, spaceAfter=6, spaceBefore=14,
)
H3 = ParagraphStyle(
    "H3", parent=styles["Heading3"],
    fontName="Helvetica-Bold", fontSize=12, leading=16,
    textColor=CORAL, spaceAfter=4, spaceBefore=10,
)
BODY = ParagraphStyle(
    "Body", parent=styles["BodyText"],
    fontName="Helvetica", fontSize=11, leading=16,
    textColor=NAVY, spaceAfter=8,
)
BULLET = ParagraphStyle(
    "Bullet", parent=BODY,
    leftIndent=18, bulletIndent=4, spaceAfter=4,
)
SUBTITLE = ParagraphStyle(
    "Subtitle", parent=BODY,
    fontSize=13, textColor=GRAY_TEXT, spaceAfter=12,
)
CALLOUT_TITLE = ParagraphStyle(
    "CalloutTitle", parent=BODY,
    fontName="Helvetica-Bold", fontSize=11, textColor=PURPLE,
    spaceAfter=4,
)
CALLOUT_BODY = ParagraphStyle(
    "CalloutBody", parent=BODY,
    fontSize=10.5, leading=15, textColor=NAVY, spaceAfter=0,
)


def callout(title, body, bg=YELLOW, border=PURPLE):
    """Boxed tip / note callout."""
    inner = [Paragraph(title, CALLOUT_TITLE), Paragraph(body, CALLOUT_BODY)]
    t = Table([[inner]], colWidths=[PAGE_W - 2 * MARGIN - 0.12 * inch])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("BOX", (0, 0), (-1, -1), 0, white),
        ("LEFTPADDING", (0, 0), (-1, -1), 14),
        ("RIGHTPADDING", (0, 0), (-1, -1), 14),
        ("TOPPADDING", (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
        ("LINEBEFORE", (0, 0), (0, -1), 4, border),
    ]))
    return t


def status_table(rows):
    """Two-col status table: dot + label, description."""
    data = []
    for color, label, desc in rows:
        dot = Table([[""]], colWidths=[0.18 * inch], rowHeights=[0.18 * inch])
        dot.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), color),
            ("BOX", (0, 0), (-1, -1), 0, white),
        ]))
        cell = Table(
            [[dot, Paragraph(f"<b>{label}</b>", BODY)]],
            colWidths=[0.3 * inch, 1.4 * inch],
        )
        cell.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 2),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ]))
        data.append([cell, Paragraph(desc, BODY)])

    t = Table(data, colWidths=[1.9 * inch, PAGE_W - 2 * MARGIN - 0.12 * inch - 1.9 * inch])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [white, GRAY_BG]),
        ("LINEABOVE", (0, 0), (-1, 0), 2, PURPLE),
        ("LINEBELOW", (0, -1), (-1, -1), 2, PURPLE),
    ]))
    return t


def troubleshoot_row(problem, solution):
    return [
        Paragraph(f"<b>{problem}</b>", BODY),
        Paragraph(solution, BODY),
    ]


def troubleshoot_table(rows):
    header = [
        Paragraph("<font color='white'><b>If you see this...</b></font>", BODY),
        Paragraph("<font color='white'><b>Try this</b></font>", BODY),
    ]
    data = [header] + [troubleshoot_row(p, s) for p, s in rows]
    t = Table(data, colWidths=[2.4 * inch, PAGE_W - 2 * MARGIN - 0.12 * inch - 2.4 * inch])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PURPLE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, GRAY_BG]),
        ("LINEBELOW", (0, 0), (-1, 0), 1, white),
    ]))
    return t


# ---------- Build doc ----------
doc = BaseDocTemplate(
    OUTPUT,
    pagesize=LETTER,
    leftMargin=MARGIN, rightMargin=MARGIN,
    topMargin=0.85 * inch, bottomMargin=0.7 * inch,
    title="PODHero Item History User Guide",
    author="PODHero",
)

frame_cover = Frame(0, 0, PAGE_W, PAGE_H, id="cover", showBoundary=0,
                    leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
frame_content = Frame(MARGIN, 0.55 * inch, PAGE_W - 2 * MARGIN,
                      PAGE_H - 1.45 * inch, id="content", showBoundary=0,
                      leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)

doc.addPageTemplates([
    PageTemplate(id="Cover", frames=[frame_cover], onPage=cover_page),
    PageTemplate(id="Content", frames=[frame_content], onPage=content_page),
])

story = []

# ---- Cover (blank flowable; cover_page draws everything) ----
story.append(Spacer(1, 0.1 * inch))
story.append(NextPageTemplate("Content"))
story.append(PageBreak())

# ---- Page 1: Welcome ----
story.append(Paragraph("Welcome", H1))
story.append(Paragraph(
    "The Item History block lives inside your Shopify Admin and shows you exactly where every "
    "print-on-demand item is in our process — from the moment it lands in PODHero to the moment "
    "it ships.",
    SUBTITLE,
))
story.append(HRFlowable(width="100%", thickness=2, color=YELLOW, spaceBefore=4, spaceAfter=14))

story.append(Paragraph("What this guide covers", H2))
story.append(Paragraph("• How to open the Item History block on an order", BULLET))
story.append(Paragraph("• How to read the status timeline for each item", BULLET))
story.append(Paragraph("• When and how to use the <b>Re-ship</b> button", BULLET))
story.append(Paragraph("• What to do when something looks wrong", BULLET))

story.append(Paragraph("Who it's for", H2))
story.append(Paragraph(
    "Customer support, operations, and anyone who needs a fast answer to "
    "<i>“where is this order right now?”</i> No technical background required.",
    BODY,
))

story.append(Spacer(1, 0.1 * inch))
story.append(callout(
    "In a hurry?",
    "Open any order in Shopify Admin and scroll down. The Item History block shows a "
    "step-by-step timeline for every item on the order.",
    bg=YELLOW, border=PURPLE,
))

story.append(PageBreak())

# ---- Page 2: Getting started ----
story.append(Paragraph("Getting started", H1))
story.append(Paragraph(
    "The block appears automatically on every order. You don't need to install anything or "
    "click any special button to turn it on.",
    SUBTITLE,
))
story.append(HRFlowable(width="100%", thickness=2, color=YELLOW, spaceBefore=4, spaceAfter=14))

story.append(Paragraph("Step 1 — Open Shopify Admin", H3))
story.append(Paragraph("Sign in to your store the way you normally do.", BODY))

story.append(Paragraph("Step 2 — Go to Orders", H3))
story.append(Paragraph(
    "From the left sidebar, click <b>Orders</b>, then click any order to open its details page.",
    BODY,
))

story.append(Paragraph("Step 3 — Find the Item History block", H3))
story.append(Paragraph(
    "Scroll down the order page. You'll see a section titled <b>Item History</b>. "
    "It lists every item on the order with a horizontal timeline underneath.",
    BODY,
))

story.append(Spacer(1, 0.05 * inch))
story.append(callout(
    "The first time you open an order",
    "It can take a moment to load — the block is reaching out to PODHero for the latest status. "
    "If you see “Loading…” for more than a few seconds, refresh the page.",
    bg=GRAY_BG, border=BLUE,
))

story.append(Paragraph("What you'll see", H2))
story.append(Paragraph("For each item on the order, the block shows:", BODY))
story.append(Paragraph("• The product name and SKU", BULLET))
story.append(Paragraph("• How many were ordered", BULLET))
story.append(Paragraph("• A timeline of every step the item has gone through", BULLET))
story.append(Paragraph("• A <b>Re-ship</b> button on the right side", BULLET))

story.append(PageBreak())

# ---- Page 3: Reading the timeline ----
story.append(Paragraph("Reading the timeline", H1))
story.append(Paragraph(
    "Every item moves through seven stages, left to right. Each stage shows the date "
    "and time it happened.",
    SUBTITLE,
))
story.append(HRFlowable(width="100%", thickness=2, color=YELLOW, spaceBefore=4, spaceAfter=14))

# Visual representation of the happy path
story.append(Paragraph("The happy path", H2))
stages = ["New", "Batched", "Treated", "Decorated", "QC Pass", "Binned", "Shipped"]
STAGE_STYLE = ParagraphStyle(
    "Stage", parent=BODY, fontSize=9.5, leading=12,
    alignment=1, textColor=white,
)
CHEV_STYLE = ParagraphStyle(
    "Chev", parent=BODY, fontSize=18, leading=20,
    alignment=1, textColor=PURPLE, fontName="Helvetica-Bold",
)
stage_cells = []
col_widths = []
avail = PAGE_W - 2 * MARGIN - 0.12 * inch
chev_w = 0.22 * inch
stage_w = (avail - chev_w * (len(stages) - 1)) / len(stages)
for i, s in enumerate(stages):
    stage_cells.append(Paragraph(f"<b>{s}</b>", STAGE_STYLE))
    col_widths.append(stage_w)
    if i < len(stages) - 1:
        stage_cells.append(Paragraph("›", CHEV_STYLE))
        col_widths.append(chev_w)

stage_table = Table([stage_cells], colWidths=col_widths)
ts = [
    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("LEFTPADDING", (0, 0), (-1, -1), 2),
    ("RIGHTPADDING", (0, 0), (-1, -1), 2),
    ("TOPPADDING", (0, 0), (-1, -1), 12),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
]
for i in range(len(stage_cells)):
    if i % 2 == 0:
        ts.append(("BACKGROUND", (i, 0), (i, 0), PURPLE))
stage_table.setStyle(TableStyle(ts))
story.append(stage_table)
story.append(Spacer(1, 0.15 * inch))

story.append(Paragraph("What each stage means", H2))
story.append(status_table([
    (BLUE, "New", "We received the order and it's in the queue."),
    (PURPLE, "Batched", "Grouped with similar items so we can produce them together efficiently."),
    (CORAL, "Treated", "Pre-treatment applied (the prep step before printing)."),
    (PURPLE, "Decorated", "Printed or decorated with the customer's design."),
    (GREEN, "QC Pass", "Passed quality control. Looks great."),
    (PURPLE, "Binned", "Packed and waiting for the courier."),
    (GREEN, "Shipped", "Out the door. On its way to the customer."),
]))

story.append(Spacer(1, 0.1 * inch))
story.append(callout(
    "How to read the colors",
    "<b>Green dots</b> = step is done. <b>Blue dot</b> = the item is here right now. "
    "<b>Gray dot</b> = step hasn't happened yet. Hover over any step to see when it happened.",
    bg=YELLOW, border=PURPLE,
))

story.append(PageBreak())

# ---- Page 4: When things go wrong ----
story.append(Paragraph("When something goes wrong", H1))
story.append(Paragraph(
    "Sometimes an item can't continue down the happy path. When that happens, you'll see a "
    "red status at the end of the timeline that explains what stopped it.",
    SUBTITLE,
))
story.append(HRFlowable(width="100%", thickness=2, color=YELLOW, spaceBefore=4, spaceAfter=14))

story.append(Paragraph("The four error statuses", H2))
story.append(status_table([
    (RED, "QC Fail", "The item didn't pass quality control. It will need to be re-made."),
    (RED, "API Fail", "Something went wrong talking to a partner system. Usually temporary."),
    (RED, "Inventory Fail", "We're out of stock on a material needed to make the item."),
    (RED, "Cancelled", "The item was cancelled and won't be produced."),
]))

story.append(Spacer(1, 0.1 * inch))
story.append(Paragraph("What to do", H2))
story.append(Paragraph(
    "<b>QC Fail</b> or <b>API Fail</b>: Click <b>Re-ship</b> to put the item back at the start "
    "of the line. The PODHero team will pick it up automatically.",
    BODY,
))
story.append(Paragraph(
    "<b>Inventory Fail</b>: Don't re-ship yet — the same problem will block it again. Reach out "
    "to PODHero ops to confirm stock is available, then re-ship.",
    BODY,
))
story.append(Paragraph(
    "<b>Cancelled</b>: No action needed unless the customer changes their mind. "
    "If they do, click <b>Re-ship</b>.",
    BODY,
))

story.append(Spacer(1, 0.05 * inch))
story.append(callout(
    "Heads up",
    "A red status doesn't mean the whole order is broken — it's per item. Other items on "
    "the same order may still be moving along just fine.",
    bg=GRAY_BG, border=CORAL,
))

story.append(PageBreak())

# ---- Page 5: Re-ship button ----
story.append(Paragraph("Using the Re-ship button", H1))
story.append(Paragraph(
    "The Re-ship button asks PODHero to start the item over from scratch. Use it when an item "
    "needs to be re-made — for example, after a quality issue or a customer return.",
    SUBTITLE,
))
story.append(HRFlowable(width="100%", thickness=2, color=YELLOW, spaceBefore=4, spaceAfter=14))

story.append(Paragraph("How to re-ship an item", H2))
story.append(Paragraph("1. Find the item on the order page.", BODY))
story.append(Paragraph("2. Click the <b>Re-ship</b> button on the right.", BODY))
story.append(Paragraph(
    "3. The button changes to <b>Re-ship requested</b> — that's your confirmation.",
    BODY,
))
story.append(Paragraph(
    "4. Within a minute, the timeline will reset to <b>New</b> and start over.",
    BODY,
))

story.append(Paragraph("When to use it", H2))
story.append(Paragraph("• An item failed QC and needs to be made again", BULLET))
story.append(Paragraph("• A customer received a damaged or wrong item", BULLET))
story.append(Paragraph("• A cancelled order is being un-cancelled", BULLET))
story.append(Paragraph("• An API failure stalled the item — re-shipping nudges it back into the queue", BULLET))

story.append(Paragraph("When NOT to use it", H2))
story.append(Paragraph("• The item is already moving normally — re-shipping starts it over from scratch", BULLET))
story.append(Paragraph(
    "• The item failed for <b>Inventory</b> — fix the stock issue first, otherwise it will fail again",
    BULLET,
))
story.append(Paragraph("• You already clicked Re-ship and it shows <b>Re-ship requested</b>", BULLET))

story.append(Spacer(1, 0.05 * inch))
story.append(callout(
    "One click is enough",
    "After you click Re-ship, the button locks so you can't accidentally re-trigger it. "
    "If you need to re-ship the same item again later, refresh the page first.",
    bg=YELLOW, border=PURPLE,
))

story.append(PageBreak())

# ---- Page 6: Troubleshooting ----
story.append(Paragraph("Troubleshooting", H1))
story.append(Paragraph(
    "Most issues fall into a small handful of patterns. Find the one closest to what you're "
    "seeing and try the fix.",
    SUBTITLE,
))
story.append(HRFlowable(width="100%", thickness=2, color=YELLOW, spaceBefore=4, spaceAfter=14))

story.append(troubleshoot_table([
    (
        "“Loading…” never goes away",
        "Refresh the order page. If it still hangs after 30 seconds, the connection to "
        "PODHero is slow — wait a minute and try again.",
    ),
    (
        "“No history found for this order”",
        "PODHero hasn't received this order yet. Wait a couple of minutes for it to sync. "
        "If the order is more than 10 minutes old, contact the PODHero team.",
    ),
    (
        "“No order selected”",
        "Reload the page. This usually means Shopify hadn't finished loading the order "
        "details when the block opened.",
    ),
    (
        "Timeline shows the wrong status",
        "Refresh the page — the block caches data for a few minutes. If it's still wrong "
        "after a refresh, contact the PODHero team with the order number.",
    ),
    (
        "Re-ship button does nothing",
        "Check your internet connection and try once more. If it still doesn't respond, "
        "refresh the page and try again.",
    ),
    (
        "Re-ship button shows an error",
        "Note the error message and contact PODHero support. Don't keep clicking — "
        "it won't help and may queue duplicate requests.",
    ),
    (
        "I see items I don't recognise",
        "The block lists every item on the Shopify order. If something looks wrong, double-check "
        "the order in Shopify itself first.",
    ),
    (
        "Block is missing entirely",
        "Make sure you're on an order detail page, not the orders list. If it's still missing, "
        "the extension may need to be re-enabled — contact the PODHero team.",
    ),
]))

story.append(PageBreak())

# ---- Page 7: Quick reference / Help ----
story.append(Paragraph("Quick reference & help", H1))
story.append(Paragraph(
    "Keep this page handy for everyday use.",
    SUBTITLE,
))
story.append(HRFlowable(width="100%", thickness=2, color=YELLOW, spaceBefore=4, spaceAfter=14))

story.append(Paragraph("At a glance", H2))
ref_data = [
    [Paragraph("<b>Where is it?</b>", BODY),
     Paragraph("Shopify Admin → Orders → any order → scroll down", BODY)],
    [Paragraph("<b>What does it show?</b>", BODY),
     Paragraph("A status timeline for every item on the order", BODY)],
    [Paragraph("<b>How fresh is the data?</b>", BODY),
     Paragraph("Live — refreshed every time you open the order", BODY)],
    [Paragraph("<b>Can I undo a Re-ship?</b>", BODY),
     Paragraph("No, but you can re-ship again if needed", BODY)],
    [Paragraph("<b>Does this affect billing?</b>", BODY),
     Paragraph("Re-shipping triggers a new production run — check with ops on costs", BODY)],
]
ref_table = Table(ref_data, colWidths=[1.9 * inch, PAGE_W - 2 * MARGIN - 0.12 * inch - 1.9 * inch])
ref_table.setStyle(TableStyle([
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (-1, -1), 10),
    ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ("TOPPADDING", (0, 0), (-1, -1), 9),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
    ("ROWBACKGROUNDS", (0, 0), (-1, -1), [white, GRAY_BG]),
    ("LINEABOVE", (0, 0), (-1, 0), 2, PURPLE),
    ("LINEBELOW", (0, -1), (-1, -1), 2, PURPLE),
]))
story.append(ref_table)

story.append(Paragraph("Glossary", H2))
gloss = [
    ("Batched", "Grouping similar items together to print in one production run."),
    ("Decorated", "Industry term for printing or applying a design to a blank product."),
    ("QC", "Quality Control — the inspection step before an item ships."),
    ("Binned", "Packed into shipping bins, ready for pickup by the courier."),
    ("SKU", "Stock Keeping Unit — the unique code that identifies a product variant."),
]
for term, definition in gloss:
    story.append(Paragraph(f"<b>{term}</b> — {definition}", BODY))

story.append(Spacer(1, 0.1 * inch))
story.append(callout(
    "Need a hand?",
    "If you're stuck, screenshot the order page (including the Item History block) and send it "
    "to your PODHero point of contact. Including the Shopify order number speeds things up a lot.",
    bg=YELLOW, border=PURPLE,
))

# Build it
doc.build(story)
print(f"Wrote {OUTPUT}")
