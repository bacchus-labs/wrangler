## Workflow System

Things we should make sure to do:

- revisit spec template and make sure it's got the right things we want covered
- plans need to start always happening after specs. review plan template. we should have a section at the bottom where it lays out all of the files it's going to create/modify and we can validate against that happening. also it should have a section where it lays out the workflow it's going to use if it's going to use one.
- we need to make it so that we can add references to the stuff we want given to the agent for context. presumably they'll get the project root claude/agents.md by default? but if it's code review we want the wrangler memory file for coding standards.
  - Open question: for the review gates, is it better to also give the testing/code standards to the security gate reviewer, and vice versa? I guess it's easy to play around with later as long as we can easily specify which files.
