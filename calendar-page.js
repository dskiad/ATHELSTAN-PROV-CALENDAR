(async () => {
  'use strict';
  const area = document.getElementById('months');
  const picker = document.getElementById('courtFilter');
  const panel = document.getElementById('courtSubscription');
  const help = document.getElementById('subscriptionHelp');
  const openHelp = document.getElementById('showGoogleCalendar');
  const link = document.getElementById('subscriptionUrl');
  const message = document.getElementById('subscriptionStatus');
  const events = document.getElementById('individualEvents');
  function textElement(tag, text, className = '') {
    const element = document.createElement(tag);
    element.textContent = text;
    element.className = className;
    return element;
  }
  try {
    const share = CourtCalendars;
    const response = await fetch('calendar-data.js?updated=' + Date.now(), { cache: 'no-store' });
    if (!response.ok) throw new Error('Calendar download failed');
    const schedule = share.parseSchedule(await response.text());
    share.courtList(schedule).forEach(court => picker.add(new Option(court[0] + ' — ' + court[1], court[0])));
    const dateOptions = { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' };
    function render() {
      area.replaceChildren();
      const visible = (picker.value ? share.selected(schedule, picker.value) : schedule.slice()).sort((a, b) => a[3].localeCompare(b[3]));
      const months = new Map();
      for (const row of visible) {
        const date = share.date(row[3]);
        const month = date.toLocaleDateString('en-GB', { timeZone: 'UTC', month: 'long', year: 'numeric' });
        let section = months.get(month);
        const first = !section;
        if (!section) { section = textElement('section', '', 'month'); section.dataset.month = month; area.append(section); months.set(month, section); }
        const court = share.courts.find(court => share.courtKey(court[0]) === share.courtKey(row[1]));
        const work = textElement('div', '', 'work' + (row[4] === 'Installation' ? ' installation' : ''));
        const flag = textElement('div', court ? court[3] : '', 'flag');
        flag.title = court ? court[2] : '';
        work.append(textElement('div', first ? month : '', 'monthLabel'), flag,
          textElement('div', row[1]), textElement('div', row[2], 'city'),
          textElement('div', date.toLocaleDateString('en-GB', dateOptions), 'date'),
          textElement('div', date.toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'long' }), 'day'),
          textElement('div', row[4], 'type'));
        section.append(work);
      }
      if (!visible.length) area.append(textElement('p', 'No dates are currently published for this Court.'));
      panel.hidden = !picker.value;
      help.hidden = true;
      openHelp.setAttribute('aria-expanded', 'false');
      message.textContent = '';
      events.replaceChildren();
      if (!picker.value) return;
      document.getElementById('subscriptionCourt').textContent = share.title(picker.value);
      document.getElementById('subscriptionCount').textContent = visible.length + (visible.length === 1 ? ' all-day event' : ' all-day events') + ' · Location: the city of each meeting';
      link.value = share.feedUrl(picker.value);
      for (const row of visible) {
        const item = document.createElement('li');
        const event = textElement('a', share.date(row[3]).toLocaleDateString('en-GB', dateOptions) + ' — ' + row[4] + ' ↗');
        event.href = share.googleEventUrl(row);
        event.target = '_blank';
        event.rel = 'noopener noreferrer';
        item.append(event);
        events.append(item);
      }
      document.getElementById('individualDates').hidden = !visible.length;
    }
    picker.addEventListener('change', render);
    openHelp.onclick = () => {
      help.hidden = !help.hidden;
      openHelp.setAttribute('aria-expanded', String(!help.hidden));
    };
    document.getElementById('copySubscription').onclick = async () => {
      const requested = link.value;
      try {
        await navigator.clipboard.writeText(requested);
        if (link.value === requested) message.textContent = 'Calendar link copied. Paste it into Google Calendar’s “From URL” field.';
      } catch {
        link.focus();
        link.select();
        message.textContent = 'Select and copy the calendar link above, then paste it into Google Calendar’s “From URL” field.';
      }
    };
    render();
  } catch {
    area.textContent = 'The published calendar could not be loaded. Please reload this page.';
    area.setAttribute('role', 'alert');
    picker.disabled = true;
    panel.hidden = true;
  }
})();
