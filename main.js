import { supabase, getAuthHeaders } from './supabase.js';
import { ProjectManager } from './projects.js';
import { ProfileManager } from './profile.js';

const API_BASE_URL = window.API_BASE_URL || '';

let currentUser = null;
let projectManager = null;
let profileManager = null;
let currentProjectId = null;
let currentVideoPath = null;

// DOM elements
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const landingPage = document.getElementById('landing-page');
const projectsView = document.getElementById('projects-view');
const createProjectView = document.getElementById('create-project-view');
const editProjectView = document.getElementById('edit-project-view');
const projectView = document.getElementById('project-view');
// DISABLED - Profile view commented out in HTML
// const profileView = document.getElementById('profile-view');
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
// DISABLED - Profile view commented out in HTML
// const backFromProfileBtn = document.getElementById('back-from-profile-btn');
const editProjectBtn = document.getElementById('edit-project-btn');
const projectTitle = document.getElementById('project-title');
const videoInput = document.getElementById('video-input');
const statusText = document.getElementById('status-text');
const jsonOutput = document.getElementById('json-output');
const createProjectForm = document.getElementById('create-project-form');
const editProjectForm = document.getElementById('edit-project-form');
// DISABLED - Profile view commented out in HTML
// const profileForm = document.getElementById('profile-form');

// New video selection elements
const videoSelectionSection = document.getElementById('video-selection-section');
const uploadNewVideoBtn = document.getElementById('upload-new-video-btn');
const chooseFromLibraryBtn = document.getElementById('choose-from-library-btn');
const uploadProgressSection = document.getElementById('upload-progress-section');
const uploadProgressText = document.getElementById('upload-progress-text');
const uploadProgressBar = document.getElementById('upload-progress-bar');
const analysisProgressSection = document.getElementById('analysis-progress-section');
const videoPlayerSection = document.getElementById('video-player-section');
const projectVideo = document.getElementById('project-video');
const videoSource = document.getElementById('video-source');
const videoLoadingState = document.getElementById('video-loading-state');
const analysisManualCta = document.getElementById('analysis-manual-cta');
const manualAnalysisBtn = document.getElementById('manual-analysis-btn');
const analysisManualHint = document.getElementById('analysis-manual-hint');

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
            // Cleaned up old localStorage entries
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
        // Profile UI disabled - always show projects list
            await showProjectsView();
    } else {
        // User is not logged in - show landing page
        loginBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'none';
        landingPage.style.display = 'block';
        projectsView.style.display = 'none';
        createProjectView.style.display = 'none';
        editProjectView.style.display = 'none';
        projectView.style.display = 'none';
        // profileView.style.display = 'none'; // DISABLED
    }
}

// Helper function to stop video playback
function stopVideoPlayback() {
    if (projectVideo && !projectVideo.paused) {
        projectVideo.pause();
        projectVideo.currentTime = 0; // Reset to beginning
        // Video stopped
    }
}

// Show projects list view
async function showProjectsView() {
    stopVideoPlayback(); // Stop any playing video
    projectsView.style.display = 'block';
    createProjectView.style.display = 'none';
    editProjectView.style.display = 'none';
    projectView.style.display = 'none';
    // profileView.style.display = 'none'; // DISABLED
    currentProjectId = null;
    await renderProjectsList();
}

// Show create project view
function showCreateProjectView() {
    stopVideoPlayback(); // Stop any playing video
    projectsView.style.display = 'none';
    createProjectView.style.display = 'block';
    editProjectView.style.display = 'none';
    projectView.style.display = 'none';
    // profileView.style.display = 'none'; // DISABLED
    createProjectForm.reset();
    currentProjectId = null;
}

// Show edit project view
async function showEditProjectView(projectId) {
    projectsView.style.display = 'none';
    createProjectView.style.display = 'none';
    editProjectView.style.display = 'block';
    projectView.style.display = 'none';
    // profileView.style.display = 'none'; // DISABLED
    currentProjectId = projectId;
    
    const project = await projectManager.getProject(projectId);
    if (project) {
        const creativeDirection = project.creative_direction || {};
        const creatorContext = project.creator_context || {};

        document.getElementById('edit-project-name').value = project.name;
        document.getElementById('edit-project-mood').value = creativeDirection.mood || '';
        document.getElementById('edit-project-title-hint').value = creativeDirection.title_hint || '';
        document.getElementById('edit-project-notes').value = creativeDirection.notes || '';
        document.getElementById('edit-project-maturity-hint').value = creatorContext.maturity_hint || '';
        document.getElementById('edit-project-niche-hint').value = creatorContext.niche_hint || '';
    }
}

