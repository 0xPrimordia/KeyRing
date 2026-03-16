import { supabase } from './supabase';
import { Database } from './database.types';

type KeyringSigner = Database['public']['Tables']['keyring_signers']['Row'];
type KeyringSignerInsert = Database['public']['Tables']['keyring_signers']['Insert'];
type KeyringProject = Database['public']['Tables']['keyring_projects']['Row'];
type KeyringProjectInsert = Database['public']['Tables']['keyring_projects']['Insert'];
type KeyringThresholdList = Database['public']['Tables']['keyring_threshold_lists']['Row'];
type KeyringReward = Database['public']['Tables']['keyring_rewards']['Row'];
// type KeyringWhitelist = Database['public']['Tables']['keyring_whitelist']['Row']; // Unused for now
type KeyringWhitelistInsert = Database['public']['Tables']['keyring_whitelist']['Insert'];

export class KeyRingDB {
  
  /**
   * Register a new Hedera KeyRing signer
   */
  static async registerSigner(data: {
    accountId: string;
    publicKey: string;
    profileTopicId: string;
    codeName: string;
    verificationProvider?: 'entrust' | 'sumsub';
    sumsubApplicantId?: string;
    sumsubReviewResult?: 'GREEN' | 'RED' | 'YELLOW';
    isTestnet?: boolean;
  }): Promise<{ success: boolean; signer?: KeyringSigner; error?: string }> {
    try {
      const signerData: KeyringSignerInsert = {
        account_type: 'hedera',
        account_id: data.accountId,
        public_key: data.publicKey,
        profile_topic_id: data.profileTopicId,
        code_name: data.codeName,
        verification_status: 'verified', // Auto-verify for MVP
        verification_provider: data.verificationProvider || 'entrust',
        verification_date: new Date().toISOString(),
        sumsub_applicant_id: data.sumsubApplicantId || null,
        sumsub_review_result: data.sumsubReviewResult || null,
        is_testnet: data.isTestnet ?? false,
      };

      const { data: signer, error } = await supabase
        .from('keyring_signers')
        .insert(signerData)
        .select()
        .single();

      if (error) {
        console.error('Database error registering signer:', error);
        return { success: false, error: error.message };
      }

      // Add verification reward when registering with Sumsub (HCS-11 profile creation after KYC)
      if (data.verificationProvider === 'sumsub' && data.sumsubReviewResult === 'GREEN') {
        await this.addVerificationRewardIfNew(signer.id, 100, 'KYRNG');
      }

      return { success: true, signer };
    } catch (error: unknown) {
      console.error('Error registering signer:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Register a new Ethereum KeyRing signer
   */
  static async registerEthereumSigner(data: {
    walletAddress: string;
    codeName: string;
    verificationProvider?: 'entrust' | 'sumsub';
    sumsubApplicantId?: string;
    sumsubReviewResult?: 'GREEN' | 'RED' | 'YELLOW';
    isTestnet?: boolean;
  }): Promise<{ success: boolean; signer?: KeyringSigner; error?: string }> {
    try {
      // Verified only when KYC (Sumsub) data is present with GREEN result; otherwise pending for boost-only access
      const hasKyc = !!data.sumsubApplicantId;
      const verificationStatus = hasKyc && data.sumsubReviewResult === 'GREEN' ? 'verified' : 'pending';

      const signerData: KeyringSignerInsert = {
        account_type: 'ethereum',
        wallet_address: data.walletAddress,
        code_name: data.codeName,
        verification_status: verificationStatus,
        verification_provider: data.verificationProvider || 'sumsub',
        verification_date: hasKyc ? new Date().toISOString() : null,
        sumsub_applicant_id: data.sumsubApplicantId || null,
        sumsub_review_result: data.sumsubReviewResult || null,
        is_testnet: data.isTestnet ?? false,
      };

      const { data: signer, error } = await supabase
        .from('keyring_signers')
        .insert(signerData)
        .select()
        .single();

      if (error) {
        console.error('Database error registering Ethereum signer:', error);
        return { success: false, error: error.message };
      }

      // Add registration reward (20 Keyring)
      await this.addReward(signer.id, 'onboarding', 20, 'KYRNG');

      // Add verification reward (100 Keyring) when Sumsub KYC completed with GREEN
      if (hasKyc && data.sumsubReviewResult === 'GREEN') {
        await this.addVerificationRewardIfNew(signer.id, 100, 'KYRNG');
      }

      return { success: true, signer };
    } catch (error: unknown) {
      console.error('Error registering Ethereum signer:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Register a Hedera signer without KYC (for boost-only access).
   * Sets verification_status to 'pending'. User can complete KYC later for real projects.
   */
  static async registerHederaSignerWithoutKyc(data: {
    accountId: string;
    publicKey: string;
    codeName: string;
    isTestnet?: boolean;
  }): Promise<{ success: boolean; signer?: KeyringSigner; error?: string }> {
    try {
      const signerData: KeyringSignerInsert = {
        account_type: 'hedera',
        account_id: data.accountId,
        public_key: data.publicKey,
        profile_topic_id: '',
        code_name: data.codeName,
        verification_status: 'pending',
        verification_provider: 'sumsub',
        verification_date: null,
        sumsub_applicant_id: null,
        sumsub_review_result: null,
        is_testnet: data.isTestnet ?? false,
      };

      const { data: signer, error } = await supabase
        .from('keyring_signers')
        .insert(signerData)
        .select()
        .single();

      if (error) {
        console.error('Database error registering Hedera signer without KYC:', error);
        return { success: false, error: error.message };
      }

      // Add registration reward (20 Keyring)
      await this.addReward(signer.id, 'onboarding', 20, 'KYRNG');

      return { success: true, signer };
    } catch (error: unknown) {
      console.error('Error in registerHederaSignerWithoutKyc:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Register incomplete signer verification (Sumsub data only, no profile yet)
   */
  static async registerIncompleteSignerVerification(data: {
    accountId: string;
    applicantId: string;
    reviewResult: 'GREEN' | 'RED' | 'YELLOW';
    isTestnet?: boolean;
    publicKey?: string;
  }): Promise<{ success: boolean; signer?: KeyringSigner; error?: string }> {
    try {
      const { generateKeyRingId } = await import('./codename-generator');
      const codeName = generateKeyRingId(data.accountId);
      
      const signerData: KeyringSignerInsert = {
        account_type: 'hedera',
        account_id: data.accountId,
        public_key: data.publicKey || null,
        profile_topic_id: '',
        code_name: codeName,
        verification_status: data.reviewResult === 'GREEN' ? 'verified' : 'pending',
        verification_provider: 'sumsub',
        verification_date: new Date().toISOString(),
        sumsub_applicant_id: data.applicantId,
        sumsub_review_result: data.reviewResult,
        is_testnet: data.isTestnet ?? false,
      };

      const { data: signer, error } = await supabase
        .from('keyring_signers')
        .insert(signerData)
        .select()
        .single();

      if (error) {
        console.error('Database error registering incomplete signer:', error);
        return { success: false, error: error.message };
      }

      // Add registration reward (20 Keyring)
      await this.addReward(signer.id, 'onboarding', 20, 'KYRNG');

      console.log('Created incomplete signer record:', signer.id);
      return { success: true, signer };
    } catch (error: unknown) {
      console.error('Error registering incomplete signer:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Complete signer profile (update with public key and profile topic ID)
   */
  static async completeSignerProfile(signerId: string, data: {
    publicKey: string;
    profileTopicId: string;
    codeName: string;
  }): Promise<{ success: boolean; signer?: KeyringSigner; error?: string }> {
    try {
      const { error } = await supabase
        .from('keyring_signers')
        .update({
          public_key: data.publicKey,
          profile_topic_id: data.profileTopicId,
          code_name: data.codeName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', signerId);

      if (error) {
        console.error('Database error completing signer profile:', error);
        return { success: false, error: error.message };
      }

      // Get the updated signer data
      const updatedSigner = await this.getSignerById(signerId);
      return { success: true, signer: updatedSigner || undefined };
    } catch (error: unknown) {
      console.error('Error completing signer profile:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Find signer by ID
   */
  static async getSignerById(id: string): Promise<KeyringSigner | null> {
    try {
      const { data, error } = await supabase
        .from('keyring_signers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching signer by ID:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getSignerById:', error);
      return null;
    }
  }

  /**
   * Find signer by account ID
   */
  static async getSignerByAccountId(accountId: string): Promise<KeyringSigner | null> {
    try {
      const { data, error } = await supabase
        .from('keyring_signers')
        .select('*')
        .eq('account_id', accountId)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle 0 rows gracefully

      if (error) {
        console.error('Error fetching signer by account ID:', error);
        return null;
      }

      return data; // Will be null if no rows found
    } catch (error) {
      console.error('Error in getSignerByAccountId:', error);
      return null;
    }
  }

  /**
   * Find signer by public key hash
   */
  static async getSignerByPublicKey(publicKey: string): Promise<KeyringSigner | null> {
    try {
      const { data, error } = await supabase
        .from('keyring_signers')
        .select('*')
        .eq('public_key', publicKey)
        .single();

      if (error) {
        console.error('Error fetching signer by public key:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getSignerByPublicKey:', error);
      return null;
    }
  }

  /**
   * Get signer by wallet address (for Ethereum signers)
   */
  static async getSignerByWalletAddress(walletAddress: string): Promise<KeyringSigner | null> {
    try {
      const { data, error } = await supabase
        .from('keyring_signers')
        .select('*')
        .eq('wallet_address', walletAddress)
        .eq('account_type', 'ethereum')
        .single();

      if (error) {
        console.error('Error fetching signer by wallet address:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getSignerByWalletAddress:', error);
      return null;
    }
  }

  /**
   * Get all verified signers for threshold list creation
   */
  static async getVerifiedSigners(publicKeys: string[]): Promise<KeyringSigner[]> {
    try {
      const { data, error } = await supabase
        .from('keyring_signers')
        .select('*')
        .in('public_key', publicKeys)
        .eq('verification_status', 'verified');

      if (error) {
        console.error('Error fetching verified signers:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getVerifiedSigners:', error);
      return [];
    }
  }

  /**
   * Create a new project
   */
  static async createProject(data: {
    companyName: string;
    legalEntityName: string;
    publicRecordUrl?: string;
    owners?: string[];
    topicMessageId?: string;
  }): Promise<{ success: boolean; project?: KeyringProject; error?: string }> {
    try {
      const projectData: KeyringProjectInsert = {
        company_name: data.companyName,
        legal_entity_name: data.legalEntityName,
        public_record_url: data.publicRecordUrl || null,
        owners: data.owners || null,
        topic_message_id: data.topicMessageId || null,
      };

      const { data: project, error } = await supabase
        .from('keyring_projects')
        .insert(projectData)
        .select()
        .single();

      if (error) {
        console.error('Database error creating project:', error);
        return { success: false, error: error.message };
      }

      return { success: true, project };
    } catch (error: unknown) {
      console.error('Error creating project:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get project by ID
   */
  static async getProjectById(projectId: string): Promise<KeyringProject | null> {
    try {
      const { data, error } = await supabase
        .from('keyring_projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) {
        console.error('Error fetching project by ID:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getProjectById:', error);
      return null;
    }
  }

  /**
   * Get project by company name
   */
  static async getProjectByName(companyName: string): Promise<KeyringProject | null> {
    try {
      const { data, error } = await supabase
        .from('keyring_projects')
        .select('*')
        .eq('company_name', companyName)
        .maybeSingle();

      if (error) {
        console.error('Error fetching project by name:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getProjectByName:', error);
      return null;
    }
  }

  /**
   * Get all projects
   */
  static async getAllProjects(): Promise<KeyringProject[]> {
    try {
      const { data, error } = await supabase
        .from('keyring_projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching projects:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllProjects:', error);
      return [];
    }
  }

  /**
   * Update project
   */
  static async updateProject(projectId: string, updates: {
    companyName?: string;
    legalEntityName?: string;
    publicRecordUrl?: string;
    owners?: string[];
    topicMessageId?: string;
    adminThresholdAccountId?: string | null;
    migrationThresholdAccountId?: string | null;
    migrationScheduleId?: string | null;
  }): Promise<{ success: boolean; project?: KeyringProject; error?: string }> {
    try {
      const dbUpdates: Partial<Database['public']['Tables']['keyring_projects']['Update']> = {
        updated_at: new Date().toISOString(),
      };

      if (updates.companyName) dbUpdates.company_name = updates.companyName;
      if (updates.legalEntityName) dbUpdates.legal_entity_name = updates.legalEntityName;
      if (updates.publicRecordUrl !== undefined) dbUpdates.public_record_url = updates.publicRecordUrl || null;
      if (updates.owners !== undefined) dbUpdates.owners = updates.owners || null;
      if (updates.topicMessageId !== undefined) dbUpdates.topic_message_id = updates.topicMessageId || null;
      if (updates.adminThresholdAccountId !== undefined) dbUpdates.admin_threshold_account_id = updates.adminThresholdAccountId || null;
      if (updates.migrationThresholdAccountId !== undefined) dbUpdates.migration_threshold_account_id = updates.migrationThresholdAccountId || null;
      if (updates.migrationScheduleId !== undefined) dbUpdates.migration_schedule_id = updates.migrationScheduleId || null;

      const { data: project, error } = await supabase
        .from('keyring_projects')
        .update(dbUpdates)
        .eq('id', projectId)
        .select()
        .single();

      if (error) {
        console.error('Database error updating project:', error);
        return { success: false, error: error.message };
      }

      return { success: true, project };
    } catch (error: unknown) {
      console.error('Error updating project:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Register a new threshold list
   * Threshold and total signers are stored on-chain; we only track the account and HCS topic.
   */
  static async registerThresholdList(data: {
    projectId?: string | null;
    hcsTopicId: string;
    thresholdAccountId: string;
  }): Promise<{ success: boolean; list?: KeyringThresholdList; error?: string }> {
    try {
      const { data: list, error } = await supabase
        .from('keyring_threshold_lists')
        .insert({
          project_id: data.projectId || null,
          hcs_topic_id: data.hcsTopicId,
          threshold_account_id: data.thresholdAccountId,
        })
        .select()
        .single();

      if (error) {
        console.error('Database error registering threshold list:', error);
        return { success: false, error: error.message };
      }

      return { success: true, list };
    } catch (error: unknown) {
      console.error('Error registering threshold list:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Add KYC verification reward (100 Keyring) only if signer doesn't already have one.
   * Prevents double-adding when both store-verification and webhook fire.
   */
  static async addVerificationRewardIfNew(signerId: string, amount: number = 100, currency: string = 'KYRNG'): Promise<void> {
    const { rewards } = await this.getSignerRewards(signerId);
    const hasVerificationReward = rewards?.some(r => r.reward_type === 'onboarding' && r.amount >= 100 && r.currency === 'KYRNG') ?? false;
    if (!hasVerificationReward) {
      await this.addReward(signerId, 'onboarding', amount, currency);
    }
  }

  /**
   * Add a reward for a signer
   */
  static async addReward(
    signerId: string, 
    rewardType: 'onboarding' | 'list_addition' | 'transaction_review', 
    amount: number,
    currency: string = 'KYRNG',
    signatureTransactionId?: string,
    scheduleId?: string
  ): Promise<{ success: boolean; reward?: KeyringReward; error?: string }> {
    try {
      const { data: reward, error } = await supabase
        .from('keyring_rewards')
        .insert({
          signer_id: signerId,
          reward_type: rewardType,
          amount,
          currency,
          signature_transaction_id: signatureTransactionId || null,
          schedule_id: scheduleId || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Database error adding reward:', error);
        return { success: false, error: error.message };
      }

      return { success: true, reward };
    } catch (error: unknown) {
      console.error('Error adding reward:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get rewards for a signer
   */
  static async getSignerRewards(signerId: string): Promise<{ success: boolean; rewards?: KeyringReward[]; error?: string }> {
    try {
      const { data: rewards, error } = await supabase
        .from('keyring_rewards')
        .select('*')
        .eq('signer_id', signerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error fetching rewards:', error);
        return { success: false, error: error.message };
      }

      return { success: true, rewards: rewards || [] };
    } catch (error: unknown) {
      console.error('Error fetching rewards:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Update reward status (e.g., from 'pending' to 'paid')
   */
  static async updateRewardStatus(rewardId: string, status: 'pending' | 'paid'): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = { 
        status
      };
      
      // Set paid_at timestamp when marking as paid
      if (status === 'paid') {
        updateData.paid_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('keyring_rewards')
        .update(updateData)
        .eq('id', rewardId);

      if (error) {
        console.error('Database error updating reward status:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: unknown) {
      console.error('Error updating reward status:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get signer statistics
   */
  static async getSignerStats() {
    try {
      const { count: totalSigners } = await supabase
        .from('keyring_signers')
        .select('*', { count: 'exact', head: true });

      const { count: verifiedSigners } = await supabase
        .from('keyring_signers')
        .select('*', { count: 'exact', head: true })
        .eq('verification_status', 'verified');

      const { count: totalLists } = await supabase
        .from('keyring_threshold_lists')
        .select('*', { count: 'exact', head: true });

      return {
        totalSigners: totalSigners || 0,
        verifiedSigners: verifiedSigners || 0,
        totalLists: totalLists || 0,
      };
    } catch (error) {
      console.error('Error getting signer stats:', error);
      return {
        totalSigners: 0,
        verifiedSigners: 0,
        totalLists: 0,
      };
    }
  }

  /**
   * Check if an account is whitelisted
   */
  static async isAccountWhitelisted(accountId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('keyring_whitelist')
        .select('id')
        .eq('account_id', accountId)
        .eq('is_active', true)
        .single();

      if (error) {
        // If no record found, account is not whitelisted
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking whitelist:', error);
      return false;
    }
  }

  /**
   * Add account to whitelist
   */
  static async addToWhitelist(data: {
    accountId: string;
    addedBy?: string;
    reason?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const whitelistData: KeyringWhitelistInsert = {
        account_id: data.accountId,
        added_by: data.addedBy || 'system',
        reason: data.reason,
        is_active: true,
      };

      const { error } = await supabase
        .from('keyring_whitelist')
        .insert(whitelistData);

      if (error) {
        console.error('Database error adding to whitelist:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: unknown) {
      console.error('Error adding to whitelist:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Remove account from whitelist (deactivate)
   */
  static async removeFromWhitelist(accountId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('keyring_whitelist')
        .update({ is_active: false })
        .eq('account_id', accountId);

      if (error) {
        console.error('Database error removing from whitelist:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: unknown) {
      console.error('Error removing from whitelist:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get all whitelisted accounts
   */
  static async getWhitelistedAccounts(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('keyring_whitelist')
        .select('account_id')
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching whitelist:', error);
        return [];
      }

      return data?.map(item => item.account_id) || [];
    } catch (error) {
      console.error('Error in getWhitelistedAccounts:', error);
      return [];
    }
  }

  // Update signer verification status
  static async updateSignerVerification(signerId: string, updates: {
    verificationStatus?: 'pending' | 'verified' | 'suspended' | 'revoked';
    verificationProvider?: 'entrust' | 'sumsub';
    verificationDate?: string;
    uniqueId?: string;
    attestationHash?: string;
    sumsubApplicantId?: string;
    sumsubReviewResult?: 'GREEN' | 'RED' | 'YELLOW';
    verifiedName?: string;
    documentType?: string;
  }) {
    try {
      // Map camelCase parameters to snake_case database columns
      const dbUpdates: Partial<Database['public']['Tables']['keyring_signers']['Update']> = {
        updated_at: new Date().toISOString(),
      };
      
      if (updates.verificationStatus) dbUpdates.verification_status = updates.verificationStatus;
      if (updates.verificationProvider) dbUpdates.verification_provider = updates.verificationProvider;
      if (updates.verificationDate) dbUpdates.verification_date = updates.verificationDate;
      if (updates.uniqueId) dbUpdates.unique_id = updates.uniqueId;
      if (updates.attestationHash) dbUpdates.attestation_hash = updates.attestationHash;
      if (updates.sumsubApplicantId) dbUpdates.sumsub_applicant_id = updates.sumsubApplicantId;
      if (updates.sumsubReviewResult) dbUpdates.sumsub_review_result = updates.sumsubReviewResult;
      if (updates.verifiedName) dbUpdates.verified_name = updates.verifiedName;
      if (updates.documentType) dbUpdates.document_type = updates.documentType;

      const { data, error } = await supabase
        .from('keyring_signers')
        .update(dbUpdates)
        .eq('id', signerId)
        .select()
        .single();

      if (error) {
        console.error('Database error updating signer verification:', error);
        return { success: false, error: error.message };
      }

      return { success: true, signer: data };
    } catch (error) {
      console.error('Error updating signer verification:', error);
      return { success: false, error: 'Failed to update signer verification' };
    }
  }

}
