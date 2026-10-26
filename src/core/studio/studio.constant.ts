import * as Yup from "yup";

const serviceUrl = Yup.string().url("Nhập địa chỉ HTTP hợp lệ.").matches(/^https?:\/\//, "Dịch vụ cần địa chỉ HTTP hoặc HTTPS.").required("Nhập địa chỉ dịch vụ.");

export const studioSettingsSchema = Yup.object({
  comfyuiEnabled: Yup.boolean().required(),
  comfyuiBaseUrl: serviceUrl,
  comfyuiCheckpoint: Yup.string().defined(),
  vieneuBaseUrl: serviceUrl,
  vieneuModel: Yup.string().required("Nhập model giọng đọc."),
  vieneuVoice: Yup.string().required("Chọn giọng đọc."),
  ollamaBaseUrl: serviceUrl,
  ollamaModel: Yup.string().required("Nhập model viết truyện.")
}).noUnknown();

export const projectConfigSchema = Yup.object({
  title: Yup.string().required("Nhập tiêu đề video."),
  audience: Yup.string().oneOf(["CHILD", "SENIOR", "GENERAL"]).required(),
  contentMode: Yup.string().oneOf(["USER_STORY", "AI_GENERATE"]).required(),
  story: Yup.string().when("contentMode", { is: "USER_STORY", then: schema => schema.required("Nhập nội dung truyện.") }),
  theme: Yup.string().when("contentMode", { is: "AI_GENERATE", then: schema => schema.required("Nhập chủ đề để AI viết truyện.") })
});
