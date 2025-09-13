// app/api/auth/register/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/user';

export async function POST(request) {
    try {
        await connectDB();

        const { name, email, password } = await request.json();

        // Validate input
        if (!name || !email || !password) {
            return NextResponse.json(
                { error: 'Please provide all required fields' },
                { status: 400 }
            );
        }

        // Check if user exists
        const existingUser = await User.findOne({ email });
        
        if (existingUser) {
            return NextResponse.json(
                { error: 'Email already registered' },
                { status: 400 }
            );
        }

        // Create new user
        const user = await User.create({
            name,
            email,
            password,
            lastLogin: new Date()
        });

        // Return response without password
        const userData = {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
        };

        return NextResponse.json({
            success: true,
            message: 'Registration successful',
            user: userData
        }, { status: 201 });

    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json(
            { error: 'An error occurred during registration' },
            { status: 500 }
        );
    }
}