# Agent Orchestration Landscape — February 2026

> Research memo on open-source agent orchestration projects, their architectures, limitations, and key differentiators.

---

## TL;DR

The agent orchestration space has split into **four distinct tiers**: (1) heavyweight Python frameworks for general-purpose multi-agent systems, (2) Claude Code-specific orchestration plugins/wrappers, (3) agent-agnostic workflow frameworks that work across multiple coding CLIs, and (4) lightweight "zero-overhead" approaches that use filesystem + tmux instead of API calls for coordination. The most interesting tension in the space is **coordination cost vs. capability** — every token spent on agent-to-agent communication is a token not spent on actual work.

---

## Table 1: Heavyweight Multi-Agent Frameworks (Agent-Agnostic)

These are general-purpose frameworks for building multi-agent systems. They aren't specific to any coding CLI — they're SDKs for building your own agent pipelines.

| Project                                                                       | ⭐ Stars | Language      | Architecture                                                                                | LLM Support                           | Key Differentiator                                                                         | Limitations                                                                                       |
| ----------------------------------------------------------------------------- | -------- | ------------- | ------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| **[AutoGPT](https://github.com/Significant-Gravitas/AutoGPT)**                | 181k     | Python        | Autonomous loop with plugin system                                                          | Multi-provider                        | OG autonomous agent; massive ecosystem                                                     | Drift-prone, hard to control, original design showing age                                         |
| **[MetaGPT](https://github.com/geekan/MetaGPT)**                              | 64k      | Python        | Software company simulation (PM→Architect→Engineer roles)                                   | Multi-provider                        | First "AI software company" metaphor; SOP-driven                                           | Python only; opinionated about role structure                                                     |
| **[CrewAI](https://github.com/crewAIInc/crewAI)**                             | 44k      | Python        | Role-based agent crews with task delegation                                                 | Multi-provider                        | Intuitive role/goal/backstory agent definition; large community                            | Python only; CrewAI platform push; coordination overhead                                          |
| **[AutoGen / AG2](https://github.com/microsoft/autogen)**                     | 54k      | Python        | Conversational agents with group chat                                                       | Multi-provider                        | Microsoft-backed; strong research lineage; conversation-driven                             | Complex API; AG2 fork split the community                                                         |
| **[Swarms](https://github.com/kyegomez/swarms)** ¹                            | 5.7k     | Python        | 10+ swarm architectures (Sequential, Concurrent, DAG, MoA, GroupChat, Forest, Hierarchical) | Multi-provider + MCP                  | Most architecture variety; SwarmRouter meta-orchestrator; marketplace                      | Python only; enterprise marketing outpaces maturity; many architectures but shallow depth on each |
| **[LangGraph](https://github.com/langchain-ai/langgraph)**                    | 24k      | Python        | Stateful graph-based agent workflows (cycles, branching, persistence)                       | Multi-provider via LangChain          | Production-grade state machines; checkpointing; human-in-the-loop                          | LangChain ecosystem lock-in; Python only; infra-heavy (Postgres/Redis for persistence)            |
| **[OpenAI Agents SDK](https://github.com/openai/openai-agents-python)**       | 18k      | Python        | Lightweight agents + handoffs (successor to Swarm)                                          | OpenAI primarily                      | Official OpenAI; minimal abstractions; production-ready replacement for experimental Swarm | OpenAI-centric; limited multi-provider story                                                      |
| **[Microsoft Agent Framework](https://github.com/microsoft/agent-framework)** | 7.1k     | Python + .NET | Graph-based workflows with streaming, checkpointing, time-travel                            | Multi-provider                        | Dual Python/.NET support; DevUI for debugging; successor to Semantic Kernel agents         | New (migrating from SK/AutoGen); complex; Microsoft ecosystem pull                                |
| **[smolagents](https://github.com/huggingface/smolagents)**                   | 25k      | Python        | Code-writing agents (agents think in Python code, not JSON tool calls)                      | Multi-provider via HF                 | Agents write code instead of JSON tool calls; minimal; HuggingFace-backed                  | Python only; less mature orchestration; single-agent focused                                      |
| **[PydanticAI](https://github.com/pydantic/pydantic-ai)**                     | 14k      | Python        | Type-safe agent framework with structured outputs                                           | Multi-provider                        | Pydantic-native; excellent type safety; clean API                                          | Python only; more single-agent than multi-agent; younger                                          |
| **[CAMEL](https://github.com/camel-ai/camel)**                                | 16k      | Python        | Role-playing communicative agents                                                           | Multi-provider                        | Research-first; scaling law of agents; earliest multi-agent framework                      | Academic; less production-focused                                                                 |
| **[Agency Swarm](https://github.com/VRSEN/agency-swarm)**                     | 3.9k     | Python        | Real-world org structure (CEO/VA/Dev roles) with directional communication flows            | OpenAI primarily (LiteLLM for others) | Intuitive org-chart metaphor; built on OpenAI Agents SDK                                   | OpenAI-centric; Python 3.12+; smaller community                                                   |
| **[Google ADK](https://github.com/google/adk-python)**                        | 17k      | Python        | Code-first agent toolkit with eval framework                                                | Google/Gemini primarily               | Google-backed; strong eval/testing story; production deploy tooling                        | Google ecosystem; Python only; newer                                                              |
| **[Letta](https://github.com/letta-ai/letta)**                                | 21k      | Python        | Stateful agents with advanced memory (self-improving over time)                             | Multi-provider                        | Memory-first architecture; agents learn and persist across sessions                        | Python only; memory model complexity                                                              |
| **[Dify](https://github.com/langgenius/dify)**                                | 129k     | TypeScript    | Visual workflow builder + backend agent runtime                                             | Multi-provider                        | No-code/low-code visual agent builder; self-hostable; massive adoption                     | Platform, not a library; heavier than most                                                        |

¹ _You provided this as an example_

---

## Table 2: Claude Code-Specific Orchestrators

These are built specifically to extend Claude Code with multi-agent orchestration, typically via hooks, skills/plugins, MCP servers, or the Claude Code SDK.

| Project                                                                                               | ⭐ Stars | Language      | Architecture                                                                      | Multi-Agent?                                                  | Key Differentiator                                                                                                            | Limitations                                                                                                |
| ----------------------------------------------------------------------------------------------------- | -------- | ------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **[claude-flow](https://github.com/ruvnet/claude-flow)** ¹                                            | 14k      | TypeScript    | Swarm orchestration with queen/worker hierarchy, MCP server, consensus algorithms | Yes — 60+ agent types, swarm topologies (mesh/hier/ring/star) | Most feature-rich Claude orchestrator; self-learning router; WASM agent booster for simple edits; RuVector intelligence layer | Claude Code specific; enormous feature surface — hard to tell what's real vs. aspirational; TypeScript/npm |
| **[oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode)**                               | 5.9k     | TypeScript    | Team-based pipeline (plan→PRD→exec→verify→fix loop)                               | Yes — Team mode with configurable executor count              | Zero learning curve; plugin-based install; uses Claude Code native teams feature                                              | Claude Code only; depends on experimental `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` flag                      |
| **[wshobson/agents](https://github.com/wshobson/agents)**                                             | 28k      | N/A (plugins) | 73 focused plugins with 112 agents, 146 skills, 16 workflow orchestrators         | Yes — 16 multi-agent workflows                                | Largest Claude Code plugin marketplace; granular install (minimal token waste); 79 dev tools                                  | Claude Code only; plugin-based (not a standalone framework); token-budget aware                            |
| **[cexll/myclaude](https://github.com/cexll/myclaude)**                                               | 2.2k     | Go            | Multi-backend execution (Codex/Claude/Gemini/OpenCode) with modular skill system  | Yes — multiple orchestration modules (do, omo, bmad, sparv)   | **Cross-CLI backend execution** — routes work to Codex, Gemini, or OpenCode from Claude; modular skill install                | Young; AGPL license; multiple overlapping modules                                                          |
| **[Claude Code SDK (Python)](https://github.com/anthropics/claude-code-sdk-python)**                  | 4.7k     | Python        | SDK for programmatically spawning Claude Code subprocesses                        | Building block — you build multi-agent on top                 | Official Anthropic SDK; programmatic control of Claude Code                                                                   | Python only; low-level building block, not an orchestrator itself                                          |
| **[disler/claude-code-hooks](https://github.com/disler/claude-code-hooks-multi-agent-observability)** | 1k       | Python        | Hook-based event monitoring for Claude Code agents                                | Observability layer (not orchestration)                       | Real-time monitoring of multi-agent sessions via hooks                                                                        | Monitoring only; Python                                                                                    |

¹ _You provided this as an example_

---

## Table 3: Agent-Agnostic / Cross-CLI Orchestrators

These work with multiple coding agents (Claude Code, Codex, Copilot, Gemini CLI, etc.) rather than being locked to one.

| Project                                                                                          | ⭐ Stars | Language   | Architecture                                                                      | Supported CLIs                                                                                     | Key Differentiator                                                                                                       | Limitations                                                                   |
| ------------------------------------------------------------------------------------------------ | -------- | ---------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| **[SwissArmyHammer](https://github.com/swissarmyhammer/swissarmyhammer)** ¹                      | 12       | Rust       | MCP server + markdown-driven state machine workflows                              | Any MCP client (Claude Code, etc.)                                                                 | Spec-driven autonomous execution; markdown-for-everything; Liquid templating; file-based (no DB/cloud)                   | Very new; small community; Rust (cargo install); MCP-dependent                |
| **[multi-agent-shogun](https://github.com/yohey-w/multi-agent-shogun)**                          | 832      | Shell/Bash | Feudal hierarchy via tmux panes + YAML coordination files                         | Claude Code, Codex, GitHub Copilot, Kimi Code                                                      | **Zero coordination overhead** — agents communicate via YAML files on disk; 8 parallel agents in tmux; fully transparent | Shell scripts only; tmux-dependent; manual setup; no structured state machine |
| **[APM (Agentic Project Management)](https://github.com/sdi2200262/agentic-project-management)** | 2k       | JavaScript | Specialized agent roles (PM, devs, specialists) with context retention techniques | Cursor, Claude Code, Copilot, Windsurf, Roo, Kilo, Qwen, opencode, Gemini CLI, Auggie, Antigravity | **Widest CLI support** (11 assistants); context window management focus; smooth session transitions                      | Framework for project management, not raw orchestration; npm-based            |
| **[Composio](https://github.com/composiodev/composio)**                                          | 26k      | TypeScript | Tool/integration layer providing 100+ integrations via function calling           | Any LLM agent framework                                                                            | Agent-agnostic tool provider; works with CrewAI, LangGraph, AutoGen, etc.                                                | Integration layer, not an orchestrator; TypeScript/Python                     |
| **[Agent Protocol](https://github.com/AI-Engineer-Foundation/agent-protocol)**                   | 1.4k     | Python     | Standardized REST API interface for interacting with any AI agent                 | Any agent implementing the protocol                                                                | Tech-stack agnostic interop standard                                                                                     | Protocol spec, not an implementation; adoption still limited                  |
| **[n8n](https://github.com/n8n-io/n8n)**                                                         | 174k     | TypeScript | Visual workflow automation with native AI agent nodes                             | Any via HTTP/API                                                                                   | Massive workflow library; self-hostable; visual builder; enterprise-proven                                               | General automation tool (not agent-specific); complex for simple use cases    |
| **[e2b](https://github.com/e2b-dev/e2b)**                                                        | 10k      | TypeScript | Secure sandboxed environments for agent code execution                            | Any agent framework                                                                                | Sandboxed execution (security-first); cloud-hosted; real filesystem/network                                              | Execution environment, not orchestration; cloud-dependent                     |

¹ _You provided this as an example_

---

## Table 4: Coding Agents (Not Orchestrators, but Relevant Context)

These are the actual coding agents that the orchestrators above coordinate. Worth knowing the landscape.

| Project                                                       | ⭐ Stars | Language   | Model          | Multi-Agent Built-in?                                      | Notes                                                 |
| ------------------------------------------------------------- | -------- | ---------- | -------------- | ---------------------------------------------------------- | ----------------------------------------------------- |
| **[Claude Code](https://github.com/anthropics/claude-code)**  | 66k      | Shell      | Claude         | Yes — native `Task` tool for subagents; experimental Teams | The 800lb gorilla; hooks system enables extensibility |
| **[OpenAI Codex](https://github.com/openai/codex)**           | 60k      | Rust       | GPT            | Limited                                                    | Terminal-based; newer entrant; growing fast           |
| **[Gemini CLI](https://github.com/google-gemini/gemini-cli)** | 94k      | TypeScript | Gemini         | Limited                                                    | Google's entry; massive star count; MCP support       |
| **[OpenHands](https://github.com/All-Hands-AI/OpenHands)**    | 67k      | Python     | Multi-provider | Yes                                                        | Full AI developer; browser + terminal; self-hosted    |
| **[aider](https://github.com/paul-gauthier/aider)**           | 40k      | Python     | Multi-provider | No (pair programming model)                                | Git-aware; edit-focused; established                  |
| **[Goose](https://github.com/block/goose)**                   | 30k      | Rust       | Multi-provider | Yes — extensible via MCP                                   | Block-backed; Rust; extensible plugin system          |
| **[Cline](https://github.com/cline/cline)**                   | 57k      | TypeScript | Multi-provider | Limited                                                    | VS Code extension; autonomous mode; browser use       |
| **[bolt.new](https://github.com/stackblitz/bolt.new)**        | 16k      | TypeScript | Multi-provider | No                                                         | Full-stack web apps from prompts; WebContainer-based  |
| **[pi](https://github.com/mariozechner/pi-coding-agent)**     | ~small   | TypeScript | Multi-provider | Yes — subagent system with background tasks                | Agent-agnostic design; skill system; TUI; extensible  |

---

## Key Architectural Themes

### 1. Coordination Cost Is the Central Tradeoff

The single biggest differentiator between approaches is **how much you pay (in tokens and latency) for coordination**.

- **Zero-cost coordination** (Shogun, SwissArmyHammer): Agents coordinate via filesystem artifacts (YAML, markdown). The only API calls are for actual work. This is the cheapest but least dynamic — agents can't adapt to each other's outputs in real-time.
- **Lightweight handoffs** (OpenAI Agents SDK, smolagents): Minimal overhead. Agents transfer control to each other with context. Simple and predictable.
- **Graph-based state machines** (LangGraph, Microsoft Agent Framework): Rich control flow with cycles, branching, checkpointing. Powerful but requires infrastructure (Postgres, Redis) and is complex to debug.
- **Swarm consensus** (claude-flow, Swarms): Queen/worker hierarchies, Byzantine fault tolerance, voting. Maximum capability but highest coordination overhead.

**The sweet spot for coding tasks** appears to be either zero-cost (filesystem coordination) or lightweight handoffs. Swarm consensus makes more sense for decision-making systems than for code generation.

### 2. The "Spec-Driven" vs "Chat-Driven" Split

Two fundamentally different philosophies:

- **Spec-driven** (SwissArmyHammer, APM, pi's skill system): You write a specification, the system breaks it into tasks, and agents execute autonomously. Human involvement is front-loaded (writing the spec) and back-loaded (reviewing output).
- **Chat-driven** (most Claude Code orchestrators, CrewAI): The system is an enhanced chat loop. Agents may work autonomously within a task, but the human is in the conversation flow.

Spec-driven approaches scale better for complex projects. Chat-driven approaches are more accessible and allow for more real-time steering.

### 3. The MCP Protocol as a Convergence Point

The Model Context Protocol is emerging as the universal integration layer:

- **SwissArmyHammer** _is_ an MCP server with 40+ tools
- **Swarms** supports MCP as a tool integration protocol
- **claude-flow** runs as an MCP server
- **Composio** provides MCP-compatible tool integration
- **Goose** is extensible via MCP

This means any MCP-compatible orchestrator can theoretically plug into any MCP-compatible agent — moving toward real agent-agnosticism.

### 4. "Plugin Marketplace" vs "Framework" vs "Shell Scripts"

Three deployment models:

| Model                     | Examples                               | Pros                                             | Cons                                                       |
| ------------------------- | -------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------- |
| **Plugin marketplace**    | wshobson/agents, oh-my-claudecode, APM | Easy install; minimal commitment; mix-and-match  | Tied to specific CLI's plugin system; fragmented           |
| **Framework/SDK**         | Swarms, LangGraph, CrewAI, AutoGen     | Full control; custom workflows; production-grade | Learning curve; dependency weight; Python lock-in          |
| **Shell scripts + files** | Shogun, pi's skill system              | Zero dependencies; fully transparent; hackable   | Less sophisticated; manual setup; limited dynamic behavior |

### 5. The Python Monoculture Problem

**Nearly every major multi-agent framework is Python-only.** This is a significant limitation for:

- TypeScript/Node.js projects (ironically, most coding agents are TS)
- Rust/Go/systems projects
- Teams that don't want a Python runtime dependency

Notable exceptions: SwissArmyHammer (Rust), claude-flow (TypeScript), Shogun (Shell), n8n (TypeScript), APM (JavaScript), pi (TypeScript).

### 6. Memory and Learning: The Next Frontier

Most orchestrators are stateless — each run starts fresh. The frontier projects are adding:

- **Persistent memory**: Letta (advanced memory architecture), claude-flow (HNSW vector memory)
- **Self-learning routing**: claude-flow's Q-Learning router learns which agents work best for which tasks
- **Pattern storage**: claude-flow's ReasoningBank stores successful patterns for reuse

This is where the field is heading but maturity is low. Most "learning" claims should be taken with skepticism.

### 7. Anti-Drift is a Real Problem

When you run multiple agents in parallel on a complex task, they **drift** — they lose alignment with the original goal, duplicate work, or produce contradictory outputs. Solutions vary:

- **Hierarchical coordination** (claude-flow, Shogun): A "queen" or "karo" agent validates all outputs against the goal
- **Checkpointing** (LangGraph, Microsoft Agent Framework): Periodic state saves allow rollback
- **Short task cycles** (pi's skill system, APM): Break work into small, verifiable units
- **Filesystem transparency** (Shogun): Every instruction/decision is a file you can read and diff

---

## What's Most Interesting for Your Setup (pi + ~/.pi)

Given that pi already has:

- Subagent system with background tasks and depth limits
- Skill system (markdown-driven instructions)
- Agent definitions with tool restrictions
- MCP tool support

The most architecturally aligned projects to study are:

1. **APM** — Closest in philosophy to pi's skill system. Agent-agnostic, markdown-driven, context-window-aware. Their "smooth session transition" pattern for when context fills up is directly applicable.

2. **SwissArmyHammer** — Markdown-driven workflows as state machines is a powerful pattern. The MCP-server-as-orchestrator approach could be valuable.

3. **multi-agent-shogun** — Zero coordination overhead via filesystem + tmux is compelling for pi's use case. The YAML-based inter-agent communication pattern is worth studying for cost-sensitive orchestration.

4. **wshobson/agents** — The granular plugin approach with 73 focused plugins and token-budget awareness is a mature reference for how to organize skills/agents at scale.

5. **cexll/myclaude** — The cross-backend execution idea (routing work from one CLI to another) is unique and worth watching.

---

## Sources

All data gathered from GitHub API and project READMEs, February 11, 2026. Star counts are approximate and change rapidly in this space.
