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
const statusText = document.getElementById('status-text');
const jsonOutput = document.getElementById('json-output');
const createProjectForm = document.getElementById('create-project-form');
const editProjectForm = document.getElementById('edit-project-form');
const profileForm = document.getElementById('profile-form');

// New video selection elements
const videoSelectionSection = document.getElementById('video-selection-section');
const uploadNewVideoBtn = document.getElementById('upload-new-video-btn');
const chooseFromLibraryBtn = document.getElementById('choose-from-library-btn');
const uploadProgressSection = document.getElementById('upload-progress-section');
const uploadProgressText = document.getElementById('upload-progress-text');
const uploadProgressBar = document.getElementById('upload-progress-bar');
const videoPlayerSection = document.getElementById('video-player-section');
const projectVideo = document.getElementById('project-video');
const videoSource = document.getElementById('video-source');

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
        
        // Check if video_path exists - determines UI state
        const hasVideo = project.video_path && project.video_path !== '-';
        
        if (hasVideo) {
            // Video already selected - hide selection UI, show player
            videoSelectionSection.style.display = 'none';
            uploadProgressSection.style.display = 'none';
            videoPlayerSection.style.display = 'block';
            
            // Load video into player (TODO: get signed URL for playback)
            // For now, just show that video exists
            console.log('Project has video:', project.video_path);
            
            // TODO: Check if analysis exists and show results
            // For now, simulate that analysis is complete
            setTimeout(() => {
                showMockDecisionSection(project.video_path);
            }, 500);
            
        } else {
            // No video yet - show selection UI
            videoSelectionSection.style.display = 'block';
            uploadProgressSection.style.display = 'none';
            videoPlayerSection.style.display = 'none';
            
            // Hide decision section
            const decisionSection = document.getElementById('decision-section');
            if (decisionSection) {
                decisionSection.style.display = 'none';
            }
        }
    }
    
    // Reset form and UI state
    videoInput.value = '';
    jsonOutput.textContent = 'No analysis yet.';
    updateStatus('');
    
    // Ensure project details are collapsed by default
    const projectInfoElement = document.getElementById('project-info');
    const toggleProjectDetailsBtnElement = document.getElementById('toggle-project-details-btn');
    if (projectInfoElement && toggleProjectDetailsBtnElement) {
        projectInfoElement.classList.add('project-info-collapsed');
        toggleProjectDetailsBtnElement.classList.remove('expanded');
        toggleProjectDetailsBtnElement.innerHTML = '<span class="toggle-icon">▶</span> View project details';
    }
    
    // Ensure technical details are collapsed
    const technicalDetailsElement = document.getElementById('technical-details');
    const toggleTechnicalDetailsBtnElement = document.getElementById('toggle-technical-details-btn');
    if (technicalDetailsElement && toggleTechnicalDetailsBtnElement) {
        technicalDetailsElement.classList.add('technical-details-collapsed');
        toggleTechnicalDetailsBtnElement.classList.remove('expanded');
        toggleTechnicalDetailsBtnElement.innerHTML = '<span class="toggle-icon">▶</span> View technical details (debug)';
    }
    
    // Ensure video player is collapsed by default
    const videoPlayerContainer = document.getElementById('video-player-container');
    const toggleVideoPlayerBtn = document.getElementById('toggle-video-player-btn');
    if (videoPlayerContainer && toggleVideoPlayerBtn) {
        videoPlayerContainer.classList.add('video-player-collapsed');
        toggleVideoPlayerBtn.classList.remove('expanded');
        toggleVideoPlayerBtn.innerHTML = '<span class="toggle-icon">▶</span> View video';
    }
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
                    <button class="btn btn-ghost delete-project-btn" data-project-id="${project.id}">Delete</button>
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
            const contentNicheSelect = document.getElementById('profile-content-niche');
            const savedNiche = profile.content_niche || 'general';
            // Check if saved value exists in options, otherwise default to 'general'
            const optionExists = Array.from(contentNicheSelect.options).some(opt => opt.value === savedNiche);
            contentNicheSelect.value = optionExists ? savedNiche : 'general';
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

// Handle "Upload New Video" button click
if (uploadNewVideoBtn) {
    uploadNewVideoBtn.addEventListener('click', () => {
        videoInput.click();
    });
}

