import type { ToolPolicy } from "openclaw/plugin-sdk";
import type { ClawdbotConfig } from "openclaw/plugin-sdk";
import { resolveDingtalkAccount } from "./config/accounts.ts";

export function resolveDingtalkGroupToolPolicy(params: {
  cfg: ClawdbotConfig;
  groupId?: string | null;
  accountId?: string | null;
}): ToolPolicy | undefined {
  const { cfg, groupId, accountId } = params;

  const account = resolveDingtalkAccount({ cfg, accountId });
  const dingtalkCfg = account.config;

  // Check group-specific policy first
  if (groupId) {
    const groupConfig = dingtalkCfg?.groups?.[groupId];
    if (groupConfig?.tools) {
      return groupConfig.tools;
    }
  }

  // Fall back to account-level default (allow all)
  return { allow: ["*"] };
}
