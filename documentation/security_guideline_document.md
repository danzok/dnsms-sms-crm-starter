# Security Guidelines for DNsms Application (Based on `dnsms-sms-crm-starter`)

This document provides a comprehensive, actionable set of security best practices tailored to the DNsms starter template. It embeds security-by-design principles throughout the repository’s layers—from authentication and data protection to infrastructure and dependency management.

---

## 1. Security by Design & Project Overview

- **Principle:** Integrate security from day one—design, coding, testing, and deployment.  
- **Project Stack:** Next.js (App Router), TypeScript, Better Auth, Drizzle ORM, PostgreSQL, shadcn/ui + Tailwind, Docker Compose, Twilio SDK.
- **Trust Boundaries:**  
  - Client ↔️ Server (HTTPS/TLS)  
  - Server ↔️ Database (Encrypted connection)  
  - Server ↔️ Twilio API (HTTPS, signed webhooks)

---

## 2. Authentication & Session Management

1. **Robust Authentication:**  
   - Continue using Better Auth but verify it enforces strong password policies (min length ≥ 12, complexity).  
   - Ensure passwords are hashed with a modern algorithm (Argon2id or bcrypt) and a unique salt per user.
2. **Secure Session/Cookie Settings:**  
   - Set `Secure`, `HttpOnly`, and `SameSite=Strict` on cookies.  
   - Enforce both idle and absolute session timeouts (e.g., 15 min inactivity, 8 hr max).  
   - On logout, invalidate server-side sessions or JWTs if used.
3. **Multi-Factor Authentication (MFA):**  
   - Add optional TOTP-based MFA for high-privilege or admin accounts.

---

## 3. Authorization & Role-Based Access Control (RBAC)

- **Least Privilege:** Define roles (`admin`, `manager`, `user`) and assign only necessary permissions.  
- **Server-Side Enforcement:** Check roles on every protected route (`/dashboard/*`, API endpoints).  
- **Endpoint Whitelisting:** Only expose `/app/api/auth/*`, `/app/api/campaigns/*`, `/app/api/customers/*`, `/app/api/webhooks/twilio`.

---

## 4. API Security

1. **Enforce HTTPS / TLS 1.2+:**  
   - Redirect all HTTP traffic to HTTPS.  
   - Use HSTS (`Strict-Transport-Security`) with `max-age=31536000; includeSubDomains; preload`.
2. **Rate Limiting & Throttling:**  
   - Implement per-IP and per-user limits (e.g., 100 requests/min).  
   - Protect login routes against brute-force (e.g., progressive delays, captchas).
3. **CORS Hardening:**  
   - Restrict `Access-Control-Allow-Origin` to your dashboard origin only.  
   - Disallow wildcard origins on sensitive endpoints.
4. **HTTP Method Validation:**  
   - Enforce proper verbs: GET (read), POST (create), PUT/PATCH (update), DELETE (delete).
5. **CSRF Protection:**  
   - Use synchronizer tokens or double-submit cookies on state-changing requests.

---

## 5. Input Validation & Output Encoding

- **Server-Side Validation:** Never rely on the client.  
  - Use `zod` or similar for request bodies in API routes.  
  - Validate all query params and JSON payloads.
- **Prevent Injection:**  
  - Use Drizzle ORM’s parameterized queries—no string concatenation.  
  - Sanitize any dynamic SQL fragments.
- **Output Encoding:**  
  - Escape untrusted data in React (it is safe by default), but avoid `dangerouslySetInnerHTML` unless sanitized.  
  - Implement a strict Content Security Policy (CSP) to block inline scripts and unauthorized domains.

---

## 6. Data Protection & Secret Management

1. **Encryption in Transit & At Rest:**  
   - Enable TLS on Postgres connections.  
   - Ensure database volumes are encrypted (cloud provider or disk-level encryption).
2. **Secrets Management:**  
   - Store Twilio credentials, DB credentials, and any API keys in a vault (e.g., AWS Secrets Manager) or at minimum in environment variables, not in source.
