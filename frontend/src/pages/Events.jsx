import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SideNav from "../components/SideNav";
import BottomNav from "../components/BottomNav";
import Button from "../components/Button";
import EventDialog from "../components/EventDialog";

export default function Events() {
  const nav = useNavigate();
  const [query, setQuery] = useState("");
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [filter, setFilter] = useState("upcoming"); // upcoming, past, all

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error('Failed to fetch events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter(event => {
    if (filter === "upcoming") {
      return new Date(event.event_date) > new Date();
    } else if (filter === "past") {
      return new Date(event.event_date) <= new Date();
    }
    return true; // all
  });

  const formatDate = (dateString) => {
    if (!dateString) return "TBD";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
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

  return (
    <div className="min-h-screen bg-[var(--app-bg)]">
      <SideNav active="events" onNavigate={(p) => nav(p)} onLogout={() => {}} query={query} setQuery={setQuery} />
      <main className="mx-auto max-w-6xl px-4 py-6 pb-16 md:pl-[260px]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
            <p className="text-sm muted mt-1">Create or join events. Upload photos from specific events and share with attendees.</p>
          </div>
          <Button onClick={() => setShowEventDialog(true)}>
            Create Event
          </Button>
        </div>

        {/* Filter tabs */}
        <div className="mt-4 flex gap-1 p-1 rounded-lg w-fit" style={{ background: "var(--hover)" }}>
          {[
            { key: "upcoming", label: "Upcoming" },
            { key: "past", label: "Past" },
            { key: "all", label: "All" }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                filter === tab.key 
                  ? 'bg-white shadow-sm font-medium' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="mt-6 text-center">
            <p className="text-sm muted">Loading events...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="mt-6 text-center py-12">
            <p className="text-sm muted">
              {filter === "upcoming" ? "No upcoming events." : "No events found."}
            </p>
            <Button 
              variant="outline" 
              className="mt-3"
              onClick={() => setShowEventDialog(true)}
            >
              Create the first event
            </Button>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredEvents.map((event) => (
              <div
                key={event.id}
                className="rounded-xl border p-4 cursor-pointer hover:shadow-sm transition-shadow"
                style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}
                onClick={() => nav(`/events/${event.id}`)}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-semibold text-sm leading-snug">{event.title}</h3>
                  <span 
                    className={`text-xs px-2 py-1 rounded-full ${getEventTypeColor(event.event_type)}`}
                  >
                    {event.event_type}
                  </span>
                </div>

                {event.description && (
                  <p className="text-sm muted mb-3 line-clamp-2">
                    {event.description}
                  </p>
                )}

                <div className="space-y-2 text-xs muted">
                  {event.event_date && (
                    <div className="flex items-center gap-1">
                      <span>📅</span>
                      <span>{formatDate(event.event_date)}</span>
                    </div>
                  )}
                  
                  {event.location && (
                    <div className="flex items-center gap-1">
                      <span>📍</span>
                      <span>{event.location}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1">
                    <span>👥</span>
                    <span>
                      {event.participant_count || 0}
                      {event.max_participants ? ` / ${event.max_participants}` : ''} participants
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <BottomNav active="events" onNavigate={(p) => nav(p)} />
      
      <EventDialog 
        open={showEventDialog} 
        onClose={() => setShowEventDialog(false)} 
      />
    </div>
  );
}
