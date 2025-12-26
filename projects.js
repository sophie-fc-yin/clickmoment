// Project management using localStorage
// Projects are stored per user (keyed by user ID)

export class ProjectManager {
    constructor(userId) {
        this.userId = userId;
        this.storageKey = `clickmoment_projects_${userId}`;
    }

    // Get all projects for the current user
    getProjects() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error loading projects:', error);
            return [];
        }
    }

    // Save projects
    saveProjects(projects) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(projects));
            return true;
        } catch (error) {
            console.error('Error saving projects:', error);
            return false;
        }
    }

    // Create a new project
    createProject(name) {
        const projects = this.getProjects();
        const newProject = {
            id: Date.now().toString(),
            name: name || `Project ${projects.length + 1}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            analyses: []
        };
        projects.push(newProject);
        this.saveProjects(projects);
        return newProject;
    }

    // Get a project by ID
    getProject(projectId) {
        const projects = this.getProjects();
        return projects.find(p => p.id === projectId);
    }

    // Update a project
    updateProject(projectId, updates) {
        const projects = this.getProjects();
        const index = projects.findIndex(p => p.id === projectId);
        if (index !== -1) {
            projects[index] = {
                ...projects[index],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            this.saveProjects(projects);
            return projects[index];
        }
        return null;
    }

    // Delete a project
    deleteProject(projectId) {
        const projects = this.getProjects();
        const filtered = projects.filter(p => p.id !== projectId);
        this.saveProjects(filtered);
        return filtered.length !== projects.length;
    }

    // Add analysis result to a project
    addAnalysis(projectId, analysisData) {
        const project = this.getProject(projectId);
        if (project) {
            const analysis = {
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                data: analysisData
            };
            if (!project.analyses) {
                project.analyses = [];
            }
            project.analyses.push(analysis);
            this.updateProject(projectId, { analyses: project.analyses });
            return analysis;
        }
        return null;
    }
}

