# FastAPI CORS Configuration

Your Cloud Run backend needs CORS configured in the **FastAPI application code**, not in Cloud Run settings or Secrets Manager.

## Solution: Add CORS Middleware to Your FastAPI Backend

Add this to your FastAPI application (usually in `main.py` or `app.py`):

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Add CORS middleware - THIS IS WHAT'S MISSING
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://clickmoment.vercel.app",  # Your Vercel frontend
        "http://localhost:3000",            # Local development
        "http://localhost:8080",            # Alternative local port
        # Add any other origins you need
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# Your existing endpoints...
@app.post("/thumbnails/generate")
async def generate_thumbnail(...):
    # Your endpoint code
    pass
```

## Why This Works (Like OpenAI/Gemini APIs)

OpenAI and Gemini APIs work from browsers because they:
1. **Set CORS headers** in their application code
2. **Allow requests from any origin** (or specific origins)
3. **Handle OPTIONS preflight requests**

Your FastAPI backend needs to do the same thing - configure CORS in the application code, not in infrastructure settings.

## Steps to Fix

1. **Find your FastAPI backend code** (the service deployed to Cloud Run)
2. **Add the CORS middleware** as shown above
3. **Update `allow_origins`** with your actual frontend URL(s)
4. **Redeploy your Cloud Run service**

## Alternative: Use Vercel Proxy (Already Implemented)

I've also created a Vercel proxy at `/api/thumbnails/generate` that forwards requests to your backend. This avoids CORS entirely, but has timeout limitations (Vercel functions max out at 300s on Pro plan).

The proxy is already set up and the frontend code has been updated to use it. However, for long-running analysis (5-10 minutes), you'll need to either:
- Configure CORS on FastAPI backend (recommended)
- Implement polling/streaming for the proxy approach



