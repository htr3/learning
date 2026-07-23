# -*- coding: utf-8 -*-
"""Add revision keyword blocks and highlight keywords across all Q&A pages."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKIP = {"index.html", "dsa-visuals.html", "system-design-diagrams.html"}

TECH_HINTS = re.compile(
    r"\b(?:O\([^)]+\)|API|REST|JPA|JWT|SQL|JVM|GC|HTTP|HTTPS|JSON|XML|"
    r"Kafka|JMS|Camel|Spring|Boot|Docker|Kubernetes|Jenkins|TestNG|JUnit|Mockito|"
    r"HashMap|ArrayList|BFS|DFS|DP|Saga|ACID|CAP|SLA|SLO|CI|CD|DLQ|MTTR|"
    r"BSS|OSS|telco|microservice|monolith|idempotent|transactional)\b",
    re.I,
)


def unique_keep(items):
    seen = set()
    out = []
    for x in items:
        k = x.lower().strip()
        if k and k not in seen and len(k) < 48:
            seen.add(k)
            out.append(x.strip())
    return out


def extract_keywords(question, html):
    kws = []
    for m in re.finditer(r"<code[^>]*>([^<]+)</code>", html, re.I):
        t = re.sub(r"\s+", " ", m.group(1)).strip()
        if 0 < len(t) <= 42:
            kws.append(t.lstrip("@"))
    for m in re.finditer(r"<strong[^>]*>([^<]+)</strong>", html, re.I):
        kws.append(m.group(1).strip())
    for m in TECH_HINTS.finditer(question + " " + re.sub(r"<[^>]+>", " ", html)):
        kws.append(m.group(0))
    # First segment before em dash in list items
    for m in re.finditer(r"<li[^>]*>\s*<strong[^>]*>([^<]+)</strong>", html, re.I):
        kws.append(m.group(1).strip())
    for m in re.finditer(r"<li[^>]*>([^<]{3,40}?)\s*[—–-]\s*", html):
        t = re.sub(r"<[^>]+>", "", m.group(1)).strip()
        if t:
            kws.append(t)
    return unique_keep(kws)[:10]


def highlight_inline(html):
    html = re.sub(r'<strong(?!\s+class="kw")>', '<strong class="kw">', html)
    html = re.sub(r"<strong>", '<strong class="kw">', html)
    html = re.sub(r'<code(?!\s+class="kw-code")>', '<code class="kw-code">', html)
    return html


def revision_block(keywords):
    if not keywords:
        return ""
    items = "".join(f'<li><span class="kw">{k}</span></li>' for k in keywords[:8])
    return (
        '<div class="revision-block">'
        '<h4 class="revision-heading">📌 Revision keywords</h4>'
        f'<ul class="revision-kw">{items}</ul></div>'
    )


def expand_thin_paragraph(p_text):
    """Turn very short single paragraph into bullet points if it has multiple sentences."""
    if len(p_text) > 220 or p_text.count(".") < 2:
        return None
    parts = [s.strip() for s in re.split(r"\.\s+", p_text) if s.strip()]
    if len(parts) < 2:
        return None
    lis = "".join(f"<li>{highlight_inline(s.rstrip('.'))}.</li>" for s in parts[:5])
    return f'<ul class="brief-bullets">{lis}</ul>'


def process_answer_body(body, question):
    if "qa-footer" in body:
        body, footer = body.split('<div class="qa-footer">', 1)
        footer = '<div class="qa-footer">' + footer
    else:
        footer = ""

    if "revision-block" in body:
        body = highlight_inline(body)
        return body + footer

    keywords = extract_keywords(question, body)
    body = highlight_inline(body)

    # Normalize headings
    body = re.sub(
        r"<h4>\s*Quick answer\s*</h4>",
        '<h4 class="revision-heading">Brief explanation</h4>',
        body,
        flags=re.I,
    )
    body = re.sub(
        r"<h4>\s*Answer\s*</h4>",
        '<h4 class="revision-heading">Brief explanation</h4>',
        body,
        flags=re.I,
    )
    other_h4 = re.sub(
        r'class="revision-heading"',
        "",
        body,
    )
    if "Brief explanation" not in other_h4 and not re.match(
        r"\s*<(ul|ol|pre|div)", body.strip()
    ):
        body = '<h4 class="revision-heading">Brief explanation</h4>' + body

    rev = revision_block(keywords)
    body = rev + body

    # Expand lone short <p> after brief heading
    m = re.search(
        r'(<h4 class="revision-heading">Brief explanation</h4>\s*)<p>([^<]+)</p>',
        body,
        re.I,
    )
    if m:
        expanded = expand_thin_paragraph(m.group(2))
        if expanded:
            body = body[: m.start()] + m.group(1) + expanded + body[m.end() :]

    return body + footer


def process_card(card_html):
    qm = re.search(r"<h3>([^<]+)</h3>", card_html)
    question = qm.group(1) if qm else ""
    am = re.search(
        r'(<div class="qa-answer">)(.*?)(<div class="qa-footer">)',
        card_html,
        re.DOTALL,
    )
    if not am:
        return card_html
    new_body = process_answer_body(am.group(2), question)
    return card_html[: am.start(2)] + new_body + card_html[am.start(3) :]


def process_file(path):
    text = path.read_text(encoding="utf-8")
    if "qa-card" not in text:
        return 0
    cards = list(re.finditer(r'<article class="qa-card"[^>]*>.*?</article>', text, re.DOTALL))
    if not cards:
        return 0
    n = 0
    offset = 0
    new_text = text
    for m in cards:
        old = m.group(0)
        new = process_card(old)
        if new != old:
            n += 1
        start = m.start() + offset
        end = m.end() + offset
        new_text = new_text[:start] + new + new_text[end:]
        offset += len(new) - len(old)
    if n:
        path.write_text(new_text, encoding="utf-8")
    return n


def main():
    total = 0
    for path in ROOT.rglob("*.html"):
        if path.name in SKIP or "terminals" in str(path):
            continue
        if path.parent.name == "assets":
            continue
        c = process_file(path)
        if c:
            print(f"{path.relative_to(ROOT)}: {c} cards enhanced")
            total += c
    print(f"Done — {total} cards updated")


if __name__ == "__main__":
    main()
