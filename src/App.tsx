import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleRoute } from "@/components/RoleRoute";
import { GeneralRulesGate } from "@/components/GeneralRulesGate";
import { UsernameGate } from "@/components/auth/UsernameGate";

import Auth from "./pages/Auth";
import OnboardingUsername from "./pages/OnboardingUsername";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { TermsPage, PrivacyPage, DoNotSellPage } from "./pages/Legal";
import Settings from "./pages/Settings";
import Analytics from "./pages/Analytics";


// Admin
import Dashboard from "./pages/Dashboard";
import AdminBrands from "./pages/admin/AdminBrands";
import AdminCampaigns from "./pages/admin/AdminCampaigns";
import AdminRulesManager from "./pages/admin/AdminRulesManager";
import AdminBadges from "./pages/admin/AdminBadges";
import AdminSubmissions from "./pages/admin/AdminSubmissions";
import AdminWithdrawals from "./pages/admin/AdminWithdrawals";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminTickets from "./pages/admin/AdminTickets";
import AdminCosmetics from "./pages/admin/AdminCosmetics";
import AdminCreatorProfiles from "./pages/admin/AdminCreatorProfiles";
import AdminAutomationLab from "./pages/admin/AdminAutomationLab";
import AdminCampaignDetail from "./pages/admin/AdminCampaignDetail";
import AdminRewards from "./pages/admin/AdminRewards";

// Creator
import Rewards from "./pages/creator/Rewards";
import Discover from "./pages/creator/Discover";
import CampaignDetail from "./pages/creator/CampaignDetail";
import SubmissionReport from "./pages/creator/SubmissionReport";
import Activity from "./pages/creator/Activity";
import Wallet from "./pages/creator/Wallet";
import Transactions from "./pages/creator/Transactions";
import Referrals from "./pages/creator/Referrals";
import Accounts from "./pages/creator/Accounts";
import Leaderboard from "./pages/creator/Leaderboard";
import Profile from "./pages/creator/Profile";
import ProfileEdit from "./pages/creator/ProfileEdit";
import Support from "./pages/creator/Support";
import SupportNew from "./pages/creator/SupportNew";
import SupportDetail from "./pages/creator/SupportDetail";



