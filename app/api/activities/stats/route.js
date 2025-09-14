// app/api/activities/stats/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import connectDB from '@/lib/mongodb';
import Activity from '@/models/activity';
import User from '@/models/user';

// Helper function to get user from cookies
async function getUserFromCookies() {
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get('userId')?.value;
        
        if (!userId) {
            throw new Error('Not authenticated');
        }
        
        await connectDB();
        const user = await User.findById(userId);
        
        if (!user) {
            throw new Error('User not found');
        }
        
        return user;
    } catch (error) {
        throw new Error('Authentication failed');
    }
}

// GET - Get activity statistics
export async function GET(request) {
    try {
        const user = await getUserFromCookies();
        const { searchParams } = new URL(request.url);
        
        const timeRange = parseInt(searchParams.get('timeRange')) || 30; // days
        const projectId = searchParams.get('projectId');
        
        await connectDB();
        
        // Get basic activity stats
        const activityStats = await Activity.getActivityStats(user._id, timeRange);
        
        // Get session-based statistics
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - timeRange);
        
        let baseQuery = {
            userId: user._id,
            createdAt: { $gte: startDate }
        };
        
        if (projectId) {
            baseQuery.projectId = projectId;
        }
        
        // Get session statistics
        const sessionStats = await Activity.aggregate([
            { $match: baseQuery },
            {
                $group: {
                    _id: '$sessionId',
                    activities: { $sum: 1 },
                    startTime: { $min: '$startTime' },
                    endTime: { $max: '$endTime' },
                    totalDuration: { $sum: '$duration' },
                    completedActivities: {
                        $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                    }
                }
            },
            {
                $addFields: {
                    sessionDuration: { $subtract: ['$endTime', '$startTime'] },
                    completionRate: { $divide: ['$completedActivities', '$activities'] }
                }
            },
            { $sort: { startTime: -1 } },
            { $limit: 10 }
        ]);
        
        // Get project-wise statistics
        const projectStats = await Activity.aggregate([
            { $match: { userId: user._id, createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: '$projectId',
                    activities: { $sum: 1 },
                    avgDuration: { $avg: '$duration' },
                    totalDuration: { $sum: '$duration' },
                    lastActivity: { $max: '$createdAt' },
                    activityTypes: { $addToSet: '$activityType' }
                }
            },
            {
                $lookup: {
                    from: 'projects',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'project'
                }
            },
            {
                $addFields: {
                    projectName: { $arrayElemAt: ['$project.name', 0] }
                }
            },
            { $sort: { activities: -1 } }
        ]);
        
        // Get daily activity count for the past week
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);
        
        const dailyActivity = await Activity.aggregate([
            {
                $match: {
                    userId: user._id,
                    createdAt: { $gte: weekStart }
                }
            },
            {
                $group: {
                    _id: {
                        day: { $dayOfMonth: '$createdAt' },
                        month: { $month: '$createdAt' },
                        year: { $year: '$createdAt' }
                    },
                    count: { $sum: 1 },
                    uniqueSessions: { $addToSet: '$sessionId' }
                }
            },
            {
                $addFields: {
                    date: {
                        $dateFromParts: {
                            year: '$_id.year',
                            month: '$_id.month',
                            day: '$_id.day'
                        }
                    },
                    sessionCount: { $size: '$uniqueSessions' }
                }
            },
            { $sort: { date: 1 } }
        ]);
        
        // Get performance metrics
        const performanceStats = await Activity.aggregate([
            {
                $match: {
                    ...baseQuery,
                    'performance.memoryUsage': { $exists: true }
                }
            },
            {
                $group: {
                    _id: null,
                    avgMemoryUsage: { $avg: '$performance.memoryUsage' },
                    avgCpuUsage: { $avg: '$performance.cpuUsage' },
                    avgNetworkLatency: { $avg: '$performance.networkLatency' },
                    avgRenderTime: { $avg: '$performance.renderTime' }
                }
            }
        ]);
        
        // Get recent unsynced activities count
        const unsyncedCount = await Activity.countDocuments({
            userId: user._id,
            syncStatus: { $ne: 'synced' }
        });
        
        return NextResponse.json({
            success: true,
            stats: {
                activityBreakdown: activityStats,
                sessionStats: sessionStats.map(session => ({
                    sessionId: session._id,
                    activities: session.activities,
                    duration: session.totalDuration,
                    sessionDuration: session.sessionDuration,
                    completionRate: Math.round((session.completionRate || 0) * 100),
                    startTime: session.startTime,
                    endTime: session.endTime
                })),
                projectStats: projectStats.map(project => ({
                    projectId: project._id,
                    projectName: project.projectName || 'Unnamed Project',
                    activities: project.activities,
                    avgDuration: Math.round(project.avgDuration || 0),
                    totalDuration: project.totalDuration,
                    lastActivity: project.lastActivity,
                    activityTypes: project.activityTypes
                })),
                dailyActivity: dailyActivity.map(day => ({
                    date: day.date,
                    activities: day.count,
                    sessions: day.sessionCount
                })),
                performance: performanceStats[0] || null,
                sync: {
                    unsyncedActivities: unsyncedCount,
                    lastSyncCheck: new Date()
                }
            }
        }, { status: 200 });
        
    } catch (error) {
        console.error('Get activity stats error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to fetch activity statistics'
        }, { status: error.message === 'Authentication failed' ? 401 : 500 });
    }
}