import { config } from 'dotenv';
import { 
  Client, 
  PrivateKey, 
  AccountId,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction 
} from '@hashgraph/sdk';
import { 
  HcsDid,
  HcsDidCreateDidDocumentTransaction,
  HcsDidCreateDidTransaction,
  DidMethodOperation,
  HcsDidResolver
} from '@hashgraph/did-sdk-js';

config({ path: '.env.local' });

interface KeyRingSignerProfile {
  codeName: string;
  verificationProvider: 'entrust' | 'sumsub';
  attestationHash: string;
  region: string;
  specializations: string[];
  joinDate: string;
  reputation: number;
  status: 'active' | 'suspended' | 'pending';
}

async function createKeyRingDID(): Promise<void> {
  try {
    console.log('🆔 Creating KeyRing DID for verified signer...\n');

    // Setup Hedera client
    const operatorId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID!);
    const operatorKey = PrivateKey.fromStringDer(process.env.HEDERA_PRIVATE_KEY!);
    const client = Client.forTestnet().setOperator(operatorId, operatorKey);

    // Generate new key pair for the signer
    const signerPrivateKey = PrivateKey.generateED25519();
    const signerPublicKey = signerPrivateKey.publicKey;
    
    console.log('Generated signer keys:');
    console.log(`Private Key: ${signerPrivateKey.toStringDer()}`);
    console.log(`Public Key: ${signerPublicKey.toStringDer()}\n`);

    // Create DID identifier
    const didPrivateKey = PrivateKey.generateED25519();
    const network = "testnet";
    
    // Create HCS topic for DID document
    console.log('Creating HCS topic for DID document...');
    const didTopicTx = new TopicCreateTransaction()
      .setTopicMemo('KeyRing Protocol - Signer DID Document')
      .setSubmitKey(didPrivateKey.publicKey);
    
    const didTopicResponse = await didTopicTx.execute(client);
    const didTopicReceipt = await didTopicResponse.getReceipt(client);
    const didTopicId = didTopicReceipt.topicId!;
    
    console.log(`DID Topic created: ${didTopicId}\n`);

    // Create Hedera DID
    const hcsDid = new HcsDid({ 
      network, 
      publicKey: didPrivateKey.publicKey, 
      topicId: didTopicId 
    });

    console.log(`DID Identifier: ${hcsDid.toDid()}\n`);

    // Create KeyRing signer profile
    const signerProfile: KeyRingSignerProfile = {
      codeName: 'crimson-firefly-47',
      verificationProvider: 'entrust',
      attestationHash: 'sha256_hash_of_entrust_jwt_payload',
      region: 'north_america',
      specializations: ['defi', 'token_economics'],
      joinDate: new Date().toISOString().split('T')[0],
      reputation: 100,
      status: 'active'
    };

    // Create HCS topic for signer profile (HCS-11)
    console.log('Creating HCS topic for signer profile...');
    const profileTopicTx = new TopicCreateTransaction()
      .setTopicMemo('hcs-11:1:86400') // HCS-11 profile, non-indexed, 24h TTL
      .setSubmitKey(signerPrivateKey.publicKey);
    
    const profileTopicResponse = await profileTopicTx.execute(client);
    const profileTopicReceipt = await profileTopicResponse.getReceipt(client);
    const profileTopicId = profileTopicReceipt.topicId!;
    
    console.log(`Profile Topic created: ${profileTopicId}\n`);

    // Create DID Document with KeyRing services
    const didDocument = hcsDid.generateDidDocument();
    
    // Add KeyRing-specific services
    didDocument.service = [
      {
        id: `${hcsDid.toDid()}#keyring-profile`,
        type: 'KeyRingProfile',
        serviceEndpoint: `hcs://11/${profileTopicId}`
      },
      {
        id: `${hcsDid.toDid()}#keyring-verification`,
        type: 'KeyRingVerification',
        serviceEndpoint: {
          verificationProvider: signerProfile.verificationProvider,
          attestationHash: signerProfile.attestationHash,
          status: signerProfile.status
        }
      }
    ];

    // Add signer's public key as verification method
    didDocument.verificationMethod?.push({
      id: `${hcsDid.toDid()}#signer-key`,
      type: 'Ed25519VerificationKey2020',
      controller: hcsDid.toDid(),
      publicKeyMultibase: signerPublicKey.toStringDer()
    });

    // Add to authentication and assertion methods
    didDocument.authentication?.push(`${hcsDid.toDid()}#signer-key`);
    didDocument.assertionMethod?.push(`${hcsDid.toDid()}#signer-key`);

    console.log('DID Document created:');
    console.log(JSON.stringify(didDocument, null, 2));
    console.log('');

    // Submit DID creation transaction
    console.log('Submitting DID creation to Hedera...');
    const didCreateTx = new HcsDidCreateDidTransaction()
      .setDidDocument(didDocument)
      .buildAndSignTransaction(didPrivateKey);

    const didCreateResponse = await didCreateTx.execute(client);
    const didCreateReceipt = await didCreateResponse.getReceipt(client);
    
    console.log(`✅ DID created successfully!`);
    console.log(`Transaction ID: ${didCreateResponse.transactionId}`);
    console.log(`Status: ${didCreateReceipt.status}\n`);

    // Submit signer profile to HCS-11 topic
    console.log('Publishing signer profile to HCS-11 topic...');
    const hcs11Profile = {
      p: 'hcs-11',
      v: '1.0',
      type: 'keyring_signer',
      data: {
        display_name: signerProfile.codeName,
        bio: `KeyRing verified signer specializing in ${signerProfile.specializations.join(', ')}`,
        location: signerProfile.region.replace('_', ' '),
        keyring: signerProfile,
        did: hcsDid.toDid(),
        links: [
          {
            platform: 'keyring_did',
            url: hcsDid.toDid()
          }
        ]
      }
    };

    const profileMessage = JSON.stringify(hcs11Profile);
    const profileTx = new TopicMessageSubmitTransaction()
      .setTopicId(profileTopicId)
      .setMessage(profileMessage);

    const profileResponse = await profileTx.execute(client);
    const profileReceipt = await profileResponse.getReceipt(client);

    console.log(`✅ Profile published successfully!`);
    console.log(`Profile Topic: ${profileTopicId}`);
    console.log(`Transaction ID: ${profileResponse.transactionId}\n`);

    // Test DID resolution
    console.log('Testing DID resolution...');
    const resolver = new HcsDidResolver();
    const resolvedDid = await resolver.resolve(hcsDid.toDid());
    
    console.log('Resolved DID Document:');
    console.log(JSON.stringify(resolvedDid.didDocument, null, 2));

    console.log('\n🎉 KeyRing DID setup complete!');
    console.log('Summary:');
    console.log(`- DID: ${hcsDid.toDid()}`);
    console.log(`- DID Topic: ${didTopicId}`);
    console.log(`- Profile Topic: ${profileTopicId}`);
    console.log(`- Signer Account: ${operatorId}`);
    console.log(`- Code Name: ${signerProfile.codeName}`);

  } catch (error) {
    console.error('❌ Error creating KeyRing DID:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  createKeyRingDID();
}

export { createKeyRingDID };
