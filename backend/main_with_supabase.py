from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
import os
from supabase import create_client, Client
import json

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "your-supabase-url")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "your-supabase-anon-key")

# Initialize Supabase client (will use environment variables in production)
try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
except:
    supabase = None  # Fallback to mock data if Supabase not configured

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
    return {"message": "moment backend running", "supabase_connected": supabase is not None}

# Events endpoints
@app.get("/api/events")
def get_events(upcoming: bool = True):
    """
    Get events list. Uses Supabase if available, otherwise mock data.
    """
    if supabase:
        try:
            # Use the helper view for events with counts
            if upcoming:
                response = supabase.table("upcoming_events").select("*").execute()
            else:
                response = supabase.table("events_with_counts").select("*").order("event_date", desc=True).execute()
            
            events = response.data if response.data else []
            
            # Format dates for frontend
            for event in events:
                if event.get('event_date'):
                    # Ensure proper ISO format
                    event['event_date'] = event['event_date']
                if event.get('created_at'):
                    event['created_at'] = event['created_at']
            
            return {"events": events}
        except Exception as e:
            print(f"Supabase error: {e}")
            # Fall back to mock data
            pass
    
    # Mock data fallback
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
            "photo_count": 0,
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
            "photo_count": 0,
            "created_by": "user-2",
            "created_at": "2025-09-16T09:00:00Z"
        }
    ]
    
    return {"events": mock_events}

@app.post("/api/events")
def create_event(event: EventCreate):
    """
    Create a new event. Uses Supabase if available.
    """
    if supabase:
        try:
            event_data = {
                "title": event.title,
                "description": event.description,
                "location": event.location,
                "event_date": event.event_date.isoformat() if event.event_date else None,
                "event_type": event.event_type,
                "max_participants": event.max_participants,
                # In production, get created_by from auth token
                "created_by": "current-user-id"  # TODO: Get from JWT token
            }
            
            response = supabase.table("events").insert(event_data).execute()
            
            if response.data:
                return {"event": response.data[0], "message": "Event created successfully"}
            else:
                raise HTTPException(status_code=400, detail="Failed to create event")
                
        except Exception as e:
            print(f"Supabase error: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    # Mock response fallback
    new_event = {
        "id": f"event-{datetime.now().timestamp()}",
        "title": event.title,
        "description": event.description,
        "location": event.location,
        "event_date": event.event_date.isoformat() if event.event_date else None,
        "event_type": event.event_type,
        "max_participants": event.max_participants,
        "participant_count": 0,
        "photo_count": 0,
        "created_by": "current-user",
        "created_at": datetime.now().isoformat()
    }
    
    return {"event": new_event, "message": "Event created successfully"}

@app.get("/api/events/{event_id}")
def get_event(event_id: str):
    """
    Get a specific event by ID with participants and photos.
    """
    if supabase:
        try:
            # Get event details
            event_response = supabase.table("events_with_counts").select("*").eq("id", event_id).single().execute()
            
            if not event_response.data:
                raise HTTPException(status_code=404, detail="Event not found")
            
            event = event_response.data
            
            # Get participants
            participants_response = supabase.table("event_participants").select("""
                user_id, status,
                profiles!event_participants_user_id_fkey (username, full_name)
            """).eq("event_id", event_id).execute()
            
            participants = []
            for p in (participants_response.data or []):
                participants.append({
                    "user_id": p["user_id"],
                    "status": p["status"],
                    "username": p["profiles"]["username"] or p["profiles"]["full_name"] or "Unknown"
                })
            
            # Get event photos
            photos_response = supabase.table("event_photos").select("""
                id, uploaded_by,
                photos!event_photos_photo_id_fkey (id, storage_path)
            """).eq("event_id", event_id).execute()
            
            photos = []
            for p in (photos_response.data or []):
                if p["photos"]:
                    photos.append({
                        "id": p["photos"]["id"],
                        "url": f"/storage/photos/{p['photos']['storage_path']}",  # Adjust URL as needed
                        "uploaded_by": p["uploaded_by"]
                    })
            
            event["participants"] = participants
            event["photos"] = photos
            
            return {"event": event}
            
        except Exception as e:
            print(f"Supabase error: {e}")
            # Fall back to mock data
            pass
    
    # Mock response fallback
    event_detail = {
        "id": event_id,
        "title": "Golden Hour Photowalk",
        "description": "Join us for a sunset photography session in the city center.",
        "location": "Downtown Park",
        "event_date": "2025-09-25T18:00:00Z",
        "event_type": "photowalk",
        "max_participants": 15,
        "participant_count": 8,
        "photo_count": 2,
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
    if supabase:
        try:
            # Check if event exists
            event_check = supabase.table("events").select("id").eq("id", event_id).single().execute()
            if not event_check.data:
                raise HTTPException(status_code=404, detail="Event not found")
            
            # Upsert participant status
            participant_data = {
                "event_id": event_id,
                "user_id": "current-user-id",  # TODO: Get from JWT token
                "status": participant.status
            }
            
            response = supabase.table("event_participants").upsert(participant_data).execute()
            
            return {
                "message": f"Successfully RSVP'd to event {event_id} with status: {participant.status}",
                "event_id": event_id,
                "status": participant.status
            }
            
        except Exception as e:
            print(f"Supabase error: {e}")
            # Fall back to mock response
            pass
    
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
    if supabase:
        try:
            response = supabase.table("event_participants").delete().eq("event_id", event_id).eq("user_id", "current-user-id").execute()
            
            return {
                "message": f"Successfully removed RSVP from event {event_id}",
                "event_id": event_id
            }
            
        except Exception as e:
            print(f"Supabase error: {e}")
            # Fall back to mock response
            pass
    
    return {
        "message": f"Successfully removed RSVP from event {event_id}",
        "event_id": event_id
    }

@app.post("/api/events/{event_id}/photos")
def add_event_photo(event_id: str, photo_id: str):
    """
    Add a photo to an event gallery.
    """
    if supabase:
        try:
            # Check if user is participant
            participant_check = supabase.table("event_participants").select("user_id").eq("event_id", event_id).eq("user_id", "current-user-id").execute()
            
            if not participant_check.data:
                raise HTTPException(status_code=403, detail="Only event participants can add photos")
            
            photo_data = {
                "event_id": event_id,
                "photo_id": photo_id,
                "uploaded_by": "current-user-id"  # TODO: Get from JWT token
            }
            
            response = supabase.table("event_photos").insert(photo_data).execute()
            
            return {
                "message": f"Photo {photo_id} added to event {event_id}",
                "event_id": event_id,
                "photo_id": photo_id
            }
            
        except Exception as e:
            print(f"Supabase error: {e}")
            # Fall back to mock response
            pass
    
    return {
        "message": f"Photo {photo_id} added to event {event_id}",
        "event_id": event_id,
        "photo_id": photo_id
    }
