const getMirrorNodeUrl = (): string => {
  const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK || 'testnet';
  return network === 'mainnet'
    ? 'https://mainnet.mirrornode.hedera.com'
    : 'https://testnet.mirrornode.hedera.com';
};

export { getMirrorNodeUrl };

function readVarint(bytes: Buffer, offset: number): [value: number, bytesRead: number] {
  let result = 0;
  let shift = 0;
  let size = 0;
  while (offset + size < bytes.length) {
    const byte = bytes[offset + size];
    result |= (byte & 0x7f) << shift;
    size++;
    if ((byte & 0x80) === 0) break;
    shift += 7;
  }
  return [result, size];
}

function parseProtobufEncodedKey(hexKey: string): { threshold: number; totalKeys: number } {
  try {
    const bytes = Buffer.from(hexKey, 'hex');

    // 0x2a = field 5 (ThresholdKey), wire type 2 (length-delimited)
    if (bytes[0] === 0x2a) {
      let offset = 1;
      const [tkLen, tkLenSize] = readVarint(bytes, offset);
      offset += tkLenSize;

      let threshold = 0;
      let totalKeys = 0;
      const tkEnd = offset + tkLen;

      while (offset < tkEnd) {
        const tag = bytes[offset++];
        if (tag === 0x08) {
          // field 1 = threshold (varint)
          const [val, size] = readVarint(bytes, offset);
          threshold = val;
          offset += size;
        } else if (tag === 0x12) {
          // field 2 = KeyList (length-delimited)
          const [klLen, klLenSize] = readVarint(bytes, offset);
          offset += klLenSize;
          const klEnd = offset + klLen;

          while (offset < klEnd) {
            if (bytes[offset] === 0x0a) {
              totalKeys++;
              offset++;
              const [keyLen, keyLenSize] = readVarint(bytes, offset);
              offset += keyLenSize + keyLen;
            } else {
              break;
            }
          }
          break;
        } else {
          // Skip unknown field
          break;
        }
      }

      return { threshold, totalKeys };
    }

    // 0x32 = field 6 (KeyList), wire type 2 — all-of-N key list (no threshold)
    if (bytes[0] === 0x32) {
      let offset = 1;
      const [klLen, klLenSize] = readVarint(bytes, offset);
      offset += klLenSize;
      const klEnd = offset + klLen;

      let totalKeys = 0;
      while (offset < klEnd) {
        if (bytes[offset] === 0x0a) {
          totalKeys++;
          offset++;
          const [keyLen, keyLenSize] = readVarint(bytes, offset);
          offset += keyLenSize + keyLen;
        } else {
          break;
        }
      }
      return { threshold: totalKeys, totalKeys };
    }

    return { threshold: 0, totalKeys: 0 };
  } catch {
    return { threshold: 0, totalKeys: 0 };
  }
}

export async function getThresholdFromMirrorNode(
  accountId: string
): Promise<{ threshold: number; totalKeys: number }> {
  try {
    const res = await fetch(
      `${getMirrorNodeUrl()}/api/v1/accounts/${accountId}`
    );
    if (!res.ok) return { threshold: 0, totalKeys: 0 };
    const data = await res.json();

    const keyType = data.key?._type;

    if (keyType === 'KeyList') {
      const keys = data.key.keys || [];
      return {
        threshold: data.key.threshold ?? keys.length,
        totalKeys: keys.length,
      };
    }

    if (keyType === 'ProtobufEncoded' && data.key?.key) {
      return parseProtobufEncodedKey(data.key.key);
    }

    return { threshold: 0, totalKeys: 0 };
  } catch {
    return { threshold: 0, totalKeys: 0 };
  }
}

export interface MirrorNodeSchedule {
  schedule_id: string;
  creator_account_id: string;
  payer_account_id: string;
  memo: string;
  consensus_timestamp: string;
  expiration_time: string;
  executed_timestamp: string | null;
  deleted: boolean;
  signatures: Array<{ public_key_prefix: string; consensus_timestamp?: string }>;
  transaction_body?: string;
}

export async function fetchScheduleFromMirrorNode(
  scheduleId: string
): Promise<MirrorNodeSchedule | null> {
  try {
    const res = await fetch(
      `${getMirrorNodeUrl()}/api/v1/schedules/${scheduleId}`
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