// Handle "Choose from Library" button click
if (chooseFromLibraryBtn) {
    chooseFromLibraryBtn.addEventListener('click', () => {
        alert('Library feature coming soon! For now, please upload a new video.');
        // TODO: Show modal with user's previously uploaded videos
    });
}

// Handle file selection
videoInput.addEventListener('change', async (e) => {
    if (e.target.files.length > 0) {
        await handleVideoUpload(e.target.files[0]);
    }
});

// Handle video upload
async function handleVideoUpload(file) {
    if (!file) {
        updateStatus('Please select a video file', 'error');
        return;
    }

    if (!currentUser) {
        updateStatus('Please log in first', 'error');
        return;
    }
    
    console.log('File selected:', file.name, 'Size:', (file.size / 1024 / 1024).toFixed(2), 'MB');

    if (!API_BASE_URL || API_BASE_URL.trim() === '') {
        updateStatus('API_BASE_URL is not configured. Please set API_BASE_URL (or EXPO_PUBLIC_API_BASE_URL) in Vercel environment variables to your Cloud Run service URL.', 'error');
        jsonOutput.textContent = JSON.stringify({
            error: 'API_BASE_URL not configured',
            message: 'Set API_BASE_URL or EXPO_PUBLIC_API_BASE_URL environment variable in Vercel to your Cloud Run backend URL (e.g., https://your-service-hash.region.run.app). Update it in Vercel → Settings → Environment Variables and it will take effect immediately (no rebuild needed).'
        }, null, 2);
        return;
    }

    try {
        // Hide selection UI, show progress
        videoSelectionSection.style.display = 'none';
        uploadProgressSection.style.display = 'block';
        
        const authHeaders = await getAuthHeaders();
        
        // Step 1: Get signed URL from backend
        uploadProgressText.textContent = 'Requesting upload URL...';
        uploadProgressBar.style.width = '0%';
        
        const signedUrlEndpoint = `${API_BASE_URL}/get-upload-url`;
        console.log('Requesting signed URL from:', signedUrlEndpoint);
        
        const signedUrlResponse = await fetch(signedUrlEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders
            },
            body: JSON.stringify({
                filename: file.name,
                content_type: file.type,
                user_id: currentUser.id,
                project_id: currentProjectId || undefined
            })
        });

        if (!signedUrlResponse.ok) {
            const errorText = await signedUrlResponse.text();
            console.error('Failed to get signed URL:', errorText);
            throw new Error(`Failed to get upload URL (${signedUrlResponse.status}): ${errorText || signedUrlResponse.statusText}`);
        }

        const { signed_url, gcs_path } = await signedUrlResponse.json();
        console.log('Got signed URL for GCS path:', gcs_path);

        // Step 2: Upload file directly to GCS with progress tracking
        console.log('Uploading file:', file.name);
        
        const uploadPromise = new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    const uploadedMB = (e.loaded / 1024 / 1024).toFixed(2);
                    const totalMB = (e.total / 1024 / 1024).toFixed(2);
                    uploadProgressText.textContent = `Uploading... ${percentComplete.toFixed(1)}% (${uploadedMB} MB / ${totalMB} MB)`;
                    uploadProgressBar.style.width = `${percentComplete}%`;
                }
            });
            
            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(xhr);
                } else {
                    reject(new Error(`Failed to upload to GCS: ${xhr.statusText} (${xhr.status})`));
                }
            });
            
            xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
            xhr.addEventListener('abort', () => reject(new Error('Upload was aborted')));
            
            xhr.open('PUT', signed_url);
            xhr.setRequestHeader('Content-Type', file.type);
            xhr.send(file);
        });
        
        await uploadPromise;
        console.log('File uploaded to GCS successfully');
        
        uploadProgressText.textContent = 'Upload complete! Saving...';
        uploadProgressBar.style.width = '100%';
        
        // Step 3: Save video_path to project (THIS LOCKS THE VIDEO)
        if (currentProjectId && projectManager && gcs_path) {
            console.log('Saving video_path to project...');
            const updateResult = await projectManager.updateProject(currentProjectId, { video_path: gcs_path });
            if (updateResult.error) {
                console.error('Error updating project:', updateResult.error);
                throw new Error('Failed to save video to project');
            }
        }

        // Step 4: Hide progress, show analyzing state
        uploadProgressSection.style.display = 'none';
        uploadProgressText.textContent = 'Analyzing frames...';
        updateStatus('Analyzing frames...', 'info');
        
        // Step 5: Show video player section
        videoPlayerSection.style.display = 'block';
        
        // TODO: Trigger actual analysis API call here
        // For now, simulate analysis with mock data
        setTimeout(() => {
            showMockDecisionSection(gcs_path);
            updateStatus('Analysis complete! Review the thumbnail choices below.', 'success');
        }, 2000);
        
    } catch (error) {
        updateStatus(`Error: ${error.message}`, 'error');
        console.error('Upload error:', error);
        
        // Show selection UI again on error
        videoSelectionSection.style.display = 'block';
        uploadProgressSection.style.display = 'none';
    }
}

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

