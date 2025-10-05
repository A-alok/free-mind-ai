import Deployment from "@/components/deploy"
import ProtectedRoute from "@/components/ProtectedRoute"
import Navbar from "@/components/Navbar"

export default function Deploy ()
{
    return(
        <ProtectedRoute>
            <div>
                <Navbar />
                <Deployment />
            </div>
        </ProtectedRoute>
    );
}
