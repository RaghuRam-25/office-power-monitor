const { GoogleGenerativeAI } = require('@google/generative-ai'); // <-- এখানে পরিবর্তন করা হয়েছে
require('dotenv').config();

// ক্লাসের নাম GoogleGenerativeAI হবে
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); 

const getHumanizedResponse = async (rawData, commandType) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are a friendly, witty, and slightly humorous AI office assistant working for a boss who loves conversational updates.
      The boss just ran the command: "${commandType}".
      Here is the raw real-time data from the office database:
      ${JSON.stringify(rawData)}

      Task: Convert this raw data into a warm, natural, and humanized response in English. 
      Do NOT just dump the numbers or JSON. Act like a real helpful teammate. Keep it concise but engaging.
    `;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Gemini AI Error:", error);
    // AI ফেইল করলে ব্যাকআপ হিসেবে একটি স্ট্যান্ডার্ড টেক্সট রিটার্ন করবে
    return "Sir, I fetched the data, but my brain is a bit foggy right now. Here is what I know: " + JSON.stringify(rawData);
  }
};

module.exports = { getHumanizedResponse };