/**
 * DingTalk Connector Plugin for OpenClaw
 *
 * 钉钉企业内部机器人插件，使用 Stream 模式连接，支持 AI Card 流式响应。
 * 已迁移到 OpenClaw SDK，支持多账号、安全策略等完整功能。
 * 
 * Last updated: 2026-03-24
 */

/**
 * DingTalk Connector Plugin for OpenClaw
 * 
 * 注意：本插件使用专用的 HTTP 客户端（见 src/utils/http-client.ts）
 * 不会影响 OpenClaw Gateway 和其他插件的网络请求
 */

import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { dingtalkPlugin } from "./src/channel.ts";
import { setDingtalkRuntime } from "./src/runtime.ts";
import { registerGatewayMethods } from "./src/gateway-methods.ts";

export { dingtalkPlugin } from "./src/channel.ts";
export { setDingtalkRuntime } from "./src/runtime.ts";
export { registerGatewayMethods } from "./src/gateway-methods.ts";

export default function register(api: OpenClawPluginApi) {
  setDingtalkRuntime(api.runtime);
  api.registerChannel({ plugin: dingtalkPlugin });
  
  // 注册 Gateway Methods
  registerGatewayMethods(api);
  
  // 添加全局未处理 Promise Rejection 处理器，防止认证错误导致进程崩溃
  process.on('unhandledRejection', (reason: any) => {
    if (reason?.message?.includes('Authentication failed') || 
        reason?.message?.includes('401') ||
        reason?.message?.includes('Bad Request (400)')) {
      console.error(
        '[dingtalk-connector] ⚠️ 认证错误，避免无限重启循环。' +
        '请检查配置后手动重启。'
      );
      // 不抛出，让进程继续运行
      return;
    }
    // 其他未处理的 rejection 继续传播
    console.error('[dingtalk-connector] Unhandled Promise Rejection:', reason);
  });
}
