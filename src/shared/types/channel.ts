export interface Channel {
  id: string
  name: string
  number?: number
  logoUrl?: string
  categoryIds: string[]
  epgChannelId?: string
  hasArchive?: boolean
  streamType?: string
  customSid?: string
  tvArchiveDuration?: number
}

export interface ChannelPlayback {
  channelId: string
  url: string
  containerExtension?: string
}
