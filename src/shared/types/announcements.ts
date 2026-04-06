
export interface ResponseAnnouncementItem {
  id: number;
  title: string;
  short_detail: string;
  destination_url: string;
  is_active: boolean;
  start_date: string; 
  end_date: string; 
  image_url: string;
}

export type ViewPayloadItem = {
    client_id: number | undefined;
    portal_announcement: number;
};