"""
Generates SecureLearn API Reference as a properly formatted .docx file.
Run: python generate_api_doc.py
Output: docs/SecureLearn_API_Reference.docx
"""

import os
from docx import Document
from docx.shared import Pt, RGBColor, Inches, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_ALIGN_VERTICAL
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "docs")
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "SecureLearn_API_Reference.docx")

os.makedirs(OUTPUT_DIR, exist_ok=True)

# ─── Colour palette ──────────────────────────────────────────────────────────
C_DARK     = RGBColor(0x1A, 0x1A, 0x2E)   # near-black navy
C_PRIMARY  = RGBColor(0x16, 0x21, 0x3E)   # deep blue (heading bg)
C_ACCENT   = RGBColor(0x0F, 0x3D, 0x6B)   # accent blue
C_GREEN    = RGBColor(0x27, 0xAE, 0x60)   # GET
C_BLUE     = RGBColor(0x27, 0x6F, 0xBE)   # POST
C_ORANGE   = RGBColor(0xE6, 0x7E, 0x22)   # PUT
C_RED      = RGBColor(0xC0, 0x39, 0x2B)   # DELETE
C_PURPLE   = RGBColor(0x8E, 0x44, 0xAD)   # WS
C_TH_BG    = RGBColor(0x2C, 0x3E, 0x50)   # table header bg
C_TH_FG    = RGBColor(0xFF, 0xFF, 0xFF)   # table header text
C_ALT_ROW  = RGBColor(0xF2, 0xF6, 0xFC)   # alternating row
C_WHITE    = RGBColor(0xFF, 0xFF, 0xFF)
C_CODE_BG  = RGBColor(0xF4, 0xF4, 0xF4)
C_NOTE_BG  = RGBColor(0xFF, 0xF9, 0xE6)

METHOD_COLOURS = {
    "GET":    C_GREEN,
    "POST":   C_BLUE,
    "PUT":    C_ORANGE,
    "DELETE": C_RED,
    "WS":     C_PURPLE,
}

# ─── Helpers ─────────────────────────────────────────────────────────────────

def set_cell_bg(cell, rgb: RGBColor):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    hex_color = f"{rgb[0]:02X}{rgb[1]:02X}{rgb[2]:02X}"
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_color)
    tcPr.append(shd)


def set_cell_border(cell, top=None, bottom=None, left=None, right=None):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcBorders = OxmlElement("w:tcBorders")
    for side, val in [("top", top), ("bottom", bottom), ("left", left), ("right", right)]:
        if val:
            el = OxmlElement(f"w:{side}")
            el.set(qn("w:val"), val.get("val", "single"))
            el.set(qn("w:sz"), str(val.get("sz", 4)))
            el.set(qn("w:color"), val.get("color", "auto"))
            tcBorders.append(el)
    tcPr.append(tcBorders)


def add_run_with_color(para, text, bold=False, italic=False, size=11,
                       color=None, font_name="Calibri"):
    run = para.add_run(text)
    run.bold = bold
    run.italic = italic
    run.font.size = Pt(size)
    run.font.name = font_name
    if color:
        run.font.color.rgb = color
    return run


def add_heading(doc, text, level=1):
    para = doc.add_paragraph()
    para.paragraph_format.space_before = Pt(14 if level == 1 else 8)
    para.paragraph_format.space_after = Pt(4)
    if level == 1:
        run = para.add_run(text)
        run.bold = True
        run.font.size = Pt(18)
        run.font.color.rgb = C_PRIMARY
        run.font.name = "Calibri"
        # bottom border via paragraph border
        pPr = para._p.get_or_add_pPr()
        pBdr = OxmlElement("w:pBdr")
        bottom = OxmlElement("w:bottom")
        bottom.set(qn("w:val"), "single")
        bottom.set(qn("w:sz"), "6")
        bottom.set(qn("w:color"), "162136")
        pBdr.append(bottom)
        pPr.append(pBdr)
    elif level == 2:
        run = para.add_run(text)
        run.bold = True
        run.font.size = Pt(14)
        run.font.color.rgb = C_ACCENT
        run.font.name = "Calibri"
    else:
        run = para.add_run(text)
        run.bold = True
        run.font.size = Pt(12)
        run.font.color.rgb = C_DARK
        run.font.name = "Calibri"
    return para


