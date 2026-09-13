# Province of Greece Court Calendar

Responsive two-page calendar: `editor.html` for editing and `index.html` for the published view.

## Quick links

- **[OPEN THE EDITOR — edit and publish dates](https://dskiad.github.io/ATHELSTAN-PROV-CALENDAR/editor.html)**
- **[OPEN THE LIVE CALENDAR — public result with Court filter](https://dskiad.github.io/ATHELSTAN-PROV-CALENDAR/index.html)**
- [MOA Greece embedded calendar](https://moa-greece.gr/calendar/)

## How to publish changes

1. Open the editor using the link above.
2. Edit the programme. **Save draft** keeps a copy in this browser.
3. Click **Sign in & Publish to GitHub**. The editor saves your draft before opening GitHub.
4. When you return, wait for **Sign-in successful**, then click **Publish changes to GitHub**.
5. Follow the three messages under **Publication status**:
   - **GitHub sign-in:** confirms your account and shows the confirmation time.
   - **Save to the repository:** confirms GitHub accepted the programme and shows the save time.
   - **Live calendar:** checks the public calendar data every 10 seconds. It shows **Live calendar updated** only when the live dates match the programme you published, with the verification time.
6. Click **Open updated live calendar** when the third message turns green.

If GitHub refuses repository access, use **Sign out of editor**, then sign in with an account that can update this repository.

The editor stays open so you can see the result of publishing. If deployment cannot be confirmed within 10 minutes, use **Check live update again**; you do not need to publish the same programme again. Publication status resumes after a refresh in the same tab.

**Save draft alone does not publish to other visitors.** The public page uses the published `calendar-data.js` file. A fresh editor loads that published programme; an existing browser draft is preserved.

Sign-in credentials are removed from the returned page URL and retained for the current tab session. Never share sign-in credentials. Header-image uploads currently remain local to the editor; publishing saves the schedule.

## Check the publishing status logic

With Node.js installed, run:

```sh
node --test tests/editor-status.test.cjs
```

The tests simulate sign-in, successful saves, refused writes, duplicate clicks, delayed deployments, connection failures, and refresh recovery without publishing real calendar changes.
