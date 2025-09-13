"use client";

import { useState, useRef } from 'react';
import { X, Upload, ArrowLeft, ArrowRight, Check } from 'lucide-react';

export default function CreateProjectModal({ isOpen, onClose, onSubmit }) {
    const [currentStep, setCurrentStep] = useState(1);
    const [projectName, setProjectName] = useState('');
    const [projectPhoto, setProjectPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [nameError, setNameError] = useState('');
    const fileInputRef = useRef(null);

    const totalSteps = 2;

    // Handle backdrop click
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    // Handle project name validation
    const validateProjectName = (name) => {
        if (!name.trim()) {
            setNameError('Project name is required');
            return false;
        }
        if (name.trim().length < 3) {
            setNameError('Project name must be at least 3 characters');
            return false;
        }
        setNameError('');
        return true;
    };

    // Handle step navigation
    const handleNext = () => {
        if (currentStep === 1) {
            if (validateProjectName(projectName)) {
                setCurrentStep(2);
            }
        }
    };

    const handlePrevious = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    // Handle file upload
    const handleFileUpload = (file) => {
        if (file && file.type.startsWith('image/')) {
            setProjectPhoto(file);
            const reader = new FileReader();
            reader.onload = (e) => {
                setPhotoPreview(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    // Handle drag and drop
    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    };

    // Handle file input change
    const handleFileInputChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFileUpload(file);
        }
    };

    // Handle form submission
    const handleSubmit = () => {
        if (validateProjectName(projectName)) {
            onSubmit({
                name: projectName.trim(),
                photo: photoPreview
            });
            // Reset form
            setCurrentStep(1);
            setProjectName('');
            setProjectPhoto(null);
            setPhotoPreview(null);
            setNameError('');
        }
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={handleBackdropClick}
        >
            <div className="bg-black/80 backdrop-blur-xl border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-500/20 w-full max-w-lg mx-auto overflow-hidden transform transition-all duration-300 scale-100">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-purple-500/20">
                    <h2 className="text-2xl font-bold text-white">Create New Project</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-purple-500/20 text-gray-400 hover:text-white transition-all duration-200"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Progress Indicator */}
                <div className="px-6 py-4 bg-purple-500/5">
                    <div className="flex items-center justify-center gap-4">
                        {Array.from({ length: totalSteps }, (_, index) => {
                            const step = index + 1;
                            const isActive = step === currentStep;
                            const isCompleted = step < currentStep;
                            
                            return (
                                <div key={step} className="flex items-center">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                                        isCompleted 
                                            ? 'bg-green-500 text-white' 
                                            : isActive 
                                                ? 'bg-purple-500 text-white' 
                                                : 'bg-gray-600 text-gray-300'
                                    }`}>
                                        {isCompleted ? <Check size={16} /> : step}
                                    </div>
                                    {step < totalSteps && (
                                        <div className={`w-12 h-1 mx-2 rounded-full transition-all duration-300 ${
                                            step < currentStep ? 'bg-green-500' : 'bg-gray-600'
                                        }`} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <div className="text-center mt-2">
                        <span className="text-sm text-gray-400">
                            Step {currentStep} of {totalSteps}
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {currentStep === 1 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-2">Project Details</h3>
                                <p className="text-gray-400 text-sm mb-6">
                                    Give your project a memorable name to get started.
                                </p>
                            </div>

                            {/* Floating Label Input */}
                            <div className="relative">
                                <input
                                    type="text"
                                    value={projectName}
                                    onChange={(e) => {
                                        setProjectName(e.target.value);
                                        if (nameError) validateProjectName(e.target.value);
                                    }}
                                    className={`w-full px-4 py-3 rounded-lg bg-black/60 border-2 text-white placeholder-transparent focus:outline-none transition-all duration-300 ${
                                        nameError 
                                            ? 'border-red-500/50 focus:border-red-500' 
                                            : 'border-purple-500/30 focus:border-purple-500'
                                    }`}
                                    placeholder="Enter project name"
                                    id="projectName"
                                />
                                <label
                                    htmlFor="projectName"
                                    className={`absolute left-4 transition-all duration-300 pointer-events-none ${
                                        projectName
                                            ? '-top-2 text-xs bg-black px-2 text-purple-400'
                                            : 'top-3 text-base text-gray-400'
                                    }`}
                                >
                                    Project Name
                                </label>
                                {nameError && (
                                    <p className="mt-2 text-sm text-red-400">{nameError}</p>
                                )}
                            </div>
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-2">Project Photo</h3>
                                <p className="text-gray-400 text-sm mb-6">
                                    Add a custom photo to make your project stand out (optional).
                                </p>
                            </div>

                            {/* Photo Upload Area */}
                            <div
                                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 cursor-pointer ${
                                    isDragging 
                                        ? 'border-purple-500 bg-purple-500/10' 
                                        : photoPreview 
                                            ? 'border-green-500/50 bg-green-500/5' 
                                            : 'border-purple-500/30 hover:border-purple-500/50 hover:bg-purple-500/5'
                                }`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {photoPreview ? (
                                    <div className="space-y-4">
                                        <img 
                                            src={photoPreview} 
                                            alt="Preview" 
                                            className="w-24 h-24 object-cover rounded-lg mx-auto border-2 border-green-500/30"
                                        />
                                        <div className="text-green-400">
                                            <Check className="w-6 h-6 mx-auto mb-2" />
                                            <p className="text-sm">Photo uploaded successfully</p>
                                        </div>
                                        <button
                                            type="button"
                                            className="text-purple-400 hover:text-purple-300 text-sm underline"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setPhotoPreview(null);
                                                setProjectPhoto(null);
                                            }}
                                        >
                                            Remove photo
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <Upload className="w-12 h-12 text-purple-400 mx-auto" />
                                        <div>
                                            <p className="text-white font-medium mb-2">
                                                Drop your photo here, or click to browse
                                            </p>
                                            <p className="text-gray-400 text-sm">
                                                Supports PNG, JPG, GIF up to 10MB
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileInputChange}
                                    className="hidden"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-purple-500/20 bg-purple-500/5">
                    <button
                        onClick={currentStep === 1 ? onClose : handlePrevious}
                        className="px-6 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-600/30 transition-all duration-200 flex items-center gap-2"
                    >
                        {currentStep === 1 ? (
                            <>
                                <X size={16} />
                                Cancel
                            </>
                        ) : (
                            <>
                                <ArrowLeft size={16} />
                                Previous
                            </>
                        )}
                    </button>

                    <button
                        onClick={currentStep === totalSteps ? handleSubmit : handleNext}
                        disabled={currentStep === 1 && !projectName.trim()}
                        className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-600 via-purple-500 to-blue-600 hover:from-purple-700 hover:via-purple-600 hover:to-blue-700 text-white font-medium transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
                    >
                        {currentStep === totalSteps ? (
                            <>
                                <Check size={16} />
                                Create Project
                            </>
                        ) : (
                            <>
                                Next
                                <ArrowRight size={16} />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}