# Backend Endpoint: `/refresh-frame-urls`

## Status: ⚠️ **MISMATCH** - Backend exists but doesn't match frontend expectations

The frontend expects a `/refresh-frame-urls` endpoint that accepts `frame_paths` and returns `signed_urls`, but your backend endpoint expects `project_id` and returns full project data.

## The Problem

**Your Backend Endpoint:**
- Expects: `{ "project_id": "uuid" }`
- Returns: `{ "project_id": "uuid", "data": {...full analysis...} }`
- Loads entire project from GCS and refreshes URLs in the data structure

**Frontend Needs:**
- Sends: `{ "frame_paths": ["bucket/path1.jpg", "bucket/path2.jpg"] }`
- Expects: `{ "signed_urls": ["https://...", "https://..."] }`
- Already has analysis data from Supabase, just needs fresh signed URLs for specific frames

## Solution Options

### Option 1: Modify Backend to Support Frontend Format (Recommended)

Add support for the `frame_paths` format to your existing endpoint. You can either:
1. **Support both formats** (check which field is present)
2. **Create a separate endpoint** like `/refresh-frame-urls-simple` for the frontend use case

### Option 2: Modify Frontend to Use Backend Format

Less efficient since it would require loading full project data from GCS when we already have it from Supabase.

## Frontend Request Format

**Endpoint:** `POST /refresh-frame-urls`  
**Headers:**
- `Content-Type: application/json`
- `Authorization: Bearer <supabase_access_token>` (optional, forwarded from frontend)

**Request Body:**
```json
{
  "frame_paths": [
    "clickmoment-prod-assets/projects/user123/project456/frame_0122051ms.jpg",
    "clickmoment-prod-assets/projects/user123/project456/frame_0456234ms.jpg",
    "clickmoment-prod-assets/projects/user123/project456/frame_0789123ms.jpg"
  ]
}
```

**Note:** Frame paths are GCS bucket paths (without `gs://` prefix), e.g., `bucket-name/path/to/file.jpg`

## Expected Response Format

**Success Response (200 OK):**
```json
{
  "signed_urls": [
    "https://storage.googleapis.com/bucket/path/to/file.jpg?X-Goog-Algorithm=...&X-Goog-Signature=...",
    "https://storage.googleapis.com/bucket/path/to/file2.jpg?X-Goog-Algorithm=...&X-Goog-Signature=...",
    "https://storage.googleapis.com/bucket/path/to/file3.jpg?X-Goog-Algorithm=...&X-Goog-Signature=..."
  ]
}
```

**Important:** 
- The `signed_urls` array must be in the **same order** as the `frame_paths` array
- Each signed URL should be valid for at least 1 hour (or longer)
- Signed URLs should allow GET requests for reading the image files

## Recommended Backend Implementation

Modify your existing endpoint to support both formats, or add a simple version:

```python
from fastapi import FastAPI, HTTPException
from google.cloud import storage
from datetime import timedelta
from typing import Optional, List
from pydantic import BaseModel

app = FastAPI()
storage_client = storage.Client()

# Request models
class RefreshFramePathsRequest(BaseModel):
    frame_paths: List[str]

class RefreshFrameUrlsResponse(BaseModel):
    signed_urls: List[str]

@app.post("/refresh-frame-urls", response_model=RefreshFrameUrlsResponse)
async def refresh_frame_urls(request: RefreshFramePathsRequest):
    """
    Refresh signed URLs for frame images.
    
    Accepts a list of GCS paths and returns signed URLs in the same order.
    
    Request body:
    {
        "frame_paths": ["bucket/path/to/file1.jpg", "bucket/path/to/file2.jpg", ...]
    }
    
    Returns:
    {
        "signed_urls": ["https://...", "https://...", ...]
    }
    """
    frame_paths = request.frame_paths
    
    if not frame_paths:
        raise HTTPException(status_code=400, detail="frame_paths is required and cannot be empty")
    
    signed_urls = []
    bucket_name = os.getenv("GCS_BUCKET_NAME", "clickmoment-prod-assets")
    
    try:
        bucket = storage_client.bucket(bucket_name)
        
        for frame_path in frame_paths:
            # Handle paths that might include bucket name or not
            # Paths come as: "bucket-name/path/to/file.jpg" or "path/to/file.jpg"
            if "/" in frame_path:
                # Check if it starts with bucket name
                parts = frame_path.split("/", 1)
                if parts[0] == bucket_name:
                    blob_path = parts[1]  # Remove bucket name prefix
                else:
                    # Assume full path includes bucket: "bucket/path/to/file"
                    blob_path = frame_path
            else:
                blob_path = frame_path
            
            blob = bucket.blob(blob_path)
            
            # Check if blob exists
            if not blob.exists():
                logger.warning(f"Frame not found: {blob_path}")
                signed_urls.append("")  # Empty string to maintain order
                continue
            
            # Generate signed URL valid for 1 hour
            signed_url = blob.generate_signed_url(
                version="v4",
                expiration=timedelta(hours=1),
                method="GET"
            )
            
            signed_urls.append(signed_url)
        
        return RefreshFrameUrlsResponse(signed_urls=signed_urls)
        
    except Exception as e:
        logger.error(f"Error generating signed URLs: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Error generating signed URLs: {str(e)}"
        )
```

### Alternative: Support Both Formats in One Endpoint

```python
from typing import Union
from pydantic import BaseModel

class RefreshFramePathsRequest(BaseModel):
    frame_paths: Optional[List[str]] = None

class RefreshProjectRequest(BaseModel):
    project_id: Optional[str] = None

@app.post("/refresh-frame-urls")
async def refresh_frame_urls(
    request: Union[RefreshFramePathsRequest, RefreshProjectRequest]
):
    # Check which format was sent
    if hasattr(request, 'frame_paths') and request.frame_paths:
        # Frontend format: refresh specific frame paths
        return refresh_frame_paths(request.frame_paths)
    elif hasattr(request, 'project_id') and request.project_id:
        # Backend format: refresh entire project
        return refresh_project_data(request.project_id)
    else:
        raise HTTPException(status_code=400, detail="Either frame_paths or project_id required")
```

## Current Behavior

- **Frontend:** Gracefully handles 404 by using existing URLs (no breaking error)
- **Console:** Shows warning: `Refresh frame URLs endpoint returned 404, using existing URLs`
- **Impact:** Frame images may fail to load if their signed URLs have expired

## Why This Endpoint is Needed

1. **Signed URL Expiration:** GCS signed URLs expire after a set time (typically 1 hour)
2. **Reloading from Database:** When users reload a project, frame URLs stored in Supabase may have expired
3. **Refresh on Demand:** This endpoint allows the frontend to refresh expired URLs without re-running analysis

## Testing

Once implemented, test with:

```bash
curl -X POST https://your-backend-url/refresh-frame-urls \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "frame_paths": [
      "clickmoment-prod-assets/projects/test/frame_test.jpg"
    ]
  }'
```

Expected response:
```json
{
  "signed_urls": [
    "https://storage.googleapis.com/clickmoment-prod-assets/projects/test/frame_test.jpg?X-Goog-Algorithm=..."
  ]
}
```

