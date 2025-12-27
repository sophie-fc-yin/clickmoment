import { supabase, getAuthHeaders } from './supabase.js';
import { ProjectManager } from './projects.js';
import { ProfileManager } from './profile.js';

const API_BASE_URL = window.API_BASE_URL || '';

let currentUser = null;
let projectManager = null;
let profileManager = null;
let currentProjectId = null;

// DOM elements
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const profileBtn = document.getElementById('profile-btn');
const landingPage = document.getElementById('landing-page');
const projectsView = document.getElementById('projects-view');
const createProjectView = document.getElementById('create-project-view');
const editProjectView = document.getElementById('edit-project-view');
const projectView = document.getElementById('project-view');
const profileView = document.getElementById('profile-view');
const landingLoginBtn = document.getElementById('landing-login-btn');
const landingFooterLoginBtn = document.getElementById('landing-footer-login-btn');
const projectsList = document.getElementById('projects-list');
const noProjects = document.getElementById('no-projects');
const createProjectBtn = document.getElementById('create-project-btn');
const cancelCreateProjectBtn = document.getElementById('cancel-create-project-btn');
const cancelCreateProjectFormBtn = document.getElementById('cancel-create-project-form-btn');
const backToProjectsBtn = document.getElementById('back-to-projects-btn');
const cancelEditProjectBtn = document.getElementById('cancel-edit-project-btn');
const cancelEditProjectFormBtn = document.getElementById('cancel-edit-project-form-btn');
const backFromProfileBtn = document.getElementById('back-from-profile-btn');
const editProjectBtn = document.getElementById('edit-project-btn');
const projectTitle = document.getElementById('project-title');
const videoInput = document.getElementById('video-input');
const analyzeBtn = document.getElementById('analyze-btn');
const statusText = document.getElementById('status-text');
const jsonOutput = document.getElementById('json-output');
const createProjectForm = document.getElementById('create-project-form');
const editProjectForm = document.getElementById('edit-project-form');
const profileForm = document.getElementById('profile-form');

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
    
    // Mark that initial auth state is handled
    authStateChangeInitialized = true;
    
    // If we have an access token in URL, wait a moment for session to be set
    if (accessToken && !currentUser) {
        console.log('Access token found in URL, waiting for session...');
        setTimeout(async () => {
            const { data: { session: newSession } } = await supabase.auth.getSession();
            currentUser = newSession?.user || null;
            await updateUI();
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }, 500);
    } else {
        await updateUI();
    }
}

// Clean up old localStorage data (from before Supabase migration)
function cleanupOldLocalStorage() {
    try {
        // Clear old project data stored in localStorage
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('clickmoment_projects_')) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        if (keysToRemove.length > 0) {
            console.log(`Cleaned up ${keysToRemove.length} old localStorage entries`);
        }
    } catch (error) {
        console.error('Error cleaning up localStorage:', error);
    }
}

// Update UI based on auth state
async function updateUI() {
    if (currentUser) {
        // User is logged in - show app
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
        profileBtn.style.display = 'inline-block';
        landingPage.style.display = 'none';
        
        // Clean up old localStorage data once
        cleanupOldLocalStorage();
        
        // Initialize managers
        if (!projectManager) {
            projectManager = new ProjectManager(currentUser.id);
        }
        if (!profileManager) {
            profileManager = new ProfileManager();
        }
        
        // Check if user has a profile with data, if not show profile setup
        const profile = await profileManager.getProfile(currentUser.id);
        const hasProfileData = profile && (
            profile.stage || 
            profile.subscriber_count || 
            profile.content_niche || 
            profile.upload_frequency || 
            profile.growth_goal
        );
        
        if (!hasProfileData) {
            // First time user or empty profile - show profile setup
            await showProfileView();
        } else {
            // Show projects list by default
            await showProjectsView();
        }
    } else {
        // User is not logged in - show landing page
        loginBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'none';
        profileBtn.style.display = 'none';
        landingPage.style.display = 'block';
        projectsView.style.display = 'none';
        createProjectView.style.display = 'none';
        editProjectView.style.display = 'none';
        projectView.style.display = 'none';
        profileView.style.display = 'none';
    }
}

// Show projects list view
async function showProjectsView() {
    projectsView.style.display = 'block';
    createProjectView.style.display = 'none';
    editProjectView.style.display = 'none';
    projectView.style.display = 'none';
    profileView.style.display = 'none';
    currentProjectId = null;
    await renderProjectsList();
}

