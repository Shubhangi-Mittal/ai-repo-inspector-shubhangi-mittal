# Submission

## What did you investigate first, and why?
My first nudge was to read through the README, SECURITY.md and SUBMISSION.md before touching any code. This was mainly so that I could have a brief idea of what the project encompasses and what are the project deliverables. After I had a brief idea I actually ran it: npm install, typecheck, test, and the CLI against this repo itself, so I had a real baseline of what worked and what didn't before forming opinions.

## What did you choose to implement or fix?
After installing all dependencies and running the code I was able to narrow down on six bugs and claude helped me verify each bug by reproducing it live against scratch git repos rather than just reading the code and assuming.
  1. The MCP tool was set up to accept repo_path, but the code actually looking for the value checked repoPath instead, so it never got the right one. It didn't crash, it just quietly reviewed the wrong folder and handed back a report that looked fine but wasn't.
  2. The tool always assumed the base branch was called "main." If a repo's main branch was actually called something else, like "master," the whole thing crashed right away.
  3. If a validation command failed, like a test that didn't pass, the whole tool crashed instead of just reporting that it failed.
  4. New files that hadn't been added to git yet never showed up in the report, even though the code was clearly built to support that.
  5. If your repo's file path had a space in it, the tool would quietly cut the path short and break.
  6. Asking for JSON output didn't actually do anything, you'd still get markdown back either way.

## What did you intentionally not do?
I didn't fix the fact that the tool can't see uncommitted changes to files that are already tracked (staged but not committed, or unstaged edits). I only fixed the untracked file gap, because that one had a clear signal in the type system that it was supposed to work. Uncommitted tracked edits would mean deciding what "a change" is supposed to mean for this tool, which felt like a bigger design call than I had room for.

I didn't add format support to the MCP server. The MCP schema never promised a format parameter in the first place, so it wasn't a broken promise the way the CLI one was, and I wanted that to be a deliberate decision tied to the interface question rather than something I added on the side.

## Interface decision

- Decision: CLI-first, with MCP treated as a secondary, more constrained interface rather than a fully symmetric hybrid.

- Primary user and execution environment: a developer running this locally or in CI against a repo they already have shell access to, and           secondarily an AI coding agent calling the MCP tool.

- Trust boundary and allowed capabilities: Both the CLI and the MCP tool let you pass in a command to run, like npm test, and the tool just runs it for you. If I'm the one typing that command into my own terminal, that's not really giving it any new power, I could already run anything I want on my own machine anyway. But with MCP, it's an AI agent deciding what command to run, not me directly. That command could even be something the agent picked up from reading a file inside the repo it's reviewing, and nobody's checking what that command actually says before it gets run. So the same feature feels a lot safer when a person types it themselves than when an AI is the one choosing it.

- Reliability, discoverability, latency/context, and output tradeoffs:   The worst bug I found this whole time was only in the MCP version, and it didn't even crash, it just quietly gave back the wrong answer, like it reviewed the wrong folder and still handed back a report that looked totally normal. The bugs I found in the CLI were the opposite, they crashed loudly with an error message right there in the terminal, so I would have noticed right away. Discoverability is different too, the CLI tells you exactly how to use it if you get it wrong, but MCP only has its schema and description to go on, which is actually how the repo_path bug slipped through in the first place. Output size matters more for MCP as well, since the report gets dumped straight into whatever the agent is working with, while the CLI just writes it to a file you open if you want to. That's basically why I'm leaning toward CLI first, a person has more of a chance to actually catch something going wrong than an AI agent does.

- How supported interfaces remain consistent: Both the CLI and MCP call the exact same function behind the scenes (reviewRepository in core.ts), so most of the time if I fix something once, it's fixed in both places automatically. But two of the six bugs weren't like that. One only existed in how the CLI reads its command line arguments, and the other only existed in the MCP tool's setup. So even though most of the code is shared, I can't just fix the shared part and assume both interfaces are safe. I still have to check each one on its own.

