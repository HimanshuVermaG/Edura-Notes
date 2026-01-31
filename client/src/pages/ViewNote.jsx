import { useParams, Navigate } from 'react-router-dom';

export default function ViewNote() {
  const { id } = useParams();
  return <Navigate to={`/notes/${id}/view`} replace />;
}
