# TA Management System

## Description
The **TA Management System** is designed to efficiently manage Teaching Assistant (TA) assignments, proctoring duties, and workload tracking for **Bilkent University Engineering Faculty**. The system helps distribute work fairly among TAs and allows administrative processes for faculty and department staff.

## Features
### 1. TA Duties Management
* TAs can enter tasks performed (Lab work, Grading, Recitations, Office Hours, Exam Proctoring, etc.).
* Course instructors receive notifications and can approve or reject tasks.
* Approved tasks contribute to the TA's total workload for the semester.

### 2. Proctoring Assignment
* Faculty/staff can schedule exams dates, assign classrooms, and request the required number of proctors.
* **Automatic Assignment:** Prioritizes TAs with the least workload while considering restrictions:
    - TAs assigned to that course have primary priority. Secondly, the system checks other TAs within the department.
    - TAs who do not have a proctoring assignment on the day before or after will be given priority in the assignment process.
    - PhD students are assigned to MS/PhD courses.
    - TAs on leave or taking the course are excluded.
* **Manual Assignment:** Staff can manually assign TAs using an interface with workload-based priority sorting.

### 3. TA Leave Management
* TAs can request leaves for valid reasons (medical, conference, vacation, etc.).
* Department chair or authorized staff approves/rejects the request.

### 4. Proctor Swaps
* **TA-Initiated Swap:** TAs can request swaps with other TAs.
* **Staff-Initiated Swap:** Authorized staff can replace an assigned TA and notify all parties.
* Swap history is maintained to prevent repetitive assignments.

### 5. Classroom Lists
* Faculty/staff can generate student distribution lists for exams, either alphabetically or randomly.

### 6. Dean’s Office Assignments
* Exams scheduled by the Dean’s office can pool TAs from multiple departments.

### 7. System Administration
- **Role-Based Access Control:** Roles include TAs, Faculty, Department Staff, Dean, Admin.
- **Caps on Workload:** Define max TA duty/proctoring hours per semester/year.
- **Data Import:** Import semester offerings, student enrollment, faculty lists via Excel.
- **Logging & Reporting:** Tracks logins, assignments, swaps, and generates workload reports.

## System Requirements
* Operating System: Linux
* Web Server: Apache2
* Database: MySQL

## Usage
* **TAs:** Log in to enter tasks and request leave.
* **Faculty:** Approve/reject TA tasks and assign proctoring duties.
* **Admins:** Manage roles, workload caps, and import data.

## Contributing
* Burak Kağan Gür
* Daib Malik
* Bilge İdil Öziş
* Yunus Günay
* Yusufbek Karamatov
