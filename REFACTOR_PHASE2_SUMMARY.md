# Phase 2 Refactor: Video Selection & Timeline Integration

## Overview
Enhanced the project detail page to implement a linear video selection flow with timeline markers that connect verdict cards to specific video moments. This maintains the Phase 1 decision relief focus while adding crucial video context.

---

## Core Flow Implementation

### **The Rule: One Project = One Video (Forever)**
```
if (project.video_path === null):
    → Show video selection UI
else:
    → Video is locked, show analysis/results only
```

Once a video is selected and `video_path` is saved, it **cannot be changed**. Want a different video? Create a new project.

---

## 1. Video Selection UI (State 1: No Video)

### **New Section: Choose Video**
**Location:** Replaces old upload section when `video_path` is null

**Components:**
- **"Upload New Video" button** - Primary action with upload icon
- **"OR" divider** - Clear visual separation
- **"Choose from Library" button** - Secondary action (placeholder for future)
- **Hidden file input** - Triggered by "Upload New Video" click

**Styling:**
- Centered layout with flex gap
- Icon + text buttons for clarity
- Consistent with overall design system
- Responsive: stacks vertically on mobile

**User Experience:**
- Clear choice between two paths
- No ambiguity about what happens next
- Library option shows "coming soon" alert for now

---

## 2. Upload Progress (State 2: Uploading)

### **New Section: Upload Progress**
**Appears:** Immediately after file selected, replaces selection UI

**Components:**
- Progress text with percentage and MB uploaded
- Animated progress bar (0-100%)
- Status updates: "Uploading...", "Upload complete!", "Analyzing..."

**Technical Implementation:**
```javascript
// XMLHttpRequest for granular progress tracking
xhr.upload.addEventListener('progress', (e) => {
  const percentComplete = (e.loaded / e.total) * 100;
  uploadProgressBar.style.width = `${percentComplete}%`;
});
```

**States:**
1. "Requesting upload URL..." (0%)
2. "Uploading... X% (Y MB / Z MB)" (dynamic)
3. "Upload complete! Saving..." (100%)
4. "Analyzing frames..." (transitions to analysis)

---

## 3. Video Player with Timeline Markers (State 3+: Results)

### **Collapsible Video Player Section**
**Location:** Between project details toggle and decision header

**Default State:** Collapsed (▶ View video)

**When Expanded:**
- Full `<video>` element with native controls
- Custom timeline markers overlay
- Helper text: "Click timeline markers to jump to key moments"

### **Timeline Markers**
**Visual Design:**
- 🟢 **Green circle** - Safe moment
- 🟡 **Yellow circle** - Bold moment
- 🔴 **Red circle** - Avoid moment

**Positioning:**
- Calculated as `(timestamp / videoDuration) * 100%`
- Positioned absolutely on timeline track
- Hoverable with scale animation (1.3x)

**Interactive Features:**
- **Hover** → Shows tooltip with label + timestamp
- **Click** → Seeks video to that exact moment + auto-plays
- **Visual feedback** → Scales up on hover

**Technical Implementation:**
```javascript
renderTimelineMarkers(verdictMoments, videoDuration) {
  Object.entries(verdictMoments).forEach(([type, data]) => {
    const marker = createElement('div');
    marker.style.left = `${(data.timestamp / videoDuration) * 100}%`;
    marker.addEventListener('click', () => seekVideoTo(data.timestamp));
  });
}
```

---

## 4. Verdict Card Timestamp Links

### **New Component on Each Card:**
```html
<button class="verdict-timestamp-link">
  📍 0:08 View in video
</button>
```

**Styling:**
- Subtle background with border
- Monospace timestamp font
- Hover: shifts right with accent border
- Hidden by default, shown after analysis

**Behavior:**
- Click → Expands video player (if collapsed)
- Click → Seeks to timestamp + plays
- Click → Smooth scrolls to player

**User Benefit:**
- Direct connection between card and video moment
- No guessing where the frame came from
- Encourages reviewing actual footage

---

## 5. Bidirectional Sync (Cards ↔ Video)

### **Interactions:**

**From Verdict Card → Video:**
1. Click timestamp link on card
2. Video player expands (if collapsed)
3. Video seeks to exact timestamp
4. Video auto-plays
5. Smooth scroll to player

**From Video → Verdict Card:**
- Timeline marker hover → shows label
- Timeline marker color matches card color
- Visual consistency reinforces connection

**From Verdict Card Hover → Timeline (Future):**
- Hover on card → highlight corresponding marker
- *Not yet implemented, but CSS classes prepared*

---

## 6. State Management & Logic

### **On Page Load (showProjectView):**
```javascript
if (project.video_path exists):
  - Hide video selection UI
  - Show video player section
  - Load video (TODO: signed URL for playback)
  - Check for existing analysis
  - Show results if available
else:
  - Show video selection UI
  - Hide video player
  - Hide decision section
```

### **After Upload:**
```javascript
1. Hide selection UI → Show progress
2. Get signed URL from backend
3. Upload to GCS with progress tracking
4. Save video_path to project (LOCKS VIDEO)
5. Hide progress → Show "Analyzing..."
6. Show video player section
7. Trigger analysis (mock for now)
8. Show decision section with timeline markers
```

### **File Upload Flow:**
```
User clicks "Upload New" 
  → File input opens
  → User selects file
  → handleVideoUpload() called
  → Selection UI hidden
  → Progress UI shown
  → Upload to GCS
  → Save video_path (PERMANENT)
  → Show player + analysis
```

