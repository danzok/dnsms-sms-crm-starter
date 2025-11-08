# Backend Structure Document

## 1. Backend Architecture

This backend is built around a modern JavaScript/TypeScript stack that balances developer productivity with performance and scalability. It uses the Next.js App Router paradigm for both page rendering and API routes, combined with a clean separation of concerns:

- **Next.js App Router:**
  - Handles server-side rendering (SSR) of dashboard pages.
  - Hosts API routes under the same codebase, enabling you to write business logic alongside your UI.
- **Service Modules:**
  - Encapsulate external integrations (e.g., Twilio) in dedicated files under `lib/`.
- **Component-Based Design:**
  - UI components (forms, tables, charts) live in `components/`, isolating presentation from logic.
- **ORM Layer:**
  - Drizzle ORM provides a type-safe interface to a PostgreSQL database.

This architecture supports:

- **Scalability:** API routes and UI pages can be scaled horizontally by adding more server instances or edge functions. Docker support allows containerized deployment.
- **Maintainability:** A clear folder structure—dividing authentication, API logic, UI components, and database schemas—makes it easy to locate and update code.
- **Performance:** Server components fetch data directly from the database, reducing client bundle size. Caching and CDN (see Infrastructure) further speed up responses.

## 2. Database Management

A relational database is at the heart of this application, chosen for its reliability and strong support for structured data:

- **Type:** SQL
- **System:** PostgreSQL
- **ORM:** Drizzle ORM for type-safe queries in TypeScript
- **Development Setup:** Docker Compose spins up a PostgreSQL container.

Data is organized into tables with clearly defined relationships:

- **Users:** Credentials and profiles (managed by Better Auth).
- **Customers:** Phone numbers, names, grouping information.
- **Campaigns:** Campaign metadata (name, message body, schedule).
- **Messages:** Individual SMS records, status updates, timestamps, links to customers and campaigns.

Drizzle generates and maintains SQL migrations, ensuring your database schema stays in sync with your code.

## 3. Database Schema

**Users**
- id (UUID)
- email (string, unique)
- hashedPassword (string)
- createdAt (timestamp)
- role (enum: user, admin)

**Customers**
- id (UUID)
- name (string)
- phoneNumber (string)
- createdAt (timestamp)

**Campaigns**
- id (UUID)
- name (string)
- messageBody (text)
- scheduledFor (timestamp, nullable)
- createdBy (UUID, references Users)
- createdAt (timestamp)

**Messages**
- id (UUID)
- campaignId (UUID, references Campaigns)
- customerId (UUID, references Customers)
- status (enum: queued, sent, delivered, failed)
- sentAt (timestamp, nullable)
- deliveredAt (timestamp, nullable)

