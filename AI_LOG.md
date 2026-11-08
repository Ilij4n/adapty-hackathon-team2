# AI log: Case Desk (Team 2)

## Tools and what we used them for

- **Claude Code (Claude Opus), run as "Bagley"**, Mateja's agent fleet. It acted as the orchestrator. It wrote the
  architecture contract, split the work into modules, ran parallel builder agents and reviewed and merged their
  branches. It also ran the evals and made the demo video and slides.
- **Claude Code, as Ilijan's design orchestrator.** It ran overnight and produced four console and help-screen design
  directions, the "Night Shift" fixes and the chat-sync options (v5 bubbles and v6 strips), with a screenshot harness.
- **Claude and Codex sessions (Andrija).** These were independent voters in the idea debate and checked the research.
- **Claude inside the product.** It reads each message and finds the intent (Haiku), then writes the reply (Sonnet),
  through the headless `claude` CLI. Code decides every fact and action; Claude only phrases the reply.

## Setup

- **One written contract first.** `ARCH.md` holds the module boundaries and the data shapes. Four builder agents
  then worked in parallel, one each on the Adapty client, the engine, the AI layer and the app. Each owned its files
  and its tests. The lead merged their work, and nobody committed to someone else's module.
- **Agents with narrow briefs.** Every agent prompt said what it owns, what it must not touch, how to verify the
  result, a time limit, and "don't use subagents, don't commit, report what you did and didn't do".
- **Branches and worktrees.** On Sunday up to six agents worked at once, on reply fixes, the demo clock, MCP, owner
  rules, UI review fixes, the reply box and README art. Each had its own git worktree and branch, and the lead merged them one
  at a time with the full test suite and the UI end-to-end run after each merge.
- **Evals as the safety net.**
  - 730 automated tests.
  - A UI end-to-end test in Playwright.
  - A run over all 5,000 seeded users and every intent (63,296 runs).
  - A live eval with real Claude: 116 tickets in 12 languages, including 16 prompt-injection attempts and wrong
    claims made by users.
- **MCP, two ways.** We built an MCP server, so you can run your support desk from Claude. We tested it with real
  Claude Code: "what's waiting for my OK?", then "approve Ava's grant". We also read Adapty's CLI and skills (and the
  organisers' seed repo) to learn the account before building.
- **Red-team and review agents.** Three bug-bash agents found and fixed 37 issues. Three persona reviewers (a founder,
  a product designer, a head of support at scale) reviewed the console. One agent ran the closest competitor's
  project in a sandbox and compared it with ours on the same model and the same scenarios.

## Prompts that worked well

1. **Builder brief.** "You own only `casedesk/engine/`. The contract is `ARCH.md`. Code owns every fact; the LLM
   only phrases. Write tests for each rule, keep the whole suite green, don't commit, and end with a list of what's
   done and what isn't."
2. **Persona review.** "You are a solo indie founder who handles support at night and is opening this console for
   the first time. Run your own copy, click everything, then list each moment you hesitated and your top 10 fixes,
   ranked by impact, with screenshots."
3. **Fair comparison.** "Run their project in a throwaway container with no secrets. Send its LLM calls through the
   same model as ours, through a shim on our side. Run the same seven scenarios through both, record the replies
   word for word, and say honestly where they're ahead."

## One thing the AI got wrong, and how we caught it

- **A wrong eval number.** The first "raw Claude without guardrails" run reported 50 of 71 replies with unsupported
  numbers. A human read of the failures showed most of them were numbered list steps ("1. Open Settings"). The real
  figure was 17 of 71 replies with any genuine slip, so we published that number with the explanation
  (`eval/RESULTS.md`).
- **Facts the agents invented for the video.** One headline was a forum thread title that no source contains. We
  caught these by checking every on-screen string against the sources and replaced them before publishing.

## What we'd never delegate to AI

- **Giving away money.** A courtesy grant needs the developer's click or a rule the developer chose, and code checks
  it again at approval time. Privacy requests and attacks always go to a person.
- **Merging to main and deploying.** A human (the lead) reads the diff and runs the tests first.
- **Claims in the pitch.** Every number on a slide or in the video comes from a source or our own eval output.
