# -*- coding: utf-8 -*-
"""Expand Q&A answers with beginner-friendly brief explanations across all topics."""
import re
import sys
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
from dsa_briefs import DSA_BRIEFS  # noqa: E402

TECH_HINTS = re.compile(
    r"\b(?:O\([^)]+\)|API|REST|JPA|JWT|SQL|JVM|GC|HTTP|HTTPS|JSON|XML|"
    r"Kafka|JMS|Camel|Spring|Boot|Docker|Kubernetes|Jenkins|TestNG|JUnit|Mockito|"
    r"HashMap|ArrayList|BFS|DFS|DP|Saga|ACID|CAP|SLA|SLO|CI|CD|DLQ|MTTR|"
    r"BSS|OSS|telco|microservice|monolith|idempotent|transactional)\b",
    re.I,
)

SQL_QUERY_HINTS = {
    "SELECT all rows": (
        "Returns every column and every row from a table — the simplest read query.",
        ["Use SELECT * only for exploration; in production list columns you need", "Reads full table — can be slow on large tables without LIMIT"],
    ),
    "SELECT specific columns": (
        "Pick only the columns you need instead of all columns — faster and clearer.",
        ["Reduces network and memory", "Makes query intent obvious to other developers"],
    ),
    "SELECT DISTINCT": (
        "Removes duplicate values and shows each unique value once.",
        ["Useful for unique departments, cities, statuses", "DISTINCT applies to the full selected row combination"],
    ),
    "WHERE — filter by equality": (
        "Filters rows where a column exactly matches a value.",
        ["Only rows matching the condition are returned", "Combine with AND/OR for multiple conditions"],
    ),
    "WHERE — AND / OR": (
        "Combines multiple filter conditions with AND (all true) or OR (any true).",
        ["Use parentheses when mixing AND and OR", "AND is evaluated before OR unless grouped"],
    ),
    "WHERE — IN list": (
        "Checks if a column value is in a given list.",
        ["Cleaner than many OR conditions", "NOT IN excludes listed values"],
    ),
    "WHERE — BETWEEN": (
        "Filters rows where a value falls in a range (inclusive).",
        ["Works on dates, numbers, strings", "Use consistent date format/timezone"],
    ),
    "WHERE — LIKE": (
        "Pattern matching — % = any chars, _ = one char.",
        ["'A%' = starts with A", "Leading % often prevents index use"],
    ),
    "WHERE — IS NULL": (
        "NULL means missing/unknown — never compare with = NULL.",
        ["Use IS NULL / IS NOT NULL", "COALESCE gives default for NULL"],
    ),
    "ORDER BY ascending": (
        "Sorts rows smallest-to-largest (ASC is default).",
        ["Apply after WHERE filter", "Can sort by multiple columns"],
    ),
    "ORDER BY descending": (
        "Sorts rows largest-to-smallest (DESC).",
        ["Common for newest-first dates", "Tie-break with second column"],
    ),
    "LIMIT and OFFSET": (
        "Pagination — LIMIT = how many rows, OFFSET = skip first N.",
        ["Page 3 size 10: LIMIT 10 OFFSET 20", "Large OFFSET on big tables can be slow"],
    ),
    "COUNT rows": (
        "Counts matching rows — often with GROUP BY.",
        ["COUNT(*) counts all rows", "COUNT(col) ignores NULL in col"],
    ),
    "SUM — total": (
        "Adds numeric column values — total revenue, quantity, etc.",
        ["NULLs ignored", "Use with GROUP BY for per-group totals"],
    ),
    "AVG — average": (
        "Calculates mean of a numeric column.",
        ["NULLs excluded from average", "Watch integer division in some DBs"],
    ),
    "MIN and MAX": (
        "Smallest or largest value in a column.",
        ["Works on numbers, dates, strings", "Useful in dashboards and range checks"],
    ),
    "GROUP BY — count per": (
        "Groups rows with same value and aggregates each group.",
        ["Non-aggregated SELECT cols must be in GROUP BY", "Example: employees per department"],
    ),
    "HAVING — filter grouped": (
        "Filters groups after GROUP BY (WHERE filters rows before grouping).",
        ["HAVING AVG(salary) > 60000 style filters", "Use WHERE for row-level filters first"],
    ),
    "INNER JOIN": (
        "Returns only rows with matches in both tables.",
        ["No match = row dropped", "Most common join type"],
    ),
    "LEFT JOIN": (
        "Keeps all left rows; NULL on right when no match.",
        ["Find orphans: LEFT JOIN + WHERE right.id IS NULL", "WHERE on right can act like INNER"],
    ),
    "RIGHT JOIN": (
        "Keeps all right rows — rarely used; swap tables and use LEFT JOIN instead.",
        ["Same NULL fill behavior as LEFT on non-matching side", "Interview: mention LEFT is preferred"],
    ),
    "JOIN three tables": (
        "Chain multiple JOINs to connect related tables in one query.",
        ["Always specify ON conditions", "Wrong join order can explode row count"],
    ),
    "Self JOIN": (
        "Join table to itself — e.g. employee + manager in same table.",
        ["Use aliases (e, m)", "Common for hierarchies"],
    ),
    "CROSS JOIN": (
        "Cartesian product — every A row paired with every B row.",
        ["No ON clause", "Accidental cross join = huge result set"],
    ),
    "UNION — combine": (
        "Stack two result sets; UNION removes duplicates.",
        ["Same column count and types required", "UNION ALL is faster when dupes OK"],
    ),
    "UNION ALL": (
        "Combine result sets keeping duplicates.",
        ["Faster than UNION", "Columns must align in count/type"],
    ),
    "Scalar subquery": (
        "Subquery in SELECT returning one value per row.",
        ["Must return one row, one column", "Can be slow if run per row — profile it"],
    ),
    "Subquery with IN": (
        "Filter where value exists in subquery result.",
        ["Often clearer than complex JOIN", "Watch NULL behavior in IN lists"],
    ),
    "EXISTS — customers": (
        "True if subquery returns any row — good for existence checks.",
        ["Stops at first match", "SELECT 1 inside EXISTS is idiomatic"],
    ),
    "NOT EXISTS": (
        "True when subquery returns no rows.",
        ["Classic: customers with no orders", "Often clearer than LEFT JOIN + IS NULL"],
    ),
    "INSERT — single row": (
        "Add one new row with specified column values.",
        ["List columns explicitly", "Auto-increment id usually omitted"],
    ),
    "INSERT — multiple rows": (
        "Bulk insert — one statement, many value tuples.",
        ["Faster than many single INSERTs", "Watch transaction/batch size"],
    ),
    "UPDATE — change": (
        "Modify existing rows matching WHERE.",
        ["Always use WHERE in production", "Test with SELECT first"],
    ),
    "UPDATE with JOIN": (
        "Update rows using related table data (MySQL syntax).",
        ["Powerful — easy to mis-update rows", "Use transaction; check rows affected"],
    ),
    "DELETE — remove": (
        "Permanently remove rows matching condition.",
        ["Soft delete often preferred in apps", "FK constraints may block delete"],
    ),
    "CREATE TABLE": (
        "Define new table: columns, types, keys.",
        ["DECIMAL for money, VARCHAR for text", "Add PRIMARY KEY and needed indexes"],
    ),
    "ALTER TABLE": (
        "Change existing table structure.",
        ["Can lock large tables — plan maintenance", "Version with Flyway/Liquibase"],
    ),
    "DROP TABLE": (
        "Remove table and all its data permanently.",
        ["DROP TABLE IF EXISTS", "Backup before drop in prod"],
    ),
    "CREATE INDEX": (
        "Speed up reads on filtered/joined/sorted columns.",
        ["Slower writes as trade-off", "Index WHERE/JOIN/ORDER BY columns"],
    ),
    "Composite index": (
        "Multi-column index — leftmost prefix rule applies.",
        ["(customer_id, created_at) for customer + date queries", "Column order matters"],
    ),
    "FOREIGN KEY": (
        "Enforces valid references between tables.",
        ["ON DELETE CASCADE / SET NULL", "Prevents orphan child rows"],
    ),
    "CASE WHEN": (
        "Conditional expressions in SQL — if/else labels in result.",
        ["No data change required", "Can nest CASE"],
    ),
    "COALESCE / IFNULL": (
        "Return first non-NULL value — default for missing data.",
        ["COALESCE(phone, 'N/A')", "IFNULL is MySQL alias"],
    ),
    "Date functions": (
        "Filter/format dates with YEAR(), DATE_FORMAT(), etc.",
        ["Avoid function on indexed column in WHERE", "Store UTC, display local in app"],
    ),
    "CONCAT — full name": (
        "Join strings — build display names from parts.",
        ["NULL poisons CONCAT — use COALESCE", "CONCAT_WS skips NULLs in MySQL"],
    ),
    "UPPER, LOWER, TRIM": (
        "Normalize strings before compare or display.",
        ["TRIM removes leading/trailing spaces", "UPPER/LOWER for case-insensitive compare"],
    ),
    "ROW_NUMBER": (
        "Window function: rank 1,2,3… within partition without collapsing rows.",
        ["PARTITION BY dept ORDER BY salary", "Keeps all rows unlike GROUP BY"],
    ),
    "RANK and DENSE_RANK": (
        "Ranking with ties — RANK skips after tie, DENSE_RANK does not.",
        ["OVER (ORDER BY salary DESC)", "Top-N per group pattern"],
    ),
    "CTE (WITH clause)": (
        "Named subquery for readable multi-step SQL.",
        ["WITH x AS (...) SELECT FROM x", "Can be recursive for hierarchies"],
    ),
    "Transaction — BEGIN": (
        "Group statements — all succeed (COMMIT) or all undo (ROLLBACK).",
        ["ACID for money transfers", "START TRANSACTION ... COMMIT/ROLLBACK"],
    ),
}