def add_key_value(doc, key, value, value_color=None):
    para = doc.add_paragraph()
    para.paragraph_format.space_before = Pt(2)
    para.paragraph_format.space_after = Pt(2)
    add_run_with_color(para, f"{key}: ", bold=True, size=11, color=C_DARK)
    add_run_with_color(para, value, size=11,
                       color=value_color or C_DARK, font_name="Courier New" if "/" in value or ":" in value else "Calibri")


def add_code_block(doc, code: str):
    para = doc.add_paragraph()
    para.paragraph_format.left_indent = Inches(0.3)
    para.paragraph_format.space_before = Pt(4)
    para.paragraph_format.space_after = Pt(4)
    run = para.add_run(code)
    run.font.name = "Courier New"
    run.font.size = Pt(9)
    run.font.color.rgb = RGBColor(0x2D, 0x2D, 0x2D)
    # shade paragraph
    pPr = para._p.get_or_add_pPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), "F4F4F4")
    pPr.append(shd)
    return para


def add_note(doc, text: str):
    para = doc.add_paragraph()
    para.paragraph_format.left_indent = Inches(0.2)
    para.paragraph_format.space_before = Pt(4)
    para.paragraph_format.space_after = Pt(6)
    run = para.add_run(f"ℹ  {text}")
    run.font.size = Pt(10)
    run.italic = True
    run.font.color.rgb = RGBColor(0x5D, 0x6D, 0x7E)


def add_method_badge(para, method: str):
    color = METHOD_COLOURS.get(method, C_DARK)
    run = para.add_run(f" {method} ")
    run.bold = True
    run.font.size = Pt(10)
    run.font.color.rgb = C_WHITE
    run.font.name = "Calibri"
    # Inline shading via rPr highlight is limited; use font color on a colored background via XML
    rPr = run._r.get_or_add_rPr()
    shd = OxmlElement("w:shd")
    hex_color = f"{color[0]:02X}{color[1]:02X}{color[2]:02X}"
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_color)
    rPr.append(shd)
    return run


def add_endpoint_heading(doc, method: str, path: str):
    para = doc.add_paragraph()
    para.paragraph_format.space_before = Pt(10)
    para.paragraph_format.space_after = Pt(3)
    add_method_badge(para, method)
    run2 = para.add_run(f"  {path}")
    run2.bold = True
    run2.font.size = Pt(11)
    run2.font.name = "Courier New"
    run2.font.color.rgb = C_DARK
    return para


def make_table(doc, headers, rows, col_widths=None):
    table = doc.add_table(rows=1, cols=len(headers))
    table.style = "Table Grid"

    # Header row
    hdr_cells = table.rows[0].cells
    for i, h in enumerate(headers):
        cell = hdr_cells[i]
        set_cell_bg(cell, C_TH_BG)
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        para = cell.paragraphs[0]
        para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = para.add_run(h)
        run.bold = True
        run.font.color.rgb = C_TH_FG
        run.font.size = Pt(10)
        run.font.name = "Calibri"

    # Data rows
    for r_idx, row in enumerate(rows):
        cells = table.add_row().cells
        bg = C_ALT_ROW if r_idx % 2 == 1 else C_WHITE
        for c_idx, val in enumerate(row):
            cell = cells[c_idx]
            set_cell_bg(cell, bg)
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            para = cell.paragraphs[0]
            if c_idx == 0 and val in METHOD_COLOURS:
                # Method badge in table
                add_method_badge(para, val)
            else:
                run = para.add_run(str(val))
                run.font.size = Pt(9.5)
                run.font.name = "Courier New" if c_idx in (1,) else "Calibri"
                run.font.color.rgb = C_DARK

    # Column widths
    if col_widths:
        for i, width in enumerate(col_widths):
            for row in table.rows:
                row.cells[i].width = Inches(width)

    doc.add_paragraph()
    return table


# ─── Main document ────────────────────────────────────────────────────────────

doc = Document()

# Page margins
for section in doc.sections:
    section.top_margin    = Cm(2.0)
    section.bottom_margin = Cm(2.0)
    section.left_margin   = Cm(2.5)
    section.right_margin  = Cm(2.5)

# Default style
style = doc.styles["Normal"]
style.font.name = "Calibri"
style.font.size = Pt(11)

