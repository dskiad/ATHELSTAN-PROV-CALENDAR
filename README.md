# Province of Greece Court Calendar

Responsive two-page calendar: `editor.html` for editing and `index.html` for the published view.

## Quick links

- **[OPEN THE EDITOR — edit and publish dates](https://dskiad.github.io/ATHELSTAN-PROV-CALENDAR/editor.html)**
- **[OPEN THE LIVE CALENDAR — public result with Court filter](https://dskiad.github.io/ATHELSTAN-PROV-CALENDAR/index.html)**
- [MOA Greece embedded calendar](https://moa-greece.gr/calendar/)

## Add a Court to Google Calendar

1. On the live calendar, select a Court in the filter and click **Google Calendar**.
2. Click **Copy calendar link**.
3. On a computer, open Google Calendar and choose the Google account that should receive the Court dates.
4. Beside **Other calendars**, select **+ → From URL**, paste the link, and click **Add calendar**.

The Court appears as a subscribed calendar in that account. Enable it in Google Calendar on your phone or tablet if needed. Each work is an all-day event titled **ATHELSTAN Court Sophia No. 193**, for example, with **Piraeus** as its location. The meeting type, language, and website **https://moa-greece.gr/** appear in the description. Subscription events also use this website in their URL field.

The editor refreshes the Court subscription files whenever you publish changes. Google decides when to fetch updated subscriptions; updates are not immediate. A subscription is read-only and does not give this website access to the visitor's Gmail or private calendar. Visitors can unsubscribe in Google Calendar.

The panel also offers **Add individual dates on this device**. These links open a ready-filled Google event that the visitor explicitly saves. These one-time copies do **not** receive later programme changes.

Google's instructions: [Subscribe using a public calendar URL](https://support.google.com/calendar/answer/37100).

## Connect GitHub

The editor publishes directly from your browser to GitHub's REST API. It uses a repository-limited personal access token.

1. Open the editor and click **Connect GitHub**.
2. Click **Create a GitHub token** in the connection panel. The link pre-fills the token name, owner, expiration and Contents permission.
3. Sign in as **dskiad**. Under **Repository access**, choose **Only select repositories**, then **ATHELSTAN-PROV-CALENDAR**.
4. Confirm **Contents: Read and write** under repository permissions, then click **Generate token**.
5. Copy the token into the editor's **GitHub access token** field and click **Connect securely**.

Treat the token like a password and enter it only in the editor. The editor sends it directly to GitHub and retains a verified token in the current tab's session until you disconnect or close that tab. Use **Disconnect GitHub** to clear it. After expiration or revocation, connect with a valid token again.

## Publish changes

1. Edit the programme. **Save draft** keeps a copy in your browser.
2. Click **Publish changes to GitHub**.
3. Follow the three messages under **Publication status**:
   - **GitHub connection:** confirms your account.
   - **Save to the repository:** saves changed Court subscription files, then confirms the programme commit and displays the save time.
   - **Live calendar:** checks the published programme and subscription files every 10 seconds. **Live calendar updated** appears only when they match the saved files, with the verification time. This confirms GitHub Pages deployment; Google may refresh subscribed calendars later.
4. Click **Open updated live calendar** when the third message turns green.

The editor stays open during publication. If deployment is not confirmed within 10 minutes, click **Check live update again**. You do not need to publish the same programme again. The last publication check resumes after a refresh in the same tab.

If GitHub refuses a save, check the token's selected repository and **Contents: Read and write** permission. If the token is expired or revoked, reconnect.

Publishing uses sequential Contents API commits. If a later save fails after some subscription files were saved, the editor reports the partial save. Keep the draft and retry to complete all files. Unchanged subscription files retain their previous timestamps and are not committed again.

**Save draft alone does not publish to other visitors.** The public page uses `calendar-data.js` from GitHub Pages. A fresh editor loads that programme; existing browser drafts are preserved.

Header-image uploads currently remain local to the editor; publishing saves the schedule and its Court subscriptions.

## Editing the repository directly

`calendar-data.js` remains the programme source. If you edit it directly instead of using the editor, regenerate the subscription files before committing:

```sh
node scripts/build-court-calendars.cjs
```

Commit both `calendar-data.js` and the generated `calendars/*.ics` files. Each Court's permanent feed URL uses its number, for example `calendars/court-193.ics`. Empty feeds remain available when a Court has no published dates. All-day dates use an exclusive next-day end; event identifiers remain stable for the same Court and date.

## Check the publishing logic

With Node.js installed, run:

```sh
node --test tests/*.test.cjs
```

The tests cover filtered Court subscriptions, all-day dates, leap days, escaped Greek text, rescheduled and deleted dates, direct connection and publishing, UTF-8 preservation, partial saves, conflicts, duplicate clicks, delayed deployments, and refresh recovery. They do not publish real changes.