// Show project detail view
async function showProjectView(projectId) {
    try {
    projectsView.style.display = 'none';
    createProjectView.style.display = 'none';
    editProjectView.style.display = 'none';
    projectView.style.display = 'block';
    // profileView.style.display = 'none'; // DISABLED
    currentProjectId = projectId;
    
    const project = await projectManager.getProject(projectId);
        
    if (project) {
        projectTitle.textContent = project.name;
        
        // Display project info (from JSONB fields)
        const creativeDirection = project.creative_direction || {};
        const creatorContext = project.creator_context || {};
        const contentSources = project.content_sources || {};

        document.getElementById('info-mood').textContent = creativeDirection.mood || '-';
        document.getElementById('info-title-hint').textContent = creativeDirection.title_hint || '-';
        document.getElementById('info-notes').textContent = creativeDirection.notes || '-';
        document.getElementById('info-maturity').textContent = creatorContext.maturity_hint || '-';
        document.getElementById('info-niche').textContent = creatorContext.niche_hint || '-';
        
        // Display video path (shortened for display)
        const videoPathDisplay = document.getElementById('info-video-path');
        const videoPath = contentSources.video_path;
        if (videoPath && videoPath !== '-') {
            // Show just the filename for readability
            const filename = videoPath.split('/').pop();
            videoPathDisplay.textContent = filename;
            videoPathDisplay.title = videoPath; // Full path on hover
        } else {
            videoPathDisplay.textContent = 'No video uploaded yet';
            videoPathDisplay.title = '';
        }
        
        // Check if video_path exists - determines UI state
        const hasVideo = videoPath && videoPath !== '-';
        
        if (hasVideo) {
            // Video already selected - hide selection UI, show player
            currentVideoPath = videoPath;
            videoSelectionSection.style.display = 'none';
            uploadProgressSection.style.display = 'none';
            analysisProgressSection.style.display = 'none';
            videoPlayerSection.style.display = 'block';
            
            // Load video into player with signed URL immediately
            const videoLoaded = await loadVideoIntoPlayer(videoPath);
            
            if (videoLoaded) {
                // Video stream is ready and available for playback
            } else {
                console.warn('Video could not be loaded, but continuing...');
            }
            
            // TODO: Check if analysis exists in database
            // const analysis = await fetch(`${API_BASE_URL}/analysis/${currentProjectId}`);
            // if (analysis.data) { showDecisionSectionFromAnalysis(analysis.data); showManualAnalysisCTA(false); }
            // else { showManualAnalysisCTA(true, 'Video is ready. Run analysis when you’re ready.'); }
            
            // Until backend is wired, show manual analysis CTA
            showManualAnalysisCTA(true, 'Video is ready. Run analysis when you’re ready.');
            
        } else {
            // No video yet - show selection UI
            videoSelectionSection.style.display = 'block';
            uploadProgressSection.style.display = 'none';
            analysisProgressSection.style.display = 'none';
            videoPlayerSection.style.display = 'none';
            showManualAnalysisCTA(false);
            
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
        
        // Project details are always visible (no toggle)
        
        // Ensure technical details are collapsed
        const technicalDetailsElement = document.getElementById('technical-details');
        const toggleTechnicalDetailsBtnElement = document.getElementById('toggle-technical-details-btn');
        if (technicalDetailsElement && toggleTechnicalDetailsBtnElement) {
            technicalDetailsElement.classList.add('technical-details-collapsed');
            toggleTechnicalDetailsBtnElement.classList.remove('expanded');
            toggleTechnicalDetailsBtnElement.innerHTML = '<span class="toggle-icon">▶</span> View technical details (debug)';
        }
        
        // Video player is always visible when video exists (no toggle needed)
        
        // Project view loaded successfully
    } catch (error) {
        console.error('Error in showProjectView:', error);
        alert('Error loading project: ' + error.message);
    }
}

// Render projects list
let isRendering = false;
let renderRequested = false;
async function renderProjectsList() {
    if (!projectManager || !projectsList) {
        console.warn('Cannot render projects list: projectManager or projectsList not available');
        return;
    }
    
    // If already rendering, mark that a re-render was requested
    if (isRendering) {
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
            
            // Render project cards (removed analyses fetch to speed up rendering)
            for (const project of projects) {
                try {
                const projectCard = document.createElement('div');
                projectCard.className = 'project-card';
                    
                    // Handle both old and new data structures
                    const creativeDirection = project.creative_direction || {};
                    const titleHint = creativeDirection.title_hint || project.title_hint || '';
                    const displayInfo = titleHint ? `Title: ${escapeHtml(titleHint)}` : 'No title hint';
                    
                    // Safely format date
                    let createdDate = 'Unknown';
                    try {
                        if (project.created_at) {
                            createdDate = new Date(project.created_at).toLocaleDateString();
                        }
                    } catch (dateError) {
                        console.warn('Error formatting date for project:', project.id, dateError);
                    }
                    
                projectCard.innerHTML = `
                        <h3>${escapeHtml(project.name || 'Unnamed Project')}</h3>
                        <p class="project-meta">Created: ${createdDate}</p>
                        <p class="project-meta">${displayInfo}</p>
                    <button class="btn btn-primary open-project-btn" data-project-id="${project.id}">Open Project</button>
                    <button class="btn btn-ghost delete-project-btn" data-project-id="${project.id}">Delete</button>
                `;
                projectsList.appendChild(projectCard);
                } catch (cardError) {
                    console.error(`Error rendering project card for ${project.id}:`, cardError, cardError.stack);
                    // Continue with next project even if one fails
                }
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
        // Initiating OAuth login
        
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
            // Supabase will handle the redirect automatically
        }
    } catch (err) {
        console.error('Login error:', err);
        updateStatus('Login error: ' + err.message, 'error');
    }
}

// Auth Modal Elements
const authModal = document.getElementById('auth-modal');
const closeAuthModal = document.getElementById('close-auth-modal');
const tabLogin = document.getElementById('tab-login');
const tabSignup = document.getElementById('tab-signup');
const loginFormContainer = document.getElementById('login-form-container');
const signupFormContainer = document.getElementById('signup-form-container');
const resetFormContainer = document.getElementById('reset-form-container');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const passwordResetForm = document.getElementById('reset-form');
const forgotPasswordLink = document.getElementById('forgot-password-link');
const backToLoginBtn = document.getElementById('back-to-login');
const googleLoginBtn = document.getElementById('google-login-btn');
const googleSignupBtn = document.getElementById('google-signup-btn');

// Open Auth Modal
function openAuthModal(tab = 'login') {
    authModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    if (tab === 'signup') {
        showSignupForm();
    } else {
        showLoginForm();
    }
}

// Close Auth Modal
function closeAuthModalHandler() {
    authModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    // Clear forms
    if (loginForm) loginForm.reset();
    if (signupForm) signupForm.reset();
    if (passwordResetForm) passwordResetForm.reset();
}

// Show Login Form
function showLoginForm() {
    tabLogin.classList.add('active');
    tabSignup.classList.remove('active');
    loginFormContainer.style.display = 'block';
    signupFormContainer.style.display = 'none';
    resetFormContainer.style.display = 'none';
}

// Show Signup Form
function showSignupForm() {
    tabSignup.classList.add('active');
    tabLogin.classList.remove('active');
    signupFormContainer.style.display = 'block';
    loginFormContainer.style.display = 'none';
    resetFormContainer.style.display = 'none';
}

// Show Reset Form
function showResetForm() {
    resetFormContainer.style.display = 'block';
    loginFormContainer.style.display = 'none';
    signupFormContainer.style.display = 'none';
}

// Login button handlers - open modal instead of direct Google OAuth
loginBtn.addEventListener('click', () => openAuthModal('login'));
if (landingLoginBtn) {
    landingLoginBtn.addEventListener('click', () => openAuthModal('login'));
}
if (landingFooterLoginBtn) {
    landingFooterLoginBtn.addEventListener('click', () => openAuthModal('login'));
}

// Close modal handlers
if (closeAuthModal) {
    closeAuthModal.addEventListener('click', closeAuthModalHandler);
}
if (authModal) {
    authModal.addEventListener('click', (e) => {
        if (e.target.classList.contains('auth-modal-overlay')) {
            closeAuthModalHandler();
        }
    });
}

// Tab switching
if (tabLogin) tabLogin.addEventListener('click', showLoginForm);
if (tabSignup) tabSignup.addEventListener('click', showSignupForm);

// Forgot password link
if (forgotPasswordLink) forgotPasswordLink.addEventListener('click', showResetForm);
if (backToLoginBtn) backToLoginBtn.addEventListener('click', showLoginForm);

// Google OAuth handlers
if (googleLoginBtn) googleLoginBtn.addEventListener('click', handleLogin);
if (googleSignupBtn) googleSignupBtn.addEventListener('click', handleLogin);

// Email/Password Login
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (error) {
                alert('Login error: ' + error.message);
            } else {
                closeAuthModalHandler();
                // updateUI will be called by onAuthStateChange
            }
        } catch (err) {
            console.error('Login error:', err);
            alert('An error occurred during login. Please try again.');
        }
    });
}

