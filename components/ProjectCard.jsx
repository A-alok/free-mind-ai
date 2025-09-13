"use client";

import { useState } from 'react';
import { Eye, Edit3, Trash2, Image, Calendar, Clock } from 'lucide-react';

export default function ProjectCard({ project, viewMode, onOpen, onEdit, onDelete }) {
    const [isHovered, setIsHovered] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleDelete = () => {
        if (showDeleteConfirm) {
            onDelete(project.id);
            setShowDeleteConfirm(false);
        } else {
            setShowDeleteConfirm(true);
            setTimeout(() => setShowDeleteConfirm(false), 3000);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const statusColors = {
        active: 'bg-green-500/20 text-green-400 border-green-500/30',
        draft: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        archived: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    };

    if (viewMode === 'list') {
        return (
            <div 
                className="w-full bg-black/40 backdrop-blur-md border border-purple-500/20 rounded-xl p-5 sm:p-6 hover:border-purple-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10 group"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <div className="flex items-center gap-4 sm:gap-6">
                    {/* Thumbnail */}
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center border border-purple-500/20 flex-shrink-0 shadow-lg">
                        {project.thumbnail ? (
                            <img 
                                src={project.thumbnail} 
                                alt={project.name}
                                className="w-full h-full object-cover rounded-xl"
                            />
                        ) : (
                            <Image size={24} className="text-purple-400" />
                        )}
                    </div>

                    {/* Project Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg sm:text-xl font-semibold text-white truncate group-hover:text-purple-300 transition-colors">
                                {project.name}
                            </h3>
                            <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${statusColors[project.status]} flex-shrink-0`}>
                                {project.status}
                            </span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-400">
                            <div className="flex items-center gap-1.5">
                                <Calendar size={14} className="flex-shrink-0" />
                                <span>Created {formatDate(project.createdAt)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Clock size={14} className="flex-shrink-0" />
                                <span>Modified {formatDate(project.lastModified)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button
                            onClick={() => onOpen(project.id)}
                            className="p-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 hover:text-purple-300 transition-all duration-200 hover:scale-110 shadow-md"
                            title="Open Project"
                        >
                            <Eye size={18} />
                        </button>
                        <button
                            onClick={() => onEdit(project.id)}
                            className="p-2.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 hover:text-blue-300 transition-all duration-200 hover:scale-110 shadow-md"
                            title="Edit Project"
                        >
                            <Edit3 size={18} />
                        </button>
                        <button
                            onClick={handleDelete}
                            className={`p-2.5 rounded-xl transition-all duration-200 hover:scale-110 shadow-md ${
                                showDeleteConfirm 
                                    ? 'bg-red-500/30 text-red-300' 
                                    : 'bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300'
                            }`}
                            title={showDeleteConfirm ? "Click again to confirm" : "Delete Project"}
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Grid view
    return (
        <div 
            className="w-full h-full bg-black/40 backdrop-blur-md border border-purple-500/20 rounded-xl overflow-hidden hover:border-purple-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10 transform hover:-translate-y-2 group cursor-pointer flex flex-col shadow-lg"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => onOpen(project.id)}
        >
            {/* Thumbnail Section */}
            <div className="relative h-44 sm:h-48 bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center overflow-hidden">
                {project.thumbnail ? (
                    <img 
                        src={project.thumbnail} 
                        alt={project.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                ) : (
                    <Image size={48} className="text-purple-400" />
                )}
                
                {/* Status Badge */}
                <div className="absolute top-3 left-3 z-10">
                    <span className={`px-2.5 py-1.5 text-xs font-medium rounded-full border backdrop-blur-md ${statusColors[project.status]} shadow-md`}>
                        {project.status}
                    </span>
                </div>

                {/* Hover Actions Overlay */}
                <div className={`absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center gap-3 transition-all duration-300 z-20 ${
                    isHovered ? 'opacity-100' : 'opacity-0'
                }`}>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpen(project.id);
                        }}
                        className="p-3 rounded-full bg-purple-500/30 backdrop-blur-md hover:bg-purple-500/50 text-white transition-all duration-200 transform hover:scale-110 shadow-lg border border-purple-500/20"
                        title="Open Project"
                    >
                        <Eye size={20} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(project.id);
                        }}
                        className="p-3 rounded-full bg-blue-500/30 backdrop-blur-md hover:bg-blue-500/50 text-white transition-all duration-200 transform hover:scale-110 shadow-lg border border-blue-500/20"
                        title="Edit Project"
                    >
                        <Edit3 size={20} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDelete();
                        }}
                        className={`p-3 rounded-full backdrop-blur-md text-white transition-all duration-200 transform hover:scale-110 shadow-lg ${
                            showDeleteConfirm 
                                ? 'bg-red-500/50 border-red-500/30' 
                                : 'bg-red-500/30 hover:bg-red-500/50 border border-red-500/20'
                        }`}
                        title={showDeleteConfirm ? "Click again to confirm" : "Delete Project"}
                    >
                        <Trash2 size={20} />
                    </button>
                </div>
            </div>

            {/* Project Info - Fixed height for consistent alignment */}
            <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                <div className="mb-3">
                    <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-purple-300 transition-colors line-clamp-2 leading-tight">
                        {project.name}
                    </h3>
                </div>
                
                <div className="space-y-2 text-sm text-gray-400">
                    <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="flex-shrink-0" />
                        <span className="truncate">Created {formatDate(project.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Clock size={12} className="flex-shrink-0" />
                        <span className="truncate">Modified {formatDate(project.lastModified)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}