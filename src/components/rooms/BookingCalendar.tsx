import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser } from "@/lib/auth";
import { UserRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import CreateBookingDialog from "./CreateBookingDialog";
import BookingDetailsDialog from "./BookingDetailsDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const BookingCalendar = ({ role }: { role: UserRole }) => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [creatorInfo, setCreatorInfo] = useState<Map<string, any>>(new Map());

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('room_bookings')
        .select('*')
        .gte('start_time', new Date().toISOString())
        .order('start_time');

      if (error) throw error;
      setBookings(data || []);

      if (data && data.length > 0) {
        const uniqueUserIds = [...new Set(data.map(b => b.user_id))];
        const { data: creatorData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url')
          .in('id', uniqueUserIds);

        if (creatorData) {
          const creatorMap = new Map();
          creatorData.forEach(creator => {
            creatorMap.set(creator.id, creator);
          });
          setCreatorInfo(creatorMap);
        }
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();

    const channel = supabase
      .channel('bookings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_bookings' }, () => {
        fetchBookings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return <div className="text-muted-foreground">Loading bookings...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Booking
        </Button>
      </div>

      <div className="grid gap-4">
        {bookings.map((booking) => (
          <Card key={booking.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{booking.title}</span>
                <Badge
                  variant={
                    booking.status === 'approved' ? 'default' :
                    booking.status === 'rejected' ? 'destructive' : 'secondary'
                  }
                >
                  {booking.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Start: </span>
                  <span className="font-medium">
                    {format(new Date(booking.start_time), 'MMM dd, yyyy HH:mm')}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">End: </span>
                  <span className="font-medium">
                    {format(new Date(booking.end_time), 'MMM dd, yyyy HH:mm')}
                  </span>
                </div>
              </div>
              {booking.description && (
                <p className="text-sm text-muted-foreground">{booking.description}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <CreateBookingDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onBookingCreated={fetchBookings}
      />
    </div>
  );
};

export default BookingCalendar;
