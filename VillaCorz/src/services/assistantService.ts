import api from './api'
import type {
  ApiEnvelope,
  AssistantChatRequest,
  AssistantChatResponse,
  AssistantStatus,
} from './types'

export const sendAssistantMessage = (payload: AssistantChatRequest) =>
  api.post<ApiEnvelope<AssistantChatResponse>>('/assistant/chat', payload)

export const getAssistantStatus = () =>
  api.get<ApiEnvelope<AssistantStatus>>('/assistant/status')
