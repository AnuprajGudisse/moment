import { useNavigate } from "react-router-dom";
import UploadDialog from "../components/UploadDialog";

export default function NewPost() {
  const navigate = useNavigate();
  // Render UploadDialog in embedded page mode
  return (
    <div className="min-h-screen bg-[var(--app-bg)]">
      <UploadDialog
        open
        embedded
        onClose={() => navigate(-1)}
        onUploaded={() => navigate("/home")}
      />
    </div>
  );
}

