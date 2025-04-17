# myapp/reports/views.py
import requests
from django.http import HttpResponse
from pylatex import Document, Section, Subsection, Tabular, Package
from pylatex.utils import NoEscape, bold, escape_latex
from datetime import datetime, date

# Models
from myapp.proctoring.models import ProctoringAssignment
from myapp.taduties.models import TADuty
from myapp.models import TAUser


def download_total_proctoring_sheet(request):
    """
    Creates a PDF summarizing proctoring assignments for each TA,
    compiled via LaTeX.Online (XeLaTeX).
    """
    doc = Document(documentclass="article")

    # Packages
    doc.packages.append(Package("fontspec"))  # For xelatex (UTF-8)
    doc.packages.append(Package("booktabs"))
    doc.packages.append(Package("longtable"))
    doc.packages.append(Package("array"))
    doc.packages.append(Package("xcolor", options=["table"]))

    # Title
    doc.preamble.append(NoEscape(r'\title{Total Proctoring Report}'))
    doc.preamble.append(NoEscape(r'\date{\today}'))
    doc.append(NoEscape(r'\maketitle'))

    # Query
    assignments_query = ProctoringAssignment.objects.select_related('exam', 'ta')
    total_assignments = assignments_query.count()

    ta_summary = {}
    for assignment in assignments_query:
        ta = assignment.ta
        em = ta.email
        if em not in ta_summary:
            ta_summary[em] = {
                'name': escape_latex(f"{ta.name} {ta.surname}"),
                'exams': [],
                'count': 0
            }
        ta_summary[em]['count'] += 1

        exam = assignment.exam
        exam_date = getattr(exam, 'date', None)
        exam_start = getattr(exam, 'start_time', None)
        exam_end = getattr(exam, 'end_time', None)
        exam_loc = escape_latex(getattr(exam, 'location', '')) or 'N/A'

        course_code = 'N/A'
        if getattr(exam, 'course', None):
            course_code = escape_latex(getattr(exam.course, 'code', '')) or 'N/A'

        ta_summary[em]['exams'].append({
            'course_code': course_code,
            'date': exam_date,
            'start_time': exam_start,
            'end_time': exam_end,
            'location': exam_loc
        })

    with doc.create(Section('Proctoring Summary')):
        doc.append(f"Total proctoring assignments: {total_assignments}\n\n")
        doc.append(f"Number of TAs involved: {len(ta_summary)}\n\n")

        with doc.create(Tabular('|l|c|')) as table:
            table.add_hline()
            table.add_row((bold('TA Name'), bold('# of Assignments')))
            table.add_hline()
            for data in ta_summary.values():
                table.add_row((data['name'], data['count']))
                table.add_hline()

    with doc.create(Section('Detailed Assignments')):
        for em, data in ta_summary.items():
            with doc.create(Subsection(data['name'])):
                with doc.create(Tabular('|l|l|l|l|l|')) as table:
                    table.add_hline()
                    table.add_row((
                        bold('Course'),
                        bold('Date'),
                        bold('Start'),
                        bold('End'),
                        bold('Location')
                    ))
                    table.add_hline()

                    for ex in data['exams']:
                        date_str = ex['date'].strftime('%Y-%m-%d') if ex['date'] else 'N/A'
                        start_str = ex['start_time'].strftime('%H:%M') if ex['start_time'] else 'N/A'
                        end_str = ex['end_time'].strftime('%H:%M') if ex['end_time'] else 'N/A'
                        loc_str = ex['location'] or 'N/A'
                        table.add_row((ex['course_code'], date_str, start_str, end_str, loc_str))
                        table.add_hline()

    latex_source = doc.dumps()
    compile_url = "https://latexonline.cc/compile"
    params = {"text": latex_source, "command": "xelatex", "force": "true"}

    try:
        r = requests.get(compile_url, params=params, timeout=60)
        if r.status_code != 200 or r.headers.get("Content-Type") != "application/pdf":
            return HttpResponse(
                f"LaTeX compilation error:\n{r.text}",
                status=400,
                content_type="text/plain"
            )
    except Exception as exc:
        return HttpResponse(f"LaTeX Online request error:\n{exc}", status=500)

    pdf_data = r.content
    response = HttpResponse(pdf_data, content_type='application/pdf')
    response['Content-Disposition'] = 'attachment; filename="total_proctoring.pdf"'
    return response


