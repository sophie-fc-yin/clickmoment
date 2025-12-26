# ClickMoment Web

Frontend-only web application for video analysis, deployed on Vercel.

## Features

- Supabase authentication (Google OAuth)
- Video upload to Google Cloud Storage via signed URLs
- Video analysis via FastAPI backend
- JSON response display

## Setup

### Environment Variables

**Runtime Environment Variable Injection**: This project uses a minimal API route (`api/config.js`) to securely serve environment variables at runtime. This is necessary because Vercel static sites cannot access environment variables directly, and build-time injection wasn't working reliably.

**Required Variables** (set in Vercel dashboard):
- `SUPABASE_URL` or `EXPO_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` or `EXPO_PUBLIC_SUPABASE_KEY` - Your Supabase anonymous key (safe to expose - protected by RLS)
- `API_BASE_URL` or `EXPO_PUBLIC_API_BASE_URL` - Your FastAPI backend URL (e.g., `https://your-api-123456.run.app`)

**Note**: 
- The Supabase `ANON_KEY` is designed to be public. Security is handled by Supabase's Row Level Security (RLS) policies, not by hiding the key.
- `API_BASE_URL` is optional for authentication, but required for video upload and analysis functionality.
- The build script supports both standard and `EXPO_PUBLIC_` prefixed variable names for compatibility.

### Local Development

1. Clone the repository
2. Serve the files using a local server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve .

# Using PHP
php -S localhost:8000
```

3. Open `http://localhost:8000` in your browser

**Note**: For local development, you can either:
1. Run `node build.js` before serving (requires env vars set)
2. Create a `config.js` file (see `config.example.js`) - this file is gitignored

### Deployment

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

## Architecture

- **index.html** - Main HTML structure (env vars injected at build time)
- **main.js** - Application logic (auth, upload, analysis)
- **supabase.js** - Supabase client initialization
- **style.css** - Minimal styling
- **api/config.js** - Minimal API route that serves environment variables (required for Vercel static sites)
- **vercel.json** - Vercel configuration (static site with build step)

## API Endpoints Required

The backend FastAPI service must expose:

- `POST /get-upload-url` - Returns `{ signed_url, gcs_path }`
- `POST /analyze` - Accepts `{ gcs_path }`, returns analysis JSON

Both endpoints should accept `Authorization: Bearer <token>` header for Supabase auth.