// Show create project view
function showCreateProjectView() {
    projectsView.style.display = 'none';
    createProjectView.style.display = 'block';
    editProjectView.style.display = 'none';
    projectView.style.display = 'none';
    profileView.style.display = 'none';
    createProjectForm.reset();
    currentProjectId = null;
}

// Show edit project view
async function showEditProjectView(projectId) {
    projectsView.style.display = 'none';
    createProjectView.style.display = 'none';
    editProjectView.style.display = 'block';
    projectView.style.display = 'none';
    profileView.style.display = 'none';
    currentProjectId = projectId;
    
    const project = await projectManager.getProject(projectId);
    if (project) {
        document.getElementById('edit-project-name').value = project.name;
        document.getElementById('edit-project-platform').value = project.platform || 'youtube';
        document.getElementById('edit-project-optimization').value = project.optimization || '';
        document.getElementById('edit-project-audience-profile').value = project.audience_profile || '';
        document.getElementById('edit-project-mood').value = project.mood || '';
        document.getElementById('edit-project-title-hint').value = project.title_hint || '';
        document.getElementById('edit-project-brand-colors').value = project.brand_colors ? project.brand_colors.join(', ') : '';
        document.getElementById('edit-project-notes').value = project.notes || '';
    }
}

// Show project detail view
async function showProjectView(projectId) {
    projectsView.style.display = 'none';
    createProjectView.style.display = 'none';
    editProjectView.style.display = 'none';
    projectView.style.display = 'block';
    profileView.style.display = 'none';
    currentProjectId = projectId;
    
    const project = await projectManager.getProject(projectId);
    if (project) {
        projectTitle.textContent = project.name;
        
        // Display project info
        document.getElementById('info-platform').textContent = project.platform || '-';
        document.getElementById('info-optimization').textContent = project.optimization || '-';
        document.getElementById('info-audience').textContent = project.audience_profile || '-';
        document.getElementById('info-mood').textContent = project.mood || '-';
        document.getElementById('info-title-hint').textContent = project.title_hint || '-';
        document.getElementById('info-brand-colors').textContent = project.brand_colors && project.brand_colors.length > 0 
            ? project.brand_colors.join(', ') 
            : '-';
        document.getElementById('info-notes').textContent = project.notes || '-';
        document.getElementById('info-video-path').textContent = project.video_path || '-';
    }
    
    // Reset form
    videoInput.value = '';
    analyzeBtn.disabled = true;
    jsonOutput.textContent = 'No video uploaded yet.';
    updateStatus('');
}

// Render projects list
let isRendering = false;
let renderRequested = false;
async function renderProjectsList() {
    if (!projectManager || !projectsList) {
        return;
    }
    
    // If already rendering, mark that a re-render was requested
    if (isRendering) {
        console.log('Render already in progress, will re-render after current render completes');
        renderRequested = true;
        return;
    }
    
    isRendering = true;
    renderRequested = false;
    
    try {
        const projects = await projectManager.getProjects();
        
        // Clear existing content completely
        while (projectsList.firstChild) {
            projectsList.removeChild(projectsList.firstChild);
        }
        projectsList.innerHTML = '';
        
        if (projects.length === 0) {
            noProjects.style.display = 'block';
            projectsList.style.display = 'none';
        } else {
            noProjects.style.display = 'none';
            projectsList.style.display = 'grid';
            
            // Get analyses count for each project
            for (const project of projects) {
                const analyses = await projectManager.getAnalyses(project.id);
                const projectCard = document.createElement('div');
                projectCard.className = 'project-card';
                projectCard.innerHTML = `
                    <h3>${escapeHtml(project.name)}</h3>
                    <p class="project-meta">Created: ${new Date(project.created_at).toLocaleDateString()}</p>
                    <p class="project-meta">Analyses: ${analyses.length}</p>
                    <p class="project-meta">Platform: ${escapeHtml(project.platform || 'youtube')}</p>
                    <button class="btn btn-primary open-project-btn" data-project-id="${project.id}">Open Project</button>
                    <button class="btn btn-secondary delete-project-btn" data-project-id="${project.id}">Delete</button>
                `;
                projectsList.appendChild(projectCard);
            }
        }
    } catch (error) {
        console.error('Error in renderProjectsList:', error);
    } finally {
        isRendering = false;
        // If a re-render was requested while we were rendering, do it now
        if (renderRequested) {
            setTimeout(() => renderProjectsList(), 100);
        }
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Login handler (shared function)
async function handleLogin() {
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
}

// Login button handlers
loginBtn.addEventListener('click', handleLogin);
if (landingLoginBtn) {
    landingLoginBtn.addEventListener('click', handleLogin);
}
if (landingFooterLoginBtn) {
    landingFooterLoginBtn.addEventListener('click', handleLogin);
}

// Logout handler
logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    currentUser = null;
    updateUI();
    resetForm();
});

