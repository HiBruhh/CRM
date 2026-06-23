-- Enable RLS on notifications table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own notifications
CREATE POLICY "Users can read own notifications"
ON notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON notifications
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON notifications
FOR DELETE
USING (auth.uid() = user_id);

-- Policy: Authenticated users can update notifications (more permissive for debugging)
CREATE POLICY "Authenticated users can update notifications"
ON notifications
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy: Service role can insert notifications (for triggers)
CREATE POLICY "Service role can insert notifications"
ON notifications
FOR INSERT
TO service_role
WITH CHECK (true);

-- Policy: Service role can update notifications
CREATE POLICY "Service role can update notifications"
ON notifications
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Service role can delete notifications
CREATE POLICY "Service role can delete notifications"
ON notifications
FOR DELETE
TO service_role
USING (true);

-- Policy: Admin can insert notifications
CREATE POLICY "Admin can insert notifications"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- Policy: Admin can update notifications
CREATE POLICY "Admin can update notifications"
ON notifications
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- Policy: Admin can delete notifications
CREATE POLICY "Admin can delete notifications"
ON notifications
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);
