# Security Assessment & API Review Report

## 1. Securing API Endpoints

All API endpoints are secured through a multi-layered defense strategy:

**Authentication**: Protected endpoints require a valid JWT token in the `Authorization: Bearer <token>` header. The `authenticate` middleware intercepts requests before they reach controllers, verifying the token's signature and expiry. Unauthenticated requests receive a `401 Unauthorized` response.

**Rate Limiting**: Two tiers of rate limiting protect against abuse. A general limiter (100 requests per 15 minutes per IP) applies to all endpoints. A stricter auth limiter (10 requests per 15 minutes) applies to login and registration, making brute-force attacks impractical.

**Security Headers**: Helmet middleware sets HTTP security headers including `X-Content-Type-Options: nosniff` (prevents MIME-type sniffing), `X-Frame-Options: SAMEORIGIN` (prevents clickjacking), and `Strict-Transport-Security` (forces HTTPS in production).

**Input Validation**: Every endpoint validates request bodies using Joi schemas with `stripUnknown: true`. This removes any fields not explicitly defined in the schema, preventing injection of unexpected data. Validation rules include type checking, minimum/maximum lengths, regex patterns for email/passwords, and business constraints (positive amounts, 2 decimal precision).

**CORS**: Configured to control which domains can call the API. In production, this would be restricted to the specific frontend domain.

## 2. Authentication & Authorization

**JWT Authentication**: Users authenticate via `POST /auth/login`, receiving a signed JWT token containing their `userId`. The token is signed with a 32+ character secret using HMAC-SHA256 and expires after 1 hour. Subsequent requests include this token for identification.

**Why JWT for a faux system?** Even though the assessment permits faux authentication, JWT demonstrates understanding of stateless authentication patterns. The token is cryptographically signed (tamper-proof), contains only the user ID (minimal payload), and has an expiry (limits exposure window).

**Authorization scope**: Users can only access their own account data. The `userId` from the JWT payload is used for all queries, ensuring User A cannot access User B's account or transactions.

**Security measures in auth flow**:
- Passwords are hashed using **bcrypt** with 12 salt rounds before storage
- Login returns the **same error message** for invalid email and invalid password, preventing email enumeration
- `bcrypt.compare()` is timing-safe, preventing timing attacks
- Deactivated accounts cannot authenticate

## 3. Vulnerabilities Considered & Mitigations

| Vulnerability | Mitigation |
|--------------|------------|
| **SQL Injection** | Knex parameterized queries automatically escape all user inputs |
| **Brute-force attacks** | Auth rate limiter (10 req/15min) makes password guessing impractical |
| **Email enumeration** | Identical error messages for wrong email vs. wrong password |
| **Double-spending (race condition)** | `SELECT ... FOR UPDATE` row locking within database transactions |
| **Negative amount attacks** | Joi validation enforces `positive()` on all monetary inputs |
| **Payload DOS** | `express.json({ limit: '10kb' })` rejects oversized request bodies |
| **XSS / Clickjacking** | Helmet security headers |
| **Sensitive data exposure** | `password_hash` excluded from all API responses; stack traces hidden from users |
| **Karma blacklist bypass** | Checked during registration before any account creation |
| **Decimal precision errors** | `DECIMAL(15,2)` in MySQL, `.toFixed(2)` in application logic |

## 4. Input Validation & Backend Protection

All user inputs are validated at the **middleware layer** before reaching business logic:

- **Registration**: Email format, name length (2-100 chars), name character restrictions (letters, hyphens, apostrophes only), password complexity (min 8 chars, uppercase, lowercase, number, special character), max password length 128 (prevents bcrypt DOS)
- **Financial operations**: Positive amounts only, 2 decimal precision, min/max transaction limits (₦1 – ₦10,000,000), 10-digit account numbers
- **Transfer**: String validation for account numbers (preserves leading zeros), optional description (max 255 chars)

Unknown fields in request bodies are automatically stripped by Joi (`stripUnknown: true`), preventing injection of unexpected data like `isAdmin: true`.

## 5. Production Security Improvements

In a production environment, the following additional measures would be implemented:

