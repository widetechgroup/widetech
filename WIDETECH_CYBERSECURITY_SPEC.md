Create a complete, professional **Cyber Security Service Management Module** for the existing application.

The module must allow administrators and authorized cybersecurity staff to manage cybersecurity services, client requests, assessments, incidents, security projects, reports, service packages, technicians, appointments, documents and service progress from one centralized dashboard.

Do not create a static UI. Fully connect the frontend to the existing backend/database, authentication, storage and role/permission system.

## 1. CYBER SECURITY SERVICE CATEGORIES

Create a service category management system with:

* Cybersecurity Assessment
* Vulnerability Assessment
* Penetration Testing
* Web Application Security Testing
* Mobile Application Security Testing
* Network Security Assessment
* Cloud Security Assessment
* Security Audit
* Security Awareness Training
* Incident Response
* Malware Investigation
* Digital Forensics
* Data Protection & Privacy Consulting
* Firewall & Endpoint Security
* Security Monitoring
* Security Policy Development
* Risk Assessment
* Compliance Assessment
* Cybersecurity Consultation
* Other

Super Admin must be able to create, edit, activate, deactivate and delete service categories.

---

# 2. CYBER SECURITY SERVICES

Create a service management form.

Fields:

**Service Name**

**Service Category**

**Short Description**

**Full Description**

**Service Image**

**Service Icon**

**Service Status**

* Active
* Inactive
* Draft

**Pricing Model**

* Fixed Price
* Starting From
* Hourly
* Daily
* Monthly
* Custom Quote

**Price**

**Currency**

* TZS
* USD
* EUR
* GBP

**Estimated Duration**

**Service Delivery Method**

* Remote
* On-site
* Hybrid

**Featured Service**
Yes / No

**Public Visibility**
Yes / No

**SEO Title**

**Meta Description**

**Service Slug**

Allow administrators to add multiple service features and deliverables.

---

# 3. CYBERSECURITY SERVICE REQUEST

Create a customer-facing service request form.

Fields:

**Customer Name**

**Organization**

**Email**

**Phone**

**Service Requested**

**Security Concern**

**Description of Requirement**

**Preferred Service Date**

**Preferred Service Method**

**Organization Type**

* Individual
* Small Business
* Company
* NGO
* Government Institution
* School
* University
* Other

**Number of Systems / Assets**

**Website URL**
Optional

**Application Name**
Optional

**Domain Name**
Optional

**Additional Information**

Do NOT request passwords, private keys, authentication codes or other unnecessary credentials through this form.

After submission, generate a unique:

**Service Request ID**

Example:

CYB-2026-00001

---

# 4. SERVICE REQUEST WORKFLOW

Create the following workflow:

NEW REQUEST
↓
UNDER REVIEW
↓
CLIENT CONTACTED
↓
SCOPING
↓
QUOTE PREPARED
↓
APPROVED
↓
SCHEDULED
↓
IN PROGRESS
↓
QUALITY REVIEW
↓
REPORT PREPARED
↓
CLIENT DELIVERY
↓
COMPLETED
↓
CLOSED

Allow authorized users to update the status.

Every status change should be recorded in an audit timeline.

---

# 5. CYBERSECURITY PROJECT MANAGEMENT

Once a service request is approved, allow administrators to convert it into a cybersecurity project.

Project fields:

**Project ID**

**Project Name**

**Client**

**Service Type**

**Project Manager**

**Assigned Security Team**

**Start Date**

**Expected Completion Date**

**Actual Completion Date**

**Project Status**

**Priority**

* Low
* Medium
* High
* Critical

**Scope**

**Objectives**

**Deliverables**

**Notes**

Display project progress using a percentage progress indicator.

---

# 6. CLIENT ASSET INVENTORY

Create a secure asset inventory associated with each authorized client/project.

Asset types:

* Website
* Domain
* Web Application
* Mobile Application
* API
* Server
* Cloud Resource
* Network
* Endpoint
* Database
* Other

Fields:

**Asset Name**

**Asset Type**

**Asset Owner**

**Environment**

* Production
* Staging
* Development

**Criticality**

* Low
* Medium
* High
* Critical

**Status**

**Notes**

Do not expose sensitive infrastructure information to users without the appropriate permission.

---

# 7. SECURITY ASSESSMENT MANAGEMENT

Create an assessment module.

Fields:

**Assessment Name**

**Assessment Type**

**Client**

**Project**

**Scope**

**Assessment Methodology**

**Start Date**

**End Date**

**Assigned Security Analyst**

**Status**

* Planned
* In Progress
* Completed
* Reviewed

**Executive Summary**

**Recommendations**

**Final Report**

Allow authorized staff to attach assessment documents.

---

# 8. FINDINGS MANAGEMENT

Create a cybersecurity findings management system.

Each finding should contain:

**Finding ID**

**Title**

**Description**

**Affected Asset**

**Risk Level**

* Informational
* Low
* Medium
* High
* Critical

**Business Impact**

**Technical Impact**

**Evidence Reference**

