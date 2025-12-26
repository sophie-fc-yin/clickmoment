# ClickMoment Web

Frontend-only web application for video analysis, deployed on Vercel.

## Features

- Supabase authentication (Google OAuth)
- Video upload to Google Cloud Storage via signed URLs
- Video analysis via FastAPI backend
- JSON response display

## Setup

### Environment Variables

**Secure Build-Time Injection**: This project uses a minimal build script (`build.js`) that injects environment variables into the HTML at build time. This keeps secrets out of your git repository while making them available to the client-side code.

**Required Variables** (set in Vercel dashboard):
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key (safe to expose - protected by RLS)
- `API_BASE_URL` - Your FastAPI backend URL (e.g., `https://your-api.run.app`)

**Note**: The Supabase `ANON_KEY` is designed to be public. Security is handled by Supabase's Row Level Security (RLS) policies, not by hiding the key.

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
- **build.js** - Build script that injects environment variables
- **vercel.json** - Vercel configuration (static site with build step)

## API Endpoints Required

The backend FastAPI service must expose:

- `POST /get-upload-url` - Returns `{ signed_url, gcs_path }`
- `POST /analyze` - Accepts `{ gcs_path }`, returns analysis JSON

Both endpoints should accept `Authorization: Bearer <token>` header for Supabase auth.
