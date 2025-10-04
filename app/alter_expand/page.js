import DataExpanderTool from "@/components/alter_expand";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";

export default function GeneratePage() {
    return (
        <ProtectedRoute>
            <>
                <Navbar />
                <DataExpanderTool />
            </>
        </ProtectedRoute>
    );
}