---

## 7. Mock Data Structure (For Development)

```javascript
const mockResults = {
  gcs_path: "user_uploads/...",
  verdict_moments: {
    safe: { 
      timestamp: 8.5,
      label: "Safe / Defensible"
    },
    bold: { 
      timestamp: 52.3,
      label: "High-Variance / Bold"
    },
    avoid: { 
      timestamp: 94.1,
      label: "Avoid / Common Pitfall"
    }
  },
  video_duration: 125.0
};
```

**When Backend is Ready:**
- Replace mock data with actual analysis API response
- Populate frame images in verdict cards
- Load actual video with signed URL
- Use real timestamps from frame extraction

---

## 8. Helper Functions Added

### `handleVideoUpload(file)`
- Manages entire upload flow
- Shows/hides UI sections
- Tracks progress with XHR
- Saves video_path to project
- Triggers mock analysis

### `renderTimelineMarkers(verdictMoments, videoDuration)`
- Creates DOM elements for each marker
- Calculates positioning based on duration
- Adds click handlers for seeking

### `updateVerdictCardTimestamps(verdictMoments)`
- Shows timestamp links on cards
- Sets formatted time text
- Adds click handlers

### `seekVideoTo(timestamp)`
- Expands video player if collapsed
- Sets video.currentTime
- Auto-plays video
- Smooth scrolls to player

### `formatTimestamp(seconds)`
- Converts seconds to MM:SS format
- Used for both markers and card links

---

## 9. UX Benefits

### **Clarity Through Connection**
- Visual markers show exact frame locations
- No ambiguity about where moments came from
- Encourages reviewing actual footage

### **Reduced Cognitive Load**
- Don't have to remember timestamps
- One-click access to key moments
- Video context available but not intrusive

### **Maintains Decision Focus**
- Video collapsed by default
- Decision cards remain primary focus
- Context available when needed

### **Linear, Committed Flow**
- Once video selected → locked forever
- No second-guessing or re-uploading
- Clear progression: Choose → Upload → Analyze → Decide

---

## 10. Technical Details

### **Files Modified:**
1. **index.html** - Video selection UI, player, timeline markers structure
2. **style.css** - Complete styling for new components
3. **main.js** - Upload handlers, state management, timeline logic

### **New DOM Elements:**
- `#video-selection-section` - Choose video UI
- `#upload-progress-section` - Progress bar + text
- `#video-player-section` - Collapsible player container
- `#video-timeline-markers` - Timeline overlay for markers
- `.verdict-timestamp-link` - Click-to-seek links on cards

### **New CSS Classes:**
- `.video-choice-buttons` - Upload/Library button container
- `.btn-choice` - Styled action buttons
- `.progress-bar-container` / `.progress-bar` - Upload progress
- `.timeline-marker-*` - Color-coded marker styles
- `.verdict-timestamp-link` - Card timestamp button

### **Key JavaScript Functions:**
- `handleVideoUpload()` - Main upload orchestrator
- `renderTimelineMarkers()` - Builds timeline UI
- `seekVideoTo()` - Video seeking logic
- `showMockDecisionSection()` - Renders results with timestamps

---

## 11. Future Integration Points

### **When Backend Analysis is Ready:**
1. Replace `showMockDecisionSection()` call with actual API call
2. Use real timestamps from analysis response
3. Load extracted frame images into verdict cards
4. Get signed URL for video playback
5. Store analysis results in Supabase
6. Check for existing analysis on page load

### **Library Feature (Choose from Library):**
1. Query user's previous uploads from Supabase/GCS
2. Show modal with video thumbnails + names
3. On select → copy video_path to current project
4. Trigger analysis for that video + project combo

### **Enhanced Timeline:**
- Show video progress indicator on timeline
- Highlight current section being played
- Add keyboard shortcuts (space to play/pause, arrows to seek)

---

## 12. How This Enhances Phase 1 Goals

### ✅ **Adds Crucial Context Without Distraction**
- Video available but collapsed by default
- Verdict cards remain primary focus
- Context accessible in one click

### ✅ **Makes Analysis Tangible**
- Timestamps connect cards to real moments
- Timeline markers provide spatial reference
- "View in video" removes abstraction

### ✅ **Maintains Linear Decision Flow**
- Choose → Upload → Analyze → Decide
- No branches, no re-dos, no second-guessing
- Video lock enforces commitment

### ✅ **Supports Confident Decision-Making**
- Easy to review actual footage
- No need to remember timestamps
- Visual confirmation of what was analyzed

### ✅ **Preserves Calm, Supportive Tone**
- No forced interaction with video
- Helper text is instructive, not prescriptive
- Timeline is exploratory, not evaluative

---

## Summary

Phase 2 successfully integrates video context into the decision support experience without compromising the Phase 1 focus on calm, pre-upload decision relief. The linear flow (choose → upload → locked → analyze → decide) prevents second-guessing while the timeline markers and timestamp links provide tangible connections between analysis and actual footage.

The implementation is backend-ready: replace mock data with real analysis results, and the entire flow will work seamlessly with actual frame extraction, timestamps, and video playback.

**Key Achievement:** Video is now integrated as *supporting context* for decisions, not the primary interface element—maintaining the focus on the three verdict cards while making the analysis feel grounded in real footage.

