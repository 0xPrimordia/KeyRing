/**
 * GET /api/contracts/[contractId]/admin
 * Fetches contract from Mirror Node and returns admin info.
 * If thresholdAccountId is provided, checks whether that account's key matches the contract admin.
 */

import { NextRequest, NextResponse } from 'next/server';

function getMirrorNodeUrl(): string {
  const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK || 'testnet';
  return network === 'mainnet'
    ? 'https://mainnet.mirrornode.hedera.com'
    : 'https://testnet.mirrornode.hedera.com';
}

function extractKeysFromProtobuf(hex: string): string[] {
  const keys: string[] = [];
  let i = 0;
  while (i < hex.length - 72) {
    if (hex.slice(i, i + 8) === '0a221220') {
      const keyHex = hex.slice(i + 8, i + 72);
      if (keyHex.length === 64 && /^[0-9a-f]+$/.test(keyHex)) {
        keys.push(keyHex);
      }
      i += 72;
    } else {
      i += 2;
    }
  }
  return keys;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  try {
    const { contractId } = await params;
    const thresholdAccountId = request.nextUrl.searchParams.get('thresholdAccountId');

    if (!contractId || !contractId.match(/^\d+\.\d+\.\d+$/)) {
      return NextResponse.json(
        { success: false, error: 'Valid contractId required' },
        { status: 400 }
      );
    }

    const mirrorNodeUrl = getMirrorNodeUrl();

    const contractRes = await fetch(
      `${mirrorNodeUrl}/api/v1/contracts/${contractId}`
    );
    if (!contractRes.ok) {
      return NextResponse.json(
        { success: false, error: 'Contract not found' },
        { status: 404 }
      );
    }
    const contract = await contractRes.json();
    const adminKey = contract.admin_key;

    const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK || 'testnet';
    const explorerBase =
      network === 'mainnet'
        ? 'https://hashscan.io/mainnet'
        : 'https://hashscan.io/testnet';

    let adminDisplay: string;
    let isThresholdListAdmin = false;

    if (!adminKey) {
      adminDisplay = 'None';
    } else if (adminKey._type === 'ProtobufEncoded' && adminKey.key) {
      const keyHex = adminKey.key;
      const adminKeys = extractKeysFromProtobuf(keyHex);
      if (thresholdAccountId && adminKeys.length > 0) {
        const accRes = await fetch(
          `${mirrorNodeUrl}/api/v1/accounts/${thresholdAccountId}`
        );
        if (accRes.ok) {
          const accData = await accRes.json();
          const listKey = accData.key;
          if (listKey?._type === 'ProtobufEncoded' && listKey.key) {
            const listKeys = extractKeysFromProtobuf(listKey.key);
            const listKeySet = new Set(listKeys);
            const match = adminKeys.every((k) => listKeySet.has(k));
            if (match && adminKeys.length === listKeys.length) {
              isThresholdListAdmin = true;
              adminDisplay = thresholdAccountId;
            }
          }
        }
      }
      if (!isThresholdListAdmin) {
        adminDisplay = `KeyList (${adminKeys.length} keys)`;
      }
    } else if (adminKey._type === 'ED25519' && adminKey.key) {
      const pkRes = await fetch(
        `${mirrorNodeUrl}/api/v1/accounts?account.publickey=${adminKey.key}`
      );
      if (pkRes.ok) {
        const pkData = await pkRes.json();
        const accounts = pkData.accounts || [];
        adminDisplay =
          accounts.length > 0 ? accounts[0].account : `ED25519 ${adminKey.key.slice(0, 16)}…`;
      } else {
        adminDisplay = `ED25519 ${adminKey.key.slice(0, 16)}…`;
      }
    } else if (adminKey._type === 'ECDSA_SECP256K1') {
      adminDisplay = 'ECDSA (proxy)';
    } else {
      adminDisplay = adminKey._type || 'Unknown';
    }

    return NextResponse.json({
      success: true,
      contractId,
      adminDisplay,
      isThresholdListAdmin,
      hashscanUrl: `${explorerBase}/contract/${contractId}`,
    });
  } catch (error) {
    console.error('[API] contracts admin:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch contract admin' },
      { status: 500 }
    );
  }
}
