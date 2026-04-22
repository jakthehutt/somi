# Working Principles

## Iterative Progress
- Break every task into discrete, numbered steps before starting
- After each step: **write the file(s)**, then **commit** with a short headline + one-sentence reason
- On the next iteration: improve, extend, or fix — then commit again
- If the step produces code, **run it** to catch bugs before moving on
- Never batch multiple logical changes into a single commit — keep history granular and readable

### Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project
- Never mark a task complete without proving it works
- Ask yourself: "Would a staff engineer approve this?"

## Test-Driven Development

- Write tests **before** writing implementation code
- Red → Green → Refactor: fail first, make it pass, then clean it up
- Run the full test suite after every meaningful change
- If no test framework exists yet, set one up as the very first step
- A feature is not done until it has a passing test

## Use Repository Context
If current task indicates prior knowledge and context read this file `repostory-info.md` to fetch infor about goal, structure and context of the project.

## 4. Commit After Every Message

- Commit at minimum once per response — more often if multiple logical changes were made
- Commit message format: `<type>: <short headline> — <one sentence why>`
  - **type**: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`
  - Example: `feat: add KAN layer forward pass — needed to validate B-spline basis output`
- Include keywords: what changed, why it changed
- Never leave uncommitted work at the end of a response
