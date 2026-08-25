# Approval Flow

Vehicle Approval & Voice Notification System — MVP

Build a modern responsive web application for a Vehicle Entry & Approval Management System.

This is an MVP/prototype. Do NOT connect to the client's real Google Drive yet. Use realistic demo data and structure the application so Google Drive/Google Sheets integration can be added later.

1. Main Workflow

The application should support this workflow:

A user enters a vehicle/transaction into the system.

The system identifies the person responsible for approving that entry.

An approval request is created.

The assigned approver receives an in-app notification.

The application should optionally speak a short notification using the browser's built-in Text-to-Speech API.

The approver opens the request.

The approver can Approve or Reject it.

The status is updated immediately.

The requester can see the current status.

Example:

Vehicle company: ABC Transport
Vehicle number: TN01AB1234

When the entry is created:

"New vehicle approval request for TN01AB1234."

The assigned approver should see:

🔔 New Approval Request

Vehicle: TN01AB1234
Company: ABC Transport
Status: Pending

[Approve] [Reject]

2. User Roles

Create these roles:

Admin

Can:

View all vehicle entries

View all approval requests

Manage users

Manage approver mappings

View notification history

View dashboard

View system activity

Data Entry User

Can:

Add vehicle entries

View entries created by them

View approval status

Approver

Can:

View approval requests assigned to them

Receive notifications

Open request details

Approve

Reject

Add remarks

3. Login

Create a clean login page.

Fields:

Email/Username

Password

For the MVP, authentication can use demo users.

Create sample accounts:

Admin:
admin@demo.com

Data Entry:
entry@demo.com

Approver:
approver@demo.com

Do not expose real credentials in production.

After login, redirect the user according to their role.

4. Dashboard

Create a dashboard that changes based on the logged-in user's role.

Admin Dashboard

Display cards:

Total Vehicles

Pending Approvals

Approved

Rejected

Today's Entries

Active Users

Add a recent activity section.

Example:

Vehicle TN01AB1234 added
Approval assigned to Kumar
Vehicle TN02CD5678 approved
Vehicle TN03EF9999 rejected

5. Vehicle Entry Page

Create a form:

Vehicle Number

Company Name

Driver Name

Vehicle Type

Branch/Location

Entry Date

Entry Time

Description/Remarks

Approver

The approver should ideally be determined automatically from the configured mapping.

For the MVP, allow an admin to configure which approver is assigned.

After submitting:

Save the vehicle entry.

Create an approval request.

Assign it to the selected approver.

Generate an in-app notification.

Show a success message.

Example:

"Vehicle TN01AB1234 has been submitted for approval."

6. Approval Requests

Create an Approvals page.

For an approver, show only their assigned requests.

Table columns:

Vehicle Number

Company

Driver

Location

Created Date

Requester

Status

Action

Statuses:

Pending

Approved

Rejected

Use clear status badges.

Clicking a request should open a detailed approval page.

7. Approval Details

Show:

Vehicle Number:
TN01AB1234

Company:
ABC Transport

Driver:
Ramesh

Location:
Chennai

Created By:
Data Entry User

Created At:
25 Aug 2026, 10:30 AM

Status:
Pending

Remarks:

Then provide:

[ Approve ]

[ Reject ]

If Reject is clicked, require a rejection reason.

If Approve is clicked, optionally allow approval remarks.

After action:

Update status

Save approver

Save approval timestamp

Save remarks

Create activity log

Remove/mark notification as handled

8. Notifications

Create a notification system.

Add a notification bell in the application header.

Example:

🔔 3

When a new approval is assigned:

"New vehicle approval request: TN01AB1234"

Clicking the notification should open the approval request.

Notification fields:

ID

User ID

Title

Message

Type

Related approval ID

Read/unread

Created timestamp

Create:

Mark as read

Mark all as read

9. Voice Notification

For the MVP, DO NOT integrate OpenAI, Qwen, Gemini, ElevenLabs, or any paid voice API.

Use the browser's built-in Web Speech API / SpeechSynthesis API.

When a new approval notification arrives while the application is open, optionally speak:

"You have a new vehicle approval request."

Or:

"New approval request for vehicle TN01AB1234."

Add a user setting:

Voice Notifications

[ ON / OFF ]

Also add:

Voice Language

English

Tamil

Use browser-supported voices where available.

Do not assume every browser/device has a Tamil voice.

The voice system must gracefully fall back to normal visual notifications if speech synthesis is unavailable.

10. Real-Time Notification Simulation

For the MVP, implement real-time notification behavior using the application's state/database architecture.

When a new approval request is created:

Approver dashboard should update without requiring a manual page refresh where possible.

Design the notification layer so it can later be replaced/connected to:

Supabase Realtime

WebSockets

Push notifications

Google Apps Script

Google Drive/Sheets events

Do not hard-code the notification implementation in a way that prevents these integrations.

11. Google Drive / Excel Integration Preparation

