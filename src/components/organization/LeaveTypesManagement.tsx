import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LeaveType {
  id: string;
  name: string;
  description: string | null;
  shift_options: string[];
  is_active: boolean;
  requires_approval: boolean;
  days_per_year: number;
  created_at: string;
}

const LeaveTypesManagement = () => {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedLeaveType, setSelectedLeaveType] = useState<LeaveType | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    days_per_year: "1",
    requires_approval: true,
    shift_options: ["full"] as string[]
  });

  useEffect(() => {
    fetchLeaveTypes();
  }, []);

  const fetchLeaveTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('leave_types')
        .select('*')
        .order('name');

      if (error) throw error;
      setLeaveTypes((data || []) as LeaveType[]);
    } catch (error) {
      console.error('Error fetching leave types:', error);
      toast({
        title: "Error",
        description: "Failed to load leave types",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShiftChange = (shift: string) => {
    setFormData(prev => ({
      ...prev,
      shift_options: prev.shift_options.includes(shift)
        ? prev.shift_options.filter(s => s !== shift)
        : [...prev.shift_options, shift]
    }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Leave type name is required",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from('leave_types')
          .update({
            name: formData.name,
            description: formData.description || null,
            days_per_year: parseFloat(formData.days_per_year),
            requires_approval: formData.requires_approval,
            shift_options: formData.shift_options,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingId);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Leave type updated successfully"
        });
      } else {
        const { error } = await supabase
          .from('leave_types')
          .insert([{
            name: formData.name,
            description: formData.description || null,
            days_per_year: parseFloat(formData.days_per_year),
            requires_approval: formData.requires_approval,
            shift_options: formData.shift_options
          }]);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Leave type created successfully"
        });
      }

      resetForm();
      setIsCreateDialogOpen(false);
      fetchLeaveTypes();
    } catch (error) {
      console.error('Error saving leave type:', error);
      toast({
        title: "Error",
        description: editingId ? "Failed to update leave type" : "Failed to create leave type",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedLeaveType) return;

    try {
      const { error } = await supabase
        .from('leave_types')
        .delete()
        .eq('id', selectedLeaveType.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Leave type deleted successfully"
      });

      setIsDeleteDialogOpen(false);
      setSelectedLeaveType(null);
      fetchLeaveTypes();
    } catch (error) {
      console.error('Error deleting leave type:', error);
      toast({
        title: "Error",
        description: "Failed to delete leave type",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (leaveType: LeaveType) => {
    setEditingId(leaveType.id);
    setFormData({
      name: leaveType.name,
      description: leaveType.description || "",
      days_per_year: leaveType.days_per_year.toString(),
      requires_approval: leaveType.requires_approval,
      shift_options: leaveType.shift_options
    });
    setIsCreateDialogOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: "",
      description: "",
      days_per_year: "1",
      requires_approval: true,
      shift_options: ["full"]
    });
  };

  const handleOpenCreateDialog = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading leave types...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Leave Types</h3>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Leave Type
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit" : "Create"} Leave Type</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Leave Type Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Annual Leave"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe this leave type"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="days">Days Per Year *</Label>
                <Input
                  id="days"
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.days_per_year}
                  onChange={(e) => setFormData(prev => ({ ...prev, days_per_year: e.target.value }))}
                  placeholder="e.g., 12"
                />
              </div>

              <div>
                <Label className="mb-3 block">Shift Options</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="full"
                      checked={formData.shift_options.includes("full")}
                      onCheckedChange={() => handleShiftChange("full")}
                    />
                    <Label htmlFor="full" className="font-normal cursor-pointer">Full Day</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="am"
                      checked={formData.shift_options.includes("am")}
                      onCheckedChange={() => handleShiftChange("am")}
                    />
                    <Label htmlFor="am" className="font-normal cursor-pointer">Morning (AM)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="pm"
                      checked={formData.shift_options.includes("pm")}
                      onCheckedChange={() => handleShiftChange("pm")}
                    />
                    <Label htmlFor="pm" className="font-normal cursor-pointer">Afternoon (PM)</Label>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="approval"
                  checked={formData.requires_approval}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requires_approval: checked as boolean }))}
                />
                <Label htmlFor="approval" className="font-normal cursor-pointer">Requires Approval</Label>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  {editingId ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Days/Year</TableHead>
              <TableHead>Shift Options</TableHead>
              <TableHead>Requires Approval</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaveTypes.map((leaveType) => (
              <TableRow key={leaveType.id}>
                <TableCell className="font-medium">{leaveType.name}</TableCell>
                <TableCell>{leaveType.days_per_year}</TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {leaveType.shift_options.map(shift => (
                      <Badge key={shift} variant="secondary" className="capitalize">
                        {shift === "full" ? "Full Day" : shift === "am" ? "AM" : "PM"}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  {leaveType.requires_approval ? (
                    <Badge variant="default">Yes</Badge>
                  ) : (
                    <Badge variant="secondary">No</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {leaveType.is_active ? (
                    <Badge variant="default" className="bg-green-600">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(leaveType)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setSelectedLeaveType(leaveType);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Leave Type?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{selectedLeaveType?.name}"? This action cannot be undone.
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LeaveTypesManagement;
