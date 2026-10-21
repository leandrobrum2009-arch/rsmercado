/**
 * Fiscal issuer abstraction. The PDV never talks to SEFAZ directly; a provider adapter
 * (running server-side only, with credentials in server secrets) implements this contract.
 * No adapter is registered yet — emission is intentionally unavailable.
 */
export type FiscalModel = '55' | '65'
export type FiscalStatus = 'pendente' | 'enviando' | 'autorizada' | 'rejeitada' | 'denegada' | 'cancelada' | 'contingencia' | 'erro'

export interface EmitRequest { requestId: string; saleId: string; model: FiscalModel; environment: 'homologacao' | 'producao' }
export interface EmitResult { status: FiscalStatus; accessKey?: string; protocol?: string; xmlUrl?: string; danfeUrl?: string; rejectionCode?: string; message?: string; providerRef?: string }

export interface FiscalProvider {
  name: string
  emit(req: EmitRequest): Promise<EmitResult>
  query(requestId: string): Promise<EmitResult>
  cancel(accessKey: string, reason: string): Promise<EmitResult>
}

export const FISCAL_PROVIDER_CONFIGURED = false
