import { formatRefreshFailure, formatRefreshResult, type RefreshResult } from "./tools.js"

export interface DiscoveryCommandsContext {
  readonly command: {
    transform(callback: (commands: { add(command: {
      name: string
      description: string
      execute(input: { sessionID: string }): Promise<void>
    }): void }) => void): Promise<unknown>
    reload(): Promise<void>
  }
  readonly session: {
    synthetic(input: { sessionID: string; text: string }): Promise<unknown>
  }
}

export async function registerRefreshCommand(
  ctx: DiscoveryCommandsContext,
  refresh: () => Promise<RefreshResult>,
): Promise<void> {
  await ctx.command.transform((commands) => {
    commands.add({
      name: "models-discovery-refresh",
      description: "Refresh models discovered from configured providers.",
      execute: async ({ sessionID }) => {
        const text = await refresh().then(formatRefreshResult, formatRefreshFailure)
        await ctx.session.synthetic({ sessionID, text })
      },
    })
  })
  await ctx.command.reload()
}
