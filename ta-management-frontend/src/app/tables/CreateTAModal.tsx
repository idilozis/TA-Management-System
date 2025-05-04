// components/CreateTAModal.tsx
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import apiClient from "@/lib/axiosClient";

interface CreateTAModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  user: {
    isAuth: boolean;
    role: string;
  };
}

export default function CreateTAModal({
  open,
  onOpenChange,
  onSuccess,
  user,
}: CreateTAModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [staffOptions, setStaffOptions] = useState<
    { label: string; value: string }[]
  >([]);

  const [formData, setFormData] = useState({
    name: "",
    surname: "",
    student_id: "",
    tc_no: "",
    email: "",
    program: "MS",
    ta_type: "FT",
    advisor: "",
    phone: "",
    iban: "",
  });

  // 1) Fetch staff list for Advisor dropdown
  useEffect(() => {
    apiClient
      .get("/list/staff/")
      .then((res) => {
        if (res.data.status === "success") {
          const opts = res.data.staff.map((s: any) => ({
            label: `${s.name} ${s.surname}`,
            value: `${s.name} ${s.surname}`,
          }));
          setStaffOptions(opts);
        } else {
          console.warn("Could not load staff list:", res.data.message);
        }
      })
      .catch((err) => {
        console.error("Error fetching staff:", err);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // authorization guard
    if (!user.isAuth || user.role !== "ADMIN") {
      setError("You are not authorized to perform this action");
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post("/list/create-ta/", formData);
      if (res.data.status === "success") {
        onSuccess();
        onOpenChange(false);
      } else {
        setError(res.data.message || "Failed to create TA");
      }
    } catch (err: any) {
      if (err.response) {
        const msg = err.response.data?.message;
        switch (err.response.status) {
          case 400:
            setError(`Validation error: ${msg || "Check your input"}`);
            break;
          case 401:
            setError("Not authenticated. Please log in again.");
            break;
          case 409:
            setError(`Duplicate entry: ${msg || "This TA already exists"}`);
            break;
          default:
            setError(`Server error (${err.response.status}): ${msg}`);
        }
      } else if (err.request) {
        setError("No response from server. Please check your connection.");
      } else {
        setError(`Request error: ${err.message}`);
      }
      console.error("Detailed error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Teaching Assistant</DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name / Surname */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">First Name <span className="text-red-600">*</span></Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="surname">Last Name <span className="text-red-600">*</span></Label>
              <Input
                id="surname"
                required
                value={formData.surname}
                onChange={(e) =>
                  setFormData({ ...formData, surname: e.target.value })
                }
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email <span className="text-red-600">*</span></Label>
            <Input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>

          {/* Student ID / TC No */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="student_id">Student ID <span className="text-red-600">*</span></Label>
              <Input
                id="student_id"
                required
                value={formData.student_id}
                onChange={(e) =>
                  setFormData({ ...formData, student_id: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tc_no">TC No <span className="text-red-600">*</span></Label>
              <Input
                id="tc_no"
                required
                value={formData.tc_no}
                onChange={(e) =>
                  setFormData({ ...formData, tc_no: e.target.value })
                }
              />
            </div>
          </div>

          {/* Program / TA Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="program">Program <span className="text-red-600">*</span></Label>
              <Select
                value={formData.program}
                onValueChange={(val) =>
                  setFormData({ ...formData, program: val })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MS">MS</SelectItem>
                  <SelectItem value="PhD">PhD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ta_type">TA Type <span className="text-red-600">*</span></Label>
              <Select
                value={formData.ta_type}
                onValueChange={(val) =>
                  setFormData({ ...formData, ta_type: val })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FT">Full Time</SelectItem>
                  <SelectItem value="PT">Part Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Advisor dropdown */}
          <div className="space-y-2">
            <Label htmlFor="advisor">Advisor <span className="text-red-600">*</span></Label>
            <Select
              value={formData.advisor}
              onValueChange={(val) =>
                setFormData({ ...formData, advisor: val })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select advisor…" />
              </SelectTrigger>
              <SelectContent>
                {staffOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Phone / IBAN */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone <span className="text-red-600">*</span></Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="iban">IBAN <span className="text-red-600">*</span></Label>
              <Input
                id="iban"
                value={formData.iban}
                onChange={(e) =>
                  setFormData({ ...formData, iban: e.target.value })
                }
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setError("");
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white">
              {loading ? "Creating..." : "Create TA"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
