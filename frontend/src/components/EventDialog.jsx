import { useState } from "react";
import Button from "./Button";
import Input from "./Input";
import Label from "./Label";
import Select from "./Select";

const EVENT_TYPES = [
  { value: "photowalk", label: "Photowalk" },
  { value: "meetup", label: "Meetup" },
  { value: "challenge", label: "Challenge" },
  { value: "workshop", label: "Workshop" },
  { value: "exhibition", label: "Exhibition" },
  { value: "other", label: "Other" }
];

export default function EventDialog({ open, onClose }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventType, setEventType] = useState("photowalk");
  const [maxParticipants, setMaxParticipants] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleClose = () => {
    // Reset form
    setTitle("");
    setDescription("");
    setLocation("");
    setEventDate("");
    setEventTime("");
    setEventType("photowalk");
    setMaxParticipants("");
    setError("");
    onClose();
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Event title is required");
      return;
    }

    setSaving(true);
    setError("");

    try {
      // Combine date and time if both provided
      let eventDateTime = null;
      if (eventDate) {
        eventDateTime = eventTime ? `${eventDate}T${eventTime}` : `${eventDate}T00:00`;
      }

      const eventData = {
        title: title.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        event_date: eventDateTime,
        event_type: eventType,
        max_participants: maxParticipants ? parseInt(maxParticipants) : null
      };

      // TODO: Replace with actual API call
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData)
      });

      if (response.ok) {
        console.log('Event created successfully');
        handleClose();
        // TODO: Refresh events list
      } else {
        throw new Error('Failed to create event');
      }
    } catch (err) {
      setError(err.message || 'Failed to create event');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 z-40 bg-black/40"
        onClick={handleClose}
        aria-hidden
      />
      <div className="relative z-50 w-full max-w-2xl rounded-2xl" style={{ background: "var(--card-bg)" }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Create Event</h3>
            <button className="text-sm muted" onClick={handleClose}>Close</button>
          </div>
          <p className="text-sm muted mt-1">Organize a photowalk, meetup, or challenge.</p>
        </div>

        <div className="p-5">
          <div className="space-y-4">
            <div>
              <Label htmlFor="eventTitle">Event Title *</Label>
              <Input 
                id="eventTitle" 
                value={title} 
                onChange={setTitle} 
                placeholder="Golden Hour Photowalk" 
              />
            </div>

            <div>
              <Label htmlFor="eventDescription">Description</Label>
              <textarea
                id="eventDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Join us for a sunset photography session in the city center..."
                rows={3}
                className="w-full px-3 py-2 border rounded-lg resize-none"
                style={{ 
                  borderColor: "var(--border)", 
                  background: "var(--input-bg)",
                  color: "var(--text)"
                }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="eventType">Event Type</Label>
                <Select 
                  id="eventType" 
                  value={eventType} 
                  onChange={setEventType} 
                  className="mt-1"
                >
                  {EVENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label htmlFor="maxParticipants">Max Participants</Label>
                <Input 
                  id="maxParticipants" 
                  type="number"
                  value={maxParticipants} 
                  onChange={setMaxParticipants} 
                  placeholder="15" 
                  min="1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="eventLocation">Location</Label>
              <Input 
                id="eventLocation" 
                value={location} 
                onChange={setLocation} 
                placeholder="Downtown Park, City Center" 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="eventDate">Date</Label>
                <Input 
                  id="eventDate" 
                  type="date"
                  value={eventDate} 
                  onChange={setEventDate} 
                />
              </div>

              <div>
                <Label htmlFor="eventTime">Time</Label>
                <Input 
                  id="eventTime" 
                  type="time"
                  value={eventTime} 
                  onChange={setEventTime} 
                />
              </div>
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

          <div className="mt-6 flex items-center gap-3 justify-end">
            <Button variant="outline" onClick={handleClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving} disabled={saving}>
              Create Event
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
