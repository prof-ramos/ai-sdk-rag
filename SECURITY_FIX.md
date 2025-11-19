# Security Fix: JWT_SECRET Hardcoded Fallback Vulnerability

**Severity:** 🔴 CRITICAL
**CVE:** N/A (Internal)
**Fixed in:** This commit
**Date:** 2025-11-19

---

## 🔒 Vulnerability Description

### Issue
The admin authentication system had a critical security vulnerability where `JWT_SECRET` would fall back to a hardcoded default value if the environment variable was not set:

```typescript
// VULNERABLE CODE (BEFORE):
const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "default-secret-key-change-in-production"
);
```

### Impact
**CRITICAL - Authentication Bypass**

If `JWT_SECRET` was not configured:
1. The application would silently use a publicly known default secret
2. Attackers could mint their own admin JWT tokens using the known secret
3. Complete bypass of admin authentication
4. Unauthorized access to:
   - Admin dashboard
   - User management
   - System settings
   - Chat logs (potentially sensitive data)
   - Resource management

### Attack Vector
```bash
# Attacker can create valid admin token with public secret:
import { SignJWT } from 'jose';

const SECRET = new TextEncoder().encode(
  "default-secret-key-change-in-production"
);

const token = await new SignJWT({
  adminId: "fake-id",
  username: "attacker"
})
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("24h")
  .sign(SECRET);

// Set cookie: admin-token=<token>
// Access admin dashboard with full privileges
```

---

## ✅ Fix Applied

### Changes Made

#### 1. **lib/auth.ts** - Fail-fast on missing JWT_SECRET
```typescript
// SECURE CODE (AFTER):
// Validate JWT_SECRET exists at module initialization
if (!process.env.JWT_SECRET) {
  throw new Error(
    "SECURITY ERROR: JWT_SECRET environment variable is required but not set. " +
    "The application cannot start without a secure JWT secret. " +
    "Set JWT_SECRET in your .env.local file to a cryptographically secure random string (minimum 32 characters)."
  );
}

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET);
```

#### 2. **lib/env.mjs** - Enforce JWT_SECRET at environment validation
```typescript
server: {
  // ... other vars
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters for security"),
}
```

#### 3. **.env.example** - Clear instructions for secure key generation
```bash
# Auth (OBRIGATÓRIO)
# CRÍTICO: Gere uma chave FORTE de no mínimo 32 caracteres
# Exemplo de geração: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# OU: openssl rand -base64 32
# NUNCA use a chave de exemplo abaixo em produção!
JWT_SECRET="CHANGE-THIS-TO-A-RANDOM-SECRET-MIN-32-CHARS-GENERATED-SECURELY"
```

#### 4. **README.md** - Prominent security warning
Added critical security section in installation instructions with commands to generate secure keys.

---

## 🔍 Behavior After Fix

### Application Start
- ❌ **Without JWT_SECRET:** Application fails to start with clear error message
- ❌ **JWT_SECRET < 32 chars:** Environment validation fails
- ✅ **JWT_SECRET ≥ 32 chars:** Application starts normally

### Error Messages
```
SECURITY ERROR: JWT_SECRET environment variable is required but not set.
The application cannot start without a secure JWT secret.
Set JWT_SECRET in your .env.local file to a cryptographically secure random string (minimum 32 characters).
```

---

## 🛡️ Security Best Practices Implemented

1. **Fail-fast principle:** Application refuses to start without secure configuration
2. **No silent defaults:** Never use hardcoded secrets
3. **Minimum entropy requirement:** 32 character minimum enforced
4. **Clear error messages:** Developers know exactly what to fix
5. **Secure generation examples:** Documentation provides safe methods

---

## 📋 Migration Guide

### For Existing Deployments

**IMMEDIATE ACTION REQUIRED:**

1. **Generate a secure JWT_SECRET:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

2. **Add to environment variables:**
   - Local: `.env.local`
   - Production: Deployment platform (Vercel, Railway, etc.)

3. **Restart application:**
   ```bash
   npm run dev  # or your production command
   ```

### For New Deployments

Follow the updated installation instructions in README.md. The application will not start without proper configuration.

---

## ⚠️ If You Were Affected

**If your deployment was running without a custom JWT_SECRET:**

1. **IMMEDIATE:** Set a secure JWT_SECRET and restart
2. **Revoke all admin sessions:** Clear the `admins` table or reset passwords
3. **Audit logs:** Check `chat_logs` for suspicious activity
4. **Review admin actions:** Check for unauthorized changes
5. **Rotate secrets:** Consider changing all sensitive credentials

---

## 🔒 Additional Security Recommendations

1. **Use environment-specific secrets:** Different keys for dev/staging/prod
2. **Rotate regularly:** Change JWT_SECRET periodically (requires re-login)
3. **Monitor failed auth attempts:** Add logging for suspicious patterns
4. **Enable 2FA:** Consider adding two-factor authentication
5. **Rate limiting:** Implement login attempt throttling

---

## 📊 Testing

**Verify the fix:**

```bash
# Test 1: App should fail without JWT_SECRET
unset JWT_SECRET
npm run dev
# Expected: Error thrown, app doesn't start

# Test 2: App should fail with short JWT_SECRET
export JWT_SECRET="short"
npm run dev
# Expected: Validation error

# Test 3: App should start with valid JWT_SECRET
export JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")"
npm run dev
# Expected: Success
```

---

## 🙏 Credit

**Reported by:** User (Security Review)
**Fixed by:** Claude
**Review Status:** Pending

---

## 📝 Checklist for PR Review

- [ ] Verify no hardcoded secrets remain
- [ ] Test application startup without JWT_SECRET
- [ ] Test application startup with short JWT_SECRET
- [ ] Test application startup with valid JWT_SECRET
- [ ] Verify existing admin tokens still work after restart
- [ ] Review documentation changes
- [ ] Update deployment guides
- [ ] Notify existing deployments

---

**Security is not optional. This fix prevents a critical authentication bypass vulnerability.**
