import { supabase, getAuthHeaders } from './supabase.js';
import { ProjectManager } from './projects.js';

const API_BASE_URL = window.API_BASE_URL || 'https://API_BASE_URL';

let currentUser = null;
let projectManager = null;
let currentProjectId = null;

// DOM elements
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const projectsView = document.getElementById('projects-view');
const projectView = document.getElementById('project-view');
const loginPrompt = document.getElementById('login-prompt');
const projectsList = document.getElementById('projects-list');
const noProjects = document.getElementById('no-projects');
const createProjectBtn = document.getElementById('create-project-btn');
const backToProjectsBtn = document.getElementById('back-to-projects-btn');
const projectTitle = document.getElementById('project-title');
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
        loginPrompt.style.display = 'none';
        // Initialize project manager
        if (!projectManager) {
            projectManager = new ProjectManager(currentUser.id);
        }
        // Show projects list by default
        showProjectsView();
    } else {
        loginBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'none';
        projectsView.style.display = 'none';
        projectView.style.display = 'none';
        loginPrompt.style.display = 'block';
    }
}

// Show projects list view
function showProjectsView() {
    projectsView.style.display = 'block';
    projectView.style.display = 'none';
    currentProjectId = null;
    renderProjectsList();
}

// Show project detail view
function showProjectView(projectId) {
    projectsView.style.display = 'none';
    projectView.style.display = 'block';
    currentProjectId = projectId;
    
    const project = projectManager.getProject(projectId);
    if (project) {
        projectTitle.textContent = project.name;
    }
    
    // Reset form
    videoInput.value = '';
    analyzeBtn.disabled = true;
    jsonOutput.textContent = 'No analysis yet.';
    updateStatus('');
}

// Render projects list
function renderProjectsList() {
    if (!projectManager) return;
    
    const projects = projectManager.getProjects();
    projectsList.innerHTML = '';
    
    if (projects.length === 0) {
        noProjects.style.display = 'block';
        projectsList.style.display = 'none';
    } else {
        noProjects.style.display = 'none';
        projectsList.style.display = 'grid';
        
        projects.forEach(project => {
            const projectCard = document.createElement('div');
            projectCard.className = 'project-card';
            projectCard.innerHTML = `
                <h3>${escapeHtml(project.name)}</h3>
                <p class="project-meta">Created: ${new Date(project.createdAt).toLocaleDateString()}</p>
                <p class="project-meta">Analyses: ${project.analyses ? project.analyses.length : 0}</p>
                <button class="btn btn-primary open-project-btn" data-project-id="${project.id}">Open Project</button>
                <button class="btn btn-secondary delete-project-btn" data-project-id="${project.id}">Delete</button>
            `;
            projectsList.appendChild(projectCard);
        });
        
        // Add event listeners
        document.querySelectorAll('.open-project-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const projectId = e.target.getAttribute('data-project-id');
                showProjectView(projectId);
            });
        });
        
        document.querySelectorAll('.delete-project-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const projectId = e.target.getAttribute('data-project-id');
                if (confirm('Are you sure you want to delete this project?')) {
                    projectManager.deleteProject(projectId);
                    renderProjectsList();
                }
            });
        });
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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

// Project management event listeners
createProjectBtn.addEventListener('click', () => {
    const name = prompt('Enter project name:');
    if (name && name.trim()) {
        const project = projectManager.createProject(name.trim());
        showProjectView(project.id);
    }
});

backToProjectsBtn.addEventListener('click', () => {
    showProjectsView();
});

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
        const apiUrl = `${API_BASE_URL}/get-upload-url`;
        console.log('Calling API:', apiUrl);
        console.log('Auth headers:', authHeaders);
        
        const uploadUrlResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders
            },
            body: JSON.stringify({
                filename: file.name,
                content_type: file.type
            })
        }).catch(err => {
            console.error('Fetch error:', err);
            throw new Error(`Network error: ${err.message}. Check if API_BASE_URL is correct: ${API_BASE_URL}`);
        });

        if (!uploadUrlResponse.ok) {
            const errorText = await uploadUrlResponse.text();
            console.error('API error response:', errorText);
            throw new Error(`Failed to get upload URL (${uploadUrlResponse.status}): ${errorText || uploadUrlResponse.statusText}`);
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
        const analyzeUrl = `${API_BASE_URL}/analyze`;
        console.log('Calling analyze API:', analyzeUrl);
        
        const analyzeResponse = await fetch(analyzeUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders
            },
            body: JSON.stringify({
                gcs_path: gcs_path
            })
        }).catch(err => {
            console.error('Analyze fetch error:', err);
            throw new Error(`Network error during analysis: ${err.message}`);
        });

        if (!analyzeResponse.ok) {
            const errorText = await analyzeResponse.text();
            console.error('Analyze API error response:', errorText);
            throw new Error(`Analysis failed (${analyzeResponse.status}): ${errorText || analyzeResponse.statusText}`);
        }

        const result = await analyzeResponse.json();
        
        // Step 4: Save analysis to project
        if (currentProjectId && projectManager) {
            projectManager.addAnalysis(currentProjectId, result);
        }
        
        // Step 5: Display result
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

