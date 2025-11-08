# DNSms SMS CRM Starter - Tech Stack Document

This document explains the technology choices for the DNSms SMS CRM Starter template in clear, everyday language. It shows how each technology fits together, why it was chosen, and how it helps deliver a secure, scalable, and user-friendly application.

## 1. Frontend Technologies

We use modern tools and libraries to build a responsive, easy-to-use interface:

- Next.js (App Router)
  - Provides page routing, server-side rendering, and API routes in one framework
  - Enables building pages and protected areas (like the dashboard) with minimal setup

- TypeScript
  - Brings type safety to both frontend and backend code
  - Helps catch errors early and ensures that data (like customer phone numbers) follows the right format

- shadcn/ui components
  - A ready-made library of React components (forms, tables, charts, dialogs)
  - Speeds up UI development and keeps things consistent

- Tailwind CSS
  - A utility-first CSS framework for fast, custom styling
  - Ensures a consistent design system and responsive layouts with minimal custom CSS

## 2. Backend Technologies

Our backend handles data storage, user authentication, and business logic:

- Node.js & Next.js API Routes
  - Runs server-side code using JavaScript/TypeScript
  - Defines endpoints under `/app/api` for operations like creating campaigns or receiving Twilio webhooks

- Better Auth
  - A secure, built-in authentication solution for Next.js App Router
  - Manages sign-up, sign-in, session handling, and route protection

- PostgreSQL
  - A robust relational database for storing users, customers, campaigns, and message logs
  - Ideal for complex queries (e.g., campaign analytics)

- Drizzle ORM
  - A TypeScript-friendly tool for defining database schemas and running queries
  - Ensures type-safe interactions with the database and reduces runtime errors

- Service Module (`/lib/twilio.ts`)
  - Centralizes all communication with the Twilio SMS API
  - Encapsulates functions like `sendSms(to, body)` and handles Twilio credentials securely

## 3. Infrastructure and Deployment

We use standard tools to ensure reliable development, testing, and deployment:

- Docker & Docker Compose
  - Containerizes the Node.js application and PostgreSQL database
  - Guarantees that everyone on the team works in the same environment

- Git & GitHub
  - Version control system for tracking code changes and collaboration
  - Pull requests and code reviews help maintain quality

- CI/CD (Continuous Integration/Continuous Deployment)
  - GitHub Actions (or a similar CI service) automates tests and linting on each push
  - Automated deployments to hosting platforms (e.g., Vercel or AWS) ensure rapid, consistent releases

- Environment Variables
  - Sensitive credentials (Twilio keys, database URL) are stored in `.env` files or secure variable stores
  - Keeps secrets out of the codebase and ensures safe configuration per environment (development, staging, production)

## 4. Third-Party Integrations

Our starter template is ready to integrate with key external services:

- Twilio SMS API
  - Sends SMS messages to customers and receives delivery status updates via webhooks
  - Used for campaign execution and tracking message outcomes

- Background Job Processing (Optional)
  - Tools like Inngest, Vercel Cron, or a Redis-based queue
  - Ensures large SMS campaigns are sent asynchronously without blocking the user interface

- Analytics & Monitoring (Optional)
  - Services like Sentry or LogRocket for error tracking
  - Google Analytics or Plausible for user behavior insights

## 5. Security and Performance Considerations

We’ve built in best practices to protect data and deliver a smooth experience:

- Authentication & Authorization
  - Better Auth secures all protected routes and session management
  - Server-side logic ensures Twilio API keys and other secrets never reach the browser

- Data Validation
  - `react-hook-form` + `zod` for client-side form validation (e.g., valid phone number formats)
  - Schema-level validation in Drizzle for database safety

- HTTPS & Secure Headers
  - Enforce HTTPS in production to encrypt data in transit
  - Use HTTP security headers (Content Security Policy, HSTS) for added protection

- Performance Optimizations
  - Server Components in Next.js to fetch data on the server and send minimal JavaScript to the client
  - Tailwind’s JIT mode ensures only the CSS you use is shipped
  - Caching strategies (e.g., SWR or React Query) for fast data fetching and UI responsiveness

## 6. Conclusion and Overall Tech Stack Summary

This starter template brings together reliable, modern technologies to kickstart your DNSms SMS CRM application:

- **Frontend**: Next.js, TypeScript, shadcn/ui, Tailwind CSS for a fast, consistent, and type-safe UI
- **Backend**: Node.js, Next.js API Routes, Better Auth, PostgreSQL, Drizzle ORM for secure data management and server logic
- **Infrastructure**: Docker Compose, GitHub Actions, Git/GitHub, environment variables for consistent development and automated deployments
- **Integrations**: Twilio SMS API, optional job queues, and analytics tools to power campaigns and track performance
- **Security & Performance**: Built-in authentication, data validation, secure configuration, and performance best practices

Together, these components form a solid foundation for building, deploying, and scaling your private SMS CRM. The clear directory structure (`/app`, `/components`, `/lib`, `/db`) and type-safe setup ensure that your team can extend and maintain the project easily, focusing on delivering unique features for DNSms without wrestling with boilerplate code.