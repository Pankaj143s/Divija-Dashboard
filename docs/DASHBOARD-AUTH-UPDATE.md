# Dashboard Auth Update — Username + Password Login

## What Changed

The admin login was upgraded from a single-secret password-only system to a proper
username + password system with a dedicated session signing secret.

Previously, `ADMIN_SECRET` was used for both:
1. Checking the entered password (credential verification)
2. Signing the HMAC session cookie (session token integrity)

This dual-use is a security anti-pattern. If the password is ever seen (e.g. over
a shoulder, in a screenshot), it would also allow forging session tokens.

---

## Files Changed

| File | What changed |
|------|-------------|
| `lib/admin-auth.ts` | Replaced `getSecret()` + `verifyPassword()` with `getSessionSecret()` + `verifyCredentials(username, password)`. Session signing now uses `SESSION_SECRET`; credential check uses `ADMIN_USERNAME` + `ADMIN_PASSWORD`. |
| `app/api/admin/login/route.ts` | Accepts `{ username, password }` instead of `{ password }`. Added in-memory IP-based rate limiter (max 5 failures per 15 min). All error messages are generic ("Invalid credentials"). |
| `app/login/page.tsx` | Added username field above the password field. Sends both fields to the login API. |

**Files NOT changed:** `middleware.ts`, `app/api/admin/logout/route.ts`, all dashboard pages, all donor/receipt logic.

---

## New Environment Variables Required

Add these to your `.env.local` (local) and to your deployment environment (Vercel, etc.):

```env
# Admin credentials — used only for login verification
ADMIN_USERNAME=your_chosen_username
ADMIN_PASSWORD=your_chosen_password

# Session signing secret — used only for HMAC cookie signing
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=your_random_32_plus_char_string
```

### Old variable to remove

```env
# REMOVE THIS — no longer used
ADMIN_SECRET=...
```

`ADMIN_SECRET` is safe to delete from all environments once the three new vars are in place.

---

## How Login Works Now

1. User enters username + password in the login form at `/login`
2. Form POSTs `{ username, password }` to `/api/admin/login`
3. Server checks the IP against the in-memory rate limiter (max 5 failures / 15 min)
4. Server compares both fields against `ADMIN_USERNAME` and `ADMIN_PASSWORD` using
   constant-time comparison (prevents timing attacks)
5. On success: an HMAC-SHA256 session token is generated using `SESSION_SECRET` and
   stored as an `httpOnly` cookie (`divija_admin_session`)
6. On failure: returns `"Invalid credentials"` — same message whether username or
   password is wrong (no information leakage)
7. Middleware at `/dashboard/*` reads and verifies the cookie on every request.
   Invalid or missing cookie → redirect to `/login`

---

## Session / Cookie Security

| Property | Value | Why |
|----------|-------|-----|
| `httpOnly` | `true` | Cookie cannot be read by JavaScript — protects against XSS |
| `secure` | `true` in production | Cookie only sent over HTTPS |
| `sameSite` | `lax` | Blocks cross-site POST request cookie inclusion |
| `maxAge` | 24 hours | Session expires automatically |
| Signing | HMAC-SHA256 with `SESSION_SECRET` | Cookie cannot be forged without the secret |

**Session invalidation:** Rotating `SESSION_SECRET` in your deployment environment
immediately invalidates all active sessions. Use this if you ever need to force a
logout of all sessions (e.g. suspected compromise).

---

## Rate Limiting

The login endpoint uses a lightweight in-memory rate limiter:
- **Limit:** 5 failed attempts per IP address
- **Window:** 15 minutes (resets per window, not rolling)
- **Response on breach:** HTTP 429 with "Too many login attempts. Please try again later."
- **Resets on:** Successful login, or after the 15-minute window expires

> **Note:** This limiter resets on server restart and is per-process. It is appropriate
> for an internal dashboard. If you later run multiple server instances, consider a
> Redis-backed rate limiter.

---

## Deployment Checklist

Before deploying to production, add these env vars to your host (e.g. Vercel):

- [ ] `ADMIN_USERNAME` — choose a non-obvious username (not "admin")
- [ ] `ADMIN_PASSWORD` — use a strong password (16+ chars, mixed case, symbols)
- [ ] `SESSION_SECRET` — generate with:
      `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- [ ] Remove `ADMIN_SECRET` from all environments
- [ ] Confirm `NODE_ENV=production` is set so the `secure` cookie flag activates
- [ ] Test login → dashboard → logout cycle after deploying