# ══════════════════════════════════════════════════════════
# TITLE PAGE
# ══════════════════════════════════════════════════════════
title_para = doc.add_paragraph()
title_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
title_para.paragraph_format.space_before = Pt(60)
r = title_para.add_run("SecureLearn")
r.bold = True
r.font.size = Pt(32)
r.font.color.rgb = C_PRIMARY
r.font.name = "Calibri"

sub_para = doc.add_paragraph()
sub_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
r2 = sub_para.add_run("Backend API Reference")
r2.font.size = Pt(18)
r2.font.color.rgb = C_ACCENT
r2.font.name = "Calibri"

doc.add_paragraph()
meta = doc.add_paragraph()
meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
add_run_with_color(meta, "Version 1  ·  Base URL: http://localhost:8080  ·  2026-10-08",
                   size=11, color=RGBColor(0x7F, 0x8C, 0x8D))

doc.add_paragraph()
doc.add_paragraph()
note_para = doc.add_paragraph()
note_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
add_run_with_color(note_para, "For internal use — Frontend integration reference", italic=True,
                   size=10, color=RGBColor(0x95, 0xA5, 0xA6))

doc.add_page_break()

# ══════════════════════════════════════════════════════════
# SECTION 1 — CONNECTION & SETUP
# ══════════════════════════════════════════════════════════
add_heading(doc, "1. Connection & Setup")

add_key_value(doc, "Base URL",      "http://localhost:8080")
add_key_value(doc, "API Prefix",    "/api/v1")
add_key_value(doc, "Full example",  "http://localhost:8080/api/v1/allcourses")
add_key_value(doc, "Content-Type",  "application/json")
add_key_value(doc, "Credentials",   "withCredentials: true  /  credentials: 'include'")

doc.add_paragraph()
add_heading(doc, "CORS — Allowed Origins", level=2)
for origin in ["http://localhost:3000 (React default)",
               "http://localhost:5173 (Vite default)",
               "http://localhost:5174 (Vite alt)"]:
    p = doc.add_paragraph(style="List Bullet")
    p.add_run(origin).font.size = Pt(11)

doc.add_paragraph()
add_heading(doc, "Authentication", level=2)
add_note(doc, "All /api/** routes are currently OPEN — no token required. "
              "Login/logout go through browser-redirect to AWS Cognito, not JSON calls.")

make_table(doc,
    ["Method", "Path", "Description"],
    [
        ["GET",  "/oauth2/authorization/cognito", "Redirect browser to Cognito Hosted UI login"],
        ["GET",  "/login/oauth2/code/cognito",    "Cognito callback — handled internally, redirects on success"],
        ["POST", "/logout",                       "Invalidate session → Cognito logout → back to localhost:3000"],
    ],
    col_widths=[0.8, 3.2, 3.5]
)

doc.add_page_break()

# ══════════════════════════════════════════════════════════
# SECTION 2 — IMPLEMENTED ENDPOINTS
# ══════════════════════════════════════════════════════════
add_heading(doc, "2. Implemented API Endpoints")
add_note(doc, "All paths below are prefixed with /api/v1")

# ── 2.1 Courses ──────────────────────────────────────────
add_heading(doc, "2.1  Course Management", level=2)

# GET allcourses
add_endpoint_heading(doc, "GET", "/api/v1/allcourses")
doc.add_paragraph("Returns all courses.").runs[0].font.size = Pt(11)
add_key_value(doc, "Request", "None")
add_key_value(doc, "Response", "200 OK — array of Course objects")
add_code_block(doc,
'[\n'
'  {\n'
'    "id":             "uuid",\n'
'    "title":          "string",\n'
'    "description":    "string",\n'
'    "instructor":     "string",\n'
'    "price":          99.99,\n'
'    "creationTime":   "2026-10-08T10:00:00",\n'
'    "lastUpdateTime": "2026-10-08T10:00:00"\n'
'  }\n'
']')

# GET search
add_endpoint_heading(doc, "GET", "/api/v1/course/search?title={keyword}")
doc.add_paragraph("Search courses by title (partial match, case-insensitive).").runs[0].font.size = Pt(11)
add_key_value(doc, "Query Param", "title (string, required)")
add_key_value(doc, "Response", "200 OK — array of matching Course objects")

# POST course
add_endpoint_heading(doc, "POST", "/api/v1/course")
doc.add_paragraph("Create a new course.").runs[0].font.size = Pt(11)
add_key_value(doc, "Request Body", "")
add_code_block(doc,
'{\n'
'  "title":       "string",\n'
'  "description": "string",\n'
'  "instructor":  "string",\n'
'  "prices":      99.99\n'
'}')
add_key_value(doc, "Response", '200 OK — { "success": "Course added successfully" }')

