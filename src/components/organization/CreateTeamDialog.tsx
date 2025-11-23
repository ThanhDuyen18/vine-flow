import { useState, ReactNode } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
// [FIXED] Không cần import Plus nếu button trigger được truyền vào
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; 

// Props: Bổ sung children để nhận Button trigger
interface CreateTeamDialogProps {
  onTeamCreated: () => void;
  potentialLeaders: { id: string; name: string }[];
  children: ReactNode; // Button trigger
}

const CreateTeamDialog = ({ onTeamCreated, potentialLeaders, children }: CreateTeamDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  // [CHANGED] leaderId giờ đây được chọn từ dropdown
  const [selectedLeaderId, setSelectedLeaderId] = useState(''); 
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Team name is required.");
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Chuẩn bị dữ liệu
      const teamData = {
        name: name.trim(),
        description: description.trim() || null,
        // Sử dụng ID được chọn. Nếu là chuỗi rỗng (""), Supabase sẽ insert NULL, phù hợp với Foreign Key ON DELETE SET NULL
        leader_id: selectedLeaderId || null, 
      };

      const { error } = await supabase
        .from('teams')
        .insert([teamData]);

      if (error) {
        throw new Error(error.message);
      }

      // Đóng dialog, reset form, và gọi callback để làm mới danh sách
      setIsOpen(false);
      setName('');
      setDescription('');
      setSelectedLeaderId(''); // Reset leader ID
      onTeamCreated();
      
    } catch (err: any) {
      console.error("Creation Error:", err);
      setError(`Failed to create team: ${err.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild onClick={() => setIsOpen(true)}>
          {children} {/* Sử dụng children làm Button trigger */}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Team</DialogTitle>
          <DialogDescription>
            Enter the details for the new team or department.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreateTeam} className="grid gap-4 py-4">
          
          {error && (
            <div className="text-red-500 text-sm p-2 border border-red-300 rounded bg-red-50">
              {error}
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="name">Team Name <span className="text-red-500">*</span></Label>
            <Input
              id="name"
              placeholder="e.g., Engineering Alpha"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the team's focus"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          {/* Dropdown Select cho Leader */}
          <div className="grid gap-2">
            <Label htmlFor="leader">Team Leader (Optional)</Label>
            <Select onValueChange={setSelectedLeaderId} value={selectedLeaderId} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue placeholder={
                    potentialLeaders.length > 0 ? "Select a leader" : "No Admins/Leaders found"
                } />
              </SelectTrigger>
              <SelectContent>
                {/* Tùy chọn cho Leader NULL: value là chuỗi rỗng sẽ được xử lý thành null khi insert */}
                <SelectItem value="">-- None --</SelectItem>
                {potentialLeaders.map((leader) => (
                  <SelectItem key={leader.id} value={leader.id}>
                    {leader.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Save Team'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTeamDialog;