// Email/Password Signup
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-password-confirm').value;
        
        // Validate passwords match
        if (password !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }
        
        // Validate password strength
        if (password.length < 8) {
            alert('Password must be at least 8 characters');
            return;
        }
        
        try {
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    emailRedirectTo: window.location.origin
                }
            });
            
            if (error) {
                alert('Signup error: ' + error.message);
            } else {
                alert('Success! Check your email to verify your account.');
                closeAuthModalHandler();
            }
        } catch (err) {
            console.error('Signup error:', err);
            alert('An error occurred during signup. Please try again.');
        }
    });
}

// Password Reset
if (passwordResetForm) {
    passwordResetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('reset-email').value;
        
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin
            });
            
            if (error) {
                alert('Error: ' + error.message);
            } else {
                alert('Password reset link sent! Check your email.');
                showLoginForm();
            }
        } catch (err) {
            console.error('Reset error:', err);
            alert('An error occurred. Please try again.');
        }
    });
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
    const statusSection = document.querySelector('.status-section');
    statusText.textContent = message;
    statusText.className = `status-${type}`;
    
    // Hide status section when empty
    if (statusSection) {
        statusSection.style.display = message ? 'block' : 'none';
    }
}

// Reset form
function resetForm() {
    videoInput.value = '';
    analyzeBtn.disabled = true;
    jsonOutput.textContent = 'No analysis yet.';
    updateStatus('');
}

// Show profile view
// DISABLED - Profile view removed from UI (keeping table for backend usage tracking)
// async function showProfileView() {
//     stopVideoPlayback();
//     projectsView.style.display = 'none';
//     createProjectView.style.display = 'none';
//     editProjectView.style.display = 'none';
//     projectView.style.display = 'none';
//     profileView.style.display = 'block';
//
//     if (profileManager && currentUser) {
//         const profile = await profileManager.getProfile(currentUser.id);
//         if (profile) {
//             document.getElementById('profile-stage').value = profile.stage || '';
//             document.getElementById('profile-subscriber-count').value = profile.subscriber_count || '';
//             const contentNicheSelect = document.getElementById('profile-content-niche');
//             const savedNiche = profile.content_niche || 'general';
//             const optionExists = Array.from(contentNicheSelect.options).some(opt => opt.value === savedNiche);
//             contentNicheSelect.value = optionExists ? savedNiche : 'general';
//             document.getElementById('profile-upload-frequency').value = profile.upload_frequency || '';
//             document.getElementById('profile-growth-goal').value = profile.growth_goal || '';
//         }
//     }
// }

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
    
    if (!projectManager) {
        console.error('Project manager not initialized');
        alert('Error: Project manager not initialized. Please refresh the page.');
        return;
    }
    
    const formData = new FormData(e.target);
    
    // Build project data with new JSONB structure
    const projectData = {
        name: formData.get('name'),
        creative_direction: {
            mood: formData.get('mood') || '',
            title_hint: formData.get('title_hint') || '',
            notes: formData.get('notes') || ''
        },
        creator_context: {
            maturity_hint: formData.get('maturity_hint') || '',
            niche_hint: formData.get('niche_hint') || ''
        },
        profile_photos: [] // TODO: Add support for profile photos upload
    };
    
    try {
    // Create new project
    const result = await projectManager.createProject(projectData);
        
    if (result.error) {
            console.error('Error creating project:', result.error);
        alert('Error creating project: ' + result.error.message);
        } else if (result.data) {
            
            // Reset the form
            createProjectForm.reset();
            
            // Show the newly created project
        await showProjectView(result.data.id);
        } else {
            console.error('Unexpected result format:', result);
            alert('Error: Unexpected response from server');
        }
    } catch (error) {
        console.error('Exception during project creation:', error);
        alert('Error creating project: ' + error.message);
    }
});

editProjectForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentProjectId) return;
    
    const formData = new FormData(e.target);
    
    // Build project data with new JSONB structure
    const projectData = {
        name: formData.get('name'),
        creative_direction: {
            mood: formData.get('mood') || '',
            title_hint: formData.get('title_hint') || '',
            notes: formData.get('notes') || ''
        },
        creator_context: {
            maturity_hint: formData.get('maturity_hint') || '',
            niche_hint: formData.get('niche_hint') || ''
        },
        profile_photos: [] // TODO: Add support for profile photos upload
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

// DISABLED - Profile UI removed
// profileBtn.addEventListener('click', () => {
//     showProfileView();
// });

// DISABLED - Profile UI removed
// backFromProfileBtn.addEventListener('click', () => {
//     showProjectsView();
// });

// DISABLED - Profile form UI removed
// profileForm.addEventListener('submit', async (e) => {
//     e.preventDefault();
//
//     if (!profileManager || !currentUser) {
//         console.error('Profile manager or user not initialized');
//         alert('Error: Profile system not ready. Please refresh the page.');
//         return;
//     }
//
//     const submitBtn = profileForm.querySelector('button[type="submit"]');
//     const originalBtnText = submitBtn ? submitBtn.textContent : '';
//
//     try {
//         if (submitBtn) {
//             submitBtn.disabled = true;
//             submitBtn.textContent = 'Saving...';
//         }
//
//         const formData = new FormData(e.target);
//         const profileData = {
//             stage: formData.get('stage') || null,
//             subscriber_count: formData.get('subscriber_count') ? parseInt(formData.get('subscriber_count')) : null,
//             content_niche: formData.get('content_niche') || null,
//             upload_frequency: formData.get('upload_frequency') || null,
//             growth_goal: formData.get('growth_goal') || null,
//         };
//
//         console.log('Saving profile data:', profileData);
//
//         const result = await profileManager.saveProfile(currentUser.id, profileData);
//         console.log('Profile save result:', result);
//
//         if (result.error) {
//             console.error('Error saving profile:', result.error);
//             alert('Error saving profile: ' + result.error.message);
//             if (submitBtn) {
//                 submitBtn.disabled = false;
//                 submitBtn.textContent = originalBtnText;
//             }
//         } else {
//             console.log('Profile saved successfully to Supabase');
//             if (submitBtn) {
//                 submitBtn.textContent = '✓ Saved!';
//                 submitBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
//             }
//
//             setTimeout(async () => {
//                 await showProjectsView();
//                 if (submitBtn) {
//                     submitBtn.disabled = false;
//                     submitBtn.textContent = originalBtnText;
//                     submitBtn.style.background = '';
//                 }
//             }, 1000);
//         }
//     } catch (error) {
//         console.error('Exception saving profile:', error);
//         alert('Error saving profile: ' + error.message);
//         if (submitBtn) {
//             submitBtn.disabled = false;
//             submitBtn.textContent = originalBtnText;
//         }
//     }
// });

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
        const file = e.target.files[0];
        
        // Check video duration before upload
        const duration = await getVideoDuration(file);
        
        if (duration === null) {
            alert('Could not read video file. Please try a different file.');
            videoInput.value = ''; // Reset input
            return;
        }
        
        // Hard limit: 15 minutes (900 seconds)
        const maxDuration = 900; // 15 minutes in seconds
        if (duration >= maxDuration) {
            const durationMinutes = Math.floor(duration / 60);
            const durationSeconds = Math.floor(duration % 60);
            alert(`Video is too long (${durationMinutes}:${durationSeconds.toString().padStart(2, '0')}).\n\nMaximum allowed: 15 minutes.\n\nPlease upload a shorter video.`);
            videoInput.value = ''; // Reset input
            return;
        }
        
        // Video is under 15 minutes, proceed with upload
        await handleVideoUpload(file);
    }
});

// Get video duration from file
function getVideoDuration(file) {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        
        video.onloadedmetadata = function() {
            window.URL.revokeObjectURL(video.src);
            resolve(video.duration);
        };
        
        video.onerror = function() {
            window.URL.revokeObjectURL(video.src);
            resolve(null);
        };
        
        video.src = URL.createObjectURL(file);
    });
}

