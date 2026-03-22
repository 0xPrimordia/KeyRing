/**
 * Shared utility for reassembling chunked HCS (Hedera Consensus Service) messages.
 *
 * HCS has a ~1024 byte limit per message. The Hedera SDK automatically chunks
 * larger payloads into multiple messages linked by `chunk_info`. This utility
 * groups and recombines those fragments so callers receive complete payloads.
 */

export interface MirrorNodeHcsMessage {
  message: string;
  consensus_timestamp: string;
  sequence_number?: number;
  chunk_info?: {
    initial_transaction_id?: {
      account_id: string;
      transaction_valid_start: string;
      nonce?: number;
    };
    number: number;
    total: number;
  };
  [key: string]: unknown;
}

export interface ReassembledMessage {
  payload: string;
  consensusTimestamp: string;
}

export function reassembleHcsMessages(
  messages: MirrorNodeHcsMessage[]
): ReassembledMessage[] {
  const chunkedByTx = new Map<string, MirrorNodeHcsMessage[]>();
  const standalone: MirrorNodeHcsMessage[] = [];

  for (const msg of messages) {
    const ci = msg.chunk_info;
    if (ci && ci.total > 1) {
      const init = ci.initial_transaction_id;
      const txKey = init
        ? `${init.account_id}@${init.transaction_valid_start}.${init.nonce ?? 0}`
        : `chunk-${msg.consensus_timestamp}`;
      if (!chunkedByTx.has(txKey)) chunkedByTx.set(txKey, []);
      chunkedByTx.get(txKey)!.push(msg);
    } else {
      standalone.push(msg);
    }
  }

  const results: ReassembledMessage[] = [];

  for (const chunks of chunkedByTx.values()) {
    chunks.sort((a, b) => (a.chunk_info?.number ?? 1) - (b.chunk_info?.number ?? 1));
    const combined = chunks
      .map((m) => Buffer.from(m.message, 'base64').toString('utf-8'))
      .join('');
    results.push({
      payload: combined,
      consensusTimestamp: chunks[chunks.length - 1].consensus_timestamp,
    });
  }

  for (const msg of standalone) {
    results.push({
      payload: Buffer.from(msg.message, 'base64').toString('utf-8'),
      consensusTimestamp: msg.consensus_timestamp,
    });
  }

  return results;
}
