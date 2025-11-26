-- Allow staff to view all approved bookings (for availability checking)
CREATE POLICY "Staff can view approved bookings" ON room_bookings 
FOR SELECT 
USING (
  status = 'approved' OR 
  auth.uid() = user_id OR
  public.has_role(auth.uid(), 'leader') OR
  public.has_role(auth.uid(), 'admin')
);

-- Drop the old policies that are now redundant
DROP POLICY IF EXISTS "Users can view their own bookings" ON room_bookings;
DROP POLICY IF EXISTS "Leaders can view team bookings" ON room_bookings;
DROP POLICY IF EXISTS "Admins can view all bookings" ON room_bookings;

-- Ensure staff cannot view pending/rejected bookings unless they're the creator or admin
CREATE POLICY "Users can view their own pending bookings" ON room_bookings
FOR SELECT
USING (
  auth.uid() = user_id OR
  public.has_role(auth.uid(), 'leader') OR
  public.has_role(auth.uid(), 'admin')
);

-- Update the insert policy to ensure status is set correctly
CREATE POLICY "Users can only create pending bookings" ON room_bookings
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND 
  status = 'pending'
);

-- Allow admins and leaders to view all bookings for management
CREATE POLICY "Admins and leaders can manage all bookings" ON room_bookings
FOR SELECT
USING (
  public.has_role(auth.uid(), 'leader') OR 
  public.has_role(auth.uid(), 'admin')
);

-- Update policy for status changes
CREATE POLICY "Only leaders and admins can approve bookings" ON room_bookings
FOR UPDATE
USING (
  (public.has_role(auth.uid(), 'leader') OR public.has_role(auth.uid(), 'admin')) OR
  (auth.uid() = user_id AND status = 'pending')
)
WITH CHECK (
  (public.has_role(auth.uid(), 'leader') OR public.has_role(auth.uid(), 'admin')) OR
  (auth.uid() = user_id AND status = 'pending')
);