// Get signed URL for video playback
async function getVideoPlaybackUrl(gcsPath) {
    try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/get-video-url`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders
            },
            body: JSON.stringify({
                gcs_path: gcsPath
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Failed to get video URL:', errorText);
            throw new Error(`Failed to get video URL (${response.status})`);
        }

        const { signed_url } = await response.json();
        // Got signed URL for video playback
        return signed_url;
    } catch (error) {
        console.error('Error getting video playback URL:', error);
        return null;
    }
}

// Load video into player with loading state
async function loadVideoIntoPlayer(gcsPath) {
    if (!gcsPath || !videoLoadingState || !projectVideo || !videoSource) {
        console.warn('Missing video elements or path');
        return false;
    }
    
    try {
        // Show loading state
        videoLoadingState.style.display = 'block';
        projectVideo.style.display = 'none';
        
        // Get signed URL
        // Getting playback URL for video
        const playbackUrl = await getVideoPlaybackUrl(gcsPath);
        
        if (!playbackUrl) {
            console.error('Could not get playback URL');
            videoLoadingState.style.display = 'none';
            return false;
        }
        
        // Set video source
        videoSource.src = playbackUrl;
        // Video source set, starting load
        
        // Wait for video to be ready
        return new Promise((resolve) => {
            const onLoadedMetadata = () => {
                // Video metadata loaded, ready for playback
                videoLoadingState.style.display = 'none';
                projectVideo.style.display = 'block';
                projectVideo.removeEventListener('loadedmetadata', onLoadedMetadata);
                projectVideo.removeEventListener('canplay', onCanPlay);
                projectVideo.removeEventListener('error', onError);
                resolve(true);
            };
            
            const onCanPlay = () => {
                // Video can play, ready for playback
                videoLoadingState.style.display = 'none';
                projectVideo.style.display = 'block';
                projectVideo.removeEventListener('loadedmetadata', onLoadedMetadata);
                projectVideo.removeEventListener('canplay', onCanPlay);
                projectVideo.removeEventListener('error', onError);
                resolve(true);
            };
            
            const onError = (e) => {
                console.error('Error loading video:', e);
                videoLoadingState.style.display = 'none';
                projectVideo.style.display = 'block';
                projectVideo.removeEventListener('loadedmetadata', onLoadedMetadata);
                projectVideo.removeEventListener('canplay', onCanPlay);
                projectVideo.removeEventListener('error', onError);
                resolve(false);
            };
            
            // Listen for both metadata and canplay - whichever comes first
            projectVideo.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
            projectVideo.addEventListener('canplay', onCanPlay, { once: true });
            projectVideo.addEventListener('error', onError, { once: true });
            
            // Start loading
            projectVideo.load();
        });
    } catch (error) {
        console.error('Error loading video:', error);
        videoLoadingState.style.display = 'none';
        projectVideo.style.display = 'block';
        return false;
    }
}

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
    
    // File selected for upload

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
        // Requesting signed URL for upload
        
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
        // Got signed URL for GCS upload
        currentVideoPath = gcs_path;

        // Step 2: Upload file directly to GCS with progress tracking
        // Uploading file to GCS
        
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
        // File uploaded to GCS successfully
        
        uploadProgressText.textContent = 'Upload complete! Saving...';
        uploadProgressBar.style.width = '100%';
        
        // Step 3: Save video_path to project (THIS LOCKS THE VIDEO)
        if (currentProjectId && projectManager && gcs_path) {
            // Saving video_path to project
                const updateResult = await projectManager.updateProject(currentProjectId, {
                    content_sources: { video_path: gcs_path }
                });
                if (updateResult.error) {
                    console.error('Error updating project:', updateResult.error);
                throw new Error('Failed to save video to project');
            }
            // video_path saved successfully to Supabase
            
            // Update the video path display in project details
            const videoPathDisplay = document.getElementById('info-video-path');
            if (videoPathDisplay) {
                const filename = gcs_path.split('/').pop();
                videoPathDisplay.textContent = filename;
                videoPathDisplay.title = gcs_path; // Full path on hover
                // Updated video path display on page
            }
        }

        // Step 4: Check usage limit before analysis
        if (profileManager && currentUser) {
            // Checking analysis usage limit
            const limitCheck = await profileManager.canUserAnalyze(currentUser.id);
            
            if (limitCheck.error) {
                console.error('Error checking usage limit:', limitCheck.error);
                updateStatus('Error checking usage limit. Please try again.', 'error');
                uploadProgressSection.style.display = 'none';
                return;
            }
            
            if (!limitCheck.canAnalyze) {
                // User has reached analysis limit
                uploadProgressSection.style.display = 'none';
                alert('You\'ve reached your limit of 50 analyses.\n\nUpgrade your account for unlimited analyses.');
                updateStatus('Analysis limit reached', 'error');
                return;
            }
            
            // Usage limit check passed, proceeding with analysis
        }
        
        // Step 5: Transition to analysis state
        // Hide upload progress
        uploadProgressSection.style.display = 'none';
        
        // Show video player with uploaded video
        videoPlayerSection.style.display = 'block';
        
        // Load video into player (with loading state) and ensure it's ready
        // Loading video into player for immediate playback
        const videoLoaded = await loadVideoIntoPlayer(gcs_path);
        
        if (videoLoaded) {
            // Video is ready for streaming
            // Scroll to video player so user sees it immediately
            videoPlayerSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        
        // Show analysis in progress
        analysisProgressSection.style.display = 'block';
        showManualAnalysisCTA(false);
            showManualAnalysisCTA(false);
        
        // Hide decision section while analyzing
        const decisionSection = document.getElementById('decision-section');
        if (decisionSection) {
            decisionSection.style.display = 'none';
        }
        
        // Increment analysis count (user is starting analysis)
        if (profileManager && currentUser) {
            await profileManager.incrementAnalysisCount(currentUser.id);
            console.log('Analysis count incremented');
        }
        
        // Starting analysis
        updateStatus('Analysis in progress...', 'info');
        
        // Trigger actual analysis API call
        try {
            const authHeaders = await getAuthHeaders();
            
            // Fetch current project to build full payload
            const project = await projectManager.getProject(currentProjectId);

            // Build the full request payload with new structure
            const requestPayload = {
                project_id: currentProjectId,
                content_sources: {
                    video_path: gcs_path
                },
                creative_direction: project?.creative_direction || {
                    mood: '',
                    notes: '',
                    title_hint: ''
                },
                creator_context: project?.creator_context || {
                    maturity_hint: '',
                    niche_hint: ''
                },
                profile_photos: project?.profile_photos || []
            };
            
            // Sending analysis request to API
            
            // Call the thumbnail generation endpoint (analysis may take 2-3 minutes)
            // Calling thumbnail generation API
            const analysisResponse = await fetch(`${API_BASE_URL}/thumbnails/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders
                },
                body: JSON.stringify(requestPayload)
            }).catch(fetchError => {
                console.error('Fetch error details:', fetchError);
                throw new Error(`Network error: ${fetchError.message}. Check if API_BASE_URL is correct: ${API_BASE_URL}`);
            });
            
            // Response received from API
            
            if (!analysisResponse.ok) {
                const errorText = await analysisResponse.text();
                console.error('Analysis API error response:', errorText);
                throw new Error(`Analysis failed (${analysisResponse.status}): ${errorText}`);
            }
            
            const analysisData = await analysisResponse.json();
            // Analysis complete
            
            analysisProgressSection.style.display = 'none';
            showDecisionSectionFromAnalysis(analysisData);
            updateStatus('Analysis complete! Review the moments below.', 'success');
            
        } catch (analysisError) {
            console.error('Analysis error:', analysisError);
            analysisProgressSection.style.display = 'none';
            updateStatus(`Analysis failed: ${analysisError.message}. You can retry manually.`, 'error');
            showManualAnalysisCTA(true, 'Analysis failed. Click to retry.');
        }
        
    } catch (error) {
        updateStatus(`Error: ${error.message}`, 'error');
        console.error('Upload error:', error);
        
        // Reset to selection UI on error
        videoSelectionSection.style.display = 'block';
        uploadProgressSection.style.display = 'none';
        analysisProgressSection.style.display = 'none';
        videoPlayerSection.style.display = 'none';
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

// Manual analysis trigger (fallback if upload did not auto-trigger analysis)
if (manualAnalysisBtn) {
    manualAnalysisBtn.addEventListener('click', () => {
        triggerAnalysisForExistingVideo();
    });
}

// Video player is always visible - no toggle needed

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
                button.innerHTML = '<span class="toggle-icon">▲</span> Hide pillars';
            } else {
                detailsElement.classList.add('verdict-details-collapsed');
                button.classList.remove('expanded');
                button.innerHTML = '<span class="toggle-icon">▼</span> Pillars (optional)';
            }
        }
    }
});

// Track selected verdict choice
let selectedVerdictData = null;

// Make verdict cards selectable
document.addEventListener('click', (e) => {
    const verdictCard = e.target.closest('.verdict-card');
    if (verdictCard) {
        // Remove previous selection
        document.querySelectorAll('.verdict-card').forEach(card => {
            card.classList.remove('verdict-card-selected');
        });
        
        // Mark this card as selected
        verdictCard.classList.add('verdict-card-selected');
        
        // Store selection data
        const verdictType = verdictCard.getAttribute('data-verdict-type');
        const frameElement = verdictCard.querySelector('.verdict-frame img');
        const explanationElement = verdictCard.querySelector('.verdict-explanation');
        const timestampLink = verdictCard.querySelector('.verdict-timestamp-link');
        
        selectedVerdictData = {
            type: verdictType,
            frame_url: frameElement ? frameElement.src : null,
            frame_id: frameElement ? frameElement.getAttribute('data-frame-id') : null,
            timestamp: timestampLink ? timestampLink.getAttribute('data-timestamp') : null,
            explanation: explanationElement ? explanationElement.textContent : '',
            label: verdictCard.querySelector('.verdict-label').textContent
        };
        
        // Verdict selected
    }
});

