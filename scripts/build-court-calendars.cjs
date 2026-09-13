#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const calendars = require('../calendar-subscriptions.js');
const root = path.resolve(__dirname, '..');
const schedule = calendars.parseSchedule(fs.readFileSync(path.join(root, 'calendar-data.js'), 'utf8'));
const modifiedAt = fs.statSync(path.join(root, 'calendar-data.js')).mtime.toISOString();
const directory = path.join(root, 'calendars');
fs.mkdirSync(directory, { recursive: true });
const feeds = calendars.buildFeeds(schedule, modifiedAt);
const paths = new Set(feeds.map(feed => path.basename(feed.path)));
for (const name of fs.readdirSync(directory)) {
  if (/^court-[a-z0-9-]+\.ics$/.test(name) && !paths.has(name)) {
    // Direct repository edits can also remove custom Courts. Retain an empty feed.
    const old = fs.readFileSync(path.join(directory, name), 'utf8');
    fs.writeFileSync(path.join(directory, name), old.replace(/BEGIN:VEVENT\r?\n[\s\S]*?END:VEVENT\r?\n/g, ''));
  }
}
for (const feed of feeds) fs.writeFileSync(path.join(root, feed.path), feed.content);
console.log(`Built ${feeds.length} Court subscriptions from ${schedule.length} published dates.`);
