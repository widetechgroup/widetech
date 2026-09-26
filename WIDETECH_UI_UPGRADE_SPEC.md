UPGRADE THE EXISTING WIDETECH GROUP APPLICATION WITH THE FOLLOWING UI/UX AND FUNCTIONAL REQUIREMENTS.

Do not rebuild the application as a static mockup. Preserve all existing backend functionality, RBAC, services, products, invoices, branding, chat, AI assistant, users, consultations, support, media management, and settings.

The following requirements are an enhancement to the existing system.

# 1. PROFESSIONAL BUSINESS DASHBOARD

Create a premium, professional **WideTech Business Operations Dashboard**.

The dashboard must feel like a real technology company's production management platform — clean, modern, information-dense, but not cluttered.

Avoid:

* Generic template appearance
* Oversized unnecessary cards
* Excessive gradients
* Fake statistics
* Decorative elements that reduce usability
* Unnecessary animations

Use a **Modern Minimalist + Professional Enterprise + Glassmorphism** design language.

## Dashboard visual hierarchy

Structure the desktop dashboard as:

LEFT FIXED SIDEBAR
+
MAIN RESPONSIVE CANVAS

The main canvas contains:

1. Top Header
2. Page title / welcome area
3. KPI cards
4. Analytics section
5. Service performance section
6. Requests / orders section
7. Customer activity
8. Live activity
9. Recent transactions
10. Upcoming consultations
11. System activity

Everything must use real backend data.

---

# 2. FIXED LEFT SIDEBAR NAVIGATION

Implement a professional operational-app sidebar.

Desktop:

```text
┌──────────────────────┬───────────────────────────────────────────┐
│                      │ Top Header                               │
│      WIDETECH        ├───────────────────────────────────────────┤
│      Logo            │                                           │
│                      │ Dashboard                                 │
│ Dashboard            │                                           │
│ Services             │ KPI Cards                                │
│ Products             │                                           │
│ Requests             │ Analytics                                │
│ Consultations        │                                           │
│ Customer Service     │ Services                                  │
│ Projects             │                                           │
│ Customers            │ Recent Activity                           │
│ Invoices             │                                           │
│ Payments             │                                           │
│ Users                │                                           │
│ Media                │                                           │
│ Notifications        │                                           │
│ Analytics            │                                           │
│ Branding             │                                           │
│ Settings             │                                           │
│                      │                                           │
│ Profile              │                                           │
└──────────────────────┴───────────────────────────────────────────┘
```

### Figma / layout behavior

Set the sidebar to:

```text
position: fixed
width: 280px
height: 100vh
```

Main content:

```text
margin-left: 280px
width: calc(100% - 280px)
min-height: 100vh
```

Use a flex-based architecture:

```css
display: flex;
flex-direction: row;
```

The main content area must:

```css
flex: 1;
min-width: 0;
overflow-x: hidden;
```

This allows the dashboard to dynamically resize according to the monitor resolution.

---

# 3. COLLAPSIBLE SIDEBAR

Add a sidebar toggle button.

Expanded:

```text
280px
```

Collapsed:

```text
76px
```

Collapsed state should display icons only.

Expanded state:

```text
Icon + Label
```

Collapsed state:

```text
Icon
```

Add tooltips when collapsed.

Persist sidebar preference for each user.

Example:

```text
Sidebar Expanded
Sidebar Collapsed
```

Store the preference locally for guests and in the user profile/preferences for authenticated users.

---

# 4. ROLE-AWARE SIDEBAR

The sidebar must automatically change according to RBAC permissions.

Do not show modules the current user cannot access.

Example Customer:

```text
Home
Services
My Requests
My Projects
Consultations
Invoices
Payments
Live Chat
Notifications
Account
```

Technician:

```text
Dashboard
Assigned Requests
Projects
Tasks
Customers
Live Chat
Documents
Notifications
Account
```

Finance:

```text
Dashboard
Customers
Invoices
Payments
Quotes
Reports
Notifications
Account
```

Super Admin:

```text
Dashboard
Services
Products
Requests
Consultations
Customer Service
Projects
Customers
Invoices
Payments
Users
Roles & Permissions
Media
Notifications
Analytics
Branding
AI Assistant
Languages
Currencies
App Settings
Audit Logs
System Status
```

Never use frontend visibility as the only security mechanism. Backend permissions must still enforce access.

---

# 5. PROFESSIONAL TOP HEADER

Create a clean top header inside the main canvas.

Include:

Left:

```text
☰ Sidebar Toggle
Page Title
Breadcrumb
```

Right:

```text
Search
Language
Currency
Theme
Notifications
AI Assistant
Profile Avatar
```

Example:

```text
Dashboard / Overview                         🔍  EN  TZS  ☀  🔔  AI  [Avatar]
```

Make the header sticky while the main content scrolls.

---

# 6. PROFESSIONAL KPI SECTION

Create a responsive KPI row.

Example:

