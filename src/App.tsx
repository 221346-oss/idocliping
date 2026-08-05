import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleRoute } from "@/components/RoleRoute";
import { GeneralRulesGate } from "@/components/GeneralRulesGate";

import Auth from "./pages/Auth";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";
import Analytics from "./pages/Analytics";

// Admin (legacy bug tracker stays under /bugs and existing Dashboard becomes admin home)
import Dashboard from "./pages/Dashboard";
import BugCreate from "./pages/BugCreate";
import BugDetail from "./pages/BugDetail";
import BugList from "./pages/BugList";
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

// Creator

import CreatorMarketplace from "./pages/creator/CreatorMarketplace";
import CreatorCampaignDetail from "./pages/creator/CreatorCampaignDetail";
import CreatorSubmissions from "./pages/creator/CreatorSubmissions";
import CreatorWallet from "./pages/creator/CreatorWallet";
import CreatorTransactions from "./pages/creator/CreatorTransactions";
import CreatorReferrals from "./pages/creator/CreatorReferrals";
import CreatorSocial from "./pages/creator/CreatorSocial";
import CreatorLeaderboard from "./pages/creator/CreatorLeaderboard";
import CreatorProfile from "./pages/creator/CreatorProfile";
import CreatorProfileEdit from "./pages/creator/CreatorProfileEdit";
import CreatorSupportList from "./pages/creator/CreatorSupportList";
import CreatorSupportNew from "./pages/creator/CreatorSupportNew";
import CreatorSupportDetail from "./pages/creator/CreatorSupportDetail";


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
            <Routes>
              <Route path="/auth" element={<Auth />} />
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
              <Route path="/admin/badges" element={<RoleRoute roles={["admin"]}><AdminBadges /></RoleRoute>} />
              <Route path="/admin/submissions" element={<RoleRoute roles={["admin"]}><AdminSubmissions /></RoleRoute>} />
              <Route path="/admin/withdrawals" element={<RoleRoute roles={["admin"]}><AdminWithdrawals /></RoleRoute>} />
              <Route path="/admin/users" element={<RoleRoute roles={["admin"]}><AdminUsers /></RoleRoute>} />
              <Route path="/admin/tickets" element={<RoleRoute roles={["admin"]}><AdminTickets /></RoleRoute>} />
              <Route path="/admin/cosmetics" element={<RoleRoute roles={["admin"]}><AdminCosmetics /></RoleRoute>} />
              <Route path="/admin/creator-profiles" element={<RoleRoute roles={["admin"]}><AdminCreatorProfiles /></RoleRoute>} />
              <Route path="/analytics" element={<RoleRoute roles={["admin"]}><Analytics /></RoleRoute>} />

              {/* Bug tracker — admin-only internal tool */}
              <Route path="/bugs" element={<RoleRoute roles={["admin"]}><BugList /></RoleRoute>} />
              <Route path="/bugs/new" element={<RoleRoute roles={["admin"]}><BugCreate /></RoleRoute>} />
              <Route path="/bugs/:id" element={<RoleRoute roles={["admin"]}><BugDetail /></RoleRoute>} />

              {/* Creator */}
              <Route path="/creator" element={<RoleRoute roles={["creator", "user"]}><CreatorMarketplace /></RoleRoute>} />
              <Route path="/creator/campaigns" element={<RoleRoute roles={["creator", "user"]}><CreatorMarketplace /></RoleRoute>} />
              <Route path="/creator/campaigns/:id" element={<RoleRoute roles={["creator", "user"]}><CreatorCampaignDetail /></RoleRoute>} />
              <Route path="/creator/leaderboard" element={<RoleRoute roles={["creator", "user"]}><CreatorLeaderboard /></RoleRoute>} />
              <Route path="/creator/profile/me" element={<RoleRoute roles={["creator", "user"]}><CreatorProfile /></RoleRoute>} />
              <Route path="/creator/profile/edit" element={<RoleRoute roles={["creator", "user"]}><CreatorProfileEdit /></RoleRoute>} />
              <Route path="/creator/profile/:username" element={<ProtectedRoute><CreatorProfile /></ProtectedRoute>} />
              <Route path="/creator/submissions" element={<RoleRoute roles={["creator", "user"]}><CreatorSubmissions /></RoleRoute>} />
              <Route path="/creator/submissions/:campaignId" element={<RoleRoute roles={["creator", "user"]}><CreatorSubmissions /></RoleRoute>} />
              <Route path="/creator/wallet" element={<RoleRoute roles={["creator", "user"]}><CreatorWallet /></RoleRoute>} />
              <Route path="/creator/wallet/transactions" element={<RoleRoute roles={["creator", "user"]}><CreatorTransactions /></RoleRoute>} />
              <Route path="/creator/referrals" element={<RoleRoute roles={["creator", "user"]}><CreatorReferrals /></RoleRoute>} />
              <Route path="/creator/social" element={<RoleRoute roles={["creator", "user"]}><CreatorSocial /></RoleRoute>} />
              <Route path="/creator/support" element={<RoleRoute roles={["creator", "user"]}><CreatorSupportList /></RoleRoute>} />
              <Route path="/creator/support/new" element={<RoleRoute roles={["creator", "user"]}><CreatorSupportNew /></RoleRoute>} />
              <Route path="/creator/support/:id" element={<RoleRoute roles={["creator", "user"]}><CreatorSupportDetail /></RoleRoute>} />
              <Route path="/profile/me" element={<RoleRoute roles={["creator", "user"]}><CreatorProfile /></RoleRoute>} />
              <Route path="/profile/:username" element={<ProtectedRoute><CreatorProfile /></ProtectedRoute>} />

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
