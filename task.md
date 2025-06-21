# Feature: Gmail Integration for Auto To-Do Creation

## Objective
Enable users to connect their Gmail account and automatically generate to-do list items based on recent emails.

---

## User Flow

1. **Click Gmail Button**
   - User clicks the "Gmail" button on the interface.

2. **OAuth Authentication**
   - App initiates OAuth flow to authenticate and request read access to the user's Gmail inbox.

3. **Email Fetching**
   - After successful authentication, app fetches emails from the user's **primary inbox** for the **past 3 days**.

4. **To-Do Generation**
   - For each fetched email, app creates a new to-do item with the following format:
     - **Description**: `Reply email sender`
     - **Source**: `Gmail`
     - **Due Date**: `Tomorrow`

---

## Technical Tasks

- [ ] Implement Gmail OAuth2 flow
- [ ] Fetch emails from `Primary` inbox using Gmail API (past 3 days)
- [ ] Parse sender info from each email
- [ ] Generate to-do list items from parsed data
- [ ] Save generated tasks to user’s task list

---

## Data Structure: To-Do Item

```ts
interface TodoItem {
  id: string;
  description: string; // e.g. "Reply email sender"
  source: 'Gmail';
  dueDate: Date; // default to tomorrow
}