- **Refresh tokens** with token rotation and revocation via a token blacklist (Redis)
- **OAuth2/OIDC** integration for enterprise-grade authentication
- **HTTPS enforcement** with TLS 1.3 and HSTS
- **API key management** with scoped permissions and key rotation
- **Request ID tracing** (correlation IDs) for distributed request tracking
- **Database encryption at rest** and encrypted connections (SSL/TLS)
- **Web Application Firewall (WAF)** for advanced threat detection
- **Audit logging** to a dedicated, immutable log store
- **OWASP dependency scanning** in CI/CD pipeline
- **Penetration testing** and security audits on a regular schedule

---

# Failure Handling & Debugging Assessment

## 1. Handling Failing Functionalities

The application uses a **structured error hierarchy**:

- **`ApiError` class**: Custom error class extending `Error` with `statusCode` and `isOperational` properties. Operational errors (expected, like "insufficient balance") are distinguished from programming errors (unexpected, like null pointer exceptions).
- **Global error handler**: Catches all errors that bubble up through Express middleware. Returns consistent JSON responses (`{ status: "error", message: "..." }`) and logs full error details server-side.
- **Database transaction rollback**: All financial operations are wrapped in Knex transactions. If any step fails (e.g., crediting the receiver after debiting the sender), the entire operation rolls back automatically, preventing partial/corrupt state.
- **Graceful shutdown**: On `SIGTERM`/`SIGINT`, the server stops accepting new connections, completes in-flight requests, closes database connection pools, and exits cleanly. A 10-second timeout forces shutdown if graceful shutdown hangs.

## 2. Detecting, Debugging & Tracing Issues

**Structured Logging (Winston)**: Every significant operation is logged with contextual metadata:
- `logger.info('Transfer completed', { userId, recipientAccount, amount, reference })` — success path
- `logger.error('Error occurred', { error, stack, path, method, ip, userId })` — error path
- Log levels (error, warn, info, debug) allow filtering noise in production

**Error context**: The global error handler logs the request path, HTTP method, client IP, authenticated user ID, error message, and full stack trace — providing everything needed to reproduce and diagnose an issue.

**File-based logs**: Errors are written to `logs/error.log` (errors only) and `logs/combined.log` (all levels) with automatic 5MB file rotation, preserving the last 5 rotated files.

**In production**: Logs would be shipped to a centralized platform (Datadog, CloudWatch, ELK) for searching, alerting, and dashboard visualization.

## 3. Logging, Monitoring & Reliability

- **Health check endpoint** (`GET /api/v1/health`): Returns 200 if the server is alive. Used by load balancers, monitoring tools (UptimeRobot, Datadog), and CI/CD pipelines.
- **Unhandled rejection handler**: Logs unhandled promise rejections without crashing, preventing silent failures.
- **Uncaught exception handler**: Logs the error and restarts the process, since uncaught exceptions leave the app in an undefined state.
- **Connection pooling**: Knex maintains 2-10 (dev) or 2-20 (prod) database connections. This prevents connection exhaustion under load while keeping idle connections warm.

## 4. Example Failure Scenario: Diagnosis & Fix

**Scenario**: A user reports that a transfer of ₦1,000 was debited from their account, but the recipient says they never received it.

**Diagnosis Steps**:

1. **Check the transaction reference**: Ask the user for the `reference` from their transfer response. Search logs:
   ```
   grep "beda7385-252e-4223" logs/combined.log
   ```

2. **Query the database**: Look up both sides of the transaction:
   ```sql
   SELECT * FROM transactions WHERE reference = 'beda7385-252e-4223-b3ce-d2db4f8f5b97';
   -- Also check the credit side by looking at counterparty_account_id
   SELECT * FROM transactions WHERE counterparty_account_id = <sender_account_id> 
     AND created_at >= '2026-07-02 19:43:00';
   ```

3. **Verify balances**: Check both accounts' current balances and compare against the last transaction's `balance_after`:
   ```sql
   SELECT a.balance, t.balance_after 
   FROM accounts a 
   JOIN transactions t ON t.account_id = a.id 
   WHERE a.id IN (1, 2) 
   ORDER BY t.created_at DESC LIMIT 1;
   ```

4. **Root cause**: If the debit transaction exists but the credit doesn't, it means the database transaction partially committed — which our `knex.transaction()` wrapper prevents. If both exist, the issue is likely on the recipient's UI, not the backend. If neither exists but the user sees a debit, check for a race condition in their client making duplicate requests.

**Fix**: If the issue is a database inconsistency (extremely unlikely with proper transaction scoping), create a reversal transaction to restore the sender's balance and investigate the root cause. If it's a UI issue, no backend fix is needed.
