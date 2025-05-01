# myapp/reports/views.py
import os
import random
from io import BytesIO
from datetime import datetime

from django.conf import settings
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.db.models import Q

# ReportLab imports
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

# DejaVuSans for Turkish support
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

dejavu_path = os.path.join(settings.BASE_DIR, "fonts", "DejaVuSans.ttf")
pdfmetrics.registerFont(TTFont("DejaVuSans", dejavu_path))

# build and tweak styles
styles = getSampleStyleSheet()
for st in styles.byName.values():
    st.fontName = "DejaVuSans"
styles["Normal"].fontSize   = 9
styles["Normal"].leading    = 11
styles["Title"].fontSize    = 14
styles["Title"].leading     = 16
styles["Heading1"].fontSize = 12
styles["Heading1"].leading  = 14
styles["Heading2"].fontSize = 10
styles["Heading2"].leading  = 12
styles.add(ParagraphStyle(
    name="CenterSubtitle",
    parent=styles["Normal"],
    alignment=1,
    spaceBefore=4,
    fontSize=9,
    leading=11
))

# Models
from myapp.proctoring.models import ProctoringAssignment
from myapp.taduties.models    import TADuty
from myapp.models              import StudentList, TAUser
from myapp.exams.models        import DeanExam, Exam


def download_total_proctoring_sheet(request):
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter)
    elems = []

    elems.append(Paragraph("Total Proctoring Report", styles["Title"]))
    elems.append(Paragraph(f"Date: {datetime.now():%d.%m.%Y}", styles["Normal"]))
    elems.append(Spacer(1, 0.2 * inch))

    qs = ProctoringAssignment.objects.select_related("exam", "dean_exam", "ta")
    total = qs.count()

    # collect assignments per TA
    summary = {}
    for a in qs:
        key = a.ta.email
        summary.setdefault(key, {
            "name": f"{a.ta.name} {a.ta.surname}",
            "count": 0,
            "exams": []
        })
        summary[key]["count"] += 1
        if a.exam:
            ex = a.exam
            code, d, s, e, rooms = (
                ex.course.code,
                ex.date, ex.start_time, ex.end_time,
                ", ".join(ex.classrooms or [])
            )
        else:
            de = a.dean_exam
            code, d, s, e, rooms = (
                ", ".join(de.course_codes),
                de.date, de.start_time, de.end_time,
                ", ".join(de.classrooms or [])
            )
        summary[key]["exams"].append((code, d, s, e, rooms))

    # sort descending by assignment count
    ordered = sorted(summary.values(),
                     key=lambda v: v["count"],
                     reverse=True)

    # summary section
    elems.append(Paragraph("Proctoring Summary", styles["Heading1"]))
    elems.append(Paragraph(f"Total proctoring assignments: {total}", styles["Normal"]))
    elems.append(Paragraph(f"Number of TAs involved: {len(summary)}", styles["Normal"]))
    elems.append(Spacer(1, 0.15 * inch))

    data = [["TA Name", "# Assignments"]]
    for v in ordered:
        data.append([v["name"], v["count"]])

    tbl = Table(data, colWidths=[4 * inch, 1.5 * inch])
    tbl.setStyle(TableStyle([
        ("FONTNAME",      (0, 0), (-1, -1), "DejaVuSans"),
        ("FONTSIZE",      (0, 0), (-1, -1), 9),
        ("BACKGROUND",    (0, 0), (-1, 0), colors.lightgrey),
        ("ALIGN",         (0, 0), (-1, 0), "CENTER"),
        ("ALIGN",         (1, 1), (1, -1), "CENTER"),
        ("GRID",          (0, 0), (-1, -1), 0.5, colors.black),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
    ]))
    elems.append(tbl)
    elems.append(Spacer(1, 0.25 * inch))

    # detailed assignments
    elems.append(Paragraph("Detailed Assignments", styles["Heading1"]))
    for v in ordered:
        elems.append(Paragraph(v["name"], styles["Heading2"]))
        det = [["Course", "Date", "Start", "End", "Rooms"]]
        for code, d, s, e, rooms in v["exams"]:
            det.append([
                code,
                d.strftime("%d.%m.%Y"),
                s.strftime("%H:%M"),
                e.strftime("%H:%M"),
                rooms or "N/A"
            ])
        dt = Table(det, colWidths=[1.2*inch, 1*inch, 0.8*inch, 0.8*inch, 2.2*inch])
        dt.setStyle(TableStyle([
            ("FONTNAME",      (0, 0), (-1, -1), "DejaVuSans"),
            ("FONTSIZE",      (0, 0), (-1, -1), 9),
            ("BACKGROUND",    (0, 0), (-1, 0), colors.lightgrey),
            ("ALIGN",         (0, 0), (-1, 0), "CENTER"),
            ("GRID",          (0, 0), (-1, -1), 0.5, colors.black),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
        ]))
        elems.append(dt)
        elems.append(Spacer(1, 0.15 * inch))

    doc.build(elems)
    buf.seek(0)
    return HttpResponse(buf, content_type="application/pdf",
                        headers={'Content-Disposition': 'attachment; filename="Total Proctoring.pdf"'})