**Recommended Remediation**

**Responsible Person**

**Due Date**

**Status**

* Open
* Accepted
* In Progress
* Resolved
* Retest Required
* Closed

**Resolution Notes**

Avoid storing unnecessary sensitive secrets or credentials as finding evidence.

---

# 9. RISK MANAGEMENT

Create a risk register.

Fields:

**Risk ID**

**Risk Title**

**Asset**

**Threat**

**Vulnerability**

**Likelihood**

**Impact**

**Risk Level**

**Risk Owner**

**Mitigation**

**Treatment**

* Mitigate
* Accept
* Transfer
* Avoid

**Target Date**

**Status**

Display risks using professional dashboards and filters.

---

# 10. INCIDENT MANAGEMENT

Create a cybersecurity incident management module.

Fields:

**Incident ID**

Automatically generated.

Example:

INC-2026-00001

**Incident Title**

**Client**

**Incident Type**

* Malware
* Phishing
* Unauthorized Access
* Data Exposure
* Account Compromise
* Ransomware
* Website Compromise
* Denial of Service
* Suspicious Activity
* Other

**Severity**

* Low
* Medium
* High
* Critical

**Date Detected**

**Date Reported**

**Assigned Incident Handler**

**Status**

* Reported
* Investigating
* Contained
* Eradication
* Recovery
* Closed

**Incident Description**

**Actions Taken**

**Lessons Learned**

**Final Report**

Maintain a complete incident timeline.

---

# 11. SECURITY AWARENESS TRAINING

Create a cybersecurity training management section.

Fields:

**Training Title**

**Training Type**

**Target Audience**

**Trainer**

**Date**

**Location**

**Delivery Method**

**Participants**

**Training Materials**

**Description**

**Completion Status**

Allow certificates or attendance documents to be uploaded.

---

# 12. CLIENT MANAGEMENT

Connect cybersecurity services with the existing customer management system.

Each client should have:

* Client profile
* Organization information
* Active services
* Service requests
* Projects
* Assessments
* Findings
* Reports
* Invoices
* Appointments
* Communication history

Use strict role-based access control.

---

# 13. CYBERSECURITY REPORT MANAGEMENT

Create a secure report management system.

Report types:

* Security Assessment Report
* Vulnerability Assessment Report
* Penetration Testing Report
* Incident Report
* Risk Assessment Report
* Security Audit Report
* Compliance Report
* Executive Summary
* Remediation Report

Fields:

**Report Title**

**Report Type**

**Client**

**Project**

**Prepared By**

**Reviewed By**

**Report Date**

**Version**

**Classification**

**Status**

* Draft
* Under Review
* Approved
* Delivered
* Archived

Allow PDF upload and secure download.

Add report version control.

---

# 14. SECURITY REPORT ACCESS

Implement secure access controls.

Only authorized users should be able to access cybersecurity reports.

Create permissions such as:

* view_reports
* create_reports
* edit_reports
* approve_reports
* download_reports
* delete_reports

Log every report access/download event.

---

# 15. APPOINTMENTS & CONSULTATIONS

Create cybersecurity consultation scheduling.

Fields:

**Client**

**Service**

**Consultant**

**Date**

**Time**

**Duration**

**Meeting Method**

* Office
* Phone
* Video Call
* On-site

**Status**

* Requested
* Confirmed
* Rescheduled
* Completed
* Cancelled

Send appropriate notifications through the existing notification system.

---

# 16. SERVICE QUOTATIONS

Create quotation management.

Fields:

**Quotation Number**

**Client**

**Service Request**

**Services**

**Quantity**

**Unit Price**

**Discount**

**Tax**

**Total**

**Currency**

**Validity Period**

**Terms & Conditions**

**Quotation Status**

* Draft
* Sent
* Accepted
* Rejected
* Expired

Allow conversion of an accepted quotation into an invoice.

---

# 17. CYBERSECURITY SERVICE PACKAGES

Allow Super Admin to create packages.

Example:

### CYBER SECURITY BASIC

Includes:

* Basic Security Consultation
* Website Security Review
* Security Recommendations

### CYBER SECURITY BUSINESS

Includes:

* Vulnerability Assessment
* Security Configuration Review
* Risk Assessment
* Security Report
* Consultation

### CYBER SECURITY ENTERPRISE

Includes:

* Security Assessment
* Vulnerability Assessment
* Penetration Testing
* Risk Assessment
* Security Awareness Training
* Detailed Security Report
* Remediation Consultation

Packages must be editable from the backend.

---

# 18. CYBERSECURITY DASHBOARD

Create a professional cybersecurity dashboard showing:

**Total Service Requests**

**Active Projects**

**Open Findings**

**High/Critical Findings**

**Open Incidents**

**Completed Assessments**

**Pending Reports**

**Upcoming Consultations**

**Revenue**

**Active Clients**

Create charts for:

* Service requests by month
* Services by category
* Project status
* Findings by severity
* Incidents by type
* Assessment progress

Use professional cybersecurity-themed UI while maintaining the application's existing branding.