- Evidence that would change this decision:  If it turned out someone was already using the MCP version to let an AI agent run this tool completely on its own with no person checking in, that would change my mind. In that case it would be worth spending a lot more time making the MCP side just as careful and strict as the CLI side, instead of treating it as the less important option.

## How did you use an AI coding agent?
I used Claude Code the whole time I worked on this. First I had it read through every file in the repo and tell me what it found, before changing anything. After that, instead of just trusting what it said about the code, I had it actually run the tool on small test repos it made up on the spot, so I could watch the bugs happen for real instead of just taking its word for it. For every bug we found, we went one at a time. It would explain what was wrong in plain words, suggest a fix, and I made it explain why that fix made more sense than other ways of fixing it before I let it change anything. After every fix it ran the same broken scenario again to prove it was actually fixed, and it wrote all of that reasoning down in a separate file called DECISIONS.md so I'd have it to look back on.

## Where did you check, correct, or reject an AI suggestion? (required)
  - When it suggested a fix for the bug where paths with spaces got cut off, I didn't just take its word that the fix was right. I asked it to explain why this fix was better than other ways it could have solved it, which made it actually walk through the other options it had already ruled out instead of just telling me it was correct.
  - At one point it tried to undo some changes to package-lock.json on its own without asking me first. I stopped that and made it explain what was actually different in that file before I let it touch it, and I only agreed once I understood it was just leftover noise from installing packages, nothing important.
  - It wrote a commit message that credited itself as a co-author and listed out all six bugs in the commit description. I told it to remove the AI credit line and keep the commit message short, since I wanted the detailed explanations to live in my own notes file, not permanently in the commit history.
  - While setting up my own copy of the repo, the git history didn't match up, and it suggested force pushing as the quickest way to fix it. I chose to merge the two histories together instead so nothing got deleted, even though that took a couple extra steps.
  - I specifically told it not to add my DECISIONS.md file to any commit, since that file was just for me to keep track of things, not something meant to be submitted.

## Commands used to verify the result, with outcomes
- npm install: worked fine, just a couple of harmless version warnings, nothing that actually mattered.
- npm run typecheck: passed clean, and I kept rerunning it after every single fix just to make sure I wasn't quietly breaking something else along the way.
- npm test: this one failed, but not because of anything I did, it was some unrelated setup issue on my end (more on that in the blocker section below).
- Running the tool itself with different flags (--validate, --base-ref, --format json, etc): did this over and over, both on this repo and on a few small test repos I made up on the spot, so I could actually watch each bug happen for myself instead of just assuming it was fixed from reading the code.
- A quick throwaway script calling the MCP tool directly, basically the same way an AI agent would use it, just to prove the repo_path bug was real and then double check my fix actually solved it.

## A blocker you hit and how you approached it
Running npm test kept failing on my machine with an error about a missing native binding, coming from a package called rolldown that vitest depends on. After looking into it, this turned out to be a known bug with how npm installs certain packages on some machines, not something wrong with the actual code, and not something worth spending my limited time trying to fix. So instead of relying on the test suite, I checked that each fix worked by actually running the CLI and MCP tool myself against small test repos I set up, and comparing what happened before and after each fix. That honestly gave me more confidence than the one existing test would have anyway.

## Known limitations and the next three things you would do
  Some things I know are still not great: the tool still lets validation commands run through the shell with basically no limits on what gets run It also can't see changes to files that are already tracked by git but haven't been committed yet, it only catches brand new files and things that are already committed. If someone passed in a base ref that starts with a dash, it could accidentally get read as a command flag instead of a branch name. And none of the six things I fixed have real automated tests yet, I only checked them by running things by hand.

  If I had more time, here's what I'd do next:
  1. Write actual automated tests for the six fixes, once I get the test runner working again.
  2. If we decide MCP should be treated as seriously as the CLI and not just as the backup option, put some real limits on what commands it's allowed to run, instead of letting it run anything the same way the CLI does.
  3. Figure out what this tool is actually supposed to mean by "a change." Right now it only looks at commits and brand new files, and I'd want to decide if it should also catch edits to files that are already tracked but not committed yet.

## Approximate focused-work time

- Start: 12:40 PM PST
- Finish: 13:55 PM PST