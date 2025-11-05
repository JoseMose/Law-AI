import * as Calendar from 'expo-calendar';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

async function requestPermissions() {
  // Request calendar permission
  const calPerm = await Calendar.requestCalendarPermissionsAsync();
  // Request notifications permission
  const notPerm = await Notifications.requestPermissionsAsync();

  return {
    calendarGranted: calPerm.status === 'granted',
    notificationsGranted: (notPerm.status === 'granted' || notPerm.granted === true)
  };
}

async function getWritableCalendar() {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  // prefer a calendar that allows modifications
  const writable = calendars.find(c => c.allowsModifications || c.accessLevel === Calendar.CalendarAccessLevel.OWNER);
  if (writable) return writable.id;

  // create an app calendar if possible
  let source = null;
  try {
    if (Platform.OS === 'ios' && Calendar.getSourcesAsync) {
      const sources = await Calendar.getSourcesAsync();
      source = sources.find(s => s.type === 'local') || sources[0];
    }
  } catch (e) {
    // ignore if getSourcesAsync not available
  }

  const details = {
    title: 'LawAI',
    entityType: Calendar.EntityTypes.EVENT,
    color: '#0b67ff',
    name: 'LawAI',
    ownerAccount: 'LawAI'
  };
  if (source) details.sourceId = source.id;

  const newId = await Calendar.createCalendarAsync(details);
  return newId;
}

async function createEvent(calendarId, event) {
  // event: { title, startDate, endDate, notes, location, timeZone }
  const ev = {
    title: event.title || 'Event',
    startDate: event.startDate,
    endDate: event.endDate,
    notes: event.notes || '',
    location: event.location || '',
    timeZone: event.timeZone || undefined
  };
  const eventId = await Calendar.createEventAsync(calendarId, ev);
  return eventId;
}

async function scheduleNotificationForEvent(event, options = { minutesBefore: 30 }) {
  // event: { id, title, startDate, notes }
  const minutesBefore = options.minutesBefore ?? 30;
  const triggerDate = new Date(new Date(event.startDate).getTime() - minutesBefore * 60 * 1000);
  if (triggerDate <= new Date()) return null; // already passed

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `Reminder: ${event.title}`,
      body: event.notes || '',
      data: { eventId: event.id }
    },
    trigger: triggerDate
  });
  return id;
}

async function syncCaseEvents(caseItem, opts = { minutesBefore: 30 }) {
  if (!caseItem) throw new Error('Missing case');
  const events = caseItem.events || caseItem.calendar || [];
  if (!Array.isArray(events) || events.length === 0) return [];

  const { calendarGranted, notificationsGranted } = await requestPermissions();
  if (!calendarGranted) throw new Error('Calendar permission not granted');

  const calendarId = await getWritableCalendar();
  const created = [];

  for (const ev of events) {
    // normalize start/end
    const startDate = ev.start ? (typeof ev.start === 'string' ? new Date(ev.start) : ev.start) : null;
    let endDate = null;
    if (ev.end) endDate = typeof ev.end === 'string' ? new Date(ev.end) : ev.end;
    if (!endDate && startDate) endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

    if (!startDate) continue; // skip invalid

    const title = ev.title || `${caseItem.title || 'Case'} Event`;
    const notes = ev.notes || ev.description || '';

    // check for duplicates: look for existing events in a small window around startDate
    const windowBefore = new Date(startDate.getTime() - 5 * 60 * 1000);
    const windowAfter = new Date(startDate.getTime() + 5 * 60 * 1000);
    let existing = [];
    try {
      existing = await Calendar.getEventsAsync([calendarId], windowBefore, windowAfter);
    } catch (e) {
      console.warn('Failed to query existing events for duplicate detection', e);
    }

    const duplicate = existing.find(x => (x.title === title) && Math.abs(new Date(x.startDate).getTime() - startDate.getTime()) < 5 * 60 * 1000);
    let eventId;
    if (duplicate) {
      eventId = duplicate.id;
    } else {
      eventId = await createEvent(calendarId, { title, startDate, endDate, notes, location: ev.location, timeZone: ev.timeZone });
    }

    let notificationId = null;
    if (notificationsGranted) {
      try {
        // only schedule notification if we created the event (not duplicate)
        if (!duplicate) {
          notificationId = await scheduleNotificationForEvent({ id: eventId, title, startDate, notes }, opts);
        } else {
          notificationId = null;
        }
      } catch (e) {
        // scheduling failed for this event, continue
        console.warn('Failed to schedule notification', e);
      }
    }

    created.push({ eventId, notificationId });
  }

  return created;
}

export default { requestPermissions, getWritableCalendar, createEvent, scheduleNotificationForEvent, syncCaseEvents };
