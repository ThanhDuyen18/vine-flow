import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser, getUserProfile } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface LeaveType {
  id: string;
  name: string;
  shift_options: string[];
  days_per_year: number;
}

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

const LeaveRequestForm = () => {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [selectedLeaveType, setSelectedLeaveType] = useState<LeaveType | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [shift, setShift] = useState("full");
  const [reason, setReason] = useState("");
  const [approverTo, setApproverTo] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) return;

        setCurrentUser(user);
        const profile = await getUserProfile(user.id);
        setUserProfile(profile);

        const { data: leaveTypeData } = await supabase
          .from('leave_types')
          .select('*')
          .eq('is_active', true)
          .order('name');

        if (leaveTypeData) {
          setLeaveTypes(leaveTypeData as LeaveType[]);
          if (leaveTypeData.length > 0) {
            setSelectedLeaveType(leaveTypeData[0]);
            const defaultShift = leaveTypeData[0].shift_options.includes('full') ? 'full' : leaveTypeData[0].shift_options[0];
            setShift(defaultShift);
          }
        }

        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .order('first_name');

        if (profileData) {
          setProfiles(profileData as Profile[]);
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };

    loadInitialData();
  }, []);

  const handleLeaveTypeChange = (leaveTypeId: string) => {
    const selected = leaveTypes.find(lt => lt.id === leaveTypeId);
    if (selected) {
      setSelectedLeaveType(selected);
      const defaultShift = selected.shift_options.includes('full') ? 'full' : selected.shift_options[0];
      setShift(defaultShift);
    }
  };

  const getAvailableShifts = () => {
    if (!selectedLeaveType) return [];
    return selectedLeaveType.shift_options;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedLeaveType) {
      toast({
        title: "Error",
        description: "Please select a leave type",
        variant: "destructive"
      });
      return;
    }

    if (!startDate || !endDate) {
      toast({
        title: "Error",
        description: "Please select both start and end dates",
        variant: "destructive"
      });
      return;
    }

    if (!approverTo) {
      toast({
        title: "Error",
        description: "Please select an approver",
        variant: "destructive"
      });
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast({
        title: "Error",
        description: "End date must be after start date",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      if (!currentUser) throw new Error("Not authenticated");

      const { error } = await supabase.from('leave_requests').insert([{
        user_id: currentUser.id,
        leave_type_id: selectedLeaveType.id,
        start_date: startDate,
        end_date: endDate,
        shift: shift,
        reason: reason || null,
        status: 'pending',
        approved_by: approverTo
      }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Leave request submitted successfully"
      });

      resetForm();
    } catch (error) {
      console.error('Error submitting leave request:', error);
      toast({
        title: "Error",
        description: "Failed to submit leave request",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStartDate("");
    setEndDate("");
    setShift("full");
    setReason("");
    setApproverTo("");
    if (leaveTypes.length > 0) {
      setSelectedLeaveType(leaveTypes[0]);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit Leave Request</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="leaveType">Leave Type *</Label>
            <Select 
              value={selectedLeaveType?.id || ""} 
              onValueChange={handleLeaveTypeChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {leaveTypes.map(lt => (
                  <SelectItem key={lt.id} value={lt.id}>
                    {lt.name} ({lt.days_per_year} days/year)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start">Start Date *</Label>
              <Input
                id="start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="end">End Date *</Label>
              <Input
                id="end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          {getAvailableShifts().length > 1 && (
            <div>
              <Label htmlFor="shift">Shift *</Label>
              <Select value={shift} onValueChange={setShift}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableShifts().map(s => (
                    <SelectItem key={s} value={s}>
                      {s === 'full' ? 'Full Day' : s === 'am' ? 'Morning (AM)' : 'Afternoon (PM)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="approver">Send Request To (Approver) *</Label>
            <Select value={approverTo} onValueChange={setApproverTo}>
              <SelectTrigger>
                <SelectValue placeholder="Select approver" />
              </SelectTrigger>
              <SelectContent>
                {profiles
                  .filter(p => p.id !== currentUser?.id)
                  .map(profile => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.first_name} {profile.last_name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">Select a leader or manager to approve your request</p>
          </div>

          <div>
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Optional: Provide reason for leave"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={resetForm} disabled={loading}>
              Clear
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default LeaveRequestForm;