def strip_html(html):
    text = re.sub(r"<pre[^>]*>.*?</pre>", " ", html, flags=re.DOTALL | re.I)
    text = re.sub(r"<code[^>]*>.*?</code>", " ", text, flags=re.DOTALL | re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def content_plain(html):
    """Plain text from answer body, excluding meta blocks."""
    h = re.sub(r'<div class="revision-block">.*?</div>', " ", html, flags=re.DOTALL)
    h = re.sub(r'<p class="simple-terms">.*?</p>', " ", h, flags=re.DOTALL)
    h = re.sub(r"<h4[^>]*>.*?</h4>", " ", h, flags=re.I | re.DOTALL)
    h = re.sub(r"<ul[^>]*>.*?</ul>", " ", h, flags=re.I | re.DOTALL)
    h = re.sub(r"<ol[^>]*>.*?</ol>", " ", h, flags=re.I | re.DOTALL)
    return strip_html(h)


def first_paragraph(html):
    m = re.search(
        r'<p(?![^>]*class="simple-terms")[^>]*>(.*?)</p>',
        html,
        re.I | re.DOTALL,
    )
    if m:
        return strip_html(m.group(1))
    return content_plain(html)


def unique_keep(items):
    seen = set()
    out = []
    for x in items:
        k = x.lower().strip()
        if k and k not in seen and len(k) < 52:
            seen.add(k)
            out.append(x.strip())
    return out


def extract_keywords(question, html):
    kws = []
    for m in re.finditer(r"<code[^>]*>([^<]+)</code>", html, re.I):
        t = re.sub(r"\s+", " ", m.group(1)).strip()
        if 0 < len(t) <= 42:
            kws.append(t.lstrip("@"))
    for m in re.finditer(r'<strong[^>]*class="kw"[^>]*>([^<]+)</strong>', html, re.I):
        kws.append(m.group(1).strip())
    for m in re.finditer(r"<strong[^>]*>([^<]+)</strong>", html, re.I):
        kws.append(m.group(1).strip())
    for m in TECH_HINTS.finditer(question + " " + re.sub(r"<[^>]+>", " ", html)):
        kws.append(m.group(0))
    return unique_keep(kws)[:10]


def revision_block(keywords):
    if not keywords:
        return ""
    items = "".join(f'<li><span class="kw">{escape(k)}</span></li>' for k in keywords[:8])
    return (
        '<div class="revision-block">'
        '<h4 class="revision-heading">📌 Revision keywords</h4>'
        f'<ul class="revision-kw">{items}</ul></div>'
    )


def highlight_inline(html):
    if not html:
        return html
    html = re.sub(r'<strong(?!\s+class="kw")>', '<strong class="kw">', html)
    html = re.sub(r"<strong>", '<strong class="kw">', html)
    html = re.sub(r'<code(?!\s+class="kw-code")>', '<code class="kw-code">', html)
    return html


def first_sentence(text, max_len=200):
    if not text or "Revision keywords" in text:
        return ""
    parts = re.split(r"(?<=[.!?])\s+", text)
    s = parts[0].strip()
    if len(s) < 15:
        return ""
    if len(s) > max_len:
        s = s[: max_len - 3].rsplit(" ", 1)[0] + "..."
    return s


def make_simple_terms(question, body_html):
    q = question.strip().rstrip("?")
    ql = q.lower()
    first = first_sentence(first_paragraph(body_html))

    if ql.startswith("what is "):
        topic = q[8:].split("(")[0].split("—")[0].strip().rstrip("?")
        intro = f'<strong class="kw">{escape(topic)}</strong> is a core concept to understand for interviews.'
    elif ql.startswith("what are "):
        topic = q[9:]
        intro = f'<strong class="kw">{escape(topic)}</strong> are important building blocks in this topic.'
    elif ql.startswith("how "):
        intro = f'This explains <strong class="kw">how</strong> to handle: {escape(q)}.'
    elif ql.startswith("why "):
        intro = f'This explains <strong class="kw">why</strong> {escape(q[4:])}.'
    elif ql.startswith("explain "):
        intro = f'Here is a clear explanation of <strong class="kw">{escape(q[8:])}</strong>.'
    elif " vs " in ql:
        intro = 'Compare both sides and know <strong class="kw">when to use each</strong> in interviews.'
        first = ""  # avoid dumping list text for comparison questions
    elif ql.startswith("star:"):
        intro = 'Use the <strong class="kw">STAR</strong> method: Situation → Task → Action → Result.'
    else:
        intro = f'Key interview topic: <strong class="kw">{escape(q)}</strong>.'

    if first and len(first) < 180:
        return f'<p class="simple-terms"><strong>In simple terms:</strong> {intro} {escape(first)}</p>'
    return f'<p class="simple-terms"><strong>In simple terms:</strong> {intro}</p>'


def brief_block(simple_text, points=None):
    html = f'<p class="simple-terms"><strong>In simple terms:</strong> {escape(simple_text)}</p>'
    if points:
        lis = "".join(f"<li>{escape(p)}</li>" for p in points)
        html += f'<ul class="brief-bullets key-points">{lis}</ul>'
    return html


def lookup_brief(data_id, question):
    if data_id in DSA_BRIEFS:
        return DSA_BRIEFS[data_id]
    for key, val in SQL_QUERY_HINTS.items():
        if key.lower() in question.lower():
            return val
    if data_id.startswith("bq-"):
        return (
            f"SQL practice: {question.rstrip('.')}.",
            ["Run against sample tables (employees, orders, etc.)", "Understand what each clause does before memorizing"],
        )
    return None


def sql_query_expansion(question):
    for key, val in SQL_QUERY_HINTS.items():
        if key.lower() in question.lower():
            return val
    return (
        f"SQL practice: {question.rstrip('.')}.",
        ["Run in MySQL/PostgreSQL with sample data", "Match table/column names to your schema"],
    )


def is_code_only(body):
    has_pre = bool(re.search(r"<pre", body, re.I))
    plain = content_plain(body)
    return has_pre and len(plain) < 90


def insert_after_brief_heading(body, insert_html):
    if "Brief explanation" in body:
        return re.sub(
            r'(<h4 class="revision-heading">Brief explanation</h4>)',
            r"\1" + insert_html,
            body,
            count=1,
            flags=re.I,
        )
    return '<h4 class="revision-heading">Brief explanation</h4>' + insert_html + body


def process_answer_body(body, question, data_id=""):
    footer = ""
    if '<div class="qa-footer">' in body:
        parts = body.split('<motion class="qa-footer">', 1)
        if len(parts) == 1:
            parts = body.split('<div class="qa-footer">', 1)
        body, footer = parts[0], '<div class="qa-footer">' + parts[1]

    body = highlight_inline(body)
    plain = content_plain(body)
    code_only = is_code_only(body)
    bq = data_id.startswith("bq-")

    if "revision-block" not in body:
        body = revision_block(extract_keywords(question, body)) + body

    # Clean re-run artifacts
    body = re.sub(r'<p class="simple-terms">.*?</p>\s*', "", body, flags=re.DOTALL)
    body = re.sub(r'<ul class="brief-bullets key-points">.*?</ul>\s*', "", body, flags=re.DOTALL)

    brief = lookup_brief(data_id, question)
    if brief:
        insert = brief_block(brief[0], brief[1] if len(brief) > 1 else None)
    elif code_only or bq:
        simple, points = sql_query_expansion(question)
        insert = brief_block(simple, points)
    else:
        insert = make_simple_terms(question, body)

    body = insert_after_brief_heading(body, insert)

    body = re.sub(
        r"<h4>\s*Quick answer[^<]*</h4>",
        '<h4 class="revision-heading">Brief explanation</h4>',
        body,
        flags=re.I,
    )

    return body + footer


def process_card(card_html):
    qm = re.search(r"<h3>([^<]+)</h3>", card_html)
    question = qm.group(1) if qm else ""
    idm = re.search(r'data-id="([^"]+)"', card_html)
    data_id = idm.group(1) if idm else ""
    am = re.search(
        r'<div class="qa-answer">(.*?)(<div class="qa-footer">)',
        card_html,
        re.DOTALL,
    )
    if not am:
        return card_html
    new_body = process_answer_body(am.group(1), question, data_id)
    return card_html[: am.start(1)] + new_body + card_html[am.start(2) :]


def process_file(path):
    text = path.read_text(encoding="utf-8")
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


TOPICS = [
    "dsa/dsa.html",
    "java/java.html",
    "springboot/springboot.html",
    "microservices/microservices.html",
    "sql/sql.html",
    "testing/testing.html",
    "devops/devops.html",
    "production/production.html",
    "kafka/kafka.html",
    "system design/system-design.html",
    "projects/projects.html",
    "behavioral/behavioral.html",
]


def main():
    total = 0
    for rel in TOPICS:
        path = ROOT / rel
        if path.exists():
            c = process_file(path)
            print(f"{rel}: {c} cards updated")
            total += c
    print(f"Done — {total} cards updated")


if __name__ == "__main__":
    main()
