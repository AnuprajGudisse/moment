from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
import os

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for events
class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    event_date: Optional[datetime] = None
    event_type: str = "other"
    max_participants: Optional[int] = None

class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    event_date: Optional[datetime] = None
    event_type: Optional[str] = None
    max_participants: Optional[int] = None

class EventParticipant(BaseModel):
    status: str = "going"  # going, maybe, not_going, attended

@app.get("/")
def root():
    return {"message": "moment backend running"}

# Events endpoints
@app.get("/api/events")
def get_events(upcoming: bool = True):
    """
    Get events list. For now, returns mock data.
    In production, this would query Supabase directly.
    """
    # Mock data for initial implementation
    mock_events = [
        {
            "id": "event-1",
            "title": "Golden Hour Photowalk",
            "description": "Join us for a sunset photography session in the city center.",
            "location": "Downtown Park",
            "event_date": "2025-09-25T18:00:00Z",
            "event_type": "photowalk",
            "max_participants": 15,
            "participant_count": 8,
            "created_by": "user-1",
            "created_at": "2025-09-17T10:00:00Z"
        },
        {
            "id": "event-2", 
            "title": "Portrait Photography Workshop",
            "description": "Learn professional portrait techniques with natural lighting.",
            "location": "Studio Downtown",
            "event_date": "2025-09-30T14:00:00Z",
            "event_type": "workshop",
            "max_participants": 10,
            "participant_count": 6,
            "created_by": "user-2",
            "created_at": "2025-09-16T09:00:00Z"
        }
    ]
    
    return {"events": mock_events}

@app.post("/api/events")
def create_event(event: EventCreate):
    """
    Create a new event. For now, returns mock response.
    In production, this would insert into Supabase.
    """
    # Mock response
    new_event = {
        "id": f"event-{datetime.now().timestamp()}",
        "title": event.title,
        "description": event.description,
        "location": event.location,
        "event_date": event.event_date.isoformat() if event.event_date else None,
        "event_type": event.event_type,
        "max_participants": event.max_participants,
        "participant_count": 0,
        "created_by": "current-user",  # Would get from auth token
        "created_at": datetime.now().isoformat()
    }
    
    return {"event": new_event, "message": "Event created successfully"}

@app.get("/api/events/{event_id}")
def get_event(event_id: str):
    """
    Get a specific event by ID with participants and photos.
    """
    # Mock response
    event_detail = {
        "id": event_id,
        "title": "Golden Hour Photowalk",
        "description": "Join us for a sunset photography session in the city center.",
        "location": "Downtown Park",
        "event_date": "2025-09-25T18:00:00Z",
        "event_type": "photowalk",
        "max_participants": 15,
        "created_by": "user-1",
        "created_at": "2025-09-17T10:00:00Z",
        "participants": [
            {"user_id": "user-1", "username": "photographer1", "status": "going"},
            {"user_id": "user-2", "username": "shutterbug", "status": "maybe"},
        ],
        "photos": [
            {"id": "photo-1", "url": "/api/photos/photo-1.jpg", "uploaded_by": "user-1"},
            {"id": "photo-2", "url": "/api/photos/photo-2.jpg", "uploaded_by": "user-2"},
        ]
    }
    
    return {"event": event_detail}

@app.post("/api/events/{event_id}/join")
def join_event(event_id: str, participant: EventParticipant):
    """
    RSVP to an event.
    """
    return {
        "message": f"Successfully RSVP'd to event {event_id} with status: {participant.status}",
        "event_id": event_id,
        "status": participant.status
    }

@app.delete("/api/events/{event_id}/leave")
def leave_event(event_id: str):
    """
    Remove RSVP from an event.
    """
    return {
        "message": f"Successfully removed RSVP from event {event_id}",
        "event_id": event_id
    }

@app.post("/api/events/{event_id}/photos")
def add_event_photo(event_id: str, photo_id: str):
    """
    Add a photo to an event gallery.
    """
    return {
        "message": f"Photo {photo_id} added to event {event_id}",
        "event_id": event_id,
        "photo_id": photo_id
    }
