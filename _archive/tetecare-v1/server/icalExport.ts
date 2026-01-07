/**
 * iCal Export Service
 * Generates .ics files for calendar synchronization with Google Calendar, Outlook, etc.
 */

interface ICalEvent {
  id: number;
  title: string;
  description?: string | null;
  eventDate: Date;
  endDate?: Date | null;
  location?: string | null;
  isAllDay: boolean;
}

/**
 * Format date for iCal (YYYYMMDDTHHMMSSZ)
 */
function formatICalDate(date: Date, isAllDay: boolean = false): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  if (isAllDay) {
    return `${year}${month}${day}`;
  }

  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Escape special characters in iCal text fields
 */
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * Generate iCal file content from calendar events
 */
export function generateICalFile(events: ICalEvent[]): string {
  const now = new Date();
  const timestamp = formatICalDate(now);

  let ical = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tetê Care//Gestão de Creche de Pets//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Tetê Care - Eventos",
    "X-WR-TIMEZONE:America/Bahia",
  ].join("\r\n");

  for (const event of events) {
    const uid = `event-${event.id}@tecare.app`;
    const dtstart = formatICalDate(new Date(event.eventDate), event.isAllDay);
    const dtend = event.endDate
      ? formatICalDate(new Date(event.endDate), event.isAllDay)
      : formatICalDate(
          new Date(new Date(event.eventDate).getTime() + (event.isAllDay ? 86400000 : 3600000)),
          event.isAllDay
        );

    const summary = escapeICalText(event.title);
    const description = event.description ? escapeICalText(event.description) : "";
    const location = event.location ? escapeICalText(event.location) : "";

    ical += "\r\n" + [
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${timestamp}`,
      event.isAllDay ? `DTSTART;VALUE=DATE:${dtstart}` : `DTSTART:${dtstart}`,
      event.isAllDay ? `DTEND;VALUE=DATE:${dtend}` : `DTEND:${dtend}`,
      `SUMMARY:${summary}`,
      description ? `DESCRIPTION:${description}` : "",
      location ? `LOCATION:${location}` : "",
      "STATUS:CONFIRMED",
      "SEQUENCE:0",
      "END:VEVENT",
    ]
      .filter((line) => line !== "")
      .join("\r\n");
  }

  ical += "\r\nEND:VCALENDAR";

  return ical;
}

/**
 * Generate iCal file for a specific date range
 */
export async function exportEventsToICal(startDate: Date, endDate: Date): Promise<string> {
  const { getCalendarEvents } = await import("./db");
  const events = await getCalendarEvents(startDate, endDate);

  // Map database events to ICalEvent format
  const mappedEvents: ICalEvent[] = events.map((event: any) => ({
    id: event.id,
    title: event.title,
    description: event.description,
    eventDate: event.event_date,
    endDate: event.end_date,
    location: event.location,
    isAllDay: event.is_all_day,
  }));

  return generateICalFile(mappedEvents);
}

/**
 * Generate iCal file for all future events
 */
export async function exportAllFutureEventsToICal(): Promise<string> {
  const now = new Date();
  const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  return exportEventsToICal(now, oneYearFromNow);
}
