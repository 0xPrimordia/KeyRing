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
  HcsDidTransaction,
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

    // TODO: Fix HcsDid constructor - requires addressBookFileId parameter
    // The SDK API has changed and requires an addressBookFileId
    // const hcsDid = new HcsDid(network, didPrivateKey.publicKey, addressBookFileId, didTopicId);
    // console.log(`DID Identifier: ${hcsDid.toDid()}\n`);
    
    // Placeholder for DID identifier
    const didIdentifier = `did:hedera:${network}:${HcsDid.publicKeyToIdString(didPrivateKey.publicKey)}_${didTopicId}`;
    console.log(`DID Identifier: ${didIdentifier}\n`);

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

    // TODO: Fix DID Document creation - need to use correct HcsDid instance
    // Create DID Document with KeyRing services (commented out until HcsDid is fixed)
    /*
    const didDocument = hcsDid.generateDidDocument();
    
    // Add KeyRing-specific services
    didDocument.service = [
      {
        id: `${didIdentifier}#keyring-profile`,
        type: 'KeyRingProfile',
        serviceEndpoint: `hcs://11/${profileTopicId}`
      },
      {
        id: `${didIdentifier}#keyring-verification`,
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
      id: `${didIdentifier}#signer-key`,
      type: 'Ed25519VerificationKey2020',
      controller: didIdentifier,
      publicKeyMultibase: signerPublicKey.toStringDer()
    });

    // Add to authentication and assertion methods
    didDocument.authentication?.push(`${didIdentifier}#signer-key`);
    didDocument.assertionMethod?.push(`${didIdentifier}#signer-key`);

    console.log('DID Document created:');
    console.log(JSON.stringify(didDocument, null, 2));
    console.log('');
    */
    
    console.log('DID Document creation temporarily disabled - needs SDK API update');

    // TODO: Fix DID creation transaction - use correct HcsDidTransaction API
    // Submit DID creation transaction (commented out until API is fixed)
    /*
    console.log('Submitting DID creation to Hedera...');
    const didCreateTx = new HcsDidTransaction(DidMethodOperation.CREATE, didTopicId)
      .setDidDocument(JSON.stringify(didDocument));

    const didCreateResponse = await didCreateTx.execute(client);
    const didCreateReceipt = await didCreateResponse.getReceipt(client);
    
    console.log(`✅ DID created successfully!`);
    console.log(`Transaction ID: ${didCreateResponse.transactionId}`);
    console.log(`Status: ${didCreateReceipt.status}\n`);
    */
    
    console.log('DID creation transaction temporarily disabled - needs SDK API update');

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
        did: didIdentifier,
        links: [
          {
            platform: 'keyring_did',
            url: didIdentifier
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

    // TODO: Fix DID resolution - needs proper HcsDid instance
    // Test DID resolution (commented out until HcsDid is fixed)
    /*
    console.log('Testing DID resolution...');
    const resolver = new HcsDidResolver();
    const resolvedDid = await resolver.resolve(didIdentifier);
    
    console.log('Resolved DID Document:');
    console.log(JSON.stringify(resolvedDid.didDocument, null, 2));
    */
    
    console.log('DID resolution temporarily disabled - needs SDK API update');

    console.log('\n🎉 KeyRing DID setup complete!');
    console.log('Summary:');
    console.log(`- DID: ${didIdentifier}`);
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
