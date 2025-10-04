"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, FolderKanban, Table, Layers, Rocket, Bot, LineChart } from "lucide-react";
import CreateProjectModal from "@/components/CreateProjectModal";

export default function MainOverview() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch("/api/projects");
        const data = await res.json();
        if (data.success) {
          const mapped = (data.projects || []).map((p) => ({
            id: p.id,
            name: p.name,
            lastModified: p.updatedAt || p.createdAt,
            status: p.status || "active",
          }));
          setProjects(mapped);
        }
      } catch (e) {
        console.error("Failed to load projects", e);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  const quickActions = [
    { label: "New Project", icon: <Plus className="h-5 w-5" />, onClick: () => setIsModalOpen(true) },
    { label: "ML Builder", href: "/ml", icon: <FolderKanban className="h-5 w-5" /> },
    { label: "CSV Analysis", href: "/analysis", icon: <Table className="h-5 w-5" /> },
    { label: "Alter & Expand", href: "/alter_expand", icon: <Layers className="h-5 w-5" /> },
    { label: "Deploy", href: "/deploy", icon: <Rocket className="h-5 w-5" /> },
    { label: "Chatbot", href: "/chatbot", icon: <Bot className="h-5 w-5" /> },
  ];

  const onCreateProject = (project) => {
    setProjects((prev) => [project, ...prev]);
    setIsModalOpen(false);
    router.push("/ml");
  };

  return (
    <main className="min-h-screen bg-white text-gray-900 pt-28">
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-violet-50 to-white p-8 md:p-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Welcome to your workspace</h1>
              <p className="mt-2 text-gray-600">Create, analyze, and deploy ML projects from a single, clean dashboard.</p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-5 py-3 text-white shadow-lg hover:bg-violet-700 transition"
            >
              <Plus className="h-5 w-5" /> New Project
            </button>
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section className="max-w-7xl mx-auto px-6 mt-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {quickActions.map((item) => (
            item.href ? (
              <Link
                key={item.label}
                href={item.href}
                className="group rounded-xl border border-gray-200 bg-white p-4 text-center hover:border-violet-300 hover:shadow-md transition"
              >
                <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                  {item.icon}
                </div>
                <div className="text-sm font-medium text-gray-800 group-hover:text-violet-700">{item.label}</div>
              </Link>
            ) : (
              <button
                key={item.label}
                onClick={item.onClick}
                className="group rounded-xl border border-gray-200 bg-white p-4 text-center hover:border-violet-300 hover:shadow-md transition"
              >
                <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                  {item.icon}
                </div>
                <div className="text-sm font-medium text-gray-800 group-hover:text-violet-700">{item.label}</div>
              </button>
            )
          ))}
        </div>
      </section>

      {/* Recent projects */}
      <section className="max-w-7xl mx-auto px-6 mt-10 mb-16">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent projects</h2>
          {!loading && (
            <button onClick={() => setIsModalOpen(true)} className="text-violet-700 hover:text-violet-800 text-sm">Create new</button>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white">
          {loading ? (
            <div className="p-6 text-gray-500">Loading projects…</div>
          ) : projects.length === 0 ? (
            <div className="p-10 text-center">
              <LineChart className="h-8 w-8 text-violet-500 mx-auto mb-2" />
              <p className="text-gray-600">No projects yet. Create your first project to get started.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {projects.slice(0, 6).map((p) => (
                <li key={p.id} className="flex items-center justify-between p-4 hover:bg-violet-50/50 transition">
                  <div>
                    <div className="font-medium text-gray-900">{p.name}</div>
                    <div className="text-xs text-gray-500">Updated {new Date(p.lastModified).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full border px-2 py-1 text-xs text-gray-600 border-gray-200">{p.status}</span>
                    <button
                      onClick={() => router.push("/ml")}
                      className="rounded-full border border-violet-300 px-3 py-1 text-sm text-violet-700 hover:bg-violet-50"
                    >
                      Open
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {isModalOpen && (
        <CreateProjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={onCreateProject} />
      )}
    </main>
  );
}
