"use client";

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

export default function ToastNotification({ toast, onClose }) {
    const [isVisible, setIsVisible] = useState(false);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        if (toast) {
            setIsVisible(true);
            
            // Auto dismiss after duration
            const timer = setTimeout(() => {
                handleClose();
            }, toast.duration || 3000);

            return () => clearTimeout(timer);
        }
    }, [toast]);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => {
            setIsVisible(false);
            setIsExiting(false);
            onClose();
        }, 300);
    };

    if (!toast || !isVisible) return null;

    const getIcon = () => {
        switch (toast.type) {
            case 'success':
                return <CheckCircle className="w-5 h-5 text-green-400" />;
            case 'error':
                return <XCircle className="w-5 h-5 text-red-400" />;
            case 'warning':
                return <AlertCircle className="w-5 h-5 text-yellow-400" />;
            default:
                return <CheckCircle className="w-5 h-5 text-blue-400" />;
        }
    };

    const getColors = () => {
        switch (toast.type) {
            case 'success':
                return 'border-green-500/50 bg-green-500/10 shadow-green-500/20';
            case 'error':
                return 'border-red-500/50 bg-red-500/10 shadow-red-500/20';
            case 'warning':
                return 'border-yellow-500/50 bg-yellow-500/10 shadow-yellow-500/20';
            default:
                return 'border-blue-500/50 bg-blue-500/10 shadow-blue-500/20';
        }
    };

    return (
        <div className="fixed top-6 right-6 z-[60] pointer-events-none">
            <div
                className={`
                    backdrop-blur-md border rounded-xl p-4 shadow-2xl transition-all duration-300 min-w-80 max-w-md pointer-events-auto
                    ${getColors()}
                    ${isExiting 
                        ? 'transform translate-x-full opacity-0' 
                        : 'transform translate-x-0 opacity-100 animate-slide-in'
                    }
                `}
            >
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                        {getIcon()}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        {toast.title && (
                            <h4 className="text-white font-medium text-sm mb-1">
                                {toast.title}
                            </h4>
                        )}
                        <p className="text-gray-300 text-sm leading-relaxed">
                            {toast.message}
                        </p>
                    </div>
                    
                    <button
                        onClick={handleClose}
                        className="flex-shrink-0 p-1 rounded-md hover:bg-white/10 transition-colors duration-200 text-gray-400 hover:text-white"
                    >
                        <X size={16} />
                    </button>
                </div>
                
                {/* Progress bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 rounded-b-xl overflow-hidden">
                    <div 
                        className={`h-full transition-all duration-100 ease-linear ${
                            toast.type === 'success' 
                                ? 'bg-green-400' 
                                : toast.type === 'error' 
                                    ? 'bg-red-400' 
                                    : toast.type === 'warning'
                                        ? 'bg-yellow-400'
                                        : 'bg-blue-400'
                        }`}
                        style={{
                            width: '100%',
                            animation: `toast-progress ${toast.duration || 3000}ms linear forwards`
                        }}
                    />
                </div>
            </div>
            
            <style jsx>{`
                @keyframes slide-in {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                
                @keyframes toast-progress {
                    from {
                        width: 100%;
                    }
                    to {
                        width: 0%;
                    }
                }
                
                .animate-slide-in {
                    animation: slide-in 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
}