import DataExpanderTool from "@/components/alter_expand";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function GeneratePage() {
    return (
        <ProtectedRoute>
            <div>
                <Navbar />
                <DataExpanderTool />
                <Footer />
            </div>
        </ProtectedRoute>
    );
}
