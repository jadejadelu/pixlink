---
name: "session-summary-updater"
description: "Automatically updates the session summary document with recent work, user prompts, and timestamps. Invoke at the end of each coding session or when user reminds about session summary."
---

# Session Summary Updater

This skill helps automate the process of updating the session summary document with recent work, user prompts, and timestamps.

## When to Invoke

Invoke this skill when:
- At the end of each coding session
- When user reminds about session summary
- When significant work has been completed
- Before switching to a new task

## How It Works

1. **Collects information** about recent work:
   - User prompts and requests
   - Completed tasks and features
   - Technical details and decisions
   - Timeline of activities

2. **Updates session summary** document:
   - Adds new sections with timestamps
   - Includes user prompts verbatim
   - Summarizes technical work concisely
   - Maintains consistent formatting

3. **Verifies updates**:
   - Ensures document structure is maintained
   - Confirms all key information is included
   - Checks for proper formatting

## Performance Optimization

**Important**: To minimize token usage, when reading the session summary document:
- Only read the last 50-100 lines to find the most recent section number
- Use `grep` to find section headers (`^## \d+\.`) instead of reading the entire file
- Only read the specific sections needed for context (last 1-2 sections)
- Avoid reading the entire document unless absolutely necessary

## Usage Example

When user says:
"Don't forget the session summary"

Invoke this skill to:
1. Gather recent work details
2. Add a new section to `docs/会话摘要.md`
3. Include user's prompt
4. Summarize completed tasks
5. Update the document with proper formatting

## Output Format

The skill will update the session summary with sections formatted as:

```markdown
---

## X. [Summary Title]
- **用户提示词**："[User's exact prompt]"
- **时间**：YYYY-MM-DD
- **内容**：
  - [Concise summary of work completed]
  - [Technical details]
  - [Key decisions]
- **产出物**：
  - [List of deliverables]
- **后续计划**：
  - [Next steps]
```

## Benefits

- **Automated** - Reduces manual effort
- **Consistent** - Maintains uniform formatting
- **Complete** - Ensures all key information is included
- **Timely** - Updates are done at the right moments
- **Accurate** - Includes user prompts verbatim

This skill helps ensure that session summaries are always up-to-date and comprehensive, addressing the user's concern about forgetting to update the document.