// Brand
import BrandDashboard from "./pages/brand/BrandDashboard";
import BrandCampaigns from "./pages/brand/BrandCampaigns";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <GeneralRulesGate />
            <UsernameGate />
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/onboarding/username" element={<ProtectedRoute><OnboardingUsername /></ProtectedRoute>} />
              <Route path="/" element={<Index />} />


              {/* Shared (any signed-in role) */}
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

              {/* Admin */}
              <Route path="/admin" element={<RoleRoute roles={["admin"]}><Dashboard /></RoleRoute>} />
              <Route path="/admin/brands" element={<RoleRoute roles={["admin"]}><AdminBrands /></RoleRoute>} />
              <Route path="/admin/campaigns" element={<RoleRoute roles={["admin"]}><AdminCampaigns /></RoleRoute>} />
              <Route path="/admin/campaigns/:id" element={<RoleRoute roles={["admin"]}><AdminCampaignDetail /></RoleRoute>} />
              <Route path="/admin/automation-lab" element={<RoleRoute roles={["admin"]}><AdminAutomationLab /></RoleRoute>} />
              <Route path="/admin/rules" element={<RoleRoute roles={["admin"]}><AdminRulesManager /></RoleRoute>} />
              <Route path="/admin/rewards" element={<RoleRoute roles={["admin"]}><AdminRewards /></RoleRoute>} />
              <Route path="/admin/badges" element={<RoleRoute roles={["admin"]}><AdminBadges /></RoleRoute>} />
              <Route path="/admin/submissions" element={<RoleRoute roles={["admin"]}><AdminSubmissions /></RoleRoute>} />
              <Route path="/admin/withdrawals" element={<RoleRoute roles={["admin"]}><AdminWithdrawals /></RoleRoute>} />
              <Route path="/admin/users" element={<RoleRoute roles={["admin"]}><AdminUsers /></RoleRoute>} />
              <Route path="/admin/tickets" element={<RoleRoute roles={["admin"]}><AdminTickets /></RoleRoute>} />
              <Route path="/admin/cosmetics" element={<RoleRoute roles={["admin"]}><AdminCosmetics /></RoleRoute>} />
              <Route path="/admin/creator-profiles" element={<RoleRoute roles={["admin"]}><AdminCreatorProfiles /></RoleRoute>} />
              <Route path="/analytics" element={<RoleRoute roles={["admin"]}><Analytics /></RoleRoute>} />

              {/* Creator */}
              <Route path="/discover" element={<RoleRoute roles={["creator", "user"]}><Discover /></RoleRoute>} />
              <Route path="/campaigns/:id" element={<RoleRoute roles={["creator", "user"]}><CampaignDetail /></RoleRoute>} />
              <Route path="/activity" element={<RoleRoute roles={["creator", "user"]}><Activity /></RoleRoute>} />
              <Route path="/activity/:campaignId" element={<RoleRoute roles={["creator", "user"]}><Activity /></RoleRoute>} />
              <Route path="/submissions/:id" element={<RoleRoute roles={["creator", "user"]}><SubmissionReport /></RoleRoute>} />
              <Route path="/wallet" element={<RoleRoute roles={["creator", "user"]}><Wallet /></RoleRoute>} />
              <Route path="/wallet/transactions" element={<RoleRoute roles={["creator", "user"]}><Transactions /></RoleRoute>} />
              <Route path="/rewards" element={<RoleRoute roles={["creator", "user"]}><Rewards /></RoleRoute>} />
              <Route path="/leaderboard" element={<RoleRoute roles={["creator", "user"]}><Leaderboard /></RoleRoute>} />
              <Route path="/referrals" element={<RoleRoute roles={["creator", "user"]}><Referrals /></RoleRoute>} />
              <Route path="/accounts" element={<RoleRoute roles={["creator", "user"]}><Accounts /></RoleRoute>} />
              <Route path="/support" element={<RoleRoute roles={["creator", "user"]}><Support /></RoleRoute>} />
              <Route path="/support/new" element={<RoleRoute roles={["creator", "user"]}><SupportNew /></RoleRoute>} />
              <Route path="/support/:id" element={<RoleRoute roles={["creator", "user"]}><SupportDetail /></RoleRoute>} />
              <Route path="/profile" element={<RoleRoute roles={["creator", "user"]}><Profile /></RoleRoute>} />
              <Route path="/profile/edit" element={<RoleRoute roles={["creator", "user"]}><ProfileEdit /></RoleRoute>} />
              <Route path="/u/:username" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

              {/* Legal */}
              <Route path="/legal/terms" element={<TermsPage />} />
              <Route path="/legal/privacy" element={<PrivacyPage />} />
              <Route path="/legal/do-not-sell" element={<DoNotSellPage />} />

              {/* Legacy path redirects */}
              <Route path="/creator" element={<Navigate to="/discover" replace />} />
              <Route path="/creator/campaigns" element={<Navigate to="/discover" replace />} />
              <Route path="/creator/wallet" element={<Navigate to="/wallet" replace />} />
              <Route path="/creator/submissions" element={<Navigate to="/activity" replace />} />
              <Route path="/creator/profile/me" element={<Navigate to="/profile" replace />} />
              <Route path="/profile/me" element={<Navigate to="/profile" replace />} />


              {/* Brand */}
              <Route path="/brand" element={<RoleRoute roles={["brand"]}><BrandDashboard /></RoleRoute>} />
              <Route path="/brand/campaigns" element={<RoleRoute roles={["brand"]}><BrandCampaigns /></RoleRoute>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
