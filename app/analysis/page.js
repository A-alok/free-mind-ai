import Analysis from "@/components/analysis";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function AnalysisPage() {
    return (
        <ProtectedRoute>
            <div>
                <Navbar />
                <Analysis />
                <Footer />
            </div>
        </ProtectedRoute>
    );
}
