import CoolSMS from "coolsms-node-sdk";
import { config } from "../config.mjs";

const messageService = new CoolSMS.default(
  config.coolsms.apiKey,
  config.coolsms.apiSecret
);

export async function sendVerificationSMS(phone, code) {
  return messageService.sendOne({
    to: phone,
    from: config.coolsms.sender,
    text: `[WebChatting 서비스에서 발송]인증번호는 ${code} 입니다.`,
  });
}
