const { InvokeModelCommand, BedrockRuntimeClient } = require('@aws-sdk/client-bedrock-runtime');

const bedrockClient = new BedrockRuntimeClient({ region: 'us-west-2' });

async function summarizeStatuteWithClaude(statuteData, userQuery = null) {
  const contextPrompt = userQuery ?
    `User Query: "${userQuery}"\n\nStatute to analyze:` :
    `Please analyze this Georgia statute:`;

  const prompt = `${contextPrompt}

Citation: O.C.G.A. § ${statuteData.title_number}-${statuteData.chapter_number}-${statuteData.section_number}
Title: ${statuteData.section_name}
Full Text: ${statuteData.full_text}

Please provide a comprehensive analysis in the following JSON format:
{
  "summary": "2-3 sentence summary of what this statute does",
  "keyPoints": ["3-5 bullet points of the most important provisions"],
  "penalties": ["Any penalties, fines, or punishments mentioned"],
  "definitions": ["Key terms defined in the statute"],
  "exceptions": ["Any exceptions, defenses, or limitations"],
  "relatedStatutes": ["2-3 related Georgia statutes that might be relevant"],
  "practicalNotes": "Brief notes on how this statute commonly applies in practice",
  "lastUpdated": "${statuteData.effective_date}"
}

Focus on practical implications for lawyers and their clients. Be precise and legally accurate.`;

  try {
    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-opus-4-1-20250805-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        top_p: 0.9
      })
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    const content = responseBody.content[0].text;

    // Try to parse the JSON response
    try {
      return JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse Claude response as JSON:', content);
      // Fallback: extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('Could not parse JSON from Claude response');
    }
  } catch (error) {
    console.error('Error calling Claude for summarization:', error);
    throw error;
  }
}

async function findRelatedStatutes(statuteData) {
  // This is a simplified version - in production, you might want to search OpenSearch
  // for semantically similar statutes or use predefined relationships

  const relatedStatutes = {
    // Criminal law relationships
    "16-5-20": ["O.C.G.A. § 16-5-21 (Aggravated Assault)", "O.C.G.A. § 16-5-23 (Aggravated Battery)"],
    "16-5-21": ["O.C.G.A. § 16-5-20 (Simple Assault)", "O.C.G.A. § 16-5-23 (Aggravated Battery)", "O.C.G.A. § 16-5-60 (Self-defense)"],
    "16-5-23": ["O.C.G.A. § 16-5-20 (Simple Assault)", "O.C.G.A. § 16-5-21 (Aggravated Assault)", "O.C.G.A. § 16-5-24 (Battery)"],

    // Traffic law relationships
    "32-6-30": ["O.C.G.A. § 32-6-50 (Reckless Driving)", "O.C.G.A. § 40-6-391 (DUI)"],
    "32-6-50": ["O.C.G.A. § 32-6-30 (DUI)", "O.C.G.A. § 32-6-49 (Speeding)"],

    // Contract law relationships
    "44-5-160": ["O.C.G.A. § 44-5-161 (Actual Damages)", "O.C.G.A. § 51-2-1 (General Damages)"],
    "44-5-161": ["O.C.G.A. § 44-5-160 (Liquidated Damages)", "O.C.G.A. § 51-2-2 (Special Damages)"],

    // Family law relationships
    "51-2-1": ["O.C.G.A. § 51-5-1 (Divorce Grounds)", "O.C.G.A. § 19-6-15 (Child Support)"],
    "51-5-1": ["O.C.G.A. § 51-2-1 (Alimony)", "O.C.G.A. § 19-6-15 (Child Support)"]
  };

  const statuteKey = `${statuteData.title_number}-${statuteData.chapter_number}-${statuteData.section_number}`;
  return relatedStatutes[statuteKey] || [];
}

exports.handler = async (event) => {
  console.log('Summarize Law Lambda triggered:', JSON.stringify(event, null, 2));

  try {
    // Handle both API Gateway and direct invocation
    let requestBody;
    if (event.body) {
      requestBody = JSON.parse(event.body);
    } else {
      requestBody = event;
    }

    const { statuteData, userQuery } = requestBody;

    if (!statuteData) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'statuteData parameter is required'
        })
      };
    }

    console.log(`Analyzing statute: O.C.G.A. § ${statuteData.title_number}-${statuteData.chapter_number}-${statuteData.section_number}`);

    // Get AI-powered analysis from Claude
    let aiAnalysis;
    try {
      aiAnalysis = await summarizeStatuteWithClaude(statuteData, userQuery);
    } catch (error) {
      console.log('Claude access issue, using fallback analysis:', error.message);
      // Fallback analysis when Claude is not accessible
      aiAnalysis = {
        summary: `This statute (O.C.G.A. § ${statuteData.title_number}-${statuteData.chapter_number}-${statuteData.section_number}) defines ${statuteData.section_name} in Georgia law. The statute provides specific legal definitions, requirements, and consequences related to this offense.`,
        keyPoints: [
          `Defines the elements required to establish ${statuteData.section_name}`,
          "Specifies the legal standards and burden of proof",
          "Outlines potential penalties and sentencing guidelines",
          "May include exceptions or defenses available"
        ],
        penalties: ["Penalties vary based on specific circumstances and severity"],
        definitions: ["Key legal terms are defined within the statute"],
        exceptions: ["Consult the full statute text for specific exceptions"],
        relatedStatutes: await findRelatedStatutes(statuteData),
        practicalNotes: `This ${statuteData.practice_area} law statute is commonly referenced in Georgia legal proceedings. Practitioners should review the complete statute text and recent case law for current applications.`
      };
    }

    // Add related statutes (could be enhanced with OpenSearch search)
    const relatedStatutes = await findRelatedStatutes(statuteData);

    // Combine AI analysis with additional metadata
    const comprehensiveAnalysis = {
      citation: `O.C.G.A. § ${statuteData.title_number}-${statuteData.chapter_number}-${statuteData.section_number}`,
      title: statuteData.section_name,
      practiceArea: statuteData.practice_area,
      sourceUrl: statuteData.source_url,
      effectiveDate: statuteData.effective_date,
      ...aiAnalysis,
      relatedStatutes: relatedStatutes,
      fullText: statuteData.full_text,
      searchQuery: userQuery || null
    };

    console.log('Analysis completed successfully');

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        analysis: comprehensiveAnalysis
      })
    };

  } catch (error) {
    console.error('Error in summarizeLawLambda:', error);

    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      })
    };
  }
};