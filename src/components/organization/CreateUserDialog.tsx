import { useState } from 'react';
// [FIXED] Sửa lỗi alias: Chuyển sang đường dẫn tương đối
import { supabase } from "../../integrations/supabase/client"; 
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserRole } from "@/lib/auth"; // Giả định kiểu UserRole có thể được import

interface CreateUserDialogProps {
  onUserCreated: () => void;
}

const ROLES: UserRole[] = ['staff', 'leader', 'admin'];

const CreateUserDialog = ({ onUserCreated }: CreateUserDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<UserRole>('staff'); // Mặc định là staff
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setRole('staff');
    setError(null);
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !firstName || !lastName) {
      setError("Email, Password, First Name, and Last Name are required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // BƯỚC 1: Tạo người dùng trong Auth và Profile (Sử dụng user_metadata cho tên)
      // Lưu ý: Việc tạo user bằng supabase.auth.signUp() tự động tạo user trong auth.users
      // và kích hoạt trigger (handle_new_user) để tạo profile và role (mặc định là staff).
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          }
        }
      });

      if (signUpError) {
        throw new Error(signUpError.message);
      }
      
      const newUserId = data.user?.id;
      
      // BƯỚC 2: Cập nhật Role nếu không phải là staff
      // Logic này cần chạy sau khi trigger đã tạo role mặc định là 'staff'
      if (newUserId && role !== 'staff') {
        // Cần đảm bảo RLS cho phép Admin sửa user_roles (đã được cấu hình trong DB)
        const { error: roleUpdateError } = await supabase
          .from('user_roles')
          .update({ role: role })
          .eq('user_id', newUserId);

        if (roleUpdateError) {
          // Chỉ log lỗi, không chặn luồng chính vì user đã được tạo
          // Thông báo lỗi cụ thể hơn nếu user không phải admin hoặc thiếu Service Role Key
          console.error("Failed to update role:", roleUpdateError);
        }
      }

      // Hoàn thành
      setIsOpen(false);
      resetForm();
      onUserCreated();
      
    } catch (err: any) {
      console.error("User Creation Error:", err);
      setError(`Failed to create user: ${err.message || 'Unknown error'}. Check RLS or email settings.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button onClick={() => setIsOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Create New User Account</DialogTitle>
          <DialogDescription>
            Create a new account for an employee and assign their initial role.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreateUser} className="grid gap-4 py-4">
          
          {error && (
            <div className="text-destructive text-sm p-2 border border-destructive/50 rounded bg-destructive/10">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name <span className="text-red-500">*</span></Label>
              <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={isLoading} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name <span className="text-red-500">*</span></Label>
              <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={isLoading} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Initial Password <span className="text-red-500">*</span></Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select onValueChange={(value: UserRole) => setRole(value)} value={role} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue placeholder="Select Role" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map(r => (
                  <SelectItem key={r} value={r} className="capitalize">
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateUserDialog;