/**
 * GET /api/schedules/pending-for-account?accountId=0.0.xxxxx
 * Returns schedules the account needs to sign (operator or signer).
 * Fetches from Mirror Node - no DB required.
 */

import { NextRequest, NextResponse } from 'next/server';

function getMirrorNodeUrl(): string {
  const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK || 'testnet';
  return network === 'mainnet'
    ? 'https://mainnet.mirrornode.hedera.com'
    : 'https://testnet.mirrornode.hedera.com';
}

function decodeVarint(bytes: number[]): number {
  let result = 0;
  let shift = 0;
  for (const byte of bytes) {
    result |= (byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) break;
    shift += 7;
  }
  return result;
}

export async function GET(request: NextRequest) {
  try {
    const accountId = request.nextUrl.searchParams.get('accountId');
    if (!accountId || !accountId.match(/^\d+\.\d+\.\d+$/)) {
      return NextResponse.json(
        { success: false, error: 'Valid accountId required' },
        { status: 400 }
      );
    }

    const mirrorNodeUrl = getMirrorNodeUrl();

    // Get account's public key
    const accountRes = await fetch(`${mirrorNodeUrl}/api/v1/accounts/${accountId}`);
    if (!accountRes.ok) {
      return NextResponse.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      );
    }
    const accountData = await accountRes.json();
    const myPublicKey = accountData.key?._type === 'ED25519' ? accountData.key.key : null;
    if (!myPublicKey) {
      return NextResponse.json(
        { success: false, error: 'Account has no ED25519 public key' },
        { status: 400 }
      );
    }

    // Query schedules created by this account (operator creates schedules)
    const schedRes = await fetch(
      `${mirrorNodeUrl}/api/v1/schedules?account.id=${accountId}&order=desc&limit=50`
    );
    if (!schedRes.ok) {
      return NextResponse.json({ success: true, schedules: [] });
    }
    const schedData = await schedRes.json();
    const schedules = schedData.schedules || [];

    const pending: Array<{
      schedule_id: string;
      memo: string;
      payer_account_id: string;
      expiration_time: string;
      signatures: unknown[];
    }> = [];

    const now = Date.now();
    for (const schedule of schedules) {
      if (schedule.executed_timestamp || schedule.deleted) continue;
      const exp = schedule.expiration_time;
      if (exp != null && exp !== '') {
        const expSec = typeof exp === 'string' ? parseFloat(exp) : Number(exp);
        if (!Number.isNaN(expSec) && now > expSec * 1000) continue;
      }

      const accountsInTx: string[] = [];
      try {
        const txBodyBase64 = schedule.transaction_body;
        if (!txBodyBase64) continue;
        const txBodyBytes = Buffer.from(txBodyBase64, 'base64');
        const txBodyHex = txBodyBytes.toString('hex');
        for (let i = 0; i < txBodyHex.length - 2; i += 2) {
          if (txBodyHex.slice(i, i + 2) === '18') {
            const varintBytes: number[] = [];
            let offset = i + 2;
            while (offset < txBodyHex.length) {
              const byte = parseInt(txBodyHex.slice(offset, offset + 2), 16);
              varintBytes.push(byte);
              offset += 2;
              if ((byte & 0x80) === 0) break;
              if (varintBytes.length > 10) break;
            }
            if (varintBytes.length > 0) {
              const accountNum = decodeVarint(varintBytes);
              if (accountNum > 0 && accountNum < 100000000) {
                accountsInTx.push(`0.0.${accountNum}`);
              }
            }
          }
        }
        if (schedule.payer_account_id && !accountsInTx.includes(schedule.payer_account_id)) {
          accountsInTx.push(schedule.payer_account_id);
        }
      } catch {
        continue;
      }

      let requiresMySignature = false;
      for (const acctId of accountsInTx) {
        try {
          const acctRes = await fetch(`${mirrorNodeUrl}/api/v1/accounts/${acctId}`);
          if (!acctRes.ok) continue;
          const acctData = await acctRes.json();
          const key = acctData.key;
          if (key?._type === 'ProtobufEncoded' && key.key) {
            const keyHex = key.key;
            if (keyHex.includes(myPublicKey)) {
              const mySig = schedule.signatures?.find((sig: { public_key_prefix: string }) => {
                const sigKeyHex = Buffer.from(sig.public_key_prefix, 'base64').toString('hex');
                return myPublicKey.includes(sigKeyHex) || sigKeyHex.includes(myPublicKey.slice(0, 40));
              });
              if (!mySig) {
                requiresMySignature = true;
                break;
              }
            }
          }
        } catch {
          // skip
        }
      }

      if (requiresMySignature) {
        pending.push({
          schedule_id: schedule.schedule_id,
          memo: schedule.memo || 'Scheduled Transaction',
          payer_account_id: schedule.payer_account_id,
          expiration_time: schedule.expiration_time,
          signatures: schedule.signatures || [],
        });
      }
    }

    return NextResponse.json({ success: true, schedules: pending });
  } catch (error) {
    console.error('[API] pending-for-account:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pending schedules' },
      { status: 500 }
    );
  }
}
