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

export const removeImageWatermark = async (imageBase64: string, hasMask: boolean = false): Promise<string | null> => {
  const client = getClient();
  if (!client) return null;

  try {
    // Helper to strip base64 header if present
    const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    // Guess mime type or default to png
    const mimeMatch = imageBase64.match(/^data:(image\/[a-zA-Z+]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';

    let prompt = "Remove all text, watermarks, logos, and timestamps from this image. Keep the main subject intact. Return the cleaned image.";
    
    if (hasMask) {
        prompt = "There is a red translucent rectangle marked on this image. Remove the text or object found INSIDE that red rectangle area. Then, remove the red rectangle itself and fill the area to match the surrounding background texture seamlessly. Do NOT change any other part of the image outside the red rectangle.";
    }

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
            {
                inlineData: {
                    mimeType: mimeType,
                    data: base64Data
                }
            },
            {
                text: prompt
            }
        ]
      }
    });

    // Extract image from response
    if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
    }
    return null;
  } catch (error) {
    console.error("Error removing watermark:", error);
    return null;
  }
};