-- SQL Schema (PostgreSQL) Example:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  hashed_password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE customers (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE campaigns (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  message_body TEXT NOT NULL,
  scheduled_for TIMESTAMP,
  created_by UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE messages (
  id UUID PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) NOT NULL,
  customer_id UUID REFERENCES customers(id) NOT NULL,
  status VARCHAR(50) NOT NULL,
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP
);
``` 

## 4. API Design and Endpoints

The backend exposes a simple RESTful interface under `/app/api`:

- **Authentication (`/api/auth/`)**
  - Sign-up: Creates a new user account.
  - Sign-in: Issues a secure session/token.
  - Sign-out: Ends the session.

- **Customers (`/api/customers/`)**
  - GET `/api/customers`: List all customers for the current user.
  - POST `/api/customers`: Add a new customer.
  - PUT `/api/customers/:id`: Update customer details.
  - DELETE `/api/customers/:id`: Remove a customer.

- **Campaigns (`/api/campaigns/`)**
  - GET `/api/campaigns`: List campaigns.
  - POST `/api/campaigns`: Create a campaign.
  - PUT `/api/campaigns/:id`: Update campaign settings.
  - DELETE `/api/campaigns/:id`: Delete a campaign.
  - POST `/api/campaigns/:id/send`: Enqueue or trigger campaign sending.

- **Twilio Webhook (`/api/webhooks/twilio`)**
  - POST: Receives delivery status updates from Twilio to update `messages`.

Each endpoint checks authentication via middleware (Better Auth) and uses Drizzle ORM for database operations.

## 5. Hosting Solutions

**Development Environment**
- Docker Compose for local Node.js and PostgreSQL containers.

**Production Options**
- **Vercel:** Native support for Next.js, auto-scaling serverless functions, global edge network.
- **Managed Kubernetes / ECS / Docker Cloud:** Containerized deployment with load balancing and auto-scaling.
- **Database Hosting:** Managed PostgreSQL (AWS RDS, Google Cloud SQL, or Heroku Postgres).

Benefits:
- **Reliability:** Automatic health checks and restarts.
- **Scalability:** Auto-scaling on traffic spikes.
- **Cost-Effectiveness:** Pay-as-you-go plans; scale only what you need.

## 6. Infrastructure Components

- **Load Balancer:** Distributes requests across multiple server instances or edge functions.
- **CDN (Content Delivery Network):** Caches static assets (CSS, JS) close to users (e.g., Vercel Edge or Cloudflare).
- **Caching:** In-memory cache (e.g., Redis) for session data, rate-limiting, and temporary campaign queues.
- **Background Jobs:** A queue processor (e.g., Redis + Bull or Inngest) handles SMS sending tasks asynchronously, keeping API responses fast.
- **Message Queue:** Ensures high-volume campaigns don’t overwhelm the Twilio API.
- **Monitoring Agents:** Export metrics to Prometheus or a SaaS solution.

These components work together to ensure fast page loads, reliable API responses, and smooth handling of long-running tasks.

## 7. Security Measures

- **Authentication & Authorization:**
  - Better Auth for secure sign-up, sign-in, and session management.
  - Role-based access control (user vs. admin).
- **Data Protection:**
  - HTTPS everywhere (SSL termination at the load balancer).
  - Environment variables (`.env`) for secrets (Twilio keys, DB connection strings).
  - Encryption at rest (managed database) and in transit.
- **Input Validation & Sanitization:**
  - `zod` schemas on the server to validate incoming payloads.
- **Error Handling:**
  - Centralized error middleware logs errors and returns user-friendly messages.
- **Rate Limiting & Webhook Security:**
  - Throttle API calls to prevent abuse.
  - Verify incoming Twilio requests with request signatures.

## 8. Monitoring and Maintenance

- **Logging:** Console logs in development; structured logs (JSON) in production.
- **Error Tracking:** Sentry or a similar service to capture unhandled exceptions and performance bottlenecks.
- **Metrics & Alerts:**
  - Prometheus + Grafana or a managed service for CPU, memory, request latency.
  - Alerts on high error rates, slow responses, or queue backlogs.
- **Automated Backups:** Regular database snapshots on a managed Postgres service.
- **CI/CD Pipeline:**
  - Automated tests (unit, integration, E2E) on each pull request.
  - Auto-deploy to staging or production on merge.
- **Dependency Updates:** Scheduled checks (e.g., Dependabot) for security patches.

Regular maintenance windows ensure OS, runtime, and library updates do not interrupt service.

## 9. Conclusion and Overall Backend Summary

This backend brings together a modern, battle-tested tech stack:

- Next.js App Router and API routes for unified development.
- TypeScript and Drizzle ORM for type safety from UI to database.
- PostgreSQL for reliable, structured data storage.
- Better Auth for robust user management.
- Docker for consistent environments.

Combined with a scalable hosting plan (Vercel or container orchestration) and solid infrastructure (load balancers, CDN, background jobs), this setup meets the needs of a private SMS CRM. It provides a clear path for feature growth—like message templating, scheduling, and advanced analytics—while maintaining security, reliability, and performance at every layer.