def download_total_ta_duty_sheet(request):
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter)
    elems = []

    elems.append(Paragraph("Total TA Duties Report", styles["Title"]))
    elems.append(Paragraph(f"Date: {datetime.now():%d.%m.%Y}", styles["Normal"]))
    elems.append(Spacer(1, 0.2 * inch))

    duties = TADuty.objects.filter(status="approved").select_related("ta_user", "course")
    total = duties.count()

    # collect duties per TA
    summary = {}
    for d in duties:
        key = d.ta_user.email
        summary.setdefault(key, {
            "name": f"{d.ta_user.name} {d.ta_user.surname}",
            "counts": {},
            "duties": []
        })
        typ = d.get_duty_type_display()
        summary[key]["counts"][typ] = summary[key]["counts"].get(typ, 0) + 1
        summary[key]["duties"].append((
            d.course.code if d.course else "N/A",
            typ,
            d.date,
            d.start_time,
            d.end_time
        ))

    # sort by total duty count descending
    ordered = sorted(summary.values(),
                     key=lambda v: sum(v["counts"].values()),
                     reverse=True)

    elems.append(Paragraph("TA Duty Summary", styles["Heading1"]))
    elems.append(Paragraph(f"Total approved duties: {total}", styles["Normal"]))
    elems.append(Paragraph(f"Number of TAs involved: {len(summary)}", styles["Normal"]))
    elems.append(Spacer(1, 0.15 * inch))

    data = [["TA Name", "Duty Types (Count)"]]
    for v in ordered:
        cnts = ", ".join(f"{k}: {c}" for k, c in v["counts"].items())
        data.append([v["name"], cnts])

    tbl = Table(data, colWidths=[2.5*inch, 3.5*inch])
    tbl.setStyle(TableStyle([
        ("FONTNAME",      (0, 0), (-1, -1), "DejaVuSans"),
        ("FONTSIZE",      (0, 0), (-1, -1), 9),
        ("BACKGROUND",    (0, 0), (-1, 0), colors.lightgrey),
        ("ALIGN",         (0, 0), (-1, 0), "CENTER"),
        ("GRID",          (0, 0), (-1, -1), 0.5, colors.black),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
    ]))
    elems.append(tbl)
    elems.append(Spacer(1, 0.25 * inch))

    elems.append(Paragraph("Detailed Duty Assignments", styles["Heading1"]))
    for v in ordered:
        elems.append(Paragraph(v["name"], styles["Heading2"]))
        det = [["Course", "Duty Type", "Date", "Start", "End"]]
        for course, typ, dt, st, et in v["duties"]:
            det.append([
                course,
                typ,
                dt.strftime("%d.%m.%Y") if dt else "N/A",
                st.strftime("%H:%M")   if st else "N/A",
                et.strftime("%H:%M")   if et else "N/A",
            ])
        dtbl = Table(det, colWidths=[1.3*inch, 1.3*inch, 1*inch, 1*inch, 1*inch])
        dtbl.setStyle(TableStyle([
            ("FONTNAME",      (0, 0), (-1, -1), "DejaVuSans"),
            ("FONTSIZE",      (0, 0), (-1, -1), 9),
            ("BACKGROUND",    (0, 0), (-1, 0), colors.lightgrey),
            ("ALIGN",         (0, 0), (-1, 0), "CENTER"),
            ("GRID",          (0, 0), (-1, -1), 0.5, colors.black),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
        ]))
        elems.append(dtbl)
        elems.append(Spacer(1, 0.15 * inch))

    doc.build(elems)
    buf.seek(0)
    return HttpResponse(buf, content_type="application/pdf",
                        headers={'Content-Disposition': 'attachment; filename="Total TA Duties.pdf"'})


