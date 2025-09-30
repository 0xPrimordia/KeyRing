# KeyRing Supabase Setup Guide

## 🚀 Quick Setup Steps

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for it to initialize (2-3 minutes)

### 2. Run Database Schema
1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase/schema.sql`
4. Click **Run** to create all tables and indexes

### 3. Get Your Credentials
1. Go to **Settings** → **API**
2. Copy your **Project URL** 
3. Copy your **service_role** key (not anon key!)

### 4. Add Environment Variables
Add these to your `.env.local` file:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### 5. Test Connection
Run the app and try registering a signer - it should now save to your Supabase database!

## 🔒 Security Notes

- **Service Role Key**: Gives full database access, keep it secret!
- **RLS Policies**: Already configured for public read access to verified signers
- **Data Privacy**: Public keys are hashed (SHA256) before storage

## 📊 Database Tables Created

- `keyring_signers` - Verified signers with hashed public keys
- `keyring_threshold_lists` - Certified threshold key lists  
- `keyring_list_memberships` - Signer ↔ List relationships
- `keyring_rewards` - Reward tracking (LYNX payments)

## 🔍 Viewing Data

Use the Supabase **Table Editor** to view and manage your KeyRing data:
- See registered signers
- Track threshold lists
- Monitor rewards
- Check verification status
