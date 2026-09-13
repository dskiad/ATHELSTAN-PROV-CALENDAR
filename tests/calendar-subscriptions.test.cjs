'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const calendars = require('../calendar-subscriptions.js');
const schedule = calendars.parseSchedule(fs.readFileSync(__dirname + '/../calendar-data.js', 'utf8'));
const at = '2026-09-13T16:00:00Z';
const events = content => content.match(/BEGIN:VEVENT\r\n[\s\S]*?END:VEVENT\r\n/g) || [];
test('every published Court date appears only in its Court feed', () => {
  const feeds = calendars.buildFeeds(schedule, at);
  assert.equal(feeds.length, 7);
  assert.equal(feeds.flatMap(feed => events(feed.content)).length, schedule.length);
  for (const [name] of calendars.courts) {
    const expected = calendars.selected(schedule, name);
    const feed = feeds.find(feed => feed.path === calendars.feedPath(name));
    const actual = events(feed.content);
    assert.equal(actual.length, expected.length);
    assert.equal((feed.content.split('BEGIN:VEVENT')[0].match(/^COLOR:red\r$/gm) || []).length, 1);
    expected.forEach((row, i) => {
      assert.equal((actual[i].match(/^COLOR:red\r$/gm) || []).length, 1);
      assert.ok(actual[i].includes('SUMMARY:ATHELSTAN Court ' + name + '\r\n'));
      assert.ok(actual[i].includes('LOCATION:' + row[2] + '\r\n'));
      assert.ok(actual[i].includes('URL:https://moa-greece.gr/\r\n'));
      assert.ok(actual[i].replace(/\r\n /g, '').includes('Website: https://moa-greece.gr/'));
      assert.ok(actual[i].includes('DTSTART;VALUE=DATE:' + row[3].replace(/-/g, '') + '\r\n'));
    });
  }
});
test('all-day end dates are exclusive and handle leap days and year boundaries', () => {
  for (const [start, end] of [['2028-02-28','2028-02-29'],['2028-02-29','2028-03-01'],['2026-12-31','2027-01-01']]) {
    assert.equal(calendars.nextDay(start), end);
    const feed = calendars.calendar([['','Sophia No. 193','Piraeus',start,'Meeting']], 'Sophia No. 193', at);
    assert.ok(feed.includes('DTEND;VALUE=DATE:' + end.replace(/-/g, '')));
    assert.doesNotMatch(feed, /DTSTART:|DTEND:|TZID=/);
  }
});
test('invalid or impossible dates stop publication', () => {
  for (const date of ['2026-02-30','2027-02-29','bad','','2026-1-01']) {
    assert.throws(() => calendars.buildFeeds([['','Sophia No. 193','Piraeus',date,'Meeting']], at));
  }
});
test('a filtered Court includes only its dates regardless of missing month labels', () => {
  const sophia = schedule.filter(row => row[1] === 'Sophia No. 193').map(row => ['', ...row.slice(1)]);
  const result = calendars.calendar(sophia, 'Sophia No. 193', at);
  assert.equal(events(result).length, 3);
  assert.ok(result.includes('DTSTART;VALUE=DATE:20270107'));
  assert.doesNotMatch(result, /Homer|Invalid Date/);
});
test('UIDs survive reordering and ordinary text edits; distinct same-day works are retained', () => {
  const uid = content => [...content.matchAll(/^UID:(.+)$/gm)].map(match => match[1]).sort();
  const original = calendars.calendar(schedule, 'Sophia No. 193', at);
  const changed = schedule.slice().reverse().map(row => row[1] === 'Sophia No. 193' ? [row[0], row[1], 'Πειραιάς', row[3], 'Annual Meeting'] : row);
  assert.deepEqual(uid(original), uid(calendars.calendar(changed, 'Sophia No. 193', at)));
  const sameDay = [['','Sophia No. 193','Piraeus','2027-01-07','Meeting'],['','Sophia No. 193','Piraeus','2027-01-07','Installation']];
  const identifiers = uid(calendars.calendar(sameDay, 'Sophia No. 193', at));
  assert.equal(new Set(identifiers).size, 2);
});
test('rescheduled and deleted dates are replaced and empty subscriptions remain valid', () => {
  const old = [['','Sophia No. 193','Piraeus','2027-01-07','Installation']];
  const moved = [['','Sophia No. 193','Piraeus','2027-01-14','Installation']];
  const updated = calendars.calendar(moved, 'Sophia No. 193', at);
  assert.ok(updated.includes('DTSTART;VALUE=DATE:20270114'));
  assert.doesNotMatch(updated, /20270107/);
  const empty = calendars.buildFeeds([], at, old).find(feed => feed.path === 'calendars/court-193.ics');
  assert.equal(events(empty.content).length, 0);
  assert.ok(empty.content.endsWith('END:VCALENDAR\r\n'));
  const custom = [['','New Court No. 999','Patras','2027-01-01','Meeting']];
  assert.equal(events(calendars.buildFeeds([], at, custom).find(feed => feed.path === 'calendars/court-999.ics').content).length, 0);
});
test('Greek text is escaped and folded on UTF-8 boundaries without calendar injection', () => {
  const city = 'Πειραιάς, Ελλάδα; ' + 'Αθήνα '.repeat(25) + '\\new\r\nBEGIN:VEVENT';
  const content = calendars.calendar([['','Sophia No. 193',city,'2027-01-07','Installation']], 'Sophia No. 193', at);
  for (const line of content.split('\r\n')) assert.ok(Buffer.byteLength(line, 'utf8') <= 75);
  const unfolded = content.replace(/\r\n /g, '');
  assert.ok(unfolded.includes('LOCATION:' + calendars.escapeText(city)));
  assert.equal(events(content).length, 1);
  assert.doesNotMatch(content, /�/);
});
test('individual Google event links contain the selected Court, all-day dates, and city', () => {
  const row = ['', 'Sophia No. 193', 'Πειραιάς', '2027-01-07', 'Installation'];
  const link = new URL(calendars.googleEventUrl(row));
  assert.equal(link.origin, 'https://calendar.google.com');
  assert.equal(link.searchParams.get('text'), 'ATHELSTAN Court Sophia No. 193');
  assert.equal(link.searchParams.get('dates'), '20270107/20270108');
  assert.equal(link.searchParams.get('location'), 'Πειραιάς');
  assert.match(link.searchParams.get('details'), /Installation/);
  assert.ok(link.searchParams.get('details').includes('Website: https://moa-greece.gr/'));
});
test('Court subscription URLs are permanent public HTTPS links', () => {
  assert.equal(calendars.feedUrl('Sophia No. 193'), 'https://dskiad.github.io/ATHELSTAN-PROV-CALENDAR/calendars/court-193.ics');
  assert.equal(calendars.feedPath('Renamed Sophia No. 193'), calendars.feedPath('Sophia No. 193'));
  assert.notEqual(calendars.feedPath('Custom Court α'), calendars.feedPath('Custom Court β'));
});
