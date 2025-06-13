const { GoogleGenerativeAI } = require("@google/generative-ai");

// 각 플랜에 맞는 프롬프트를 생성하는 헬퍼 함수
const getPrompt = (reviews, requestMode) => {
    const reviewText = reviews.join("\n---\n");

    const commonInstructions = `
        You are an AI specialized in analyzing customer reviews for local businesses in Korean.
        Analyze the following reviews.
        Provide the response ONLY in JSON format, enclosed in a single markdown code block (\`\`\`json ... \`\`\`).
        Do not include any text outside the JSON block.
        The JSON root must have a "success": true field.
        The data for the analysis should be in a "data" object.
        The language of all text content in the JSON response (e.g., names, labels, summaries) must be Korean.
    `;

    const basePrompt = `
        ${commonInstructions}
        From the reviews, perform the following tasks:
        1.  Count the total number of positive, negative, and neutral reviews.
        2.  Extract up to the top 5 most frequent and meaningful keywords (nouns or noun phrases).
        3.  Identify up to 5 main categories mentioned in the reviews (e.g., 맛, 가격, 서비스, 분위기, 위생) and count the mentions for each.
        4.  Identify up to 5 main topics of discussion (e.g., 메뉴 추천, 주차 문제, 대기 시간) and count the mentions for each.

        JSON structure:
        {
          "success": true,
          "data": {
            "totalReviewsAnalyzed": ${reviews.length},
            "sentimentCounts": { "positive": 0, "negative": 0, "neutral": 0 },
            "topKeywords": [ { "keyword": "키워드", "count": 0 } ],
            "categories": [ { "name": "카테고리명", "mentions": 0 } ],
            "topics": [ { "name": "토픽명", "mentions": 0 } ]
          }
        }
    `;

    const standardDetailPrompt = `
        ${commonInstructions}
        From the reviews, perform the following tasks:
        1.  For each of the 5 main categories (e.g., 맛, 가격, 서비스), summarize the positive and negative aspects as comma-separated keywords.
        2.  For each of the 5 main topics, find related keywords.
        3.  Generate a concise "AI 심층 분석 요약" (customSummary) based on the overall sentiment and key topics.
        4.  Provide up to 3 "데이터 기반 개선 제안" (recommendations) as an array of strings.

        JSON structure:
        {
          "success": true,
          "data": {
            "categories_standard_detail": [ { "name": "카테고리명", "positiveAspects": "긍정,키워드", "negativeAspects": "부정,키워드" } ],
            "topics_standard_detail": [ { "name": "토픽명", "relatedKeywords": ["연관키워드1", "연관키워드2"] } ],
            "customSummary": "AI가 작성한 전반적인 요약...",
            "recommendations": [ "첫 번째 개선 제안.", "두 번째 개선 제안." ]
          }
        }
    `;
    
    const diagnosticDetailPrompt = `
        ${commonInstructions}
        From the reviews, perform the most in-depth analysis:
        1. For each category, provide a sentiment score (-1.0 to 1.0) and a short diagnostic comment.
        2. For each topic, describe the customer's experience and sentiment in detail.
        3. Distribute all reviews into detailed sentiment labels (e.g., 매우 긍정, 긍정, 중립, 부정, 매우 부정) and count them.
        4. Identify and count up to 3 main issues/problems mentioned.
        5. For up to 5 main keywords, calculate their sentiment score (-1.0 to 1.0).
        6. Summarize feedback specifically related to delivery riders, if any.
        7. Extract up to 3 most representative positive reviews and 3 most representative negative reviews.
        8. Generate a "AI 심층 분석 요약 및 구체적 실행 계획" (customSummary) and provide detailed "주요 개선 제안" (recommendations) with 'proposal' and 'expectedEffect'.

        JSON structure:
        {
          "success": true,
          "data": {
            "categories_diagnostic_detail": [ { "name": "카테고리명", "sentimentScore": 0.8, "diagnosticComment": "맛에 대한 칭찬이 대부분입니다." } ],
            "topics_diagnostic_detail": [ { "name": "토픽명", "topicSentimentAndExperience": "고객들은 주차 공간이 협소하여 불편함을 겪고 있습니다." } ],
            "detailedSentiment": [ {"label": "매우 긍정", "count": 0}, {"label": "긍정", "count": 0}, ... ],
            "issues": [ { "name": "문제점명", "count": 0 } ],
            "keywordSentiments": [ { "keyword": "키워드", "score": 0.9 } ],
            "riderFeedbackSummary": "배달 관련 피드백 요약...",
            "representativePositiveReviews": [ "대표 긍정 리뷰 1", "대표 긍정 리뷰 2" ],
            "representativeNegativeReviews": [ "대표 부정 리뷰 1", "대표 부정 리뷰 2" ],
            "customSummary": "AI가 작성한 심층 요약 및 실행 계획...",
            "recommendations": [ { "proposal": "구체적인 개선 제안", "expectedEffect": "예상되는 개선 효과" } ]
          }
        }
    `;

    let selectedPrompt;
    if (requestMode === 'base') selectedPrompt = basePrompt;
    else if (requestMode === 'standardDetail') selectedPrompt = standardDetailPrompt;
    else if (requestMode === 'diagnosticDetail') selectedPrompt = diagnosticDetailPrompt;
    else selectedPrompt = basePrompt; // Default to base

    return `${selectedPrompt}\n\n---START OF REVIEWS---\n${reviewText}\n---END OF REVIEWS---`;
};


exports.handler = async (event) => {
    console.log(`--- 함수 시작 (${new Date().toISOString()}) ---`);

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error("오류: GEMINI_API_KEY 환경 변수가 없습니다.");
            return { statusCode: 500, body: JSON.stringify({ success: false, message: "서버에 API 키가 설정되지 않았습니다." }) };
        }
        console.log("API 키 로딩 성공.");

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
        console.log("AI 모델 초기화 성공.");

        const { reviews, requestMode } = JSON.parse(event.body);
        console.log(`요청 모드: ${requestMode}, 리뷰 개수: ${reviews ? reviews.length : 0}`);

        if (!reviews || reviews.length === 0) {
            return { statusCode: 400, body: JSON.stringify({ success: false, message: "분석할 리뷰가 없습니다." }) };
        }

        const prompt = getPrompt(reviews, requestMode);
        console.log(`AI에게 '${requestMode}' 프롬프트 전송 시작...`);
        
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        console.log("AI로부터 응답 수신 성공!");
        // console.log("응답 내용:", responseText); // 너무 길어서 주석 처리

        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
        if (!jsonMatch) {
            console.error("오류: AI 응답에서 JSON 형식을 찾을 수 없습니다.", responseText);
            throw new Error("AI 응답이 유효한 JSON 형식이 아닙니다.");
        }
        
        const data = JSON.parse(jsonMatch[1]);

        return {
            statusCode: 200,
            body: JSON.stringify(data), // AI가 보내준 JSON을 그대로 전달
        };

    } catch (error) {
        console.error("--- 치명적인 오류 발생 ---");
        console.error("오류 메시지:", error.message);
        console.error("오류 스택:", error.stack);
        
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, message: `서버 내부 오류: ${error.message}` }),
        };
    }
};