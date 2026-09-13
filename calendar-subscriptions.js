(function (root) {
  'use strict';
  const base = 'https://dskiad.github.io/ATHELSTAN-PROV-CALENDAR/';
  const website = 'https://moa-greece.gr/';
  const courts = [
    ['Homer No. 194', 'Athens', 'English', '🇬🇧'],
    ['Northern Paladins No. 198', 'Thessaloniki', 'English', '🇬🇧'],
    ['Rosa Rhodensis No. 192', 'Rodos', 'English', '🇬🇧'],
    ['Sectio Aurea No. 125', 'Piraeus', 'Greek', '🇬🇷'],
    ['Frank Hastings No. 195', 'Zakynthos', 'English', '🇬🇧'],
    ['Sophia No. 193', 'Piraeus', 'Greek', '🇬🇷'],
    ['William Cartwright No. 196', 'Corfu', 'Greek', '🇬🇷']
  ];
  function date(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Invalid Court date');
    const result = new Date(value + 'T00:00:00Z');
    if (!Number.isFinite(result.getTime()) || result.toISOString().slice(0, 10) !== value) throw new Error('Invalid Court date');
    return result;
  }
  function isSchedule(value) {
    return Array.isArray(value) && value.every(row => Array.isArray(row) && row.length === 5 && row.every(cell => typeof cell === 'string'));
  }
  function parseSchedule(source) {
    const match = source.match(/^\s*window\.PROVINCE_SCHEDULE\s*=\s*([\s\S]*?)\s*;?\s*$/);
    if (!match) throw new Error('Invalid calendar format');
    const schedule = JSON.parse(match[1]);
    if (!isSchedule(schedule)) throw new Error('Invalid programme');
    schedule.forEach(row => date(row[3]));
    return schedule;
  }
  function courtKey(name) {
    // Court numbers are permanent even when a Court's display name changes.
    const number = name.match(/\bNo\.?\s*(\d+)\b/i);
    if (number) return 'court-' + number[1];
    // Preserve distinct custom Court names without unsafe path characters.
    return 'court-' + Array.from(new TextEncoder().encode(name.trim().normalize('NFC').toLowerCase()), byte => byte.toString(16).padStart(2, '0')).join('');
  }
  function title(name) { return 'ATHELSTAN Court ' + name; }
  function feedPath(name) { return 'calendars/' + courtKey(name) + '.ics'; }
  function feedUrl(name) { return base + feedPath(name); }
  function selected(schedule, name) {
    return schedule.filter(row => row[1] === name).slice().sort((a, b) => a[3].localeCompare(b[3]) || a[4].localeCompare(b[4]));
  }
  function courtList(schedule) {
    const all = new Map(courts.map(court => [court[0], court.slice()]));
    schedule.forEach(row => {
      if (!all.has(row[1])) all.set(row[1], [row[1], row[2], '', '']);
    });
    return [...all.values()];
  }
  function nextDay(value) {
    const result = date(value);
    result.setUTCDate(result.getUTCDate() + 1);
    return result.toISOString().slice(0, 10);
  }
  function escapeText(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
  }
  function fold(line) {
    const encoder = new TextEncoder();
    const lines = [];
    let current = '', bytes = 0;
    for (const character of line) {
      const size = encoder.encode(character).length;
      if (bytes + size > 75) { lines.push(current); current = ' '; bytes = 1; }
      current += character;
      bytes += size;
    }
    lines.push(current);
    return lines.join('\r\n');
  }
  function stamp(value) { return new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z'); }
  function details(row) {
    const court = courts.find(court => courtKey(court[0]) === courtKey(row[1]));
    return ['Province of Greece — Works of the Court', 'Meeting type: ' + row[4],
      court ? 'Language: ' + court[2] : '', 'Website: ' + website, 'Published programme: ' + base].filter(Boolean).join('\n');
  }
  function calendar(schedule, name, modifiedAt) {
    // RFC 7986: a preferred CSS named colour; receiving calendars may override it.
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Province of Greece//Court Calendar//EN',
      'CALSCALE:GREGORIAN', 'COLOR:red', 'X-WR-CALNAME:' + escapeText(title(name)),
      'X-WR-CALDESC:' + escapeText('Court dates published by the Province of Greece. Updates are refreshed by your calendar provider.'),
      'X-WR-TIMEZONE:Europe/Athens'];
    const occurrences = new Map();
    for (const row of selected(schedule, name)) {
      date(row[3]);
      const key = courtKey(name) + '-' + row[3].replace(/-/g, '');
      const occurrence = (occurrences.get(key) || 0) + 1;
      occurrences.set(key, occurrence);
      lines.push('BEGIN:VEVENT', 'UID:' + key + '-' + occurrence + '@athelstan-province-greece',
        'DTSTAMP:' + stamp(modifiedAt), 'LAST-MODIFIED:' + stamp(modifiedAt),
        'DTSTART;VALUE=DATE:' + row[3].replace(/-/g, ''),
        'DTEND;VALUE=DATE:' + nextDay(row[3]).replace(/-/g, ''),
        'SUMMARY:' + escapeText(title(row[1])), 'LOCATION:' + escapeText(row[2]),
        'DESCRIPTION:' + escapeText(details(row)), 'URL:' + website,
        'COLOR:red', 'STATUS:CONFIRMED', 'TRANSP:TRANSPARENT', 'END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    return lines.map(fold).join('\r\n') + '\r\n';
  }
  function buildFeeds(schedule, modifiedAt, previous = []) {
    if (!isSchedule(schedule) || !isSchedule(previous)) throw new Error('Invalid programme');
    schedule.forEach(row => date(row[3]));
    // Keep an empty feed for a removed custom Court so subscribers lose obsolete dates.
    const names = new Map(courtList(previous).map(court => [courtKey(court[0]), court[0]]));
    courtList(schedule).forEach(court => names.set(courtKey(court[0]), court[0]));
    return [...names.values()].map(name => ({ path: feedPath(name), content: calendar(schedule, name, modifiedAt) }));
  }
  function googleEventUrl(row) {
    const query = new URLSearchParams({ action: 'TEMPLATE', text: title(row[1]),
      dates: row[3].replace(/-/g, '') + '/' + nextDay(row[3]).replace(/-/g, ''),
      location: row[2], details: details(row) });
    return 'https://calendar.google.com/calendar/r/eventedit?' + query.toString();
  }
  const api = { base, courts, date, isSchedule, parseSchedule, courtKey, title, feedPath, feedUrl,
    selected, courtList, nextDay, escapeText, fold, calendar, buildFeeds, googleEventUrl };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CourtCalendars = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
