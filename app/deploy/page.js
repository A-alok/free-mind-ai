import Deployment from "@/components/deploy"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import ProtectedRoute from "@/components/ProtectedRoute"

export default function Deploy ()
{
    return(
        <ProtectedRoute>
            <div>
                <Navbar />
                <Deployment />
                <Footer />
            </div>
        </ProtectedRoute>
    );
}
