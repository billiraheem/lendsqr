# Demo Credit — MVP Wallet Service
A mobile lending app wallet service that allows users to create accounts, fund wallets, transfer funds between users, and withdraw — with blacklist screening via the Lendsqr Adjutor Karma API.

---

## Table of Contents
- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [E-R Diagram](#e-r-diagram)
- [API Endpoints](#api-endpoints)
- [Getting Started](#getting-started)
- [Running Tests](#running-tests)
- [Security Considerations](#security-considerations)
- [Design Decisions](#design-decisions)

---

## Overview

Demo Credit is a wallet service built for a mobile lending platform. Borrowers receive loans into their wallets and make repayments from them.

### Features

- **User Registration** — with Lendsqr Adjutor Karma blacklist screening
- **Authentication** — JWT-based faux token authentication
- **Account Funding** — deposit money into your wallet
- **Transfers** — send money to other users by account number
- **Withdrawals** — withdraw funds from your wallet
- **Transaction History** — paginated audit trail of all operations
- **Input Validation** — strict schema validation on all endpoints
- **Rate Limiting** — protection against brute-force and DOS attacks

---

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| **Node.js** (LTS) | Runtime environment |
| **TypeScript** | Type safety and better developer experience |
| **Express.js** | Web framework |
| **KnexJS** | SQL query builder / ORM |
| **MySQL 8.0** | Relational database |
| **Jest** | Testing framework |
| **Docker** | MySQL container for development |
| **Winston** | Structured logging |
| **Joi** | Input validation |
| **JWT** | Authentication tokens |
| **bcryptjs** | Password hashing |

---

## Architecture

The project follows a **layered architecture** pattern with clear separation of concerns:

```
src/
├── config/          # Environment validation, database config
├── controllers/     # HTTP request handlers (thin layer)
├── database/
│   ├── connection.ts    # Singleton Knex instance
│   └── migrations/      # Database schema migrations
├── interfaces/      # TypeScript type definitions
├── middlewares/      # Auth, validation, error handling, rate limiting
├── models/          # Data access layer (Knex queries)
├── routes/          # Route definitions with middleware pipelines
├── services/        # Business logic layer
├── utils/           # Helpers, logger, custom errors, constants
└── validators/      # Joi schema definitions
```

### Layer Responsibilities

| Layer | Role | Knows About |
|-------|------|-------------|
| **Routes** | Define URL paths and middleware chains | Controllers, Middleware |
| **Controllers** | Parse HTTP request, call service, send response | Services |
| **Services** | Business logic, orchestration, transaction scoping | Models, External APIs |
| **Models** | Database queries via Knex | Database (Knex) |
| **Middleware** | Cross-cutting concerns (auth, validation, errors) | Utils |

**Key principle:** Each layer only knows about the layer directly below it. Controllers never query the database. Services don't know about HTTP status codes.

---

## E-R Diagram

```
┌──────────────────┐         ┌──────────────────┐         ┌──────────────────────┐
│      users       │         │    accounts       │         │    transactions      │
│──────────────────│         │──────────────────│         │──────────────────────│
│ PK id (INT)      │◄─1:1──►│ PK id (INT)      │◄─1:N──►│ PK id (INT)          │
│ email (VARCHAR)  │         │ FK user_id (INT)  │         │ reference (VARCHAR)  │
│ first_name       │         │ account_number    │         │ FK account_id (INT)  │
│ last_name        │         │ balance (DECIMAL) │         │ type (ENUM)          │
│ password_hash    │         │ is_active (BOOL)  │         │ amount (DECIMAL)     │
│ is_active (BOOL) │         │ created_at        │         │ balance_before       │
│ created_at       │         │ updated_at        │         │ balance_after        │
│ updated_at       │         └──────────────────┘         │ metadata (JSON)      │
└──────────────────┘                  │                    │ FK counterparty_id   │
                                      │                    │ description          │
                                      │         N:1        │ status (ENUM)        │
                                      └────────────────────│ created_at           │
                                                           └──────────────────────┘
```

### Relationships

- **users → accounts**: One-to-One (each user has exactly one wallet)
- **accounts → transactions**: One-to-Many (each account has many transactions)
- **transactions → accounts** (counterparty): Many-to-One (transfer records link to the other account involved)

### Key Design Choices

- **DECIMAL(15,2)** for all monetary values — never FLOAT (avoids rounding errors)
- **balance_before / balance_after** on transactions — ledger pattern for full audit trail
- **ENUM types** for transaction type and status — database-level validation
- **Soft deletes** via `is_active` flag — preserves data for compliance
- **Indexed** frequently queried columns (account_id, type, status)

---

## API Endpoints

Base URL: `http://localhost:3000/api/v1`

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Register a new user | No |
| POST | `/auth/login` | Login and get JWT token | No |

### Account Operations

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/account` | Get account details and balance | Yes |
| POST | `/account/fund` | Fund (deposit into) account | Yes |
| POST | `/account/withdraw` | Withdraw from account | Yes |
| POST | `/account/transfer` | Transfer to another user | Yes |
| GET | `/account/transactions` | Get transaction history (paginated) | Yes |

### Health

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/health` | Health check | No |

### Request/Response Examples

<details>
<summary><strong>POST /auth/register</strong></summary>

**Request:**
```json
{
  "email": "john.doe@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "password": "SecurePass123!"
}
```

**Response (201):**
```json
{
  "status": "success",
  "message": "Account created successfully",
  "data": {
    "user": {
      "id": 1,
      "email": "john.doe@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "is_active": true,
      "created_at": "2026-07-02T19:38:11.513Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```
</details>

<details>
<summary><strong>POST /account/fund</strong></summary>

**Request:**
```json
{
  "amount": 5000
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Account funded successfully",
  "data": {
    "id": 1,
    "reference": "c3e14df7-630b-42ed-876d-a2e7c31dc0f0",
    "type": "funding",
    "amount": 5000,
    "balance_before": 0,
    "balance_after": 5000,
    "description": "Account funding",
    "status": "completed",
    "created_at": "2026-07-02T19:41:47.473Z"
  }
}
```
</details>

<details>
<summary><strong>POST /account/transfer</strong></summary>

**Request:**
```json
{
  "recipient_account_number": "2057652400",
  "amount": 1500,
  "description": "Payment for dinner"
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Transfer successful",
  "data": {
    "id": 2,
    "reference": "beda7385-252e-4223-b3ce-d2db4f8f5b97",
    "type": "transfer",
    "amount": 1500,
    "balance_before": 5000,
    "balance_after": 3500,
    "description": "Payment for dinner",
    "status": "completed",
    "created_at": "2026-07-02T19:43:55.192Z"
  }
}
```
</details>

<details>
<summary><strong>GET /account/transactions</strong></summary>

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20, max: 100)

**Response (200):**
```json
{
  "status": "success",
  "message": "Transactions retrieved successfully",
  "data": {
    "transactions": [
      {
        "id": 4,
        "reference": "63dc0862-c51f-4630-a4bb-686220e11a99",
        "type": "withdrawal",
        "amount": 500,
        "balance_before": 3500,
        "balance_after": 3000,
        "description": "Account withdrawal",
        "status": "completed",
        "created_at": "2026-07-02T18:47:51.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 3,
      "totalPages": 1
    }
  }
}
```
</details>

---

## Getting Started

### Prerequisites

- Node.js (LTS version 18+)
- Docker (for MySQL)
- npm

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/demo-credit.git
cd demo-credit

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your values

# 4. Start MySQL with Docker
docker compose up -d

# 5. Run database migrations
npm run migrate

# 6. Start the development server
npm run dev
```

The API will be available at `http://localhost:3000`.

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with auto-reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Start production server |
| `npm test` | Run unit tests |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run migrate` | Run database migrations |
| `npm run migrate:rollback` | Rollback last migration batch |

---

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode (re-run on changes)
npm run test:watch
```

### Test Coverage

| Suite | Tests | Scenarios |
|-------|-------|-----------|
| Auth Service | 13 | Registration, login, blacklist, duplicate email, password hashing, data exposure |
| Account Service | 16 | Fund, withdraw, transfer, self-transfer, insufficient balance, pagination |
| Auth Middleware | 8 | Valid token, missing token, expired, wrong secret, malformed |
| **Total** | **37** | Both positive and negative scenarios |

---

## Security Considerations

See the full [Security Assessment & API Review Report](./SECURITY_REPORT.md) for detailed coverage.

### Summary

- **Authentication**: JWT with expiry, signed with a strong secret
- **Password Storage**: bcrypt with 12 salt rounds
- **Input Validation**: Joi schemas on every endpoint, `stripUnknown: true`
- **SQL Injection**: Prevented by Knex parameterized queries
- **Rate Limiting**: General (100 req/15min) + Auth-specific (10 req/15min)
- **Security Headers**: Helmet middleware (XSS, clickjacking, MIME sniffing)
- **Error Handling**: Generic user-facing messages, detailed server-side logs
- **Sensitive Data**: password_hash never returned in API responses
- **Transaction Scoping**: ACID-compliant database transactions with row locking

---

## Design Decisions

1. **DECIMAL(15,2) for money** — FLOAT causes rounding errors (`0.1 + 0.2 ≠ 0.3`). DECIMAL stores exact values.
2. **Ledger pattern** — `balance_before`/`balance_after` creates an immutable audit trail.
3. **FOR UPDATE row locking** — Prevents race conditions in concurrent transfers (double-spending).
4. **Layered architecture** — Controllers → Services → Models. Each layer has a single responsibility.
5. **Custom ApiError class** — Typed errors with HTTP status codes, caught by the global error handler.
6. **Environment validation at startup** — Crash fast if config is missing, not hours later.
7. **Singleton models** — One instance per model, shared across services.
8. **Deadlock prevention** — Lock accounts in consistent order during transfers.

---

## License

ISC