```text
┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│ Total Customers│ │ Active Requests│ │ Revenue        │ │ Open Tickets   │
│ 2,458          │ │ 128            │ │ TZS 48.2M      │ │ 34             │
│ ↑ 12.4%        │ │ ↑ 8.2%         │ │ ↑ 18.6%        │ │ ↓ 4.3%         │
└────────────────┘ └────────────────┘ └────────────────┘ └────────────────┘
```

Use actual database calculations.

Do not create fake numbers.

KPI cards should support:

* Icon
* Label
* Current value
* Comparison period
* Percentage change
* Trend indicator
* Optional mini chart

Super Admin should be able to configure which KPI cards appear.

---

# 7. PROFESSIONAL ANALYTICS AREA

Create a responsive analytics grid.

Desktop:

```text
┌─────────────────────────────────────┬─────────────────────┐
│ Revenue / Requests Performance      │ Service Distribution │
│                                     │                     │
│       BAR / LINE CHART              │    DONUT CHART      │
│                                     │                     │
└─────────────────────────────────────┴─────────────────────┘
```

Charts must use real backend data.

Allow date filtering:

* Today
* Yesterday
* Last 7 Days
* Last 30 Days
* Last 90 Days
* This Year
* Custom Range

---

# 8. SERVICE MANAGEMENT MUST USE IMAGES

Every service must have a visual representation.

Services must NEVER appear as text-only listings.

Each service should support:

* Main image
* Gallery
* Thumbnail
* Icon
* Optional video
* Service category
* Service title
* Short description
* Full description
* Starting price
* Currency
* Pricing unit
* Features
* Availability
* Rating/reviews where enabled
* Featured status

Example:

```text
┌─────────────────────────────────────┐
│                                     │
│          SERVICE IMAGE              │
│                                     │
├─────────────────────────────────────┤
│ Web Development                     │
│                                     │
│ Modern responsive websites...       │
│                                     │
│ Starting from                       │
│ $600                                │
│                                     │
│ [View Service] [Request Service]   │
└─────────────────────────────────────┘
```

---

# 9. SERVICE IMAGE MANAGEMENT

Connect service images to the existing Media Management system.

Database example:

```text
services
service_categories
service_features
service_rates
service_media
```

A service can have:

```text
cover_image
thumbnail_image
gallery_images[]
video
documents[]
```

When Super Admin changes a service image, the frontend must automatically display the new image.

Do not hard-code image URLs.

---

# 10. SERVICE CATALOG UI

Create a professional service catalogue.

Desktop:

```text
4 cards per row where screen width allows
```

Tablet:

```text
2 cards per row
```

Mobile:

```text
1 card per row
```

Each service card should include:

* High-quality image
* Category badge
* Service title
* Short description
* Starting price
* Pricing unit
* Featured badge if applicable
* Availability
* View button
* Request button

Use consistent image aspect ratio.

Prevent distorted images.

Use:

```css
object-fit: cover;
```

for service card images.

---

# 11. SERVICE DETAIL PAGE

Clicking a service opens a professional service detail page.

Include:

Hero image/gallery

```text
[Large Service Image]
```

Then:

```text
Service Name
Category
Rating
Starting Price
Pricing Model
```

Then:

```text
Overview
Features
What's Included
Pricing
Add-ons
Requirements
FAQ
Terms
Related Services
```

CTA:

```text
REQUEST THIS SERVICE
```

The request button must open the real service-request workflow.

---

# 12. DASHBOARD SERVICE PERFORMANCE

Add a dashboard widget:

### Top Services

Show:

```text
┌─────────────────────────────────────────────┐
│ SERVICE                REQUESTS    REVENUE │
│ Web Development            48      $28,800  │
│ Cyber Security             31      $24,800  │
│ Digital Marketing          27       $8,100  │
│ CCTV Installation          19       $7,600  │
└─────────────────────────────────────────────┘
```

All values must be calculated from actual records.

Clicking a service should open its management/detail page.

---

# 13. RECENT SERVICE REQUESTS

Add a professional data table:

```text
REQUEST
CUSTOMER
SERVICE
ASSIGNED TECHNICIAN
STATUS
DATE
ACTION
```

Example status badges:

```text
Pending
Assigned
In Progress
Waiting
Completed
Cancelled
```

Use professional visual status indicators.

On mobile, transform the table into cards rather than forcing horizontal scrolling.

---

# 14. CUSTOMER ACTIVITY

Add:

### Recent Customers

Display:

* Profile picture
* Name
* Company
* Service
* Last activity
* Status

Example:

```text
[Avatar] Brian Rogers
         WideTech Client
         Web Development
         Active
```

Profile pictures must come from the user's avatar storage.

---

# 15. LIVE ACTIVITY PANEL

Create a real-time activity widget.

Examples:

```text
● New service request
  Web Development request submitted
  2 min ago

● Invoice generated
  Invoice WT-2026-000124
  8 min ago

● Technician assigned
  CCTV Installation
  12 min ago

● Payment received
  TZS 2,500,000
  18 min ago
```

Use real events from the backend.

---

# 16. DASHBOARD QUICK ACTIONS

Add a professional quick-action section.

Examples:

