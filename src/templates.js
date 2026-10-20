export const templates = {
  handoff: {
    title: "The Dispatch handover",
    content: `# The Dispatch handover\n\nA field guide for whoever picks this up next.\n\n> The useful things tend to be the things nobody writes down. Start there.\n\n## At a glance\n\nDispatch is a small notification service. It accepts events, queues deliveries, and retries the ones that do not make it through.\n\n| Service | Location | Status |\n| --- | --- | --- |\n| API | eu-central-1 | Healthy |\n| Worker | eu-central-1 | Healthy |\n| Queue | Managed Redis | Healthy |\n\n## Getting started\n\n1. Copy the example environment file.\n2. Install the dependencies with \`npm ci\`.\n3. Start the development server.\n\n\`\`\`sh\nnpm ci\nnpm run dev\n\`\`\`\n\n## The things to know\n\n- **Delivery is at least once.** Consumers should deduplicate by event ID.\n- Retries use exponential backoff, with a maximum of five attempts.\n- The health endpoint is \`/health\`. Queue depth is the first metric to check.\n\n## Open questions\n\n- Should we retain failed deliveries for 7 or 30 days?\n- Who owns the webhook signing key rotation?\n\n## Next steps\n\nAsk the service owner for access, run the smoke test, and send one test notification before making changes.\n\n---\n\nPrepared for the next pair of hands.\n`,
  },
  release: {
    title: "Release notes · v2.4",
    content:
      "# Dispatch v2.4\n\nA quieter release, with better visibility.\n\n## What changed\n\n- Added an audit log for webhook delivery attempts.\n- Increased the retry limit from three to five.\n- Removed the legacy authentication path.\n\n## Before you upgrade\n\nReplace legacy tokens with signed API keys before deploying.\n\n```sh\nnpm ci\nnpm run build\nnpm test\n```\n\n## Rollback plan\n\nRedeploy v2.3 and restore the previous configuration. No database migration is required.\n\n## Known issues\n\nAudit log export is limited to the last 30 days.\n",
  },
  decision: {
    title: "Decision record · 001",
    content:
      "# 001 · Choose a queue\n\n**Status:** Proposed\n\n## Context\n\nWe need background delivery without making the API wait for a third-party service.\n\n## Options\n\n| Option | Strength | Trade-off |\n| --- | --- | --- |\n| In-process | Simple to start | Jobs are lost on restart |\n| Redis-backed | Persistent, familiar | Another service to operate |\n| Managed queue | Low maintenance | Vendor-specific tooling |\n\n## Decision\n\nDescribe the chosen option and why it fits the current constraints.\n\n## Consequences\n\nList the operational work this decision creates, and when it should be revisited.\n",
  },
  blank: {
    title: "Untitled document",
    content:
      "# Start with the useful part\n\nWhat should the next person know?\n",
  },
};
