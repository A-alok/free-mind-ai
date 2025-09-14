// app/api/activities/route.js
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

// POST - Create new activity
export async function POST(request) {
    try {
        const user = await getUserFromCookies();
        const body = await request.json();
        
        // Extract activity data
        const {
            projectId,
            sessionId,
            activityType,
            data,
            context,
            performance
        } = body;
        
        // Validate required fields
        if (!activityType) {
            return NextResponse.json({
                success: false,
                error: 'Activity type is required'
            }, { status: 400 });
        }
        
        // Create activity
        const activityData = {
            userId: user._id,
            projectId: projectId || null,
            sessionId: sessionId || Activity.generateSessionId(),
            activityType,
            data: data || {},
            context: context || {},
            performance: performance || {}
        };
        
        const activity = await Activity.createActivity(activityData);
        
        return NextResponse.json({
            success: true,
            message: 'Activity created successfully',
            activity: {
                id: activity._id,
                sessionId: activity.sessionId,
                activityType: activity.activityType,
                status: activity.status,
                startTime: activity.startTime,
                createdAt: activity.createdAt
            }
        }, { status: 201 });
        
    } catch (error) {
        console.error('Create activity error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to create activity'
        }, { status: error.message === 'Authentication failed' ? 401 : 500 });
    }
}

// GET - Fetch user activities
export async function GET(request) {
    try {
        const user = await getUserFromCookies();
        const { searchParams } = new URL(request.url);
        
        // Parse query parameters
        const projectId = searchParams.get('projectId');
        const sessionId = searchParams.get('sessionId');
        const activityType = searchParams.get('activityType');
        const status = searchParams.get('status');
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 50;
        const timeRange = parseInt(searchParams.get('timeRange')) || null; // days
        const skip = (page - 1) * limit;
        
        await connectDB();
        
        // Build query
        let query = { userId: user._id };
        
        if (projectId) {
            query.projectId = projectId;
        }
        
        if (sessionId) {
            query.sessionId = sessionId;
        }
        
        if (activityType) {
            query.activityType = activityType;
        }
        
        if (status) {
            query.status = status;
        }
        
        if (timeRange) {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - timeRange);
            query.createdAt = { $gte: startDate };
        }
        
        // Fetch activities
        const activities = await Activity.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('projectId', 'name')
            .lean();
        
        // Get total count for pagination
        const totalActivities = await Activity.countDocuments(query);
        
        return NextResponse.json({
            success: true,
            activities: activities.map(activity => ({
                id: activity._id,
                projectId: activity.projectId,
                projectName: activity.projectId?.name || null,
                sessionId: activity.sessionId,
                activityType: activity.activityType,
                status: activity.status,
                startTime: activity.startTime,
                endTime: activity.endTime,
                duration: activity.duration,
                readableDuration: activity.readableDuration,
                data: activity.data,
                result: activity.result,
                context: activity.context,
                performance: activity.performance,
                createdAt: activity.createdAt,
                updatedAt: activity.updatedAt
            })),
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalActivities / limit),
                totalActivities,
                hasNext: page < Math.ceil(totalActivities / limit),
                hasPrev: page > 1
            }
        }, { status: 200 });
        
    } catch (error) {
        console.error('Get activities error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to fetch activities'
        }, { status: error.message === 'Authentication failed' ? 401 : 500 });
    }
}

// PUT - Bulk update activities (for sync)
export async function PUT(request) {
    try {
        const user = await getUserFromCookies();
        const body = await request.json();
        
        const { activities } = body;
        
        if (!activities || !Array.isArray(activities)) {
            return NextResponse.json({
                success: false,
                error: 'Activities array is required'
            }, { status: 400 });
        }
        
        await connectDB();
        
        const updateResults = [];
        
        // Process each activity update
        for (const activityUpdate of activities) {
            const { id, status, endTime, duration, result, data } = activityUpdate;
            
            if (!id) {
                updateResults.push({
                    id: null,
                    success: false,
                    error: 'Activity ID is required'
                });
                continue;
            }
            
            try {
                const activity = await Activity.findOne({
                    _id: id,
                    userId: user._id
                });
                
                if (!activity) {
                    updateResults.push({
                        id,
                        success: false,
                        error: 'Activity not found or access denied'
                    });
                    continue;
                }
                
                // Update activity fields
                if (status) activity.status = status;
                if (endTime) activity.endTime = new Date(endTime);
                if (duration) activity.duration = duration;
                if (result) activity.result = result;
                if (data) activity.data = { ...activity.data, ...data };
                
                await activity.save();
                
                updateResults.push({
                    id,
                    success: true,
                    message: 'Activity updated successfully'
                });
                
            } catch (error) {
                updateResults.push({
                    id,
                    success: false,
                    error: error.message
                });
            }
        }
        
        return NextResponse.json({
            success: true,
            message: 'Bulk update completed',
            results: updateResults
        }, { status: 200 });
        
    } catch (error) {
        console.error('Bulk update activities error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to update activities'
        }, { status: error.message === 'Authentication failed' ? 401 : 500 });
    }
}