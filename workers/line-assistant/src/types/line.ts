export interface LineWebhookPayload {
  destination?: string;
  events: LineEvent[];
}

export type LineEventType =
  | "message"
  | "follow"
  | "unfollow"
  | "join"
  | "leave"
  | "memberJoined"
  | "memberLeft"
  | "postback"
  | "beacon";

export interface LineSource {
  type: "user" | "group" | "room";
  userId?: string;
  groupId?: string;
  roomId?: string;
}

export interface LineTextMessage {
  id: string;
  type: "text";
  text: string;
  quoteToken?: string;
}

export interface LineImageMessage {
  id: string;
  type: "image";
  contentProvider?: {
    type: "line" | "external";
    originalContentUrl?: string;
    previewImageUrl?: string;
  };
}

export interface LineFileMessage {
  id: string;
  type: "file";
  fileName: string;
  fileSize: number;
}

export interface LineAudioMessage {
  id: string;
  type: "audio";
  duration: number;
  contentProvider?: {
    type: "line" | "external";
    originalContentUrl?: string;
  };
}

export interface LineLocationMessage {
  id: string;
  type: "location";
  title?: string;
  address?: string;
  latitude: number;
  longitude: number;
}

export interface LineGenericMessage {
  id: string;
  type: string;
  [key: string]: unknown;
}

export type LineMessage =
  | LineTextMessage
  | LineImageMessage
  | LineFileMessage
  | LineAudioMessage
  | LineLocationMessage
  | LineGenericMessage;

export interface LineEvent {
  type: LineEventType;
  mode?: "active" | "standby";
  timestamp: number;
  source: LineSource;
  webhookEventId?: string;
  deliveryContext?: {
    isRedelivery: boolean;
  };
  replyToken?: string;
  message?: LineMessage;
  postback?: {
    data: string;
    params?: Record<string, unknown>;
  };
}

export type OutgoingLineMessage =
  | { type: "text"; text: string; quickReply?: LineQuickReply }
  | { type: "flex"; altText: string; contents: Record<string, unknown>; quickReply?: LineQuickReply }
  | { type: "image"; originalContentUrl: string; previewImageUrl: string; quickReply?: LineQuickReply }
  | { type: "file"; originalContentUrl: string; fileName: string; fileSize?: number; quickReply?: LineQuickReply };

export interface LineQuickReply {
  items: Array<{
    type: "action";
    imageUrl?: string;
    action: {
      type: "message" | "postback" | "uri" | "location";
      label: string;
      text?: string;
      data?: string;
      displayText?: string;
      uri?: string;
    };
  }>;
}
