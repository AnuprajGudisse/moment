import { useEffect, useState } from "react";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import Discover from "./pages/Discover";
import { supabase } from "./lib/supabase";
import UploadDialog from "./components/UploadDialog";
import UpcomingMenu from "./components/UpcomingMenu";
import Profile from "./pages/Profile";
import NewPost from "./pages/NewPost";
import Events from "./pages/Events";
import Gags from "./pages/Gags";
import GagNew from "./pages/GagNew";
import GagDetail from "./pages/GagDetail";
import MyApplications from "./pages/MyApplications";
import Communities from "./pages/Communities";
import Trending from "./pages/Trending";
import Messages from "./pages/Messages";

function AuthGate({ children, invert = false }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session ?? null);
        setLoading(false);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, newSession) => {
      setSession(newSession ?? null);
      setLoading(false);
    });
    return () => {
      mounted = false;
      sub.subscription?.unsubscribe?.();
    };
  }, []);

  if (loading) return <div className="p-6 text-sm text-gray-600">Loading…</div>;

  // invert=true means "only for logged OUT users"
  if (invert) return session ? <Navigate to="/home" replace /> : children;

  // default: only for logged IN users
  return session ? children : <Navigate to="/login" replace />;
}

const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/home" replace /> },
  { path: "/login", element: <AuthGate invert><Login /></AuthGate> },
  { path: "/signup", element: <AuthGate invert><Signup /></AuthGate> },
  { path: "/home", element: <AuthGate><Home /></AuthGate> },
  { path: "/discover", element: <AuthGate><Discover /></AuthGate> },
  { path: "/profile", element: <AuthGate><Profile /></AuthGate> },
  { path: "/new", element: <AuthGate><NewPost /></AuthGate> },
  { path: "/events", element: <AuthGate><Events /></AuthGate> },
  { path: "/gags", element: <AuthGate><Gags /></AuthGate> },
  { path: "/gags/new", element: <AuthGate><GagNew /></AuthGate> },
  { path: "/gags/:id", element: <AuthGate><GagDetail /></AuthGate> },
  { path: "/gags/applications", element: <AuthGate><MyApplications /></AuthGate> },
  { path: "/communities", element: <AuthGate><Communities /></AuthGate> },
  { path: "/trending", element: <AuthGate><Trending /></AuthGate> },
  { path: "/messages", element: <AuthGate><Messages /></AuthGate> },
]);

export default function App() {
  const [showUpload, setShowUpload] = useState(false);
  const [refreshFeed, setRefreshFeed] = useState(0);
  const [showUpcoming, setShowUpcoming] = useState(false);

  useEffect(() => {
    function openUpload() { setShowUpload(true); }
    function openUpcoming() { setShowUpcoming(true); }
    window.addEventListener('open-upload', openUpload);
    window.addEventListener('open-upcoming', openUpcoming);
    return () => {
      window.removeEventListener('open-upload', openUpload);
      window.removeEventListener('open-upcoming', openUpcoming);
    };
  }, []);

  return (
    <>
      <RouterProvider router={router} key={refreshFeed} />
      <UploadDialog
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onUploaded={() => { setShowUpload(false); setRefreshFeed((n) => n + 1); }}
      />
      <UpcomingMenu open={showUpcoming} onClose={() => setShowUpcoming(false)} />
    </>
  );
}
