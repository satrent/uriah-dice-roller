import { GoogleGenAI } from "@google/genai";
import { RolledDiceGroup, Roll } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

function formatRollString(groups: RolledDiceGroup[]): string {
    return groups.map(group => {
        let dieString = `${group.count}d${group.die}`;
        if (group.modifier > 0) {
            dieString += `+${group.modifier}`;
        } else if (group.modifier < 0) {
            dieString += `${group.modifier}`;
        }
        return dieString;
    }).join(' + ');
}

export async function describeRoll(roll: Roll): Promise<string> {
    try {
        const diceString = formatRollString(roll.groups);
        
        const resultsString = roll.groups.map(g => `${g.count}d${g.die} (${g.results.join(', ')})`).join('; ');
        const prompt = `A player named ${roll.user} rolled ${diceString} for a total of ${roll.total}. The individual dice were: ${resultsString}. Write a very short, dramatic, one-sentence description of this roll in a fantasy RPG context. If the total is high (e.g., >15 for a d20 roll), make it sound successful. If it's low (e.g., <5), make it sound like a failure. Keep it under 15 words.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error describing roll:", error);
        return "The AI couldn't describe this moment...";
    }
}
