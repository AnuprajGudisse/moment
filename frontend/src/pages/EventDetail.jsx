import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SideNav from "../components/SideNav";
import BottomNav from "../components/BottomNav";
import Button from "../components/Button";
import { supabase } from "../lib/supabase";
import { makePhotoKey, publicPhotoUrl } from "../lib/storage";

export default function EventDetail() {
  const nav = useNavigate();
  const { id } = useParams();
  const [query, setQuery] = useState("");
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRSVP, setUserRSVP] = useState(null);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchEventDetail();
  }, [id]);

  const fetchEventDetail = async () => {
    try {
      const response = await fetch(`/api/events/${id}`);
      const data = await response.json();
      setEvent(data.event);
      
      // Check if user has RSVP'd (mock for now)
      const currentUserRSVP = data.event.participants?.find(p => p.user_id === "current-user");
      setUserRSVP(currentUserRSVP?.status || null);
    } catch (error) {
      console.error('Failed to fetch event:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRSVP = async (status) => {
    setRsvpLoading(true);
    try {
      const response = await fetch(`/api/events/${id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        setUserRSVP(status);
        // Refresh event data to update participant count
        fetchEventDetail();
      }
    } catch (error) {
      console.error('Failed to RSVP:', error);
    } finally {
      setRsvpLoading(false);
    }
  };

  const handleLeaveEvent = async () => {
    setRsvpLoading(true);
    try {
      const response = await fetch(`/api/events/${id}/leave`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setUserRSVP(null);
        fetchEventDetail();
      }
    } catch (error) {
      console.error('Failed to leave event:', error);
    } finally {
      setRsvpLoading(false);
    }
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload to Supabase storage
      const photoKey = makePhotoKey(user.id, file);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('photos')
        .upload(photoKey, file);

      if (uploadError) throw uploadError;

      // Create photo record in database (simplified for demo)
      const { data: photoData, error: dbError } = await supabase
        .from('photos')
        .insert({
          path: uploadData.path,
          user_id: user.id,
          caption: `Photo from ${event.title}`,
          location: event.location || null,
          context: 'event' // Mark as event photo so it doesn't appear in main feed
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Add photo to event via API
      const response = await fetch(`/api/events/${id}/photos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ photo_id: photoData.id })
      });

      if (response.ok) {
        // Refresh event data to show new photo
        fetchEventDetail();
      }
    } catch (error) {
      console.error('Failed to upload photo:', error);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setUploadLoading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "TBD";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getEventTypeColor = (type) => {
    const colors = {
      photowalk: "bg-blue-100 text-blue-800",
      meetup: "bg-green-100 text-green-800",
      challenge: "bg-purple-100 text-purple-800", 
      workshop: "bg-orange-100 text-orange-800",
      exhibition: "bg-red-100 text-red-800",
      other: "bg-gray-100 text-gray-800"
    };
    return colors[type] || colors.other;
  };

  const getRSVPButtonStyle = (status) => {
    const styles = {
      going: "bg-green-100 text-green-800 border-green-200",
      maybe: "bg-yellow-100 text-yellow-800 border-yellow-200",
      not_going: "bg-red-100 text-red-800 border-red-200"
    };
    return styles[status] || "";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--app-bg)]">
        <SideNav active="events" onNavigate={(p) => nav(p)} onLogout={() => {}} query={query} setQuery={setQuery} />
        <main className="mx-auto max-w-4xl px-4 py-6 pb-16 md:pl-[260px]">
          <div className="text-center py-12">
            <p className="text-sm muted">Loading event...</p>
          </div>
        </main>
        <BottomNav active="events" onNavigate={(p) => nav(p)} />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[var(--app-bg)]">
        <SideNav active="events" onNavigate={(p) => nav(p)} onLogout={() => {}} query={query} setQuery={setQuery} />
        <main className="mx-auto max-w-4xl px-4 py-6 pb-16 md:pl-[260px]">
          <div className="text-center py-12">
            <p className="text-sm muted">Event not found</p>
            <Button variant="outline" className="mt-3" onClick={() => nav('/events')}>
              Back to Events
            </Button>
          </div>
        </main>
        <BottomNav active="events" onNavigate={(p) => nav(p)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--app-bg)]">
      <SideNav active="events" onNavigate={(p) => nav(p)} onLogout={() => {}} query={query} setQuery={setQuery} />
      <main className="mx-auto max-w-4xl px-4 py-6 pb-16 md:pl-[260px]">
        {/* Header */}
        <div className="mb-6">
          <button 
            onClick={() => nav('/events')}
            className="text-sm muted mb-3 hover:underline"
          >
            ← Back to Events
          </button>
          
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-semibold tracking-tight">{event.title}</h1>
                <span className={`text-xs px-2 py-1 rounded-full ${getEventTypeColor(event.event_type)}`}>
                  {event.event_type}
                </span>
              </div>
              
              {event.description && (
                <p className="text-muted mb-4">{event.description}</p>
              )}
            </div>

            {/* RSVP Actions */}
            <div className="flex flex-col gap-2">
              {userRSVP ? (
                <div className="text-center">
                  <div className={`text-xs px-3 py-1 rounded-full border ${getRSVPButtonStyle(userRSVP)}`}>
                    You're {userRSVP === 'going' ? 'going' : userRSVP === 'maybe' ? 'maybe going' : 'not going'}
                  </div>
                  <button
                    onClick={handleLeaveEvent}
                    disabled={rsvpLoading}
                    className="text-xs text-red-600 hover:underline mt-1"
                  >
                    Change RSVP
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <Button
                    size="sm"
                    onClick={() => handleRSVP('going')}
                    disabled={rsvpLoading}
                  >
                    Going
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRSVP('maybe')}
                    disabled={rsvpLoading}
                  >
                    Maybe
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Event Details */}
            <div className="rounded-xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
              <h2 className="font-semibold mb-4">Event Details</h2>
              <div className="space-y-3 text-sm">
                {event.event_date && (
                  <div className="flex items-start gap-3">
                    <span className="text-lg">📅</span>
                    <div>
                      <div className="font-medium">Date & Time</div>
                      <div className="text-muted">{formatDate(event.event_date)}</div>
                    </div>
                  </div>
                )}

                {event.location && (
                  <div className="flex items-start gap-3">
                    <span className="text-lg">📍</span>
                    <div>
                      <div className="font-medium">Location</div>
                      <div className="text-muted">{event.location}</div>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <span className="text-lg">👥</span>
                  <div>
                    <div className="font-medium">Participants</div>
                    <div className="text-muted">
                      {event.participants?.length || 0} going
                      {event.max_participants && ` (max ${event.max_participants})`}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Event Photos */}
            <div className="rounded-xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Event Gallery</h2>
                {userRSVP === 'going' && (
                  <>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadLoading}
                    >
                      {uploadLoading ? 'Uploading...' : 'Add Photo'}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </>
                )}
              </div>
              
              {event.photos?.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {event.photos.map((photo) => (
                    <div key={photo.id} className="aspect-square rounded-lg bg-gray-100 overflow-hidden">
                      <img 
                        src={photo.url} 
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm muted">No photos yet</p>
                  {userRSVP === 'going' && (
                    <p className="text-xs muted mt-1">Be the first to share photos from this event!</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Participants */}
            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
              <h3 className="font-medium mb-3">Participants ({event.participants?.length || 0})</h3>
              {event.participants?.length > 0 ? (
                <div className="space-y-2">
                  {event.participants.map((participant) => (
                    <div key={participant.user_id} className="flex items-center gap-2 text-sm">
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex-shrink-0"></div>
                      <span className="font-medium">{participant.username}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getRSVPButtonStyle(participant.status)}`}>
                        {participant.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm muted">No participants yet</p>
              )}
            </div>

            {/* Organizer */}
            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
              <h3 className="font-medium mb-2">Organizer</h3>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                <div>
                  <div className="font-medium">Event Organizer</div>
                  <div className="text-xs muted">Created {new Date(event.created_at).toLocaleDateString()}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <BottomNav active="events" onNavigate={(p) => nav(p)} />
    </div>
  );
}
