export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          bug_id: string
          created_at: string
          id: string
          new_value: string | null
          old_value: string | null
          user_id: string
        }
        Insert: {
          action: string
          bug_id: string
          created_at?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          user_id: string
        }
        Update: {
          action?: string
          bug_id?: string
          created_at?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_bug_id_fkey"
            columns: ["bug_id"]
            isOneToOne: false
            referencedRelation: "bugs"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      attachments: {
        Row: {
          bug_id: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          user_id: string
        }
        Insert: {
          bug_id: string
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          user_id: string
        }
        Update: {
          bug_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_bug_id_fkey"
            columns: ["bug_id"]
            isOneToOne: false
            referencedRelation: "bugs"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_generation_jobs: {
        Row: {
          batch_id: string | null
          created_at: string
          error_detail: string | null
          id: string
          kind: string
          message: string
          processed: number
          progress_pct: number
          status: string
          total: number
          updated_at: string
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          error_detail?: string | null
          id?: string
          kind?: string
          message?: string
          processed?: number
          progress_pct?: number
          status?: string
          total?: number
          updated_at?: string
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          error_detail?: string | null
          id?: string
          kind?: string
          message?: string
          processed?: number
          progress_pct?: number
          status?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_generation_jobs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "test_creator_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_logs: {
        Row: {
          details: Json
          duration_ms: number
          errors_count: number
          id: string
          items_processed: number
          job_name: string
          run_at: string
        }
        Insert: {
          details?: Json
          duration_ms?: number
          errors_count?: number
          id?: string
          items_processed?: number
          job_name: string
          run_at?: string
        }
        Update: {
          details?: Json
          duration_ms?: number
          errors_count?: number
          id?: string
          items_processed?: number
          job_name?: string
          run_at?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          name: string
          owner_user_id: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          owner_user_id?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_user_id?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      bugs: {
        Row: {
          actual_behavior: string | null
          assignee_id: string | null
          created_at: string
          description: string
          environment: string | null
          expected_behavior: string | null
          id: string
          project_id: string | null
          reporter_id: string
          severity: Database["public"]["Enums"]["bug_severity"]
          sla_deadline: string | null
          status: Database["public"]["Enums"]["bug_status"]
          steps_to_reproduce: string | null
          title: string
          tracking_id: string
          updated_at: string
        }
        Insert: {
          actual_behavior?: string | null
          assignee_id?: string | null
          created_at?: string
          description?: string
          environment?: string | null
          expected_behavior?: string | null
          id?: string
          project_id?: string | null
          reporter_id: string
          severity?: Database["public"]["Enums"]["bug_severity"]
          sla_deadline?: string | null
          status?: Database["public"]["Enums"]["bug_status"]
          steps_to_reproduce?: string | null
          title: string
          tracking_id?: string
          updated_at?: string
        }
        Update: {
          actual_behavior?: string | null
          assignee_id?: string | null
          created_at?: string
          description?: string
          environment?: string | null
          expected_behavior?: string | null
          id?: string
          project_id?: string | null
          reporter_id?: string
          severity?: Database["public"]["Enums"]["bug_severity"]
          sla_deadline?: string | null
          status?: Database["public"]["Enums"]["bug_status"]
          steps_to_reproduce?: string | null
          title?: string
          tracking_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bugs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_participants: {
        Row: {
          campaign_id: string
          creator_id: string
          id: string
          joined_at: string
        }
        Insert: {
          campaign_id: string
          creator_id: string
          id?: string
          joined_at?: string
        }
        Update: {
          campaign_id?: string
          creator_id?: string
          id?: string
          joined_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_participants_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_test_assignments: {
        Row: {
          assigned_at: string
          campaign_id: string
          id: string
          scheduled_submit_at: string
          submission_id: string | null
          submission_status: string
          test_creator_id: string
        }
        Insert: {
          assigned_at?: string
          campaign_id: string
          id?: string
          scheduled_submit_at: string
          submission_id?: string | null
          submission_status?: string
          test_creator_id: string
        }
        Update: {
          assigned_at?: string
          campaign_id?: string
          id?: string
          scheduled_submit_at?: string
          submission_id?: string | null
          submission_status?: string
          test_creator_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_test_assignments_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_test_assignments_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "public_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_test_assignments_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_test_assignments_test_creator_id_fkey"
            columns: ["test_creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      campaigns: {
        Row: {
          allowed_niches_pages: string[] | null
          badges: string[]
          brand_id: string | null
          budget_remaining: number
          budget_total: number
          category: Database["public"]["Enums"]["campaign_category"]
          community_link: string | null
          content_requirements: string | null
          created_at: string
          description: string | null
          example_ads: string[] | null
          id: string
          instructions: string | null
          max_earnings_per_creator: number | null
          max_earnings_per_post: number | null
          max_submissions_per_account: number | null
          not_allowed: string[] | null
          payout_per_1m_views: number
          platforms: string[]
          requirements: Json | null
          requirements_allowed: string[] | null
          requirements_not_allowed: string[] | null
          song_link: string | null
          sounds: Json | null
          status: Database["public"]["Enums"]["campaign_status"]
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          allowed_niches_pages?: string[] | null
          badges?: string[]
          brand_id?: string | null
          budget_remaining?: number
          budget_total?: number
          category?: Database["public"]["Enums"]["campaign_category"]
          community_link?: string | null
          content_requirements?: string | null
          created_at?: string
          description?: string | null
          example_ads?: string[] | null
          id?: string
          instructions?: string | null
          max_earnings_per_creator?: number | null
          max_earnings_per_post?: number | null
          max_submissions_per_account?: number | null
          not_allowed?: string[] | null
          payout_per_1m_views?: number
          platforms?: string[]
          requirements?: Json | null
          requirements_allowed?: string[] | null
          requirements_not_allowed?: string[] | null
          song_link?: string | null
          sounds?: Json | null
          status?: Database["public"]["Enums"]["campaign_status"]
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          allowed_niches_pages?: string[] | null
          badges?: string[]
          brand_id?: string | null
          budget_remaining?: number
          budget_total?: number
          category?: Database["public"]["Enums"]["campaign_category"]
          community_link?: string | null
          content_requirements?: string | null
          created_at?: string
          description?: string | null
          example_ads?: string[] | null
          id?: string
          instructions?: string | null
          max_earnings_per_creator?: number | null
          max_earnings_per_post?: number | null
          max_submissions_per_account?: number | null
          not_allowed?: string[] | null
          payout_per_1m_views?: number
          platforms?: string[]
          requirements?: Json | null
          requirements_allowed?: string[] | null
          requirements_not_allowed?: string[] | null
          song_link?: string | null
          sounds?: Json | null
          status?: Database["public"]["Enums"]["campaign_status"]
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          bug_id: string
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bug_id: string
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bug_id?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_bug_id_fkey"
            columns: ["bug_id"]
            isOneToOne: false
            referencedRelation: "bugs"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          address: string | null
          company_logo_url: string | null
          company_name: string
          company_size: string | null
          company_website: string | null
          created_at: string
          id: string
          industry: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          company_logo_url?: string | null
          company_name?: string
          company_size?: string | null
          company_website?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          company_logo_url?: string | null
          company_name?: string
          company_size?: string | null
          company_website?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cookie_preferences: {
        Row: {
          analytics_enabled: boolean
          browser_key: string
          consent_accepted: boolean
          marketing_enabled: boolean
          updated_at: string
        }
        Insert: {
          analytics_enabled?: boolean
          browser_key: string
          consent_accepted?: boolean
          marketing_enabled?: boolean
          updated_at?: string
        }
        Update: {
          analytics_enabled?: boolean
          browser_key?: string
          consent_accepted?: boolean
          marketing_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      cosmetic_items: {
        Row: {
          created_at: string
          id: string
          image_url: string
          is_active: boolean
          name: string
          rank_reward_condition: Json | null
          type: Database["public"]["Enums"]["cosmetic_item_type"]
          unlock_type: Database["public"]["Enums"]["cosmetic_unlock_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          is_active?: boolean
          name: string
          rank_reward_condition?: Json | null
          type: Database["public"]["Enums"]["cosmetic_item_type"]
          unlock_type?: Database["public"]["Enums"]["cosmetic_unlock_type"]
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          is_active?: boolean
          name?: string
          rank_reward_condition?: Json | null
          type?: Database["public"]["Enums"]["cosmetic_item_type"]
          unlock_type?: Database["public"]["Enums"]["cosmetic_unlock_type"]
        }
        Relationships: []
      }
      creator_badge_overrides: {
        Row: {
          admin_note: string
          creator_id: string
          tier_order: number
          updated_at: string
        }
        Insert: {
          admin_note?: string
          creator_id: string
          tier_order: number
          updated_at?: string
        }
        Update: {
          admin_note?: string
          creator_id?: string
          tier_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_badge_overrides_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      creator_cosmetics: {
        Row: {
          cosmetic_id: string
          id: string
          unlocked_at: string
          unlocked_reason: string
          user_id: string
        }
        Insert: {
          cosmetic_id: string
          id?: string
          unlocked_at?: string
          unlocked_reason?: string
          user_id: string
        }
        Update: {
          cosmetic_id?: string
          id?: string
          unlocked_at?: string
          unlocked_reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_cosmetics_cosmetic_id_fkey"
            columns: ["cosmetic_id"]
            isOneToOne: false
            referencedRelation: "cosmetic_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_cosmetics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      creator_leaderboard_points: {
        Row: {
          month_bucket_start: string | null
          points_all_time: number
          points_month: number
          points_week: number
          updated_at: string
          user_id: string
          week_bucket_start: string | null
        }
        Insert: {
          month_bucket_start?: string | null
          points_all_time?: number
          points_month?: number
          points_week?: number
          updated_at?: string
          user_id: string
          week_bucket_start?: string | null
        }
        Update: {
          month_bucket_start?: string | null
          points_all_time?: number
          points_month?: number
          points_week?: number
          updated_at?: string
          user_id?: string
          week_bucket_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_leaderboard_points_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      creator_profile_settings: {
        Row: {
          equipped_avatar_id: string | null
          equipped_banner_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          equipped_avatar_id?: string | null
          equipped_banner_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          equipped_avatar_id?: string | null
          equipped_banner_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_profile_settings_equipped_avatar_id_fkey"
            columns: ["equipped_avatar_id"]
            isOneToOne: false
            referencedRelation: "cosmetic_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_profile_settings_equipped_banner_id_fkey"
            columns: ["equipped_banner_id"]
            isOneToOne: false
            referencedRelation: "cosmetic_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_profile_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      earnings: {
        Row: {
          amount: number
          created_at: string
          creator_id: string
          id: string
          notes: string | null
          submission_id: string | null
          type: Database["public"]["Enums"]["earning_type"]
        }
        Insert: {
          amount?: number
          created_at?: string
          creator_id: string
          id?: string
          notes?: string | null
          submission_id?: string | null
          type?: Database["public"]["Enums"]["earning_type"]
        }
        Update: {
          amount?: number
          created_at?: string
          creator_id?: string
          id?: string
          notes?: string | null
          submission_id?: string | null
          type?: Database["public"]["Enums"]["earning_type"]
        }
        Relationships: [
          {
            foreignKeyName: "earnings_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "public_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "earnings_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_creator_flags: {
        Row: {
          is_test_creator: boolean
          test_batch_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          is_test_creator?: boolean
          test_batch_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          is_test_creator?: boolean
          test_batch_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_creator_flags_test_batch_id_fkey"
            columns: ["test_batch_id"]
            isOneToOne: false
            referencedRelation: "test_creator_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_creator_flags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
        }
        Relationships: []
      }
      leaderboard_badge_tiers: {
        Row: {
          id: string
          perks: Json
          rank_from: number
          rank_to: number
          slug: string
          tier_order: number
          title: string
          updated_at: string
        }
        Insert: {
          id?: string
          perks?: Json
          rank_from: number
          rank_to: number
          slug: string
          tier_order: number
          title: string
          updated_at?: string
        }
        Update: {
          id?: string
          perks?: Json
          rank_from?: number
          rank_to?: number
          slug?: string
          tier_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          daily_digest: boolean
          email_on_assignment: boolean
          email_on_comment: boolean
          email_on_new_bug: boolean
          email_on_sla_breach: boolean
          email_on_status_change: boolean
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_digest?: boolean
          email_on_assignment?: boolean
          email_on_comment?: boolean
          email_on_new_bug?: boolean
          email_on_sla_breach?: boolean
          email_on_status_change?: boolean
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_digest?: boolean
          email_on_assignment?: boolean
          email_on_comment?: boolean
          email_on_new_bug?: boolean
          email_on_sla_breach?: boolean
          email_on_status_change?: boolean
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_rules: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          order: number
          rule_text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          order?: number
          rule_text?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          order?: number
          rule_text?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string
          category_specialty:
            | Database["public"]["Enums"]["campaign_category"]
            | null
          created_at: string
          creator_public_id: string | null
          full_name: string
          honor_score_override: number | null
          id: string
          job_title: string | null
          profile_hidden: boolean
          profile_slug: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string
          category_specialty?:
            | Database["public"]["Enums"]["campaign_category"]
            | null
          created_at?: string
          creator_public_id?: string | null
          full_name?: string
          honor_score_override?: number | null
          id?: string
          job_title?: string | null
          profile_hidden?: boolean
          profile_slug?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string
          category_specialty?:
            | Database["public"]["Enums"]["campaign_category"]
            | null
          created_at?: string
          creator_public_id?: string | null
          full_name?: string
          honor_score_override?: number | null
          id?: string
          job_title?: string | null
          profile_hidden?: boolean
          profile_slug?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          user_id: string
          uses_count: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          user_id: string
          uses_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          user_id?: string
          uses_count?: number
        }
        Relationships: []
      }
      referrals: {
        Row: {
          code: string
          commission_rate: number
          created_at: string
          id: string
          referred_user_id: string
          referrer_id: string
        }
        Insert: {
          code: string
          commission_rate?: number
          created_at?: string
          id?: string
          referred_user_id: string
          referrer_id: string
        }
        Update: {
          code?: string
          commission_rate?: number
          created_at?: string
          id?: string
          referred_user_id?: string
          referrer_id?: string
        }
        Relationships: []
      }
      social_accounts: {
        Row: {
          created_at: string
          handle: string
          id: string
          platform: Database["public"]["Enums"]["social_platform"]
          profile_url: string | null
          user_id: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          handle: string
          id?: string
          platform: Database["public"]["Enums"]["social_platform"]
          profile_url?: string | null
          user_id: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          handle?: string
          id?: string
          platform?: Database["public"]["Enums"]["social_platform"]
          profile_url?: string | null
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      submission_appeals: {
        Row: {
          admin_note: string
          created_at: string
          creator_id: string
          id: string
          message: string
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["submission_appeal_status"]
          submission_id: string
        }
        Insert: {
          admin_note?: string
          created_at?: string
          creator_id: string
          id?: string
          message: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["submission_appeal_status"]
          submission_id: string
        }
        Update: {
          admin_note?: string
          created_at?: string
          creator_id?: string
          id?: string
          message?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["submission_appeal_status"]
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_appeals_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "public_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_appeals_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          campaign_id: string
          created_at: string
          creator_id: string
          id: string
          is_test_submission: boolean
          manual_views: number
          platform: Database["public"]["Enums"]["social_platform"]
          post_url: string
          reject_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sim_view_cap: number | null
          status: Database["public"]["Enums"]["submission_status"]
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          creator_id: string
          id?: string
          is_test_submission?: boolean
          manual_views?: number
          platform: Database["public"]["Enums"]["social_platform"]
          post_url: string
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sim_view_cap?: number | null
          status?: Database["public"]["Enums"]["submission_status"]
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          creator_id?: string
          id?: string
          is_test_submission?: boolean
          manual_views?: number
          platform?: Database["public"]["Enums"]["social_platform"]
          post_url?: string
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sim_view_cap?: number | null
          status?: Database["public"]["Enums"]["submission_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          created_at: string
          description: string
          id: string
          internal_notes: string
          priority: Database["public"]["Enums"]["support_ticket_priority"]
          status: Database["public"]["Enums"]["support_ticket_status"]
          subject: string
          ticket_number: string | null
          type: Database["public"]["Enums"]["support_ticket_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          internal_notes?: string
          priority?: Database["public"]["Enums"]["support_ticket_priority"]
          status?: Database["public"]["Enums"]["support_ticket_status"]
          subject: string
          ticket_number?: string | null
          type?: Database["public"]["Enums"]["support_ticket_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          internal_notes?: string
          priority?: Database["public"]["Enums"]["support_ticket_priority"]
          status?: Database["public"]["Enums"]["support_ticket_status"]
          subject?: string
          ticket_number?: string | null
          type?: Database["public"]["Enums"]["support_ticket_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      test_creator_batches: {
        Row: {
          batch_name: string
          created_at: string
          creator_count: number
          id: string
          status: string
        }
        Insert: {
          batch_name: string
          created_at?: string
          creator_count?: number
          id?: string
          status?: string
        }
        Update: {
          batch_name?: string
          created_at?: string
          creator_count?: number
          id?: string
          status?: string
        }
        Relationships: []
      }
      ticket_attachments: {
        Row: {
          file_url: string
          id: string
          ticket_id: string
          uploaded_at: string
        }
        Insert: {
          file_url: string
          id?: string
          ticket_id: string
          uploaded_at?: string
        }
        Update: {
          file_url?: string
          id?: string
          ticket_id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          created_at: string
          id: string
          is_internal: boolean
          message: string
          sender_role: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_internal?: boolean
          message: string
          sender_role: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_internal?: boolean
          message?: string
          sender_role?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          amount: number
          created_at: string
          creator_id: string
          id: string
          method: Database["public"]["Enums"]["withdrawal_method"]
          notes: string | null
          payout_details: Json
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
        }
        Insert: {
          amount: number
          created_at?: string
          creator_id: string
          id?: string
          method: Database["public"]["Enums"]["withdrawal_method"]
          notes?: string | null
          payout_details?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
        }
        Update: {
          amount?: number
          created_at?: string
          creator_id?: string
          id?: string
          method?: Database["public"]["Enums"]["withdrawal_method"]
          notes?: string | null
          payout_details?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
        }
        Relationships: []
      }
    }
    Views: {
      public_campaign_creator_earnings: {
        Row: {
          amount: number | null
          campaign_id: string | null
          creator_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submissions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      public_campaign_participant_counts: {
        Row: {
          campaign_id: string | null
          participant_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_participants_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      public_creator_campaign_counts: {
        Row: {
          campaign_count: number | null
          creator_id: string | null
        }
        Relationships: []
      }
      public_creator_earnings: {
        Row: {
          creator_id: string | null
          lifetime_campaign_earnings: number | null
        }
        Relationships: []
      }
      public_creator_platforms: {
        Row: {
          platform: Database["public"]["Enums"]["social_platform"] | null
          user_id: string | null
        }
        Relationships: []
      }
      public_submissions: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          creator_id: string | null
          id: string | null
          is_test_submission: boolean | null
          manual_views: number | null
          platform: Database["public"]["Enums"]["social_platform"] | null
          status: Database["public"]["Enums"]["submission_status"] | null
          updated_at: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          creator_id?: string | null
          id?: string | null
          is_test_submission?: boolean | null
          manual_views?: number | null
          platform?: Database["public"]["Enums"]["social_platform"] | null
          status?: Database["public"]["Enums"]["submission_status"] | null
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          creator_id?: string | null
          id?: string | null
          is_test_submission?: boolean | null
          manual_views?: number | null
          platform?: Database["public"]["Enums"]["social_platform"] | null
          status?: Database["public"]["Enums"]["submission_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submissions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      alloc_creator_public_ids: { Args: { p_n: number }; Returns: string[] }
      automation_run_grow_manual: { Args: never; Returns: Json }
      automation_run_submissions_manual: { Args: never; Returns: Json }
      gen_random_alphanumeric: { Args: { p_len: number }; Returns: string }
      gen_random_digits: { Args: { p_len: number }; Returns: string }
      get_cookie_preferences: {
        Args: { p_browser_key: string }
        Returns: {
          analytics_enabled: boolean
          consent_accepted: boolean
          marketing_enabled: boolean
        }[]
      }
      get_team_members: {
        Args: never
        Returns: {
          avatar_url: string
          full_name: string
          job_title: string
          role: string
          user_id: string
        }[]
      }
      grant_rank_reward_cosmetics: {
        Args: { p_period: string; p_ref?: string }
        Returns: Json
      }
      grow_test_creator_views: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      process_scheduled_test_submissions: { Args: never; Returns: Json }
      sync_creator_leaderboard_points_delta: {
        Args: { p_delta_pts: number; p_user: string }
        Returns: undefined
      }
      upsert_cookie_preferences: {
        Args: {
          p_analytics: boolean
          p_browser_key: string
          p_consent_accepted: boolean
          p_marketing: boolean
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "brand" | "creator"
      bug_severity: "critical" | "high" | "medium" | "low"
      bug_status:
        | "new"
        | "assigned"
        | "in_progress"
        | "testing"
        | "resolved"
        | "closed"
      campaign_category:
        | "music"
        | "clipping"
        | "gaming"
        | "logo"
        | "ugc"
        | "other"
        | "anime"
      campaign_status: "draft" | "active" | "paused" | "ended"
      cosmetic_item_type: "avatar" | "banner"
      cosmetic_unlock_type: "default" | "rank_reward" | "admin_grant"
      earning_type: "campaign" | "referral"
      social_platform: "tiktok" | "instagram" | "youtube" | "x"
      submission_appeal_status: "pending" | "reviewed" | "closed"
      submission_status: "pending" | "approved" | "rejected"
      support_ticket_priority: "low" | "medium" | "high"
      support_ticket_status: "open" | "in_progress" | "resolved" | "closed"
      support_ticket_type:
        | "bug_report"
        | "payment_issue"
        | "campaign_dispute"
        | "account_issue"
        | "submission_issue"
        | "feature_request"
        | "other"
      withdrawal_method: "paypal" | "usdt" | "bank"
      withdrawal_status: "pending" | "approved" | "paid" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user", "brand", "creator"],
      bug_severity: ["critical", "high", "medium", "low"],
      bug_status: [
        "new",
        "assigned",
        "in_progress",
        "testing",
        "resolved",
        "closed",
      ],
      campaign_category: [
        "music",
        "clipping",
        "gaming",
        "logo",
        "ugc",
        "other",
        "anime",
      ],
      campaign_status: ["draft", "active", "paused", "ended"],
      cosmetic_item_type: ["avatar", "banner"],
      cosmetic_unlock_type: ["default", "rank_reward", "admin_grant"],
      earning_type: ["campaign", "referral"],
      social_platform: ["tiktok", "instagram", "youtube", "x"],
      submission_appeal_status: ["pending", "reviewed", "closed"],
      submission_status: ["pending", "approved", "rejected"],
      support_ticket_priority: ["low", "medium", "high"],
      support_ticket_status: ["open", "in_progress", "resolved", "closed"],
      support_ticket_type: [
        "bug_report",
        "payment_issue",
        "campaign_dispute",
        "account_issue",
        "submission_issue",
        "feature_request",
        "other",
      ],
      withdrawal_method: ["paypal", "usdt", "bank"],
      withdrawal_status: ["pending", "approved", "paid", "rejected"],
    },
  },
} as const