```text
+ New Service
+ New Product
+ New Customer
+ Create Invoice
+ Create Quote
+ Assign Technician
+ New Announcement
+ Upload Media
```

Only show actions permitted by the current user's role.

---

# 17. MOBILE APP INTERFACE

On mobile, do NOT simply shrink the desktop dashboard.

Create a dedicated mobile composition.

Top:

```text
[☰] WideTech                       [🔔] [Avatar]
```

Then:

```text
Good morning, Brian

[ KPI CARD → ]
```

KPI cards become horizontally scrollable.

Charts become vertically stacked.

Service cards become:

```text
┌──────────────────────────────┐
│                              │
│       SERVICE IMAGE          │
│                              │
├──────────────────────────────┤
│ Web Development              │
│ Starting $600                │
│ [View]       [Request]       │
└──────────────────────────────┘
```

Bottom navigation:

```text
Home | Services | Requests | Chat | Account
```

---

# 18. MOBILE SIDEBAR

When the mobile menu opens:

```text
┌──────────────────────────┐
│ WIDETECH             X   │
├──────────────────────────┤
│ 🏠 Dashboard             │
│ 💼 Services              │
│ 📦 Products              │
│ 📋 Requests              │
│ 💬 Live Chat             │
│ 📅 Consultations         │
│ 🧾 Invoices              │
│ 👥 Customers             │
│ 🔔 Notifications         │
│ ⚙ Settings               │
└──────────────────────────┘
```

Use a smooth drawer animation.

The mobile drawer should not create horizontal overflow.

---

# 19. RESPONSIVE BREAKPOINTS

Design deliberately for:

### Mobile

```text
320px – 767px
```

### Tablet

```text
768px – 1199px
```

### Desktop

```text
1200px+
```

Do not rely solely on scaling.

Change composition according to screen size.

---

# 20. DESKTOP CONTENT CANVAS

The main dashboard should use:

```css
display: flex;
flex-direction: column;
flex: 1;
min-width: 0;
```

Content container:

```css
width: 100%;
max-width: 1800px;
margin: 0 auto;
padding: 24px;
```

Large monitors should have appropriate whitespace without making the dashboard look stretched.

---

# 21. DATA TABLE DESIGN

Use professional tables for operational data.

Features:

* Search
* Filtering
* Sorting
* Pagination
* Column visibility
* Export
* Bulk actions
* Status filters
* Date filters
* Row actions

On mobile:

Do NOT force desktop tables into tiny screens.

Transform rows into stacked cards.

---

# 22. PROFESSIONAL EMPTY STATES

Do not leave blank white/dark areas.

Examples:

No services:

```text
No services available yet.

Create your first service to start building your catalogue.

[Create Service]
```

No requests:

```text
No service requests yet.

[Request a Service]
```

No messages:

```text
No conversations yet.

Start a conversation with WideTech.
```

Empty states must adapt to the user's permissions.

---

# 23. LOADING STATES

Use professional skeleton loaders for:

* KPI cards
* Services
* Tables
* Charts
* Customer lists
* Chat
* Invoices

Avoid unnecessary spinners everywhere.

---

# 24. ERROR STATES

Create clear error interfaces:

```text
Something went wrong.

We couldn't load this information.

[Try Again]
```

Do not expose raw backend errors to normal users.

Log technical errors appropriately.

---

# 25. ACCESSIBILITY

Maintain:

* Strong color contrast
* Keyboard navigation
* Visible focus states
* Screen-reader labels
* Touch-friendly buttons
* Proper form labels
* Accessible modal/dialog behavior
* Accessible charts where possible
* Tooltips for icon-only controls

---

# 26. FINAL VISUAL DIRECTION

The final WideTech dashboard should communicate:

**Professional**
**Modern**
**Reliable**
**Technical**
**Enterprise**
**Clean**
**Fast**
**Business-focused**

Use:

* Crisp borders
* Generous padding
* Clear hierarchy
* High-quality service imagery
* Professional charts
* Compact but readable KPI cards
* Modern iconography
* Consistent spacing
* Responsive grid
* Smooth but restrained animations
* Dark/light theme support
* Glassmorphism used selectively

The application should look like a **real technology company operating platform**, not a template.

---

# 27. CRITICAL IMPLEMENTATION RULE

Do not break existing functionality.

Keep all existing modules connected:

RBAC
→ Users
→ Customers
→ Services
→ Products
→ Service Requests
→ Consultations
→ Customer Service
→ Projects
→ Live Chat
→ AI Assistant
→ Quotes
→ Invoices
→ Payments
→ Media
→ Branding
→ Languages
→ Currency
→ Notifications
→ Analytics
→ Settings
→ Audit Logs

Everything must remain connected to the same backend and database.

When Super Admin changes a service, image, price, branding element, currency, user, permission, or other configuration, the change must be reflected wherever that information is displayed.

No hard-coded business data.
No fake dashboard numbers.
No fake service images.
No placeholder buttons.
No disconnected frontend components.
No frontend-only permissions.

Build the final experience as a complete professional WideTech business platform.
