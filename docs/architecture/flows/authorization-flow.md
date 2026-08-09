# Authorization Flow

This document details the authorization and access control lifecycle for NexCorpus, establishing how page routes and API endpoints enforce authentication, tenant isolation, and resource ownership verification.

---

## Overview

The authorization architecture enforces strict multi-tenant isolation. It validates user session identity at entry, routes verification through context-specific guards (`requireUser()` for Page components vs `requireApiUser()` for API routes), extracts the authenticated `userId`, and performs an explicit resource ownership check before allowing data access.

---

## Flow Execution Steps

| Step | Component / Action | Layer / Scope | Description | Next Step |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Request** | Transport Layer | Incoming HTTP request initiated by client or browser. | `Auth.js Session` |
| **2** | **Auth.js Session** | Session Layer | Resolves session token and identity claims via Auth.js. | `NexCorpus User` |
| **3** | **NexCorpus User** | Database / Service | Resolves active NexCorpus user profile from MongoDB. | Target Context Branching |
| **4a** | **Page Route** | Presentation Layer | Page component execution path. Uses `requireUser()`. Redirects unauthenticated users to `/login`. | `Current User ID` |
| **4b** | **API Route** | API Layer | Route handler execution path. Uses `requireApiUser()`. Returns `401 Unauthorized` JSON if unauthenticated. | `Current User ID` |
| **5** | **Current User ID** | Context Guard | Extracts authenticated `userId` from verified user entity. | `Resource query` |
| **6** | **Resource query** | Database Layer | Queries requested database document, session, or vector resource. | `Ownership check` |
| **7** | **Ownership check** | Security Layer | Verifies if requested resource belongs to the current user (`resource.ownerId === currentUserId`). | Decision Evaluation (YES / NO) |
| **8a** | **YES (Granted)** | Response | Ownership verified. Access granted with HTTP `200 OK` / rendered page content. | Access Complete |
| **8b** | **NO (Denied)** | Security Response | Ownership check failed. Access denied with HTTP `403 Forbidden` response. | Request Terminated |

---

## Authorization Guard Comparison

| Context Guard | Target Context | Unauthenticated Handling | Access Granted Return |
| :--- | :--- | :--- | :--- |
| **`requireUser()`** | Server Components & Page Routes | Redirects browser to `/login` | Returns verified `User` object |
| **`requireApiUser()`** | Next.js API Route Handlers | Returns `{ user: null, response: 401 JSON }` | Returns `{ user: User, response: null }` |

---

## Security Principles & Rules

1. **Explicit Ownership Boundaries**: Every resource query must include an ownership check against `currentUserId` to prevent cross-tenant data leaks.
2. **Context-Specific Guarding**: Server Components utilize redirecting guards (`requireUser`), while API routes utilize JSON response guards (`requireApiUser`).
3. **Fail-Closed Access**: If an ownership check fails or the resource does not belong to the requesting user, the system immediately returns `403 Forbidden`.