---

# 19. TECHNICIAN / SECURITY ANALYST MANAGEMENT

Allow authorized administrators to assign cybersecurity personnel.

Each staff profile should contain:

**Name**

**Profile Photo**

**Position**

**Specialization**

**Email**

**Phone**

**Availability**

**Assigned Projects**

**Assigned Service Requests**

**Certifications**

**Experience**

Do not expose private employee information to unauthorized users.

---

# 20. CUSTOMER PORTAL

Customers should have access to a secure portal where they can:

* Submit service requests
* View request status
* View approved quotations
* Schedule consultations
* View project progress
* View approved reports
* View findings assigned to them
* Submit remediation updates
* Communicate with assigned consultants
* View invoices
* Download permitted documents

Customers must only see information belonging to their organization/account.

---

# 21. NOTIFICATION SYSTEM

Create notifications for:

* New service request
* Request status change
* Quote created
* Quote accepted
* Project assigned
* Project deadline
* New finding
* Critical finding
* Incident update
* Report ready
* Consultation reminder
* Invoice generated

Support the application's existing email/SMS/notification integrations where available.

---

# 22. AUDIT LOG

Create a complete audit trail.

Record:

* User
* Action
* Module
* Record ID
* Timestamp
* Previous value
* New value
* IP address where appropriate
* User agent where appropriate

Examples:

"Admin changed service request CYB-2026-00001 from SCOPING to APPROVED."

"Security Analyst uploaded Assessment Report version 2."

Make audit logs accessible only to authorized administrators.

---

# 23. ROLE-BASED ACCESS CONTROL

Integrate with the existing Super Admin role system.

### SUPER ADMIN

Full access to:

* Cybersecurity services
* Clients
* Service requests
* Projects
* Assessments
* Findings
* Incidents
* Reports
* Quotations
* Invoices
* Staff
* Settings
* Permissions
* Audit logs

### CYBERSECURITY MANAGER

Manage:

* Projects
* Assessments
* Security analysts
* Findings
* Reports
* Incidents

### SECURITY ANALYST

Access only assigned projects and authorized security records.

### CUSTOMER

Access only their organization's approved information.

### VIEWER

Read-only access to permitted records.

Super Admin must be able to create custom roles and assign granular permissions.

---

# 24. SECURITY REQUIREMENTS

Because this module manages sensitive cybersecurity information:

* Implement strong authentication.
* Use role-based authorization.
* Apply database Row Level Security where supported.
* Encrypt sensitive data in transit and at rest using appropriate platform capabilities.
* Never store plaintext passwords.
* Never request or store client passwords unnecessarily.
* Never expose API keys, private keys, tokens or credentials in the frontend.
* Validate and sanitize uploaded files.
* Restrict dangerous file types where appropriate.
* Apply secure file access policies.
* Maintain audit logs.
* Use least-privilege access.
* Protect administrative routes.
* Add session timeout/security controls where appropriate.
* Separate public service information from confidential client security information.

---

# 25. PUBLIC CYBERSECURITY SERVICES PAGE

Create a public page displaying available cybersecurity services.

Each service card should show:

* Service image/icon
* Service name
* Short description
* Starting price if public
* Estimated duration if public
* Service category
* Request Service button

The customer can click:

**REQUEST THIS SERVICE**

and submit the service request form.

Do not expose confidential client information, internal findings, assessments or reports on the public website.

---

# 26. DATABASE STRUCTURE

Create appropriate relational tables such as:

* cyber_services
* cyber_service_categories
* cyber_service_requests
* cyber_projects
* cyber_project_members
* cyber_assets
* cyber_assessments
* cyber_findings
* cyber_risks
* cyber_incidents
* cyber_trainings
* cyber_reports
* cyber_report_versions
* cyber_service_packages
* cyber_quotations
* cyber_quote_items
* cyber_consultations
* cyber_staff
* cyber_audit_logs

Create proper foreign-key relationships.

Add timestamps, created_by, updated_by and appropriate status fields.

---

# 27. SEARCH AND FILTERING

Every major module must support:

* Search
* Filtering
* Sorting
* Pagination
* Date filtering
* Status filtering
* Client filtering
* Assigned staff filtering
* Severity filtering where applicable

---

# 28. FINAL REQUIREMENT

Build this as a real operational **Cyber Security Service Management System**, not merely a design prototype.

All buttons, forms, tables, filters, uploads, workflows, permissions and dashboards must be functional and connected to the backend.

The system must support the complete lifecycle:

SERVICE DISCOVERY
→ SERVICE REQUEST
→ SCOPING
→ QUOTATION
→ APPROVAL
→ PROJECT CREATION
→ SECURITY ASSESSMENT
→ FINDINGS
→ REMEDIATION
→ REPORT
→ CLIENT DELIVERY
→ INVOICE
→ COMPLETION
→ AUDIT TRAIL

Keep the system professional, scalable, responsive and suitable for a cybersecurity consultancy serving individuals, businesses, NGOs, institutions and other organizations.
