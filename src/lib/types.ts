export type UserRole = "crew" | "admin";
export type ActivityStatus = "pending" | "approved" | "rejected";

export type Profile = {
  id: string;
  name: string;
  role: UserRole;
  name_confirmed: boolean;
  created_at: string;
};

export type Activity = {
  id: string;
  user_id: string;
  activity_date: string; // YYYY-MM-DD
  distance_km: number;
  photo_url: string;
  status: ActivityStatus;
  rejected_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};