# PUT course
add_endpoint_heading(doc, "PUT", "/api/v1/course/{id}")
doc.add_paragraph("Update an existing course.").runs[0].font.size = Pt(11)
add_key_value(doc, "Path Param", "id (UUID)")
add_key_value(doc, "Request Body", "Same shape as POST /course")
add_key_value(doc, "Response", '200 OK — { "success": "Course updated successfully" }')

# DELETE course
add_endpoint_heading(doc, "DELETE", "/api/v1/course/{id}")
doc.add_paragraph("Delete a course — cascades to all chapters and lessons.").runs[0].font.size = Pt(11)
add_key_value(doc, "Path Param", "id (UUID)")
add_key_value(doc, "Response", '200 OK — { "success": "Course deleted successfully" }')

doc.add_paragraph()

# ── 2.2 Chapters ─────────────────────────────────────────
add_heading(doc, "2.2  Chapter Management", level=2)

# GET chapters
add_endpoint_heading(doc, "GET", "/api/v1/course/{courseId}/chapters")
doc.add_paragraph("Get all chapters belonging to a course.").runs[0].font.size = Pt(11)
add_key_value(doc, "Path Param", "courseId (UUID)")
add_key_value(doc, "Response", "200 OK — array of Chapter objects")
add_code_block(doc,
'[\n'
'  {\n'
'    "id":          "uuid",\n'
'    "title":       "string",\n'
'    "description": "string"\n'
'  }\n'
']')

# POST chapter
add_endpoint_heading(doc, "POST", "/api/v1/chapter")
doc.add_paragraph("Create a new chapter inside a course.").runs[0].font.size = Pt(11)
add_key_value(doc, "Request Body", "")
add_code_block(doc,
'{\n'
'  "course_id":   "uuid",\n'
'  "title":       "string",\n'
'  "description": "string"\n'
'}')
add_key_value(doc, "Response", '200 OK — { "success": "Chapter added successfully" }')

# PUT chapter
add_endpoint_heading(doc, "PUT", "/api/v1/chapter/{id}")
doc.add_paragraph("Update a chapter.").runs[0].font.size = Pt(11)
add_key_value(doc, "Path Param", "id (UUID)")
add_key_value(doc, "Request Body", "Same shape as POST /chapter")
add_key_value(doc, "Response", '200 OK — { "success": "Chapter updated successfully" }')

# DELETE chapter
add_endpoint_heading(doc, "DELETE", "/api/v1/chapter/{id}")
doc.add_paragraph("Delete a chapter — cascades to all its lessons.").runs[0].font.size = Pt(11)
add_key_value(doc, "Path Param", "id (UUID)")
add_key_value(doc, "Response", '200 OK — { "success": "Chapter deleted successfully" }')

doc.add_paragraph()

# ── 2.3 Lessons ──────────────────────────────────────────
add_heading(doc, "2.3  Lesson Management", level=2)

# GET lessons in chapter
add_endpoint_heading(doc, "GET", "/api/v1/chapter/{chapterId}/lessons")
doc.add_paragraph("Get all lessons inside a chapter.").runs[0].font.size = Pt(11)
add_key_value(doc, "Path Param", "chapterId (UUID)")
add_key_value(doc, "Response", "200 OK — array of Lesson objects")
add_code_block(doc,
'[\n'
'  {\n'
'    "id":          "uuid",\n'
'    "title":       "string",\n'
'    "description": "string",\n'
'    "url":         "string | null  (video URL)"\n'
'  }\n'
']')

# GET single lesson
add_endpoint_heading(doc, "GET", "/api/v1/lesson/{id}")
doc.add_paragraph("Get a single lesson by ID.").runs[0].font.size = Pt(11)
add_key_value(doc, "Path Param", "id (UUID)")
add_key_value(doc, "Response", "200 OK — single Lesson object (same shape as above)")

# POST lesson
add_endpoint_heading(doc, "POST", "/api/v1/lesson")
doc.add_paragraph("Create a new lesson inside a chapter.").runs[0].font.size = Pt(11)
add_key_value(doc, "Request Body", "")
add_code_block(doc,
'{\n'
'  "course_id":   "uuid",\n'
'  "chapter_id":  "uuid",\n'
'  "title":       "string",\n'
'  "description": "string",\n'
'  "url":         "string (optional — video URL)"\n'
'}')
add_key_value(doc, "Response", '200 OK — { "success": "Lesson added successfully" }')