def download_total_ta_duty_sheet(request):
    """
    Creates a PDF summarizing TA duties from TADuty.
    """
    doc = Document(documentclass="article")

    doc.packages.append(Package("fontspec"))
    doc.packages.append(Package("booktabs"))
    doc.packages.append(Package("longtable"))
    doc.packages.append(Package("array"))
    doc.packages.append(Package("xcolor", options=["table"]))

    doc.preamble.append(NoEscape(r'\title{Total TA Duties Report}'))
    doc.preamble.append(NoEscape(r'\date{\today}'))
    doc.append(NoEscape(r'\maketitle'))

    duties_query = TADuty.objects.filter(status="approved").select_related('ta_user', 'course')
    total_duties = duties_query.count()

    ta_summary = {}
    for duty in duties_query:
        em = duty.ta_user.email
        ta_name = escape_latex(f"{duty.ta_user.name} {duty.ta_user.surname}")
        if em not in ta_summary:
            ta_summary[em] = {
                'name': ta_name,
                'duties': [],
                'duty_counts': {}
            }

        duty_type = duty.get_duty_type_display()  # e.g. "Grading"
        if duty_type not in ta_summary[em]['duty_counts']:
            ta_summary[em]['duty_counts'][duty_type] = 0
        ta_summary[em]['duty_counts'][duty_type] += 1

        course_code = escape_latex(duty.course.code if duty.course else "N/A")
        date_str = duty.date.strftime('%Y-%m-%d') if duty.date else "N/A"
        start_str = duty.start_time.strftime('%H:%M') if duty.start_time else "N/A"
        end_str = duty.end_time.strftime('%H:%M') if duty.end_time else "N/A"
        desc = escape_latex(duty.description[:40] + ('...' if len(duty.description) > 40 else ''))

        ta_summary[em]['duties'].append({
            'course': course_code,
            'type': escape_latex(duty_type),
            'date': date_str,
            'start': start_str,
            'end': end_str,
            'description': desc
        })

    with doc.create(Section('TA Duty Summary')):
        doc.append(f"Total approved duties: {total_duties}\n\n")
        doc.append(f"Number of TAs involved: {len(ta_summary)}\n\n")

        with doc.create(Tabular('|l|l|')) as table:
            table.add_hline()
            table.add_row((bold('TA Name'), bold('Duty Types (Count)')))
            table.add_hline()
            for data in ta_summary.values():
                duty_counts_str = ", ".join(
                    f"{t}: {cnt}" for t, cnt in data['duty_counts'].items()
                )
                table.add_row((data['name'], duty_counts_str))
                table.add_hline()

    with doc.create(Section('Detailed Duty Assignments')):
        for em, data in ta_summary.items():
            with doc.create(Subsection(data['name'])):
                with doc.create(Tabular('|l|l|l|l|l|')) as table:
                    table.add_hline()
                    table.add_row((
                        bold('Course'),
                        bold('Duty Type'),
                        bold('Date'),
                        bold('Start'),
                        bold('End'),
                    ))
                    table.add_hline()
                    for d in data['duties']:
                        table.add_row((
                            d['course'],
                            d['type'],
                            d['date'],
                            d['start'],
                            d['end'],
                        ))
                        table.add_hline()

    latex_source = doc.dumps()
    compile_url = "https://latexonline.cc/compile"
    params = {"text": latex_source, "command": "xelatex", "force": "true"}
    try:
        r = requests.get(compile_url, params=params, timeout=60)
        if r.status_code != 200 or r.headers.get("Content-Type") != "application/pdf":
            return HttpResponse(
                f"LaTeX compilation error:\n{r.text}",
                status=400,
                content_type="text/plain"
            )
    except Exception as exc:
        return HttpResponse(f"LaTeX Online request error:\n{exc}", status=500)

    pdf_data = r.content
    response = HttpResponse(pdf_data, content_type='application/pdf')
    response['Content-Disposition'] = 'attachment; filename="total_ta_duties.pdf"'
    return response


def download_total_workload_sheet(request):
    """
    Creates a PDF summarizing overall TA workload from TAUser.
    Columns: TA Name, Email, Program, Advisor, Total Workload.
    Also shows total TAs and sum of all TAs' workload.
    """
    from pylatex import Document, Section, Tabular, Package
    from pylatex.utils import NoEscape, bold, escape_latex

    doc = Document(documentclass="article")
    doc.packages.append(Package("fontspec"))
    doc.packages.append(Package("booktabs"))
    doc.packages.append(Package("longtable"))
    doc.packages.append(Package("array"))
    doc.packages.append(Package("xcolor", options=["table"]))

    doc.preamble.append(NoEscape(r'\title{TA Total Workload Report}'))
    doc.preamble.append(NoEscape(r'\date{\today}'))
    doc.append(NoEscape(r'\maketitle'))

    tas = TAUser.objects.filter(isTA=True).order_by('surname', 'name')
    total_tas = tas.count()

    # Summation of all workloads
    sum_of_workloads = sum(ta.workload for ta in tas)

    with doc.create(Section('TA Workload Summary')):
        doc.append(f"Total TAs: {total_tas}\n")
        doc.append(f"Total Workload: {sum_of_workloads}\n\n")

        # Columns: TA Name, Email, Program, Advisor, Total Workload
        with doc.create(Tabular('|l|l|l|l|c|')) as table:
            table.add_hline()
            table.add_row((
                bold('TA Name'),
                bold('Email'),
                bold('Program'),
                bold('Advisor'),
                bold('Total Workload')
            ))
            table.add_hline()

            for ta in tas:
                ta_name = escape_latex(f"{ta.name} {ta.surname}")
                email_str = escape_latex(ta.email)
                program_str = ta.get_program_display() or 'N/A'
                advisor_str = escape_latex(ta.advisor) if ta.advisor else 'N/A'
                workload_str = str(ta.workload)

                table.add_row((
                    NoEscape(ta_name),
                    email_str,
                    program_str,
                    advisor_str,
                    workload_str
                ))
                table.add_hline()

    latex_source = doc.dumps()
    compile_url = "https://latexonline.cc/compile"
    params = {"text": latex_source, "command": "xelatex", "force": "true"}
    try:
        r = requests.get(compile_url, params=params, timeout=60)
        if r.status_code != 200 or r.headers.get("Content-Type") != "application/pdf":
            return HttpResponse(
                f"LaTeX compilation error:\n{r.text}",
                status=400,
                content_type="text/plain"
            )
    except Exception as exc:
        return HttpResponse(f"LaTeX Online request error:\n{exc}", status=500)

    pdf_data = r.content
    response = HttpResponse(pdf_data, content_type='application/pdf')
    response['Content-Disposition'] = 'attachment; filename="ta_workload.pdf"'
    return response
