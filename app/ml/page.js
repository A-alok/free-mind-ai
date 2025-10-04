import MLSystem from "@/components/ml-system";
import ProtectedRoute from "@/components/ProtectedRoute";
import FloatingControls from "@/components/FloatingControls";
import Navbar from "@/components/Navbar";

export default function MLPage() {
  return (
    <ProtectedRoute>
      <>
        <Navbar />
        <FloatingControls backHref="/main" />
        <MLSystem />
      </>
    </ProtectedRoute>
  );
}
