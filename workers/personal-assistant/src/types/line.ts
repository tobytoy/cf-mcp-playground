export interface LineWebhookPayload {
  destination: string;
  events: LineEvent[];
}

export type LineEvent =
  | LineMessageEvent
  | LinePostbackEvent
  | LineFollowEvent
  | LineUnfollowEvent;

export interface LineMessageEvent {
  type: "message";
  mode: "active" | "standby";
  timestamp: number;
  source: LineSource;
  replyToken: string;
  message: LineMessageContent;
}

export interface LinePostbackEvent {
  type: "postback";
  mode: "active" | "standby";
  timestamp: number;
  source: LineSource;
  replyToken: string;
  postback: {
    data: string;
    params?: Record<string, unknown>;
  };
}

export interface LineFollowEvent {
  type: "follow";
  mode: "active" | "standby";
  timestamp: number;
  source: LineSource;
  replyToken: string;
}

export interface LineUnfollowEvent {
  type: "unfollow";
  mode: "active" | "standby";
  timestamp: number;
  source: LineSource;
}

export interface LineSource {
  type: "user" | "group" | "room";
  userId?: string;
  groupId?: string;
  roomId?: string;
}

export type LineMessageContent =
  | LineTextMessage
  | LineImageMessage
  | LineAudioMessage
  | LineLocationMessage;

export interface LineTextMessage {
  id: string;
  type: "text";
  text: string;
}

export interface LineImageMessage {
  id: string;
  type: "image";
  contentProvider?: { type: "line" | "external" };
}

export interface LineAudioMessage {
  id: string;
  type: "audio";
  duration?: number;
  contentProvider?: { type: "line" | "external" };
}

export interface LineLocationMessage {
  id: string;
  type: "location";
  title: string;
  address: string;
  latitude: number;
  longitude: number;
}

export type OutgoingLineMessage =
  | { type: "text"; text: string; quickReply?: LineQuickReply }
  | { type: "flex"; altText: string; contents: Record<string, unknown>; quickReply?: LineQuickReply };

export interface LineQuickReply {
  items: Array<{
    type: "action";
    action: {
      type: "message" | "postback" | "uri" | "location";
      label: string;
      text?: string;
      displayText?: string;
      data?: string;
      uri?: string;
    };
  }>;
}
