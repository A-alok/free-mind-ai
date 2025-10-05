"use client";

import MLSystem from "@/components/ml-system";
import ProtectedRoute from "@/components/ProtectedRoute";
import FloatingControls from "@/components/FloatingControls";
import Navbar from "@/components/Navbar";
import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function MLPage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project');
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(!!projectId);

  // Fetch project details if project ID is provided
  useEffect(() => {
    if (projectId) {
      fetchProject(projectId);
    }
  }, [projectId]);

  const fetchProject = async (id) => {
    try {
      console.log('🔍 ML Page: Fetching project with ID:', id);
      const response = await fetch(`/api/projects/${id}`);
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ ML Page: Project fetched successfully:', {
          id: data.project.id,
          name: data.project.name,
          userId: data.project.userId
        });
        setProject(data.project);
      } else {
        console.error('❌ ML Page: Failed to fetch project:', data.error);
      }
    } catch (error) {
      console.error('❌ ML Page: Error fetching project:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-white">Loading project...</div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <>
        <Navbar />
        <FloatingControls backHref="/main" />
        <MLSystem project={project} />
      </>
    </ProtectedRoute>
  );
}
