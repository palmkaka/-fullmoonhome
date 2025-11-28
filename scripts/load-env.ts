import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const envPath = path.resolve(process.cwd(), '.env.local');
console.log("Loading environment variables from:", envPath);

if (fs.existsSync(envPath)) {
    const fileContent = fs.readFileSync(envPath, 'utf-8');
    console.log("File exists. Size:", fileContent.length);
    // Check if it looks like it has the key
    if (fileContent.includes("FIREBASE_SERVICE_ACCOUNT_KEY")) {
        console.log("File contains FIREBASE_SERVICE_ACCOUNT_KEY");
    } else {
        console.log("File DOES NOT contain FIREBASE_SERVICE_ACCOUNT_KEY");
    }
} else {
    console.error("File .env.local NOT FOUND at", envPath);
}

const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error("Error loading .env.local:", result.error);
} else {
    console.log(".env.local loaded via dotenv.");
    const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    console.log("FIREBASE_SERVICE_ACCOUNT_KEY type:", typeof key);
    console.log("FIREBASE_SERVICE_ACCOUNT_KEY length:", key ? key.length : 0);
    if (key) {
        console.log("First 20 chars:", key.substring(0, 20));
        try {
            JSON.parse(key);
            console.log("Key is valid JSON");
        } catch (e) {
            console.error("Key is INVALID JSON:", e);
        }
    }
}
