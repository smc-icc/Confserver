/**
 * 渠道路由编辑器常量。必须与 Omni ROUTE_TRIGGERS / ROUTE_APP_TYPES 对齐：
 * OmniAgent/backend/src/shared/services/channel-route.ts
 *
 * 四项业务入口：
 *   主 ITR           → on_inbound
 *   坐席超时未接     → on_agent_no_answer
 *   坐席超时回复     → on_agent_no_reply
 *   满意度           → on_agent_end
 * 闲置回收 on_idle_timeout 也可配；ACD 结果码用手填 on_acd_<码>。
 */

export const ROUTE_TRIGGER_OPTIONS = [
  { value: 'on_inbound', label: '进线(未绑坐席)' },
  { value: 'on_agent_no_reply', label: '坐席超时未回复' },
  { value: 'on_agent_no_answer', label: '坐席超时未接' },
  { value: 'on_agent_end', label: '坐席结束会话' },
  { value: 'on_idle_timeout', label: '会话闲置回收' },
]

export const ROUTE_APP_TYPE_OPTIONS = [
  { value: 'itr', label: 'ITR流程' },
  { value: 'agent', label: '坐席' },
  { value: 'robot', label: '机器人' },
  { value: 'acd', label: 'ACD排队' },
  { value: 'release', label: '收回会话' },
  { value: 'none', label: '不路由' },
]

export const ROUTES_FIELD = {
  key: 'routes',
  label: '路由配置',
  type: 'routes',
  hint: '同一触发点可配多条（顺位小的先试，失败自动降级）。主 ITR=进线，坐席超时未接，坐席超时回复，满意度=坐席结束会话。',
}

export function emptyRouteRow(priority = 0) {
  return {
    trigger: 'on_agent_no_reply',
    priority,
    app_type: 'itr',
    flow_id: 0,
    agent_id: 0,
    robot_id: 0,
    agent_group_id: -1,
    skill_id: -1,
    media_type: 0,
    line_priority: 0,
    timeout_seconds: 0,
    enabled: true,
  }
}

export function cloneRoutes(routes) {
  return Array.isArray(routes) ? routes.map((row) => ({ ...row })) : []
}
