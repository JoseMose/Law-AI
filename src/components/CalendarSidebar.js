import React, { useState, useEffect, useCallback } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

const API_BASE = 'https://phd54f79fk.execute-api.us-east-1.amazonaws.com/dev';

// Event type colors
const EVENT_TYPE_COLORS = {
  'Hearing': '#dc3545', // red
  'Deposition': '#fd7e14', // orange
  'Client Meeting': '#007bff', // blue
  'Filing Deadline': '#28a745', // green
  'Court Date': '#6f42c1', // purple
  'Mediation': '#e83e8c', // pink
  'Arbitration': '#20c997', // teal
  'Other': '#6c757d' // gray
};

const CalendarSidebar = ({ caseId, clientId, isOpen, onToggle }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  // Load events for this case
  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('accessToken');
      const res = await fetch(`${API_BASE}/cases/${caseId}/events`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      } else {
        // Mock data for testing when API doesn't exist yet
        console.log('API not available, using mock data');
        const mockEvents = [
          {
            event_id: '1',
            title: 'Initial Client Meeting',
            date: new Date().toISOString(),
            type: 'Client Meeting',
            location: 'Office Conference Room A',
            notes: 'Discuss case details and gather initial information'
          },
          {
            event_id: '2',
            title: 'Document Review Deadline',
            date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
            type: 'Filing Deadline',
            location: '',
            notes: 'Review all submitted documents before court date'
          },
          {
            event_id: '3',
            title: 'Court Hearing',
            date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
            type: 'Hearing',
            location: 'Superior Court Room 204',
            notes: 'Present case arguments and evidence'
          }
        ];
        setEvents(mockEvents);
      }
    } catch (error) {
      console.error('Error loading events:', error);
      // Mock data for testing when API fails
      const mockEvents = [
        {
          event_id: '1',
          title: 'Initial Client Meeting',
          date: new Date().toISOString(),
          type: 'Client Meeting',
          location: 'Office Conference Room A',
          notes: 'Discuss case details and gather initial information'
        }
      ];
      setEvents(mockEvents);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    if (caseId && isOpen) {
      loadEvents();
    }
  }, [caseId, isOpen, loadEvents]);

  // Get events for selected date
  const getEventsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => {
      const eventDate = new Date(event.date).toISOString().split('T')[0];
      return eventDate === dateStr;
    });
  };

  // Get upcoming events (next 30 days)
  const getUpcomingEvents = () => {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    return events
      .filter(event => new Date(event.date) >= today && new Date(event.date) <= thirtyDaysFromNow)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 10); // Show next 10 upcoming events
  };

  // Handle event creation/editing
  const handleSaveEvent = async (eventData) => {
    try {
      const token = sessionStorage.getItem('accessToken');
      const isEditing = !!editingEvent;

      const payload = {
        ...eventData,
        case_id: caseId,
        client_id: clientId,
        ...(isEditing && { event_id: editingEvent.event_id })
      };

      const res = await fetch(`${API_BASE}/events${isEditing ? `/${editingEvent.event_id}` : ''}`, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        await loadEvents();
        setShowAddModal(false);
        setEditingEvent(null);
      } else {
        // Mock save for testing
        console.log('API not available, mocking save operation');
        if (isEditing) {
          setEvents(prev => prev.map(event =>
            event.event_id === editingEvent.event_id
              ? { ...event, ...eventData, date: new Date(eventData.date).toISOString() }
              : event
          ));
        } else {
          const newEvent = {
            ...eventData,
            event_id: Date.now().toString(),
            date: new Date(eventData.date).toISOString()
          };
          setEvents(prev => [...prev, newEvent]);
        }
        setShowAddModal(false);
        setEditingEvent(null);
      }
    } catch (error) {
      console.error('Error saving event:', error);
      // Mock save for testing
      console.log('API failed, mocking save operation');
      if (editingEvent) {
        setEvents(prev => prev.map(event =>
          event.event_id === editingEvent.event_id
            ? { ...event, ...eventData, date: new Date(eventData.date).toISOString() }
            : event
        ));
      } else {
        const newEvent = {
          ...eventData,
          event_id: Date.now().toString(),
          date: new Date(eventData.date).toISOString()
        };
        setEvents(prev => [...prev, newEvent]);
      }
      setShowAddModal(false);
      setEditingEvent(null);
    }
  };

  // Handle event deletion
  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;

    try {
      const token = sessionStorage.getItem('accessToken');
      const res = await fetch(`${API_BASE}/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        await loadEvents();
      } else {
        // Mock delete for testing
        console.log('API not available, mocking delete operation');
        setEvents(prev => prev.filter(event => event.event_id !== eventId));
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      // Mock delete for testing
      console.log('API failed, mocking delete operation');
      setEvents(prev => prev.filter(event => event.event_id !== eventId));
    }
  };

  return (
    <>
      {/* Collapsible Sidebar */}
      <div
        className={`transition-all duration-300 ease-in-out bg-transparent ${
          isOpen ? 'w-80' : 'w-0'
        } overflow-hidden flex-shrink-0`}
        style={{ boxShadow: 'none' }}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-100 bg-white">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Case Calendar</h3>
              <button
                onClick={onToggle}
                className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                aria-label="Close calendar"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Calendar */}
          <div className="p-4 bg-white">
            <Calendar
              onChange={setSelectedDate}
              value={selectedDate}
              className="w-full shadow-sm rounded-md"
              style={{ border: 'none', boxShadow: 'none' }}
              tileClassName={({ date, view }) => {
                if (view === 'month') return 'p-1 hover:bg-gray-50 rounded';
                return null;
              }}
              tileContent={({ date, view }) => {
                if (view === 'month') {
                  const dayEvents = getEventsForDate(date);
                  return dayEvents.length > 0 ? (
                    <div className="flex justify-center mt-1">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    </div>
                  ) : null;
                }
              }}
            />
          </div>

          {/* Events for Selected Date */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">
                  Events for {selectedDate.toLocaleDateString()}
                </h4>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                >
                  + Add Event
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="loading-spinner"></div>
                </div>
              ) : (
                <div className="space-y-3">
                  {getEventsForDate(selectedDate).map(event => (
                    <div key={event.event_id} className="p-3 bg-white rounded-lg shadow-sm">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: EVENT_TYPE_COLORS[event.type] || EVENT_TYPE_COLORS.Other }}
                            ></div>
                            <h5 className="font-medium text-gray-900">{event.title}</h5>
                          </div>
                          <div className="text-sm text-gray-600 mb-1">
                            {new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {event.location && (
                            <div className="text-sm text-gray-600 mb-1">
                              📍 {event.location}
                            </div>
                          )}
                          {event.notes && (
                            <div className="text-sm text-gray-500">
                              {event.notes}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1 ml-2">
                          <button
                            onClick={() => {
                              setEditingEvent(event);
                              setShowAddModal(true);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(event.event_id)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {getEventsForDate(selectedDate).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No events scheduled for this date
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Upcoming Events */}
            <div className="border-t border-gray-200 p-4">
              <h4 className="font-medium text-gray-900 mb-3">Upcoming Events</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {getUpcomingEvents().map(event => (
                  <div key={event.event_id} className="flex items-center gap-2 text-sm">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: EVENT_TYPE_COLORS[event.type] || EVENT_TYPE_COLORS.Other }}
                    ></div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{event.title}</div>
                      <div className="text-gray-500">
                        {new Date(event.date).toLocaleDateString()} at {new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
                {getUpcomingEvents().length === 0 && (
                  <div className="text-gray-500 text-sm">No upcoming events</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Event Modal */}
      {showAddModal && (
        <EventModal
          event={editingEvent}
          onSave={handleSaveEvent}
          onClose={() => {
            setShowAddModal(false);
            setEditingEvent(null);
          }}
        />
      )}
    </>
  );
};

// Event Modal Component
const EventModal = ({ event, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    title: event?.title || '',
    date: event?.date ? new Date(event.date).toISOString().slice(0, 16) : '',
    type: event?.type || 'Hearing',
    location: event?.location || '',
    notes: event?.notes || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.date) {
      alert('Please fill in title and date');
      return;
    }

    onSave({
      ...formData,
      date: new Date(formData.date).toISOString()
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {event ? 'Edit Event' : 'Add New Event'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-200 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Event title"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
            <input
              type="datetime-local"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Hearing">Hearing</option>
              <option value="Deposition">Deposition</option>
              <option value="Client Meeting">Client Meeting</option>
              <option value="Filing Deadline">Filing Deadline</option>
              <option value="Court Date">Court Date</option>
              <option value="Mediation">Mediation</option>
              <option value="Arbitration">Arbitration</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Location (optional)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Additional notes (optional)"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {event ? 'Update Event' : 'Add Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CalendarSidebar;