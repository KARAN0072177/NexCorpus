# Auth Onboarding Flow

This document details the identity lifecycle, authentication process, database verification, and username onboarding flow for NexCorpus.

---

## Overview

The authentication and onboarding pipeline manages user sign-in via Google OAuth, establishes database identities, and enforces username selection for new users before granting access to the main workspace.

---

## Flow Execution Steps

| Step | Component / Action | Description | Next Step |
| :--- | :--- | :--- | :--- |
| **1** | **Google** | User initiates authentication using Google OAuth 2.0. | `Auth.js / OIDC` |
| **2** | **Auth.js / OIDC** | Handled securely via Auth.js (OpenID Connect protocol). | `Authenticated` |
| **3** | **Authenticated** | Google verifies token claims and returns user identity (email, Google ID, name, avatar). | `Find NexCorpus User` |
| **4** | **Find NexCorpus User** | Queries database for an existing user record matching `googleId`. | Branch decision based on record existence |
| **5a** | **EXISTS** | Existing user found in database. User proceeds to sign in. | User session established |
| **5b** | **DOESN'T EXIST** | New user identity created in database with Google profile data. | `Username required?` |
| **6** | **Username required?** | Evaluates whether the user profile has a configured `@username`. | Decision evaluation (YES / NO) |
| **7a** | **YES** | Username is missing. User is redirected to `/set-username`. | `Username setup` |
| **7b** | **NO** | Username is already set. User state transitions to `Ready`. | `Ready` (Workspace access granted) |

---

## Key Rules & Constraints

1. **Identity Isolation**: Each Google account maps uniquely to a single NexCorpus user record via `googleId`.
2. **Onboarding Gate**: Users without a configured username cannot access workspace routes (`/`) until completing onboarding at `/set-username`.
3. **Session Persistence**: Authentication session tokens include `userId` and `username` to enable instant route protection.
