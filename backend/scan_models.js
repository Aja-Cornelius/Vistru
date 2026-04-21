require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function scan() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Note: The SDK doesn't have a direct listModels, we have to use the REST API or similar
    // Actually, let's just try the most common fallback name
    console.log('Testing gemini-1.5-flash...');
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    console.log('Model object created. Testing a simple prompt...');
    const result = await model.generateContent("test");
    console.log('SUCCESS with gemini-1.5-flash!');
  } catch (err) {
    console.error('FAILED with gemini-1.5-flash:', err.message);
    try {
        console.log('Testing gemini-pro-vision...');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
        const result = await model.generateContent("test");
        console.log('SUCCESS with gemini-pro-vision!');
    } catch (err2) {
        console.error('FAILED with gemini-pro-vision:', err2.message);
    }
  } finally {
    process.exit();
  }
}
scan();
