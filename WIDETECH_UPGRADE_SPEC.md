Upgrade the existing WideTech Group application into a complete **Business-to-Client (B2C/B2B) technology service platform** with fully connected frontend, backend, database, authentication, storage, billing, communication, AI assistance, branding, localization, and user account management.

Do not create a static demo. Every feature, button, form, setting, chat, invoice, upload, notification, and workflow must perform a real backend operation.

## 1. CORE ARCHITECTURE

Use the backend as the **single source of truth**.

All frontend data must come from the database/API/storage.

Do NOT hard-code:

* Services
* Products
* Prices
* Rates
* Currency
* Invoices
* Company information
* Branding
* Users
* Customer information
* Technicians
* Chat messages
* Notifications
* Dashboard statistics
* Language content
* AI configuration

Every create/edit/delete/update operation must:

1. Authenticate the user.
2. Check permissions/RBAC.
3. Validate the request.
4. Update the database.
5. Update storage when applicable.
6. Create an audit record for sensitive actions.
7. Refresh/invalidate relevant frontend data.
8. Show success/error feedback.

Use secure backend authorization and database-level access policies. Never rely only on frontend role checks.

---

# 2. COMPLETE BRANDING MANAGEMENT MODULE

Create a powerful **Branding Management** module available to Super Admin and authorized administrators.

### Branding sections

#### Company Identity

* Company name
* Legal company name
* Tagline
* Short description
* Full company description
* Vision
* Mission
* Core values
* Company registration information
* Tax/VAT information
* Physical address
* Postal address
* Phone
* WhatsApp
* Email
* Website
* Business hours
* Social media links

#### Logo Management

Allow Super Admin to upload:

* Primary logo
* Secondary logo
* Light-mode logo
* Dark-mode logo
* Favicon
* App icon
* Invoice logo
* Email logo
* Chat logo

Store images securely in the media/storage system.

Allow:

* Upload
* Replace
* Preview
* Delete
* Crop where supported
* Set active logo
* Light/dark logo selection

#### Visual Identity

Allow management of:

* Primary color
* Secondary color
* Accent color
* Background color
* Text color
* Success color
* Warning color
* Error color
* Button style
* Border radius
* Card style
* Shadow/glow intensity
* Font family
* Heading typography
* Body typography

Support:

* Dark mode
* Light mode
* System theme

Changes must immediately propagate throughout the application.

---

# 3. BRANDED INVOICE SYSTEM

Create a complete **Invoice Management & Automation module**.

Invoices must be automatically generated from real business transactions.

### Automatic invoice generation

Generate invoices automatically when configured events occur, such as:

* Approved service request
* Completed order
* Accepted quotation
* Product purchase
* Service purchase
* Milestone completion
* Recurring subscription/service
* Manual invoice creation by authorized staff

Allow Super Admin to configure which events generate invoices automatically.

### Invoice numbering

Create configurable numbering such as:

WT-2026-000001
WT-2026-000002
WT-2026-000003

Allow Super Admin to configure:

* Prefix
* Number sequence
* Financial year
* Reset rules
* Invoice status

Prevent duplicate invoice numbers.

### Invoice statuses

* Draft
* Pending
* Sent
* Viewed
* Partially Paid
* Paid
* Overdue
* Cancelled
* Refunded

### Invoice information

Every invoice should contain:

* WideTech logo
* Company name
* Company address
* Contact information
* Customer name
* Customer company
* Customer address
* Customer contact
* Invoice number
* Invoice date
* Due date
* Currency
* Service/product description
* Quantity
* Unit
* Unit price
* Discount
* Tax
* Subtotal
* Total
* Amount paid
* Balance due
* Payment instructions
* Terms and conditions
* Notes
* Authorized signature area
* Invoice status

### Branding

Invoice appearance must automatically use the active Branding Settings.

Allow Super Admin to customize:

* Invoice logo
* Invoice colors
* Header
* Footer
* Typography
* Invoice layout
* Payment instructions
* Terms
* Signature
* Company details

### Invoice actions

Authorized users can:

* Create
* Edit
* View
* Duplicate
* Send
* Download
* Print
* Export PDF
* Mark as paid
* Record partial payment
* Cancel
* Refund
* Resend
* Add notes

Customers can:

* View their invoices
* Download invoices
* Print invoices
* View payment status
* View payment history

Customers must NEVER access another customer's invoice.

---

# 4. AUTOMATED INVOICE WORKFLOW

Implement:

Service/Product
→ Customer selects service/product
→ Request/order created
→ Quote where required
→ Quote approved
→ Invoice automatically generated
→ Customer notification
→ Invoice available in customer dashboard
→ Payment
→ Payment recorded
→ Invoice updated
→ Receipt generated
→ Customer notified
→ Finance dashboard updated

For recurring services:

