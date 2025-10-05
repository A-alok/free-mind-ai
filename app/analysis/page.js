import Analysis from "@/components/analysis";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";

export default function AnalysisPage() {
    return (
        <ProtectedRoute>
            <>
                <Navbar />
                <Analysis />
            </>
        </ProtectedRoute>
    );
}
