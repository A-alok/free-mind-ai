import Analysis from "@/components/analysis";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function AnalysisPage() {
    return (
        <ProtectedRoute>
            <Analysis />
        </ProtectedRoute>
    );
}
