# Clerk Authentication Setup Guide for Enterro360

This guide walks you through setting up Clerk authentication and multi-clinic SaaS infrastructure for Enterro360.

## What is Clerk?

Clerk is an authentication platform that handles user signup, login, and organization management. The free tier supports up to 10k monthly active users, making it ideal for MVP SaaS applications.

## Prerequisites

1. **Clerk Account**: Sign up at [clerk.com](https://clerk.com)
2. **Railway Account**: Already set up
3. **PostgreSQL Database**: Create a new PostgreSQL database on Railway

## Step 1: Create a Clerk Application

1. Go to [clerk.com/sign-in](https://clerk.com/sign-in)
2. Create a new account or sign in
3. Create a new application:
   - Name: `Enterro360`
   - Select **Web** as the application type
   - Choose **Node.js** as the environment
4. Copy your **Publishable Key** and **Secret Key**

## Step 2: Set Up Organizations in Clerk

1. In the Clerk Dashboard, go to **Organizations**
2. Enable Organizations:
   - Click "Enable Organizations"
   - Configure roles:
     - **admin**: Full access to clinic settings
     - **clinician**: Can create and manage visits
     - **user**: Read-only access
3. Create your first test organization:
   - Go to **Organizations** > **+ New Organization**
   - Name: `Test Clinic`
   - Save

## Step 3: Set Up PostgreSQL on Railway

1. In your Railway project:
   - Click **New** > **Database** > **PostgreSQL**
   - Wait for the database to initialize
2. Copy the connection string from the PostgreSQL service details
3. The connection string will look like:
   ```
   postgresql://user:password@host:port/database
   ```

## Step 4: Configure Environment Variables on Railway

1. In your Railway project settings, add these variables:
   - `CLERK_SECRET_KEY`: Your Clerk secret key
   - `CLERK_PUBLISHABLE_KEY`: Your Clerk publishable key
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `NODE_ENV`: `production`
   - `PORT`: `3000` (Railway will override this)

2. The variables will automatically apply to your deployment

## Step 5: Deploy with Updated Code

1. Install dependencies locally (optional, for local testing):
   ```bash
   npm install
   ```

2. Test the auth flow locally:
   ```bash
   npm run dev
   ```
   Then visit http://localhost:3000

3. Push to GitHub:
   ```bash
   git add .
   git commit -m "feat: Clerk authentication and SaaS backend"
   git push origin main
   ```

4. Railway will auto-deploy. Monitor the logs in the Railway dashboard.

## Step 6: Integrate Auth into the Frontend

The frontend (index.html) needs updates to:
1. Check for Clerk session on load
2. Show a "Sign in" button if not authenticated
3. Display the user's clinic and name when signed in
4. Sync visits to the backend API instead of localStorage

A frontend auth integration module will be added next.

## Testing the Setup

Once deployed:

1. Visit your Railway deployment URL
2. You should see a **Sign In** button
3. Click to sign in with Clerk
4. After signing in, you'll see a dashboard
5. Create a test visit and save it
6. Check the PostgreSQL database to confirm data is being stored

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Make sure `CLERK_SECRET_KEY` is set in Railway environment variables |
| Database connection error | Verify `DATABASE_URL` format and PostgreSQL is running |
| CORS errors | Check that the frontend is on the same domain as the API |
| Clerk SDK not loading | Ensure `CLERK_PUBLISHABLE_KEY` is correct |

## Organization Structure

Once set up, your SaaS will have this hierarchy:

```
Clerk Application
└── Organizations (Clinics)
    └── Users (Clinicians)
        └── Visits (Patient assessments)
            └── Answers, Extras, Score Snapshots
```

Each clinic is isolated by `clerk_org_id`, so data from different organizations never crosses.

## What's Next?

1. **Clerk UI Components**: Add sign-in/sign-up pages (Clerk provides pre-built components)
2. **Frontend Auth Integration**: Modify index.html to use Clerk sessions
3. **Clinic Dashboard**: Create a page to manage clinics and see visit history
4. **API Sync**: Wire the visit save/load to use the backend API instead of localStorage
5. **Roles & Permissions**: Implement admin, clinician, and user permission levels

## Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk Express SDK](https://clerk.com/docs/references/node/clerk-express)
- [Railway PostgreSQL Guide](https://docs.railway.app/databases/postgresql)