// Listen for auth state changes
let authStateChangeInitialized = false;
supabase.auth.onAuthStateChange(async (event, session) => {
    currentUser = session?.user || null;
    // Skip the first call since initAuth already handles initial state
    if (!authStateChangeInitialized) {
        authStateChangeInitialized = true;
        return;
    }
    await updateUI();
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

// Show profile view
async function showProfileView() {
    projectsView.style.display = 'none';
    createProjectView.style.display = 'none';
    editProjectView.style.display = 'none';
    projectView.style.display = 'none';
    profileView.style.display = 'block';
    
    // Load existing profile data
    if (profileManager && currentUser) {
        const profile = await profileManager.getProfile(currentUser.id);
        if (profile) {
            document.getElementById('profile-stage').value = profile.stage || '';
            document.getElementById('profile-subscriber-count').value = profile.subscriber_count || '';
            document.getElementById('profile-content-niche').value = profile.content_niche || '';
            document.getElementById('profile-upload-frequency').value = profile.upload_frequency || '';
            document.getElementById('profile-growth-goal').value = profile.growth_goal || '';
        }
    }
}

// Project management event listeners
createProjectBtn.addEventListener('click', () => {
    showCreateProjectView();
});

cancelCreateProjectBtn.addEventListener('click', () => {
    showProjectsView();
});

cancelCreateProjectFormBtn.addEventListener('click', () => {
    showProjectsView();
});

editProjectBtn.addEventListener('click', async () => {
    if (!currentProjectId) return;
    await showEditProjectView(currentProjectId);
});

cancelEditProjectBtn.addEventListener('click', async () => {
    if (currentProjectId) {
        await showProjectView(currentProjectId);
    } else {
        showProjectsView();
    }
});

cancelEditProjectFormBtn.addEventListener('click', async () => {
    if (currentProjectId) {
        await showProjectView(currentProjectId);
    } else {
        showProjectsView();
    }
});

createProjectForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    // Parse brand colors from comma-separated string
    const brandColorsStr = formData.get('brand_colors') || '';
    const brandColors = brandColorsStr
        .split(',')
        .map(color => color.trim())
        .filter(color => color.length > 0);
    
    const projectData = {
        name: formData.get('name'),
        platform: formData.get('platform') || 'youtube',
        optimization: formData.get('optimization') || null,
        audience_profile: formData.get('audience_profile') || null,
        mood: formData.get('mood') || null,
        title_hint: formData.get('title_hint') || null,
        brand_colors: brandColors,
        notes: formData.get('notes') || null,
    };
    
    // Create new project
    const result = await projectManager.createProject(projectData);
    if (result.error) {
        alert('Error creating project: ' + result.error.message);
    } else {
        await showProjectView(result.data.id);
    }
});

editProjectForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentProjectId) return;
    
    const formData = new FormData(e.target);
    
    // Parse brand colors from comma-separated string
    const brandColorsStr = formData.get('brand_colors') || '';
    const brandColors = brandColorsStr
        .split(',')
        .map(color => color.trim())
        .filter(color => color.length > 0);
    
    const projectData = {
        name: formData.get('name'),
        platform: formData.get('platform') || 'youtube',
        optimization: formData.get('optimization') || null,
        audience_profile: formData.get('audience_profile') || null,
        mood: formData.get('mood') || null,
        title_hint: formData.get('title_hint') || null,
        brand_colors: brandColors,
        notes: formData.get('notes') || null,
    };
    
    // Update existing project
    const result = await projectManager.updateProject(currentProjectId, projectData);
    if (result.error) {
        alert('Error updating project: ' + result.error.message);
    } else {
        await showProjectView(result.data.id);
    }
});