3. **Minimum Database Privileges:**  
   - Use a dedicated DB user with only necessary CRUD rights on DNsms tables.  
   - No superuser or admin roles for application connections.
4. **PII Handling & Compliance:**  
   - Mask or truncate sensitive PII in logs (e.g., store last four digits of phone numbers only in logs).  
   - Implement a data retention policy to purge old message records if required by regulations (GDPR, CCPA).

---

## 7. Twilio Integration Security

- **Secure Credentials:**  
  - Keep `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` out of code—load them at runtime from secure storage.
- **Webhook Validation:**  
  - Verify Twilio signature on incoming webhook requests (`X-Twilio-Signature` header) before processing.
- **Rate Control & Error Handling:**  
  - Throttle SMS sends per second according to Twilio limits.  
  - Implement exponential backoff and retries on transient API failures.
- **Asynchronous Processing:**  
  - Offload bulk sends to a background job queue (e.g., Redis + Bull/Queue) to avoid API timeouts and improve resilience.

---

## 8. Database Schema & ORM Security

- **Type-Safe Schema Definitions:**  
  - Define Drizzle schemas for `customers`, `campaigns`, `messages`.  
  - Restrict columns to essential data types and lengths (e.g., phone numbers as VARCHAR(15)).
- **Migration Management:**  
  - Use a migration tool (e.g., Drizzle Migrate) with version control on all schema changes.

---

## 9. Frontend Security Hygiene

1. **Security Headers:**  
   - `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`.  
2. **Avoid Client-Side Secrets:**  
   - Never expose Twilio keys or DB connection strings in the browser.  
3. **Third-Party Scripts:**  
   - Use Subresource Integrity (SRI) if loading external assets.  
   - Audit any external NPM packages for vulnerabilities.
4. **LocalStorage / SessionStorage:**  
   - Do not store JWTs or sensitive tokens in Web Storage; rely on secure, HttpOnly cookies instead.

---

## 10. Infrastructure & Deployment

- **Docker Hardening:**  
  - Run containers as non-root users.  
  - Use official, minimal base images (e.g., `node:lts-alpine`).
- **Environment Configuration:**  
  - Keep separate `.env` files for development, staging, production.  
  - Disable debug modes and verbose logging in production.
- **Server Hardening:**  
  - Close unused ports.  
  - Regularly patch Node.js, OS packages, and Docker Engine.
- **CI/CD Pipeline Security:**  
  - Store CI secrets in a secure vault.  
  - Scan artifacts for secrets and vulnerabilities (e.g., Snyk, Trivy).  
  - Enforce pull-request reviews and branch protection rules.

---

## 11. Dependency Management & Supply Chain Security

- **Lockfiles:** Commit `package-lock.json` to ensure reproducible builds.  
- **Vulnerability Scanning:** Integrate SCA tools (e.g., Dependabot, GitHub Advanced Security) to detect and auto-update vulnerable packages.  
- **Minimal Footprint:** Remove unused dependencies; avoid heavy or unmaintained libraries.

---

## 12. Monitoring, Logging & Incident Response

- **Centralized Logging:**  
  - Log all authentication events, API errors, Twilio webhook failures.  
  - Mask PII in logs.  
- **Alerting:**  
  - Trigger alerts on repeated login failures or surge in webhook errors.  
- **Audit Trails:**  
  - Maintain an audit table for critical operations (user management, campaign sends).

---

## 13. Summary & Next Steps

- **Review & Embed:** Integrate these guidelines into your PR checklists, CI pipelines, and onboarding docs.  
- **Secure by Default:** Ship every feature with security controls enabled from day one.  
- **Continuous Improvement:** Periodically audit and update dependencies, configurations, and threat models as DNsms evolves.

By following these layered security controls, the DNsms application will adhere to industry best practices, ensuring robust protection for both your infrastructure and your end users’ data.