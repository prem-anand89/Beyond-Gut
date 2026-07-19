# Clerk Frontend Integration Guide

This guide shows how to integrate Clerk authentication into the Enterro360 frontend and wire visit syncing to the backend API.

## Overview

Two integration approaches:

### Option A: Minimal Auth + Keep localStorage (Recommended for MVP)
- Add Clerk sign-in/sign-out buttons to the existing app
- Keep visits in browser localStorage (no backend sync)
- Faster to implement, works offline
- Best for: Small clinics testing the tool

### Option B: Full SaaS with Backend Sync (Recommended for production)
- Add Clerk authentication
- Sync all visits to PostgreSQL backend
- Multi-clinic data isolation
- Best for: Production deployments with multiple clinics

## Option A: Minimal Auth (5 min setup)

### 1. Add Clerk SDK to index.html

Find the opening `<head>` tag in `index.html` and add:

```html
<!-- Clerk SDK -->
<script async crossorigin="anonymous" src="https://cdn.clerk.com/npm/@clerk/clerk-js@latest/dist/clerk.browser.min.js"></script>
<script>
  window.addEventListener("load", async function () {
    await Clerk.load({
      publishableKey: "YOUR_CLERK_PUBLISHABLE_KEY", // Replace with your key
    });
    
    // If user is not signed in, redirect to sign-in page
    if (!Clerk.user) {
      window.location.href = "/sign-in.html";
    }
  });
</script>
```

### 2. Add Sign-Out Button to the UI

Find the app header (around line where you render the app title) and add:

```html
<button onclick="Clerk.signOut(() => window.location.href = '/sign-in.html')" style="position: absolute; top: 20px; right: 20px; padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer;">
  Sign Out
</button>
```

### 3. Set Your Clerk Publishable Key

In the Clerk Dashboard:
1. Go to **Developers** > **API Keys**
2. Copy your **Publishable Key**
3. Paste it into the `publishableKey` field above (replace `YOUR_CLERK_PUBLISHABLE_KEY`)

### 4. Test Locally

```bash
npm run dev
```

Then visit http://localhost:3000 — you should be redirected to `sign-in.html` if not signed in.

---

## Option B: Full Backend Sync (Production-ready)

This approach stores all visits in PostgreSQL and syncs them across devices.

### Step 1: Create an Auth Module

Save this as `frontend-auth.js`:

```javascript
/**
 * Clerk Auth Module
 * Handles authentication and API syncing for Enterro360
 */

class EnterroAuth {
  constructor() {
    this.user = null;
    this.isInitialized = false;
  }

  /**
   * Initialize Clerk and check auth status
   */
  async init() {
    if (this.isInitialized) return;

    // Load Clerk SDK
    await this.loadClerkSDK();

    // Wait for Clerk to load
    await window.Clerk.load({
      publishableKey: this.getPublishableKey(),
    });

    this.user = window.Clerk.user;
    this.isInitialized = true;

    if (!this.user) {
      this.redirectToSignIn();
    }

    return this.user;
  }

  /**
   * Load Clerk SDK dynamically
   */
  loadClerkSDK() {
    return new Promise((resolve) => {
      if (window.Clerk) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src =
        "https://cdn.clerk.com/npm/@clerk/clerk-js@latest/dist/clerk.browser.min.js";
      script.async = true;
      script.crossOrigin = "anonymous";
      script.onload = resolve;
      document.head.appendChild(script);
    });
  }

  /**
   * Get publishable key from environment or hardcoded
   */
  getPublishableKey() {
    // In production, this should come from your environment
    return window.CLERK_PUBLISHABLE_KEY || "your_key_here";
  }

  /**
   * Sign out the user
   */
  async signOut() {
    await window.Clerk.signOut();
    window.location.href = "/sign-in.html";
  }

  /**
   * Get current user's auth token
   */
  async getToken() {
    const session = window.Clerk.session;
    if (!session) return null;
    return await session.getToken();
  }

  /**
   * API: Save a visit to the backend
   */
  async saveVisit(visitData) {
    const token = await this.getToken();
    if (!token) throw new Error("Not authenticated");

    const response = await fetch("/api/visits", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(visitData),
    });

    if (!response.ok) {
      throw new Error(`Failed to save visit: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * API: Get all visits for the current user
   */
  async getVisits() {
    const token = await this.getToken();
    if (!token) throw new Error("Not authenticated");

    const response = await fetch("/api/visits", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get visits: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * API: Get a single visit
   */
  async getVisit(visitId) {
    const token = await this.getToken();
    if (!token) throw new Error("Not authenticated");

    const response = await fetch(`/api/visits/${visitId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get visit: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * API: Update a visit
   */
  async updateVisit(visitId, visitData) {
    const token = await this.getToken();
    if (!token) throw new Error("Not authenticated");

    const response = await fetch(`/api/visits/${visitId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(visitData),
    });

    if (!response.ok) {
      throw new Error(`Failed to update visit: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * API: Delete a visit
   */
  async deleteVisit(visitId) {
    const token = await this.getToken();
    if (!token) throw new Error("Not authenticated");

    const response = await fetch(`/api/visits/${visitId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete visit: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Redirect to sign-in page
   */
  redirectToSignIn() {
    window.location.href = "/sign-in.html";
  }
}

// Export for use in index.html
const enterroAuth = new EnterroAuth();
```

### Step 2: Integrate into index.html

Add this to the `<head>` section:

```html
<!-- Clerk SDK -->
<script async crossorigin="anonymous" src="https://cdn.clerk.com/npm/@clerk/clerk-js@latest/dist/clerk.browser.min.js"></script>

<!-- Auth Module -->
<script>
  // Publish Clerk key to window (replace with your key)
  window.CLERK_PUBLISHABLE_KEY = "YOUR_CLERK_PUBLISHABLE_KEY";
</script>
<script src="/frontend-auth.js"></script>

<!-- Initialize auth -->
<script>
  document.addEventListener("DOMContentLoaded", async () => {
    try {
      await enterroAuth.init();
      console.log("✓ Auth initialized:", enterroAuth.user.emailAddresses[0].emailAddress);
    } catch (err) {
      console.error("Auth init failed:", err);
      enterroAuth.redirectToSignIn();
    }
  });
</script>
```

### Step 3: Update Save/Load Logic

In the existing `saveVisit()` function (around line ~3700), replace localStorage with API call:

**Before (localStorage):**
```javascript
function saveVisit() {
  const sv = currentVisit();
  localStorage.setItem(
    `gshs-visit-${session.id}`,
    JSON.stringify(sv)
  );
}
```

**After (Backend API):**
```javascript
async function saveVisit() {
  const sv = currentVisit();
  try {
    const result = await enterroAuth.saveVisit({
      patientName: session.patientName,
      answers: sv.answers,
      extras: sv.extras,
      scoreSnapshot: sv.scoreSnapshot,
    });
    console.log("✓ Visit saved:", result.id);
    return result.id;
  } catch (err) {
    console.error("Failed to save visit:", err);
    alert("Could not save visit. Check your internet connection.");
  }
}
```

Similarly for load:

**Before (localStorage):**
```javascript
function loadVisit(visitId) {
  const stored = localStorage.getItem(`gshs-visit-${visitId}`);
  if (!stored) return null;
  return JSON.parse(stored);
}
```

**After (Backend API):**
```javascript
async function loadVisit(visitId) {
  try {
    const visit = await enterroAuth.getVisit(visitId);
    return visit;
  } catch (err) {
    console.error("Failed to load visit:", err);
    return null;
  }
}
```

### Step 4: Add Sign-Out Button to Header

Add this to your UI header:

```html
<button onclick="enterroAuth.signOut()" style="position: absolute; top: 20px; right: 20px; padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer;">
  Sign Out
</button>

<div style="position: absolute; top: 20px; right: 150px; font-size: 14px; color: #666;">
  Signed in as: <span id="user-email"></span>
</div>

<script>
  // Display user email
  if (enterroAuth.user) {
    document.getElementById("user-email").textContent = enterroAuth.user.emailAddresses[0].emailAddress;
  }
</script>
```

---

## Which Option to Choose?

| Aspect | Option A | Option B |
|--------|----------|----------|
| **Setup Time** | 5 minutes | 30 minutes |
| **Offline Support** | ✅ Works offline | ❌ Requires internet |
| **Multi-Device Sync** | ❌ No | ✅ Yes (cloud-synced) |
| **Multi-Clinic** | ❌ No | ✅ Yes (isolated per clinic) |
| **Data Persistence** | Browser only | PostgreSQL (persistent) |
| **Best For** | MVP, testing | Production, SaaS |

**Recommendation:** Start with **Option A** for quick testing, then migrate to **Option B** for production deployment.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Publishable key is not set" | Make sure you've replaced `YOUR_CLERK_PUBLISHABLE_KEY` with your actual key |
| 401 errors on API calls | Check that `CLERK_SECRET_KEY` is set in Railway environment variables |
| Sign-in redirects infinitely | Make sure Clerk project is set up and publishable key matches |
| Visits not saving | Check browser console for errors and verify API endpoint is working |

---

## Next Steps

1. Choose Option A or B above
2. Follow the setup steps for your chosen option
3. Test locally: `npm run dev`
4. Deploy to Railway
5. Monitor logs for any issues

Once auth is working, you can add:
- Clinic dashboard (list all visits)
- Role-based access (admin, clinician, user)
- Multi-clinic support UI
- Visit history and trends
