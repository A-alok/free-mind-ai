"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Grid, List } from 'lucide-react';
import ProjectCard from './ProjectCard';
import CreateProjectModal from './CreateProjectModal';
import ToastNotification from './ToastNotification';

export default function Dashboard() {
    const router = useRouter();
    const [projects, setProjects] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
    const [toast, setToast] = useState(null);

    // Load projects from API
    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const response = await fetch('/api/projects');
            const data = await response.json();
            
            if (data.success) {
                // Map API response to match ProjectCard expected format
                const mappedProjects = (data.projects || []).map(project => ({
                    ...project,
                    lastModified: project.updatedAt || project.createdAt
                }));
                setProjects(mappedProjects);
            } else {
                console.error('Failed to fetch projects:', data.error);
                setToast({
                    type: 'error',
                    message: 'Failed to load projects',
                    duration: 3000
                });
            }
        } catch (error) {
            console.error('Error fetching projects:', error);
            setToast({
                type: 'error',
                message: 'Failed to load projects. Please try again.',
                duration: 3000
            });
        }
    };

    const handleCreateProject = (projectData) => {
        // Add the new project to the list
        setProjects(prev => [projectData, ...prev]);
        setIsModalOpen(false);
        
        // Show success toast
        setToast({
            type: 'success',
            message: 'Project created successfully',
            duration: 3000
        });

        // Redirect to ML page for project development
        setTimeout(() => {
            router.push('/ml');
        }, 1000);
    };

    const handleDeleteProject = async (projectId) => {
        try {
            const response = await fetch(`/api/projects/${projectId}`, {
                method: 'DELETE',
            });
            const data = await response.json();
            
            if (data.success) {
                setProjects(prev => prev.filter(p => p.id !== projectId));
                setToast({
                    type: 'success',
                    message: 'Project deleted successfully',
                    duration: 3000
                });
            } else {
                setToast({
                    type: 'error',
                    message: data.error || 'Failed to delete project',
                    duration: 3000
                });
            }
        } catch (error) {
            console.error('Error deleting project:', error);
            setToast({
                type: 'error',
                message: 'Failed to delete project. Please try again.',
                duration: 3000
            });
        }
    };

    const handleEditProject = (projectId) => {
        console.log(`Editing project ${projectId}`);
        // Implement edit functionality
    };

    const handleOpenProject = (projectId) => {
        console.log(`Opening project ${projectId}`);
        router.push('/ml');
    };

    return (
        <div className="min-h-screen bg-black relative overflow-hidden pt-16">
            {/* Glassmorphism Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-black">
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full filter blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-blue-500/20 rounded-full filter blur-3xl animate-pulse delay-1000"></div>
            </div>

            {/* Main Content Container */}
            <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
                {/* Header Section */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-8 lg:mb-12 space-y-4 lg:space-y-0">
                    {/* Title Section */}
                    <div className="flex-1">
                        <div className="flex items-baseline space-x-4 mb-3">
                            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
                                Your Projects
                            </h1>
                            <span className="hidden sm:block text-sm text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
                                {projects.length} {projects.length === 1 ? 'project' : 'projects'}
                            </span>
                        </div>
                        <p className="text-gray-400 text-base sm:text-lg leading-relaxed max-w-2xl">
                            Build, train, and deploy machine learning models with cutting-edge AI infrastructure
                        </p>
                    </div>

                    {/* Action Section */}
                    <div className="flex items-center justify-start lg:justify-end space-x-3 w-full lg:w-auto">
                        {/* View Mode Toggle */}
                        <div className="flex items-center bg-black/40 backdrop-blur-md rounded-lg p-1 border border-purple-500/20 shadow-lg">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2.5 rounded-md transition-all duration-200 ${
                                    viewMode === 'grid'
                                        ? 'bg-purple-500/30 text-purple-300 shadow-sm'
                                        : 'text-gray-400 hover:text-white hover:bg-purple-500/10'
                                }`}
                                title="Grid View"
                            >
                                <Grid size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2.5 rounded-md transition-all duration-200 ${
                                    viewMode === 'list'
                                        ? 'bg-purple-500/30 text-purple-300 shadow-sm'
                                        : 'text-gray-400 hover:text-white hover:bg-purple-500/10'
                                }`}
                                title="List View"
                            >
                                <List size={18} />
                            </button>
                        </div>

                        {/* Create Project Button */}
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-gradient-to-r from-purple-600 via-purple-500 to-blue-600 hover:from-purple-700 hover:via-purple-600 hover:to-blue-700 text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 hover:shadow-xl hover:shadow-purple-500/25 flex items-center space-x-2 shadow-lg"
                        >
                            <Plus size={20} className="flex-shrink-0" />
                            <span className="hidden sm:inline whitespace-nowrap">Create New Project</span>
                            <span className="sm:hidden">Create</span>
                        </button>
                    </div>
                </div>

                {/* Projects Content */}
                {projects.length > 0 ? (
                    <div className={`w-full ${
                        viewMode === 'grid' 
                            ? 'grid grid-auto-fit gap-6 sm:gap-8' 
                            : 'flex flex-col space-y-4'
                    }`}>
                        {projects.map((project) => (
                            <div key={project.id} className={`w-full ${
                                viewMode === 'grid' ? 'flex' : ''
                            }`}>
                                <ProjectCard
                                    project={project}
                                    viewMode={viewMode}
                                    onOpen={handleOpenProject}
                                    onEdit={handleEditProject}
                                    onDelete={handleDeleteProject}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    /* Perfect Empty State */
                    <div className="flex flex-col items-center justify-center min-h-[500px] text-center py-16">
                        <div className="relative">
                            <div className="w-32 h-32 sm:w-40 sm:h-40 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full flex items-center justify-center mb-8 backdrop-blur-sm border border-purple-500/20 shadow-2xl">
                                <Plus size={48} className="text-purple-400" />
                            </div>
                            <div className="absolute -inset-4 bg-purple-500/10 rounded-full blur-xl animate-pulse"></div>
                        </div>
                        
                        <div className="space-y-4 max-w-md">
                            <h2 className="text-2xl sm:text-3xl font-bold text-white">
                                Ready to build something amazing?
                            </h2>
                            <p className="text-gray-400 text-base sm:text-lg leading-relaxed">
                                Create your first AI project and start building the future with machine learning
                            </p>
                        </div>
                        
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="mt-8 bg-gradient-to-r from-purple-600 via-purple-500 to-blue-600 hover:from-purple-700 hover:via-purple-600 hover:to-blue-700 text-white px-8 py-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-xl hover:shadow-purple-500/25 flex items-center space-x-3 shadow-lg"
                        >
                            <Plus size={24} />
                            <span>Create Your First Project</span>
                        </button>
                    </div>
                )}

                {/* Bottom Spacing */}
                <div className="h-16 sm:h-20"></div>
            </div>

            {/* Create Project Modal */}
            {isModalOpen && (
                <CreateProjectModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSubmit={handleCreateProject}
                />
            )}

            {/* Toast Notifications */}
            {toast && (
                <ToastNotification
                    toast={toast}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
}