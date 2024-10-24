export interface CleanGateway {
  afterInit?: (server: any) => void
  handleConnection?: (...args: any[]) => void
  handleDisconnect?: (client: any) => void
}
