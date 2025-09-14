import Profile from "@/components/Profile";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function ProfilePage() {
    return (
        <ProtectedRoute>
            <div>
                <Navbar />
                <Profile />
                <Footer />
            </div>
        </ProtectedRoute>
    );
}
