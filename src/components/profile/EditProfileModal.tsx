import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CreatorProfile } from "@/lib/mockData";
import { useToast } from "@/hooks/use-toast";

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: CreatorProfile;
}

export function EditProfileModal({ open, onOpenChange, profile }: EditProfileModalProps) {
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio);
  const [selectedCosmetics, setSelectedCosmetics] = useState<Record<string, string>>({
    avatar_frame: profile.cosmetics.find(c => c.type === "avatar_frame" && c.equipped)?.id || "",
    badge: profile.cosmetics.find(c => c.type === "badge" && c.equipped)?.id || "",
    effect: profile.cosmetics.find(c => c.type === "effect" && c.equipped)?.id || "",
    title: profile.cosmetics.find(c => c.type === "title" && c.equipped)?.id || "",
  });

  const handleSave = () => {
    toast({
      title: "Profile Updated",
      description: "Your profile has been updated successfully.",
    });
    onOpenChange(false);
  };

  const cosmeticsByType = {
    avatar_frame: profile.cosmetics.filter(c => c.type === "avatar_frame"),
    badge: profile.cosmetics.filter(c => c.type === "badge"),
    effect: profile.cosmetics.filter(c => c.type === "effect"),
    title: profile.cosmetics.filter(c => c.type === "title"),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-slate-900 border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Profile</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-800">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="cosmetics">Cosmetics</TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Display Name</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="Your display name"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Bio</Label>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white resize-none"
                placeholder="Tell us about yourself"
                rows={4}
              />
              <p className="text-xs text-slate-500">{bio.length}/500 characters</p>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-white mb-3">Account Info</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Username</span>
                  <span className="text-white font-mono">@{profile.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Joined</span>
                  <span className="text-white">{profile.joinedDate.toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Level</span>
                  <span className="text-yellow-400 font-bold">{profile.level}</span>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Cosmetics Tab */}
          <TabsContent value="cosmetics" className="space-y-4 mt-4">
            <div className="space-y-4">
              {Object.entries(cosmeticsByType).map(([type, cosmetics]) => (
                <div key={type}>
                  <Label className="text-slate-300 capitalize mb-2 block">
                    {type.replace("_", " ")}
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setSelectedCosmetics({ ...selectedCosmetics, [type]: "" })}
                      className={`p-3 rounded-lg border-2 text-center transition-colors ${
                        !selectedCosmetics[type]
                          ? "border-yellow-500/50 bg-yellow-500/10"
                          : "border-slate-700 bg-slate-800 hover:border-slate-600"
                      }`}
                    >
                      <span className="text-xl">✨</span>
                      <p className="text-xs text-slate-400 mt-1">None</p>
                    </button>
                    {cosmetics.map((cosmetic) => (
                      <button
                        key={cosmetic.id}
                        onClick={() => setSelectedCosmetics({ ...selectedCosmetics, [type]: cosmetic.id })}
                        className={`p-3 rounded-lg border-2 text-center transition-colors ${
                          selectedCosmetics[type] === cosmetic.id
                            ? "border-yellow-500/50 bg-yellow-500/10"
                            : "border-slate-700 bg-slate-800 hover:border-slate-600"
                        }`}
                      >
                        <span className="text-xl">{cosmetic.icon}</span>
                        <p className="text-xs text-slate-400 mt-1">{cosmetic.name}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <p className="text-xs text-blue-400">
                💡 Tip: You can change equipped cosmetics anytime. Check the Achievements tab to unlock more!
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-slate-800">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-700 text-slate-300 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/40"
          >
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
