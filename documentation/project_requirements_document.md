# Project Requirements Document

## 1. Project Overview

This project is a web-based SMS campaign management platform that helps businesses collect contacts, craft text-message campaigns, schedule or send them immediately, and monitor delivery performance—all from a single dashboard. Administrators can sign up, import customer lists via CSV or manual entry, build multi-step campaigns with message templates, and rely on Twilio’s SMS API to handle outbound texts. Incoming delivery reports are captured via webhooks and displayed in real time so users can track success rates, failures, and trends over time.

We’re building this tool to streamline SMS marketing workflows for small and medium-sized teams that currently juggle spreadsheets, manual sends, and disconnected analytics. Key objectives include:

*   Secure, role-based access control and session management.
*   Intuitive customer management (add, bulk import, search/filter).
*   Guided campaign creation with scheduling options.
*   Reliable integration with Twilio for sending messages and processing delivery webhooks.
*   Clear visual analytics showing delivery rates, failure reasons, and time-based trends.

Success is measured by user adoption (number of active campaigns sent monthly), system reliability (≥99% uptime, accurate delivery tracking), and performance (page load under 200 ms, SMS dispatch within seconds of schedule).

## 2. In-Scope vs. Out-of-Scope

### In-Scope (Version 1)

*   User authentication & registration flows via clerk

*   Dashboard UI with sidebar navigation

*   Customer management:

    *   Manual contact creation (name + phone + autostate recognition)
    *   CSV import (bulk upload)
    *   Search and filter contacts

*   Campaign creation wizard:

    *   Name campaign, compose SMS with simple variables, shortlink features Replace "autostate recognition" with "autostate recognize" to match the user's instruction.
    *   Select one or more customer lists
    *   Choose send time (immediate or scheduled)
    *   Review and confirm

*   Background job processing for scheduled sends

*   Twilio integration for outbound SMS and webhook handling

*   Analytics pages:

    *   Delivery success/failure rates
    *   Timeline charts
    *   Date-range and campaign filters

*   Docker Compose setup for local development (Node.js + PostgreSQL)

*   Basic responsive design (desktop + tablet)

### Out-of-Scope (Planned for Later)

*   Advanced message templating (rich variables, A/B testing)
*   Multi-channel messaging (email, push notifications)
*   Payment or billing integration
*   Phone-number validation via third-party API
*   Multi-user roles beyond basic admin
*   AI-powered message suggestions
*   GDPR consent management workflow
*   High-availability or distributed database clustering

## 3. User Flow

A new user visits the landing page and clicks **Sign Up**. They fill in their email, password, and optional profile info. After client-side validation, the data is sent to Better Auth. On successful account creation, they receive a secure session cookie and land on the **Dashboard**. The dashboard features a left-hand sidebar with links to **Customers**, **Campaigns**, and **Analytics**. The header shows the user’s name and a logout button.

To manage contacts, the user selects **Customers**. They can click “Add Customer” to enter a name and phone, or choose “Import CSV” to bulk-upload dozens at once. The table refreshes immediately with new entries and offers search and filter fields. Next, the user goes to **Campaigns > New Campaign**, steps through naming the campaign, writing the SMS body (with optional variables), selecting lists, and scheduling delivery. On **Review & Launch**, clicking “Send” writes the campaign to the database and queues a background job. Once messages dispatch, the user visits **Analytics** to see visual charts for delivery success rates, failure causes, and messages‐sent over time, filtering by date or campaign as needed.

## 4. Core Features

*   **Authentication & Authorization**

    *   Sign up, sign in, secure session cookies, role-based route protection via Better Auth

*   **Customer Management**

    *   Manual single contact creation
    *   CSV bulk import (with client-side CSV parsing)
    *   Server-side persistence (`/api/customers` POST) via Drizzle ORM
    *   Search and filter in UI table

*   **Campaign Creation Wizard**

    *   Multi-step form (name, message, list selection, schedule)
    *   Client-side validation and local state persistence
    *   Final review and launch triggers `/api/campaigns` POST
    *   Database persistence and background job scheduling

*   **SMS Dispatch & Webhooks**

    *   Background worker reads due campaigns, iterates contacts, calls Twilio SDK (`lib/twilio.ts`)
    *   Record message SID and “sent” status in `messages` table
    *   Twilio webhook endpoint (`/api/webhooks/twilio`) updates statuses to delivered/failed

*   **Analytics & Reporting**

    *   Aggregation endpoints (`/api/analytics/delivery-rates`, `/api/analytics/timeline`)
    *   Charts for success/failure, timeline trends
    *   Interactive filters (date range, campaign)

*   **Developer Environment**

    *   Docker Compose for Node.js and PostgreSQL
    *   Environment variable configuration (`.env.example`)
    *   TypeScript, ESLint, Prettier setup

## 5. Tech Stack & Tools

*   **Frontend**:

    *   Next.js (App Router) + React + TypeScript
    *   shadcn/ui components + Tailwind CSS for styling

*   **Backend**:

    *   Next.js API Routes (Node.js)
    *   Better Auth for auth flows
    *   Drizzle ORM + PostgreSQL for data persistence

*   **Messaging**:

    *   Twilio Node.js SDK wrapped in `lib/twilio.ts`

*   **Background Jobs**:

    *   In-process or separate worker triggered by schedule (e.g., `node worker.js`)

*   **Containerization**:

    *   Docker & Docker Compose for dev environment

*   **Dev Tools**:

    *   VS Code, ESLint, Prettier
    *   Optional: GitHub Codespaces or local Docker setup

## 6. Non-Functional Requirements

*   **Performance**:

    *   Page load ≤ 200 ms on production CDN
    *   SMS dispatch processing <1 sec per message

*   **Security**:

    *   HTTPS everywhere, secure cookies, CSRF protection
    *   Input validation (client + server)

*   **Compliance**:

    *   GDPR readiness (data export/delete hooks)
    *   Opt-in consent recording for contacts

*   **Usability**:

    *   Responsive layout (desktop + tablet)
    *   Accessible forms (ARIA labels, keyboard nav)

*   **Scalability**:

    *   Support up to 10,000 contacts per campaign in V1

## 7. Constraints & Assumptions

*   **Twilio**: Account SID, Auth Token, and webhook URL must be configured as environment variables.
*   **Better Auth**: Service availability and API keys required.
*   **Database**: PostgreSQL v14+ instance accessible via Docker Compose or cloud.
*   **Time Zones**: Scheduling assumes user’s browser locale; server timestamps in UTC.
*   **Node.js**: v18+ runtime.
*   **Email Deliverability**: Out of scope; SMS only.

## 8. Known Issues & Potential Pitfalls

*   **Twilio Rate Limits**: High‐volume sends could hit Twilio per-second caps.\
    *Mitigation*: Batch sends or stagger jobs, implement retry backoff.
*   **CSV Import Errors**: Malformed CSVs may crash parser.\
    *Mitigation*: Strict client-side validation, show row-level error feedback.
*   **Webhook Reliability**: Missed webhook events could desync statuses.\
    *Mitigation*: Periodic fallback polling or rehydration jobs.
*   **Time Zone Scheduling**: Users in different zones may see confusing times.\
    *Mitigation*: Clearly display timezone, convert to UTC on save.
*   **Background Job Failures**: Worker crashes may leave campaigns incomplete.\
    *Mitigation*: Persist job state in DB, auto-retry on failure.

This document fully defines the scope, user journeys, required features, and technical considerations for version 1 of the SMS campaign management platform. All subsequent technical docs can reference these sections unambiguously.
