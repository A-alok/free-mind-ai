import Deployment from "@/components/deploy"
import ProtectedRoute from "@/components/ProtectedRoute"

export default function Deploy ()
{
    return(
        <ProtectedRoute>
            <Deployment /> 
        </ProtectedRoute>
    );
}
