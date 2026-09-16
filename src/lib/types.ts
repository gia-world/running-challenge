export type UserRole = "crew" | "admin";
export type ActivityStatus = "pending" | "approved" | "rejected";

export type Profile = {
  id: string;
  name: string;
  name_confirmed: boolean;
  created_at: string;
};

export type Team = {
  id: string;
  name: string;
  invite_code: string;
  created_by: string | null;
  created_at: string;
};

export type TeamMembership = {
  id: string;
  team_id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
};

export type Season = {
  id: string;
  team_id: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  created_by: string | null;
  created_at: string;
};

export type SeasonMembership = {
  id: string;
  season_id: string;
  user_id: string;
  created_at: string;
};

export type Activity = {
  id: string;
  user_id: string;
  season_id: string;
  activity_date: string; // YYYY-MM-DD
  distance_km: number;
  status: ActivityStatus;
  rejected_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type ActivityPhoto = {
  id: string;
  activity_id: string;
  storage_path: string;
  sort_order: number;
  created_at: string;
};
