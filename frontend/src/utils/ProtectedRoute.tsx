import { Navigate } from 'react-router-dom';
import { isAuthenticated, getUserRole } from './auth';

interface Props {
  children: JSX.Element;
  role?: string;
}

const ProtectedRoute = ({ children, role }: Props) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (role) {
    const userRole = getUserRole();
    if (userRole !== role) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
