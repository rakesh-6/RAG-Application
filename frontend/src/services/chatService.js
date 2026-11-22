import apiClient from './apiClient'

/** Leave conversationId empty to start a new conversation. */
export async function askQuestion(question, conversationId = null) {
  const { data } = await apiClient.post('/chat/ask', { question, conversation_id: conversationId })
  return data // { conversation_id, conversation_title, user_message, assistant_message }
}

export async function listConversations() {
  const { data } = await apiClient.get('/conversations')
  return data
}

export async function getMessages(conversationId) {
  const { data } = await apiClient.get(`/conversations/${conversationId}/messages`)
  return data
}

export async function deleteConversation(conversationId) {
  await apiClient.delete(`/conversations/${conversationId}`)
}
