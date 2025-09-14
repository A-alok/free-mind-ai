import Chatbot from '@/components/chatbot';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function chatbot() {
    return (
        <ProtectedRoute>
            <div>
                <Navbar />
                <Chatbot />
                <Footer />
            </div>
        </ProtectedRoute>
    );
}
