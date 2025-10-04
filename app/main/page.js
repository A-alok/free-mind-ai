import ProtectedRoute from "@/components/ProtectedRoute";
import MainOverview from "@/components/MainOverview";

export default function Home() {
  return (
    <ProtectedRoute>
      <MainOverview />
    </ProtectedRoute>
  );
}