# PUT lesson
add_endpoint_heading(doc, "PUT", "/api/v1/lesson/{id}")
doc.add_paragraph("Update a lesson.").runs[0].font.size = Pt(11)
add_key_value(doc, "Path Param", "id (UUID)")
add_key_value(doc, "Request Body", "Same shape as POST /lesson")
add_key_value(doc, "Response", '200 OK — { "success": "Lesson updated successfully" }')

# DELETE lesson
add_endpoint_heading(doc, "DELETE", "/api/v1/lesson/{id}")
doc.add_paragraph("Delete a single lesson.").runs[0].font.size = Pt(11)
add_key_value(doc, "Path Param", "id (UUID)")
add_key_value(doc, "Response", '200 OK — { "success": "Lesson deleted successfully" }')

doc.add_page_break()

# ── Quick-ref table ───────────────────────────────────────
add_heading(doc, "2.4  Quick Reference — Implemented", level=2)
make_table(doc,
    ["Method", "Path", "Description"],
    [
        ["GET",    "/api/v1/allcourses",                   "List all courses"],
        ["GET",    "/api/v1/course/search?title=",         "Search courses by title"],
        ["POST",   "/api/v1/course",                       "Create course"],
        ["PUT",    "/api/v1/course/{id}",                  "Update course"],
        ["DELETE", "/api/v1/course/{id}",                  "Delete course (cascades)"],
        ["GET",    "/api/v1/course/{courseId}/chapters",   "List chapters in course"],
        ["POST",   "/api/v1/chapter",                      "Create chapter"],
        ["PUT",    "/api/v1/chapter/{id}",                 "Update chapter"],
        ["DELETE", "/api/v1/chapter/{id}",                 "Delete chapter (cascades)"],
        ["GET",    "/api/v1/chapter/{chapterId}/lessons",  "List lessons in chapter"],
        ["GET",    "/api/v1/lesson/{id}",                  "Get single lesson"],
        ["POST",   "/api/v1/lesson",                       "Create lesson"],
        ["PUT",    "/api/v1/lesson/{id}",                  "Update lesson"],
        ["DELETE", "/api/v1/lesson/{id}",                  "Delete lesson"],
    ],
    col_widths=[0.8, 3.4, 3.3]
)

doc.add_page_break()

# ══════════════════════════════════════════════════════════
# SECTION 3 — FUTURE ENDPOINTS
# ══════════════════════════════════════════════════════════
add_heading(doc, "3. Future Feature API Endpoints")
add_note(doc, "These endpoints are NOT yet implemented. Paths and shapes are planned/proposed. "
              "Confirm with the backend team before integrating.")

# ── 3.1 Access Log ───────────────────────────────────────
add_heading(doc, "3.1  API Access Log", level=2)
make_table(doc,
    ["Method", "Path", "Description", "Auth"],
    [
        ["GET", "/api/v1/logs/access",         "Paginated list of all API access logs\nQuery: page, size, userId, from, to", "Admin"],
        ["GET", "/api/v1/logs/access/{userId}", "Access logs for a specific user",                                            "Admin"],
    ],
    col_widths=[0.8, 2.8, 3.0, 0.9]
)

# ── 3.2 Auth Audit Log ───────────────────────────────────
add_heading(doc, "3.2  API Auth Audit Log", level=2)
make_table(doc,
    ["Method", "Path", "Description", "Auth"],
    [
        ["GET", "/api/v1/logs/auth",         "Paginated auth events (login, logout, token refresh, failures)\nQuery: page, size, userId, eventType, from, to", "Admin"],
        ["GET", "/api/v1/logs/auth/{userId}", "Auth audit log for a specific user",                                                                              "Admin"],
    ],
    col_widths=[0.8, 2.8, 3.0, 0.9]
)

# ── 3.3 Rate Limiting ────────────────────────────────────
add_heading(doc, "3.3  API Rate Limiting & Request Log", level=2)
make_table(doc,
    ["Method", "Path", "Description", "Auth"],
    [
        ["GET",  "/api/v1/logs/rate",              "Current rate-limit state per user/IP\nQuery: userId or ip",            "Admin"],
        ["POST", "/api/v1/admin/rate-limit/reset", "Manually reset rate limit\nBody: { identifier }",                     "Admin"],
    ],
    col_widths=[0.8, 2.8, 3.0, 0.9]
)

