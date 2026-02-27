import { NextResponse } from 'next/server'
import { getTranslator } from '../../../../lib/i18n'
import crypto from 'crypto'
import { verifySignature } from '@/lib/webhooks/verify'
import { runBackgroundJob, isShuttingDown, registerGracefulShutdown } from '@/lib/background/runtime'
import { updateAnchorFlowStatusByTransactionId } from '@/lib/anchor/flow-store'
import { recordAuditEvent } from '@/lib/admin/audit'

registerGracefulShutdown();

export async function POST(request: Request) {
  try {
    if (isShuttingDown()) {
      return NextResponse.json({ error: 'Server is shutting down' }, { status: 503 })
    }

    // 1. Read the raw body as text for accurate signature verification
    const rawBody = await request.text()

    // 2. Get the signature from headers
    const signature = request.headers.get('x-anchor-signature')
    const secret = process.env.ANCHOR_WEBHOOK_SECRET

    if (!secret) {
      console.error('[Webhook] Secret not configured in environment.')
      return NextResponse.json(
        { error: 'Server misconfiguration' },
        { status: 500 }
      )
    }

    const t = getTranslator(request.headers.get('accept-language'));

    if (!signature) {
      return NextResponse.json({ error: t('errors.missing_signature') }, { status: 401 })
    }

    // 3. Verify Signature using shared secret (HMAC SHA-256)
    const isSignatureValid = verifySignature(rawBody, signature, secret, 'hmac-sha256')

    if (!isSignatureValid) {
      console.warn('[Webhook] Invalid webhook signature detected.')
      return NextResponse.json({ error: t('errors.invalid_signature') }, { status: 401 })
    }

    // 4. Parse the trusted payload
    const payload = JSON.parse(rawBody)

    // 5. Process the event asynchronously (tracked for graceful shutdown in long-running Node servers)
    runBackgroundJob('anchor_webhook_event', async () => {
      await handleAnchorEvent(payload)
    }).catch(console.error)

    // 6. Return 200 quickly to acknowledge receipt
    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error('[Webhook] Error handling request:', error)
    const t = getTranslator(request.headers.get('accept-language'));
    return NextResponse.json(
      { error: t('errors.internal_server_error') },
      { status: 500 }
    )
  }
}

// Internal function to handle the business logic
async function handleAnchorEvent(payload: any) {
  const { event_type, transaction_id, status } = payload
  const txId = typeof transaction_id === 'string' ? transaction_id : ''

  console.log(
    `[Webhook] Processing event: ${event_type} for tx: ${transaction_id}`
  )

  switch (event_type) {
    case 'deposit_completed':
      if (txId) {
        updateAnchorFlowStatusByTransactionId(txId, 'completed')
      }
      recordAuditEvent({
        type: 'anchor.webhook.deposit_completed',
        actor: 'anchor-webhook',
        message: `Deposit completed for ${txId || 'unknown'}`,
        metadata: { transaction_id: txId || null, status },
      })
      console.log(`[Webhook] Deposit completed for tx ${transaction_id}`)
      break
    case 'withdrawal_failed':
      if (txId) {
        updateAnchorFlowStatusByTransactionId(txId, 'failed')
      }
      recordAuditEvent({
        type: 'anchor.webhook.withdrawal_failed',
        actor: 'anchor-webhook',
        message: `Withdrawal failed for ${txId || 'unknown'}`,
        metadata: { transaction_id: txId || null, status },
      })
      console.log(`[Webhook] Withdrawal failed for tx ${transaction_id}`)
      break
    default:
      console.log(`[Webhook] Unhandled event type received: ${event_type}`)
  }
}
