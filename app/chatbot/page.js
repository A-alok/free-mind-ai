import Chatbot from '@/components/chatbot';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function chatbot() {
    return (
        <ProtectedRoute>
            <div>
                <Chatbot />
            </div>
        </ProtectedRoute>
    );
}
