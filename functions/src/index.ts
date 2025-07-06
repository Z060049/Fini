/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import dotenv from "dotenv";
const result = dotenv.config();
console.log("dotenv config result:", result);
import {setGlobalOptions} from "firebase-functions/v2/options";
import * as firebaseFunctions from "firebase-functions";
import OpenAI from "openai";
import type {Request, Response} from "express";
import cors from "cors";

const corsHandler = cors({origin: true});

console.log("Loaded OPENAI_API_KEY:", process.env.OPENAI_API_KEY);
console.log("OPENAI_API_KEY is set:", !!process.env.OPENAI_API_KEY);

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({maxInstances: 5}, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({maxInstances: 10}) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({maxInstances: 10});

// Store your OpenAI API key in Firebase environment config (never hardcode!)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

console.log("OPENAI_API_KEY is set:", !!process.env.OPENAI_API_KEY);

exports.generateTodos = firebaseFunctions.https.onRequest(
  (req: Request, res: Response): void => {
    corsHandler(req, res, async () => {
      try {
        // 1. Get data from frontend
        const {projects, emails} = req.body;

        // 2. Build the prompt
        const prompt = `
You are an expert productivity assistant. Given the following projects and their to-dos:
${JSON.stringify(projects, null, 2)}

And the following emails (subject and sender):
${JSON.stringify(emails, null, 2)}

Instructions:
- For each unique email subject, generate only one task, even if there are multiple emails with the same subject (e.g., multiple people replying to the same thread).
- Map each email to the most relevant project (by subject/sender). If no good match, use the 'Gmail' project.
- Generate a concise, actionable to-do description based on the email subject and sender only. Do not use or reference email content.

Respond in this JSON format:
[
  {
    "emailId": "EMAIL_ID",
    "project": "Best matching project name",
    "description": "Concise to-do description"
  }
]
`;

        // 3. Call OpenAI
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {role: "user", content: prompt},
          ],
          max_tokens: 600,
          temperature: 0.4,
        });

        // 4. Parse and return the result
        const text = completion.choices[0]?.message?.content;
        let todosGenerated;
        try {
          todosGenerated = JSON.parse(text || "[]");
        } catch (e) {
          res.status(500).json({error: "Failed to parse LLM response", raw: text});
          return;
        }
        res.json({todos: todosGenerated});
      } catch (err) {
        // 'err' is unknown, so cast to Error for message
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(err);
        res.status(500).json({error: errorMsg});
      }
    });
  }
);

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
