Objective
	•	Build a SaaS tool for users to manage everyday to-do lists.
	•	Support manual task creation and importing tasks from Gmail, Slack, and Zoom.

Basic Features
	•	Allow users to create to-do items
	•	Assign a priority (low, medium, high, urgent) to each task
	•	Assign each task to a project
	•	Allow users to set an action/due date
	•	Save tasks in real-time as the user types

Advanced Features

Gmail Integration
	•	Authenticate with Google OAuth
	•	Fetch user’s recent Gmail messages
	•	Parse emails into task format (subject + sender)
	•	Let users select which emails to convert into tasks

Slack Integration
	•	Connect to user’s Slack account (placeholder for future release)
	•	Read relevant messages from selected channels or DMs
	•	Generate tasks based on message content

Zoom Integration
	•	Support importing tasks from meeting transcripts (future)

Reference UI/UX
	•	Follow design patterns from Asana or Notion
	•	Refer to internal screenshots for layout guidance

Style

Element	Style
Aesthetic	Clean, flat, minimalist
Typography	Clear hierarchy, modern sans-serif
Color	Neutral with subtle accents
Animation	Subtle and smooth
Layout	Block-based, modular
UX Focus	Calm, focused workflows, minimal distraction

Tech Stack (Frontend)
	•	React
	•	TypeScript
	•	Tailwind CSS
	•	Firebase (for authentication and real-time database)

Platform
	•	Web and Mobile

Tasks
	•	Set up project structure with React, Vite, and Tailwind CSS
	•	Build core to-do list UI with editable text fields
	•	Enable assigning priority, project, and due date to each task
	•	Integrate Firebase for storing tasks and real-time syncing
	•	Add “Add Project” and “Add Subtask” buttons
	•	Implement drag-and-drop reordering using react-beautiful-dnd
	•	Enable Google OAuth login using @react-oauth/google
	•	Connect to Gmail API and fetch recent messages
	•	Parse Gmail messages into task format (e.g. “Reply John about project X”)
	•	Display Gmail messages and allow user to select which to import
	•	Create reusable modals for task and project detail views
	•	Implement dark mode toggle for the app
	•	Ensure mobile responsiveness and clean layout across devices