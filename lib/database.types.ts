export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      keyring_signers: {
        Row: {
          id: string
          account_type: 'hedera' | 'ethereum'
          account_id: string | null
          wallet_address: string | null
          public_key: string | null
          profile_topic_id: string | null
          code_name: string
          verification_status: 'pending' | 'verified' | 'suspended' | 'revoked'
          verification_provider: 'entrust' | 'sumsub'
          verification_date: string | null
          unique_id: string | null
          attestation_hash: string | null
          sumsub_applicant_id: string | null
          sumsub_review_result: 'GREEN' | 'RED' | 'YELLOW' | null
          verified_name: string | null
          document_type: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          account_type: 'hedera' | 'ethereum'
          account_id?: string | null
          wallet_address?: string | null
          public_key?: string | null
          profile_topic_id?: string | null
          code_name: string
          verification_status?: 'pending' | 'verified' | 'suspended' | 'revoked'
          verification_provider?: 'entrust' | 'sumsub'
          verification_date?: string | null
          unique_id?: string | null
          attestation_hash?: string | null
          sumsub_applicant_id?: string | null
          sumsub_review_result?: 'GREEN' | 'RED' | 'YELLOW' | null
          verified_name?: string | null
          document_type?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          account_type?: 'hedera' | 'ethereum'
          account_id?: string | null
          wallet_address?: string | null
          public_key?: string | null
          profile_topic_id?: string | null
          code_name?: string
          verification_status?: 'pending' | 'verified' | 'suspended' | 'revoked'
          verification_provider?: 'entrust' | 'sumsub'
          verification_date?: string | null
          unique_id?: string | null
          attestation_hash?: string | null
          sumsub_applicant_id?: string | null
          sumsub_review_result?: 'GREEN' | 'RED' | 'YELLOW' | null
          verified_name?: string | null
          document_type?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      keyring_projects: {
        Row: {
          id: string
          company_name: string
          legal_entity_name: string
          public_record_url: string | null
          owners: string[] | null
          topic_message_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_name: string
          legal_entity_name: string
          public_record_url?: string | null
          owners?: string[] | null
          topic_message_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_name?: string
          legal_entity_name?: string
          public_record_url?: string | null
          owners?: string[] | null
          topic_message_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      keyring_threshold_lists: {
        Row: {
          id: string
          project_id: string
          list_topic_id: string
          threshold_account_id: string
          required_signatures: number
          total_signers: number
          status: 'active' | 'inactive' | 'suspended'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          list_topic_id: string
          threshold_account_id: string
          required_signatures: number
          total_signers: number
          status?: 'active' | 'inactive' | 'suspended'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          list_topic_id?: string
          threshold_account_id?: string
          required_signatures?: number
          total_signers?: number
          status?: 'active' | 'inactive' | 'suspended'
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "keyring_threshold_lists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "keyring_projects"
            referencedColumns: ["id"]
          }
        ]
      }
      keyring_list_memberships: {
        Row: {
          id: string
          signer_id: string
          list_id: string
          status: 'active' | 'inactive' | 'removed'
          added_at: string
          removed_at: string | null
        }
        Insert: {
          id?: string
          signer_id: string
          list_id: string
          status?: 'active' | 'inactive' | 'removed'
          added_at?: string
          removed_at?: string | null
        }
        Update: {
          id?: string
          signer_id?: string
          list_id?: string
          status?: 'active' | 'inactive' | 'removed'
          added_at?: string
          removed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "keyring_list_memberships_signer_id_fkey"
            columns: ["signer_id"]
            isOneToOne: false
            referencedRelation: "keyring_signers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "keyring_list_memberships_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "keyring_threshold_lists"
            referencedColumns: ["id"]
          }
        ]
      }
      keyring_rewards: {
        Row: {
          id: string
          signer_id: string
          reward_type: 'onboarding' | 'list_addition' | 'transaction_review'
          amount: number
          currency: string
          transaction_id: string | null
          status: 'pending' | 'paid' | 'failed'
          created_at: string
          paid_at: string | null
        }
        Insert: {
          id?: string
          signer_id: string
          reward_type: 'onboarding' | 'list_addition' | 'transaction_review'
          amount: number
          currency?: string
          transaction_id?: string | null
          status?: 'pending' | 'paid' | 'failed'
          created_at?: string
          paid_at?: string | null
        }
        Update: {
          id?: string
          signer_id?: string
          reward_type?: 'onboarding' | 'list_addition' | 'transaction_review'
          amount?: number
          currency?: string
          transaction_id?: string | null
          status?: 'pending' | 'paid' | 'failed'
          created_at?: string
          paid_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "keyring_rewards_signer_id_fkey"
            columns: ["signer_id"]
            isOneToOne: false
            referencedRelation: "keyring_signers"
            referencedColumns: ["id"]
          }
        ]
      }
      keyring_whitelist: {
        Row: {
          id: string
          account_id: string
          added_by: string | null
          reason: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          account_id: string
          added_by?: string | null
          reason?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          added_by?: string | null
          reason?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
