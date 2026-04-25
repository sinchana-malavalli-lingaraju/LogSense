import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const uploadLog = (file, onProgress) => {
  const form = new FormData()
  form.append('file', file)
  return api.post('/logs/upload', form, {
    onUploadProgress: e => onProgress?.(Math.round((e.loaded / e.total) * 100)),
  })
}

export const getSessionStatus = id => api.get(`/logs/sessions/${id}/status`)
export const getSessions = () => api.get('/logs/sessions')
export const getLogs = params => api.get('/logs', { params })
export const semanticSearch = data => api.post('/search', data)
export const sendChat = data => api.post('/chat', data)
export const getAnalytics = params => api.get('/analytics', { params })