// Toggle project details visibility
const toggleProjectDetailsBtn = document.getElementById('toggle-project-details-btn');
const projectInfo = document.getElementById('project-info');
if (toggleProjectDetailsBtn && projectInfo) {
    toggleProjectDetailsBtn.addEventListener('click', () => {
        if (projectInfo.classList.contains('project-info-collapsed')) {
            projectInfo.classList.remove('project-info-collapsed');
            toggleProjectDetailsBtn.classList.add('expanded');
            toggleProjectDetailsBtn.innerHTML = '<span class="toggle-icon">▼</span> Hide project details';
        } else {
            projectInfo.classList.add('project-info-collapsed');
            toggleProjectDetailsBtn.classList.remove('expanded');
            toggleProjectDetailsBtn.innerHTML = '<span class="toggle-icon">▶</span> View project details';
        }
    });
}

// Toggle technical details visibility
const toggleTechnicalDetailsBtn = document.getElementById('toggle-technical-details-btn');
const technicalDetails = document.getElementById('technical-details');
if (toggleTechnicalDetailsBtn && technicalDetails) {
    toggleTechnicalDetailsBtn.addEventListener('click', () => {
        if (technicalDetails.classList.contains('technical-details-collapsed')) {
            technicalDetails.classList.remove('technical-details-collapsed');
            toggleTechnicalDetailsBtn.classList.add('expanded');
            toggleTechnicalDetailsBtn.innerHTML = '<span class="toggle-icon">▼</span> Hide technical details';
        } else {
            technicalDetails.classList.add('technical-details-collapsed');
            toggleTechnicalDetailsBtn.classList.remove('expanded');
            toggleTechnicalDetailsBtn.innerHTML = '<span class="toggle-icon">▶</span> View technical details (debug)';
        }
    });
}

// Toggle video player visibility
const toggleVideoPlayerBtn = document.getElementById('toggle-video-player-btn');
const videoPlayerContainer = document.getElementById('video-player-container');
if (toggleVideoPlayerBtn && videoPlayerContainer) {
    toggleVideoPlayerBtn.addEventListener('click', () => {
        if (videoPlayerContainer.classList.contains('video-player-collapsed')) {
            videoPlayerContainer.classList.remove('video-player-collapsed');
            toggleVideoPlayerBtn.classList.add('expanded');
            toggleVideoPlayerBtn.innerHTML = '<span class="toggle-icon">▼</span> Hide video';
        } else {
            videoPlayerContainer.classList.add('video-player-collapsed');
            toggleVideoPlayerBtn.classList.remove('expanded');
            toggleVideoPlayerBtn.innerHTML = '<span class="toggle-icon">▶</span> View video';
        }
    });
}

// Toggle verdict card details
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('verdict-toggle') || e.target.parentElement?.classList.contains('verdict-toggle')) {
        const button = e.target.classList.contains('verdict-toggle') ? e.target : e.target.parentElement;
        const target = button.getAttribute('data-target');
        const detailsElement = document.getElementById(`verdict-details-${target}`);
        
        if (detailsElement) {
            if (detailsElement.classList.contains('verdict-details-collapsed')) {
                detailsElement.classList.remove('verdict-details-collapsed');
                button.classList.add('expanded');
                button.innerHTML = '<span class="toggle-icon">▲</span> Hide';
            } else {
                detailsElement.classList.add('verdict-details-collapsed');
                button.classList.remove('expanded');
                button.innerHTML = '<span class="toggle-icon">▼</span> Why?';
            }
        }
    }
});