def download_total_workload_sheet(request):
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter)
    elems = []

    elems.append(Paragraph("TA Total Workload Report", styles["Title"]))
    elems.append(Paragraph(f"Date: {datetime.now():%d.%m.%Y}", styles["Normal"]))
    elems.append(Spacer(1, 0.2 * inch))

    # sort by workload descending
    tas = TAUser.objects.filter(isTA=True).order_by("-workload")
    total_tas = tas.count()
    sumw = sum(t.workload for t in tas)

    elems.append(Paragraph("TA Workload Summary", styles["Heading1"]))
    elems.append(Paragraph(f"Total TAs: {total_tas}", styles["Normal"]))
    elems.append(Paragraph(f"Sum of Workloads: {sumw}", styles["Normal"]))
    elems.append(Spacer(1, 0.15 * inch))

    data = [["TA Name", "Email", "Program", "Advisor", "Workload"]]
    for t in tas:
        data.append([
            f"{t.name} {t.surname}",
            t.email,
            t.get_program_display() or "N/A",
            t.advisor or "N/A",
            str(t.workload)
        ])
    tbl = Table(data, colWidths=[1.5*inch, 2*inch, 1*inch, 1.5*inch, 1*inch])
    tbl.setStyle(TableStyle([
        ("FONTNAME",      (0, 0), (-1, -1), "DejaVuSans"),
        ("FONTSIZE",      (0, 0), (-1, -1), 9),
        ("BACKGROUND",    (0, 0), (-1, 0), colors.lightgrey),
        ("ALIGN",         (0, 0), (-1, 0), "CENTER"),
        ("ALIGN",         (4, 1), (4, -1), "CENTER"),
        ("GRID",          (0, 0), (-1, -1), 0.5, colors.black),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
    ]))
    elems.append(tbl)

    doc.build(elems)
    buf.seek(0)
    return HttpResponse(buf, content_type="application/pdf",
                        headers={'Content-Disposition': 'attachment; filename="TA Workload.pdf"'})


# BELOW LOGIC BELONGS TO EXAM STUDENTS REPORTS:
def _create_student_section(elems, title, students):
    elems.append(Paragraph(title, styles["Heading1"]))
    elems.append(Spacer(1, 0.1 * inch))

    data = [["No.", "ID", "Surname", "Name"]]
    for i, s in enumerate(students, 1):
        data.append([str(i), s.student_id, s.surname, s.name])
    tbl = Table(data, colWidths=[0.5*inch, 1.5*inch, 2*inch, 2*inch])
    tbl.setStyle(TableStyle([
        ("FONTNAME",      (0, 0), (-1, -1), "DejaVuSans"),
        ("FONTSIZE",      (0, 0), (-1, -1), 9),
        ("BACKGROUND",    (0, 0), (-1, 0), colors.lightgrey),
        ("ALIGN",         (0, 0), (-1, 0), "CENTER"),
        ("ALIGN",         (0, 1), (0, -1), "CENTER"),
        ("GRID",          (0, 0), (-1, -1), 0.5, colors.black),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
    ]))
    elems.append(tbl)


def _load_exam_or_dean(exam_id):
    try:
        ex = Exam.objects.select_related("course").get(pk=exam_id)
        title = f"{ex.course.code} - {ex.course.name}"
        rooms = ex.classrooms or []
        start = ex.start_time.strftime("%H:%M")
        end   = ex.end_time.strftime("%H:%M")
        students = ex.course.students.order_by("surname", "name")
    except Exam.DoesNotExist:
        de = get_object_or_404(DeanExam, pk=exam_id)
        title = ", ".join(de.course_codes)
        rooms = de.classrooms or []
        start = de.start_time.strftime("%H:%M")
        end   = de.end_time.strftime("%H:%M")
        q = Q()
        for c in de.course_codes:
            q |= Q(nondept_courses__contains=[c])
        students = StudentList.objects.filter(q).order_by("surname", "name")

    return title, rooms, start, end, students

def exam_students_alpha(request, exam_id):
    title, rooms, start, end, students = _load_exam_or_dean(exam_id)
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter)
    elems = []

    elems.append(Paragraph(title, styles["Title"]))
    elems.append(Paragraph(f"{start}–{end}", styles["CenterSubtitle"]))
    elems.append(Spacer(1, 0.2 * inch))
    _create_student_section(elems, f"Rooms: {', '.join(rooms)}", students)

    doc.build(elems)
    buf.seek(0)
    return HttpResponse(buf, content_type="application/pdf",
                        headers={'Content-Disposition': f'inline; filename="exam_{exam_id}_alpha.pdf"'})

def exam_students_random(request, exam_id):
    title, rooms, start, end, students = _load_exam_or_dean(exam_id)
    students = list(students)
    random.shuffle(students)
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter)
    elems = []

    elems.append(Paragraph(title, styles["Title"]))
    elems.append(Paragraph(f"{start}–{end}", styles["CenterSubtitle"]))
    elems.append(Spacer(1, 0.2 * inch))
    _create_student_section(elems, f"Rooms: {', '.join(rooms)}", students)

    doc.build(elems)
    buf.seek(0)
    return HttpResponse(buf, content_type="application/pdf",
                        headers={'Content-Disposition': f'inline; filename="exam_{exam_id}_random.pdf"'})
