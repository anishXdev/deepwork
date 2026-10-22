import { Topic, Subject } from '../types';

export interface CalendarEventPayload {
  title: string;
  description: string;
  startTimeIso: string;
  endTimeIso: string;
}

export const GoogleCalendarService = {
  /**
   * Generates a Google Calendar web deep-link that allows instant 1-click scheduling
   * on both Web and mobile Android (opens Google Calendar app).
   */
  generateWebCalendarLink(topic: Topic, subject?: Subject): string {
    const title = encodeURIComponent(`[Study] ${subject ? subject.name + ': ' : ''}${topic.name}`);
    const details = encodeURIComponent(
      `Subject: ${subject ? subject.name : 'General'}\n` +
      `Estimated Hours: ${topic.approxHours} hrs\n` +
      `Notes: ${topic.notes || 'None'}\n\n` +
      `Scheduled via Deepwork App`
    );

    // Calculate start and end times
    const dateStr = topic.scheduledDate; // YYYY-MM-DD
    const timeStr = topic.scheduledTime || '09:00'; // HH:mm
    
    // Format into YYYYMMDDTHHmmssZ
    const [year, month, day] = dateStr.split('-');
    const [hours, minutes] = timeStr.split(':');
    
    const startDate = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hours),
      parseInt(minutes)
    );
    
    // Add approx hours
    const durationMs = (topic.approxHours || 1) * 60 * 60 * 1000;
    const endDate = new Date(startDate.getTime() + durationMs);

    const formatToGCalDate = (d: Date) => {
      return d.toISOString().replace(/-|:|\.\d\d\d/g, '');
    };

    const datesParam = `${formatToGCalDate(startDate)}/${formatToGCalDate(endDate)}`;

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${datesParam}`;
  },

  /**
   * Direct API synchronization using OAuth Access Token
   */
  async syncToGoogleCalendar(
    topic: Topic,
    subject: Subject | undefined,
    accessToken: string
  ): Promise<{ eventId?: string; htmlLink?: string; error?: string }> {
    try {
      const dateStr = topic.scheduledDate;
      const timeStr = topic.scheduledTime || '09:00';
      const [year, month, day] = dateStr.split('-');
      const [hours, minutes] = timeStr.split(':');

      const startDate = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hours),
        parseInt(minutes)
      );
      const durationMs = (topic.approxHours || 1) * 60 * 60 * 1000;
      const endDate = new Date(startDate.getTime() + durationMs);

      const eventBody = {
        summary: `[Study] ${subject ? subject.name + ': ' : ''}${topic.name}`,
        description: `Subject: ${subject?.name || 'General'}\nEstimated: ${topic.approxHours} hrs\n${topic.notes || ''}\nScheduled via Deepwork`,
        start: {
          dateTime: startDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 15 },
            { method: 'popup', minutes: 5 }
          ]
        }
      };

      const url = topic.gcalEventId
        ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${topic.gcalEventId}`
        : 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

      const method = topic.gcalEventId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventBody)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return { error: errorData.error?.message || `Google Calendar API error (${res.status})` };
      }

      const data = await res.json();
      return { eventId: data.id, htmlLink: data.htmlLink };
    } catch (err: any) {
      return { error: err.message || 'Failed to sync with Google Calendar' };
    }
  }
};