// Decision done button handler
const decisionDoneBtn = document.getElementById('decision-done-btn');
const decisionConfirmation = document.getElementById('decision-confirmation');
const confirmationChoiceText = document.getElementById('confirmation-choice-text');

if (decisionDoneBtn) {
    decisionDoneBtn.addEventListener('click', async () => {
        // Check if user selected a verdict
        if (!selectedVerdictData) {
            alert('Please select one of the three options above before proceeding.');
            return;
        }
        
        // 1️⃣ Persist the decision silently
        try {
            const decision = {
                project_id: currentProject.id,
                chosen_category: selectedVerdictData.type,
                frame_id: selectedVerdictData.frame_id,
                timestamp: selectedVerdictData.timestamp,
                created_at: new Date().toISOString()
            };
            
            // Saving decision
            
            // Save to Supabase (silent, no user feedback)
            const { error } = await supabase
                .from('decisions')
                .insert([decision]);
            
            if (error) {
                console.error('Error saving decision:', error);
                // Continue anyway - don't block the user experience
            } else {
                // Decision saved successfully
            }
        } catch (err) {
            console.error('Error in decision persistence:', err);
            // Continue anyway - this is non-critical
        }
        
        // 2️⃣ Show confirmation panel with appropriate copy
        const labelMap = {
            safe: 'Moment 1',
            bold: 'Moment 2',
            avoid: 'Moment 3'
        };
        
        confirmationChoiceText.textContent = `Saved: ${labelMap[selectedVerdictData.type] || selectedVerdictData.label}`;
        
        // Hide the CTA button and show confirmation
        decisionDoneBtn.style.display = 'none';
        decisionConfirmation.style.display = 'block';
        
        // Smooth scroll to confirmation
        decisionConfirmation.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
}

// 3️⃣ Confirmation Option Handlers

// Option A: Use This Frame
const confirmUseFrameBtn = document.getElementById('confirm-use-frame');
if (confirmUseFrameBtn) {
    confirmUseFrameBtn.addEventListener('click', () => {
        if (!selectedVerdictData || !selectedVerdictData.frame_url) {
            alert('No frame available to use.');
            return;
        }
        
        // Create download link for the frame
        const link = document.createElement('a');
        link.href = selectedVerdictData.frame_url;
        link.download = `frame-${selectedVerdictData.type}-${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Show timestamp info
        if (selectedVerdictData.timestamp) {
            const timestampFormatted = formatTimestamp(selectedVerdictData.timestamp);
            updateStatus(`Frame downloaded. Timestamp: ${timestampFormatted}`, 'success');
        } else {
            updateStatus('Frame downloaded successfully.', 'success');
        }
        
        // Frame downloaded
    });
}

// Option B: Design Around This Moment
const confirmDesignAroundBtn = document.getElementById('confirm-design-around');
if (confirmDesignAroundBtn) {
    confirmDesignAroundBtn.addEventListener('click', () => {
        if (!selectedVerdictData) {
            return;
        }
        
        // Show timestamp and context
        const timestampFormatted = selectedVerdictData.timestamp 
            ? formatTimestamp(selectedVerdictData.timestamp) 
            : 'Not available';
        
        // Create a simple alert with moment context
        const contextMessage = `Moment Context:\n\n` +
            `Timestamp: ${timestampFormatted}\n\n` +
            `${selectedVerdictData.explanation}\n\n` +
            `This is the moment captured from your video.`;
        
        alert(contextMessage);
        
        // Optionally seek to the timestamp in video
        if (selectedVerdictData.timestamp && projectVideo) {
            seekVideoTo(parseFloat(selectedVerdictData.timestamp));
        }
        
        // Moment context shown
    });
}

// Option C: I'll Handle It Myself
const confirmDismissBtn = document.getElementById('confirm-dismiss');
if (confirmDismissBtn) {
    confirmDismissBtn.addEventListener('click', () => {
        // Simply dismiss the confirmation and return control
        decisionConfirmation.style.display = 'none';
        
        // Optionally show subtle success message
        updateStatus('Your choice has been noted. You\'re all set.', 'success');
        
        // Scroll to top smoothly
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // User chose to handle it themselves
    });
}

// Show decision section from real analysis output (or mock shaped like it)
function showDecisionSectionFromAnalysis(analysis) {
    const decisionSection = document.getElementById('decision-section');
    if (!decisionSection) return;
        
        const technicalJsonOutput = document.getElementById('json-output');
        if (technicalJsonOutput) {
        technicalJsonOutput.textContent = JSON.stringify(analysis, null, 2);
    }
    
    const moments = (analysis?.phase1?.moments || []).slice(0, 3);
    
    // Get actual video duration from the video element if available
    let videoDuration = 120; // fallback
    if (projectVideo && !isNaN(projectVideo.duration) && projectVideo.duration > 0) {
        videoDuration = projectVideo.duration;
        // Using video element duration
    } else if (analysis?.video_duration) {
        videoDuration = analysis.video_duration;
        // Using API video_duration
    } else {
        const inferred = inferVideoDurationFromMoments(moments);
        if (inferred) {
            videoDuration = inferred;
            // Using inferred duration from moments
        }
    }
    
    // Rendering moments on timeline (logging removed for cleaner console)
    
    // Map first three moments to the existing card keys
    const cardOrder = ['safe', 'bold', 'avoid'];
    
    cardOrder.forEach((cardKey, idx) => {
        const moment = moments[idx];
        
        // Debug logging for each card mapping
        if (moment) {
            // Mapping moment to card
        }
        const card = document.querySelector(`.verdict-card[data-verdict-type="${cardKey}"]`);
        if (!card) return;
        
        const labelEl = card.querySelector('.verdict-label');
        const frameEl = card.querySelector('.verdict-frame');
        const explanationEl = card.querySelector('.verdict-explanation');
        const viewerFeelEl = card.querySelector('.verdict-viewer-feel');
        const detailsEl = card.querySelector('.verdict-details');
        const timestampLink = card.querySelector('.verdict-timestamp-link');
        
        // Populate label - always use "Moment 1/2/3" regardless of API frame_id
        if (labelEl) {
            labelEl.textContent = `Moment ${idx + 1}`;
        }
        
        // Populate frame preview
        if (frameEl) {
            frameEl.innerHTML = '';
            if (moment?.frame_url) {
                const img = document.createElement('img');
                img.src = moment.frame_url;
                img.alt = moment.moment_summary || `Moment ${idx + 1}`;
                img.loading = 'lazy';
                img.setAttribute('data-frame-id', moment.frame_id || '');
                
                // Handle image load errors
                img.onerror = () => {
                    console.warn(`Frame image failed to load for ${moment.frame_id}:`, moment.frame_url);
                    frameEl.innerHTML = '<div class="frame-placeholder-text">Frame image unavailable</div>';
                };
                
                img.onload = () => {
                    // Frame image loaded successfully
                    // Verify the URL path matches the frame_id if possible
                    if (moment.frame_id && moment.frame_url) {
                        const frameIdMatch = moment.frame_id.toLowerCase().replace(/\s+/g, '').replace('frame', '');
                        const urlMatch = moment.frame_url.includes(frameIdMatch) || moment.frame_url.includes(moment.frame_id);
                        if (!urlMatch) {
                            console.warn(`⚠️ Frame ID "${moment.frame_id}" may not match URL: ${moment.frame_url}`);
                        }
                    }
                };
                
                frameEl.appendChild(img);
            } else {
                const placeholder = document.createElement('div');
                placeholder.className = 'frame-placeholder-text';
                placeholder.textContent = 'Frame preview';
                frameEl.appendChild(placeholder);
            }
        }
        
        // Moment summary
        if (explanationEl) {
            explanationEl.textContent = moment?.moment_summary
                ? `Moment summary: ${moment.moment_summary}`
                : 'Moment summary unavailable.';
        }
        
        // Viewer feel
        if (viewerFeelEl) {
            viewerFeelEl.innerHTML = `<strong>Viewer may feel:</strong> ${moment?.viewer_feel || '—'}`;
        }
        
        // Why this reads + pillars
        if (detailsEl) {
            const whyList = Array.isArray(moment?.why_this_reads) ? moment.why_this_reads : [];
            const pillars = moment?.pillars || {};
            const attentionSignals = Array.isArray(pillars.attention_signals) ? pillars.attention_signals : [];
            
            const items = [];
            whyList.forEach(reason => items.push(`Why this reads: ${reason}`));
            
            if (pillars.emotional_signal) items.push(`Pillar — Emotional signal: ${pillars.emotional_signal}`);
            if (pillars.curiosity_gap) items.push(`Pillar — Curiosity gap: ${pillars.curiosity_gap}`);
            if (attentionSignals.length > 0) items.push(`Pillar — Attention signals: ${attentionSignals.join(', ')}`);
            if (pillars.readability_speed) items.push(`Pillar — Readability & speed: ${pillars.readability_speed}`);
            
            detailsEl.innerHTML = `<ul>${items.map(text => `<li>${text}</li>`).join('')}</ul>`;
        }
        
        // Timestamps + timeline links
        const timestampSeconds = parseTimestampToSeconds(moment?.timestamp);
        if (timestampLink) {
            if (timestampSeconds != null) {
                const tsText = timestampLink.querySelector('.timestamp-text');
                if (tsText) tsText.textContent = formatTimestamp(timestampSeconds);
                timestampLink.style.display = 'inline-flex';
                timestampLink.setAttribute('data-timestamp', timestampSeconds);
                timestampLink.addEventListener('click', () => seekVideoTo(timestampSeconds));
            } else {
                timestampLink.style.display = 'none';
            }
        }
    });
    
    // Timeline markers use the three mapped moments
    const verdictMoments = {};
    const mappedMoments = (analysis?.phase1?.moments || []).slice(0, 3);
    cardOrder.forEach((key, idx) => {
        const m = mappedMoments[idx];
        if (!m) return;
        const ts = parseTimestampToSeconds(m.timestamp);
        verdictMoments[key] = {
            timestamp: ts != null ? ts : 0,
            label: m.frame_id || `Moment ${idx + 1}`
        };
    });
    
    renderTimelineMarkers(verdictMoments, videoDuration);
    updateVerdictCardTimestamps(verdictMoments);
    
    decisionSection.style.display = 'block';
    decisionSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    showManualAnalysisCTA(false);
}

function parseTimestampToSeconds(ts) {
    if (ts == null) return null;
    if (typeof ts === 'number') return ts;
    const cleaned = String(ts).replace(/[^0-9.]/g, '');
    if (!cleaned) return null;
    const num = parseFloat(cleaned);
    return Number.isFinite(num) ? num : null;
}

function inferVideoDurationFromMoments(moments) {
    if (!Array.isArray(moments) || moments.length === 0) return null;
    const maxTs = moments
        .map(m => parseTimestampToSeconds(m?.timestamp))
        .filter(v => Number.isFinite(v))
        .reduce((a, b) => Math.max(a, b), 0);
    return maxTs > 0 ? maxTs + 5 : null; // small buffer
}

function buildMockAnalysis(gcsPath) {
    return {
        project_id: currentProjectId || 'mock-project',
        status: 'draft',
        recommended_title: 'Sample video title',
        thumbnail_url: '',
        selected_frame_url: '',
        phase1: {
            positioning: 'ClickMoment identifies moments in your video that are already psychologically ready to earn clicks.',
            moments: [
                {
                    frame_id: 'Moment 1',
                    frame_number: 1,
                    timestamp: '8.5s',
                    frame_url: '',
                    moment_summary: 'A clear emotional beat with a readable focal point.',
                    viewer_feel: 'Immediate joy and curiosity.',
                    why_this_reads: [
                        'Emotion is clear at a glance',
                        'Hints at a story without explaining it',
                        'Subject holds up on mobile in ~2 seconds'
                    ],
                    optional_note: null,
                    pillars: {
                        emotional_signal: 'Visible, unambiguous emotion.',
                        curiosity_gap: 'Suggests something just happened, without resolving it.',
                        attention_signals: ['face', 'contrast'],
                        readability_speed: 'Central subject, readable at small size.'
                    }
                },
                {
                    frame_id: 'Moment 2',
                    frame_number: 2,
                    timestamp: '14.2s',
                    frame_url: '',
                    moment_summary: 'A hint of tension or surprise that stands out.',
                    viewer_feel: 'Intrigued, wanting to know what happens next.',
                    why_this_reads: [
                        'Emotion is visible even if mixed',
                        'Hints at an outcome without revealing it',
                        'Key subject is still findable on mobile'
                    ],
                    optional_note: null,
                    pillars: {
                        emotional_signal: 'Detectable tension/surprise.',
                        curiosity_gap: 'Something is happening; outcome not revealed.',
                        attention_signals: ['face'],
                        readability_speed: 'Focal point remains findable on mobile.'
                    }
                },
                {
                    frame_id: 'Moment 3',
                    frame_number: 3,
                    timestamp: '22.0s',
                    frame_url: '',
                    moment_summary: 'A quieter beat that still captures a real emotion.',
                    viewer_feel: 'Calm interest, looking for what comes next.',
                    why_this_reads: [
                        'Emotion present without needing text',
                        'Suggests a story beat without spelling it out',
                        'Focal point stays readable on small screens'
                    ],
                    optional_note: null,
                    pillars: {
                        emotional_signal: 'Soft but authentic emotion.',
                        curiosity_gap: 'Implied next step without exposition.',
                        attention_signals: ['face'],
                        readability_speed: 'Single focal point, holds up small.'
                    }
                }
            ],
            meta: {
                selection_note: 'Mock data for demo',
                positioning: 'ClickMoment finds moments that already deserve to be thumbnails.'
            }
        },
        video_duration: 125,
        gcs_path: gcsPath
    };
}

function showManualAnalysisCTA(show, hintText) {
    if (!analysisManualCta) return;
    analysisManualCta.style.display = show ? 'block' : 'none';
    if (analysisManualHint && hintText) {
        analysisManualHint.textContent = hintText;
    }
}

async function triggerAnalysisForExistingVideo() {
    if (!currentVideoPath) {
        alert('No video found to analyze. Upload a video first.');
        return;
    }
    if (!API_BASE_URL || API_BASE_URL.trim() === '') {
        updateStatus('API_BASE_URL is not configured. Please set it in environment variables.', 'error');
        return;
    }
    
    // Optional: usage limit check could be added here similar to upload flow
    
    // Show progress UI
    if (analysisProgressSection) analysisProgressSection.style.display = 'block';
    const decisionSection = document.getElementById('decision-section');
    if (decisionSection) decisionSection.style.display = 'none';
    showManualAnalysisCTA(false);
    updateStatus('Running analysis...', 'info');
    
    // Ensure video is ready
    await loadVideoIntoPlayer(currentVideoPath);
    
    try {
        // Call the real analysis API
        const authHeaders = await getAuthHeaders();
        
        // Fetch current project and user profile to build full payload
        const project = await projectManager.getProject(currentProjectId);
        const userProfile = await profileManager.getProfile(currentUser.id);
        
        // Build the full request payload
        const requestPayload = {
            project_id: currentProjectId,
            content_sources: {
                video_path: currentVideoPath
            },
            target: {
                platform: project?.platform || 'youtube',
                optimization: project?.optimization || '',
                audience_profile: project?.audience_profile || ''
            },
            creative_brief: {
                title_hint: project?.title_hint || '',
                mood: project?.mood || '',
                brand_colors: Array.isArray(project?.brand_colors) ? project.brand_colors : [],
                notes: project?.notes || ''
            },
            channel_profile: {
                stage: userProfile?.stage || '',
                subscriber_count: userProfile?.subscriber_count || 0,
                content_niche: userProfile?.content_niche || '',
                upload_frequency: userProfile?.upload_frequency || '',
                growth_goal: userProfile?.growth_goal || ''
            },
            profile_photos: [] // TODO: Add user avatar/headshot if available
        };
        
        // Sending analysis request to API
        
        // Call the thumbnail generation endpoint (analysis may take 2-3 minutes)
        // Calling thumbnail generation API
        const analysisResponse = await fetch(`${API_BASE_URL}/thumbnails/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders
            },
            body: JSON.stringify(requestPayload)
        }).catch(fetchError => {
            console.error('Fetch error details:', fetchError);
            throw new Error(`Network error: ${fetchError.message}. Check if API_BASE_URL is correct: ${API_BASE_URL}`);
        });
        
        // Response received from API
        
        if (!analysisResponse.ok) {
            const errorText = await analysisResponse.text();
            console.error('Analysis API error response:', errorText);
            throw new Error(`Analysis failed (${analysisResponse.status}): ${errorText}`);
        }
        
        const analysisData = await analysisResponse.json();
        // Analysis complete
        
        showDecisionSectionFromAnalysis(analysisData);
        if (analysisProgressSection) analysisProgressSection.style.display = 'none';
        updateStatus('Analysis complete! Review the moments below.', 'success');
        
    } catch (error) {
        console.error('Analysis error:', error);
        if (analysisProgressSection) analysisProgressSection.style.display = 'none';
        updateStatus(`Analysis failed: ${error.message}`, 'error');
        showManualAnalysisCTA(true, 'Analysis failed. Try again?');
    }
}

