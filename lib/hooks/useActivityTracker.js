// lib/hooks/useActivityTracker.js
import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Hook for tracking ML workspace activities and managing sessions
 */
export function useActivityTracker(projectId = null) {
    const [sessionId, setSessionId] = useState(null);
    const [currentActivities, setCurrentActivities] = useState(new Map());
    const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const [syncQueue, setSyncQueue] = useState([]);
    const syncIntervalRef = useRef(null);
    const performanceRef = useRef({});

    // Generate a new session ID
    const generateSessionId = useCallback(() => {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }, []);

    // Initialize session
    useEffect(() => {
        if (!sessionId) {
            const newSessionId = generateSessionId();
            setSessionId(newSessionId);
            
            // Track workspace entry
            trackActivity('workspace_entered', {
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                screenResolution: `${screen.width}x${screen.height}`,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            });
        }
    }, [sessionId, generateSessionId]);

    // Monitor online/offline status
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Set up sync interval
    useEffect(() => {
        if (isOnline && syncQueue.length > 0) {
            syncIntervalRef.current = setInterval(() => {
                syncActivities();
            }, 30000); // Sync every 30 seconds
        }

        return () => {
            if (syncIntervalRef.current) {
                clearInterval(syncIntervalRef.current);
            }
        };
    }, [isOnline, syncQueue.length]);

    // Collect performance metrics
    const collectPerformanceMetrics = useCallback(() => {
        const metrics = {};
        
        if (typeof window !== 'undefined' && window.performance) {
            const navigation = performance.getEntriesByType('navigation')[0];
            if (navigation) {
                metrics.renderTime = navigation.loadEventEnd - navigation.loadEventStart;
                metrics.networkLatency = navigation.responseEnd - navigation.requestStart;
            }

            if (performance.memory) {
                metrics.memoryUsage = performance.memory.usedJSHeapSize;
            }
        }

        return metrics;
    }, []);

    // Get context information
    const getContextInfo = useCallback(() => {
        if (typeof window === 'undefined') return {};
        
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            screenResolution: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            timestamp: new Date().toISOString()
        };
    }, []);

    // Track a new activity
    const trackActivity = useCallback(async (activityType, data = {}, options = {}) => {
        if (!sessionId) return null;

        const activityId = `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const startTime = new Date();
        
        const activityData = {
            id: activityId,
            projectId,
            sessionId,
            activityType,
            data,
            context: getContextInfo(),
            performance: collectPerformanceMetrics(),
            startTime,
            status: 'started',
            ...options
        };

        // Add to current activities
        setCurrentActivities(prev => new Map(prev.set(activityId, activityData)));

        // Try to send immediately if online
        if (isOnline) {
            try {
                const response = await fetch('/api/activities', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(activityData),
                });

                if (response.ok) {
                    const result = await response.json();
                    // Update with server-provided ID
                    setCurrentActivities(prev => {
                        const updated = new Map(prev);
                        const activity = updated.get(activityId);
                        if (activity) {
                            activity.serverId = result.activity.id;
                            activity.synced = true;
                        }
                        return updated;
                    });
                    return result.activity.id;
                }
            } catch (error) {
                console.warn('Failed to track activity immediately:', error);
            }
        }

        // Add to sync queue if not synced
        setSyncQueue(prev => [...prev, activityData]);
        return activityId;
    }, [sessionId, projectId, isOnline, getContextInfo, collectPerformanceMetrics]);

    // Update activity progress
    const updateActivityProgress = useCallback(async (activityId, progress, additionalData = {}) => {
        setCurrentActivities(prev => {
            const updated = new Map(prev);
            const activity = updated.get(activityId);
            if (activity) {
                activity.status = 'in_progress';
                activity.data = { ...activity.data, ...additionalData };
                if (activity.data.modelInfo) {
                    activity.data.modelInfo.trainingProgress = progress;
                }
                activity.lastUpdated = new Date();
                
                // Add to sync queue for update
                setSyncQueue(syncPrev => [...syncPrev, {
                    ...activity,
                    updateType: 'progress',
                    progress
                }]);
            }
            return updated;
        });
    }, []);

    // Complete an activity
    const completeActivity = useCallback(async (activityId, result = null) => {
        setCurrentActivities(prev => {
            const updated = new Map(prev);
            const activity = updated.get(activityId);
            if (activity) {
                const endTime = new Date();
                activity.status = 'completed';
                activity.endTime = endTime;
                activity.duration = endTime - activity.startTime;
                activity.result = result;
                
                // Add to sync queue for completion
                setSyncQueue(syncPrev => [...syncPrev, {
                    ...activity,
                    updateType: 'complete'
                }]);
                
                // Remove from active activities after a delay
                setTimeout(() => {
                    setCurrentActivities(curr => {
                        const newMap = new Map(curr);
                        newMap.delete(activityId);
                        return newMap;
                    });
                }, 5000);
            }
            return updated;
        });
    }, []);

    // Fail an activity
    const failActivity = useCallback(async (activityId, error) => {
        setCurrentActivities(prev => {
            const updated = new Map(prev);
            const activity = updated.get(activityId);
            if (activity) {
                const endTime = new Date();
                activity.status = 'failed';
                activity.endTime = endTime;
                activity.duration = endTime - activity.startTime;
                activity.result = {
                    success: false,
                    error: error.message || error,
                    data: null
                };
                
                // Add to sync queue
                setSyncQueue(syncPrev => [...syncPrev, {
                    ...activity,
                    updateType: 'fail'
                }]);
            }
            return updated;
        });
    }, []);

    // Sync activities with server
    const syncActivities = useCallback(async () => {
        if (!isOnline || syncQueue.length === 0) return;

        try {
            const activitiesToSync = syncQueue.slice(0, 10); // Sync in batches
            
            const response = await fetch('/api/activities', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    activities: activitiesToSync.map(activity => ({
                        id: activity.serverId,
                        status: activity.status,
                        endTime: activity.endTime,
                        duration: activity.duration,
                        result: activity.result,
                        data: activity.data
                    }))
                }),
            });

            if (response.ok) {
                // Remove synced activities from queue
                setSyncQueue(prev => prev.slice(activitiesToSync.length));
            }
        } catch (error) {
            console.warn('Failed to sync activities:', error);
        }
    }, [isOnline, syncQueue]);

    // Manual sync trigger
    const forcSync = useCallback(async () => {
        if (isOnline) {
            await syncActivities();
        }
    }, [isOnline, syncActivities]);

    // Get activity statistics
    const getActivityStats = useCallback(async (timeRange = 7) => {
        try {
            const response = await fetch(`/api/activities/stats?timeRange=${timeRange}&projectId=${projectId || ''}`);
            if (response.ok) {
                const data = await response.json();
                return data.stats;
            }
        } catch (error) {
            console.error('Failed to get activity stats:', error);
        }
        return null;
    }, [projectId]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            // Track workspace exit
            if (sessionId) {
                trackActivity('workspace_exited', {
                    sessionDuration: Date.now() - (sessionId ? parseInt(sessionId.split('_')[1]) : Date.now()),
                    activitiesCount: currentActivities.size
                });
            }
            
            // Final sync attempt
            if (syncQueue.length > 0) {
                syncActivities();
            }
        };
    }, [sessionId, currentActivities.size, syncQueue.length]);

    return {
        sessionId,
        currentActivities: Array.from(currentActivities.values()),
        isOnline,
        pendingSyncCount: syncQueue.length,
        
        // Activity tracking methods
        trackActivity,
        updateActivityProgress,
        completeActivity,
        failActivity,
        
        // Sync methods
        syncActivities: forcSync,
        
        // Utility methods
        getActivityStats,
        
        // Convenience methods for common activities
        trackModelTraining: (data) => trackActivity('model_training_started', data),
        trackDatasetUpload: (data) => trackActivity('dataset_uploaded', data),
        trackVisualization: (data) => trackActivity('visualization_generated', data),
        trackConfigChange: (oldValues, newValues) => trackActivity('configuration_changed', {
            configuration: { oldValues, newValues, changeType: 'manual' }
        })
    };
}