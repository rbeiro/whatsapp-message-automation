export type SendingMessageError = {
  type: "video" | "image" | "text";
  message: string;
};
