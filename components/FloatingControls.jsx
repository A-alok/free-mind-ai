"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, LogOut } from "lucide-react";

export default function FloatingControls({ backHref = "/main" }) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      try { localStorage.removeItem("cachedUser"); } catch (e) {}
      router.push("/");
    } catch (e) {
      router.push("/");
    }
  };

  return (
    <div className="fixed top-4 left-6 right-6 z-40 flex items-center justify-between pointer-events-none">
      <button
        onClick={() => router.push(backHref)}
        className="pointer-events-auto h-10 w-10 rounded-full bg-white border border-gray-200 shadow flex items-center justify-center text-gray-700 hover:text-violet-700"
        aria-label="Back"
        title="Back"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <button
        onClick={handleLogout}
        className="pointer-events-auto h-10 w-10 rounded-full bg-red-600 hover:bg-red-700 text-white shadow flex items-center justify-center"
        aria-label="Logout"
        title="Logout"
      >
        <LogOut className="h-5 w-5" />
      </button>
    </div>
  );
}
