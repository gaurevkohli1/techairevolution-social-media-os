export type CampaignStatus =
  | "DISCOVER"
  | "EDITORIAL"
  | "CREATIVE"
  | "GENERATE"
  | "GENERATE_WAIT"
  | "COMPOSE"
  | "VISUAL_QA"
  | "CAPTION"
  | "BIND"
  | "WAIT_PUBLISH"
  | "PUBLISH_IG"
  | "PUBLISH_FB"
  | "PUBLISHED"
  | "WITHHELD"
  | "FAILED"
  | "RESULT_UNKNOWN";

export interface Campaign {
  id: number;
  campaign_key: string;
  local_date: string;
  target_publish_at_utc: string | null;
  status: CampaignStatus;
  story_title: string | null;
  current_attempt: number;
  result_unknown: number;
}

export interface JsonMap {
  [key: string]: unknown;
}
