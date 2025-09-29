import { config } from 'dotenv';
import { Client, TopicMessageSubmitTransaction, TopicCreateTransaction, TopicInfoQuery, PrivateKey, AccountId, TopicId } from '@hashgraph/sdk';
import { Project } from '../types/project';

config({ path: '.env.local' });

async function getOrCreateProjectRegistryTopic(client: Client): Promise<string> {
    const existingTopicId = process.env.PROJECT_REGISTRY_TOPIC;

    if (existingTopicId && existingTopicId !== '0.0.0') {
        try {
          // Try to query the existing topic to see if it's valid
          await new TopicInfoQuery()
            .setTopicId(existingTopicId)
            .execute(client);
          
          console.log('Using existing project registry topic:', existingTopicId);
          return existingTopicId;
        } catch (error) {
          console.log('Existing topic not found or invalid, creating new topic...');
        }
      }

    // Create a new topic for KeyRing verified projects registry
    console.log('Creating new KeyRing Project Registry topic (HCS-2 indexed)...');
    const createTopicTx = new TopicCreateTransaction()
        .setTopicMemo('hcs-2:0:86400') // HCS-2 indexed topic, 24 hour TTL
        .setSubmitKey(PrivateKey.fromStringDer(process.env.HEDERA_PRIVATE_KEY!).publicKey);

    const createResponse = await createTopicTx.execute(client);
    const createReceipt = await createResponse.getReceipt(client);
    const newTopicId = createReceipt.topicId!.toString();

    console.log('Created new project registry topic with ID:', newTopicId);
    console.log('Add this to your .env.local file: PROJECT_REGISTRY_TOPIC=' + newTopicId);
    return newTopicId;
}

async function sendTestProject() {
    try {
        const operatorId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID!);
        let operatorPrivateKey: PrivateKey;

        try {
            operatorPrivateKey = PrivateKey.fromStringDer(process.env.HEDERA_PRIVATE_KEY!);
        } catch (error) {
            console.error("❌ Error parsing private key:", error);
            throw error;
        }
        
        const client = Client.forTestnet().setOperator(operatorId, operatorPrivateKey);
        const topicId = await getOrCreateProjectRegistryTopic(client);

        const testProject: Project = {
            project_id: `proj_${Date.now()}_${Math.floor(Math.random() * 1000000)}`,
            company: {
                legal_name: "DeFi Protocol Alpha LLC",
                owners: ["Alice Johnson", "Bob Smith"],
                employees: ["Charlie Brown", "Diana Prince", "Eve Wilson"]
            },
            description: "A decentralized finance protocol focused on yield farming and liquidity provision with advanced tokenomics and governance features.",
            status: "verified"
        }

        const hcs2Message = {
            "p": "hcs-2",
            "op": "register",
            "t_id": operatorId.toString(), // Project's Hedera account ID
            "metadata": JSON.stringify(testProject),
            "m": "KeyRing verified project registration"
        };

        const projectMessage = JSON.stringify(hcs2Message);
        const transaction = new TopicMessageSubmitTransaction()
            .setTopicId(topicId)
            .setMessage(projectMessage);

        const response = await transaction.execute(client);
        const receipt = await response.getReceipt(client);

        console.log('🎉 Project registered successfully in KeyRing Protocol!');
        console.log('Registry Topic ID:', topicId);
        console.log('Transaction ID:', response.transactionId.toString());
        console.log('Status:', receipt.status.toString());
        console.log('Project details:', JSON.stringify(testProject, null, 2));
        console.log('\n📋 HCS-2 Message:');
        console.log(JSON.stringify(hcs2Message, null, 2));
        
    } catch (error) {
        console.error("❌ Error registering test project:", error);
        throw error;
    }
}

sendTestProject();