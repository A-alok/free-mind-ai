"use client";

import { useState, useEffect } from 'react';

export function useProjects() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Simulate API calls - replace with actual API integration
    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        try {
            setLoading(true);
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Mock data - replace with actual API call
            const mockProjects = [
                {
                    id: 1,
                    name: "AI Image Classifier",
                    thumbnail: null,
                    createdAt: "2024-01-15",
                    lastModified: "2024-01-20",
                    status: "active",
                    description: "A deep learning model for image classification"
                },
                {
                    id: 2,
                    name: "Neural Network Trainer",
                    thumbnail: null,
                    createdAt: "2024-01-10",
                    lastModified: "2024-01-18",
                    status: "active",
                    description: "Training pipeline for neural networks"
                },
                {
                    id: 3,
                    name: "Data Preprocessing Pipeline",
                    thumbnail: null,
                    createdAt: "2024-01-08",
                    lastModified: "2024-01-16",
                    status: "draft",
                    description: "Automated data preprocessing and validation"
                }
            ];
            
            setProjects(mockProjects);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const createProject = async (projectData) => {
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const newProject = {
                id: Date.now(),
                name: projectData.name,
                thumbnail: projectData.photo,
                createdAt: new Date().toISOString().split('T')[0],
                lastModified: new Date().toISOString().split('T')[0],
                status: "draft",
                description: projectData.description || ""
            };
            
            setProjects(prev => [newProject, ...prev]);
            return newProject;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const updateProject = async (projectId, updates) => {
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 500));
            
            setProjects(prev => 
                prev.map(project => 
                    project.id === projectId 
                        ? { ...project, ...updates, lastModified: new Date().toISOString().split('T')[0] }
                        : project
                )
            );
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const deleteProject = async (projectId) => {
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 500));
            
            setProjects(prev => prev.filter(project => project.id !== projectId));
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const getProjectById = (projectId) => {
        return projects.find(project => project.id === projectId);
    };

    const getProjectsByStatus = (status) => {
        return projects.filter(project => project.status === status);
    };

    return {
        projects,
        loading,
        error,
        createProject,
        updateProject,
        deleteProject,
        getProjectById,
        getProjectsByStatus,
        refetch: loadProjects
    };
}