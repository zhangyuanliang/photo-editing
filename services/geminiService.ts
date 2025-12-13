import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY not found in environment variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateMarketingCopy = async (topic: string): Promise<string> => {
  const client = getClient();
  if (!client) return "限时特惠 5 折起";

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `为电商海报写一个简短、有力、吸引人的中文营销口号（最多10个字），关于：“${topic}”。不要使用引号。`,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error generating copy:", error);
    return "大促火热进行中！";
  }
};