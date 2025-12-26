import { supabase, getAuthHeaders } from './supabase.js';

const API_BASE_URL = window.API_BASE_URL || 'https://API_BASE_URL';

let currentUser = null;

// DOM elements
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const mainContent = document.getElementById('main-content');
const loginPrompt = document.getElementById('login-prompt');
const videoInput = document.getElementById('video-input');
const analyzeBtn = document.getElementById('analyze-btn');
const statusText = document.getElementById('status-text');
const jsonOutput = document.getElementById('json-output');

// Initialize auth state
async function initAuth() {
    // Check for OAuth callback
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const error = hashParams.get('error');
    
    if (error) {
        console.error('OAuth error:', error);
        updateStatus('Authentication error: ' + error, 'error');
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    const { data: { session } } = await supabase.auth.getSession();
    currentUser = session?.user || null;
    
    // If we have an access token in URL, wait a moment for session to be set
    if (accessToken && !currentUser) {
        console.log('Access token found in URL, waiting for session...');
        setTimeout(async () => {
            const { data: { session: newSession } } = await supabase.auth.getSession();
            currentUser = newSession?.user || null;
            updateUI();
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }, 500);
    } else {
        updateUI();
    }
}

// Update UI based on auth state
function updateUI() {
    if (currentUser) {
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
        mainContent.style.display = 'block';
        loginPrompt.style.display = 'none';
    } else {
        loginBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'none';
        mainContent.style.display = 'none';
        loginPrompt.style.display = 'block';
    }
}

// Login handler
loginBtn.addEventListener('click', async () => {
    try {
        const redirectUrl = window.location.origin + window.location.pathname;
        console.log('Initiating OAuth login with redirect:', redirectUrl);
        
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                }
            }
        });
        
        if (error) {
            console.error('OAuth error:', error);
            updateStatus('Login error: ' + error.message, 'error');
        } else if (data?.url) {
            console.log('Redirecting to:', data.url);
            // Supabase will handle the redirect automatically
        }
    } catch (err) {
        console.error('Login error:', err);
        updateStatus('Login error: ' + err.message, 'error');
    }
});

// Logout handler
logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    currentUser = null;
    updateUI();
    resetForm();
});

// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user || null;
    updateUI();
});

// Update status text
function updateStatus(message, type = 'info') {
    statusText.textContent = message;
    statusText.className = `status-${type}`;
}

// Reset form
function resetForm() {
    videoInput.value = '';
    analyzeBtn.disabled = true;
    jsonOutput.textContent = 'No analysis yet.';
    updateStatus('');
}

// Enable analyze button when file is selected
videoInput.addEventListener('change', (e) => {
    analyzeBtn.disabled = !e.target.files.length;
});

// Analyze handler
analyzeBtn.addEventListener('click', async () => {
    const file = videoInput.files[0];
    if (!file) {
        updateStatus('Please select a video file', 'error');
        return;
    }

    if (!currentUser) {
        updateStatus('Please log in first', 'error');
        return;
    }

    if (!API_BASE_URL || API_BASE_URL === 'https://API_BASE_URL') {
        updateStatus('API_BASE_URL is not configured. Please set it in Vercel environment variables.', 'error');
        jsonOutput.textContent = JSON.stringify({
            error: 'API_BASE_URL not configured',
            message: 'Set API_BASE_URL environment variable in Vercel to your FastAPI backend URL (e.g., https://your-api.run.app)'
        }, null, 2);
        return;
    }

    try {
        // Step 1: Get signed upload URL
        updateStatus('Requesting upload URL...', 'info');
        const authHeaders = await getAuthHeaders();
        const uploadUrlResponse = await fetch(`${API_BASE_URL}/get-upload-url`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders
            },
            body: JSON.stringify({
                filename: file.name,
                content_type: file.type
            })
        });

        if (!uploadUrlResponse.ok) {
            throw new Error(`Failed to get upload URL: ${uploadUrlResponse.statusText}`);
        }

        const { signed_url, gcs_path } = await uploadUrlResponse.json();

        // Step 2: Upload video to GCS
        updateStatus('Uploading video to storage...', 'info');
        const uploadResponse = await fetch(signed_url, {
            method: 'PUT',
            headers: {
                'Content-Type': file.type
            },
            body: file
        });

        if (!uploadResponse.ok) {
            throw new Error(`Failed to upload video: ${uploadResponse.statusText}`);
        }

        // Step 3: Call analyze endpoint
        updateStatus('Analyzing video...', 'info');
        const analyzeResponse = await fetch(`${API_BASE_URL}/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders
            },
            body: JSON.stringify({
                gcs_path: gcs_path
            })
        });

        if (!analyzeResponse.ok) {
            throw new Error(`Analysis failed: ${analyzeResponse.statusText}`);
        }

        const result = await analyzeResponse.json();
        
        // Step 4: Display result
        jsonOutput.textContent = JSON.stringify(result, null, 2);
        updateStatus('Analysis complete!', 'success');
        
    } catch (error) {
        updateStatus(`Error: ${error.message}`, 'error');
        jsonOutput.textContent = `Error: ${error.message}`;
        console.error('Analysis error:', error);
    }
});

// Initialize on load
initAuth();