The final system will eventually receive data from a Google Drive folder containing approximately 3–4 Excel files.

Do NOT connect to the real Google Drive in this MVP.

Instead create an abstraction/service such as:

dataSourceService

Structure the application so that later we can replace the demo data source with:

Google Drive → Excel/Google Sheets → Backend → Database.

The expected future files may contain:

Vehicle Data

Vehicle Number

Company

Driver

Location

Date

Time

Status

User Data

User Name

Email

Role

Branch

Department

Approval Mapping

Company/Branch/Type

Approver

Backup Approver

Other operational data

Do not assume these exact columns are final. Make the data model easy to modify after requirements are received.

12. Data Architecture

Use a clean relational structure.

Suggested entities:

users

id

name

email

role

branch

department

active

created_at

vehicle_entries

id

vehicle_number

company_name

driver_name

vehicle_type

location

entry_date

entry_time

remarks

created_by

created_at

approval_requests

id

vehicle_entry_id

approver_id

status

remarks

rejection_reason

created_at

actioned_at

notifications

id

user_id

title

message

notification_type

related_id

is_read

created_at

activity_logs

id

user_id

action

entity_type

entity_id

description

created_at

Use proper foreign-key relationships.

13. Admin User Management

Create an admin page to:

View users

Add user

Edit user

Activate/deactivate user

Assign role

Assign branch

Assign department

Roles:

Admin

Data Entry

Approver

14. Approver Mapping

Create an admin page:

Approval Rules

Example:

BranchCompanyApproverChennaiABC TransportKumarChennaiXYZ LogisticsPriyaBangaloreABC TransportRavi

Allow adding/editing/deleting mappings.

The system should use these rules when creating a new approval request.

If no matching approver is found:

Show:

"Approval assignment required."

And notify the admin.

15. Audit Log

Every important action should be logged.

Examples:

User logged in

Vehicle created

Approval created

Approval assigned

Approval approved

Approval rejected

Notification created

Notification read

Create an Admin Activity Log page.

16. UI/UX

Use a professional enterprise dashboard.

Style:

Clean

Modern

Minimal

Responsive

Desktop-first but mobile-friendly

Easy to understand for non-technical users

Use:

Sidebar navigation

Top header

Notification bell

Dashboard cards

Data tables

Search

Filters

Status badges

Confirmation dialogs

Toast notifications

Suggested navigation:

Admin:

Dashboard
Vehicles
Approvals
Users
Approval Rules
Notifications
Activity Logs
Settings

Approver:

Dashboard
My Approvals
Notifications
Profile

Data Entry:

Dashboard
Vehicle Entries
My Entries
Notifications
Profile

17. Search and Filters

Add search/filter functionality to vehicle and approval tables.

Filters:

Vehicle number

Company

Branch/location

Status

Date

Approver

18. Important MVP Requirements

Do NOT implement these yet:

OpenAI API

Qwen API

Gemini API

ElevenLabs

Phone calls

WhatsApp integration

Real Google Drive integration

Real client data

Complex AI agents

We will add these only after the basic workflow is confirmed.

19. Future Architecture

Keep the application extensible for this final architecture:

Google Drive / Google Sheets
↓
Data Sync Service
↓
Backend API
↓
PostgreSQL
↓
Approval Engine
↓
Notification Service
↓
Web Application
↓
Voice Notification / AI Voice Assistant

Later, we may integrate Qwen or another low-cost realtime voice model if the client requires actual two-way AI voice conversations.

20. Demo Scenario

Seed the application with demo data.

Users:

Admin:
Admin User

Data Entry:
Arun

Approver:
Kumar

Example vehicle:

Vehicle:
TN01AB1234

Company:
ABC Transport

Driver:
Ramesh

Location:
Chennai

Create a demo approval request assigned to Kumar.

When Kumar logs in:

Dashboard should show:

"1 Pending Approval"

Notification bell:

"New approval request for TN01AB1234"

Voice:

"You have a new vehicle approval request."

Kumar opens it and clicks:

APPROVE

The system should immediately show:

"Vehicle TN01AB1234 approved successfully."

Update the dashboard and activity log.

21. Code Quality

Use a modular architecture.

Separate:

UI components

Pages

Authentication

API/services

Database logic

Notification service

Voice service

Data source service

Create interfaces/services for future:

Google Drive integration

Google Sheets integration

Realtime notifications

AI voice provider

Do not put everything into a single component.

Use environment variables for all future API keys.

Never expose secret API keys in frontend code.

22. Final Goal of This MVP

The first version should prove this complete workflow:

Vehicle Entry → Approver Identification → Approval Request → Notification → Voice Notification → Approve/Reject → Status Update → Activity Log

Build the application with realistic demo data first.

Do not wait for the final Google Drive structure.

Make the code and database structure flexible enough that the real Excel/Google Drive integration can be added later.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4a1f8445-79d4-4a46-aa68-48970d91aa64).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