Subscription/Recurring Service
→ Automatic invoice generation
→ Notification
→ Payment
→ Invoice status update
→ Receipt

Create audit logs for all financial actions.

---

# 5. CUSTOMER CURRENCY SELECTION

Allow customers to select their preferred display/payment currency where supported.

Initial currencies:

* TZS — Tanzanian Shilling
* USD — US Dollar
* EUR — Euro

Design the currency system so additional currencies can be added by Super Admin.

### Currency settings

Create:

* currencies
* exchange_rates
* customer_currency_preferences
* service_rates
* invoice_currency
* payment_currency

Customers can select currency from:

* Header
* Account Settings
* Checkout
* Service/Product pages

Remember the customer's selected currency.

### Important invoice rule

Once an invoice is issued, preserve its original:

* Currency
* Exchange rate
* Unit prices
* Tax
* Discount
* Total

Changing the customer's preferred currency later must NOT alter historical invoices.

Display:

TZS 2,500,000
USD 950
EUR 870

according to the selected currency and configured exchange rates.

Allow Super Admin to manually manage exchange rates and optionally configure an approved live-rate provider.

---

# 6. CUSTOMER ACCOUNT SETTINGS

Create a complete Account Settings module.

Customers can manage:

### Profile

* Full name
* Username
* Email
* Phone
* WhatsApp
* Company
* Job title
* Address
* Country
* City
* Preferred currency
* Preferred language
* Theme preference
* Notification preferences

### Profile picture

Users must be able to:

* Upload profile picture
* Replace picture
* Remove picture
* Preview picture
* Crop image where supported

Store profile images in a secure avatars bucket.

Use the user's profile picture throughout:

* Account page
* Chat
* Notifications
* Comments
* Support tickets
* Project members
* Technician/customer conversations
* Admin user management

Generate a fallback avatar when no image exists.

---

# 7. THEME SYSTEM

Add a global Theme button.

Options:

☀ Light
🌙 Dark
🖥 System

The preference must persist per user.

For guests, save preference locally.

For authenticated users, save preference in the database.

The entire application must respond dynamically.

Dark mode:

* Deep charcoal/black backgrounds
* Frosted glass cards
* Subtle borders
* Professional technology aesthetic
* Controlled glow effects
* Excellent contrast

Light mode:

* Clean professional background
* White/frosted cards
* Subtle shadows
* Clear typography
* Corporate appearance

Do not simply invert colors. Create intentional light and dark design systems.

---

# 8. LANGUAGE SYSTEM

Create a complete localization system.

Initial languages:

* English
* Swahili

Build the architecture so additional languages can be added later.

Create a Language selector:

EN
SW

Store:

* User language preference
* Translation keys
* Translation values
* Default language

Translate:

* Navigation
* Buttons
* Forms
* Dashboards
* Services
* Products
* Requests
* Consultations
* Support
* Invoices
* Notifications
* Account settings
* Validation messages
* Empty states
* Error messages
* Chat interface
* AI assistant interface

Do NOT hard-code translated text throughout components.

Use centralized translation resources/database configuration.

---

# 9. AI ASSISTANCE CHATBOT

Add an AI-powered **WideTech AI Assistant**.

Place the assistant as:

* Floating button
* Chat window
* Mobile full-screen chat
* Desktop floating glass panel

The AI assistant should help customers with:

* Understanding WideTech services
* Service recommendations based on stated requirements
* Explaining pricing/rates
* Explaining service packages
* Explaining invoices
* Explaining service request status
* Answering frequently asked questions
* Guiding customers through the application
* Helping create a service request
* Helping schedule consultations
* Customer support triage
* Technical guidance from approved documentation

### Important AI rules

The AI must use approved WideTech data.

It must not invent:

* Prices
* Services
* Company policies
* Invoice amounts
* Payment status
* Customer records

For account-specific information, retrieve authorized backend data.

For example:

Customer:
"Has my website project been completed?"

AI:
Authenticate user → retrieve customer's project → provide current status.

Never expose another customer's data.

Allow Super Admin to configure:

* AI assistant name
* Avatar
* Greeting
* System instructions
* Enabled features
* Knowledge sources
* Availability
* Escalation behavior

---

# 10. LIVE BUSINESS CHAT

Create a real-time communication system between WideTech and customers.

This is a **living/live chat system**, not a fake messaging interface.

Support:

Customer ↔ Customer Support

Customer ↔ Technician

Customer ↔ Consultant

Customer ↔ Assigned Staff

Technician ↔ Customer

Admin ↔ Customer

Consultant ↔ Customer

### Real-time features

Use realtime backend subscriptions where supported.

Include:

