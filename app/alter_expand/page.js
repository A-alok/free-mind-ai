import DataExpanderTool from "@/components/alter_expand";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function GeneratePage() {
    return (
        <ProtectedRoute>
            <DataExpanderTool />
        </ProtectedRoute>
    );
}