# ── 3.4 JWT / Auth ───────────────────────────────────────
add_heading(doc, "3.4  JWT / Auth Token API", level=2)
make_table(doc,
    ["Method", "Path", "Description", "Auth"],
    [
        ["POST", "/api/v1/auth/token",   "Exchange Cognito auth code for backend JWT\nBody: { code, redirectUri }\nReturns: { accessToken, refreshToken, expiresIn }", "None"],
        ["POST", "/api/v1/auth/refresh", "Refresh access token\nBody: { refreshToken }\nReturns: { accessToken, expiresIn }",                                          "None"],
        ["POST", "/api/v1/auth/revoke",  "Revoke a token\nBody: { token }",                                                                                            "JWT"],
        ["GET",  "/api/v1/auth/me",      "Get current authenticated user info\nReturns: { userId, email, roles, sub }",                                               "JWT"],
    ],
    col_widths=[0.8, 2.4, 3.4, 0.9]
)

# ── 3.5 Entitlement Guard ────────────────────────────────
add_heading(doc, "3.5  API Entitlement Guard", level=2)
make_table(doc,
    ["Method", "Path", "Description", "Auth"],
    [
        ["GET", "/api/v1/entitlement/check",      "Check if user is entitled to a course\nQuery: userId, courseId\nReturns: { entitled, reason }",                   "JWT"],
        ["GET", "/api/v1/entitlement/{userId}",   "List all courses user is entitled to\nReturns: [{ courseId, title, grantedAt, expiresAt }]",                      "JWT"],
    ],
    col_widths=[0.8, 2.8, 3.0, 0.9]
)

doc.add_page_break()

# ── 3.6 Cloudflare Signed Token & AES-128 ────────────────
add_heading(doc, "3.6  Cloudflare Signed Token & AES-128 Key", level=2)
make_table(doc,
    ["Method", "Path", "Description", "Auth"],
    [
        ["POST", "/api/v1/media/token", "Issue short-lived Cloudflare signed token for video playback\nBody: { lessonId, userId }\nReturns: { signedToken, expiresAt }", "JWT"],
        ["POST", "/api/v1/media/key",   "Issue AES-128 key for HLS stream decryption\nBody: { lessonId, userId }\nReturns: { keyId, keyUrl, iv }",                     "JWT"],
    ],
    col_widths=[0.8, 2.4, 3.4, 0.9]
)

# ── 3.7 Presigned URL Upload ─────────────────────────────
add_heading(doc, "3.7  Presigned URL Upload", level=2)
make_table(doc,
    ["Method", "Path", "Description", "Auth"],
    [
        ["POST", "/api/v1/upload/presigned", "Generate S3/R2 presigned upload URL\nBody: { fileName, contentType, courseId, chapterId }\nReturns: { uploadUrl, objectKey, expiresIn }", "JWT (Instructor)"],
        ["POST", "/api/v1/upload/confirm",   "Confirm upload complete, trigger processing pipeline\nBody: { objectKey, lessonId }\nReturns: { success, status: 'processing' }",         "JWT (Instructor)"],
    ],
    col_widths=[0.8, 2.4, 3.0, 1.3]
)

# ── 3.8 SSE / WebSocket ──────────────────────────────────
add_heading(doc, "3.8  WebSocket / Server-Sent Events (SSE)", level=2)
add_note(doc, "These are not standard fetch calls — SSE requires EventSource; WebSocket requires the ws:// protocol.")
make_table(doc,
    ["Type", "Path", "Description", "Auth"],
    [
        ["GET", "/api/v1/sse/events",     "SSE stream — real-time notifications (upload progress, processing status)\nHeader: Authorization: Bearer <token>", "JWT"],
        ["WS",  "ws://…/api/v1/ws",       "WebSocket endpoint for real-time bidirectional features\nPass token as query param or header on upgrade",           "JWT"],
    ],
    col_widths=[0.8, 2.4, 3.4, 0.9]
)

