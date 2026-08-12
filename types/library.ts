export type LibraryItemType =
  "book" | "article" | "biography" | "conference" | "audio" | "video" | "manuscript" | "archive";
export type LibraryItem = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  item_type: LibraryItemType;
  author: string | null;
  publisher: string | null;
  publication_year: number | null;
  language: string;
  themes: string[];
  cover_url: string | null;
  resource_url: string | null;
  media_bucket: string | null;
  media_object_key: string | null;
  media_mime_type: string | null;
  media_file_name: string | null;
  media_file_size: number | null;
  source_name: string | null;
  is_featured: boolean;
  is_verified: boolean;
};