// Render timeline markers on video player
function renderTimelineMarkers(verdictMoments, videoDuration) {
    const markersContainer = document.getElementById('video-timeline-markers');
    if (!markersContainer) return;
    
    // Clear existing markers
    markersContainer.innerHTML = '';
    
    if (!videoDuration || videoDuration <= 0) {
        console.warn('Invalid video duration for timeline markers:', videoDuration);
        return;
    }
    
    // Create marker for each verdict
    Object.entries(verdictMoments).forEach(([type, data]) => {
        if (!data.timestamp || data.timestamp < 0) {
            console.warn(`Invalid timestamp for ${type}:`, data.timestamp);
            return;
        }
        
        const marker = document.createElement('div');
        marker.className = `timeline-marker timeline-marker-${type}`;
        marker.setAttribute('data-verdict-type', type);
        marker.setAttribute('data-time', formatTimestamp(data.timestamp));
        marker.setAttribute('data-timestamp', data.timestamp);
        marker.title = `${data.label} - ${formatTimestamp(data.timestamp)}`;
        
        // Position marker based on percentage of video duration
        const position = Math.min(100, Math.max(0, (data.timestamp / videoDuration) * 100));
        marker.style.left = `${position}%`;
        
        // Timeline marker rendered
        
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
    // Video is always visible, just seek
    if (projectVideo) {
        projectVideo.currentTime = timestamp;
        projectVideo.pause(); // Pause at the moment instead of auto-playing
        
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