// Decision done button handler
const decisionDoneBtn = document.getElementById('decision-done-btn');
if (decisionDoneBtn) {
    decisionDoneBtn.addEventListener('click', () => {
        updateStatus('Choice recorded. You can continue editing or return to projects.', 'success');
        // Optionally scroll to top or provide other feedback
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// Show decision section with mock data (for demonstration)
function showMockDecisionSection(gcsPath) {
    // Mock analysis results with timestamps
    const mockResults = {
        gcs_path: gcsPath,
        verdict_moments: {
            safe: { timestamp: 8.5, label: "Safe / Defensible" },
            bold: { timestamp: 52.3, label: "High-Variance / Bold" },
            avoid: { timestamp: 94.1, label: "Avoid / Common Pitfall" }
        },
        video_duration: 125.0 // mock duration in seconds
    };
    
    const decisionSection = document.getElementById('decision-section');
    if (decisionSection) {
        decisionSection.style.display = 'block';
        
        // Update technical details with mock result
        const technicalJsonOutput = document.getElementById('json-output');
        if (technicalJsonOutput) {
            technicalJsonOutput.textContent = JSON.stringify(mockResults, null, 2);
        }
        
        // Render timeline markers
        renderTimelineMarkers(mockResults.verdict_moments, mockResults.video_duration);
        
        // Show timestamp links on verdict cards
        updateVerdictCardTimestamps(mockResults.verdict_moments);
    }
}

// Render timeline markers on video player
function renderTimelineMarkers(verdictMoments, videoDuration) {
    const markersContainer = document.getElementById('video-timeline-markers');
    if (!markersContainer) return;
    
    // Clear existing markers
    markersContainer.innerHTML = '';
    
    // Create marker for each verdict
    Object.entries(verdictMoments).forEach(([type, data]) => {
        const marker = document.createElement('div');
        marker.className = `timeline-marker timeline-marker-${type}`;
        marker.setAttribute('data-verdict-type', type);
        marker.setAttribute('data-time', formatTimestamp(data.timestamp));
        marker.setAttribute('data-timestamp', data.timestamp);
        marker.title = `${data.label} - ${formatTimestamp(data.timestamp)}`;
        
        // Position marker based on percentage of video duration
        const position = (data.timestamp / videoDuration) * 100;
        marker.style.left = `${position}%`;
        
        // Add click handler to seek video
        marker.addEventListener('click', () => {
            seekVideoTo(data.timestamp);
        });
        
        markersContainer.appendChild(marker);
    });
}

// Update verdict cards with timestamp links
function updateVerdictCardTimestamps(verdictMoments) {
    Object.entries(verdictMoments).forEach(([type, data]) => {
        const timestampLink = document.querySelector(`.verdict-timestamp-link[data-verdict-type="${type}"]`);
        if (timestampLink) {
            const timestampText = timestampLink.querySelector('.timestamp-text');
            if (timestampText) {
                timestampText.textContent = formatTimestamp(data.timestamp);
            }
            timestampLink.style.display = 'inline-flex';
            
            // Add click handler
            timestampLink.addEventListener('click', () => {
                seekVideoTo(data.timestamp);
            });
        }
    });
}

// Seek video to specific timestamp
function seekVideoTo(timestamp) {
    // First, expand video player if collapsed
    const videoPlayerContainer = document.getElementById('video-player-container');
    const toggleVideoPlayerBtn = document.getElementById('toggle-video-player-btn');
    if (videoPlayerContainer && videoPlayerContainer.classList.contains('video-player-collapsed')) {
        videoPlayerContainer.classList.remove('video-player-collapsed');
        if (toggleVideoPlayerBtn) {
            toggleVideoPlayerBtn.classList.add('expanded');
            toggleVideoPlayerBtn.innerHTML = '<span class="toggle-icon">▼</span> Hide video';
        }
    }
    
    // Seek video
    if (projectVideo) {
        projectVideo.currentTime = timestamp;
        projectVideo.play();
        
        // Scroll to video player
        videoPlayerSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Format timestamp as MM:SS
function formatTimestamp(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Initialize on load
initAuth();

