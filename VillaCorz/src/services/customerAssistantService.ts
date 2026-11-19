import api from './api'
import type {
    ApiEnvelope,
    CustomerAssistantChatRequest,
    CustomerAssistantChatResponse,
} from './types'

export const sendCustomerAssistantMessage = (
    payload: CustomerAssistantChatRequest,
) =>
    api.post<ApiEnvelope<CustomerAssistantChatResponse>>(
        '/customer-assistant/chat',
        payload,
    )
