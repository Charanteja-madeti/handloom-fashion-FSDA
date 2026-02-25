import { Navigate } from 'react-router-dom'

export default function ProtectedRoute({ currentUser, children }) {
  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  return children
}
