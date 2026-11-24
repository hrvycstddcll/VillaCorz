import path from "node:path"
import type { Plugin } from "@opencode-ai/plugin"

export default (async ({ worktree }) => {
  return {
    config: (cfg) => {
      cfg.skills ??= {}
      cfg.skills.paths ??= []

      for (const skillPath of [
        path.join(worktree, ".opencode", "skills"),
        path.join(worktree, ".agents", "skills"),
      ]) {
        if (!cfg.skills.paths.includes(skillPath)) {
          cfg.skills.paths.push(skillPath)
        }
      }
    },
  }
}) satisfies Plugin