# ── 3.9 Kill-Switch ──────────────────────────────────────
add_heading(doc, "3.9  API Kill-Switch", level=2)
make_table(doc,
    ["Method", "Path", "Description", "Auth"],
    [
        ["GET",  "/api/v1/admin/killswitch",                  "Get kill-switch state for all features",      "Admin"],
        ["POST", "/api/v1/admin/killswitch/{feature}/disable", "Immediately disable a feature globally",     "Admin"],
        ["POST", "/api/v1/admin/killswitch/{feature}/enable",  "Re-enable a disabled feature",               "Admin"],
    ],
    col_widths=[0.8, 2.9, 2.8, 0.9]
)

# ── 3.10 Key Rotation ────────────────────────────────────
add_heading(doc, "3.10  Key Rotation", level=2)
make_table(doc,
    ["Method", "Path", "Description", "Auth"],
    [
        ["POST", "/api/v1/admin/keys/rotate",  'Manual key rotation\nBody: { keyType: "jwt" | "aes" }\nReturns: { newKeyId, rotatedAt, previousKeyId }', "Admin"],
        ["GET",  "/api/v1/admin/keys/current", "Get current active key metadata (no secret values)\nReturns: { keyId, keyType, createdAt, expiresAt }",   "Admin"],
    ],
    col_widths=[0.8, 2.6, 3.2, 0.9]
)

# ── 3.11 Anti-Screen-Recording / DRM ─────────────────────
add_heading(doc, "3.11  Anti-Screen-Recording (DRM Session)", level=2)
make_table(doc,
    ["Method", "Path", "Description", "Auth"],
    [
        ["POST",   "/api/v1/drm/session",           "Create DRM playback session — validates entitlement, issues session token for player\nBody: { lessonId, userId, playerFingerprint }\nReturns: { sessionToken, keyUrl, expiresAt }", "JWT"],
        ["DELETE", "/api/v1/drm/session/{sessionId}", "Invalidate a DRM session (logout or expiry)\nReturns: { success: true }",                                                                                                       "JWT"],
    ],
    col_widths=[0.8, 2.6, 3.2, 0.9]
)

doc.add_page_break()

# ── Future quick-ref ─────────────────────────────────────
add_heading(doc, "3.12  Quick Reference — Future", level=2)
make_table(doc,
    ["Method", "Path", "Auth"],
    [
        ["GET",    "/api/v1/logs/access",                         "Admin"],
        ["GET",    "/api/v1/logs/access/{userId}",                "Admin"],
        ["GET",    "/api/v1/logs/auth",                           "Admin"],
        ["GET",    "/api/v1/logs/auth/{userId}",                  "Admin"],
        ["GET",    "/api/v1/logs/rate",                           "Admin"],
        ["POST",   "/api/v1/admin/rate-limit/reset",              "Admin"],
        ["POST",   "/api/v1/auth/token",                          "None"],
        ["POST",   "/api/v1/auth/refresh",                        "None"],
        ["POST",   "/api/v1/auth/revoke",                         "JWT"],
        ["GET",    "/api/v1/auth/me",                             "JWT"],
        ["GET",    "/api/v1/entitlement/check",                   "JWT"],
        ["GET",    "/api/v1/entitlement/{userId}",                "JWT"],
        ["POST",   "/api/v1/media/token",                         "JWT"],
        ["POST",   "/api/v1/media/key",                           "JWT"],
        ["POST",   "/api/v1/upload/presigned",                    "JWT (Instructor)"],
        ["POST",   "/api/v1/upload/confirm",                      "JWT (Instructor)"],
        ["GET",    "/api/v1/sse/events",                          "JWT"],
        ["WS",     "ws://…/api/v1/ws",                            "JWT"],
        ["GET",    "/api/v1/admin/killswitch",                    "Admin"],
        ["POST",   "/api/v1/admin/killswitch/{feature}/disable",  "Admin"],
        ["POST",   "/api/v1/admin/killswitch/{feature}/enable",   "Admin"],
        ["POST",   "/api/v1/admin/keys/rotate",                   "Admin"],
        ["GET",    "/api/v1/admin/keys/current",                  "Admin"],
        ["POST",   "/api/v1/drm/session",                         "JWT"],
        ["DELETE", "/api/v1/drm/session/{sessionId}",             "JWT"],
    ],
    col_widths=[0.8, 4.7, 1.5]
)

# ══════════════════════════════════════════════════════════
# Save
# ══════════════════════════════════════════════════════════
doc.save(OUTPUT_FILE)
print(f"✓ Saved: {OUTPUT_FILE}")
