/** @title MessageContext */
export interface IMessageContext {
  tenantId: string;
  [key: string]: string | null | undefined;
}
