export type PendingJoinRequest = {
  id: string;
  created_at: string;
  profile: {
    id: string;
    full_name: string;
    institution: string;
    faculty: string;
    degree: string;
    study_year: number;
  };
};
