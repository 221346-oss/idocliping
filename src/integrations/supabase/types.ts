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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
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
      campaigns: {
        Row: {
          account_audience_requirements: Json | null
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
          discord_link: string | null
          example_ads: string[] | null
          id: string
          instructions: string | null
          max_earnings_per_creator: number | null
          max_earnings_per_post: number | null
          max_submissions_per_account: number | null
          max_submissions_per_day: number | null
          min_duration_seconds: number | null
          min_engagement_rate: number | null
          min_followers_per_account: number | null
          min_views_for_earnings: number | null
          not_allowed: string[] | null
          payout_per_1m_views: number
          platforms: string[]
          requirements: Json | null
          requirements_allowed: string[] | null
          requirements_not_allowed: string[] | null
          song_link: string | null
          sounds: Json | null
          status: string
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          account_audience_requirements?: Json | null
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
          discord_link?: string | null
          example_ads?: string[] | null
          id?: string
          instructions?: string | null
          max_earnings_per_creator?: number | null
          max_earnings_per_post?: number | null
          max_submissions_per_account?: number | null
          max_submissions_per_day?: number | null
          min_duration_seconds?: number | null
          min_engagement_rate?: number | null
          min_followers_per_account?: number | null
          min_views_for_earnings?: number | null
          not_allowed?: string[] | null
          payout_per_1m_views?: number
          platforms?: string[]
          requirements?: Json | null
          requirements_allowed?: string[] | null
          requirements_not_allowed?: string[] | null
          song_link?: string | null
          sounds?: Json | null
          status?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          account_audience_requirements?: Json | null
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
          discord_link?: string | null
          example_ads?: string[] | null
          id?: string
          instructions?: string | null
          max_earnings_per_creator?: number | null
          max_earnings_per_post?: number | null
          max_submissions_per_account?: number | null
          max_submissions_per_day?: number | null
          min_duration_seconds?: number | null
          min_engagement_rate?: number | null
          min_followers_per_account?: number | null
          min_views_for_earnings?: number | null
          not_allowed?: string[] | null
          payout_per_1m_views?: number
          platforms?: string[]
          requirements?: Json | null
          requirements_allowed?: string[] | null
          requirements_not_allowed?: string[] | null
          song_link?: string | null
          sounds?: Json | null
          status?: string
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
      earnings: {
        Row: {
          amount: number
          created_at: string
          creator_id: string
          id: string
          notes: string | null
          paid_at: string | null
          status: string
          submission_id: string | null
          type: Database["public"]["Enums"]["earning_type"]
        }
        Insert: {
          amount?: number
          created_at?: string
          creator_id: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          status?: string
          submission_id?: string | null
          type?: Database["public"]["Enums"]["earning_type"]
        }
        Update: {
          amount?: number
          created_at?: string
          creator_id?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          status?: string
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
          verification_code: string | null
          verification_note: string | null
          verification_requested_at: string | null
          verification_status: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          handle: string
          id?: string
          platform: Database["public"]["Enums"]["social_platform"]
          profile_url?: string | null
          user_id: string
          verification_code?: string | null
          verification_note?: string | null
          verification_requested_at?: string | null
          verification_status?: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          handle?: string
          id?: string
          platform?: Database["public"]["Enums"]["social_platform"]
          profile_url?: string | null
          user_id?: string
          verification_code?: string | null
          verification_note?: string | null
          verification_requested_at?: string | null
          verification_status?: string
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
          eligible_at: string | null
          eligible_views: number | null
          engagement_rate: number | null
          id: string
          manual_views: number
          next_refresh_at: string | null
          platform: Database["public"]["Enums"]["social_platform"]
          post_url: string
          reject_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          status_reason: string | null
          total_views: number | null
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          creator_id: string
          eligible_at?: string | null
          eligible_views?: number | null
          engagement_rate?: number | null
          id?: string
          manual_views?: number
          next_refresh_at?: string | null
          platform: Database["public"]["Enums"]["social_platform"]
          post_url: string
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          status_reason?: string | null
          total_views?: number | null
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          creator_id?: string
          eligible_at?: string | null
          eligible_views?: number | null
          engagement_rate?: number | null
          id?: string
          manual_views?: number
          next_refresh_at?: string | null
          platform?: Database["public"]["Enums"]["social_platform"]
          post_url?: string
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          status_reason?: string | null
          total_views?: number | null
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
      weekly_rewards: {
        Row: {
          created_at: string
          description: string
          id: string
          is_published: boolean
          prize_text: string
          title: string
          updated_at: string
          week_start: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          is_published?: boolean
          prize_text?: string
          title: string
          updated_at?: string
          week_start: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_published?: boolean
          prize_text?: string
          title?: string
          updated_at?: string
          week_start?: string
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
          manual_views: number | null
          platform: Database["public"]["Enums"]["social_platform"] | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          creator_id?: string | null
          id?: string | null
          manual_views?: number | null
          platform?: Database["public"]["Enums"]["social_platform"] | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          creator_id?: string | null
          id?: string | null
          manual_views?: number | null
          platform?: Database["public"]["Enums"]["social_platform"] | null
          status?: string | null
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
      admin_payout_campaign: { Args: { p_campaign_id: string }; Returns: Json }
      admin_update_submission_views: {
        Args: { p_submission_id: string; p_views: number }
        Returns: Json
      }
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
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
      withdrawal_method:
        | "paypal"
        | "usdt"
        | "bank"
        | "amazon_giftcard"
        | "visa_prepaid"
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
      withdrawal_method: [
        "paypal",
        "usdt",
        "bank",
        "amazon_giftcard",
        "visa_prepaid",
      ],
      withdrawal_status: ["pending", "approved", "paid", "rejected"],
    },
  },
} as const