* Instant messages
* Online/offline status
* Typing indicator
* Read receipts
* Delivered status
* Unread count
* Message timestamps
* User profile pictures
* Attachments
* Images
* Documents
* Voice-note architecture if supported
* Reply to message
* Message reactions
* Search messages
* Delete own message where permitted
* Conversation archive
* Conversation assignment
* Conversation escalation

### Chat security

Customers can only access conversations involving them.

Technicians can only access:

* Assigned customers
* Assigned service requests
* Assigned projects
* Conversations authorized by their role

Administrators can access conversations according to their permissions.

Super Admin has full access.

---

# 11. SERVICE REQUEST CHAT

Connect live chat directly to service requests.

Example:

Customer creates:
"Website Development Request"

System creates:
Service Request #WT-SR-000123

A conversation is automatically created.

Customer
↕
Assigned Technician / Consultant
↕
Operations Team

The conversation should display:

* Request number
* Service
* Customer
* Current status
* Assigned technician
* Assigned consultant
* Priority
* Timeline

Technicians can update request status from chat when authorized:

Pending
→ Assigned
→ In Progress
→ Waiting for Customer
→ Review
→ Completed
→ Closed

Every status change must be logged.

---

# 12. TECHNICIAN DASHBOARD

Create a dedicated Technician dashboard.

Display real backend data:

* Assigned requests
* Active projects
* Today's tasks
* Upcoming tasks
* Unread customer messages
* Pending customer responses
* Completed work
* Performance statistics
* Notifications

Technician actions:

* Accept assignment
* Start work
* Update progress
* Message customer
* Upload files
* Add technical notes
* Request clarification
* Mark task complete

Technicians must not access financial/admin functionality unless explicitly granted.

---

# 13. CUSTOMER DASHBOARD

Create a complete B2C/B2B customer portal.

Display:

* Welcome message
* Profile picture
* Active services
* Service requests
* Projects
* Consultations
* Quotes
* Invoices
* Payments
* Support conversations
* Technician conversations
* Notifications
* AI assistant
* Recommended services

Quick actions:

* Request Service
* Book Consultation
* Contact Support
* Chat Technician
* View Invoices
* Make Payment

---

# 14. NOTIFICATION SYSTEM

Create a real notification engine.

Notify users when:

* Account created
* Email verified
* Service request submitted
* Request assigned
* Technician assigned
* Technician sends message
* Customer sends message
* Consultation booked
* Consultation changed
* Quote created
* Quote approved
* Invoice generated
* Invoice sent
* Invoice overdue
* Payment received
* Project status changed
* Support ticket updated
* New announcement
* Security event

Support:

* In-app notifications
* Email notification architecture
* Push notification architecture where supported

Allow users to control notification preferences.

---

# 15. PROFILE PICTURE & MEDIA STORAGE

Create secure storage buckets:

avatars
branding
services
products
projects
documents
chat
invoices
marketing
app-media

Every uploaded file must have database metadata.

Media record:

* ID
* File name
* Storage path
* Bucket
* MIME type
* File size
* Uploaded by
* Related entity
* Related entity ID
* Visibility
* Created date
* Updated date

Validate:

* File type
* File size
* User permission
* Storage location

Private customer documents and chat attachments must not be publicly accessible.

Use authenticated access or signed URLs where appropriate.

---

# 16. BUSINESS-TO-CLIENT EXPERIENCE

The entire application should feel like a professional technology company serving real customers.

Customer journey:

LANDING PAGE
↓
Browse Services
↓
Choose Service
↓
View Pricing
↓
Request Service / Buy
↓
Create Account / Login
↓
Submit Requirements
↓
Quote if required
↓
Approval
↓
Automatic Invoice
↓
Payment
↓
Technician/Consultant Assignment
↓
Live Chat
↓
Project/Service Delivery
↓
Completion
↓
Customer Review
↓
Support / Future Services

Everything must be connected to the backend.

---

# 17. SUPER ADMIN CONTROLS

Add management sections:

### Branding

* Company identity
* Logos
* Colors
* Typography
* Invoice branding
* Email branding
* Chat branding

### Billing

* Invoice settings
* Invoice numbering
* Tax
* Currencies
* Exchange rates
* Payment settings
* Invoice templates

### AI

* AI assistant settings
* Knowledge sources
* Greeting
* Permissions
* Escalation

### Communication

* Live chat
* Chat permissions
* Support channels
* Notification templates

### Localization

* Languages
* Translation management
* Default language

### User Preferences

* Theme defaults
* Currency defaults
* Language defaults

---

# 18. DATABASE ADDITIONS

Add or extend:

profiles
user_preferences
user_language_preferences
user_currency_preferences
user_theme_preferences

branding_settings
branding_assets
brand_themes

invoices
invoice_items
invoice_sequences
invoice_settings
invoice_templates

currencies
exchange_rates

payments
payment_transactions
payment_receipts

