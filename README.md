# ClickMoment Web

Frontend-only web application for video analysis, deployed on Vercel.

## Features

- Supabase authentication (Google OAuth)
- Video upload to Google Cloud Storage via signed URLs
- Video analysis via FastAPI backend
- JSON response display

## Setup

### Database Setup

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `database-schema.sql`
4. Run the SQL script to create the required tables:
   - `channel_profiles` - Stores user channel/profile information
   - `projects` - Stores projects with Target settings
   - `analyses` - Stores analysis results for each project
5. The script also sets up Row Level Security (RLS) policies to ensure users can only access their own data

### Environment Variables

**Runtime Variable Loading**: This project loads environment variables at runtime from `/api/config.js`, a Vercel serverless function. This means you can update environment variables in Vercel without needing to rebuild or redeploy!

**Required Variables** (set in Vercel dashboard):
- `SUPABASE_URL` or `EXPO_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` or `EXPO_PUBLIC_SUPABASE_KEY` - Your Supabase anonymous key (safe to expose - protected by RLS)
- `API_BASE_URL` or `EXPO_PUBLIC_API_BASE_URL` - Your Cloud Run backend URL (e.g., `https://your-service-hash.region.run.app`)

**Note**: 
- The Supabase `ANON_KEY` is designed to be public. Security is handled by Supabase's Row Level Security (RLS) policies, not by hiding the key.
- `API_BASE_URL` is required for video upload and analysis functionality.
- **Update without rebuild**: Simply update the environment variable in Vercel → Settings → Environment Variables, and the change takes effect immediately (no redeploy needed)!
- The `/api/config.js` endpoint serves these variables at runtime from Vercel's environment.

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
- **main.js** - Application logic (auth, upload, analysis, routing)
- **supabase.js** - Supabase client initialization
- **projects.js** - Project management using Supabase
- **profile.js** - Profile/channel management using Supabase
- **style.css** - Styling
- **database-schema.sql** - SQL schema for Supabase tables
- **build.js** - Build script that injects environment variables
- **vercel.json** - Vercel configuration (static site with build step)

## Data Models

### Channel Profile
- `stage` - Channel growth stage (new/starter, growing, established, large/mainstream)
- `subscriber_count` - Approximate subscriber count
- `content_niche` - Primary content category
- `upload_frequency` - How often content is published
- `growth_goal` - Primary growth objective

### Project (Target Settings)
- `name` - Project name
- `platform` - Platform to optimize for (youtube, shorts, reels, tiktok)
- `optimization` - Primary KPI to optimize for (CTR, retention, etc.)
- `audience_profile` - Target audience description

### Analysis
- Stores analysis results linked to projects
- Includes GCS path and result JSON

## API Endpoints Required

The backend FastAPI service must expose:

- `POST /get-upload-url` - Returns `{ signed_url, gcs_path }`
- `POST /analyze` - Accepts `{ gcs_path }`, returns analysis JSON

Both endpoints should accept `Authorization: Bearer <token>` header for Supabase auth.