backToProjectsBtn.addEventListener('click', () => {
    showProjectsView();
});

profileBtn.addEventListener('click', () => {
    showProfileView();
});

backFromProfileBtn.addEventListener('click', () => {
    showProjectsView();
});

profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const profileData = {
        stage: formData.get('stage') || null,
        subscriber_count: formData.get('subscriber_count') ? parseInt(formData.get('subscriber_count')) : null,
        content_niche: formData.get('content_niche') || null,
        upload_frequency: formData.get('upload_frequency') || null,
        growth_goal: formData.get('growth_goal') || null,
    };
    
    const result = await profileManager.saveProfile(currentUser.id, profileData);
    if (result.error) {
        alert('Error saving profile: ' + result.error.message);
    } else {
        // Profile saved successfully - go to projects view
        await showProjectsView();
    }
});

// Enable upload button when file is selected
videoInput.addEventListener('change', (e) => {
    analyzeBtn.disabled = !e.target.files.length;
});

// Upload and analyze handler
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

    if (!API_BASE_URL || API_BASE_URL.trim() === '') {
        updateStatus('API_BASE_URL is not configured. Please set API_BASE_URL (or EXPO_PUBLIC_API_BASE_URL) in Vercel environment variables to your Cloud Run service URL.', 'error');
        jsonOutput.textContent = JSON.stringify({
            error: 'API_BASE_URL not configured',
            message: 'Set API_BASE_URL or EXPO_PUBLIC_API_BASE_URL environment variable in Vercel to your Cloud Run backend URL (e.g., https://your-service-hash.region.run.app). Update it in Vercel → Settings → Environment Variables and it will take effect immediately (no rebuild needed).'
        }, null, 2);
        return;
    }

    try {
        // Step 1: Get signed upload URL
        updateStatus('Requesting upload URL...', 'info');
        const authHeaders = await getAuthHeaders();
        const apiUrl = `${API_BASE_URL}/videos/upload`;
        console.log('Calling API:', apiUrl);
        console.log('Request origin:', window.location.origin);
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
            console.error('Fetch error details:', {
                message: err.message,
                name: err.name,
                stack: err.stack
            });
            console.error('API URL attempted:', apiUrl);
            console.error('Request origin:', window.location.origin);
            
            // More specific error message
            if (err.message.includes('Failed to fetch') || err.message.includes('network')) {
                throw new Error(`CORS or Network Error: The backend at ${API_BASE_URL} is not allowing requests from ${window.location.origin}. Check your FastAPI backend CORS settings - it needs to allow your Vercel domain. Common fix: Add your Vercel domain to the CORS allowed origins in your FastAPI backend.`);
            }
            throw new Error(`Network error: ${err.message}`);
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

        // Step 2.5: Save video_path to project immediately after successful upload
        if (currentProjectId && projectManager) {
            await projectManager.updateProject(currentProjectId, { video_path: gcs_path });
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
        
        // Step 4: Save analysis result to project
        if (currentProjectId && projectManager) {
            await projectManager.addAnalysis(currentProjectId, result, gcs_path);
        }
        
        // Step 5: Display result and refresh project view to show video_path
        jsonOutput.textContent = JSON.stringify(result, null, 2);
        updateStatus('Upload and analysis complete!', 'success');
        
        // Refresh project info to show updated video_path
        if (currentProjectId && projectManager) {
            const updatedProject = await projectManager.getProject(currentProjectId);
            if (updatedProject && updatedProject.video_path) {
                document.getElementById('info-video-path').textContent = updatedProject.video_path;
            }
        }
        
    } catch (error) {
        updateStatus(`Error: ${error.message}`, 'error');
        jsonOutput.textContent = `Error: ${error.message}`;
        console.error('Analysis error:', error);
    }
});

// Event delegation for project list buttons (attached once)
projectsList.addEventListener('click', async (e) => {
    if (e.target.classList.contains('open-project-btn')) {
        const projectId = e.target.getAttribute('data-project-id');
        await showProjectView(projectId);
    } else if (e.target.classList.contains('delete-project-btn')) {
        const projectId = e.target.getAttribute('data-project-id');
        if (confirm('Are you sure you want to delete this project?')) {
            await projectManager.deleteProject(projectId);
            await renderProjectsList();
        }
    }
});

// Initialize on load
initAuth();