chat_conversations
chat_participants
chat_messages
chat_attachments
chat_read_receipts
chat_typing_status
chat_assignments

ai_settings
ai_conversations
ai_messages
ai_knowledge_sources

notifications
notification_preferences
notification_templates

translation_languages
translation_keys
translation_values

media_files
media_buckets

audit_logs

---

# 19. RBAC PERMISSIONS

Add granular permissions.

Billing:

* invoices.view
* invoices.create
* invoices.edit
* invoices.delete
* invoices.send
* invoices.cancel
* invoices.refund
* invoices.export
* invoices.manage_settings

Chat:

* chat.view
* chat.create
* chat.reply
* chat.assign
* chat.attach
* chat.delete
* chat.escalate
* chat.manage

Branding:

* branding.view
* branding.edit
* branding.upload
* branding.publish

AI:

* ai.view
* ai.use
* ai.manage
* ai.configure

Localization:

* language.view
* language.manage
* translations.manage

User profiles:

* profile.view
* profile.edit
* profile.upload_avatar

Currency:

* currency.view
* currency.manage
* exchange_rates.manage

Customers must only access their own:

* profile
* requests
* projects
* chats
* invoices
* quotes
* payments
* consultations
* documents

---

# 20. UI DESIGN

Maintain the existing **Sleek Dark Mode + Glassmorphism WideTech design language**.

Use:

* Premium dark technology aesthetic
* Frosted glass
* Subtle borders
* Soft shadows
* Professional gradients
* Clean typography
* Rounded cards
* Modern icons
* Smooth transitions
* Responsive tables
* Attractive charts

Do not make the application look like a generic admin template.

---

# 21. MOBILE EXPERIENCE

On mobile, make it behave like a genuine application.

Customer bottom navigation:

Home
Services
Requests
Chat
Account

Technician:

Dashboard
Tasks
Chat
Notifications
Account

Admin:

Dashboard
Requests
Chat
Notifications
More

Use:

* Bottom sheets
* Full-screen chat
* Touch-friendly controls
* Swipe interactions
* Mobile cards
* Sticky actions
* Mobile-friendly invoice viewer
* Mobile-friendly PDF/download actions
* Mobile profile editor

Desktop should use:

* Sidebar
* Top navigation
* Multi-column dashboards
* Data tables
* Charts
* Management panels

Tablet should use adaptive layouts.

---

# 22. REAL-TIME DATA

Where technically supported, implement realtime updates for:

* Chat messages
* Online status
* Notifications
* Service requests
* Technician assignments
* Project status
* Invoice status
* Payment status
* Dashboard activity

Avoid unnecessary page refreshes.

---

# 23. SECURITY

Implement:

* Secure authentication
* RBAC
* Database-level access control
* Row-level security where supported
* Secure storage policies
* Private files
* Signed URLs
* Input validation
* Rate limiting where applicable
* Session management
* Audit logs
* Secure password reset
* Email verification
* Account suspension
* Login activity
* Security events

Never expose private keys or service-role credentials in frontend code.

Never allow users to modify their own role or privileges.

---

# 24. FINAL ACCEPTANCE REQUIREMENT

Before considering the application complete, verify that:

✓ First registered user becomes Super Admin through secure backend logic.

✓ Super Admin can manage branding.

✓ Branding changes appear throughout the application.

✓ Invoices are automatically generated from configured business events.

✓ Invoices use WideTech branding.

✓ Invoice numbers cannot duplicate.

✓ Customers can select TZS/USD/EUR.

✓ Historical invoices preserve their original currency and amounts.

✓ Users can upload profile pictures.

✓ Profile pictures appear in accounts, chats, notifications and relevant dashboards.

✓ Users can select Dark/Light/System theme.

✓ Users can select English/Swahili.

✓ Language preference persists.

✓ AI assistant works with approved backend information.

✓ AI does not expose private customer information.

✓ Customer ↔ Technician live chat works in real time.

✓ Customer ↔ Support live chat works.

✓ Chat attachments use secure storage.

✓ Customers see only their own data.

✓ Technicians see only authorized/assigned work.

✓ Admin permissions are enforced server-side.

✓ Notifications are generated from real events.

✓ All invoices, payments and sensitive changes are audited.

✓ No fake statistics.

✓ No fake buttons.

✓ No placeholder CRUD operations.

✓ No hard-coded business data.

✓ All frontend forms connect to real backend operations.

✓ Mobile experience feels like a real business application.

✓ Desktop experience functions as a professional business management platform.

✓ Tablet layout is responsive.

✓ No horizontal overflow.

✓ No clipped text.

✓ No broken layouts.

✓ Loading, empty, error, unauthorized and offline states are handled.

✓ The application is production-ready and structured for future expansion.

Build this as one cohesive WideTech Group ecosystem rather than separate disconnected features.
