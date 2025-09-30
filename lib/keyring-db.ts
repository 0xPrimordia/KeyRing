import { supabase, generateSignerId } from './supabase';
import { Database } from './database.types';

type KeyringSigner = Database['public']['Tables']['keyring_signers']['Row'];
type KeyringSignerInsert = Database['public']['Tables']['keyring_signers']['Insert'];
type KeyringThresholdList = Database['public']['Tables']['keyring_threshold_lists']['Row'];
type KeyringReward = Database['public']['Tables']['keyring_rewards']['Row'];
type KeyringWhitelist = Database['public']['Tables']['keyring_whitelist']['Row'];
type KeyringWhitelistInsert = Database['public']['Tables']['keyring_whitelist']['Insert'];

export class KeyRingDB {
  
  /**
   * Register a new KeyRing signer
   */
  static async registerSigner(data: {
    accountId: string;
    publicKey: string;
    profileTopicId: string;
    codeName: string;
    verificationProvider?: 'entrust' | 'sumsub';
  }): Promise<{ success: boolean; signer?: KeyringSigner; error?: string }> {
    try {
      const signerData: KeyringSignerInsert = {
        account_id: data.accountId,
        public_key: data.publicKey,
        profile_topic_id: data.profileTopicId,
        code_name: data.codeName,
        verification_status: 'verified', // Auto-verify for MVP
        verification_provider: data.verificationProvider || 'entrust',
        verification_date: new Date().toISOString(),
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

      // Add onboarding reward
      await this.addReward(signer.id, 'onboarding', 10);

      return { success: true, signer };
    } catch (error: any) {
      console.error('Error registering signer:', error);
      return { success: false, error: error.message };
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
        .single();

      if (error) {
        console.error('Error fetching signer by account ID:', error);
        return null;
      }

      return data;
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
   * Register a new threshold list
   */
  static async registerThresholdList(data: {
    projectName: string;
    listTopicId: string;
    thresholdAccountId: string;
    requiredSignatures: number;
    totalSigners: number;
  }): Promise<{ success: boolean; list?: KeyringThresholdList; error?: string }> {
    try {
      const { data: list, error } = await supabase
        .from('keyring_threshold_lists')
        .insert({
          project_name: data.projectName,
          list_topic_id: data.listTopicId,
          threshold_account_id: data.thresholdAccountId,
          required_signatures: data.requiredSignatures,
          total_signers: data.totalSigners,
        })
        .select()
        .single();

      if (error) {
        console.error('Database error registering threshold list:', error);
        return { success: false, error: error.message };
      }

      return { success: true, list };
    } catch (error: any) {
      console.error('Error registering threshold list:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Add a reward for a signer
   */
  static async addReward(
    signerId: string, 
    rewardType: 'onboarding' | 'list_addition' | 'transaction_review', 
    amount: number,
    currency: string = 'LYNX'
  ): Promise<{ success: boolean; reward?: KeyringReward; error?: string }> {
    try {
      const { data: reward, error } = await supabase
        .from('keyring_rewards')
        .insert({
          signer_id: signerId,
          reward_type: rewardType,
          amount,
          currency,
        })
        .select()
        .single();

      if (error) {
        console.error('Database error adding reward:', error);
        return { success: false, error: error.message };
      }

      return { success: true, reward };
    } catch (error: any) {
      console.error('Error adding reward:', error);
      return { success: false, error: error.message };
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
    } catch (error: any) {
      console.error('Error adding to whitelist:', error);
      return { success: false, error: error.message };
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
    } catch (error: any) {
      console.error('Error removing from whitelist:', error);
      return { success: false, error: error.message };
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

}
