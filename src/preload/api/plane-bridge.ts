import { ipcRenderer } from 'electron'
import type { PlaneApi } from './plane-api'

export const planeApi = {
  connect: (args) => ipcRenderer.invoke('plane:connect', args),
  disconnect: () => ipcRenderer.invoke('plane:disconnect'),
  status: () => ipcRenderer.invoke('plane:status'),
  testConnection: () => ipcRenderer.invoke('plane:testConnection'),
  listProjects: () => ipcRenderer.invoke('plane:listProjects'),
  listIssues: (args) => ipcRenderer.invoke('plane:listIssues', args),
  getIssue: (args) => ipcRenderer.invoke('plane:getIssue', args),
  issueComments: (args) => ipcRenderer.invoke('plane:issueComments', args),
  listStates: (args) => ipcRenderer.invoke('plane:listStates', args),
  listMembers: (args) => ipcRenderer.invoke('plane:listMembers', args),
  updateIssue: (args) => ipcRenderer.invoke('plane:updateIssue', args),
  addComment: (args) => ipcRenderer.invoke('plane:addComment', args),
  createIssue: (args) => ipcRenderer.invoke('plane:createIssue', args),
  setAgentWritePolicy: (args) => ipcRenderer.invoke('plane:setAgentWritePolicy', args),
  getBoard: (args) => ipcRenderer.invoke('plane:getBoard', args),
  issueExtras: (args) => ipcRenderer.invoke('plane:issueExtras', args),
  setRelation: (args) => ipcRenderer.invoke('plane:setRelation', args)
} satisfies PlaneApi
