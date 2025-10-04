import MLSystem from "@/components/ml-system";
import ProtectedRoute from "@/components/ProtectedRoute";
import FloatingControls from "@/components/FloatingControls";

export default function MLPage() {
  return (
    <ProtectedRoute>
      <>
        <FloatingControls backHref="/main" />
        <MLSystem />
      </>
    </ProtectedRoute>
  );
}
