# ClickMoment Web

Frontend-only web application for video analysis, deployed on Vercel.

## Features

- Supabase authentication (Google OAuth)
- Video upload to Google Cloud Storage via signed URLs
- Video analysis via FastAPI backend
- JSON response display

## Setup

### Environment Variables

Configure these in Vercel dashboard:

- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `VITE_API_BASE_URL` - Your FastAPI backend URL (e.g., `https://your-api.run.app`)

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

**Note**: For local development with ES modules, you may need to set environment variables in your browser. You can create a `config.js` file:

```javascript
window.SUPABASE_URL = 'your-supabase-url';
window.SUPABASE_ANON_KEY = 'your-anon-key';
window.API_BASE_URL = 'your-api-url';
```

Then include it in `index.html` before other scripts.

### Deployment

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

## Architecture

- **index.html** - Main HTML structure
- **main.js** - Application logic (auth, upload, analysis)
- **supabase.js** - Supabase client initialization
- **style.css** - Minimal styling
- **vercel.json** - Vercel configuration (static site)

## API Endpoints Required

The backend FastAPI service must expose:

- `POST /get-upload-url` - Returns `{ signed_url, gcs_path }`
- `POST /analyze` - Accepts `{ gcs_path }`, returns analysis JSON

Both endpoints should accept `Authorization: Bearer <token>` header for Supabase auth.
