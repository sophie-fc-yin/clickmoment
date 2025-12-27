# Deployment Guide

## Environment Variables and Cloud Run URLs

### How API URLs Work

This frontend application uses environment variables to configure the backend API URL. The URL is injected into the HTML at **build time** by the `build.js` script.

### Cloud Run URL Management

**Important**: Cloud Run service URLs are **stable** once deployed. They follow this pattern:
```
https://SERVICE-NAME-PROJECT-HASH.REGION.run.app
```

The URL only changes if you:
- Delete and recreate the service
- Deploy to a different region
- Create a new service

### Setting Up Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add these variables:

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_KEY=your-anon-key
   EXPO_PUBLIC_API_BASE_URL=https://your-service-hash.region.run.app
   ```

4. **Redeploy** your frontend after adding/updating variables

### When Your Cloud Run URL Changes

If you need to update the API URL (e.g., you deployed a new Cloud Run service):

1. Get your new Cloud Run service URL from Google Cloud Console
2. Go to Vercel → Settings → Environment Variables
3. Update `EXPO_PUBLIC_API_BASE_URL` with the new URL
4. Trigger a new deployment (push to GitHub or manually redeploy)

**The build script will automatically inject the new URL into your frontend during the build process.**

### Multiple Environments

If you have multiple environments (dev, staging, prod) with different Cloud Run services:

- Set different `EXPO_PUBLIC_API_BASE_URL` values for each environment in Vercel
- Vercel will use the appropriate value based on which branch/environment you're deploying

### Testing Locally

For local development, you can:

1. **Option 1**: Set environment variables before running the build:
   ```bash
   EXPO_PUBLIC_API_BASE_URL=https://your-api.run.app node build.js
   ```

2. **Option 2**: Create a `config.js` file (gitignored) that sets `window.API_BASE_URL` directly

### Why Build-Time Injection?

- Environment variables are injected at **build time**, not runtime
- This means the URL is baked into the HTML during deployment
- You must redeploy when the URL changes
- This approach works well with Vercel's static site hosting

### Troubleshooting

**Error: "API_BASE_URL is not configured"**
- Check that `EXPO_PUBLIC_API_BASE_URL` is set in Vercel
- Verify the build logs show the variable being injected
- Make sure you've redeployed after setting the variable

**Error: "Failed to fetch"**
- Verify your Cloud Run service URL is correct
- Check that your Cloud Run service is running and accessible
- Verify CORS is configured on your backend to allow requests from your Vercel domain

