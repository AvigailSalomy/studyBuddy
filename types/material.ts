import type { MaterialCategory } from "@/schemas/materials";

export type MaterialRow = {
  id: string;
  title: string;
  file_name: string;
  category: MaterialCategory;
  file_size: number;
  created_at: string;
  uploader: {
    id: string;
    full_name: string;
  };
};
