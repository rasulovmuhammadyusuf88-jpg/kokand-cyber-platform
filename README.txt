KOKAND CYBER CAMPUS - AI COMMAND CENTER PATCH

Included:
- server.js: Admin AI command/image endpoints + execute/confirm flow + audit logs.
- AdminPanel.jsx: AI Command Center tab added.
- AdminAICenter.jsx: command input, schedule image upload, preview/edit/confirm UI.
- AdminAICenter.css: UI styles.

The backend uses the existing OPENAI_API_KEY in .env. No API key is included here.

After replacing the corresponding project files:
1) Stop backend and run: node server.js
2) Run frontend: npm.cmd run dev
3) Login as ADMIN and open Admin Panel -> AI Command Center.

Supported AI actions:
CREATE_TASK
UPDATE_TASK_DEADLINE
CREATE_SCHEDULE_BULK
UPDATE_SCHEDULE
CREATE_ANNOUNCEMENT

AI never writes to DB until the admin confirms the proposal. Confirmed actions are added to audit_logs.
