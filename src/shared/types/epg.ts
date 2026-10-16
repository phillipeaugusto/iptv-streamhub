export interface EpgProgram {
  id: string
  channelId: string
  title: string
  description?: string
  start: string
  end: string
  startTimestamp?: number
  endTimestamp?: number
}
