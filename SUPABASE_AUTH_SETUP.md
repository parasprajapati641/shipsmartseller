# Supabase Authentication Configuration Guide

To ensure all authentication flows (Signup, Login, Verification, Password Reset, OAuth, and Magic Links) redirect strictly to **https://shipsmartseller.vercel.app** without any fallback to old domains or external platforms, perform the following setup in your [Supabase Dashboard](https://supabase.com/dashboard).

---

## 1. Authentication URL Configuration

Go to: **Supabase Dashboard -> Authentication -> URL Configuration**

### Site URL

Set the primary site URL to:

```text
https://shipsmartseller.vercel.app
```

### Redirect URLs

Add the following URLs to the **Redirect URLs** whitelist:

```text
https://shipsmartseller.vercel.app/auth/callback
https://shipsmartseller.vercel.app/auth/confirm
https://shipsmartseller.vercel.app/reset-password
https://shipsmartseller.vercel.app/*
http://localhost:3000/auth/callback
http://localhost:5173/auth/callback
```

> **Note:** Delete any legacy redirect URLs referencing `lovable.dev`, `lovable.app`, or temporary staging domains.

---

## 2. Email Templates Configuration

Go to: **Supabase Dashboard -> Authentication -> Email Templates**

### A. Confirm Email (Signup Verification)

Ensure the action button or link in your **Confirm Signup** template points to:

```html
<a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email">Verify Email</a>
```

_Alternatively, using Supabase default redirect variable:_

```html
<a href="{{ .ConfirmationURL }}">Verify Email</a>
```

### B. Reset Password

Ensure the action button or link in your **Reset Password** template points to:

```html
<a
  href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password"
  >Reset Password</a
>
```

_Alternatively, using Supabase default redirect variable:_

```html
<a href="{{ .ConfirmationURL }}">Reset Password</a>
```

---

## 3. Session & Security Settings

Go to: **Supabase Dashboard -> Authentication -> Provider Settings / Sessions**

- **JWT Expiry:** 3600 seconds (1 hour) default.
- **Refresh Tokens:** Enable Auto Refresh Tokens.
- **PKCE Flow:** Enabled (handled automatically by `@supabase/supabase-js` and `/auth/callback`).

---

## 4. Verification Check matrix

| Flow                               | Operational Behavior                       | Target Redirect URL                                                     |
| :--------------------------------- | :----------------------------------------- | :---------------------------------------------------------------------- |
| **Signup (Verification Disabled)** | Instant registration & login               | `https://shipsmartseller.vercel.app/dashboard`                          |
| **Signup (Verification Enabled)**  | Email dispatched with callback link        | `https://shipsmartseller.vercel.app/auth/callback` -> `/dashboard`      |
| **Password Reset**                 | Reset email dispatched with recovery token | `https://shipsmartseller.vercel.app/auth/callback` -> `/reset-password` |
| **Sign Out**                       | State cleared immediately                  | `https://shipsmartseller.vercel.app/`                                   |
