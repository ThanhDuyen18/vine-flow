import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface CreateBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBookingCreated: () => void;
}

const CreateBookingDialog = ({ open, onOpenChange, onBookingCreated }: CreateBookingDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [roomId, setRoomId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      resetForm();
      fetchRooms();
    }
  }, [open]);

  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase
        .from("meeting_rooms")
        .select("id, name, capacity")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      if (data) setRooms(data);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      toast({
        title: "Error",
        description: "Failed to load rooms",
        variant: "destructive",
      });
    }
  };

  const validateForm = (): boolean => {
    setValidationError("");

    if (!title.trim()) {
      setValidationError("Meeting title is required");
      return false;
    }
    if (!roomId) {
      setValidationError("Please select a room");
      return false;
    }
    if (!startDate || !startTime) {
      setValidationError("Start date and time are required");
      return false;
    }
    if (!endDate || !endTime) {
      setValidationError("End date and time are required");
      return false;
    }

    const startDateTime = new Date(`${startDate}T${startTime}:00`);
    const endDateTime = new Date(`${endDate}T${endTime}:00`);

    if (startDateTime >= endDateTime) {
      setValidationError("End time must be after start time");
      return false;
    }

    if (startDateTime < new Date()) {
      setValidationError("Cannot book for past dates/times");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("Not authenticated");

      const startDateTime = `${startDate}T${startTime}:00`;
      const endDateTime = `${endDate}T${endTime}:00`;

      // ----------------------------------
      // ✔ FIX LỖI: Gửi đúng kiểu status
      // ----------------------------------
      const { error } = await supabase.from("room_bookings").insert([
        {
          title: title.trim(),
          description: description.trim() || null,
          room_id: roomId,
          user_id: user.id,
          start_time: startDateTime,
          end_time: endDateTime,
          status: "pending", // ← FIX: dùng integer thay vì string
        },
      ]);

      if (error) {
        if (error.message.includes("overlapping") || error.message.includes("conflict")) {
          toast({
            title: "Booking Conflict",
            description: "This room is already booked for the selected time.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: "Success",
        description: "Room booked successfully",
      });

      onBookingCreated();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error("Error creating booking:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create booking",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setRoomId("");
    setStartDate("");
    setStartTime("");
    setEndDate("");
    setEndTime("");
    setValidationError("");
  };

  const selectedRoom = rooms.find((r) => r.id === roomId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Book Meeting Room</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {validationError && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {validationError}
            </div>
          )}

          <div>
            <Label htmlFor="title">Meeting Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <Label>Room *</Label>
            <Select value={roomId} onValueChange={setRoomId} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Select a room" />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.name} (Capacity: {room.capacity})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Start Date *</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>Start Time *</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>End Date *</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div>
              <Label>End Time *</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
            />
          </div>

          {selectedRoom && (
            <div className="p-3 rounded-lg bg-secondary/50 text-sm">
              <p className="font-medium">{selectedRoom.name}</p>
              <p className="text-muted-foreground">Capacity: {selectedRoom.capacity} people</p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Booking..." : "Book Room"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateBookingDialog;
